'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const config = require('../config');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.bcmkn': 'application/octet-stream',
  '.ttmp4': 'application/octet-stream'
};

const COMPRESSIBLE = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md', '.map']);
const COMPRESS_MIN = 1024;

const compressCache = new Map();

function mimeOf(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function isCompressible(file) {
  return COMPRESSIBLE.has(path.extname(file).toLowerCase());
}

function parseCookies(req) {
  if (req._cookies) return req._cookies;
  const out = {};
  const header = req.headers.cookie;
  if (header) {
    const parts = header.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx < 1) continue;
      const key = part.slice(0, idx).trim();
      let value = part.slice(idx + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      try {
        out[key] = decodeURIComponent(value);
      } catch (e) {
        out[key] = value;
      }
    }
  }
  req._cookies = out;
  return out;
}

function serializeCookie(name, value, opts) {
  const o = opts || {};
  let s = `${name}=${encodeURIComponent(value)}`;
  s += `; Path=${o.path || '/'}`;
  if (o.maxAge !== undefined) {
    s += `; Max-Age=${Math.floor(o.maxAge / 1000)}`;
    s += `; Expires=${new Date(Date.now() + o.maxAge).toUTCString()}`;
  }
  if (o.domain) s += `; Domain=${o.domain}`;
  if (o.httpOnly !== false) s += '; HttpOnly';
  if (o.secure) s += '; Secure';
  const sameSite = o.sameSite || 'Lax';
  s += `; SameSite=${sameSite}`;
  return s;
}

function setCookie(res, name, value, opts) {
  const existing = res.getHeader('Set-Cookie');
  const line = serializeCookie(name, value, opts);
  if (existing) {
    res.setHeader('Set-Cookie', [].concat(existing, line));
  } else {
    res.setHeader('Set-Cookie', line);
  }
}

function clearCookie(res, name, opts) {
  setCookie(res, name, '', Object.assign({ maxAge: 0 }, opts || {}));
}

function sendJson(res, data, status) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  res.writeHead(status || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function ok(res, data, extra) {
  sendJson(res, Object.assign({ ok: true, code: 200 }, data, extra || {}));
}

function fail(res, status, msg, code, extra) {
  sendJson(res, Object.assign({ ok: false, code: code || status, msg: msg || '请求失败' }, extra || {}), status);
}

function sendHtml(res, html, status) {
  const body = Buffer.from(html, 'utf8');
  res.writeHead(status || 200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function redirect(res, url, status) {
  res.writeHead(status || 302, {
    Location: url,
    'Cache-Control': 'no-store'
  });
  res.end();
}

function clientIp(req) {
  if (config.trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
    const real = req.headers['x-real-ip'];
    if (real) return String(real).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

function readBody(req, limit) {
  const max = limit || 2 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > max) {
        done = true;
        reject(Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      if (done) return;
      done = true;
      reject(err);
    });
  });
}

async function readJsonBody(req, limit) {
  const buf = await readBody(req, limit || config.limits.jsonBodyMaxBytes);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch (e) {
    const err = new Error('INVALID_JSON');
    err.status = 400;
    throw err;
  }
}

async function readUrlEncoded(req, limit) {
  const buf = await readBody(req, limit || config.limits.jsonBodyMaxBytes);
  if (!buf.length) return {};
  const out = {};
  for (const pair of buf.toString('utf8').split('&')) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    const key = idx < 0 ? pair : pair.slice(0, idx);
    const value = idx < 0 ? '' : pair.slice(idx + 1);
    try {
      out[decodeURIComponent(key.replace(/\+/g, ' '))] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch (e) {
      out[key] = value;
    }
  }
  return out;
}

function parseQuery(url) {
  const q = url.indexOf('?');
  if (q < 0) return {};
  const out = {};
  const search = url.slice(q + 1);
  for (const pair of search.split('&')) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    const key = idx < 0 ? pair : pair.slice(0, idx);
    const value = idx < 0 ? '' : pair.slice(idx + 1);
    try {
      out[decodeURIComponent(key.replace(/\+/g, ' '))] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch (e) {
      out[key] = value;
    }
  }
  return out;
}

async function getCompressed(filePath, stat) {
  const key = `${filePath}:${stat.mtimeMs}:${stat.size}`;
  const hit = compressCache.get(key);
  if (hit) return hit;
  if (compressCache.size > 300) compressCache.clear();
  const raw = await fsp.readFile(filePath);
  const gz = await new Promise((resolve, reject) => {
    zlib.gzip(raw, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
  });
  const entry = { gzip: gz };
  compressCache.set(key, entry);
  return entry;
}

async function serveFile(req, res, filePath, opts) {
  const o = opts || {};
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (e) {
    return false;
  }
  if (stat.isDirectory()) return false;

  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const lastModified = stat.mtime.toUTCString();
  const headers = {
    'Content-Type': mimeOf(filePath),
    'Last-Modified': lastModified,
    ETag: etag,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff'
  };
  if (o.cacheControl) headers['Cache-Control'] = o.cacheControl;
  else if (o.maxAge !== undefined) headers['Cache-Control'] = `public, max-age=${o.maxAge}`;
  else headers['Cache-Control'] = 'no-cache';
  if (o.download) {
    const name = o.downloadName || path.basename(filePath);
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
    headers['Content-Type'] = o.downloadMime || 'application/octet-stream';
  }

  const inm = req.headers['if-none-match'];
  if (inm && inm === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': headers['Cache-Control'] });
    res.end();
    return true;
  }

  const range = req.headers.range;
  if (range && /^bytes=/.test(range)) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] === '' ? null : Number(m[1]);
      let end = m[2] === '' ? null : Number(m[2]);
      if (start === null && end !== null) {
        start = Math.max(0, stat.size - end);
        end = stat.size - 1;
      } else if (start !== null && end === null) {
        end = stat.size - 1;
      }
      if (start === null || !Number.isFinite(start)) start = 0;
      if (!Number.isFinite(end)) end = stat.size - 1;
      if (start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return true;
      }
      end = Math.min(end, stat.size - 1);
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      headers['Content-Length'] = end - start + 1;
      res.writeHead(206, headers);
      if (req.method === 'HEAD') {
        res.end();
        return true;
      }
      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', () => res.end());
      stream.pipe(res);
      return true;
    }
  }

  const accepts = req.headers['accept-encoding'] || '';
  let body = null;
  let encoding = null;
  if (!o.download && isCompressible(filePath) && stat.size >= COMPRESS_MIN && /\bgzip\b/.test(accepts)) {
    const packed = await getCompressed(filePath, stat);
    body = packed.gzip;
    encoding = 'gzip';
  }

  if (encoding) {
    headers['Content-Encoding'] = encoding;
    headers['Content-Length'] = body.length;
    headers.Vary = 'Accept-Encoding';
  } else {
    headers['Content-Length'] = stat.size;
  }

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  if (body) {
    res.end(body);
    return true;
  }
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => res.end());
  stream.pipe(res);
  return true;
}

function safeJoin(baseDir, relative) {
  const decoded = decodeURIComponent(relative);
  const full = path.resolve(baseDir, '.' + path.sep + decoded.replace(/^[/\\]+/, ''));
  const base = path.resolve(baseDir);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

module.exports = {
  MIME,
  mimeOf,
  parseCookies,
  serializeCookie,
  setCookie,
  clearCookie,
  sendJson,
  ok,
  fail,
  sendHtml,
  redirect,
  clientIp,
  readBody,
  readJsonBody,
  readUrlEncoded,
  parseQuery,
  serveFile,
  safeJoin
};
