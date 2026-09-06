'use strict';

const config = require('../config');
const store = require('./store');
const profiles = require('./profiles');
const forum = require('../routes/forum');
const { now, toInt, cleanText } = require('./util');

const REPLY_LIMIT = 3000;
const LOG_KEEP = 500;

function logCol() {
  return store.col('bot_logs');
}

function addLog(entry) {
  const logs = logCol();
  const rec = Object.assign(
    { id: logs.nextId(), createdAt: now() },
    entry
  );
  logs.insert(rec);
  const all = logs.all();
  if (all.length > LOG_KEEP) {
    const drop = all.length - LOG_KEEP;
    for (let i = 0; i < drop; i++) logs.remove(all[i].id);
  }
  return rec;
}

function bots() {
  return store.col('bots');
}

function getBot(id) {
  return bots().get(id) || null;
}

function roll(bot) {
  const p = Math.max(0, Math.min(100, toInt(bot.probability, 100)));
  if (p >= 100) return true;
  if (p <= 0) return false;
  return Math.random() * 100 < p;
}

function inCooldown(bot) {
  const cd = toInt(bot.cooldownSec, 0);
  if (cd <= 0) return false;
  const last = Number(bot.lastRunAt) || 0;
  return last > 0 && now() - last < cd * 1000;
}

function systemPrompt(bot) {
  if (bot.prompt && String(bot.prompt).trim()) return String(bot.prompt).trim();
  const nick = (bot.account && (bot.account.nickname || bot.account.username)) || bot.name || '机器人';
  return `你是「${nick}」——${config.siteName} 论坛的一名普通成员。请像真实网友一样自然回复论坛内容：口语化、有观点、简洁，通常 30~200 字，不要提及自己是 AI、模型或助手，也不要有开头寒暄。`;
}

function excerpt(text, max) {
  const s = cleanText(String(text || ''), 0);
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function boardNameOf(post) {
  try {
    const b = store.col('forum_boards').get(post.boardId);
    return (b && b.name) || '';
  } catch (e) {
    return '';
  }
}

function buildContent(kind, post, reply) {
  const board = boardNameOf(post) || '综合';
  const title = post.title || '';
  const authorNick = profiles.getNickname(post.author) || post.author;
  if (kind === 'post') {
    return `板块：${board}\n新帖标题：${title}\n楼主：${authorNick}（@${post.author}）\n\n帖子内容：\n${excerpt(post.content, 4000)}`;
  }
  const replyNick = profiles.getNickname(reply.author) || reply.author;
  const replyTo = reply.replyTo ? profiles.getNickname(reply.replyTo) || reply.replyTo : '';
  const head = replyTo ? `（回复 @${replyTo}）` : '';
  return `板块：${board}\n帖子标题：${title}\n楼主：${authorNick}（@${post.author}）\n\n${replyNick}（@${reply.author}）在楼中发了一条回复${head}：\n"${excerpt(reply.content, 2000)}"\n\n帖子原文（节选）：\n${excerpt(post.content, 2000)}`;
}

function buildUrl(apiUrl) {
  let base = String(apiUrl || '').trim().replace(/\/+$/, '');
  if (!/chat\/completions$/i.test(base)) base += '/chat/completions';
  return base;
}

function extractReply(payload, depth) {
  if (!payload || depth > 5) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    if (payload.choices && Array.isArray(payload.choices) && payload.choices.length) {
      const c = payload.choices[0];
      if (c && c.message) {
        if (typeof c.message.content === 'string') return c.message.content;
        if (c.message.content && typeof c.message.content === 'object' && Array.isArray(c.message.content)) {
          return c.message.content.map((b) => (b && b.text) || '').join('');
        }
      }
      if (typeof c.text === 'string') return c.text;
    }
    const keys = ['content', 'text', 'answer', 'reply', 'result', 'output', 'output_text', 'response', 'message'];
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === 'string' && v.trim()) return v;
      if (v && typeof v === 'object') {
        const inner = extractReply(v, depth + 1);
        if (inner) return inner;
      }
    }
    if (payload.data) return extractReply(payload.data, depth + 1);
    if (payload.error) return '';
  }
  return '';
}

function stubReply(kind, post, reply, bot) {
  const nick = (bot.account && (bot.account.nickname || bot.account.username)) || bot.name || 'KE机器人';
  const title = (post && post.title) || '';
  if (kind === 'reply') {
    const who = reply ? profiles.getNickname(reply.author) || reply.author : '';
    return `（演示回复·${nick}）@${who} 的留言我看完啦，帖子《${title}》这个话题挺有意思。个人建议先把官方文档翻一遍，再不行就贴出报错日志，大家帮你一起看～`;
  }
  return `（演示回复·${nick}）看到新帖《${title}》，先给楼主点个赞。帖子里的问题我记下了：多数情况重装或看日志就能定位，如果还搞不定，欢迎把环境信息发出来继续讨论。`;
}

