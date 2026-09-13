<template>
  <div class="post-page">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <button class="back-btn" @click="$router.back()"><ArrowLeft :size="18" /> 返回</button>
      <div class="head-title">{{ post?.title || '加载中...' }}</div>
      <div class="head-actions" v-if="isLoggedIn">
        <button v-if="canLike" class="ha-btn" :class="{ active: liked }" @click="toggleLike"><ThumbsUp :size="16" /> {{ likeCount }}</button>
        <button v-if="canAdminPin" class="ha-btn" :class="{ active: post?.isPinned }" @click="togglePin"><Pin :size="16" /></button>
        <button v-if="canDeletePost" class="ha-btn danger" @click="onDeletePost"><Trash2 :size="16" /></button>
        <button v-if="canEditPost" class="ha-btn" @click="goEdit"><Edit3 :size="16" /></button>
      </div>
    </header>

    <div v-if="!post && !loading" class="empty-wrap">
      <MessageSquareOff :size="48" />
      <p>帖子不存在或已被删除</p>
    </div>

    <div v-else class="post-body">
      <!-- 帖子正文 -->
      <article v-if="post" class="post-card">
        <div class="post-head">
          <span class="post-board">{{ post.boardName }}</span>
          <span v-if="post.isPinned" class="post-pin">置顶</span>
          <h1>{{ post.title }}</h1>
          <div class="post-meta">
            <img :src="post.authorAvatar" class="meta-avatar" referrerpolicy="no-referrer" />
            <span class="meta-author">{{ post.authorNick || post.author }}</span>
            <span class="meta-time">{{ fmt(post.createdAt) }}</span>
            <span class="meta-stat"><Eye :size="14" /> {{ post.viewCount }}</span>
            <span class="meta-stat"><MessageCircle :size="14" /> {{ post.replyCount }}</span>
            <span class="meta-stat"><ThumbsUp :size="14" /> {{ post.likeCount }}</span>
          </div>
          <div v-if="post.tags?.length" class="post-tags">
            <span v-for="t in post.tags" :key="t" class="post-tag">#{{ t }}</span>
          </div>
        </div>
        <div class="post-content" v-html="renderMd(post.content)"></div>

        <!-- AI 区 -->
        <div class="ai-box">
          <div class="ai-head">
            <Sparkles :size="16" /><span>AI 助手</span>
            <div class="ai-actions" v-if="isLoggedIn">
              <button class="ai-btn" :disabled="aiLoading" @click="aiSummarize">{{ aiLoading ? '处理中...' : '总结全文' }}</button>
              <button class="ai-btn" :disabled="aiLoading" @click="aiReply">帮我回复</button>
            </div>
          </div>
          <div class="ai-body" v-if="aiContent">{{ aiContent }}</div>
          <div class="ai-body ai-empty" v-else>{{ isLoggedIn ? '点上面按钮让 AI 帮忙' : '登录后可使用 AI 功能' }}</div>
        </div>
      </article>

      <!-- 评论区 -->
      <section class="reply-section">
        <h3>评论 ({{ replies.length }})</h3>

        <div v-if="isLoggedIn" class="reply-form">
          <textarea v-model="newReply" placeholder="说点什么..." rows="3" @keydown.ctrl.enter="sendReply"></textarea>
          <div class="rf-actions">
            <button class="btn-primary" :disabled="!newReply.trim() || replying" @click="sendReply">
              <Send :size="14" /> {{ replying ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>

        <div v-else class="login-hint"><button @click="goLogin">登录</button> 后参与讨论</div>

        <div class="reply-list">
          <div v-for="r in replies" :key="r.id" class="reply-item" :class="{ pinned: r.isPinned, deleted: r.status === 'deleted' }">
            <img :src="r.authorAvatar" class="rp-avatar" referrerpolicy="no-referrer" />
            <div class="rp-body">
              <div class="rp-head">
                <span class="rp-author">{{ r.authorNick || r.author }}</span>
                <span v-if="r.authorVerified" class="rp-verified">✓</span>
                <span v-if="r.replyTo" class="rp-reply">回复 @{{ r.replyToNick || r.replyTo }}</span>
                <span class="rp-time">{{ fmt(r.createdAt) }}</span>
                <span v-if="r.isPinned" class="rp-pin">置顶</span>
              </div>
              <div class="rp-content" v-html="renderMd(r.content)"></div>
              <div class="rp-actions">
                <button v-if="isLoggedIn" @click="startReply(r)"><Reply :size="13" /> 回复</button>
                <button v-if="canDeleteReply(r)" class="danger" @click="onDeleteReply(r)"><Trash2 :size="13" /> 删除</button>
                <button v-if="canAdminPinReply(r)" @click="toggleReplyPin(r)"><Pin :size="13" /> {{ r.isPinned ? '取消置顶' : '置顶' }}</button>
              </div>

              <!-- 子回复 -->
              <div v-if="r.children?.length" class="rp-children">
                <div v-for="c in r.children" :key="c.id" class="reply-item reply-sub" :class="{ pinned: c.isPinned, deleted: c.status === 'deleted' }">
                  <img :src="c.authorAvatar" class="rp-avatar" referrerpolicy="no-referrer" />
                  <div class="rp-body">
                    <div class="rp-head">
                      <span class="rp-author">{{ c.authorNick || c.author }}</span>
                      <span class="rp-reply">回复 @{{ c.replyToNick || c.replyTo }}</span>
                      <span class="rp-time">{{ fmt(c.createdAt) }}</span>
                    </div>
                    <div class="rp-content" v-html="renderMd(c.content)"></div>
                    <div class="rp-actions">
                      <button v-if="isLoggedIn" @click="startReply(c)"><Reply :size="13" /> 回复</button>
                      <button v-if="canDeleteReply(c)" class="danger" @click="onDeleteReply(c)"><Trash2 :size="13" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!replies.length" class="empty">还没有评论，快来抢沙发～</div>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft, ThumbsUp, Pin, Trash2, Edit3, Eye, MessageCircle,
  Sparkles, Send, Reply, MessageSquareOff
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const post = ref(null);
const replies = ref([]);
const loading = ref(true);
const isLoggedIn = ref(false);
const user = ref(null);
const liked = ref(false);
const likeCount = ref(0);
const newReply = ref('');
const replying = ref(false);
const toast = ref('');
const aiContent = ref('');
const aiLoading = ref(false);
let replyTarget = 0;

function showToast(msg) { toast.value = msg; setTimeout(() => toast.value = '', 2000); }

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

function renderMd(s) {
  if (!s) return '';
  let html = s
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="md-code"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return '<p>' + html + '</p>';
}

const canLike = computed(() => isLoggedIn.value);
const canAdminPin = computed(() => isLoggedIn.value && user.value?.role === 'admin');
const canDeletePost = computed(() => isLoggedIn.value && (post.value?.author === user.value?.username || user.value?.role === 'admin'));
const canEditPost = computed(() => isLoggedIn.value && (post.value?.author === user.value?.username || user.value?.role === 'admin'));

function canDeleteReply(r) {
  return isLoggedIn.value && (r.author === user.value?.username || user.value?.role === 'admin');
}
function canAdminPinReply(r) {
  return isLoggedIn.value && user.value?.role === 'admin';
}

async function loadAuth() {
  try {
    const r = await fetch('/api/auth/state', { credentials: 'include' });
    const d = await r.json();
    if (d.ok && d.loggedIn) { isLoggedIn.value = true; user.value = d.user; }
  } catch {}
}

async function loadPost() {
  try {
    const r = await fetch('/api/forum/posts/' + route.params.id).then(r => r.json());
    if (r.ok) {
      post.value = r.post;
      replies.value = r.replies || [];
      likeCount.value = r.post.likeCount || 0;
    }
  } catch {} finally { loading.value = false; }
}

async function toggleLike() {
  try {
    const r = await fetch('/api/forum/posts/' + route.params.id + '/like', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
    if (r.ok) { liked.value = r.liked; likeCount.value = r.likeCount; }
  } catch { showToast('操作失败'); }
}

async function togglePin() {
  try {
    const r = await fetch('/api/forum/posts/' + route.params.id + '/pin', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) { post.value.isPinned = r.isPinned; showToast(r.isPinned ? '已置顶' : '取消置顶'); }
  } catch { showToast('操作失败'); }
}

async function toggleReplyPin(r) {
  try {
    const rr = await fetch('/api/forum/replies/' + r.id + '/pin', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (rr.ok) { r.isPinned = rr.isPinned; showToast('已更新'); }
  } catch { showToast('操作失败'); }
}

async function onDeletePost() {
  if (!confirm('确定删除这个帖子吗？')) return;
  try {
    const r = await fetch('/api/forum/posts/' + route.params.id + '/delete', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) { showToast('已删除'); setTimeout(() => router.push('/forum'), 800); }
  } catch { showToast('删除失败'); }
}

async function onDeleteReply(r) {
  if (!confirm('确定删除这条回复吗？')) return;
  try {
    const rr = await fetch('/api/forum/replies/' + r.id + '/delete', {
      method: 'POST', credentials: 'include'
    }).then(rr => rr.json());
    if (rr.ok) {
      if (r.parentId) {
        const p = replies.value.find(x => x.id === r.parentId);
        const child = p?.children?.find(c => c.id === r.id);
        if (child) child.content = '该回复已被删除'; child.status = 'deleted';
      } else {
        const item = replies.value.find(x => x.id === r.id);
        if (item) { item.content = '该回复已被删除'; item.status = 'deleted'; }
      }
      loadPost();
    }
  } catch { showToast('删除失败'); }
}

function startReply(r) {
  replyTarget = r.id;
  newReply.value = '';
  showToast('回复 @' + (r.authorNick || r.author));
}

async function sendReply() {
  if (!newReply.value.trim() || replying.value) return;
  replying.value = true;
  try {
    const body = { content: newReply.value.trim() };
    if (replyTarget) body.parentId = replyTarget;
    const r = await fetch('/api/forum/posts/' + route.params.id + '/replies', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json());
    if (r.ok) {
      newReply.value = ''; replyTarget = 0;
      showToast('回复成功');
      loadPost();
    } else { showToast(r.msg || '发送失败'); }
  } catch { showToast('发送失败'); }
  replying.value = false;
}

function goEdit() { router.push('/post/new?edit=' + route.params.id); }
function goLogin() { router.push('/login'); }

async function aiSummarize() {
  aiLoading.value = true;
  aiContent.value = '';
  try {
    const r = await fetch('/api/ai/summarize', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: post.value?.content || '' })
    }).then(r => r.json());
    if (r.ok) aiContent.value = r.result || r.summary || 'AI 没说话';
    else aiContent.value = 'AI 暂不可用';
  } catch { aiContent.value = 'AI 暂不可用'; }
  aiLoading.value = false;
}

async function aiReply() {
  aiLoading.value = true;
  aiContent.value = '';
  try {
    const r = await fetch('/api/ai/reply', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: post.value?.title || '', context: post.value?.content || '' })
    }).then(r => r.json());
    if (r.ok) {
      newReply.value = r.result || r.reply || '';
      aiContent.value = '已帮你生成回复，检查后点发送～';
    } else aiContent.value = 'AI 暂不可用';
  } catch { aiContent.value = 'AI 暂不可用'; }
  aiLoading.value = false;
}

