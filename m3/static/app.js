/* 导播控制台 前端逻辑 */
let config = null;
let currentSid = null;
let statuses = {};
let streamDetail = null;
let imgCache = {};
let previewDirty = false;

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function num(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}
function emptyToNull(v) {
  const t = String(v == null ? '' : v).trim();
  return t === '' ? null : parseInt(t, 10);
}

async function api(url, method, body) {
  const opt = { method: method || 'GET', headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(url, opt);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || !j.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
  return j.data;
}
function toast(msg) {
  try { mdui.snackbar(String(msg)); } catch (e) { alert(msg); }
}
function confirmDialog(msg, okText) {
  return new Promise(resolve => {
    let done = false;
    let d = null;
    const finish = v => {
      if (done) return;
      done = true;
      try { d.close(); } catch (e) {}
      resolve(v);
    };
    d = mdui.dialog({
      title: '确认操作',
      content: msg,
      buttons: [
        { text: '取消', onClick: () => finish(false) },
        { text: okText || '确定', bold: true, onClick: () => finish(true) }
      ],
      history: false
    });
  });
}
function statusText(s) {
  return { stopped: '已停止', starting: '启动中', running: '运行中', crashed: '已崩溃' }[s] || s;
}
function fmtUptime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h > 0 ? h + 'h ' : '') + m + 'm ' + s + 's';
}

/* ---------- 对话框 ---------- */
let dlgNew, dlgSettings, dlgLayer;
function initDialogs() {
  dlgNew = new mdui.Dialog('#newStreamDialog', { history: false });
  dlgSettings = new mdui.Dialog('#settingsDialog', { history: false });
  dlgLayer = new mdui.Dialog('#addLayerDialog', { history: false });
}

/* ---------- 加载与渲染 ---------- */
async function loadConfig() {
  config = await api('/api/config');
  if (currentSid && !config.streams.find(s => s.sid === currentSid)) currentSid = null;
  if (!currentSid && config.streams.length) currentSid = config.streams[0].sid;
  renderSidebar();
  await loadDetail();
  updateGlobalStatus();
  refreshStatus();
}

function renderSidebar() {
  const ul = $('#streamList');
  ul.innerHTML = config.streams.map(s => {
    const st = statuses[s.sid] || { status: 'stopped' };
    return '<li class="mdui-list-item sid-item ' + (s.sid === currentSid ? 'active' : '') + '" data-sid="' + s.sid + '">' +
      '<div class="mdui-list-item-content" style="min-width:0">' +
      '<span class="sid-name">' + esc(s.name) + '</span>' +
      '<div class="sid-meta"><span class="dot ' + st.status + '"></span>' +
      esc(s.rtmp || '未设置RTMP') + ' · ' + s.width + 'x' + s.height + ' · ' + s.layer_count + '层</div>' +
      '</div>' +
      '<button class="mdui-btn mdui-btn-icon sid-del" title="删除"><i style="font-style:normal;color:#f44336">✕</i></button>' +
      '</li>';
  }).join('') || '<li class="mdui-list-item"><span style="color:#999">暂无推流，点击下方新建</span></li>';

  $$('.sid-item', ul).forEach(li => {
    li.addEventListener('click', e => {
      if (e.target.closest('.sid-del')) { e.stopPropagation(); delStream(li.dataset.sid); return; }
      if (li.dataset.sid !== currentSid) selectStream(li.dataset.sid);
    });
  });
}

function updateGlobalStatus() {
  const n = Object.values(statuses).filter(s => s.status === 'running').length;
  $('#globalStatus').textContent = config ? ('运行中 ' + n + '/' + config.streams.length) : '';
}

async function selectStream(sid) {
  currentSid = sid;
  renderSidebar();
  await loadDetail();
  refreshStatus();
}

async function loadDetail() {
  if (!currentSid) {
    $('#detail').innerHTML = '<div class="card empty"><div class="big">＋</div><div>没有推流实例<br>点击左侧"新建推流"创建</div></div>';
    streamDetail = null;
    return;
  }
  const data = await api('/api/streams/' + currentSid);
  streamDetail = data;
  renderDetail(data);
  ensureImages();
  previewDirty = true;
}

