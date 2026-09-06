'use strict';

const crypto = require('crypto');
const config = require('../config');
const { request } = require('./request');
const { now, sha256 } = require('./util');

const uc = config.userCenter;

const checkCache = new Map();
const profileCache = new Map();
const usedCredentials = new Map();

function b64encode(str) {
  return Buffer.from(String(str), 'utf8').toString('base64');
}

function b64decode(str) {
  return Buffer.from(String(str), 'base64').toString('utf8');
}

function aesKeyBuffer() {
  return Buffer.from(uc.aes.key, 'hex');
}

function aesIvBuffer() {
  return Buffer.from(uc.aes.iv, 'hex');
}

function buildAuthorizeUrl(callbackUrl) {
  const backurl = b64encode(callbackUrl);
  const info = b64encode(JSON.stringify(uc.infoFields));
  return `${uc.base}/app/at?backurl=${encodeURIComponent(backurl)}&info=${encodeURIComponent(info)}`;
}

function markCredentialUsed(cipher) {
  const key = sha256(cipher);
  if (usedCredentials.has(key)) return false;
  usedCredentials.set(key, now() + uc.credentialTtl);
  return true;
}

function sweepCredentials() {
  const ts = now();
  for (const [k, exp] of usedCredentials) {
    if (exp < ts) usedCredentials.delete(k);
  }
}

function decryptCredential(cipher) {
  if (!cipher || typeof cipher !== 'string') {
    return { ok: false, code: 'EMPTY', msg: '缺少登录凭据' };
  }
  if (cipher.length > 8192) {
    return { ok: false, code: 'TOO_LONG', msg: '登录凭据长度异常' };
  }

  let layer2Base64;
  try {
    const decipher = crypto.createDecipheriv(uc.aes.algorithm, aesKeyBuffer(), aesIvBuffer());
    layer2Base64 = decipher.update(cipher, 'base64', 'utf8') + decipher.final('utf8');
  } catch (e) {
    return { ok: false, code: 'DECRYPT_FAILED', msg: '登录凭据解密失败，请确认应用密钥配置一致' };
  }

  let envelope;
  try {
    envelope = JSON.parse(b64decode(layer2Base64));
  } catch (e) {
    return { ok: false, code: 'ENVELOPE_INVALID', msg: '登录凭据格式错误' };
  }

  const expire = Number(envelope.time) || 0;
  if (!expire) {
    return { ok: false, code: 'NO_TIMESTAMP', msg: '登录凭据缺少时间戳' };
  }
  if (expire < now()) {
    return { ok: false, code: 'EXPIRED', msg: '登录凭据已过期，请重新登录' };
  }

  let info;
  try {
    info = JSON.parse(b64decode(envelope.login));
  } catch (e) {
    return { ok: false, code: 'PAYLOAD_INVALID', msg: '登录信息解析失败' };
  }

  if (!info || !info.uuid) {
    return { ok: false, code: 'NO_UUID', msg: '登录信息缺少用户标识' };
  }

  if (!markCredentialUsed(cipher)) {
    return { ok: false, code: 'REPLAYED', msg: '该登录凭据已被使用，请重新登录' };
  }

  return {
    ok: true,
    info: {
      uuid: String(info.uuid),
      username: String(info.username || info.login_name || ''),
      nickname: String(info.nickname || info.username || info.login_name || ''),
      avatar: String(info.avatar || ''),
      token: String(info.token || ''),
      expire
    }
  };
}

async function checkToken(token) {
  if (!token) return { valid: false, reason: 'NO_TOKEN' };
  const cached = checkCache.get(token);
  if (cached && cached.until > now()) return cached.value;

  let value;
  try {
    const res = await request(`${uc.base}/api/open/token/check`, {
      method: 'GET',
      timeout: uc.requestTimeout,
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = res.json || {};
    const d = data.data || {};
    value = {
      valid: d.valid === true,
      expireAt: Number(d.expire_at) || 0,
      tokenType: d.token_type || 'unknown',
      nickname: d.nickname || '',
      username: d.login_name || '',
      raw: d
    };
  } catch (e) {
    value = { valid: false, reason: e.code || e.message || 'NETWORK_ERROR', error: true };
  }

  const ttl = value.error ? 10 * 1000 : uc.checkCacheTtl;
  checkCache.set(token, { value, until: now() + ttl });
  if (checkCache.size > 5000) {
    const ts = now();
    for (const [k, v] of checkCache) if (v.until < ts) checkCache.delete(k);
  }
  return value;
}

async function fetchProfile(token) {
  if (!token) return null;
  const cached = profileCache.get(token);
  if (cached && cached.until > now()) return cached.value;

  let value = null;
  try {
    const data = await request(`${uc.base}/api/open/userinfo`, {
      method: 'GET',
      timeout: uc.requestTimeout,
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json);
    const d = (data && data.data) || null;
    if (d && d.uuid) {
      value = {
        uuid: String(d.uuid),
        username: String(d.login_name || ''),
        nickname: String(d.nickname || d.login_name || ''),
        avatar: String(d.avatar || ''),
        email: String(d.email || ''),
        bio: String(d.bio || ''),
        expireAt: Number(d.token_expire) || 0
      };
      profileCache.set(token, { value, until: now() + uc.profileCacheTtl });
      if (profileCache.size > 5000) profileCache.clear();
    }
  } catch (e) {
    return cached ? cached.value : null;
  }
  return value;
}

async function revokeToken(token) {
  if (!token) return false;
  try {
    await request(`${uc.base}/api/open/logout`, {
      method: 'POST',
      timeout: uc.requestTimeout,
      headers: { Authorization: `Bearer ${token}` },
      body: {}
    });
    checkCache.delete(token);
    profileCache.delete(token);
    return true;
  } catch (e) {
    return false;
  }
}

function invalidateCache(token) {
  if (!token) return;
  checkCache.delete(token);
  profileCache.delete(token);
}

function startSweeper() {
  const timer = setInterval(sweepCredentials, 60 * 1000);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = {
  buildAuthorizeUrl,
  decryptCredential,
  checkToken,
  fetchProfile,
  revokeToken,
  invalidateCache,
  startSweeper,
  b64encode,
  b64decode
};
