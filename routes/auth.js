'use strict';

const config = require('../config');
const H = require('../lib/http');
const session = require('../lib/session');
const sso = require('../lib/sso');
const ratelimit = require('../lib/ratelimit');
const { now } = require('../lib/util');

module.exports = function register(router) {
  router.get('/api/auth/state', async (req, res) => {
    if (!req.session) {
      H.ok(res, { loggedIn: false, user: null });
      return;
    }
    const s = req.session;
    let profile = null;
    if (s.token && !(config.devMode && String(s.token).startsWith('dev:'))) {
      profile = await sso.fetchProfile(s.token);
      if (profile) {
        let changed = false;
        if (profile.nickname && profile.nickname !== s.nickname) {
          s.nickname = profile.nickname;
          changed = true;
        }
        if (profile.avatar !== undefined && profile.avatar !== s.avatar) {
          s.avatar = profile.avatar;
          changed = true;
        }
        if (profile.username && profile.username !== s.username) {
          s.username = profile.username;
          changed = true;
        }
        if (changed) session.update(s.id, { nickname: s.nickname, avatar: s.avatar, username: s.username });
      }
    }
    H.ok(res, {
      loggedIn: true,
      user: session.publicUser(s)
    });
  });

  router.get('/api/auth/login-url', (req, res) => {
    const back = config.resolveCallback(req);
    H.ok(res, { url: sso.buildAuthorizeUrl(back), callback: back });
  });

  router.post('/api/auth/sso/decode', async (req, res) => {
    if (!ratelimit.middleware('login')(req, res)) return;
    let body;
    try {
      body = await H.readJsonBody(req);
    } catch (e) {
      H.fail(res, 400, '请求格式错误', 400);
      return;
    }
    const cipher = String(body.login || '').trim();
    if (!cipher) {
      H.fail(res, 400, '缺少登录凭据', 400);
      return;
    }

    let result;
    try {
      result = sso.decryptCredential(cipher);
    } catch (e) {
      result = { ok: false, code: 'DECRYPT_ERROR', msg: '登录凭据处理失败' };
    }

    if (!result.ok) {
      H.fail(res, 401, result.msg, 401, { reason: result.code });
      return;
    }

    const info = result.info;
    if (!info.token) {
      H.fail(res, 401, '登录信息缺少访问令牌', 401, { reason: 'NO_TOKEN' });
      return;
    }

    const record = session.create({
      uuid: info.uuid,
      username: info.username,
      nickname: info.nickname,
      avatar: info.avatar,
      token: info.token,
      tokenExpire: info.expire,
      ip: H.clientIp(req),
      ua: req.headers['user-agent']
    });

    session.writeCookie(res, record.id);

    let profile = null;
    if (!(config.devMode && String(info.token).startsWith('dev:'))) {
      try {
        profile = await sso.fetchProfile(info.token);
      } catch (e) {
        profile = null;
      }
    }
    if (profile) {
      session.update(record.id, {
        nickname: profile.nickname || record.nickname,
        avatar: profile.avatar || record.avatar,
        username: profile.username || record.username,
        tokenExpire: profile.expireAt || record.tokenExpire
      });
    }
    const rec = session.refreshRole(record);
    H.ok(res, {
      user: session.publicUser(rec)
    });
  });

  router.get('/api/auth/check', async (req, res) => {
    if (!req.session) {
      H.ok(res, { valid: false, loggedIn: false, reason: 'NO_SESSION' });
      return;
    }
    const s = req.session;
    if (!s.token) {
      session.destroy(s.id);
      session.clearCookie(res);
      H.ok(res, { valid: false, loggedIn: false, reason: 'NO_TOKEN' });
      return;
    }
    const result = await sso.checkToken(s.token);
    if (!result.valid) {
      if (config.devMode && String(s.token).startsWith('dev:')) {
        session.update(s.id, { tokenExpire: now() + 3 * 24 * 3600 * 1000 });
        H.ok(res, {
          valid: true,
          loggedIn: true,
          devMode: true,
          expireAt: s.tokenExpire,
          user: session.publicUser(s)
        });
        return;
      }
      session.destroy(s.id);
      session.clearCookie(res);
      sso.invalidateCache(s.token);
      H.ok(res, {
        valid: false,
        loggedIn: false,
        reason: result.reason || 'EXPIRED',
        expireAt: result.expireAt || 0
      });
      return;
    }
    if (s.tokenExpire !== result.expireAt) {
      session.update(s.id, { tokenExpire: result.expireAt });
    }
    session.refreshRole(s);
    H.ok(res, {
      valid: true,
      loggedIn: true,
      expireAt: result.expireAt,
      checkedAt: now(),
      user: session.publicUser(s)
    });
  });

  router.post('/api/auth/logout', async (req, res) => {
    if (req.session) {
      if (req.session.token) {
        sso.invalidateCache(req.session.token);
        sso.revokeToken(req.session.token).catch(() => {});
      }
      session.destroy(req.session.id);
    }
    session.clearCookie(res);
    H.ok(res, { loggedIn: false });
  });

  if (config.devMode) {
    router.get('/api/_dev/login', async (req, res) => {
      if (!ratelimit.middleware('login')(req, res)) return;
      const q = req.query || {};
      const username = String(q.username || 'danjvan').trim().slice(0, 64);
      const nickname = String(q.nickname || username).trim().slice(0, 64);
      const avatar = String(q.avatar || '').trim().slice(0, 500);
      const rec = session.create({
        uuid: 'dev-uuid-' + Buffer.from(username).toString('hex').slice(0, 16) + '-' + Date.now(),
        username,
        nickname,
        avatar,
        token: 'dev:' + username,
        tokenExpire: Date.now() + 24 * 3600 * 1000,
        ip: H.clientIp(req),
        ua: req.headers['user-agent']
      });
      session.writeCookie(res, rec.id);
      H.ok(res, { user: session.publicUser(session.refreshRole(rec)) });
    });

    router.post('/api/_dev/login', async (req, res) => {
      if (!ratelimit.middleware('login')(req, res)) return;
      let body = {};
      try {
        body = await H.readJsonBody(req);
      } catch (e) {
        body = {};
      }
      const username = String(body.username || 'danjvan').trim().slice(0, 64);
      const nickname = String(body.nickname || username).trim().slice(0, 64);
      const avatar = String(body.avatar || '').trim().slice(0, 500);
      const rec = session.create({
        uuid: 'dev-uuid-' + Buffer.from(username).toString('hex').slice(0, 16) + '-' + Date.now(),
        username,
        nickname,
        avatar,
        token: 'dev:' + username,
        tokenExpire: Date.now() + 24 * 3600 * 1000,
        ip: H.clientIp(req),
        ua: req.headers['user-agent']
      });
      session.writeCookie(res, rec.id);
      H.ok(res, { user: session.publicUser(session.refreshRole(rec)) });
    });
  }
};
