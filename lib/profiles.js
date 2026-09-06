'use strict';

const config = require('../config');
const store = require('./store');
const { now } = require('./util');

const profiles = store.col('profiles_cache');

const cache = new Map();

function loadIndex() {
  cache.clear();
  for (const p of profiles.all()) {
    if (p && p.username) cache.set(p.username, p);
  }
}

function get(username) {
  if (!username) return null;
  return cache.get(username) || null;
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
    p = { id: profiles.nextId(), username, nickname: '', avatar: '', updatedAt: 0 };
    profiles.insert(p);
    cache.set(username, p);
  }
  if (data.nickname !== undefined && data.nickname !== null) p.nickname = String(data.nickname);
  if (data.avatar !== undefined && data.avatar !== null) p.avatar = String(data.avatar);
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
