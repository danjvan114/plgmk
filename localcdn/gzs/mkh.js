/*! mkh.js — 统一站头渲染
 * 依赖：<header id="hz5kl"></header> 占位 + 页面自身 <head> 搜索/通知等样式。
 * 站头本身的 CSS 由本脚本动态注入（作用域 #hz5kl），因此不会受宿主模板样式干扰。
 *
 * 用法：在任意页面 <head> 或 <body> 尾引入：
 *   <script src="/localcdn/gzs/mkh.js"></script>
 *   <header id="hz5kl"></header>   ← 留空即可，脚本自动填充
 *
 * 搜索框目标 / 占位文案由当前路径自动判断：
 *   /workpool(之下)        → /workpool   "搜索作品名称/作者/标签"
 *   /forum(之下)           → /forum      "搜索帖子"
 *   其它(/mk/…)            → /mk/<market> "搜索插件名称/标签"
 */
(function () {
    'use strict';

    var HEADER_ID = 'hz5kl';
    var STYLE_ID = 'mkh-style';
    var DATA_URL = '/api/header';

    // ---------- 站头样式（作用域 #hz5kl） ----------
    var CSS = [
        '#hz5kl{width:100%;height:56px;background:rgba(76,175,80,.85);position:fixed;top:0;left:0;display:flex;align-items:center;padding:0 24px;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15);animation:headerSlideDown .4s cubic-bezier(.4,0,.2,1)}',
        '#hz5kl .wrap{max-width:1400px;margin:0 auto;width:100%;display:flex;align-items:center}',
        '#hz5kl .logo{display:flex;align-items:center;color:#fff;font-size:22px;font-weight:bold;margin-right:28px;letter-spacing:1px}',
        '#hz5kl .logo-icon{width:36px;height:36px;margin-right:10px;border-radius:8px;overflow:hidden;padding:2px}',
        '#hz5kl .logo-icon img{width:100%;height:100%;object-fit:cover}',
        '#hz5kl .nav-links{display:flex;gap:22px;align-items:center}',
        '#hz5kl .nav-links a{color:rgba(255,255,255,.9);text-decoration:none;font-size:15px;transition:color .2s,transform .2s}',
        '#hz5kl .nav-links a:hover{color:#fff;transform:translateY(-1px)}',
        '#hz5kl .nav-links a.active{color:#fff;font-weight:bold}',
        '#hz5kl .dropbtn{background:none;border:none;color:rgba(255,255,255,.9);font-size:15px;cursor:pointer;padding:0;display:flex;align-items:center;gap:6px;transition:color .2s}',
        '#hz5kl .dropbtn:hover{color:#fff}',
        '#hz5kl .dropdown{position:relative;display:inline-block}',
        '#hz5kl .dropdown-content{display:none;position:absolute;top:100%;left:0;background:#fff;min-width:170px;box-shadow:0 8px 16px rgba(0,0,0,.15);z-index:200;border-radius:8px;margin-top:8px;padding:8px 0}',
        '#hz5kl .dropdown-content.show{display:block}',
        '#hz5kl .dropdown-content a{color:#333;padding:10px 16px;text-decoration:none;display:block;font-size:14px;transition:all .2s}',
        '#hz5kl .dropdown-content a:hover{background:rgba(76,175,80,.1);color:#4caf50;padding-left:20px}',
        '#hz5kl .head-space{flex:1}',
        '#hz5kl .search{height:36px;width:280px;background:rgba(255,255,255,.2);border-radius:18px;display:flex;align-items:center;padding:0 16px}',
        '#hz5kl .search input{background:transparent;border:none;outline:none;color:#fff;width:100%;font-size:14px}',
        '#hz5kl .search input::placeholder{color:rgba(255,255,255,.7)}',
        '#hz5kl .btn{background:#fff;color:#4caf50;padding:8px 16px;border:none;border-radius:18px;cursor:pointer;text-decoration:none;font-size:14px;font-weight:500}',
        '#hz5kl .btn:hover{background:rgba(255,255,255,.9)}',
        '#hz5kl .icon-btn{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.9);cursor:pointer;transition:all .2s;margin-left:12px;position:relative}',
        '#hz5kl .icon-btn:hover{background:rgba(255,255,255,.2);transform:scale(1.1)}',
        '#hz5kl .fa-solid{font-size:22px}',
        '#hz5kl .notify-badge{position:absolute;top:-6px;right:-6px;background:#e53935;color:#fff;font-size:11px;border-radius:50%;min-width:18px;height:18px;line-height:18px;text-align:center;padding:0 4px}',
        '#hz5kl .user-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;cursor:pointer}',
        '#hz5kl .user-avatar img{width:100%;height:100%;object-fit:cover}',
        '@keyframes headerSlideDown{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}'
    ];

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS.join('');
        (document.head || document.documentElement).appendChild(style);
    }

    // ---------- 当前路径 → 搜索目标 + 占位文案 ----------
    function searchContext() {
        var p = (window.location.pathname || '').toLowerCase();
        if (p.indexOf('/workpool') === 0) {
            return { action: '/workpool', placeholder: '搜索作品名称/作者/标签' };
        }
        if (p.indexOf('/forum') === 0) {
            return { action: '/forum', placeholder: '搜索帖子' };
        }
        return { action: '/mk/' + (window.MKH_MARKET || 'kn'), placeholder: '搜索插件名称/标签' };
    }

    // ---------- 构建 HTML ----------
    function esc(s) {
        return (s == null) ? '' : String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function render(data) {
        var markets = data.markets || {};
        var current = data.current_market || 'kn';
        var user = data.user;
        var unread = data.unread_count || 0;
        var sc = searchContext();

        var nav = [];
        nav.push('<a href="/mk/' + esc(current) + '">首页</a>');
        nav.push('<a href="https://pan1.pgrm.run">我的存储</a>');
        nav.push('<a href="/workpool">作品池</a>');
        nav.push('<a href="/dev/' + esc(current) + '">开发者中心</a>');
        nav.push('<a href="/app/' + esc(current) + '/d">应用下载</a>');

        // 插件市场下拉
        var dd = [];
        dd.push('<button class="dropbtn">插件市场 \u25BC</button>');
        dd.push('<div class="dropdown-content">');
        Object.keys(markets).forEach(function (mid) {
            dd.push('<a class="mdui-ripple" href="/mk/' + esc(mid) + '">' + esc(markets[mid]) + '</a>');
        });
        dd.push('</div>');
        nav.push('<div class="dropdown">' + dd.join('') + '</div>');

        // 已登录额外链接
        if (user) {
            nav.push('<a href="/mk/' + esc(current) + '/upload">上传插件</a>');
            nav.push('<a href="/mk/' + esc(current) + '/developer/stats">我的统计</a>');
            if (user.is_admin) {
                nav.push('<a href="/mk/' + esc(current) + '/admin">后台管理</a>');
            }
        }

        var right = [];
        // 搜索框
        right.push('<form class="search" action="' + esc(sc.action) + '" method="get">');
        right.push('<input name="search" placeholder="' + esc(sc.placeholder) + '">');
        right.push('</form>');
        right.push('<div class="head-space"></div>');

        if (user) {
            right.push('<div class="icon-btn" title="通知" onclick="location.href=\'/messages\'"><i class="fa-solid fa-bell"></i>' +
                (unread > 0 ? '<span class="notify-badge">' + (unread > 99 ? '99+' : unread) + '</span>' : '') +
                '</div>');
            var avatar = '';
            if (user.qq) {
                avatar = '<img src="https://q1.qlogo.cn/g?b=qq&nk=' + esc(user.qq) + '&s=100" alt="头像">';
            } else if (user.username) {
                avatar = esc(user.username.charAt(0).toUpperCase());
            }
            right.push('<div class="dropdown">');
            right.push('<div class="user-avatar" title="' + esc(user.username) + '">' + avatar + '</div>');
            right.push('<div class="dropdown-content">');
            right.push('<a href="/u/' + esc(user.username) + '">我的主页</a>');
            right.push('<a href="/workpool/my">我的作品</a>');
            if (user.is_admin) right.push('<a href="/forum/admin/boards">板块管理</a>');
            right.push('<a href="/change_password">修改密码</a>');
            right.push('<a href="/logout">退出登录</a>');
            right.push('</div>');
            right.push('</div>');
        } else {
            right.push('<a href="/login" class="btn">登录</a>');
        }

        var html = '<div class="wrap">' +
            '<div class="logo"><div class="logo-icon"><img src="/mk/kn/uploads/kn.png" alt="Logo"></div>菠菜面</div>' +
            '<div class="nav-links">' + nav.join('') + '</div>' +
            right.join('') +
            '</div>';
        return html;
    }

    // ---------- 绑定事件 ----------
    function bindDropdown(headerEl) {
        var dropdowns = headerEl.querySelectorAll('.dropdown');
        dropdowns.forEach(function (dd) {
            var trigger = dd.querySelector('.dropbtn') || dd.querySelector('.user-avatar');
            var content = dd.querySelector('.dropdown-content');
            if (!trigger || !content) return;
            trigger.addEventListener('click', function (e) {
                e.stopPropagation();
                content.classList.toggle('show');
            });
            content.addEventListener('click', function (e) { e.stopPropagation(); });
        });
        document.addEventListener('click', function () {
            headerEl.querySelectorAll('.dropdown-content').forEach(function (c) { c.classList.remove('show'); });
        });
    }

    function bindSearch() {
        // 搜索框已在渲染 HTML 中；回车由表单提交，无需额外绑定
    }

    // ---------- 主入口 ----------
    function init() {
        injectStyle();
        var headerEl = document.getElementById(HEADER_ID);
        if (!headerEl) {
            // 容错：若模板缺少占位则自动创建
            headerEl = document.createElement('header');
            headerEl.id = HEADER_ID;
            document.body && document.body.insertBefore(headerEl, document.body.firstChild);
        }

        fetch(DATA_URL, { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : { markets: {}, current_market: 'kn', user: null, unread_count: 0 }; })
            .then(function (data) {
                headerEl.innerHTML = render(data);
                bindDropdown(headerEl);
                bindSearch();
            })
            .catch(function () {
                // 失败时渲染一个最小的占位，保证导航可用
                headerEl.innerHTML = '<div class="wrap"><div class="logo"><div class="logo-icon"><img src="/mk/kn/uploads/kn.png" alt="Logo"></div>菠菜面</div><div class="nav-links"><a href="/mk/kn">首页</a><a href="/workpool">作品池</a><a href="/forum">论坛</a><a href="/login" class="btn">登录</a></div></div>';
                bindDropdown(headerEl);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
