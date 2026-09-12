# -*- coding: utf-8 -*-
"""KN Expanse 启动器（直接加载编程猫原版 KN 编辑器）

- pywebview 原生窗口(系统 Edge / WebView2 内核) 直接加载真实网址
  https://kn.codemao.cn/ ，登录 / 编辑器 / 作品全部是编程猫原版，一体化单窗口。
- 不再打包任何本地离线镜像、不再起本地 HTTP 服务、不再做任何自定义登录 / 令牌 / 心跳，
  因此不会出现之前"未响应"的卡死。
- 仅额外注入一个右下角悬浮「KN」按钮：点开只看更新日志。文件菜单不再添加任何帮助项。
- 通过共享 WebView2 用户数据目录持久化 Cookie，登录态关程序再开仍保留。
"""
import sys, os, time, json, webbrowser

try:
    import webview
except Exception:
    webview = None

# ---- 真实网址（编程猫原版 KN 工作台，登录/编辑器全在站内）----
REAL_URL = 'https://kn.codemao.cn/'
VERSION = 'v1.2.2 (源码云空间+打开云空间官网入口)'

# 关键：默认 pywebview 会把站点内的「新窗口」（如点「作品」打开编辑器）甩给系统浏览器
# 这里改成 False，所有新窗口都在本 EXE 窗口内打开，实现真正的一体化单窗口
try:
    webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = False
except Exception:
    pass

# 关键修复：pywebview 默认 ALLOW_DOWNLOADS=False，导致所有下载被静默取消
# 设为 True 后，点击下载会弹出 Windows「另存为」对话框，用户可选择保存到桌面
try:
    webview.settings['ALLOW_DOWNLOADS'] = True
except Exception:
    pass

