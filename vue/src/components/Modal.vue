<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-mask" @click.self="close">
        <!-- 容器：用预合成的带标题画布当背景 -->
        <div
          class="modal-frame"
          :style="frameStyle"
        >
          <!-- 关闭按钮（右上角） -->
          <button v-if="closable" class="modal-close" @click="close">
            <X :size="20" />
          </button>

          <!-- 内部内容区（透明，让画布中间白色直接露） -->
          <div class="modal-content">
            <div class="modal-body">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  visible:    { type: Boolean, default: false },
  title:      { type: String,  default: '' },
  closable:   { type: Boolean, default: true },
  width:      { type: String,  default: '800px' },
  openSound:  { type: String,  default: '' },
  closeSound: { type: String,  default: '' }
});

const emit = defineEmits(['update:visible', 'close']);

// alt.png 原始尺寸
const IMG_W = 2048;
const IMG_H = 1151;
// 标题区域：左上角 (248, 68)，高度 87
const TITLE_X = 248;
const TITLE_Y = 68;
const TITLE_H = 87;

// 合成好的带标题 PNG（dataURL）
const frameBg = ref('');

// 缓存：同一个 title 只合成一次
const frameCache = new Map();

/**
 * 用 Canvas 把 alt.png + 标题文字 合成一张 PNG
 * 标题右上角锚定 (248, 68)，高度 87，文字在 [248 ~ IMG_W-TITLE_PAD] 横向排列
 */
async function composeFrame(title) {
  if (!title) return '';
  if (frameCache.has(title)) return frameCache.get(title);

  const canvas = document.createElement('canvas');
  canvas.width = IMG_W;
  canvas.height = IMG_H;
  const ctx = canvas.getContext('2d');

  // 1) 画 alt.png
  await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { ctx.drawImage(img, 0, 0, IMG_W, IMG_H); resolve(); };
    img.onerror = () => resolve();  // 图没加载也继续画文字
    img.src = '/pic/alt.png';
  });

  // 2) 画标题文字
  // 尝试不同字号，找到能放进可用宽度内的最大号
  const TITLE_PAD_RIGHT = 200;  // 右边留白
  const availW = IMG_W - TITLE_X - TITLE_PAD_RIGHT;
  const minSize = 36, maxSize = 72;
  let fontSize = maxSize;
  ctx.textBaseline = 'top';
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif`;
  while (ctx.measureText(title).width > availW && fontSize > minSize) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif`;
  }

  const textY = TITLE_Y + (TITLE_H - fontSize) / 2;  // 垂直居中在标题区域
  // 黑色描边 + 白色填充
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(title, TITLE_X, textY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, TITLE_X, textY);

  // 导出 PNG
  const dataURL = canvas.toDataURL('image/png');
  frameCache.set(title, dataURL);
  return dataURL;
}

// visible 变成 true 时合成 + 播放音效
watch(() => [props.visible, props.title], async ([vis], [oldVis]) => {
  if (vis && props.title && !frameBg.value) {
    frameBg.value = await composeFrame(props.title);
  }
  // 从 false → true 时播放音效
  if (vis && !oldVis && props.openSound) playSound(props.openSound);
  if (!vis && oldVis && props.closeSound) playSound(props.closeSound);
});

// 音效播放器（复用 audio，支持快速切换）
let sfxAudio = null;
function playSound(src, volume = 0.5) {
  if (!sfxAudio) sfxAudio = new Audio();
  if (sfxAudio.src !== src) sfxAudio.src = src;
  sfxAudio.volume = volume;
  sfxAudio.currentTime = 0;
  sfxAudio.play().catch(() => {});  // 浏览器策略拦截时静默跳过
}

const frameStyle = computed(() => ({
  width: props.width,
  aspectRatio: `${IMG_W} / ${IMG_H}`,
  backgroundImage: frameBg.value
    ? `url(${frameBg.value})`
    : `url(/pic/alt.png)`,   // 没 title 时退回纯背景
  backgroundSize: '100% 100%',  // 和 canvas 合成图等大，直接 1:1 拉伸到容器（容器比例和源图一致，不会变形）
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}));

function close() {
  emit('update:visible', false);
  emit('close');
}

defineExpose({ close });
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
}

.modal-frame {
  position: relative;
  box-shadow: 0 12px 40px rgba(0,0,0,.5);
}

/* 内部透明内容区 */
.modal-content {
  position: absolute;
  top: calc(115 / 1151 * 100%);
  left: calc(30 / 2048 * 100%);
  right: calc(30 / 2048 * 100%);
  bottom: calc(30 / 1151 * 100%);
  background: transparent;
  overflow: hidden;
  box-sizing: border-box;
  padding: 4% 3% 3% 3%;
}

.modal-body {
  width: 100%;
  height: 100%;
  overflow: auto;
  color: #333;
  font-size: 14px;
}

.modal-close {
  position: absolute;
  top: calc(8 / 1151 * 100%);
  right: calc(12 / 2048 * 100%);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  color: #333;
  cursor: pointer;
  transition: background .15s, transform .15s;
  z-index: 5;
}
.modal-close:hover { background: rgba(255,255,255,0.6); transform: rotate(90deg); }
.modal-close:active { transform: rotate(90deg) scale(.9); }

.fade-enter-active,
.fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
