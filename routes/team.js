'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const profiles = require('../lib/profiles');
const ratelimit = require('../lib/ratelimit');
const { now, toInt, clamp, cleanText, parseTags, paginate, searchMatch, isHttpUrl } = require('../lib/util');
const { notify, publicWork } = require('./workpool');

const teams = store.col('teams');
const members = store.col('team_members');
const invites = store.col('team_invites');
const teamWorks = store.col('team_works');
const teamPosts = store.col('team_posts');

const memberIndex = new Map();

function buildIndexes() {
  memberIndex.clear();
  for (const m of members.all()) {
    if (!m) continue;
    let list = memberIndex.get(m.teamId);
    if (!list) {
      list = [];
      memberIndex.set(m.teamId, list);
    }
    list.push(m);
  }
  for (const list of memberIndex.values()) list.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

function getMember(teamId, username) {
  const list = memberIndex.get(teamId) || [];
  return list.find((m) => m.username === username) || null;
}

function isMember(teamId, username) {
  return !!getMember(teamId, username);
}

function isManager(teamId, username, isAdmin) {
  if (isAdmin) return true;
  const m = getMember(teamId, username);
  return !!(m && (m.role === 'owner' || m.role === 'admin'));
}

function publicTeam(t) {
  if (!t) return null;
  const list = memberIndex.get(t.id) || [];
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    owner: t.owner,
    ownerNick: profiles.getNickname(t.owner) || t.owner,
    avatar: t.avatar || '',
    cover: t.cover || '',
    tags: t.tags || [],
    memberCount: list.length,
    workCount: teamWorks.count((w) => w && String(w.teamId) === String(t.id)),
    postCount: teamPosts.count((p) => p && String(p.teamId) === String(t.id)),
    createdAt: t.createdAt
  };
}

function publicMember(m) {
  return {
    username: m.username,
    nickname: profiles.getNickname(m.username) || m.username,
    avatar: profiles.getAvatar(m.username),
    role: m.role,
    joinedAt: m.joinedAt
  };
}

function publicInvite(inv) {
  const t = teams.get(inv.teamId);
  return {
    id: inv.id,
    teamId: inv.teamId,
    teamName: t ? t.name : '',
    fromUser: inv.fromUser,
    fromNick: profiles.getNickname(inv.fromUser) || inv.fromUser,
    toUser: inv.toUser,
    status: inv.status,
    createdAt: inv.createdAt
  };
}

