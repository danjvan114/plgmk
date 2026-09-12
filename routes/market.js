'use strict';

const path = require('path');
const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const session = require('../lib/session');
const profiles = require('../lib/profiles');
const ratelimit = require('../lib/ratelimit');
const {
  now, toInt, toNum, clamp, cleanText, parseTags, isHttpUrl,
  searchMatch, sortBy, paginate, formatBytes, safeExt
} = require('../lib/util');

const plugins = store.col('plugins');
const ratings = store.col('plugin_ratings');
const likes = store.col('plugin_likes');
const coins = store.col('plugin_coins');

const likesIndex = new Map();
const coinsIndex = new Map();
const ratingsIndex = new Map();
const viewDeltas = new Map();

function indexSet(map, pluginId, uuid) {
  let set = map.get(pluginId);
  if (!set) {
    set = new Set();
    map.set(pluginId, set);
  }
  set.add(uuid);
}

function indexRemove(map, pluginId, uuid) {
  const set = map.get(pluginId);
  if (!set) return;
  set.delete(uuid);
}

function buildIndexes() {
  likesIndex.clear();
  coinsIndex.clear();
  ratingsIndex.clear();
  for (const r of likes.all()) if (r) indexSet(likesIndex, r.pluginId, r.uuid);
  for (const r of coins.all()) if (r) indexSet(coinsIndex, r.pluginId, r.uuid);
  for (const r of ratings.all()) {
    if (!r) continue;
    let m = ratingsIndex.get(r.pluginId);
    if (!m) {
      m = new Map();
      ratingsIndex.set(r.pluginId, m);
    }
    m.set(r.userKey, r);
  }
}

function hasLike(pluginId, uuid) {
  const set = likesIndex.get(pluginId);
  return !!(set && set.has(uuid));
}

function hasCoin(pluginId, uuid) {
  const set = coinsIndex.get(pluginId);
  return !!(set && set.has(uuid));
}

function myRating(pluginId, userKey) {
  const m = ratingsIndex.get(pluginId);
  if (!m) return 0;
  const r = m.get(userKey);
  return r ? r.score : 0;
}

function bumpView(pluginId) {
  viewDeltas.set(pluginId, (viewDeltas.get(pluginId) || 0) + 1);
}

function flushViews() {
  if (viewDeltas.size === 0) return 0;
  let n = 0;
  for (const [id, count] of viewDeltas) {
    const p = plugins.get(id);
    if (p) {
      p.viewCount = (p.viewCount || 0) + count;
      n += 1;
    }
  }
  viewDeltas.clear();
  if (n) store.markDirty('plugins');
  return n;
}

function publicPlugin(p, viewerUuid) {
  if (!p) return null;
  const nick = profiles.getNickname(p.author);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    author: p.author,
    authorNick: nick || p.author,
    authorVerified: profiles.getVerified(p.author),
    authorAvatar: profiles.getAvatar(p.author),
    version: p.version,
    tags: p.tags || [],
    status: p.status,
    source: p.source,
    fileUrl: p.fileUrl || '',
    fileSize: p.fileSize || 0,
    fileSizeText: p.fileSize ? formatBytes(p.fileSize) : '',
    fileName: p.fileName || '',
    icon: p.icon || '',
    cover: p.cover || '',
    images: p.images || [],
    downloadCount: p.downloadCount || 0,
    viewCount: p.viewCount || 0,
    likeCount: p.likeCount || 0,
    coinCount: p.coinCount || 0,
    rating: Number((p.rating || 0).toFixed(2)),
    ratingCount: p.ratingCount || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    liked: viewerUuid ? hasLike(p.id, viewerUuid) : false,
    coined: viewerUuid ? hasCoin(p.id, viewerUuid) : false,
    myRating: viewerUuid ? myRating(p.id, viewerUuid) : 0
  };
}

function sanitizeInput(body, isUpdate) {
  const name = cleanText(body.name, 80);
  const description = cleanText(body.description, 4000);
  const version = cleanText(body.version, 32) || '1.0.0';
  const tags = parseTags(body.tags, 8);
  const errors = [];
  if (!name) errors.push('请填写插件名称');
  if (!description) errors.push('请填写插件介绍');
  if (!tags.length) errors.push('请至少填写一个标签');
  return { name, description, version, tags, errors };
}

