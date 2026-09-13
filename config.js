'use strict';

const path = require('path');

const ROOT = __dirname;
const env = process.env;

function bool(v, d) {
  if (v === undefined || v === '') return d;
  return v === '1' || v === 'true' || v === 'yes';
}

const config = {
  host: env.PGMK_HOST || '0.0.0.0',
  port: Number(env.PGMK_PORT || 8897),

  root: ROOT,
  dataDir: env.PGMK_DATA_DIR || path.join(ROOT, 'data'),
  viewDir: path.join(ROOT, 'views'),
  publicDir: path.join(ROOT, 'public'),
  uploadDir: env.PGMK_UPLOAD_DIR || path.join(ROOT, 'public', 'uploads'),

  siteName: env.PGMK_SITE_NAME || 'KE Hub',
  trustProxy: bool(env.PGMK_TRUST_PROXY, true),
  secureCookie: bool(env.PGMK_SECURE_COOKIE, false),
  devMode: bool(env.PGMK_DEV_MODE, false),

  store: {
    flushDelay: 300,
    snapshotKeep: 5
  },

  session: {
    cookieName: 'pgmk_sid',
    ttl: 30 * 24 * 3600 * 1000,
    sweepInterval: 10 * 60 * 1000
  },

  userCenter: {
    base: (env.PGMK_USER_CENTER || 'https://user.pgrm.top').replace(/\/+$/, ''),
    // 服务器同机部署时，后端请求用户中心走内网（srv=1），避免绕外网穿透。
    // 前端跨域拉公开资料仍走 base（用户浏览器只能访问外网，localhost 对它不可达）。
    internalBase: (env.PGMK_SRV === '1' || env.PGMK_SRV === 'true' || env.PGMK_SRV === 1)
      ? (env.PGMK_USER_CENTER_INTERNAL || 'http://localhost:8843').replace(/\/+$/, '')
      : '',
    appid: env.PGMK_APPID || 'plgmk',
    callbackPath: '/login/at',
    forcedCallback: env.PGMK_CALLBACK || '',
    infoFields: ['username', 'uuid', 'token', 'nickname', 'avatar'],
    aes: {
      algorithm: 'aes-256-cbc',
      key: env.PGMK_AES_KEY || 'e942a269a1dd152d833e4f13cd59432a5a10a86c2c0cc3a9d90f218548c8abaf',
      iv: env.PGMK_AES_IV || '77fc6145f3a631bd9816119bf69514d6'
    },
    requestTimeout: 8000,
    checkCacheTtl: 20 * 1000,
    profileCacheTtl: 5 * 60 * 1000,
    credentialTtl: 5 * 60 * 1000
  },

  limits: {
    uploadMaxBytes: 10 * 1024 * 1024,
    imageMaxBytes: 10 * 1024 * 1024,
    jsonBodyMaxBytes: 2 * 1024 * 1024,
    pageDefaultSize: 20,
    pageMaxSize: 100
  },

  upload: {
    allowedPluginExt: ['zip', 'rar', '7z', 'js', 'py', 'tar', 'gz', 'bcmkn', 'ttmp4', 'cue'],
    allowedImageExt: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
  },

  rateLimit: {
    api: { windowMs: 60 * 1000, max: 240 },
    write: { windowMs: 60 * 1000, max: 60 },
    login: { windowMs: 60 * 1000, max: 30 },
    upload: { windowMs: 60 * 1000, max: 20 },
    search: { windowMs: 10 * 1000, max: 40 }
  },

  ownerNickname: (env.PGMK_OWNER_NICKNAME || 'danjvan114,danjvan114000').split(',').map(s => s.trim()).filter(Boolean)
};

// 服务器部署本地配置（可选，不提交，已在 .gitignore）：
//   module.exports = { srv: true, userCenterInternal: 'http://localhost:8843' }
// 存在该文件且 srv 为真时，后端请求用户中心改用内网地址；
// 前端跨域拉公开资料仍用 base（外网），不受影响。
try {
  const local = require('./config.srv');
  if (local && local.srv) {
    config.userCenter.internalBase =
      String(local.userCenterInternal || config.userCenter.internalBase || 'http://localhost:8843').replace(/\/+$/, '');
  }
  if (local && local.userCenter) {
    config.userCenter.base = String(local.userCenter).replace(/\/+$/, '');
  }
} catch (e) { /* 无本地配置文件则沿用环境变量/默认值 */ }

config.resolveCallback = function resolveCallback(req) {
  if (config.userCenter.forcedCallback) return config.userCenter.forcedCallback;
  const proto = config.trustProxy
    ? (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'https'
    : 'https';
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}${config.userCenter.callbackPath}`;
};

module.exports = config;
