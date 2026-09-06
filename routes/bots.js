'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const session = require('../lib/session');
const ratelimit = require('../lib/ratelimit');
const autobot = require('../lib/autobot');
const { now, toInt, clamp, cleanText, sha256, isHttpUrl } = require('../lib/util');

const bots = store.col('bots');
const tested = new Map();
const TEST_TTL = 10 * 60 * 1000;

function isStub(url) {
  return String(url || '').trim() === 'stub://demo';
}

function nonceKey(url, model, key) {
  return sha256(`${url}|${model}|${key}`);
}

function cleanAccount(body) {
  const username = cleanText(body.username, 64);
  return {
    username,
    nickname: cleanText(body.nickname, 64) || username,
    avatar: cleanText(body.avatar, 500)
  };
}

function maskKey(k) {
  const s = String(k || '');
  if (!s) return '';
  if (s.length <= 8) return '****';
  return s.slice(0, 4) + '****' + s.slice(-4);
}

function publicBot(b, withKey) {
  return {
    id: b.id,
    name: b.name,
    enabled: !!b.enabled,
    model: b.model || '',
    apiUrl: b.apiUrl || '',
    apiKey: withKey ? (b.apiKey || '') : maskKey(b.apiKey),
    hasKey: !!(b.apiKey || '').length,
    prompt: b.prompt || '',
    probability: toInt(b.probability, 100),
    cooldownSec: toInt(b.cooldownSec, 0),
    account: {
      username: (b.account && b.account.username) || '',
      nickname: (b.account && (b.account.nickname || b.account.username)) || '',
      avatar: (b.account && b.account.avatar) || ''
    },
    replyCount: toInt(b.replyCount, 0),
    lastRunAt: b.lastRunAt || 0,
    lastOkAt: b.lastOkAt || 0,
    lastError: b.lastError || '',
    createdBy: b.createdBy || '',
    createdAt: b.createdAt || 0,
    updatedAt: b.updatedAt || 0
  };
}

function sweepTested() {
  const ts = now();
  for (const [k, t] of tested) {
    if (ts - t > TEST_TTL) tested.delete(k);
  }
}

function bootstraps(ctx, b) {
  const me = ctx.username;
  const isOwner = !!ctx.isOwner;
  const mine = b.createdBy === me;
  return {
    mine,
    canEdit: isOwner || mine,
    canToggle: isOwner,
    canDelete: isOwner || mine,
    isOwnerOf: isOwner
  };
}

