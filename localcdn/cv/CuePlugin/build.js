/* CuePlugin builder
 * Bundles the SVG drawing-board engine + layout + shape library into ONE
 * self-contained file: cue-board.js  (a CUE extension, single JS, hard limit).
 *
 * Sources (read at build time, NOT shipped):
 *   ../editor.js              -> engine (functions only)
 *   ../preview (15).html      -> svgBase64List + otic icon array + #picsggd card builder
 *
 * Output:
 *   cue-board.js              -> single JS to drop into CUE
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..');

const editor = fs.readFileSync(path.join(DIR, 'editor.js'), 'utf8');
const html = fs.readFileSync(path.join(DIR, 'preview (15).html'), 'utf8');

/* ---------- 1. engine body (strip IIFE wrapper + auto-init/exports) ---------- */
let engine = editor.replace(/^\(function \(\) \{/, '');
engine = engine.replace(/\}\)\(\);\s*$/, '');
engine = engine.replace(/window\.exportCurrentFramePNG[\s\S]*$/, '');

/* ---------- 2. data: svgBase64List + otic + card builder ---------- */
const svgMatch = html.match(/const svgBase64List = \[[\s\S]*?\n\];/);
if (!svgMatch) throw new Error('svgBase64List not found');
const svgList = svgMatch[0];

const inlineMatch = html.match(/const otic = \[[\s\S]*?container\.appendChild\(item\);\s*\}\);/);
if (!inlineMatch) throw new Error('otic inline script not found');
const libraryUI = 'function buildLibraryUI(){\n' + inlineMatch[0] + '\n}';

/* ---------- 3b. layout markup + style, taken VERBATIM from preview.html ---------- */
/* (preserves mdui-ripple / mdui-tooltip / mdui-menu and the original DOM order) */
const _styleBlocks = [];
let _ssm; const _styleRe = /<style>([\s\S]*?)<\/style>/g;
while ((_ssm = _styleRe.exec(html))) _styleBlocks.push(_ssm[1]);
const layStyle = _styleBlocks.join('\n');
const _eb = html.indexOf('<div class="editor-wrap">');
const _sc = html.indexOf('<script>', _eb);   // first <script> AFTER the editor-wrap (the board script)
if (_eb < 0 || _sc < 0) throw new Error('editor-wrap / script not found in preview.html');
const LAYOUT = html.substring(_eb, _sc).trim();
const wrapperCss =
  '.cue-board{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
  'width:min(1200px,94vw);height:min(780px,92vh);background:#fff;border-radius:14px;' +
  'box-shadow:0 12px 60px rgba(0,0,0,.35);z-index:2147483647;overflow:hidden;font-family:system-ui,sans-serif;}\n' +
  '.cue-board *{box-sizing:border-box;}\n';