/* ---------- 详情页 ---------- */
function renderDetail(d) {
  const st = d.stream;
  const status = d.status || { status: 'stopped' };
  const layerList = st.layers.map((l, i) => layerHTML(l, i, st.layers.length)).join('') ||
    '<div class="empty"><div class="big">—</div>暂无图层</div>';

  $('#detail').innerHTML =
    '<div class="row" style="align-items:flex-start">' +
    '<div style="flex:1.5;min-width:0">' +

    '<div class="card">' +
    '<div class="card-title">基本信息</div>' +
    '<div class="row">' +
    '<div class="mdui-textfield col"><label class="mdui-textfield-label">名称</label><input class="mdui-textfield-input" id="info-name" value="' + esc(st.name) + '"></div>' +
    '<div class="mdui-textfield col"><label class="mdui-textfield-label">RTMP 地址</label><input class="mdui-textfield-input" id="info-rtmp" value="' + esc(st.rtmp) + '"></div>' +
    '<div class="mdui-textfield col"><label class="mdui-textfield-label">推流码 key</label><input class="mdui-textfield-input" id="info-key" value="' + esc(st.key) + '"></div>' +
    '</div>' +
    '<div class="row" style="margin-top:14px;align-items:center">' +
    '<div class="mdui-textfield col"><label class="mdui-textfield-label">宽</label><input class="mdui-textfield-input" id="res-w" type="number" value="' + st.width + '"></div>' +
    '<div class="mdui-textfield col"><label class="mdui-textfield-label">高</label><input class="mdui-textfield-input" id="res-h" type="number" value="' + st.height + '"></div>' +
    '<div class="col"><button class="mdui-btn mdui-btn-raised mdui-color-orange-600" data-act="apply-res">应用分辨率（重启）</button></div>' +
    '<div class="col"><button class="mdui-btn mdui-btn-raised mdui-color-indigo" data-act="save-stream">保存基本信息</button></div>' +
    '</div>' +
    '<div class="hint" style="margin-top:10px">修改地址 / key / 分辨率 / 图层时，正在运行的推流会自动重启。</div>' +
    '</div>' +

    '<div class="card">' +
    '<div class="card-title">推流控制</div>' +
    '<div class="row">' +
    '<button class="mdui-btn mdui-btn-raised mdui-color-green-600" data-act="start" id="btnStart">开启推流</button>' +
    '<button class="mdui-btn mdui-btn-raised mdui-color-red-600" data-act="stop" id="btnStop">终止推流</button>' +
    '<button class="mdui-btn mdui-btn-raised" data-act="restart" id="btnRestart">重启推流</button>' +
    '</div>' +
    '<div class="status-line" id="statusBox" style="margin-top:12px"></div>' +
    '</div>' +

    '<div class="card">' +
    '<div class="card-title">图层列表 <span class="right">列表中越靠上越顶层；"上移"将其置于更高层</span></div>' +
    '<div id="layerList">' + layerList + '</div>' +
    '<button class="mdui-btn mdui-btn-raised mdui-color-indigo" data-act="add-layer" style="margin-top:10px">+ 添加图层</button>' +
    '</div>' +
    '<div class="card">' +
    '<div class="card-title">ffmpeg 日志 <span class="right">显示最后 200 行，每 2 秒刷新</span></div>' +
    '<pre id="ffmpegLog" class="fflog">加载中…</pre>' +
    '</div>' +
    '</div>' +

    '<div style="flex:1;min-width:0">' +
    '<div class="card">' +
    '<div class="card-title">图层预览 <span class="right">图片=实图 / 媒体=红框标识</span></div>' +
    '<div class="preview-wrap"><canvas id="previewCanvas"></canvas></div>' +
    '<div class="preview-tip">分辨率 ' + st.width + '×' + st.height + '（缩放显示，左上角为 0,0）</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  mdui.updateTextFields();
  $$('#layerList select.mdui-select').forEach(el => { try { new mdui.Select(el); } catch (e) {} });
  renderStatusBox($('#statusBox'), status);
}

