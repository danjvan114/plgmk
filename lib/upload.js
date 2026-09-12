'use strict';

const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { safeExt, slugFilename } = require('./util');

class UploadLimitError extends Error {
  constructor(limit) {
    super('FILE_TOO_LARGE');
    this.code = 'FILE_TOO_LARGE';
    this.limit = limit;
  }
}

function ensureDir(dir) {
  return fsp.mkdir(dir, { recursive: true });
}

function buildName(original, prefix, forceExt) {
  const ext = forceExt || safeExt(original) || 'bin';
  const rand = crypto.randomBytes(10).toString('hex');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const base = slugFilename(original).replace(/\.[^.]+$/, '');
  return `${prefix || 'f'}_${stamp}_${rand}_${base}.${ext}`.slice(0, 120);
}

async function saveStream(req, destDir, originalName, opts) {
  const o = opts || {};
  const limit = o.maxBytes || config.limits.uploadMaxBytes;
  const allowed = o.allowedExt;
  const ext = safeExt(originalName);
  if (allowed && allowed.length && !allowed.includes(ext)) {
    const err = new Error('EXT_NOT_ALLOWED');
    err.code = 'EXT_NOT_ALLOWED';
    err.ext = ext;
    throw err;
  }

  await ensureDir(destDir);
  const filename = buildName(originalName, o.prefix, o.forceExt);
  const finalPath = path.join(destDir, filename);
  const tmpPath = `${finalPath}.part`;

  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > limit) {
    req.destroy();
    throw new UploadLimitError(limit);
  }

  const hash = crypto.createHash('sha256');
  let received = 0;
  let handle = null;
  let aborted = false;

  try {
    handle = await fsp.open(tmpPath, 'w');
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };

      req.on('data', (chunk) => {
        if (settled) return;
        received += chunk.length;
        hash.update(chunk);
        if (received > limit) {
          aborted = true;
          req.destroy();
          finish(new UploadLimitError(limit));
          return;
        }
        handle.write(chunk).catch((err2) => finish(err2));
      });

      req.on('end', () => {
        if (settled) return;
        if (aborted) return;
        finish(null);
      });

      req.on('aborted', () => finish(null));

      req.on('error', (err) => finish(err));
    });

    if (handle) await handle.close();
    handle = null;

    if (aborted) {
      await fsp.rm(tmpPath, { force: true }).catch(() => {});
      throw new UploadLimitError(limit);
    }

    await fsp.rename(tmpPath, finalPath);
    return {
      filename,
      path: finalPath,
      size: received,
      ext,
      sha256: hash.digest('hex')
    };
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    await fsp.rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

async function removeFile(relPath) {
  if (!relPath) return;
  const full = path.resolve(config.uploadDir, relPath);
  const base = path.resolve(config.uploadDir);
  if (full !== base && !full.startsWith(base + path.sep)) return;
  await fsp.rm(full, { force: true }).catch(() => {});
}

module.exports = { saveStream, removeFile, ensureDir, buildName, UploadLimitError };
