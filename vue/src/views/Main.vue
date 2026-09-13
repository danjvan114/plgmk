<template>
  <div class="main-page">
    <!-- 背景层 -->
    <div class="bg" />
    <div class="overlay" />

    <!-- 右上角按钮组 -->
    <div class="top-right">
      <button class="icon-btn" title="消息" @click="onMessages">
        <MessageCircle :size="22" />
        <span v-if="unread > 0" class="badge">{{ unread > 99 ? '99+' : unread }}</span>
      </button>
      <button class="icon-btn" title="设置" @click="onSettings">
        <Settings :size="22" />
      </button>
    </div>

    <!-- 左上角用户卡片 -->
    <div v-if="authChecked" class="user-card" @click="onProfile">
      <img
        v-if="user?.avatar"
        :src="user.avatar"
        class="avatar"
        referrerpolicy="no-referrer"
      />
      <div v-else class="avatar avatar-fallback">{{ nickInitial }}</div>
      <div class="info">
        <div class="nickname">{{ nick }}</div>
        <div class="bio">{{ user?.bio || '这个人很懒，还没有写简介' }}</div>
      </div>
    </div>

    <!-- 未登录显示占位 -->
    <div v-else class="user-card user-card-skeleton">
      <div class="avatar avatar-skeleton" />
      <div class="info">
        <div class="nickname skeleton-line" style="width:80px" />
        <div class="bio skeleton-line" style="width:140px" />
      </div>
    </div>

    <!-- 左下角公告栏 -->
    <div v-if="announcements.length || !annLoadFail" class="bulletin">
      <div class="bulletin-head">
        <Megaphone :size="16" />
        <span>公告</span>
      </div>
      <div class="bulletin-body">
        <div v-if="announcements.length" class="ann-list">
          <a
            v-for="a in announcements"
            :key="a.id"
            class="ann-item"
            :href="a.link || 'javascript:void(0)'"
            @click.prevent="a.link && onOpenLink(a.link)"
          >
            <span class="ann-dot">●</span>
            <span class="ann-text">{{ a.text }}</span>
            <span class="ann-time">{{ fmt(a.createdAt) }}</span>
          </a>
        </div>
        <div v-else-if="annLoading" class="ann-loading">加载中…</div>
        <div v-else class="ann-empty">暂无公告</div>
      </div>
    </div>

    <!-- 右侧 2x2 功能按钮 -->
    <div class="right-panel">
      <button
        v-for="btn in rightButtons"
        :key="btn.key"
        class="fn-btn"
        @click="onFnBtn(btn)"
      >
        <img :src="btn.img" :alt="btn.label" />
      </button>
    </div>


    <!-- 消息弹窗 -->
    <Modal v-model:visible="showMessages" title="消息中心" width="720px" open-sound="/pic/mp/MenuOpen.wav" close-sound="/pic/mp/BattlePassClose.wav">
      <div class="msg-wrap">
        <div v-if="!user" class="msg-empty">请先登录查看消息</div>
        <div v-else-if="msgLoading" class="msg-empty">加载中…</div>
        <div v-else-if="!msgItems.length" class="msg-empty">暂无消息</div>
        <div v-else class="msg-list">
          <a
            v-for="m in msgItems"
            :key="m.id"
            class="msg-item"
            :class="{ unread: !m.isRead }"
            :href="m.link || 'javascript:void(0)'"
            @click.prevent="m.link && onOpenLink(m.link); markRead(m.id)"
          >
            <div class="msg-head">
              <span class="msg-type">{{ msgTypeLabel(m.type) }}</span>
              <span class="msg-from">{{ m.fromNick || m.fromUser }}</span>
              <span class="msg-time">{{ fmt(m.createdAt) }}</span>
            </div>
            <div class="msg-body">{{ m.text }}</div>
          </a>
        </div>
      </div>
    </Modal>
    <!-- 设置弹窗 -->
    <Modal v-model:visible="showSettings" title="系统设置" width="800px" open-sound="/pic/mp/MenuOpen.wav" close-sound="/pic/mp/BattlePassClose.wav">
      <div class="demo-content">
        <h3>KE Hub 设置面板</h3>
        <p>这里放实际的设置项：音量开关、主题切换、画质选项等。</p>
        <button class="demo-btn" @click="showSettings = false">关闭</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { MessageCircle, Settings, Megaphone } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import Modal from '@/components/Modal.vue';