module.exports = function register(router) {
  buildIndexes();

  router.get('/api/teams', (req, res) => {
    const q = req.query || {};
    const keyword = cleanText(q.keyword, 64);
    const page = clamp(toInt(q.page, 1), 1, 1000);
    const size = clamp(toInt(q.size, 20), 1, config.limits.pageMaxSize);
    let list = teams.all().filter((t) => t && t.id);
    if (keyword) list = list.filter((t) => searchMatch(t.name, keyword) || searchMatch(t.description, keyword));
    if (q.mine === '1') {
      if (!req.session) {
        H.fail(res, 401, '请先登录', 401);
        return;
      }
      list = list.filter((t) => isMember(t.id, req.session.username));
    }
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
    const result = paginate(list, page, size);
    H.ok(res, {
      items: result.items.map(publicTeam),
      total: result.total,
      page: result.page,
      pageCount: result.pageCount
    });
  });

  router.post('/api/teams', async (req, res) => {
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
    const name = cleanText(body.name, 60);
    if (!name) {
      H.fail(res, 400, '请填写团队名称', 400);
      return;
    }
    if (teams.find((t) => t && t.name === name)) {
      H.fail(res, 400, '团队名称已存在', 400);
      return;
    }
    let cover = cleanText(body.cover, 500);
    if (cover && !isHttpUrl(cover) && !cover.startsWith('/uploads/')) cover = '';
    const team = teams.insert({
      id: teams.nextId(),
      name,
      description: cleanText(body.description, 2000),
      owner: req.session.username,
      avatar: '',
      cover,
      tags: parseTags(body.tags, 6),
      createdAt: now()
    });
    const m = members.insert({
      id: members.nextId(),
      teamId: team.id,
      username: req.session.username,
      role: 'owner',
      joinedAt: now()
    });
    let list = memberIndex.get(team.id);
    if (!list) {
      list = [];
      memberIndex.set(team.id, list);
    }
    list.push(m);
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    H.ok(res, { team: publicTeam(team) });
  });

  router.get('/api/teams/invites', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const me = req.session.username;
    const list = invites
      .all()
      .filter((i) => i && i.toUser === me && i.status === 'pending')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    H.ok(res, { items: list.map(publicInvite) });
  });

  router.get('/api/teams/:id', (req, res) => {
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    const list = memberIndex.get(t.id) || [];
    const works = teamWorks
      .all()
      .filter((w) => w && String(w.teamId) === String(t.id))
      .map((w) => publicWork(store.col('works').get(w.workId), req.session ? req.session.uuid : ''))
      .filter(Boolean);
    const posts = teamPosts
      .all()
      .filter((p) => p && String(p.teamId) === String(t.id))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author,
        authorNick: profiles.getNickname(p.author) || p.author,
        authorVerified: profiles.getVerified(p.author),
        authorVerified: profiles.getVerified(p.author),
        authorAvatar: profiles.getAvatar(p.author),
        createdAt: p.createdAt
      }));
    H.ok(res, {
      team: publicTeam(t),
      members: list.map(publicMember),
      works,
      posts,
      myRole: req.session ? (getMember(t.id, req.session.username) || {}).role || '' : '',
      isMember: req.session ? isMember(t.id, req.session.username) : false
    });
  });

  router.post('/api/teams/:id', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isManager(t.id, req.session.username, req.session.role === 'admin')) {
      H.fail(res, 403, '无权修改', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    if (body.description !== undefined) t.description = cleanText(body.description, 2000);
    if (body.tags !== undefined) t.tags = parseTags(body.tags, 6);
    if (body.avatar !== undefined) t.avatar = cleanText(body.avatar, 500);
    if (body.cover !== undefined) {
      const c = cleanText(body.cover, 500);
      t.cover = isHttpUrl(c) || c.startsWith('/uploads/') ? c : '';
    }
    store.markDirty('teams');
    H.ok(res, { team: publicTeam(t) });
  });

  router.post('/api/teams/:id/delete', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (t.owner !== req.session.username && req.session.role !== 'admin') {
      H.fail(res, 403, '只有团队创建者可以解散团队', 403);
      return;
    }
    teams.remove(t.id);
    members.removeWhere((m) => String(m.teamId) === String(t.id));
    invites.removeWhere((i) => String(i.teamId) === String(t.id));
    teamWorks.removeWhere((w) => String(w.teamId) === String(t.id));
    teamPosts.removeWhere((p) => String(p.teamId) === String(t.id));
    memberIndex.delete(t.id);
    H.ok(res, { deleted: true });
  });

  router.post('/api/teams/:id/join', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (isMember(t.id, req.session.username)) {
      H.fail(res, 400, '你已经是团队成员', 400);
      return;
    }
    const m = members.insert({
      id: members.nextId(),
      teamId: t.id,
      username: req.session.username,
      role: 'member',
      joinedAt: now()
    });
    let list = memberIndex.get(t.id);
    if (!list) {
      list = [];
      memberIndex.set(t.id, list);
    }
    list.push(m);
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    notify(t.owner, 'team', `${req.session.nickname} 加入了团队《${t.name}》`, `/team/${t.id}`, req.session.username);
    H.ok(res, { joined: true });
  });

  router.post('/api/teams/:id/leave', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    const m = getMember(t.id, req.session.username);
    if (!m) {
      H.fail(res, 400, '你不是该团队成员', 400);
      return;
    }
    if (m.role === 'owner') {
      H.fail(res, 400, '创建者不能退出团队，请转让或解散团队', 400);
      return;
    }
    members.remove(m.id);
    const list = memberIndex.get(t.id) || [];
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) list.splice(idx, 1);
    H.ok(res, { left: true });
  });

  router.post('/api/teams/:id/invite', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isManager(t.id, req.session.username, req.session.role === 'admin')) {
      H.fail(res, 403, '无权邀请成员', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const toUser = cleanText(body.username, 64);
    if (!toUser) {
      H.fail(res, 400, '请填写用户名', 400);
      return;
    }
    if (isMember(t.id, toUser)) {
      H.fail(res, 400, '该用户已是团队成员', 400);
      return;
    }
    if (invites.find((i) => i && String(i.teamId) === String(t.id) && i.toUser === toUser && i.status === 'pending')) {
      H.fail(res, 400, '已发送过邀请，等待对方处理', 400);
      return;
    }
    const inv = invites.insert({
      id: invites.nextId(),
      teamId: t.id,
      fromUser: req.session.username,
      toUser,
      status: 'pending',
      createdAt: now()
    });
    notify(toUser, 'invite', `${req.session.nickname} 邀请你加入团队《${t.name}》`, `/team/${t.id}`, req.session.username);
    H.ok(res, { invite: publicInvite(inv) });
  });

  router.post('/api/teams/invites/:id/accept', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const inv = invites.get(req.params.id);
    if (!inv || inv.status !== 'pending') {
      H.fail(res, 404, '邀请不存在或已处理', 404);
      return;
    }
    if (inv.toUser !== req.session.username) {
      H.fail(res, 403, '无权处理该邀请', 403);
      return;
    }
    inv.status = 'accepted';
    store.markDirty('team_invites');
    const t = teams.get(inv.teamId);
    if (t && !isMember(t.id, req.session.username)) {
      const m = members.insert({
        id: members.nextId(),
        teamId: t.id,
        username: req.session.username,
        role: 'member',
        joinedAt: now()
      });
      let list = memberIndex.get(t.id);
      if (!list) {
        list = [];
        memberIndex.set(t.id, list);
      }
      list.push(m);
      profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
      notify(inv.fromUser, 'team', `${req.session.nickname} 接受了你的团队邀请`, `/team/${t.id}`, req.session.username);
    }
    H.ok(res, { accepted: true, teamId: inv.teamId });
  });

  router.post('/api/teams/invites/:id/reject', (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const inv = invites.get(req.params.id);
    if (!inv || inv.status !== 'pending') {
      H.fail(res, 404, '邀请不存在或已处理', 404);
      return;
    }
    if (inv.toUser !== req.session.username) {
      H.fail(res, 403, '无权处理该邀请', 403);
      return;
    }
    inv.status = 'rejected';
    store.markDirty('team_invites');
    const t = teams.get(inv.teamId);
    if (t) notify(inv.fromUser, 'team', `${req.session.nickname} 拒绝了你的团队邀请`, '', req.session.username);
    H.ok(res, { rejected: true });
  });

  router.post('/api/teams/:id/members/remove', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isManager(t.id, req.session.username, req.session.role === 'admin')) {
      H.fail(res, 403, '无权移除成员', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const username = cleanText(body.username, 64);
    const m = getMember(t.id, username);
    if (!m) {
      H.fail(res, 404, '该用户不是团队成员', 404);
      return;
    }
    if (m.role === 'owner') {
      H.fail(res, 400, '不能移除团队创建者', 400);
      return;
    }
    members.remove(m.id);
    const list = memberIndex.get(t.id) || [];
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) list.splice(idx, 1);
    notify(username, 'team', `你已被移出团队《${t.name}》`, '', req.session.username);
    H.ok(res, { removed: true });
  });

  router.post('/api/teams/:id/works', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isMember(t.id, req.session.username)) {
      H.fail(res, 403, '只有团队成员可以添加作品', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const workId = toInt(body.workId, 0);
    const w = store.col('works').get(workId);
    if (!w) {
      H.fail(res, 404, '作品不存在', 404);
      return;
    }
    if (teamWorks.find((x) => x && String(x.teamId) === String(t.id) && String(x.workId) === String(workId))) {
      H.fail(res, 400, '该作品已加入团队', 400);
      return;
    }
    teamWorks.insert({
      id: teamWorks.nextId(),
      teamId: t.id,
      workId,
      addedBy: req.session.username,
      createdAt: now()
    });
    H.ok(res, { added: true, work: publicWork(w, req.session.uuid) });
  });

  router.post('/api/teams/:id/works/remove', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isManager(t.id, req.session.username, req.session.role === 'admin')) {
      H.fail(res, 403, '无权移除作品', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const workId = toInt(body.workId, 0);
    const n = teamWorks.removeWhere((x) => String(x.teamId) === String(t.id) && String(x.workId) === String(workId));
    H.ok(res, { removed: n > 0 });
  });

  router.post('/api/teams/:id/posts', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('write')(req, res)) return;
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    if (!isMember(t.id, req.session.username)) {
      H.fail(res, 403, '只有团队成员可以发帖', 403);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const title = cleanText(body.title, 120);
    const content = cleanText(body.content, 10000);
    if (!title || !content) {
      H.fail(res, 400, '请填写标题和正文', 400);
      return;
    }
    const p = teamPosts.insert({
      id: teamPosts.nextId(),
      teamId: t.id,
      title,
      content,
      author: req.session.username,
      createdAt: now()
    });
    profiles.put(req.session.username, { nickname: req.session.nickname, avatar: req.session.avatar });
    H.ok(res, {
      post: {
        id: p.id,
        title: p.title,
        content: p.content,
        author: p.author,
        authorNick: profiles.getNickname(p.author) || p.author,
        authorAvatar: profiles.getAvatar(p.author),
        createdAt: p.createdAt
      }
    });
  });

  router.post('/api/teams/:id/posts/delete', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    const t = teams.get(req.params.id);
    if (!t) {
      H.fail(res, 404, '团队不存在', 404);
      return;
    }
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const p = teamPosts.get(toInt(body.postId, 0));
    if (!p || String(p.teamId) !== String(t.id)) {
      H.fail(res, 404, '帖子不存在', 404);
      return;
    }
    if (p.author !== req.session.username && !isManager(t.id, req.session.username, req.session.role === 'admin')) {
      H.fail(res, 403, '无权删除', 403);
      return;
    }
    teamPosts.remove(p.id);
    H.ok(res, { deleted: true });
  });
};

module.exports.buildIndexes = buildIndexes;
