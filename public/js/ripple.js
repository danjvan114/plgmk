(function () {
  var IS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window;
  var SUPPORT_POINTER = typeof window !== 'undefined' && 'PointerEvent' in window;
  var boundEls = new WeakSet();

  var WAVE_OUT_MS = 700;      // 与 CSS .mdui-ripple-wave-out(.6s) 对齐
  var WAVE_MAX_LIFE = 10000;  // 兜底：无论发生什么，波纹最多存在这么久就一定从 DOM 消失
  var KEY_HOLD_MS = 500;      // 键盘（Enter/Space）触发的波纹最长保持时间

  function matchesClass(el) {
    return el && el.nodeType === 1 && el.classList && el.classList.contains('mdui-ripple');
  }

  function createWave(el, x, y) {
    var rect = el.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    var size = Math.max(Math.sqrt(w * w + h * h), 48);
    var u = x - rect.left;
    var v = y - rect.top;

    var wave = document.createElement('div');
    wave.className = 'mdui-ripple-wave';
    wave.style.width = size + 'px';
    wave.style.height = size + 'px';
    wave.style.marginTop = -size / 2 + 'px';
    wave.style.marginLeft = -size / 2 + 'px';
    wave.style.left = u + 'px';
    wave.style.top = v + 'px';

    el.insertBefore(wave, el.firstChild);

    // 兜底：即便所有释放事件都丢了（页面切走、元素被重绘、异常中断），
    // 也绝不会把 .mdui-ripple-wave 永久留在 DOM 里
    setTimeout(function () {
      if (wave.parentNode) wave.parentNode.removeChild(wave);
    }, WAVE_MAX_LIFE);

    var dx = w / 2 - u;
    var dy = h / 2 - v;

    requestAnimationFrame(function () {
      wave.style.transition =
        'transform .55s cubic-bezier(.4,0,.2,1), opacity .55s linear';
      wave.style.transform =
        'translate3d(' + dx + 'px,' + dy + 'px,0) scale(1)';
      wave.classList.add('mdui-ripple-wave-fill');
    });

    return wave;
  }

  function removeWaves(el, keep) {
    var waves = el.querySelectorAll('.mdui-ripple-wave');
    for (var i = 0; i < waves.length; i++) {
      var wave = waves[i];
      if (keep && wave === keep) continue;
      wave.classList.remove('mdui-ripple-wave-fill');
      wave.classList.add('mdui-ripple-wave-out');
      (function (node) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, WAVE_OUT_MS);
      })(wave);
    }
  }

  // 松手 / 离开 / 取消：连当前这一次在内全部淡出。
  // 旧实现在这里把 el._rippleWave 当成 keep 传进去，等于"本次波纹不清理"，
  // 于是它会一直保持 .mdui-ripple-wave-fill(opacity:.35) 常驻 —— 这就是残留 bug 的根因。
  function release(el) {
    if (el._rippleKeyTimer) { clearTimeout(el._rippleKeyTimer); el._rippleKeyTimer = null; }
    removeWaves(el);
    el._rippleWave = null;
  }

  // 按下后拖到元素外面才松手时，元素自身收不到 pointerup/mouseup，
  // 所以在 document 上兜一层，保证在任意位置松手都能把波纹收掉
  function watchEnd(el, endType, cancelType) {
    var done = false;
    function end() {
      if (done) return;
      done = true;
      document.removeEventListener(endType, end, true);
      if (cancelType) document.removeEventListener(cancelType, end, true);
      window.removeEventListener('blur', end);
      release(el);
    }
    document.addEventListener(endType, end, true);
    if (cancelType) document.addEventListener(cancelType, end, true);
    window.addEventListener('blur', end);
  }

  function startFromPoint(el, e) {
    var point = null;
    if (e.touches && e.touches.length) point = e.touches[0];
    else point = e;
    if (!point || typeof point.clientX !== 'number') return;
    var wave = createWave(el, point.clientX, point.clientY);
    el._rippleWave = wave;
    removeWaves(el, wave); // 顺手清掉上一次交互可能遗留的波纹
  }

  function bind(el) {
    if (boundEls.has(el)) return;
    boundEls.add(el);

    if (SUPPORT_POINTER) {
      el.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        startFromPoint(el, e);
        watchEnd(el, 'pointerup', 'pointercancel');
      });
      el.addEventListener('pointerup', function () { release(el); });
      el.addEventListener('pointercancel', function () { release(el); });
      // 注意：pointerleave 不释放 —— 按住不放时（哪怕拖到元素外）波纹应当保持，
      // 只有真正松手才收，收的动作由 watchEnd 在 document 上兜住
    } else {
      el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startFromPoint(el, e);
        watchEnd(el, 'mouseup');
      });
      if (IS_TOUCH) {
        el.addEventListener('touchstart', function (e) {
          startFromPoint(el, e);
          watchEnd(el, 'touchend', 'touchcancel');
        });
        el.addEventListener('touchend', function () { release(el); });
        el.addEventListener('touchcancel', function () { release(el); });
      }
      el.addEventListener('mouseup', function () { release(el); });
      // 同上：mouseleave 不释放，交给 watchEnd
    }

    // 键盘触发的波纹以前创建完就没人管，同样会永久残留
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var rect = el.getBoundingClientRect();
        var wave = createWave(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
        el._rippleWave = wave;
        removeWaves(el, wave);
        clearTimeout(el._rippleKeyTimer);
        el._rippleKeyTimer = setTimeout(function () { release(el); }, KEY_HOLD_MS);
      }
    });
    el.addEventListener('keyup', function (e) {
      if (e.key === 'Enter' || e.key === ' ') release(el);
    });
    el.addEventListener('blur', function () { release(el); });
  }

  function scan(root) {
    var node = root || document;
    if (node.nodeType === 1 && matchesClass(node)) bind(node);
    var list = node.querySelectorAll ? node.querySelectorAll('.mdui-ripple') : [];
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      scan(document);
    });
  } else {
    scan(document);
  }

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var node = m.addedNodes[j];
          if (node.nodeType === 1) {
            scan(node);
            var parent = node.parentElement;
            if (parent && matchesClass(parent) && !boundEls.has(parent)) bind(parent);
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 强制清场：立即移除 root 下所有波纹（跳过淡出），用于路由切换 / 顶栏重绘等场景
  function clearWaves(root) {
    var scope = root || document;
    var list = scope.querySelectorAll ? scope.querySelectorAll('.mdui-ripple-wave') : [];
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (w.parentNode) w.parentNode.removeChild(w);
    }
  }

  window.MDURipple = { scan: scan, release: release, clear: clearWaves };
})();
