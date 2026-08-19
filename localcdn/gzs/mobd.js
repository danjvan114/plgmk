/* mobd.js — 移动端统一框架
 * 职责:
 *  1) 统一 JS 绘制底栏(mdui bottom-nav),含安全区适配
 *  2) 单页面内切换(底部 tab 页 + 可压栈的详情子页)
 *  3) mdui 顶栏控制(子页显示返回按钮,tab 页显示右侧动作)
 * 用法:
 *   <nav id="mobd-tabbar"></nav>
 *   mobd.tabbar({ items: [{ id:'discover', icon:'<svg>…', text:'发现' }, …] });
 *   mobd.page('discover', { title:'发现' });   // 注册页面(对应 #page-discover)
 *   mobd.init({ default:'discover' });
 *   切换 tab 页:mobd.go('download');  打开子页:mobd.push('ext');
 *   返回:mobd.back();(mobd-back 按钮自动绑定)
 */
document.querySelectorAll('*').forEach(e=>{e.style.filter="none",e.style.backdropFilter="none",e.style.webkitBackdropFilter="none"})
(function (window) {
  'use strict';
  
  var mobd = {};
  var pages = {};
  var stack = [];
  var defaultPage = '';

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function show(id, fromStack) {
    var cfg = pages[id] || {};
    Object.keys(pages).forEach(function (k) {
      var el = document.getElementById('page-' + k);
      if (el) el.classList.toggle('mobd-active', k === id);
    });
    var isSub = fromStack || cfg.sub || stack.length > 1;

    var tb = document.getElementById('mobd-topbar');
    if (tb) {
      var back = tb.querySelector('#mobd-back');
      var title = tb.querySelector('#mobd-title');
      var right = tb.querySelector('#mobd-actions');
      if (back) back.classList.toggle('mobd-hidden', !isSub);
      if (title) title.textContent = cfg.title || '';
      if (right) right.classList.toggle('mobd-hidden', isSub);
    }
    var bar = document.getElementById('mobd-tabbar');
    if (bar) bar.classList.toggle('mobd-hidden', isSub);

    qsa('.mobd-tab').forEach(function (b) {
      b.classList.toggle('mobd-active', b.getAttribute('data-tab') === id && !isSub);
    });

    if (cfg.onShow) { try { cfg.onShow(); } catch (e) {} }
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  /* 注册页面(对应 #page-<id>) */
  mobd.page = function (id, cfg) {
    pages[id] = cfg || {};
    var el = document.getElementById('page-' + id);
    if (el) el.classList.add('mobd-page');
  };

  /* 切换 tab 页(重置子页栈) */
  mobd.go = function (id) {
    stack = [id];
    show(id, false);
  };

  /* 打开子页(详情页/用户资料,顶栏显示返回按钮) */
  mobd.push = function (id) {
    stack.push(id);
    show(id, true);
  };

  /* 返回:子页出栈,回到上一页;根页则 history.back() */
  mobd.back = function () {
    if (stack.length > 1) {
      stack.pop();
      show(stack[stack.length - 1], true);
    } else {
      try { if (window.history && window.history.length > 1) { window.history.back(); } else { window.history.back(); } } catch (e) {}
    }
  };

  /* 统一绘制底栏(每个页面调用一次即可,自动重建) */
  mobd.tabbar = function (opts) {
    var items = opts.items || [];
    var el = document.getElementById(opts.container || 'mobd-tabbar');
    if (!el) return;
    el.innerHTML = '';
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mobd-tab';
      b.setAttribute('data-tab', item.id);
      b.innerHTML = '<span class="mobd-tab-ico">' + (item.icon || '') + '</span>'
        + '<span class="mobd-tab-txt">' + (item.text || '') + '</span>';
      b.addEventListener('click', function () { mobd.go(item.id); });
      el.appendChild(b);
    });
    el.classList.add('mobd-tabbar');
  };

  /* 初始化 */
  mobd.init = function (opts) {
    defaultPage = (opts && opts.default) || 'discover';
    var back = document.getElementById('mobd-back');
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); mobd.back(); });

    var target = null;
    if (window.location.hash) {
      var m = window.location.hash.match(/^#page-([\w-]+)/);
      if (m && pages[m[1]]) target = m[1];
    }
    if (!target || target === defaultPage || (pages[target] && !pages[target].sub)) {
      if (target) { mobd.go(target); }
      else { mobd.go(defaultPage); }
    } else {
      mobd.go(defaultPage);
      mobd.push(target);
    }

    /* 浏览器返回键联动 */
    if (window.history && window.history.pushState) {
      window.addEventListener('popstate', function () {
        if (stack.length > 1) { stack.pop(); show(stack[stack.length - 1], true); }
      });
    }
  };

  window.mobd = mobd;
})(window);
