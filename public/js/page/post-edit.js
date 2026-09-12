(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  async function main() {
    await App.ready;
    if (!App.state.me) {
      location.href = '/login';
      return;
    }

    // 加载板块列表填充 select
    const boardSel = view.querySelector('#fBoard');
    let boards = [];
    try {
      const d = await App.get('/api/forum/boards');
      boards = d.boards;
    } catch (e) { /* ignore */ }
    boardSel.innerHTML = boards.map((b) => `<option value="${b.id}">${A(b.name)}</option>`).join('');

    // 读草稿回填
    const draftKey = 'ke_post_draft';
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
    const titleEl = view.querySelector('#fTitle');
    const tagsEl = view.querySelector('#fTags');
    const contentEl = view.querySelector('#fContent');

    if (draft) {
      if (draft.title) titleEl.value = draft.title;
      if (draft.tags) tagsEl.value = draft.tags;
      if (draft.board) boardSel.value = String(draft.board);
    }
    if (App.qs.board) boardSel.value = String(App.qs.board);

    // 更新草稿状态提示
    const draftInfo = view.querySelector('#draftInfo');
    if (draftInfo) {
      draftInfo.textContent = '草稿已自动保存在本地浏览器（' + (draft ? App.fmtTime(draft.time) : '无') + '）';
    }

    function saveDraft() {
      localStorage.setItem(draftKey, JSON.stringify({
        title: titleEl.value,
        tags: tagsEl.value,
        board: boardSel.value,
        time: Date.now()
      }));
    }
    titleEl.addEventListener('input', saveDraft);
    tagsEl.addEventListener('input', saveDraft);
    App.bindMention(contentEl, () => (App.state.me ? [{ username: App.state.me.username, nickname: App.state.me.nickname }] : []));

    view.querySelector('#btnCancel').addEventListener('click', () => {
      localStorage.removeItem(draftKey);
      titleEl.value = '';
      tagsEl.value = '';
      contentEl.value = '';
      const info = view.querySelector('#draftInfo');
      if (info) info.textContent = '草稿已自动保存在本地浏览器（无）';
      App.toast('草稿已清空');
    });

    view.querySelector('#btnPrev').addEventListener('click', () => {
      if (!contentEl.value.trim()) {
        App.toast('正文为空，先写点什么吧');
        return;
      }
      const panel = document.createElement('div');
      panel.style.cssText = 'min-width:60vw;max-height:70vh;overflow:auto';
      panel.innerHTML = `<div class="markdown-body">${App.renderRich(contentEl.value)}</div>`;
      App.dialog({ headline: '预览', body: panel, actions: [{ text: '关闭' }] });
    });

    view.querySelector('#btnSubmit').addEventListener('click', async () => {
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();
      const boardId = Number(boardSel.value) || 0;
      if (!title) {
        App.alertDialog('请填写标题');
        return;
      }
      if (!content) {
        App.alertDialog('请填写正文');
        return;
      }
      if (!boardId) {
        App.alertDialog('请选择板块');
        return;
      }
      const btn = view.querySelector('#btnSubmit');
      App.setBusy(btn, true);
      try {
        const d = await App.post('/api/forum/posts', {
          title, content, boardId,
          tags: tagsEl.value ? tagsEl.value.split(/\s+/).filter(Boolean).slice(0, 5) : []
        });
        localStorage.removeItem(draftKey);
        location.href = '/post/' + d.post.id;
      } catch (e) {
        App.toast(e.message || '发布失败');
        App.setBusy(btn, false);
      }
    });
  }

  main();
})();
