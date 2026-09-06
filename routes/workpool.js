'use strict';

const path = require('path');
const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const profiles = require('../lib/profiles');
const ratelimit = require('../lib/ratelimit');
const {
  now, toInt, clamp, cleanText, parseTags, isHttpUrl, searchMatch, paginate, sortBy
} = require('../lib/util');

const works = store.col('works');
const comments = store.col('work_comments');
const likes = store.col('work_likes');
const favs = store.col('work_favs');
const coins = store.col('work_coins');
const follows = store.col('follows');
const messages = store.col('messages');

const likesIndex = new Map();
const favsIndex = new Map();
const coinsIndex = new Map();
const followIndex = new Map();
const commentIndex = new Map();
const viewDeltas = new Map();

function setKey(map, key, uuid) {
  let s = map.get(key);
  if (!s) {
    s = new Set();
    map.set(key, s);
  }
  s.add(uuid);
}

function delKey(map, key, uuid) {
  const s = map.get(key);
  if (s) s.delete(uuid);
}

function hasKey(map, key, uuid) {
  const s = map.get(key);
  return !!(s && s.has(uuid));
}

function buildIndexes() {
  likesIndex.clear();
  favsIndex.clear();
  coinsIndex.clear();
  followIndex.clear();
  commentIndex.clear();
  for (const r of likes.all()) if (r) setKey(likesIndex, r.workId, r.uuid);
  for (const r of favs.all()) if (r) setKey(favsIndex, r.workId, r.uuid);
  for (const r of coins.all()) if (r) setKey(coinsIndex, r.workId, r.uuid);
  for (const r of follows.all()) if (r) setKey(followIndex, r.target, r.follower);
  for (const c of comments.all()) {
    if (!c) continue;
    let list = commentIndex.get(c.workId);
    if (!list) {
      list = [];
      commentIndex.set(c.workId, list);
    }
    list.push(c);
  }
  for (const list of commentIndex.values()) list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function recalcCommentCount(workId) {
  const w = works.get(workId);
  if (!w) return 0;
  const list = commentIndex.get(workId) || [];
  w.commentCount = list.filter((c) => !c.isDeleted).length;
  store.markDirty('works');
  return w.commentCount;
}

function bumpView(workId) {
  viewDeltas.set(workId, (viewDeltas.get(workId) || 0) + 1);
}

function flushViews() {
  if (!viewDeltas.size) return;
  for (const [id, count] of viewDeltas) {
    const w = works.get(id);
    if (w) w.viewCount = (w.viewCount || 0) + count;
  }
  viewDeltas.clear();
  store.markDirty('works');
}

function publicWork(w, viewerUuid) {
  if (!w) return null;
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    author: w.author,
    authorNick: profiles.getNickname(w.author) || w.author,
    authorVerified: profiles.getVerified(w.author),
    authorAvatar: profiles.getAvatar(w.author),
    type: w.type,
    thumbnail: w.thumbnail || '',
    fileUrl: w.fileUrl || '',
    filePath: w.filePath || '',
    tags: w.tags || [],
    status: w.status,
    isHidden: !!w.isHidden,
    likeCount: w.likeCount || 0,
    favCount: w.favCount || 0,
    commentCount: w.commentCount || 0,
    coinCount: w.coinCount || 0,
    viewCount: w.viewCount || 0,
    player: {
      f: w.f || '',
      u: w.u || '',
      auth: w.auth || 0,
      o: w.o || 0,
      v: w.v || '',
      auto: w.auto || 0
    },
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    liked: viewerUuid ? hasKey(likesIndex, w.id, viewerUuid) : false,
    faved: viewerUuid ? hasKey(favsIndex, w.id, viewerUuid) : false,
    coined: viewerUuid ? hasKey(coinsIndex, w.id, viewerUuid) : false,
    following: viewerUuid ? hasKey(followIndex, w.author, viewerUuid) : false
  };
}

function publicComment(c) {
  if (!c) return null;
  return {
    id: c.id,
    workId: c.workId,
    parentId: c.parentId || 0,
    author: c.author,
    authorNick: profiles.getNickname(c.author) || c.author,
    authorVerified: profiles.getVerified(c.author),
    authorAvatar: profiles.getAvatar(c.author),
    content: c.isDeleted ? '该评论已被删除' : c.content,
    isDeleted: !!c.isDeleted,
    isPinned: !!c.isPinned,
    replyTo: c.replyTo || '',
    replyToNick: c.replyTo ? profiles.getNickname(c.replyTo) || c.replyTo : '',
    createdAt: c.createdAt
  };
}

