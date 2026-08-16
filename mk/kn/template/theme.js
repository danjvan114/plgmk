/* ============================================================
   KN Expanse 全站统一主题脚本 theme.js
   双主题(极光紫霞白天/暗夜黑夜) · localStorage 实时同步
   节能模式 · 移动端检测
   ============================================================ */
(function () {
  'use strict';

  var KEY_THEME = 'knexpanse-theme';
  var KEY_LITE = 'knexpanse-lite';

  function read(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }

  /* 当前是否暗夜:3 或 dark(兼容旧数据) */
  function curIsDark() {
    var t = read(KEY_THEME);
    return t === '3' || t === 'dark';
  }

  /* B类工具页用 theme-light/theme-dark, 其余用 theme-aurora/dark-mode */
  function isToolPage(body) {
    return body.classList.contains('theme-light') || body.classList.contains('theme-dark');
  }

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent);
  }

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
    body.classList.toggle('lite-mode', read(KEY_LITE) === '1');
    body.classList.toggle('mobile', isMobile());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  /* 多页面主题实时同步:其他页面修改主题/节能时本页即时跟随 */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_THEME || e.key === KEY_LITE) apply();
  });
})();
