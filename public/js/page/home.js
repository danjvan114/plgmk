(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  async function main() {
    await App.ready;
    let stats = { plugins: 0, downloads: 0, works: 0, posts: 0, teams: 0 };
    let hot = [];
    try {
      stats = (await App.get('/api/site/stats')) || stats;
      const d = await App.get('/api/market/plugins?sort=hot&size=6');
      hot = d.items || [];
    } catch (e) { /* ignore */ }

    const cards = [
      { href: '/market', icon: 'extension', color: '#6750a4', name: '插件市场', desc: '浏览、下载与分享 KE 插件', num: stats.plugins + ' 个插件', hot: '累计下载 ' + stats.downloads },
      { href: '/forum', icon: 'forum', color: '#0b6bcb', name: '论坛', desc: '交流开发经验、求助答疑、站务公告', num: stats.posts + ' 篇帖子', hot: '' },
      { href: '/workpool', icon: 'rocket_launch', color: '#c62828', name: '作品池', desc: '发布你的 bcmkn / 图片 / 外链作品', num: stats.works + ' 个作品', hot: '' },
      { href: '/team', icon: 'groups', color: '#00897b', name: '团队', desc: '组队协作，一起做点有意思的事', num: stats.teams + ' 个团队', hot: '' }
    ];

    view.innerHTML = `
      <div class="fade-enter">
        <div style="position:relative;border-radius:20px;overflow:hidden;background:linear-gradient(120deg,#1c1b2e,#3f2f6e 55%,#5b3fa8);color:#fff;padding:36px 32px;display:flex;gap:22px;align-items:center;flex-wrap:wrap;box-shadow:0 16px 40px rgba(0,0,0,.18)">
          <img src="/uploads/kn.png" alt="" style="height:96px;width:96px;border-radius:20px;object-fit:cover;box-shadow:0 8px 24px rgba(0,0,0,.4)">
          <div style="flex:1;min-width:260px">
            <div style="font-size:34px;font-weight:800;letter-spacing:.5px;color:#fff">KE Hub</div>
            <div style="opacity:1;color:#e9ecff;margin-top:6px;font-size:14px;font-weight:500">KE 社区 · 插件市场 / 论坛 / 作品池 / 团队 一站式入口</div>
          </div>
          <div style="display:flex;gap:10px">
            <a href="/market"><button type="button" class="btn primary" style="background:#ffffff;color:#1c1b2e;border:none;font-weight:700">进入插件市场</button></a>
            <a href="/upload"><button type="button" class="btn" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4);font-weight:600">上传插件</button></a>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:18px 0">
          ${cards.map((c) => `
          <a href="${c.href}">
            <div class="plugin-card mdui-ripple" style="height:100%">
              <div style="display:flex;gap:14px;align-items:center">
                <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:${c.color};color:#fff;flex:none"><span class="material-icons">${c.icon}</span></div>
                <div style="min-width:0">
                  <div style="font-weight:700;font-size:17px;color:var(--mdui-color-on-surface)">${c.name}</div>
                  <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${c.num}</div>
                </div>
              </div>
              <p class="pc-desc" style="margin-top:10px">${c.desc}</p>
              ${c.hot ? `<div class="pc-meta">${c.hot}</div>` : ''}
            </div>
          </a>`).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="section-title"><span class="material-icons" style="color:var(--mdui-color-primary)">trending_up</span> 热门插件</div>
          <a href="/market" style="color:var(--mdui-color-primary);font-size:13px">查看全部 ›</a>
        </div>
        <div class="grid-cards">${hot.length ? hot.map(App.cards.pluginCard).join('') : '<div class="empty-tip">还没有插件，来发布第一个吧</div>'}</div>

        <div style="text-align:center;margin:40px 0 10px;color:var(--mdui-color-outline);font-size:13px">
          使用遇到问题？查看 <a href="/docs" style="color:var(--mdui-color-primary)">开发者文档</a> · 需要登录？由 <a href="/login" style="color:var(--mdui-color-primary)">KT 用户中心</a> 统一提供账号
        </div>
      </div>`;
  }

  main();
})();
