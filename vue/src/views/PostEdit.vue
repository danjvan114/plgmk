<template>
  <div class="edit-page">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <button class="back-btn" @click="$router.back()"><ArrowLeft :size="18" /> 返回</button>
      <div class="head-title">{{ isEdit ? '编辑帖子' : '发表新帖' }}</div>
      <div class="head-actions">
        <button v-if="isLoggedIn" class="btn-primary" :disabled="submitting" @click="submit">
          <Send :size="14" /> {{ submitting ? '提交中...' : (isEdit ? '保存修改' : '发布') }}
        </button>
      </div>
    </header>

    <div v-if="!isLoggedIn" class="login-wrap">
      <Lock :size="48" />
      <p>请先登录后发帖</p>
      <button @click="router.push('/login')">去登录</button>
    </div>

    <div v-else class="edit-body">
      <div class="edit-card">
        <div class="form-row">
          <label>标题 <span class="req">*</span></label>
          <input v-model="title" maxlength="120" placeholder="给你的帖子起个标题..." />
          <span class="count">{{ title.length }}/120</span>
        </div>

        <div class="form-row">
          <label>板块 <span class="req">*</span></label>
          <select v-model="boardId">
            <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <div class="form-row">
          <label>标签（最多 5 个，回车添加）</label>
          <div class="tags-wrap">
            <span v-for="(t, i) in tags" :key="i" class="tag-chip">
              #{{ t }}
              <button @click="tags.splice(i, 1)">×</button>
            </span>
            <input
              v-if="tags.length < 5"
              v-model="tagInput"
              placeholder="输入标签后回车"
              @keydown.enter.prevent="addTag"
              maxlength="24"
            />
          </div>
        </div>

        <div class="form-row">
          <label>正文 <span class="req">*</span> <span class="hint">支持 Markdown</span></label>
          <textarea v-model="content" rows="14" placeholder="写点什么... 支持 #标题 **加粗** `代码` ```代码块``` 等"></textarea>
          <span class="count">{{ content.length }}/20000</span>
        </div>

        <div v-if="isEdit" class="form-row">
          <button class="btn-danger-outline" @click="onDelete">
            <Trash2 :size="14" /> 删除帖子
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Send, Lock, Trash2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const title = ref('');
const content = ref('');
const boardId = ref(0);
const boards = ref([]);
const tags = ref([]);
const tagInput = ref('');
const isLoggedIn = ref(false);
const submitting = ref(false);
const toast = ref('');
const editId = ref(0);

const isEdit = computed(() => !!route.query.edit);

function showToast(msg) { toast.value = msg; setTimeout(() => toast.value = '', 2000); }

function addTag() {
  const t = tagInput.value.trim();
  if (t && !tags.value.includes(t) && tags.value.length < 5) {
    tags.value.push(t);
    tagInput.value = '';
  }
}

async function loadAuth() {
  try {
    const r = await fetch('/api/auth/state', { credentials: 'include' });
    const d = await r.json();
    if (d.ok && d.loggedIn) isLoggedIn.value = true;
    else router.push('/login');
  } catch { router.push('/login'); }
}

async function loadBoards() {
  try {
    const r = await fetch('/api/forum/boards').then(r => r.json());
    if (r.ok && r.boards?.length) {
      boards.value = r.boards;
      boardId.value = r.boards[0].id;
    }
  } catch {}
}

async function loadEdit() {
  if (!isEdit.value) return;
  editId.value = parseInt(route.query.edit);
  try {
    const r = await fetch('/api/forum/posts/' + editId.value).then(r => r.json());
    if (r.ok) {
      title.value = r.post.title;
      content.value = r.post.content;
      boardId.value = r.post.boardId;
      tags.value = r.post.tags || [];
    } else { showToast('帖子不存在'); router.push('/forum'); }
  } catch { router.push('/forum'); }
}

