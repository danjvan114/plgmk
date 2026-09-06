/* ===== 社区 MDUI 自动适配 + 弹窗控制 =====
   扫描页面中未使用 MDUI 的裸元素,运行时自动补齐 MDUI 组件类:
   1) 按钮(button / a.btn / .submit-btn 等) → .mdui-btn + .mdui-ripple
   2) 表单(.form-group 的 label+控件)        → .mdui-textfield
   3) 表格(table)                            → .mdui-table
   4) 列表项(.post-item 等可点击行)          → .mdui-ripple
   5) 富文本正文(.post-content/.md-hint 等)  → .mdui-typo
   6) 标签/徽章(.post-tag/.tag 等)           → .mdui-chip
   7) 卡片内部(.hd/.bd/.card-body)           → .mdui-card-header / .mdui-card-content
   8) 列表容器(.post-list 等)                → .mdui-list
   纯加类,不移动 DOM、不改 id/onclick 与后端表单字段。
   另:为 .modal 提供通用 show/hide(修复弹窗常驻显示问题)。 */
(function () {
  'use strict';

  var BTN_SELECTOR = '.btn, .submit-btn, .comment-submit, .primary-btn, .mini-btn, .read-all-btn, .follow-btn, .author-follow, .wall-send, .approve, .reject, .btn-danger, .btn-success, .action-item, .modal-content button';
  /* 不参与 mdui-btn 改造的元素/容器 */
  /* #hv2=全局顶栏(nav.js 渲染),其按钮曾被误补 .mdui-btn 导致圆角/颜色/布局被社区样式污染;
   弹出菜单(lang/qr/look/qq/m-pop)挂在 body 下,一并跳过 */
  var SKIP_SEL = '#hv2, .lang-pop, .qr-pop, .look-pop, .qq-pop, .m-pop, .theme-pop, .mdui-tab, .ke-header, .ke-back, .back-link, .banner-arrow, .dot, .mdui-tab a';

  function hasCls(el, name) {
    return (' ' + (el.className || '') + ' ').indexOf(' ' + name + ' ') !== -1;
  }
  function inSkip(el) {
    if (el.closest && el.closest(SKIP_SEL)) return true;
    if (hasCls(el, 'back-link') || hasCls(el, 'banner-arrow') || hasCls(el, 'dot')) return true;
    return false;
  }

  /* ---- 1) 按钮适配 ---- */
  function upgradeButtons(root) {
    var els = root.querySelectorAll('button, a.btn, ' + BTN_SELECTOR);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (inSkip(el)) continue;
      if (hasCls(el, 'mdui-btn')) {
        if (!hasCls(el, 'mdui-ripple')) el.classList.add('mdui-ripple');
        continue;
      }
      el.classList.add('mdui-btn');
      el.classList.add('mdui-ripple');
      /* 主操作按钮加 raised(样式层已统一玻璃化,不会实心) */
      if (/(^|\s)(submit-btn|comment-submit|primary-btn|btn-success|approve|wall-send)(\s|$)/.test(el.className || '')) {
        el.classList.add('mdui-btn-raised');
      }
    }
  }

  /* ---- 2) 表单域适配:form-group → mdui-textfield(label 保持在上,不做浮动) ---- */
  function upgradeTextfields(root) {
    var groups = root.querySelectorAll('.form-group');
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (hasCls(g, 'mdui-textfield')) continue;
      var ctl = g.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select');
      var lbl = g.querySelector('label');
      if (!ctl) continue;
      g.classList.add('mdui-textfield');
      if (lbl) lbl.classList.add('mdui-textfield-label');
      ctl.classList.add('mdui-textfield-input');
    }
  }

  /* ---- 3) 表格适配 ---- */
  function upgradeTables(root) {
    var tbs = root.querySelectorAll('table');
    for (var i = 0; i < tbs.length; i++) {
      if (!hasCls(tbs[i], 'mdui-table')) tbs[i].classList.add('mdui-table');
    }
  }

  /* ---- 4) 可点击列表行加涟漪 ---- */
  function upgradeListRipple(root) {
    var rows = root.querySelectorAll('.post-item, .user-item, .msg-item, .pending-item, .report-item, .board-item, .mdui-list-item');
    for (var i = 0; i < rows.length; i++) {
      if (!hasCls(rows[i], 'mdui-ripple')) rows[i].classList.add('mdui-ripple');
    }
  }

  /* ---- 5) 富文本/说明文字 → mdui-typo(MDUI 排版:标题/列表/代码/引用自动美化) ---- */
  function upgradeTypo(root) {
    var bodies = root.querySelectorAll('.post-content, .md-hint, .doc-content, .article-content, .announce-card .bd, .info-section p, .comments-section .comment-body, .comment-body, .post-preview, .work-desc, .description, .detail-desc, .team-desc, .section-desc, .hint, .empty-state p, .empty-state, .comment-login-tip, .wall-item .wall-text, .post-text, .card p, .form-card .tip');
    for (var i = 0; i < bodies.length; i++) {
      if (!hasCls(bodies[i], 'mdui-typo')) bodies[i].classList.add('mdui-typo');
    }
  }

  /* ---- 6) 标签/徽章 → mdui-chip ---- */
  function upgradeChips(root) {
    var tags = root.querySelectorAll('.post-tag, .tag, .badge, .role-admin, .role-developer, .role-user, .featured-meta span');
    for (var i = 0; i < tags.length; i++) {
      if (!hasCls(tags[i], 'mdui-chip')) tags[i].classList.add('mdui-chip');
    }
  }

  /* ---- 7) 卡片内部结构 → mdui-card-header / mdui-card-content ---- */
  function upgradeCardInner(root) {
    var cards = root.querySelectorAll('.card, .right-card, .publish-card, .form-card, .table-card, .stat-card, .info-section, .comments-section, .author-card, .announce-card, .wall-box');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var hd = c.querySelector(':scope > .hd, :scope > .card-header, :scope > h1, :scope > h2, :scope > .form-title, :scope > .section-title');
      if (hd && !hasCls(hd, 'mdui-card-header-title')) hd.classList.add('mdui-card-header-title');
      var bd = c.querySelector(':scope > .bd, :scope > .card-body, :scope > .mdui-card-content');
      if (bd && !hasCls(bd, 'mdui-card-content')) bd.classList.add('mdui-card-content');
    }
  }

  /* ---- 8) 列表容器 → mdui-list ---- */
  function upgradeLists(root) {
    var lists = root.querySelectorAll('ul.post-list, ul.user-list, ul.msg-list, ul.work-list');
    for (var i = 0; i < lists.length; i++) {
      if (!hasCls(lists[i], 'mdui-list')) lists[i].classList.add('mdui-list');
    }
  }

  /* ---- 9) 卡片容器补 mdui-card 语义 ---- */
  function upgradeCards(root) {
    var cards = root.querySelectorAll('.card, .form-card, .right-card, .publish-card, .info-section, .comments-section, .author-card, .table-card, .stat-card, .announce-card, .wall-box');
    for (var i = 0; i < cards.length; i++) {
      if (!hasCls(cards[i], 'mdui-card')) cards[i].classList.add('mdui-card');
    }
  }

  function refreshAll() {
    if (!document.body) return;
    upgradeButtons(document);
    upgradeTextfields(document);
    upgradeTables(document);
    upgradeListRipple(document);
    upgradeTypo(document);
    upgradeChips(document);
    upgradeCardInner(document);
    upgradeLists(document);
    upgradeCards(document);
    hideModals();
    /* 让 mdui 识别新插入的 ripple/textfield 组件 */
    try { if (window.mdui && mdui.mutation) mdui.mutation(); } catch (e) {}
  }

  /* ---- 弹窗控制:默认全部隐藏,补全缺失的 closeModal ---- */
  function hideModals() {
    var mods = document.querySelectorAll('.modal');
    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (!m.id) m.id = 'ke-modal-' + i;
      if (!m.querySelector('.modal-content')) continue;
      if (!hasCls(m, 'show') && !hasCls(m, 'active')) m.style.display = 'none';
    }
    if (!window.closeModal) {
      window.closeModal = function () {
        var ms = document.querySelectorAll('.modal');
        for (var j = 0; j < ms.length; j++) {
          ms[j].classList.remove('show', 'active');
          ms[j].style.display = 'none';
        }
      };
    }
    if (!window.showModal) {
      window.showModal = function (id) {
        var m = document.getElementById(id);
        if (!m) return;
        m.style.display = '';
        m.classList.add('show');
      };
    }
    /* 编辑按钮(带 data-modal 属性)自动打开对应弹窗 */
    var openers = document.querySelectorAll('[data-modal]');
    for (var k = 0; k < openers.length; k++) {
      (function (btn) {
        if (btn.getAttribute('data-ke-bound')) return;
        btn.setAttribute('data-ke-bound', '1');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var m = document.getElementById(btn.getAttribute('data-modal'));
          if (m) { m.style.display = ''; m.classList.add('show'); }
        });
      })(openers[k]);
    }
  }
  /* 点击遮罩空白处关闭 */
  document.addEventListener('click', function (e) {
    var m = e.target.closest ? e.target.closest('.modal') : null;
    if (m && e.target === m) window.closeModal();
  });

  /* ---- 顶部加载进度条:页面就绪后淡出隐藏(修复:此前常驻左上角) ---- */
  function hideLoader() {
    var ls = document.querySelectorAll('.loader, #loader, .progress-container, #progressBar');
    for (var i = 0; i < ls.length; i++) {
      (function (l) {
        l.style.transition = 'opacity .5s ease';
        l.style.opacity = '0';
        setTimeout(function () { l.style.display = 'none'; }, 520);
      })(ls[i]);
    }
  }
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAll);
  } else {
    refreshAll();
  }

  /* 动态内容(Jinja 片段异步加载、弹窗等)持续纳入 */
  var t = null;
  var mo = new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(refreshAll, 200);
  });
  function observe() { mo.observe(document.body, { childList: true, subtree: true }); }
  if (document.body) observe();
  else document.addEventListener('DOMContentLoaded', observe);
})();
