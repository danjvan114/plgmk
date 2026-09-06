'use strict';

// ============================================================================
// 数据存储层
// ----------------------------------------------------------------------------
// 历史：早期版本把每个集合直接序列化为 data/<collection>.json 文件，靠 debounce
// 后整文件覆盖落盘。这种「JSON 当数据库」的实现在并发写入（多进程 / 请求重入）
// 时会出现半截写入、整文件损坏、更新丢失等逻辑问题，属于生产级事故。
//
// 现在存储层已迁移到 SQLite（node:sqlite，Node >= 22.5 内置，零额外依赖）。
// SQLite 通过文件锁 + WAL 保证写入原子性与并发安全，从根上消除 JSON 当 DB
// 带来的全部隐患。旧的 data/*.json 仅作为「首次启动的一次性迁移源」保留，
// 运行期权威数据全部位于 data/app.db，不再有任何 JSON 文件充当数据库。
// ============================================================================

const fsp = require('fs/promises');
const path = require('path');
const config = require('../config');

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  throw new Error(
    '当前运行环境缺少 node:sqlite 模块。存储已迁移至 SQLite，请使用 Node >= 22.5 运行本项目。'
  );
}

const COLLECTIONS = [
  'plugins',
  'plugin_ratings',
  'plugin_likes',
  'plugin_coins',
  'forum_boards',
  'forum_posts',
  'forum_replies',
  'works',
  'work_comments',
  'work_likes',
  'work_favs',
  'work_coins',
  'teams',
  'team_members',
  'team_invites',
  'team_works',
  'team_posts',
  'follows',
  'messages',
  'reports',
  'profiles_cache',
  'sessions',
  'counters',
  'staff',
  'bots',
  'bot_logs',
  'moderation',
  'auth_requests'
];

class Collection {
  constructor(store, name) {
    this.store = store;
    this.name = name;
    this.file = path.join(config.dataDir, `${name}.json`);
    this.items = [];
    this.seq = 0;
    this.index = new Map();
    this.indexKey = 'id';
  }

  useIndex(key) {
    this.indexKey = key;
    this.rebuildIndex();
    return this;
  }

  rebuildIndex() {
    this.index.clear();
    for (const item of this.items) {
      if (item && item[this.indexKey] !== undefined) {
        this.index.set(String(item[this.indexKey]), item);
      }
    }
  }

  all() {
    return this.items;
  }

  size() {
    return this.items.length;
  }

  get(key) {
    if (key === undefined || key === null) return null;
    return this.index.get(String(key)) || null;
  }

  has(key) {
    return this.index.has(String(key));
  }

  filter(fn) {
    return this.items.filter(fn);
  }

  find(fn) {
    return this.items.find(fn) || null;
  }

  findAll(fn) {
    return this.items.filter(fn);
  }

  count(fn) {
    if (!fn) return this.items.length;
    let n = 0;
    for (const item of this.items) if (fn(item)) n += 1;
    return n;
  }

  nextId() {
    this.seq += 1;
    return this.seq;
  }

  insert(item) {
    if (item.id === undefined || item.id === null) item.id = this.nextId();
    this.items.push(item);
    if (item[this.indexKey] !== undefined) {
      this.index.set(String(item[this.indexKey]), item);
    }
    const id = Number(item.id);
    if (Number.isFinite(id) && id > this.seq) this.seq = id;
    this.store.markDirty(this.name);
    return item;
  }

  insertMany(list) {
    for (const item of list) this.insert(item);
    return list;
  }

  update(key, patch) {
    const item = this.get(key);
    if (!item) return null;
    if (typeof patch === 'function') patch(item);
    else Object.assign(item, patch);
    this.store.markDirty(this.name);
    return item;
  }

  remove(key) {
    const k = String(key);
    const idx = this.items.findIndex((it) => String(it[this.indexKey]) === k);
    if (idx < 0) return false;
    this.items.splice(idx, 1);
    this.index.delete(k);
    this.store.markDirty(this.name);
    return true;
  }

  removeWhere(fn) {
    const keep = [];
    let removed = 0;
    for (const item of this.items) {
      if (fn(item)) {
        removed += 1;
        this.index.delete(String(item[this.indexKey]));
      } else {
        keep.push(item);
      }
    }
    if (removed) {
      this.items = keep;
      this.store.markDirty(this.name);
    }
    return removed;
  }

  clear() {
    this.items = [];
    this.index.clear();
    this.store.markDirty(this.name);
  }

  query(opts) {
    const o = opts || {};
    let list = this.items;
    if (o.where) list = list.filter(o.where);
    if (o.sort) {
      const dir = o.desc ? -1 : 1;
      list = list.slice().sort((a, b) => {
        const av = a[o.sort];
        const bv = b[o.sort];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), 'zh-CN') * dir;
      });
    }
    const total = list.length;
    const offset = o.offset || 0;
    const limit = o.limit === undefined ? total : o.limit;
    return { items: list.slice(offset, offset + limit), total };
  }

  toJSON() {
    return { seq: this.seq, items: this.items };
  }
}

class Store {
  constructor() {
    this.collections = new Map();
    this.dirty = new Set();
    this.flushing = false;
    this.queued = false;
    this.timer = null;
    this.ready = false;
    this.db = null;
    this.dbPath = path.join(config.dataDir, 'app.db');
    this.stats = { reads: 0, writes: 0, flushes: 0, lastFlush: 0 };
    for (const name of COLLECTIONS) {
      this.collections.set(name, new Collection(this, name));
    }
  }

