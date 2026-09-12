<template>
  <div class="start-page">
    <!-- 1. 初始状态：纯黑底 + loading 圈 -->
    <div v-if="!ready" class="boot">
      <img src="/loading.png" class="boot-spin" />
    </div>

    <!-- 2. 就绪后：视频背景 + 按钮 -->
    <template v-else>
      <video
        ref="videoEl"
        class="bg-video"
        src="/pic/bbg.mp4"
        autoplay
        muted
        loop
        playsinline
        disablepictureinpicture
        @contextmenu.prevent
      />
      <div class="overlay" />
      <div class="bottom-area">
        <div class="start-btn" @click="enter" @touchstart="enter">
          <span class="btn-text">开始探索</span>
        </div>

        <!-- 用户按钮（仅登录后显示） -->
        <div v-if="loggedIn" class="user-btn" @click="goUser" @touchstart="goUser">
          <img v-if="user?.avatar" :src="user.avatar" class="user-avatar" />
          <div v-else class="user-avatar user-avatar-fallback">
            {{ userNick?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <span class="user-name">{{ userNick }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const ready = ref(false);
const videoEl = ref(null);

const user = ref(null);
const authChecked = ref(false);
const loggedIn = ref(false);

const userNick = computed(() => {
  if (!user.value) return null;
  return user.value.nickname || user.value.username;
});

onMounted(async () => {
  // 全局禁止右键菜单
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 并行加载资源
  const tasks = [];

  tasks.push(new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'auto';
    v.src = '/pic/bbg.mp4';
    v.addEventListener('canplaythrough', resolve, { once: true });
    v.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 5000);
  }));

  tasks.push(new Promise((resolve) => {
    const a = document.createElement('audio');
    a.preload = 'auto';
    a.src = '/pic/C200000iw5uA39xaH4.m4a';
    a.addEventListener('loadeddata', resolve, { once: true });
    a.addEventListener('error', resolve, { once: true });
    setTimeout(resolve, 5000);
  }));

  tasks.push(new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = '/pic/btn.png';
  }));

  await Promise.all(tasks);
  setTimeout(() => {
    ready.value = true;
    // 视频最低倍速
    if (videoEl.value) {
      videoEl.value.playbackRate = 0.25;
      videoEl.value.addEventListener('ratechange', () => {
        if (videoEl.value.playbackRate !== 0.25) videoEl.value.playbackRate = 0.25;
      });
      videoEl.value.addEventListener('enterpictureinpicture', (e) => {
        e.preventDefault();
        videoEl.value.exitPictureInPicture?.();
      });
    }
    if (window.__kePlayBgm) window.__kePlayBgm();
  }, 300);

  // 并行拉取登录状态
  try {
    const res = await fetch('/api/auth/state', { credentials: 'include' });
    const data = await res.json();
    if (data.ok && data.loggedIn) {
      user.value = data.user;
      loggedIn.value = true;
    }
  } catch (e) {
    console.warn('[ke] auth state failed:', e.message);
  } finally {
    authChecked.value = true;
  }
});

async function enter() {
  if (loggedIn.value) {
    router.push('/main');
    return;
  }
  // 未登录 → 打开新窗口走 SSO
  try {
    const res = await fetch('/api/auth/login-url', { credentials: 'include' });
    const data = await res.json();
    if (data.ok && data.url) {
      window.open(data.url, '_blank', 'noopener');
    } else {
      window.open('/login/at', '_blank', 'noopener');
    }
  } catch {
    window.open('/login/at', '_blank', 'noopener');
  }
}

function goUser() {
  if (user.value) {
    router.push(`/u/${user.value.username}`);
  }
}
</script>

<style scoped>
.start-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #000;
}

.boot {
  position: absolute;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  animation: boot-fade .4s ease 2.6s forwards;
}
.boot-spin {
  width: 72px;
  height: 72px;
  animation: ke-spin 1.4s linear infinite;
}
@keyframes boot-fade { to { opacity: 0; visibility: hidden; } }
@keyframes ke-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  background: #000;
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: transparent;
}

.bottom-area {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  z-index: 2;
}

/* 主按钮 */
.start-btn {
  position: relative;
  width: 240px;
  height: 80px;
  background-image: url('/pic/btn.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .12s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.start-btn:active { transform: scale(.96); }

.btn-text {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  -webkit-text-stroke: 1.5px #000;
  text-shadow: 0 0 2px rgba(0,0,0,.9), 0 1px 2px rgba(0,0,0,.9);
  letter-spacing: 2px;
  pointer-events: none;
}

/* 用户按钮 */
.user-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 18px 8px 8px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 28px;
  cursor: default;
  transition: transform .12s ease, background .15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.user-btn:active { transform: scale(.96); background: rgba(255,255,255,.2); }

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,.5);
  flex-shrink: 0;
  background: #555;
}
.user-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.7);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
</style>