function layerHTML(l, i, total) {
  const media = l.type === 'media';
  const modeOpts = [['single', '单文件'], ['folder', '文件夹循环'], ['list', '指定列表']]
    .map(m => '<option value="' + m[0] + '"' + (l.mode === m[0] ? ' selected' : '') + '>' + m[1] + '</option>').join('');
  const id = l.id;
  return '<div class="layer-item" data-lid="' + id + '">' +
    '<div class="layer-head">' +
    '<span class="badge ' + l.type + '">' + (media ? '媒体' : '图片') + '</span>' +
    '<span class="name">' + esc(l.name || '(未命名)') + '</span>' +
    (l.chroma ? '<span class="badge chroma">抠图</span>' : '') +
    (l.enabled ? '' : '<span class="badge" style="background:#9e9e9e">隐藏</span>') +
    '<div style="margin-left:auto"><button class="mdui-btn mdui-btn-dense" data-act="down">下移</button>' +
    '<button class="mdui-btn mdui-btn-dense" data-act="up">上移</button></div>' +
    '</div>' +
    '<div class="src-text">' + esc(l.source || '') + '</div>' +
    '<div class="layer-grid">' +
    '<div><div class="mdui-textfield-label">名称</div><input id="ly-' + id + '-name" type="text" value="' + esc(l.name) + '"></div>' +
    '<div><div class="mdui-textfield-label">X</div><input id="ly-' + id + '-x" type="number" value="' + l.x + '"></div>' +
    '<div><div class="mdui-textfield-label">Y</div><input id="ly-' + id + '-y" type="number" value="' + l.y + '"></div>' +
    '<div><div class="mdui-textfield-label">宽(留空自动)</div><input id="ly-' + id + '-w" type="number" value="' + (l.width == null ? '' : l.width) + '"></div>' +
    '<div><div class="mdui-textfield-label">高(留空自动)</div><input id="ly-' + id + '-h" type="number" value="' + (l.height == null ? '' : l.height) + '"></div>' +
    (media ?
      '<div><div class="mdui-textfield-label">播放方式</div><select class="mdui-select" id="ly-' + id + '-mode">' + modeOpts + '</select></div>' +
      '<div><div class="mdui-textfield-label">循环</div><label class="mdui-switch"><input type="checkbox" id="ly-' + id + '-loop"' + (l.loop ? ' checked' : '') + '><i class="mdui-switch-icon"></i></label></div>'
      : '') +
    '</div>' +
    '<div class="layer-actions">' +
    '<label class="mdui-switch"><input type="checkbox" id="ly-' + id + '-enabled"' + (l.enabled ? ' checked' : '') + '><i class="mdui-switch-icon"></i>启用</label>' +
    '<label class="mdui-switch"><input type="checkbox" id="ly-' + id + '-chroma"' + (l.chroma ? ' checked' : '') + '><i class="mdui-switch-icon"></i>抠图</label>' +
    '<input type="color" id="ly-' + id + '-chroma-color" value="' + esc(l.chroma_color || '#00FF00') + '" style="width:36px;height:28px;border:none;cursor:pointer;vertical-align:middle" title="抠图颜色">' +
    '<span class="hint" style="margin:0">强度</span><input type="range" id="ly-' + id + '-chroma-int" min="0" max="100" value="' + l.chroma_intensity + '" style="width:110px;vertical-align:middle">' +
    '<span class="spacer"></span>' +
    '<button class="mdui-btn mdui-btn-dense mdui-color-red-600" data-act="del">删除</button>' +
    '<button class="mdui-btn mdui-btn-dense mdui-color-indigo" data-act="save">保存修改</button>' +
    '</div>' +
    '</div>';
}

function renderStatusBox(box, status) {
  if (!box) return;
  const st = status || { status: 'stopped' };
  box.innerHTML =
    '<div>状态：<b class="st-' + st.status + '">' + statusText(st.status) + '</b>　PID：' + (st.pid || '-') +
    '　运行：' + fmtUptime(st.uptime || 0) + '　已重启：' + (st.restarts || 0) + '次</div>' +
    (st.last_error ? '<div class="err-text">错误：' + esc(st.last_error) + '</div>' : '');
  const b1 = $('#btnStart'), b2 = $('#btnStop'), b3 = $('#btnRestart');
  if (b1) b1.disabled = (st.status === 'running' || st.status === 'starting');
  if (b2) b2.disabled = !(st.status === 'running' || st.status === 'starting');
  if (b3) b3.disabled = !(st.status === 'running' || st.status === 'crashed');
}

