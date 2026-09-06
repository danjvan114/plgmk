'use strict';

const store = require('./store');
const { now } = require('./util');

const mods = () => store.col('moderation');

function norm(u) {
  return String(u || '').trim().toLowerCase();
}

function ensure(username) {
  const key = norm(username);
  let m = mods().find((x) => x && norm(x.username) === key);
  if (!m) {
    m = { id: mods().nextId(), username: key, verified: 0, verifiedAt: 0, mutedUntil: 0, banned: 0, bannedBy: '', bannedAt: 0 };
    mods().insert(m);
  }
  return m;
}

function getStatus(username) {
  const key = norm(username);
  const m = mods().find((x) => x && norm(x.username) === key) || {};
  const ts = now();
  let verified = m.verified || 0;
  try {
    const s = require('./session');
    if (s.staffTier(key) === 'super') verified = Math.max(verified, 2);
  } catch (e) { /* ignore */ }
  return {
    username: key,
    verified,
    verifiedBy: m.verifiedBy || '',
    muted: !!(m.mutedUntil && m.mutedUntil > ts),
    mutedUntil: m.mutedUntil || 0,
    banned: !!(m.banned),
    bannedAt: m.bannedAt || 0
  };
}

function isBanned(username) {
  return !!getStatus(username).banned;
}

function isMuted(username) {
  return getStatus(username).muted;
}

function setVerified(username, level, by) {
  const m = ensure(username);
  m.verified = level === 2 ? 2 : 1;
  m.verifiedBy = by || '';
  m.verifiedAt = now();
  store.markDirty('moderation');
  return getStatus(username);
}

function clearVerified(username) {
  const key = norm(username);
  const m = mods().find((x) => x && norm(x.username) === key);
  if (m) {
    m.verified = 0;
    m.verifiedBy = '';
    store.markDirty('moderation');
  }
  return getStatus(username);
}

function setMute(username, minutes, by) {
  const m = ensure(username);
  m.mutedUntil = minutes > 0 ? now() + minutes * 60000 : 0;
  m.mutedBy = by || '';
  store.markDirty('moderation');
  return getStatus(username);
}

function clearMute(username) {
  const m = ensure(username);
  m.mutedUntil = 0;
  store.markDirty('moderation');
  return getStatus(username);
}

function ban(username, by) {
  const m = ensure(username);
  m.banned = 1;
  m.bannedBy = by || '';
  m.bannedAt = now();
  store.markDirty('moderation');
  return getStatus(username);
}

function unban(username) {
  const key = norm(username);
  const m = mods().find((x) => x && norm(x.username) === key);
  if (m) {
    m.banned = 0;
    m.bannedBy = '';
    store.markDirty('moderation');
  }
  return getStatus(username);
}

function listAll() {
  const out = [];
  const seen = new Set();
  const profiles = require('./profiles');
  const push = (username) => {
    const key = norm(username);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const st = getStatus(key);
    out.push({
      username: key,
      nickname: profiles.getNickname(key) || key,
      avatar: profiles.getAvatar(key),
      verified: st.verified,
      mutedUntil: st.mutedUntil || 0,
      muted: st.muted,
      banned: st.banned,
      bannedAt: st.bannedAt || 0
    });
  };
  for (const m of mods().all()) if (m && m.username) push(m.username);
  for (const p of require('./store').col('profiles_cache').all()) if (p && p.username) push(p.username);
  for (const st of require('./session').staffRows()) push(st.username);
  return out;
}

function countAll() {
  const seen = new Set();
  for (const m of mods().all()) if (m && m.username) seen.add(norm(m.username));
  for (const p of require('./store').col('profiles_cache').all()) if (p && p.username) seen.add(norm(p.username));
  return seen.size;
}

module.exports = {
  getStatus, isBanned, isMuted, setVerified, clearVerified, setMute, clearMute, ban, unban, listAll, countAll, ensure
};
