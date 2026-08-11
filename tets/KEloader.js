// KE扩展加载器
//QQ群：593479399
//其他加载器：CUELoader 
(function () {
  'use strict';
  var TAG = 'KE';
  var env = (location.host || '').split('.')[0];
  try { if (window.BetterNemoVersion) env = 'bn'; } catch (e) {}
  if (env === 'kn' && location.pathname.indexOf('/player') === 0) env = 'kn';

  var webpackReq = null;
  var heart = null;
  var extMap = {};
  var EXT_PREFIX = 'ext_';

  // ==================== 工具 ====================
  function log() {
    var a = Array.prototype.slice.call(arguments);
    a.unshift('[' + TAG + ']');
    console.log.apply(console, a);
  }
  function warn() {
    var a = Array.prototype.slice.call(arguments);
    a.unshift('[' + TAG + ']');
    console.warn.apply(console, a);
  }
  function isObj(v) { return v !== null && typeof v === 'object'; }
  function darkenColor(hex, factor) {
    try {
      hex = String(hex || '#608FEE').replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
      var r = parseInt(hex.substr(0, 2), 16) || 0;
      var g = parseInt(hex.substr(2, 2), 16) || 0;
      var b = parseInt(hex.substr(4, 2), 16) || 0;
      factor = (typeof factor === 'number' && factor > 0 && factor < 1) ? factor : 0.6;
      r = Math.max(0, Math.min(255, Math.round(r * factor)));
      g = Math.max(0, Math.min(255, Math.round(g * factor)));
      b = Math.max(0, Math.min(255, Math.round(b * factor)));
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    } catch (e) { return hex || '#608FEE'; }
  }
  function applyBlockColors(g, c) {
    try {
      if (!g) return;
      var whiteFill = function (el) {
        el.style.setProperty('fill', '#FFFFFF', 'important');
        el.setAttribute('fill', '#FFFFFF');
      };
      var grayFill = function (el) {
        el.style.setProperty('fill', '#bdbdbd', 'important');
        el.setAttribute('fill', '#bdbdbd');
      };
      var paths = g.querySelectorAll('path');
      for (var i = 0; i < paths.length; i++) {
        var p = paths[i];
        var parent = p.parentElement, nestedBlock = false, nestedShadow = false, nestedInsertion = false;
        while (parent && parent !== g) {
          var cls = parent.getAttribute('class') || '';
          if (cls.indexOf('blocklyDraggable') >= 0) nestedBlock = true;
          if (cls.indexOf('blocklyInsertionMarker') >= 0) nestedInsertion = true;
          if (cls.indexOf('blocklyShadow') >= 0) nestedShadow = true;
          parent = parent.parentElement;
        }
        if (nestedInsertion) { grayFill(p); continue; }
        if (nestedBlock && !nestedShadow) continue;
        if (nestedShadow) { whiteFill(p); continue; }
        var cls = p.getAttribute('class') || '';
        var isBody = p.parentElement === g;
        var is3D = cls.indexOf('blocklyPathLight') >= 0 || cls.indexOf('blocklyPathDark') >= 0;
        var col = (isBody || is3D) ? c : '#FFFFFF';
        p.style.setProperty('fill', col, 'important');
        p.setAttribute('fill', col);
      }
      var frs = g.querySelectorAll('.blocklyFieldRect, rect.blocklyFieldRect, [class*="FieldRect"], [class*="DropdownRect"], .blocklyDropdownField, rect[class*="dropdown"]');
      for (var j = 0; j < frs.length; j++) {
        var r = frs[j];
        var parent = r.parentElement, nestedBlock = false, nestedShadow = false, nestedInsertion = false;
        while (parent && parent !== g) {
          var cls = parent.getAttribute('class') || '';
          if (cls.indexOf('blocklyDraggable') >= 0) nestedBlock = true;
          if (cls.indexOf('blocklyInsertionMarker') >= 0) nestedInsertion = true;
          if (cls.indexOf('blocklyShadow') >= 0) nestedShadow = true;
          parent = parent.parentElement;
        }
        if (nestedInsertion) { grayFill(r); continue; }
        if (nestedBlock && !nestedShadow) continue;
        whiteFill(r);
      }
    } catch (e) {}
  }
  function poll(cond, timeout) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function step() {
        var v;
        try { v = cond(); } catch (e) { v = null; }
        if (v) return resolve(v);
        if (timeout && Date.now() - t0 > timeout) return reject(null);
        requestAnimationFrame(step);
      })();
    });
  }
  function blockly() { return poll(function () { return window.Blockly; }, 60000); }
  function workspace() {
    return poll(function () { return window.Blockly && window.Blockly.mainWorkspace; }, 60000);
  }
  function el(selector, timeout) {
    return poll(function () { return document.querySelector(selector); }, timeout || 10000);
  }
  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  function xml(s) {
    try {
      var doc = new DOMParser().parseFromString(s, 'text/xml');
      if (!doc) return null;
      var node = doc.childNodes && doc.childNodes[0];
      if (!node) { warn('xml: empty parse result', s); return null; }
      if (String(node.nodeName).toLowerCase() === 'parsererror') { warn('xml: parse error', s); return null; }
      try {
        if (doc.getElementsByTagName && doc.getElementsByTagName('parsererror').length) {
          warn('xml: parse error (nested)', s);
          return null;
        }
      } catch (e) {}
      return node;
    } catch (e) { warn('xml: exception', e, s); return null; }
  }
  function pushXml(arr, s) {
    var n = xml(s);
    if (n) arr.push(n);
    return n;
  }
  function html(s) { return new DOMParser().parseFromString(s, 'text/html').childNodes[0]; }
  function styleAppend(css) {
    var node = document.getElementById(TAG + '-style');
    if (!node) {
      node = document.createElement('style');
      node.id = TAG + '-style';
      document.head.appendChild(node);
    }
    node.textContent += css;
  }
  function cookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function isPlayer() { return env.indexOf('-p') >= 0; }

  // ==================== Base64====================
  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64Encode(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      bytes.push(c < 128 ? c : (c < 2048 ? [192 | (c >> 6), 128 | (c & 63)] : [224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)]));
    }
    var flat = [];
    for (var j = 0; j < bytes.length; j++) {
      var b = bytes[j];
      if (typeof b === 'number') flat.push(b);
      else for (var k = 0; k < b.length; k++) flat.push(b[k]);
    }
    var out = '';
    for (var p = 0; p < flat.length; p += 3) {
      var n = (flat[p] << 16) | ((flat[p + 1] || 0) << 8) | (flat[p + 2] || 0);
      out += B64_CHARS[(n >> 18) & 63] + B64_CHARS[(n >> 12) & 63] +
        (p + 1 < flat.length ? B64_CHARS[(n >> 6) & 63] : '=') +
        (p + 2 < flat.length ? B64_CHARS[n & 63] : '=');
    }
    return out;
  }
  function b64Decode(str) {
    str = str.replace(/[^A-Za-z0-9+/=]/g, '');
    var out = '';
    for (var i = 0; i < str.length; i += 4) {
      var n = (B64_CHARS.indexOf(str[i]) << 18) |
        (B64_CHARS.indexOf(str[i + 1]) << 12) |
        ((B64_CHARS.indexOf(str[i + 2]) || 0) << 6) |
        (B64_CHARS.indexOf(str[i + 3]) || 0);
      out += String.fromCharCode((n >> 16) & 255, (n >> 8) & 255, n & 255);
    }
    return out.replace(/\0+$/, '');
  }

  // ==================== 颜色 ====================
  function hexRgb(h) {
    h = String(h || '').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(h) && !/^[0-9a-fA-F]{3}$/.test(h)) return null;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbHex(c) {
    function t(v) {
      v = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return v.length === 1 ? '0' + v : v;
    }
    return '#' + t(c.r) + t(c.g) + t(c.b);
  }
  function shade(hex, pct) {
    var c = hexRgb(hex);
    if (!c) return hex;
    var f = 1 - (pct || 20) / 100;
    return rgbHex({ r: c.r * f, g: c.g * f, b: c.b * f });
  }
  function themeColor(Blockly, hex) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
    try {
      var key = 'KE_' + hex.slice(1);
      Blockly.theme.block_color[key] = { fill: hex, border: shade(hex, 25), layer: shade(hex, 30) };
      return '%{BKY_' + key + '}';
    } catch (e) { return hex; }
  }

  // ==================== 运行时捕获 ====================
  function grabRequire() {
    try {
      if (!window.webpackChunkneko || typeof window.webpackChunkneko.push !== 'function') return;
      window.webpackChunkneko.push([[6729], {
        6729: function (m, e, r) { webpackReq = r; }
      }]);
    } catch (e) {}
  }
  function grabHeart() {
    return poll(function () { return webpackReq; }, 60000).then(function (req) {
      try {
        var c = req.c || {};
        var ids = Object.keys(c);
        for (var i = 0; i < ids.length; i++) {
          var entry = c[ids[i]];
          var ex = entry && entry.exports;
          var picks = [ex, ex && ex.default, ex && ex.i, ex && ex.a];
          for (var k = 0; k < picks.length; k++) {
            var p = picks[k];
            if (isObj(p) && typeof p.get_heart === 'function') {
              (function go() {
                try { heart = p.get_heart(); } catch (e) {}
                if (!heart) requestAnimationFrame(go);
              })();
              return;
            }
          }
        }
        var m = req.m || {};
        var mids = Object.keys(m);
        for (var j = 0; j < mids.length; j++) {
          try {
            var mod = req(mids[j]);
            for (var key in mod) {
              var inst = mod[key] && mod[key].instance;
              if (inst && inst.heart && inst.heart.core) {
                heart = inst.heart.core;
                return;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    });
  }

  // ==================== 积木注册 ====================
  var _keBlockColors = {};
  var _keColorMap = {};
  function buildBlockDef(d, ext) {
    var def = {};
    var k;
    for (k in d) {
      if (k === 'type' || k === 'function') continue;
      def[k] = d[k];
    }
    def.type = EXT_PREFIX + ext.type + '_' + d.type;
    def.message0 = def.message0 || '';
    var gm = ext._groupMap && ext._groupMap[d.type];
    var isEvent = (gm && gm.isEvent) || d._keIsEvent;
    var rawColor = d.color || def.color || d.colour || def.colour || (ext && ext.color) || (isEvent ? '#FFAB2E' : '#608FEE');
    var color = String(rawColor).charAt(0) === '#' ? rawColor : '#' + rawColor;
    var ckey = 'KE_' + color.replace('#', '');
    def.colour = ckey;
    def.colourPrimary = ckey;
    def.color = ckey;
    _keBlockColors[def.type] = color;
    _keColorMap[ckey] = { fill: color, border: shade(color, 25), layer: shade(color, 30) };
    if (!def.output && !def.previousStatement && !def.nextStatement) {
      def.previousStatement = null;
      def.nextStatement = null;
    }
    return def;
  }

  // ==================== 扩展积木上色====================
  var _keThemePatched = false;
  function kePatchThemeColor() {
    try {
      var B = window.Blockly;
      if (!B) return;
      var themes = [];
      if (B.Theme && B.Theme.prototype && typeof B.Theme.prototype.get_color === 'function') themes.push(B.Theme.prototype);
      var ws = (B.mainWorkspace) || (B.getMainWorkspace && B.getMainWorkspace());
      var cand = [ws];
      try { if (ws && ws.getFlyout && ws.getFlyout()) { var fw = ws.getFlyout().getWorkspace && ws.getFlyout().getWorkspace(); if (fw) cand.push(fw); } } catch (e) {}
      cand.forEach(function (w) {
        if (!w || !w.getTheme) return;
        try { var th = w.getTheme(); if (th) themes.push(th); } catch (e) {}
      });
      if (!themes.length) return;
      var keys = Object.keys(_keColorMap);
      if (!keys.length) return;
      themes.forEach(function (th) {
        try {
          if (th.block_color) { for (var i = 0; i < keys.length; i++) th.block_color[keys[i]] = _keColorMap[keys[i]]; }
        } catch (e) {}
        try {
          if (th.get_color && !th.get_color.__kePatched) {
            var orig = th.get_color;
            th.get_color = function (t) {
              if (typeof t === 'string' && t.indexOf('KE_') === 0 && _keColorMap[t]) return _keColorMap[t];
              return orig.call(this, t);
            };
            th.get_color.__kePatched = true;
          }
        } catch (e) {}
      });
      _keThemePatched = true;
    } catch (e) {}
  }

  // ==================== 运行时函数注册====================
  function keRegistry() {
    try {
      if (heart && typeof heart.get_registry === 'function') return heart.get_registry();
      if (heart && heart.registry) return heart.registry;
    } catch (e) {}
    return null;
  }
  function keBasicBlocks() {
    try { if (heart && heart.core && heart.core.basic_blocks) return heart.core.basic_blocks(); } catch (e) {}
    try { if (heart && heart.basic_blocks) return heart.basic_blocks(); } catch (e) {}
    return null;
  }
  function keRegisterFn(type, fn) {
    if (!fn || typeof fn !== 'function') return false;
    try {
      var reg = keRegistry();
      if (!reg || typeof reg.register !== 'function') return false;
      var wrapper = function () { return fn.apply(null, arguments); };
      try {
        reg.register({ namespace: '', id: type, domain_function: wrapper, metadata: { client_annotation: { id: type } } });
      } catch (e) {
        reg.register({ namespace: '', id: type, domain_function: wrapper });
      }
      return true;
    } catch (e) { return false; }
  }
  function keSyncAllFns() {
    try {
      var keys = Object.keys(extMap);
      for (var i = 0; i < keys.length; i++) {
        var ext = extMap[keys[i]];
        if (!ext) continue;
        var list = (ext.methods || []).concat(ext.blocks || []);
        for (var j = 0; j < list.length; j++) {
          var d = list[j];
          if (d && d.function) keRegisterFn(EXT_PREFIX + ext.type + '_' + d.type, d.function);
        }
      }
    } catch (e) {}
  }
  function keInitRuntimeBridge() {
    try {
      var bb = keBasicBlocks();
      if (bb && typeof bb.load_domain_functions === 'function' && !bb.load_domain_functions.__kePatched) {
        var orig = bb.load_domain_functions;
        bb.load_domain_functions = function () {
          var r = orig.apply(this, arguments);
          keSyncAllFns();
          return r;
        };
        bb.load_domain_functions.__kePatched = true;
      }
    } catch (e) {}
    try {
      if (heart && heart.runtime_data) {
        var last = heart.runtime_data.run_status;
        if (!keInitRuntimeBridge.__watching) {
          keInitRuntimeBridge.__watching = true;
          setInterval(function () {
            try {
              var cur = heart.runtime_data.run_status;
              if (cur !== last) { last = cur; keSyncAllFns(); }
            } catch (e2) {}
          }, 200);
        }
        return;
      }
    } catch (e) {}
    setTimeout(keInitRuntimeBridge, 500);
  }

  function registerMethods(ext) {
    var B = window.Blockly;
    if (!B || !B.Blocks) return;
    kePatchThemeColor();
    var list = (ext.methods || []).concat(ext.blocks || []);
    var okCount = 0;
    for (var i = 0; i < list.length; i++) {
      try {
        (function (d) {
          var def = buildBlockDef(d, ext);
          var type = def.type;
          var blockColor = def.colour;
          if (!keRegisterFn(type, d.function)) {
            (function (t, f) { setTimeout(function () { keRegisterFn(t, f); }, 1000); })(type, d.function);
          }
          B.Blocks[type] = {
            init: function () {
              try { this.jsonInit(def); }
              catch (e) {
                warn('block init failed, fallback to plain def', type, e);
                var safe = {};
                for (var k in def) { if (k !== 'extensions') safe[k] = def[k]; }
                this.jsonInit(safe);
              }
              var c = blockColor;
              try {
                var origInitSvg = this.initSvg;
                if (origInitSvg && !origInitSvg.__keTinted) {
                  this.initSvg = function () {
                    var r = origInitSvg.apply(this, arguments);
                    var self = this;
                    var applyFill = function () {
                      try {
                        if (!self.svgGroup_) return;
                        var g = self.svgGroup_;
                        applyBlockColors(g, c);
                      } catch (e) {}
                    };
                    applyFill();
                    setTimeout(applyFill, 60);
                    setTimeout(applyFill, 250);
                    setTimeout(applyFill, 600);
                    return r;
                  };
                  this.initSvg.__keTinted = true;
                }
              } catch (e) {}
            },
            _ke: { ext: ext.type, fn: d.function }
          };
          okCount++;
        })(list[i]);
      } catch (e) { warn('registerMethods: skip block', (list[i] && list[i].type), e); }
    }
    log('registerMethods', ext.type, okCount + '/' + list.length);
  }
  function registerEvents(ext) {
    var B = window.Blockly;
    if (!B || !B.Blocks) return;
    var evs = ext.events || [];
    for (var i = 0; i < evs.length; i++) {
      try {
      (function (ev) {
        var type = EXT_PREFIX + ext.type + '_' + ev.type;
        var evColor = ev.color || (ext && ext.color) || '#FFAB2E';
        _keBlockColors[type] = evColor;
        var evKey = 'KE_' + String(evColor).replace('#', '');
        _keColorMap[evKey] = { fill: evColor, border: shade(evColor, 25), layer: shade(evColor, 30) };
        var args = (ev.params || []).map(function (p) {
          var check = p.check;
          if (p.type === 'value' || p.type === 'input_value') check = check || 'Number';
          return { type: 'input_value', name: p.name || p.text || 'v', check: check };
        });
        var evText = (ev.text || ev.type).replace(/%(\d+)/g, function (m, n) { return '%' + (parseInt(n, 10) + 1); });
        evText = '%1 ' + evText;
        args.unshift({ type: 'field_image', src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjNUI2QkU1IiBzdHJva2Utd2lkdGg9IjEuNCIvPjxyZWN0IHg9IjExLjIiIHk9IjYiIHdpZHRoPSIxLjYiIGhlaWdodD0iOCIgZmlsbD0iIzVCNkJFNSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTciIHI9IjEuMiIgZmlsbD0iIzVCNkJFNSIvPjwvc3ZnPg==', width: 24, height: 24, alt: '*' });
        var gm = ext._groupMap && ext._groupMap[ev.type];
        B.Blocks[type] = {
          init: function () {
            var jd = {
              type: type,
              message0: evText,
              color: evKey,
              colour: evKey,
              args0: args,
              nextStatement: null,
              hat: true
            };
            try { this.jsonInit(jd); }
            catch (e) { warn('event block init failed', type, e); }
            try {
              var origInitSvg = this.initSvg;
              if (origInitSvg && !origInitSvg.__keTinted) {
                this.initSvg = function () {
                  var r = origInitSvg.apply(this, arguments);
                  var self = this;
                  var applyFill = function () {
                    try {
                      if (!self.svgGroup_) return;
                      var g = self.svgGroup_;
                      applyBlockColors(g, evColor);
                    } catch (e) {}
                  };
                  applyFill();
                  setTimeout(applyFill, 60);
                  setTimeout(applyFill, 250);
                  setTimeout(applyFill, 600);
                  return r;
                };
                this.initSvg.__keTinted = true;
              }
            } catch (e) {}
          }
        };
      })(evs[i]);
      } catch (e) { warn('registerEvents: skip event', (evs[i] && evs[i].type), e); }
    }
    try {
      if (heart && heart.runtime_manager && heart.runtime_manager.send_action) {
        var orig = heart.runtime_manager.send_action;
        heart.runtime_manager.send_action = function (payload) {
          var pid = payload && payload.id;
          if (pid && pid.indexOf(EXT_PREFIX + ext.type + '_') === 0) {
            var evId = pid.slice((EXT_PREFIX + ext.type + '_').length);
            window.dispatchEvent(new CustomEvent(TAG + '_' + ext.type + '_' + evId, { detail: payload.parameters }));
          }
          return orig.apply(this, arguments);
        };
      }
    } catch (e) {}
    injectBlockColorCss();
  }
  function injectBlockColorCss() {
    try {
      var css = '';
      var keys = Object.keys(_keBlockColors);
      for (var i = 0; i < keys.length; i++) {
        var t = keys[i];
        var c = _keBlockColors[t];
        if (!c) continue;
        css += 'g.' + t + ' > path.blocklyPath,'
          + 'g.' + t + ' > path,'
          + 'g[data-id*="' + t + '"] > path.blocklyPath,'
          + 'g[data-id*="' + t + '"] > path,'
          + 'g.blocklyDraggable.' + t + ' > path.blocklyPath,'
          + 'g.blocklyDraggable.' + t + ' > path'
          + '{fill:' + c + ' !important;stroke:' + c + ' !important;}'
          + 'g.' + t + ' rect.blocklyFieldRect,'
          + 'g.' + t + ' .blocklyFieldRect,'
          + 'g[data-id*="' + t + '"] rect.blocklyFieldRect,'
          + 'g[data-id*="' + t + '"] .blocklyFieldRect,'
          + 'g.blocklyDraggable.' + t + ' rect.blocklyFieldRect,'
          + 'g.blocklyDraggable.' + t + ' .blocklyFieldRect'
          + '{fill:#FFFFFF !important;stroke:' + c + ' !important;}';
      }
      var id = 'ke-block-color-css';
      var el = document.getElementById(id);
      if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
      el.textContent = css;
    } catch (e) {}
  }
  function registerFlyout(ext) {}

  // ==================== 工具箱刷新 ====================
  function refreshToolbox() {
    return workspace().then(function (ws) {
      if (env === 'kitten') {
        var tree = ws.options.languageTree.cloneNode(true);
        if (tree.querySelector('[name="Loading"]')) {
          return new Promise(function (res) {
            requestAnimationFrame(function () { res(refreshToolbox()); });
          });
        }
        var keys = Object.keys(extMap);
        for (var i = 0; i < keys.length; i++) {
          var ext = extMap[keys[i]];
          var old = tree.querySelector('[data-ext-id="' + keys[i] + '"]');
          if (old) old.parentNode.removeChild(old);
          var combinedName = esc((ext.title || '') + '-' + (ext.subtitle || ext.type || ''));
          var cat = xml('<category data-ext-id="' + esc(keys[i]) + '" name="' + combinedName + '"></category>');
          if (!cat) { warn('refreshToolbox: category xml invalid', keys[i]); continue; }
          var tb = ext._toolboxXmls || [];
          for (var j = 0; j < tb.length; j++) cat.appendChild(tb[j]);
          tree.appendChild(cat);
          styleAppend('.blocklyToolboxDiv [category-name="' + ext.title + '"]{border-color:' + ext.color + ';}' +
            '.blocklyToolboxDiv [category-name="' + ext.title + '"][aria-selected="true"]{background-color:' + ext.color + ';}' +
            '.blocklyToolboxDiv [category-name="' + ext.title + '"] .blocklyTreeIcon{background:url(' + (ext.icon && ext.icon.normal || '') + ');width:24px;height:24px;background-size:contain;}' +
            '.blocklyToolboxDiv [data-ext-id] .blocklyTreeLabel{display:none !important;}');
        }
        ws.options.languageTree = tree;
        ws.update_toolbox(tree);
        return;
      }
      if (env === 'kitten4' || env === 'kn' || env === 'bn') {
        var size = env === 'kn' ? '36px' : '24px';
        var keyList = Object.keys(extMap);
        var retryLeft = 20;
        for (var x = 0; x < keyList.length; x++) {
          var e2 = extMap[keyList[x]];
          if (!ws.toolbox_ || !ws.toolbox_.new_node) {
            if (retryLeft-- > 0) {
              return new Promise(function (res) {
                setTimeout(function () { res(refreshToolbox()); }, 500);
              });
            }
            return;
          }
          var children = ws.toolbox_ && ws.toolbox_.children_;
          if (children) {
            var hit = children.find(function (n) { return n.name_ === EXT_PREFIX + keyList[x]; });
            if (hit) hit.dispose();
          }
          var xmls = [];
          var tbs = e2._toolboxXmls || [];
          for (var y = 0; y < tbs.length; y++) { if (tbs[y]) xmls.push(tbs[y]); }
          try {
            var node = ws.toolbox_.new_node({
              text: '',
              name: EXT_PREFIX + keyList[x],
              color: env === 'kn' ? e2.color : undefined,
              cssClass: 'ke-ext-cat',
              icon: { html: '<img src="' + (e2.icon && e2.icon.normal || '') + '" draggable="false" style="height:' + size + ';width:' + size + ';">' },
              blocks: xmls
            });
            ws.toolbox_.add(node);
          } catch (e) { warn('toolbox add node failed', keyList[x], e); }
          try {
            var catName = EXT_PREFIX + keyList[x];
            var idSel = '.blocklyToolboxDiv .blocklyTreeNode[id^="ext_"]';
            styleAppend(idSel + '{background-color:' + (e2.color || '#608FEE') + ' !important;border:none !important;outline:none !important;box-shadow:none !important;border-radius:8px !important;margin:2px 4px;}' +
              idSel + ' .blocklyTreeLabel,' + idSel + ' .blocklyTreeRow > .blocklyTreeLabel,' + idSel + ' text.blocklyTreeLabel{display:none !important;}' +
              idSel + ' .blocklyTreeIcon{background:url(' + (e2.icon && e2.icon.normal || '') + ');width:24px;height:24px;background-size:contain;}' +
              idSel + ':hover{filter:brightness(1.08);border:none !important;outline:none !important;}');
          } catch (e) {}
          if (e2._buttons) {
            var bKeys = Object.keys(e2._buttons);
            for (var bi = 0; bi < bKeys.length; bi++) {
              if (e2._buttons[bKeys[bi]]) {
                try {
                  ws.flyout_button_callbacks_[bKeys[bi]] = e2._buttons[bKeys[bi]];
                  if (ws.toolbox_) ws.toolbox_.flyout_button_callbacks_[bKeys[bi]] = e2._buttons[bKeys[bi]];
                } catch (e) {}
              }
            }
          }
        }
        return;
      }
    }).then(function () {
      try { layoutTitle(); } catch (e) {}
    });
  }

  function layoutTitle() {
    try {
      watchTitleLayout();
      var flyout = document.querySelector('.blocklyFlyout');
      if (!flyout) return;
      var groups = flyout.querySelectorAll('g.ke-title-combined');
      for (var gi = 0; gi < groups.length; gi++) {
        var g = groups[gi];
        if (g.getAttribute('data-ke-title-laid')) continue;
        var textEl = g.querySelector('text.blocklyText');
        if (!textEl) continue;
        var fullText = textEl.textContent || '';
        var dotIdx = fullText.search(/[·|\s]\s*/);
        if (dotIdx < 0) {
          var cn0 = fullText;
          var en0 = '';
        } else {
          var cn0 = fullText.slice(0, dotIdx);
          var en0 = fullText.slice(dotIdx + 1).replace(/^\s*[·|]\s*/, '');
        }
        if (!cn0) continue;
        var cn = cn0;
        var en = en0;
        textEl.setAttribute('fill', 'none');
        textEl.style.cssText = 'fill:none;';
        while (textEl.firstChild) textEl.removeChild(textEl.firstChild);
        var SVG_NS = 'http://www.w3.org/2000/svg';
        var tspanCn = document.createElementNS(SVG_NS, 'tspan');
        tspanCn.setAttribute('class', 'ke-title-cn');
        tspanCn.setAttribute('x', '0');
        tspanCn.setAttribute('dy', '0');
        tspanCn.setAttribute('fill', '#000000');
        tspanCn.setAttribute('font-size', '18');
        tspanCn.setAttribute('font-weight', '700');
        tspanCn.style.cssText = 'fill:#000000 !important;font-size:18px;font-weight:700;';
        tspanCn.textContent = cn;
        var tspanEn = document.createElementNS(SVG_NS, 'tspan');
        tspanEn.setAttribute('class', 'ke-title-en');
        tspanEn.setAttribute('dy', '0');
        tspanEn.setAttribute('fill', '#9ca3af');
        tspanEn.setAttribute('font-size', '13');
        tspanEn.setAttribute('font-weight', '600');
        tspanEn.style.cssText = 'fill:#9ca3af !important;font-size:13px;font-weight:600;';
        tspanEn.textContent = (en ? '·' + en : '');
        textEl.appendChild(tspanCn);
        textEl.appendChild(tspanEn);
        g.setAttribute('data-ke-title-laid', '1');
      }
    } catch (e) {}
  }
  function watchTitleLayout() {
    try {
      var flyout = document.querySelector('.blocklyFlyout');
      if (!flyout || flyout.__keTitleWatched) return;
      flyout.__keTitleWatched = true;
      var mo = new MutationObserver(function () {
        try { layoutTitle(); } catch (e) {}
      });
      mo.observe(flyout, { childList: true, subtree: true });
    } catch (e) {}
  }

  // ==================== 扩展安装 ====================
  function makeUtils(extRef) {
    return {
      isPlayer: isPlayer,
      getEnv: function () { return env; },
      onStart: function (cb) {
        var last = heart && heart.runtime_data && heart.runtime_data.run_status;
        var timer = setInterval(function () {
          var cur = heart && heart.runtime_data && heart.runtime_data.run_status;
          if (cur === 0 && last !== 0) cb(cur);
          last = cur;
        }, 100);
        return function () { clearInterval(timer); };
      },
      onStop: function (cb) {
        var last = heart && heart.runtime_data && heart.runtime_data.run_status;
        var timer = setInterval(function () {
          var cur = heart && heart.runtime_data && heart.runtime_data.run_status;
          if (cur === 1 && last !== 1) cb(cur);
          last = cur;
        }, 100);
        return function () { clearInterval(timer); };
      },
      emitEvent: function (eventId, params) {
        try {
          var et = extRef && extRef.type;
          if (heart && heart.runtime_manager && heart.runtime_manager.send_action) {
            heart.runtime_manager.send_action({
              id: EXT_PREFIX + et + '_' + eventId,
              namespace: '',
              parameters: params
            });
          }
        } catch (e) {}
      },
      error: function (msg) { throw new Error(msg); },
      log: function () { log.apply(null, arguments); },
      toast: function (msg) {
        try {
          var box = document.querySelector('.ant-message') || (function () {
            var d = document.createElement('div');
            d.className = 'ant-message';
            document.body.appendChild(d);
            return d;
          })();
          var item = document.createElement('div');
          item.className = 'ant-message-notice';
          item.innerHTML = '<div class="ant-message-notice-content"><span>' + String(msg) + '</span></div>';
          box.appendChild(item);
          setTimeout(function () { item.remove(); }, 3000);
        } catch (e) {}
      }
    };
  }
  function install(code) {
    if (!code || typeof code !== 'string') { toastError('导入失败：扩展代码为空或格式错误'); return false; }
    var sandbox = { extension: {} };
    var ext = null;
    var extUtils = null;
    try {
      new Function('require', 'exports', code)(function (mod) {
        if (mod === 'utils') { extUtils = makeUtils(ext); return extUtils; }
        return null;
      }, sandbox);
    } catch (e) { toastError('导入失败：执行扩展代码出错 ' + e); return false; }
    ext = sandbox.extension;
    if (!ext || !ext.type) { toastError('导入失败：扩展格式无效'); return false; }
    if (ext.format !== 'KE') {
      toastError('导入失败');
      return false;
    }
    if (window.__KE_BLOCKED_TYPES__ && window.__KE_BLOCKED_TYPES__[ext.type]) {
      toastError('导入失败：扩展 ' + ext.type + ' 已被卸载，请刷新后再试');
      return false;
    }
    if (extMap[ext.type] && window.__KE_USER_IMPORT__) {
    }
    if (!ext.icon) ext.icon = '';
    if (typeof ext.icon === 'string') ext.icon = { normal: ext.icon, selected: ext.icon };
    ext._source = code;
    ext._buttons = {};
    var blocksXml = [];
    var groupMap = {};
    var currentGroup = null;
    var tb = ext.toolbox || [];
    for (var ti = 0; ti < tb.length; ti++) {
      var t = tb[ti];
      if (!t || !t.type) continue;
      if (t.type === 'button') {
        var bid = EXT_PREFIX + ext.type + '_' + (t.id || ('btn' + ti));
        pushXml(blocksXml, '<button type="' + esc(bid) + '" callbackkey="' + esc(bid) + '" text="' + esc(t.text) + '"' +
          (t.webClass ? ' web-class="' + esc(t.webClass) + '"' : '') + ' height="32px"></button>');
        ext._buttons[bid] = t.click || null;
      } else if (t.type === 'label') {
        currentGroup = String(t.text || '');
        pushXml(blocksXml, '<label text="' + esc(t.text) + '" web-class="ke-label"></label>');
      } else if (t.type === 'event' || t.type === 'method') {
        groupMap[t.block] = { group: currentGroup, isEvent: t.type === 'event' };
        pushXml(blocksXml, '<block type="' + esc(EXT_PREFIX + ext.type + '_' + t.block) + '"></block>');
      }
    }
    ext._groupMap = groupMap;
    ext._toolboxXmls = blocksXml;
    var subtitle = ext.subtitle || ext.type || '';
    var titleNode = xml('<label text="' + esc(ext.title + '·' + subtitle) + '" web-class="ke-title-combined"></label>');
    if (titleNode) blocksXml.unshift(titleNode);
    extMap[ext.type] = ext;
    registerMethods(ext);
    registerEvents(ext);
    styleAppend('.ke-open-btn{cursor:pointer;}');
    return refreshToolbox().then(function () {
      log('installed', ext.type, ext.title);
      persistExt(ext.type, code);
      if (!window.__KE_STARTUP__) toastOk('导入成功：' + (ext.title || ext.type));
      return true;
    }).catch(function (e) {
      warn('toolbox refresh failed', ext.type);
      toastError('导入失败：工具箱刷新失败 ' + e);
      return false;
    });
  }
  function persistExt(type, code) {
    try {
      if (typeof window.__keSaveExt === 'function') {
        window.__keSaveExt(type, code);
      }
    } catch (e) {}
    try {
      if (window.localStorage && type && code) {
        localStorage.setItem('KE_EXT_CODE_' + type, code);
        var list = [];
        try { list = JSON.parse(localStorage.getItem('KE_EXT_LIST') || '[]') || []; } catch (e) { list = []; }
        if (list.indexOf(type) < 0) list.push(type);
        localStorage.setItem('KE_EXT_LIST', JSON.stringify(list));
      }
    } catch (e) {}
  }
  function installMany(list) {
    if (!list || !list.length) return;
    var queue = list.slice();
    (function next() {
      var code = queue.shift();
      if (!code) return;
      try { install(code); } catch (e) { warn('install error', e); }
      setTimeout(next, 250);
    })();
  }
  function loadAll() {
    window.__KE_BLOCKED_TYPES__ = null;
    window.__KE_STARTUP__ = true;
    try {
      setTimeout(function () { window.__KE_STARTUP__ = false; }, 4000);
    } catch (e) {}
    var list = [];
    try {
      if (window.localStorage) {
        var saved = [];
        try { saved = JSON.parse(localStorage.getItem('KE_EXT_LIST') || '[]') || []; } catch (e) { saved = []; }
        for (var i = 0; i < saved.length; i++) {
          var c = localStorage.getItem('KE_EXT_CODE_' + saved[i]);
          if (c) list.push(c);
        }
      }
    } catch (e) {}
    if (window.__KE_EXTENSION_CODE__) list.push(window.__KE_EXTENSION_CODE__);
    if (window.__KE_PERSISTED__ && window.__KE_PERSISTED__.length) {
      for (var j = 0; j < window.__KE_PERSISTED__.length; j++) {
        if (window.__KE_PERSISTED__[j]) list.push(window.__KE_PERSISTED__[j]);
      }
    }
    if (list.length) installMany(list);
    if (typeof window.__keLoadExts === 'function') {
      try {
        window.__keLoadExts().then(function (saved) {
          if (saved && saved.length) installMany(saved);
        }).catch(function () {});
      } catch (e) {}
    }
  }

  // ==================== 卸载 ====================
  function uninstall(type) {
    try {
      if (!extMap[type]) { warn('uninstall: 未找到', type); return; }
      var B = window.Blockly;
      if (B && B.Blocks) {
        Object.keys(B.Blocks).forEach(function (k) {
          if (k.indexOf(EXT_PREFIX + type + '_') === 0) delete B.Blocks[k];
        });
      }
      var ws = B && B.mainWorkspace;
      if (ws && ws.toolbox_ && ws.toolbox_.children_) {
        var node = ws.toolbox_.children_.find(function (n) { return n.name_ === EXT_PREFIX + type; });
        if (node) node.dispose();
      }
      if (ws && ws.flyout_button_callbacks_) {
        var cKeys = Object.keys(ws.flyout_button_callbacks_);
        for (var ck = 0; ck < cKeys.length; ck++) {
          if (cKeys[ck].indexOf(EXT_PREFIX + type + '_') === 0) delete ws.flyout_button_callbacks_[cKeys[ck]];
        }
        delete ws.flyout_button_callbacks_[type];
      }
      if (ws && ws.toolbox_ && ws.toolbox_.flyout_button_callbacks_) {
        var ck2 = Object.keys(ws.toolbox_.flyout_button_callbacks_);
        for (var c3 = 0; c3 < ck2.length; c3++) {
          if (ck2[c3].indexOf(EXT_PREFIX + type + '_') === 0) delete ws.toolbox_.flyout_button_callbacks_[ck2[c3]];
        }
      }
      if (ws && ws.flyout_ && ws.flyout_.svgGroup_) {
        while (ws.flyout_.svgGroup_.firstChild) ws.flyout_.svgGroup_.removeChild(ws.flyout_.svgGroup_.firstChild);
      }
      try {
        if (ws && ws.toolbox_ && typeof ws.toolbox_.selectItemByPosition === 'function') {
          ws.toolbox_.selectItemByPosition(0);
        } else if (ws && ws.toolbox_ && ws.toolbox_.refreshSelection) {
          ws.toolbox_.refreshSelection();
        }
      } catch (e) {}
      try {
        var domNode = document.getElementById(type);
        if (domNode && domNode.parentNode) domNode.parentNode.removeChild(domNode);
      } catch (e) {}
      try {
        var treeItems = document.querySelectorAll('.blocklyToolboxDiv [role="treeitem"]');
        treeItems.forEach(function (ti) {
          if (ti.textContent && ti.textContent.indexOf(type) >= 0 && ti.parentNode) {
            ti.parentNode.removeChild(ti);
          }
        });
      } catch (e) {}
      try {
        if (heart && heart.registry) {
          var idx = heart.registry.domain_function_index;
          if (idx) {
            Object.keys(idx).forEach(function (k) {
              if (k.indexOf(EXT_PREFIX + type + '_') === 0) {
                delete idx[k];
                delete heart.registry.domain_function[k];
              }
            });
          }
        }
      } catch (e) {}
      delete extMap[type];
      try {
        window.__KE_BLOCKED_TYPES__ = window.__KE_BLOCKED_TYPES__ || {};
        window.__KE_BLOCKED_TYPES__[type] = true;
        if (window.__KE_EXTENSION_SOURCE__ && window.__KE_EXTENSION_SOURCE__[type]) {
          window.__KE_EXTENSION_SOURCE__[type] = '';
        }
      } catch (e) {}
      try {
        if (ws && ws.toolbox_ && ws.toolbox_.children_) {
          var all = ws.toolbox_.children_.slice();
          for (var a = 0; a < all.length; a++) {
            var nm = all[a].name_ || '';
            if (nm.indexOf(EXT_PREFIX) === 0) {
              try { all[a].dispose(); } catch (e) {}
            }
          }
        }
      } catch (e) {}
      try {
        if (ws && ws.flyout_button_callbacks_) {
          Object.keys(ws.flyout_button_callbacks_).forEach(function (k) {
            if (k.indexOf(EXT_PREFIX) === 0) delete ws.flyout_button_callbacks_[k];
          });
        }
        if (ws && ws.toolbox_ && ws.toolbox_.flyout_button_callbacks_) {
          Object.keys(ws.toolbox_.flyout_button_callbacks_).forEach(function (k) {
            if (k.indexOf(EXT_PREFIX) === 0) delete ws.toolbox_.flyout_button_callbacks_[k];
          });
        }
      } catch (e) {}
      try {
        if (ws && ws.toolbox_ && ws.toolbox_.selectedItem_) {
          ws.toolbox_.selectedItem_.setSelected(false);
        }
        if (ws && ws.toolbox_ && ws.toolbox_.tree_) {
          var firstChild = ws.toolbox_.tree_.firstChild;
          if (firstChild && firstChild.select) firstChild.select();
        }
      } catch (e) {}
      refreshToolbox().catch(function () {});
      try {
        if (typeof window.__keRemoveExt === 'function') {
          window.__keRemoveExt(type);
        }
      } catch (e) {}
      try {
        if (window.localStorage) {
          localStorage.removeItem('KE_EXT_CODE_' + type);
          var plist = [];
          try { plist = JSON.parse(localStorage.getItem('KE_EXT_LIST') || '[]') || []; } catch (e) { plist = []; }
          var pidx = plist.indexOf(type);
          if (pidx >= 0) { plist.splice(pidx, 1); localStorage.setItem('KE_EXT_LIST', JSON.stringify(plist)); }
        }
      } catch (e) {}
      setTimeout(function () {
        try {
          var treeItems2 = document.querySelectorAll('.blocklyToolboxDiv [role="treeitem"]');
          treeItems2.forEach(function (ti) {
            if (ti.textContent && ti.textContent.indexOf(type) >= 0 && ti.parentNode) {
              ti.parentNode.removeChild(ti);
            }
          });
        } catch (e) {}
      }, 300);
      try {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_extension) {
          window.pywebview.api.delete_extension(type);
        }
      } catch (e) {}
      log('uninstalled', type);
    } catch (e) { warn('uninstall failed', e); }
  }
  function openPanel() {
    try {
      var old = document.getElementById(TAG + '-panel');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var keys = Object.keys(extMap);
      var rows = '';
      if (!keys.length) {
        rows = '<div style="padding:36px 20px;text-align:center;color:#94a3b8;font-size:13px;">暂无已安装的扩展</div>';
      } else {
        for (var i = 0; i < keys.length; i++) {
          var e = extMap[keys[i]];
          rows += '<div style="display:flex;align-items:center;padding:11px 16px;border-bottom:1px solid #f1f5f9;">' +
            '<span style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + (e.color || '#818cf8') + ';flex:none;"></span>' +
            '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b style="font-size:13px;color:#1e293b;">' + e.title + '</b> <span style="color:#94a3b8;font-size:11px;margin-left:4px;">' + keys[i] + '</span></span>' +
            '</span>' +
            '<button data-ke-rm="' + keys[i] + '" style="background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;padding:4px 14px;cursor:pointer;font-size:12px;flex:none;">卸载</button>' +
            '</div>';
        }
      }
      var panel = document.createElement('div');
      panel.id = TAG + '-panel';
      panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;max-height:78vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1e293b;border:1px solid #e2e8f0;';
      panel.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e2e8f0;">' +
          '<div style="font-weight:700;font-size:15px;color:#1e293b;">已安装扩展 <span style="color:#94a3b8;font-weight:500;font-size:12px;">· ' + keys.length + ' 个</span></div>' +
          '<button data-ke-close style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;width:30px;height:30px;cursor:pointer;font-size:14px;line-height:1;">✕</button>' +
        '</div>' +
        '<div>' + rows + '</div>';
      panel.addEventListener('click', function (ev) {
        var t = ev.target;
        if (t && t.getAttribute && t.getAttribute('data-ke-rm')) {
          uninstall(t.getAttribute('data-ke-rm'));
          openPanel();
        }
        if (t && t.hasAttribute && t.hasAttribute('data-ke-close')) {
          if (panel.parentNode) panel.parentNode.removeChild(panel);
        }
      });
      document.body.appendChild(panel);
    } catch (e) { warn('openPanel failed', e); }
  }
  function uninstallAll() {
    try {
      var keys = Object.keys(extMap);
      for (var i = 0; i < keys.length; i++) uninstall(keys[i]);
      try {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.list_directory) {
          window.pywebview.api.list_directory().then(function (res) {
            try {
              var list = JSON.parse(res);
              if (Array.isArray(list)) {
                list.forEach(function (fn) {
                  if (String(fn).indexOf('.ke.js') >= 0) {
                    var t = String(fn).replace('.ke.js', '');
                    try { if (window.pywebview.api.delete_extension) window.pywebview.api.delete_extension(t); } catch (e) {}
                  }
                });
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
      log('uninstallAll done');
    } catch (e) { warn('uninstallAll failed', e); }
  }
  function ensureModal() {
    try {
      var m = document.getElementById('ke-modal');
      if (m) return m;
      m = document.createElement('div');
      m.id = 'ke-modal';
      m.className = 'ke-modal-mask hidden';
      m.innerHTML = '<div class="ke-modal-window" data-type="ok">' +
        '<div class="ke-modal-header"><span class="ke-modal-title"></span><span class="ke-modal-close">×</span></div>' +
        '<div class="ke-modal-body"></div>' +
        '<div class="ke-modal-footer"><button class="ke-modal-ok">关闭</button></div>' +
        '</div>';
      document.body.appendChild(m);
      var close = function () { m.classList.add('hidden'); };
      m.querySelector('.ke-modal-close').onclick = close;
      m.querySelector('.ke-modal-ok').onclick = close;
      m.addEventListener('click', function (e) { if (e.target === m) close(); });
      return m;
    } catch (e) { return null; }
  }
  function showModal(type, title, msg) {
    try {
      var m = ensureModal();
      if (!m) return;
      m.classList.remove('hidden');
      m.querySelector('.ke-modal-window').setAttribute('data-type', type);
      m.querySelector('.ke-modal-title').textContent = title || (type === 'error' ? '导入失败' : 'KE 提示');
      m.querySelector('.ke-modal-body').textContent = String(msg || '');
    } catch (e) {}
  }
  function toastTop(msg, color) {
    try {
      var box = document.querySelector('.ant-message') || (function () {
        var d = document.createElement('div');
        d.className = 'ant-message';
        d.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483646;';
        document.body.appendChild(d);
        return d;
      })();
      var item = document.createElement('div');
      item.className = 'ant-message-notice';
      item.innerHTML = '<div class="ant-message-notice-content" style="color:' + color + '"><span>' + String(msg) + '</span></div>';
      box.appendChild(item);
      setTimeout(function () { try { item.remove(); } catch (e) {} }, 4000);
    } catch (e) {}
  }
  function toastOk(msg) { showModal('ok', '导入提示', msg); toastTop('KE · ' + msg, '#16a34a'); }
  function toastError(msg) { showModal('error', ' 导入失败', msg); toastTop('KE · ' + msg, '#dc2626'); }

  // ==================== WebGL ====================
  function webglOff() {
    try { return localStorage.getItem('__KE_WEBGL_OFF__') === 'true'; } catch (e) { return false; }
  }
  function _applyWebglGuard(off) {
    try {
      if (off) {
        if (!window.__KE_WEBGL_HOOKED__) {
          window.__KE_WEBGL_ORIG_CANVAS__ = HTMLCanvasElement.prototype.getContext;
          if (window.OffscreenCanvas) window.__KE_WEBGL_ORIG_OFFSCREEN__ = OffscreenCanvas.prototype.getContext;
          window.__KE_WEBGL_ORIG_CTX__ = window.WebGLRenderingContext;
          window.__KE_WEBGL_ORIG_CTX2__ = window.WebGL2RenderingContext;
          window.__KE_WEBGL_HOOKED__ = true;
        }
        HTMLCanvasElement.prototype.getContext = function (t) {
          if (t && String(t).toLowerCase().indexOf('webgl') === 0) return null;
          return window.__KE_WEBGL_ORIG_CANVAS__.apply(this, arguments);
        };
        if (window.OffscreenCanvas) {
          OffscreenCanvas.prototype.getContext = function (t) {
            if (t && String(t).toLowerCase().indexOf('webgl') === 0) return null;
            return window.__KE_WEBGL_ORIG_OFFSCREEN__.apply(this, arguments);
          };
        }
        try { window.WebGLRenderingContext = undefined; } catch (e) {}
        try { window.WebGL2RenderingContext = undefined; } catch (e) {}
      } else {
        if (window.__KE_WEBGL_ORIG_CANVAS__) HTMLCanvasElement.prototype.getContext = window.__KE_WEBGL_ORIG_CANVAS__;
        if (window.__KE_WEBGL_ORIG_OFFSCREEN__ && window.OffscreenCanvas) OffscreenCanvas.prototype.getContext = window.__KE_WEBGL_ORIG_OFFSCREEN__;
        if ('__KE_WEBGL_ORIG_CTX__' in window) window.WebGLRenderingContext = window.__KE_WEBGL_ORIG_CTX__;
        if ('__KE_WEBGL_ORIG_CTX2__' in window) window.WebGL2RenderingContext = window.__KE_WEBGL_ORIG_CTX2__;
      }
    } catch (e) {}
  }
  function updateWebglMenuText(off) {
    try {
      var color = off ? '#d97706' : '#16a34a';
      var text = 'WebGL 开关：' + (off ? '已关闭' : '已开启');
      var items = document.querySelectorAll('[data-ke-menu-item="ke-webgl"]');
      for (var i = 0; i < items.length; i++) {
        var t = items[i].querySelector('.ant-menu-title-content');
        if (t) t.textContent = text; else items[i].textContent = text;
        items[i].setAttribute('data-ke-color', color);
        items[i].style.color = color;
      }
    } catch (e) {}
  }
  function toggleWebgl() {
    try {
      var next = !webglOff();
      if (next) localStorage.setItem('__KE_WEBGL_OFF__', 'true');
      else localStorage.removeItem('__KE_WEBGL_OFF__');
      _applyWebglGuard(next);
      updateWebglMenuText(next);
      setTimeout(function () { location.reload(); }, 400);
    } catch (e) {}
  }
  _applyWebglGuard(webglOff());
  function pickExtFile() {
    try {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.js,.ke.js';
      inp.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
      inp.onchange = function () {
        var f = inp.files && inp.files[0];
        if (inp.parentNode) inp.parentNode.removeChild(inp);
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            var code = String(r.result || '');
            if (code && code.indexOf('extension') >= 0 && /type\s*:\s*["']([^"']+)["']/.test(code)) {
              window.__KE_BLOCKED_TYPES__ = null;
              window.__KE_USER_IMPORT__ = true;
              var result = install(code);
              window.__KE_USER_IMPORT__ = false;
              if (result && typeof result.then === 'function') {
                result.then(function (ok) {
                  if (!ok) toastError('导入失败：请检查扩展文件后重试');
                });
              }
            } else {
              toastError('导入失败：文件格式无效');
            }
          } catch (e) { toastError('导入失败：安装异常 ' + e); }
        };
        r.onerror = function () { toastError('导入失败：读取文件出错'); };
        r.readAsText(f, 'utf-8');
      };
      document.body.appendChild(inp);
      inp.click();
    } catch (e) { toastError('文件选择失败：' + e); }
  }
  // ==================== 恢复====================
  function restoreFromProject(text) {
    try {
      if (!text || typeof text !== 'string') return;
      var data = null;
      try { data = JSON.parse(text); } catch (e) {}
      if (!data) return;
      var extBlob = data.extensions || data.ext || null;
      if (!extBlob) return;
      var raw = extBlob;
      if (typeof extBlob === 'string') {
        try { raw = b64Decode(extBlob); } catch (e) { raw = extBlob; }
      }
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) {}
      if (parsed) {
        if (Array.isArray(parsed)) {
          for (var i = 0; i < parsed.length; i++) {
            if (parsed[i] && typeof parsed[i] === 'string') install(parsed[i]);
          }
        } else if (parsed.code || parsed.source) {
          install(parsed.code || parsed.source);
        }
      } else if (typeof raw === 'string' && raw.length > 50) {
        install(raw);
      }
    } catch (e) {}
  }
  function hijackXhr() {
    try {
      var Proto = XMLHttpRequest.prototype;
      var origOpen = Proto.open;
      var origSend = Proto.send;
      Proto.open = function (method, url) {
        this.__keUrl = url || '';
        this.__keMethod = method || '';
        return origOpen.apply(this, arguments);
      };
      Proto.send = function () {
        var self = this;
        var url = String(self.__keUrl || '');
        var m = String(self.__keMethod || '').toUpperCase();
        if (m === 'GET' && /\.bcm(?:kn|4)?(\?|$)/.test(url)) {
          try {
            self.addEventListener('load', function () {
              try { restoreFromProject(self.responseText); } catch (e) {}
            });
          } catch (e) {}
        }
        return origSend.apply(this, arguments);
      };
    } catch (e) {}
  }

  // ==================== 版本提示====================
  function checkVersion() {
    try {
      if (env !== 'kn' || !webpackReq || !webpackReq.m) return;
      var mids = Object.keys(webpackReq.m);
      for (var i = 0; i < mids.length; i++) {
        try {
          var mod = webpackReq(mids[i]);
          if (mod && mod.i8 && typeof mod.i8 === 'string' && mod.i8.indexOf('1.') === 0) {
            log('KittenN version', mod.i8);
            return;
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  // ====================注册 =====================
  function earlyTypes(code) {
    try {
      if (!window.Blockly || !code) return;
      var m = code.match(/type\s*:\s*["']([^"']+)["']/);
      if (!m) return;
      var extType = m[1];
      var seg = code.match(/(?:methods|blocks)\s*:\s*\[([\s\S]*?)\]\s*,?\s*(?:events|toolbox|color|icon|title|type)/);
      if (!seg) return;
      var types = seg[1].match(/type\s*:\s*["']([^"']+)["']/g) || [];
      for (var i = 0; i < types.length; i++) {
        var tn = types[i].match(/["']([^"']+)["']/)[1];
        var full = EXT_PREFIX + extType + '_' + tn;
        if (!window.Blockly.Blocks[full]) {
          (function (f) {
            window.Blockly.Blocks[f] = { init: function () { this.jsonInit({ type: f, message0: f }); } };
          })(full);
        }
      }
    } catch (e) {}
  }

  // ==================== 菜单注入====================
  function injectMenu() {
    try {
      if (window.__KE_MENU__) return;
      window.__KE_MENU__ = true;
      try {
        var __keVersionLast = 0;
        function keVersionShow() {
          var now = Date.now();
          if (now - __keVersionLast < 500) return;
          __keVersionLast = now;
          try {
            var m = ensureModal();
            if (m) {
              m.classList.remove('hidden');
              m.querySelector('.ke-modal-window').setAttribute('data-type', 'ok');
              m.querySelector('.ke-modal-title').textContent = '版本信息';
              m.querySelector('.ke-modal-body').textContent = '当前版本：V1.3.0';
            }
          } catch (e) {}
          try { toastTop('当前版本：V1.3.0', '#5B6BE5'); } catch (e) {}
          try { if (window.alert) window.alert('当前版本：V1.3.0'); } catch (e) {}
        }
        function keVersionHit(ev) {
          var el = ev.target && ev.target.closest && ev.target.closest('[data-ke-menu-item="ke-version"]');
          if (!el) return;
          try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
          keVersionShow();
        }
        document.addEventListener('click', keVersionHit, true);
        document.addEventListener('mousedown', keVersionHit, true);
        document.addEventListener('pointerdown', keVersionHit, true);
        document.addEventListener('mouseup', keVersionHit, true);
        document.addEventListener('pointerup', keVersionHit, true);
      } catch (e) {}
      function findHosts() {
        var hosts = [];
        function addH(host, anchor) {
          if (host && hosts.indexOf(host) < 0) hosts.push({ host: host, anchor: anchor });
        }
        var anchors = ['帮助手册', '我要反馈', '关于KittenN', '创作环境检测', '积木盒模式', '短积木模式', '语言切换'];
        for (var ai = 0; ai < anchors.length; ai++) {
          try {
            var xp = '//*[normalize-space(text())="' + anchors[ai] + '"]';
            var r = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (r && r.singleNodeValue) {
              var item = null;
              try { item = r.singleNodeValue.closest ? r.singleNodeValue.closest('li') : null; } catch (e) {}
              if (item && item.parentElement) {
                var cls = String(item.className || '');
                if (cls.indexOf('ant-menu-item') >= 0 && cls.indexOf('submenu') < 0) {
                  addH(item.parentElement, item);
                }
              }
            }
          } catch (e) {}
        }
        for (var ai2 = 0; ai2 < anchors.length; ai2++) {
          try {
            var xp2 = '//*[normalize-space(text())="' + anchors[ai2] + '"]';
            var r2 = document.evaluate(xp2, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (r2 && r2.singleNodeValue) {
              var item2 = null;
              try { item2 = r2.singleNodeValue.closest ? r2.singleNodeValue.closest('li') : null; } catch (e) {}
              if (item2 && item2.parentElement) addH(item2.parentElement, item2);
            }
          } catch (e) {}
        }
        var setBtn = document.querySelector('#header-setting-btn');
        if (setBtn) {
          var sh = setBtn.querySelector('.CUI-menu-menu') ||
            setBtn.parentElement.querySelector('[class*="menu"]') ||
            setBtn.closest('[class*="Drawer"],[class*="Panel"]') ||
            setBtn.parentElement;
          if (sh) addH(sh, null);
        }
        var header = document.querySelector('#kitten_main_container header, header');
        if (header) {
          var right = header.querySelector('[class*="header_right"],[class*="header-right"],[class*="headerRight"]');
          if (right) addH(right, null);
        }
        return hosts;
      }
      var G = function (d) {
        return '<svg width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + d + '</svg>';
      };
      var MENU_SPECS = [
        {
          id: 'ke-version',
          icon: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
          text: '版本信息',
          color: null,
          fn: function () { showModal('ok', '版本信息', '当前版本：V1.3.0'); }
        },
        {
          id: 'ke-import',
          icon: '<path d="M12 3v9m0 0l-4-4m4 4l4-4"/><path d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5"/>',
          text: '导入扩展',
          color: null,
          fn: function () { pickExtFile(); }
        },
        {
          id: 'ke-market',
          icon: '<path d="M3 9l2-5h14l2 5M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M3 9h18M16 13a4 4 0 0 1-8 0"/>',
          text: '扩展集市',
          color: null,
          fn: function () {
            try {
              if (window.pywebview && window.pywebview.api && window.pywebview.api.open_market) window.pywebview.api.open_market();
              else if (window.open) window.open('https://code.pgrm.run/mk/kn', '_blank');
            } catch (e) {}
          }
        },
        {
          id: 'ke-uninstall',
          icon: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
          text: '卸载扩展',
          color: null,
          fn: function () { openPanel(); }
        },
        {
          id: 'ke-webgl',
          icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
          text: function () { return 'WebGL 开关：' + (webglOff() ? '已关闭' : '已开启'); },
          color: function () { return webglOff() ? '#d97706' : '#16a34a'; },
          fn: function () { toggleWebgl(); }
        }
      ];
      function specText(s) { return typeof s.text === 'function' ? s.text() : s.text; }
      function specColor(s) { return (typeof s.color === 'function' ? s.color() : s.color) || ''; }
      function bindItem(item, spec) {
        try {
          if (item.__keBound) return;
          item.__keBound = true;
          var iconSvg = G(spec.icon);
          var ic = item.querySelector('.ant-menu-item-icon');
          if (ic) {
            ic.innerHTML = iconSvg;
          } else {
            var isp = document.createElement('i');
            isp.className = 'IconFont_wrapper__FPeRA ant-menu-item-icon';
            isp.innerHTML = iconSvg;
            item.insertBefore(isp, item.firstChild);
          }
          item.style.cursor = 'pointer';
          item.style.background = '';
          item.style.transition = 'background-color 0.15s';
          item.onmouseenter = function () { item.style.background = 'rgba(0,0,0,0.06)'; };
          item.onmouseleave = function () { item.style.background = ''; };
          item.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            try { spec.fn(); } catch (err) { warn('menu action failed', spec.id, err); }
          };
        } catch (e) {}
      }
      function updateItem(item, spec) {
        try {
          bindItem(item, spec);
          var text = specText(spec);
          var tc = item.querySelector('.ant-menu-title-content');
          if (tc) { if (tc.textContent !== text) tc.textContent = text; }
          else if (item.textContent !== text) item.textContent = text;
          var color = specColor(spec);
          if (item.getAttribute('data-ke-color') !== color) {
            item.setAttribute('data-ke-color', color);
            item.style.color = color;
          }
        } catch (e) {}
      }
      function buildItem(anchor, spec) {
        var item = anchor ? anchor.cloneNode(true) : document.createElement('li');
        if (!anchor) item.className = 'ant-menu-item Menu_icon__ur9Tk';
        item.removeAttribute('data-menu-id');
        item.setAttribute('data-ke-menu-item', spec.id);
        bindItem(item, spec);
        var tc = item.querySelector('.ant-menu-title-content');
        var text = specText(spec);
        if (tc) tc.textContent = text; else item.textContent = text;
        var color = specColor(spec);
        item.setAttribute('data-ke-color', color);
        item.style.color = color;
        return item;
      }
      function ensureInHost(host, ref) {
        if (!host || !host.appendChild) return;
        var anchorItem = ref || host.querySelector('.ant-menu-item');
        for (var s = 0; s < MENU_SPECS.length; s++) {
          var spec = MENU_SPECS[s];
          var found = null;
          try {
            var nodes = host.querySelectorAll('[data-ke-menu-item="' + spec.id + '"]');
            for (var i = 0; i < nodes.length; i++) {
              if (nodes[i].parentNode === host) {
                if (found) { try { host.removeChild(nodes[i]); } catch (e) {} }
                else { found = nodes[i]; }
              }
            }
          } catch (e) {}
          if (found) {
            updateItem(found, spec);
          } else {
            try { host.appendChild(buildItem(anchorItem, spec)); } catch (e) {}
          }
        }
        try {
          if (host.style.maxHeight !== 'none') host.style.maxHeight = 'none';
          if (host.style.overflow !== 'visible') host.style.overflow = 'visible';
          if (host.style.height !== 'auto') host.style.height = 'auto';
          var pp = host.parentElement;
          if (pp && pp !== document.body) {
            if (pp.style.maxHeight !== 'none') pp.style.maxHeight = 'none';
            if (pp.style.overflow !== 'visible') pp.style.overflow = 'visible';
          }
        } catch (e) {}
      }
      var injectedHosts = null;
      function addItems() {
        var hosts;
        try { hosts = findHosts(); } catch (e) { return; }
        if (!hosts || !hosts.length) return;
        if (!injectedHosts) { try { injectedHosts = new WeakSet(); } catch (e) { injectedHosts = null; } }
        for (var h = 0; h < hosts.length; h++) {
          var H = hosts[h].host;
          if (!H) continue;
          ensureInHost(H, hosts[h].anchor);
          if (injectedHosts) { try { injectedHosts.add(H); } catch (e) {} }
        }
      }
      var t = null;
      function scan() {
        if (t) return;
        t = setTimeout(function () { t = null; try { addItems(); } catch (e) {} }, 300);
      }
      function onMutate(records) {
        try {
          var relevant = false;
          for (var r = 0; r < records.length && !relevant; r++) {
            var rec = records[r];
            var tg = rec.target;
            if (tg && tg.nodeType === 1) {
              if (tg.matches && tg.matches('.ant-menu,[class*="menu"],[class*="Menu"]')) { relevant = true; break; }
              var add = rec.addedNodes;
              for (var x = 0; x < add.length; x++) {
                if (add[x].nodeType === 1 && add[x].matches &&
                    add[x].matches('.ant-menu,[class*="menu"],[class*="Menu"],[data-ke-menu-item]')) {
                  relevant = true; break;
                }
              }
            }
          }
          if (relevant) scan();
        } catch (e) {}
      }
      try {
        if (document.body) {
          new MutationObserver(onMutate).observe(document.body, { childList: true, subtree: true });
        }
      } catch (e) {}
      setInterval(function () { try { addItems(); } catch (e) {} }, 1500);
      setTimeout(function () { try { addItems(); } catch (e) {} }, 800);
    } catch (e) {}
  }

  // ==================== 界面美化 =====================
  (function beautify() {
    try {
      styleAppend(
        '.ke-modal-mask{position:fixed !important;inset:0 !important;background:rgba(0,0,0,.45) !important;z-index:2147483647 !important;display:flex !important;align-items:center !important;justify-content:center !important;}' +
        '.ke-modal-mask.hidden{display:none !important;}' +
        '.ke-modal-window{background:#fff !important;border-radius:10px !important;box-shadow:0 12px 40px rgba(0,0,0,.35) !important;min-width:340px !important;max-width:520px !important;overflow:hidden !important;font-family:-apple-system,Segoe UI,"Microsoft YaHei",sans-serif !important;}' +
        '.ke-modal-window[data-type="ok"] .ke-modal-header{background:#5B6BE5 !important;}' +
        '.ke-modal-window[data-type="error"] .ke-modal-header{background:#dc2626 !important;}' +
        '.ke-modal-header{display:flex !important;justify-content:space-between !important;align-items:center !important;padding:12px 18px !important;color:#fff !important;font-size:15px !important;font-weight:600 !important;}' +
        '.ke-modal-close{font-size:22px !important;line-height:1 !important;cursor:pointer !important;opacity:.9;}' +
        '.ke-modal-close:hover{opacity:1;}' +
        '.ke-modal-body{padding:22px 24px !important;color:#1e293b !important;font-size:14px !important;line-height:1.7 !important;min-height:48px !important;white-space:pre-wrap !important;word-break:break-word !important;background:#fff !important;}' +
        '.ke-modal-footer{padding:10px 18px !important;text-align:right !important;border-top:1px solid #e2e8f0 !important;background:#f8fafc !important;}' +
        '.ke-modal-ok{background:#5B6BE5 !important;color:#fff !important;border:none !important;padding:7px 22px !important;border-radius:5px !important;cursor:pointer !important;font-size:13px !important;}' +
        '.ke-modal-ok:hover{background:#4A5BD5 !important;}' +

        '.blocklyFlyout{background:rgba(248,250,252,.6);padding-left:12px !important;}' +
        '.blocklyFlyout .blocklyTreeRow{border-radius:6px;margin:1px 8px 1px 8px !important;padding:2px 0 !important;text-align:left;}' +
        '.blocklyFlyout .blocklyTreeRow:hover{background:rgba(99,102,241,.08);}' +
        '.blocklyFlyout g.ke-label rect,.blocklyFlyout g.ke-label > rect,.blocklyFlyout [web-class="ke-label"] rect,.blocklyFlyout g.ke-label rect.blocklyPath' +
          ',.blocklyFlyout g.ke-credit rect,.blocklyFlyout g.ke-credit > rect,.blocklyFlyout [web-class="ke-credit"] rect' +
          '{fill:#5DCCFF !important;stroke:none !important;}' +
        '.blocklyFlyout g.ke-label text.blocklyText,.blocklyFlyout [web-class="ke-label"] text{fill:#fff !important;font-weight:700 !important;font-size:13px !important;}' +
        '.blocklyFlyout g.ke-credit text.blocklyText,.blocklyFlyout [web-class="ke-credit"] text{fill:#fff !important;font-weight:700 !important;font-size:13px !important;}' +
        '.blocklyFlyout .blocklyFlyoutButton,.blocklyFlyout .blocklyFlyoutButtonGroup,.blocklyFlyout button[type="button"]{margin:4px 8px !important;text-align:left;}' +
        '.blocklyFlyout .blocklyTreeRow > .blocklyTreeRowContentContainer,.blocklyFlyout .blocklyTreeRow > .blocklyTreeLabel{padding-left:0 !important;text-align:left;}' +
        '.blocklyToolboxDiv{background:#f8fafc;}' +
        '.blocklyToolboxDiv [role="treeitem"]{border-radius:8px;margin:1px 4px;padding:3px 8px;}' +
        '.blocklyToolboxDiv [role="treeitem"]:hover{background:rgba(99,102,241,.08);}' +
        '.blocklyToolboxDiv [role="treeitem"][aria-selected="true"]{background:rgba(99,102,241,.18);}' +
        '.blocklyToolboxDiv .blocklyTreeIcon{border-radius:6px;}' +
        '.blocklyTreeLabel{font-weight:500;color:#1e293b;}' +
        '.blocklyFlyout g.ke-title-combined rect,.blocklyFlyout g.ke-title-combined > rect,.blocklyFlyout [web-class="ke-title-combined"] rect' +
          '{fill:#5B6BE5 !important;stroke:none !important;}' +
        '.blocklyFlyout g.ke-title-combined{position:sticky !important;top:0 !important;z-index:5 !important;}' +
        '.blocklyFlyout g.ke-title-combined text.blocklyText .ke-title-cn{font-size:18px !important;font-weight:700 !important;fill:#000000 !important;}' +
        '.blocklyFlyout g.ke-title-combined text.blocklyText .ke-title-en{font-size:13px !important;font-weight:600 !important;fill:#9ca3af !important;}' +
        '.ke-ext-cat .blocklyTreeLabel{display:none !important;}' +
        '.blocklyHtmlInput{border-radius:14px !important;background:#fff !important;color:#000 !important;border:1px solid rgba(0,0,0,.2) !important;padding:2px 8px !important;outline:none !important;}' +
        '.blocklyHighlight,.blocklyConnectionHighlight,.blocklyConnectionPreview,.blocklySelectedConnectionPath,.blocklyHighlightedConnectionPath,.blocklyReplaceable,.blocklyDropTarget{fill:#bdbdbd !important;stroke:#bdbdbd !important;fill-opacity:.5 !important;stroke-opacity:.5 !important;}' +
        '.blocklyInsertionMarker,.blocklyInsertionMarker path,.blocklyInsertionMarker > path,.blocklyInsertionMarker rect,.blocklyInsertionMarker > rect,.blocklyInsertionMarker line,.blocklyInsertionMarker > line,.blocklyInsertionMarker circle,.blocklyInsertionMarker > circle,.blocklyInsertionMarker ellipse,.blocklyInsertionMarker > ellipse,.blocklyInsertionMarker polygon,.blocklyInsertionMarker > polygon,.blocklyInsertionMarker polyline,.blocklyInsertionMarker > polyline,.blocklyInsertionMarker g,.blocklyInsertionMarker > g{fill:#bdbdbd !important;stroke:#bdbdbd !important;fill-opacity:.5 !important;stroke-opacity:.5 !important;}' +
        '.blocklySelected,.blocklyStackGlowing{filter:drop-shadow(0 0 4px #bdbdbd) !important;}' +
        '.blocklySelected > .blocklyPathLight,.blocklySelected > .blocklyPathDark,.blocklyStackGlowing > .blocklyPathLight,.blocklyStackGlowing > .blocklyPathDark,.blocklySelected .blocklyPathLight,.blocklySelected .blocklyPathDark,.blocklyStackGlowing .blocklyPathLight,.blocklyStackGlowing .blocklyPathDark{stroke:#bdbdbd !important;fill:#bdbdbd !important;fill-opacity:.5 !important;stroke-opacity:.5 !important;}' +
        '.blocklyDragShadow > *{opacity:.6 !important;}'
      );
    } catch (e) {}

    // ========== flyout  ==========
    function reporterDx() {
      var v = window.__KE_FLYOUT_DX__;
      return (typeof v === 'number' && isFinite(v)) ? v : -11;
    }
    function statementDx() {
      var v = window.__KE_FLYOUT_STATEMENT_DX__;
      return (typeof v === 'number' && isFinite(v)) ? v : -14;
    }
    function eventDx() {
      var v = window.__KE_FLYOUT_EVENT_DX__;
      return (typeof v === 'number' && isFinite(v)) ? v : -16;
    }
    function blockFlyoutDx(b) {
      if (!b) return 0;
      if (b.outputConnection) return reporterDx();
      if (!b.previousConnection && b.nextConnection) return eventDx();
      if (b.previousConnection) return statementDx();
      return 0;
    }

    function applyDx(el, dx) {
      try {
        if (!el || !el.getAttribute) return;
        var t = el.getAttribute('transform') || '';
        var m = /translate\(\s*(-?[\d.]+)\s*[, ]\s*(-?[\d.]+)\s*\)/.exec(t);
        if (!m) return;
        var x = parseFloat(m[1]), y = parseFloat(m[2]);
        if (!isFinite(x) || !isFinite(y)) return;
        var applied = parseFloat(el.getAttribute('data-ke-dx'));
        var lastX = parseFloat(el.getAttribute('data-ke-x'));
        var base;
        if (isFinite(applied) && isFinite(lastX) && Math.abs(x - lastX) < 0.5) {
          base = x - applied;
        } else {
          base = x;
        }
        var nx = base + dx;
        if (Math.abs(nx - x) > 0.01) {
          el.setAttribute('transform', t.replace(m[0], 'translate(' + nx + ',' + y + ')'));
        }
        el.setAttribute('data-ke-dx', String(dx));
        el.setAttribute('data-ke-x', String(nx));
      } catch (e) {}
    }

    function setFillForce(el, color) {
      if (!el) return;
      try {
        el.style.setProperty('fill', color, 'important');
        el.setAttribute('fill', color);
      } catch (e) {}
    }
    function tintFlyoutLabels() {
      try {
        var flyout = document.querySelector('.blocklyFlyout');
        if (!flyout) return;
        var titles = flyout.querySelectorAll('g.ke-title-combined, g[web-class="ke-title-combined"], g[class*="ke-title"]');
        for (var i = 0; i < titles.length; i++) {
          var cn = titles[i].querySelector('tspan.ke-title-cn');
          if (cn) setFillForce(cn, '#000000');
          var en = titles[i].querySelector('tspan.ke-title-en');
          if (en) setFillForce(en, '#9ca3af');
          var rects = titles[i].querySelectorAll('rect');
          for (var r = 0; r < rects.length; r++) setFillForce(rects[r], 'transparent');
        }
        var credits = flyout.querySelectorAll('g.ke-credit, g[web-class="ke-credit"], g[class*="ke-credit"]');
        for (var i = 0; i < credits.length; i++) {
          var rects = credits[i].querySelectorAll('rect');
          for (var r = 0; r < rects.length; r++) setFillForce(rects[r], 'transparent');
          var texts = credits[i].querySelectorAll('text');
          for (var t2 = 0; t2 < texts.length; t2++) setFillForce(texts[t2], '#9ca3af');
        }
        var labels = flyout.querySelectorAll('g.ke-label, g[web-class="ke-label"], g[class*="ke-label"]');
        for (var i = 0; i < labels.length; i++) {
          var rects = labels[i].querySelectorAll('rect');
          for (var r = 0; r < rects.length; r++) setFillForce(rects[r], 'transparent');
          var texts = labels[i].querySelectorAll('text');
          for (var t2 = 0; t2 < texts.length; t2++) setFillForce(texts[t2], '#9ca3af');
        }
      } catch (e) {}
    }
    try {
      tintFlyoutLabels();
      setInterval(tintFlyoutLabels, 800);
      var fo = document.querySelector('.blocklyFlyout');
      if (fo) {
        var mo2 = new MutationObserver(function () { try { tintFlyoutLabels(); } catch (e) {} });
        mo2.observe(fo, { childList: true, subtree: true });
      }
    } catch (e) {}

    function forceBlockColors() {
      try {
        var roots = document.querySelectorAll('.blocklyFlyout, .blocklyWorkspace, .blocklyBlockCanvas, .blocklyBubbleCanvas');
        for (var r = 0; r < roots.length; r++) {
          var root = roots[r];
          if (!root) continue;
          var groups = root.querySelectorAll('g.blocklyDraggable, g[data-id^="ext_"]');
          for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            var type = null;
            var cls = g.getAttribute('class') || '';
            var m = cls.match(/(ext_[A-Z0-9_]+)/);
            if (m) type = m[1];
            if (!type) {
              var did = g.getAttribute('data-id') || '';
              var m2 = did.match(/(ext_[A-Z0-9_]+)/);
              if (m2) type = m2[1];
            }
            if (!type) continue;
            var c = _keBlockColors[type];
            if (!c) continue;
            applyBlockColors(g, c);
          }
        }
      } catch (e) {}
    }
    try {
      forceBlockColors();
      setInterval(forceBlockColors, 500);
      var fo3 = document.querySelector('.blocklyFlyout');
      if (fo3) {
        var mo3 = new MutationObserver(function () { try { forceBlockColors(); } catch (e) {} });
        mo3.observe(fo3, { childList: true, subtree: true });
      }
    } catch (e) {}

    function flyoutWorkspace() {
      try {
        var B = window.Blockly;
        if (!B) return null;
        var mw = B.getMainWorkspace ? B.getMainWorkspace() : B.mainWorkspace;
        if (!mw) return null;
        var fo = mw.getFlyout ? mw.getFlyout() : (mw.flyout_ || null);
        if (!fo) return null;
        return fo.getWorkspace ? fo.getWorkspace() : (fo.workspace_ || null);
      } catch (e) { return null; }
    }

    function alignFlyoutBlocks() {
      try {
        if (!document.querySelector('.blocklyFlyout')) return;
        var ws = flyoutWorkspace();

        if (ws && ws.getTopBlocks) {
          var blocks = ws.getTopBlocks(false) || [];
          if (blocks.length) {
            for (var i = 0; i < blocks.length; i++) {
              var b = blocks[i];
              if (!b || !b.getSvgRoot) continue;
              var root = b.getSvgRoot();
              if (!root) continue;
              applyDx(root, blockFlyoutDx(b));
            }
            return;
          }
        }

        var gs = document.querySelectorAll('.blocklyFlyout g.blocklyDraggable');
        for (var k = 0; k < gs.length; k++) {
          var g = gs[k];
          var id = g.getAttribute('data-id') || g.getAttribute('data-block-id');
          var blk = null;
          try { if (id && ws && ws.getBlockById) blk = ws.getBlockById(id); } catch (e) {}
          if (!blk) continue;
          applyDx(g, blockFlyoutDx(blk));
        }
      } catch (e) {}
    }

    try {
      var alignTimer = null;
      function scheduleAlign() {
        if (alignTimer) return;
        alignTimer = setTimeout(function () { alignTimer = null; alignFlyoutBlocks(); }, 40);
      }
      var startObserve = function () {
        try {
          new MutationObserver(function (ms) {
            for (var i = 0; i < ms.length; i++) {
              var t = ms[i].target;
              if (!t) continue;
              if ((t.closest && t.closest('.blocklyFlyout')) ||
                  (t.classList && t.classList.contains('blocklyFlyout'))) { scheduleAlign(); return; }
            }
          }).observe(document.body, { childList: true, subtree: true });
        } catch (e) {}
        scheduleAlign();
      }; 
      if (document.body) startObserve();
      else document.addEventListener('DOMContentLoaded', startObserve);
      setInterval(scheduleAlign, 1500);
      window.__KE_ALIGN_FLYOUT__ = alignFlyoutBlocks;
    } catch (e) {}
  })();

  // ==================== 启动 =====================
  function boot() {
    grabRequire();
    console.log('已经成功加载KEloader.js');
    if (webglOff()) _applyWebglGuard(true);
    grabHeart().then(function () {
      log('heart ready');
      checkVersion();
      kePatchThemeColor();
      keInitRuntimeBridge();
    }).catch(function () {});
    workspace().then(function () {
      try {
        new MutationObserver(function (ms) {
          if (!webglOff()) return;
          for (var i = 0; i < ms.length; i++) {
            var added = ms[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
              var n = added[j];
              if (n && n.tagName === 'CANVAS') {
                try {
                  var ctx = n.getContext && n.getContext('webgl');
                  if (ctx) {
                    n.getContext('2d');
                  }
                } catch (e) {}
              }
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
      setInterval(function () { refreshToolbox().catch(function () {}); }, 4000);
      setInterval(function () { try { kePatchThemeColor(); } catch (e) {} }, 1000);
    }).catch(function () {});
    hijackXhr();
    injectMenu();
  }

  // ====================API ====================
  window.KE = {
    install: install,
    uninstall: uninstall,
    list: function () { return Object.keys(extMap); },
    panel: openPanel,
    version: '1.0.0'
  };
  window.__KE_EXT_TYPES__ = extMap;
  window.__KE_INSTALL__ = function (code) { try { install(code); } catch (e) {} };
  window.__KE_UNINSTALL__ = uninstall;
  window.__KE_OPEN_UNINSTALL__ = openPanel;
  window.__KE_TOGGLE_WEBGL__ = toggleWebgl;
  window.__KE_DEFINE_TYPES_EARLY__ = earlyTypes;
  window.__KE_LOG__ = function (msg, type) { console.log('[' + TAG + ']', msg); };
  window.__KE_READY__ = true;
  setTimeout(function () { try { loadAll(); } catch (e) {} }, 600);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})();

