// docs.html 静态内容已直接写入 HTML 文件，此页无需额外 JS 渲染
(function () {
  'use strict';
  // 等待 shell.js 完成顶栏/抽屉渲染
  if (window.App && window.App.ready) {
    App.ready.then(() => {
      if (window.MDURipple) window.MDURipple.scan(document.body);
    });
  }
})();
