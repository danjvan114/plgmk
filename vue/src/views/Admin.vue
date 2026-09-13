<template>
  <div class="admin-page">
    <header class="top-bar">
      <button class="back-btn" @click="$router.back()"><ArrowLeft :size="18" /> 返回</button>
      <h2>管理员面板</h2>
      <div v-if="overview" class="overview-counts">
        <span>插件 {{ overview.counts.plugins }}</span>
        <span>帖子 {{ overview.counts.posts }}</span>
        <span>板块 {{ overview.counts.boards }}</span>
      </div>
    </header>

    <div v-if="!isAdmin" class="forbidden">
      <Lock :size="48" />
      <p>需要管理员权限</p>
      <button @click="$router.push('/main')">返回主页</button>
    </div>

    <div v-else class="tabs">
      <button
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ active: activeTab === t.key }"
        @click="switchTab(t.key)"
      ><component :is="t.icon" :size="14" /> {{ t.label }}</button>
    </div>

    <main v-if="isAdmin" class="tab-content">
      <!-- 概览 -->
      <div v-if="activeTab === 'overview' && overview" class="overview">
        <div class="stat-grid">
          <div class="stat-card"><Package :size="24" class="stat-icon" /><div class="stat-num">{{ overview.counts.plugins }}</div><div class="stat-label">插件 (活跃)</div></div>
          <div class="stat-card"><Trash2 :size="24" class="stat-icon dim" /><div class="stat-num">{{ overview.counts.pluginsHidden }}</div><div class="stat-label">插件下架</div></div>
          <div class="stat-card"><FileText :size="24" class="stat-icon green" /><div class="stat-num">{{ overview.counts.posts }}</div><div class="stat-label">帖子</div></div>
          <div class="stat-card"><FolderKanban :size="24" class="stat-icon" /><div class="stat-num">{{ overview.counts.boards }}</div><div class="stat-label">板块</div></div>
          <div class="stat-card"><Users :size="24" class="stat-icon" /><div class="stat-num">{{ overview.counts.profiles }}</div><div class="stat-label">用户缓存</div></div>
          <div class="stat-card"><LayoutGrid :size="24" class="stat-icon" /><div class="stat-num">{{ overview.counts.teams }}</div><div class="stat-label">团队</div></div>
        </div>
      </div>

      <!-- 帖子管理 -->
      <div v-if="activeTab === 'posts'" class="panel">
        <table class="data-table">
          <thead><tr><th>ID</th><th>标题</th><th>作者</th><th>板块</th><th>回复</th><th>状态</th><th>置顶</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="p in posts" :key="p.id">
              <td>{{ p.id }}</td>
              <td class="title-cell"><a @click="$router.push('/post/' + p.id)">{{ p.title }}</a></td>
              <td>{{ p.authorNick || p.author }}</td>
              <td>{{ p.boardId }}</td>
              <td>{{ p.replyCount }}</td>
              <td><span :class="'status-tag status-' + p.status">{{ p.status }}</span></td>
              <td>{{ p.isPinned ? '是' : '-' }}</td>
              <td class="op-cell">
                <button class="op-btn danger" @click="hardDeletePost(p)">硬删</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 板块管理 -->
      <div v-if="activeTab === 'boards'" class="panel">
        <div class="panel-head">
          <h3>板块管理</h3>
          <button class="btn-primary" @click="showBoardForm = true"><Plus :size="14" /> 新建板块</button>
        </div>
        <table class="data-table">
          <thead><tr><th>ID</th><th>名称</th><th>图标</th><th>颜色</th><th>排序</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="b in boards" :key="b.id">
              <td>{{ b.id }}</td>
              <td>{{ b.name }}</td>
              <td>{{ b.icon }}</td>
              <td><span class="color-dot" :style="{ background: b.color }"></span> {{ b.color }}</td>
              <td>{{ b.order }}</td>
              <td class="op-cell">
                <button class="op-btn" @click="editBoard(b)">编辑</button>
                <button class="op-btn danger" @click="deleteBoard(b)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 回复管理 -->
      <div v-if="activeTab === 'replies'" class="panel">
        <div class="panel-head"><h3>最近回复</h3></div>
        <table class="data-table">
          <thead><tr><th>ID</th><th>帖子ID</th><th>作者</th><th>内容</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="r in replies" :key="r.id">
              <td>{{ r.id }}</td>
              <td><a @click="$router.push('/post/' + r.postId)">#{{ r.postId }}</a></td>
              <td>{{ r.author }}</td>
              <td class="content-cell">{{ (r.content || '').slice(0, 80) }}</td>
              <td class="op-cell">
                <button class="op-btn danger" @click="deleteReply(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 公告 -->
      <div v-if="activeTab === 'announce'" class="panel">
        <div class="panel-head"><h3>发布公告</h3></div>
        <div class="form-row">
          <label>公告内容</label>
          <textarea v-model="announceText" rows="4" placeholder="要公告什么？"></textarea>
        </div>
        <div class="form-row">
          <label>链接（可选）</label>
          <input v-model="announceLink" placeholder="https://..." />
        </div>
        <button class="btn-primary" :disabled="!announceText.trim() || announcing" @click="postAnnounce">
          {{ announcing ? '发布中...' : '发布公告' }}
        </button>
      </div>
    </main>

    <!-- 板块弹窗 -->
    <Teleport to="body">
      <div v-if="showBoardForm" class="modal-mask" @click.self="closeBoardForm">
        <div class="modal">
          <h3>{{ editingBoard ? '编辑板块' : '新建板块' }}</h3>
          <div class="form-row"><label>名称</label><input v-model="boardForm.name" /></div>
          <div class="form-row"><label>描述</label><input v-model="boardForm.description" /></div>
          <div class="form-row"><label>图标名</label><input v-model="boardForm.icon" placeholder="forum / extension / help_outline ..." /></div>
          <div class="form-row"><label>颜色</label><input v-model="boardForm.color" type="color" /></div>
          <div class="form-row"><label>排序</label><input v-model.number="boardForm.order" type="number" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="closeBoardForm">取消</button>
            <button class="btn-primary" :disabled="!boardForm.name.trim()" @click="saveBoard">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  ArrowLeft, Lock, Package, Trash2, FileText, FolderKanban,
  Users, LayoutGrid, Plus, ScrollText, Megaphone
} from 'lucide-vue-next';

