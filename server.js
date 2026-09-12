'use strict';

const http = require('http');
const fsp = require('fs/promises');
const path = require('path');

const config = require('./config');
const store = require('./lib/store');
const session = require('./lib/session');
const ratelimit = require('./lib/ratelimit');
const sso = require('./lib/sso');
const profiles = require('./lib/profiles');
const Router = require('./lib/router');
const H = require('./lib/http');

const apiRouter = new Router();
const pageRouter = new Router();

const VUE_DIST = path.join(__dirname, 'vue', 'dist');

async function readVueIndex() {
  // 每次都重新读，不用缓存 —— Vue build 后 hash 会变，缓存会导致旧 js 引用 404
  const file = path.join(VUE_DIST, 'index.html');
  return await fsp.readFile(file, 'utf8');
}

async function serveVueStatic(req, res, pathname) {
  // pathname 形如 /assets/index-xxx.js 或 /assets/sub/xxx.css
  const rel = pathname.replace(/^\/+/, '');
  const full = path.resolve(VUE_DIST, rel);
  const base = path.resolve(VUE_DIST);
  if (full !== base && !full.startsWith(base + path.sep)) return false;
  const served = await H.serveFile(req, res, full, {
    maxAge: 31536000,
    cacheControl: 'public, max-age=31536000, immutable'
  });
  return served;
}

function registerPages() {
  // ===== 精确路由（必须在通配符 * 之前注册）=====

  pageRouter.get('/login', (req, res) => {
    if (req.session) {
      H.redirect(res, '/');
      return;
    }
    const back = config.resolveCallback(req);
    H.redirect(res, sso.buildAuthorizeUrl(back), 302);
  });

  // SSO 回调 → 保留原来的 SSR 页面（非 SPA）
  pageRouter.get('/login/at', async (req, res) => {
    try {
      const html = await fsp.readFile(path.join(config.viewDir, 'login-at.html'), 'utf8');
      H.sendHtml(res, html);
    } catch (e) {
      H.sendHtml(res, '<h1>login-at.html missing</h1>', 500);
    }
  });

  pageRouter.get('/app/player', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const file = path.join(config.publicDir, 'app', 'player', 'index.html');
    H.serveFile(req, res, file, { maxAge: 0 }).then((ok) => {
      if (!ok) H.sendHtml(res, '<h1>player missing</h1>', 404);
    });
  });
  pageRouter.get('/app/player/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const file = path.join(config.publicDir, 'app', 'player', 'index.html');
    H.serveFile(req, res, file, { maxAge: 0 }).then((ok) => {
      if (!ok) H.sendHtml(res, '<h1>player missing</h1>', 404);
    });
  });

  pageRouter.get('/logout', (req, res) => {
    if (req.session) {
      if (req.session.token) {
        sso.invalidateCache(req.session.token);
        sso.revokeToken(req.session.token).catch(() => {});
      }
      session.destroy(req.session.id);
    }
    session.clearCookie(res);
    H.redirect(res, '/');
  });

  // ===== SPA fallback（必须放最后）=====
  pageRouter.get('*', async (req, res) => {
    // 如果 pathname 看起来像静态资源（有扩展名）但前面 serveVueStatic 也没找到 → 返回 404 JSON，别返回 index.html
    // 否则浏览器缓存了旧 hash 的 index.html 时，每次请求旧 js 都会拿到 text/html，触发 MIME 错误
    if (/\.[a-z0-9]+$/i.test(req.url.split('?')[0])) {
      H.fail(res, 404, `Static file not found: ${req.url}`, 404);
      return;
    }
    let html;
    try {
      html = await readVueIndex();
    } catch (e) {
      return sendErrorPage(req, res, 500, 'Vue 前端未构建，请先运行: cd vue && npm run build');
    }
    // index.html 必须不缓存 —— Vite build 后 js hash 会变，缓存会导致旧引用 404
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    H.sendHtml(res, html);
  });
}

