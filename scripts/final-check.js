'use strict';
const http = require('http');
const B = 'http://127.0.0.1:8897';

function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(B + path);
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: 'pgmk_sid=' + cookie } : {})
      }
    }, (res) => {
      let s = '';
      res.on('data', (c) => (s += c));
      res.on('end', () => {
        let j = null;
        try { j = JSON.parse(s); } catch (e) { j = { raw: s.slice(0, 120) }; }
        const setCook = res.headers['set-cookie'];
        let sid = null;
        if (setCook && setCook.length) {
          const m = setCook[0].match(/pgmk_sid=([^;]+)/);
          if (m) sid = m[1];
        }
        resolve({ status: res.statusCode, data: j, sid });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  => ' + extra : '')); }
}

(async () => {
  console.log('== 角色判定 ==');
  let r = await req('POST', '/api/_dev/login', { username: 'starry_root', nickname: 'Starry' });
  const owner = r.sid;
  check('owner(nickname=Starry) isOwner', r.data.user.isOwner === true && r.data.user.isSuper === true && r.data.user.role === 'admin');

  r = await req('POST', '/api/_dev/login', { username: 'u1', nickname: '普通甲' });
  const user = r.sid;
  check('普通用户 user', r.data.user.isOwner === false && r.data.user.isAdmin === false);

  console.log('== 仅 owner 管理 staff ==');
  check('owner 查 staff=200', (await req('GET', '/api/admin/staff', null, owner)).status === 200);
  check('user 查 staff=403', (await req('GET', '/api/admin/staff', null, user)).status === 403);

  r = await req('POST', '/api/admin/staff', { username: 'sup1', tier: 'super' }, owner);
  check('owner 添加 super=200', r.status === 200);
  r = await req('POST', '/api/admin/staff', { username: 'adm1', tier: 'admin' }, owner);
  check('owner 添加 admin=200', r.status === 200);

  r = await req('POST', '/api/_dev/login', { username: 'sup1', nickname: '超管一号' });
  const sup = r.sid;
  check('被添加的 sup1 成为 super', r.data.user.isSuper === true && r.data.user.isOwner === false);
  check('super 不能查 staff=403', (await req('GET', '/api/admin/staff', null, sup)).status === 403);
  check('super 不能加 admin=403', (await req('POST', '/api/admin/staff', { username: 'x', tier: 'admin' }, sup)).status === 403);
  check('super 能巡查(查插件管理)=200', (await req('GET', '/api/admin/plugins', null, sup)).status === 200);

  console.log('== AI 机器人: 人人可加 / 仅owner可启停 ==');
  await req('POST', '/api/bots/test', { apiUrl: 'stub://demo', model: 'demo', apiKey: 'x' }, user);
  r = await req('POST', '/api/bots', { name: 'u1的AI', apiUrl: 'stub://demo', apiKey: 'x', model: 'demo', account: { username: 'u1' }, enabled: true, probability: 100 }, user);
  const ub = r.data && r.data.bot && r.data.bot.id;
  check('普通用户可添加自己 bot', !!ub);
  check('user 查 bots 只见自己的', (await req('GET', '/api/bots', null, user)).data.items.every((b) => b.mine === true));

  check('owner 能停用任意 bot=200', (await req('POST', '/api/bots/' + ub + '/enabled', { enabled: false }, owner)).status === 200);
  check('owner 能再次启用=200', (await req('POST', '/api/bots/' + ub + '/enabled', { enabled: true }, owner)).status === 200);
  check('super 不能停别人 bot=403', (await req('POST', '/api/bots/' + ub + '/enabled', { enabled: false }, sup)).status === 403);
  check('user 不能停自己 bot=403(启停仅owner)', (await req('POST', '/api/bots/' + ub + '/enabled', { enabled: false }, user)).status === 403);

  r = await req('POST', '/api/bots/' + ub + '/delete', {}, owner);
  check('owner 可删除任意 bot=200', r.status === 200);
  check('已删除', (await req('GET', '/api/bots', null, user)).data.items.every((b) => b.id !== ub));

  console.log('== 持久化：发布 ==');
  r = await req('POST', '/api/works', { title: '终检作品', description: 'x', type: 'redirect', fileUrl: 'https://code.pgrm.top/', tags: ['终检'] }, user);
  check('user 发布作品=200', r.status === 200);
  r = await req('POST', '/api/market/plugins', { name: '终检插件', description: 'x', tags: ['终检'], fileUrl: 'https://code.pgrm.top/a.zip' }, user);
  check('user 发布插件(外链)=200', r.status === 200);
  r = await req('POST', '/api/forum/posts', { boardId: 1, title: '终检帖', content: '内容' }, user);
  check('user 发帖=200', r.status === 200);

  console.log('\n结果: pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('E2E ERROR', e); process.exit(1); });