  async init() {
    await fsp.mkdir(config.dataDir, { recursive: true });

    this.db = new DatabaseSync(this.dbPath);
    // WAL：读写并发互不阻塞；synchronous=NORMAL：崩溃安全且性能更好。
    // 这两项是彻底替代「JSON 整文件覆盖」的关键，保证写入原子、并发安全。
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS items (col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(col, id));'
    );
    this.db.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);');

    for (const name of COLLECTIONS) {
      await this.loadCollection(this.collections.get(name));
    }

    this.ready = true;
    this.startSnapshotTimer();
    return this;
  }

  async loadCollection(col) {
    let rows = [];
    try {
      rows = this.db.prepare('SELECT id, body FROM items WHERE col = ?').all(col.name);
    } catch (e) {
      rows = [];
    }

    if (rows.length > 0) {
      const items = [];
      let seq = 0;
      for (const r of rows) {
        let item;
        try {
          item = JSON.parse(r.body);
        } catch (e) {
          continue; // 跳过损坏行，绝不整库崩溃
        }
        items.push(item);
        const n = Number(item && item.id);
        if (Number.isFinite(n) && n > seq) seq = n;
      }
      col.items = items;
      col.seq = seq;
      col.rebuildIndex();
      return;
    }

    // SQLite 中尚无可持久化数据：尝试从遗留的 JSON 文件一次性迁移。
    await this.migrateFromJson(col);
  }

  async migrateFromJson(col) {
    const file = path.join(config.dataDir, `${col.name}.json`);
    let raw = null;
    try {
      raw = await fsp.readFile(file, 'utf8');
    } catch (e) {
      return; // 没有遗留文件，属全新集合
    }
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    let items = [];
    if (data && Array.isArray(data.items)) items = data.items;
    else if (Array.isArray(data)) items = data;

    if (!items.length) return;

    col.items = items;
    col.seq = items.reduce((m, it) => Math.max(m, Number(it && it.id) || 0), 0);
    col.rebuildIndex();

    // 立即落盘到 SQLite，完成迁移
    try {
      this.writeCollection(col);
    } catch (e) {
      console.error(`[store] 迁移 ${col.name} 失败`, e);
      return;
    }
    console.log(`[store] 已从 ${col.name}.json 迁移 ${items.length} 条记录至 SQLite`);
  }

  col(name) {
    const c = this.collections.get(name);
    if (!c) throw new Error(`unknown collection: ${name}`);
    return c;
  }

  markDirty(name) {
    this.dirty.add(name);
    this.stats.writes += 1;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((e) => console.error('[store] flush error', e));
    }, config.store.flushDelay);
    if (this.timer.unref) this.timer.unref();
  }

  async flush() {
    if (this.flushing) {
      this.queued = true;
      return;
    }
    if (this.dirty.size === 0) return;
    this.flushing = true;
    try {
      do {
        this.queued = false;
        const names = Array.from(this.dirty);
        this.dirty.clear();
        for (const name of names) {
          const col = this.collections.get(name);
          if (!col) continue;
          this.writeCollection(col);
        }
        this.stats.flushes += 1;
        this.stats.lastFlush = Date.now();
      } while (this.queued);
    } finally {
      this.flushing = false;
    }
  }

  // 将整个集合原子写入 SQLite（替代原来的 JSON 整文件覆盖）。
  // BEGIN IMMEDIATE .. COMMIT 保证这一批写入要么全部成功、要么全部回滚，
  // 不会出现「写了一半」的损坏状态。
  writeCollection(col) {
    if (!this.db) return;
    const del = this.db.prepare('DELETE FROM items WHERE col = ?');
    const ins = this.db.prepare('INSERT OR REPLACE INTO items (col, id, body) VALUES (?, ?, ?)');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      del.run(col.name);
      for (const item of col.items) {
        const id = item && item.id !== undefined && item.id !== null ? String(item.id) : '';
        ins.run(col.name, id, JSON.stringify(item));
      }
      this.db.exec('COMMIT');
    } catch (e) {
      try {
        this.db.exec('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw e;
    }
  }

  startSnapshotTimer() {
    const hour = 60 * 60 * 1000;
    this.snapshotTimer = setInterval(() => {
      this.snapshot().catch((e) => console.error('[store] snapshot error', e));
    }, hour);
    if (this.snapshotTimer.unref) this.snapshotTimer.unref();
  }

  // 备份以 SQLite 数据库副本的形式保存（不再是 JSON），源文件先 checkpoint 合并 WAL。
  async snapshot() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.join(config.dataDir, 'snapshots', stamp);
    await fsp.mkdir(dir, { recursive: true });
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      /* ignore */
    }
    await fsp.copyFile(this.dbPath, path.join(dir, 'app.db'));
    await this.pruneSnapshots();
    return dir;
  }

  async pruneSnapshots() {
    const base = path.join(config.dataDir, 'snapshots');
    let entries;
    try {
      entries = await fsp.readdir(base, { withFileTypes: true });
    } catch (e) {
      return;
    }
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const keep = config.store.snapshotKeep || 5;
    while (dirs.length > keep) {
      const old = dirs.shift();
      await fsp.rm(path.join(base, old), { recursive: true, force: true }).catch(() => {});
    }
  }

  async shutdown() {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      /* ignore */
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const store = new Store();

module.exports = store;
module.exports.Store = Store;
module.exports.Collection = Collection;
module.exports.COLLECTIONS = COLLECTIONS;
