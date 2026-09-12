<template>
  <div class="pedit">
    <header class="pedit__head">
      <div>
        <h1>{{ isEdit ? '编辑插件' : '上传插件' }}</h1>
        <p class="sub">{{ isEdit ? '更新插件信息与文件' : '发布你的插件到 KE 插件市场' }}</p>
      </div>
      <div class="pedit__actions">
        <button class="btn-outline" @click="goBack">返回</button>
      </div>
    </header>

    <!-- loading -->
    <div v-if="loading" class="pedit__loading">
      <div class="spinner"></div>
      <p>加载中…</p>
    </div>

    <!-- 未登录 -->
    <div v-else-if="!loggedIn" class="pedit__empty">
      <p>请先登录后再发布插件</p>
      <button class="btn-primary" @click="login">立即登录</button>
    </div>

    <!-- 无权编辑 -->
    <div v-else-if="denied" class="pedit__empty">
      <p>只能编辑自己发布的插件</p>
      <button class="btn-outline" @click="goBack">返回</button>
    </div>

    <!-- 表单 -->
    <form v-else class="pedit__form" @submit.prevent="submit">
      <section class="form-card">
        <div class="form-row">
          <label>插件名称 <span class="req">*</span></label>
          <input v-model="form.name" type="text" maxlength="80" placeholder="例如：迷你浏览器面板" />
        </div>
        <div class="form-row">
          <label>版本号</label>
          <input v-model="form.version" type="text" maxlength="32" placeholder="1.0.0" />
        </div>
        <div class="form-row">
          <label>标签 <span class="req">*</span>（逗号分隔，最多 8 个）</label>
          <input v-model="tagsRaw" type="text" placeholder="工具, 面板, 示例" />
          <div class="hint">标签决定插件会被哪些人搜到</div>
        </div>
        <div class="form-row">
          <label>插件介绍 <span class="req">*</span>（支持 Markdown）</label>
          <textarea v-model="form.description" rows="10" maxlength="4000"
            placeholder="介绍你的插件：功能、用法、截图说明……"></textarea>
        </div>
      </section>

      <h3 class="section-title">📷 图标与截图</h3>
      <section class="form-card">
        <div class="form-row">
          <label>插件图标</label>
          <div class="upload-row">
            <img v-if="form.icon" :src="form.icon" class="icon-prev" />
            <div v-else class="icon-placeholder">
              <Package :size="32" />
            </div>
            <label class="upload-btn">
              <input type="file" accept="image/*" @change="onIconPick" hidden />
              选择图标
            </label>
          </div>
        </div>
        <div class="form-row">
          <label>展示截图（最多 8 张）</label>
          <div class="upload-row">
            <label class="upload-btn">
              <input type="file" accept="image/*" multiple @change="onShotsPick" hidden />
              选择截图
            </label>
          </div>
          <div v-if="form.images.length" class="shots-preview">
            <div v-for="(u, i) in form.images" :key="i" class="shot-item">
              <img :src="u" />
              <button type="button" class="shot-rm" @click="form.images.splice(i, 1)">×</button>
            </div>
          </div>
        </div>
      </section>

      <h3 class="section-title">📦 插件文件</h3>
      <section class="form-card">
        <div class="seg-group">
          <button type="button" :class="{active: form.mode==='file'}" @click="form.mode='file'">上传文件</button>
          <button type="button" :class="{active: form.mode==='url'}" @click="form.mode='url'">外部链接</button>
        </div>

        <div v-if="form.mode==='file'" class="form-row" style="margin-top:16px">
          <label class="upload-btn" :class="{disabled: !!form.file}">
            <input type="file" :accept="acceptExt(cfg.pluginExt)" @change="onFilePick" hidden />
            选择插件文件
          </label>
          <div class="hint">
            <template v-if="form.file">已选择：{{ form.file.originalName || form.file.filename }}（{{ fmtBytes(form.file.size) }}）</template>
            <template v-else>支持 {{ (cfg.pluginExt || []).join(' / ') }}，单个不超过 {{ cfg.maxBytes / 1048576 }} MB</template>
          </div>
        </div>

        <div v-else class="form-row" style="margin-top:16px">
          <label>外部下载链接 <span class="req">*</span></label>
          <input v-model="form.fileUrl" type="url" placeholder="https://example.com/plugin.zip" />
          <div class="hint">链接必须以 http:// 或 https:// 开头，用户下载时跳转到该地址</div>
        </div>
      </section>

      <div class="pedit__footer">
        <button type="submit" class="btn-primary" :disabled="saving">
          {{ saving ? '提交中…' : (isEdit ? '保存修改' : '发布插件') }}
        </button>
        <button type="button" class="btn-outline" @click="goBack">取消</button>
      </div>
    </form>

    <!-- toast -->
    <div v-if="toast" class="toast" :class="'toast--' + toastType">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Package } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// 路径判断：/upload 是新建，/plugin/:id/edit 是编辑
const pathId = computed(() => {
  if (route.name === 'plugin-edit') return route.params.id;
  return '';
});
const isEdit = computed(() => !!pathId.value);

