(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const DOC = { w: 480, h: 360 };
  let zoom = 1, panX = 0, panY = 0;
  let currentTool = 'select';
  let activeColor = '#FF9900';
  let selected = null;
  let selSet = [];
  let clipboard = [];
  let content, handlesG, stage, stageWrap;
  let history = [], histIndex = -1;
  let frames = [], curFrame = 0;
  let drag = null, penPath = null;

  function el(tag, cls) {
    const n = document.createElementNS(SVGNS, tag);
    if (cls) n.setAttribute('class', cls);
    return n;
  }
  function mat(tx) {
    return new DOMMatrix([tx.a, tx.b, tx.c, tx.d, tx.e, tx.f]);
  }
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64ToText(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function setMatrix(node, m) {
    node.setAttribute('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
  }
  function getMatrix(node) {
    const t = node.getAttribute('transform');
    if (!t || t.indexOf('matrix') < 0) return new DOMMatrix();
    const nums = t.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    return new DOMMatrix([nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]]);
  }
  function pt(e) {
    const ctm = mat(stage.getScreenCTM()).inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm);
    return { x: p.x, y: p.y };
  }
  function download(data, name, type) {
    const blob = (data instanceof Blob) ? data : new Blob([data], { type: type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function injectStyle() {
    const s = document.createElement('style');
    s.textContent = `
.sv-stage{position:relative;flex:1;width:100%;overflow:hidden;background:#eef0f4}
#stage{position:absolute;left:0;top:0;display:block;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.12)}
.sv-toolbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 8px;background:#fff;border-bottom:1px solid #eee}
.sv-tbtn{cursor:pointer;user-select:none;border:1px solid #e4e4ee;border-radius:8px;padding:5px 10px;font-size:13px;background:#fafaff;color:#444;display:inline-flex;align-items:center;gap:4px}
.sv-tbtn:hover{background:#f0eeff}
.sv-tbtn.on{background:#7b61ff;color:#fff;border-color:#7b61ff}
.sv-item{cursor:move}
.sv-outline{fill:none;stroke:#7b61ff;stroke-dasharray:4 3;vector-effect:non-scaling-stroke;pointer-events:none}
.sv-handle{fill:#fff;stroke:#7b61ff;stroke-width:1.5;vector-effect:non-scaling-stroke;cursor:pointer}
.sv-rot{fill:#7b61ff;cursor:pointer}
.c1aa,.c2aa,.pen,.eraser{cursor:pointer;border-radius:8px;transition:background .12s}
.c1aa.on,.c2aa.on,.pen.on,.eraser.on{background:#efeaff}
.toolbtns .mdui-ripple.on{outline:2px solid #7b61ff}
#picsggd .card-item{display:flex;align-items:center;justify-content:center;background:#fafaff;border:1px solid #eee}
#picsggd .card-item:hover{background:#f0eeff;border-color:#cabcff}
#picsggd img{padding:6px;pointer-events:none}
.frame-thumb{width:65px;height:65px;background:#fff;border:1px solid #ddd;border-radius:6px;cursor:pointer;object-fit:contain}
.frame-thumb.on{border-color:#7b61ff;box-shadow:0 0 0 2px #7b61ff55}
.res-menu{position:relative}
.res-current{cursor:pointer;user-select:none;border:1px solid #e4e4ee;border-radius:8px;padding:5px 12px;font-size:13px;background:#fafaff;color:#444;min-width:84px;text-align:center}
.res-current:hover{background:#f0eeff}
.res-pop{position:absolute;bottom:calc(100% + 6px);left:0;background:#fff;border:1px solid #e4e4ee;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);padding:6px;display:none;flex-direction:column;gap:2px;z-index:50;min-width:140px}
.res-pop.open{display:flex}
.res-opt{cursor:pointer;padding:7px 10px;border-radius:6px;font-size:13px;color:#333}
.res-opt:hover{background:#f0eeff}
.res-custom{display:flex;align-items:center;gap:6px;padding-top:6px;margin-top:4px;border-top:1px solid #eee}
.res-input{width:62px;border:1px solid #ddd;border-radius:6px;padding:5px 6px;font-size:13px}
.res-x{color:#888}
.res-apply{cursor:pointer;border:none;border-radius:6px;background:#7b61ff;color:#fff;padding:5px 12px;font-size:13px}
`;
    document.head.appendChild(s);
  }

  function buildEditor() {
    const cont = document.querySelector('.canvas-container');
    cont.style.display = 'flex';
    cont.style.flexDirection = 'column';
    cont.style.overflow = 'hidden';
    cont.innerHTML = '';

    stageWrap = document.createElement('div');
    stageWrap.className = 'sv-stage';
    stage = el('svg');
    stage.id = 'stage';
    stage.setAttribute('xmlns', SVGNS);
    stage.innerHTML =
      '<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">' +
      '<path d="M20 0H0V20" fill="none" stroke="#eceef3" stroke-width="1"/></pattern></defs>' +
      '<rect id="svPage" fill="#fff" stroke="#dcdce4"/>' +
      '<rect id="svGrid" fill="url(#grid)"/>' +
      '<g id="content"></g>' +
      '<g id="svHandles"></g>';
    stageWrap.appendChild(stage);
    cont.appendChild(stageWrap);
    content = stage.querySelector('#content');
    handlesG = stage.querySelector('#svHandles');
    stageWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      panX -= e.deltaX;
      panY -= e.deltaY;
      applyView();
    }, { passive: false });

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    applyView();
  }

  function setDocSize(w, h) {
    DOC.w = w; DOC.h = h;
    const pg = stage.querySelector('#svPage'), gr = stage.querySelector('#svGrid');
    pg.setAttribute('x', 0); pg.setAttribute('y', 0); pg.setAttribute('width', w); pg.setAttribute('height', h);
    gr.setAttribute('x', 0); gr.setAttribute('y', 0); gr.setAttribute('width', w); gr.setAttribute('height', h);
    applyView();
  }
  function applyView() {
    stage.setAttribute('width', DOC.w);
    stage.setAttribute('height', DOC.h);
    stage.style.transformOrigin = '0 0';
    stage.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
    if (window.__zoomInput) window.__zoomInput.value = Math.round(zoom * 100) + '%';
    drawHandles();
  }
  function fit() {
    const r = stageWrap.getBoundingClientRect();
    zoom = Math.min(r.width / DOC.w, r.height / DOC.h) * 0.92;
    panX = (r.width - DOC.w * zoom) / 2;
    panY = (r.height - DOC.h * zoom) / 2;
    applyView();
  }

  function selectItem(g) {
    selected = g; selSet = g ? [g] : [];
    drawHandles();
  }
  function selectAll() {
    selSet = Array.prototype.slice.call(content.querySelectorAll('.sv-item'));
    selected = selSet[0] || null;
    drawHandles();
  }
  function clearSelection() {
    selected = null; selSet = [];
    drawHandles();
  }
  function drawHandles() {
    handlesG.innerHTML = '';
    if (selSet.length > 1) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      selSet.forEach(function (g) {
        const b = g.getBBox(), m = mat(g.getCTM());
        [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]].forEach(function (p) {
          const q = m.transformPoint({ x: p[0], y: p[1] });
          x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
        });
      });
      if (x0 === Infinity) return;
      const ol = el('rect', 'sv-outline');
      ol.setAttribute('x', x0); ol.setAttribute('y', y0);
      ol.setAttribute('width', x1 - x0); ol.setAttribute('height', y1 - y0);
      ol.setAttribute('pointer-events', 'none');
      handlesG.appendChild(ol);
      return;
    }
    if (!selected) return;
    const b = selected.getBBox();
    const m = mat(selected.getCTM());
    const P = {
      nw: [b.x, b.y], n: [b.x + b.width / 2, b.y], ne: [b.x + b.width, b.y],
      e: [b.x + b.width, b.y + b.height / 2], se: [b.x + b.width, b.y + b.height],
      s: [b.x + b.width / 2, b.y + b.height], sw: [b.x, b.y + b.height], w: [b.x, b.y + b.height / 2]
    };
    const U = {};
    for (const k in P) U[k] = m.transformPoint({ x: P[k][0], y: P[k][1] });
    const ol = el('polygon', 'sv-outline');
    ol.setAttribute('points', U.nw.x + ',' + U.nw.y + ' ' + U.ne.x + ',' + U.ne.y + ' ' + U.se.x + ',' + U.se.y + ' ' + U.sw.x + ',' + U.sw.y);
    handlesG.appendChild(ol);
    const hs = 9 / zoom;
    for (const k in U) {
      const r = el('rect', 'sv-handle');
      r.setAttribute('x', U[k].x - hs / 2); r.setAttribute('y', U[k].y - hs / 2);
      r.setAttribute('width', hs); r.setAttribute('height', hs);
      r.setAttribute('data-h', k);
      r.setAttribute('rx', hs / 4);
      handlesG.appendChild(r);
    }
    const cx = (U.nw.x + U.se.x) / 2, cy = (U.nw.y + U.se.y) / 2;
    const rot = el('circle', 'sv-rot');
    rot.setAttribute('cx', cx); rot.setAttribute('cy', U.n.y - 30 / zoom);
    rot.setAttribute('r', 5 / zoom);
    rot.setAttribute('data-rot', '1');
    handlesG.appendChild(rot);
    const ln = el('line', 'sv-outline');
    ln.setAttribute('x1', cx); ln.setAttribute('y1', U.n.y);
    ln.setAttribute('x2', cx); ln.setAttribute('y2', U.n.y - 30 / zoom);
    handlesG.appendChild(ln);
  }

  function onDown(e) {
    const t = e.target;
    if (t.getAttribute && t.getAttribute('data-rot')) { startRotate(e); return; }
    if (t.getAttribute && t.getAttribute('data-h')) { startResize(e, t.getAttribute('data-h')); return; }
    const item = t.closest ? t.closest('.sv-item') : null;

    if (item && currentTool !== 'eraser') {
      if (selSet.length > 1 && selSet.indexOf(item) >= 0) {
        drag = { type: 'move', start: pt(e), items: selSet.slice().map(function (n) { return { n: n, m0: getMatrix(n) }; }) };
      } else {
        selectItem(item);
        drag = { type: 'move', start: pt(e), items: [{ n: item, m0: getMatrix(item) }] };
      }
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      return;
    }
    if (currentTool === 'pen') { startPen(e); return; }
    if (currentTool === 'eraser') {
      drag = { type: 'erase' };
      eraseAt(e);
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      return;
    }
    clearSelection();
    if (currentTool === 'select') {
      drag = { type: 'pan', sx: e.clientX, sy: e.clientY, px: panX, py: panY };
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      return;
    }
  }
  function startResize(e, handle) {
    const b = selected.getBBox();
    const m = getMatrix(selected);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const cU = m.transformPoint({ x: cx, y: cy });
    drag = { type: 'resize', handle: handle, base: m, lc: { x: cx, y: cy }, cU: cU, b: b };
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
  }
  function startRotate(e) {
    const b = selected.getBBox();
    const m = getMatrix(selected);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const cU = m.transformPoint({ x: cx, y: cy });
    const top = m.transformPoint({ x: cx, y: b.y });
    drag = { type: 'rotate', base: m, cU: cU, rot0: Math.atan2(top.y - cU.y, top.x - cU.x), start: pt(e) };
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
  }
  function startPen(e) {
    const p = pt(e);
    const g = el('g', 'sv-item');
    penPath = el('path');
    penPath.setAttribute('d', 'M' + p.x + ' ' + p.y);
    penPath.setAttribute('fill', 'none');
    penPath.setAttribute('stroke', activeColor);
    penPath.setAttribute('stroke-width', 4 / zoom);
    penPath.setAttribute('stroke-linecap', 'round');
    penPath.setAttribute('stroke-linejoin', 'round');
    g.appendChild(penPath);
    setMatrix(g, new DOMMatrix([1, 0, 0, 1, 0, 0]));
    content.appendChild(g);
    selectItem(g);
    drag = { type: 'pen', last: p };
  }
  function onMove(e) {
    if (!drag) return;
    const p = pt(e);
    if (drag.type === 'move') {
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      drag.items.forEach(function (it) {
        setMatrix(it.n, new DOMMatrix([it.m0.a, it.m0.b, it.m0.c, it.m0.d, it.m0.e + dx, it.m0.f + dy]));
      });
      drawHandles();
    } else if (drag.type === 'pen') {
      const d = penPath.getAttribute('d') + ' L' + p.x + ' ' + p.y;
      penPath.setAttribute('d', d);
    } else if (drag.type === 'resize') {
      const b = drag.b, cU = drag.cU, base = drag.base;
      let ox = 0, oy = 0, h = drag.handle;
      if (h.indexOf('e') >= 0) ox = b.width / 2;
      if (h.indexOf('w') >= 0) ox = -b.width / 2;
      if (h.indexOf('s') >= 0) oy = b.height / 2;
      if (h.indexOf('n') >= 0) oy = -b.height / 2;
      const orig = base.transformPoint({ x: drag.lc.x + ox, y: drag.lc.y + oy });
      let sx = 1, sy = 1;
      if (ox !== 0) sx = (p.x - cU.x) / (orig.x - cU.x);
      if (oy !== 0) sy = (p.y - cU.y) / (orig.y - cU.y);
      if (ox !== 0 && oy !== 0) { const u = (sx + sy) / 2; sx = u; sy = u; }
      if (sx < 0.05) sx = 0.05; if (sy < 0.05) sy = 0.05;
      const t1 = new DOMMatrix().translate(cU.x, cU.y);
      const sc = new DOMMatrix().scale(sx, sy);
      const t2 = new DOMMatrix().translate(-cU.x, -cU.y);
      setMatrix(selected, t1.multiply(sc).multiply(t2).multiply(base));
      drawHandles();
    } else if (drag.type === 'rotate') {
      const ang = Math.atan2(p.y - drag.cU.y, p.x - drag.cU.x) - drag.rot0;
      const deg = ang * 180 / Math.PI;
      const t1 = new DOMMatrix().translate(drag.cU.x, drag.cU.y);
      const r = new DOMMatrix().rotate(deg);
      const t2 = new DOMMatrix().translate(-drag.cU.x, -drag.cU.y);
      setMatrix(selected, t1.multiply(r).multiply(t2).multiply(drag.base));
      drawHandles();
    } else if (drag.type === 'pan') {
      panX = drag.px + (e.clientX - drag.sx);
      panY = drag.py + (e.clientY - drag.sy);
      applyView();
    } else if (drag.type === 'erase') {
      eraseAt(e);
    }
  }
  function eraseAt(e) {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const item = t && t.closest ? t.closest('.sv-item') : null;
    if (item) {
      item.remove();
      if (selected === item) clearSelection();
      if (drag) drag.erased = true;
    }
  }
  function onUp(e) {
    if (drag) {
      if (drag.type === 'move' || drag.type === 'resize' || drag.type === 'rotate' || drag.type === 'pen') pushHistory();
      else if (drag.type === 'erase' && drag.erased) pushHistory();
      drag = null;
    }
  }

  function pushHistory() {
    history = history.slice(0, histIndex + 1);
    history.push(content.innerHTML);
    histIndex = history.length - 1;
    saveFrame();
  }
  function undo() {
    if (histIndex > 0) { histIndex--; content.innerHTML = history[histIndex]; clearSelection(); saveFrame(); }
  }
  function redo() {
    if (histIndex < history.length - 1) { histIndex++; content.innerHTML = history[histIndex]; clearSelection(); saveFrame(); }
  }
  function delSelected() {
    if (!selSet.length) return;
    selSet.forEach(function (n) { n.remove(); });
    clearSelection(); pushHistory();
  }

  function centerMatrix(w, h) {
    return new DOMMatrix([1, 0, 0, 1, DOC.w / 2 - w / 2, DOC.h / 2 - h / 2]);
  }
  function addBasic(kind) {
    const g = el('g', 'sv-item');
    const s = 140; let node;
    if (kind === 'rect') { node = el('rect'); node.setAttribute('width', s); node.setAttribute('height', s * 0.7); }
    else if (kind === 'ellipse') { node = el('ellipse'); node.setAttribute('rx', s / 2); node.setAttribute('ry', s / 2); node.setAttribute('cx', s / 2); node.setAttribute('cy', s / 2); }
    else { node = el('line'); node.setAttribute('x1', 0); node.setAttribute('y1', s / 2); node.setAttribute('x2', s); node.setAttribute('y2', s / 2); node.setAttribute('stroke-width', 6); }
    node.setAttribute('fill', kind === 'line' ? 'none' : activeColor);
    node.setAttribute('stroke', kind === 'line' ? activeColor : '#0002');
    g.appendChild(node);
    setMatrix(g, centerMatrix(s, s));
    content.appendChild(g); selectItem(g); pushHistory();
  }
  function addText(t) {
    if (!t) return;
    const g = el('g', 'sv-item');
    const txt = el('text');
    txt.textContent = t;
    txt.setAttribute('x', 0); txt.setAttribute('y', 0);
    txt.setAttribute('font-size', 48);
    txt.setAttribute('font-family', 'system-ui,sans-serif');
    txt.setAttribute('fill', activeColor);
    g.appendChild(txt);
    setMatrix(g, centerMatrix(0, 0));
    content.appendChild(g); selectItem(g); pushHistory();
  }
  function editText(t) {
    var rect = t.getBoundingClientRect();
    var ta = document.createElement('textarea');
    ta.value = t.textContent;
    var fs = parseFloat(getComputedStyle(t).fontSize) || 32;
    ta.style.cssText = 'position:fixed;z-index:10000;left:' + rect.left + 'px;top:' + rect.top + 'px;'
      + 'min-width:160px;font-size:' + fs + 'px;font-family:' + (t.getAttribute('font-family') || 'sans-serif') + ';'
      + 'color:' + (t.getAttribute('fill') || '#000') + ';border:2px solid #2196f3;outline:none;border-radius:4px;padding:2px 4px;resize:both;background:#fff;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    var done = false;
    function commit() {
      if (done) return; done = true;
      var v = ta.value, lines = v.split('\n');
      t.textContent = '';
      if (lines.length === 1) {
        t.textContent = v;
      } else {
        var lh = fs * 1.2, x0 = t.getAttribute('x') || 0;
        lines.forEach(function (ln, i) {
          var ts = document.createElementNS(SVGNS, 'tspan');
          ts.setAttribute('x', x0); ts.setAttribute('dy', i === 0 ? '0' : lh); ts.textContent = ln;
          t.appendChild(ts);
        });
      }
      ta.remove(); pushHistory();
    }
    function cancel() { if (done) return; done = true; ta.remove(); }
    ta.addEventListener('blur', commit);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
  }
  function addShapeFromDataURL(durl) {
    const b64 = durl.split(',')[1];
    const txt = b64ToText(b64);
    const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
    const inner = doc.documentElement;
    if (!inner || inner.nodeName.toLowerCase() !== 'svg') return;
    const g = el('g', 'sv-item');
    const vb = (inner.getAttribute('viewBox') || '0 0 1024 1024').split(/[\s,]+/).map(Number);
    const iw = vb[2] || 1024, ih = vb[3] || 1024;
    const size = 130;
    inner.setAttribute('width', size);
    inner.setAttribute('height', size * ih / iw);
    inner.setAttribute('x', 0); inner.setAttribute('y', 0);
    g.appendChild(inner);
    setMatrix(g, centerMatrix(size, size * ih / iw));
    content.appendChild(g); selectItem(g); pushHistory();
  }
  function pickImage() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = function () { addImage(rd.result); };
      rd.readAsDataURL(f);
    };
    inp.click();
  }
  function addImage(url) {
    const img = new Image();
    img.onload = function () {
      const w = Math.min(img.width, DOC.w * 0.7);
      const h = w * img.height / img.width;
      const g = el('g', 'sv-item');
      const im = el('image');
      im.setAttribute('href', url);
      im.setAttribute('width', w); im.setAttribute('height', h);
      im.setAttribute('x', 0); im.setAttribute('y', 0);
      g.appendChild(im);
      setMatrix(g, centerMatrix(w, h));
      content.appendChild(g); selectItem(g); pushHistory();
    };
    img.src = url;
  }

  function setActiveColor(c) {
    activeColor = c;
    const ac = document.getElementById('active-color');
    if (ac) ac.style.background = c;
    if (selected) {
      selected.setAttribute('fill', c);
      const filled = selected.querySelectorAll('rect,ellipse,path,text,circle,polygon');
      filled.forEach(function (n) { if (!n.hasAttribute('fill') || n.getAttribute('fill') === 'none') n.setAttribute('fill', c); });
      pushHistory();
    }
  }

  function unionBBox() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    content.querySelectorAll('.sv-item').forEach(function (g) {
      const b = g.getBBox(); const m = mat(g.getCTM());
      const ps = [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]];
      ps.forEach(function (p) {
        const q = m.transformPoint({ x: p[0], y: p[1] });
        x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
      });
    });
    if (x0 === Infinity) return { x: 0, y: 0, w: DOC.w, h: DOC.h };
    const pad = 2;
    return { x: x0 - pad, y: y0 - pad, w: (x1 - x0) + 2 * pad, h: (y1 - y0) + 2 * pad };
  }
  function svgString() {
    const bb = unionBBox();
    return '<svg xmlns="' + SVGNS + '" viewBox="' + bb.x + ' ' + bb.y + ' ' + bb.w + ' ' + bb.h + '" width="' + bb.w + '" height="' + bb.h + '">' + content.innerHTML + '</svg>';
  }
  function exportCurrentFrameSVG() { download(svgString(), 'frame.svg', 'image/svg+xml'); }
  function exportCurrentFramePNG() {
    const bb = unionBBox();
    const str = svgString();
    const blob = new Blob([str], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = function () {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(bb.w)); c.height = Math.max(1, Math.ceil(bb.h));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (b) { download(b, 'frame.png'); URL.revokeObjectURL(url); });
    };
    img.src = url;
  }
  function exportAllFramesSVG() {
    frames.forEach(function (h, i) {
      const s = '<svg xmlns="' + SVGNS + '" viewBox="0 0 ' + DOC.w + ' ' + DOC.h + '" width="' + DOC.w + '" height="' + DOC.h + '">' + h + '</svg>';
      download(s, 'frame_' + (i + 1) + '.svg', 'image/svg+xml');
    });
  }
  function exportAllFramesPNG() {
    frames.forEach(function (h, i) {
      const s = '<svg xmlns="' + SVGNS + '" viewBox="0 0 ' + DOC.w + ' ' + DOC.h + '" width="' + DOC.w + '" height="' + DOC.h + '">' + h + '</svg>';
      const blob = new Blob([s], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        const c = document.createElement('canvas');
        c.width = DOC.w; c.height = DOC.h;
        c.getContext('2d').drawImage(img, 0, 0, DOC.w, DOC.h);
        c.toBlob(function (b) { download(b, 'frame_' + (i + 1) + '.png'); URL.revokeObjectURL(url); });
      };
      img.src = url;
    });
  }

  function saveFrame() {
    frames[curFrame] = content.innerHTML;
    renderFrames();
  }
  function renderFrames() {
    return;
    const bar = document.querySelector('.bar-bottom');
    if (!bar) return;
    let list = document.getElementById('frameList');
    if (!list) {
      list = document.createElement('div');
      list.id = 'frameList';
      list.style.display = 'flex'; list.style.gap = '8px'; list.style.alignItems = 'center';
      const add = bar.querySelector('.mdui-ripple-white:last-child');
      bar.insertBefore(list, add);
    }
    list.innerHTML = '';
    frames.forEach(function (h, i) {
      const im = document.createElement('img');
      im.className = 'frame-thumb' + (i === curFrame ? ' on' : '');
      const s = '<svg xmlns="' + SVGNS + '" viewBox="0 0 ' + DOC.w + ' ' + DOC.h + '" width="65" height="65"><rect width="' + DOC.w + '" height="' + DOC.h + '" fill="#fff"/>' + h + '</svg>';
      im.src = 'data:image/svg+xml;base64,' + b64u(s);
      im.title = '帧 ' + (i + 1);
      im.onclick = function () { curFrame = i; content.innerHTML = frames[i]; clearSelection(); renderFrames(); };
      list.appendChild(im);
    });
  }

  function wireZoom() {
    const zi = document.getElementById('zoomInBtn');
    const zo = document.getElementById('zoomOutBtn');
    const zin = document.getElementById('zoomInput');
    window.__zoomInput = zin;
    if (zi) zi.onclick = function () { zoom *= 1.2; applyView(); };
    if (zo) zo.onclick = function () { zoom /= 1.2; applyView(); };
    if (zin) zin.addEventListener('change', function () {
      let v = parseFloat(zin.value);
      if (isNaN(v)) return;
      if (zin.value.indexOf('%') < 0 && v <= 20) v = v * 100;
      zoom = v / 100;
      applyView();
    });
    const ub = document.getElementById('undoBtn');
    const rb = document.getElementById('redoBtn');
    const db = document.getElementById('delBtn');
    if (ub) ub.onclick = undo;
    if (rb) rb.onclick = redo;
    if (db) db.onclick = delSelected;
  }
  function wirePanels() {
    document.querySelectorAll('#picsggd .card-item').forEach(function (card, i) {
      card.addEventListener('click', function () { addShapeFromDataURL(svgBase64List[i]); });
    });
    const tools = { '.c1aa': 'select', '.c2aa': 'select', '.pen': 'pen', '.eraser': 'eraser' };
    Object.keys(tools).forEach(function (sel) {
      const n = document.querySelector(sel);
      if (n) n.addEventListener('click', function () {
        currentTool = tools[sel];
        document.querySelectorAll('.c1aa,.c2aa,.pen,.eraser').forEach(function (x) { x.classList.remove('on'); });
        n.classList.add('on');
        if (currentTool !== 'select') clearSelection();
      });
    });
    const defTool = document.querySelector('.c1aa'); if (defTool) defTool.classList.add('on');
    document.querySelectorAll('.color-item').forEach(function (c) {
      c.addEventListener('click', function () { setActiveColor(c.style.backgroundColor); });
    });
    const layer = {
      '.ci01': 'up', '.ci02': 'down', '.ci03': 'top', '.ci04': 'bottom',
      '.ci05': 'flipH', '.ci06': 'flipV', '.ci07': 'del'
    };
    Object.keys(layer).forEach(function (sel) {
      const n = document.querySelector(sel);
      if (n) n.addEventListener('click', function () { layerOp(layer[sel]); });
    });
    const tabs = document.querySelectorAll('.panel-left .btnsl .mdui-btn');
    tabs.forEach(function (t) {
      const txt = (t.textContent || '').trim();
      if (txt.indexOf('文字') >= 0) t.addEventListener('click', function () { addText(prompt('输入文字：', '文字') || ''); });
      else if (txt.indexOf('上传') >= 0) t.addEventListener('click', pickImage);
    });
    const colorBtn = document.querySelector('.panel-right .mdui-btn-block');
    if (colorBtn) {
      colorBtn.textContent = '';
      const inp = document.createElement('input');
      inp.type = 'color'; inp.value = '#FF9900'; inp.style.width = '100%'; inp.style.height = '36px'; inp.style.border = 'none'; inp.style.background = 'none';
      inp.oninput = function () { setActiveColor(inp.value); };
      colorBtn.appendChild(inp);
    }
    const addBtn = document.querySelector('.editor-header .mdui-color-purple-300');
    if (addBtn) addBtn.onclick = function () { if (typeof showExportPopup === 'function') showExportPopup(); else addBasic('rect'); };
    if (content) content.style.userSelect = 'none';
    if (stage) stage.addEventListener('dblclick', function (e) {
      e.preventDefault();
      var t = e.target;
      if (!(t && t.nodeName && (t.nodeName.toLowerCase() === 'text' || t.nodeName.toLowerCase() === 'tspan'))) {
        t = document.elementFromPoint(e.clientX, e.clientY);
      }
      while (t && t !== stage && !(t.nodeName && t.nodeName.toLowerCase() === 'text')) t = t.parentNode;
      if (t && t.nodeName && t.nodeName.toLowerCase() === 'text') editText(t);
    }, true);
    document.addEventListener('click', closeCtxMenu);
    document.addEventListener('scroll', closeCtxMenu, true);
    if (stage) stage.addEventListener('contextmenu', function (e) {
      closeCtxMenu();
      var item = e.target && e.target.closest ? e.target.closest('.sv-item') : null;
      if (!item) return;
      e.preventDefault();
      selectItem(item);
      openCtxMenu(e.clientX, e.clientY, item);
    }, true);
    function closeCtxMenu() { var m = document.getElementById('ctxMenu'); if (m) m.remove(); }
    function openCtxMenu(x, y, item) {
      closeCtxMenu();
      var txt = item.querySelector('text');
      var m = document.createElement('div');
      m.id = 'ctxMenu';
      m.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;z-index:10001;background:#fff;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.2);padding:4px 0;min-width:140px;font:14px/1.4 sans-serif;color:#333;';
      m.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      var items = [
        { label: '\u5220\u9664', fn: function () { layerOp('del'); } },
        { label: '\u590d\u5236', fn: function () { copySelection(); } },
        { label: '\u526a\u5207', fn: function () { cutSelection(); } },
        'sep',
        { label: '\u7f16\u8f91\u6587\u672c', fn: function () { if (txt) editText(txt); }, disabled: !txt }
      ];
      items.forEach(function (it) {
        if (it === 'sep') { var s = document.createElement('div'); s.style.cssText = 'height:1px;background:#eee;margin:4px 0;'; m.appendChild(s); return; }
        var d = document.createElement('div');
        d.textContent = it.label;
        d.style.cssText = 'padding:8px 16px;cursor:' + (it.disabled ? 'default' : 'pointer') + ';white-space:nowrap;color:' + (it.disabled ? '#bbb' : '#333') + ';';
        if (!it.disabled) {
          d.onmouseenter = function () { d.style.background = '#f0f0f0'; };
          d.onmouseleave = function () { d.style.background = ''; };
          d.onclick = function () { closeCtxMenu(); it.fn(); };
        }
        m.appendChild(d);
      });
      document.body.appendChild(m);
    }
    const playBtn = document.querySelector('.play');
    if (playBtn) playBtn.addEventListener('click', function () {
      let i = 0; const id = setInterval(function () {
        content.innerHTML = frames[i % frames.length]; i++;
        if (i > frames.length * 2) { clearInterval(id); content.innerHTML = frames[curFrame] || ''; }
      }, 500);
    });
    wireResMenu();
  }
  function wireResMenu() {
    const menu = document.getElementById('resMenu');
    const cur = document.getElementById('resCurrent');
    const pop = document.getElementById('resPop');
    const apply = document.getElementById('resApply');
    const wInput = document.getElementById('resW');
    const hInput = document.getElementById('resH');
    if (!menu) return;
    const x = '\u00d7';
    apply.textContent = '\u786e\u5b9a';
    wInput.placeholder = '\u5bbd';
    hInput.placeholder = '\u9ad8';
    cur.textContent = DOC.w + x + DOC.h;
    cur.addEventListener('click', function (e) { e.stopPropagation(); pop.classList.toggle('open'); });
    pop.querySelectorAll('.res-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        const w = +opt.getAttribute('data-w'), h = +opt.getAttribute('data-h');
        setDocSize(w, h); cur.textContent = w + x + h; pop.classList.remove('open');
      });
    });
    apply.addEventListener('click', function () {
      const w = parseInt(wInput.value, 10), h = parseInt(hInput.value, 10);
      if (w > 0 && h > 0) { setDocSize(w, h); cur.textContent = w + x + h; }
      pop.classList.remove('open');
    });
    document.addEventListener('click', function (e) {
      if (menu && !menu.contains(e.target)) pop.classList.remove('open');
    });
  }
  function layerOp(op) {
    if (!selSet.length) return;
    selSet.forEach(function (g) {
      if (op === 'up' && g.nextElementSibling) content.insertBefore(g.nextElementSibling, g);
      else if (op === 'down' && g.previousElementSibling) content.insertBefore(g, g.previousElementSibling);
      else if (op === 'top') content.appendChild(g);
      else if (op === 'bottom') content.insertBefore(g, content.firstChild);
      else if (op === 'del') { g.remove(); }
      else if (op === 'flipH' || op === 'flipV') {
        const b = g.getBBox(); const cU = getMatrix(g).transformPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
        const M = getMatrix(g);
        const sx = op === 'flipH' ? -1 : 1, sy = op === 'flipV' ? -1 : 1;
        const t1 = new DOMMatrix().translate(cU.x, cU.y);
        const sc = new DOMMatrix().scale(sx, sy);
        const t2 = new DOMMatrix().translate(-cU.x, -cU.y);
        setMatrix(g, t1.multiply(sc).multiply(t2).multiply(M));
      }
    });
    if (op === 'del') clearSelection();
    drawHandles(); pushHistory();
  }

  function copySelection() {
    if (!selSet.length) return;
    clipboard = selSet.map(function (n) { return n.outerHTML; });
    tryOSClipboardWrite();
  }
  function cutSelection() {
    if (!selSet.length) return;
    copySelection();
    selSet.forEach(function (n) { n.remove(); });
    clearSelection(); pushHistory();
  }
  function pasteInternal() {
    if (!clipboard.length) return;
    const pasted = [];
    clipboard.forEach(function (html) {
      const svgTmp = el('svg');
      svgTmp.innerHTML = html;
      const node = svgTmp.firstChild;
      if (!node) return;
      content.appendChild(node);
      setMatrix(node, new DOMMatrix().translate(12, 12).multiply(getMatrix(node)));
      pasted.push(node);
    });
    if (pasted.length) { selSet = pasted; selected = pasted[0]; drawHandles(); pushHistory(); }
  }
  function pasteText(txt) {
    txt = (txt || '').trim();
    if (!txt) return;
    if (txt.indexOf('<svg') >= 0 || txt.indexOf('data:image/svg+xml') >= 0) {
      addShapeFromDataURL('data:image/svg+xml;charset=utf-8;base64,' + b64u(txt));
    } else {
      addText(txt);
    }
  }
  function pasteSelection() {
    if (navigator.clipboard && navigator.clipboard.read) {
      navigator.clipboard.read().then(function (items) {
        let handled = false;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const imgType = it.types && it.types.filter(function (t) { return t.indexOf('image/') === 0; })[0];
          if (imgType) {
            it.getType(imgType).then(function (blob) {
              const rd = new FileReader(); rd.onload = function () { addImage(rd.result); }; rd.readAsDataURL(blob);
            });
            handled = true; break;
          }
          if (it.types && it.types.indexOf('text/plain') >= 0) {
            it.getType('text/plain').then(function (blob) { blob.text().then(pasteText); });
            handled = true; break;
          }
        }
        if (!handled) pasteInternal();
      }).catch(function () { pasteInternal(); });
    } else {
      pasteInternal();
    }
  }
  function tryOSClipboardWrite() {
    if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') return;
    const svg = '<svg xmlns="' + SVGNS + '" viewBox="0 0 ' + DOC.w + ' ' + DOC.h + '">' + clipboard.join('') + '</svg>';
    try {
      navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([svg], { type: 'text/plain' }) })]);
    } catch (e) { }
  }
  function wireKeys() {
    window.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z') { e.preventDefault(); undo(); }
        else if (k === 'y') { e.preventDefault(); redo(); }
        else if (k === 'a') { e.preventDefault(); selectAll(); }
        else if (k === 'c') { e.preventDefault(); copySelection(); }
        else if (k === 'x') { e.preventDefault(); cutSelection(); }
        else if (k === 'v') { e.preventDefault(); pasteSelection(); }
      } else if (k === 'delete' || k === 'backspace') {
        e.preventDefault(); delSelected();
      }
    });
  }

  function init() {
    injectStyle();
    buildEditor();
    setDocSize(DOC.w, DOC.h);
    frames = [''];
    curFrame = 0;
    renderFrames();
    wireZoom();
    wirePanels();
    wireKeys();
    clearSelection();
    history = ['']; histIndex = 0;
    setTimeout(fit, 50);
  }

  window.svgString = svgString;
  window.exportCurrentFramePNG = exportCurrentFramePNG;
  window.exportCurrentFrameSVG = exportCurrentFrameSVG;
  window.exportAllFramesPNG = exportAllFramesPNG;
  window.exportAllFramesSVG = exportAllFramesSVG;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