module.exports = function register(router) {
  const sweeper = setInterval(sweepTested, 5 * 60 * 1000);
  if (sweeper.unref) sweeper.unref();

  router.get('/api/bots', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    session.refreshRole(req.session);
    const me = req.session.username;
    const isOwner = !!req.session.isOwner;
    let list = bots.all().filter((b) => b && b.id);
    if (!isOwner) list = list.filter((b) => b.createdBy === me);
    list = list.slice().sort((a, b) => (b.id || 0) - (a.id || 0));
    H.ok(res, {
      items: list.map((b) => Object.assign(publicBot(b, false), bootstraps(req.session, b))),
      total: list.length,
      isOwner
    });
  });

  router.get('/api/bots/all', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    session.refreshRole(req.session);
    if (!req.session.isOwner) {
      H.fail(res, 403, '需要超级管理员权限', 403);
      return;
    }
    const list = bots.all().filter((b) => b && b.id).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
    H.ok(res, {
      items: list.map((b) => Object.assign(publicBot(b, false), bootstraps(req.session, b))),
      total: list.length,
      isOwner: true
    });
  });

  router.get('/api/bots/:id/logs', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const b = bots.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '机器人不存在', 404);
      return;
    }
    const perms = bootstraps(req.session, b);
    if (!perms.canEdit) {
      H.fail(res, 403, '无权查看该机器人日志', 403);
      return;
    }
    const page = clamp(toInt(req.query.page, 1), 1, 10000);
    const size = clamp(toInt(req.query.size, 20), 1, 100);
    const all = store.col('bot_logs').all().filter((l) => l && String(l.botId) === String(b.id)).slice().reverse();
    const offset = (page - 1) * size;
    H.ok(res, {
      items: all.slice(offset, offset + size).map((l) => ({
        id: l.id,
        kind: l.kind || '',
        ok: !!l.ok,
        postId: l.postId || 0,
        replyId: l.replyId || 0,
        model: l.model || '',
        latencyMs: l.latencyMs || 0,
        textPreview: l.textPreview || '',
        error: l.error || '',
        createdAt: l.createdAt || 0
      })),
      total: all.length,
      page,
      pageCount: Math.max(1, Math.ceil(all.length / size))
    });
  });

  router.post('/api/bots/test', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('api')(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const apiUrl = cleanText(body.apiUrl, 300);
    const model = cleanText(body.model, 100);
    if (!apiUrl) {
      H.fail(res, 400, '请填写 API 地址', 400);
      return;
    }
    if (!model && !isStub(apiUrl)) {
      H.fail(res, 400, '请填写模型名称', 400);
      return;
    }
    const botId = toInt(body.botId, 0);
    const existing = botId && bots.get(botId);
    if (existing) {
      const perms = bootstraps(req.session, existing);
      if (!perms.canEdit) {
        H.fail(res, 403, '无权测试该机器人', 403);
        return;
      }
    }
    const apiKey = cleanText(body.apiKey, 500) || (existing && existing.apiKey) || '';
    const started = Date.now();
    try {
      const text = await autobot.testConnection({ apiUrl, apiKey, model, name: 'connect-test', prompt: body.prompt ? cleanText(body.prompt, 2000) : '' });
      const key = nonceKey(apiUrl, model, apiKey);
      tested.set(key, now());
      H.ok(res, { ok: true, nonce: key, latencyMs: Date.now() - started, preview: String(text || '').slice(0, 200) });
    } catch (e) {
      H.fail(res, 400, '连接失败：' + (e && e.message ? e.message : '未知错误'), 400, { latencyMs: Date.now() - started });
    }
  });

  router.post('/api/bots', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const name = cleanText(body.name, 40);
    const apiUrl = cleanText(body.apiUrl, 300);
    const model = cleanText(body.model, 100);
    const account = cleanAccount(body.account || {});
    if (!name) {
      H.fail(res, 400, '请填写机器人名称', 400);
      return;
    }
    if (!apiUrl) {
      H.fail(res, 400, '请填写 API 地址', 400);
      return;
    }
    if (!account.username) {
      H.fail(res, 400, '请填写发帖账号（用户中心用户名）', 400);
      return;
    }
    if (!isStub(apiUrl) && !model) {
      H.fail(res, 400, '请填写模型名称', 400);
      return;
    }
    if (!isStub(apiUrl)) {
      const key = nonceKey(apiUrl, model, cleanText(body.apiKey, 500));
      if (!tested.has(key) || now() - tested.get(key) > TEST_TTL) {
        H.fail(res, 400, '请先通过「测试连接」，连接成功后才能保存', 400);
        return;
      }
      tested.delete(key);
    }
    const rec = bots.insert({
      id: bots.nextId(),
      name,
      enabled: !!body.enabled,
      apiUrl,
      apiKey: cleanText(body.apiKey, 500),
      model,
      prompt: cleanText(body.prompt, 2000),
      probability: clamp(toInt(body.probability, 100), 0, 100),
      cooldownSec: clamp(toInt(body.cooldownSec, 0), 0, 86400),
      account,
      replyCount: 0,
      createdBy: req.session.username,
      createdAt: now(),
      updatedAt: now()
    });
    H.ok(res, { bot: Object.assign(publicBot(rec, false), bootstraps(req.session, rec)) });
  });

  router.post('/api/bots/:id', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const b = bots.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '机器人不存在', 404);
      return;
    }
    session.refreshRole(req.session);
    const perms = bootstraps(req.session, b);
    if (!perms.canEdit) {
      H.fail(res, 403, '仅创建者或超级管理员可编辑', 403);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const name = body.name === undefined ? b.name : cleanText(body.name, 40);
    const apiUrl = body.apiUrl === undefined ? b.apiUrl : cleanText(body.apiUrl, 300);
    const apiKey = body.apiKey === undefined ? b.apiKey : cleanText(body.apiKey, 500);
    const model = body.model === undefined ? b.model : cleanText(body.model, 100);
    if (!name) {
      H.fail(res, 400, '请填写机器人名称', 400);
      return;
    }
    if (!apiUrl) {
      H.fail(res, 400, '请填写 API 地址', 400);
      return;
    }
    const account = body.account === undefined ? b.account : cleanAccount(body.account || {});
    if (!account.username) {
      H.fail(res, 400, '请填写发帖账号（用户中心用户名）', 400);
      return;
    }
    if (!isStub(apiUrl) && !model) {
      H.fail(res, 400, '请填写模型名称', 400);
      return;
    }
    const changedKey = nonceKey(b.apiUrl || '', b.model || '', b.apiKey || '') !== nonceKey(apiUrl, model, apiKey);
    if (changedKey && !isStub(apiUrl)) {
      const key = nonceKey(apiUrl, model, apiKey);
      if (!tested.has(key) || now() - tested.get(key) > TEST_TTL) {
        H.fail(res, 400, 'API 地址/密钥/模型有变更，请先通过「测试连接」', 400);
        return;
      }
      tested.delete(key);
    }
    b.name = name;
    b.apiUrl = apiUrl;
    b.apiKey = apiKey;
    b.model = model;
    if (body.prompt !== undefined) b.prompt = cleanText(body.prompt, 2000);
    if (body.probability !== undefined) b.probability = clamp(toInt(body.probability, 100), 0, 100);
    if (body.cooldownSec !== undefined) b.cooldownSec = clamp(toInt(body.cooldownSec, 0), 0, 86400);
    if (body.account !== undefined) b.account = account;
    b.updatedAt = now();
    store.markDirty('bots');
    H.ok(res, { bot: Object.assign(publicBot(b, false), bootstraps(req.session, b)) });
  });

  router.post('/api/bots/:id/enabled', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const b = bots.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '机器人不存在', 404);
      return;
    }
    session.refreshRole(req.session);
    const perms = bootstraps(req.session, b);
    if (!perms.isOwner && !perms.mine) {
      H.fail(res, 403, '只能启用/禁用自己创建的机器人或超级管理员', 403);
      return;
    }
    let body = {};
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      body = {};
    }
    if (typeof body.enabled === 'boolean') b.enabled = body.enabled;
    else b.enabled = !b.enabled;
    b.updatedAt = now();
    store.markDirty('bots');
    H.ok(res, { enabled: !!b.enabled });
  });

  router.post('/api/bots/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const b = bots.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '机器人不存在', 404);
      return;
    }
    session.refreshRole(req.session);
    const perms = bootstraps(req.session, b);
    if (!perms.canDelete) {
      H.fail(res, 403, '仅创建者或超级管理员可删除', 403);
      return;
    }
    bots.remove(b.id);
    store.col('bot_logs').removeWhere((l) => l && String(l.botId) === String(b.id));
    H.ok(res, { deleted: true });
  });
};