const router = useRouter();
const isAdmin = ref(false);
const overview = ref(null);
const posts = ref([]);
const boards = ref([]);
const replies = ref([]);
const toast = ref('');
const activeTab = ref('overview');
const showBoardForm = ref(false);
const editingBoard = ref(null);
const boardForm = ref({ name: '', description: '', icon: 'forum', color: '#5c6bc0', order: 0 });
const announceText = ref('');
const announceLink = ref('');
const announcing = ref(false);

const tabs = [
  { key: 'overview', label: '概览', icon: LayoutGrid },
  { key: 'posts', label: '帖子', icon: FileText },
  { key: 'boards', label: '板块', icon: FolderKanban },
  { key: 'replies', label: '回复', icon: ScrollText },
  { key: 'announce', label: '公告', icon: Megaphone },
];

function showToast(msg) { toast.value = msg; setTimeout(() => toast.value = '', 2000); }

function switchTab(k) {
  activeTab.value = k;
  if (k === 'overview') loadOverview();
  if (k === 'posts') loadPosts();
  if (k === 'boards') loadBoards();
  if (k === 'replies') loadReplies();
}

async function loadAuth() {
  try {
    const r = await fetch('/api/auth/state', { credentials: 'include' });
    const d = await r.json();
    isAdmin.value = d.ok && d.loggedIn && d.user?.role === 'admin';
  } catch { isAdmin.value = false; }
}

async function loadOverview() {
  try {
    const r = await fetch('/api/admin/overview', { credentials: 'include' }).then(r => r.json());
    if (r.ok) overview.value = r;
  } catch {}
}

async function loadPosts() {
  try {
    const r = await fetch('/api/admin/posts', { credentials: 'include' }).then(r => r.json());
    if (r.ok) posts.value = r.items || [];
  } catch {}
}

async function loadBoards() {
  try {
    const r = await fetch('/api/admin/boards', { credentials: 'include' }).then(r => r.json());
    if (r.ok) boards.value = r.boards || [];
  } catch {}
}

async function loadReplies() {
  try {
    const r = await fetch('/api/forum/replies?size=50', { credentials: 'include' }).then(r => r.json());
    if (r.ok) replies.value = r.items || [];
  } catch {}
}

async function hardDeletePost(p) {
  if (!confirm('永久删除帖子 #' + p.id + '？')) return;
  try {
    const r = await fetch('/api/admin/posts/' + p.id + '/hard-delete', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) { showToast('已删除'); loadPosts(); }
    else { showToast(r.msg || '删除失败'); }
  } catch { showToast('删除失败'); }
}

async function deleteReply(r) {
  if (!confirm('删除回复 #' + r.id + '？')) return;
  try {
    const rr = await fetch('/api/forum/replies/' + r.id + '/delete', {
      method: 'POST', credentials: 'include'
    }).then(rr => rr.json());
    if (rr.ok) { showToast('已删除'); loadReplies(); }
  } catch { showToast('删除失败'); }
}

function editBoard(b) {
  editingBoard.value = b;
  boardForm.value = { ...b };
  showBoardForm.value = true;
}

function closeBoardForm() {
  showBoardForm.value = false; editingBoard.value = null;
  boardForm.value = { name: '', description: '', icon: 'forum', color: '#5c6bc0', order: 0 };
}

