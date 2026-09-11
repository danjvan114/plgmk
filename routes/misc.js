'use strict';

const config = require('../config');
const H = require('../lib/http');
const store = require('../lib/store');
const session = require('../lib/session');
const ratelimit = require('../lib/ratelimit');
const upload = require('../lib/upload');
const { now, cleanText, safeExt } = require('../lib/util');

const KINDS = {
  plugin: { dir: 'plugins', prefix: 'p', max: config.limits.uploadMaxBytes, ext: config.upload.allowedPluginExt, forceExt: 'cue' },
  image: { dir: 'images', prefix: 'i', max: config.limits.imageMaxBytes, ext: config.upload.allowedImageExt },
  work: { dir: 'works', prefix: 'w', max: config.limits.uploadMaxBytes, ext: config.upload.allowedPluginExt, forceExt: 'cue' },
  thumb: { dir: 'thumbs', prefix: 't', max: config.limits.imageMaxBytes, ext: config.upload.allowedImageExt }
};

module.exports = function register(router) {
  router.post('/api/upload', async (req, res) => {
    if (!req.session) {
      H.fail(res, 401, '请先登录', 401);
      return;
    }
    if (!ratelimit.middleware('upload')(req, res)) return;

    const kind = cleanText(req.query.kind, 16) || 'plugin';
    const rule = KINDS[kind];
    if (!rule) {
      H.fail(res, 400, '未知的上传类型', 400);
      return;
    }

    const rawName = req.headers['x-file-name'] || req.query.filename || 'file';
    let originalName = rawName;
    try {
      originalName = decodeURIComponent(String(rawName));
    } catch (e) {
      originalName = String(rawName);
    }
    originalName = cleanText(originalName, 160);
    if (!originalName || !safeExt(originalName)) {
      H.fail(res, 400, '文件名无效', 400);
      return;
    }

    const destDir = require('path').join(config.uploadDir, rule.dir);
    let saved;
    try {
      saved = await upload.saveStream(req, destDir, originalName, {
        maxBytes: rule.max,
        allowedExt: rule.ext,
        prefix: rule.prefix,
        forceExt: rule.forceExt
      });
    } catch (err) {
      if (err && err.code === 'FILE_TOO_LARGE') {
        H.fail(res, 413, `文件超过 ${Math.floor(rule.max / 1024 / 1024)} MB 限制`, 413, { limit: rule.max });
        return;
      }
      if (err && err.code === 'EXT_NOT_ALLOWED') {
        H.fail(res, 400, `不支持的文件类型：.${err.ext}`, 400, { allowed: rule.ext });
        return;
      }
      console.error('[upload] error', err);
      H.fail(res, 500, '上传失败，请重试', 500);
      return;
    }

    H.ok(res, {
      url: `/uploads/${rule.dir}/${saved.filename}`,
      filename: saved.filename,
      originalName,
      size: saved.size,
      sha256: saved.sha256
    });
  });

  router.get('/api/header', (req, res) => {
    const payload = {
      siteName: config.siteName,
      loggedIn: !!req.session,
      user: session.publicUser(req.session),
      unread: 0
    };
    if (req.session) {
      payload.unread = store.col('messages').count((m) => m && m.toUser === req.session.username && !m.isRead);
    }
    H.ok(res, payload);
  });

  router.get('/api/meta', (req, res) => {
    H.ok(res, {
      siteName: config.siteName,
      devMode: !!config.devMode,
      userCenter: config.userCenter.base
    });
  });

  router.get('/api/site/stats', (req, res) => {
    const plugins = store.col('plugins');
    const works = store.col('works');
    const posts = store.col('forum_posts');
    H.ok(res, {
      plugins: plugins.count((p) => p && p.status === 'active'),
      downloads: plugins.all().reduce((s, p) => s + (p && p.status === 'active' ? p.downloadCount || 0 : 0), 0),
      works: works.count((w) => w && w.status === 'active' && !w.isHidden),
      posts: posts.count((p) => p && p.status !== 'deleted'),
      teams: store.col('teams').size()
    });
  });

  router.get('/api/upload/config', (req, res) => {
    H.ok(res, {
      maxBytes: config.limits.uploadMaxBytes,
      imageMaxBytes: config.limits.imageMaxBytes,
      pluginExt: config.upload.allowedPluginExt,
      imageExt: config.upload.allowedImageExt
    });
  });
};
