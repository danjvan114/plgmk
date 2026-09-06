(function () {
  'use strict';
  const App = window.App;
  const A = App.esc;

  async function loadBots() {
    const d = await App.get('/api/bots');
    return d;
  }

  function fieldRow(id, label, val, ph) {
    return `<div class="form-row"><label class="field-label" for="${id}">${A(label)}</label>
      <input class="text-input" id="${id}" type="text" placeholder="${A(ph || '')}" value="${A(val || '')}"></div>`;
  }

  function buildEditorPanel(scope) {
    const host = document.createElement('div');
    host.style.cssText = 'max-width:560px';
    host.innerHTML = `
      ${fieldRow('bk_name', '机器人名称 *', scope.name, '例如：客服助手')}
      ${fieldRow('bk_url', 'API 地址 *', scope.apiUrl, 'https://api.openai.com/v1 或 stub://demo')}
      <div class="form-row"><label class="field-label" for="bk_model">模型名称 *</label>
        <input class="text-input" id="bk_model" type="text" placeholder="gpt-4o-mini" value="${A(scope.model || '')}"></div>
      <div class="form-row"><label class="field-label" for="bk_key">API Key</label>
        <input class="text-input" id="bk_key" type="password" placeholder="${scope.hasKey ? '已保存（留空则不修改）' : 'sk-…'}" value=""></div>
      <div class="form-row"><label class="field-label" for="bk_ua">发帖账号（用户中心用户名）*</label>
        <input class="text-input" id="bk_ua" type="text" value="${A((scope.account && scope.account.username) || '')}"></div>
      <div class="form-row"><label class="field-label" for="bk_un">回帖显示昵称</label>
        <input class="text-input" id="bk_un" type="text" value="${A((scope.account && scope.account.nickname) || '')}"></div>
      <div class="form-row"><label class="field-label" for="bk_prob">回复概率（0-100%）</label>
        <input class="text-input" id="bk_prob" type="number" min="0" max="100" value="${scope.probability === undefined ? 100 : scope.probability}"></div>
      <div class="form-row"><label class="field-label" for="bk_cd">触发冷却（秒）</label>
        <input class="text-input" id="bk_cd" type="number" min="0" value="${scope.cooldownSec || 0}"></div>
      <div class="form-row"><label class="field-label" for="bk_prompt">人设 / 指令提示词</label>
        <textarea class="textarea-input" id="bk_prompt" rows="3" placeholder="你是一个乐于助人的社区助手，回答简练友好……">${A(scope.prompt || '')}</textarea></div>
      <div class="field-hint" id="bk_testnote" style="margin-bottom:8px">改动地址/Key/模型后，需先「测试连接」成功才能保存。</div>`;
    return host;
  }

  function botsManager(host) {
    const root = host;
    let list = [];

    function renderBots() {
      root.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <span style="font-size:13px;color:var(--mdui-color-on-surface-variant)">概率（0-100%）= 每次新帖 / 新回复被机器人自动回复的几率；冷却（秒）= 同一帖触发后机器人再次发言的最短间隔，0 表示不限制。</span>
          <button type="button" class="btn primary" id="botAdd"><span class="material-icons" style="font-size:18px">smart_toy</span>新增机器人</button>
        </div>
        <div id="botList">${renderList()}</div>`;
      root.querySelector('#botAdd').addEventListener('click', () => botDialog(null));
      bindList();
    }

    function renderList() {
      if (!list.length) return '<div class="empty-tip"><div class="material-icons icon">smart_toy</div>还没有 AI 机器人，点「新增机器人」添加</div>';
      return `<div class="list-wrap">` + list.map((b) => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--mdui-color-outline-variant);${b.enabled ? '' : 'opacity:.55;filter:grayscale(.4)'}">
          <span class="material-icons" style="color:${b.enabled ? '#1a7f37' : 'var(--mdui-color-outline)'}">smart_toy</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <b>${A(b.name)}</b>
              ${b.enabled ? '<span class="chip tonal">运行中</span>' : '<span class="chip outline">已停用</span>'}
              ${b.lastError ? '<span class="chip tonal" style="color:#b3261e">最近失败</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--mdui-color-on-surface-variant);margin-top:2px">
              模型 ${A(b.model || '—')} · 概率 ${b.probability}%<span class="material-icons" style="font-size:14px;color:var(--mdui-color-on-surface-variant);vertical-align:-2px" title="概率（0-100%）：每次新帖 / 新回复被机器人自动回复的几率">help_outline</span> · 冷却 ${b.cooldownSec}s<span class="material-icons" style="font-size:14px;color:var(--mdui-color-on-surface-variant);vertical-align:-2px" title="冷却（秒）：同一帖触发后机器人再次发言的最短间隔，0 表示不限制">help_outline</span> · 账号 @${A(b.account.username)}
              · 已回复 ${b.replyCount} 条${b.lastOkAt ? ' · 最近 ' + App.timeAgo(b.lastOkAt) : ''}
            </div>
          </div>
          <div style="display:flex;gap:4px;flex:none;align-items:center">
            ${b.canToggle || b.mine ? `<button type="button" class="btn tonal sm" data-enable="${b.id}" title="启用/禁用本机器人的自动回复">${b.enabled ? '停用' : '启用'}</button>` : ''}
            <button type="button" class="ke-iconbtn" data-logs="${b.id}" title="日志"><span class="material-icons">receipt_long</span></button>
            <button type="button" class="ke-iconbtn" data-edit="${b.id}"><span class="material-icons">edit</span></button>
            <button type="button" class="ke-iconbtn" data-del="${b.id}" style="color:#b3261e"><span class="material-icons">delete</span></button>
          </div>
        </div>`).join('') + `</div>`;
    }

    function bindList() {
      const lr = root.querySelector('#botList');
      if (!lr) return;
      lr.querySelectorAll('[data-enable]').forEach((el) => el.addEventListener('click', async () => {
        try {
          const b = list.find((x) => String(x.id) === el.getAttribute('data-enable'));
          if (!b) return;
          await App.post('/api/bots/' + b.id + '/enabled', { enabled: !b.enabled });
          App.toast('已更新');
          await refresh();
        } catch (e) { App.toast(e.message); }
      }));
      lr.querySelectorAll('[data-logs]').forEach((el) => el.addEventListener('click', async () => {
        try {
          const b = list.find((x) => String(x.id) === el.getAttribute('data-logs'));
          if (!b) return logsDialog(b);
        } catch (e) { App.toast(e.message); }
      }));
      lr.querySelectorAll('[data-edit]').forEach((el) => el.addEventListener('click', () => {
        const b = list.find((x) => String(x.id) === el.getAttribute('data-edit'));
        if (b) botDialog(b);
      }));
      lr.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', () => {
        const b = list.find((x) => String(x.id) === el.getAttribute('data-del'));
        if (!b) return;
        App.confirmDialog(`删除机器人《${b.name}》及其日志？`, async () => {
          try { await App.post('/api/bots/' + b.id + '/delete'); App.toast('已删除'); await refresh(); }
          catch (e) { App.toast(e.message); }
        }, { title: '删除机器人', danger: true });
      }));
    }

    async function refresh() {
      const d = await loadBots();
      list = d.items || [];
      renderBots();
    }

    function botDialog(item) {
      const isEdit = !!item;
      const scope = isEdit ? JSON.parse(JSON.stringify(item)) : { probability: 100, cooldownSec: 0 };
      let nonce = '';
      const panel = buildEditorPanel(scope);
      const orig = { apiUrl: scope.apiUrl, model: scope.model, key: scope.apiKey };
      App.dialog({
        headline: isEdit ? '编辑机器人' : '新增 AI 机器人',
        body: panel,
        actions: [
          { text: '取消' },
          { text: '测试连接', kind: 'tonal', onClick: async () => {
            const url = panel.querySelector('#bk_url').value.trim();
            const model = panel.querySelector('#bk_model').value.trim();
            const key = panel.querySelector('#bk_key').value.trim();
            const prompt = panel.querySelector('#bk_prompt').value.trim();
            if (!url) { App.toast('请先填写 API 地址'); return false; }
            if (url !== 'stub://demo' && !model) { App.toast('请填写模型名称'); return false; }
            try {
              const r = await App.post('/api/bots/test', { apiUrl: url, model, apiKey: key || orig.key, prompt, botId: isEdit ? item.id : 0 });
              nonce = r.nonce;
              const note = panel.querySelector('#bk_testnote');
              if (note) note.textContent = '连接成功，可以保存了';
              App.toast('连接成功');
            } catch (e) { App.toast('连接失败：' + (e.message || '')); }
            return false;
          } },
          { text: isEdit ? '保存修改' : '添加', kind: 'primary', onClick: async () => {
            const payload = {
              name: panel.querySelector('#bk_name').value.trim(),
              apiUrl: panel.querySelector('#bk_url').value.trim(),
              model: panel.querySelector('#bk_model').value.trim(),
              apiKey: panel.querySelector('#bk_key').value.trim() || undefined,
              prompt: panel.querySelector('#bk_prompt').value.trim(),
              probability: Number(panel.querySelector('#bk_prob').value),
              cooldownSec: Number(panel.querySelector('#bk_cd').value || 0),
              account: {
                username: panel.querySelector('#bk_ua').value.trim(),
                nickname: panel.querySelector('#bk_un').value.trim(),
                avatar: ''
              }
            };
            if (payload.apiKey === undefined) delete payload.apiKey;
            if (!payload.name) { App.toast('请填写名称'); return false; }
            if (!payload.apiUrl) { App.toast('请填写 API 地址'); return false; }
            if (!payload.account.username) { App.toast('请填写发帖账号用户名'); return false; }
            const url = payload.apiUrl;
            const credsChanged = url !== orig.apiUrl || payload.model !== orig.model || (!!payload.apiKey && payload.apiKey !== orig.key);
            if (url !== 'stub://demo' && credsChanged && !nonce) { App.toast('连接信息有变更，请先点击「测试连接」'); return false; }
            try {
              if (isEdit) await App.post('/api/bots/' + item.id, payload);
              else await App.post('/api/bots', payload);
              App.toast('已保存');
              await refresh();
              return false;
            } catch (e) { App.toast(e.message); return false; }
          } }
        ]
      });
    }

    async function logsDialog(item) {
      let d;
      try { d = await App.get('/api/bots/' + item.id + '/logs?size=50'); }
      catch (e) { App.toast(e.message); return; }
      const body = document.createElement('div');
      body.innerHTML = d.items.length ? `<div style="max-height:60vh;overflow:auto;min-width:380px">` + d.items.map((l) => `
        <div style="padding:10px 4px;border-bottom:1px solid var(--mdui-color-outline-variant)">
          <div style="font-size:12px;color:var(--mdui-color-on-surface-variant)">${l.kind === 'post' ? '新帖触发' : l.kind === 'reply' ? '回复触发' : '未知'} · ${l.ok ? '成功' : '失败'}${l.latencyMs ? ' · ' + l.latencyMs + 'ms' : ''} · ${App.timeAgo(l.createdAt)}${l.postId ? ' · <a href="/post/' + l.postId + '">跳转</a>' : ''}</div>
          <div style="font-size:13px;margin-top:3px;word-break:break-word">${l.ok ? A(l.textPreview) : A(l.error || '失败')}</div>
        </div>`).join('') + `</div>` : `<div class="empty-tip">暂无触发记录</div>`;
      App.dialog({ headline: '机器人日志 · ' + A(item.name), body, actions: [{ text: '关闭' }] });
    }

    renderBots();
    refresh();
    return { refresh };
  }

  App.botsManager = botsManager;
})();
