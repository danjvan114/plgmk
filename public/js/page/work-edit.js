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

  function bindEvents() {
    const save = view.querySelector('#btnSave');
    if (save) save.addEventListener('click', submit);
  }

  function fillForm() {
    const w = state.work;
    if (!w) return;
    const p = w.player || {};
    const f = p.f || w.fileUrl || '';
    const u = p.u || '';
    const o = p.o || '';
    const auth = p.auth || 0;
    const auto = p.auto || 0;
    const vRaw = p.v || '';

    view.querySelector('#wTitle').value = w.title || '';
    view.querySelector('#wDesc').value = w.description || '';
    view.querySelector('#wTags').value = (w.tags || []).join(', ');
    view.querySelector('#wF').value = f;
    view.querySelector('#wO').value = o;
    view.querySelector('#wU').value = u;
    view.querySelector('#wAuth').checked = !!auth;
    view.querySelector('#wAuto').checked = !!auto;
    view.querySelector('#wThumb').value = w.thumbnail || '';

    // 解析 base64 v → 扩展列表，填入 wV textarea
    if (vRaw) {
      try {
        const decoded = Buffer.from(vRaw, 'base64').toString('utf8');
        const m = decoded.match(/^\[(.*)\]$/s);
        if (m) {
          state.extensionList = m[1].split(',').map((x) => x.trim()).filter(Boolean);
          view.querySelector('#wV').value = state.extensionList.join('\n');
        }
      } catch (e) { /* ignore */ }
    }
  }

  function setupStaticText() {
    if (!isEdit) return;
    view.querySelector('.page-title h1').textContent = '编辑作品';
    view.querySelector('#btnSave').textContent = '保存修改';
    view.querySelector('#backLink').href = '/work/' + A(pathId);
    view.querySelector('#cancelLink').href = '/work/' + A(pathId);
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
    setupStaticText();
    bindEvents();
    if (state.work) fillForm();
    if (window.MDURipple) window.MDURipple.scan(view);
  }

  async function main() {
    await App.ready;
    if (!App.state.me) {
      view.innerHTML = '<div class="empty-tip"><div class="material-icons icon">login</div>请先<a href="/login" style="color:var(--mdui-color-primary)">登录</a>后再发布作品</div>';
      return;
    }

    // 编辑模式：显示 loading 覆盖层
    let loadingOverlay = null;
    if (isEdit) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'ke-center';
      loadingOverlay.style.cssText = 'position:absolute;inset:0;z-index:10;background:var(--mdui-color-surface);border-radius:inherit';
      loadingOverlay.innerHTML = '<span class="ke-spinner lg"></span>';
      view.style.position = 'relative';
      view.appendChild(loadingOverlay);
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

    if (loadingOverlay) loadingOverlay.remove();
    state.loading = false;
    render();
  }

  main();
})();
