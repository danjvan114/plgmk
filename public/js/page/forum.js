(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const pathBoard = (location.pathname.match(/^\/forum\/(\d+)/) || [])[1] ? Number((location.pathname.match(/^\/forum\/(\d+)/) || [])[1]) : 0;

  async function main() {
    await App.ready;
    const page = Number(App.qs.page) || 1;
    try {
      const [boards, listData] = await Promise.all([
        App.get('/api/forum/boards'),
        loadPosts(pathBoard, page)
      ]);
      render(boards.boards, listData);
    } catch (e) {
      view.innerHTML = `<div class="empty-tip">${A(e.message || '加载失败')}</div>`;
    }
  }

  async function loadPosts(board, page) {
    const q = new URLSearchParams();
    if (board) q.set('board', String(board));
    if (App.qs.keyword) q.set('keyword', App.qs.keyword);
    if (App.qs.sort && App.qs.sort !== 'newest') q.set('sort', App.qs.sort);
    q.set('page', String(page));
    q.set('size', '20');
    return App.get('/api/forum/posts?' + q.toString());
  }

  function render(boards, listData) {
    const board = pathBoard;
    const cur = boards.find((b) => b.id === board);
    const isAll = !board;
    const sortVal = App.qs.sort || 'newest';

    view.innerHTML = `
      <div class="page-title">
        <div><h1>${cur ? A(cur.name) : '论坛'}</h1>
        <div class="sub">${cur ? A(cur.description) : '交流插件开发、使用心得，互相帮助'}</div></div>
        <a href="/post/new${board ? '?board=' + board : ''}"><button type="button" class="btn primary"><span class="material-icons" style="font-size:18px">edit_square</span>发帖</button></a>
      </div>
      <div class="board-grid">${boards.map((b) => `
        <div class="board-card ${b.id === board ? 'selected' : ''}" onclick="location.href='/forum/${b.id}'" style="${b.id === board ? 'outline:2px solid var(--mdui-color-primary)' : ''}">
          <div class="board-icon" style="background:${A(b.color || '#6750a4')}"><span class="material-icons">${A(b.icon || 'forum')}</span></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600">${A(b.name)} ${b.id === board ? '(当前)' : ''}</div>
            <div style="font-size:12px;color:var(--mdui-color-on-surface-variant);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${A(b.description || '')}</div>
          </div>
          <div style="font-size:12px;color:var(--mdui-color-on-surface-variant);flex:none;text-align:right">${b.postCount}<br>主题</div>
        </div>`).join('') || '<div class="empty-tip">暂无板块</div>'}
      </div>
      ${!cur ? `<div style="color:var(--mdui-color-primary);font-size:13px;margin-bottom:10px;cursor:pointer" onclick="location.href='/forum'">全部板块 ›</div>` : ''}
      <div class="toolbar">
        <div class="grow">
          <div class="section-title" style="margin:0">${isAll ? '全部主题' : '主题列表'}</div>
        </div>
        <div class="seg-group" data-value="${App.qs.sort || 'newest'}" id="sortGroup" value="${App.qs.sort || 'newest'}">
          <button type="button" class="seg-item" data-value="newest">最新</button>
          <button type="button" class="seg-item" data-value="hot">最热</button>
          <button type="button" class="seg-item" data-value="reply">回复多</button>
        </div>
      </div>
      <div id="listBox" style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;overflow:hidden"></div>`;

    const sortGroup = view.querySelector('#sortGroup');
    sortGroup.querySelectorAll('.seg-item').forEach((item) => {
      item.addEventListener('click', () => {
        sortGroup.querySelectorAll('.seg-item').forEach((s) => s.classList.remove('active'));
        item.classList.add('active');
        goPage(1, item.dataset.value || 'newest');
      });
    });

    drawList(listData);

    function goPage(page, sort) {
      const q = new URLSearchParams();
      if (pathBoard) q.set('board', String(pathBoard));
      const sortVal = sort || App.qs.sort || 'newest';
      if (sortVal !== 'newest') q.set('sort', sortVal);
      if (page > 1) q.set('page', String(page));
      location.href = (pathBoard ? '/forum/' + pathBoard : '/forum') + (q.toString() ? '?' + q.toString() : '');
    }
  }

  function drawList(data) {
    const box = view.querySelector('#listBox');
    if (!data.items.length) {
      box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">forum</div>还没有帖子，来发第一帖吧</div>`;
      return;
    }
    box.innerHTML = data.items.map(App.cards.postRow).join('');
    box.appendChild(App.pagination(data, (pg) => {
      const q = new URLSearchParams();
      if (pathBoard) q.set('board', String(pathBoard));
      const sortVal = App.qs.sort || 'newest';
      if (sortVal !== 'newest') q.set('sort', sortVal);
      if (pg > 1) q.set('page', String(pg));
      location.href = (pathBoard ? '/forum/' + pathBoard : '/forum') + (q.toString() ? '?' + q.toString() : '');
    }));
  }

  main();
})();