# 开启开发者工具（DevTools）
try:
    webview.settings['DEVELOPER_TOOLS'] = True
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------------------
# 桌面壳代理（ProxyAPI）：让注入的积木以"服务端"方式调用 cloud-space 后端，
# 彻底绕开浏览器跨域(CORS)限制。JS 侧 cueHttp() 在直连被跨域拦截时自动回退到它。
# 请求体由 JS 侧构造（已含正确 Cookie 之外的业务字段），这里只负责转发 + 带 Cookie。
# ---------------------------------------------------------------------------
class ProxyAPI:
    def request(self, url, method='GET', body=None, cookie=''):
        import urllib.request, urllib.error
        try:
            req = urllib.request.Request(url, method=str(method).upper())
            req.add_header('Content-Type', 'application/json')
            req.add_header('env', '1')
            if cookie:
                req.add_header('Cookie', str(cookie))
            if body:
                req.data = body if isinstance(body, (bytes, bytearray)) else str(body).encode('utf-8')
            with urllib.request.urlopen(req, timeout=20) as resp:
                text = resp.read().decode('utf-8', 'ignore')
                return {'status': resp.status, 'text': text}
        except urllib.error.HTTPError as e:
            try:
                text = e.read().decode('utf-8', 'ignore')
            except Exception:
                text = ''
            return {'status': e.code, 'text': text}
        except Exception as e:
            return {'status': 0, 'text': str(e)}

    def open_url(self, url):
        """在桌面壳内另开一个新窗口打开外部网址（"本地打开"，不调系统浏览器）。"""
        try:
            url = str(url)
            if webview is None:
                webbrowser.open(url)
                return {'ok': True, 'mode': 'system_browser_fallback'}
            try:
                webview.create_window(
                    '云空间管理 - ' + url.split('//', 1)[-1].split('/', 1)[-1] or 'cloud-space',
                    url,
                    width=1280, height=820,
                    background_color='#ffffff',
                    text_select=True
                )
                return {'ok': True, 'mode': 'local_window'}
            except Exception:
                webbrowser.open(url)
                return {'ok': True, 'mode': 'system_browser_fallback'}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

    def open_market(self):
        """在桌面壳内新开一个独立窗口加载扩展集市。该窗口内的登录弹窗只导航它自己，
        不会波及主编辑器窗口（彻底解决「编辑器弹网站」的问题）。"""
        try:
            if webview is None:
                webbrowser.open(MARKET_URL)
                return {'ok': True, 'mode': 'system_browser_fallback'}
            try:
                w = webview.create_window(
                    '扩展集市',
                    MARKET_URL,
                    width=1200, height=780,
                    text_select=True
                )
                try:
                    w._is_market = True
                except Exception:
                    pass
                return {'ok': True, 'mode': 'local_window'}
            except Exception:
                webbrowser.open(MARKET_URL)
                return {'ok': True, 'mode': 'system_browser_fallback'}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

    # ---- 本地文件 / 剪贴板读取接口 ----
    # 扩展运行在 WebView2 沙箱，JS 读不到本机文件/剪贴板；这些接口由桌面壳（Python）在本地真正执行，
    # 结果回传给扩展。返回结构统一为 {ok:true,...} / {ok:false,error}。
    def read_text_file(self, path, encoding='utf-8'):
        """读取本地文本文件。path 可为桌面/D 盘等绝对路径。返回 {ok, content, error}。"""
        try:
            p = str(path)
            if not os.path.isfile(p):
                return {'ok': False, 'error': '文件不存在: ' + p}
            with open(p, 'r', encoding=str(encoding), errors='ignore') as f:
                return {'ok': True, 'content': f.read()}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

    def write_text_file(self, path, content, encoding='utf-8'):
        """写本地文本文件（自动建目录）。返回 {ok, error}。"""
        try:
            p = str(path)
            d = os.path.dirname(p)
            if d and not os.path.isdir(d):
                os.makedirs(d, exist_ok=True)
            with open(p, 'w', encoding=str(encoding)) as f:
                f.write(str(content))
            return {'ok': True}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

    def read_clipboard(self):
        """读取系统剪贴板文本（Windows 用 powershell Get-Clipboard）。返回 {ok, text, error}。"""
        try:
            import subprocess
            out = subprocess.run(
                ['powershell', '-NoProfile', '-Command', 'Get-Clipboard'],
                capture_output=True, text=True, timeout=10
            )
            return {'ok': True, 'text': (out.stdout or '').replace('\r\n', '\n').rstrip('\n')}
        except Exception as e:
            return {'ok': False, 'error': str(e)}

    def list_directory(self, path='.'):
        """列出本地目录内容。返回 {ok, entries:[{name, is_dir, size}], error}。"""
        try:
            d = str(path) or '.'
            if not os.path.isdir(d):
                return {'ok': False, 'error': '目录不存在: ' + d}
            entries = []
            for name in sorted(os.listdir(d)):
                try:
                    full = os.path.join(d, name)
                    entries.append({
                        'name': name,
                        'is_dir': os.path.isdir(full),
                        'size': os.path.getsize(full) if os.path.isfile(full) else 0,
                    })
                except Exception:
                    pass
            return {'ok': True, 'entries': entries}
        except Exception as e:
            return {'ok': False, 'error': str(e)}


def resource_path(rel):
    """兼容开发态与 PyInstaller 单文件：优先 _MEIPASS，其次项目根目录。"""
    candidates = []
    if getattr(sys, 'frozen', False):
        candidates.append(getattr(sys, '_MEIPASS', ''))
    candidates.append(HERE)
    candidates.append(os.path.join(HERE, 'offline'))
    for base in candidates:
        if not base:
            continue
        p = os.path.join(base, rel)
        if os.path.isfile(p):
            return p
    # 兜底路径（上层 open 失败会走默认更新日志）
    return os.path.join(HERE, rel)


# ---------------------------------------------------------------------------
# KN 网页菜单扩展：在 KN 自己的顶部下拉菜单里添加「扩展集市」
# ---------------------------------------------------------------------------
MARKET_URL = 'https://code.pgrm.run/'

