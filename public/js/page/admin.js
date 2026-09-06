(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  const TABS = [
    ['overview', '概览'],
    ['posts', '帖子管理'],
    ['replies', '回复管理'],
    ['plugins', '插件管理'],
    ['works', '作品管理'],
    ['boards', '板块管理'],
    ['userMod', '用户管理'],
    ['announce', '发公告']
  ];
  const SUPER_TABS = [
    ['verifyReq', '认证审核'],
    ['staff', '管理员设置'],
    ['bots', 'AI机器人']
  ];

  let isSuper = false;
  let isOwner = false;
  let staffCache = [];
  let umQ = '';

  async function main() {
    await App.ready;
    if (!App.state.me || !App.state.me.isAdmin) {
      App.alertDialog('需要管理员权限');
      location.href = '/';
      return;
    }
    isSuper = !!App.state.me.isSuper;
    isOwner = !!App.state.me.isOwner;

    const tabs = TABS.concat(isOwner ? SUPER_TABS : []);
    view.innerHTML = `
      <div class="page-title"><div><h1>管理后台</h1></div><div style="opacity:.6;font-size:13px">${isSuper || isOwner ? '超级管理员' : '巡查管理员'}</div></div>
      <div class="toolbar" style="overflow-x:auto">
        <div class="seg-group" data-value="overview" id="nav" value="overview">
          ${tabs.map((t) => `<button type="button" class="seg-item" data-value="${t[0]}">${t[1]}</button>`).join('')}
        </div>
      </div>
      <div id="panel"></div>`;

    const panel = view.querySelector('#panel');
    view.querySelector('#nav').addEventListener('change', (e) => {
      const v = e.target.value || 'overview';
      switchTo(v);
    });

    function switchTo(v) {
      if (v === 'plugins') loadPlugins();
      else if (v === 'posts') loadPosts();
      else if (v === 'replies') loadReplies();
      else if (v === 'boards') loadBoards();
      else if (v === 'announce') showAnnounce();
      else if (v === 'works') loadWorks();
      else if (v === 'staff') loadStaff();
      else if (v === 'bots') loadBots();
      else if (v === 'userMod') loadUserMod();
      else if (v === 'verifyReq') loadVerifyReq();
      else loadOverview();
    }

    function stat(label, v) {
      return `<div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;padding:14px 16px"><div style="font-size:22px;font-weight:700">${v}</div><div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${label}</div></div>`;
    }

    function listWrap(inner) {
      return `<div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:14px;overflow:hidden">${inner || '<div class="empty-tip">暂无数据</div>'}</div>`;
    }

    function busy() {
      panel.innerHTML = `<div class="empty-tip"><span class="ke-spinner"></span></div>`;
    }

    function bind(sel, cb) {
      const el = panel.querySelector(sel);
      if (el) el.addEventListener('click', cb);
    }

    async function loadOverview() {
      busy();
      try {
        const d = await App.get('/api/admin/overview');
        const c = d.counts;
        panel.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
            ${stat('上架插件', c.plugins)}${stat('已下架', c.pluginsHidden)}
            ${stat('作品', c.works)}${stat('隐藏作品', c.worksHidden)}
            ${stat('帖子', c.posts)}${stat('板块', c.boards)}
            ${stat('团队', c.teams)}${stat('站内消息', c.messages)}
          </div>
          <div class="section-title">最新插件</div>
          ${listWrap(d.recent.map((p) => `
            <div class="post-list-item"><div class="main"><a class="post-title" href="/plugin/${p.id}" style="color:var(--mdui-color-on-surface)">${A(p.name)}</a></div><div class="pc-meta">${A(p.authorNick || p.author)} · 下载 ${p.downloadCount}</div></div>`).join(''))}`;
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadPlugins() {
      busy();
      try {
        const d = await App.get('/api/admin/plugins?size=50');
        panel.innerHTML = listWrap(d.items.map((p) => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:var(--mdui-color-on-surface-variant)">extension</span>
            <div style="flex:1;min-width:0">
              <a href="/plugin/${p.id}" style="font-weight:600;color:var(--mdui-color-on-surface)">${A(p.name)}</a>
              ${p.status === 'active' ? '' : '<span class="chip tonal" style="--mdui-chip-height:18px">下架</span>'}
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(p.author)} · 下载 ${p.downloadCount} · 赞 ${p.likeCount} · ${App.timeAgo(p.createdAt)}</div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              <button type="button" class="btn tonal sm" id="tg${p.id}">${p.status === 'active' ? '下架' : '上架'}</button>
              <button type="button" class="ke-iconbtn" id="dl${p.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
            </div>
          </div>`).join(''));
        for (const p of d.items) {
          bind('#tg' + p.id, async () => {
            try {
              const r = await App.post('/api/admin/plugins/' + p.id + '/status', { status: p.status === 'active' ? 'inactive' : 'active' });
              App.toast(r.status === 'active' ? '已上架' : '已下架');
              loadPlugins();
            } catch (e) { App.toast(e.message); }
          });
          bind('#dl' + p.id, () => {
            App.confirmDialog(`删除插件《${p.name}》？`, async () => {
              try { await App.post('/api/admin/plugins/' + p.id + '/delete'); App.toast('已删除'); loadPlugins(); } catch (e) { App.toast(e.message); }
            }, { title: '删除插件', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadWorks() {
      busy();
      try {
        const d = await App.get('/api/admin/works?size=50');
        panel.innerHTML = listWrap(d.items.map((w) => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:var(--mdui-color-on-surface-variant)">palette</span>
            <div style="flex:1;min-width:0">
              <a href="/work/${w.id}" style="font-weight:600;color:var(--mdui-color-on-surface)">${A(w.title)}</a>
              ${w.isHidden ? '<span class="chip tonal" style="--mdui-chip-height:18px">隐藏</span>' : ''}
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(w.authorNick || w.author)} · 赞 ${w.likeCount} · ${App.timeAgo(w.createdAt)}</div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              <button type="button" class="btn tonal sm" id="wh${w.id}">${w.isHidden ? '恢复' : '隐藏'}</button>
              <button type="button" class="ke-iconbtn" id="wd${w.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
            </div>
          </div>`).join(''));
        for (const w of d.items) {
          bind('#wh' + w.id, async () => {
            try { await App.post('/api/works/' + w.id + '/hide'); App.toast('已更新'); loadWorks(); } catch (e) { App.toast(e.message); }
          });
          bind('#wd' + w.id, () => {
            App.confirmDialog(`删除作品《${w.title}》？`, async () => {
              try { await App.post('/api/works/' + w.id + '/delete'); App.toast('已删除'); loadWorks(); } catch (e) { App.toast(e.message); }
            }, { title: '删除作品', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadPosts() {
      busy();
      try {
        const d = await App.get('/api/admin/posts');
        panel.innerHTML = listWrap(d.items.map((p) => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:var(--mdui-color-on-surface-variant)">forum</span>
            <div style="flex:1;min-width:0">
              <a href="/post/${p.id}" style="font-weight:600;color:var(--mdui-color-on-surface)">${A(p.title)}</a>
              ${p.status === 'deleted' ? '<span class="chip tonal" style="--mdui-chip-height:18px">已删</span>' : ''}
              ${p.isPinned ? '<span class="chip tonal" style="--mdui-chip-height:18px">置顶</span>' : ''}
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(p.authorNick || p.author)} · 回复 ${p.replyCount} · ${App.timeAgo(p.createdAt)}</div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              ${p.status !== 'deleted' ? `
                <button type="button" class="ke-iconbtn" id="pp${p.id}"><span class="material-icons">push_pin</span></button>
                <button type="button" class="ke-iconbtn" id="pd${p.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
                ${isSuper ? '<button type="button" class="ke-iconbtn" id="ph${p.id}" style="color:#7c2d12" title="彻底删除"><span class="material-icons">delete_forever</span></button>' : ''}` : ''}
            </div>
          </div>`).join(''));
        for (const p of d.items) {
          if (p.status === 'deleted') continue;
          bind('#pp' + p.id, async () => {
            try { await App.post('/api/forum/posts/' + p.id + '/pin'); App.toast('已更新'); loadPosts(); } catch (e) { App.toast(e.message); }
          });
          bind('#pd' + p.id, () => {
            App.confirmDialog('删除该帖子？', async () => {
              try { await App.post('/api/forum/posts/' + p.id + '/delete'); App.toast('已删除'); loadPosts(); } catch (e) { App.toast(e.message); }
            }, { title: '删除帖子', danger: true });
          });
          if (isSuper) {
            bind('#ph' + p.id, () => {
              App.confirmDialog(`彻底删除《${p.title}》？该帖与全部回复将被物理移除，不可恢复。`, async () => {
                try { await App.post('/api/admin/posts/' + p.id + '/hard-delete'); App.toast('已彻底删除'); loadPosts(); } catch (e) { App.toast(e.message); }
              }, { title: '彻底删除', danger: true });
            });
          }
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadReplies(page) {
      busy();
      const pg = page || 1;
      try {
        const d = await App.get('/api/admin/replies?page=' + pg + '&size=20');
        const rows = d.items.map((r) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:var(--mdui-color-on-surface-variant);margin-top:2px">comment</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:var(--mdui-color-on-surface-variant)">@${A(r.authorNick || r.author)} 回复于 <a href="/post/${r.postId}" style="color:inherit">《${A(r.postTitle)}》</a> · ${App.timeAgo(r.createdAt)}</div>
              <div style="margin-top:2px;word-break:break-word">${A(r.contentPreview)}${r.status === 'deleted' ? ' <span class="chip tonal" style="--mdui-chip-height:18px">已删</span>' : ''}</div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              <button type="button" class="btn text sm" onclick="location.href='/post/${r.postId}'">查看</button>
              ${r.status !== 'deleted' ? '<button type="button" class="ke-iconbtn" id="rd' + r.id + '" style="color:#b3261e"><span class="material-icons">delete</span></button>' : ''}
            </div>
          </div>`).join('');
        panel.innerHTML = rows
          ? listWrap(rows)
          : listWrap('<div class="empty-tip">暂无回复</div>');
        if (rows) {
          const pager = App.pagination(
            { page: d.page, pageCount: d.pageCount, total: d.total, hasPrev: d.page > 1, hasNext: d.page < d.pageCount },
            (p2) => loadReplies(p2)
          );
          panel.appendChild(pager);
        }
        for (const r of d.items) {
          if (r.status === 'deleted') continue;
          bind('#rd' + r.id, () => {
            App.confirmDialog('删除该回复？', async () => {
              try { await App.post('/api/forum/replies/' + r.id + '/delete'); App.toast('已删除'); loadReplies(pg); } catch (e) { App.toast(e.message); }
            }, { title: '删除回复', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    function boardDialog(b) {
      const panelBody = document.createElement('div');
      panelBody.innerHTML = `
        <input class="text-input" type="text" id="bName" placeholder="板块名称"  value="${b ? A(b.name) : ''}">
        <div style="height:12px"></div>
        <input class="text-input" type="text" id="bDesc" placeholder="简介"  value="${b ? A(b.description || '') : ''}">`;
      App.dialog({
        headline: b ? '编辑板块' : '新增板块',
        body: panelBody,
        actions: [
          { text: '取消' },
          {
            text: '保存',
            onClick: async () => {
              const name = panelBody.querySelector('#bName').value.trim();
              if (!name) {
                App.toast('请填写名称');
                return false;
              }
              const payload = { name, description: panelBody.querySelector('#bDesc').value.trim() };
              try {
                if (b) await App.post('/api/admin/boards/' + b.id, payload);
                else await App.post('/api/admin/boards', payload);
                App.toast('已保存');
                loadBoards();
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

    async function loadBoards() {
      busy();
      try {
        const d = await App.get('/api/admin/boards');
        panel.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">共 ${d.boards.length} 个板块</span>
            <button type="button" class="btn tonal" id="bAdd"><span class="material-icons" style="font-size:18px">add</span>新增板块</button>
          </div>
          ${listWrap(d.boards.map((b) => `
          <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:${A(b.color || '#6750a4')}">category</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">${A(b.name)}</div>
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${A(b.description || '')} · ${b.postCount || 0} 帖</div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              <button type="button" class="ke-iconbtn" id="be${b.id}"><span class="material-icons">edit</span></button>
              <button type="button" class="ke-iconbtn" id="bd${b.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
            </div>
          </div>`).join(''))}`;
        bind('#bAdd', () => boardDialog(null));
        for (const b of d.boards) {
          bind('#be' + b.id, () => boardDialog(b));
          bind('#bd' + b.id, () => {
            App.confirmDialog(`删除板块《${b.name}》？`, async () => {
              try { await App.post('/api/admin/boards/' + b.id + '/delete'); App.toast('已删除'); loadBoards(); } catch (e) { App.toast(e.message); }
            }, { title: '删除板块', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    function showAnnounce() {
      panel.innerHTML = `
        <div style="max-width:640px">
          <textarea class="textarea-input" id="annText" placeholder="将推送给所有活跃用户"  rows="4"></textarea>
          <div style="margin:10px 0"><input class="text-input" type="text" id="annLink" placeholder="/forum 或外部网址" ></div>
          <button type="button" class="btn primary" id="annSend"><span class="material-icons" style="font-size:18px">campaign</span>发布公告</button>
        </div>`;
      bind('#annSend', async () => {
        const text = view.querySelector('#annText').value.trim();
        if (!text) {
          App.toast('请填写内容');
          return;
        }
        try {
          const d = await App.post('/api/admin/announce', { text, link: view.querySelector('#annLink').value.trim() });
          App.toast('公告已发给 ' + d.sent + ' 位用户');
          view.querySelector('#annText').value = '';
        } catch (e) {
          App.toast(e.message);
        }
      });
    }

    async function loadStaff() {
      busy();
      try {
        const [d, cand] = await Promise.all([
          App.get('/api/admin/staff'),
          App.get('/api/admin/staff/candidates?q=')
        ]);
        staffCache = cand.items || [];
        const renderRow = (s, icon) => `
          <div style="display:flex;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:var(--mdui-color-on-surface-variant)">${icon}</span>
            <div style="flex:1;min-width:0">
              <b>${A(s.nickname || s.username)}</b> <span class="mono" style="color:var(--mdui-color-on-surface-variant);font-size:12px">@${A(s.username)}</span>
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">由 ${A(s.addedBy || '?')} 添加 · ${App.timeAgo(s.addedAt)}</div>
            </div>
            <button type="button" class="btn text sm" id="staffrm${A(s.username)}" style="color:#b3261e">移除</button>
          </div>`;
        const superRows = (d.supers || []).length
          ? d.supers.map((s) => renderRow(s, 'admin_panel_settings')).join('')
          : '<div class="empty-tip" style="padding:14px">暂无（可在此添加超级管理员）</div>';
        const adminRows = (d.admins || []).length
          ? d.admins.map((s) => renderRow(s, 'manage_accounts')).join('')
          : '<div class="empty-tip" style="padding:14px">暂无巡查管理员</div>';
        panel.innerHTML = `
          <div style="background:var(--mdui-color-secondary-container);color:var(--mdui-color-on-secondary-container);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px">
            首位超级管理员由<b>昵称 Starry</b> 的身份自动识别并拥有完整管理权（可在此添加/移除其他超级管理员与巡查管理员）。超级管理员自动获得「KE官方团队」蓝V徽标。
          </div>
          <div class="section-title">超级管理员</div>
          <div class="list-wrap">${superRows}</div>
          <div class="section-title">巡查管理员</div>
          <div class="list-wrap">${adminRows}</div>
          <div style="height:16px"></div>
          <div class="section-title">添加管理员</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;max-width:620px">
            <input id="staffQ" list="staffCand" placeholder="输入用户名（用户中心注册名）" class="text-input" style="flex:1;min-width:200px" autocomplete="off">
            <datalist id="staffCand">${staffCache.map((u) => `<option value="${A(u)}">`).join('')}</datalist>
            <select id="staffTier" class="select-input ke-select" style="width:auto"><option value="admin">巡查管理员</option><option value="super">超级管理员</option></select>
            <button type="button" class="btn primary" id="staffAdd"><span class="material-icons" style="font-size:18px">add</span>添加</button>
          </div>`;
        bind('#staffAdd', async () => {
          const username = view.querySelector('#staffQ').value.trim();
          if (!username) {
            App.toast('请填写用户名');
            return;
          }
          const tier = view.querySelector('#staffTier').value;
          try {
            await App.post('/api/admin/staff', { username, tier });
            App.toast('已添加为' + (tier === 'super' ? '超级管理员' : '巡查管理员'));
            loadStaff();
          } catch (e) {
            App.toast(e.message);
          }
        });
        const rows = (d.supers || []).concat(d.admins || []);
        for (const s of rows) {
          bind('#staffrm' + A(s.username), () => {
            App.confirmDialog(`移除 ${A(s.username)} 的授权？`, async () => {
              try { await App.post('/api/admin/staff/' + encodeURIComponent(s.username) + '/remove'); App.toast('已移除'); loadStaff(); } catch (e) { App.toast(e.message); }
            }, { title: '移除授权', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    function botDialog(item) {
      const isEdit = !!item;
      const orig = isEdit
        ? { name: item.name, url: item.apiUrl, model: item.model, key: '', prompt: item.prompt, prob: item.probability, cd: item.cooldownSec, acc: item.account }
        : { name: '', url: '', model: '', key: '', prompt: '', prob: 100, cd: 0, acc: { username: '', nickname: '', avatar: '' } };
      let nonce = '';
      let lastTest = '';

      const body = document.createElement('div');
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <input class="text-input" type="text" id="btName" placeholder="如：KE小助手"  value="${A(orig.name)}">
          <input class="text-input" type="text" id="btModel" placeholder="如 gpt-4o-mini"  value="${A(orig.model)}">
        </div>
        <div style="height:10px"></div>
        <input class="text-input" type="text" id="btUrl" placeholder="https://api.openai.com/v1 或完整 /chat/completions 地址；本地演示填 stub://demo"  value="${A(orig.url)}">
        <div style="height:10px"></div>
        <input class="text-input" type="password" id="btKey" placeholder="${isEdit ? '留空表示不修改' : 'sk-...'}"  value="${A(orig.key)}">
        <div style="height:10px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <input class="text-input" type="text" id="btU" placeholder="用户中心用户名"  value="${A(orig.acc.username)}">
          <input class="text-input" type="text" id="btN" placeholder="默认同用户名"  value="${A(orig.acc.nickname)}">
        </div>
        <div style="height:10px"></div>
        <input class="text-input" type="text" id="btAvatar" placeholder="头像地址（可选）"  value="${A(orig.acc.avatar || '')}">
        <div style="height:10px"></div>
        <textarea class="textarea-input" id="btPrompt" placeholder="不填则使用默认人设"  rows="3">${A(orig.prompt)}</textarea>
        <div style="height:10px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center">
          <input class="text-input" type="number" id="btProb" placeholder="回复概率 %（0-100）"  value="${A(orig.prob)}">
          <input class="text-input" type="number" id="btCd" placeholder="冷却秒数（0=不限）"  value="${A(orig.cd)}">
        </div>
        <div style="height:10px"></div>
        <div id="btHint" style="font-size:13px;min-height:20px"></div>`;

      const hint = () => {
        const h = body.querySelector('#btHint');
        const dirty = lastTest ? `已通过连接测试（${App.timeAgo(lastTest)}）` : (nonce ? '连接测试已通过，可以保存' : '保存前必须先通过「测试连接」');
        h.textContent = dirty;
        h.style.color = nonce ? 'var(--mdui-color-tertiary, #00696d)' : 'var(--mdui-color-error, #b3261e)';
      };
      hint();

      App.dialog({
        headline: isEdit ? '编辑机器人' : '新增 AI 机器人',
        body,
        actions: [
          { text: '取消' },
          {
            text: '测试连接',
            icon: 'wifi_tethering',
            onClick: async () => {
              const url = body.querySelector('#btUrl').value.trim();
              const model = body.querySelector('#btModel').value.trim();
              const key = body.querySelector('#btKey').value.trim();
              const prompt = body.querySelector('#btPrompt').value.trim();
              if (!url) {
                App.toast('请先填写 API 地址');
                return false;
              }
              const testSnack = App.toast('正在测试连接…');
              try {
                const r = await App.post('/api/bots/test', { apiUrl: url, model, apiKey: key || '', prompt, botId: isEdit ? item.id : 0 });
                nonce = r.nonce;
                lastTest = Date.now();
                if (testSnack && testSnack.close) testSnack.close();
                App.toast('连接成功（' + (r.latencyMs || 0) + 'ms）');
                hint();
              } catch (e) {
                if (testSnack && testSnack.close) testSnack.close();
                App.toast(e.message);
              }
              return false;
            }
          },
          {
            text: '保存',
            icon: 'save',
            onClick: async () => {
              const payload = {
                name: body.querySelector('#btName').value.trim(),
                apiUrl: body.querySelector('#btUrl').value.trim(),
                model: body.querySelector('#btModel').value.trim(),
                apiKey: body.querySelector('#btKey').value.trim() || undefined,
                prompt: body.querySelector('#btPrompt').value.trim(),
                probability: Number(body.querySelector('#btProb').value),
                cooldownSec: Number(body.querySelector('#btCd').value || 0),
                account: {
                  username: body.querySelector('#btU').value.trim(),
                  nickname: body.querySelector('#btN').value.trim(),
                  avatar: body.querySelector('#btAvatar').value.trim()
                }
              };
              if (payload.apiKey === undefined) delete payload.apiKey;
              if (!payload.name) { App.toast('请填写名称'); return false; }
              if (!payload.account.username) { App.toast('请填写发帖账号用户名'); return false; }
              const url = payload.apiUrl;
              const model = payload.model;
              const credsChanged = url !== orig.url || model !== orig.model || (!!payload.apiKey && payload.apiKey !== orig.key);
              if (url !== 'stub://demo' && credsChanged && !nonce) {
                App.toast('连接信息有变更，请先点击「测试连接」');
                return false;
              }
              try {
                if (isEdit) await App.post('/api/bots/' + item.id, payload);
                else await App.post('/api/bots', payload);
                App.toast('已保存');
                loadBots();
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

    function botLogs(item) {
      (async () => {
        let d;
        try {
          d = await App.get('/api/bots/' + item.id + '/logs?size=50');
        } catch (e) {
          App.toast(e.message);
          return;
        }
        const body = document.createElement('div');
        body.innerHTML = d.items.length ? `<div style="max-height:60vh;overflow:auto;min-width:380px">
          ${d.items.map((l) => `
            <div style="padding:10px 4px;border-bottom:1px solid var(--mdui-color-outline-variant)">
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${l.kind === 'post' ? '新帖触发' : l.kind === 'reply' ? '回复触发' : '未知'} · ${l.ok ? '成功' : '失败'}${l.latencyMs ? ' · ' + l.latencyMs + 'ms' : ''} · ${App.timeAgo(l.createdAt)}${l.postId ? ' · <a href="/post/' + l.postId + '">跳转</a>' : ''}</div>
              <div style="font-size:13px;margin-top:3px;word-break:break-word">${l.ok ? A(l.textPreview) : A(l.error || '失败')}</div>
            </div>`).join('')}
        </div>` : `<div class="empty-tip">暂无触发记录</div>`;
        App.dialog({ headline: '机器人日志 · ' + A(item.name), body, actions: [{ text: '关闭' }] });
      })();
    }

    async function loadBots() {
      busy();
      try {
        const d = await App.get('/api/bots');
        const rows = d.items.length ? d.items.map((b) => `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
            <span class="material-icons" style="color:${b.enabled ? '#1a7f37' : 'var(--mdui-color-outline)'}">smart_toy</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;gap:8px;align-items:center">
                <b>${A(b.name)}</b>
                ${b.enabled ? '<span class="chip tonal" style="--mdui-chip-height:18px;background:var(--mdui-color-secondary-container)">运行中</span>' : '<span class="chip tonal" style="--mdui-chip-height:18px">已停用</span>'}
                ${b.lastError ? '<span class="chip tonal" style="--mdui-chip-height:18px;color:#b3261e">最近失败</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--mdui-color-on-surface-variant);margin-top:3px">
                模型 ${A(b.model || '—')} · 概率 ${b.probability}% · 冷却 ${b.cooldownSec}s · 账号 @${A(b.account.username)}
                · 已回复 ${b.replyCount} 条${b.lastOkAt ? ' · 最近 ' + App.timeAgo(b.lastOkAt) : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex:none">
              <button type="button" class="btn tonal sm" id="btg${b.id}">${b.enabled ? '停用' : '启用'}</button>
              <button type="button" class="ke-iconbtn" id="blg${b.id}" title="日志"><span class="material-icons">receipt_long</span></button>
              <button type="button" class="ke-iconbtn" id="bed${b.id}"><span class="material-icons">edit</span></button>
              <button type="button" class="ke-iconbtn" id="bdl${b.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
            </div>
          </div>`).join('') : '<div class="empty-tip">还没有机器人，点右上角「新增」添加第一个</div>';
        panel.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">共 ${d.total} 个 · 有新帖/新回复时按概率自动抢答；保存前必须先通过连接测试</span>
            <button type="button" class="btn primary" id="botAdd"><span class="material-icons" style="font-size:18px">smart_toy</span>新增机器人</button>
          </div>
          ${listWrap(rows)}`;
        bind('#botAdd', () => botDialog(null));
        for (const b of d.items) {
          bind('#btg' + b.id, async () => {
            try { await App.post('/api/bots/' + b.id + '/enabled', { enabled: !b.enabled }); loadBots(); } catch (e) { App.toast(e.message); }
          });
          bind('#blg' + b.id, () => botLogs(b));
          bind('#bed' + b.id, () => botDialog(b));
          bind('#bdl' + b.id, () => {
            App.confirmDialog(`删除机器人《${b.name}》及其日志？`, async () => {
              try { await App.post('/api/bots/' + b.id + '/delete'); App.toast('已删除'); loadBots(); } catch (e) { App.toast(e.message); }
            }, { title: '删除机器人', danger: true });
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    async function loadUserMod() {
      busy();
      try {
        const d = await App.get('/api/moderation/list');
        const items = d.items || [];
        const filtered = umQ ? items.filter((u) => (u.username + ' ' + u.nickname).toLowerCase().includes(umQ.toLowerCase())) : items;
        panel.innerHTML = `
          <div style="display:flex;gap:10px;margin-bottom:12px;max-width:520px">
            <input class="text-input" id="umSearch" placeholder="搜索用户名/昵称" value="${A(umQ)}">
          </div>
          ${listWrap(filtered.length ? filtered.map((u, i) => userRowHtml(u, i)).join('') : '<div class="empty-tip">暂无用户</div>')}`;
        const search = panel.querySelector('#umSearch');
        if (search) search.addEventListener('input', (e) => { umQ = e.target.value; loadUserMod(); const s2 = panel.querySelector('#umSearch'); if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } });
        for (let i = 0; i < filtered.length; i++) bindUserRow(filtered[i], i);
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    function userRowHtml(u, i) {
      const isStaffSuper = u.staff === 'super';
      const vBadge = u.verified === 2
        ? '<span class="material-icons" style="color:#1d4ed8;font-size:18px;vertical-align:middle" title="KE官方团队">verified</span>'
        : u.verified === 1
        ? '<span class="material-icons" style="color:#0284c7;font-size:18px;vertical-align:middle" title="认证UP">verified</span>'
        : '';
      const mins = u.muted && u.mutedUntil ? Math.max(0, Math.ceil((u.mutedUntil - Date.now()) / 60000)) : 0;
      const mutedInfo = u.muted ? `<span class="chip tonal" style="background:#fee2e2;color:#b3261e">禁言 ${mins}分</span>` : '';
      const bannedInfo = u.banned ? `<span class="chip tonal" style="background:#fee2e2;color:#b3261e">已封禁</span>` : '';
      const staffInfo = isStaffSuper ? `<span class="chip tonal" style="background:#dbeafe;color:#1d4ed8">超级管理员</span>` : u.staff === 'admin' ? `<span class="chip tonal" style="background:#eef2ff;color:#4338ca">管理员</span>` : '';
      const actions = [];
      actions.push(`<button type="button" class="btn text sm" id="mute${i}">禁言</button>`);
      actions.push(`<button type="button" class="btn text sm" id="unmute${i}" ${u.muted ? '' : 'style="display:none"'}>解禁</button>`);
      if (isOwner) {
        actions.push(`<button type="button" class="btn text sm" id="off${i}">设为官方</button>`);
        actions.push(`<button type="button" class="btn text sm" id="up${i}">认证UP</button>`);
        actions.push(`<button type="button" class="btn text sm" id="cancel${i}">取消认证</button>`);
        actions.push(`<button type="button" class="btn text sm" id="ban${i}" style="color:#b3261e" ${u.banned ? 'disabled' : ''}>封禁</button>`);
        actions.push(`<button type="button" class="btn text sm" id="unban${i}" ${u.banned ? '' : 'style="display:none"'}>解封</button>`);
      }
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)${u.banned ? ';background:#fef2f2' : ''}">
          <img src="${App.urlAvatar({ nickname: u.nickname })}" style="width:40px;height:40px;border-radius:50%;flex:none" onerror="this.style.display='none'">
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;display:flex;align-items:center;gap:6px">${A(u.nickname)} ${vBadge} ${staffInfo}</div>
            <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(u.username)} ${mutedInfo}${bannedInfo}</div>
          </div>
          <div style="display:flex;gap:4px;flex:none;flex-wrap:wrap;justify-content:flex-end">${actions.join('')}</div>
        </div>`;
    }

    function muteDialog(u) {
      const body = document.createElement('div');
      body.innerHTML = `
        <select id="muteMin" class="select-input ke-select">
          <option value="30">30 分钟</option>
          <option value="1440">1 天</option>
          <option value="4320">3 天</option>
          <option value="10080">7 天</option>
          <option value="custom">自定义</option>
        </select>
        <div id="muteCustom" style="display:none;margin-top:10px"><input class="text-input" type="number" id="muteCustomVal" placeholder="分钟数"></div>`;
      const sel = body.querySelector('#muteMin');
      sel.addEventListener('change', () => { body.querySelector('#muteCustom').style.display = sel.value === 'custom' ? 'block' : 'none'; });
      App.dialog({
        headline: '禁言 @' + u.username, body,
        actions: [
          { text: '取消' },
          { text: '确认禁言', onClick: async () => {
            let minutes = sel.value;
            if (minutes === 'custom') {
              minutes = Number(body.querySelector('#muteCustomVal').value);
              if (!minutes || minutes <= 0) { App.toast('请填写分钟数'); return false; }
            }
            try { await App.post('/api/moderation/mute', { username: u.username, minutes: Number(minutes) }); App.toast('已禁言'); loadUserMod(); } catch (e) { App.toast(e.message); }
            return false;
          } }
        ]
      });
    }

    function bindUserRow(u, i) {
      bind('#mute' + i, () => muteDialog(u));
      bind('#unmute' + i, async () => {
        try { await App.post('/api/moderation/unmute', { username: u.username }); App.toast('已解除禁言'); loadUserMod(); } catch (e) { App.toast(e.message); }
      });
      if (isOwner) {
        bind('#off' + i, async () => {
          try { await App.post('/api/moderation/official', { username: u.username, level: 2 }); App.toast('已设为官方'); loadUserMod(); } catch (e) { App.toast(e.message); }
        });
        bind('#up' + i, async () => {
          try { await App.post('/api/moderation/official', { username: u.username, level: 1 }); App.toast('已验证为UP'); loadUserMod(); } catch (e) { App.toast(e.message); }
        });
        bind('#cancel' + i, async () => {
          try { await App.post('/api/moderation/official', { username: u.username, level: 0 }); App.toast('已取消认证'); loadUserMod(); } catch (e) { App.toast(e.message); }
        });
        bind('#ban' + i, () => {
          if (u.banned) return;
          App.confirmDialog(`封禁 @${A(u.username)} 将删除其账号，不可恢复，确认？`, async () => {
            try { await App.post('/api/moderation/ban', { username: u.username }); App.toast('已封禁'); loadUserMod(); } catch (e) { App.toast(e.message); }
          }, { title: '封禁账号', danger: true });
        });
        bind('#unban' + i, async () => {
          try { await App.post('/api/moderation/unban', { username: u.username }); App.toast('已解除封禁'); loadUserMod(); } catch (e) { App.toast(e.message); }
        });
      }
    }

    async function loadVerifyReq() {
      busy();
      try {
        const d = await App.get('/api/moderation/requests');
        const items = d.items || [];
        panel.innerHTML = `
          <div style="background:var(--mdui-color-secondary-container);color:var(--mdui-color-on-secondary-container);padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:12px">
            通过「UP主认证」授予<b>认证UP</b>蓝V；通过「加入我们团队」授予<b>KE官方团队</b>蓝V并正式加入团队。
          </div>
          ${items.length
            ? listWrap(items.map((r) => {
                const isJoin = r.kind === 'join';
                const detail = isJoin
                  ? `<div style="font-size:13px;margin-top:3px">加入理由：${A(r.reason || '')}</div>${r.value ? `<div style="font-size:13px">能带来：${A(r.value)}</div>` : ''}`
                  : `<div style="font-size:13px;margin-top:3px">${r.platform ? `平台：${A(r.platform)} · ` : ''}UP名：${A(r.upName || '')}</div><div style="font-size:13px">理由：${A(r.reason || '')}</div>`;
                return `
                  <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--mdui-color-outline-variant)">
                    <img src="${App.urlAvatar({ nickname: r.nickname })}" style="width:40px;height:40px;border-radius:50%;flex:none" onerror="this.style.display='none'">
                    <div style="flex:1;min-width:0">
                      <div><b>${A(r.nickname)}</b> <span class="mono" style="font-size:12px;color:var(--mdui-color-on-surface-variant)">@${A(r.username)}</span> <span class="chip tonal" style="${isJoin ? 'background:#dbeafe;color:#1d4ed8' : 'background:#e0f2fe;color:#0369a1'}">${isJoin ? '加入我们团队' : 'UP主认证'}</span></div>
                      ${detail}
                      <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${App.timeAgo(r.createdAt)}</div>
                    </div>
                    <div style="display:flex;gap:4px;flex:none">
                      <button type="button" class="btn primary sm" id="va${r.id}">通过</button>
                      <button type="button" class="btn text sm" id="vj${r.id}">拒绝</button>
                    </div>
                  </div>`;
              }).join(''))
            : listWrap('<div class="empty-tip">暂无申请</div>')}`;
        for (const r of items) {
          bind('#va' + r.id, async () => {
            try { await App.post('/api/moderation/requests/' + r.id, { approve: true }); App.toast('已通过（授予蓝V并通知）'); loadVerifyReq(); } catch (e) { App.toast(e.message); }
          });
          bind('#vj' + r.id, async () => {
            try { await App.post('/api/moderation/requests/' + r.id, { approve: false }); App.toast('已拒绝'); loadVerifyReq(); } catch (e) { App.toast(e.message); }
          });
        }
      } catch (e) {
        panel.innerHTML = `<div class="empty-tip">${A(e.message)}</div>`;
      }
    }

    loadOverview();
  }

  main();
})();
