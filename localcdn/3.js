let utils = {};
try { utils = (typeof require === 'function' && require('utils')) || {}; } catch (e) { utils = {}; }

function b64(str) {
  var bytes = new TextEncoder().encode(str), bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

var ICON = 'data:image/svg+xml;charset=utf-8;base64,' + b64(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect x="8" y="10" width="48" height="34" rx="4" fill="#27AE60"/>' +
  '<rect x="12" y="14" width="40" height="26" rx="2" fill="#0f3d2e"/>' +
  '<rect x="17" y="19" width="22" height="3" rx="1.5" fill="#9be8c2"/>' +
  '<rect x="17" y="25" width="32" height="2.6" rx="1.3" fill="#5fbf90"/>' +
  '<rect x="17" y="30" width="26" height="2.6" rx="1.3" fill="#5fbf90"/>' +
  '<rect x="29" y="44" width="6" height="5" fill="#27AE60"/>' +
  '<rect x="22" y="49" width="20" height="3.5" rx="1.75" fill="#27AE60"/>' +
  '</svg>');
var ICON_S = 'data:image/svg+xml;charset=utf-8;base64,' + b64(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect x="7" y="9" width="50" height="36" rx="5" fill="#2D9CDB"/>' +
  '<rect x="12" y="14" width="40" height="26" rx="2" fill="#0b2a4a"/>' +
  '<rect x="17" y="19" width="22" height="3" rx="1.5" fill="#bfe6ff"/>' +
  '<rect x="17" y="25" width="32" height="2.6" rx="1.3" fill="#5aa9e0"/>' +
  '<rect x="17" y="30" width="26" height="2.6" rx="1.3" fill="#5aa9e0"/>' +
  '<rect x="29" y="45" width="6" height="5" fill="#2D9CDB"/>' +
  '<rect x="22" y="50" width="20" height="3.5" rx="1.75" fill="#2D9CDB"/>' +
  '</svg>');

function devType() {
  try { var u = navigator.userAgent||''; if (/iPad|Tablet/i.test(u)) return '平板'; if (/Android/i.test(u)&&!/Mobile/i.test(u)) return '平板'; if (/Mobi|Android|iPhone/i.test(u)) return '手机'; return '电脑'; } catch(e){return '电脑';}
}
function devModel() {
  try { var u = navigator.userAgent||'', m; if((m=u.match(/Windows NT ([\d.]+)/))){ var n='Windows'; if(m[1]==='10.0') n='Windows 10/11'; return n+(/Win64|x64/.test(u)?' 64位':''); } if((m=u.match(/Mac OS X ([\d_]+)/))) return 'macOS '+m[1].replace(/_/g,'.'); if((m=u.match(/Android ([\d.]+)/))) return 'Android '+m[1]; if(/iPhone/.test(u)) return 'iPhone'; if(/iPad/.test(u)) return 'iPad'; return '未知设备'; } catch(e){return '未知设备';}
}

var _fps = 0, _hud = null, _rafId = 0, _fcount = 0, _t0 = 0, _timer = 0, _fpsRunning = false;
function _fpsTick() { _fcount++; _rafId = requestAnimationFrame(_fpsTick); }
function _fpsSample() {
  var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (!_t0) { _t0 = now; _fcount = 0; return; }
  var dt = now - _t0;
  if (dt >= 250) {
    _fps = Math.round(_fcount * 1000 / dt);
    _fcount = 0; _t0 = now;
    if (_hud && _hud.parentNode) _hud.textContent = 'FPS ' + _fps;
  }
}
function startFps() {
  if (_fpsRunning) return;
  _fpsRunning = true; _fcount = 0; _t0 = 0;
  try { if (typeof requestAnimationFrame === 'function') _rafId = requestAnimationFrame(_fpsTick); } catch (e) {}
  try { _timer = setInterval(_fpsSample, 250); } catch (e) {}
}
function showFps() {
  startFps();
  try {
    var e = document.getElementById('ke-fps-hud');
    if (!e) {
      e = document.createElement('div');
      e.id = 'ke-fps-hud';
      e.style.cssText = 'position:fixed;left:12px;top:12px;z-index:2147483647;font:bold 14px/1.2 monospace;color:#fff;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:6px;pointer-events:none;';
      (document.body || document.documentElement).appendChild(e);
    }
    _hud = e;
    _hud.style.display = 'block';
    _hud.textContent = 'FPS ' + _fps;
  } catch (e) {}
}
function hideFps() {
  if (_hud && _hud.parentNode) { try { _hud.parentNode.removeChild(_hud); } catch (e) {} _hud = null; }
}

exports.extension = {
  format:'KE', type:'BENJI_EXTENSION', title:'本机', subtitle:'Device / System',
  icon:{ normal:ICON, selected:ICON_S },
  methods:[
    { type:'general_show_fps', color:'#F2994A', colour:'#F2994A', message0:'显示当前帧率', args0:[],
      function:function(){ showFps(); } },
    { type:'general_fps', color:'#F2994A', colour:'#F2994A', message0:'当前帧率 (FPS)', args0:[],
      output:'Number', function:function(){ startFps(); return _fps; } },
    { type:'general_hide_fps', color:'#F2994A', colour:'#F2994A', message0:'隐藏帧率显示', args0:[],
      function:function(){ hideFps(); } },

    { type:'general_device_type', color:'#2D9CDB', colour:'#2D9CDB', message0:'运行设备类型', args0:[], output:'String',
      function:function(){ return devType(); } },
    { type:'general_device_model', color:'#2D9CDB', colour:'#2D9CDB', message0:'设备型号', args0:[], output:'String',
      function:function(){ return devModel(); } },
    { type:'general_cpu_cores', color:'#2D9CDB', colour:'#2D9CDB', message0:'CPU 核心数', args0:[], output:'Number',
      function:function(){ return navigator.hardwareConcurrency||0; } },
    { type:'general_screen', color:'#2D9CDB', colour:'#2D9CDB', message0:'屏幕分辨率', args0:[], output:'String',
      function:function(){ try{return window.screen?window.screen.width+'×'+window.screen.height:'未知';}catch(e){return'未知';} } },
    { type:'general_touch', color:'#2D9CDB', colour:'#2D9CDB', message0:'是否触屏', args0:[], output:'Number',
      function:function(){ return (navigator.maxTouchPoints||0)>0?1:0; } },
    { type:'general_online', color:'#2D9CDB', colour:'#2D9CDB', message0:'是否联网', args0:[], output:'Number',
      function:function(){ return navigator.onLine===true?1:0; } },
    { type:'general_language', color:'#2D9CDB', colour:'#2D9CDB', message0:'系统语言', args0:[], output:'String',
      function:function(){ return navigator.language||'未知'; } },

    { type:'general_total_memory', color:'#27AE60', colour:'#27AE60', message0:'运行内存总量 (GB)', args0:[], output:'Number',
      function:function(){ return navigator.deviceMemory||0; } },

    { type:'general_extension_count', color:'#8E44AD', colour:'#8E44AD', message0:'导入扩展的数量', args0:[], output:'Number',
      function:function(){ try{if(typeof window.__keLoadExts!=='function')return 0;var r=window.__keLoadExts();if(r&&typeof r.then==='function')return 0;return(Array.isArray(r)?r.length:0);}catch(e){return 0;} } }
  ],
  events:[],
  toolbox:[
    { type:'label', text:'帧率 (FPS)' },
    { type:'method', block:'general_show_fps' },{ type:'method', block:'general_fps' },{ type:'method', block:'general_hide_fps' },
    { type:'label', text:'本机设备' },
    { type:'method', block:'general_device_type' },{ type:'method', block:'general_device_model' },{ type:'method', block:'general_cpu_cores' },
    { type:'method', block:'general_screen' },{ type:'method', block:'general_touch' },{ type:'method', block:'general_online' },{ type:'method', block:'general_language' },
    { type:'label', text:'存储与内存' },
    { type:'method', block:'general_total_memory' },
    { type:'label', text:'扩展管理' },
    { type:'method', block:'general_extension_count' }
  ]
};
