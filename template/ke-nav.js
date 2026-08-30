
/* ===== KE 全站统一导航/主题/悬浮窗 v7（多语言 + 图标随主题；复刻 app_detail）===== */
(function () {
  'use strict';
  var KELOGO = 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY6vNqecDlOuUX-l2BERk5bPziylNSIAACwCAAAmsm0Fc-qj9K0pP0Lz0E.png';
  var KEDARKBG = 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-bBqex51ZLwNxuT2IIs05FTlykLbJAACrCkAAmsm2FcLH3kvBfcaWz0E.jpg';
  var KEM_QR = 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEZCd1qfEJzDF0wJ6vVFg3WQf-QeQIjNwACCyMAAkWI6FcCA6Hs1_s1CD0E.png';
  var KEQ_QR = 'https://img.remit.ee/api/file/BQACAgUAAyEGAASHRsPbAAEY-mJqezETEdhmnMoucEwbiIyjhXm4bgACeioAAmsm2FcKDclIeIoVyz0E.png';
  var KEY_THEME = 'knexpanse-theme';
  var KEY_LITE = 'knexpanse-lite';
  var KEY_LANG = 'knexpanse-lang';
  var LANGLIST = ['zh', 'tw', 'en', 'ja', 'ko', 'es'];

  function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function curLang() { var l = read(KEY_LANG); return LANGLIST.indexOf(l) >= 0 ? l : 'zh'; }
  function isMobileUA() { return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MQQBrowser/i.test(navigator.userAgent); }

  /* ===== 导航/菜单多语言字典(6 语言) ===== */
  var KEL10N = {
    nav_home: { zh: '首页', tw: '首頁', en: 'Home', ja: 'ホーム', ko: '홈', es: 'Inicio' },
    nav_discover: { zh: '发现', tw: '發現', en: 'Discover', ja: '発見', ko: '발견', es: 'Descubrir' },
    nav_team: { zh: '工作室', tw: '工作室', en: 'Studio', ja: 'スタジオ', ko: '스튜디오', es: 'Estudio' },
    nav_forum: { zh: '论坛', tw: '論壇', en: 'Forum', ja: 'フォーラム', ko: '포럼', es: 'Foro' },
    nav_plugin: { zh: '插件', tw: '插件', en: 'Plugins', ja: 'プラグイン', ko: '플러그인', es: 'Plugins' },
    dl_editor: { zh: '编辑器下载', tw: '編輯器下載', en: 'Editor Download', ja: 'エディタダウンロード', ko: '에디터 다운로드', es: 'Descargar Editor' },
    dl_editor_sub: { zh: 'KN Expanse 桌面版', tw: 'KN Expanse 桌面版', en: 'KN Expanse Desktop', ja: 'KN Expanse デスクトップ版', ko: 'KN Expanse 데스크톱', es: 'KN Expanse Escritorio' },
    dev_center: { zh: '开发者中心', tw: '開發者中心', en: 'Developer Center', ja: '開発者センター', ko: '개발자 센터', es: 'Centro de Desarrolladores' },
    dev_center_sub: { zh: '插件上传与统计', tw: '插件上傳與統計', en: 'Upload & Stats', ja: 'アップロードと統計', ko: '업로드 및 통계', es: 'Subir y Estadísticas' },
    theme_title: { zh: '主题外观', tw: '主題外觀', en: 'Appearance', ja: 'テーマ', ko: '테마', es: 'Apariencia' },
    theme_day: { zh: '白天模式', tw: '白天模式', en: 'Light Mode', ja: 'ライトモード', ko: '라이트 모드', es: 'Modo Claro' },
    theme_night: { zh: '黑夜模式', tw: '黑夜模式', en: 'Dark Mode', ja: 'ダークモード', ko: '다크 모드', es: 'Modo Oscuro' },
    lite: { zh: '节能模式', tw: '節能模式', en: 'Eco Mode', ja: 'エコモード', ko: '절전 모드', es: 'Modo Eco' },
    lite_on: { zh: '节能模式 · 已开启', tw: '節能模式 · 已開啟', en: 'Eco Mode · On', ja: 'エコモード · オン', ko: '절전 모드 · 켜짐', es: 'Modo Eco · Activado' },
    lite_off: { zh: '节能模式 · 已关闭', tw: '節能模式 · 已關閉', en: 'Eco Mode · Off', ja: 'エコモード · オフ', ko: '절전 모드 · 꺼짐', es: 'Modo Eco · Desactivado' },
    lite_desc: { zh: '关闭特效 · 保留流畅基础体验', tw: '關閉特效 · 保留流暢基礎體驗', en: 'Disable FX · Keep it smooth', ja: 'エフェクトを無効化', ko: '효과 끄기 · 부드럽게', es: 'Sin efectos · Fluido' },
    lang_title: { zh: '选择语言', tw: '選擇語言', en: 'Language', ja: '言語', ko: '언어', es: 'Idioma' },
    qr_title: { zh: '扫码获取', tw: '掃碼獲取', en: 'Scan to Get', ja: 'QRコード', ko: 'QR 코드', es: 'Escanear' },
    qr_m: { zh: '手机端下载', tw: '手機端下載', en: 'Mobile Download', ja: 'モバイルダウンロード', ko: '모바일 다운로드', es: 'Descarga Móvil' },
    qr_q: { zh: 'QQ 群', tw: 'QQ 群', en: 'QQ Group', ja: 'QQグループ', ko: 'QQ 그룹', es: 'Grupo QQ' },
    qr_qq_name: { zh: 'KN Expanse 官方交流群', tw: 'KN Expanse 官方交流群', en: 'KN Expanse Official Group', ja: 'KN Expanse 公式コミュニティ', ko: 'KN Expanse 공식 커뮤니티', es: 'Grupo Oficial KN Expanse' },
    me: { zh: '个人中心', tw: '個人中心', en: 'My Account', ja: 'マイアカウント', ko: '내 계정', es: 'Mi Cuenta' },
    my_home: { zh: '我的主页', tw: '我的主頁', en: 'My Profile', ja: 'マイページ', ko: '내 프로필', es: 'Mi Perfil' },
    my_works: { zh: '我的作品', tw: '我的作品', en: 'My Works', ja: 'マイ作品', ko: '내 작품', es: 'Mis Obras' },
    my_msgs: { zh: '消息中心', tw: '消息中心', en: 'Messages', ja: 'メッセージ', ko: '메시지', es: 'Mensajes' },
    chg_pwd: { zh: '修改密码', tw: '修改密碼', en: 'Change Password', ja: 'パスワード変更', ko: '비밀번호 변경', es: 'Cambiar Contraseña' },
    logout: { zh: '退出登录', tw: '退出登錄', en: 'Logout', ja: 'ログアウト', ko: '로그아웃', es: 'Cerrar Sesión' },
    back_plugin: { zh: '返回插件', tw: '返回插件', en: 'Back to Plugins', ja: 'プラグインに戻る', ko: '플러그인으로 돌아가기', es: 'Volver a Plugins' }
  };
  function L(k) {
    var t = KEL10N[k];
    return (t && t[curLang()]) ? t[curLang()] : (t ? t.zh : k);
  }

  var IC = {
    home: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    compass: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.8-5 6.5-5s5.7 1.5 6.5 5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 15.2c2 .7 3.3 2.2 4 4.8"/></svg>',
    forum: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/></svg>',
    plugin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/></svg>',
    sun: '<svg class="ke-ic-sun" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="ke-ic-moon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.4-.4-.5-.8-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.2 3.8 8.5s-1.3 6.1-3.8 8.5c-2.5-2.4-3.8-5.2-3.8-8.5s1.3-6.1 3.8-8.5Z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/></svg>',
    caret: '<svg class="ke-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    person: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.5 4-5 7.5-5s6.7 1.5 7.5 5"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>',
    code: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M13 4l-2 16"/></svg>',
    eco: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15c-1.6-2.1-2.2-4.6-1.7-7.1 2.6-.4 5.2.2 7.3 1.7-.4 2.6-1.1 4.8-2.6 6.2"/><path d="M9.3 12.8c-3.1 1.6-4.6 3.6-5.1 7.1 3.5-.5 5.6-2 7.2-5.1"/><circle cx="14.7" cy="9.3" r="1.2" fill="currentColor" stroke="none"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>',
    burger: null
  };
  var TP_AURORA = '<span class="ke-tp-ico" style="--c:#60a5fa;--tint:rgba(96,165,250,.16)"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="m12 2.6 2.9 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.3l-5.8 2.9 1.1-6.4L2.7 9.3l6.4-.9Z"/></svg></span>';
  var TP_DARK = '<span class="ke-tp-ico" style="--c:#0b1020;--tint:rgba(11,16,32,.18)"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.5 14.2 9.8 21.5 12l-7.3 2.2L12 21.5 9.8 14.2 2.5 12l7.3-2.2Z"/></svg></span>';

  var NAV = [
    { id: 'home', href: '/', txt: '首页', icon: 'home' },
    { id: 'discover', href: '/workpool', txt: '发现', icon: 'compass' },
    { id: 'team', href: '/team', txt: '工作室', icon: 'users' },
    { id: 'forum', href: '/forum', txt: '论坛', icon: 'forum' },
    { id: 'plugin', href: '/mk/kn', txt: '插件', icon: 'plugin' }
  ];
  var LANGS = [['zh', '中文'], ['tw', '繁體中文'], ['en', 'English'], ['ja', '日本語'], ['ko', '한국어'], ['es', 'Español']];

  function curDark() {
    var t = read(KEY_THEME);
    if (t === '3' || t === 'dark') return true;
    if (t === '0' || t === 'light') return false;
    var b = document.body;
    if (b && (b.classList.contains('dark-mode') || b.classList.contains('theme-dark'))) return true;
    return false;
  }
  function curLite() { return read(KEY_LITE) === '1'; }

  function toggleTheme() {
    write(KEY_THEME, curDark() ? '0' : '3');
    applyTheme();
  }

  function applyTheme() {
    var dark = curDark();
    document.body.classList.toggle('ke-dark', dark);
    var b = document.body;
    if (b.classList.contains('theme-aurora') || b.classList.contains('dark-mode') || b.classList.contains('theme-ocean') || b.classList.contains('theme-amber')) {
      b.classList.toggle('dark-mode', dark);
      b.classList.toggle('theme-aurora', !dark);
    }
    if (b.classList.contains('theme-light') || b.classList.contains('theme-dark')) {
      b.classList.toggle('theme-dark', dark);
      b.classList.toggle('theme-light', !dark);
    }
    var tb = document.getElementById('keThemeBtn');
    if (tb) tb.setAttribute('title', dark ? L('theme_day') : L('theme_night'));
    var td = document.getElementById('keTDay'), tn = document.getElementById('keTNight');
    if (td) td.classList.toggle('cur', !dark);
    if (tn) tn.classList.toggle('cur', dark);
    var lit = document.getElementById('keLite');
    if (lit) lit.classList.toggle('on', curLite());
  }
  function applyLite() {
    document.body.classList.toggle('lite-mode', curLite());
    var lit = document.getElementById('keLite');
    if (lit) lit.classList.toggle('on', curLite());
    var st = document.getElementById('keLiteState');
    if (st) { st.textContent = curLite() ? L('lite_on') : L('lite_off'); st.setAttribute('data-ke-l', curLite() ? 'lite_on' : 'lite_off'); }
  }

  function buildHeader(sub) {
    var p = location.pathname || '/';
    var activeId = 'home';
    if (p.indexOf('/workpool') === 0) activeId = 'discover';
    else if (p.indexOf('/team') === 0) activeId = 'team';
    else if (p.indexOf('/forum') === 0) activeId = 'forum';
    else if (p.indexOf('/mk/kn') === 0 || p.indexOf('/plugin') === 0) activeId = 'plugin';
    var links = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.id === activeId ? ' class="active"' : '') + '>' + IC[n.icon] + '<span data-ke-l="nav_' + n.id + '">' + L('nav_' + n.id) + '</span></a>';
    }).join('');

    /* 插件右侧:下载下拉小箭头(仅箭头) */
    var dlArrow = '<button class="ke-dl-arrow" id="keDlArrow" title="下载与开发" aria-label="下载与开发" aria-expanded="false">' + IC.caret + '</button>';

    /* 右侧: 主题 -> 语言 -> 二维码 -> 头像 */
    var themeBtn = '<button class="ke-icon-btn" id="keThemeBtn" title="' + L('theme_title') + '" aria-label="切换主题">' + IC.sun + IC.moon + '</button>';
    var langBtn = '<button class="ke-icon-btn" id="keLangBtn" title="' + L('lang_title') + '" aria-label="切换语言">' + IC.globe + '</button>';
    var qrBtn = '<button class="ke-icon-btn" id="keQrBtn" title="' + L('qr_title') + '" aria-label="二维码">' + IC.qr + '</button>';
    var avatarBtn = '<button class="ke-avatar-btn" id="keAvatarBtn" title="个人中心" aria-label="个人中心"><span class="ke-avatar-fallback">' + IC.person + '</span></button>';
    var burger = '<button class="ke-burger" id="keBurger" aria-label="菜单"><i></i><i></i><i></i></button>';

    var html = '<header class="ke-header" id="keHeader"><div class="ke-nav-left">' +
      '<a class="ke-logo" href="/"><img src="' + KELOGO + '" alt="KN Expanse"></a>' +
      '<nav class="ke-nav-links">' + links + '</nav>' + dlArrow + '</div>' +
      '<div class="ke-nav-right">' + themeBtn + langBtn + qrBtn + avatarBtn + burger + '</div></header>';

    /* 悬浮窗全部挂 body 层(fixed + posPop 定位,同 app_detail) */
    var dlPop = '<div class="ke-pop ke-pop-min" id="keDlPop">' +
      '<a class="ke-pop-item" href="/app/kn/d">' + IC.download + '<span class="ke-pop-txt"><span data-ke-l="dl_editor">' + L('dl_editor') + '</span><small class="ke-pop-sub" data-ke-l="dl_editor_sub">' + L('dl_editor_sub') + '</small></span></a>' +
      '<a class="ke-pop-item" href="/dev/kn">' + IC.code + '<span class="ke-pop-txt"><span data-ke-l="dev_center">' + L('dev_center') + '</span><small class="ke-pop-sub" data-ke-l="dev_center_sub">' + L('dev_center_sub') + '</small></span></a>' +
      '</div>';

    var themePop = '<div class="ke-pop ke-pop-min" id="keThemePop">' +
      '<button class="ke-tp-item" id="keTDay" type="button" style="--c:#60a5fa;--tint:rgba(96,165,250,.16)">' + TP_AURORA + '<span data-ke-l="theme_day">' + L('theme_day') + '</span></button>' +
      '<button class="ke-tp-item" id="keTNight" type="button" style="--c:#0b1020;--tint:rgba(11,16,32,.18)">' + TP_DARK + '<span data-ke-l="theme_night">' + L('theme_night') + '</span></button>' +
      '<div class="ke-pop-sep"></div>' +
      '<button class="ke-look-perf" id="keLite" type="button">' + IC.eco + '<span class="ke-look-perf-main"><span id="keLiteState" data-ke-l="lite_off">' + L('lite_off') + '</span><small data-ke-l="lite_desc">' + L('lite_desc') + '</small></span></button>' +
      '</div>';

    var langPop = '<div class="ke-pop ke-pop-lang" id="keLangPop">' +
      LANGS.map(function (l) {
        var cur = read(KEY_LANG) || 'zh';
        var ai = l[0] === 'zh' ? '' : ' <span class="ke-ai-badge">AI</span>';
        return '<button class="ke-lang-item' + (l[0] === cur ? ' cur' : '') + '" data-lang="' + l[0] + '" type="button">' + l[1] + ai + '</button>';
      }).join('') +
      '</div>';

    var qrPop = '<div class="ke-pop ke-pop-wide" id="keQrPop">' +
      '<div class="ke-qr-tabs">' +
      '<button class="ke-qr-tab active" data-q="m" type="button" data-ke-l="qr_m">' + L('qr_m') + '</button>' +
      '<button class="ke-qr-tab" data-q="q" type="button" data-ke-l="qr_q">' + L('qr_q') + '</button>' +
      '</div>' +
      '<div class="ke-qr-imgs">' +
      '<div class="ke-qr-pane show" data-q="m"><img src="' + KEM_QR + '" alt="手机端下载"></div>' +
      '<div class="ke-qr-pane" data-q="q"><img src="' + KEQ_QR + '" alt="QQ 群"><span class="ke-qr-name">KN Expanse 官方交流群</span></div>' +
      '</div></div>';

    var avatarPop = '<div class="ke-pop ke-pop-min" id="keAvatarPop">' +
      '<span class="ke-pop-item" style="cursor:default;font-size:12px;font-weight:800;color:var(--ke-text-3);padding:4px 12px 6px" id="keUserTitle" data-ke-l="me">' + L('me') + '</span>' +
      '<a class="ke-pop-item" id="keMyHome" href="/u/me">' + IC.person + '<span data-ke-l="my_home">' + L('my_home') + '</span></a>' +
      '<a class="ke-pop-item" href="/workpool/my">' + IC.plugin + '<span data-ke-l="my_works">' + L('my_works') + '</span></a>' +
      '<a class="ke-pop-item" href="/messages">' + IC.forum + '<span data-ke-l="my_msgs">' + L('my_msgs') + '</span></a>' +
      '<a class="ke-pop-item" href="/change_password">' + IC.code + '<span data-ke-l="chg_pwd">' + L('chg_pwd') + '</span></a>' +
      '<div class="ke-pop-sep"></div>' +
      '<a class="ke-pop-item" id="keLogout" href="/logout">' + IC.back + '<span data-ke-l="logout">' + L('logout') + '</span></a>' +
      '</div>';

    var back = sub ? '<div class="ke-back"><a class="ke-back-btn" href="/mk/kn">' + IC.back + '<span data-ke-l="back_plugin">' + L('back_plugin') + '</span></a></div>' : '';

    var host = document.getElementById('hv2');
    if (host) {
      host.innerHTML = html + back;
    } else {
      var frag = document.createElement('div');
      frag.innerHTML = html + back;
      while (frag.firstChild) document.body.insertBefore(frag.firstChild, document.body.firstChild);
    }
    var hs = document.querySelectorAll('header');
    for (var i = 0; i < hs.length; i++) { if (hs[i].id !== 'keHeader') hs[i].parentNode && hs[i].parentNode.removeChild(hs[i]); }
    var tb = document.querySelector('.mdui-toolbar');
    if (tb && tb.parentNode) tb.parentNode.removeChild(tb);

    /* pop 挂 body 尾部 */
    var popFrag = document.createElement('div');
    popFrag.innerHTML = dlPop + themePop + langPop + qrPop + avatarPop;
    while (popFrag.firstChild) document.body.appendChild(popFrag.firstChild);
  }

  /* 复刻 app_detail: posPop 定位 / hover 300-250ms / 互斥 */
  function setupPops() {
    var mobile = isMobileUA();
    var groups = [
      ['keDlArrow', 'keDlPop'],
      ['keThemeBtn', 'keThemePop'],
      ['keLangBtn', 'keLangPop'],
      ['keQrBtn', 'keQrPop'],
      ['keAvatarBtn', 'keAvatarPop']
    ];
    var pops = [];
    groups.forEach(function (g) {
      var btn = document.getElementById(g[0]);
      var pop = document.getElementById(g[1]);
      if (btn && pop) pops.push({ btn: btn, pop: pop });
    });

    function anyOpen() {
      for (var i = 0; i < pops.length; i++) { if (pops[i].pop.classList.contains('show')) return true; }
      return false;
    }
    function closeOthers(exceptPop) {
      pops.forEach(function (o) {
        if (o.pop !== exceptPop) { o.pop.classList.remove('show'); o.btn.classList.remove('open'); o.btn.setAttribute('aria-expanded', 'false'); }
      });
    }
    function posPop(pop, btn) {
      var r = btn.getBoundingClientRect();
      var pw = pop.offsetWidth || 220;
      var left = r.right - pw;
      if (left < 10) left = 10;
      pop.style.left = left + 'px';
      pop.style.top = (r.bottom + 12) + 'px';
      pop.style.right = 'auto';
    }
    function openPop(o) {
      closeOthers(o.pop);
      posPop(o.pop, o.btn);
      o.pop.classList.add('show');
      o.btn.classList.add('open');
      o.btn.setAttribute('aria-expanded', 'true');
    }
    function closePop(o) {
      o.pop.classList.remove('show');
      o.btn.classList.remove('open');
      o.btn.setAttribute('aria-expanded', 'false');
    }

    pops.forEach(function (o) {
      var openT = null, closeT = null;
      if (!mobile) {
        o.btn.addEventListener('mouseenter', function () {
          clearTimeout(closeT);
          openT = setTimeout(function () { if (!anyOpen() || o.pop.classList.contains('show')) openPop(o); }, 300);
        });
        o.btn.addEventListener('mouseleave', function () {
          clearTimeout(openT);
          closeT = setTimeout(function () { closePop(o); }, 250);
        });
        o.pop.addEventListener('mouseenter', function () { clearTimeout(closeT); });
        o.pop.addEventListener('mouseleave', function () { closePop(o); });
      }
      o.btn.addEventListener('click', function (e) {
        e.stopPropagation();
        /* 主题按钮:点击直接切换白天/黑夜(不再点开菜单);其余按钮点击展开/收起菜单 */
        if (o.btn.id === 'keThemeBtn') {
          toggleTheme();
          closeOthers(o.pop);
          return;
        }
        var open = o.pop.classList.contains('show');
        closeOthers(o.pop);
        if (!open) { posPop(o.pop, o.btn); o.pop.classList.add('show'); o.btn.classList.add('open'); o.btn.setAttribute('aria-expanded', 'true'); }
      });
    });
    document.addEventListener('click', function () { pops.forEach(function (o) { closePop(o); }); });

    /* 主题菜单 */
    var tDay = document.getElementById('keTDay'), tNight = document.getElementById('keTNight'), lite = document.getElementById('keLite');
    if (tDay) tDay.addEventListener('click', function (e) { e.stopPropagation(); write(KEY_THEME, '0'); applyTheme(); });
    if (tNight) tNight.addEventListener('click', function (e) { e.stopPropagation(); write(KEY_THEME, '3'); applyTheme(); });
    if (lite) lite.addEventListener('click', function (e) {
      e.stopPropagation();
      write(KEY_LITE, curLite() ? '0' : '1');
      applyLite();
      showToast(curLite() ? '已开启节能模式' : '已关闭节能模式');
    });

    /* 语言 */
    document.querySelectorAll('#keLangPop .ke-lang-item').forEach(function (it) {
      it.addEventListener('click', function () {
        write(KEY_LANG, it.getAttribute('data-lang'));
        location.reload();
      });
    });

    /* 二维码 tab */
    var qrPop = document.getElementById('keQrPop');
    if (qrPop) {
      qrPop.querySelectorAll('.ke-qr-tab').forEach(function (tab) {
        tab.addEventListener('click', function (e) {
          e.stopPropagation();
          var q = tab.getAttribute('data-q');
          qrPop.querySelectorAll('.ke-qr-tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
          qrPop.querySelectorAll('.ke-qr-pane').forEach(function (pn) { pn.classList.toggle('show', pn.getAttribute('data-q') === q); });
        });
      });
    }

    /* 汉堡 */
    var burger = document.getElementById('keBurger');
    var header = document.getElementById('keHeader');
    if (burger && header) {
      burger.addEventListener('click', function (e) {
        e.stopPropagation();
        header.classList.toggle('ke-open');
      });
    }
  }

  function applyLangToNav() {
    document.querySelectorAll('[data-ke-l]').forEach(function (el) {
      var k = el.getAttribute('data-ke-l');
      var t = KEL10N[k];
      if (t && t[curLang()]) el.textContent = t[curLang()];
    });
    document.querySelectorAll('#keLangPop .ke-lang-item').forEach(function (it) {
      it.classList.toggle('cur', it.getAttribute('data-lang') === curLang());
    });
    document.documentElement.lang = curLang() === 'zh' ? 'zh-CN' : (curLang() === 'tw' ? 'zh-TW' : curLang());
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:34px;transform:translateX(-50%) translateY(20px);background:var(--ke-glass-strong);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);color:var(--ke-text-1);padding:11px 22px;border-radius:30px;font-size:13.5px;font-weight:600;box-shadow:inset 0 1px 0 var(--ke-hi-top),var(--ke-shadow-hover);opacity:0;transition:opacity .3s,transform .35s cubic-bezier(.34,1.56,.64,1);z-index:9000;pointer-events:none;';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 350);
    }, 2000);
  }

  function setupAvatar() {
    var btn = document.getElementById('keAvatarBtn');
    var title = document.getElementById('keUserTitle');
    if (!btn) return;
    function useFallback() {
      btn.innerHTML = '<span class="ke-avatar-fallback">' + IC.person + '</span>';
      btn.title = '个人中心';
    }
    if (typeof fetch !== 'function') return;
    fetch('/api/user/current?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .catch(function () { return { logged_in: false }; })
      .then(function (data) {
        if (data && data.logged_in) {
          var u = data.username || 'me';
          var av = data.avatar || (data.qq ? 'https://q1.qlogo.cn/g?b=qq&nk=' + data.qq + '&s=100' : '');
          if (av) {
            var img = document.createElement('img');
            img.alt = '头像';
            img.onerror = function () { useFallback(); };
            img.src = av;
            btn.innerHTML = '';
            btn.appendChild(img);
          } else { useFallback(); }
          if (title) title.textContent = (data.nickname || u);
          var home = document.getElementById('keMyHome');
          if (home) home.setAttribute('href', '/u/' + encodeURIComponent(u));
        } else {
          useFallback();
          btn.title = '登录';
          btn.addEventListener('click', function (e) { e.stopPropagation(); location.href = '/login'; });
        }
      });
  }

  function setupBg() {
    if (document.querySelector('.bg-photo') || document.querySelector('.bg-layer')) return;
    if (document.querySelector('.ke-bg-layer')) return;
    var layer = document.createElement('div');
    layer.className = 'ke-bg-layer';
    layer.innerHTML = '<div class="ke-bg-orb ke-bg-orb-1"></div><div class="ke-bg-orb ke-bg-orb-2"></div><div class="ke-bg-orb ke-bg-orb-3"></div>';
    document.body.appendChild(layer);
    var img = document.createElement('img');
    img.className = 'ke-bg-darkimg';
    img.src = KEDARKBG;
    img.alt = '';
    document.body.appendChild(img);
    document.body.classList.add('ke-bg-on');
  }

  function boot() {
    if (!document.body) { setTimeout(boot, 50); return; }
    var sub = !!(document.body.getAttribute && document.body.getAttribute('data-ke') === 'sub');
    buildHeader(sub);
    applyTheme();
    applyLite();
    setupPops();
    setupAvatar();
    setupBg();
    applyLangToNav();
    window.addEventListener('storage', function (e) {
      if (e.key === KEY_THEME) applyTheme();
      if (e.key === KEY_LITE) applyLite();
      if (e.key === KEY_LANG) applyLangToNav();
    });
    window.addEventListener('resize', function () {
      var h = document.getElementById('keHeader');
      if (h) h.classList.remove('ke-open');
      var any = document.querySelectorAll('.ke-pop.show');
      for (var i = 0; i < any.length; i++) any[i].classList.remove('show');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();

