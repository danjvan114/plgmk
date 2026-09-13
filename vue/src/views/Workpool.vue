<template>
  <div class="workpool">
    <div class="bg-layer"></div>

    <header class="top-bar">
      <div class="top-bar__search">
        <Search :size="18" class="icon" />
        <input v-model="kw" type="text" placeholder="搜索作品、作者、关键词..." />
      </div>
      <button class="top-bar__publish" @click="goPublish"><Upload :size="16" /> 发布作品</button>
      <button class="top-bar__close" @click="$router.back()"><X :size="22" /></button>
    </header>

    <div class="body">
      <nav class="side-nav">
        <div
          class="side-nav__item"
          :class="{ 'is-active': activeTag === null }"
          @click="selectTag(null)"
        >
          <div v-if="activeTag === null" class="side-nav__bg"></div>
          <LayoutGrid :size="20" />
          <span>全部作品</span>
          <em v-if="total" class="side-nav__count">{{ total }}</em>
        </div>
        <div
          v-for="t in tags"
          :key="t.name"
          class="side-nav__item"
          :class="{ 'is-active': activeTag === t.name }"
          @click="selectTag(t.name)"
        >
          <div v-if="activeTag === t.name" class="side-nav__bg"></div>
          <Hash :size="20" />
          <span>{{ t.name }}</span>
          <em v-if="t.count" class="side-nav__count">{{ t.count }}</em>
        </div>
      </nav>

      <main class="main">
        <section class="section">
          <div class="section-head">
            <h3>{{ activeTag || '全部作品' }}</h3>
            <div class="section-sorts">
              <button
                v-for="s in sortOptions"
                :key="s.value"
                class="sort-btn"
                :class="{ 'is-active': sort === s.value }"
                @click="setSort(s.value)"
              >{{ s.label }}</button>
            </div>
          </div>

          <div v-if="loading" class="cards">
            <div v-for="i in 8" :key="i" class="skeleton-card">
              <div class="skeleton-cover"></div>
              <div class="skeleton-line" style="width:70%"></div>
              <div class="skeleton-line" style="width:40%"></div>
            </div>
          </div>

          <div v-else-if="!items.length" class="empty">
            <Package :size="40" />
            <p>还没有作品，来发布第一个吧～</p>
          </div>

          <div v-else class="cards">
            <div
              v-for="w in items"
              :key="w.id"
              class="card"
              @click="openWork(w.id)"
            >
              <div class="card__cover">
                <img v-if="w.thumbnail" :src="w.thumbnail" :alt="w.title" referrerpolicy="no-referrer" />
                <div v-else class="card__cover-fallback"><Package :size="48" /></div>
                <span v-if="w.type" class="card__type">{{ w.type }}</span>
              </div>
              <div class="card__body">
                <h4>{{ w.title }}</h4>
                <span class="tag" v-if="w.tags && w.tags[0]">{{ w.tags[0] }}</span>
                <span class="author">by {{ w.authorNick || w.author }}</span>
                <div class="card__stats">
                  <span><Eye :size="13" /> {{ w.viewCount || 0 }}</span>
                  <span><ThumbsUp :size="13" /> {{ w.likeCount || 0 }}</span>
                  <span><Star :size="13" /> {{ w.favCount || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="hasMore" class="load-more">
            <button @click="loadMore" :disabled="loading">{{ loading ? '加载中...' : '加载更多' }}</button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, X, Upload, LayoutGrid, Hash, Package, Eye, ThumbsUp, Star } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const kw = ref('');
const tags = ref([]);
const items = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 12;
const total = ref(0);
const activeTag = ref(null);
const sort = ref('newest');

const sortOptions = [
  { label: '最新', value: 'newest' },
  { label: '最热', value: 'hot' },
  { label: '点赞', value: 'likes' },
  { label: '收藏', value: 'favs' }
];

const hasMore = computed(() => items.value.length < total.value);

async function loadTags() {
  try {
    const r = await fetch('/api/works/tags');
    const j = await r.json();
    if (j.ok) tags.value = j.tags || [];
  } catch {}
}

function buildQuery() {
  const q = new URLSearchParams();
  q.set('sort', sort.value);
  q.set('size', pageSize);
  q.set('page', page.value);
  if (kw.value.trim()) q.set('keyword', kw.value.trim());
  if (activeTag.value) q.set('tag', activeTag.value);
  return q.toString();
}

async function refresh(resetPage = true) {
  if (resetPage) { page.value = 1; items.value = []; }
  loading.value = true;
  try {
    const r = await fetch(`/api/works?${buildQuery()}`);
    const j = await r.json();
    if (j.ok) {
      if (resetPage) items.value = j.items || [];
      else items.value = [...items.value, ...(j.items || [])];
      total.value = j.total || items.value.length;
    }
  } catch {}
  loading.value = false;
}

function loadMore() { refresh(false); }
function setSort(v) { if (sort.value !== v) { sort.value = v; refresh(); } }
function selectTag(t) { activeTag.value = activeTag.value === t ? null : t; refresh(); }
function goPublish() { router.push('/workpool/publish'); }
function openWork(id) { router.push(`/work/${id}`); }

watch(() => route.query.keyword, (v) => { if (v) { kw.value = v; refresh(); } });

let debounceTimer = null;
watch(kw, (v) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => refresh(), 400);
});