# 注入脚本：监听 KN 顶部菜单出现，在「导入扩展」项下方插入「扩展集市」；
# 点击后调用桌面壳 API 新开一个独立的应用内窗口加载扩展集市（非 iframe 浮层）。
# 这样其内部的登录弹窗只属于该窗口，绝不会波及主编辑器。
INJECT_MENU_JS = (
    '(function(){'
    'if(window.__KN_MENU_EXT__)return;'
    'window.__KN_MENU_EXT__=true;'
    'function addMarketItem(){'
    'var nativeImport=null;'
    'var all=document.querySelectorAll("*");'
    'for(var i=0;i<all.length;i++){'
    'var el=all[i];'
    'if(el.children.length===0&&el.textContent.trim()==="导入扩展"){nativeImport=el.parentElement;break;}'
    '}'
    'if(!nativeImport)return;'
    'var next=nativeImport.nextElementSibling;'
    'if(next&&next.classList&&next.classList.contains("kn-market-item"))return;'
    'var clone=nativeImport.cloneNode(true);'
    'clone.classList.add("kn-market-item");'
    'clone.style.cursor="pointer";'
    'var walker=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT,null,false);'
    'var n;while(n=walker.nextNode()){if(n.nodeValue.trim()==="导入扩展"){n.nodeValue="扩展集市";break;}}'
    'var svg=clone.querySelector("svg");'
    'if(svg){svg.setAttribute("viewBox","0 0 24 24");svg.innerHTML="<path d=\\"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z\\" fill=\\"currentColor\\"/>");}'
    'clone.onclick=function(e){'
    'e.stopPropagation();e.preventDefault();'
    'try{'
    'if(window.pywebview&&window.pywebview.api&&window.pywebview.api.open_market){window.pywebview.api.open_market();}'
    'else if(window.open){window.open(' + json.dumps(MARKET_URL) + ',"_blank");}'
    '}catch(err){}'
    '};'
    'nativeImport.parentNode.insertBefore(clone,nativeImport.nextSibling);'
    '}'
    'var _t=null;'
    'var _last=0;'
    'function scan(){'
    'var now=Date.now();'
    'if(now-_last<500)return;'
    'try{_last=now;addMarketItem();}catch(e){}'
    '}'
    'var obs=new MutationObserver(function(){'
    'if(_t)return;'
    '_t=setTimeout(function(){_t=null;scan();},500);'
    '});'
    'obs.observe(document.body,{childList:true,subtree:true});'
    'setInterval(scan,2000);'
    '})();'
)


def inject_menu_extension(window):
    """在 KN 网页自己的菜单里注入「扩展集市」入口（带返回键浮层）。"""
    try:
        window.evaluate_js(INJECT_MENU_JS)
    except Exception:
        pass


# 菜单回调在子线程执行且不会收到 window 参数，故用模块级全局持有窗口引用
window_ref = None


# 用户数据目录：用于记录启动日志（登录态靠 pywebview 默认 %APPDATA%/pywebview 持久化）
appdata = os.environ.get('APPDATA') or os.path.expanduser('~')
DATA = os.path.join(appdata, 'KN Expanse')
os.makedirs(DATA, exist_ok=True)

LOG_FILE = os.path.join(DATA, 'launcher.log')


def append_log(msg):
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write('[' + time.strftime('%Y-%m-%d %H:%M:%S') + '] ' + msg + '\n')
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 更新日志（悬浮 KN 唯一内容）：从 changelog.html 读取（累积式，绝不丢旧版）
# ---------------------------------------------------------------------------
def load_changelog_html():
    try:
        p = resource_path('changelog.html')
        with open(p, 'r', encoding='utf-8') as f:
            txt = f.read().strip()
        if txt:
            return txt
    except Exception:
        pass
    return ('<div style="padding:10px;color:#333">KN Expanse ' + VERSION +
            '<br>桌面壳直接加载编程猫原版 KN 编辑器（kn.codemao.cn）。</div>')


CHANGELOG_HTML = load_changelog_html()
# 转成安全的 JS 字符串字面量（json.dumps 会处理所有引号/换行/转义）
CHANGELOG_JSON = json.dumps(CHANGELOG_HTML)

