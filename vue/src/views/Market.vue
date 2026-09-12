<template>
  <div class="market">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <div class="top-bar__search">
        <Search :size="18" class="icon" />
        <input v-model="kw" type="text" placeholder="搜索玩家、地图、动态、模组..." />
      </div>
      <button class="top-bar__publish" @click="openPublish"><Upload :size="16" /> 发布插件</button>
      <button class="top-bar__close" @click="$router.back()">
        <X :size="22" />
      </button>
    </header>

    <div class="body">
      <nav class="side-nav">
        <div
          v-for="(item, i) in navItems"
          :key="i"
          class="side-nav__item"
          :class="{ 'is-active': activeNav === i }"
          @click="activeNav = i"
        >
          <div v-if="activeNav === i" class="side-nav__bg"></div>
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </div>
      </nav>

      <main class="main">
        <!-- 排行榜 -->
        <div class="ranks">
          <div
            v-for="(rank, i) in ranks"
            :key="i"
            class="rank-card"
            :style="{ backgroundImage: `url(${rank.bg})` }"
            @click="rank.id && openDetail(rank.id)"
          ></div>
        </div>

        <!-- 推荐区 -->
        <section class="section">
          <div class="section-head">
            <h3>{{ navItems[activeNav].label }}</h3>
            <div class="section-actions">
              <button @click="refresh"><RefreshCw :size="14" /> 换一批</button>
            </div>
          </div>

          <div v-if="!items.length" class="empty">
            <Package :size="40" />
            <p>暂无插件，快去发布第一个吧～</p>
          </div>

          <div v-else class="cards">
            <div
              v-for="item in items"
              :key="item.id"
              class="card"
              @click="openDetail(item.id)"
            >
              <div class="card__cover">
                <img
                  v-if="item.cover || item.icon"
                  :src="item.cover || item.icon"
                  :alt="item.name"
                />
                <div v-else class="card__cover-fallback">
                  <Package :size="48" />
                </div>
              </div>
              <div class="card__body">
                <h4>{{ item.name }}</h4>
                <span class="tag" v-if="item.tags && item.tags[0]">{{ item.tags[0] }}</span>
                <span class="author">by {{ item.authorNick || item.author }}</span>
                <div class="card__stats">
                  <span><ThumbsUp :size="13" /> {{ item.likeCount || 0 }}</span>
                  <span><Download :size="13" /> {{ item.downloadCount || 0 }}</span>
                  <span v-if="item.ratingCount" class="card__price">⭐ {{ item.rating }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- ========== 插件详情弹窗 ========== -->
    <Teleport to="body">
      <div v-if="detailOpen" class="detail-mask" @click.self="closeDetail">
        <div class="detail-frame">
          <div class="detail-scaler">
            <div class="detail-panel">
            <button class="detail-close" @click="closeDetail"><X :size="36" /></button>

            <template v-if="detail">
              <div class="dp-head">
                <div class="dp-icon">
                  <img v-if="detail.icon" :src="detail.icon" />
                  <Package v-else :size="40" />
                </div>
                <div class="dp-head-main">
                  <h2 class="dp-name">{{ detail.name }}</h2>
                  <div class="dp-meta">v{{ detail.version || '1.0.0' }} · {{ fmtDate(detail.createdAt) }}</div>
                  <div class="dp-tags">
                    <span v-for="t in detail.tags" :key="t" class="dp-tag">#{{ t }}</span>
                  </div>
                </div>
                <button v-if="isDetailOwner" class="dp-edit" @click="goDetailEdit"><Pencil :size="14" /> 编辑</button>
              </div>

              <div class="dp-author">
                <div class="dp-author-left">
                  <img v-if="detail.authorAvatar" :src="detail.authorAvatar" class="dp-avatar" referrerpolicy="no-referrer" />
                  <div class="dp-author-text">
                    <div class="dp-author-name">
                      {{ detail.authorNick || detail.author }}
                      <ShieldCheck v-if="detail.authorVerified" :size="14" class="verified" />
                    </div>
                    <div class="dp-author-sub">@{{ detail.author }}</div>
                  </div>
                </div>
                <button
                  v-if="!isDetailOwner && detailLoggedIn"
                  class="dp-follow"
                  :class="{ followed: detailFollowing }"
                  @click="toggleFollow"
                >
                  {{ detailFollowing ? '已关注' : '+ 关注' }}
                </button>
              </div>

              <div v-if="detail.images && detail.images.length" class="dp-shots">
                <img :src="detail.images[shotIdx]" class="dp-shot-main" @click="previewDetail = shotIdx" />
                <button v-if="detail.images.length > 1" class="dp-shot-arr dp-shot-arr--prev" @click.stop="shotPrev">&#8249;</button>
                <button v-if="detail.images.length > 1" class="dp-shot-arr dp-shot-arr--next" @click.stop="shotNext">&#8250;</button>
                <div v-if="detail.images.length > 1" class="dp-shot-dots">
                  <span
                    v-for="(_, i) in detail.images" :key="i"
                    :class="{ on: i === shotIdx }"
                    @click.stop="shotIdx = i"
                  ></span>
                </div>
              </div>

              <div class="dp-desc">
                <h3>插件简介</h3>
                <div class="dp-desc-body">{{ detail.description || '暂无介绍' }}</div>
              </div>

              <div class="dp-stats">
                <button class="dp-stat" :class="{ active: detail.liked }" @click="toggleLike">
                  <ThumbsUp :size="16" /><span>{{ detail.likeCount || 0 }}</span>
                </button>
                <button class="dp-stat" :class="{ active: detail.coined }" @click="toggleCoin">
                  <Coins :size="16" /><span>{{ detail.coinCount || 0 }}</span>
                </button>
                <div class="dp-stat"><Download :size="16" /><span>{{ detail.downloadCount || 0 }}</span></div>
                <div class="dp-stat"><Eye :size="16" /><span>{{ detail.viewCount || 0 }}</span></div>
              </div>

              <button class="dp-dl" @click="downloadPlugin">
                <Download :size="18" /><span>下载</span>
                <span class="dp-dl-size">{{ detail.fileSizeText || (detail.fileSize ? fmtBytes(detail.fileSize) : '') }}</span>
              </button>
            </template>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 图片预览 -->
    <Teleport to="body">
      <div v-if="previewDetail >= 0" class="preview-mask" @click="previewDetail = -1">
        <img :src="detail.images[previewDetail]" />
      </div>
    </Teleport>

    <!-- toast -->
    <div v-if="detailToast" class="detail-toast">{{ detailToast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, X, RefreshCw, Upload, ThumbsUp, Coins, Download, Eye, ShieldCheck, Star, Map, Package, BookOpen, Factory, Pencil } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// ============ 列表 ============
const navItems = [
  { label: '推荐', icon: Star, sort: 'newest' },
  { label: '地图', icon: Map, sort: 'newest' },
  { label: '模组', icon: Package, sort: 'newest' },
  { label: '专题', icon: BookOpen, sort: 'newest' },
  { label: '资源工坊', icon: Factory, sort: 'newest' }
];

const ranks = [
  { bg: '/pic/mk/1.png', id: null },
  { bg: '/pic/mk/2.png', id: null },
  { bg: '/pic/mk/3.png', id: null },
  { bg: '/pic/mk/4.png', id: null },
];

const kw = ref('');
const activeNav = ref(0);
const loading = ref(true);
const items = ref([]);
let authUser = null;

async function refresh() {
  loading.value = true;
  try {
    // 拿排行榜第一个插件 id
    const r1 = await fetch('/api/market/plugins?sort=newest&size=1').then(r => r.json());
    const r2 = await fetch('/api/market/plugins?sort=hot&size=1').then(r => r.json());
    const r3 = await fetch('/api/market/plugins?sort=download&size=1').then(r => r.json());
    const r4 = await fetch('/api/market/plugins?sort=rating&size=1').then(r => r.json());
    const list = [r1, r2, r3, r4];
    for (let i = 0; i < 4; i++) {
      ranks[i].id = list[i].items?.[0]?.id || null;
    }

    // 列表
    const params = new URLSearchParams({
      sort: navItems[activeNav.value].sort,
      size: 6
    });
    if (kw.value.trim()) params.set('keyword', kw.value.trim());
    const d = await fetch('/api/market/plugins?' + params).then(r => r.json());
    items.value = d.items || [];
  } catch (e) {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

// ============ 发布按钮 ============
function openPublish() {
  const features = 'width=960,height=720,scrollbars=yes,resizable=yes';
  window.open('/upload', 'pluginUpload', features);
}

// ============ 详情弹窗 ============
const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref(null);
const detailLoggedIn = ref(false);
const detailFollowing = ref(false);
const previewDetail = ref(-1);
const detailToast = ref('');
const detailId = ref('');
const shotIdx = ref(0);
let shotTimer = null;

function shotNext() {
  if (!detail.value?.images?.length) return;
  shotIdx.value = (shotIdx.value + 1) % detail.value.images.length;
  restartShotAuto();
}
function shotPrev() {
  if (!detail.value?.images?.length) return;
  const n = detail.value.images.length;
  shotIdx.value = (shotIdx.value - 1 + n) % n;
  restartShotAuto();
}
function startShotAuto() {
  stopShotAuto();
  if (!detail.value?.images || detail.value.images.length <= 1) return;
  shotTimer = setInterval(() => {
    shotIdx.value = (shotIdx.value + 1) % detail.value.images.length;
  }, 3000);
}
function stopShotAuto() {
  if (shotTimer) { clearInterval(shotTimer); shotTimer = null; }
}
function restartShotAuto() { stopShotAuto(); startShotAuto(); }

const isDetailOwner = computed(() =>
  detailLoggedIn.value && detail.value &&
  (detail.value.author === (authUser?.username) ||
   (authUser?.role && authUser.role.includes('admin')))
);

function showDetailToast(msg) {
  detailToast.value = msg;
  setTimeout(() => detailToast.value = '', 2000);
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (new Date() - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function fmtBytes(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

async function openDetail(id) {
  if (!id) return;
  detailId.value = id;
  detailOpen.value = true;
  detailLoading.value = true;
  detail.value = null;
  detailFollowing.value = false;
  shotIdx.value = 0;
  router.replace({ query: { ...route.query, plugin: id } });
  requestAnimationFrame(setDetailScale);
  try {
    const auth = await fetch('/api/auth/state', { credentials: 'include' }).then(r => r.json());
    detailLoggedIn.value = auth.ok && auth.user;
    if (auth.user) authUser = auth.user;

    const d = await fetch(`/api/market/plugins/${id}`, { credentials: 'include' }).then(r => r.json());
    if (d.ok) {
      detail.value = d.plugin;
      startShotAuto();
      if (detailLoggedIn.value) {
        const u = await fetch(`/api/users/${d.plugin.author}`, { credentials: 'include' }).then(r => r.json());
        if (u.ok) detailFollowing.value = !!u.profile?.following;
      }
    }
  } catch (e) {
    showDetailToast('加载失败');
  } finally {
    detailLoading.value = false;
  }
}
function closeDetail() {
  stopShotAuto();
  detailOpen.value = false;
  router.replace({ query: {} });
  detail.value = null;
}
function goDetailEdit() {
  if (detail.value?.id) {
    window.open(`/plugin/${detail.value.id}/edit`, '_blank');
  }
}
async function toggleLike() {
  if (!detailLoggedIn.value) return showDetailToast('请先登录');
  const r = await fetch(`/api/market/plugins/${detailId.value}/like`, { method: 'POST', credentials: 'include' }).then(r => r.json());
  if (r.ok && detail.value) {
    detail.value.liked = r.liked;
    detail.value.likeCount = r.likeCount;
  }
}
async function toggleCoin() {
  if (!detailLoggedIn.value) return showDetailToast('请先登录');
  const r = await fetch(`/api/market/plugins/${detailId.value}/coin`, { method: 'POST', credentials: 'include' }).then(r => r.json());
  if (r.ok && detail.value) {
    detail.value.coined = r.coined;
    detail.value.coinCount = r.coinCount;
  }
}
async function toggleFollow() {
  const r = await fetch(`/api/users/${detail.value.author}/follow`, { method: 'POST', credentials: 'include' }).then(r => r.json());
  if (r.ok) detailFollowing.value = r.following;
}
function downloadPlugin() {
  if (!detailLoggedIn.value) return showDetailToast('请先登录');
  window.location.href = `/api/market/plugins/${detailId.value}/download`;
}

// URL query 里有 ?plugin=id 自动打开
watch(() => route.query.plugin, (pid) => {
  if (pid) openDetail(pid);
});

function setDetailScale() {
  const scaler = document.querySelector('.detail-scaler');
  const panel = document.querySelector('.detail-panel');
  if (!scaler || !panel) return;
  const w = scaler.clientWidth;
  const scale = w / 2048;
  panel.style.transform = 'scale(' + scale + ')';
}

onMounted(() => {
  window.addEventListener('resize', setDetailScale);
  refresh();
  const h = (e) => { if (e.key === 'Escape' && detailOpen.value) closeDetail(); };
  document.addEventListener('keydown', h);
  const noContext = (e) => e.preventDefault();
  document.addEventListener('contextmenu', noContext);
  onUnmounted(() => {
    document.removeEventListener('keydown', h);
    document.removeEventListener('contextmenu', noContext);
    window.removeEventListener('resize', setDetailScale);
    stopShotAuto();
  });
});
</script>

<style scoped>
.market {
  min-height: 100vh;
  position: relative;
  color: #2c3e50;
}
.bg-layer {
  position: absolute; inset: 0;
  background: url('/pic/bg.png') center/cover no-repeat fixed;
  z-index: 0;
}
.market > *:not(.bg-layer) { position: relative; z-index: 1; }

/* 顶栏 */
.top-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 24px;
  background: transparent;
}
.top-bar__search {
  flex: 1; max-width: 520px;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.18);
  border-radius: 22px;
}
.top-bar__search .icon { color: rgba(255,255,255,0.7); flex-shrink: 0; }
.top-bar__search input {
  flex: 1; border: none; outline: none;
  background: transparent; color: #fff; font-size: 14px;
}
.top-bar__search input::placeholder { color: rgba(255,255,255,0.5); }
.top-bar__publish {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 20px; border: none;
  background: linear-gradient(135deg, #48c774, #17a2b8);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform .12s;
}
.top-bar__publish:hover { transform: translateY(-1px); }
.top-bar__close { margin-left: auto; }
.top-bar__publish:active { transform: scale(.97); }
.top-bar__close {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.2);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.top-bar__close:hover { background: rgba(255,80,80,0.6); }

/* Body */
.body {
  display: flex;
  padding: 20px;
  gap: 20px;
  height: calc(100vh - 68px);
}

/* 侧栏 */
.side-nav {
  width: 200px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
  background: transparent;
  border-radius: 14px;
  padding: 12px;
  position: relative;
}
.side-nav__item {
  position: relative;
  padding: 12px 22px;
  border-radius: 10px;
  display: flex; align-items: center; gap: 12px;
  color: rgba(255,255,255,0.8);
  font-size: 14px; font-weight: 500;
  cursor: pointer;
  transition: color .2s;
}
.side-nav__item:hover { color: #fff; }
.side-nav__bg {
  position: absolute; inset: 0;
  background: url('/pic/sl.png') center/100% 100% no-repeat;
  z-index: -1;
}
.side-nav__item.is-active { color: #1a202c; }

/* 主区 */
.main {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column; gap: 20px;
}
.main::-webkit-scrollbar { width: 8px; }
.main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }

/* 排行榜 */
.ranks {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.rank-card {
  aspect-ratio: 16/9;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  transition: transform .2s;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
}
.rank-card:hover { transform: translateY(-4px); }

/* 区头 */
.section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.section-head h3 {
  margin: 0; font-size: 18px; font-weight: 700; color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.section-actions button {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.4);
  background: rgba(0,0,0,0.25);
  color: #fff; font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.section-actions button:hover { background: rgba(255,255,255,0.2); }

/* 卡片网格 */
.cards {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.card {
  background: rgba(255,255,255,0.95);
  border-radius: 12px; overflow: hidden;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
.card__cover { position: relative; aspect-ratio: 16/9; background: #f0f2f6; overflow: hidden; }
.card__cover img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
.card:hover .card__cover img { transform: scale(1.05); }
.card__cover-fallback {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: #b0b8c5;
}
.card__body { padding: 12px 14px; }
.card__body h4 { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #1a202c; }
.card__body .tag {
  display: inline-block; padding: 1px 8px; margin-right: 6px;
  background: rgba(74,125,255,0.1); color: #4a7dff;
  border-radius: 10px; font-size: 11px; font-weight: 500;
}
.card__body .author { font-size: 12px; color: #8c98aa; }
.card__stats {
  display: flex; gap: 12px; margin-top: 8px;
  font-size: 12px; color: #5a6478;
}
.card__stats span { display: inline-flex; align-items: center; gap: 3px; }



/* 空状态 */
.empty {
  text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.8);
}
.empty p { margin-top: 12px; }

/* ============ 详情弹窗 ============ */
.detail-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 900;
  display: flex; align-items: center; justify-content: center;
  animation: fade-in .2s ease;
}
@keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }

.detail-frame { width: min(900px, 96vw); }
/* scaler 负责把内层 2048x1201 等比缩放到弹窗宽度 */
.detail-scaler {
  width: 100%;
  aspect-ratio: 2048 / 1201;
  overflow: hidden;
  position: relative;
}
/* 内层固定原图像素尺寸，transform-origin top-left */
.detail-panel {
  position: absolute; left: 0; top: 0;
  width: 2048px; height: 1201px;
  background-image: url('/pic/mk/pluginAlt.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform-origin: top left;
}
/* 关闭按钮 中心(1825,177) → left:1825-50=1775 top:177-50=127 w:100 h:100 */
.detail-close {
  position: absolute; left: 1775px; top: 127px;
  width: 100px; height: 100px;
  border: none; background: transparent; color: #2c3e50;
  cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;
  padding: 0;
  font-size: 56px; line-height: 1;
}
.detail-close:hover { color: #e74c3c; }









/* 信息组合div (1159,259) 原图像素 */
.dp-head {
  position: absolute;
  left: 1159px; top: 259px;
  right: 167px;
  display: flex; gap: 18px; align-items: flex-start;
}
.dp-icon { width: 90px; height: 90px; border-radius: 16px; background: #f0f2f6; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.dp-icon img { width: 100%; height: 100%; object-fit: cover; }
.dp-head-main { flex: 1; }
.dp-name { margin: 0 0 8px; font-size: 52px; font-weight: 700; color: #1a202c; text-shadow: 0 2px 0 rgba(255,255,255,0.6); }
.dp-meta { font-size: 28px; color: #5a6478; margin-bottom: 12px; }
.dp-tags { display: flex; gap: 12px; flex-wrap: wrap; }
.dp-tag { padding: 4px 22px; background: rgba(74,125,255,0.1); color: #4a7dff; border-radius: 26px; font-size: 26px; font-weight: 500; }
.dp-edit { padding: 8px 26px; border: 2px solid #4a7dff; border-radius: 30px; background: transparent; color: #4a7dff; font-size: 28px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.dp-edit:hover { background: #4a7dff; color: #fff; }

/* 作者div (167,641) h=30 原图像素 */
.dp-author {
  position: absolute;
  left: 167px; top: 810px;
  right: 167px;
  height: 30px;
  display: flex; align-items: center; justify-content: space-between;
}
.dp-author-left { display: flex; align-items: center; gap: 20px; }
.dp-avatar { width: 83px; height: 83px; border-radius: 50%; object-fit: cover; }
.dp-author-name { font-size: 30px; font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 8px; }
.verified { color: #48c774; width: 32px; height: 32px; }
.dp-author-sub { font-size: 26px; color: #8c98aa; }
.dp-follow { padding: 8px 30px; border-radius: 30px; border: 2px solid #4a7dff; background: transparent; color: #4a7dff; font-size: 28px; cursor: pointer; transition: all .15s; }
.dp-follow:hover { background: #4a7dff; color: #fff; }
.dp-follow.followed { background: #eef2ff; border-color: #dce4ff; color: #5a6478; }

/* 图片展示区 原图像素 */
.dp-shots {
  position: absolute;
  left: 167px; top: 251px;
  width: 800px; height: 500px;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  cursor: zoom-in;
}
.dp-shot-main {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
.dp-shot-arr {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 80px; height: 80px; border-radius: 50%;
  border: none; background: rgba(0,0,0,0.45); color: #fff;
  font-size: 48px; line-height: 1;
  cursor: pointer; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.dp-shot-arr:hover { background: rgba(0,0,0,0.75); }
.dp-shot-arr--prev { left: 20px; }
.dp-shot-arr--next { right: 20px; }
.dp-shot-dots {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 10px;
}
.dp-shot-dots span {
  width: 18px; height: 18px; border-radius: 50%;
  background: rgba(255,255,255,0.5);
  cursor: pointer; transition: background .15s;
}
.dp-shot-dots span.on { background: #fff; }

/* 简介div (1159,393) h=350 原图像素: w=2048-1159-167=722，top+90 */
.dp-desc {
  position: absolute;
  left: 1159px; top: 452px;
  width: 722px; height: 350px;
  overflow: hidden;
}
.dp-desc h3 { margin: 0 0 12px; font-size: 30px; font-weight: 600; color: #1a202c; }
.dp-desc-body { font-size: 28px; color: #3d4758; line-height: 1.6; white-space: pre-wrap; word-break: break-word; height: calc(100% - 48px); overflow-y: auto; }

/* 统计按钮div (1159,821) 原图像素 */
.dp-stats {
  position: absolute;
  left: 1159px; top: 821px;
  right: 167px;
  display: flex; gap: 12px; align-items: center;
}
.dp-stat { display: inline-flex; align-items: center; gap: 8px; padding: 8px 26px; border-radius: 30px; border: none; background: rgba(255,255,255,0.6); color: #5a6478; font-size: 28px; font-weight: 500; cursor: pointer; transition: all .15s; }
.dp-stat:hover { background: rgba(255,255,255,0.9); }
.dp-stat.active { background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: #fff; }

/* 下载按钮 (1355,1007) w=498 - 显示贴图实体区 y=81~528 */
.dp-dl {
  position: absolute;
  left: 1355px; top: 1007px;
  width: 498px; height: 109px;
  display: inline-flex; align-items: center; justify-content: center;
  gap: 12px;
  padding: 0 24px; border: none;
  background-color: transparent;
  background-image: url('/pic/btn.png');
  background-repeat: no-repeat;
  background-size: 498px 147.9px; /* 贴图等比: 498/2048*607=147.9 */
  background-position: center center; /* 贴图居中，实体区完整显示 */
  color: #4a3000; font-size: 30px; font-weight: 700; cursor: pointer;
  transition: transform .12s, filter .15s;
}
.dp-dl:hover { transform: translateY(-2px); filter: brightness(1.06); }
.dp-dl:active { transform: scale(.97); }
.dp-dl-size { padding: 2px 14px; background: rgba(255,255,255,0.25); border-radius: 18px; font-size: 24px; font-weight: 500; }

/* 预览 */
.preview-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; z-index: 1000; cursor: zoom-out; }
.preview-mask img { max-width: 92vw; max-height: 92vh; border-radius: 10px; object-fit: contain; }

/* toast */
.detail-toast { position: fixed; top: 30px; left: 50%; transform: translateX(-50%); padding: 8px 20px; background: rgba(0,0,0,0.85); color: #fff; border-radius: 18px; font-size: 13px; z-index: 2000; animation: fade-in .2s ease; }

/* 响应式 */
@media (max-width: 900px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
  .ranks { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .body { flex-direction: column; height: auto; }
  .side-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .side-nav__item { padding: 8px 14px; white-space: nowrap; }
  .detail-frame { width: 96vw; }
  /* 内层 detail-panel 永远 2048x1201，scale 由 JS 处理 */
}
</style>