async function saveBoard() {
  try {
    let r;
    if (editingBoard.value) {
      r = await fetch('/api/admin/boards/' + editingBoard.value.id, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardForm.value)
      }).then(r => r.json());
    } else {
      r = await fetch('/api/admin/boards', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardForm.value)
      }).then(r => r.json());
    }
    if (r.ok) { showToast('保存成功'); closeBoardForm(); loadBoards(); }
    else { showToast(r.msg || '保存失败'); }
  } catch { showToast('保存失败'); }
}

async function deleteBoard(b) {
  if (!confirm('删除板块「' + b.name + '」？')) return;
  try {
    const r = await fetch('/api/admin/boards/' + b.id + '/delete', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) { showToast('已删除'); loadBoards(); }
  } catch { showToast('删除失败'); }
}

async function postAnnounce() {
  if (!announceText.value.trim()) return;
  announcing.value = true;
  try {
    const r = await fetch('/api/admin/announce', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: announceText.value.trim(), link: announceLink.value.trim() })
    }).then(r => r.json());
    if (r.ok) { showToast('公告已发布'); announceText.value = ''; announceLink.value = ''; }
    else { showToast(r.msg || '发布失败'); }
  } catch { showToast('发布失败'); }
  announcing.value = false;
}

onMounted(async () => { await loadAuth(); if (isAdmin.value) loadOverview(); });
</script>

<style scoped>
.admin-page { min-height: 100vh; background: #f1f5f9; }

.top-bar {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 24px; background: #1e293b; color: #fff;
}
.top-bar h2 { margin: 0; font-size: 18px; font-weight: 700; }
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: 1px solid rgba(255,255,255,0.25);
  background: transparent; color: #fff; border-radius: 14px; font-size: 13px; cursor: pointer;
}
.back-btn:hover { background: rgba(255,255,255,0.15); }
.overview-counts { margin-left: auto; display: flex; gap: 16px; font-size: 13px; color: #94a3b8; }

.forbidden {
  padding: 100px 0; text-align: center; color: #64748b;
}
.forbidden button {
  margin-top: 16px; padding: 8px 24px; border: none; border-radius: 14px;
  background: #5c6bc0; color: #fff; cursor: pointer; font-size: 14px;
}

.tabs {
  display: flex; gap: 4px; padding: 12px 24px;
  background: #fff; border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: none; background: transparent;
  color: #64748b; font-size: 13px; font-weight: 500; cursor: pointer;
  border-radius: 10px; white-space: nowrap;
}
.tab:hover { background: #f1f5f9; color: #334155; }
.tab.active { background: #5c6bc0; color: #fff; }

.tab-content { padding: 20px 24px; max-width: 1400px; margin: 0 auto; }

.stat-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px; margin-bottom: 20px;
}
.stat-card {
  background: #fff; border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.stat-icon { color: #5c6bc0; }
.stat-icon.dim { color: #94a3b8; }
.stat-icon.green { color: #26a69a; }
.stat-num { font-size: 28px; font-weight: 800; color: #1a202c; }
.stat-label { font-size: 12px; color: #64748b; }

.panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panel-head h3 { margin: 0; font-size: 16px; color: #1a202c; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; }
.data-table tbody tr:hover { background: #fafbfc; }
.title-cell a { color: #5c6bc0; cursor: pointer; }
.title-cell a:hover { text-decoration: underline; }
.content-cell { max-width: 300px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-tag { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.status-active { background: #dcfce7; color: #166534; }
.status-deleted { background: #fee2e2; color: #991b1b; }
.status-inactive { background: #fef3c7; color: #92400e; }

.op-cell { display: flex; gap: 6px; }
.op-btn {
  padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; color: #475569; font-size: 12px; cursor: pointer;
}
.op-btn:hover { background: #f1f5f9; }
.op-btn.danger { border-color: #fecaca; color: #dc2626; }
.op-btn.danger:hover { background: #fee2e2; }

.color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; margin-right: 4px; }

.form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-row label { font-size: 13px; font-weight: 600; color: #334155; }
.form-row input, .form-row textarea {
  padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; font-family: inherit; outline: none;
}
.form-row input[type="color"] { padding: 2px; width: 60px; height: 36px; }
.form-row input:focus, .form-row textarea:focus { border-color: #5c6bc0; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px; border: none; border-radius: 12px;
  background: #5c6bc0; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: #4a5ab0; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  padding: 8px 18px; border: 1px solid #e2e8f0; border-radius: 12px;
  background: #fff; color: #475569; font-size: 13px; cursor: pointer;
}
.btn-ghost:hover { background: #f1f5f9; }

.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.modal {
  background: #fff; border-radius: 14px; padding: 24px;
  width: 480px; max-width: 90vw;
}
.modal h3 { margin: 0 0 16px; font-size: 16px; color: #1a202c; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; background: rgba(0,0,0,0.85); color: #fff;
  border-radius: 20px; font-size: 13px; z-index: 9999;
}
</style>
