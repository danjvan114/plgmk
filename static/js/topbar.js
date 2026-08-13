/* 统一顶栏：动态加载 base.html(/topbar) 并注入页面
 * 用法：页面 <body> 开头加 <div id="topbar-app"></div> + 本脚本
 */
(function () {
    'use strict';

    function currentMarketFromPath() {
        var m = location.pathname.match(/^\/mk\/([^/]+)/);
        return m ? m[1] : '';
    }

    function fillSearch() {
        var inp = document.getElementById('tb-search-input');
        if (!inp) return;
        var m = location.search.match(/[?&]search=([^&]*)/);
        if (m) inp.value = decodeURIComponent(m[1].replace(/\+/g, ' '));
    }

    function bindEvents() {
        var userBtn = document.getElementById('tb-user-btn');
        var userMenu = document.getElementById('tb-user-menu');
        if (userBtn && userMenu) {
            userBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                userMenu.classList.toggle('tb-show');
            });
            userMenu.addEventListener('click', function (e) { e.stopPropagation(); });
            document.addEventListener('click', function () { userMenu.classList.remove('tb-show'); });
        }
        var dropBtn = document.querySelector('.tb-dropbtn');
        var dropMenu = dropBtn ? dropBtn.nextElementSibling : null;
        if (dropBtn && dropMenu) {
            dropBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                dropMenu.classList.toggle('tb-show');
            });
            document.addEventListener('click', function () { dropMenu.classList.remove('tb-show'); });
        }
        var form = document.getElementById('tb-search-form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var q = (document.getElementById('tb-search-input').value || '').trim();
                var url = location.pathname;
                if (location.search.indexOf('c=1') >= 0) url += '?c=1';
                if (q) url += (url.indexOf('?') >= 0 ? '&' : '?') + 'search=' + encodeURIComponent(q);
                location.href = url;
            });
        }
        // compact 模式(市场页 c=1)：隐藏部分导航
        if (location.search.indexOf('c=1') >= 0) {
            var hides = document.querySelectorAll('.tb-compact-hide');
            for (var i = 0; i < hides.length; i++) hides[i].style.display = 'none';
        }
    }

    function updateUnread() {
        fetch('/messages/unread', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var b = document.getElementById('tb-unread');
                if (!b) return;
                if (d && d.count > 0) {
                    b.textContent = d.count > 99 ? '99+' : d.count;
                    b.style.display = '';
                } else {
                    b.style.display = 'none';
                }
            })
            .catch(function () { });
    }

    function markActive() {
        var page = '';
        var p = location.pathname;
        if (p.indexOf('/workpool') === 0) page = 'workpool';
        else if (p.indexOf('/forum') === 0) page = 'forum';
        else if (p.indexOf('/messages') === 0 || p.indexOf('/u/') === 0) page = 'user';
        else if (p.indexOf('/mk/') === 0 || p.indexOf('/dev/') === 0) page = 'market';
        var links = document.querySelectorAll('[data-tb-page]');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('data-tb-page') === page) links[i].classList.add('tb-active');
        }
    }

    function ensureFontAwesome() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for (var i = 0; i < links.length; i++) {
            if (links[i].href && links[i].href.indexOf('fontawesome') >= 0) return;
        }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/@fortawesome/fontawesome-free@6.5.2/css/all.min.css';
        document.head.appendChild(link);
    }

    function loadTopbar() {
        var host = document.getElementById('topbar-app');
        if (!host) {
            host = document.createElement('div');
            host.id = 'topbar-app';
            document.body.insertBefore(host, document.body.firstChild);
        }
        if (host.getAttribute('data-loaded') === '1') { bindEvents(); return; }
        ensureFontAwesome();
        fetch('/topbar', { credentials: 'same-origin' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                host.innerHTML = html;
                host.setAttribute('data-loaded', '1');
                fillSearch();
                bindEvents();
                markActive();
                updateUnread();
                setInterval(updateUnread, 30000);
            })
            .catch(function () { });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTopbar);
    } else {
        loadTopbar();
    }
})();