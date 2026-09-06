'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const profiles = require('../lib/profiles');
const mention = require('../lib/mention');
const ratelimit = require('../lib/ratelimit');
const {
  now, toInt, clamp, cleanText, searchMatch, sortBy, paginate
} = require('../lib/util');

const boards = store.col('forum_boards');
const posts = store.col('forum_posts');
const replies = store.col('forum_replies');

const replyIndex = new Map();
const viewDeltas = new Map();

const DEFAULT_BOARDS = [
  { name: '综合讨论', description: '插件、开发、使用心得都可以聊', icon: 'forum', color: '#5c6bc0' },
  { name: '插件发布', description: '发布你的插件作品与更新日志', icon: 'extension', color: '#26a69a' },
  { name: '求助问答', description: '遇到问题？在这里提问', icon: 'help_outline', color: '#ffa726' },
  { name: '资源分享', description: '素材、工具、教程资源', icon: 'folder_shared', color: '#7e57c2' },
  { name: '站务公告', description: '站点公告与规则说明', icon: 'campaign', color: '#ef5350' }
];

function buildIndexes() {
  replyIndex.clear();
  for (const r of replies.all()) {
    if (!r) continue;
    let list = replyIndex.get(r.postId);
    if (!list) {
      list = [];
      replyIndex.set(r.postId, list);
    }
    list.push(r);
  }
  for (const list of replyIndex.values()) list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function seedBoards() {
  if (boards.size() > 0) return;
  DEFAULT_BOARDS.forEach((b, i) => {
    boards.insert({
      id: boards.nextId(),
      name: b.name,
      description: b.description,
      icon: b.icon,
      color: b.color,
      order: i + 1,
      postCount: 0,
      createdAt: now()
    });
  });
}

function recalcReplyCount(postId) {
  const p = posts.get(postId);
  if (!p) return 0;
  const list = replyIndex.get(postId) || [];
  const count = list.filter((r) => r.status !== 'deleted').length;
  const last = list.filter((r) => r.status !== 'deleted').slice(-1)[0];
  p.replyCount = count;
  p.lastReplyAt = last ? last.createdAt : 0;
  p.lastReplyBy = last ? last.author : '';
  store.markDirty('forum_posts');
  return count;
}

function addReplyToIndex(r) {
  let list = replyIndex.get(r.postId);
  if (!list) {
    list = [];
    replyIndex.set(r.postId, list);
  }
  list.push(r);
  list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function removeReplyFromIndex(replyId, postId) {
  const list = replyIndex.get(postId);
  if (!list) return;
  const idx = list.findIndex((r) => String(r.id) === String(replyId));
  if (idx >= 0) list.splice(idx, 1);
}

function bumpView(postId) {
  viewDeltas.set(postId, (viewDeltas.get(postId) || 0) + 1);
}

function flushViews() {
  if (!viewDeltas.size) return;
  for (const [id, count] of viewDeltas) {
    const p = posts.get(id);
    if (p) p.viewCount = (p.viewCount || 0) + count;
  }
  viewDeltas.clear();
  store.markDirty('forum_posts');
}

function publicBoard(b) {
  const list = replyIndex;
  void list;
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    color: b.color,
    order: b.order || 0,
    postCount: posts.count((p) => p && String(p.boardId) === String(b.id) && p.status !== 'deleted')
  };
}

function publicPost(p, viewerUuid) {
  if (!p) return null;
  return {
    id: p.id,
    boardId: p.boardId,
    boardName: (boards.get(p.boardId) || {}).name || '未分类',
    title: p.title,
    excerpt: cleanText(p.content, 120),
    author: p.author,
    authorNick: profiles.getNickname(p.author) || p.author,
    authorVerified: profiles.getVerified(p.author),
    authorAvatar: profiles.getAvatar(p.author),
    status: p.status,
    isPinned: !!p.isPinned,
    tags: p.tags || [],
    viewCount: p.viewCount || 0,
    replyCount: p.replyCount || 0,
    likeCount: p.likeCount || 0,
    lastReplyAt: p.lastReplyAt || 0,
    lastReplyBy: p.lastReplyBy || '',
    lastReplyNick: p.lastReplyBy ? profiles.getNickname(p.lastReplyBy) || p.lastReplyBy : '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

function publicReply(r, viewerUuid) {
  if (!r) return null;
  return {
    id: r.id,
    postId: r.postId,
    parentId: r.parentId || 0,
    author: r.author,
    authorNick: profiles.getNickname(r.author) || r.author,
    authorVerified: profiles.getVerified(r.author),
    authorAvatar: profiles.getAvatar(r.author),
    content: r.status === 'deleted' ? '该回复已被删除' : r.content,
    status: r.status,
    isPinned: !!r.isPinned,
    replyTo: r.replyTo || '',
    replyToNick: r.replyTo ? profiles.getNickname(r.replyTo) || r.replyTo : '',
    createdAt: r.createdAt
  };
}

function buildReplyTree(postId) {
  const list = replyIndex.get(postId) || [];
  const active = list.filter((r) => r.status !== 'deleted');
  const byId = new Map();
  const roots = [];
  for (const r of active) {
    byId.set(String(r.id), Object.assign({}, publicReply(r), { children: [] }));
  }
  for (const r of active) {
    const node = byId.get(String(r.id));
    const parent = r.parentId ? byId.get(String(r.parentId)) : null;
    if (parent && String(r.parentId) !== String(r.id)) parent.children.push(node);
    else roots.push(node);
  }
  const pinned = roots.filter((r) => r.isPinned);
  const normal = roots.filter((r) => !r.isPinned);
  return { items: pinned.concat(normal), total: active.length };
}

function createReply(post, data) {
  const r = replies.insert({
    id: replies.nextId(),
    postId: post.id,
    parentId: data.parentId || 0,
    author: data.author,
    content: data.content,
    replyTo: data.replyTo || '',
    status: data.status || 'active',
    isPinned: false,
    createdAt: now()
  });
  addReplyToIndex(r);
  profiles.put(data.author, { nickname: data.nickname || data.author, avatar: data.avatar || '' });
  recalcReplyCount(post.id);
  return r;
}

function fireBots(name, args) {
  setImmediate(() => {
    try {
      const autobot = require('../lib/autobot');
      if (typeof autobot[name] === 'function') autobot[name](...args);
    } catch (e) {
      console.error('[autobot]', name, e);
    }
  });
}

module.exports = function register(router) {
  seedBoards();
  buildIndexes();

  router.get('/api/forum/boards', (req, res) => {
    const list = sortBy(boards.all().filter((b) => b && b.id), 'order', false);
    H.ok(res, { boards: list.map(publicBoard) });
  });

  router.get('/api/forum/posts', (req, res) => {
    const q = req.query || {};
    const boardId = toInt(q.board, 0);
    const keyword = cleanText(q.keyword, 64);
    const sort = ['newest', 'hot', 'reply'].includes(q.sort) ? q.sort : 'newest';
    const page = clamp(toInt(q.page, 1), 1, 10000);
    const size = clamp(toInt(q.size, config.limits.pageDefaultSize), 1, config.limits.pageMaxSize);

    let list = posts.all().filter((p) => p && p.status !== 'deleted');
    if (boardId) list = list.filter((p) => String(p.boardId) === String(boardId));
    if (q.author) list = list.filter((p) => p.author === cleanText(q.author, 64));
    if (keyword) {
      list = list.filter((p) => searchMatch(p.title, keyword) || searchMatch(p.content, keyword));
    }

    const pinned = list.filter((p) => p.isPinned);
    const normal = list.filter((p) => !p.isPinned);
    if (sort === 'hot') normal.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    else if (sort === 'reply') normal.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
    else normal.sort((a, b) => (b.id || 0) - (a.id || 0));
    pinned.sort((a, b) => (b.id || 0) - (a.id || 0));

    const merged = pinned.concat(normal);
    const result = paginate(merged, page, size);
    H.ok(res, {
      items: result.items.map((p) => publicPost(p, req.session ? req.session.uuid : '')),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount,
      board: boardId ? publicBoard(boards.get(boardId) || {}) : null
    });
  });

  router.get('/api/forum/posts/:id', (req, res) => {
    const p = posts.get(req.params.id);
    if (!p || p.status === 'deleted') {
      H.fail(res, 404, '帖子不存在或已被删除', 404);
      return;
    }
    bumpView(p.id);
    const tree = buildReplyTree(p.id);
    H.ok(res, {
      post: Object.assign(publicPost(p, req.session ? req.session.uuid : ''), { content: p.content }),
      replies: tree.items,
      replyTotal: tree.total
    });
  });

  router.post('/api/forum/posts', async (req, res) => {
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
    const title = cleanText(body.title, 120);
    const content = cleanText(body.content, 20000);
    const boardId = toInt(body.boardId, 0);
    if (!title) {
      H.fail(res, 400, '请填写标题', 400);
      return;
    }
    if (!content) {
      H.fail(res, 400, '请填写正文', 400);
      return;
    }
    if (!boards.get(boardId)) {
      H.fail(res, 400, '请选择板块', 400);
      return;
    }

    const ts = now();
    const post = posts.insert({
      id: posts.nextId(),
      boardId,
      title,
      content,
      author: req.session.username,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 5).map((t) => cleanText(t, 24)).filter(Boolean) : [],
      status: 'active',
      isPinned: false,
      viewCount: 0,
      replyCount: 0,
      likeCount: 0,
      lastReplyAt: 0,
      lastReplyBy: '',
      createdAt: ts,
      updatedAt: ts
    });
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    H.ok(res, { post: publicPost(post, req.session.uuid) });
    mention.notifyMentions(content + ' ' + title, req.session.username, 'forum', `/post/${post.id}`, [req.session.username]);
    fireBots('onPost', [post]);
  });

  router.post('/api/forum/posts/:id', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = posts.get(req.params.id);
    if (!p || p.status === 'deleted') {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    if (p.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权编辑', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    if (body.title !== undefined) {
      const title = cleanText(body.title, 120);
      if (!title) {
        H.fail(res, 400, '请填写标题', 400);
        return;
      }
      p.title = title;
    }
    if (body.content !== undefined) {
      const content = cleanText(body.content, 20000);
      if (!content) {
        H.fail(res, 400, '请填写正文', 400);
        return;
      }
      p.content = content;
    }
    if (body.boardId !== undefined && boards.get(toInt(body.boardId, 0))) p.boardId = toInt(body.boardId, 0);
    if (Array.isArray(body.tags)) p.tags = body.tags.slice(0, 5).map((t) => cleanText(t, 24)).filter(Boolean);
    p.updatedAt = now();
    store.markDirty('forum_posts');
    H.ok(res, { post: publicPost(p, req.session.uuid) });
  });

  router.post('/api/forum/posts/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const p = posts.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    if (p.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    p.status = 'deleted';
    for (const r of replies.all()) {
      if (r && String(r.postId) === String(p.id)) r.status = 'deleted';
    }
    store.markDirty('forum_posts');
    store.markDirty('forum_replies');
    recalcReplyCount(p.id);
    H.ok(res, { deleted: true });
  });

  router.post('/api/forum/posts/:id/pin', (req, res) => {
    if (!req.session || req.session.role !== 'admin') {
      H.fail(res, 403, '需要管理员权限', 403);
      return;
    }
    const p = posts.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    p.isPinned = !p.isPinned;
    store.markDirty('forum_posts');
    H.ok(res, { isPinned: p.isPinned });
  });

  router.post('/api/forum/posts/:id/like', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = posts.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    const key = `${p.id}:${req.session.uuid}`;
    const liked = store.col('counters').get(key);
    if (liked) {
      store.col('counters').remove(key);
      p.likeCount = Math.max(0, (p.likeCount || 0) - 1);
    } else {
      store.col('counters').insert({ id: key, kind: 'post_like', createdAt: now() });
      p.likeCount = (p.likeCount || 0) + 1;
    }
    store.markDirty('forum_posts');
    H.ok(res, { likeCount: p.likeCount, liked: !liked });
  });

  router.get('/api/forum/posts/:id/replies', (req, res) => {
    const p = posts.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    const tree = buildReplyTree(p.id);
    H.ok(res, { items: tree.items, total: tree.total });
  });

  router.post('/api/forum/posts/:id/replies', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const p = posts.get(req.params.id);
    if (!p || p.status === 'deleted') {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const content = cleanText(body.content, 5000);
    if (!content) {
      H.fail(res, 400, '回复内容不能为空', 400);
      return;
    }

    let parentId = toInt(body.parentId, 0);
    let replyTo = '';
    if (parentId) {
      const parent = replies.get(parentId);
      if (!parent || String(parent.postId) !== String(p.id)) {
        parentId = 0;
      } else {
        replyTo = parent.author;
      }
    }

    const reply = createReply(p, {
      author: req.session.username,
      nickname: req.session.nickname,
      avatar: req.session.avatar,
      content,
      parentId,
      replyTo
    });
    H.ok(res, { reply: publicReply(reply, req.session.uuid), replyCount: p.replyCount });
    mention.notifyMentions(content, req.session.username, 'forum', `/post/${p.id}#reply-${reply.id}`, [p.author, replyTo]);
    fireBots('onReply', [p, reply]);
  });

  router.post('/api/forum/replies/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const r = replies.get(req.params.id);
    if (!r) {
      H.fail(res, 404, '回复不存在', 404);
      return;
    }
    if (r.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    r.status = 'deleted';
    store.markDirty('forum_replies');
    recalcReplyCount(r.postId);
    const p = posts.get(r.postId);
    H.ok(res, { deleted: true, replyCount: p ? p.replyCount : 0 });
  });

  router.post('/api/forum/replies/:id/pin', (req, res) => {
    if (!req.session || req.session.role !== 'admin') {
      H.fail(res, 403, '需要管理员权限', 403);
      return;
    }
    const r = replies.get(req.params.id);
    if (!r) {
      H.fail(res, 404, '回复不存在', 404);
      return;
    }
    r.isPinned = !r.isPinned;
    store.markDirty('forum_replies');
    H.ok(res, { isPinned: r.isPinned });
  });

  const flushTimer = setInterval(() => {
    try {
      flushViews();
    } catch (e) {
      console.error('[forum] flushViews error', e);
    }
  }, 10000);
  if (flushTimer.unref) flushTimer.unref();
};

module.exports.buildIndexes = buildIndexes;
module.exports.flushViews = flushViews;
module.exports.recalcReplyCount = recalcReplyCount;
module.exports.createReply = createReply;