onMounted(async () => { await loadAuth(); await loadPost(); });
</script>

<style scoped>
.post-page { min-height: 100vh; position: relative; }
.bg-layer { position: fixed; inset: 0; z-index: -1; background: url('/pic/bg.png') center/cover no-repeat fixed; filter: brightness(0.7); }

.top-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 24px;
  background: transparent;
}
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.12); color: #fff; border-radius: 16px;
  font-size: 13px; cursor: pointer;
}
.back-btn:hover { background: rgba(255,255,255,0.22); }
.head-title { flex: 1; color: #fff; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.head-actions { display: flex; gap: 8px; }
.ha-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.12); color: #fff; border-radius: 14px;
  font-size: 13px; cursor: pointer;
}
.ha-btn:hover { background: rgba(255,255,255,0.25); }
.ha-btn.active { background: #ff6b6b; border-color: #ff6b6b; }
.ha-btn.danger { border-color: #ff6b6b; color: #ff6b6b; }
.ha-btn.danger:hover { background: rgba(255,107,107,0.2); }

.empty-wrap { padding: 80px 0; color: rgba(255,255,255,0.7); text-align: center; }

.post-body {
  max-width: 900px; margin: 0 auto; padding: 12px 24px 40px;
  display: flex; flex-direction: column; gap: 16px;
}
.post-card, .reply-section {
  background: rgba(255,255,255,0.95); border-radius: 14px; padding: 24px;
}
.post-head .post-board {
  display: inline-block; padding: 2px 10px; border-radius: 10px;
  background: rgba(92,107,192,0.15); color: #5c6bc0; font-size: 12px; font-weight: 600;
}
.post-head .post-pin { margin-left: 8px; padding: 2px 8px; font-size: 11px; background: #ff6b6b; color: #fff; border-radius: 4px; }
.post-head h1 { margin: 10px 0 12px; font-size: 22px; color: #1a202c; }
.post-meta { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #64748b; flex-wrap: wrap; }
.meta-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.meta-author { font-weight: 600; color: #334155; }
.meta-stat { display: inline-flex; align-items: center; gap: 3px; }
.post-tags { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.post-tag { font-size: 12px; padding: 2px 8px; background: rgba(92,107,192,0.12); color: #5c6bc0; border-radius: 10px; }
.post-content { margin-top: 20px; font-size: 15px; line-height: 1.8; color: #1a202c; }
.post-content :deep(h2) { font-size: 20px; margin: 18px 0 8px; }
.post-content :deep(h3) { font-size: 17px; margin: 14px 0 6px; }
.post-content :deep(h4) { font-size: 15px; margin: 12px 0 4px; }
.post-content :deep(pre) { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
.post-content :deep(code) { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
.post-content :deep(pre code) { background: transparent; padding: 0; }
.post-content :deep(p) { margin: 8px 0; }

.ai-box { margin-top: 20px; border: 1px dashed #c7d2fe; background: #f5f3ff; border-radius: 12px; overflow: hidden; }
.ai-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #ede9fe; color: #6d28d9; font-weight: 600; font-size: 13px; }
.ai-actions { margin-left: auto; display: flex; gap: 8px; }
.ai-btn { padding: 4px 12px; border: none; border-radius: 12px; background: #6d28d9; color: #fff; font-size: 12px; cursor: pointer; }
.ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ai-btn:hover:not(:disabled) { background: #5b21b6; }
.ai-body { padding: 14px; font-size: 14px; color: #374151; line-height: 1.7; white-space: pre-wrap; }
.ai-empty { color: #9ca3af; font-style: italic; }

.reply-section h3 { margin: 0 0 14px; font-size: 16px; color: #1a202c; }
.reply-form textarea {
  width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; resize: vertical; font-family: inherit; outline: none;
}
.reply-form textarea:focus { border-color: #5c6bc0; }
.rf-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border: none; border-radius: 14px; background: #5c6bc0; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: #4a5ab0; }
.login-hint { padding: 10px; text-align: center; color: #64748b; font-size: 13px; }
.login-hint button { padding: 2px 10px; margin: 0 4px; border: none; border-radius: 10px; background: #5c6bc0; color: #fff; cursor: pointer; }

.reply-list { margin-top: 18px; display: flex; flex-direction: column; gap: 16px; }
.reply-item { display: flex; gap: 10px; }
.reply-item.pinned .rp-head::before { content: '📌 '; font-size: 12px; }
.reply-item.deleted .rp-content { color: #94a3b8; font-style: italic; }
.rp-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.rp-body { flex: 1; min-width: 0; }
.rp-head { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; flex-wrap: wrap; }
.rp-author { font-weight: 600; color: #1a202c; }
.rp-verified { color: #26a69a; font-weight: 700; }
.rp-reply { color: #5c6bc0; }
.rp-time { font-size: 12px; color: #94a3b8; }
.rp-pin { padding: 1px 6px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 11px; }
.rp-content { margin-top: 4px; font-size: 14px; color: #1a202c; line-height: 1.7; word-break: break-word; }
.rp-content :deep(p) { margin: 2px 0; }
.rp-content :deep(code) { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
.rp-actions { margin-top: 6px; display: flex; gap: 14px; }
.rp-actions button { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; color: #64748b; font-size: 12px; cursor: pointer; padding: 0; }
.rp-actions button:hover { color: #5c6bc0; }
.rp-actions button.danger:hover { color: #e74c3c; }
.rp-children { margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; }
.reply-sub .rp-avatar { width: 28px; height: 28px; }

.toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; background: rgba(0,0,0,0.8); color: #fff;
  border-radius: 20px; font-size: 13px; z-index: 9999;
}
.empty { color: #94a3b8; font-size: 13px; text-align: center; padding: 20px 0; }
</style>