async function sendErrorPage(req, res, status, message) {
  let html;
  try {
    html = await readVueIndex();
  } catch (e) {
    html = null;
  }
  if (!html) {
    H.sendHtml(res, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${status}</title></head><body><h1>${status}</h1><p>${H.mimeOf ? '' : ''}${message || ''}</p></body></html>`, status);
    return;
  }
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store'
  });
  res.end(html);
}

async function serveStatic(req, res, pathname) {
  const rel = pathname.replace(/^\/+/, '');
  const full = path.resolve(config.publicDir, rel);
  const base = path.resolve(config.publicDir);
  if (full !== base && !full.startsWith(base + path.sep)) {
    H.fail(res, 403, '禁止访问', 403);
    return true;
  }
  const isHashed = /\.[0-9a-f]{8,}\.(css|js)$/.test(rel);
  const served = await H.serveFile(req, res, full, {
    maxAge: isHashed ? 31536000 : 0,
    cacheControl: isHashed ? 'public, max-age=31536000, immutable' : 'no-cache'
  });
  return served;
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    if (ms > 1000) console.warn(`[slow] ${req.method} ${req.url} ${ms}ms`);
  });

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    session.attach(req, res);

    if (pathname === '/health') {
      H.ok(res, {
        status: 'ok',
        uptime: process.uptime(),
        sessions: session.stats().total,
        store: store.stats
      });
      return;
    }

    if (pathname === '/favicon.ico') {
      const favicon = path.join(config.publicDir, 'favicon.ico');
      const served = await H.serveFile(req, res, favicon, { maxAge: 86400 });
      if (served) return;
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname.startsWith('/api/')) {
      if (!ratelimit.middleware('api')(req, res)) return;
      if (req.method === 'POST' && req.session && !req.session.isAdmin) {
        const muteWrite = /^\/api\/(forum\/posts(\/|$)|forum\/posts\/\d+\/replies|works(\/|$)|works\/\d+\/comments|market\/plugins(\/|$))/.test(pathname);
        if (muteWrite) {
          try {
            if (require('./lib/moderation').isMuted(req.session.username)) {
              H.fail(res, 403, '你已被禁言，暂时无法发布内容', 403, { code: 'MUTED' });
              return;
            }
          } catch (e) { /* ignore */ }
        }
      }
      const matched = apiRouter.match(req.method, pathname);
      if (!matched) {
        H.fail(res, 404, '接口不存在', 404);
        return;
      }
      req.params = matched.params;
      req.query = H.parseQuery(req.url);
      await matched.handler(req, res);
      return;
    }

    if (pathname.startsWith('/static/') || pathname.startsWith('/uploads/') || pathname.startsWith('/app/') || /\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico|mp4|webm|m4a|mp3|wav|ogg|flac|aac|json|map|zip|bcmkn|ttmp4|txt|html|exe|wasm)$/i.test(pathname)) {
      const served = await serveStatic(req, res, pathname);
      if (served) return;
      // 静态资源从 public 找不到 → 试试 Vue dist（/assets/xxx.js 等）
      const vueServed = await serveVueStatic(req, res, pathname);
      if (vueServed) return;
    }

    const matched = pageRouter.match(req.method, pathname);
    if (matched) {
      req.params = matched.params;
      req.query = H.parseQuery(req.url);
      await matched.handler(req, res);
      return;
    }

    await sendErrorPage(req, res, 404, '页面不存在');
  } catch (err) {
    console.error('[error]', req.method, req.url, err);
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = err && err.status ? err.status : 500;
    if ((req.url || '').startsWith('/api/')) {
      H.fail(res, status, err && err.message ? err.message : '服务器内部错误', status);
      return;
    }
    await sendErrorPage(req, res, status, '服务器内部错误');
  }
});

async function bootstrap() {
  await store.init();
  session.loadIndex();
  session.startSweeper();
  ratelimit.startSweeper();
  sso.startSweeper();

  registerPages();

  require('./routes/auth')(apiRouter);
  require('./routes/market')(apiRouter);
  require('./routes/forum')(apiRouter);
  require('./routes/workpool')(apiRouter);
  require('./routes/team')(apiRouter);
  require('./routes/user')(apiRouter);
  require('./routes/admin')(apiRouter);
  require('./routes/bots')(apiRouter);
  require('./routes/misc')(apiRouter);
  require('./routes/moderation')(apiRouter);

  profiles.loadIndex();
  require('./routes/market').buildIndexes();
  require('./routes/forum').buildIndexes();
  require('./routes/workpool').buildIndexes();
  require('./routes/team').buildIndexes();

  const profileSweeper = setInterval(() => profiles.sweep(), 60 * 60 * 1000);
  if (profileSweeper.unref) profileSweeper.unref();

  await fsp.mkdir(config.uploadDir, { recursive: true });

  server.listen(config.port, config.host, () => {
    console.log(`\n  ${config.siteName} 已启动`);
    console.log(`  监听 http://${config.host}:${config.port}`);
    console.log(`  用户中心 ${config.userCenter.base}`);
    console.log(`  数据目录 ${config.dataDir}`);
    console.log(`  已注册接口 ${apiRouter.routes.length} 条\n`);
  });
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[${signal}] 正在保存数据...`);
  server.close();
  try {
    await store.shutdown();
    console.log('数据已保存，退出。');
  } catch (e) {
    console.error('保存失败', e);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

if (require.main === module) bootstrap();

module.exports = { server, apiRouter, pageRouter, bootstrap };
