(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  function stat(label, v) {
    return `<div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;padding:14px 16px">
      <div style="font-size:22px;font-weight:700">${v}</div>
      <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${label}</div>
    </div>`;
  }

  async function main() {
    await App.ready;
    if (!App.state.me) {
      location.href = '/login';
      return;
    }
    let data;
    try {
      data = await App.get('/api/market/dev/stats');
    } catch (e) {
      view.querySelector('#list').innerHTML = `<div class="empty-tip">${A(e.message || '加载失败')}</div>`;
      return;
    }
    const s = data.summary;

    // 填充开发者信息
    view.querySelector('#devSub').textContent = '@' + App.state.me.username + ' · ' + App.state.me.nickname;

    // 填充统计卡
    view.querySelector('#statsGrid').innerHTML =
      stat('插件总数', s.total) +
      stat('已上架', s.active) +
      stat('累计下载', s.downloads) +
      stat('累计浏览', s.views) +
      stat('累计点赞', s.likes) +
      stat('累计投币', s.coins) +
      stat('平均评分', s.rating ? s.rating.toFixed(2) : '-');

    // 填充插件数量
    view.querySelector('#pluginCount').textContent = data.items.length;

    // 填充插件列表
    const list = view.querySelector('#list');
    const botsArea = view.querySelector('#botsArea');
    if (App.botsManager && botsArea) App.botsManager(botsArea);
    if (!data.items.length) {
      list.innerHTML = `<div class="empty-tip"><div class="material-icons icon">extension_off</div>还没有发布插件</div>`;
      return;
    }
    for (const p of data.items) {
      const row = document.createElement('div');
      row.className = 'plugin-card';
      row.style.cssText += ';flex-direction:row;align-items:center;gap:14px;padding:12px 16px;margin-bottom:10px';
      row.innerHTML = `
        ${App.cards.iconImg(p, 44)}
        <div style="flex:1;min-width:0;cursor:pointer" onclick="location.href='/plugin/${p.id}'">
          <div style="font-weight:600">${A(p.name)} ${p.status === 'active' ? '' : '<span class="chip tonal" style="--mdui-chip-height:20px">已下架</span>'}</div>
          <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">下载 ${p.downloadCount} · 点赞 ${p.likeCount} · 浏览 ${p.viewCount} · 更新于 ${App.fmtTime(p.updatedAt, false)}</div>
        </div>
        <div style="display:flex;gap:4px;flex:none">
          <a href="/plugin/${p.id}/edit"><button type="button" class="btn tonal sm"><span class="material-icons" style="font-size:18px">edit</span>编辑</button></a>
          <button type="button" class="ke-iconbtn" id="del${p.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
        </div>`;
      list.appendChild(row);
      row.querySelector('#del' + p.id).addEventListener('click', () => {
        App.confirmDialog(`确定删除插件《${p.name}》？此操作不可恢复。`, async () => {
          try {
            await App.post('/api/market/plugins/' + p.id + '/delete');
            App.toast('已删除');
            row.remove();
          } catch (e) {
            App.toast(e.message);
          }
        }, { title: '删除插件', danger: true });
      });
    }
  }

  main();
})();
