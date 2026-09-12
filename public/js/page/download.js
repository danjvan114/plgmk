// download.html 静态内容已直接写入 HTML 文件，此页无需额外 JS 渲染
(function () {
  'use strict';
  if (window.App && window.App.ready) {
    App.ready.then(() => {
      if (window.MDURipple) window.MDURipple.scan(document.body);
    });
  }
})();