const loading = ref(true);
const loggedIn = ref(false);
const denied = ref(false);
const saving = ref(false);
const toast = ref('');
const toastType = ref('info');

const cfg = reactive({ maxBytes: 10 * 1048576, imageMaxBytes: 10 * 1048576, pluginExt: [], imageExt: [] });

const form = reactive({
  name: '',
  version: '1.0.0',
  tags: [],
  description: '',
  icon: '',
  cover: '',
  images: [],
  mode: 'file',
  fileUrl: '',
  file: null,       // { url, filename, originalName, size, sha256 }
  fileId: '',
  fileName: '',
  fileSize: 0,
  fileSha: ''
});

const tagsRaw = computed({
  get: () => form.tags.join(', '),
  set: (v) => { form.tags = (v || '').split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 8); }
});

function acceptExt(exts) { return (exts || []).map(e => '.' + e).join(','); }
function fmtBytes(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}
function showToast(msg, type = 'info') {
  toast.value = msg; toastType.value = type;
  setTimeout(() => toast.value = '', 2500);
}
function goBack() {
  if (window.opener) { window.close(); return; }
  router.push(isEdit.value ? `/plugin/${pathId.value}` : '/market');
}
function login() { window.open('/api/auth/login-url', '_blank'); }

// === 文件上传 ===
async function uploadFile(file, kind = 'image') {
  const url = `/api/upload?kind=${kind}`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-File-Name': encodeURIComponent(file.name) },
    body: file
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.msg || '上传失败');
  // 后端 H.ok 直接平铺 url/filename/originalName/size/sha256，没有 file 包装
  return json;
}

async function onIconPick(e) {
  const f = e.target.files?.[0]; if (!f) return;
  if (f.size > cfg.imageMaxBytes) { showToast('图片超过 ' + fmtBytes(cfg.imageMaxBytes), 'err'); return; }
  try {
    const up = await uploadFile(f, 'image');
    form.icon = up.url;
    showToast('图标已上传');
  } catch (err) { showToast(err.message, 'err'); }
  e.target.value = '';
}

async function onShotsPick(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const slots = 8 - form.images.length;
  const todo = files.slice(0, slots);
  for (const f of todo) {
    if (f.size > cfg.imageMaxBytes) { showToast(f.name + ' 超过 ' + fmtBytes(cfg.imageMaxBytes)); continue; }
    try {
      const up = await uploadFile(f, 'image');
      form.images.push(up.url);
    } catch (err) { showToast(err.message, 'err'); break; }
  }
  if (files.length > slots) showToast('最多 8 张，已忽略多余的', 'warn');
  e.target.value = '';
}

