'use strict';

const crypto = require('crypto');

function now() {
  return Date.now();
}

function uid(bytes) {
  return crypto.randomBytes(bytes || 16).toString('hex');
}

function shortId(len) {
  return crypto.randomBytes(Math.ceil((len || 12) / 2)).toString('hex').slice(0, len || 12);
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function clamp(n, min, max) {
  n = Number(n);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toInt(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function toNum(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function escapeHtml(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function stripTags(s) {
  return String(s === null || s === undefined ? '' : s).replace(/<[^>]*>/g, '');
}

function plainText(s, maxLen) {
  let t = stripTags(String(s === null || s === undefined ? '' : s));
  t = t.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (maxLen && t.length > maxLen) t = t.slice(0, maxLen) + '…';
  return t;
}

function cleanText(s, maxLen) {
  let t = String(s === null || s === undefined ? '' : s);
  t = t.replace(/\r\n?/g, '\n').trim();
  if (maxLen && t.length > maxLen) t = t.slice(0, maxLen);
  return t;
}

function safeExt(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(String(filename || ''));
  return m ? m[1].toLowerCase() : '';
}

function slugFilename(filename) {
  const ext = safeExt(filename);
  const base = String(filename || 'file')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'file';
  return ext ? `${base}.${ext}` : base;
}

function parseTags(input, max) {
  const raw = String(input || '');
  const parts = raw
    .split(/[,，;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p.slice(0, 24));
    if (out.length >= (max || 8)) break;
  }
  return out;
}

function isHttpUrl(s) {
  try {
    const u = new URL(String(s));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function formatTime(ts, withTime) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime === false ? date : `${date} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function timeAgo(ts) {
  const t = Number(ts) || 0;
  if (!t) return '';
  const diff = Date.now() - t;
  if (diff < 0) return formatTime(t);
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatTime(t, false);
}

function formatBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec) {
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return rs ? `${m} 分 ${rs} 秒` : `${m} 分`;
  const h = Math.floor(m / 60);
  return `${h} 小时 ${m % 60} 分`;
}

function paginate(list, page, size) {
  const total = list.length;
  const pageSize = clamp(size, 1, 1000);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = clamp(page, 1, pageCount);
  const start = (current - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total,
    page: current,
    pageSize,
    pageCount,
    hasPrev: current > 1,
    hasNext: current < pageCount
  };
}

function sortBy(list, key, desc) {
  const dir = desc ? -1 : 1;
  return list.slice().sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'zh-CN') * dir;
  });
}

function searchMatch(haystack, keyword) {
  if (!keyword) return true;
  return String(haystack || '').toLowerCase().includes(String(keyword).toLowerCase());
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function omit(obj, keys) {
  const out = Object.assign({}, obj);
  for (const k of keys) delete out[k];
  return out;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function groupCount(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function debounce(fn, ms) {
  let t = null;
  return function debounced(...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn.apply(this, args);
    }, ms);
  };
}

module.exports = {
  now,
  uid,
  shortId,
  sha256,
  clamp,
  toInt,
  toNum,
  escapeHtml,
  stripTags,
  plainText,
  cleanText,
  safeExt,
  slugFilename,
  parseTags,
  isHttpUrl,
  formatTime,
  timeAgo,
  formatBytes,
  formatSpeed,
  formatDuration,
  paginate,
  sortBy,
  searchMatch,
  pick,
  omit,
  uniq,
  groupCount,
  sleep,
  debounce
};
