(function () {
  'use strict';

  /* 性能优化：移除全站毛玻璃模糊。
     根因：站点大量使用 backdrop-filter: blur()（吸顶导航 veil blur(28px)、顶部栏、玻璃卡片、
     toast/弹层等），滚动时浏览器需逐帧对背景重采样，是卡顿主因。
     做法：加载时注入一条全局样式，对当前及后续动态注入的元素（nav veil / 弹层 / toast）一律关闭
     backdrop-filter 与 filter 模糊。脚本在 <body> 解析到此处即同步执行，先于首屏绘制，无闪烁。 */
  (function killBlur() {
    try {
      const s = document.createElement('style');
      s.id = 'perf-noblur';
      s.textContent =
        'html.perf-noblur *,' +
        'html.perf-noblur *::before,' +
        'html.perf-noblur *::after{' +
        'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;' +
        'filter:none!important}';
      document.documentElement.classList.add('perf-noblur');
      (document.head || document.documentElement).appendChild(s);
    } catch (e) { /* 忽略：性能优化失败不影响功能 */ }
  })();

  async function request(method, url, body, raw) {
    const headers = {};
    let payload = body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(url, { method, headers, body: payload || undefined });
    if (raw) return res;
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = { ok: false, code: res.status, msg: '响应解析失败' };
    }
    if (!res.ok || data.ok === false) {
      const err = new Error(data.msg || ('请求失败 (' + res.status + ')'));
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  }

  const qs = (() => {
    const p = new URLSearchParams(location.search);
    const out = {};
    for (const [k, v] of p) out[k] = v;
    return out;
  })();

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtTime(ts, withTime) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return withTime === false ? date : `${date} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function timeAgo(ts) {
    const t = Number(ts) || 0;
    if (!t) return '';
    const diff = Date.now() - t;
    if (diff < 0) return fmtTime(t);
    const min = 60000, hour = 3600000, day = 86400000;
    if (diff < min) return '刚刚';
    if (diff < hour) return Math.floor(diff / min) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 30 * day) return Math.floor(diff / day) + ' 天前';
    return fmtTime(t, false);
  }

  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }

  function badgeVerified(verified) {
    if (!verified) return '';
    if (verified === 2) return '<span class="material-icons vbadge" title="KE官方团队" style="font-size:16px;color:#1d4ed8;vertical-align:-3px">verified</span>';
    return '<span class="material-icons vbadge" title="认证UP" style="font-size:16px;color:#0284c7;vertical-align:-3px">verified</span>';
  }

  function starHtml(rating) {
    const r = Math.round((Number(rating) || 0) * 2) / 2;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += i <= r ? '<span class="material-icons" style="font-size:15px;color:#f5a623">star</span>'
        : '<span class="material-icons" style="font-size:15px;color:var(--mdui-color-outline-variant)">star</span>';
    }
    return html;
  }

  const AV_COLORS = ['#3b82f6', '#0ea5a4', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#6366f1'];
  function colorOf(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  }

  function avatarHtml(user, size) {
    const s = size || 36;
    const name = (user && (user.nickname || user.username)) || (user && user.username) || (user && user.nickname) || '?';
    const text = String(name || '?');
    const first = esc(text.slice(0, 1).toUpperCase());
    if (user && user.avatar) {
      return `<span style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden;flex:none;display:inline-flex"><img src="${esc(user.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`;
    }
    return `<span style="width:${s}px;height:${s}px;border-radius:50%;background:${colorOf(text)};color:#fff;flex:none;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.max(12, Math.round(s * 0.42))}px">${first}</span>`;
  }

  function urlAvatar(user, size) {
    const text = (user && (user.nickname || user.username)) || (user && (user.username || user.nickname)) || '?';
    if (user && user.avatar) return user.avatar;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#${colorOf(String(text)).slice(1)}"/><text x="64" y="64" dy=".38em" font-size="52" fill="#fff" text-anchor="middle" font-family="sans-serif">${esc(String(text).slice(0, 1).toUpperCase())}</text></svg>`
    );
  }

  let snackEl = null;
  let snackTimer = null;
  function toast(message) {
    const msg = String(message === null || message === undefined ? '' : message);
    if (!snackEl) {
      snackEl = document.createElement('div');
      snackEl.className = 'ke-snack';
      document.body.appendChild(snackEl);
    }
    snackEl.textContent = msg;
    snackEl.classList.add('show');
    if (snackTimer) clearTimeout(snackTimer);
    snackTimer = setTimeout(() => snackEl.classList.remove('show'), 2600);
    return snackEl;
  }

  const KE_SNACK_CSS = '.ke-snack{position:fixed;left:50%;bottom:28px;z-index:9999;transform:translateX(-50%) translateY(20px);max-width:min(90vw,520px);background:#111827;color:#f9fafb;padding:12px 18px;border-radius:12px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;pointer-events:none;transition:opacity .22s,transform .22s;line-height:1.5}.ke-snack.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}.ke-overlay{position:fixed;inset:0;z-index:9980;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:keFade .16s}.ke-dialog{background:var(--solid-glass,#fff);border-radius:18px;max-width:min(480px,94vw);width:100%;box-shadow:0 24px 70px rgba(15,23,42,.4);overflow:hidden;animation:keFade .2s cubic-bezier(.34,1.56,.64,1)}.ke-dialog-head{padding:20px 22px 4px;font-size:18px;font-weight:800}.ke-dialog-body{padding:10px 22px 6px;color:var(--mdui-color-on-surface-variant);font-size:14px;line-height:1.7;word-break:break-word;max-height:60vh;overflow-y:auto}.ke-dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px 18px}.ke-input{width:100%;padding:11px 13px;border:1px solid var(--mdui-color-outline-variant);border-radius:11px;font-size:14px;font-family:inherit;color:var(--text-1);background:#fff}.ke-input:focus{outline:none;border-color:var(--mdui-color-primary);box-shadow:0 0 0 3px rgba(59,130,246,.15)}@keyframes keFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}';
  const styleNode = document.createElement('style');
  styleNode.textContent = KE_SNACK_CSS;
  document.head.appendChild(styleNode);

  function dialog(opts) {
    const o = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'ke-overlay';
    const box = document.createElement('div');
    box.className = 'ke-dialog';
    let inner = '';
    if (o.headline) inner += `<div class="ke-dialog-head">${esc(o.headline)}</div>`;
    if (typeof o.body === 'string') inner += `<div class="ke-dialog-body">${o.body}</div>`;
    box.innerHTML = inner;
    if (o.body && o.body.nodeType) {
      const b = document.createElement('div');
      b.className = 'ke-dialog-body';
      b.appendChild(o.body);
      box.appendChild(b);
    }
    const actions = document.createElement('div');
    actions.className = 'ke-dialog-actions';
    const close = () => { overlay.remove(); };
    const mkBtn = (text, kind, fn, icon) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (kind || 'tonal');
      b.type = 'button';
      const iconHtml = icon ? `<span class="material-icons" style="font-size:18px">${esc(icon)}</span>` : '';
      b.innerHTML = iconHtml + esc(text);
      b.addEventListener('click', () => {
        let ret;
        try {
          ret = fn ? fn() : undefined;
        } catch (e) {
          if (e && e.message) toast(e.message);
          return;
        }
        if (ret && typeof ret.then === 'function') {
          ret.then((r) => { if (r !== false) close(); }).catch((e) => {
            if (e && e.message) toast(e.message);
          });
          return;
        }
        if (ret !== false) close();
      });
      return b;
    };

    let list = o.actions;
    if (!Array.isArray(list) || !list.length) {
      const legacy = [];
      if (o.cancelText || o.onCancel) legacy.push({ text: o.cancelText || '取消', kind: 'text', onClick: o.onCancel });
      legacy.push({ text: o.confirmText || '确定', kind: o.danger ? 'danger' : 'primary', onClick: o.onConfirm });
      list = legacy;
    }
    list.forEach((a, idx) => {
      const kind = a.kind || (idx === list.length - 1 ? (o.danger ? 'danger' : 'primary') : 'text');
      actions.appendChild(mkBtn(a.text || '确定', kind, a.onClick, a.icon));
    });
    box.appendChild(actions);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && o.dismissable !== false && o.closeOnClickMask !== false) close();
    });
    document.body.appendChild(overlay);
    return { close, element: overlay };
  }

  function confirmDialog(message, onConfirm, opts) {
    const o = opts || {};
    dialog({
      headline: o.title || '确认操作',
      body: String(message),
      cancelText: o.cancelText || '取消',
      confirmText: o.confirmText || '确定',
      danger: !!o.danger,
      onCancel: o.onCancel,
      onConfirm: onConfirm
    });
  }

  function alertDialog(message, opts) {
    const o = opts || {};
    dialog({
      headline: o.title || '提示',
      body: String(message),
      cancelText: null,
      confirmText: o.confirmText || '知道了',
      onConfirm: o.onConfirm
    });
  }

  function promptDialog(options) {
    return Promise.resolve(options);
  }

  function userUrl(username) {
    return '/u/' + encodeURIComponent(username);
  }

  function setBusy(el, busy) {
    if (!el) return;
    if (busy) { el.setAttribute('disabled', ''); el.classList.add('loading'); }
    else { el.removeAttribute('disabled'); el.classList.remove('loading'); }
  }

  const mentionMap = new Map();
  function addMention(username, nickname) {
    if (username) mentionMap.set(String(username).toLowerCase(), username);
    if (nickname) mentionMap.set(String(nickname).toLowerCase(), username);
  }

  function bindMention(input, getCandidates) {
    if (!input) return;
    const box = document.createElement('div');
    box.className = 'ke-mention-box';
    box.style.display = 'none';
    document.body.appendChild(box);
    let items = [];
    let active = -1;
    let atPos = -1;

    function close() { box.style.display = 'none'; items = []; active = -1; atPos = -1; }

    function open() {
      box.style.display = 'block';
      const r = input.getBoundingClientRect();
      box.style.left = (window.scrollX + r.left) + 'px';
      box.style.top = (window.scrollY + r.bottom + 4) + 'px';
      box.style.minWidth = Math.min(300, Math.max(200, r.width)) + 'px';
    }

    function renderList() {
      box.innerHTML = items.map((c, i) => `<div class="ke-mention-item ${i === active ? 'active' : ''}" data-i="${i}"><span style="width:20px;height:20px;border-radius:50%;overflow:hidden;flex:none;display:inline-flex"><img src="${esc(App.urlAvatar(c))}" style="width:100%;height:100%;object-fit:cover"></span><b>${esc(c.nickname || c.username)}</b></div>`).join('');
      box.querySelectorAll('.ke-mention-item').forEach((el) => {
        el.addEventListener('mousedown', (e) => { e.preventDefault(); pick(Number(el.dataset.i)); });
      });
    }

    function pick(i) {
      const c = items[i];
      if (!c) return;
      const label = c.nickname || c.username;
      const before = input.value.slice(0, atPos);
      const after = input.value.slice(input.selectionStart);
      input.value = before + '@' + label + ' ' + after;
      const pos = (before + '@' + label + ' ').length;
      input.setSelectionRange(pos, pos);
      input.focus();
      close();
    }

    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const text = input.value.slice(0, pos);
      const m = text.match(/(^|\s)@([^\s@]*)$/);
      if (!m) { close(); return; }
      const q = m[2].toLowerCase();
      atPos = pos - m[2].length - 1;
      const all = getCandidates() || [];
      items = all.filter((c) => {
        const n = (c.nickname || '').toLowerCase();
        const u = (c.username || '').toLowerCase();
        return n.indexOf(q) >= 0 || u.indexOf(q) >= 0;
      }).slice(0, 8);
      if (!items.length) { close(); return; }
      active = 0;
      open();
      renderList();
    });

    input.addEventListener('keydown', (e) => {
      if (box.style.display === 'none' || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; renderList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; renderList(); }
      else if (e.key === 'Enter' || e.key === 'Tab') { if (active >= 0) { e.preventDefault(); pick(active); } }
      else if (e.key === 'Escape') { close(); }
    });

    input.addEventListener('blur', () => { setTimeout(close, 160); });
  }

  function pagination(pager, onPage) {
    const wrap = document.createElement('div');
    wrap.className = 'pager';
    const cur = pager.page;
    const total = pager.pageCount;
    const mk = (label, page, disabled, kind) => {
      const b = document.createElement('button');
      b.className = 'btn sm ' + (kind || 'tonal');
      b.type = 'button';
      b.textContent = label;
      if (disabled) b.disabled = true;
      if (page !== null && page !== undefined && !disabled) b.addEventListener('click', () => onPage(page));
      return b;
    };
    if (pager.hasPrev) wrap.appendChild(mk('上一页', cur - 1, false));
    const info = document.createElement('span');
    info.className = 'info';
    info.textContent = `第 ${cur} / ${total} 页 · 共 ${pager.total} 条`;
    wrap.appendChild(info);
    if (pager.hasNext) wrap.appendChild(mk('下一页', cur + 1, false));
    return wrap;
  }

  function groupValue(el) {
    const active = el.querySelector('.seg-item.active');
    if (active) return active.getAttribute('data-value') || '';
    return el.getAttribute('data-value') || '';
  }

  function syncGroup(el) {
    const v = groupValue(el);
    el.querySelectorAll('.seg-item').forEach((it) => {
      it.classList.toggle('active', (it.getAttribute('data-value') || '') === v);
    });
  }

  function syncTabbar(el) {
    const tabs = el.querySelector('.ke-tabs');
    if (!tabs) return;
    const active = tabs.querySelector('.ke-tab.active') || tabs.querySelector('.ke-tab');
    if (active) switchTab(el, active.getAttribute('data-tab'));
  }

  function switchTab(el, tab) {
    if (!tab) return;
    const tabs = el.querySelector('.ke-tabs');
    if (!tabs) return;
    tabs.querySelectorAll('.ke-tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
    el.querySelectorAll('.ke-tabpanel').forEach((p) => {
      p.style.display = p.getAttribute('data-panel') === tab ? '' : 'none';
    });
  }

  function initUi(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const groups = scope.querySelectorAll ? scope.querySelectorAll('.seg-group') : [];
    for (let i = 0; i < groups.length; i++) syncGroup(groups[i]);
    const tabbars = scope.querySelectorAll ? scope.querySelectorAll('.ke-tabs') : [];
    for (let i = 0; i < tabbars.length; i++) syncTabbar(tabbars[i].parentElement);
  }

  document.addEventListener('click', (e) => {
    const segItem = e.target.closest ? e.target.closest('.seg-item') : null;
    if (segItem) {
      const group = segItem.closest('.seg-group');
      if (group) {
        group.querySelectorAll('.seg-item').forEach((s) => s.classList.remove('active'));
        segItem.classList.add('active');
        group.setAttribute('data-value', segItem.getAttribute('data-value') || '');
        group.dispatchEvent(new Event('change'));
      }
      return;
    }
    const tab = e.target.closest ? e.target.closest('.ke-tab') : null;
    if (tab) {
      const bar = tab.closest('.ke-tabs');
      if (bar && bar.parentElement) switchTab(bar.parentElement, tab.getAttribute('data-tab'));
    }
  });

  if (typeof MutationObserver !== 'undefined') {
    const uiObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.classList && (node.classList.contains('seg-group') || node.classList.contains('ke-tabs'))) {
              initUi(node.parentElement || node);
            } else if (node.querySelectorAll && (node.querySelector('.seg-group') || node.querySelector('.ke-tabs'))) {
              initUi(node);
            }
          }
        }
      }
    });
    uiObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  Object.defineProperty(HTMLElement.prototype, 'value', {
    configurable: true,
    get() {
      if (this.classList && this.classList.contains('seg-group')) return groupValue(this);
      return this.getAttribute('value') || '';
    },
    set(v) {
      if (this.classList && this.classList.contains('seg-group')) {
        this.setAttribute('data-value', String(v));
        syncGroup(this);
        return;
      }
      this.setAttribute('value', String(v));
    }
  });

  // 头像加载失败时的统一兜底图（用户指定）
  const AVATAR_FALLBACK =
    'https://cdn-community.bcmcdn.com/47/community/PwfHE1eFG9DgXvvn5iXzniJ3OkFpcveMgQUgcPe9x0y3.png?hash=Fsd24e1xswiGVQZpOaOUXcDfkdDJ';

  // 生成带「加载失败回退」的头像 DOM（优先用真实头像，失败则用 AVATAR_FALLBACK）
  function avatarImg(url, size, opts) {
    const s = size || 36;
    const o = opts || {};
    const radius = o.radius || '50%';
    const src = url || AVATAR_FALLBACK;
    const cls = o.cls || '';
    return (
      `<span class="${cls}" style="width:${s}px;height:${s}px;border-radius:${radius};overflow:hidden;flex:none;display:inline-flex;background:#e5e7eb">` +
      `<img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover"` +
      ` onerror="this.onerror=null;this.src='${esc(AVATAR_FALLBACK)}'"></span>`
    );
  }

  window.App = {
    get: (u) => request('GET', u),
    post: (u, b) => request('POST', u, b),
    request,
    qs,
    esc,
    fmtTime,
    timeAgo,
    fmtBytes,
    badgeVerified,
    starHtml,
    avatarHtml,
    avatarImg,
    urlAvatar,
    AVATAR_FALLBACK,
    colorOf,
    toast,
    dialog,
    confirmDialog,
    alertDialog,
    promptDialog,
    userUrl,
    setBusy,
    pagination,
    mentionMap,
    addMention,
    bindMention
  };
})();
