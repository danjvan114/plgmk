(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  async function main() {
    await App.ready;
    view.innerHTML = `
      <div class="page-title">
        <div><h1>团队</h1><div class="sub">组队协作、共同发布作品</div></div>
        ${App.state.me ? '<button type="button" class="btn primary" id="btnCreate"><span class="material-icons" style="font-size:18px">group_add</span>创建团队</button>' : ''}
      </div>
      <div id="invites"></div>
      <div class="toolbar">
        <input class="text-input grow" type="text" id="kw" placeholder="搜索团队"  >
        <button type="button" class="btn tonal" id="btnSearch"><span class="material-icons" style="font-size:18px">search</span>搜索</button>
      </div>
      <div id="list"><div class="empty-tip"><span class="ke-spinner"></span></div></div>`;

    if (App.state.me) {
      view.querySelector('#btnCreate').addEventListener('click', createDialog);
      loadInvites();
    }
    view.querySelector('#btnSearch').addEventListener('click', () => {
      const kw = view.querySelector('#kw').value.trim();
      location.href = '/team' + (kw ? '?keyword=' + encodeURIComponent(kw) : '');
    });

    async function loadInvites() {
      try {
        const d = await App.get('/api/teams/invites');
        if (!d.items.length) return;
        const box = view.querySelector('#invites');
        box.innerHTML = `<div style="background:var(--mdui-color-secondary-container,#e8def8);border-radius:14px;padding:12px 16px;margin-bottom:16px;font-size:13px">
          ${d.items.map((i) => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
            <span>${A(i.fromNick)} 邀请你加入团队 <b>《${A(i.teamName)}》</b></span>
            <span style="flex:1"></span>
            <button type="button" class="btn primary sm" data-accept="${i.id}">接受</button>
            <button type="button" class="btn text sm" data-reject="${i.id}">拒绝</button>
          </div>`).join('')}</div>`;
        box.querySelectorAll('[data-accept]').forEach((b) =>
          b.addEventListener('click', async () => {
            try {
              const r = await App.post(`/api/teams/invites/${b.dataset.accept}/accept`);
              App.toast('已加入团队');
              location.href = '/team/' + r.teamId;
            } catch (e) { App.toast(e.message); }
          }));
        box.querySelectorAll('[data-reject]').forEach((b) =>
          b.addEventListener('click', async () => {
            try {
              await App.post(`/api/teams/invites/${b.dataset.reject}/reject`);
              App.toast('已拒绝');
              loadInvites();
            } catch (e) { App.toast(e.message); }
          }));
      } catch (e) { /* ignore */ }
    }

    async function loadList() {
      const q = new URLSearchParams();
      if (App.qs.keyword) q.set('keyword', App.qs.keyword);
      const box = view.querySelector('#list');
      try {
        const d = await App.get('/api/teams?' + q.toString());
        if (!d.items.length) {
          box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">groups</div>暂无团队</div>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid-cards';
        grid.innerHTML = d.items.map((t) => `
          <div class="plugin-card mdui-ripple" onclick="location.href='/team/${t.id}'" role="link" tabindex="0"
               onkeydown="if(event.key==='Enter')location.href='/team/${t.id}'">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="badge-square" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00897b,#26a69a);color:#fff"><span class="material-icons">groups</span></div>
              <div style="min-width:0">
                <h3 class="pc-name">${A(t.name)}</h3>
                <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">创建者 ${A(t.ownerNick || t.owner)}</div>
              </div>
            </div>
            <p class="pc-desc">${A((t.description || '').slice(0, 120))}</p>
            <div class="pc-foot">
              <div class="pc-meta" style="gap:14px">
                <span>${t.memberCount} 成员</span><span>${t.workCount} 作品</span><span>${t.postCount} 帖子</span>
              </div>
            </div>
          </div>`).join('');
        box.innerHTML = '';
        box.appendChild(grid);
      } catch (e) {
        box.innerHTML = `<div class="empty-tip">${A(e.message || '加载失败')}</div>`;
      }
    }

    function createDialog() {
      const panel = document.createElement('div');
      panel.innerHTML = `
        <input class="text-input" type="text" id="tName" placeholder="团队名称 *" maxlength="60"  >
        <div style="height:12px"></div>
        <textarea class="textarea-input" id="tDesc" placeholder="团队简介" maxlength="2000"   rows="3"></textarea>
        <div style="height:12px"></div>
        <input class="text-input" type="text" id="tCover" placeholder="封面图片 URL（可填图片直链或 /uploads/...，留空则使用默认）"  >
        <div style="height:12px"></div>
        <input class="text-input" type="text" id="tTags" placeholder="标签（可选）" >`;
      App.dialog({
        headline: '创建团队',
        body: panel,
        actions: [
          { text: '取消' },
          {
            text: '创建',
            onClick: async () => {
              const name = panel.querySelector('#tName').value.trim();
              if (!name) {
                App.toast('请填写团队名称');
                return false;
              }
              try {
                const d = await App.post('/api/teams', {
                  name,
                  description: panel.querySelector('#tDesc').value,
                  cover: panel.querySelector('#tCover').value.trim(),
                  tags: panel.querySelector('#tTags').value
                });
                App.toast('创建成功');
                location.href = '/team/' + d.team.id;
                return false;
              } catch (e) {
                App.toast(e.message);
                return false;
              }
            }
          }
        ]
      });
    }

    loadList();
  }

  main();
})();
