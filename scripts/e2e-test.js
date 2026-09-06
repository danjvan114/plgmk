'use strict';
const crypto = require('crypto');
const config = require('../config');

const BASE = process.env.BASE || 'http://127.0.0.1:8897';

function b64e(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}
function enc(s) {
  const key = Buffer.from(config.userCenter.aes.key, 'hex');
  const iv = Buffer.from(config.userCenter.aes.iv, 'hex');
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  return c.update(s, 'utf8', 'base64') + c.final('base64');
}
function makeCipher(user) {
  const layer1 = b64e(JSON.stringify({
    msg: '200',
    username: user.username,
    uuid: user.uuid,
    token: user.token,
    nickname: user.nickname,
    avatar: user.avatar || ''
  }));
  const layer2 = b64e(JSON.stringify({ login: layer1, time: String(Date.now() + 300000) }));
  return enc(layer2);
}

let cookie = '';

async function call(method, path, body, rawFile) {
  const headers = {};
  if (cookie) headers['Cookie'] = cookie;
  if (body !== undefined && !rawFile) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  if (rawFile) headers['X-File-Name'] = encodeURIComponent('demo-plugin.zip');
  const res = await fetch(BASE + path, { method, headers, body: body || undefined });
  const setc = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (setc && setc.length) {
    cookie = setc.map((c) => c.split(';')[0]).join('; ');
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = { raw: 'not-json' };
  }
  return { status: res.status, data };
}

(async () => {
  const r1 = await call('POST', '/api/auth/sso/decode', { login: makeCipher({ username: 'danjvan', uuid: 'test-uuid-1001', token: 'dev:danjvan', nickname: '测试阿短', avatar: '' }) });
  console.log('1 登录解密:', r1.status, 'ok=', !!(r1.data && r1.data.user), 'cookie=', cookie ? 'SET' : 'NONE');

  const h = await call('GET', '/api/header');
  console.log('2 登录后 /api/header:', h.status, 'loggedIn=', !!(h.data && h.data.loggedIn), 'nickname=', h.data && h.data.user && h.data.user.nickname);

  const st = await call('GET', '/api/auth/state');
  console.log('3 用户信息:', st.status, st.data && st.data.user && JSON.stringify(st.data.user));

  const buf = Buffer.from('PK\x03\x04 fake plugin content for e2e');
  const up = await call('POST', '/api/upload?kind=plugin&filename=' + encodeURIComponent('demo-plugin.zip'), buf, true);
  console.log('4 上传插件文件:', up.status, up.data && up.data.url, 'size=', up.data && up.data.size);

  const plug = await call('POST', '/api/market/plugins', {
    name: 'E2E 测试插件',
    version: '1.0.0',
    tags: 'e2e 测试',
    description: '由端到端测试创建的插件，验证持久化。',
    fileId: (up.data && up.data.url || '').replace(/^\/uploads\//, ''),
    fileName: 'demo-plugin.zip',
    fileSize: up.data && up.data.size,
    fileSha: up.data && up.data.sha256
  });
  console.log('5 发布插件:', plug.status, 'id=', plug.data && plug.data.plugin && plug.data.plugin.id, 'name=', plug.data && plug.data.plugin && plug.data.plugin.name);

  const ext = await call('POST', '/api/market/plugins', {
    name: 'E2E 外链插件',
    tags: 'e2e',
    description: '验证外部链接上传。',
    fileUrl: 'https://example.com/demo.zip'
  });
  console.log('6 外链插件:', ext.status, 'source=', ext.data && ext.data.plugin && ext.data.plugin.source);

  const w = await call('POST', '/api/works', {
    title: 'E2E 测试作品',
    description: '端到端测试作品说明',
    type: 'player',
    tags: 'e2e',
    filePath: (up.data && up.data.url) || '/uploads/images/fake.png'
  });
  console.log('7 发布作品:', w.status, 'id=', w.data && w.data.work && w.data.work.id);

  const post = await call('POST', '/api/forum/posts', {
    title: 'E2E 测试帖',
    content: '端到端测试帖子正文',
    boardId: 1,
    tags: ['e2e']
  });
  console.log('8 发帖:', post.status, 'id=', post.data && post.data.post && post.data.post.id);

  const listP = await call('GET', '/api/market/plugins?size=5');
  console.log('9 市场列表:', listP.status, 'total=', listP.data && listP.data.total);
  const listW = await call('GET', '/api/works?size=5');
  console.log('10 作品列表:', listW.status, 'total=', listW.data && listW.data.total);

  const chk = await call('GET', '/api/auth/check');
  console.log('11 token巡检(dev模式):', chk.status, 'valid=', chk.data && chk.data.valid);

  const down = await call('GET', '/api/market/plugins/' + (plug.data && plug.data.plugin ? plug.data.plugin.id : 1) + '/download');
  console.log('12 下载接口:', down.status);
})();
