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

const PAGES = [
  ['/', 'index.html'],
  ['/market', 'market.html'],
  ['/plugin/:id', 'plugin.html'],
  ['/plugin/:id/edit', 'plugin-edit.html'],
  ['/upload', 'plugin-edit.html'],
  ['/dev', 'dev.html'],
  ['/forum', 'forum.html'],
  ['/forum/:id', 'forum.html'],
  ['/post/new', 'post-edit.html'],
  ['/post/:id', 'post.html'],
  ['/workpool', 'workpool.html'],
  ['/workpool/publish', 'work-edit.html'],
  ['/workpool/publish/:id', 'work-edit.html'],
  ['/work/:id', 'work.html'],
  ['/team', 'team.html'],
  ['/team/:id', 'team-detail.html'],
  ['/u/:username', 'user.html'],
  ['/admin', 'admin.html'],
  ['/login/at', 'login-at.html'],
  ['/docs', 'docs.html'],
  ['/download', 'download.html']
];

let viewCache = new Map();

async function readView(name) {
  if (viewCache.has(name)) return viewCache.get(name);
  const file = path.join(config.viewDir, name);
  const html = await fsp.readFile(file, 'utf8');
  viewCache.set(name, html);
  return html;
}

function registerPages() {
  for (const [pattern, file] of PAGES) {
    pageRouter.get(pattern, async (req, res) => {
      let html;
      try {
        html = await readView(file);
      } catch (e) {
        return sendErrorPage(req, res, 500, '页面加载失败');
      }
      H.sendHtml(res, html);
    });
  }

  pageRouter.get('/login', (req, res) => {
    if (req.session) {
      H.redirect(res, '/');
      return;
    }
    const back = config.resolveCallback(req);
    H.redirect(res, sso.buildAuthorizeUrl(back), 302);
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
}

async function sendErrorPage(req, res, status, message) {
  let html;
  try {
    html = await readView('error.html');
  } catch (e) {
    html = null;
  }
  if (!html) {
    H.sendHtml(res, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${status}</title></head><body><h1>${status}</h1><p>${H.mimeOf ? '' : ''}${message || ''}</p></body></html>`, status);
    return;
  }
  const rendered = html
    .replace(/\{\{code\}\}/g, String(status))
    .replace(/\{\{message\}\}/g, String(message || ''));
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(rendered),
    'Cache-Control': 'no-store'
  });
  res.end(rendered);
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

    if (pathname.startsWith('/static/') || pathname.startsWith('/uploads/') || pathname.startsWith('/app/') || /\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico|mp4|webm|json|map|zip|bcmkn|ttmp4|txt|html|exe|wasm)$/i.test(pathname)) {
      const served = await serveStatic(req, res, pathname);
      if (served) return;
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
