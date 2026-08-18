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
            '<a class="logo-text" href="/">KNHX</a>' +
            '<div class="nav-menu">' + navHtml + '</div>' +
            '<div class="header-right">' +
                '<a class="login-btn" href="/login">登录</a>' +
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
                                '<a href="/u/' + data.username + '">我的主页</a>' +
                                '<a href="/workpool/my">我的作品</a>' +
                                '<a href="/messages">消息中心</a>' +
                                '<a href="/change_password">修改密码</a>' +
                                '<a href="/logout">退出登录</a>' +
                            '</div>' +
                        '</div>';
                    }
                }
            })
            .catch(err => console.log('获取用户信息失败:', err));
    }
})();