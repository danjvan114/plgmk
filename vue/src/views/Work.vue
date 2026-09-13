<template>
  <div class="work">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <button class="top-bar__back" @click="$router.back()"><ArrowLeft :size="20" /> 返回</button>
      <button class="top-bar__close" @click="$router.back()"><X :size="22" /></button>
    </header>

    <div v-if="loading" class="page-body skeleton-wrap">
      <div class="sk-main">
        <div class="sk-player"></div>
        <div class="sk-line" style="width:50%;height:22px"></div>
        <div class="sk-line" style="width:30%"></div>
      </div>
      <div class="sk-side">
        <div class="sk-side-card"><div class="sk-line" style="width:60%;height:16px"></div><div class="sk-line"></div><div class="sk-line"></div></div>
        <div class="sk-side-card"><div class="sk-line" style="width:60%;height:16px"></div><div class="sk-line"></div><div class="sk-line"></div></div>
      </div>
    </div>

    <div v-else-if="!work" class="page-body empty">
      <Package :size="48" />
      <p>作品不存在或已被删除</p>
    </div>

    <div v-else class="page-body">
      <!-- 左主 + 右侧栏 -->
      <div class="main-layout">
        <!-- 左侧主区 -->
        <div class="main-col">
          <!-- 媒体区 -->
          <div class="player-card">
            <!-- player 类型：官方 KittenN iframe -->
            <div v-if="!isImgType && !isRedirectType" class="player-wrap">
              <iframe
                :src="playerFrameUrl"
                allowfullscreen
                class="player-iframe"
              ></iframe>
            </div>
            <!-- img 类型：直接看图 -->
            <div v-else-if="isImgType" class="player-wrap player-img-wrap">
              <img :src="work.thumbnail || work.fileUrl" class="player-img" referrerpolicy="no-referrer" />
            </div>
            <!-- redirect 类型：跳转外部 -->
            <div v-else class="player-wrap player-redirect-wrap">
              <a :href="work.fileUrl" target="_blank" class="redirect-btn" rel="noopener">
                <ExternalLink :size="22" /> 打开外部作品
              </a>
            </div>
          </div>

          <!-- 标题 + 作者条 -->
          <div class="head-card">
            <h1 class="dc-title">{{ work.title }}</h1>
            <div class="dc-tags" v-if="work.tags && work.tags.length">
              <span v-for="t in work.tags" :key="t" class="dc-tag">#{{ t }}</span>
            </div>
            <div class="dc-author">
              <img v-if="work.authorAvatar" :src="work.authorAvatar" class="dc-avatar" referrerpolicy="no-referrer" />
              <div v-else class="dc-avatar dc-avatar-fallback">
                {{ (work.authorNick || work.author || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="dc-author-text">
                <div class="dc-author-name">
                  {{ work.authorNick || work.author }}
                  <ShieldCheck v-if="work.authorVerified" :size="14" class="verified" />
                </div>
                <div class="dc-author-sub">@{{ work.author }}</div>
              </div>
              <button
                v-if="!isOwner && loggedIn"
                class="dc-follow"
                :class="{ followed: work.following }"
                @click="toggleFollow"
              >{{ work.following ? '已关注' : '+ 关注' }}</button>
            </div>

            <!-- 操作栏 -->
            <div class="dc-actions">
              <button class="dc-btn" :class="{ active: work.liked }" @click="toggleLike">
                <ThumbsUp :size="18" /><span>{{ work.likeCount || 0 }}</span>
              </button>
              <button class="dc-btn" :class="{ active: work.faved }" @click="toggleFav">
                <Star :size="18" /><span>{{ work.favCount || 0 }}</span>
              </button>
              <button class="dc-btn" :class="{ active: work.coined }" @click="toggleCoin">
                <Coins :size="18" /><span>{{ work.coinCount || 0 }}</span>
              </button>
              <div class="dc-stats">
                <span><Eye :size="16" /> {{ work.viewCount || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- 作品简介 -->
          <div class="desc-card">
            <h3>作品简介</h3>
            <div class="desc-body">{{ work.description || work.content || '作者很懒，没有写简介～' }}</div>

            <div v-if="work.fileUrl" class="file-row">
              <a :href="work.fileUrl" target="_blank" class="file-btn">
                <Download :size="18" /> 下载作品文件
              </a>
              <span class="file-meta">{{ fileName }}</span>
            </div>
          </div>

          <!-- 管理按钮 -->
          <div v-if="isOwner || isAdmin" class="manage-card">
            <button v-if="isOwner" class="mg-btn" @click="goEdit">
              <Pencil :size="14" /> 编辑作品
            </button>
            <button class="mg-btn mg-del" @click="onDelete">
              <Trash2 :size="14" /> 删除作品
            </button>
          </div>

          <!-- 评论区（最下方） -->
          <div class="comment-card">
            <div class="cc-head">
              <h3>评论 <span class="cc-count">({{ comments.length || work.commentCount || 0 }})</span></h3>
            </div>

            <div v-if="!loggedIn" class="cc-login">登录后才能发表评论</div>

            <div v-else class="cc-form">
              <textarea v-model="newComment" placeholder="发表你的看法..." rows="3" />
              <div class="cc-form-actions">
                <button @click="submitComment" :disabled="!newComment.trim() || cmtLoading" class="cc-submit">
                  {{ cmtLoading ? '发送中...' : '发表评论' }}
                </button>
              </div>
            </div>

            <div v-if="!comments.length" class="cc-empty">暂无评论，来抢沙发～</div>

            <div v-else class="cc-list">
              <div v-for="c in comments" :key="c.id" class="cmt-item" :class="{ deleted: c.isDeleted }">
                <img v-if="c.authorAvatar" :src="c.authorAvatar" class="cmt-avatar" referrerpolicy="no-referrer" />
                <div v-else class="cmt-avatar cmt-avatar-fallback">
                  {{ (c.authorNick || c.author || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="cmt-main">
                  <div class="cmt-head">
                    <span class="cmt-name">{{ c.authorNick || c.author }}</span>
                    <span v-if="c.authorVerified" class="cmt-verified"><ShieldCheck :size="12" /></span>
                    <span class="cmt-time">{{ fmtDate(c.createdAt) }}</span>
                    <button v-if="c.isPinned" class="cmt-pin" disabled>置顶</button>
                    <button v-if="canDeleteComment(c)" class="cmt-del" @click="deleteComment(c.id)">
                      <Trash2 :size="12" />
                    </button>
                  </div>
                  <div class="cmt-body">
                    <span v-if="c.replyToNick" class="cmt-reply-to">回复 @{{ c.replyToNick }}：</span>
                    {{ c.content }}
                  </div>
                  <button class="cmt-reply-btn" @click="startReply(c)">回复</button>

                  <div v-if="c.children && c.children.length" class="cmt-children">
                    <div v-for="cc in c.children" :key="cc.id" class="cmt-item cmt-item-child" :class="{ deleted: cc.isDeleted }">
                      <img v-if="cc.authorAvatar" :src="cc.authorAvatar" class="cmt-avatar" referrerpolicy="no-referrer" />
                      <div v-else class="cmt-avatar cmt-avatar-fallback">{{ (cc.authorNick || cc.author || '?').charAt(0).toUpperCase() }}</div>
                      <div class="cmt-main">
                        <div class="cmt-head">
                          <span class="cmt-name">{{ cc.authorNick || cc.author }}</span>
                          <span class="cmt-time">{{ fmtDate(cc.createdAt) }}</span>
                          <button v-if="canDeleteComment(cc)" class="cmt-del" @click="deleteComment(cc.id)"><Trash2 :size="12" /></button>
                        </div>
                        <div class="cmt-body">
                          <span v-if="cc.replyToNick" class="cmt-reply-to">回复 @{{ cc.replyToNick }}：</span>
                          {{ cc.content }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧栏 -->
        <aside class="side-col">
          <!-- 发布信息 -->
          <div class="side-card">
            <h4 class="side-title">发布信息</h4>
            <div class="side-item"><span class="si-label">发布时间</span><span class="si-value">{{ fmtDate(work.createdAt) }}</span></div>
            <div class="side-item"><span class="si-label">最后更新</span><span class="si-value">{{ fmtDate(work.updatedAt) }}</span></div>
            <div class="side-item"><span class="si-label">作品类型</span><span class="si-value">{{ work.type || '—' }}</span></div>
            <div class="side-item"><span class="si-label">状态</span>
              <span class="si-value si-status" :class="{ 'si-ok': work.status === 'active', 'si-hide': work.isHidden }">
                {{ work.isHidden ? '已隐藏' : (work.status === 'active' ? '正常' : (work.status || '未知')) }}
              </span>
            </div>
          </div>

          <!-- 作品信息 -->
          <div class="side-card">
            <h4 class="side-title">作品数据</h4>
            <div class="si-grid">
              <div class="si-cell"><span class="si-num">{{ work.viewCount || 0 }}</span><span class="si-k">浏览</span></div>
              <div class="si-cell"><span class="si-num">{{ work.likeCount || 0 }}</span><span class="si-k">点赞</span></div>
              <div class="si-cell"><span class="si-num">{{ work.favCount || 0 }}</span><span class="si-k">收藏</span></div>
              <div class="si-cell"><span class="si-num">{{ work.commentCount || 0 }}</span><span class="si-k">评论</span></div>
              <div class="si-cell"><span class="si-num">{{ work.coinCount || 0 }}</span><span class="si-k">金币</span></div>
            </div>
          </div>

          <!-- 猜你喜欢 -->
          <div class="side-card">
            <h4 class="side-title">猜你喜欢</h4>
            <div v-if="recsLoading" class="side-recs-empty">加载中...</div>
            <div v-else-if="!recs.length" class="side-recs-empty">暂无推荐</div>
            <div v-else class="side-recs">
              <div
                v-for="r in recs"
                :key="r.id"
                class="side-rec"
                @click="openWork(r.id)"
              >
                <div class="side-rec-thumb">
                  <img v-if="r.thumbnail" :src="r.thumbnail" referrerpolicy="no-referrer" />
                  <Package v-else :size="22" />
                </div>
                <div class="side-rec-info">
                  <div class="side-rec-title">{{ r.title }}</div>
                  <div class="side-rec-sub">{{ r.authorNick || r.author }} · {{ r.likeCount || 0 }}赞</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft, X, Package, ShieldCheck, ThumbsUp, Star, Coins, ExternalLink,
  Eye, Download, Pencil, Trash2
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const work = ref(null);
const comments = ref([]);
const loading = ref(true);
const loggedIn = ref(false);
const isAdmin = ref(false);
const currentUser = ref(null);

const newComment = ref('');
const replyTo = ref(null);
const cmtLoading = ref(false);

const recs = ref([]);
const recsLoading = ref(false);

const isOwner = computed(() => loggedIn.value && work.value && work.value.author === currentUser.value?.username);

const PLAYER_BASE = 'https://pan2.pgrm.top/neko/keplayer/KittenN.html';

const isImgType = computed(() => work.value?.type === 'img');
const isRedirectType = computed(() => work.value?.type === 'redirect');

const playerFrameUrl = computed(() => {
  if (!work.value) return '';
  const p = work.value.player || {};
  const u = new URLSearchParams();
  if (p.f) u.set('f', p.f);
  if (p.u) u.set('u', p.u);
  if (p.auth) u.set('auth', String(p.auth));
  if (p.o !== undefined) u.set('o', String(p.o));
  if (p.v) u.set('v', p.v);
  if (p.auto !== undefined) u.set('auto', String(p.auto));
  return PLAYER_BASE + '?' + u.toString();
});

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
  if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function checkLogin() {
  try {
    const r = await fetch('/api/auth/state', { credentials: 'include' });
    const j = await r.json();
    loggedIn.value = !!j.loggedIn;
    currentUser.value = j.user || null;
    isAdmin.value = !!(j.user && (j.user.role === 'admin' || j.user.isOwner || j.user.tier !== 'user'));
  } catch { loggedIn.value = false; currentUser.value = null; }
}

async function loadWork() {
  loading.value = true;
  try {
    const r = await fetch(`/api/works/${route.params.id}`, { credentials: 'include' });
    const j = await r.json();
    if (j.ok) {
      work.value = j.work;
      comments.value = j.comments || [];
    } else {
      work.value = null;
    }
  } catch { work.value = null; }
  loading.value = false;
}

async function loadRecs() {
  recsLoading.value = true;
  try {
    const r = await fetch('/api/works?sort=hot&size=5');
    const j = await r.json();
    if (j.ok) {
      const mine = work.value?.id;
      recs.value = (j.items || []).filter(x => String(x.id) !== String(mine)).slice(0, 5);
    }
  } catch {}
  recsLoading.value = false;
}

async function doToggle(path) {
  try {
    const r = await fetch(path, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (j.ok && work.value) {
      if (j.liked !== undefined) { work.value.liked = j.liked; work.value.likeCount = j.likeCount ?? work.value.likeCount; }
      if (j.faved !== undefined) { work.value.faved = j.faved; work.value.favCount = j.favCount ?? work.value.favCount; }
      if (j.coined !== undefined) { work.value.coined = j.coined; work.value.coinCount = j.coinCount ?? work.value.coinCount; }
    }
  } catch {}
}
function toggleLike() { doToggle(`/api/works/${work.value.id}/like`); }
function toggleFav() { doToggle(`/api/works/${work.value.id}/fav`); }
function toggleCoin() { doToggle(`/api/works/${work.value.id}/coin`); }

async function toggleFollow() {
  if (!work.value) return;
  try {
    const r = await fetch(`/api/users/${work.value.author}/follow`, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (j.ok) work.value.following = !!j.following;
  } catch {}
}

function canDeleteComment(c) {
  if (!c || c.isDeleted) return false;
  if (isAdmin.value) return true;
  return loggedIn.value && currentUser.value && c.author === currentUser.value.username;
}

function startReply(c) {
  replyTo.value = { parentId: c.id, replyTo: c.author, replyToNick: c.authorNick };
  newComment.value = '';
  document.querySelector('.cc-form textarea')?.focus();
}

async function submitComment() {
  if (!newComment.value.trim()) return;
  cmtLoading.value = true;
  try {
    const body = { content: newComment.value.trim() };
    if (replyTo.value) { body.parentId = replyTo.value.parentId; body.replyTo = replyTo.value.replyTo; }
    const r = await fetch(`/api/works/${work.value.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(body)
    });
    const j = await r.json();
    if (j.ok) { newComment.value = ''; replyTo.value = null; loadWork(); }
  } catch {}
  cmtLoading.value = false;
}

async function deleteComment(id) {
  if (!confirm('确定删除这条评论？')) return;
  try {
    await fetch(`/api/works/comments/${id}/delete`, { method: 'POST', credentials: 'include' });
    loadWork();
  } catch {}
}

function goEdit() { router.push(`/workpool/publish/${work.value.id}`); }
function openWork(id) { router.push(`/work/${id}`); }

async function onDelete() {
  if (!confirm('确定删除这个作品？此操作不可恢复。')) return;
  try {
    const r = await fetch(`/api/works/${work.value.id}/delete`, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (j.ok) router.push('/workpool');
    else alert(j.msg || '删除失败');
  } catch {}
}

watch(() => route.params.id, () => { if (route.params.id) { loadWork(); loadRecs(); } });
onMounted(() => { checkLogin(); loadWork(); loadRecs(); });
</script>

<style scoped>
/* ===== Market 同款背景 ===== */
.work { min-height: 100vh; position: relative; color: #2c3e50; }
.bg-layer {
  position: absolute; inset: 0;
  background: url('/pic/bg.png') center/cover no-repeat fixed;
  z-index: 0;
}
.work > *:not(.bg-layer) { position: relative; z-index: 1; }

/* 顶栏 */
.top-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 24px; background: transparent;
}
.top-bar__back {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 20px; border: none;
  background: rgba(255,255,255,0.2);
  color: #fff; font-size: 13px; cursor: pointer;
  transition: background .15s;
}
.top-bar__back:hover { background: rgba(255,255,255,0.32); }
.top-bar__close { margin-left: auto; }
.top-bar__close {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.2);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.top-bar__close:hover { background: rgba(255,80,80,0.6); }

/* 主体 */
.page-body {
  max-width: 1200px; margin: 0 auto; padding: 8px 24px 48px;
}

.main-layout {
  display: flex; gap: 20px; align-items: flex-start;
}
.main-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.side-col {
  width: 280px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 14px;
  position: sticky; top: 70px;
}

/* === 播放器 === */
.player-card {
  background: rgba(255,255,255,.96);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 6px 32px rgba(0,0,0,.3);
}
.player-wrap {
  aspect-ratio: 16/9;
  background: #000;
  display: flex; align-items: center; justify-content: center;
}
.player-iframe { width: 100%; height: 100%; border: 0; background: #000; }
.player-img-wrap { background: #1a1a1a; } .player-img { width: 100%; height: 100%; object-fit: contain; }
.player-redirect-wrap {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.redirect-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #48c774, #17a2b8);
  color: #fff; text-decoration: none;
  border-radius: 24px; font-size: 15px; font-weight: 600;
  transition: transform .12s;
}
.redirect-btn:hover { transform: translateY(-2px); }

/* === 标题+作者 === */
.head-card {
  background: rgba(255,255,255,.96);
  border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 6px 32px rgba(0,0,0,.3);
}
.dc-title { font-size: 22px; margin: 0 0 10px; color: #2c3e50; }
.dc-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.dc-tag {
  font-size: 12px; color: #17a2b8;
  background: rgba(23,162,184,.12);
  padding: 3px 10px; border-radius: 10px;
}
.dc-author {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(0,0,0,.05);
}
.dc-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: #ddd; }
.dc-avatar-fallback { display: flex; align-items: center; justify-content: center; font-weight: 600; color: #7f8c8d; background: #ecf0f1; }
.dc-author-text { flex: 1; min-width: 0; }
.dc-author-name { font-size: 15px; font-weight: 600; color: #2c3e50; display: flex; align-items: center; gap: 4px; }
.dc-author-name .verified { color: #17a2b8; }
.dc-author-sub { font-size: 12px; color: #7f8c8d; margin-top: 2px; }
.dc-follow {
  padding: 6px 18px; border-radius: 16px; border: none;
  background: #17a2b8; color: #fff; font-size: 12px; cursor: pointer;
  transition: background .15s;
}
.dc-follow:hover { background: #138496; }
.dc-follow.followed { background: #95a5a6; }

/* 操作栏 */
.dc-actions {
  display: flex; align-items: center; gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,.05);
}
.dc-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 16px; border-radius: 16px; border: 1px solid rgba(0,0,0,.08);
  background: #fff; color: #7f8c8d; font-size: 13px; cursor: pointer;
  transition: all .15s;
}
.dc-btn:hover { color: #2c3e50; border-color: rgba(0,0,0,.2); }
.dc-btn.active {
  color: #fff; border-color: transparent;
  background: linear-gradient(135deg, #48c774, #17a2b8);
}
.dc-btn span { margin-left: 2px; }
.dc-stats { margin-left: auto; display: flex; gap: 14px; color: #95a5a6; font-size: 13px; }
.dc-stats span { display: inline-flex; align-items: center; gap: 4px; }

/* === 简介 === */
.desc-card {
  background: rgba(255,255,255,.96);
  border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 6px 32px rgba(0,0,0,.3);
}
.desc-card h3 { font-size: 14px; color: #7f8c8d; margin: 0 0 10px; font-weight: 600; }
.desc-body { font-size: 14px; line-height: 1.7; color: #2c3e50; white-space: pre-wrap; }

.file-row {
  display: flex; align-items: center; gap: 12px;
  margin-top: 16px; padding-top: 14px;
  border-top: 1px solid rgba(0,0,0,.06);
}
.file-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px;
  background: linear-gradient(135deg, #48c774, #17a2b8);
  color: #fff; text-decoration: none;
  border-radius: 18px; font-size: 13px; font-weight: 600;
  transition: transform .12s;
}
.file-btn:hover { transform: translateY(-1px); }
.file-meta { font-size: 12px; color: #95a5a6; word-break: break-all; }

/* 管理卡 */
.manage-card { display: flex; gap: 8px; }
.mg-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.15);
  color: #fff; font-size: 12px; cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all .15s;
}
.mg-btn:hover { background: rgba(255,255,255,.28); }
.mg-del:hover { background: rgba(220,80,80,.7); border-color: rgba(220,80,80,.8); }

/* === 右侧栏卡片 === */
.side-card {
  background: rgba(255,255,255,.96);
  border-radius: 14px; padding: 16px 18px;
  box-shadow: 0 4px 18px rgba(0,0,0,.28);
}
.side-title {
  font-size: 14px; font-weight: 700; color: #2c3e50;
  margin: 0 0 12px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,.06);
}
.side-item {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; padding: 5px 0;
}
.si-label { color: #7f8c8d; }
.si-value { color: #2c3e50; font-weight: 500; }
.si-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.si-status.si-ok { background: rgba(72,199,116,.15); color: #1e8e51; }
.si-status.si-hide { background: rgba(231,76,60,.15); color: #c0392b; }

.si-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.si-cell {
  text-align: center; padding: 10px 4px;
  background: rgba(23,162,184,.08); border-radius: 10px;
}
.si-num { display: block; font-size: 16px; font-weight: 700; color: #2c3e50; line-height: 1.2; }
.si-k { display: block; font-size: 11px; color: #7f8c8d; margin-top: 2px; }

.side-recs-empty { text-align: center; color: #95a5a6; font-size: 12px; padding: 16px 0; }
.side-recs { display: flex; flex-direction: column; gap: 10px; }
.side-rec {
  display: flex; gap: 10px; padding: 8px;
  border-radius: 10px; cursor: pointer;
  transition: background .12s;
}
.side-rec:hover { background: rgba(23,162,184,.08); }
.side-rec-thumb {
  width: 56px; height: 42px; border-radius: 6px;
  background: #1a1a1a; overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #555;
}
.side-rec-thumb img { width: 100%; height: 100%; object-fit: cover; }
.side-rec-info { flex: 1; min-width: 0; }
.side-rec-title {
  font-size: 13px; font-weight: 600; color: #2c3e50;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.side-rec-sub { font-size: 11px; color: #95a5a6; margin-top: 3px; }

/* === 评论卡 === */
.comment-card {
  background: rgba(255,255,255,.96);
  border-radius: 16px;
  box-shadow: 0 6px 32px rgba(0,0,0,.3);
  padding: 20px 24px;
}
.cc-head { margin-bottom: 14px; }
.cc-head h3 { margin: 0; font-size: 16px; color: #2c3e50; }
.cc-count { color: #95a5a6; font-weight: 400; font-size: 14px; }
.cc-login { text-align: center; color: #7f8c8d; padding: 14px; font-size: 13px; background: #f8f9fa; border-radius: 8px; }
.cc-form { margin-bottom: 20px; }
.cc-form textarea {
  width: 100%; resize: vertical;
  padding: 10px 14px; border: 1px solid rgba(0,0,0,.1); border-radius: 10px;
  font-size: 14px; font-family: inherit;
  background: #fafafa; color: #2c3e50;
  outline: none; transition: border-color .15s, background .15s;
}
.cc-form textarea:focus { border-color: #17a2b8; background: #fff; }
.cc-form-actions { margin-top: 8px; text-align: right; }
.cc-submit {
  padding: 8px 22px; background: linear-gradient(135deg, #48c774, #17a2b8);
  color: #fff; border: none; border-radius: 18px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform .12s, opacity .15s;
}
.cc-submit:hover:not(:disabled) { transform: translateY(-1px); }
.cc-submit:disabled { opacity: .5; cursor: not-allowed; }
.cc-empty { text-align: center; color: #95a5a6; padding: 30px 0; font-size: 13px; }

.cc-list { display: flex; flex-direction: column; gap: 14px; }
.cmt-item { display: flex; gap: 10px; }
.cmt-item.deleted { opacity: .5; }
.cmt-item-child .cmt-main { background: #f8f9fa; padding: 10px 12px; border-radius: 8px; }

.cmt-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #ddd; }
.cmt-avatar-fallback { display: flex; align-items: center; justify-content: center; font-weight: 600; color: #7f8c8d; background: #ecf0f1; font-size: 13px; }
.cmt-main { flex: 1; min-width: 0; }
.cmt-head { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #95a5a6; margin-bottom: 4px; }
.cmt-name { color: #2c3e50; font-weight: 600; font-size: 13px; }
.cmt-verified { color: #17a2b8; }
.cmt-time { margin-left: 4px; }
.cmt-pin { padding: 1px 8px; background: #fff3cd; color: #856404; border: none; border-radius: 8px; font-size: 11px; }
.cmt-del { margin-left: auto; padding: 2px; background: none; border: none; color: #bbb; cursor: pointer; display: flex; }
.cmt-del:hover { color: #e74c3c; }
.cmt-body { font-size: 14px; color: #2c3e50; line-height: 1.6; word-break: break-word; }
.cmt-reply-to { color: #17a2b8; margin-right: 2px; }
.cmt-reply-btn { margin-top: 6px; padding: 2px 8px; background: none; border: none; color: #7f8c8d; font-size: 11px; cursor: pointer; }
.cmt-reply-btn:hover { color: #17a2b8; }
.cmt-children { margin-top: 10px; padding-left: 4px; display: flex; flex-direction: column; gap: 10px; }

/* Skeleton */
.skeleton-wrap { display: flex; gap: 20px; }
.sk-main { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.sk-side { width: 280px; display: flex; flex-direction: column; gap: 14px; }
.sk-side-card { background: rgba(255,255,255,.96); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.sk-player { aspect-ratio: 16/9; background: #ddd; border-radius: 14px; animation: shimmer 1.2s infinite linear; }
.sk-line { height: 12px; background: #e0e0e0; border-radius: 4px; animation: shimmer 1.2s infinite linear; }
@keyframes shimmer { 0% { background-color: #ddd; } 50% { background-color: #eee; } 100% { background-color: #ddd; } }

.empty { text-align: center; padding: 80px 0; color: rgba(255,255,255,.7); text-shadow: 0 2px 6px rgba(0,0,0,.5); }
.empty p { margin-top: 12px; }

/* 响应式 */
@media (max-width: 1000px) {
  .main-layout { flex-direction: column; }
  .side-col { width: 100%; position: static; flex-direction: row; flex-wrap: wrap; }
  .side-card { flex: 1; min-width: 200px; }
}
@media (max-width: 600px) {
  .side-col { flex-direction: column; }
  .dc-title { font-size: 18px; }
}
</style>