# 悬浮 KN 注入脚本：仅更新日志，无帮助/登录/操作日志
INJECT_JS = (
    '(function(){'
    'if(window.__KN_FLOAT__)return;'
    'window.__KN_FLOAT__=true;'
    'var CHANGELOG=' + CHANGELOG_JSON + ';'
    'function ensure(){'
    '  if(document.getElementById("kn-float-btn"))return;'
    '  if(!document.body)return;'
    '  var btn=document.createElement("div");'
    '  btn.id="kn-float-btn";btn.textContent="KN";'
    '  btn.style.cssText="position:fixed;right:14px;bottom:14px;width:44px;height:44px;'
    '    border-radius:50%;background:linear-gradient(135deg,#6a8dff,#9b6bff);color:#fff;'
    '    font:bold 16px/44px sans-serif;text-align:center;cursor:pointer;'
    '    z-index:2147483647;box-shadow:0 4px 14px rgba(80,90,200,.45);user-select:none;";'
    '  var panel=document.createElement("div");'
    '  panel.id="kn-float-panel";'
    '  panel.style.cssText="position:fixed;right:14px;bottom:68px;width:340px;max-height:80vh;'
    '    overflow:auto;background:#fff;color:#222;border-radius:12px;'
    '    box-shadow:0 8px 30px rgba(0,0,0,.25);padding:12px 14px;z-index:2147483647;'
    '    display:none;font:13px/1.6 sans-serif;";'
    '  panel.innerHTML=CHANGELOG;'
    '  btn.addEventListener("click",function(){'
    '    panel.style.display=panel.style.display==="none"?"block":"none";'
    '  });'
    '  document.body.appendChild(btn);'
    '  document.body.appendChild(panel);'
    '}'
    'ensure();'
    'setInterval(ensure,1500);'
    'document.addEventListener("DOMContentLoaded",ensure);'
    '})();'
)


# ---------------------------------------------------------------------------
# (已移除 CUELoader 诊断面板 —— 用户要求去掉"编写检测"悬浮状态窗)
# ---------------------------------------------------------------------------


def inject_float(window):
    try:
        window.evaluate_js(INJECT_JS)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# CUELoader 扩展加载器：注入自定义积木块（源码云空间等）