async function callModel(bot, kind, post, reply) {
  const content = buildContent(kind, post, reply);
  const url0 = String(bot.apiUrl || '').trim();
  if (url0 === 'stub://demo' || (config.devMode && !url0)) {
    await new Promise((r) => setTimeout(r, 350));
    return stubReply(kind, post, reply, bot);
  }
  const url = buildUrl(url0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: bot.apiKey ? `Bearer ${String(bot.apiKey).trim()}` : ''
      },
      body: JSON.stringify({
        model: bot.model || '',
        messages: [
          { role: 'system', content: systemPrompt(bot) },
          { role: 'user', content }
        ],
        temperature: 0.8,
        max_tokens: 800
      }),
      signal: controller.signal
    });
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? '请求超时（30s）' : (e && e.message ? e.message : '网络请求失败'));
  } finally {
    clearTimeout(timer);
  }
  const rawText = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`接口返回 HTTP ${res.status}${rawText ? '：' + excerpt(rawText, 200) : ''}`);
  }
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch (e) {
    payload = null;
  }
  const text = extractReply(payload, 0);
  if (!text || !String(text).trim()) {
    throw new Error('模型返回内容无法解析或为空');
  }
  return String(text).trim();
}

async function runBot(bot, kind, post, reply, mentioned) {
  const b = getBot(bot.id);
  if (!b || !b.enabled) return;
  if (!mentioned && !roll(b)) return;
  if (inCooldown(b)) return;
  b.lastRunAt = now();
  store.markDirty('bots');
  const started = Date.now();
  try {
    const text = await callModel(b, kind, post, reply);
    const content = String(text).trim().slice(0, REPLY_LIMIT);
    if (!content) {
      addLog({ botId: b.id, kind, ok: false, error: 'AI 返回空内容' });
      return;
    }
    const rec = forum.createReply(post, {
      author: b.account.username,
      nickname: b.account.nickname || b.name,
      avatar: b.account.avatar || '',
      content,
      parentId: 0,
      replyTo: ''
    });
    b.replyCount = (b.replyCount || 0) + 1;
    b.lastOkAt = now();
    b.lastError = '';
    store.markDirty('bots');
    addLog({
      botId: b.id,
      kind,
      postId: post.id,
      replyId: rec.id,
      ok: true,
      model: b.model || '',
      latencyMs: Date.now() - started,
      textPreview: excerpt(content, 160)
    });
  } catch (e) {
    b.lastError = e && e.message ? String(e.message).slice(0, 300) : '调用失败';
    store.markDirty('bots');
    addLog({
      botId: b.id,
      kind,
      postId: post.id,
      ok: false,
      model: b.model || '',
      latencyMs: Date.now() - started,
      error: b.lastError
    });
  }
}

function triggerFor(kind, post, reply) {
  if (!post || !post.id) return;
  const list = bots().all().filter((b) => b && b.enabled && b.account && b.account.username);
  if (!list.length) return;
  const actor = kind === 'post' ? post.author : (reply && reply.author);
  if (!actor) return;
  const actorLower = String(actor).toLowerCase();
  const mentioned = new Set();
  if (reply && reply.content) {
    const matches = String(reply.content).match(/@([\w\u4e00-\u9fa5-]+)/g) || [];
    for (const m of matches) mentioned.add(m.slice(1).toLowerCase());
  } else if (kind === 'post' && post.content) {
    const matches = String(post.content).match(/@([\w\u4e00-\u9fa5-]+)/g) || [];
    for (const m of matches) mentioned.add(m.slice(1).toLowerCase());
  }
  for (const bot of list) {
    const u = String(bot.account.username).toLowerCase();
    if (u === actorLower) continue;
    if (mentioned.has(u)) {
      runBot(bot, kind, post, reply, true).catch((e) => console.error('[autobot] run', e));
    } else {
      runBot(bot, kind, post, reply, false).catch((e) => console.error('[autobot] run', e));
    }
  }
}

function onPost(post) {
  triggerFor('post', post, null);
}

function onReply(post, reply) {
  triggerFor('reply', post, reply);
}

function testConnection(opts) {
  const bot = {
    name: opts.name || 'test',
    apiUrl: opts.apiUrl || '',
    apiKey: opts.apiKey || '',
    model: opts.model || '',
    prompt: opts.prompt || '',
    probability: 100,
    cooldownSec: 0
  };
  return callModel(bot, 'post', {
    id: 0,
    boardId: 0,
    title: '【连接测试】',
    author: 'system',
    content: '这是一条来自 KE Hub 后台的连通性测试消息，请仅回复：连接成功'
  }, null);
}

module.exports = {
  onPost,
  onReply,
  runBot,
  callModel,
  testConnection,
  getBot,
  roll,
  inCooldown,
  addLog
};
