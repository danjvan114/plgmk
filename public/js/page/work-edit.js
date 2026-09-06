(function () {
  'use strict';
  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  const pathId = (location.pathname.match(/^\/work\/(\d+)/) || [])[1] || (new URLSearchParams(location.search)).get('id') || '';
  const isEdit = !!pathId;

  const state = {
    loading: isEdit,
    work: null,
    saving: false,
    extensionList: []
  };

  function template() {
    if (state.loading) {
      return '<div class="ke-center"><span class="ke-spinner lg"></span></div>';
    }
    const w = state.work || {};
    const p = (w.player) || {};
    const f = p.f || w.fileUrl || '';
    const u = p.u || '';
    const o = p.o || '';
    const auth = p.auth || 0;
    const auto = p.auto || 0;
    const vRaw = p.v || '';
    if (vRaw && !state.extensionList.length) {
      try {
        const decoded = Buffer.from(vRaw, 'base64').toString('utf8');
        const m = decoded.match(/^\[(.*)\]$/s);
        if (m) state.extensionList = m[1].split(',').map((x) => x.trim()).filter(Boolean);
      } catch (e) { /* ignore */ }
    }
    return `
<div class="fade-enter">
  <div class="page-title">
    <div>
      <h1>${isEdit ? '编辑作品' : '发布作品'}</h1>
      <div class="sub">作品以 KN Expanse 播放器运行 · 文件链接 + 扩展配置</div>
    </div>
    <a href="${isEdit ? '/work/' + A(pathId) : '/workpool'}"><button type="button" class="btn outline">返回</button></a>
  </div>

  <div class="plugin-card" style="padding:20px">
    <div class="form-row">
      <label class="field-label" for="wTitle">作品标题 *</label>
      <input class="text-input" id="wTitle" type="text" maxlength="100" placeholder="例：星空躲弹幕" value="${A(w.title)}">
    </div>
    <div class="form-row">
      <label class="field-label" for="wDesc">作品介绍</label>
      <textarea class="textarea-input" id="wDesc" rows="5" maxlength="8000" placeholder="说说你的作品玩法与亮点">${A(w.description || '')}</textarea>
    </div>
    <div class="form-row">
      <label class="field-label" for="wTags">标签</label>
      <input class="text-input" id="wTags" type="text" placeholder="例：弹幕, 休闲, 单机" value="${A((w.tags || []).join(', '))}">
    </div>
  </div>

  <div class="section-title"><span class="material-icons" style="color:var(--mdui-color-primary)">link</span> 播放器参数</div>
  <div class="plugin-card" style="padding:20px">
    <div class="form-row">
      <label class="field-label" for="wF">f · 作品文件直链 *</label>
      <input class="text-input" id="wF" type="url" placeholder="http://127.0.0.1:5000/1.bcmkn" value="${A(f)}">
      <div class="field-hint">必填。播放器将 fetch 此 URL 来加载作品内容。</div>
    </div>

    <div class="form-row">
      <label class="field-label" for="wO">o · 扩展加载器</label>
      <select class="select-input ke-select" id="wO">
        <option value="">不加载扩展</option>
        <option value="1"${o === '1' ? ' selected' : ''}>1 = KE 扩展 (KEloader.js)</option>
        <option value="2"${o === '2' ? ' selected' : ''}>2 = CUELoader 扩展 (cue.user.js)</option>
      </select>
      <div class="field-hint">两个加载器互斥，只能选 1 个。</div>
    </div>

    <div class="form-row">
      <label class="field-label" for="wV">v · 扩展 URL 列表（每行一个，自动 base64）</label>
      <textarea class="textarea-input" id="wV" rows="3" placeholder="https://example.com/ext1.js
https://example.com/ext2.js">${A(state.extensionList.join('\n'))}</textarea>
      <div class="field-hint">填写一行一个 URL，保存时自动编码为 [<code>url1</code>,<code>url2</code>] 数组（base64）传给播放器。</div>
    </div>

    <div class="form-row">
      <label class="field-label" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="wAuth"${auth ? ' checked' : ''} style="vertical-align:-2px">开启加密 (auth=1)
      </label>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
        <input class="text-input" id="wU" type="text" placeholder="鉴权字符（默认 123456）" value="${A(u)}" style="flex:1">
      </div>
      <div class="field-hint">开启后，f 拉取的密文经 window.kauth.c(raw, u) 解密后再渲染。</div>
    </div>

    <div class="form-row">
      <label class="field-label" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="wAuto"${auto ? ' checked' : ''} style="vertical-align:-2px">自动播放 (auto=1)
      </label>
      <div class="field-hint">开启后播放器加载完成后自动跳过封面蒙层开始运行。</div>
    </div>

    <div class="form-row">
      <label class="field-label" for="wThumb">缩略图（可选，URL 或 /uploads/...）</label>
      <input class="text-input" id="wThumb" type="text" placeholder="https://..." value="${A(w.thumbnail || '')}">
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">
    <button type="button" class="btn primary lg" id="btnSave">${isEdit ? '保存修改' : '发布作品'}</button>
    <a href="${isEdit ? '/work/' + A(pathId) : '/workpool'}"><button type="button" class="btn text lg">取消</button></a>
  </div>
</div>`;
  }

  function parseV(s) {
    if (!s) return [];
    return s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  }
  function encodeV(arr) {
    if (!arr.length) return '';
    return Buffer.from('[' + arr.join(',') + ']', 'utf8').toString('base64');
  }

  function collect() {
    const f = (view.querySelector('#wF') || {}).value || '';
    const o = (view.querySelector('#wO') || {}).value || '';
    const v = encodeV(parseV((view.querySelector('#wV') || {}).value || ''));
    const u = (view.querySelector('#wU') || {}).value || '';
    const auth = (view.querySelector('#wAuth') || {}).checked ? 1 : 0;
    const auto = (view.querySelector('#wAuto') || {}).checked ? 1 : 0;
    const title = (view.querySelector('#wTitle') || {}).value || '';
    const description = (view.querySelector('#wDesc') || {}).value || '';
    const tags = ((view.querySelector('#wTags') || {}).value || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const thumbnail = (view.querySelector('#wThumb') || {}).value || '';
    return { title: title.trim(), description, tags, thumbnail, type: 'player', f, u, auth, o, v, auto };
  }

  async function submit() {
    if (state.saving) return;
    const payload = collect();
    if (!payload.title) return App.toast('请填写作品标题');
    if (!payload.f) return App.toast('请填写作品文件直链 (f)');
    if (payload.o && payload.o !== '1' && payload.o !== '2') payload.o = '';
    state.saving = true;
    const btn = view.querySelector('#btnSave');
    if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
    try {
      const res = isEdit
        ? await App.post('/api/works/' + pathId, payload)
        : await App.post('/api/works', payload);
      App.toast(isEdit ? '已保存' : '发布成功');
      const id = (res.work && res.work.id) || pathId;
      setTimeout(() => { location.href = '/work/' + id; }, 500);
    } catch (e) {
      App.toast(e.message || '提交失败');
      state.saving = false;
      if (btn) { btn.disabled = false; btn.textContent = isEdit ? '保存修改' : '发布作品'; }
    }
  }

  function render() {
    view.innerHTML = template();
    if (state.loading) return;
    bindEvents();
    if (window.MDURipple) window.MDURipple.scan(view);
  }

  function bindEvents() {
    const save = view.querySelector('#btnSave');
    if (save) save.addEventListener('click', submit);
  }

  async function main() {
    await App.ready;
    if (!App.state.me) {
      view.innerHTML = '<div class="empty-tip"><div class="material-icons icon">login</div>请先<a href="/login" style="color:var(--mdui-color-primary)">登录</a>后再发布作品</div>';
      return;
    }
    if (isEdit) {
      try {
        const d = await App.get('/api/works/' + pathId);
        state.work = d.work || d;
        if (state.work.author !== App.state.me.username && !App.state.me.isAdmin) {
          view.innerHTML = '<div class="empty-tip"><div class="material-icons icon">block</div>只能编辑自己的作品</div>';
          return;
        }
      } catch (e) {
        view.innerHTML = '<div class="empty-tip">' + A(e.message || '加载失败') + '</div>';
        return;
      }
    }
    state.loading = false;
    render();
  }

  main();
})();