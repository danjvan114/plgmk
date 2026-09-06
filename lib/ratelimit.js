'use strict';

const config = require('../config');
const http = require('./http');
const { now } = require('./util');

const buckets = new Map();

function sweep() {
  const ts = now();
  for (const [key, b] of buckets) {
    if (b.resetAt < ts) buckets.delete(key);
  }
}

function startSweeper() {
  const timer = setInterval(sweep, 60 * 1000);
  if (timer.unref) timer.unref();
  return timer;
}

function hit(key, rule) {
  const r = rule || config.rateLimit.api;
  const ts = now();
  let b = buckets.get(key);
  if (!b || b.resetAt < ts) {
    b = { count: 0, resetAt: ts + r.windowMs, blockedUntil: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.blockedUntil > ts) {
    return { ok: false, retryAfter: Math.ceil((b.blockedUntil - ts) / 1000) };
  }
  if (b.count > r.max) {
    b.blockedUntil = ts + (r.blockMs || r.windowMs);
    return { ok: false, retryAfter: Math.ceil((b.blockedUntil - ts) / 1000) };
  }
  return { ok: true, remaining: Math.max(0, r.max - b.count) };
}

function middleware(ruleName) {
  const rule = config.rateLimit[ruleName] || config.rateLimit.api;
  return (req, res) => {
    const ip = http.clientIp(req) || 'unknown';
    const key = `${ruleName}:${ip}`;
    const result = hit(key, rule);
    if (!result.ok) {
      res.setHeader('Retry-After', String(result.retryAfter));
      http.fail(res, 429, `操作过于频繁，请 ${result.retryAfter} 秒后再试`, 429);
      return false;
    }
    return true;
  };
}

function stats() {
  return { keys: buckets.size };
}

module.exports = { hit, middleware, startSweeper, stats };
