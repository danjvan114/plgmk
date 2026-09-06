(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  async function load() {
    App.ready.then(async () => {
      try {
        await render();
      } catch (e) {
        view.innerHTML = `<div class="empty-tip"><div class="material-icons icon">error_outline</div>${A(e.message || '加载失败')}</div>`;
      }
    });
  }

  async function render() {
    const state = {
      keyword: App.qs.keyword || '',
      tags: App.qs.tags ? App.qs.tags.split(',') : (App.qs.tag ? [App.qs.tag] : []),
      sort: App.qs.sort || 'newest',
      page: Number(App.qs.page) || 1
    };

    view.innerHTML = `
      <div class="page-title">
        <div><h1>插件市场</h1><div class="sub">为 KE 而生，发现好插件</div></div>
        <a href="${App.state.me ? '/upload' : '/login'}"><button type="button" class="btn primary"><span class="material-icons" style="font-size:18px">upload_file</span>上传插件</button></a>
      </div>
      <div class="toolbar">
        <input class="text-input grow" type="text" id="kw" placeholder="输入名称 / 作者 / 描述关键字"   clearable="" value="${A(state.keyword)}">
        <button type="button" class="btn tonal" id="btnSearch"><span class="material-icons" style="font-size:18px">search</span>搜索</button>
        <div class="grow"></div>
        <div class="seg-group" data-value="${state.sort}" id="sortGroup" value="${state.sort}">
          <button type="button" class="seg-item" data-value="newest">最新</button>
          <button type="button" class="seg-item" data-value="hot">最热</button>
          <button type="button" class="seg-item" data-value="download">下载</button>
          <button type="button" class="seg-item" data-value="rating">评分</button>
        </div>
      </div>
      <div id="tagRow" style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"></div>
      <div id="listArea"><div class="empty-tip"><span class="ke-spinner lg"></span></div></div>
    `;

    const kw = view.querySelector('#kw');
    view.querySelector('#btnSearch').addEventListener('click', () => {
      state.keyword = kw.value.trim();
      state.page = 1;
      goto();
    });
    kw.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        state.keyword = kw.value.trim();
        state.page = 1;
        goto();
      }
    });
    const sortGroup = view.querySelector('#sortGroup');
    sortGroup.querySelectorAll('.seg-item').forEach((item) => {
      item.addEventListener('click', () => {
        sortGroup.querySelectorAll('.seg-item').forEach((s) => s.classList.remove('active'));
        item.classList.add('active');
        state.sort = item.dataset.value || 'newest';
        state.page = 1;
        goto();
      });
    });

    async function goto() {
      const q = new URLSearchParams();
      if (state.keyword) q.set('keyword', state.keyword);
      if (state.tags.length) q.set('tags', state.tags.join(','));
      if (state.sort !== 'newest') q.set('sort', state.sort);
      if (state.page > 1) q.set('page', String(state.page));
      const target = '/market' + (q.toString() ? '?' + q.toString() : '');
      history.replaceState(null, '', target);
      await fetchList();
    }

    async function fetchList() {
      const q = new URLSearchParams();
      if (state.keyword) q.set('keyword', state.keyword);
      if (state.tags.length) q.set('tags', state.tags.join(','));
      if (state.sort !== 'newest') q.set('sort', state.sort);
      q.set('page', String(state.page));
      q.set('size', '24');
      const area = view.querySelector('#listArea');
      try {
        const data = await App.get('/api/market/plugins?' + q.toString());
        if (!data.items.length) {
          area.innerHTML = `<div class="empty-tip"><div class="material-icons icon">extension_off</div>${state.tags.length ? '该标签下暂无插件' : state.keyword ? '没有找到相关插件' : '还没有插件，来发布第一个吧'}</div>`;
          if (App.state.me) area.innerHTML += `<div style="text-align:center"><a href="/upload"><button type="button" class="btn tonal">去上传</button></a></div>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid-cards';
        grid.innerHTML = data.items.map(App.cards.pluginCard).join('');
        area.innerHTML = '';
        area.appendChild(grid);
        area.appendChild(App.pagination(data, (pg) => { state.page = pg; goto(); }));
        window.scrollTo({ top: 0 });
      } catch (e) {
        area.innerHTML = `<div class="empty-tip">${A(e.message || '加载失败')}</div>`;
      }
    }

    async function loadTags() {
      const row = view.querySelector('#tagRow');
      try {
        const data = await App.get('/api/market/tags');
        if (!data.tags.length) return;
        const head = document.createElement('span');
        head.style.cssText = 'font-size:13px;color:var(--mdui-color-on-surface-variant)';
        head.textContent = '按标签筛选：';
        row.appendChild(head);
        const wrap = document.createElement('div');
        wrap.className = 'ke-filter-group';
        data.tags.forEach((t) => {
          const active = state.tags.indexOf(t.name) >= 0;
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ke-filter-btn' + (active ? ' active' : '');
          b.textContent = '# ' + t.name;
          b.addEventListener('click', () => {
            const i = state.tags.indexOf(t.name);
            if (i >= 0) state.tags.splice(i, 1);
            else state.tags.push(t.name);
            state.page = 1;
            goto();
          });
          wrap.appendChild(b);
        });
        row.appendChild(wrap);
        if (state.tags.length) {
          const clear = document.createElement('a');
          clear.href = 'javascript:;';
          clear.style.cssText = 'font-size:12px;color:var(--mdui-color-primary)';
          clear.textContent = '清除筛选';
          clear.addEventListener('click', () => { state.tags = []; state.page = 1; goto(); });
          row.appendChild(clear);
        }
      } catch (e) {
        row.style.display = 'none';
      }
    }

    await Promise.all([fetchList(), loadTags()]);
  }

  load();
})();