/* ---------- 图层操作 ---------- */
function layerById(lid) {
  if (!streamDetail) return null;
  return streamDetail.stream.layers.find(l => l.id === lid) || null;
}

async function saveLayer(lid) {
  const root = document.querySelector('.layer-item[data-lid="' + lid + '"]');
  if (!root) return;
  const v = id => { const el = $('#ly-' + lid + '-' + id, root); return el ? el.value : null; };
  const c = id => { const el = $('#ly-' + lid + '-' + id, root); return el ? el.checked : false; };
  const l = layerById(lid);
  const patch = {
    name: v('name'), x: num(v('x')), y: num(v('y')),
    width: emptyToNull(v('w')), height: emptyToNull(v('h')),
    enabled: c('enabled'), chroma: c('chroma'),
    chroma_color: v('chroma-color'), chroma_intensity: num(v('chroma-int'))
  };
  if (l && l.type === 'media') { patch.mode = v('mode'); patch.loop = c('loop'); }
  try {
    await api('/api/streams/' + currentSid + '/layers/' + lid, 'PUT', patch);
    toast('图层已保存，推流已自动重启');
    await loadDetail();
  } catch (e) { toast(e.message); }
}

async function delLayer(lid) {
  const ok = await confirmDialog('确定删除该图层？', '删除');
  if (!ok) return;
  try {
    await api('/api/streams/' + currentSid + '/layers/' + lid, 'DELETE');
    toast('图层已删除，推流已自动重启');
    await loadDetail();
  } catch (e) { toast(e.message); }
}

async function moveLayer(lid, direction) {
  try {
    await api('/api/streams/' + currentSid + '/layers/' + lid + '/move', 'POST', { direction: direction });
    await loadDetail();
  } catch (e) { toast(e.message); }
}

/* ---------- 推流控制 ---------- */
async function controlStream(act) {
  try {
    await api('/api/streams/' + currentSid + '/' + act, 'POST', {});
    await loadDetail();
    refreshStatus();
  } catch (e) { toast(e.message); }
}

async function saveStreamInfo() {
  const patch = {
    name: $('#info-name').value.trim(),
    rtmp: $('#info-rtmp').value.trim(),
    key: $('#info-key').value.trim()
  };
  try {
    await api('/api/streams/' + currentSid, 'PUT', patch);
    toast('基本信息已保存');
    await loadConfig();
  } catch (e) { toast(e.message); }
}

async function applyResolution() {
  const w = num($('#res-w').value), h = num($('#res-h').value);
  try {
    await api('/api/streams/' + currentSid + '/resolution', 'POST', { width: w, height: h });
    toast('分辨率已修改，推流已重启');
    await loadDetail();
    refreshStatus();
  } catch (e) { toast(e.message); }
}

/* ---------- 新建 / 删除 推流 ---------- */
function openNewStream() {
  const def = (config.settings.default_rtmp || '').trim();
  $('#ns-name').value = '';
  $('#ns-rtmp').value = def;
  $('#ns-key').value = '';
  $('#defaultRtmpHint').textContent = def ? '已使用设置中的默认 RTMP：' + def + '（可修改）' : '未设置默认 RTMP，请输入地址（可在"设置"中配置后自动填充）';
  dlgNew.open();
}
async function createStream() {
  const name = $('#ns-name').value.trim();
  const rtmp = $('#ns-rtmp').value.trim();
  const key = $('#ns-key').value.trim();
  if (!rtmp) { toast('请填写 RTMP 地址'); return; }
  try {
    const data = await api('/api/streams', 'POST', { name: name || ('推流 ' + Date.now() % 10000), rtmp: rtmp, key: key });
    dlgNew.close();
    currentSid = data.sid;
    await loadConfig();
  } catch (e) { toast(e.message); }
}
async function delStream(sid) {
  const ok = await confirmDialog('确定删除该推流实例？正在运行的推流将被终止。', '删除');
  if (!ok) return;
  try {
    await api('/api/streams/' + sid, 'DELETE');
    toast('已删除');
    await loadConfig();
  } catch (e) { toast(e.message); }
}

