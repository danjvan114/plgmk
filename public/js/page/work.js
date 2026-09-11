(function () {
  'use strict';
  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const workId = (location.pathname.match(/^\/work\/(\d+)/) || [])[1];

  // 作品播放器统一走官方托管的 KittenN 版本，不再使用本项目内置的播放器 bundle
  const PLAYER_BASE = 'https://pan2.pgrm.top/neko/keplayer/KittenN.html';

  function playerUrl(w) {
    const p = w.player || {};
    const u = new URLSearchParams();
    if (p.f) u.set('f', p.f);
    if (p.u) u.set('u', p.u);
    if (p.auth) u.set('auth', String(p.auth));
    if (p.o) u.set('o', String(p.o));
    if (p.v) u.set('v', p.v);
    if (p.auto) u.set('auto', String(p.auto));
    return PLAYER_BASE + '?' + u.toString();
  }

  function playerBox(w) {
    const url = playerUrl(w);
    return `<div class="player-wrap">
      <div class="player-loading" id="playerLoading"><span class="ke-spinner lg"></span></div>
      <iframe id="playerFrame" src="${A(url)}" allowfullscreen onload="var l=document.getElementById('playerLoading');if(l)l.style.display='none'"></iframe>
    </div>`;
  }

  let work = null;
  let replyTarget = null;

  function flatten(nodes, out, depth) {
    for (const n of nodes) { out.push({ node: n, depth }); if (n.children && n.children.length) flatten(n.children, out, depth + 1); }
    return out;
  }

  function commentRow(c) {
    const nick = c.authorNick || c.author;
    const actions = [`<a href="javascript:;" data-act="reply" data-id="${c.id}" data-name="${A(nick)}">回复</a>`];
    if (App.state.me && (App.state.me.username === c.author || App.state.me.isAdmin || (work && work.author === App.state.me.username))) {
      actions.push(`<a href="javascript:;" data-act="del" data-id="${c.id}">删除</a>`);
    }
    return `
  <div class="reply-item ${c.parentId ? 'reply-child' : ''}" id="wc-${c.id}">
    <div class="avatar-wrap">
      <img src="${App.urlAvatar({ nickname: nick, avatar: c.authorAvatar })}" style="width:36px;height:36px;border-radius:50%;flex:none" onerror="this.style.display='none'">
      <div class="body">
        <div class="top">
          <a href="${App.userUrl(c.author)}" style="font-weight:600;font-size:14px">${A(nick)} ${App.badgeVerified(c.authorVerified)}</a>
          ${c.isPinned ? '<span class="material-icons" style="font-size:15px;color:#e65100;vertical-align:-3px">push_pin</span>' : ''}
          <span style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${App.timeAgo(c.createdAt)}</span>
        </div>
        <div class="reply-content">${c.replyTo ? `<b style="color:var(--mdui-color-primary)">回复 ${A(c.replyToNick || c.replyTo)}：</b>` : ''}${App.renderRich(c.content)}</div>
        <div class="reply-actions">${actions.join('')}</div>
      </div>
    </div>
  </div>`;
  }

  function renderComments(comments, total) {
    const cBox = view.querySelector('#cBox');
    const ccEl = view.querySelector('#cc');
    if (!cBox) return;
    const tree = flatten(comments, [], 0);
    cBox.innerHTML = tree.length
      ? tree.map(({ node, depth }) => `<div style="${depth > 0 ? 'padding-left:' + Math.min(depth * 26, 80) + 'px' : ''}">${commentRow(node)}</div>`).join('')
      : '<div class="empty-tip">还没有评论，来抢沙发～</div>';
    if (ccEl) ccEl.textContent = total;
    bindCommentEvents();
  }

  async function refreshComments() {
    try {
      const d = await App.get(`/api/works/${work.id}/comments`);
      renderComments(d.comments || [], d.total || 0);
    } catch (e) { App.toast(e.message || '刷新评论失败'); }
  }

  function bindCommentEvents() {
    view.querySelectorAll('#cBox a[data-act]').forEach((a) => {
      a.addEventListener('click', async () => {
        if (a.dataset.act === 'reply') {
          replyTarget = { id: Number(a.dataset.id), name: a.dataset.name };
          view.querySelector('#cRepName').textContent = a.dataset.name;
          view.querySelector('#cRepRow').classList.remove('hidden');
          view.querySelector('#cInput').focus();
        } else if (a.dataset.act === 'del') {
          App.confirmDialog('删除这条评论？', async () => {
            try {
              await App.post('/api/works/comments/' + a.dataset.id + '/delete');
              App.toast('已删除');
              refreshComments();
            } catch (e) { App.toast(e.message); }
          }, { title: '删除评论', danger: true });
        }
      });
    });
  }

  function bindMainEvents(w) {
    const me = App.state.me;
    const mine = me && (me.username === w.author || me.isAdmin);

    if (me) {
      view.querySelector('#btnLike').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/works/${w.id}/like`);
          refreshReaction(d, 'like', 'liked', 'btnLike', d.likeCount);
        } catch (e) { App.toast(e.message); }
      });
      view.querySelector('#btnFav').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/works/${w.id}/fav`);
          refreshReaction(d, 'fav', 'faved', 'btnFav', d.favCount);
        } catch (e) { App.toast(e.message); }
      });
      view.querySelector('#btnCoin').addEventListener('click', async () => {
        try {
          const d = await App.post(`/api/works/${w.id}/coin`);
          App.toast('投币成功');
          view.querySelectorAll('.sc b')[3].textContent = d.coinCount;
        } catch (e) { App.toast(e.message); }
      });
      function refreshReaction(d, kind, flag, btnId, count) {
        const map = { like: 1, fav: 2, coin: 3 };
        w[flag] = d.on;
        view.querySelectorAll('.sc b')[map[kind]].textContent = count;
        const btn = view.querySelector('#' + btnId);
        if (kind === 'like') {
          btn.innerHTML = '<span class="material-icons" style="font-size:18px">' + (d.on ? 'favorite' : 'favorite_border') + '</span>' + (d.on ? '已赞' : '点赞');
          btn.className = d.on ? 'btn primary' : 'btn tonal';
        } else if (kind === 'fav') {
          btn.innerHTML = '<span class="material-icons" style="font-size:18px">' + (d.on ? 'bookmark' : 'bookmark_border') + '</span>' + (d.on ? '已收藏' : '收藏');
          btn.className = d.on ? 'btn primary' : 'btn tonal';
        }
      }
    }
    const followBtn = view.querySelector('#btnFollow');
    if (followBtn) {
      followBtn.addEventListener('click', async () => {
        try {
          const d = await App.post('/api/users/' + encodeURIComponent(w.author) + '/follow');
          followBtn.innerHTML = d.following ? '已关注' : '+ 关注作者';
          App.toast(d.following ? '已关注' : '已取消关注');
        } catch (e) { App.toast(e.message); }
      });
    }
    if (mine) {
      view.querySelector('#btnDel').addEventListener('click', () => {
        App.confirmDialog('删除这个作品？', async () => {
          try { await App.post(`/api/works/${w.id}/delete`); App.toast('已删除'); location.href = '/workpool'; }
          catch (e) { App.toast(e.message); }
        }, { title: '删除作品', danger: true });
      });
    }

    const cCancel = view.querySelector('#cRepCancel');
    if (cCancel) {
      cCancel.addEventListener('click', () => {
        replyTarget = null;
        view.querySelector('#cRepRow').classList.add('hidden');
      });
    }
    const send = view.querySelector('#btnSend');
    if (send) {
      const doSend = async () => {
        const input = view.querySelector('#cInput');
        const content = input.value.trim();
        if (!content) { App.toast('评论内容不能为空'); return; }
        App.setBusy(send, true);
        try {
          await App.post(`/api/works/${w.id}/comments`, { content, parentId: replyTarget ? replyTarget.id : 0 });
          App.toast('评论成功');
          input.value = '';
          replyTarget = null;
          const repRow = view.querySelector('#cRepRow');
          if (repRow) repRow.classList.add('hidden');
          refreshComments();
        } catch (e) { App.toast(e.message); }
        finally { App.setBusy(send, false); }
      };
      send.addEventListener('click', doSend);
      view.querySelector('#cInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSend();
      });
    }
  }

  function render(w, comments, total) {
    work = w;
    const me = App.state.me;
    const mine = me && (me.username === w.author || me.isAdmin);
    const tree = flatten(comments, [], 0);
    const commentsHtml = tree.length
      ? tree.map(({ node, depth }) => `<div style="${depth > 0 ? 'padding-left:' + Math.min(depth * 26, 80) + 'px' : ''}">${commentRow(node)}</div>`).join('')
      : '<div class="empty-tip">还没有评论，来抢沙发～</div>';

    let mainMedia = '';
    if (w.type === 'img') {
      mainMedia = w.thumbnail ? `<img src="${A(w.thumbnail)}" style="width:100%;border-radius:16px;border:1px solid var(--mdui-color-outline-variant)" alt="">`
        : (w.fileUrl ? `<img src="${A(w.fileUrl)}" style="width:100%;border-radius:16px;border:1px solid var(--mdui-color-outline-variant)" alt="">` : '');
    } else if (w.type === 'redirect') {
      mainMedia = `<a href="${A(w.fileUrl)}" target="_blank" rel="noopener"><button class="btn primary lg" type="button"><span class="material-icons" style="font-size:18px">open_in_new</span>打开外部作品</button></a>`;
    } else {
      mainMedia = playerBox(w);
    }

    view.innerHTML = `
      <div class="fade-enter">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <a href="/workpool" style="color:var(--mdui-color-primary)"><button type="button" class="btn text"><span class="material-icons" style="font-size:18px">arrow_back</span>作品池</button></a>
          <span style="flex:1"></span>
          ${mine ? `<a href="/workpool/publish?id=${A(w.id)}" style="color:var(--mdui-color-primary)"><button type="button" class="btn text"><span class="material-icons" style="font-size:18px">edit</span>编辑参数</button></a>` : ''}
          ${mine ? `<button type="button" class="btn text sm" id="btnDel" style="color:#b3261e"><span class="material-icons" style="font-size:18px">delete</span>删除</button>` : ''}
        </div>

        ${mainMedia}

        <div class="work-info-bar">
          <h1 style="font-size:21px;margin:0">${A(w.title)}</h1>
          <div class="stat-chips" style="gap:16px">
            <div class="sc"><b>${w.viewCount || 0}</b><span>浏览</span></div>
            <div class="sc"><b>${w.likeCount || 0}</b><span>点赞</span></div>
            <div class="sc"><b>${w.favCount || 0}</b><span>收藏</span></div>
            <div class="sc"><b>${w.coinCount || 0}</b><span>投币</span></div>
          </div>
        </div>

        <div class="work-action-bar">
          ${me ? `<button type="button" class="btn tonal" id="btnLike"><span class="material-icons" style="font-size:18px">${w.liked ? 'favorite' : 'favorite_border'}</span>${w.liked ? '已赞' : '点赞'}</button>
          <button type="button" class="btn tonal" id="btnFav"><span class="material-icons" style="font-size:18px">bookmark</span>${w.faved ? '已收藏' : '收藏'}</button>
          <button type="button" class="btn tonal" id="btnCoin"><span class="material-icons" style="font-size:18px">paid</span>投币</button>` : `<a href="/login"><button type="button" class="btn tonal">登录后互动</button></a>`}
          <span style="flex:1"></span>
          ${me && me.username !== w.author ? `<button type="button" class="btn text" id="btnFollow">${w.following ? '已关注' : '+ 关注作者'}</button>` : ''}
        </div>

        <div class="work-author-card">
          <a href="${App.userUrl(w.author)}" style="display:flex;align-items:center;gap:10px;font-weight:600">
            <img src="${App.urlAvatar({ nickname: w.authorNick, avatar: w.authorAvatar })}" style="width:40px;height:40px;border-radius:50%" onerror="this.style.display='none'">${A(w.authorNick || w.author)} ${App.badgeVerified(w.authorVerified)}
          </a>
          <div style="font-size:13px;color:var(--mdui-color-on-surface-variant);margin:6px 0 8px">发布于 ${A(App.fmtTime(w.createdAt))}</div>
          ${App.cards.tagChips(w.tags, '/workpool')}
        </div>

        <div class="rich-content markdown-body" style="margin-top:18px">${App.renderRich(w.description || '')}</div>

        <div class="section-title" style="margin-top:28px">全部评论（<span id="cc">${total}</span>）</div>
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:6px 18px;margin-bottom:18px" id="cBox">${commentsHtml}</div>

        ${me ? `
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:16px">
          <div style="font-weight:600;margin-bottom:8px">发表评论<span id="cRepRow" class="hidden" style="font-weight:400;margin-left:8px;font-size:13px">回复 <b id="cRepName"></b><a href="javascript:;" id="cRepCancel" style="color:var(--mdui-color-outline);margin-left:6px">取消</a></span></div>
          <textarea class="textarea-input" id="cInput" placeholder="说点什么……（支持 @用户名 提及（会通知对方）；支持 Markdown；Ctrl + Enter 快捷发送）" maxlength="5000" rows="3"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="btn primary" id="btnSend"><span class="material-icons" style="font-size:18px">send</span>发表评论</button></div>
        </div>` : ''}
      </div>`;

    bindMainEvents(w);
    bindCommentEvents();
  }

  async function main() {
    await App.ready;
    if (!workId) { location.href = '/workpool'; return; }
    let d;
    try { d = await App.get('/api/works/' + workId); }
    catch (e) { view.innerHTML = `<div class="empty-tip"><div class="material-icons icon">error_outline</div>${A(e.message || '作品不存在')}</div>`; return; }
    render(d.work, d.comments || [], d.commentTotal || 0);
  }

  main();
})();
