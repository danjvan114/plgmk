// 首页骨架已写入 index.html，此文件只负责填充动态统计数字和热门插件列表
(function () {
  'use strict';

  const App = window.App;

  async function main() {
    await App.ready;
    let stats = { plugins: 0, downloads: 0, works: 0, posts: 0, teams: 0 };
    let hot = [];
    try {
      stats = (await App.get('/api/site/stats')) || stats;
      const d = await App.get('/api/market/plugins?sort=hot&size=6');
      hot = d.items || [];
    } catch (e) { /* ignore */ }

    // 填充统计数字（按卡片顺序：插件、论坛、作品池、团队）
    const statNums = document.querySelectorAll('#homeCards .stat-num');
    const numValues = [
      stats.plugins + ' 个插件',
      stats.posts + ' 篇帖子',
      stats.works + ' 个作品',
      stats.teams + ' 个团队'
    ];
    statNums.forEach((el, i) => { el.textContent = numValues[i] || ''; });

    // 填充累计下载（只有第一张卡片有）
    const hotEl = document.querySelector('#homeCards .stat-hot');
    if (hotEl) hotEl.textContent = '累计下载 ' + stats.downloads;

    // 填充热门插件列表
    const hotList = document.getElementById('hotPlugins');
    if (!hotList) return;
    if (hot.length) {
      hotList.innerHTML = hot.map(App.cards.pluginCard).join('');
    } else {
      hotList.innerHTML = '<div class="empty-tip">还没有插件，来发布第一个吧</div>';
    }

    if (window.MDURipple) window.MDURipple.scan(document.body);
  }

  main();
})();
