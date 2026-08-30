/* ===== 社区交互增强 =====
   1) 卡片:鼠标光感发光(全站) + 悬浮抬起;仅"小型网格卡片"参与 3D 倾斜联动,
      大卡片(宽>560 或 高>380)只发光+抬起,不倾斜。
   2) 导航栏/按钮等可交互元素:同样铺鼠标跟随发光(不倾斜)。
   3) Tab 切换:堆叠卡片式动效(参照 plugin_detail .pd-pane:侧移+旋转+缩放淡出)。
   纯 CSS 渐变实现,无 backdrop-filter,性能友好。移动端与节能模式自动跳过。 */
(function () {
  'use strict';
  var KEY_LITE = 'knexpanse-lite';
  function curLite() {
    try { return localStorage.getItem(KEY_LITE) === '1' || document.body.classList.contains('lite-mode'); }
    catch (e) { return false; }
  }
  var isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent);

  /* 参与发光(+小卡倾斜)的卡片 */
  var SEL = '.card, .right-card, .mdui-card, .board-item, .post-card, .project-card, .work-card, .mdui-list-item, .post-item, .publish-card, .team-header, .profile-card, .form-card, .info-section, .comments-section, .author-card, .msg-item, .table-card, .stat-card, .user-item, .pending-item, .report-item, .sample-card, .announce-card, .wall-box, .pdf-container';
  /* 只发光、不倾斜的可交互元素(导航/按钮/分页等) */
  var SEL_GLOW_ONLY = '.nav-links a, .icon-btn, .ke-nav-links a, .ke-icon-btn, .ke-avatar-btn, .ke-dl-arrow, .ke-pop-item, .ke-tp-item, .ke-look-perf, .ke-back-btn, .ke-burger, .mdui-tab a, .sort-bar a, .pagination a, .pagination .current, .submit-btn, .comment-submit, .primary-btn, .btn, .mdui-btn, .action-item, .follow-btn, .author-follow, .back-link, .more-link, .read-all-btn, .wall-send, .mini-btn, .board-item, .lang-item, .ke-lang-item, .qr-tab, .ke-qr-tab';
  var MAX_H = 8;      /* 悬停卡最大倾角 */
  var MAX_N = 5;      /* 邻居卡最大倾角 */
  var RADIUS = 780;   /* 联动影响半径 */
  var BIG_W = 980;    /* 宽度阈值:超过则不倾斜(仅超大面板卡) */
  var BIG_H = 520;    /* 高度阈值:超过则不倾斜 */

  var mx = -9999, my = -9999, pending = false;
  var cards = [];     /* {el, tilt:boolean} */

  function refreshCards() {
    var next = [];
    var nodes = document.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var c = nodes[i];
      if (!document.body.contains(c)) continue;      /* 清理已移除节点,防内存泄漏 */
      if (!c.classList.contains('knx-glow')) c.classList.add('knx-glow');
      next.push({ el: c, tilt: true });
    }
    var gs = document.querySelectorAll(SEL_GLOW_ONLY);
    for (var j = 0; j < gs.length; j++) {
      var g = gs[j];
      if (!document.body.contains(g)) continue;
      if (!g.classList.contains('knx-glow')) g.classList.add('knx-glow');
      g.classList.add('knx-notilt');
      next.push({ el: g, tilt: false });
    }
    cards = next;
  }

  function frame() {
    pending = false;
    if (curLite()) return;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i].el, canTilt = cards[i].tilt;
      var r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      /* 大卡片自动降级:只发光不倾斜 */
      if (canTilt && (r.width > BIG_W || r.height > BIG_H)) canTilt = false;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dx = mx - cx, dy = my - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var hover = mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
      var fall = hover ? 1 : Math.max(0, 1 - dist / RADIUS);
      /* 光斑坐标始终更新(发光) */
      if (hover || fall > 0.02) {
        c.style.setProperty('--mx', (((mx - r.left) / r.width) * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (((my - r.top) / r.height) * 100).toFixed(1) + '%');
      }
      c.classList.toggle('knx-on', hover);
      c.classList.toggle('knx-soft', !hover && fall > 0.04);
      if (!canTilt) {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
        continue;
      }
      if (fall <= 0.02 && !hover) {
        c.style.setProperty('--rx', '0deg');
        c.style.setProperty('--ry', '0deg');
        continue;
      }
      var maxD = hover ? MAX_H : MAX_N;
      var rx = (-dy / (hover ? r.height / 2 : 340)) * maxD * (hover ? 1 : fall);
      var ry = (dx / (hover ? r.width / 2 : 340)) * maxD * (hover ? 1 : fall);
      rx = Math.max(-maxD, Math.min(maxD, rx));
      ry = Math.max(-maxD, Math.min(maxD, ry));
      c.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      c.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    }
  }

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    if (!pending) { pending = true; requestAnimationFrame(frame); }
  }

  function resetAll() {
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i].el;
      c.style.setProperty('--rx', '0deg');
      c.style.setProperty('--ry', '0deg');
      c.classList.remove('knx-on', 'knx-soft');
    }
  }

  /* 倾斜 transform 由 CSS 变量驱动(notilt 元素 JS 端已跳过倾斜计算,
     其 hover 位移仍由各按钮 :hover 规则控制) */
  var style = document.createElement('style');
  style.textContent =
    '.knx-glow{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(var(--ty,0px));}' +
    '.knx-glow.knx-on{--ty:-4px;}';
  document.head.appendChild(style);

  /* ===== Tab 堆叠卡片切换(参照 plugin_detail .pd-pane 方案) ===== */
  function initStackTabs() {
    var bars = document.querySelectorAll('.mdui-tab');
    if (!bars.length) return;
    var switching = false;
    for (var i = 0; i < bars.length; i++) bindBar(bars[i]);

    /* 在容器捕获阶段拦截,阻止 mdui 自身的即时切换,保留离场动画 */
    function bindBar(bar) {
      if (bar.getAttribute('data-ke-stack')) return;
      bar.setAttribute('data-ke-stack', '1');
      bar.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!t || !bar.contains(t)) return;
        var id = t.getAttribute('href');
        var target = id && id.length > 1 ? document.querySelector(id) : null;
        if (!target) return;
        var group = paneGroup(target);
        if (!group) return;
        var cur = null;
        for (var k = 0; k < group.length; k++) if (group[k].classList.contains('active')) cur = group[k];
        e.preventDefault();
        e.stopImmediatePropagation();
        if (cur === target || switching) return;
        go(group, cur, target, bar);
      }, true);
    }
    /* 找到同组面板:目标前后所有 .tab-content / [id^=panel-] 兄弟 */
    function paneGroup(p) {
      var cls = p.className || '';
      var sel = /\btab-content\b/.test(cls) ? '.tab-content'
              : (/^panel-/.test(p.id) ? '[id^="panel-"]' : null);
      if (!sel) return null;
      var all = document.querySelectorAll(sel);
      var out = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].parentNode === p.parentNode) out.push(all[i]);
      }
      return out.length > 1 ? out : null;
    }
    function markActiveTab(bar, target) {
      var links = bar.querySelectorAll('a[href^="#"]');
      for (var k = 0; k < links.length; k++) {
        var on = links[k].getAttribute('href') === '#' + target.id;
        links[k].classList.toggle('mdui-tab-active', on);
      }
    }
    function go(group, old, next, bar) {
      switching = true;
      var idxOld = old ? group.indexOf(old) : -1;
      var idxNext = group.indexOf(next);
      var dir = idxNext > idxOld ? 1 : -1;   /* 新面板进入方向 */
      markActiveTab(bar, next);
      if (old) {
        var parent = old.parentNode;
        var topPos = old.offsetTop;   /* 先读,再改定位,避免跳动 */
        parent.style.position = 'relative';
        old.style.position = 'absolute';
        old.style.top = topPos + 'px';
        old.style.left = '0'; old.style.right = '0';
        old.classList.add('ke-leaving');
        old.style.setProperty('--dir', (-dir));
        old.classList.remove('active');
      }
      next.style.display = '';
      next.classList.add('active', 'ke-entering');
      next.style.setProperty('--dir', dir);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          next.classList.remove('ke-entering');
          setTimeout(function () {
            if (old) {
              old.classList.remove('ke-leaving');
              old.style.position = ''; old.style.top = ''; old.style.left = ''; old.style.right = '';
              old.style.display = 'none';
              old.style.removeProperty('--dir');
            }
            next.style.removeProperty('--dir');
            switching = false;
          }, 620);
        });
      });
    }
  }

  /* 初始隐藏非 active 面板(mdui 默认 display:none 由 tab 组件处理;
     我们接管后需自行保证初始状态) */
  function initPaneVisibility() {
    var groups = {};
    var pcs = document.querySelectorAll('.tab-content, [id^="panel-"]');
    for (var i = 0; i < pcs.length; i++) {
      var p = pcs[i];
      var key = (p.parentNode || {}).className + '|' + /\btab-content\b/.test(p.className || '') + '|' + /^panel-/.test(p.id);
      (groups[key] = groups[key] || []).push(p);
    }
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length < 2) return;
      var hasActive = g.some(function (x) { return x.classList.contains('active'); });
      g.forEach(function (x) {
        if (hasActive) { if (!x.classList.contains('active')) x.style.display = 'none'; }
        else x.style.display = x === g[0] ? '' : 'none';
        if (x === g[0] && !hasActive) x.classList.add('active');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  function init() {
    initPaneVisibility();
    if (!isMobile) {
      refreshCards();
      document.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseleave', resetAll);
    }
    initStackTabs();
    /* 动态插入的卡片/tab 内容持续纳入 */
    var t = null;
    var mo = new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(function () { if (!isMobile) refreshCards(); initStackTabs(); }, 150);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();
