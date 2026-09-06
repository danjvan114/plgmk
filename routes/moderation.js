'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const session = require('../lib/session');
const moderation = require('../lib/moderation');
const profiles = require('../lib/profiles');
const ratelimit = require('../lib/ratelimit');
const { now, toInt, clamp, cleanText } = require('../lib/util');

const requests = store.col('auth_requests');

function notify(target, type, text, link, from) {
  const messages = store.col('messages');
  messages.insert({
    id: messages.nextId(),
    toUser: target,
    fromUser: from || '',
    type,
    text: cleanText(text, 300),
    link: cleanText(link, 300),
    isRead: false,
    createdAt: now()
  });
}

function adminGuard(req, res) {
  if (!req.session) {
    H.fail(res, 401, '请先登录', 401);
    return false;
  }
  session.refreshRole(req.session);
  if (req.session.role !== 'admin') {
    H.fail(res, 403, '需要管理员权限', 403);
    return false;
  }
  return true;
}
function ownerGuard(req, res) {
  if (!req.session) {
    H.fail(res, 401, '请先登录', 401);
    return false;
  }
  session.refreshRole(req.session);
  if (!req.session.isOwner) {
    H.fail(res, 403, '需要超级管理员权限', 403);
    return false;
  }
  return true;
}

function listRows() {
  const rows = moderation.listAll();
  return rows.map((m) => {
    let staffTier = '';
    try {
      const st = session.staffRows().find((r) => r.username === norm(m.username));
      if (st) staffTier = st.tier;
      else if (session.isOwnerNick(m.nickname)) staffTier = 'super';
    } catch (e) { /* ignore */ }
    return {
      username: m.username,
      nickname: m.nickname || profiles.getNickname(m.username) || m.username,
      avatar: m.avatar || profiles.getAvatar(m.username),
      verified: m.verified || 0,
      staff: staffTier,
      mutedUntil: m.mutedUntil || 0,
      muted: !!m.muted,
      banned: !!m.banned,
      bannedAt: m.bannedAt || 0
    };
  });
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

module.exports = function register(router) {
  router.get('/api/moderation/list', (req, res) => {
    if (!adminGuard(req, res)) return;
    const q = cleanText(req.query.q, 64).toLowerCase();
    let rows = listRows();
    if (q) rows = rows.filter((r) => r.username.includes(q) || r.nickname.toLowerCase().includes(q));
    H.ok(res, { items: rows, isOwner: !!req.session.isOwner });
  });

  router.post('/api/moderation/mute', async (req, res) => {
    if (!adminGuard(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = cleanText(body.username, 64);
    const minutes = clamp(toInt(body.minutes, 0), 0, 525600);
    if (!username) return H.fail(res, 400, '缺少用户名', 400);
    const st = moderation.setMute(username, minutes, req.session.username);
    H.ok(res, { status: st });
  });

  router.post('/api/moderation/unmute', async (req, res) => {
    if (!adminGuard(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = cleanText(body.username, 64);
    if (!username) return H.fail(res, 400, '缺少用户名', 400);
    H.ok(res, { status: moderation.clearMute(username) });
  });

  router.post('/api/moderation/ban', async (req, res) => {
    if (!ownerGuard(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = cleanText(body.username, 64);
    if (!username) return H.fail(res, 400, '缺少用户名', 400);
    if (username.toLowerCase() === String(req.session.username).toLowerCase()) {
      return H.fail(res, 400, '不能封禁自己', 400);
    }
    session.destroyAllByUsername(username);
    H.ok(res, { status: moderation.ban(username, req.session.username) });
  });

  router.post('/api/moderation/unban', async (req, res) => {
    if (!ownerGuard(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = cleanText(body.username, 64);
    if (!username) return H.fail(res, 400, '缺少用户名', 400);
    H.ok(res, { status: moderation.unban(username) });
  });

  router.post('/api/moderation/official', async (req, res) => {
    if (!ownerGuard(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = cleanText(body.username, 64);
    const level = body.level === 0 ? 0 : (body.level === 2 ? 2 : 1);
    if (!username) return H.fail(res, 400, '缺少用户名', 400);
    const st = level === 0 ? moderation.clearVerified(username) : moderation.setVerified(username, level, req.session.username);
    H.ok(res, { status: st });
  });

  router.post('/api/moderation/verify-request', async (req, res) => {
    if (!req.session) return H.fail(res, 401, '请先登录', 401);
    if (!ratelimit.middleware('write')(req, res)) return;
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const username = req.session.username;
    const kind = body.kind === 'join' ? 'join' : 'up';
    const platform = cleanText(body.platform, 60);
    const upName = cleanText(body.upName, 60);
    const reason = cleanText(body.reason, 600);
    const value = cleanText(body.value, 600);
    if (kind === 'up') {
      if (!platform || !upName) return H.fail(res, 400, '请填写 UP 所在平台与平台上的名字', 400);
      if (!reason) return H.fail(res, 400, '请填写申请理由', 400);
    } else {
      if (!reason) return H.fail(res, 400, '请填写加入理由', 400);
    }
    const existing = requests.find((r) => r && r.username === username && r.kind === kind && r.status === 'pending');
    if (existing) return H.fail(res, 400, '你已有一份待审核的同类型申请', 400);
    requests.insert({
      id: requests.nextId(),
      username,
      kind,
      platform,
      upName,
      reason,
      value,
      text: kind === 'up' ? `${platform ? '平台：' + platform + '；' : ''}UP名：${upName}；申请理由：${reason}` : `加入理由：${reason}${value ? '；能带来：' + value : ''}`,
      status: 'pending',
      createdAt: now()
    });
    H.ok(res, { ok: true });
  });

  router.get('/api/moderation/requests', (req, res) => {
    if (!ownerGuard(req, res)) return;
    const list = requests.all().filter((r) => r && r.status === 'pending').slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((r) => ({
      id: r.id,
      username: r.username,
      nickname: profiles.getNickname(r.username) || r.username,
      avatar: profiles.getAvatar(r.username),
      kind: r.kind || 'up',
      platform: r.platform || '',
      upName: r.upName || '',
      reason: r.reason || '',
      value: r.value || '',
      text: r.text || '',
      createdAt: r.createdAt
    }));
    H.ok(res, { items: list });
  });

  router.post('/api/moderation/requests/:id', async (req, res) => {
    if (!ownerGuard(req, res)) return;
    const rq = requests.get(req.params.id);
    if (!rq) return H.fail(res, 404, '申请不存在', 404);
    let body = {};
    try { body = await H.readJsonBody(req); } catch (e) { body = {}; }
    const approve = !!body.approve;
    const kind = rq.kind === 'join' ? 'join' : 'up';
    const level = kind === 'join' ? 2 : 1;
    if (approve) {
      moderation.setVerified(rq.username, level, req.session.username);
      rq.status = 'approved';
      notify(rq.username, 'system',
        kind === 'join'
          ? '恭喜，你的「加入我们团队」申请已通过，你已成为 KE 官方团队的一员。'
          : '恭喜，你的 UP 主认证申请已通过，你已获得认证徽标。',
        '/u/' + encodeURIComponent(rq.username),
        req.session.username);
    } else {
      rq.status = 'rejected';
      notify(rq.username, 'system', '很抱歉，你的申请未通过审核。', '/u/' + encodeURIComponent(rq.username), req.session.username);
    }
    store.markDirty('auth_requests');
    H.ok(res, { ok: true });
  });

  router.get('/api/moderation/me', (req, res) => {
    if (!req.session) return H.fail(res, 401, '请先登录', 401);
    const pending = requests.find((r) => r && r.username === req.session.username && r.status === 'pending');
    H.ok(res, {
      status: moderation.getStatus(req.session.username),
      hasPendingRequest: !!pending
    });
  });
};