function resolveFileSource(body) {
  const fileUrl = cleanText(body.fileUrl, 1000);
  const fileId = cleanText(body.fileId, 200);
  if (fileUrl) {
    if (!isHttpUrl(fileUrl)) return { error: '外部链接格式不正确，必须以 http:// 或 https:// 开头' };
    return { source: 'external', fileUrl, filePath: '', fileName: '', fileSize: 0, fileSha: '' };
  }
  if (fileId) {
    const rel = String(fileId).replace(/^[/\\]+/, '');
    const full = path.resolve(config.uploadDir, rel);
    const base = path.resolve(config.uploadDir);
    if (full !== base && !full.startsWith(base + path.sep)) {
      return { error: '文件路径不合法' };
    }
    let fileName = cleanText(body.fileName, 200) || path.basename(rel);
    fileName = fileName.replace(/\.[^.]+$/, '') + '.cue';
    return {
      source: 'local',
      fileUrl: '',
      filePath: `/uploads/${rel.split(path.sep).join('/')}`,
      fileName,
      fileSize: toNum(body.fileSize, 0),
      fileSha: cleanText(body.fileSha, 128)
    };
  }
  return { error: '请上传插件文件或填写外部下载链接' };
}

module.exports = function register(router) {
  router.get('/api/market/plugins', (req, res) => {
    const q = req.query || {};
    const keyword = cleanText(q.keyword, 64);
    const tag = cleanText(q.tag, 32);
    const author = cleanText(q.author, 64);
    const sort = ['newest', 'hot', 'download', 'rating'].includes(q.sort) ? q.sort : 'newest';
    const page = clamp(toInt(q.page, 1), 1, 10000);
    const size = clamp(toInt(q.size, config.limits.pageDefaultSize), 1, config.limits.pageMaxSize);
    const viewer = req.session ? req.session.uuid : '';
    const mineOnly = q.mine === '1';
    const statusFilter = cleanText(q.status, 16);

    let list = plugins.all().filter((p) => p && p.id);

    if (mineOnly) {
      if (!req.session) {
        H.fail(res, 401, '请先登录', 401);
        return;
      }
      list = list.filter((p) => p.author === req.session.username);
    } else if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter);
    } else {
      list = list.filter((p) => p.status === 'active');
    }

    if (author) list = list.filter((p) => p.author === author);
    if (tag) list = list.filter((p) => (p.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()));
    if (keyword) {
      list = list.filter((p) =>
        searchMatch(p.name, keyword) ||
        searchMatch(p.description, keyword) ||
        searchMatch(p.author, keyword) ||
        searchMatch((p.tags || []).join(' '), keyword)
      );
    }

    if (sort === 'hot') list = sortBy(list, 'viewCount', true);
    else if (sort === 'download') list = sortBy(list, 'downloadCount', true);
    else if (sort === 'rating') list = sortBy(list, 'rating', true);
    else list = sortBy(list, 'id', true);

    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map((p) => publicPlugin(p, viewer)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount
    });
  });

  router.get('/api/market/tags', (req, res) => {
    const counts = new Map();
    for (const p of plugins.all()) {
      if (!p || p.status !== 'active') continue;
      for (const t of p.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const tags = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
    H.ok(res, { tags });
  });

  router.get('/api/market/stats', (req, res) => {
    let pluginCount = 0;
    let downloadCount = 0;
    for (const p of plugins.all()) {
      if (!p || p.status !== 'active') continue;
      pluginCount += 1;
      downloadCount += p.downloadCount || 0;
    }
    H.ok(res, {
      pluginCount,
      downloadCount,
      workCount: store.col('works').count((w) => w && w.status === 'active'),
      postCount: store.col('forum_posts').count((p) => p && p.status !== 'deleted')
    });
  });

  router.get('/api/market/plugins/:id', (req, res) => {
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    const viewer = req.session ? req.session.uuid : '';
    bumpView(p.id);
    H.ok(res, { plugin: publicPlugin(p, viewer) });
  });

  router.post('/api/market/plugins', async (req, res) => {
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

    const input = sanitizeInput(body, false);
    if (input.errors.length) {
      H.fail(res, 400, input.errors[0], 400);
      return;
    }

    const file = resolveFileSource(body);
    if (file.error) {
      H.fail(res, 400, file.error, 400);
      return;
    }

    const ts = now();
    const plugin = plugins.insert({
      id: plugins.nextId(),
      name: input.name,
      description: input.description,
      author: req.session.username,
      version: input.version,
      tags: input.tags,
      status: 'active',
      source: file.source,
      fileUrl: file.fileUrl,
      filePath: file.filePath,
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileSha: file.fileSha,
      icon: isHttpUrl(body.icon) || String(body.icon || '').startsWith('/uploads/') ? cleanText(body.icon, 500) : '',
      cover: isHttpUrl(body.cover) || String(body.cover || '').startsWith('/uploads/') ? cleanText(body.cover, 500) : '',
      images: Array.isArray(body.images)
        ? body.images.filter((u) => isHttpUrl(u) || String(u).startsWith('/uploads/')).slice(0, 8).map((u) => cleanText(u, 500))
        : [],
      downloadCount: 0,
      viewCount: 0,
      likeCount: 0,
      coinCount: 0,
      rating: 0,
      ratingSum: 0,
      ratingCount: 0,
      createdAt: ts,
      updatedAt: ts
    });

    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });

    H.ok(res, { plugin: publicPlugin(plugin, req.session.uuid) });
  });

  router.post('/api/market/plugins/:id', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    if (p.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '只能修改自己发布的插件', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }

    const input = sanitizeInput(body, true);
    if (input.errors.length) {
      H.fail(res, 400, input.errors[0], 400);
      return;
    }

    p.name = input.name;
    p.description = input.description;
    p.version = input.version;
    p.tags = input.tags;
    p.updatedAt = now();

    if (body.fileUrl !== undefined || body.fileId !== undefined) {
      const file = resolveFileSource(body);
      if (file.error) {
        H.fail(res, 400, file.error, 400);
        return;
      }
      p.source = file.source;
      p.fileUrl = file.fileUrl;
      p.filePath = file.filePath;
      p.fileName = file.fileName;
      p.fileSize = file.fileSize;
      p.fileSha = file.fileSha;
    }

    if (body.icon !== undefined) {
      p.icon = isHttpUrl(body.icon) || String(body.icon || '').startsWith('/uploads/') ? cleanText(body.icon, 500) : '';
    }
    if (body.cover !== undefined) {
      p.cover = isHttpUrl(body.cover) || String(body.cover || '').startsWith('/uploads/') ? cleanText(body.cover, 500) : '';
    }
    if (Array.isArray(body.images)) {
      p.images = body.images.filter((u) => isHttpUrl(u) || String(u).startsWith('/uploads/')).slice(0, 8).map((u) => cleanText(u, 500));
    }

    store.markDirty('plugins');
    H.ok(res, { plugin: publicPlugin(p, req.session.uuid) });
  });

  router.post('/api/market/plugins/:id/status', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    if (p.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权操作', 403);
      return;
    }
    let body = {};
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      body = {};
    }
    const status = ['active', 'inactive'].includes(body.status) ? body.status : (p.status === 'active' ? 'inactive' : 'active');
    p.status = status;
    p.updatedAt = now();
    store.markDirty('plugins');
    H.ok(res, { status: p.status });
  });

  router.post('/api/market/plugins/:id/delete', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    if (p.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    plugins.remove(p.id);
    ratings.removeWhere((r) => String(r.pluginId) === String(p.id));
    likes.removeWhere((r) => String(r.pluginId) === String(p.id));
    coins.removeWhere((r) => String(r.pluginId) === String(p.id));
    likesIndex.delete(p.id);
    coinsIndex.delete(p.id);
    ratingsIndex.delete(p.id);
    H.ok(res, { deleted: true });
  });

  router.get('/api/market/plugins/:id/download', async (req, res) => {
    const p = plugins.get(req.params.id);
    if (!p) {
      await H.fail(res, 404, '插件不存在', 404);
      return;
    }
    p.downloadCount = (p.downloadCount || 0) + 1;
    store.markDirty('plugins');

    if (p.source === 'external' && p.fileUrl) {
      H.redirect(res, p.fileUrl, 302);
      return;
    }
    if (!p.filePath) {
      H.fail(res, 404, '插件文件不存在', 404);
      return;
    }
    const rel = p.filePath.replace(/^\/uploads\//, '');
    const full = path.resolve(config.uploadDir, rel);
    const base = path.resolve(config.uploadDir);
    if (full !== base && !full.startsWith(base + path.sep)) {
      H.fail(res, 400, '文件路径不合法', 400);
      return;
    }
    const served = await H.serveFile(req, res, full, {
      download: true,
      downloadName: p.fileName || `${p.name}.cue`
    });
    if (!served) H.fail(res, 404, '插件文件已丢失', 404);
  });

  router.post('/api/market/plugins/:id/like', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    const uuid = req.session.uuid;
    if (hasLike(p.id, uuid)) {
      likes.removeWhere((r) => String(r.pluginId) === String(p.id) && r.uuid === uuid);
      indexRemove(likesIndex, p.id, uuid);
      p.likeCount = Math.max(0, (p.likeCount || 0) - 1);
    } else {
      likes.insert({ id: likes.nextId(), pluginId: p.id, uuid, createdAt: now() });
      indexSet(likesIndex, p.id, uuid);
      p.likeCount = (p.likeCount || 0) + 1;
    }
    store.markDirty('plugins');
    H.ok(res, { likeCount: p.likeCount, liked: hasLike(p.id, uuid) });
  });

  router.post('/api/market/plugins/:id/coin', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    const uuid = req.session.uuid;
    if (hasCoin(p.id, uuid)) {
      H.fail(res, 400, '已经投过币了', 400);
      return;
    }
    coins.insert({ id: coins.nextId(), pluginId: p.id, uuid, createdAt: now() });
    indexSet(coinsIndex, p.id, uuid);
    p.coinCount = (p.coinCount || 0) + 1;
    store.markDirty('plugins');
    H.ok(res, { coinCount: p.coinCount, coined: true });
  });

  router.post('/api/market/plugins/:id/rate', async (req, res) => {
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const score = clamp(toInt(body.score, 0), 1, 5);
    if (!score) {
      H.fail(res, 400, '评分需在 1 到 5 之间', 400);
      return;
    }
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    const ip = H.clientIp(req) || 'anonymous';
    const userKey = req.session ? req.session.uuid : `ip:${ip}`;

    let m = ratingsIndex.get(p.id);
    if (!m) {
      m = new Map();
      ratingsIndex.set(p.id, m);
    }
    const existing = m.get(userKey);
    if (existing) {
      p.ratingSum = (p.ratingSum || 0) - existing.score + score;
      existing.score = score;
      existing.updatedAt = now();
      store.markDirty('plugin_ratings');
    } else {
      const rec = ratings.insert({ id: ratings.nextId(), pluginId: p.id, userKey, score, createdAt: now(), updatedAt: now() });
      m.set(userKey, rec);
      p.ratingSum = (p.ratingSum || 0) + score;
      p.ratingCount = (p.ratingCount || 0) + 1;
    }
    p.rating = p.ratingCount ? p.ratingSum / p.ratingCount : 0;
    store.markDirty('plugins');
    H.ok(res, {
      rating: Number(p.rating.toFixed(2)),
      ratingCount: p.ratingCount,
      myRating: score
    });
  });

  router.get('/api/market/dev/stats', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const me = req.session.username;
    const mine = plugins.all().filter((p) => p && p.author === me);
    const summary = {
      total: mine.length,
      active: mine.filter((p) => p.status === 'active').length,
      downloads: mine.reduce((s, p) => s + (p.downloadCount || 0), 0),
      views: mine.reduce((s, p) => s + (p.viewCount || 0), 0),
      likes: mine.reduce((s, p) => s + (p.likeCount || 0), 0),
      coins: mine.reduce((s, p) => s + (p.coinCount || 0), 0),
      rating: 0
    };
    const rated = mine.filter((p) => p.ratingCount > 0);
    if (rated.length) {
      summary.rating = Number(
        (rated.reduce((s, p) => s + (p.rating || 0), 0) / rated.length).toFixed(2)
      );
    }
    const items = sortBy(mine, 'id', true).slice(0, 50).map((p) => publicPlugin(p, req.session.uuid));
    H.ok(res, { summary, items });
  });

  const flushTimer = setInterval(() => {
    try {
      flushViews();
    } catch (e) {
      console.error('[market] flushViews error', e);
    }
  }, 10000);
  if (flushTimer.unref) flushTimer.unref();

  module.exports.buildIndexes = buildIndexes;
  module.exports.flushViews = flushViews;
};

module.exports.buildIndexes = buildIndexes;
module.exports.flushViews = flushViews;
module.exports.publicPlugin = publicPlugin;
