(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');
  const postId = (location.pathname.match(/^\/post\/(\d+)/) || [])[1];

  let post = null;
  let replyTarget = null;
  let botUsernames = [];

  async function main() {
    await App.ready;
    if (!postId) {
      location.href = '/forum';
      return;
    }
    try {
      const bd = await App.get('/api/bots');
      botUsernames = (bd.items || []).map((b) => (b.account && b.account.username) || '');
    } catch (e) { /* ignore */ }
    try {
      const d = await App.get('/api/forum/posts/' + postId);
      post = d.post;
      render(d.replies);
    } catch (e) {
      view.innerHTML = `<div class="empty-tip"><div class="material-icons icon">error_outline</div>${A(e.message || '帖子不存在')}</div>`;
    }
  }

  function flatten(nodes, out, depth) {
    for (const n of nodes) {
      out.push({ node: n, depth });
      if (n.children && n.children.length) flatten(n.children, out, depth + 1);
    }
    return out;
  }

  function render(replies) {
    const me = App.state.me;
    const isMine = me && (me.username === post.author || me.isAdmin);
    const tree = flatten(replies || [], [], 0);
    const seenU = {};
    const mentionList = [{ username: post.author, nickname: post.authorNick }];
    tree.forEach(({ node }) => { if (node.author) mentionList.push({ username: node.author, nickname: node.authorNick }); });
    if (me) mentionList.push({ username: me.username, nickname: me.nickname });
    mentionList.forEach((c) => App.addMention(c.username, c.nickname));
    const mentionCands = mentionList.filter((c) => c.username && !seenU[c.username] && (seenU[c.username] = 1));
    const repliesHtml = tree.length
      ? tree
          .map(({ node, depth }) => {
            const item = Object.assign({}, node, { isAuthor: node.author === post.author });
            return `<div style="${depth > 0 ? 'padding-left:' + Math.min(depth * 26, 80) + 'px' : ''}">${App.cards.replyRow(item, postId)}</div>`;
          })
          .join('')
      : '<div class="empty-tip">还没有回复，抢个沙发～</div>';

    view.innerHTML = `
      <div class="fade-enter" style="max-width:920px">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
          <a href="/forum/${post.boardId}" style="color:var(--mdui-color-primary)"><button type="button" class="btn text"><span class="material-icons" style="font-size:18px">arrow_back</span>${A(post.boardName)}</button></a>
          <span style="flex:1"></span>
          ${me && me.isAdmin ? `<button type="button" class="btn tonal sm" id="btnPin"><span class="material-icons" style="font-size:18px">push_pin</span>${post.isPinned ? '取消置顶' : '置顶'}</button>` : ''}
          ${isMine ? `
            <button type="button" class="btn tonal sm" id="btnEdit"><span class="material-icons" style="font-size:18px">edit</span>编辑</button>
            <button type="button" class="btn text sm" id="btnDel" style="color:#b3261e"><span class="material-icons" style="font-size:18px">delete</span>删除</button>` : ''}
        </div>

        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:22px">
          <h1 style="font-size:22px;margin:0 0 10px">${post.isPinned ? '<span class="material-icons" style="font-size:20px;vertical-align:-3px;color:#e65100">push_pin</span> ' : ''}${A(post.title)}</h1>
          <div style="display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--mdui-color-outline-variant);margin-bottom:16px;flex-wrap:wrap">
            <a href="${App.userUrl(post.author)}" style="display:flex;align-items:center;gap:8px">
              <img src="${App.urlAvatar({ nickname: post.authorNick })}" style="width:32px;height:32px;border-radius:50%" onerror="this.style.display='none'">
              <span style="font-weight:600">${A(post.authorNick || post.author)}</span>
            </a>
            <span style="color:var(--mdui-color-on-surface-variant);font-size:13px">发布于 ${A(App.fmtTime(post.createdAt))}</span>
            <span style="color:var(--mdui-color-on-surface-variant);font-size:13px">浏览 ${post.viewCount}</span>
            <span style="flex:1"></span>
            <button type="button" class="btn text sm" id="btnLike"><span class="material-icons" style="font-size:18px">thumb_up_off_alt</span><span id="likeN">${post.likeCount || 0}</span></button>
          </div>
          <div class="rich-content">${App.renderRich(post.content)}</div>
        </div>

        <div class="section-title">全部回复（<span id="rc">${post.replyCount || 0}</span>）</div>
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:6px 18px;margin-bottom:18px" id="replyBox">${repliesHtml}</div>

        ${me ? `
        <div style="background:var(--mdui-color-surface);border:1px solid var(--mdui-color-outline-variant);border-radius:16px;padding:16px">
          <div style="font-weight:600;margin-bottom:10px">发表回复</div>
          <div id="repRow" class="hidden" style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:8px">
            <span style="color:var(--mdui-color-on-surface-variant)">正在回复</span><b id="repName"></b>
            <a href="javascript:;" id="repCancel" style="color:var(--mdui-color-outline)">取消</a>
          </div>
          <textarea class="textarea-input" id="replyInput" placeholder="友善发言，理性讨论……（支持 @用户名 提醒；使用 Markdown；Ctrl + Enter 快捷发送）" maxlength="5000"   rows="4"></textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="btn primary" id="btnReply"><span class="material-icons" style="font-size:18px">send</span>发布回复</button></div>
        </div>` : `
        <div class="empty-tip" style="padding:24px">
          <a href="/login"><button type="button" class="btn primary">登录后参与回复</button></a>
        </div>`}
      </div>`;

    view.querySelector('#btnLike').addEventListener('click', async () => {
      if (!me) {
        location.href = '/login';
        return;
      }
      try {
        const d = await App.post('/api/forum/posts/' + postId + '/like');
        const btn = view.querySelector('#btnLike');
        btn.setAttribute('icon', d.liked ? 'thumb_up' : 'thumb_up_off_alt');
        view.querySelector('#likeN').textContent = d.likeCount;
      } catch (e) {
        App.toast(e.message);
      }
    });

    if (isMine) {
      view.querySelector('#btnEdit').addEventListener('click', () => {
        const panel = document.createElement('div');
        panel.innerHTML = `
          <input class="text-input" type="text" id="eTitle" placeholder="标题" maxlength="120"   value="${A(post.title)}">
          <div style="height:12px"></div>
          <textarea class="textarea-input" id="eContent" placeholder="正文" maxlength="20000"   rows="10"></textarea>`;
        App.dialog({
          headline: '编辑帖子',
          body: panel,
          actions: [
            { text: '取消' },
            {
              text: '保存',
              onClick: async () => {
                const nt = panel.querySelector('#eTitle').value.trim();
                const nc = panel.querySelector('#eContent').value.trim();
                if (!nt || !nc) {
                  App.toast('标题和正文不能为空');
                  return false;
                }
                await App.post('/api/forum/posts/' + postId, { title: nt, content: nc });
                App.toast('已保存');
                location.reload();
                return false;
              }
            }
          ]
        });
      });
      view.querySelector('#btnDel').addEventListener('click', () => {
        App.confirmDialog('确定删除该帖子？', async () => {
          try {
            await App.post('/api/forum/posts/' + postId + '/delete');
            App.toast('已删除');
            location.href = '/forum/' + post.boardId;
          } catch (e) {
            App.toast(e.message);
          }
        }, { title: '删除帖子', danger: true });
      });
    }
    if (me && me.isAdmin) {
      view.querySelector('#btnPin').addEventListener('click', async () => {
        try {
          const d = await App.post('/api/forum/posts/' + postId + '/pin');
          App.toast(d.isPinned ? '已置顶' : '已取消置顶');
          location.reload();
        } catch (e) {
          App.toast(e.message);
        }
      });
    }

    const repRow = view.querySelector('#repRow');
    const repName = view.querySelector('#repName');
    view.querySelectorAll('#replyBox a[data-act]').forEach((a) => {
      a.addEventListener('click', async () => {
        const act = a.dataset.act;
        const id = a.dataset.id;
        if (act === 'reply') {
          replyTarget = { id: Number(id), name: a.dataset.name };
          repName.textContent = a.dataset.name;
          repRow.classList.remove('hidden');
          repRow.style.display = '';
          view.querySelector('#replyInput').focus();
        } else if (act === 'del') {
          App.confirmDialog('删除这条回复？', async () => {
            try {
              await App.post('/api/forum/replies/' + id + '/delete');
              App.toast('已删除');
              location.reload();
            } catch (e) {
              App.toast(e.message);
            }
          }, { danger: true, title: '删除回复' });
        } else if (act === 'pin') {
          try {
            await App.post('/api/forum/replies/' + id + '/pin');
            location.reload();
          } catch (e) {
            App.toast(e.message);
          }
        }
      });
    });

    if (repRow && view.querySelector('#repCancel')) {
      view.querySelector('#repCancel').addEventListener('click', () => {
        replyTarget = null;
        repRow.classList.add('hidden');
        repRow.style.display = 'none';
      });
    }

    const replyInput = view.querySelector('#replyInput');
    if (replyInput) {
      const replyBtn = view.querySelector('#btnReply');
      replyBtn.addEventListener('click', submitReply);
      replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReply();
      });
      App.bindMention(replyInput, () => mentionCands);
    }

    async function submitReply() {
      const input = view.querySelector('#replyInput');
      const content = input.value.trim();
      if (!content) {
        App.toast('回复内容不能为空');
        return;
      }
      const btn = view.querySelector('#btnReply');
      App.setBusy(btn, true);
      try {
        await App.post('/api/forum/posts/' + postId + '/replies', {
          content,
          parentId: replyTarget ? replyTarget.id : 0
        });
        App.toast('回复成功');
        const hitBot = (content.match(/@([^\s@]+)/g) || []).map((x) => x.slice(1)).find((n) => botUsernames.some((b) => b && b.toLowerCase() === n.toLowerCase()));
        if (hitBot) App.toast('已 @机器人 ' + hitBot + '，稍候自动回复');
        location.reload();
      } catch (e) {
        App.toast(e.message);
        App.setBusy(btn, false);
      }
    }
  }

  main();
})();
