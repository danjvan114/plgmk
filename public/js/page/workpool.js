(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  const state = {
    types: App.qs.type ? App.qs.type.split(',') : [],
    sort: App.qs.sort || 'newest',
    keyword: App.qs.keyword || '',
    page: Number(App.qs.page) || 1
  };

  async function main() {
    await App.ready;
    view.innerHTML = `
      <div class="page-title">
        <div><h1>作品池</h1><div class="sub">分享你的 bcmkn / 图片 / 外链作品</div></div>
        <a href="${App.state.me ? '/workpool/publish' : '/login'}"><button type="button" class="btn primary"><span class="material-icons" style="font-size:18px">add_circle</span>发布作品</button></a>
      </div>
      <div class="toolbar">
        <input class="text-input grow" type="text" id="kw" placeholder="搜索作品"   value="${A(state.keyword)}">
        <button type="button" class="btn tonal" id="btnSearch"><span class="material-icons" style="font-size:18px">search</span>搜索</button>
        <div class="grow"></div>
        <div class="ke-filter-group" id="typeGroup">
          <button type="button" class="ke-filter-btn${state.types.indexOf('player') >= 0 ? ' active' : ''}" data-value="player">作品文件</button>
          <button type="button" class="ke-filter-btn${state.types.indexOf('img') >= 0 ? ' active' : ''}" data-value="img">图片</button>
          <button type="button" class="ke-filter-btn${state.types.indexOf('redirect') >= 0 ? ' active' : ''}" data-value="redirect">跳转外链</button>
        </div>
        <div class="seg-group" data-value="${state.sort}" id="sortGroup" value="${state.sort}">
          <button type="button" class="seg-item" data-value="newest">最新</button>
          <button type="button" class="seg-item" data-value="hot">最热</button>
          <button type="button" class="seg-item" data-value="like">点赞多</button>
        </div>
      </div>
      <div id="list"><div class="empty-tip"><span class="ke-spinner"></span></div></div>`;

    view.querySelector('#btnSearch').addEventListener('click', () => {
      state.keyword = view.querySelector('#kw').value.trim();
      state.page = 1;
      goto();
    });
    view.querySelector('#typeGroup').querySelectorAll('.ke-filter-btn').forEach((item) => {
      item.addEventListener('click', () => {
        const v = item.getAttribute('data-value');
        const i = state.types.indexOf(v);
        if (i >= 0) state.types.splice(i, 1);
        else state.types.push(v);
        item.classList.toggle('active');
        state.page = 1;
        goto();
      });
    });
    view.querySelector('#sortGroup').addEventListener('change', (e) => {
      state.sort = e.target.value || 'newest';
      state.page = 1;
      goto();
    });

    function goto() {
      const q = new URLSearchParams();
      if (state.types.length) q.set('type', state.types.join(','));
      if (state.sort !== 'newest') q.set('sort', state.sort);
      if (state.keyword) q.set('keyword', state.keyword);
      if (state.page > 1) q.set('page', String(state.page));
      history.replaceState(null, '', '/workpool' + (q.toString() ? '?' + q.toString() : ''));
      loadList();
    }

    async function loadList() {
      const q = new URLSearchParams();
      if (state.types.length) q.set('type', state.types.join(','));
      if (state.sort !== 'newest') q.set('sort', state.sort);
      if (state.keyword) q.set('keyword', state.keyword);
      q.set('page', String(state.page));
      q.set('size', '24');
      const box = view.querySelector('#list');
      try {
        const d = await App.get('/api/works?' + q.toString());
        if (!d.items.length) {
          box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">palette_outlined</div>暂无作品</div>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid-cards';
        grid.innerHTML = d.items.map(App.cards.workCard).join('');
        box.innerHTML = '';
        box.appendChild(grid);
        box.appendChild(App.pagination(d, (pg) => { state.page = pg; goto(); }));
        window.scrollTo({ top: 0 });
      } catch (e) {
        box.innerHTML = `<div class="empty-tip">${A(e.message || '加载失败')}</div>`;
      }
    }

    loadList();
  }

  main();
})();
