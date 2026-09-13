'use strict';

const config = require('../config');
const http = require('./http');
const store = require('./store');
const { uid, now, sha256 } = require('./util');

const sessions = store.col('sessions');
const byId = new Map();
let moderation = null;
function mod() {
  if (!moderation) moderation = require('./moderation');
  return moderation;
}

const OWNER_NICKS = (Array.isArray(config.ownerNickname) ? config.ownerNickname : [config.ownerNickname]).map(norm);

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function staffRows() {
  const out = [];
  for (const s of store.col('staff').all()) {
    if (s && s.username && !s.removed) {
      out.push({
        username: String(s.username).toLowerCase(),
        tier: s.tier === 'super' ? 'super' : 'admin',
        addedBy: s.addedBy || '',
        addedAt: s.addedAt || 0
      });
    }
  }
  return out;
}

function syncOwnerStaff(username, nickname) {
  if (!username || !isOwnerNick(nickname)) return;
  const u = norm(username);
  const staff = store.col('staff');
  const existing = staffRows().find((r) => r.username === u);
  if (existing && existing.tier === 'super') return;
  if (!existing) {
    staff.insert({ id: staff.nextId(), username: u, tier: 'super', addedBy: 'system', addedAt: now(), owner: true });
  } else {
    const row = staff.all().find((s) => s && norm(s.username) === u);
    if (row) { row.tier = 'super'; row.owner = true; }
  }
  store.markDirty('staff');
}

function loadIndex() {
  byId.clear();
  for (const s of sessions.all()) {
    if (s && s.id) byId.set(s.id, s);
  }
}

function isOwnerNick(nickname) {
  if (!nickname) return false;
  const n = norm(nickname);
  return OWNER_NICKS.includes(n);
}

function staffTier(username) {
  if (!username) return null;
  const u = norm(username);
  const row = staffRows().find((r) => r.username === u);
  return row ? row.tier : null;
}

function resolveTier(username, nickname) {
  if (isOwnerNick(nickname)) return 'owner';
  if (!username) return 'user';
  const t = staffTier(username);
  if (t === 'super') return 'super';
  if (t === 'admin') return 'admin';
  return 'user';
}

function isAdminUsername(username, nickname) {
  const t = resolveTier(username, nickname);
  return t === 'owner' || t === 'super' || t === 'admin';
}

function isSuperUsername(username, nickname) {
  const t = resolveTier(username, nickname);
  return t === 'owner' || t === 'super';
}

function isOwnerUsername(username, nickname) {
  return resolveTier(username, nickname) === 'owner';
}

function create(data) {
  const id = uid(24);
  const ts = now();
  const nickname = data.nickname || data.username || '';
  syncOwnerStaff(data.username, nickname);
  const tier = resolveTier(data.username, nickname);
  const isOwner = tier === 'owner';
  const record = {
    id,
    uuid: data.uuid || '',
    username: data.username || '',
    nickname,
    avatar: data.avatar || '',
    token: data.token || '',
    tokenExpire: Number(data.tokenExpire) || 0,
    role: tier === 'user' ? 'user' : 'admin',
    tier,
    isSuper: tier === 'owner' || tier === 'super',
    isOwner,
    createdAt: ts,
    lastSeen: ts,
    expireAt: ts + config.session.ttl,
    ip: data.ip || '',
    ua: String(data.ua || '').slice(0, 255)
  };
  sessions.insert(record);
  byId.set(id, record);
  // 登录即把 站内id <-> 用户中心 uuid 的绑定写进资料缓存，
  // 后续打开用户主页时即可凭站内 id 反查 uuid，再去用户中心拉公开资料。
  try {
    require('./profiles').put(data.username, {
      uuid: record.uuid,
      nickname: record.nickname,
      avatar: record.avatar
    });
  } catch (e) { /* profiles 不可用时不影响登录 */ }
  return record;
}

function get(id) {
  if (!id) return null;
  const s = byId.get(id);
  if (!s) return null;
  if (s.expireAt && s.expireAt < now()) {
    destroy(id);
    return null;
  }
  return s;
}

function touch(id) {
  const s = byId.get(id);
  if (!s) return;
  s.lastSeen = now();
  if (s.expireAt - s.lastSeen < config.session.ttl / 2) {
    s.expireAt = s.lastSeen + config.session.ttl;
    store.markDirty('sessions');
  }
}

function update(id, patch) {
  const s = byId.get(id);
  if (!s) return null;
  Object.assign(s, patch);
  store.markDirty('sessions');
  // 昵称/头像/uuid 变化同步到资料缓存，保证个人主页能拿到最新信息
  if (patch.nickname !== undefined || patch.avatar !== undefined || patch.uuid !== undefined) {
    try {
      require('./profiles').put(s.username, {
        uuid: patch.uuid || s.uuid,
        nickname: patch.nickname !== undefined ? patch.nickname : s.nickname,
        avatar: patch.avatar !== undefined ? patch.avatar : s.avatar
      });
    } catch (e) { /* ignore */ }
  }
  return s;
}

function destroy(id) {
  if (!id) return;
  byId.delete(id);
  sessions.remove(id);
}

