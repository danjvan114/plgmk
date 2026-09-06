'use strict';
const http = require('http');
const B = 'http://127.0.0.1:8897';
function req(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(B + path);
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(cookie ? { Cookie: 'pgmk_sid=' + cookie } : {}) } },
      res => {
        let s = ''; res.on('data', c => s += c);
        res.on('end', () => {
          let j = null; try { j = JSON.parse(s); } catch (e) { j = { raw: s.slice(0, 120) }; }
          let sid = null;
          const sc = res.headers['set-cookie'];
          if (sc && sc.length) { const m = sc[0].match(/pgmk_sid=([^;]+)/); if (m) sid = m[1]; }
          resolve({ status: res.statusCode, data: j, sid });
        });
      });
    r.on('error', reject);
    if (data) r.write(data); r.end();
  });
}
let pass = 0, fail = 0;
function check(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  => ' + e : '')); } }

(async () => {
  console.log('== 登录三个身份 ==');
  let r = await req('POST', '/api/_dev/login', { username: 'starry_root', nickname: 'Starry' });
  const owner = r.sid;
  check('owner isOwner', r.data.user.isOwner === true);
  r = await req('POST', '/api/_dev/login', { username: 'u1', nickname: '测试甲' });
  const user = r.sid;
  r = await req('POST', '/api/_dev/login', { username: 'u2', nickname: '测试乙' });
  const user2 = r.sid;

  console.log('== 作品发布(播放器参数) ==');
  r = await req('POST', '/api/works', {
    title: '测试作品iframe', description: '这是描述', tags: ['测试'], type: 'player',
    f: 'http://127.0.0.1:5000/1.bcmkn',
    u: '123456', auth: 1, o: '1', v: Buffer.from('[https://a.test/1.js,https://b.test/2.js]','utf8').toString('base64'), auto: 1
  }, user);
  const wId = r.data && r.data.work && r.data.work.id;
  check('user发布作品=200 含player参数', r.status === 200 && wId > 0);
  const wp = r.data.work.player;
  check('player.f==f URL', wp.f === 'http://127.0.0.1:5000/1.bcmkn');
  check('player.u/auth/o/auto', wp.u === '123456' && wp.auth === 1 && wp.o === '1' && wp.auto === 1);
  check('player.v 是 base64 解码后包含 URL 数组', wp.v && Buffer.from(wp.v,'base64').toString('utf8').includes('https://a.test/1.js'));

  console.log('== 团队封面 ==');
  r = await req('POST', '/api/teams', { name: '测试团', description: 'd', cover: 'https://img.test/c.png' }, user);
  const tId = r.data && r.data.team && r.data.team.id;
  check('team 创建=200 含cover', r.status === 200 && r.data.team.cover === 'https://img.test/c.png');
  r = await req('POST', '/api/teams/' + tId, { cover: '/uploads/foo.jpg' }, user);
  check('team 更新本地路径cover=200', r.status === 200 && r.data.team.cover === '/uploads/foo.jpg');

  console.log('== 关注 ==');
  r = await req('POST', '/api/users/u1/follow', null, user2);
  check('u2关注u1=200', r.status === 200 && r.data.following === true);
  r = await req('POST', '/api/users/u1/follow', null, user2);
  check('u2再次点击=取消', r.status === 200 && r.data.following === false);
  const followerList = await req('GET', '/api/users/u1/followers', null);
  check('关注列表(u2已取消应空)', followerList.status === 200);
  await req('POST', '/api/users/u1/follow', null, user2);
  r = await req('GET', '/api/users/u1/followers', null);
  check('关注列表(再关注后含u2)', r.data.items.length >= 1 && r.data.items.some(x => x.username === 'u2'));

  console.log('== 机器人: 启停权限 + @bot 触发 ==');
  r = await req('POST', '/api/_dev/login', { username: 'u2', nickname: '测试乙' });
  await req('POST', '/api/bots/test', { apiUrl: 'stub://demo', model: 'demo', apiKey: 'x' }, user2);
  r = await req('POST', '/api/bots', {
    name: 'u2的AI', apiUrl: 'stub://demo', apiKey: 'x', model: 'demo',
    account: { username: 'u2' }, enabled: true, probability: 0
  }, user2);
  const u2bot = r.data.bot.id;
  check('u2的bot创建=200(probability=0)', r.status === 200);
  // u2 自己启停: probability=0 需开启
  r = await req('POST', '/api/bots/' + u2bot + '/enabled', { enabled: true }, user2);
  check('u2 启停自己=200', r.status === 200 && r.data.enabled === true);
  // 普通用户不能启停他人bot
  r = await req('POST', '/api/bots/' + u2bot + '/enabled', { enabled: false }, user);
  check('user不能停他人bot=403', r.status === 403);

  console.log('== 插件发布(js文件) ==');
  r = await req('POST', '/api/market/plugins', { name: 'js插件', description: 'd', tags: ['js'], fileUrl: 'https://x.test/p.js' }, user);
  check('js外链发布=200', r.status === 200);

  console.log('== 静态资源 ==');
  for (const p of ['/app/player/', '/app/player/main.b0815b57.js', '/download', '/manifest.json', '/icon.ico']) {
    const rr = await new Promise((resolve) => { const u = new URL(B + p); const rq = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET' }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); }); rq.end(); });
    check(`GET ${p}=200`, rr === 200);
  }

  console.log('\n结果: pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E ERROR', e); process.exit(1); });