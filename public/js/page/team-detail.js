(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const teamId = (location.pathname.match(/^\/team\/(\d+)/) || [])[1];

  let data = null;

  async function main() {
    await App.ready;
    if (!teamId) {
      location.href = '/team';
      return;
    }
    try {
      data = await App.get('/api/teams/' + teamId);
      render();
    } catch (e) {
      view.innerHTML = `<div class="empty-tip">${A(e.message || '团队不存在')}</div>`;
    }
  }

  function roleName(r) {
    return { owner: '创建者', admin: '管理员', member: '成员' }[r] || '成员';
  }

  function roleChip(r) {
    const map = { owner: 'filled', admin: 'tonal', member: 'outlined' };
    return `<span class="chip tonal">${roleName(r)}</span>`;
  }

  function render() {
    const t = data.team;
    const me = App.state.me;
    const myRole = data.myRole;
    const canManage = data.isMember && (myRole === 'owner' || myRole === 'admin' || (me && me.isAdmin));
    const isOwner = myRole === 'owner' || (me && me.isAdmin);

    view.innerHTML = `
      <div class="fade-enter" style="max-width:1000px">
        ${t.cover
          ? `<div style="position:relative;height:190px;border-radius:16px;overflow:hidden;margin-bottom:16px;background:#0b1020 url('${A(t.cover)}') center/cover no-repeat">
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.12),rgba(11,16,32,.78))"></div>
              <div style="position:absolute;left:0;right:0;bottom:0;padding:18px 22px;color:#fff">
                <h1 style="margin:0 0 4px;font-size:24px;text-shadow:0 2px 8px rgba(0,0,0,.45)">${A(t.name)}</h1>
                <div style="font-size:13px;opacity:.92;text-shadow:0 1px 6px rgba(0,0,0,.45)">${A((t.description || '').slice(0, 80))}</div>
              </div>
            </div>`
          : `<div style="position:relative;height:120px;border-radius:16px;overflow:hidden;margin-bottom:16px;background:linear-gradient(135deg,#00897b,#26a69a)">
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.28))"></div>
              <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 20px;color:#fff">
                <h1 style="margin:0;font-size:22px;text-shadow:0 2px 8px rgba(0,0,0,.3)">${A(t.name)}</h1>
              </div>
            </div>`}
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:24px;display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
          <div class="badge-square" style="width:76px;height:76px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00897b,#26a69a);color:#fff;font-size:30px"><span class="material-icons">groups</span></div>
          <div style="flex:1;min-width:260px">
            <h1 style="margin:0 0 6px;font-size:22px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">${A(t.name)} ${roleChip(myRole)}</h1>
            <div style="color:var(--mdui-color-on-surface-variant);font-size:13px;margin-bottom:6px">创建者 ${A(t.ownerNick || t.owner)} · ${t.memberCount} 成员 · ${t.workCount} 作品 · ${t.postCount} 帖子</div>
            ${t.tags && t.tags.length ? `<div style="margin:6px 0">${App.cards.tagChips(t.tags, '/team')}</div>` : ''}
            <p style="margin:8px 0 0;line-height:1.7;font-size:14px">${A(t.description || '')}</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex:none">
            ${!data.isMember ? `<button type="button" class="btn primary" id="btnJoin"><span class="material-icons" style="font-size:18px">group_add</span>加入团队</button>` : ''}
            ${data.isMember ? `<button type="button" class="btn text" id="btnLeave" style="color:#b3261e">退出团队</button>` : ''}
            ${canManage ? `<button type="button" class="btn tonal" id="btnInvite"><span class="material-icons" style="font-size:18px">person_add</span>邀请成员</button>
            <button type="button" class="btn tonal" id="btnEdit"><span class="material-icons" style="font-size:18px">edit</span>编辑资料</button>` : ''}
            ${isOwner ? `<button type="button" class="btn text" id="btnDelTeam" style="color:#b3261e"><span class="material-icons" style="font-size:18px">delete_forever</span>解散团队</button>` : ''}
          </div>
        </div>

        <div class="tabbar" value="members"  style="margin-top:18px"><div class="ke-tabs" data-tabs><button type="button" class="ke-tab active" data-tab="members">成员 (${t.memberCount})</button><button type="button" class="ke-tab" data-tab="works">作品 (${t.workCount})</button><button type="button" class="ke-tab" data-tab="posts">帖子 (${t.postCount})</button></div><div class="ke-tabpanel" data-panel="members"><div id="pMembers"></div></div><div class="ke-tabpanel" data-panel="works" style="display:none"><div id="pWorks"></div></div><div class="ke-tabpanel" data-panel="posts" style="display:none"><div id="pPosts"></div></div></div>
      </div>`;

    renderMembers();
    renderWorks();
    renderPosts();

    const joinBtn = view.querySelector('#btnJoin');
    if (joinBtn) {
      joinBtn.addEventListener('click', async () => {
        try {
          await App.post('/api/teams/' + teamId + '/join');
          App.toast('已加入团队');
          location.reload();
        } catch (e) { App.toast(e.message); }
      });
    }
    const leaveBtn = view.querySelector('#btnLeave');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        App.confirmDialog('确定退出该团队？', async () => {
          try {
            await App.post('/api/teams/' + teamId + '/leave');
            App.toast('已退出');
            location.href = '/team';
          } catch (e) { App.toast(e.message); }
        }, { title: '退出团队' });
      });
    }
    if (canManage) {
      view.querySelector('#btnInvite').addEventListener('click', inviteDialog);
      view.querySelector('#btnEdit').addEventListener('click', editDialog);
    }
    if (isOwner) {
      view.querySelector('#btnDelTeam').addEventListener('click', () => {
        App.confirmDialog('确定解散团队？成员与数据都将被清除。', async () => {
          try {
            await App.post('/api/teams/' + teamId + '/delete');
            App.toast('已解散');
            location.href = '/team';
          } catch (e) { App.toast(e.message); }
        }, { title: '解散团队', danger: true });
      });
    }
  }

  function renderMembers() {
    const box = view.querySelector('#pMembers');
    box.innerHTML = data.members.map((m) => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--mdui-color-outline-variant)">
        <img src="${App.urlAvatar({ nickname: m.nickname })}" style="width:40px;height:40px;border-radius:50%" onerror="this.style.display='none'">
        <div style="flex:1;min-width:0">
          <a href="${App.userUrl(m.username)}" style="font-weight:600">${A(m.nickname)}</a>
          <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(m.username)} · ${App.timeAgo(m.joinedAt)}加入</div>
        </div>
        ${roleChip(m.role)}
        ${canRemove(m) ? `<button type="button" class="ke-iconbtn" data-rm="${A(m.username)}" style="color:#b3261e"><span class="material-icons">person_remove</span></button>` : ''}
      </div>`).join('');
    box.querySelectorAll('[data-rm]').forEach((b) => {
      b.addEventListener('click', () => {
        const username = b.dataset.rm;
        App.confirmDialog(`将 ${username} 移出团队？`, async () => {
          try {
            await App.post('/api/teams/' + teamId + '/members/remove', { username });
            App.toast('已移除');
            location.reload();
          } catch (e) { App.toast(e.message); }
        }, { danger: true, title: '移除成员' });
      });
    });
  }

  function canRemove(m) {
    const me = App.state.me;
    if (!me) return false;
    if (me.isAdmin) return m.role !== 'owner';
    const myRole = data.myRole;
    if (myRole === 'owner') return m.role !== 'owner';
    return false;
  }

  function renderWorks() {
    const box = view.querySelector('#pWorks');
    const isMember = data.isMember;
    const works = data.works || [];
    const html = `
      <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">团队内共 ${works.length} 个作品</span>
        ${isMember ? '<button type="button" class="btn tonal" id="btnAddWork"><span class="material-icons" style="font-size:18px">add</span>添加我的作品</button>' : ''}
      </div>
      <div class="grid-cards" id="wGrid">${works.length ? works.map((w) => `
        <div style="position:relative">
          ${App.cards.workCard(w)}
        </div>`).join('') : '<div class="empty-tip" style="grid-column:1/-1">还没有作品</div>'}</div>`;
    box.innerHTML = html;
    const addBtn = view.querySelector('#btnAddWork');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        let mine = [];
        try {
          const d = await App.get('/api/works?author=' + encodeURIComponent(App.state.me.username) + '&size=100');
          mine = d.items;
        } catch (e) { /* ignore */ }
        const panel = document.createElement('div');
        panel.innerHTML = mine.length
          ? `<select class="select-input ke-select" id="pickW" label="选择作品">${mine.map((w) => `<option value="${w.id}">${A(w.title)}</option>`).join('')}</select>`
          : '<div style="padding:14px">你还没有可添加的作品，先去<a href="/workpool/publish" style="color:var(--mdui-color-primary)">发布一个</a>吧</div>';
        App.dialog({
          headline: '添加作品到团队',
          body: panel,
          actions: mine.length ? [
            { text: '取消' },
            {
              text: '添加',
              onClick: async () => {
                try {
                  const r = await App.post('/api/teams/' + teamId + '/works', { workId: panel.querySelector('#pickW').value });
                  App.toast('已添加');
                  location.reload();
                  return false;
                } catch (e) {
                  App.toast(e.message);
                  return false;
                }
              }
            }
          ] : [{ text: '关闭' }]
        });
      });
    }
  }

  function renderPosts() {
    const box = view.querySelector('#pPosts');
    const posts = data.posts || [];
    box.innerHTML = `
      ${data.isMember ? `
      <div style="background:var(--mdui-color-surface-container-low,#f7f7f8);border-radius:14px;padding:14px;margin-bottom:16px">
        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          <input class="text-input" type="text" id="pTitle" placeholder="标题" maxlength="120"  >
          <textarea class="textarea-input" id="pContent" placeholder="内容" maxlength="10000"   rows="4"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px"><button type="button" class="btn primary" id="btnPost"><span class="material-icons" style="font-size:18px">send</span>发布帖子</button></div>
      </div>` : ''}
      ${posts.map((p) => `
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <img src="${App.urlAvatar({ nickname: p.authorNick })}" style="width:30px;height:30px;border-radius:50%" onerror="this.style.display='none'">
            <span style="font-weight:600;font-size:14px">${A(p.authorNick || p.author)}</span>
            <span style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${App.timeAgo(p.createdAt)}</span>
            <span style="flex:1"></span>
            ${canDelPost(p) ? `<button type="button" class="ke-iconbtn" data-pdel="${p.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>` : ''}
          </div>
          <div style="font-weight:600;margin-bottom:4px">${A(p.title)}</div>
          <div class="reply-content">${App.renderRich(p.content)}</div>
        </div>`).join('') || '<div class="empty-tip">还没有帖子</div>'}`;

    const postBtn = view.querySelector('#btnPost');
    if (postBtn) {
      postBtn.addEventListener('click', async () => {
        const title = view.querySelector('#pTitle').value.trim();
        const content = view.querySelector('#pContent').value.trim();
        if (!title || !content) {
          App.toast('请填写标题和内容');
          return;
        }
        App.setBusy(postBtn, true);
        try {
          await App.post('/api/teams/' + teamId + '/posts', { title, content });
          App.toast('发布成功');
          location.reload();
        } catch (e) {
          App.toast(e.message);
          App.setBusy(postBtn, false);
        }
      });
    }
    box.querySelectorAll('[data-pdel]').forEach((b) => {
      b.addEventListener('click', () => {
        App.confirmDialog('删除这条帖子？', async () => {
          try {
            await App.post('/api/teams/' + teamId + '/posts/delete', { postId: b.dataset.pdel });
            App.toast('已删除');
            location.reload();
          } catch (e) { App.toast(e.message); }
        }, { danger: true, title: '删除帖子' });
      });
    });
  }

  function canDelPost(p) {
    const me = App.state.me;
    if (!me) return false;
    if (me.isAdmin) return true;
    if (p.author === me.username) return true;
    return data.myRole === 'owner' || data.myRole === 'admin';
  }

  function inviteDialog() {
    const panel = document.createElement('div');
    panel.innerHTML = `<input class="text-input" type="text" id="invName" placeholder="对方用户名" >
    <div style="font-size:12px;color:var(--mdui-color-outline);margin-top:6px">对方将收到邀请通知，接受后自动加入。</div>`;
    App.dialog({
      headline: '邀请成员',
      body: panel,
      actions: [
        { text: '取消' },
        {
          text: '发送邀请',
          onClick: async () => {
            const name = panel.querySelector('#invName').value.trim();
            if (!name) {
              App.toast('请填写用户名');
              return false;
            }
            try {
              await App.post('/api/teams/' + teamId + '/invite', { username: name });
              App.toast('邀请已发送');
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

  function editDialog() {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <textarea class="textarea-input" id="eDesc" placeholder="团队简介" maxlength="2000"   rows="3"></textarea>
      <div style="height:12px"></div>
      <input class="text-input" type="text" id="eCover" placeholder="封面图片 URL（可填图片直链或 /uploads/...，留空则使用默认）" value="${A(t.cover || '')}" >
      <div style="height:12px"></div>
      <input class="text-input" type="text" id="eTags" placeholder="标签" >`;
    App.dialog({
      headline: '编辑团队资料',
      body: panel,
      actions: [
        { text: '取消' },
        {
          text: '保存',
          onClick: async () => {
            try {
              await App.post('/api/teams/' + teamId, {
                description: panel.querySelector('#eDesc').value,
                cover: panel.querySelector('#eCover').value.trim(),
                tags: panel.querySelector('#eTags').value
              });
              App.toast('已保存');
              location.reload();
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

  main();
})();