function destroyUser(uuid) {
  const targets = sessions.all().filter((s) => s.uuid === uuid);
  for (const s of targets) destroy(s.id);
  return targets.length;
}

function destroyAllByUsername(username) {
  if (!username) return 0;
  const u = norm(username);
  const targets = sessions.all().filter((s) => s && norm(s.username) === u);
  for (const s of targets) destroy(s.id);
  return targets.length;
}

function writeCookie(res, id) {
  http.setCookie(res, config.session.cookieName, id, {
    maxAge: config.session.ttl,
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: 'Lax',
    path: '/'
  });
}

function clearCookie(res) {
  http.clearCookie(res, config.session.cookieName, {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: 'Lax',
    path: '/'
  });
}

function refreshRole(s) {
  if (!s) return;
  const nickname = s.nickname || '';
  syncOwnerStaff(s.username, nickname);
  const tier = resolveTier(s.username, nickname);
  const role = tier === 'user' ? 'user' : 'admin';
  const isSuper = tier === 'owner' || tier === 'super';
  const isOwner = tier === 'owner';
  if (s.role !== role || s.isSuper !== isSuper || s.isOwner !== isOwner || s.tier !== tier) {
    s.role = role;
    s.tier = tier;
    s.isSuper = isSuper;
    s.isOwner = isOwner;
    store.markDirty('sessions');
  }
  return s;
}

function attach(req, res) {
  const cookies = http.parseCookies(req);
  const sid = cookies[config.session.cookieName];
  let session = get(sid);
  if (session) {
    touch(session.id);
    refreshRole(session);
    try {
      if (mod().isBanned(session.username)) {
        const bid = session.id;
        destroy(bid);
        session = null;
        http.clearCookie(res, config.session.cookieName, { httpOnly: true, secure: config.secureCookie, sameSite: 'Lax', path: '/' });
      }
    } catch (e) { /* ignore */ }
  }
  req.session = session;
  req.sessionId = session ? session.id : '';
  req.user = session
    ? {
        uuid: session.uuid,
        username: session.username,
        nickname: session.nickname,
        avatar: session.avatar,
        role: session.role,
        tier: session.tier || 'user',
        isAdmin: session.role === 'admin',
        isSuper: !!session.isSuper,
        isOwner: !!session.isOwner,
        verified: mod().getStatus(session.username).verified,
        muted: mod().isMuted(session.username)
      }
    : null;
  res.locals = res.locals || {};
  return session;
}

function sweep() {
  const ts = now();
  let removed = 0;
  for (const s of sessions.all()) {
    if (!s || !s.id) continue;
    if ((s.expireAt && s.expireAt < ts) || (s.lastSeen && ts - s.lastSeen > config.session.ttl)) {
      destroy(s.id);
      removed += 1;
    }
  }
  return removed;
}

function startSweeper() {
  const timer = setInterval(() => {
    const n = sweep();
    if (n) store.markDirty('sessions');
  }, config.session.sweepInterval);
  if (timer.unref) timer.unref();
  return timer;
}

function stats() {
  return { total: byId.size, persisted: sessions.size() };
}

function requireAuth() {
  return (req, res) => {
    if (!req.session) {
      http.fail(res, 401, '请先登录', 401);
      return false;
    }
    return true;
  };
}

function requireAdmin() {
  return (req, res) => {
    if (!req.session) {
      http.fail(res, 401, '请先登录', 401);
      return false;
    }
    refreshRole(req.session);
    if (req.session.role !== 'admin') {
      http.fail(res, 403, '需要管理员权限', 403);
      return false;
    }
    return true;
  };
}

function requireSuper() {
  return (req, res) => {
    if (!req.session) {
      http.fail(res, 401, '请先登录', 401);
      return false;
    }
    refreshRole(req.session);
    if (req.session.role !== 'admin' || !req.session.isSuper) {
      http.fail(res, 403, '需要超级管理员权限', 403);
      return false;
    }
    return true;
  };
}

function requireOwner() {
  return (req, res) => {
    if (!req.session) {
      http.fail(res, 401, '请先登录', 401);
      return false;
    }
    refreshRole(req.session);
    if (!req.session.isOwner) {
      http.fail(res, 403, '需要超级管理员所有者权限', 403);
      return false;
    }
    return true;
  };
}

function publicUser(s) {
  return s
    ? {
        uuid: s.uuid,
        username: s.username,
        nickname: s.nickname,
        avatar: s.avatar,
        role: s.role,
        tier: s.tier || 'user',
        isAdmin: s.role === 'admin',
        isSuper: !!s.isSuper,
        isOwner: !!s.isOwner,
        verified: mod().getStatus(s.username).verified,
        muted: mod().isMuted(s.username)
      }
    : null;
}

module.exports = {
  loadIndex,
  create,
  get,
  touch,
  update,
  destroy,
  destroyUser,
  destroyAllByUsername,
  writeCookie,
  clearCookie,
  attach,
  sweep,
  startSweeper,
  stats,
  isAdminUsername,
  isSuperUsername,
  isOwnerUsername,
  isOwnerNick,
  resolveTier,
  staffTier,
  staffRows,
  refreshRole,
  syncOwnerStaff,
  publicUser,
  requireAuth,
  requireAdmin,
  requireSuper,
  requireOwner,
  sha256
};
