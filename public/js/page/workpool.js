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

    // 上传按钮 href 根据登录态决定
    view.querySelector('#uploadLink').href = App.state.me ? '/workpool/publish' : '/login';

    // 搜索框初始值
    view.querySelector('#kw').value = state.keyword;

    // 类型筛选按钮 active 状态
    const typeGroup = view.querySelector('#typeGroup');
    typeGroup.querySelectorAll('.ke-filter-btn').forEach((item) => {
      if (state.types.indexOf(item.dataset.value) >= 0) item.classList.add('active');
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

    // sort seg-group 初始化 active 状态和 change 事件
    const sortGroup = view.querySelector('#sortGroup');
    sortGroup.dataset.value = state.sort;
    sortGroup.setAttribute('value', state.sort);
    sortGroup.querySelectorAll('.seg-item').forEach((item) => {
      if (item.dataset.value === state.sort) item.classList.add('active');
    });
    sortGroup.addEventListener('change', (e) => {
      state.sort = e.target.value || 'newest';
      state.page = 1;
      goto();
    });

    // 搜索按钮事件
    view.querySelector('#btnSearch').addEventListener('click', () => {
      state.keyword = view.querySelector('#kw').value.trim();
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