function buildCommentTree(workId) {
  const list = commentIndex.get(workId) || [];
  const active = list.filter((c) => !c.isDeleted);
  const byId = new Map();
  const roots = [];
  for (const c of active) byId.set(String(c.id), Object.assign({}, publicComment(c), { children: [] }));
  for (const c of active) {
    const node = byId.get(String(c.id));
    const parent = c.parentId ? byId.get(String(c.parentId)) : null;
    if (parent && String(c.parentId) !== String(c.id)) parent.children.push(node);
    else roots.push(node);
  }
  const pinned = roots.filter((c) => c.isPinned);
  const normal = roots.filter((c) => !c.isPinned);
  return { items: pinned.concat(normal), total: active.length };
}

function notify(target, type, text, link, from) {
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

module.exports = function register(router) {
  router.get('/api/works', (req, res) => {
    const q = req.query || {};
    const keyword = cleanText(q.keyword, 64);
    const type = cleanText(q.type, 16);
    const tag = cleanText(q.tag, 32);
    const author = cleanText(q.author, 64);
    const sort = ['newest', 'hot', 'like', 'comment'].includes(q.sort) ? q.sort : 'newest';
    const page = clamp(toInt(q.page, 1), 1, 10000);
    const size = clamp(toInt(q.size, 20), 1, config.limits.pageMaxSize);
    const viewer = req.session ? req.session.uuid : '';

    let list = works.all().filter((w) => w && w.status === 'active' && !w.isHidden);
    if (type) list = list.filter((w) => w.type === type);
    if (author) list = list.filter((w) => w.author === author);
    if (tag) list = list.filter((w) => (w.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()));
    if (keyword) {
      list = list.filter(
        (w) => searchMatch(w.title, keyword) || searchMatch(w.description, keyword) || searchMatch(w.author, keyword)
      );
    }

    if (sort === 'hot') list = sortBy(list, 'viewCount', true);
    else if (sort === 'like') list = sortBy(list, 'likeCount', true);
    else if (sort === 'comment') list = sortBy(list, 'commentCount', true);
    else list = sortBy(list, 'id', true);

    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map((w) => publicWork(w, viewer)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pageCount: result.pageCount
    });
  });

  router.get('/api/works/tags', (req, res) => {
    const counts = new Map();
    for (const w of works.all()) {
      if (!w || w.status !== 'active' || w.isHidden) continue;
      for (const t of w.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const tags = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
    H.ok(res, { tags });
  });

  router.get('/api/works/:id', (req, res) => {
    const w = works.get(req.params.id);
    if (!w || w.status === 'deleted') {
      H.fail(res, 404, '作品不存在', 404);
      return;
    }
    if (w.isHidden && (!req.session || (req.session.username !== w.author && req.session.role !== 'admin'))) {
      H.fail(res, 403, '该作品已被隐藏', 403);
      return;
    }
    bumpView(w.id);
    const tree = buildCommentTree(w.id);
    H.ok(res, {
      work: Object.assign(publicWork(w, req.session ? req.session.uuid : ''), { content: w.content || w.description }),
      comments: tree.items,
      commentTotal: tree.total
    });
  });

  router.post('/api/works', async (req, res) => {
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
    const title = cleanText(body.title, 100);
    const description = cleanText(body.description, 8000);
    if (!title) {
      H.fail(res, 400, '请填写作品标题', 400);
      return;
    }
    const type = ['player', 'img', 'redirect'].includes(body.type) ? body.type : 'player';
    let thumbnail = cleanText(body.thumbnail, 500);
    const f = cleanText(body.f, 1000);
    let u = cleanText(body.u, 64);
    const auth = body.auth === 1 || body.auth === '1' ? 1 : 0;
    let o = String(body.o || '');
    if (o !== '1' && o !== '2') o = '';
    let v = cleanText(body.v, 4000);
    const auto = body.auto === 1 || body.auto === '1' ? 1 : 0;

    if (type === 'redirect') {
      if (!isHttpUrl(f)) {
        H.fail(res, 400, '跳转类作品需要填写有效的外部链接', 400);
        return;
      }
    } else if (!f) {
      H.fail(res, 400, '请填写作品文件链接 (f)', 400);
      return;
    }
    if (auth && !u) u = '123456';
    if (thumbnail && !isHttpUrl(thumbnail) && !thumbnail.startsWith('/uploads/')) thumbnail = '';

    const ts = now();
    const work = works.insert({
      id: works.nextId(),
      title,
      description,
      content: description,
      author: req.session.username,
      type,
      thumbnail,
      fileUrl: f,
      filePath: '',
      f, u, auth, o, v, auto,
      tags: parseTags(body.tags, 8),
      status: 'active',
      isHidden: false,
      likeCount: 0,
      favCount: 0,
      commentCount: 0,
      coinCount: 0,
      viewCount: 0,
      createdAt: ts,
      updatedAt: ts
    });
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    H.ok(res, { work: publicWork(work, req.session.uuid) });
  });

  router.post('/api/works/:id', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const w = works.get(req.params.id);
    if (!w) {
      H.fail(res, 404, '作品不存在', 404);
      return;
    }
    if (w.author !== req.session.username && req.session.role !== 'admin') {
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
    if (body.title !== undefined) w.title = cleanText(body.title, 100);
    if (body.description !== undefined) {
      w.description = cleanText(body.description, 8000);
      w.content = w.description;
    }
    if (body.tags !== undefined) w.tags = parseTags(body.tags, 8);
    if (body.thumbnail !== undefined) {
      const t = cleanText(body.thumbnail, 500);
      w.thumbnail = isHttpUrl(t) || t.startsWith('/uploads/') ? t : '';
    }
    if (body.f !== undefined || body.fileUrl !== undefined) {
      const f = cleanText(body.f !== undefined ? body.f : body.fileUrl, 1000);
      w.f = f;
      w.fileUrl = f;
    }
    if (body.u !== undefined) w.u = cleanText(body.u, 64);
    if (body.auth !== undefined) {
      w.auth = body.auth === 1 || body.auth === '1' ? 1 : 0;
      if (w.auth && !w.u) w.u = '123456';
    }
    if (body.o !== undefined) {
      const o = String(body.o);
      w.o = (o === '1' || o === '2') ? o : '';
    }
    if (body.v !== undefined) w.v = cleanText(body.v, 4000);
    if (body.auto !== undefined) w.auto = body.auto === 1 || body.auto === '1' ? 1 : 0;
    w.updatedAt = now();
    store.markDirty('works');
    H.ok(res, { work: publicWork(w, req.session.uuid) });
  });

  router.post('/api/works/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const w = works.get(req.params.id);
    if (!w) {
      H.fail(res, 404, '作品不存在', 404);
      return;
    }
    if (w.author !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    w.status = 'deleted';
    store.markDirty('works');
    H.ok(res, { deleted: true });
  });

  router.post('/api/works/:id/hide', (req, res) => {
    if (!req.session || req.session.role !== 'admin') {
      H.fail(res, 403, '需要管理员权限', 403);
      return;
    }
    const w = works.get(req.params.id);
    if (!w) {
      H.fail(res, 404, '作品不存在', 404);
      return;
    }
    w.isHidden = !w.isHidden;
    store.markDirty('works');
    if (w.isHidden) notify(w.author, 'system', `你的作品《${w.title}》已被管理员隐藏`, `/work/${w.id}`, req.session.username);
    H.ok(res, { isHidden: w.isHidden });
  });

  function toggleReaction(collection, index, countField, label) {
    return async (req, res) => {
      if (!req.session) {
        H.fail(res, 401, '请先登录', 401);
        return;
      }
      if (!ratelimit.middleware('write')(req, res)) return;
      const w = works.get(req.params.id);
      if (!w) {
        H.fail(res, 404, '作品不存在', 404);
        return;
      }
      const uuid = req.session.uuid;
      const on = hasKey(index, w.id, uuid);
      if (on) {
        collection.removeWhere((r) => String(r.workId) === String(w.id) && r.uuid === uuid);
        delKey(index, w.id, uuid);
        w[countField] = Math.max(0, (w[countField] || 0) - 1);
      } else {
        collection.insert({ id: collection.nextId(), workId: w.id, uuid, createdAt: now() });
        setKey(index, w.id, uuid);
        w[countField] = (w[countField] || 0) + 1;
        if (label && w.author !== req.session.username) {
          notify(w.author, label, `${req.session.nickname} ${label}了你的作品《${w.title}》`, `/work/${w.id}`, req.session.username);
        }
      }
      store.markDirty('works');
      H.ok(res, { [countField]: w[countField], on: !on });
    };
  }

  router.post('/api/works/:id/like', toggleReaction(likes, likesIndex, 'likeCount', '点赞'));
  router.post('/api/works/:id/fav', toggleReaction(favs, favsIndex, 'favCount', '收藏'));
  router.post('/api/works/:id/coin', toggleReaction(coins, coinsIndex, 'coinCount', ''));

  router.post('/api/works/:id/comments', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const w = works.get(req.params.id);
    if (!w) {
      H.fail(res, 404, '作品不存在', 404);
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
      H.fail(res, 400, '评论内容不能为空', 400);
      return;
    }
    let parentId = toInt(body.parentId, 0);
    let replyTo = '';
    if (parentId) {
      const parent = comments.get(parentId);
      if (!parent || String(parent.workId) !== String(w.id)) parentId = 0;
      else replyTo = parent.author;
    }
    const c = comments.insert({
      id: comments.nextId(),
      workId: w.id,
      parentId,
      author: req.session.username,
      content,
      replyTo,
      isDeleted: false,
      isPinned: false,
      createdAt: now()
    });
    let list = commentIndex.get(w.id);
    if (!list) {
      list = [];
      commentIndex.set(w.id, list);
    }
    list.push(c);
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    if (w.author !== req.session.username) {
      notify(w.author, 'comment', `${req.session.nickname} 评论了你的作品《${w.title}》`, `/work/${w.id}`, req.session.username);
    }
    try {
      require('../lib/mention').notifyMentions(content, req.session.username, 'work', `/work/${w.id}#comment-${c.id}`, [w.author, replyTo]);
    } catch (e) { /* ignore */ }
    H.ok(res, { comment: publicComment(c), commentCount: recalcCommentCount(w.id) });
  });

  router.post('/api/works/comments/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const c = comments.get(req.params.id);
    if (!c) {
      H.fail(res, 404, '评论不存在', 404);
      return;
    }
    const w = works.get(c.workId);
    const canDelete =
      c.author === req.session.username ||
      req.session.role === 'admin' ||
      (w && w.author === req.session.username);
    if (!canDelete) {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    c.isDeleted = true;
    store.markDirty('work_comments');
    H.ok(res, { deleted: true, commentCount: recalcCommentCount(c.workId) });
  });

  router.post('/api/users/:username/follow', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const target = cleanText(req.params.username, 64);
    if (!target || target === req.session.username) {
      H.fail(res, 400, '不能关注自己', 400);
      return;
    }
    const uuid = req.session.uuid;
    const on = hasKey(followIndex, target, uuid);
    if (on) {
      follows.removeWhere((r) => r.target === target && r.follower === uuid);
      delKey(followIndex, target, uuid);
    } else {
      follows.insert({ id: follows.nextId(), target, follower: uuid, followerName: req.session.username, createdAt: now() });
      setKey(followIndex, target, uuid);
      notify(target, 'follow', `${req.session.nickname} 关注了你`, `/u/${req.session.username}`, req.session.username);
    }
    H.ok(res, {
      following: !on,
      followers: follows.count((r) => r.target === target)
    });
  });

  router.get('/api/messages', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const me = req.session.username;
    const list = messages
      .all()
      .filter((m) => m && m.toUser === me)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 60);
    H.ok(res, {
      items: list.map((m) => ({
        id: m.id,
        type: m.type,
        text: m.text,
        link: m.link,
        fromUser: m.fromUser,
        fromNick: profiles.getNickname(m.fromUser) || m.fromUser,
        isRead: !!m.isRead,
        createdAt: m.createdAt
      })),
      unread: messages.count((m) => m && m.toUser === me && !m.isRead)
    });
  });

  router.post('/api/messages/read', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const me = req.session.username;
    let n = 0;
    for (const m of messages.all()) {
      if (m && m.toUser === me && !m.isRead) {
        m.isRead = true;
        n += 1;
      }
    }
    if (n) store.markDirty('messages');
    H.ok(res, { read: n });
  });

  const flushTimer = setInterval(() => {
    try {
      flushViews();
    } catch (e) {
      console.error('[workpool] flushViews error', e);
    }
  }, 10000);
  if (flushTimer.unref) flushTimer.unref();
};

module.exports.buildIndexes = buildIndexes;
module.exports.flushViews = flushViews;
module.exports.notify = notify;
module.exports.publicWork = publicWork;