/* ---------- 设置 ---------- */
function openSettings() {
  const s = config.settings;
  $('#st-rtmp').value = s.default_rtmp || '';
  $('#st-port').value = s.port;
  $('#st-ffmpeg').value = s.ffmpeg_path || '';
  $('#st-bitrate').value = s.default_bitrate;
  $('#st-fps').value = s.default_fps;
  $('#st-loglevel').value = s.loglevel || 'warning';
  $('#st-autorestart').checked = !!s.auto_restart;
  try { new mdui.Select($('#st-loglevel')); } catch (e) {}
  dlgSettings.open();
}
async function saveSettings() {
  const body = {
    default_rtmp: $('#st-rtmp').value.trim(),
    port: num($('#st-port').value) || 5000,
    ffmpeg_path: $('#st-ffmpeg').value.trim(),
    default_bitrate: num($('#st-bitrate').value) || 2500,
    default_fps: num($('#st-fps').value) || 25,
    auto_restart: $('#st-autorestart').checked,
    loglevel: $('#st-loglevel').value
  };
  try {
    await api('/api/settings', 'PUT', body);
    dlgSettings.close();
    toast('设置已保存（端口需重启程序后生效）');
    await loadConfig();
  } catch (e) { toast(e.message); }
}

/* ---------- 添加图层 ---------- */
function openLayerDialog() {
  $('#al-name').value = '';
  $('#al-source').value = '';
  $('#al-list').value = '';
  $('#al-type').value = 'media';
  $('#al-mode').value = 'single';
  $('#al-loop').checked = true;
  $('#al-x').value = 0;
  $('#al-y').value = 0;
  $('#al-w').value = '';
  $('#al-h').value = '';
  $('#al-chroma').checked = false;
  $('#al-chroma-color').value = '#00FF00';
  $('#al-chroma-intensity').value = 20;
  $('#al-chroma-val').textContent = '20';
  updateLayerDialogVisibility();
  dlgLayer.open();
}
function updateLayerDialogVisibility() {
  const media = $('#al-type').value === 'media';
  $('#al-mode-row').style.display = media ? 'flex' : 'none';
  $('#al-loop').closest('.mdui-textfield').parentElement.style.display = media ? 'block' : 'none';
  const isList = media && $('#al-mode').value === 'list';
  $('#al-list-wrap').style.display = isList ? 'block' : 'none';
  $('#al-source').parentElement.style.display = isList ? 'none' : 'block';
  $('#al-src-label').textContent = isList ? '' : (media ? '素材路径（视频文件）' : '图片路径（支持透明 PNG）');
  $('#al-chroma-wrap').style.display = $('#al-chroma').checked ? 'block' : 'none';
}
async function addLayer() {
  const type = $('#al-type').value;
  const mode = $('#al-mode').value;
  const source = (mode === 'list' ? $('#al-list').value.trim() : $('#al-source').value.trim());
  if (!source) { toast('请填写素材路径或文件列表'); return; }
  const layer = {
    type: type,
    name: $('#al-name').value.trim(),
    mode: mode,
    loop: $('#al-loop').checked,
    source: source,
    x: num($('#al-x').value), y: num($('#al-y').value),
    width: emptyToNull($('#al-w').value), height: emptyToNull($('#al-h').value),
    chroma: $('#al-chroma').checked,
    chroma_color: $('#al-chroma-color').value,
    chroma_intensity: num($('#al-chroma-intensity').value)
  };
  try {
    await api('/api/streams/' + currentSid + '/layers', 'POST', layer);
    dlgLayer.close();
    toast('图层已添加，推流已自动重启');
    await loadDetail();
  } catch (e) { toast(e.message); }
}

