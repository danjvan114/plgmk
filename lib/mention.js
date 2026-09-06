'use strict';

const store = require('./store');
const profiles = require('./profiles');
const { now, cleanText } = require('./util');

const messages = () => store.col('messages');

function buildNameIndex() {
  const idx = new Map();
  for (const p of store.col('profiles_cache').all()) {
    if (!p || !p.username) continue;
    const u = p.username.toLowerCase();
    if (!idx.has(u)) idx.set(u, p.username);
    if (p.nickname) {
      const n = String(p.nickname).toLowerCase();
      if (!idx.has(n)) idx.set(n, p.username);
    }
  }
  try {
    for (const s of store.col('sessions').all()) {
      if (!s || !s.username) continue;
      const u = String(s.username).toLowerCase();
      if (!idx.has(u)) idx.set(u, s.username);
      if (s.nickname) {
        const n = String(s.nickname).toLowerCase();
        if (!idx.has(n)) idx.set(n, s.username);
      }
    }
  } catch (e) { /* ignore */ }
  return idx;
}

function extractMentions(text) {
  if (!text) return [];
  const names = new Set();
  const re = /(?:^|\s)@([^\s@<>"'，。！？、:：;；]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const token = m[1].replace(/[.,，。]$/, '');
    if (token) names.add(token.toLowerCase());
  }
  return Array.from(names);
}

function notifyMentions(content, fromUser, type, link, extraIgnore) {
  try {
    const tokens = extractMentions(content);
    if (!tokens.length) return 0;
    const idx = buildNameIndex();
    const ignore = new Set([fromUser].concat(extraIgnore || []).map((s) => String(s).toLowerCase()));
    let sent = 0;
    const targetSet = new Set();
    for (const t of tokens) {
      const username = idx.get(t);
      if (!username || ignore.has(username.toLowerCase()) || targetSet.has(username.toLowerCase())) continue;
      targetSet.add(username.toLowerCase());
      messages().insert({
        id: messages().nextId(),
        toUser: username,
        fromUser: fromUser || '',
        type: 'mention',
        text: cleanText(fromUser ? `@${profiles.getNickname(fromUser) || fromUser} 在${type === 'work' ? '作品' : '帖子'}中提到了你` : '有人提到了你', 300),
        link: cleanText(link, 300),
        isRead: false,
        createdAt: now()
      });
      sent += 1;
    }
    if (sent) store.markDirty('messages');
    return sent;
  } catch (e) {
    return 0;
  }
}

module.exports = { extractMentions, notifyMentions, buildNameIndex };