async function onFilePick(e) {
  const f = e.target.files?.[0]; if (!f) return;
  if (f.size > cfg.maxBytes) { showToast('文件超过 ' + fmtBytes(cfg.maxBytes), 'err'); return; }
  try {
    const up = await uploadFile(f, 'plugin');
    form.file = up;
    form.fileId = String(up.url || '').replace(/^\/uploads\//, '');
    form.fileName = up.originalName || up.filename;
    form.fileSize = up.size;
    form.fileSha = up.sha256 || '';
    showToast('插件已上传');
  } catch (err) { showToast(err.message, 'err'); }
  e.target.value = '';
}

// === 提交 ===
async function submit() {
  if (saving.value) return;
  const name = form.name.trim();
  const desc = form.description.trim();
  const tags = form.tags;
  if (!name) return showToast('请填写插件名称', 'err');
  if (!desc) return showToast('请填写插件介绍', 'err');
  if (!tags.length) return showToast('请至少填写一个标签', 'err');

  const payload = {
    name, version: form.version.trim() || '1.0.0',
    description: desc, tags,
    icon: form.icon, cover: form.cover, images: form.images
  };

  if (form.mode === 'url') {
    if (!/^https?:\/\//i.test(form.fileUrl || '')) return showToast('外部链接必须以 http:// 或 https:// 开头', 'err');
    payload.fileUrl = form.fileUrl.trim();
  } else {
    if (!form.file && !isEdit.value) return showToast('请上传插件文件', 'err');
    if (form.file) {
      payload.fileId = form.fileId;
      payload.fileName = form.fileName;
      payload.fileSize = form.fileSize;
      payload.fileSha = form.fileSha;
    }
  }

  saving.value = true;
  try {
    const res = await (isEdit.value
      ? fetch(`/api/market/plugins/${pathId.value}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : fetch('/api/market/plugins', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    );
    const json = await res.json();
    if (!json.ok) throw new Error(json.msg || '提交失败');
    showToast(isEdit.value ? '已保存' : '发布成功');
    setTimeout(() => {
      const id = (json.plugin && json.plugin.id) || pathId.value;
      if (window.opener) window.close();
      else router.push(`/plugin/${id}`);
    }, 600);
  } catch (err) {
    showToast(err.message, 'err');
    saving.value = false;
  }
}

// === 初始化 ===
onMounted(async () => {
  try {
    // 1) 检查登录
    const auth = await fetch('/api/auth/state', { credentials: 'include' }).then(r => r.json());
    loggedIn.value = auth.ok && auth.user;
    if (!loggedIn.value) { loading.value = false; return; }

    // 2) 取上传配置
    const c = await fetch('/api/upload/config').then(r => r.json());
    if (c.ok) Object.assign(cfg, c);

    // 3) 编辑模式：拉插件
    if (isEdit.value) {
      const d = await fetch(`/api/market/plugins/${pathId.value}`, { credentials: 'include' }).then(r => r.json());
      if (!d.ok || !d.plugin) { showToast(d.msg || '插件不存在', 'err'); loading.value = false; return; }
      const p = d.plugin;
      if (auth.user.username !== p.author && !auth.user.role?.includes('admin')) {
        denied.value = true; loading.value = false; return;
      }
      form.name = p.name || '';
      form.version = p.version || '';
      form.tags = p.tags || [];
      form.description = p.description || '';
      form.icon = p.icon || '';
      form.cover = p.cover || '';
      form.images = p.images || [];
      form.mode = p.fileUrl ? 'url' : 'file';
      form.fileUrl = p.fileUrl || '';
      form.fileName = p.fileName || '';
    }
  } catch (e) {
    showToast(e.message || '加载失败', 'err');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.pedit {
  min-height: 100vh;
  background: #f4f5f8;
  padding: 32px 40px 80px;
  color: #2c3e50;
  font-family: "Microsoft YaHei", sans-serif;
}

.pedit__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
}
.pedit__head h1 { font-size: 26px; margin: 0 0 6px; font-weight: 700; }
.pedit__head .sub { margin: 0; color: #7f8c9b; font-size: 14px; }

.pedit__loading, .pedit__empty {
  text-align: center;
  padding: 120px 40px;
  color: #7f8c9b;
}
.spinner {
  width: 36px; height: 36px;
  margin: 0 auto 14px;
  border: 3px solid #e0e4ec;
  border-top-color: #4a7dff;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 表单卡片 */
.form-card {
  background: #fff;
  border-radius: 14px;
  padding: 22px 26px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  margin-bottom: 6px;
}
.section-title {
  margin: 30px 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: #4a5568;
}
.form-row { margin-bottom: 18px; }
.form-row label {
  display: block;
  font-size: 13px;
  color: #5c6b7a;
  margin-bottom: 6px;
  font-weight: 500;
}
.req { color: #e74c3c; }
.hint {
  margin-top: 5px;
  font-size: 12px;
  color: #95a5b3;
}

input[type=text], input[type=url], textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fafbfd;
  box-sizing: border-box;
  transition: border-color .15s, background .15s;
}
input[type=text]:focus, input[type=url]:focus, textarea:focus {
  outline: none;
  border-color: #4a7dff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(74,125,255,0.1);
}
textarea { resize: vertical; }

/* 上传 */
.upload-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.icon-prev {
  width: 64px; height: 64px;
  border-radius: 14px;
  object-fit: cover;
  background: #f0f2f6;
}
.icon-placeholder {
  width: 64px; height: 64px;
  border-radius: 14px;
  background: #f0f2f6;
  color: #b0b8c5;
  display: flex; align-items: center; justify-content: center;
}
.upload-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  background: #eef2ff;
  color: #4a7dff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .15s;
}
.upload-btn:hover { background: #dce4ff; }
.upload-btn.disabled { opacity: 0.5; pointer-events: none; }

.shots-preview {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.shot-item {
  position: relative;
  width: 104px;
}
.shot-item img {
  width: 104px; height: 72px;
  object-fit: cover;
  border-radius: 10px;
}
.shot-rm {
  position: absolute;
  top: -6px; right: -6px;
  width: 26px; height: 26px;
  border-radius: 50%;
  border: none;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-size: 16px;
  color: #e74c3c;
  cursor: pointer;
  line-height: 1;
}

/* 分段 */
.seg-group {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  background: #eef1f6;
}
.seg-group button {
  padding: 8px 18px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #5c6b7a;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.seg-group button.active {
  background: #fff;
  color: #2c3e50;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 底部按钮 */
.pedit__footer {
  margin-top: 28px;
  display: flex;
  gap: 12px;
  justify-content: flex-start;
}
.btn-primary {
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #4a7dff, #2c5ae6);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform .1s, box-shadow .15s;
}
.btn-primary:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(74,125,255,0.4); }
.btn-primary:active:not(:disabled) { transform: scale(.97); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  padding: 12px 24px;
  border: 1px solid #dfe4ee;
  border-radius: 10px;
  background: #fff;
  color: #5c6b7a;
  font-size: 15px;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.btn-outline:hover { background: #f4f5f8; color: #2c3e50; }

/* toast */
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 22px;
  background: #2c3e50;
  color: #fff;
  border-radius: 10px;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  z-index: 9999;
  animation: toast-in .25s ease;
}
.toast--err { background: #e74c3c; }
.toast--warn { background: #f39c12; }
@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
</style>