onMounted(() => { loadTags(); refresh(); });
</script>

<style scoped>
/* ===== 和 Market.vue 同款 ===== */
.workpool { min-height: 100vh; position: relative; color: #2c3e50; }
.bg-layer {
  position: absolute; inset: 0;
  background: url('/pic/bg.png') center/cover no-repeat fixed;
  z-index: 0;
}
.workpool > *:not(.bg-layer) { position: relative; z-index: 1; }

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
.top-bar__publish:active { transform: scale(.97); }
.top-bar__close { margin-left: auto; }
.top-bar__close {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: rgba(255,255,255,0.2);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.top-bar__close:hover { background: rgba(255,80,80,0.6); }

/* Body */
.body {
  display: flex; gap: 24px;
  padding: 8px 24px 40px;
  max-width: 1440px; margin: 0 auto;
}

/* Side nav */
.side-nav {
  width: 180px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
  position: sticky; top: 12px; height: fit-content;
  max-height: calc(100vh - 40px); overflow-y: auto;
}
.side-nav::-webkit-scrollbar { width: 4px; }
.side-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.3); border-radius: 2px; }
.side-nav__item {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  color: rgba(255,255,255,.85); cursor: pointer;
  border-radius: 10px;
  font-size: 14px;
  transition: background .15s;
}
.side-nav__item:hover { background: rgba(255,255,255,.15); }
.side-nav__bg {
  position: absolute; inset: 0;
  background: rgba(255,255,255,.22);
  border-radius: 10px; z-index: -1;
}
.side-nav__count { margin-left: auto; font-size: 11px; color: rgba(255,255,255,.6); font-style: normal; }

.main { flex: 1; min-width: 0; }

.section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.section-head h3 {
  font-size: 20px; font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0,0,0,.5);
}
.section-sorts { display: flex; gap: 6px; }
.sort-btn {
  padding: 6px 14px;
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 16px;
  color: #fff; font-size: 12px; cursor: pointer;
  transition: all .15s;
}
.sort-btn:hover { background: rgba(255,255,255,.25); }
.sort-btn.is-active {
  background: rgba(72,199,116,.85);
  border-color: transparent;
}

/* Card grid */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.card {
  background: rgba(255,255,255,.92);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,.25);
  cursor: pointer;
  transition: transform .18s, box-shadow .18s;
}
.card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,.35); }
.card__cover {
  position: relative;
  aspect-ratio: 16/10;
  background: #1a1a1a;
  overflow: hidden;
}
.card__cover img { width: 100%; height: 100%; object-fit: cover; }
.card__cover-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: #555; background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.card__type {
  position: absolute; top: 8px; left: 8px;
  padding: 2px 8px;
  background: rgba(0,0,0,.6);
  border-radius: 8px;
  font-size: 10px; color: #ddd;
  text-transform: uppercase; letter-spacing: .5px;
}
.card__body { padding: 12px 14px 14px; }
.card__body h4 {
  font-size: 14px; margin: 0 0 6px; font-weight: 600; color: #2c3e50;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card__body .tag {
  display: inline-block; font-size: 10px; color: #17a2b8;
  background: rgba(23,162,184,.12);
  padding: 2px 8px; border-radius: 10px; margin-right: 6px;
}
.card__body .author { font-size: 11px; color: #7f8c8d; }
.card__stats {
  display: flex; gap: 10px; margin-top: 8px;
  font-size: 11px; color: #95a5a6;
}
.card__stats span { display: inline-flex; align-items: center; gap: 2px; }

/* Skeleton */
.skeleton-card {
  background: rgba(255,255,255,.92);
  border-radius: 14px; overflow: hidden; padding: 12px;
}
.skeleton-cover {
  aspect-ratio: 16/10; background: #ddd; border-radius: 8px; margin-bottom: 10px;
  animation: shimmer 1.2s infinite linear;
}
.skeleton-line { height: 10px; background: #e0e0e0; border-radius: 4px; margin-bottom: 6px; animation: shimmer 1.2s infinite linear; }
@keyframes shimmer { 0% { background-color: #ddd; } 50% { background-color: #eee; } 100% { background-color: #ddd; } }

.empty { text-align: center; padding: 60px 0; color: rgba(255,255,255,.7); text-shadow: 0 2px 4px rgba(0,0,0,.4); }
.empty p { margin-top: 10px; font-size: 14px; }

.load-more { text-align: center; margin-top: 20px; }
.load-more button {
  padding: 8px 28px;
  background: rgba(255,255,255,.2);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff; border-radius: 20px; cursor: pointer;
  font-size: 13px;
  transition: background .15s;
}
.load-more button:hover { background: rgba(255,255,255,.32); }
.load-more button:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 900px) {
  .body { flex-direction: column; padding: 12px; }
  .side-nav { width: 100%; flex-direction: row; overflow-x: auto; position: static; }
  .side-nav__item { flex-shrink: 0; }
  .cards { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
}
</style>
