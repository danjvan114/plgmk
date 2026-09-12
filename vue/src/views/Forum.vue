<template>
  <div class="forum">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <div class="top-bar__search">
        <Search :size="18" class="icon" />
        <input v-model="kw" type="text" placeholder="搜索帖子、玩家、关键词..." />
      </div>
      <button class="top-bar__publish" @click="goNewPost"><Pencil :size="16" /> 发帖</button>
      <button class="top-bar__close" @click="$router.back()"><X :size="22" /></button>
    </header>

    <div class="body">
      <nav class="side-nav">
        <div
          class="side-nav__item"
          :class="{ 'is-active': activeBoard === null }"
          @click="selectBoard(null)"
        >
          <div v-if="activeBoard === null" class="side-nav__bg"></div>
          <LayoutGrid :size="20" />
          <span>全部板块</span>
        </div>
        <div
          v-for="b in boards"
          :key="b.id"
          class="side-nav__item"
          :class="{ 'is-active': activeBoard === b.id }"
          @click="selectBoard(b.id)"
        >
          <div v-if="activeBoard === b.id" class="side-nav__bg"></div>
          <component :is="boardIcon(b.icon)" :size="20" />
          <span>{{ b.name }}</span>
          <em v-if="b.postCount" class="side-nav__count">{{ b.postCount }}</em>
        </div>
      </nav>

      <main class="main">
        <div class="section-head">
          <h3>{{ activeBoardName }}</h3>
          <div class="section-actions">
            <button @click="refresh"><RefreshCw :size="14" /> 换一批</button>
          </div>
        </div>

        <div v-if="!items.length" class="empty">
          <MessageSquare :size="40" />
          <p>暂无帖子，来发第一个吧～</p>
        </div>

        <div v-else class="post-list">
          <div
            v-for="p in items"
            :key="p.id"
            class="post-card"
            @click="openPost(p.id)"
          >
            <div class="post-card__left">
              <div v-if="p.isPinned" class="post-pin">置顶</div>
              <h4>{{ p.title }}</h4>
              <div class="post-excerpt">{{ stripMd(p.excerpt) }}</div>
              <div class="post-tags" v-if="p.tags && p.tags.length">
                <span v-for="t in p.tags" :key="t" class="post-tag">#{{ t }}</span>
              </div>
            </div>
            <div class="post-card__right">
              <img :src="p.authorAvatar" class="post-avatar" referrerpolicy="no-referrer" />
              <div class="post-author">{{ p.authorNick || p.author }}</div>
              <div class="post-time">{{ fmtDate(p.createdAt) }}</div>
              <div class="post-stats">
                <span><MessageCircle :size="13" /> {{ p.replyCount || 0 }}</span>
                <span><Eye :size="13" /> {{ p.viewCount || 0 }}</span>
                <span><ThumbsUp :size="13" /> {{ p.likeCount || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Search, X, RefreshCw, Pencil, LayoutGrid, MessageSquare,
  MessageCircle, Eye, ThumbsUp, Package, HelpCircle, FolderOpen, Megaphone
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const iconMap = { forum: MessageSquare, extension: Package, help_outline: HelpCircle, folder_shared: FolderOpen, campaign: Megaphone };
function boardIcon(name) { return iconMap[name] || MessageSquare; }

const kw = ref('');
const boards = ref([]);
const items = ref([]);
const activeBoard = ref(null);

const activeBoardName = computed(() => {
  if (activeBoard.value === null) return '全部板块';
  const b = boards.value.find(x => x.id === activeBoard.value);
  return b ? b.name : '全部板块';
});

function selectBoard(id) { activeBoard.value = id; refresh(); }
function openPost(id) { router.push('/post/' + id); }
function goNewPost() { router.push('/post/new'); }

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
  return d.toLocaleDateString();
}

function stripMd(s) {
  if (!s) return '';
  return s.replace(/[#*_`>\-\[\]()]/g, '').replace(/\n/g, ' ').slice(0, 120);
}

async function refresh() {
  try {
    const params = new URLSearchParams({ sort: 'newest', size: 20 });
    if (activeBoard.value !== null) params.set('boardId', activeBoard.value);
    if (kw.value.trim()) params.set('keyword', kw.value.trim());
    const d = await fetch('/api/forum/posts?' + params).then(r => r.json());
    items.value = d.items || [];
  } catch { items.value = []; }
}

async function loadBoards() {
  try {
    const d = await fetch('/api/forum/boards').then(r => r.json());
    boards.value = d.boards || [];
  } catch { boards.value = []; }
}

watch(() => route.params.boardId, (id) => {
  if (id) activeBoard.value = parseInt(id);
}, { immediate: true });

onMounted(() => { loadBoards(); refresh(); });
</script>

<style scoped>
.forum {
  min-height: 100vh;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", Roboto, sans-serif;
}
.bg-layer {
  position: fixed; inset: 0; z-index: -1;
  background: url('/pic/bg.png') center/cover no-repeat fixed;
  filter: brightness(0.75);
}
.forum > *:not(.bg-layer) { position: relative; z-index: 1; }

/* ====== 顶栏 ====== */
.top-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 24px;
  background: transparent;
}
.top-bar__search {
  flex: 1; max-width: 560px;
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.2);
}
.top-bar__search .icon { color: rgba(255,255,255,0.7); flex-shrink: 0; }
.top-bar__search input {
  flex: 1; border: none; background: transparent; outline: none;
  color: #fff; font-size: 14px;
}
.top-bar__search input::placeholder { color: rgba(255,255,255,0.5); }
.top-bar__publish {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border: none; border-radius: 20px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform .12s;
}
.top-bar__publish:hover { transform: translateY(-1px); }
.top-bar__publish:active { transform: scale(.97); }
.top-bar__close {
  margin-left: auto;
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 50%; color: #fff; cursor: pointer;
  transition: background .15s;
}
.top-bar__close:hover { background: rgba(255,80,80,0.6); }

/* ====== 主体布局 ====== */
.body { display: flex; gap: 16px; padding: 8px 24px 24px; }

/* ====== 侧栏 ====== */
.side-nav {
  width: 200px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
  border-radius: 14px;
  padding: 12px;
  position: relative;
}
.side-nav__item {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  color: rgba(255,255,255,0.85);
  font-size: 14px; font-weight: 500;
  cursor: pointer; border-radius: 10px;
  transition: color .15s;
  overflow: hidden;
}
.side-nav__item:hover { color: #fff; }
.side-nav__bg {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.9);
  border-radius: 10px; z-index: -1;
}
.side-nav__item.is-active { color: #1a202c; }
.side-nav__count {
  margin-left: auto;
  font-size: 11px; font-style: normal;
  padding: 1px 7px;
  background: rgba(255,255,255,0.3);
  border-radius: 10px;
}
.side-nav__item.is-active .side-nav__count { background: rgba(0,0,0,0.1); color: #555; }

/* ====== 主区域 ====== */
.main {
  flex: 1;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 4px;
}
.main::-webkit-scrollbar { width: 8px; }
.main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

.section-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.section-head h3 {
  margin: 0; color: #fff; font-size: 20px; font-weight: 700;
}
.section-actions button {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  color: #fff; font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.section-actions button:hover { background: rgba(255,255,255,0.25); }

/* ====== 帖子卡片 ====== */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-card {
  display: flex;
  gap: 18px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.92);
  border-radius: 12px;
  cursor: pointer;
  transition: transform .12s, box-shadow .15s;
}
.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
.post-card__left { flex: 1; min-width: 0; }
.post-card__right {
  width: 140px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  text-align: center;
}
.post-pin {
  display: inline-block;
  padding: 1px 8px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: #fff; font-size: 11px; font-weight: 600;
  border-radius: 4px; margin-bottom: 4px;
}
.post-card h4 {
  margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #1a202c;
}
.post-excerpt {
  font-size: 13px; color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-tags { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.post-tag {
  font-size: 11px; color: #5c6bc0;
  padding: 2px 8px;
  background: rgba(92,107,192,0.12);
  border-radius: 10px;
}
.post-avatar {
  width: 44px; height: 44px;
  border-radius: 50%; object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.post-author { font-size: 13px; color: #334155; font-weight: 600; margin-top: 2px; }
.post-time { font-size: 11px; color: #94a3b8; }
.post-stats {
  display: flex; flex-direction: column; gap: 3px; margin-top: 6px;
}
.post-stats span {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 12px; color: #64748b;
}

/* ====== 空状态 ====== */
.empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px 0;
  color: rgba(255,255,255,0.7);
}
.empty p { margin: 0; font-size: 14px; }
</style>
