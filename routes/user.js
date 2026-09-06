'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const profiles = require('../lib/profiles');
const { toInt, clamp, cleanText, paginate, sortBy } = require('../lib/util');

const plugins = store.col('plugins');
const works = store.col('works');
const posts = store.col('forum_posts');
const replies = store.col('forum_replies');
const follows = store.col('follows');
const teams = store.col('teams');
const members = store.col('team_members');

function profileOf(username) {
  const p = profiles.get(username);
  return {
    username,
    nickname: (p && p.nickname) || username,
    avatar: (p && p.avatar) || '',
    bio: (p && p.bio) || '',
    verified: profiles.getVerified(username),
    cached: !!p
  };
}

module.exports = function register(router) {
  router.get('/api/users/:username', (req, res) => {
    const username = cleanText(req.params.username, 64);
    if (!username) {
      H.fail(res, 400, '用户名无效', 400);
      return;
    }
    const isSelf = req.session && req.session.username === username;
    const pluginList = plugins
      .all()
      .filter((p) => p && p.author === username && (p.status === 'active' || isSelf));
    const workList = works
      .all()
      .filter((w) => w && w.author === username && w.status === 'active' && (!w.isHidden || isSelf));
    const postList = posts.all().filter((p) => p && p.author === username && p.status !== 'deleted');

    const stats = {
      plugins: pluginList.length,
      works: workList.length,
      posts: postList.length,
      downloads: pluginList.reduce((s, p) => s + (p.downloadCount || 0), 0),
      likes:
        pluginList.reduce((s, p) => s + (p.likeCount || 0), 0) +
        workList.reduce((s, w) => s + (w.likeCount || 0), 0),
      followers: follows.count((f) => f && f.target === username),
      following: follows.count((f) => f && f.followerName === username)
    };

    const teamList = members
      .all()
      .filter((m) => m && m.username === username)
      .map((m) => teams.get(m.teamId))
      .filter(Boolean)
      .map((t) => ({ id: t.id, name: t.name }));

    H.ok(res, {
      profile: profileOf(username),
      stats,
      teams: teamList,
      isSelf,
      following:
        req.session && req.session.username !== username
          ? follows.all().some((f) => f && f.target === username && f.followerName === req.session.username)
          : false
    });
  });

  router.get('/api/users/:username/plugins', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const page = clamp(toInt(req.query.page, 1), 1, 1000);
    const size = clamp(toInt(req.query.size, 20), 1, config.limits.pageMaxSize);
    const viewer = req.session ? req.session.uuid : '';
    const isSelf = req.session && req.session.username === username;
    const list = sortBy(
      plugins.all().filter((p) => p && p.author === username && (p.status === 'active' || isSelf)),
      'id',
      true
    );
    const result = paginate(list, page, size);
    const { publicPlugin } = require('./market');
    H.ok(res, {
      items: result.items.map((p) => publicPlugin(p, viewer)),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.get('/api/users/:username/works', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const page = clamp(toInt(req.query.page, 1), 1, 1000);
    const size = clamp(toInt(req.query.size, 20), 1, config.limits.pageMaxSize);
    const viewer = req.session ? req.session.uuid : '';
    const isSelf = req.session && req.session.username === username;
    const list = sortBy(
      works.all().filter((w) => w && w.author === username && w.status === 'active' && (!w.isHidden || isSelf)),
      'id',
      true
    );
    const result = paginate(list, page, size);
    const { publicWork } = require('./workpool');
    H.ok(res, {
      items: result.items.map((w) => publicWork(w, viewer)),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.get('/api/users/:username/posts', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const page = clamp(toInt(req.query.page, 1), 1, 1000);
    const size = clamp(toInt(req.query.size, 20), 1, config.limits.pageMaxSize);
    const list = sortBy(
      posts.all().filter((p) => p && p.author === username && p.status !== 'deleted'),
      'id',
      true
    );
    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: cleanText(p.content, 120),
        boardId: p.boardId,
        replyCount: p.replyCount || 0,
        viewCount: p.viewCount || 0,
        createdAt: p.createdAt
      })),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.get('/api/users/:username/replies', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const list = replies
      .all()
      .filter((r) => r && r.author === username && r.status !== 'deleted')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 30);
    const out = [];
    for (const r of list) {
      const p = posts.get(r.postId);
      if (!p || p.status === 'deleted') continue;
      out.push({
        id: r.id,
        postId: r.postId,
        postTitle: p.title,
        content: cleanText(r.content, 200),
        createdAt: r.createdAt
      });
    }
    H.ok(res, { items: out });
  });

  router.get('/api/users/:username/followers', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const list = follows.all().filter((f) => f && f.target === username);
    const out = list.map((f) => {
      const p = profileOf(f.followerName);
      return { username: p.username, nickname: p.nickname, avatar: p.avatar };
    });
    H.ok(res, { items: out });
  });

  router.get('/api/users/:username/following', (req, res) => {
    const username = cleanText(req.params.username, 64);
    const list = follows.all().filter((f) => f && f.followerName === username);
    const out = list.map((f) => {
      const p = profileOf(f.target);
      return { username: p.username, nickname: p.nickname, avatar: p.avatar };
    });
    H.ok(res, { items: out });
  });
};
