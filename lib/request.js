'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

function request(target, opts) {
  const o = opts || {};
  const parsed = typeof target === 'string' ? new URL(target) : target;
  const lib = parsed.protocol === 'https:' ? https : http;
  const method = (o.method || 'GET').toUpperCase();
  const timeout = o.timeout || 8000;
  const headers = Object.assign(
    {
      'Accept-Encoding': 'identity',
      'User-Agent': 'plgmk/3.0'
    },
    o.headers || {}
  );

  let payload = null;
  if (o.body !== undefined && o.body !== null) {
    if (typeof o.body === 'string' || Buffer.isBuffer(o.body)) {
      payload = Buffer.isBuffer(o.body) ? o.body : Buffer.from(o.body, 'utf8');
    } else {
      payload = Buffer.from(JSON.stringify(o.body), 'utf8');
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    headers['Content-Length'] = payload.length;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
        timeout,
        rejectUnauthorized: o.rejectUnauthorized !== false
      },
      (res) => {
        const chunks = [];
        let size = 0;
        const max = o.maxBytes || 2 * 1024 * 1024;
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > max) {
            res.destroy();
            if (!settled) {
              settled = true;
              reject(Object.assign(new Error('RESPONSE_TOO_LARGE'), { status: 502 }));
            }
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (settled) return;
          settled = true;
          const buf = Buffer.concat(chunks);
          const result = {
            status: res.statusCode || 0,
            headers: res.headers,
            body: buf.toString('utf8'),
            buffer: buf
          };
          try {
            result.json = JSON.parse(result.body);
          } catch (e) {
            result.json = null;
          }
          resolve(result);
        });
        res.on('error', (err) => {
          if (settled) return;
          settled = true;
          reject(err);
        });
      }
    );

    req.setTimeout(timeout, () => {
      if (settled) return;
      settled = true;
      req.destroy(Object.assign(new Error('REQUEST_TIMEOUT'), { status: 504 }));
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function getJson(url, opts) {
  const res = await request(url, Object.assign({ method: 'GET' }, opts || {}));
  if (res.status >= 400) {
    const err = new Error(`HTTP_${res.status}`);
    err.status = 502;
    err.remote = res.status;
    throw err;
  }
  if (!res.json) {
    const err = new Error('INVALID_JSON_RESPONSE');
    err.status = 502;
    throw err;
  }
  return res.json;
}

module.exports = { request, getJson };