const router = useRouter();
const showSettings = ref(false);

const user = ref(null);
const authChecked = ref(false);
const unread = ref(0);

const announcements = ref([]);
const annLoading = ref(true);
const annLoadFail = ref(false);

const nick = computed(() =>
  user.value?.nickname || user.value?.username || '访客'
);
const nickInitial = computed(() => nick.value?.charAt(0)?.toUpperCase() || '?');

onMounted(async () => {
  // 1) 登录态 + 用户信息
  try {
    const r = await fetch('/api/auth/state', { credentials: 'include' });
    const d = await r.json();
    if (d.ok && d.loggedIn) {
      user.value = d.user;
    }
    // 再拉 profile 取 bio
    if (d.user?.username) {
      try {
        const r2 = await fetch(`/api/user/${d.user.username}`, { credentials: 'include' });
        const d2 = await r2.json();
        if (d2.ok && d2.user) {
          user.value = { ...user.value, ...d2.user };
        }
      } catch {}
    }
  } catch (e) {
    console.warn('[main] auth failed:', e.message);
  } finally {
    authChecked.value = true;
  }

  // 2) 未读数（header 接口提供）
  try {
    const h = await fetch('/api/header', { credentials: 'include' });
    const hd = await h.json();
    if (hd.ok) unread.value = hd.unread || 0;
  } catch {}

  // 3) 公告
  try {
    const r = await fetch('/api/site/announcements', { credentials: 'include' });
    const d = await r.json();
    if (d.ok && Array.isArray(d.items)) announcements.value = d.items;
  } catch (e) {
    annLoadFail.value = true;
  } finally {
    annLoading.value = false;
  }
});

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + '分钟前';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + '小时前';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// —— 按钮行为（占位，后续填充）
const showMessages = ref(false);
const msgItems = ref([]);
const msgLoading = ref(false);
async function onMessages() {
  showMessages.value = true;
  if (!user.value) { msgItems.value = []; return; }
  msgLoading.value = true;
  try {
    const r = await fetch('/api/messages', { credentials: 'include' });
    const j = await r.json();
    if (j.ok) {
      msgItems.value = j.items || [];
      unread.value = j.unread || 0;
    }
  } catch {}
  msgLoading.value = false;
}
function onSettings() {
  showSettings.value = true;
}
async function markRead(id) {
  try {
    await fetch('/api/messages/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), credentials: 'include' });
    const m = msgItems.value.find(x => x.id === id);
    if (m) m.isRead = true;
    unread.value = Math.max(0, unread.value - 1);
  } catch {}
}
function msgTypeLabel(t) {
  return ({ announce: '公告', reply: '回复', like: '点赞', fav: '收藏', coin: '金币', follow: '关注', team: '团队', system: '系统' })[t] || '通知';
}
function onProfile() {
  if (user.value?.username) router.push(`/u/${user.value.username}`);
}
function onOpenLink(href) {
  // 内部路由走 SPA，外部新窗口
  if (href.startsWith('/')) router.push(href);
  else window.open(href, '_blank');
}

// 右侧 2x2 功能按钮
const rightButtons = [
  { key: 'create',   label: '开始创作', img: '/pic/main/01.png', route: '/workpool' },
  { key: 'forum',    label: '论坛大厅', img: '/pic/main/02.png', route: '/forum' },
  { key: 'team',     label: '团队协作', img: '/pic/main/3.png',  route: '/team' },
  { key: 'market',   label: '插件市场', img: '/pic/main/4.png',  route: '/market' }
];

function onFnBtn(btn) {
  if (btn.route) router.push(btn.route);
}
</script>

<style scoped>
.main-page {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  background: #000;
  font-family: -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #fff;
}

.bg {
  position: fixed;
  inset: 0;
  background-image: url('/pic/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.35) 100%);
  z-index: 1;
  pointer-events: none;
}

/* 右上角按钮 */
.top-right {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}
.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  background: rgba(0,0,0,0.35);
  color: #fff;
  cursor: pointer;
  transition: background .15s, transform .15s;
}
.icon-btn:hover {
  background: rgba(255,255,255,0.15);
  transform: scale(1.06);
}
.icon-btn:active { transform: scale(.94); }

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  background: #ff4d4f;
  color: #fff;
  border-radius: 9px;
  border: 2px solid rgba(0,0,0,.5);
}