/* ---------- 预览 ---------- */
function ensureImages() {
  if (!streamDetail) return;
  streamDetail.stream.layers.forEach(l => {
    if (l.type === 'image' && l.enabled && l.source && !imgCache[l.source]) {
      const im = new Image();
      im.onload = () => { previewDirty = true; };
      im.onerror = () => { imgCache[l.source] = null; };
      im.src = '/api/preview/img?path=' + encodeURIComponent(l.source);
      imgCache[l.source] = im;
    }
  });
}
function drawPreview() {
  if (!streamDetail) return;
  const st = streamDetail.stream;
  const cv = $('#previewCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  cv.width = st.width;
  cv.height = st.height;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, cv.width, cv.height);

  st.layers.forEach(l => {
    if (!l.enabled) return;
    if (l.type === 'image') {
      const img = imgCache[l.source];
      let w = l.width, h = l.height;
      if (img && img.complete && img.naturalWidth) {
        if (!w && !h) {
          const sc = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
          w = img.naturalWidth * sc; h = img.naturalHeight * sc;
        } else if (w && !h) h = Math.round(w * img.naturalHeight / img.naturalWidth);
        else if (!w && h) w = Math.round(h * img.naturalWidth / img.naturalHeight);
        ctx.drawImage(img, l.x, l.y, w, h);
        if (l.chroma) {
          ctx.fillStyle = 'rgba(255,235,59,.22)';
          ctx.fillRect(l.x, l.y, w, h);
          ctx.strokeStyle = '#ffeb3b';
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(l.x, l.y, w, h);
          ctx.setLineDash([]);
        }
      } else {
        ctx.strokeStyle = '#9e9e9e';
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(l.x, l.y, w || 120, h || 80);
        ctx.setLineDash([]);
      }
    } else {
      const w = l.width || Math.min(320, cv.width * 0.5);
      const h = l.height || Math.round(w * 9 / 16);
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 3;
      ctx.strokeRect(l.x, l.y, w, h);
      ctx.fillStyle = '#f44336';
      ctx.font = '13px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.fillText((l.name || '媒体') + ' · ' + (l.mode || 'single'), l.x + 6, l.y + 18);
      if (l.chroma) {
        ctx.fillStyle = '#ffeb3b';
        ctx.fillText('抠图', l.x + w - 36, l.y + 18);
      }
    }
  });
  previewDirty = false;
}

/* ---------- 状态轮询 ---------- */
async function refreshStatus() {
  if (!config) return;
  const list = config.streams;
  await Promise.all(list.map(async s => {
    try { statuses[s.sid] = await api('/api/streams/' + s.sid + '/status'); }
    catch (e) { statuses[s.sid] = { status: 'stopped' }; }
  }));
  $$('.sid-item').forEach(li => {
    const st = statuses[li.dataset.sid] || {};
    const dot = $('.dot', li);
    if (dot) dot.className = 'dot ' + (st.status || 'stopped');
  });
  updateGlobalStatus();
  if (currentSid && streamDetail) {
    renderStatusBox($('#statusBox'), statuses[currentSid]);
  }
  if (currentSid) refreshLog();
  if (previewDirty) drawPreview();
}

let logTail = '';
async function refreshLog() {
  const pre = $('#ffmpegLog');
  if (!pre) return;
  try {
    const d = await api('/api/streams/' + currentSid + '/log?lines=200');
    const text = d.lines.join('\n');
    if (text !== logTail) {
      logTail = text;
      pre.textContent = text || '（暂无输出）';
      pre.scrollTop = pre.scrollHeight;
    }
  } catch (e) {}
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  $('#btnNewStream').addEventListener('click', openNewStream);
  $('#btnSettings').addEventListener('click', openSettings);
  $('#ns-ok').addEventListener('click', createStream);
  $('#st-ok').addEventListener('click', saveSettings);
  $('#al-ok').addEventListener('click', addLayer);

  $('#al-type').addEventListener('change', updateLayerDialogVisibility);
  $('#al-mode').addEventListener('change', updateLayerDialogVisibility);
  $('#al-chroma').addEventListener('change', updateLayerDialogVisibility);
  $('#al-chroma-intensity').addEventListener('input', e => { $('#al-chroma-val').textContent = e.target.value; });

  $('#detail').addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'start' || act === 'stop' || act === 'restart') await controlStream(act);
    else if (act === 'apply-res') await applyResolution();
    else if (act === 'save-stream') await saveStreamInfo();
    else if (act === 'add-layer') openLayerDialog();
    else if (act === 'save') await saveLayer(btn.closest('.layer-item').dataset.lid);
    else if (act === 'del') await delLayer(btn.closest('.layer-item').dataset.lid);
    else if (act === 'up' || act === 'down') await moveLayer(btn.closest('.layer-item').dataset.lid, act);
  });
}

/* ---------- 启动 ---------- */
async function init() {
  initDialogs();
  bindEvents();
  try {
    await loadConfig();
  } catch (e) {
    toast('加载失败：' + e.message);
  }
  setInterval(refreshStatus, 2000);
}
document.addEventListener('DOMContentLoaded', init);