/* ---------- 3. layout markup (now taken verbatim via extraction above) ---------- */
const LAYOUT_HTML = `
<div class="editor-wrap">
  <div class="editor-header">
    <div class="mdui-btn mdui-bt mdui-color-orange-400"><i class="mdui-icon material-icons">close</i>关闭</div>
    <div>
      <button class="mdui-btn mdui-bt mdui-color-blue-400" onclick="exportCurrentFramePNG()">导出PNG</button>
      <button class="mdui-btn mdui-bt mdui-color-blue-400" onclick="exportCurrentFrameSVG()">导出SVG</button>
      <a class="mdui-btn mdui-bt mdui-color-purple-300"><i class="mdui-icon material-icons">done</i>添加</a>
    </div>
  </div>

  <div class="panel-left">
    <div class="btnsl">
      <div class="mdui-btn mdui-bt-pf mdui-color-pink-a100"><i class="mdui-icon material-icons">view_quilt</i><a>图形</a></div>
      <div class="mdui-btn mdui-bt-pf mdui-color-blue-600"><i class="mdui-icon material-icons">text_fields</i><a>文字</a></div>
      <div class="mdui-btn mdui-bt-pf mdui-color-teal-400"><i class="mdui-icon material-icons">add_circle_outline</i><a>上传</a></div>
    </div>
    <div>
      <div class="card-grid" id="picsggd"></div>
    </div>
  </div>

  <div class="canvas-container"></div>

  <div class="panel-right">
    <div class="aalft" style="display:flex;width:100%;max-height:120px;position:relative;overflow:hidden;">
      <div style="width:64px;display:flex;flex-direction:column;">
        <div class="c1aa" style="flex:1;display:flex;align-items:center;justify-content:center;padding:4px;"><img alt="" style="width:100%;height:100%;object-fit:contain;"></div>
        <div class="c2aa" style="flex:1;display:flex;align-items:center;justify-content:center;padding:4px;"><img alt="" style="width:100%;height:100%;object-fit:contain;"></div>
      </div>
      <div class="c3aa" style="flex:1;display:flex;align-items:center;">
        <div class="pen" style="width:50%;display:flex;align-items:center;justify-content:center;"><img alt="" style="width:100%;object-fit:contain;"></div>
        <div class="eraser" style="width:50%;display:flex;align-items:center;justify-content:center;"><img alt="" style="width:100%;object-fit:contain;"></div>
      </div>
    </div>

    <div class="color-grid">
      <div class="color-item" style="background-color:#F12629;"></div>
      <div class="color-item" style="background-color:#F97721;"></div>
      <div class="color-item" style="background-color:#FBEC1F;"></div>
      <div class="color-item" style="background-color:#2DEC86;"></div>
      <div class="color-item" style="background-color:#17C7FF;"></div>
      <div class="color-item" style="background-color:#178fff;"></div>
      <div class="color-item" style="background-color:#6B56FE;"></div>
      <div class="color-item" style="background-color:#FC6BCD;"></div>
      <div id="active-color" class="color-item active" style="background-color:#FF9900;"></div>
    </div>
    <button class="mdui-btn mdui-btn-block mdui-color-theme-accent">颜色选择器</button>
    <div style="display: flex; gap: 10px; align-items: center; margin-top:10px; flex-wrap:nowrap; overflow-x:auto;">
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci01"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci02"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci03"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci04"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci05"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;" class="color-item ci06"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
      <div style="height: 35px;width: 35px;flex:0 0 auto;display:none;" class="color-item ci07"><img style="height: 100%;width: 100%;object-fit: contain;" alt=""></div>
    </div>
  </div>

  <div class="bar-bottom">
    <div class="res-menu" id="resMenu">
      <div class="res-current" id="resCurrent">480&times;360</div>
      <div class="res-pop" id="resPop">
        <div class="res-opt" data-w="480" data-h="360">480&times;360</div>
        <div class="res-opt" data-w="800" data-h="600">800&times;600</div>
        <div class="res-opt" data-w="1024" data-h="1024">1024&times;1024</div>
        <div class="res-opt" data-w="1920" data-h="1080">1920&times;1080</div>
        <div class="res-opt" data-w="4096" data-h="4096">4096&times;4096</div>
        <div class="res-custom">
          <input id="resW" class="res-input" type="number" min="1" inputmode="numeric"/>
          <span class="res-x">&times;</span>
          <input id="resH" class="res-input" type="number" min="1" inputmode="numeric"/>
          <button id="resApply" class="res-apply"></button>
        </div>
      </div>
    </div>
    <div class="act-ctl" style="display:flex;align-items:center;gap:6px;margin-right:6px;">
      <div id="undoBtn" class="mdui-btn mdui-btn-icon" title="撤销"><i class="mdui-icon material-icons">replay</i></div>
      <div id="delBtn" class="mdui-btn mdui-btn-icon" title="删除"><i class="mdui-icon material-icons">delete</i></div>
      <div id="redoBtn" class="mdui-btn mdui-btn-icon" title="重做"><i class="mdui-icon material-icons">refresh</i></div>
      <div class="zoom-ctl" style="display:flex;align-items:center;gap:4px;margin-left:6px;">
        <div id="zoomInBtn" class="mdui-btn mdui-btn-icon" title="放大"><i class="mdui-icon material-icons">add</i></div>
        <input id="zoomInput" class="mdui-textfield-input" type="text" value="100%" style="width:60px;text-align:center;">
        <div id="zoomOutBtn" class="mdui-btn mdui-btn-icon" title="缩小"><i class="mdui-icon material-icons">remove</i></div>
      </div>
    </div>
  </div>
</div>
`;

