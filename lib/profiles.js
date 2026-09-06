'use strict';

const config = require('../config');
const store = require('./store');
const { now } = require('./util');

const profiles = store.col('profiles_cache');

const cache = new Map();
// username -> uuid 映射缓存（uuid 与站内 id 绑定后基本不变，命中即返回）
const uuidCache = new Map();

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadIndex() {
  cache.clear();
  uuidCache.clear();
  for (const p of profiles.all()) {
    if (p && p.username) {
      cache.set(p.username, p);
      if (p.uuid) uuidCache.set(norm(p.username), p.uuid);
    }
  }
}

function get(username) {
  if (!username) return null;
  return cache.get(username) || null;
}

// 通过站内 id（username）反查用户中心 uuid。
// 优先本地 profiles 缓存；历史登录用户（只有 session 记录、没缓存 uuid）兜底查 sessions 集合。
function getUuid(username) {
  if (!username) return '';
  const u = norm(username);
  const p = cache.get(username);
  if (p && p.uuid) return p.uuid;
  if (uuidCache.has(u)) return uuidCache.get(u);
  let found = '';
  for (const s of store.col('sessions').all()) {
    if (s && s.uuid && norm(s.username) === u) { found = s.uuid; break; }
  }
  uuidCache.set(u, found);
  return found;
}

function putUuid(username, uuid) {
  if (!username || !uuid) return;
  uuidCache.set(norm(username), String(uuid));
  const p = cache.get(username);
  if (p) p.uuid = String(uuid);
}

function getNickname(username) {
  const p = get(username);
  if (p && p.nickname) return p.nickname;
  return username || '';
}

function getVerified(username) {
  try {
    return require('./moderation').getStatus(username).verified || 0;
  } catch (e) {
    return 0;
  }
}

function getAvatar(username) {
  const p = get(username);
  return p ? p.avatar || '' : '';
}

function put(username, data) {
  if (!username) return null;
  let p = cache.get(username);
  if (!p) {
    p = { id: profiles.nextId(), username, nickname: '', avatar: '', bio: '', uuid: '', updatedAt: 0 };
    profiles.insert(p);
    cache.set(username, p);
  }
  if (data.nickname !== undefined && data.nickname !== null) p.nickname = String(data.nickname);
  if (data.avatar !== undefined && data.avatar !== null) p.avatar = String(data.avatar);
  if (data.bio !== undefined && data.bio !== null) p.bio = String(data.bio);
  if (data.uuid) putUuid(username, data.uuid);
  p.updatedAt = now();
  store.markDirty('profiles_cache');
  return p;
}

function putMany(list) {
  for (const p of list) put(p.username, p);
}

function decorate(items, usernameField, opts) {
  const o = opts || {};
  const nickField = o.nickField || 'authorNick';
  const avatarField = o.avatarField || 'authorAvatar';
  const verField = o.verField || 'authorVerified';
  const requireMod = require('./moderation');
  for (const item of items) {
    const name = item[usernameField || 'author'];
    const p = get(name);
    item[nickField] = (p && p.nickname) || name || '';
    if (avatarField) item[avatarField] = (p && p.avatar) || '';
    if (verField) item[verField] = requireMod.getStatus(name).verified;
  }
  return items;
}

function publicName(username) {
  return getNickname(username);
}

function sweep() {
  const ttl = 7 * 24 * 3600 * 1000;
  const ts = now();
  let removed = 0;
  for (const p of profiles.all()) {
    if (!p.username) continue;
    if (!p.updatedAt || ts - p.updatedAt > ttl) {
      cache.delete(p.username);
      profiles.remove(p.id);
      removed += 1;
    }
  }
  if (removed) store.markDirty('profiles_cache');
  return removed;
}

function stats() {
  return { cached: cache.size };
}

module.exports = {
  loadIndex,
  get,
  getUuid,
  putUuid,
  getNickname,
  getVerified,
  getAvatar,
  put,
  putMany,
  decorate,
  publicName,
  sweep,
  stats
};
