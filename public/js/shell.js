(function () {
  'use strict';

  function renderRich(text) {
    let s = App.esc(text || '');
    s = s.replace(/```([\s\S]*?)```/g, (m, c) => '<pre class="code-pre" style="overflow-x:auto">' + c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>');
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, t, u) => `<a href="${u}" target="_blank" rel="noopener" style="color:var(--mdui-color-primary)">${t}</a>`);
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--mdui-color-primary)">$1</a>');
    s = s.replace(/@([^\s@<>"'，。！？、:：;；]+)/g, (m, name) => {
      const u = App.mentionMap.get(name.toLowerCase());
      if (u) return '<a href="/u/' + encodeURIComponent(u) + '" style="color:var(--mdui-color-primary);font-weight:600">' + m + '</a>';
      return m;
    });
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  const NAVS = [
    { key: 'home', href: '/', icon: 'home', label: '首页' },
    { key: 'market', href: '/market', icon: 'extension', label: '插件市场' },
    { key: 'forum', href: '/forum', icon: 'forum', label: '论坛' },
    { key: 'workpool', href: '/workpool', icon: 'rocket_launch', label: '作品池' },
    { key: 'team', href: '/team', icon: 'groups', label: '团队' }
  ];

  const App = window.App;
  App.renderRich = renderRich;
  App.state = { me: null, unread: 0 };

  let chromeRoot = null;
  let activePage = '';

  function activeFromPath() {
    const path = location.pathname;
    if (path === '/' || path === '') return 'home';
    if (path.startsWith('/market') || path.startsWith('/plugin') || path.startsWith('/upload') || path.startsWith('/dev')) return 'market';
    if (path.startsWith('/forum') || path.startsWith('/post')) return 'forum';
    if (path.startsWith('/workpool') || path.startsWith('/work')) return 'workpool';
    if (path.startsWith('/team')) return 'team';
    if (path.startsWith('/admin')) return 'admin';
    return '';
  }

  function roleLabel(me) {
    if (me.isOwner || me.isSuper) return '<span class="role-badge super">超级管理员</span>';
    if (me.isAdmin) return '<span class="role-badge admin">管理员</span>';
    return '';
  }

  function avatarBtnHtml(me) {
    return `<img src="${App.esc(App.urlAvatar(me))}" alt="">`;
  }

  function chromeHtml() {
    const nav = NAVS.map((n) => `<a class="ke-navlink mdui-ripple mdui-ripple-blue ${n.key === activePage ? 'active' : ''}" data-key="${n.key}" href="${n.href}"><span class="material-icons">${n.icon}</span>${n.label}</a>`).join('');
    return `
<div class="ke-topbar">
  <div class="ke-topbar-inner">
    <button class="ke-iconbtn mdui-ripple mdui-ripple-blue" id="btnNav" aria-label="菜单"><span class="material-icons">menu</span></button>
    <a href="/" class="ke-brand"><img src="/uploads/kn.png" alt="">KE Hub</a>
    <nav class="ke-navlinks">${nav}</nav>
    <div class="ke-topbar-right">
      <a href="/download" class="ke-download-btn mdui-ripple mdui-ripple-blue" title="下载编辑器 KN Expanse"><span class="material-icons">download</span><span class="dl-label">KN Expanse</span></a>
      <div class="ke-userarea" id="userArea"></div>
    </div>
  </div>
</div>
<div class="drawer-mask" id="drawerMask"></div>
<aside class="ke-drawer" id="navDrawer">
  <div class="drawer-head"><img src="/uploads/kn.png" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover"> KE Hub</div>
  <div class="drawer-links">${NAVS.map((n) => `<a class="drawer-link ${n.key === activePage ? 'active' : ''}" href="${n.href}"><span class="material-icons">${n.icon}</span>${n.label}</a>`).join('')}
    <a class="drawer-link" href="/docs"><span class="material-icons">menu_book</span>开发者文档</a>
    <a class="drawer-link" href="/download"><span class="material-icons">download</span>编辑器下载</a>
  </div>
</aside>`;
  }

  // ── 用户区 ────────────────────────────────────────────────────────────
  // 约定（不再用 class 控制显示/隐藏）：
  //   显示 = 立刻创建并插入整个 .menu-pop 元素
  //   隐藏 = 直接把整个元素 remove() 掉
  //   按钮状态（登录态 / 头像 / 未读数 / 菜单开合）变化 = 重新绘制按钮
  let userMenuEl = null;
  let drawnUnread = -1;

  function msgDotHtml() {
    const n = App.state.unread;
    if (!(n > 0)) return '<span id="msgDot" class="ke-dot hidden">0</span>';
    return '<span id="msgDot" class="ke-dot">' + (n > 99 ? '99+' : String(n)) + '</span>';
  }

  function userAreaHtml() {
    const me = App.state.me;
    if (!me) return '<a href="/login"><button class="btn primary">登录</button></a>';
    const open = !!userMenuEl;
    return `
  <button class="ke-iconbtn mdui-ripple mdui-ripple-blue" id="btnMsg" aria-label="消息"><span class="material-icons">notifications</span>${msgDotHtml()}</button>
  <button class="ke-avatar-btn mdui-ripple mdui-ripple-blue${open ? ' is-open' : ''}" id="btnUser" aria-haspopup="true" aria-expanded="${open ? 'true' : 'false'}">${avatarBtnHtml(me)}</button>`;
  }

  // 按钮状态一变就整颗重建：DOM、事件、水波纹绑定一起重生
  function renderUserBtn() {
    const el = document.getElementById('userArea');
    if (!el) return;
    const oldUser = el.querySelector('#btnUser');
    el.innerHTML = userAreaHtml();
    const msg = el.querySelector('#btnMsg');
    const user = el.querySelector('#btnUser');
    if (msg) msg.addEventListener('click', () => openMessages());
    if (user) user.addEventListener('click', (e) => { e.stopPropagation(); openUserMenu(user); });
    // 把正在播放的水波纹搬到新按钮上，避免重绘把动画拦腰截断
    if (oldUser && user) {
      oldUser.querySelectorAll('.mdui-ripple-wave').forEach((w) => user.insertBefore(w, user.firstChild));
    }
    if (window.MDURipple) window.MDURipple.scan(el);
    drawnUnread = App.state.unread;
  }

  function userMenuHtml(me) {
    return `
    <div style="padding:10px 12px 8px;border-bottom:1px solid var(--border)">
      <div style="font-weight:700;display:flex;align-items:center;gap:8px">${App.esc(me.nickname || me.username)} ${App.badgeVerified(me.verified)} ${roleLabel(me)}</div>
    </div>
    <button class="menu-item mdui-ripple mdui-ripple-blue" data-v="profile"><span class="material-icons">person</span>我的主页</button>
    <button class="menu-item mdui-ripple mdui-ripple-blue" data-v="dev"><span class="material-icons">code</span>开发者中心</button>
    <button class="menu-item mdui-ripple mdui-ripple-blue" data-v="upload"><span class="material-icons">upload_file</span>上传插件</button>
    <button class="menu-item mdui-ripple mdui-ripple-blue" data-v="works"><span class="material-icons">cloud_upload</span>发布作品</button>
    ${me.isAdmin ? `<button class="menu-item mdui-ripple mdui-ripple-blue" data-v="admin"><span class="material-icons">shield</span>管理后台</button>` : ''}
    <button class="menu-item mdui-ripple mdui-ripple-blue" data-v="logout"><span class="material-icons">logout</span>退出登录</button>`;
  }

  // 隐藏：直接把整个元素删掉
  function dropUserMenu() {
    if (!userMenuEl) return false;
    userMenuEl.remove();
    userMenuEl = null;
    return true;
  }

  function closeUserMenu() {
    if (dropUserMenu()) renderUserBtn();
  }

  // 显示：马上绘制整个元素并插入
  function openUserMenu(anchor) {
    const me = App.state.me;
    if (!me) return;
    if (userMenuEl) { closeUserMenu(); return; } // 已打开 → 直接删掉（收起）
    const menu = document.createElement('div');
    menu.className = 'menu-pop open';
    menu.id = 'userMenu';
    menu.innerHTML = userMenuHtml(me);
    document.body.appendChild(menu);
    userMenuEl = menu;

    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = menu.offsetWidth || 200;
    let left = r.right - w;
    if (left < 8) left = 8;
    if (left + w > vw - 8) left = vw - w - 8;
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.left = left + 'px';

    if (window.MDURipple) window.MDURipple.scan(menu);
    menu.querySelectorAll('.menu-item').forEach((it) => {
      it.addEventListener('click', () => {
        closeUserMenu();
        const v = it.getAttribute('data-v');
        if (v === 'profile') location.href = '/u/' + encodeURIComponent(me.username);
        else if (v === 'dev') location.href = '/dev';
        else if (v === 'upload') location.href = '/upload';
        else if (v === 'works') location.href = '/workpool/publish';
        else if (v === 'admin') location.href = '/admin';
        else if (v === 'logout') doLogout();
      });
    });
    renderUserBtn(); // 展开态变了 → 重新绘制按钮
  }

  // 点了别处 / Esc / 窗口尺寸变化 → 直接删掉菜单
  document.addEventListener('click', (e) => {
    if (!userMenuEl) return;
    if (userMenuEl.contains(e.target)) return;
    const b = document.getElementById('btnUser');
    if (b && (b === e.target || b.contains(e.target))) return;
    closeUserMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeUserMenu(); });
  window.addEventListener('resize', closeUserMenu);

  function renderUserArea() {
    dropUserMenu();
    renderUserBtn();
  }

  function updateMsgDot() {
    if (App.state.unread === drawnUnread) return;
    renderUserBtn(); // 未读数变化 → 重新绘制按钮
  }

  async function doLogout() {
    dropUserMenu();
    App.state.me = null;
    renderUserBtn();
    try { await App.post('/api/auth/logout'); } catch (e) { /* ignore */ }
    location.href = '/';
  }

  async function openMessages() {
    let data;
    try { data = await App.get('/api/messages'); }
    catch (e) { App.toast('消息加载失败'); return; }
    if (data.unread > 0) {
      try { await App.post('/api/messages/read'); } catch (e) { /* ignore */ }
      App.state.unread = 0;
      updateMsgDot();
    }
    const overlay = document.createElement('div');
    overlay.className = 'ke-overlay';
    const box = document.createElement('div');
    box.className = 'ke-dialog ke-msg-dialog';
    box.innerHTML = `
      <div class="ke-dialog-head" style="display:flex;align-items:center;gap:8px">
        <span class="material-icons" style="font-size:20px">notifications</span>消息通知
        <span style="flex:1"></span>
        <button type="button" class="btn sm tonal" id="msgAllRead"><span class="material-icons" style="font-size:16px">done_all</span>全部已读</button>
      </div>
      <div class="ke-dialog-body" id="msgList" style="max-height:62vh;overflow:auto;padding:4px 0"></div>
      <div class="ke-dialog-actions"><button class="btn tonal" id="msgClose">关闭</button></div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    box.querySelector('#msgClose').addEventListener('click', () => overlay.remove());
    const listEl = box.querySelector('#msgList');

    function render() {
      if (!data.items.length) { listEl.innerHTML = '<div class="empty-tip">暂无消息</div>'; return; }
      listEl.innerHTML = data.items.map((m) => {
        const icon = m.type === 'comment' ? 'comment' : m.type === 'follow' ? 'favorite' : m.type === 'invite' || m.type === 'team' ? 'groups' : m.type === 'mention' ? 'alternate_email' : m.type === 'announce' ? 'campaign' : 'notifications';
        const link = m.link || (m.type === 'announce' ? '/' : '');
        const rowCls = 'ke-msg-item' + (m.isRead ? '' : ' unread') + (m.type === 'mention' ? ' mention' : '');
        const inner = `
          <span class="ke-msg-dot ${m.isRead ? 'read' : 'unread'}"></span>
          <span class="ke-msg-ico"><span class="material-icons" style="font-size:18px">${icon}</span></span>
          <div class="ke-msg-body">
            <div class="ke-msg-text">${m.type === 'mention' ? '<span class="ke-mention-at">@</span>' : ''}${App.renderRich(m.text)}</div>
            <div class="ke-msg-time">${App.timeAgo(m.createdAt)}</div>
          </div>
          ${link ? '<span class="ke-msg-arrow material-icons">chevron_right</span>' : ''}`;
        return link
          ? `<a class="${rowCls}" href="${App.esc(link)}" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;color:inherit;text-decoration:none" onclick="event.stopPropagation()">${inner}</a>`
          : `<div class="${rowCls}" style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px">${inner}</div>`;
      }).join('');
    }
    render();

    box.querySelector('#msgAllRead').addEventListener('click', async () => {
      try {
        await App.post('/api/messages/read');
        data.items.forEach((m) => { m.isRead = 1; });
        App.state.unread = 0;
        updateMsgDot();
        render();
        App.toast('已全部标为已读');
      } catch (e) { App.toast(e.message); }
    });
  }

  function renderChrome() {
    activePage = activeFromPath();
    const host = document.getElementById('app-shell');
    if (!host) return;
    dropUserMenu();
    chromeRoot = host;
    host.innerHTML = chromeHtml();
    host.querySelector('#btnNav').addEventListener('click', () => toggleDrawer(true));
    host.querySelector('#drawerMask').addEventListener('click', () => toggleDrawer(false));
    renderUserArea();
    requestAnimationFrame(() => { if (window.MDURipple) window.MDURipple.scan(host); });
  }

  function toggleDrawer(open) {
    const drawer = document.getElementById('navDrawer');
    const mask = document.getElementById('drawerMask');
    if (!drawer || !mask) return;
    drawer.classList.toggle('open', open);
    mask.classList.toggle('open', open);
  }

  let patrolTimer = null;
  async function patrol() {
    if (!App.state.me) return;
    let r;
    try { r = await App.get('/api/auth/check'); } catch (e) { return; }
    if (!r.valid) {
      App.state.me = null;
      App.toast('登录状态已失效，请重新登录');
      setTimeout(() => { location.href = '/login'; }, 900);
    }
  }
  function startPatrol() {
    if (patrolTimer) return;
    patrolTimer = setInterval(patrol, 30000); // 风控：每 30s 校验一次 sso attoken
    document.addEventListener('visibilitychange', () => { if (!document.hidden) patrol(); });
    patrol(); // 启动后立即校验一次，免得登录态失效要等一个间隔才被发现
  }

  async function boot() {
    try {
      const h = await App.get('/api/header');
      App.state.me = h.user || null;
      App.state.unread = h.unread || 0;
    } catch (e) {
      App.state.me = null;
    }
    renderFooter();
    renderChrome();
    startPatrol();
    return App.state;
  }

  function renderFooter() {
    if (document.getElementById('keFooter')) return;
    const f = document.createElement('footer');
    f.id = 'keFooter';
    f.className = 'ke-footer';
    f.innerHTML = `
      <div class="ke-footer-inner">
        <div class="ke-footer-col">
          <h4>KE Hub</h4>
          <p>KE 社区 · 插件市场 / 论坛 / 作品池 / 团队 一站式入口</p>
          <p style="opacity:.7">上传/评论/回复 全部走真实持久化</p>
        </div>
        <div class="ke-footer-col">
          <h4>创作</h4>
          <a href="/market">插件市场</a>
          <a href="/forum">论坛</a>
          <a href="/workpool">作品池</a>
          <a href="/team">团队</a>
        </div>
        <div class="ke-footer-col">
          <h4>工具</h4>
          <a href="/download">编辑器下载 (KN Expanse)</a>
          <a href="/docs">开发者文档</a>
          ${App.state.me && App.state.me.isAdmin ? '<a href="/admin">管理后台</a>' : ''}
        </div>
        <div class="ke-footer-col">
          <h4>关于</h4>
          <p style="opacity:.7">KE 官方团队由站点维护者运营</p>
          <p style="opacity:.6">© KE Hub · 由本地 Node.js 驱动</p>
        </div>
      </div>`;
    document.body.appendChild(f);
  }

  App.ready = boot();
})();
