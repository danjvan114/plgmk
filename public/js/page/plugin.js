(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const pluginId = (location.pathname.match(/^\/plugin\/(\d+)/) || [])[1];

  async function main() {
    await App.ready;
    if (!pluginId) {
      location.href = '/market';
      return;
    }
    let p;
    try {
      const data = await App.get('/api/market/plugins/' + pluginId);
      p = data.plugin;
    } catch (e) {
      view.innerHTML = `<div class="empty-tip"><div class="material-icons icon">error_outline</div>${A(e.message || '插件不存在')}</div>`;
      return;
    }
    render(p);
  }

  function render(p) {
    const me = App.state.me;
    const mine = me && (me.username === p.author || me.isAdmin);
    const actions = [];
    actions.push(`
      <button type="button" class="btn primary" id="btnDownload"><span class="material-icons" style="font-size:18px">download</span>${p.source === 'external' ? '前往下载' : '下载插件'}</button>
      <a id="btnLike" href="javascript:;"><button type="button" class="ke-iconbtn" aria-label="${p.liked ? 'favorite' : 'favorite_border'}"><span class="material-icons">${p.liked ? 'favorite' : 'favorite_border'}</span></button></a>`);
    if (me) {
      actions.push(`<a id="btnCoin" href="javascript:;"><button type="button" class="ke-iconbtn"><span class="material-icons">paid</span></button></a>`);
    }
    if (mine) {
      actions.push(`<a href="/plugin/${p.id}/edit"><button type="button" class="btn outline"><span class="material-icons" style="font-size:18px">edit</span>编辑</button></a>`);
      actions.push(`<button type="button" class="btn tonal" id="btnStatus">${p.status === 'active' ? '下架' : '上架'}</button>`);
      actions.push(`<button type="button" class="btn text" id="btnDel" style="color:#b3261e">删除</button>`);
    }

    const imgs = (p.images || []).filter(Boolean);

    view.innerHTML = `
      <div class="fade-enter">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
          <a href="/market" style="color:var(--mdui-color-primary)"><button type="button" class="btn text"><span class="material-icons" style="font-size:18px">arrow_back</span>插件市场</button></a>
        </div>
        <div style="display:flex;gap:22px;flex-wrap:wrap">
          <div style="flex:1;min-width:300px">
            <div style="display:flex;gap:18px;align-items:flex-start;background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:20px">
              ${App.cards.iconImg(p, 72)}
              <div style="flex:1;min-width:0">
                <h1 style="font-size:22px;margin:0 0 6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                  ${A(p.name)}
                  ${p.status === 'inactive' ? '<span class="chip tonal" style="--mdui-chip-height:22px">已下架</span>' : ''}
                </h1>
                <div style="color:var(--mdui-color-on-surface-variant);font-size:13px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">
                  <span>版本 <b>${A(p.version || '')}</b></span>
                  <span>更新于 ${A(App.fmtTime(p.updatedAt))}</span>
                </div>
                <div class="pc-meta" style="margin-top:10px">
                  <a class="user-line" href="${App.userUrl(p.author)}">
                    <img src="${App.urlAvatar({ nickname: p.authorNick, avatar: p.authorAvatar })}" style="width:24px;height:24px;border-radius:50%" onerror="this.style.display='none'">
                    <span>${A(p.authorNick || p.author)} ${App.badgeVerified(p.authorVerified)}</span>
                  </a>
                  ${App.cards.tagChips(p.tags)}
                </div>
              </div>
            </div>

            <div class="section-title"><span class="material-icons" style="font-size:19px;color:var(--mdui-color-primary)">description</span> 插件介绍</div>
            <div class="rich-content markdown-body">${App.renderRich(p.description)}</div>
          </div>

          <div style="width:320px;max-width:100%">
            <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:18px;position:sticky;top:80px">
              <div style="display:flex;gap:22px;margin-bottom:14px;flex-wrap:wrap">
                <div class="stat-chips">
                  <div class="sc"><b>${p.downloadCount || 0}</b><span>下载</span></div>
                  <div class="sc"><b>${p.viewCount || 0}</b><span>浏览</span></div>
                  <div class="sc"><b>${p.likeCount || 0}</b><span>点赞</span></div>
                  <div class="sc"><b>${p.coinCount || 0}</b><span>投币</span></div>
                </div>
              </div>
              <div class="star-row" style="display:flex;align-items:center;gap:6px;margin-bottom:16px">
                ${App.starHtml(p.rating)}
                <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">${Number(p.rating).toFixed(1)} (${p.ratingCount || 0} 人评分)</span>
              </div>
              ${p.source === 'external' ? '<div style="font-size:12px;color:var(--mdui-color-on-surface-variant);margin-bottom:10px">该插件使用外部下载链接，点击按钮将跳转到外部站点。</div>' : (p.fileSize ? `<div style="font-size:12px;color:var(--mdui-color-on-surface-variant);margin-bottom:10px">文件大小 ${A(App.fmtBytes(p.fileSize))} · 文件名 ${A(p.fileName || '')}</div>` : '')}
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">${actions.join('')}</div>
              <div id="rateBox" style="margin-top:12px;border-top:1px solid var(--mdui-color-outline-variant);padding-top:12px">
                <div style="font-size:13px;color:var(--mdui-color-on-surface-variant);margin-bottom:6px">我的评分</div>
                <div id="stars" style="display:flex;gap:2px"></div>
              </div>
            </div>
          </div>
        </div>

        ${imgs.length ? `
        <div class="section-title"><span class="material-icons" style="font-size:19px;color:var(--mdui-color-primary)">photo_library</span> 预览图片</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
          ${imgs.map((u) => `<img src="${A(u)}" style="width:100%;border-radius:12px;border:1px solid var(--mdui-color-outline-variant)" loading="lazy" onclick="window.open('${A(u)}')">`).join('')}
        </div>` : ''}
      </div>`;

    const btnDownload = view.querySelector('#btnDownload');
    btnDownload.addEventListener('click', () => {
      window.open('/api/market/plugins/' + p.id + '/download');
    });
    btnDownload.classList.add('mdui-ripple');

    if (me) {
      view.querySelector('#btnLike').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/market/plugins/${p.id}/like`);
          p.liked = d.liked;
          p.likeCount = d.likeCount;
          const b = view.querySelector('#btnLike mdui-icon-button');
          b.setAttribute('icon', p.liked ? 'favorite' : 'favorite_border');
          view.querySelectorAll('.sc b')[2].textContent = p.likeCount;
        } catch (e) {
          App.toast(e.message);
        }
      });
      view.querySelector('#btnCoin').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/market/plugins/${p.id}/coin`);
          App.toast('投币成功');
          p.coinCount = d.coinCount;
          view.querySelectorAll('.sc b')[3].textContent = p.coinCount;
        } catch (e) {
          App.toast(e.message);
        }
      });
    } else {
      view.querySelector('#btnLike').addEventListener('click', () => { location.href = '/login'; });
    }

    drawStars(p.myRating || 0);
    function drawStars(cur) {
      const box = view.querySelector('#stars');
      box.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ke-iconbtn';
        b.style.color = '#f5a623';
        b.innerHTML = '<span class="material-icons">' + (i <= cur ? 'star' : 'star_outline') + '</span>';
        b.addEventListener('click', async () => {
          if (!me) {
            location.href = '/login';
            return;
          }
          try {
            const d = await App.post(`/api/market/plugins/${p.id}/rate`, { score: i });
            p.rating = d.rating;
            p.ratingCount = d.ratingCount;
            p.myRating = i;
            App.toast('评分成功');
            drawStars(i);
            view.querySelector('.star-row span').textContent = `${Number(p.rating).toFixed(1)} (${p.ratingCount} 人评分)`;
            view.querySelector('.star-row').innerHTML = App.starHtml(p.rating) + view.querySelector('.star-row span').outerHTML;
          } catch (e) {
            App.toast(e.message);
          }
        });
        box.appendChild(b);
      }
    }

    if (mine) {
      view.querySelector('#btnStatus').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/market/plugins/${p.id}/status`, { status: p.status === 'active' ? 'inactive' : 'active' });
          App.toast(d.status === 'active' ? '已上架' : '已下架');
          location.reload();
        } catch (e) {
          App.toast(e.message);
        }
      });
      view.querySelector('#btnDel').addEventListener('click', () => {
        App.confirmDialog('确定删除插件《' + p.name + '》？此操作不可恢复。', async () => {
          try {
            await App.post(`/api/market/plugins/${p.id}/delete`);
            App.toast('已删除');
            location.href = '/market';
          } catch (e) {
            App.toast(e.message);
          }
        }, { title: '删除插件', danger: true });
      });
    }
  }

  main();
})();
