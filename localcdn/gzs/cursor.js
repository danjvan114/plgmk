/* ===== KE 自定义鼠标指针模块 ===== */
(function () {
  'use strict';

  const csFolders = { light: '%E6%B5%85%E8%89%B2', dark: '%E6%B7%B1%E8%89%B2' };

  function csParseInf(text) {
    const map = {};
    let inStrings = false;
    String(text).split(/\r?\n/).forEach(function (line) {
      const t = line.trim();
      if (/^\[strings\]\s*$/i.test(t)) { inStrings = true; return; }
      if (/^\[/.test(t)) { inStrings = false; return; }
      if (!inStrings) return;
      const m = t.match(/^([A-Za-z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
      if (m) map[m[1].toLowerCase()] = m[2].trim().replace(/\\/g, '/');
    });
    return map;
  }

  function csPick(map, keys) {
    for (let i = 0; i < keys.length; i++) { if (map[keys[i]]) return map[keys[i]]; }
    return '';
  }

  function csHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(36);
  }

  function csParseAni(arrayBuffer) {
    const u8 = new Uint8Array(arrayBuffer);
    const dv = new DataView(arrayBuffer);
    if (u8.length < 16) return [];
    const chunks = [];
    for (let i = 12; i + 8 <= u8.length; ) {
      const cid = String.fromCharCode(u8[i], u8[i + 1], u8[i + 2], u8[i + 3]);
      const size = dv.getUint32(i + 4, true);
      chunks.push({ cid: cid, off: i + 8, size: size });
      i += 8 + size + (size & 1);
    }
    const findChunk = function (name) {
      for (let i = 0; i < chunks.length; i++) { if (chunks[i].cid === name) return chunks[i]; }
      return null;
    };
    let nFrames = 0, dispRate = 0;
    const anih = findChunk('anih');
    if (anih && anih.size >= 36) {
      nFrames = dv.getUint32(anih.off + 4, true);
      dispRate = dv.getUint32(anih.off + 28, true);
    }
    const rateCh = findChunk('rate'), seqCh = findChunk('seq ');
    const rates = [];
    if (rateCh) { for (let k = 0; k < Math.floor(rateCh.size / 4); k++) { rates.push(dv.getUint32(rateCh.off + k * 4, true)); } }
    const seq = [];
    if (seqCh) { for (let k = 0; k < Math.floor(seqCh.size / 4); k++) { seq.push(u8[seqCh.off + k * 4]); } }
    const icons = [];
    const listCh = findChunk('LIST');
    if (listCh) {
      let p = listCh.off + 4;
      const end = listCh.off + listCh.size;
      while (p + 8 <= end) {
        const scid = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]);
        const ssize = dv.getUint32(p + 4, true);
        if (scid === 'icon') icons.push(new Uint8Array(arrayBuffer, p + 8, ssize));
        p += 8 + ssize + (ssize & 1);
      }
    }
    const order = seq.length ? seq : icons.map(function (_, idx) { return idx; });
    const frameMs = dispRate > 0 ? Math.round((dispRate / 60) * 1000) : 60;
    const frames = [];
    for (let k = 0; k < order.length; k++) {
      const idx = order[k];
      if (!icons[idx]) continue;
      const ms = rates.length ? Math.max(Math.round((rates[k] / 60) * 1000), 1) : Math.max(frameMs, 1);
      frames.push({ data: icons[idx], rate: ms });
    }
    return frames;
  }

  function csCurUrl(curBytes) {
    let hx = 0, hy = 0;
    if (curBytes.length >= 22) {
      const dv = new DataView(curBytes.buffer, curBytes.byteOffset, curBytes.byteLength);
      hx = dv.getUint16(10, true);
      hy = dv.getUint16(12, true);
    }
    return { url: URL.createObjectURL(new Blob([curBytes], { type: 'image/x-icon' })), hx: hx, hy: hy };
  }

  const csAnimManager = {
    timers: {},
    currentFrame: {},
    start: function(role, frames) {
      if (!frames || frames.length <= 1) return;
      const self = this;
      let idx = 0;
      if (this.timers[role]) { clearInterval(this.timers[role]); }
      frames.forEach(function(f) {
        if (!f.url) {
          const c = csCurUrl(f.data);
          f.url = c.url;
          f.hx = c.hx;
          f.hy = c.hy;
        }
      });
      this.currentFrame[role] = 0;
      this.updateCSS(role, frames[0]);
      this.timers[role] = setInterval(function() {
        idx = (idx + 1) % frames.length;
        self.currentFrame[role] = idx;
        self.updateCSS(role, frames[idx]);
      }, frames[0].rate);
    },
    updateCSS: function(role, frame) {
      const root = document.documentElement;
      const varName = '--cs-' + role;
      const value = "url('" + frame.url + "') " + frame.hx + ' ' + frame.hy;
      root.style.setProperty(varName, value);
    },
    stop: function(role) {
      if (this.timers[role]) { clearInterval(this.timers[role]); delete this.timers[role]; }
    }
  };

  function csResolve(map, folder, ver, keys) {
    const file = csPick(map, keys);
    if (!file) return Promise.resolve(null);
    const base = '/localcdn/gzs/cs/' + folder + '/';
    if (/\.ani$/i.test(file)) {
      return fetch(base + file + '?v=' + ver, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (buf) {
          if (!buf) return null;
          const frames = csParseAni(buf);
          if (!frames.length) return null;
          return { type: 'ani', frames: frames };
        })
        .catch(function () { return null; });
    }
    return fetch(base + file + '?v=' + ver, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (blob) {
        if (!blob) return null;
        return { type: 'static', url: "url('" + base + file + '?v=' + ver + "')" };
      })
      .catch(function () { return null; });
  }

  function csThemeVars(map, folder, ver, cb) {
    const roles = [['cursor', ['pointer']], ['link', ['link']], ['text', ['text']], ['move', ['move']], ['unavail', ['unavailiable', 'unavailable']]];
    const out = {};
    const jobs = roles.map(function (r) {
      return csResolve(map, folder, ver, r[1]).then(function (v) { out[r[0]] = v; });
    });
    Promise.all(jobs).then(function () { cb(out); });
  }

  function initCursor() {
    Promise.all([
      fetch('/localcdn/gzs/cs/' + csFolders.light + '/int.inf', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
      fetch('/localcdn/gzs/cs/' + csFolders.dark + '/int.inf', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
    ]).then(function (res) {
      const lightTxt = res[0], darkTxt = res[1];
      csThemeVars(csParseInf(lightTxt), csFolders.light, csHash(lightTxt), function (L) {
        csThemeVars(csParseInf(darkTxt), csFolders.dark, csHash(darkTxt), function (D) {
          const lightVars = {};
          const darkVars = {};
          const lightAniFrames = {};
          const darkAniFrames = {};
          ['cursor', 'link', 'text', 'move', 'unavail'].forEach(function(role) {
            if (L[role] && L[role].type === 'ani') {
              const firstFrame = csCurUrl(L[role].frames[0].data);
              lightVars[role] = "url('" + firstFrame.url + "') " + firstFrame.hx + ' ' + firstFrame.hy;
              lightAniFrames[role] = L[role].frames;
            } else if (L[role] && L[role].type === 'static') {
              lightVars[role] = L[role].url;
            } else {
              lightVars[role] = (role === 'cursor' ? 'auto' : role === 'link' ? 'pointer' : role === 'text' ? 'text' : role === 'move' ? 'move' : 'not-allowed');
            }
            if (D[role] && D[role].type === 'ani') {
              const firstFrame = csCurUrl(D[role].frames[0].data);
              darkVars[role] = "url('" + firstFrame.url + "') " + firstFrame.hx + ' ' + firstFrame.hy;
              darkAniFrames[role] = D[role].frames;
            } else if (D[role] && D[role].type === 'static') {
              darkVars[role] = D[role].url;
            } else {
              darkVars[role] = (role === 'cursor' ? 'auto' : role === 'link' ? 'pointer' : role === 'text' ? 'text' : role === 'move' ? 'move' : 'not-allowed');
            }
          });
          let css = 'html,body{'
            + '--cs-cursor:' + lightVars.cursor + ';'
            + '--cs-link:' + lightVars.link + ';'
            + '--cs-text:' + lightVars.text + ';'
            + '--cs-move:' + lightVars.move + ';'
            + '--cs-unavail:' + lightVars.unavail + ';}';
          css += 'body.dark-mode,body.theme-dark{'
            + '--cs-cursor:' + darkVars.cursor + ';'
            + '--cs-link:' + darkVars.link + ';'
            + '--cs-text:' + darkVars.text + ';'
            + '--cs-move:' + darkVars.move + ';'
            + '--cs-unavail:' + darkVars.unavail + ';}';
          css += 'html,body,body *{cursor:var(--cs-cursor),auto !important;}';
          css += 'a,button,[onclick],[role="button"],[role="menuitem"],[role="link"],input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"],summary,label,.btn,.badge-btn,.glass-btn,.icon-btn,.lang-item,.qr-tab,.tp-item,.ft-tab,.carousel-nav,.carousel-dots button,.cr-tab,.dl-m-btn,.dl-col,.ext-install,.fl-link,.st-col,.stack-card,.feat-panel,.dot,.m-back-btn,.m-dl-btn,.m-dl-tool,.qr-modal-close,.nav-links a,.nav-more-btn,.mk-pop-btn,.mk-menu-item,.mk-sort-btn,.mk-filter-btn,.mk-card,.mk-dl,.mk-view,.mk-login,.mk-pg-btn,.mk-cat-btn,.mk-tab,.user-avatar,.mdui-tab-item,.gallery-image,.st-nav-btn,.look-perf,#backTop{cursor:var(--cs-link),pointer !important;}';
          css += 'input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="email"],input[type="password"],input[type="number"],textarea,select,[contenteditable="true"]{cursor:var(--cs-text),text !important;}';
          css += '[draggable="true"],[data-cursor="move"]{cursor:var(--cs-move),move !important;}';
          css += '[disabled],:disabled,[aria-disabled="true"]{cursor:var(--cs-unavail),not-allowed !important;}';
          const st = document.createElement('style');
          st.textContent = css;
          document.head.appendChild(st);
          ['cursor', 'link', 'text', 'move', 'unavail'].forEach(function(role) {
            if (lightAniFrames[role] && lightAniFrames[role].length > 1) {
              csAnimManager.start(role, lightAniFrames[role]);
            }
          });
        });
      });
    });
  }

  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
  } else {
    initCursor();
  }

  // 暴露全局接口
  window.KECursor = { init: initCursor, animManager: csAnimManager };
})();