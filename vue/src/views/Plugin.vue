<template>
  <div class="plugin-page">
    <!-- 顶栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" /> 返回
      </button>
      <div class="top-bar__title">插件详情</div>
      <div class="top-bar__right">
        <button v-if="isOwner" class="edit-btn" @click="edit">
          <Pencil :size="16" /> 编辑
        </button>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="state"><div class="spinner"></div><p>加载中…</p></div>

    <!-- 404 -->
    <div v-else-if="!plugin" class="state"><p>插件不存在或已下架</p>
      <button class="btn-outline" @click="goBack">返回</button>
    </div>

    <!-- 详情 -->
    <template v-else>
      <!-- 主面板（pluginAlt.png 等比例贴图） -->
      <div class="frame">
        <div class="panel">
          <!-- 顶部：图标 + 名称 + 标签 + 时间 -->
          <div class="panel__head">
            <div class="icon-box">
              <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" />
              <Package v-else :size="40" />
            </div>
            <div class="head-main">
              <h1 class="pname">{{ plugin.name }}</h1>
              <div class="meta-row">
                <span class="ver">v{{ plugin.version || '1.0.0' }}</span>
                <span class="sep">·</span>
                <span>{{ fmtDate(plugin.createdAt) }}</span>
              </div>
              <div class="tags">
                <span v-for="t in plugin.tags" :key="t" class="tag">#{{ t }}</span>
              </div>
            </div>
          </div>

          <!-- 作者信息 -->
          <div class="author-row">
            <div class="author-info">
              <img
                v-if="plugin.authorAvatar"
                :src="plugin.authorAvatar"
                class="avatar"
                referrerpolicy="no-referrer"
              />
              <div class="author-text">
                <div class="author-name">
                  {{ plugin.authorNick || plugin.author }}
                  <ShieldCheck v-if="plugin.authorVerified" :size="14" class="verified" />
                </div>
                <div class="author-sub">@{{ plugin.author }}</div>
              </div>
            </div>
            <button
              v-if="!isOwner && loggedIn"
              class="follow-btn"
              :class="{ followed: following }"
              @click="toggleFollow"
            >
              {{ following ? '已关注' : '+ 关注' }}
            </button>
          </div>

          <!-- 展示图片 -->
          <div v-if="plugin.images && plugin.images.length" class="shots">
            <div
              v-for="(img, i) in plugin.images"
              :key="i"
              class="shot-item"
              @click="preview(i)"
            >
              <img :src="img" />
            </div>
          </div>

          <!-- 简介 -->
          <div class="desc">
            <h3>插件简介</h3>
            <div class="desc-body">{{ plugin.description || '暂无介绍' }}</div>
          </div>

          <!-- 统计行 -->
          <div class="stats">
            <button class="stat" :class="{ active: plugin.liked }" @click="toggleLike">
              <ThumbsUp :size="18" />
              <span>{{ plugin.likeCount || 0 }}</span>
            </button>
            <button class="stat" :class="{ active: plugin.coined }" @click="toggleCoin">
              <Coins :size="18" />
              <span>{{ plugin.coinCount || 0 }}</span>
            </button>
            <div class="stat stat--passive">
              <Download :size="18" />
              <span>{{ plugin.downloadCount || 0 }}</span>
            </div>
            <div class="stat stat--passive">
              <Eye :size="18" />
              <span>{{ plugin.viewCount || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右下角下载按钮 -->
      <button class="dl-btn" @click="download">
        <Download :size="22" />
        <span>下载</span>
        <span class="dl-size">{{ plugin.fileSizeText || (plugin.fileSize ? fmtBytes(plugin.fileSize) : '') }}</span>
      </button>
    </template>

    <!-- 图片预览 -->
    <div v-if="previewIdx >= 0" class="preview" @click="previewIdx = -1">
      <img :src="plugin.images[previewIdx]" />
    </div>

    <!-- toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Pencil, Package, ThumbsUp, Coins, Download, Eye, ShieldCheck } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const plugin = ref(null);
const loggedIn = ref(false);
const following = ref(false);
const toast = ref('');
const previewIdx = ref(-1);

const id = computed(() => route.params.id);
const isOwner = computed(() =>
  loggedIn.value && plugin.value && (
    plugin.value.author === loggedIn.value.username ||
    (loggedIn.value.role && loggedIn.value.role.includes('admin'))
  )
);

function showToast(msg) {
  toast.value = msg;
  setTimeout(() => toast.value = '', 2000);
}
function goBack() { router.back(); }
function edit() { router.push(`/plugin/${id.value}/edit`); }
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtBytes(n) {
  if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

// === 点赞 ===
async function toggleLike() {
  if (!loggedIn.value) { showToast('请先登录'); return; }
  try {
    const r = await fetch(`/api/market/plugins/${id.value}/like`, {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) {
      plugin.value.liked = r.liked;
      plugin.value.likeCount = r.likeCount;
    }
  } catch (e) { showToast(e.message); }
}

// === 投币 ===
async function toggleCoin() {
  if (!loggedIn.value) { showToast('请先登录'); return; }
  try {
    const r = await fetch(`/api/market/plugins/${id.value}/coin`, {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) {
      plugin.value.coined = r.coined;
      plugin.value.coinCount = r.coinCount;
    }
  } catch (e) { showToast(e.message); }
}

// === 关注 ===
async function toggleFollow() {
  try {
    const r = await fetch(`/api/users/${plugin.value.author}/follow`, {
      method: 'POST', credentials: 'include'
    }).then(r => r.json());
    if (r.ok) following.value = r.following;
  } catch (e) { showToast(e.message); }
}

// === 下载 ===
async function download() {
  if (!loggedIn.value) { showToast('请先登录'); return; }
  // 直接 window.location，后端会 set header 触发浏览器下载
  window.location.href = `/api/market/plugins/${id.value}/download`;
}

// === 预览 ===
function preview(i) { previewIdx.value = i; }

// === 初始化 ===
onMounted(async () => {
  try {
    const auth = await fetch('/api/auth/state', { credentials: 'include' }).then(r => r.json());
    loggedIn.value = auth.ok && auth.user;

    const d = await fetch(`/api/market/plugins/${id.value}`, { credentials: 'include' }).then(r => r.json());
    if (!d.ok) { plugin.value = null; return; }
    plugin.value = d.plugin;

    // 取关注状态
    if (loggedIn.value) {
      const u = await fetch(`/api/users/${plugin.value.author}`, { credentials: 'include' }).then(r => r.json());
      if (u.ok) following.value = !!u.profile?.following;
    }
  } catch (e) {
    showToast('加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.plugin-page {
  min-height: 100vh;
  background: url('/pic/bg.png') center/cover no-repeat fixed;
  color: #2c3e50;
  position: relative;
  padding-bottom: 100px;
}

/* 顶栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(0);
}
.top-bar__title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}
.back-btn, .edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  border: none;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background .15s;
}
.back-btn:hover, .edit-btn:hover { background: rgba(255,255,255,0.35); }

/* 状态 */
.state {
  text-align: center;
  padding: 100px 40px;
  color: #fff;
}
.spinner {
  width: 36px; height: 36px;
  margin: 0 auto 14px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 面板容器 */
.frame {
  display: flex;
  justify-content: center;
  padding: 30px 20px;
}
.panel {
  width: min(880px, 96vw);
  aspect-ratio: 2048 / 1151;  /* 和 pluginAlt.png 等比例 */
  background-image: url('/pic/mk/pluginAlt.png');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  padding: calc(2.5% * 1) calc(3.2% * 1);
  box-sizing: border-box;
}
/* 内容区绝对定位，避开贴图边缘装饰 */
.panel > * {
  position: absolute;
  left: 6%;
  right: 6%;
}
.panel__head { top: 8%; }
.author-row { top: 34%; }
.shots { top: 48%; }
.desc { top: 70%; }
.stats { top: 88%; }

/* === 头部 === */
.panel__head {
  display: flex;
  gap: 22px;
  align-items: flex-start;
}
.icon-box {
  width: 100px; height: 100px;
  border-radius: 20px;
  background: #f0f2f6;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-box img { width: 100%; height: 100%; object-fit: cover; }
.head-main { flex: 1; padding-top: 4px; }
.pname {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  text-shadow: 0 1px 0 rgba(255,255,255,0.6);
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #5a6478;
  margin-bottom: 8px;
}
.sep { color: #c0c7d2; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  padding: 2px 10px;
  background: rgba(74,125,255,0.1);
  color: #4a7dff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* === 作者 === */
.author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.author-info { display: flex; align-items: center; gap: 12px; }
.avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #eef1f6;
}
.author-name {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 4px;
}
.verified { color: #48c774; }
.author-sub { font-size: 12px; color: #8c98aa; }

.follow-btn {
  padding: 6px 16px;
  border-radius: 16px;
  border: 1px solid #4a7dff;
  background: transparent;
  color: #4a7dff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}
.follow-btn:hover { background: #4a7dff; color: #fff; }
.follow-btn.followed {
  background: #eef2ff;
  border-color: #dce4ff;
  color: #5a6478;
}

/* === 图片 === */
.shots {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.shots::-webkit-scrollbar { height: 6px; }
.shots::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
.shot-item {
  flex-shrink: 0;
  width: 220px;
  height: 124px;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
  transition: transform .2s;
}
.shot-item:hover { transform: scale(1.03); }
.shot-item img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* === 简介 === */
.desc h3 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a202c;
}
.desc-body {
  font-size: 14px;
  color: #3d4758;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}

/* === 统计 === */
.stats {
  display: flex;
  gap: 18px;
  align-items: center;
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 16px;
  border: none;
  background: rgba(255,255,255,0.6);
  color: #5a6478;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
}
.stat:hover { background: rgba(255,255,255,0.9); }
.stat.active {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  color: #fff;
}
.stat--passive { cursor: default; }
.stat--passive:hover { background: rgba(255,255,255,0.6); }

/* === 下载按钮（浮动右下角） === */
.dl-btn {
  position: fixed;
  right: 40px;
  bottom: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 32px;
  border: none;
  background: linear-gradient(135deg, #48c774, #17a2b8);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(72,199,116,0.4);
  transition: transform .12s, box-shadow .15s;
  z-index: 100;
}
.dl-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(72,199,116,0.5);
}
.dl-btn:active { transform: scale(.97); }
.dl-size {
  padding: 2px 8px;
  background: rgba(255,255,255,0.25);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

/* === 图片预览 === */
.preview {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  cursor: zoom-out;
}
.preview img {
  max-width: 92vw;
  max-height: 92vh;
  border-radius: 12px;
  object-fit: contain;
}

/* toast */
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 22px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1000;
  animation: toast-in .2s ease;
}
@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

@media (max-width: 680px) {
  .panel { aspect-ratio: auto; padding: 20px; }
  .panel > * { position: relative; left: 0; right: 0; }
  .panel__head, .author-row, .shots, .desc, .stats { top: auto; position: relative; margin-bottom: 20px; }
  .frame { padding: 20px 12px; }
  .dl-btn { right: 20px; bottom: 20px; padding: 10px 20px; font-size: 14px; }
}
</style>
