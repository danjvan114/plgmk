(function () {
  var IS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window;
  var SUPPORT_POINTER = typeof window !== 'undefined' && 'PointerEvent' in window;
  var boundEls = new WeakSet();

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
        }, 700);
      })(wave);
    }
  }

  function startFromPoint(el, e) {
    var point = null;
    if (e.touches && e.touches.length) point = e.touches[0];
    else point = e;
    if (!point || typeof point.clientX !== 'number') return;
    var wave = createWave(el, point.clientX, point.clientY);
    el._rippleWave = wave;
  }

  function bind(el) {
    if (boundEls.has(el)) return;
    boundEls.add(el);

    if (SUPPORT_POINTER) {
      el.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        startFromPoint(el, e);
      });
      el.addEventListener('pointerup', function () {
        removeWaves(el, el._rippleWave);
      });
      el.addEventListener('pointerleave', function () {
        removeWaves(el, el._rippleWave);
      });
      el.addEventListener('pointercancel', function () {
        removeWaves(el);
      });
    } else {
      el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        startFromPoint(el, e);
      });
      if (IS_TOUCH) {
        el.addEventListener('touchstart', function (e) {
          startFromPoint(el, e);
        });
        el.addEventListener('touchend', function () {
          removeWaves(el, el._rippleWave);
        });
        el.addEventListener('touchcancel', function () {
          removeWaves(el);
        });
      }
      el.addEventListener('mouseup', function () {
        removeWaves(el, el._rippleWave);
      });
      el.addEventListener('mouseleave', function () {
        removeWaves(el, el._rippleWave);
      });
    }

    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var rect = el.getBoundingClientRect();
        createWave(el, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });
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

  window.MDURipple = { scan: scan };
})();