/* ---------- 4. CSS (now taken verbatim via extraction above) ---------- */
const CSS_HTML = `
.cue-board{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(1200px,94vw);height:min(780px,92vh);background:#fff;border-radius:14px;box-shadow:0 12px 60px rgba(0,0,0,.35);z-index:2147483647;overflow:hidden;font-family:system-ui,sans-serif;}
.cue-board *{box-sizing:border-box;}
.cue-board .editor-wrap{display:grid;width:100%;height:100%;grid-template-rows:64px 1fr 110px;grid-template-columns:310px 1fr 250px;grid-template-areas:"header header header" "left canvas right" "left bottom right";gap:6px;padding:6px;}
.cue-board .editor-header{grid-area:header;background:#fff;border-radius:10px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;}
.cue-board .panel-left{grid-area:left;background:#fff;border-radius:10px;padding:12px;overflow:auto;}
.cue-board .canvas-container{grid-area:canvas;background:#fff;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.cue-board .panel-right{grid-area:right;background:#fff;border-radius:10px;padding:12px;overflow:auto;}
.cue-board .bar-bottom{grid-area:bottom;background:#fff;border-radius:10px;padding:10px;display:flex;align-items:center;gap:12px;}
.cue-board .title-left{font-weight:bold;font-size:18px;}
.cue-board .btn{padding:8px 16px;border:none;border-radius:8px;background:#7b61ff;color:#fff;cursor:pointer;}
.cue-board .card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:14px;width:100%;padding:10px;}
.cue-board .card-item{border-radius:8px;overflow:hidden;cursor:pointer;}
.cue-board .card-item img{width:100%;height:auto;display:block;}
.cue-board .color-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;width:100%;}
.cue-board .color-item{border-radius:999px;width:30px;height:30px;cursor:pointer;}
.cue-board .btnsl{position:static!important;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
.cue-board .btnsl .mdui-btn{display:flex;align-items:center;gap:6px;border-radius:8px;padding:8px 10px;color:#fff;font-size:13px;cursor:pointer;}
.cue-board .mdui-btn{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 14px;font-size:13px;text-decoration:none;cursor:pointer;color:#333;background:#f0f0f5;}
.cue-board .mdui-bt{border-radius:20px;}
.cue-board .mdui-bt-pf{border-radius:8px;}
.cue-board .mdui-color-orange-400{background:#ff8f4d!important;color:#fff!important;}
.cue-board .mdui-color-purple-300{background:#b08cff!important;color:#fff!important;}
.cue-board .mdui-color-blue-400{background:#4f9bff!important;color:#fff!important;}
.cue-board .mdui-color-pink-a100{background:#ff9ecb!important;color:#7a1f4d!important;}
.cue-board .mdui-color-blue-600{background:#3d7bff!important;color:#fff!important;}
.cue-board .mdui-color-teal-400{background:#28c2b2!important;color:#fff!important;}
.cue-board .mdui-btn-block{width:100%;justify-content:center;margin-top:10px;background:#7b61ff;color:#fff;border:none;}
.cue-board .mdui-btn-icon{width:34px;height:34px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;background:#f2f2f7;}
.cue-board .mdui-icon{font-style:normal;}
.cue-board .c1aa,.cue-board .c2aa,.cue-board .pen,.cue-board .eraser{cursor:pointer;border-radius:8px;transition:background .12s;}
.cue-board .c1aa.on,.cue-board .c2aa.on,.cue-board .pen.on,.cue-board .eraser.on{background:#efeaff;}
.cue-board .aalft{border-radius:10px;background:#fafaff;border:1px solid #eee;padding:4px;}
.cue-board .panel-right img{max-width:100%;}
.cue-board .cue-board-entry{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;padding:8px 6px;border-radius:10px;background:#fafaff;border:1px solid #e4e4ee;color:#444;font-size:12px;min-width:64px;}
.cue-board .cue-board-entry:hover{background:#f0eeff;border-color:#cabcff;}
.cue-board .cue-board-entry-ico{font-size:20px;line-height:1;}
`;

const CSS = wrapperCss + layStyle;

