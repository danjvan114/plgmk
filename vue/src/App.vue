<template>
  <div id="ke-app">
    <!-- 全局背景音乐（挂载在 App 根，跨页面持续播放） -->
    <audio
      ref="bgmEl"
      src="/pic/C200000iw5uA39xaH4.m4a"
      loop
      preload="auto"
    />

    <!-- 页面切换 loading -->
    <div v-if="loading" class="app-loading">
      <img src="/loading.png" alt="" class="app-loading-spin" />
    </div>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import router from './router/index.js';

const loading = ref(false);
const bgmEl = ref(null);
let loadingTimer = null;
let pendingCount = 0;
let bgmStarted = false;   // 标记音乐是否已成功触发过

// ===== 路由 loading =====
router.beforeEach(() => {
  pendingCount++;
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null; }
  loading.value = true;
});
router.afterEach(() => {
  pendingCount--;
  if (pendingCount < 0) pendingCount = 0;
  if (pendingCount === 0) {
    loadingTimer = setTimeout(() => { loading.value = false; }, 200);
  }
});

// ===== 背景音乐：页面就绪后自动尝试播放 =====
// 浏览器自动播放策略：有声音的媒体需要用户交互。
// 策略：加载完立即 play() → 被拦截则挂首次交互事件自动补播。
function tryPlayBgm() {
  if (!bgmEl.value || bgmStarted) return;
  bgmEl.value.volume = 0.5;
  bgmEl.value.play().then(() => {
    bgmStarted = true;
    // 成功后移除交互监听
    ['click', 'touchstart', 'keydown'].forEach(evt =>
      document.removeEventListener(evt, tryPlayBgm, { once: true })
    );
  }).catch(() => {
    // 被浏览器拦截 → 等用户首次任意交互自动播放
    if (!bgmStarted) {
      ['click', 'touchstart', 'keydown'].forEach(evt =>
        document.addEventListener(evt, tryPlayBgm, { once: true })
      );
    }
  });
}

// 对外暴露：Home.vue 资源就绪后调用
window.__kePlayBgm = tryPlayBgm;

onMounted(() => {
  // 兜底：最多等 10s 也尝试一次
  setTimeout(tryPlayBgm, 10000);

  // 页面失焦暂停音乐，恢复焦点继续
  document.addEventListener('visibilitychange', onVisChange);
  window.addEventListener('blur', onVisChange);
  window.addEventListener('focus', onVisChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisChange);
  window.removeEventListener('blur', onVisChange);
  window.removeEventListener('focus', onVisChange);
});

function onVisChange() {
  const el = bgmEl.value;
  if (!el || !bgmStarted) return;
  const hidden = document.hidden || !document.hasFocus();
  if (hidden) {
    if (!el.paused) el.pause();
  } else {
    if (el.paused) el.play().catch(() => {});
  }
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; cursor: default !important; }
html, body, #ke-app { width: 100%; height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

/* 页面切换 loading */
.app-loading {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.app-loading-spin {
  width: 72px;
  height: 72px;
  animation: ke-spin 1.4s linear infinite;
}
@keyframes ke-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* 页面切换淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity .18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
