(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  const pathId = location.pathname === '/upload' ? '' : (location.pathname.match(/^\/plugin\/(\d+)/) || [])[1] || '';
  const isEdit = !!pathId;

  const state = {
    loading: isEdit,
    plugin: null,
    icon: '',
    cover: '',
    images: [],
    file: null,
    mode: 'file',
    cfg: { maxBytes: 10 * 1048576, imageMaxBytes: 10 * 1048576, pluginExt: [], imageExt: [] },
    saving: false
  };

  function acceptFor(exts) {
    return (exts || []).map((e) => '.' + e).join(',');
  }

  let fileUploader = null;
  let iconUploader = null;
  let shotsUploader = null;

  function template() {
    if (state.loading) {
      return '<div class="ke-center"><span class="ke-spinner lg"></span></div>';
    }
    const p = state.plugin || {};
    const mode = state.mode;
    const fileVal = p.fileUrl || '';
    return `
<div class="fade-enter">
  <div class="page-title">
    <div>
      <h1>${isEdit ? '编辑插件' : '上传插件'}</h1>
      <div class="sub">${isEdit ? '更新插件信息与文件' : '发布你的插件到 KE 插件市场'}</div>
    </div>
    <a href="${isEdit ? '/plugin/' + A(pathId) : '/market'}"><button type="button" class="btn outline">返回</button></a>
  </div>

  <div class="plugin-card" style="padding:20px">
    <div class="form-row">
      <label class="field-label" for="fName">插件名称 *</label>
      <input class="text-input" id="fName" type="text" maxlength="80" placeholder="例如：迷你浏览器面板" value="${A(p.name)}">
    </div>
    <div class="form-row">
      <label class="field-label" for="fVersion">版本号</label>
      <input class="text-input" id="fVersion" type="text" maxlength="32" placeholder="1.0.0" value="${A(p.version)}">
    </div>
    <div class="form-row">
      <label class="field-label" for="fTags">标签 *（逗号分隔，最多 8 个）</label>
      <input class="text-input" id="fTags" type="text" placeholder="工具, 面板, 示例" value="${A((p.tags || []).join(', '))}">
      <div class="field-hint">标签决定插件会被哪些人搜到</div>
    </div>
    <div class="form-row">
      <label class="field-label" for="fDesc">插件介绍 *（支持 Markdown）</label>
      <textarea class="textarea-input" id="fDesc" rows="12" maxlength="4000" placeholder="介绍你的插件：功能、用法、截图说明……">${A(p.description || '')}</textarea>
    </div>
  </div>

  <div class="section-title"><span class="material-icons" style="color:var(--mdui-color-primary)">image</span> 图标与截图</div>
  <div class="plugin-card" style="padding:20px">
    <div class="form-row">
      <label class="field-label">插件图标</label>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <img id="iconPrev" src="${A(state.icon)}" alt="" style="width:64px;height:64px;border-radius:14px;object-fit:cover;background:var(--mdui-color-surface-container-high)${state.icon ? '' : ';display:none'}">
        <div id="up_icon" style="flex:1;min-width:220px"></div>
      </div>
    </div>
    <div class="form-row">
      <label class="field-label">展示截图（最多 8 张）</label>
      <div id="up_shots"></div>
      <div id="shotPreview" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"></div>
    </div>
  </div>

  <div class="section-title"><span class="material-icons" style="color:var(--mdui-color-primary)">inventory_2</span> 插件文件</div>
  <div class="plugin-card" style="padding:20px">
    <div class="seg-group" id="srcGroup" data-value="${mode}">
      <button type="button" class="seg-item" data-value="file">上传文件</button>
      <button type="button" class="seg-item" data-value="url">外部链接</button>
    </div>
    <div class="form-row" style="margin-top:16px">
      <div id="pane_file"${mode === 'file' ? '' : ' style="display:none"'}>
        <div id="up_file"></div>
        <div class="field-hint" id="fileInfo">${p.fileName ? '当前文件：' + A(p.fileName) : '支持 ' + (state.cfg.pluginExt || []).join(' / ') + '，单个不超过 ' + Math.floor(state.cfg.maxBytes / 1048576) + ' MB'}</div>
      </div>
      <div id="pane_url"${mode === 'url' ? '' : ' style="display:none"'}>
        <label class="field-label" for="fUrl">外部下载链接 *</label>
        <input class="text-input" id="fUrl" type="url" placeholder="https://example.com/plugin.zip" value="${A(fileVal)}">
        <div class="field-hint">链接必须以 http:// 或 https:// 开头，用户下载时跳转到该地址</div>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap">
    <button type="button" class="btn primary lg" id="btnSave">${isEdit ? '保存修改' : '发布插件'}</button>
    <a href="${isEdit ? '/plugin/' + A(pathId) : '/market'}"><button type="button" class="btn text lg">取消</button></a>
  </div>
</div>`;
  }

  function render() {
    view.innerHTML = template();
    if (state.loading) return;
    bindUploaders();
    bindEvents();
    renderShots();
    syncPane();
    if (window.MDURipple) window.MDURipple.scan(view);
  }

  function bindUploaders() {
    const wrap = (id, opts, onPick) => {
      const el = view.querySelector('#' + id);
      if (!el || el.dataset.bound === '1') return null;
      el.dataset.bound = '1';
      if (!App.createUploader) return null;
      const up = App.createUploader(opts);
      el.appendChild(up);
      up.addEventListener('change', () => {
        const list = up.getValue();
        if (onPick) onPick(list);
      });
      return up;
    };

    iconUploader = wrap('up_icon', {
      kind: 'image',
      multiple: false,
      maxBytes: state.cfg.imageMaxBytes,
      accept: acceptFor(state.cfg.imageExt),
      label: '选择图标'
    }, (list) => {
      if (!list.length) return;
      state.icon = list[list.length - 1].url;
      const img = view.querySelector('#iconPrev');
      if (img) { img.src = state.icon; img.style.display = ''; }
    });

    shotsUploader = wrap('up_shots', {
      kind: 'image',
      multiple: true,
      maxBytes: state.cfg.imageMaxBytes,
      accept: acceptFor(state.cfg.imageExt),
      label: '选择截图'
    }, (list) => {
      state.images = list.map((r) => r.url).slice(0, 8);
      renderShots();
    });

    fileUploader = wrap('up_file', {
      kind: 'plugin',
      multiple: false,
      maxBytes: state.cfg.maxBytes,
      accept: acceptFor(state.cfg.pluginExt),
      label: '选择插件文件'
    }, (list) => {
      state.file = list.length ? list[list.length - 1] : null;
      const info = view.querySelector('#fileInfo');
      if (info) {
        info.textContent = state.file
          ? '已选择：' + (state.file.originalName || state.file.filename) + '（' + App.fmtBytes(state.file.size) + '）'
          : '支持 ' + (state.cfg.pluginExt || []).join(' / ') + '，单个不超过 ' + Math.floor(state.cfg.maxBytes / 1048576) + ' MB';
      }
    });
  }

  function renderShots() {
    const box = view.querySelector('#shotPreview');
    if (!box) return;
    box.innerHTML = (state.images || []).map((u, i) => `
      <div style="position:relative;width:104px">
        <img src="${A(u)}" alt="" style="width:104px;height:72px;object-fit:cover;border-radius:10px">
        <button type="button" class="ke-iconbtn" data-rm-shot="${i}" style="position:absolute;top:-6px;right:-6px;width:26px;height:26px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"><span class="material-icons" style="font-size:16px">close</span></button>
      </div>`).join('');
    box.querySelectorAll('[data-rm-shot]').forEach((b) => {
      b.addEventListener('click', () => {
        state.images.splice(Number(b.getAttribute('data-rm-shot')), 1);
        renderShots();
      });
    });
  }

  function syncPane() {
    const group = view.querySelector('#srcGroup');
    if (!group) return;
    const v = group.value || 'file';
    state.mode = v;
    group.querySelectorAll('.seg-item').forEach((it) => it.classList.toggle('active', it.dataset.value === v));
    const pf = view.querySelector('#pane_file');
    const pu = view.querySelector('#pane_url');
    if (pf) pf.style.display = v === 'file' ? '' : 'none';
    if (pu) pu.style.display = v === 'url' ? '' : 'none';
  }

  function bindEvents() {
    const group = view.querySelector('#srcGroup');
    if (group) group.addEventListener('change', syncPane);
    const save = view.querySelector('#btnSave');
    if (save) save.addEventListener('click', submit);
  }

  function collect() {
    const name = (view.querySelector('#fName') || {}).value || '';
    const version = (view.querySelector('#fVersion') || {}).value || '';
    const tagsRaw = (view.querySelector('#fTags') || {}).value || '';
    const desc = (view.querySelector('#fDesc') || {}).value || '';
    const url = (view.querySelector('#fUrl') || {}).value || '';
    const tags = tagsRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const payload = { name: name.trim(), version: version.trim() || '1.0.0', description: desc, tags, icon: state.icon, cover: state.cover, images: state.images };
    if (state.mode === 'url') {
      payload.fileUrl = url.trim();
    } else if (state.file) {
      payload.fileId = String(state.file.url || '').replace(/^\/uploads\//, '');
      payload.fileName = state.file.originalName || state.file.filename;
      payload.fileSize = state.file.size;
      payload.fileSha = state.file.sha256 || '';
    }
    return payload;
  }

  async function submit() {
    if (state.saving) return;
    if (fileUploader && typeof fileUploader.hasFile === 'function' && fileUploader.hasFile()) {
      const fresh = fileUploader.getValue();
      state.file = fresh.length ? fresh[fresh.length - 1] : null;
    }
    const payload = collect();
    if (!payload.name) return App.toast('请填写插件名称');
    if (!payload.description) return App.toast('请填写插件介绍');
    if (!payload.tags.length) return App.toast('请至少填写一个标签');
    if (state.mode === 'url') {
      if (!/^https?:\/\//i.test(payload.fileUrl || '')) return App.toast('外部链接必须以 http:// 或 https:// 开头');
    } else if (!state.file && !isEdit) {
      return App.toast('请上传插件文件');
    }
    state.saving = true;
    const btn = view.querySelector('#btnSave');
    if (btn) { btn.disabled = true; btn.textContent = '提交中…'; }
    try {
      const res = isEdit
        ? await App.post('/api/market/plugins/' + pathId, payload)
        : await App.post('/api/market/plugins', payload);
      App.toast(isEdit ? '已保存' : '发布成功');
      const id = (res.plugin && res.plugin.id) || pathId;
      setTimeout(() => { location.href = '/plugin/' + id; }, 500);
    } catch (e) {
      App.toast(e.message || '提交失败');
      state.saving = false;
      if (btn) { btn.disabled = false; btn.textContent = isEdit ? '保存修改' : '发布插件'; }
    }
  }

  async function main() {
    await App.ready;
    if (!App.state.me) {
      view.innerHTML = '<div class="empty-tip"><div class="material-icons icon">login</div>请先<a href="/login" style="color:var(--mdui-color-primary)">登录</a>后再发布插件</div>';
      return;
    }
    try {
      state.cfg = (await App.get('/api/upload/config')) || state.cfg;
    } catch (e) { /* ignore */ }
    if (isEdit) {
      try {
        const d = await App.get('/api/market/plugins/' + pathId);
        state.plugin = d.plugin || d;
        const p = state.plugin;
        if (p.author !== App.state.me.username && !App.state.me.isAdmin) {
          view.innerHTML = '<div class="empty-tip"><div class="material-icons icon">block</div>只能编辑自己发布的插件</div>';
          return;
        }
        state.icon = p.icon || '';
        state.cover = p.cover || '';
        state.images = p.images || [];
        state.mode = p.fileUrl ? 'url' : 'file';
      } catch (e) {
        view.innerHTML = '<div class="empty-tip">' + A(e.message || '插件加载失败') + '</div>';
        return;
      }
    }
    state.loading = false;
    render();
  }

  main();
})();
