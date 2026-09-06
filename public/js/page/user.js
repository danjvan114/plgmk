(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const username = decodeURIComponent((location.pathname.match(/^\/u\/([^/]+)/) || [])[1] || '');

  async function main() {
    await App.ready;
    if (!username) {
      location.href = '/';
      return;
    }
    let p;
    try {
      p = await App.get('/api/users/' + encodeURIComponent(username));
    } catch (e) {
      view.innerHTML = `<div class="empty-tip">${A(e.message || '用户不存在')}</div>`;
      return;
    }
    let hasPending = false;
    if (p.isSelf) {
      try { const md = await App.get('/api/moderation/me'); hasPending = !!(md.hasPendingRequest); } catch (e) {}
    }

    // 跨域拉取用户中心的公开资料（昵称/头像/简介），远端优先、本地兜底。
    // 用户名是隐私，这里只用于反查 uuid，绝不下发给前端展示。
    let remote = null;
    if (p.uuid) {
      const base = p.userCenter || 'https://user.pgrm.top';
      try {
        const r = await fetch(base + '/api/open/public/profile?uuid=' + encodeURIComponent(p.uuid));
        if (r.ok) {
          const j = await r.json();
          if (j && j.code === 200 && j.data) remote = j.data;
        }
      } catch (e) { /* 跨域/网络失败则降级到本地资料 */ }
    }
    const profile = Object.assign({}, p.profile, {
      uuid: p.uuid,
      nickname: (remote && remote.nickname) || p.profile.nickname,
      avatar: (remote && remote.avatar) || p.profile.avatar,
      bio: (remote && remote.bio) || p.profile.bio
    });

    render(Object.assign({}, p, { profile }), hasPending);
  }

  function render(d, hasPending) {
    const me = App.state.me;
    const profile = d.profile;
    const s = d.stats;
    const verified = (d.isSelf && me) ? (me.verified || 0) : (profile.verified || 0);
    const vBadge = verified === 2
      ? '<span class="material-icons" style="color:#1d4ed8;font-size:22px;vertical-align:middle" title="KE官方团队">verified</span>'
      : verified === 1
      ? '<span class="material-icons" style="color:#0284c7;font-size:22px;vertical-align:middle" title="认证UP">verified</span>'
      : '';
    const applyBtn = (d.isSelf && verified === 0)
      ? `<button type="button" class="btn ${hasPending ? 'text' : 'tonal'}" id="btnVerify" ${hasPending ? 'disabled' : ''}>${hasPending ? '审核中' : '申请认证'}</button>`
      : '';

    view.innerHTML = `
      <div class="fade-enter" style="max-width:1000px">
        <div class="profile-head" style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px">
          ${App.avatarImg(profile.avatar, 76)}
          <div class="info">
            <h1>${A(profile.nickname)} ${vBadge}
              ${d.isSelf ? '<span class="chip tonal">我</span>' : ''}
              ${me && me.isAdmin ? '<span class="chip tonal">管理员</span>' : ''}
            </h1>
            ${profile.bio ? `<div class="uname" style="margin-top:2px">${A(profile.bio)}</div>` : ''}
            <div class="stat-chips">
              <div class="sc" id="scFollowers" style="cursor:${s.followers ? 'pointer' : 'default'}"><b>${s.followers}</b><span>粉丝</span></div>
              <div class="sc" id="scFollowing" style="cursor:${s.following ? 'pointer' : 'default'}"><b>${s.following}</b><span>关注</span></div>
              <div class="sc"><b>${s.likes}</b><span>获赞</span></div>
              <div class="sc"><b>${s.works}</b><span>作品</span></div>
              <div class="sc"><b>${s.plugins}</b><span>插件</span></div>
              <div class="sc"><b>${s.posts}</b><span>帖子</span></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex:none">
            ${!d.isSelf && me ? `<button type="button" class="btn tonal" id="btnFollow">${d.following ? '已关注' : '+ 关注'}</button>` : ''}
            ${applyBtn}
            ${d.isSelf ? `
              <a href="/upload"><button type="button" class="btn primary"><span class="material-icons" style="font-size:18px">upload_file</span>上传插件</button></a>
              <a href="/workpool/publish"><button type="button" class="btn tonal"><span class="material-icons" style="font-size:18px">add_circle</span>发布作品</button></a>` : ''}
          </div>
        </div>
        ${d.teams.length ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:center">
          <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">TA 的团队：</span>
          ${d.teams.map((t) => `<a href="/team/${t.id}"><span class="chip tonal">${A(t.name)}</span></a>`).join('')}
        </div>` : ''}
        <div class="tabbar" value="plugins"  style="margin-top:16px"><div class="ke-tabs" data-tabs><button type="button" class="ke-tab active" data-tab="plugins">插件</button><button type="button" class="ke-tab" data-tab="works">作品</button><button type="button" class="ke-tab" data-tab="posts">帖子</button></div><div class="ke-tabpanel" data-panel="plugins"><div id="tPlugins"></div></div><div class="ke-tabpanel" data-panel="works" style="display:none"><div id="tWorks"></div></div><div class="ke-tabpanel" data-panel="posts" style="display:none"><div id="tPosts"></div></div></div>
      </div>`;

    const followBtn = view.querySelector('#btnFollow');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        if (followBtn.dataset.busy) return;
        const willUnfollow = d.following;
        const doIt = async () => {
          followBtn.dataset.busy = '1';
          try {
            const r = await App.post('/api/users/' + encodeURIComponent(username) + '/follow');
            d.following = r.following;
            followBtn.innerHTML = r.following ? '已关注' : '+ 关注';
            followBtn.className = r.following ? 'btn tonal' : 'btn primary';
            App.toast(r.following ? '已关注' : '已取消关注');
          } catch (e) { App.toast(e.message); }
          finally { delete followBtn.dataset.busy; }
        };
        if (willUnfollow) {
          App.confirmDialog('确定取消关注 ' + A(profile.nickname || profile.username) + ' ？', doIt, { title: '取消关注' });
        } else {
          doIt();
        }
      });
    }

    const scF = view.querySelector('#scFollowers');
    if (scF) scF.addEventListener('click', () => openUserList('followers', '粉丝'));
    const scG = view.querySelector('#scFollowing');
    if (scG) scG.addEventListener('click', () => openUserList('following', '关注'));

    const verifyBtn = view.querySelector('#btnVerify');
    if (verifyBtn && !hasPending) {
      verifyBtn.addEventListener('click', () => openApplyDialog(d, function refresh() { render(d, true); }));
    }

    function openApplyDialog(d, refresh) {
      const body = document.createElement('div');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          <button type="button" class="btn tonal" id="appUp"><span class="material-icons" style="font-size:18px">verified</span>申请 UP 主认证</button>
          <button type="button" class="btn tonal" id="appJoin"><span class="material-icons" style="font-size:18px">group_add</span>申请加入 KE 团队</button>
        </div>`;
      App.dialog({
        headline: '认证与团队', body,
        actions: [{ text: '关闭' }]
      });
      body.querySelector('#appUp').addEventListener('click', () => applyUp(refresh));
      body.querySelector('#appJoin').addEventListener('click', () => applyJoin(refresh));
    }

    function applyUp(refresh) {
      const body = document.createElement('div');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <label class="field-label">所在平台</label>
            <select id="upPlatform" class="select-input ke-select" style="width:100%">
              <option value="B站(bilibili)">B站 (bilibili)</option>
              <option value="抖音">抖音</option>
              <option value="快手">快手</option>
              <option value="YouTube">YouTube</option>
              <option value="其它">其它</option>
            </select>
          </div>
          <div>
            <label class="field-label">平台上的名字 / 昵称</label>
            <input id="upName" class="text-input" placeholder="例如：某某UP主" style="width:100%">
          </div>
          <div>
            <label class="field-label">申请理由（介绍一下你和你的创作方向）</label>
            <textarea id="upReason" class="textarea-input" rows="4" placeholder="例如：我长期制作 KN Expanse 图形化编程教程与作品，希望获得认证徽标……" style="width:100%"></textarea>
          </div>
        </div>`;
      App.dialog({
        headline: '申请 UP 主认证', body,
        actions: [
          { text: '取消' },
          { text: '提交申请', onClick: async () => {
            const platform = body.querySelector('#upPlatform').value.trim();
            const upName = body.querySelector('#upName').value.trim();
            const reason = body.querySelector('#upReason').value.trim();
            if (!platform || !upName) { App.toast('请填写平台与UP名字'); return false; }
            if (!reason) { App.toast('请填写申请理由'); return false; }
            try { await App.post('/api/moderation/verify-request', { kind: 'up', platform, upName, reason }); App.toast('已提交 UP 认证申请，等待审核'); refresh && refresh(); } catch (e) { App.toast(e.message); }
            return false;
          } }
        ]
      });
    }

    function applyJoin(refresh) {
      const body = document.createElement('div');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <label class="field-label">加入理由</label>
            <textarea id="joinReason" class="textarea-input" rows="3" placeholder="为什么想加入 KE 团队？" style="width:100%"></textarea>
          </div>
          <div>
            <label class="field-label">你能给团队带来什么</label>
            <textarea id="joinValue" class="textarea-input" rows="4" placeholder="例如：我能持续产出插件、帮忙运营论坛、翻译文档、设计作品封面……" style="width:100%"></textarea>
          </div>
        </div>`;
      App.dialog({
        headline: '申请加入 KE 团队', body,
        actions: [
          { text: '取消' },
          { text: '提交申请', onClick: async () => {
            const reason = body.querySelector('#joinReason').value.trim();
            const value = body.querySelector('#joinValue').value.trim();
            if (!reason) { App.toast('请填写加入理由'); return false; }
            try { await App.post('/api/moderation/verify-request', { kind: 'join', reason, value }); App.toast('已提交加入团队申请，等待审核'); refresh && refresh(); } catch (e) { App.toast(e.message); }
            return false;
          } }
        ]
      });
    }

    async function openUserList(kind, title) {
      let items = [];
      try {
        const r = await App.get('/api/users/' + encodeURIComponent(username) + '/' + kind);
        items = r.items || [];
      } catch (e) { App.toast(e.message); return; }
      const body = document.createElement('div');
      body.style.cssText = 'min-width:320px';
      body.innerHTML = items.length
        ? `<div style="max-height:55vh;overflow:auto">${items.map((u) => `
            <a href="${App.userUrl(u.username)}" style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid var(--mdui-color-outline-variant);text-decoration:none;color:inherit">
              ${App.avatarImg(u.avatar, 36)}
              <div style="flex:1;min-width:0"><div style="font-weight:600">${A(u.nickname || u.username)}</div></div>
            </a>`).join('')}</div>`
        : '<div class="empty-tip">暂无' + title + '</div>';
      App.dialog({ headline: title + ' · ' + profile.nickname, body, actions: [{ text: '关闭' }] });
    }

    loadPlugins(1);
    loadWorks(1);
    loadPosts(1);

    async function loadPlugins(page) {
      const box = view.querySelector('#tPlugins');
      try {
        const d = await App.get(`/api/users/${encodeURIComponent(username)}/plugins?page=${page}&size=12`);
        if (!d.items.length) {
          box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">extension_off</div>暂无插件</div>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid-cards';
        grid.innerHTML = d.items.map(App.cards.pluginCard).join('');
        box.innerHTML = '';
        box.appendChild(grid);
        box.appendChild(App.pagination(d, (pg) => loadPlugins(pg)));
      } catch (e) {
        box.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadWorks(page) {
      const box = view.querySelector('#tWorks');
      try {
        const d = await App.get(`/api/users/${encodeURIComponent(username)}/works?page=${page}&size=12`);
        if (!d.items.length) {
          box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">palette_outlined</div>暂无作品</div>`;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid-cards';
        grid.innerHTML = d.items.map(App.cards.workCard).join('');
        box.innerHTML = '';
        box.appendChild(grid);
        box.appendChild(App.pagination(d, (pg) => loadWorks(pg)));
      } catch (e) {
        box.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadPosts(page) {
      const box = view.querySelector('#tPosts');
      try {
        const d = await App.get(`/api/users/${encodeURIComponent(username)}/posts?page=${page}&size=20`);
        if (!d.items.length) {
          box.innerHTML = `<div class="empty-tip"><div class="material-icons icon">forum</div>暂无帖子</div>`;
          return;
        }
        const list = document.createElement('div');
        list.style.cssText = 'background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;overflow:hidden';
        list.innerHTML = d.items.map((p) => `
          <div class="post-list-item mdui-ripple" onclick="location.href='/post/${p.id}'" role="link" tabindex="0"
               onkeydown="if(event.key==='Enter')location.href='/post/${p.id}'">
            <div class="main">
              <div class="post-title">${A(p.title)}</div>
              <div class="meta"><span>${p.replyCount} 回复</span><span>${p.viewCount} 浏览</span><span>${App.timeAgo(p.createdAt)}</span></div>
            </div>
          </div>`).join('');
        box.innerHTML = '';
        box.appendChild(list);
        box.appendChild(App.pagination(d, (pg) => loadPosts(pg)));
      } catch (e) {
        box.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }
  }

  main();
})();
