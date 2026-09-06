'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const session = require('../lib/session');
const profiles = require('../lib/profiles');
const ratelimit = require('../lib/ratelimit');
const { now, toInt, clamp, cleanText, sortBy, paginate, searchMatch } = require('../lib/util');
const { notify } = require('./workpool');
const { publicPlugin } = require('./market');

const plugins = store.col('plugins');
const works = store.col('works');
const posts = store.col('forum_posts');
const replies = store.col('forum_replies');
const boards = store.col('forum_boards');
const teams = store.col('teams');
const messages = store.col('messages');

function guard(req, res) {
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
    H.fail(res, 403, '仅超级管理员可执行该操作', 403);
    return false;
  }
  return true;
}

module.exports = function register(router) {
  router.get('/api/admin/overview', (req, res) => {
    if (!guard(req, res)) return;
    const activePlugins = plugins.count((p) => p && p.status === 'active');
    const hiddenPlugins = plugins.count((p) => p && p.status === 'inactive');
    const activeWorks = works.count((w) => w && w.status === 'active' && !w.isHidden);
    const hiddenWorks = works.count((w) => w && (w.isHidden || w.status !== 'active'));
    const activePosts = posts.count((p) => p && p.status !== 'deleted');
    H.ok(res, {
      owner: !!req.session.isOwner,
      counts: {
        plugins: activePlugins,
        pluginsHidden: hiddenPlugins,
        works: activeWorks,
        worksHidden: hiddenWorks,
        posts: activePosts,
        teams: teams.size(),
        boards: boards.size(),
        messages: messages.size(),
        profiles: profiles.stats().cached
      },
      recent: sortBy(plugins.all().filter((p) => p && p.id), 'id', true)
        .slice(0, 8)
        .map((p) => publicPlugin(p, ''))
    });
  });

  router.get('/api/admin/plugins', (req, res) => {
    if (!guard(req, res)) return;
    const q = req.query || {};
    const status = cleanText(q.status, 16);
    const page = clamp(toInt(q.page, 1), 1, 1000);
    const size = clamp(toInt(q.size, 20), 1, config.limits.pageMaxSize);
    let list = plugins.all().filter((p) => p && p.id);
    if (status) list = list.filter((p) => p.status === status);
    list = sortBy(list, 'id', true);
    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map((p) => publicPlugin(p, '')),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.post('/api/admin/plugins/:id/status', async (req, res) => {
    if (!guard(req, res)) return;
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
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
    notify(p.author, 'system', `你的插件《${p.name}》状态已变更为 ${status === 'active' ? '上架' : '下架'}`, `/plugin/${p.id}`, req.session.username);
    H.ok(res, { status: p.status });
  });

  router.post('/api/admin/plugins/:id/delete', (req, res) => {
    if (!guard(req, res)) return;
    const p = plugins.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '插件不存在', 404);
      return;
    }
    plugins.remove(p.id);
    store.col('plugin_ratings').removeWhere((r) => String(r.pluginId) === String(p.id));
    store.col('plugin_likes').removeWhere((r) => String(r.pluginId) === String(p.id));
    store.col('plugin_coins').removeWhere((r) => String(r.pluginId) === String(p.id));
    notify(p.author, 'system', `你的插件《${p.name}》已被管理员删除`, '', req.session.username);
    H.ok(res, { deleted: true });
  });

  router.get('/api/admin/works', (req, res) => {
    if (!guard(req, res)) return;
    const page = clamp(toInt(req.query.page, 1), 1, 1000);
    const size = clamp(toInt(req.query.size, 20), 1, config.limits.pageMaxSize);
    const list = sortBy(works.all().filter((w) => w && w.id && w.status !== 'deleted'), 'id', true);
    const result = paginate(list, page, size);
    const { publicWork } = require('./workpool');
    H.ok(res, {
      items: result.items.map((w) => publicWork(w, '')),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.get('/api/admin/posts', (req, res) => {
    if (!guard(req, res)) return;
    const list = sortBy(posts.all().filter((p) => p && p.id), 'id', true).slice(0, 100);
    H.ok(res, {
      items: list.map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        authorNick: profiles.getNickname(p.author) || p.author,
        boardId: p.boardId,
        status: p.status,
        isPinned: !!p.isPinned,
        replyCount: p.replyCount || 0,
        createdAt: p.createdAt
      }))
    });
  });

  router.get('/api/admin/boards', (req, res) => {
    if (!guard(req, res)) return;
    const list = sortBy(boards.all().filter((b) => b && b.id), 'order', false);
    H.ok(res, { boards: list });
  });

  router.post('/api/admin/boards', async (req, res) => {
    if (!guard(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const name = cleanText(body.name, 40);
    if (!name) {
      H.fail(res, 400, '请填写板块名称', 400);
      return;
    }
    const board = boards.insert({
      id: boards.nextId(),
      name,
      description: cleanText(body.description, 300),
      icon: cleanText(body.icon, 40) || 'forum',
      color: cleanText(body.color, 20) || '#5c6bc0',
      order: toInt(body.order, boards.size() + 1),
      createdAt: now()
    });
    H.ok(res, { board });
  });

  router.post('/api/admin/boards/:id', async (req, res) => {
    if (!guard(req, res)) return;
    const b = boards.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '板块不存在', 404);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    if (body.name !== undefined) {
      const name = cleanText(body.name, 40);
      if (!name) {
        H.fail(res, 400, '请填写板块名称', 400);
        return;
      }
      b.name = name;
    }
    if (body.description !== undefined) b.description = cleanText(body.description, 300);
    if (body.icon !== undefined) b.icon = cleanText(body.icon, 40);
    if (body.color !== undefined) b.color = cleanText(body.color, 20);
    if (body.order !== undefined) b.order = toInt(body.order, b.order);
    store.markDirty('forum_boards');
    H.ok(res, { board: b });
  });

  router.post('/api/admin/boards/:id/delete', (req, res) => {
    if (!guard(req, res)) return;
    const b = boards.get(req.params.id);
    if (!b) {
      H.fail(res, 404, '板块不存在', 404);
      return;
    }
    const inUse = posts.count((p) => p && String(p.boardId) === String(b.id) && p.status !== 'deleted');
    if (inUse > 0) {
      H.fail(res, 400, `该板块下还有 ${inUse} 个帖子，无法删除`, 400);
      return;
    }
    boards.remove(b.id);
    H.ok(res, { deleted: true });
  });

  router.post('/api/admin/announce', async (req, res) => {
    if (!guard(req, res)) return;
    if (!ratelimit.middleware('write')(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const text = cleanText(body.text, 300);
    if (!text) {
      H.fail(res, 400, '请填写公告内容', 400);
      return;
    }
    const targets = new Set();
    for (const p of plugins.all()) if (p && p.author) targets.add(p.author);
    for (const w of works.all()) if (w && w.author) targets.add(w.author);
    for (const p of posts.all()) if (p && p.author) targets.add(p.author);
    for (const username of targets) {
      notify(username, 'announce', text, cleanText(body.link, 300), req.session.username);
    }
    H.ok(res, { sent: targets.size });
  });

  router.get('/api/admin/replies', (req, res) => {
    if (!guard(req, res)) return;
    const q = req.query || {};
    const postId = toInt(q.postId, 0);
    const keyword = cleanText(q.keyword, 64);
    const page = clamp(toInt(q.page, 1), 1, 10000);
    const size = clamp(toInt(q.size, 20), 1, config.limits.pageMaxSize);
    let list = replies.all().filter((r) => r && r.id);
    if (postId) list = list.filter((r) => String(r.postId) === String(postId));
    if (keyword) list = list.filter((r) => searchMatch(r.content, keyword) || searchMatch(r.author, keyword));
    list = sortBy(list, 'id', true);
    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map((r) => {
        const p = posts.get(r.postId);
        return {
          id: r.id,
          postId: r.postId,
          postTitle: p ? p.title : '(帖子已删)',
          boardId: p ? p.boardId : 0,
          parentId: r.parentId || 0,
          author: r.author,
          authorNick: profiles.getNickname(r.author) || r.author,
          contentPreview: cleanText(r.content, 200),
          status: r.status,
          replyTo: r.replyTo || '',
          createdAt: r.createdAt
        };
      }),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.post('/api/admin/posts/:id/hard-delete', (req, res) => {
    if (!req.session || req.session.role !== 'admin' || !req.session.isSuper) {
      H.fail(res, 403, '需要超级管理员权限', 403);
      return;
    }
    const p = posts.get(req.params.id);
    if (!p) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    const pid = p.id;
    const author = p.author;
    posts.remove(pid);
    replies.removeWhere((r) => r && String(r.postId) === String(pid));
    store.col('counters').removeWhere((c) => c && c.kind === 'post_like' && String(c.id).startsWith(String(pid) + ':'));
    store.markDirty('forum_posts');
    store.markDirty('forum_replies');
    notify(author, 'system', '你的帖子已因违规被彻底删除', '', req.session.username);
    H.ok(res, { deleted: true });
  });

  router.get('/api/admin/staff', (req, res) => {
    if (!ownerGuard(req, res)) return;
    const supers = [];
    const admins = [];
    for (const s of store.col('staff').all()) {
      if (!s || !s.username || s.removed) continue;
      const row = {
        username: s.username,
        nickname: profiles.getNickname(s.username) || '',
        tier: s.tier === 'super' ? 'super' : 'admin',
        addedBy: s.addedBy || '',
        addedAt: s.addedAt || 0
      };
      if (row.tier === 'super') supers.push(row);
      else admins.push(row);
    }
    H.ok(res, { supers, admins });
  });

  router.get('/api/admin/staff/candidates', (req, res) => {
    if (!ownerGuard(req, res)) return;
    const names = new Set();
    const q = cleanText(req.query.q, 64).toLowerCase();
    const take = (list, field) => {
      for (const it of list) {
        const v = it && it[field];
        if (v && typeof v === 'string') names.add(v);
      }
    };
    take(store.col('profiles_cache').all(), 'username');
    take(store.col('profiles_cache').all(), 'nickname');
    take(store.col('sessions').all(), 'username');
    take(posts.all(), 'author');
    take(replies.all(), 'author');
    take(works.all(), 'author');
    take(plugins.all(), 'author');
    take(store.col('messages').all(), 'toUser');
    take(store.col('team_members').all(), 'username');
    const list = Array.from(names)
      .filter((n) => n && (!q || n.toLowerCase().includes(q)))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .slice(0, 300);
    H.ok(res, { items: list });
  });

  router.post('/api/admin/staff', async (req, res) => {
    if (!ownerGuard(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const username = cleanText(body.username, 64);
    const tier = cleanText(body.tier, 8) === 'super' ? 'super' : 'admin';
    if (!username) {
      H.fail(res, 400, '请填写要授权的用户名', 400);
      return;
    }
    const lu = String(username).toLowerCase();
    const col = store.col('staff');
    const exists = col.find((s) => s && s.username && String(s.username).toLowerCase() === lu && !s.removed);
    if (exists) {
      H.fail(res, 400, '该用户已在授权名单中', 400);
      return;
    }
    col.insert({
      id: col.nextId(),
      username,
      tier,
      addedBy: req.session.username,
      addedAt: now()
    });
    const sRow = session.staffRows().find((r) => r.username === lu);
    H.ok(res, { added: true, row: sRow });
  });

  router.post('/api/admin/staff/:username/remove', (req, res) => {
    if (!ownerGuard(req, res)) return;
    const lu = String(req.params.username || '').toLowerCase();
    if (!lu) {
      H.fail(res, 400, '参数错误', 400);
      return;
    }
    const col = store.col('staff');
    const found = col.find((s) => s && s.username && String(s.username).toLowerCase() === lu && !s.removed);
    if (!found) {
      H.fail(res, 404, '该用户不在授权名单中', 404);
      return;
    }
    col.remove(found.id);
    H.ok(res, { removed: true });
  });
};
