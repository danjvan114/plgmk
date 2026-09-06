'use strict';
const B = 'http://127.0.0.1:8897';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseSetCookie(h) {
  if (!h) return '';
  const m = /^([^;=]+)=([^;]*)/.exec(h);
  return m ? `${m[1]}=${m[2]}` : '';
}

function mkJar() {
  let c = '';
  return {
    set(h) {
      const v = parseSetCookie(h);
      if (v) c = v;
    },
    get() { return c; },
    clear() { c = ''; }
  };
}

async function req(method, path, jar, body) {
  const headers = {};
  if (jar && jar.get()) headers['Cookie'] = jar.get();
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(B + path, { method, headers, body: payload, redirect: 'manual' });
  if (jar) jar.set(res.headers.get('set-cookie') || '');
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: res.status, data, loc: res.headers.get('location') };
}

function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

(async () => {
  const superJar = mkJar();
  const userJar = mkJar();

  await req('GET', '/login?dev=1&as=admin', superJar);
  const sh = await req('GET', '/api/header', superJar);
  check('超级管理员登录 isSuper', sh.data && sh.data.user && sh.data.user.isSuper === true && sh.data.user.role === 'admin', JSON.stringify(sh.data && sh.data.user));

  await req('GET', '/login?dev=1', userJar);
  const uh = await req('GET', '/api/header', userJar);
  check('普通用户登录 isSuper=false isAdmin=false', uh.data && uh.data.user && uh.data.user.isAdmin === false && !uh.data.user.isSuper, JSON.stringify(uh.data && uh.data.user));

  const den1 = await req('GET', '/api/bots', userJar);
  check('普通用户访问 /api/bots 403', den1.status === 403, 'code=' + den1.status);
  const den2 = await req('GET', '/api/admin/staff', userJar);
  check('普通用户访问 /api/admin/staff 403', den2.status === 403, 'code=' + den2.status);

  const bots = await req('GET', '/api/bots', superJar);
  check('超管列出机器人(含演示bot)', bots.data && bots.data.total >= 1 && bots.data.items.some((b) => b.name === 'KE演示机器人' && b.enabled), 'total=' + (bots.data && bots.data.total));
  check('apiKey 已打码', !bots.data.items.some((b) => b.apiKey === b.apiKey && b.apiKey === 'demo'), '');

  const gate = await req('POST', '/api/bots', superJar, { name: '坏机器人', apiUrl: 'https://example.com/v1', model: 'x', account: { username: 'x' }, nonce: 'bogus' });
  check('伪造 nonce 保存被拒', gate.status === 400, (gate.data && gate.data.msg) || '');

  const t = await req('POST', '/api/bots/test', superJar, { apiUrl: 'stub://demo', model: 'demo', apiKey: 'demo' });
  check('stub 测试连接成功并返回 nonce', t.status === 200 && t.data && t.data.ok && !!t.data.nonce, JSON.stringify(t.data));

  const created = await req('POST', '/api/bots', superJar, {
    name: 'E2E机器人', apiUrl: 'stub://demo', apiKey: 'demo', model: 'demo',
    account: { username: 'e2e_bot', nickname: 'E2E机器人' },
    probability: 60, cooldownSec: 0, enabled: false, prompt: '', nonce: t.data.nonce
  });
  check('带 nonce 创建机器人成功', created.status === 200 && created.data.bot && created.data.bot.name === 'E2E机器人', JSON.stringify(created.data && created.data.bot));
  const e2eBotId = created.data.bot.id;

  const rep = await req('GET', '/api/admin/replies?page=1&size=10', superJar);
  check('超管查看回复管理列表', rep.status === 200 && Array.isArray(rep.data.items), '');

  const noperm = await req('GET', '/api/admin/replies', userJar);
  check('普通用户看回复管理 403', noperm.status === 403, '');

  await req('POST', '/api/admin/staff', superJar, { username: 'danjvan' });
  const uh2 = await req('GET', '/api/header', userJar);
  check('添加后 danjvan 变为巡查管理员', uh2.data.user.isAdmin === true && uh2.data.user.isSuper === false, JSON.stringify(uh2.data.user));

  const adminRep = await req('GET', '/api/admin/replies?size=5', userJar);
  check('巡查管理员可查看回复管理', adminRep.status === 200, '');
  const adminStaff = await req('GET', '/api/admin/staff', userJar);
  check('巡查管理员不可管理员工 403', adminStaff.status === 403, '');

  await req('POST', '/api/admin/staff/danjvan/remove', superJar, {});
  const uh3 = await req('GET', '/api/header', userJar);
  check('移除后 danjvan 恢复普通用户', uh3.data.user.isAdmin === false, '');

  const postRes = await req('POST', '/api/forum/posts', userJar, { boardId: 1, title: 'E2E机器人自动回复验证帖', content: '请演示机器人自动回我一楼，验证自动回复是否工作。' });
  check('普通用户发帖成功', postRes.status === 200 && postRes.data.post, 'id=' + (postRes.data.post && postRes.data.post.id));
  const pid = postRes.data.post.id;
  await sleep(1800);
  const detail = await req('GET', '/api/forum/posts/' + pid, userJar);
  const demoReplies = (detail.data.replies || []).filter((r) => r.author === 'ke_demo_bot');
  check('演示机器人已自动回复新帖', demoReplies.length >= 1, 'count=' + demoReplies.length + ' 内容=' + (demoReplies[0] && demoReplies[0].content || '').slice(0, 60));

  const replyRes = await req('POST', '/api/forum/posts/' + pid + '/replies', userJar, { content: '我也来顶一下，测试机器人会不会回复消息。' });
  check('普通用户回复成功', replyRes.status === 200, '');
  await sleep(1600);
  const detail2 = await req('GET', '/api/forum/posts/' + pid, userJar);
  const botReplies2 = (detail2.data.replies || []).filter((r) => r.author === 'ke_demo_bot');
  check('机器人自动回复了楼层消息(≥2)', botReplies2.length >= 2, 'count=' + botReplies2.length);

  const junk = await req('POST', '/api/forum/posts', userJar, { boardId: 1, title: '将被硬删除的帖子', content: 'x' });
  const jid = junk.data.post.id;
  const hdDeny = await req('POST', '/api/admin/posts/' + jid + '/hard-delete', userJar, {});
  check('普通用户硬删除 403', hdDeny.status === 403, '');
  const hdOk = await req('POST', '/api/admin/posts/' + jid + '/hard-delete', superJar, {});
  check('超管硬删除成功', hdOk.status === 200 && hdOk.data.deleted === true, '');
  const gone = await req('GET', '/api/forum/posts/' + jid, userJar);
  check('硬删除后帖子 404', gone.status === 404, 'status=' + gone.status);

  await req('POST', '/api/bots/' + e2eBotId + '/enable', superJar, {});
  const after = await req('GET', '/api/bots', superJar);
  const e2e = after.data.items.find((b) => b.id === e2eBotId);
  check('启用/停用机器人开关', e2e && e2e.enabled === true, JSON.stringify(e2e));

  const logs = await req('GET', '/api/bots/' + after.data.items.find((b) => b.name === 'KE演示机器人').id + '/logs?size=10', superJar);
  check('机器人日志有成功记录', logs.status === 200 && logs.data.total >= 1 && logs.data.items.some((l) => l.ok), 'total=' + logs.data.total);

  const del = await req('POST', '/api/bots/' + e2eBotId + '/delete', superJar, {});
  check('删除机器人成功', del.status === 200 && del.data.deleted === true, '');

  const j2 = mkJar();
  await req('GET', '/login?dev=1&as=admin', j2);
  const kd = await req('POST', '/api/bots', j2, {
    name: '禁止保存', apiUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-x',
    account: { username: 'zz' }, nonce: 'stale-nonce'
  });
  check('真实地址无有效nonce拒绝保存', kd.status === 400, (kd.data && kd.data.msg) || '');

  console.log('DONE exitCode=' + (process.exitCode || 0));
})();