/* ---------- 5. integration + assembly ---------- */
const INTEGRATION = `
  let boardRoot = null;
  let targetPanel = null;

  function injectStyleOnce(){
    if (document.getElementById('cueBoardStyle')) return;
    const s = document.createElement('style');
    s.id = 'cueBoardStyle';
    s.textContent = ${JSON.stringify(CSS)};
    document.head.appendChild(s);
  }

  function makeBoardButton(root){
    const b = document.createElement('div');
    b.className = 'cue-board-entry';
    b.innerHTML = '<span class="cue-board-entry-ico">&#9998;</span><span>画板</span>';
    b.addEventListener('click', function(){ openPanel(root); });
    return b;
  }

  // Find the upload-panel root that will receive the file for a given library wrapper.
  function panelRootOf(wrapper){
    return wrapper.closest('[class*="UpLoadPanel_containerWrapper"]') ||
           wrapper.closest('[class*="UpLoadPanel"]') ||
           wrapper.parentElement;
  }

  function install(){
    document.querySelectorAll('.ActorUpLoadPanel_libraryText__TC80w, .CommonUpLoadPanel_libraryText__bufIR').forEach(function(tNode){
      const txt = (tNode.textContent || '').trim();
      if (txt !== '画板') return;
      const wrapper = tNode.closest('.ActorUpLoadPanel_libraryWrapper') ||
                      tNode.closest('.CommonUpLoadPanel_libraryWrapper') ||
                      tNode.parentElement;
      if (!wrapper || wrapper.__cueInstalled) return;
      const root = panelRootOf(wrapper) || wrapper;
      wrapper.style.display = 'none';
      const our = makeBoardButton(root);
      if (wrapper.parentNode) wrapper.parentNode.insertBefore(our, wrapper.nextSibling);
      wrapper.__cueInstalled = true;
    });
  }

  function openPanel(root){
  try{
    targetPanel = root || null;
    if (boardRoot) closePanel();
    injectStyleOnce();
    const wrap = document.createElement('div');
    wrap.className = 'cue-board';
    wrap.innerHTML = ${JSON.stringify(LAYOUT)};
    document.body.appendChild(wrap);
    boardRoot = wrap;
    buildLibraryUI();          // tool icons + #picsggd cards
    init();                    // engine: build canvas + wire controls
    // override header buttons (engine defaulted them to addBasic / nothing)
    const closeBtn = wrap.querySelector('.editor-header .mdui-color-orange-400');
    if (closeBtn) closeBtn.onclick = closePanel;
    const addBtn = wrap.querySelector('.editor-header .mdui-color-purple-300');
    if (addBtn) addBtn.onclick = uploadToCue;
    initMduiOn(boardRoot);     // 初始化 mdui-menu / mdui-tooltip / mdui-ripple
    setDocSize(1024, 1024);
    setTimeout(fit, 60);
  }catch(e){ console.error('[CueBoard] openPanel failed', e); }
  }

  function closePanel(){
    if (boardRoot) { boardRoot.remove(); boardRoot = null; }
    targetPanel = null;
  }

  function svgToPngBlob(svg, cb){
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = function(){
      const bb = (svg.match(/viewBox="([^"]+)"/) || [])[1];
      let w = 1024, h = 1024;
      if (bb) { const p = bb.split(/[ ,]+/).map(Number); w = Math.max(1, Math.ceil(p[2] || 1024)); h = Math.max(1, Math.ceil(p[3] || 1024)); }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob(function(b){ URL.revokeObjectURL(url); cb(b); }, 'image/png');
    };
    img.onerror = function(){ URL.revokeObjectURL(url); cb(blob); };
    img.src = url;
  }

  function uploadToCue(){
    if (!boardRoot) return;
    const svg = svgString();
    // target the file input inside the recorded panel (falls back to any ant-upload input)
    let input = null;
    if (targetPanel) input = targetPanel.querySelector('input[type=file]');
    if (!input) input = document.querySelector('.ant-upload input[type=file]');
    if (!input) { alert('未找到 CUE 上传控件'); return; }
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const wantSvg = accept.indexOf('svg') >= 0;
    const finalize = function(file){
      const dt = new DataTransfer();
      dt.items.add(file);
      try { input.files = dt.files; } catch (e) {}
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      closePanel();
    };
    if (wantSvg) {
      finalize(new File([new Blob([svg], { type: 'image/svg+xml' })], 'drawing.svg', { type: 'image/svg+xml' }));
    } else {
      svgToPngBlob(svg, function(pngBlob){
        finalize(new File([pngBlob], 'drawing.png', { type: 'image/png' }));
      });
    }
  }

  // 强制加载完整 mdui 1.0.2（jQuery + JS + CSS + 图标），覆盖 window.mdui，
  // 以恢复 mdui-menu / mdui-ripple / mdui-tooltip 等特性（按 preview.html 原样）。
  function loadMduiOnce(){
    try {
      if (window.__cueMduiReady || window.__cueMduiLoading) return;
      window.__cueMduiLoading = true;
      const head = document.head;
      function addLink(id, href){
        if (document.getElementById(id)) return;
        const l = document.createElement('link');
        l.id = id; l.rel = 'stylesheet'; l.href = href; head.appendChild(l);
      }
      function addScript(src, cb){
        const s = document.createElement('script');
        s.src = src; s.onload = cb;
        s.onerror = function(){ window.__cueMduiLoading = false; console.error('[CueBoard] mdui script load failed', src); };
        head.appendChild(s);
      }
      addLink('cueMduiCss', 'https://cdn.jsdelivr.net/npm/mdui@1.0.2/dist/css/mdui.min.css');
      addLink('cueMiFont', 'https://fonts.googleapis.com/icon?family=Material+Icons');
      // mdui 1.x 依赖 jQuery
      addScript('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js', function(){
        addScript('https://cdn.jsdelivr.net/npm/mdui@1.0.2/dist/js/mdui.min.js', function(){
          window.__cueMduiReady = true; window.__cueMduiLoading = false;
          try { if (window.mdui && window.mdui.mutation) window.mdui.mutation(); } catch(e){}
        });
      });
    } catch (e) { console.error('[CueBoard] loadMduiOnce failed', e); }
  }

  // 在画板 DOM 就绪后初始化 mdui 组件（菜单/提示/涟漪）；若 mdui 尚未加载完则轮询。
  function initMduiOn(root){
    if (window.mdui && window.mdui.mutation) {
      try { window.mdui.mutation(root || document); } catch(e){}
    } else {
      setTimeout(function(){ initMduiOn(root); }, 300);
    }
  }

  function initCue(){
    loadMduiOnce();
    install();
    const obs = new MutationObserver(function(){ install(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  window.exportCurrentFrameSVG = exportCurrentFrameSVG;
  window.exportCurrentFramePNG = exportCurrentFramePNG;
  window.exportAllFramesSVG = exportAllFramesSVG;
  window.exportAllFramesPNG = exportAllFramesPNG;
  window.CueBoard = { open: openPanel, close: closePanel, getSVG: svgString };

  // Register a valid CUE (CUELoader) extension descriptor so installExt()
  // does not crash on ext.methods.map / ext.events.forEach / ext.toolbox.map.
  if (typeof exports !== 'undefined' && exports && typeof exports === 'object') {
    exports.extension = {
      type: 'cueboard',
      title: '画板',
      icon: '',
      color: '#ff9900',
      methods: [],
      events: [],
      toolbox: [],
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ try{ initCue(); }catch(e){ console.error('[CueBoard] initCue failed', e); } });
  else { try { initCue(); } catch(e){ console.error('[CueBoard] initCue failed', e); } }
`;

const OUT =
  '(function(){\n' +
  '/* ===== drawing-board engine (from editor.js) ===== */\n' +
  engine + '\n' +
  '/* ===== shape library data ===== */\n' +
  svgList + '\n' +
  '/* ===== library UI builder (otic + #picsggd) ===== */\n' +
  libraryUI + '\n' +
  '/* ===== CUE integration ===== */\n' +
  INTEGRATION + '\n' +
  '})();\n';

fs.writeFileSync(path.join(__dirname, 'cue-board.js'), OUT, 'utf8');
console.log('cue-board.js written, bytes =', OUT.length);