/* 用户卡片 */
.user-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  margin: 20px;
  max-width: 360px;
  background: rgba(0,0,0,0.35);
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.12);
  cursor: pointer;
  transition: background .15s, transform .15s;
}
.user-card:hover { background: rgba(0,0,0,0.5); transform: translateY(-1px); }

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.5);
  background: #444;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.avatar-skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,.1), rgba(255,255,255,.25), rgba(255,255,255,.1));
  background-size: 200% 100%;
  animation: skeleton 1.4s infinite;
}

.info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nickname {
  font-size: 17px; font-weight: 700; color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,.8);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bio {
  font-size: 13px; color: rgba(255,255,255,.78);
  text-shadow: 0 1px 2px rgba(0,0,0,.7);
  line-height: 1.4;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.skeleton-line {
  height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.22), rgba(255,255,255,.08));
  background-size: 200% 100%; animation: skeleton 1.4s infinite;
}
@keyframes skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* 公告栏 */
.bulletin {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 10;
  width: 340px;
  max-width: calc(100vw - 40px);
  background: rgba(0,0,0,0.4);
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.12);
  overflow: hidden;
}
.bulletin-head {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px;
  font-size: 13px; font-weight: 700;
  color: #b07400;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,214,102,0.08);
}
.bulletin-body { padding: 6px 0; }
.ann-list { display: flex; flex-direction: column; }
.ann-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  color: #1a1a1a;
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: background .15s;
}
.ann-item:hover { background: rgba(0,0,0,0.06); color: #000; }
.ann-dot { color: #b07400; font-size: 8px; flex-shrink: 0; }
.ann-text {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ann-time {
  font-size: 11px; color: rgba(0,0,0,.5); flex-shrink: 0;
}
.ann-loading, .ann-empty {
  padding: 12px 14px; font-size: 12px; color: rgba(255,255,255,.5);
  text-align: center;
}

/* 右侧 2x2 功能按钮 */
.right-panel {
  position: fixed;
  right: 80px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px;
}
.fn-btn {
  width: 260px;
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: transform .18s ease, filter .18s ease;
}
.fn-btn img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,.35));
}
.fn-btn:hover {
  transform: scale(1.04) translateY(-2px);
  filter: drop-shadow(0 0 18px rgba(255,255,255,.15));
}
.fn-btn:active {
  transform: scale(.97);
}

/* 弹窗 demo 内容 */
.demo-content h3 { margin: 0 0 12px; font-size: 18px; }
.demo-content p  { margin: 0 0 20px; color: #666; }
.demo-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.msg-wrap { max-height: 60vh; overflow-y: auto; padding: 4px 0; }
.msg-empty { text-align: center; color: #aaa; padding: 40px 0; font-size: 14px; }
.msg-list { display: flex; flex-direction: column; gap: 8px; }
.msg-item { display: block; padding: 12px 14px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); color: inherit; text-decoration: none; transition: background 0.15s; }
.msg-item:hover { background: rgba(255,255,255,0.08); }
.msg-item.unread { border-color: rgba(255,200,80,0.45); background: rgba(255,200,80,0.08); }
.msg-head { display: flex; gap: 8px; font-size: 12px; color: #bbb; margin-bottom: 6px; align-items: center; }
.msg-type { padding: 2px 8px; border-radius: 4px; background: rgba(120,160,255,0.18); color: #b8d0ff; font-size: 11px; }
.msg-from { font-weight: 600; color: #ddd; }
.msg-time { margin-left: auto; color: #888; }
.msg-body { font-size: 14px; color: #fff; line-height: 1.5; }
</style>
