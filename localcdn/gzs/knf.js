// 全站统一顶栏导航
(function() {
    const style = document.createElement('style');
    style.textContent = `
        /* 隐藏滚动条 */
        ::-webkit-scrollbar {
            display: none;
        }
        html {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        
    
    
    
    
    
    
    
        .header-nav {
            background-color: #5BAF5E;
            display: flex;
            align-items: center;
            padding: 0 20px;
            height: 56px;
            width: 100%;
            position: relative;
            z-index: 100;
        }
        .logo-text {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
        }
        .nav-menu {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: 24px;
        }
        .nav-menu a {
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        .nav-menu a:hover {
            background-color: rgba(255,255,255,0.2);
        }
        .nav-menu a.active {
            background-color: #b3e29d;
            color: #2d5a2f;
        }
        .header-right {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.8);
            cursor: pointer;
        }
        .user-avatar:hover {
            border-color: #fff;
        }
        .login-btn {
            color: #ffffff;
            text-decoration: none;
            font-size: 14px;
            padding: 6px 16px;
            border: 1px solid rgba(255,255,255,0.6);
            border-radius: 4px;
        }
        .login-btn:hover {
            background-color: rgba(255,255,255,0.2);
        }
        .header-dropdown {
            position: relative;
        }
        .header-dropdown-content {
            display: none;
            position: absolute;
            right: 0;
            top: 100%;
            background: #fff;
            min-width: 160px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 4px;
            overflow: hidden;
            z-index: 1000;
        }
        .header-dropdown-content a {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 16px; color: #333; text-decoration: none; font-size: 14px;
        }
        .header-dropdown-content a:hover {
            background-color: #f5f5f5;
        }
        .header-dropdown:hover .header-dropdown-content,
        .header-dropdown.open .header-dropdown-content {
            display: block;
        }
        .sd-head { display: none; }
        .sd-overlay { display: none; }
        /* ===== 移动端适配(APP 风格) ===== */
        .mob-search { display: none; }
        .knf-tabbar { display: none; }
        /* 注入元素自带轻量涟漪(不依赖 mdui) */
        .knf-rpl { position: relative; overflow: hidden; }
        .knf-rpl-wave {
            position: absolute; border-radius: 50%; pointer-events: none;
            background: rgba(255,255,255,.35); transform: scale(0); opacity: .9;
            transition: transform .55s ease-out, opacity .55s ease-out;
        }
        .knf-rpl-wave.done { transform: scale(1); opacity: 0; }
        .av-wrp { display: inline-block; border-radius: 50%; line-height: 0; }
        @media (max-width: 640px) {
            .header-nav { padding: 0 8px; height: 52px; }
            .logo-text { display: none; }
            .nav-menu { display: none; }
            body {
                padding-bottom: 54px;
                padding-bottom: calc(54px + env(safe-area-inset-bottom));
                background-attachment: scroll !important;
            }
            body.page-enter { animation: none !important; }
            .header-right { margin-left: 0; flex: 1; gap: 8px; }
            .mob-search {
                display: flex; flex: 1; min-width: 0; height: 34px; align-items: center;
                background: rgba(255,255,255,.2); border-radius: 17px; padding: 0 4px 0 2px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.08);
            }
            .mob-search-scope {
                border: none; background: transparent; color: #fff; font-size: 12px; font-weight: 700;
                padding: 0 7px; cursor: pointer; white-space: nowrap; height: 100%; border-radius: 15px 0 0 15px;
            }
            .mob-search-scope:active { background: rgba(255,255,255,.16); }
            .mob-search-div { width: 1px; height: 18px; background: rgba(255,255,255,.35); flex: none; }
            .mob-search-input {
                flex: 1; min-width: 0; background: transparent; border: none; outline: none;
                color: #fff; font-size: 13px; height: 100%; padding: 0 8px;
            }
            .mob-search-input::placeholder { color: rgba(255,255,255,.65); }
            .mob-search-go {
                flex: none; width: 28px; height: 28px; border: none; border-radius: 50%;
                background: transparent; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
            }
            .mob-search-go:active { background: rgba(255,255,255,.18); }
            .knf-tabbar {
                position: fixed; left: 0; right: 0; bottom: 0; z-index: 2000;
                display: flex; height: 54px; padding-bottom: 0;
                height: calc(54px + env(safe-area-inset-bottom));
                padding-bottom: env(safe-area-inset-bottom);
                background: #5BAF5E; box-shadow: 0 -2px 10px rgba(0,0,0,.18);
                touch-action: manipulation;
            }
            .knf-tabbar a {
                flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
                color: rgba(255,255,255,.88); text-decoration: none; font-size: 11px; font-weight: 600;
                gap: 3px; letter-spacing: .5px; -webkit-tap-highlight-color: transparent;
            }
            .knf-tabbar a.active { color: #fff; font-weight: 800; background: rgba(255,255,255,.14); }
            .knf-tabbar a i.material-icons { font-size: 21px; line-height: 1; }
            .header-dropdown-content {
                display: block;
                position: fixed; top: 0; right: 0; bottom: 0;
                width: 260px; min-width: 260px;
                transform: translateX(100%);
                transition: transform .28s ease;
                border-radius: 0;
                box-shadow: -4px 0 24px rgba(0,0,0,.22);
                background: #fff;
                z-index: 2100;
                padding-top: env(safe-area-inset-top);
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            .header-dropdown.open .header-dropdown-content { transform: translateX(0); }
            .header-dropdown-content::before {
                content: '';
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,.45);
                z-index: -1;
            }
.header-dropdown-content a { padding: 14px 20px; font-size: 15px; }
            .header-dropdown-content a:active { background-color: #f0f0f0; }
            .sd-head {
                display: flex; align-items: center; gap: 12px;
                padding: 18px 20px 14px; border-bottom: 1px solid #eee;
            }
            .sd-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
            .sd-name { font-size: 16px; font-weight: 700; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .sd-overlay {
                display: block;
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,.45);
                z-index: 2099;
                opacity: 0; pointer-events: none;
                transition: opacity .25s ease;
            }
            .header-dropdown.open .sd-overlay { opacity: 1; pointer-events: auto; }
        }
            .header-dropdown.open .sd-overlay { opacity: 1; pointer-events: auto; }
    `;
    document.head.appendChild(style);

    // 自定义鼠标指针:自动读取各主题 int.inf,支持 .ani(运行时解析成浏览器可用光标)
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
    // 动态光标动画管理器
    const csAnimManager = {
        timers: {},
        currentFrame: {},
        
        start: function(role, frames) {
            if (!frames || frames.length <= 1) return;
            
            const self = this;
            let idx = 0;
            
            // 清理旧的定时器
            if (this.timers[role]) {
                clearInterval(this.timers[role]);
            }
            
            // 为所有帧创建 URL（如果还没创建的话）
            frames.forEach(function(f) {
                if (!f.url) {
                    const c = csCurUrl(f.data);
                    f.url = c.url;
                    f.hx = c.hx;
                    f.hy = c.hy;
                }
            });
            
            // 设置初始帧
            this.currentFrame[role] = 0;
            this.updateCSS(role, frames[0]);
            
            // 启动动画循环
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
            if (this.timers[role]) {
                clearInterval(this.timers[role]);
                delete this.timers[role];
            }
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
            return csResolve(map, folder, ver, r[1]).then(function (v) {
                out[r[0]] = v;
            });
        });
        Promise.all(jobs).then(function () { cb(out); });
    }
    Promise.all([
        fetch('/localcdn/gzs/cs/' + csFolders.light + '/int.inf', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
        fetch('/localcdn/gzs/cs/' + csFolders.dark + '/int.inf', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; })
    ]).then(function (res) {
        const lightTxt = res[0], darkTxt = res[1];
        csThemeVars(csParseInf(lightTxt), csFolders.light, csHash(lightTxt), function (L) {
            csThemeVars(csParseInf(darkTxt), csFolders.dark, csHash(darkTxt), function (D) {
                // 处理亮色主题光标
                const lightVars = {};
                const darkVars = {};
                const lightAniFrames = {};
                const darkAniFrames = {};
                
                ['cursor', 'link', 'text', 'move', 'unavail'].forEach(function(role) {
                    // 亮色主题
                    if (L[role] && L[role].type === 'ani') {
                        const firstFrame = csCurUrl(L[role].frames[0].data);
                        lightVars[role] = "url('" + firstFrame.url + "') " + firstFrame.hx + ' ' + firstFrame.hy;
                        lightAniFrames[role] = L[role].frames;
                    } else if (L[role] && L[role].type === 'static') {
                        lightVars[role] = L[role].url;
                    } else {
                        lightVars[role] = (role === 'cursor' ? 'auto' : role === 'link' ? 'pointer' : role === 'text' ? 'text' : role === 'move' ? 'move' : 'not-allowed');
                    }
                    
                    // 暗色主题
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
                
                // 启动动态光标动画
                ['cursor', 'link', 'text', 'move', 'unavail'].forEach(function(role) {
                    if (lightAniFrames[role] && lightAniFrames[role].length > 1) {
                        csAnimManager.start(role, lightAniFrames[role]);
                    }
                });
            });
        });
    });

    // 根据当前URL确定高亮项
    function getActiveIndex() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index') return 0;
        if (path.startsWith('/workpool')) return 1;
        if (path.startsWith('/team')) return 2;
        if (path.startsWith('/forum')) return 3;
        if (path.startsWith('/mk/')) return 4;
        return -1;
    }

    const navItems = [
        { text: '首页', href: '/', icon: 'home' },
        { text: '发现', href: '/workpool', icon: 'explore' },
        { text: '工作室', href: '/team', icon: 'business_center' },
        { text: '论坛', href: '/forum', icon: 'forum' },
        { text: '市场', href: '/mk/kn', icon: 'storefront' }
    ];

    // 注入 Material Icons 图标库
    if (!document.querySelector('link[href*="material-icons"]')) {
        var iconLink = document.createElement('link');
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://cdn.jsdelivr.net/npm/material-icons@1.0.0/iconfont/material-icons.min.css';
        document.head.appendChild(iconLink);
    }

    const activeIndex = getActiveIndex();

    // 生成导航菜单HTML
    let navHtml = '';
    navItems.forEach(function(item, idx) {
        const activeClass = idx === activeIndex ? ' active' : '';
        navHtml += '<a class="knf-rpl' + activeClass + '" href="' + item.href + '">' + item.text + '</a>';
    });

    const hv2 = document.getElementById('hv2');
    if (hv2) {
        // 渲染基础HTML（未登录状态）
        hv2.innerHTML = '<div class="header-nav">' +
            '<a class="logo-text" href="/">猫的社区</a>' +
            '<div class="nav-menu">' + navHtml + '</div>' +
            '<div class="header-right">' +
                '<a class="login-btn knf-rpl" href="/login">登录</a>' +
                '<div id="userArea"></div>' +
                '<div class="mob-search">' +
                    '<button class="mob-search-scope" type="button">帖子</button>' +
                    '<span class="mob-search-div"></span>' +
                    '<input class="mob-search-input" type="search" placeholder="搜索帖子 / 作品 / 插件" autocomplete="off">' +
                    '<button class="mob-search-go" type="button" aria-label="搜索">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';

        // 移动端搜索:帖子 / 作品 / 插件 范围切换
        var scopes = [
            { name: '帖子', url: '/forum?q=' },
            { name: '作品', url: '/workpool?search=' },
            { name: '插件', url: '/mk/kn?search=' }
        ];
        var scopeBtn = hv2.querySelector('.mob-search-scope');
        var scopeInput = hv2.querySelector('.mob-search-input');
        var scopeGo = hv2.querySelector('.mob-search-go');
        var scopeIdx = 0;
        if (scopeBtn && scopeInput && scopeGo) {
            scopeBtn.addEventListener('click', function () {
                scopeIdx = (scopeIdx + 1) % scopes.length;
                scopeBtn.textContent = scopes[scopeIdx].name;
                scopeInput.placeholder = '搜索' + scopes[scopeIdx].name;
            });
            function mobSearchGo() {
                var v = scopeInput.value.trim();
                if (!v) { scopeInput.focus(); return; }
                location.href = scopes[scopeIdx].url + encodeURIComponent(v);
            }
            scopeGo.addEventListener('click', mobSearchGo);
            scopeInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') mobSearchGo();
            });
        }

        // 移动端底部导航栏(统一 JS 绘制)
        var tabbar = document.createElement('nav');
        tabbar.className = 'knf-tabbar';
        tabbar.innerHTML = navItems.map(function (item, idx) {
            return '<a class="knf-rpl" href="' + item.href + '"><i class="material-icons">' + item.icon + '</i><span>' + item.text + '</span></a>';
        }).join('');
        document.body.appendChild(tabbar);
        var tbActive = tabbar.querySelector('a:nth-child(' + (activeIndex + 1) + ')');
        if (tbActive) tbActive.className = 'active';

        // 注入元素涟漪:pointerdown 委托,轻量 transform 动画
        document.addEventListener('pointerdown', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('.knf-rpl') : null;
            if (!el) return;
            var rect = el.getBoundingClientRect();
            if (!rect.width) return;
            var wave = document.createElement('span');
            wave.className = 'knf-rpl-wave';
            var d = Math.max(rect.width, rect.height) * 2.2;
            wave.style.width = d + 'px';
            wave.style.height = d + 'px';
            wave.style.left = (e.clientX - rect.left - d / 2) + 'px';
            wave.style.top = (e.clientY - rect.top - d / 2) + 'px';
            if (el.closest('.header-dropdown-content')) wave.style.background = 'rgba(0,0,0,.08)';
            el.appendChild(wave);
            requestAnimationFrame(function () { wave.classList.add('done'); });
            setTimeout(function () { if (wave.parentNode) wave.parentNode.removeChild(wave); }, 700);
        });

        // 通过API检查登录状态
        fetch('/api/user/current?t=' + Date.now())
            .then(res => res.json())
            .then(data => {
                if (data.logged_in) {
                    const avatarUrl = data.avatar || (data.qq ? 'https://q1.qlogo.cn/g?b=qq&nk=' + data.qq + '&s=100' : '/localcdn/gzs/default-avatar.png');
                    const userArea = document.getElementById('userArea');
                    const loginBtn = document.querySelector('.login-btn');
                    
                    // 隐藏登录按钮
                    if (loginBtn) loginBtn.style.display = 'none';
                    
                    // 显示头像和下拉菜单
                    if (userArea) {
                        userArea.innerHTML = '<div class="header-dropdown">' +
                            '<div class="sd-overlay"></div>' +
                            '<span class="knf-rpl av-wrp"><img class="user-avatar" src="' + avatarUrl + '" alt="' + data.username + '" onerror="this.src=\'/localcdn/gzs/default-avatar.png\'"></span>' +
                            '<div class="header-dropdown-content">' +
                                '<div class="sd-head"><img class="sd-avatar" src="' + avatarUrl + '" alt="' + data.username + '" onerror="this.src=\'/localcdn/gzs/default-avatar.png\'"><span class="sd-name">' + data.username + '</span></div>' +
                                '<a class="knf-rpl" href="/workbench"><i class="material-icons">dashboard</i>工作台</a>' +
                                '<a class="knf-rpl" href="/u/' + data.username + '"><i class="material-icons">person</i>我的主页</a>' +
                                '<a class="knf-rpl" href="/workpool/my"><i class="material-icons">work</i>我的作品</a>' +
                                '<a class="knf-rpl" href="/messages"><i class="material-icons">mail</i>消息中心</a>' +
                                '<a class="knf-rpl" href="/change_password"><i class="material-icons">lock</i>修改密码</a>' +
                                '<a class="knf-rpl" href="/logout"><i class="material-icons">logout</i>退出登录</a>' +
                            '</div>' +
                        '</div>';
                    }

                    // 触屏设备点头像切换下拉菜单(点击他处关闭)
                    var drop = document.querySelector('.header-dropdown');
                    if (drop) {
                        drop.addEventListener('click', function (e) {
                            e.stopPropagation();
                            var c = this.querySelector('.header-dropdown-content');
                            if (c) this.classList.toggle('open');
                        });
                    }
                    document.addEventListener('click', function (e) {
                        var c = document.querySelector('.header-dropdown');
                        if (!c) return;
                        if (e.target === c.querySelector('.sd-overlay')) { c.classList.remove('open'); return; }
                        if (c.classList.contains('open') && !c.contains(e.target)) c.classList.remove('open');
                    });
                }
            })
            .catch(err => console.log('获取用户信息失败:', err));
    }
})();