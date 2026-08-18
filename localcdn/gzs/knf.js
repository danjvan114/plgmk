// 全站统一顶栏导航
(function() {
    const style = document.createElement('style');
    style.textContent = `
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
            display: block;
            padding: 10px 16px;
            color: #333;
            text-decoration: none;
            font-size: 14px;
        }
        .header-dropdown-content a:hover {
            background-color: #f5f5f5;
        }
        .header-dropdown:hover .header-dropdown-content {
            display: block;
        }
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
    function csResolve(map, folder, ver, keys) {
        const file = csPick(map, keys);
        if (!file) return Promise.resolve('');
        const base = '/localcdn/gzs/cs/' + folder + '/';
        if (/\.ani$/i.test(file)) {
            return fetch(base + file + '?v=' + ver, { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
                .then(function (buf) {
                    if (!buf) return '';
                    const frames = csParseAni(buf);
                    if (!frames.length) return '';
                    const c = csCurUrl(frames[0].data);
                    return "url('" + c.url + "') " + c.hx + ' ' + c.hy;
                })
                .catch(function () { return ''; });
        }
        return Promise.resolve("url('" + base + file + '?v=' + ver + "')");
    }
    function csThemeVars(map, folder, ver, cb) {
        const roles = [['cursor', ['pointer']], ['link', ['link']], ['text', ['text']], ['move', ['move']], ['unavail', ['unavailiable', 'unavailable']]];
        const out = {};
        const jobs = roles.map(function (r) {
            return csResolve(map, folder, ver, r[1]).then(function (v) { out[r[0]] = v; });
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
                let css = 'html,body{'
                    + '--cs-cursor:' + (L.cursor || 'auto') + ';'
                    + '--cs-link:' + (L.link || 'pointer') + ';'
                    + '--cs-text:' + (L.text || 'text') + ';'
                    + '--cs-move:' + (L.move || 'move') + ';'
                    + '--cs-unavail:' + (L.unavail || 'not-allowed') + ';}';
                css += 'body.dark-mode,body.theme-dark{'
                    + '--cs-cursor:' + (D.cursor || 'auto') + ';'
                    + '--cs-link:' + (D.link || 'pointer') + ';'
                    + '--cs-text:' + (D.text || 'text') + ';'
                    + '--cs-move:' + (D.move || 'move') + ';'
                    + '--cs-unavail:' + (D.unavail || 'not-allowed') + ';}';
                css += 'html,body,body *{cursor:var(--cs-cursor),auto !important;}';
                css += 'a,button,[onclick],[role="button"],[role="menuitem"],[role="link"],input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"],summary,label,.btn,.badge-btn,.glass-btn,.icon-btn,.lang-item,.qr-tab,.tp-item,.ft-tab,.carousel-nav,.carousel-dots button,.cr-tab,.dl-m-btn,.dl-col,.ext-install,.fl-link,.st-col,.stack-card,.feat-panel,.dot,.m-back-btn,.m-dl-btn,.m-dl-tool,.qr-modal-close,.nav-links a,.nav-more-btn,.mk-pop-btn,.mk-menu-item,.mk-sort-btn,.mk-filter-btn,.mk-card,.mk-dl,.mk-view,.mk-login,.mk-pg-btn,.mk-cat-btn,.mk-tab,.user-avatar,.mdui-tab-item,.gallery-image,.st-nav-btn,.look-perf,#backTop{cursor:var(--cs-link),pointer !important;}';
                css += 'input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="email"],input[type="password"],input[type="number"],textarea,select,[contenteditable="true"]{cursor:var(--cs-text),text !important;}';
                css += '[draggable="true"],[data-cursor="move"]{cursor:var(--cs-move),move !important;}';
                css += '[disabled],:disabled,[aria-disabled="true"]{cursor:var(--cs-unavail),not-allowed !important;}';
                const st = document.createElement('style');
                st.textContent = css;
                document.head.appendChild(st);
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
        { text: '首页', href: '/' },
        { text: '发现', href: '/workpool' },
        { text: '工作室', href: '/team' },
        { text: '论坛', href: '/forum' },
        { text: '市场', href: '/mk/kn' }
    ];

    const activeIndex = getActiveIndex();

    // 生成导航菜单HTML
    let navHtml = '';
    navItems.forEach(function(item, idx) {
        const activeClass = idx === activeIndex ? ' active' : '';
        navHtml += '<a class="mdui-ripple' + activeClass + '" href="' + item.href + '">' + item.text + '</a>';
    });

    const hv2 = document.getElementById('hv2');
    if (hv2) {
        // 渲染基础HTML（未登录状态）
        hv2.innerHTML = '<div class="header-nav">' +
            '<a class="logo-text" href="/">猫的社区</a>' +
            '<div class="nav-menu">' + navHtml + '</div>' +
            '<div class="header-right">' +
                '<a class="login-btn mdui-ripple" href="/login">登录</a>' +
                '<div id="userArea"></div>' +
            '</div>' +
        '</div>';

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
                            '<img class="user-avatar" src="' + avatarUrl + '" alt="' + data.username + '" onerror="this.src=\'/localcdn/gzs/default-avatar.png\'">' +
                            '<div class="header-dropdown-content">' +
                                '<a class="mdui-ripple" href="/u/' + data.username + '">我的主页</a>' +
                                '<a class="mdui-ripple" href="/workpool/my">我的作品</a>' +
                                '<a class="mdui-ripple" href="/messages">消息中心</a>' +
                                '<a class="mdui-ripple" href="/change_password">修改密码</a>' +
                                '<a class="mdui-ripple" href="/logout">退出登录</a>' +
                            '</div>' +
                        '</div>';
                    }
                }
            })
            .catch(err => console.log('获取用户信息失败:', err));
    }
})();