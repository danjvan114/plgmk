/* ============================================================
   KN Expanse 全站统一主题脚本 theme.js
   双主题(极光紫霞白天/暗夜黑夜) · localStorage 实时同步
   主题/节能按钮事件委托 · 节能模式 · 移动端检测
   所有页面共用此脚本,不依赖页面内嵌逻辑
   ============================================================ */
(function () {
  'use strict';

  var KEY_THEME = 'knexpanse-theme';
  var KEY_LITE = 'knexpanse-lite';

  function read(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  /* 当前是否暗夜:3 或 dark(兼容旧数据) */
  function curIsDark() {
    var t = read(KEY_THEME);
    return t === '3' || t === 'dark';
  }
  function curLite() { return read(KEY_LITE) === '1'; }

  function isToolPage(body) {
    return body.classList.contains('theme-light') || body.classList.contains('theme-dark');
  }
  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent);
  }

  /* 应用主题/节能到 body,并同步按钮状态 */
  function apply() {
    var body = document.body;
    if (!body) return;
    var dark = curIsDark();
    body.classList.remove('theme-aurora', 'theme-ocean', 'theme-amber', 'dark-mode', 'theme-light', 'theme-dark');
    if (isToolPage(body)) {
      body.classList.add(dark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(dark ? 'dark-mode' : 'theme-aurora');
    }
    body.classList.toggle('lite-mode', curLite());
    body.classList.toggle('mobile', isMobile());
    syncBtns(body, dark);
  }

  /* 节能按钮高亮同步 */
  function syncBtns(body, dark) {
    var lite = document.getElementById('liteBtn');
    if (lite) lite.classList.toggle('active', body.classList.contains('lite-mode'));
    var tb = document.getElementById('themeBtn');
    if (tb) {
      tb.classList.toggle('dark', dark);
      tb.setAttribute('title', dark ? '切换到白天' : '切换到黑夜');
    }
  }

  /* 切换主题(白天<->黑夜) */
  function toggleTheme() {
    var dark = curIsDark();
    write(KEY_THEME, dark ? '0' : '3');
    apply();
  }
  /* 切换节能 */
  function toggleLite() {
    write(KEY_LITE, curLite() ? '0' : '1');
    apply();
    var msg = curLite() ? '已开启节能模式' : '已关闭节能模式';
    showToast(msg);
  }

  /* 轻量 toast(节能切换提示) */
  var toastEl = null, toastT = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:34px;transform:translateX(-50%) translateY(20px);background:var(--glass-strong);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);color:var(--text-1);padding:11px 22px;border-radius:30px;font-size:13.5px;font-weight:600;box-shadow:inset 0 1px 0 var(--glass-hi-top),var(--shadow-hover);opacity:0;transition:opacity .3s,transform .35s cubic-bezier(.34,1.56,.64,1);z-index:5000;pointer-events:none;';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.style.opacity = '1'; toastEl.style.transform = 'translateX(-50%) translateY(0)'; });
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.style.opacity = '0'; toastEl.style.transform = 'translateX(-50%) translateY(20px)'; }, 2000);
  }

  /* 初始化 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  /* 多页面主题实时同步:其他页面修改主题/节能时本页即时跟随 */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_THEME || e.key === KEY_LITE) apply();
  });

  /* 按钮事件委托(全站统一):不依赖页面内嵌逻辑 */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('#themeBtn');
    if (t) {
      /* 插件市场用主题菜单选择,不拦截;其余页面直接切换 */
      if (!document.getElementById('themePop')) toggleTheme();
      return;
    }
    t = e.target.closest('#liteBtn');
    if (t) { toggleLite(); return; }
  });
})();