async function submit() {
  if (!title.value.trim()) { showToast('请填写标题'); return; }
  if (!content.value.trim()) { showToast('请填写正文'); return; }
  if (!boardId.value) { showToast('请选择板块'); return; }

  submitting.value = true;
  const body = {
    title: title.value.trim(),
    content: content.value.trim(),
    boardId: boardId.value,
    tags: tags.value
  };

  try {
    let r;
    if (isEdit.value) {
      r = await fetch('/api/forum/posts/' + editId.value, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());
    } else {
      r = await fetch('/api/forum/posts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());
    }
    if (r.ok) {
      showToast(isEdit.value ? '保存成功' : '发布成功');
      const id = r.post?.id || editId.value;
      setTimeout(() => router.push('/post/' + id), 800);
    } else { showToast(r.msg || '提交失败'); }
  } catch { showToast('提交失败'); }
  submitting.value = false;
}

async function onDelete() {
  if (!confirm('确定删除这个帖子吗？')) return;
  try {
    const r = await fetch('/api/forum/posts/' + editId.value + '/delete', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) { showToast('已删除'); setTimeout(() => router.push('/forum'), 800); }
  } catch { showToast('删除失败'); }
}

onMounted(async () => { await loadAuth(); await loadBoards(); await loadEdit(); });
</script>

<style scoped>
.edit-page { min-height: 100vh; position: relative; }
.bg-layer { position: fixed; inset: 0; z-index: -1; background: url('/pic/bg.png') center/cover no-repeat fixed; filter: brightness(0.7); }

.top-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 24px; background: transparent;
}
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.12); color: #fff; border-radius: 16px;
  font-size: 13px; cursor: pointer;
}
.back-btn:hover { background: rgba(255,255,255,0.22); }
.head-title { flex: 1; color: #fff; font-weight: 600; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border: none; border-radius: 16px;
  background: #5c6bc0; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: #4a5ab0; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.login-wrap {
  max-width: 400px; margin: 100px auto; padding: 40px;
  text-align: center; color: rgba(255,255,255,0.8);
}
.login-wrap button {
  margin-top: 16px; padding: 8px 24px; border: none; border-radius: 16px;
  background: #5c6bc0; color: #fff; cursor: pointer; font-size: 14px;
}

.edit-body { max-width: 800px; margin: 12px auto; padding: 0 24px 40px; }
.edit-card { background: rgba(255,255,255,0.95); border-radius: 14px; padding: 28px; }
.form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; position: relative; }
.form-row label { font-size: 13px; font-weight: 600; color: #334155; }
.form-row .req { color: #e74c3c; }
.form-row .hint { font-weight: 400; color: #94a3b8; font-size: 12px; }
.form-row input[type="text"], .form-row input:not([type]), .form-row select, .form-row textarea {
  padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; font-family: inherit; outline: none; background: #fff;
}
.form-row input:focus, .form-row select:focus, .form-row textarea:focus { border-color: #5c6bc0; }
.form-row textarea { resize: vertical; line-height: 1.6; }
.form-row .count { position: absolute; right: 10px; bottom: 6px; font-size: 11px; color: #94a3b8; }

.tags-wrap {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 8px;
  border: 1px solid #e2e8f0; border-radius: 10px; min-height: 38px;
}
.tag-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 10px; background: rgba(92,107,192,0.12); color: #5c6bc0;
  border-radius: 12px; font-size: 12px; font-weight: 600;
}
.tag-chip button {
  background: none; border: none; color: #5c6bc0; cursor: pointer; font-size: 14px; padding: 0; line-height: 1;
}
.tags-wrap input {
  flex: 1; min-width: 120px; border: none; outline: none; font-size: 13px; padding: 2px;
}

.btn-danger-outline {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid #e74c3c; border-radius: 14px;
  background: transparent; color: #e74c3c; font-size: 13px; cursor: pointer;
}
.btn-danger-outline:hover { background: rgba(231,76,60,0.1); }

.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; background: rgba(0,0,0,0.8); color: #fff;
  border-radius: 20px; font-size: 13px; z-index: 9999;
}
</style>
