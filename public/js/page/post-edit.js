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
    let boards = [];
    try {
      const d = await App.get('/api/forum/boards');
      boards = d.boards;
    } catch (e) { /* ignore */ }

    const draftKey = 'ke_post_draft';
    const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');

    view.innerHTML = `
      <div class="page-title"><div><h1>发布帖子</h1></div></div>
      <div style="max-width:860px">
        <div style="display:grid;grid-template-columns:240px 1fr;gap:14px">
          <select class="select-input ke-select" id="fBoard" label="选择板块 *" boards.length="" :="" disabled="">
            ${boards.map((b) => `<option value="${b.id}">${A(b.name)}</option>`).join('')}
          </select>
          <input class="text-input" type="text" id="fTitle" placeholder="标题 *" maxlength="120"   value="${A(draft && draft.title ? draft.title : '')}">
        </div>
        <div style="margin:14px 0">
          <input class="text-input" type="text" id="fTags" placeholder="标签（可选，空格分隔）"  value="${A(draft && draft.tags ? draft.tags : '')}">
        </div>
        <textarea class="textarea-input" id="fContent" placeholder="支持 Markdown：加粗 **文字**、行内 code、代码块、[链接](https://)、自动识别 URL；输入 @用户名 可提醒对方" maxlength="20000"   rows="14"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span style="font-size:12px;color:var(--mdui-color-outline)">草稿已自动保存在本地浏览器（${draft ? App.fmtTime(draft.time) : '无'}）</span>
          <div style="display:flex;gap:10px">
            <button type="button" class="btn text" id="btnPrev"><span class="material-icons" style="font-size:18px">visibility</span>预览</button>
            <button type="button" class="btn text" id="btnCancel">清空草稿</button>
            <button type="button" class="btn primary" id="btnSubmit"><span class="material-icons" style="font-size:18px">send</span>发布</button>
          </div>
        </div>
      </div>`;

    const boardSel = view.querySelector('#fBoard');
    if (App.qs.board) boardSel.value = String(App.qs.board);
    const titleEl = view.querySelector('#fTitle');
    const tagsEl = view.querySelector('#fTags');
    const contentEl = view.querySelector('#fContent');

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
