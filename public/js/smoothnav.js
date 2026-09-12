/**
 * SmoothNav —— 无白屏页面切换
 * 
 * 原理：拦截同域 <a> 点击 → fetch 目标 HTML → 只替换 <main id="view"> 内容
 *        顶栏/抽屉/页脚完全不动 → 无白屏 + 零重请求
 * 
 * 依赖：全局 App.ready（shell.js 定义）、page JS 在 /js/page/*.js
 */
(function () {
  'use strict';

  // ====== 配置 ======
  const VIEW = document.getElementById('view');
  const CACHE_TTL = 60_000;  // 预取 HTML 缓存 60s

  // ====== 状态 ======
  let navigating = false;
  let pendingAbort = null;
  const pageCache = new Map();    // url → { html, ts }
  const loadedPages = new Set();  // 已执行过的 page JS（带时间戳）

  // ====== 预取（鼠标悬停链接时偷偷 fetch） ======
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (!isNavigable(a)) return;
    if (pageCache.has(a.href)) return;
    prefetch(a.href);
  }, { passive: true });

  function prefetch(url) {
    fetch(url)
      .then((r) => r.ok ? r.text() : null)
      .then((html) => {
        if (html) pageCache.set(url, { html, ts: Date.now() });
      })
      .catch(() => {});
  }

  // ====== 拦截链接点击 ======
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (!isNavigable(a)) return;
    e.preventDefault();
    e.stopPropagation();
    go(a.href);
  });

  // ====== 浏览器前进/后退 ======
  window.addEventListener('popstate', (e) => {
    if (!e.state && location.pathname === '/login') {
      // 登录跳转走正常流程
      location.reload();
      return;
    }
    go(location.pathname + location.search, true);
  });

  // ====== 判断链接是否可拦截 ======
  function isNavigable(a) {
    if (!a.href) return false;
    if (a.target === '_blank') return false;
    if (a.hasAttribute('download')) return false;
    if (a.href.startsWith('javascript:')) return false;
    if (a.href.startsWith('#')) return false;
    if (a.origin !== location.origin) return false;
    if (/\/(app\/player|uploads|vendor)\//.test(a.href)) return false;
    // 登录页、logout 也放过（需要完整刷新）
    if (/\/login($|\/)/.test(a.pathname)) return false;
    if (/\/logout$/.test(a.pathname)) return false;
    if (/\/app\//.test(a.pathname)) return false;
    return true;
  }

  // ====== 核心：切换页面 ======
  async function go(url, isBack) {
    if (navigating) { pendingAbort && pendingAbort.abort(); }
    navigating = true;

    // 切换动画
    document.documentElement.classList.add('sn-navigating');

    // 先查缓存
    let html = null;
    const cached = pageCache.get(url);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      html = cached.html;
    }

    if (!html) {
      try {
        const ctrl = new AbortController();
        pendingAbort = ctrl;
        const res = await fetch(url, { signal: ctrl.signal });
        pendingAbort = null;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        html = await res.text();
        pageCache.set(url, { html, ts: Date.now() });
      } catch (err) {
        if (err.name === 'AbortError') { navigating = false; return; }
        console.warn('[SmoothNav] fetch 失败，降级真跳转:', err.message);
        location.href = url;
        return;
      }
    }

    // 解析目标 HTML（DOMParser 不执行 script，安全）
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newView = doc.getElementById('view');
    if (!newView) { location.href = url; return; }

    // 执行切换
    swapPage(doc, newView);

    // 更新 URL 和历史
    if (!isBack) history.pushState({ sn: true }, '', url);

    // 收尾
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('sn-navigating');
      navigating = false;
      window.scrollTo(0, 0);
      if (window.MDURipple) window.MDURipple.scan(document.body);
      dispatchEvent(new CustomEvent('sn:switched', { detail: { url } }));
    });
  }

  // ====== 换 DOM + 加载 page JS ======
  function swapPage(doc, newView) {
    const body = doc.body;

    // 1. 更新 title
    const title = doc.querySelector('title');
    if (title) document.title = title.textContent;

    // 2. 更新 body data-page
    const newPage = body.getAttribute('data-page');
    if (newPage) document.body.setAttribute('data-page', newPage);

    // 3. 换 <main id="view">（整个 innerHTML 换掉，干净利落）
    VIEW.innerHTML = newView.innerHTML;

    // 4. 加载并执行目标 page JS
    const pageScripts = doc.querySelectorAll('script[src*="/js/page/"]');
    pageScripts.forEach((s) => {
      const src = s.getAttribute('src');
      runPageScript(src);
    });
  }

  function runPageScript(src) {
    // 用时间戳强制浏览器重新下载执行（IIFE 会重新跑）
    const cacheKey = src + '?' + Date.now();
    const s = document.createElement('script');
    s.src = cacheKey;
    s.async = false;  // 保持执行顺序
    // 执行完可以移除标签（代码已经跑完了）
    s.addEventListener('load', () => { s.remove(); });
    document.body.appendChild(s);
  }

  // ====== 导出 ======
  window.SmoothNav = { go };

  // ====== 注入切换动画 ======
  const style = document.createElement('style');
  style.textContent = `
    html.sn-navigating #view { opacity:0; transform: translateY(8px); transition: opacity .12s ease, transform .18s ease; }
    html.sn-navigating { cursor: progress; }
    html.sn-navigating::after { content:""; position:fixed; top:0; left:0; height:3px; width:40%; background:var(--mdui-color-primary,#3b82f6); animation: sn-progress .6s ease forwards; z-index:10000; pointer-events:none; }
    @keyframes sn-progress { from{ width:0; } to{ width:100%; } }
  `;
  document.head.appendChild(style);
})();