# 注意：CUELoader 代码量大且含复杂字符，不在此处做字符串拼接，
#       改为在 inject_cueloader() 运行时读取文件并注入。
# ---------------------------------------------------------------------------
def _load_text(rel):
    """安全读取资源文件内容，失败返回空字符串。"""
    try:
        with open(resource_path(rel), 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception:
        return ''


def inject_cueloader(window):
    """在页面中注入 CUELoader 框架 + 源码云空间扩展代码。"""
    cue_code = _load_text(os.path.join('assets', 'cueloader.js'))
    ext_code = _load_text(os.path.join('assets', '源码云空间.cue.js'))

    if not cue_code or not ext_code:
        append_log('警告: CUELoader(%dB) 或扩展(%dB) 文件缺失' % (
            len(cue_code), len(ext_code)))
        try:
            window.evaluate_js('if(window.__CUE_LOG__)window.__CUE_LOG__("CUELoader/扩展文件缺失，注入中止","fail");')
        except Exception:
            pass
        return

    # 构造注入脚本：
    # 1) 始终写入扩展代码全局变量（供看门狗反复使用）
    # 2) 首次加载时跑 CUELoader（安装演示扩展 + 暴露 __CUE_INSTALL__/__CUE_RELOAD__/__CUE_EXT_TYPES__ 句柄）
    # 3) 注入看门狗：SPA 进入编辑器（heart 就绪）后自动安装「源码云空间」积木；
    #    工具箱刷新由 cueloader main() 的 setInterval(reloadToolbox, 2000) 无条件兜底
    ext_json = json.dumps(ext_code)  # 安全转义扩展代码中的引号/换行

    # 看门狗：每 1.5s 轮询，仅负责"确保源码云空间扩展已安装"。
    # 关键修复（根因 C）：installExt 内部会 await window.Blockly；若 KN 编辑器未把
    # Blockly 挂到 window 上，installExt 会永久挂起、__CUE_INSTALLING__ 永不复位，
    # 导致扩展永远装不上、且无任何报错。故看门狗在调用前先检测 window.Blockly，
    # 不存在则只记录"等待 Blockly"，等其出现后再装。
    # 关键修复（根因 A）：看门狗额外检测 __CUE_RUN_RESULT__ —— 若 CUELoader IIFE
    # 在暴露句柄前就因异常中断（被旧版 try/catch 吞掉），能直接在面板里报红。
    # - try/catch 包裹每次轮询，避免单帧异常中断 interval；
    # - 用 __CUE_INSTALLING__ 防并发安装与重复确认框；
    # - 首轮轮询额外打印"首次检查"快照，直观看到句柄/扩展是否就位。
    watchdog_js = (
        '(function(){'
        'var __first=true;'
        'setInterval(function(){'
        'try{'
        'if(__first){__first=false;'
        'var ai=!!window.__CUE_INSTALL__;'
        'var et=window.__CUE_EXT_TYPES__||{};'
        'var has=!!et["CLOUD_SPACE_EXTENSION"];'
        'if(window.__CUE_LOG__)window.__CUE_LOG__("看门狗: 首次检查, __CUE_INSTALL__="+ai+", extTypes 有 CLOUD_SPACE_EXTENSION="+has, has?"ok":"wait");'
        '}'
        'if(window.__CUE_LOADED__){'
        'var res=window.__CUE_RUN_RESULT__||"unknown";'
        'if(res!=="ok"){if(window.__CUE_LOG__)window.__CUE_LOG__("看门狗: IIFE 执行失败 ("+res+")","fail");}'
        'else if(!window.__CUE_INSTALL__){if(window.__CUE_LOG__)window.__CUE_LOG__("看门狗: __CUE_INSTALL__ 未暴露（IIFE 在暴露句柄前中断）","fail");}'
        '}'
        # 根因 B 修复：看门狗此前只要看到 __CUE_INSTALL__ 句柄就立即调用 installExt，
        # 而该句柄在 cueloader IIFE 加载时就已暴露（远早于 main() 异步拿到 heart）。
        # 若 SPA 在 main() 完成前就进编辑器，installExt 内 onStart/onStop/emitEvent
        # 访问未就绪的 heart 会抛 TypeError。故新增 window.__CUE_READY__ 前置闸门：
        # 仅当 main() 跑完（heart 就绪）且 Blockly 已加载时才调用 installExt。
        # 用 Promise.resolve().catch().finally() 包装，installExt 抛错也只记日志不打断轮询。
        # 根因 B 修复（续）：删除原 blocklyOk（首页 window.Blockly 即为 object，判断无意义）。
        # 真正的"编辑器已加载"标志是 window.Blockly.mainWorkspace（Blockly 主工作区），
        # 而非 typeof window.Blockly。看门狗据此在编辑器上下文内驱动 __CUE_BOOT__，
        # 并在 main 跑通(__CUE_READY__) 后双保险调用 installExt。
        'var cueReady = window.__CUE_READY__ === true;'
        'var inEditor = !!(window.Blockly && window.Blockly.mainWorkspace);'
        'var ai = !!window.__CUE_INSTALL__;'
        'var installed = !!(window.__CUE_EXT_TYPES__ && window.__CUE_EXT_TYPES__["CLOUD_SPACE_EXTENSION"]);'
        'if(window.__CUE_LOG__)window.__CUE_LOG__("wd: ready="+cueReady+" inEditor="+inEditor+" installHandle="+ai+" installed="+installed, "wait");'
        'if(!cueReady && inEditor && typeof window.__CUE_BOOT__ === "function"){'
        '  window.__CUE_BOOT__();'
        '}'
        'if(cueReady && ai && !installed && !window.__CUE_INSTALLING__){'
        '  window.__CUE_INSTALLING__=true;'
        '  Promise.resolve(window.__CUE_INSTALL__(window.__CUE_EXTENSION_CODE__, true))'
        '    .then(function(){if(window.__CUE_LOG__)window.__CUE_LOG__("installExt resolved","ok");})'
        '    .catch(function(err){if(window.__CUE_LOG__)window.__CUE_LOG__("installExt失败: "+String(err), "error");})'
        '    .finally(function(){window.__CUE_INSTALLING__=false;});'
        '}'
        '}catch(e){}'
        '},1500);'
        '})();'
    )

    inject_script = (
        '(function(){' +
        'if(window.__CUE_LOG__)window.__CUE_LOG__("inject_cueloader 开始执行","ok");' +
        'window.__CUE_EXTENSION_CODE__=' + ext_json + ';' +
        'if(window.__CUE_LOG__)window.__CUE_LOG__("__CUE_EXTENSION_CODE__ 已设置 (长度: "+window.__CUE_EXTENSION_CODE__.length+")","ok");' +
        'if(!window.__CUE_LOADED__){' +
        'window.__CUE_LOADED__=true;' +
        # 根因 A 修复：旧版 try{cue_code}catch(e){} 会吞掉任何异常，导致 __CUE_LOADED__ 已置位
        # 却永不重试、句柄也永不暴露。改为记录 __CUE_RUN_RESULT__ 并在面板报错。
        'try{' + cue_code + ';window.__CUE_RUN_RESULT__="ok";}catch(err){window.__CUE_RUN_RESULT__="error:"+String(err);if(window.__CUE_LOG__)window.__CUE_LOG__("CUELoader IIFE 执行异常: "+String(err),"fail");}' +
        '}' +
        'if(window.__CUE_LOG__){var r=window.__CUE_RUN_RESULT__||"unknown";window.__CUE_LOG__("IIFE 执行结果: "+r, r==="ok"?"ok":"fail");}' +
        'if(!window.__CUE_WATCHDOG__){' +
        'window.__CUE_WATCHDOG__=true;' +
        watchdog_js +
        '}' +
        '})();'
    )

    try:
        window.evaluate_js(inject_script)
        append_log('CUELoader 已注入 (%d 字节)' % len(inject_script))
    except Exception as e:
        append_log('CUELoader 注入失败: %s' % e)


def main():
    if webview is None:
        print('webview 不可用，无法启动 KN Expanse')
        return
    append_log('启动 KN Expanse %s，加载真实网址 %s' % (VERSION, REAL_URL))
    
    # 设置环境变量以启用 WebView2 开发者工具
    os.environ['WEBVIEW2_DEVTOOLS'] = '1'
    append_log('已设置环境变量 WEBVIEW2_DEVTOOLS=1')
    
    # 尝试多种方式开启开发者工具 (pywebview 6.x 版本)
    try:
        webview.settings['DEVELOPER_TOOLS'] = True
        append_log('已设置 DEVELOPER_TOOLS = True')
    except Exception as e:
        append_log('设置 DEVELOPER_TOOLS 失败: %s' % e)
    
    # 检查当前 settings 值
    try:
        append_log('当前 DEVELOPER_TOOLS 设置值: %s' % webview.settings.get('DEVELOPER_TOOLS'))
    except Exception as e:
        append_log('获取 DEVELOPER_TOOLS 设置失败: %s' % e)
    
    # 获取 pywebview 版本信息
    try:
        import pywebview
        append_log('pywebview 版本: %s' % getattr(pywebview, '__version__', '未知'))
    except Exception as e:
        append_log('获取版本失败: %s' % e)
    
    # 打印所有可用的 settings 键（调试用）
    try:
        append_log('可用的 settings 键: %s' % list(webview.settings.keys()))
    except Exception as e:
        append_log('获取 settings 键失败: %s' % e)
    
    window = webview.create_window(
        'KN Expanse',
        REAL_URL,
        width=1280, height=800,
        min_size=(1024, 680),
        background_color='#e1e9fc',
        text_select=True,
        js_api=ProxyAPI(),
    )
    global window_ref
    window_ref = window
    try:
        def on_loaded():
            inject_float(window)
            inject_cueloader(window)
            inject_menu_extension(window)
            # 尝试自动打开开发者工具
            try:
                # 方式1：尝试调用 window.debug 方法
                if hasattr(window, 'debug'):
                    window.debug()
            except Exception as e:
                append_log('调用 window.debug() 失败: %s' % e)
            try:
                # 方式2：通过 evaluate_js 执行调试命令
                window.evaluate_js('console.log("DevTools test");')
                append_log('JS 执行成功，开发者工具可能已启用')
            except Exception as e:
                append_log('evaluate_js 失败: %s' % e)
        window.events.loaded += on_loaded
    except Exception as e:
        append_log('绑定 loaded 事件失败: %s' % e)
    # 关掉隐私模式：否则 pywebview 默认会 DeleteAllCookies，关程序登录态就丢了
    # storage_path 指定专属持久目录（%APPDATA%/KN Expanse/webview2），Cookie/localStorage 跨启动保留
    webview.start(private_mode=False, storage_path=os.path.join(DATA, 'webview2'))
    os._exit(0)


if __name__ == '__main__':
    main()