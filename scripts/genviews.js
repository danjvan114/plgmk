'use strict';
const fs = require('fs');
const path = require('path');

const viewDir = path.join(__dirname, '..', 'views');
fs.mkdirSync(viewDir, { recursive: true });

const CDN_CSS = '/vendor/ke/mdui.min.css';
const CDN_FA = '/vendor/ke/vendor/fontawesome/all.min.css';
const CDN_JS = '/vendor/ke/mdui.min.js';

const PAGES = [
  ['index', 'KE Hub', 'home'],
  ['market', '插件市场 - KE Hub', 'market'],
  ['plugin', '插件详情 - KE Hub', 'plugin'],
  ['plugin-edit', '上传插件 - KE Hub', 'plugin-edit'],
  ['dev', '开发者中心 - KE Hub', 'dev'],
  ['forum', '论坛 - KE Hub', 'forum'],
  ['post-edit', '发布帖子 - KE Hub', 'post-edit'],
  ['post', '帖子详情 - KE Hub', 'post'],
  ['workpool', '作品池 - KE Hub', 'workpool'],
  ['work-edit', '发布作品 - KE Hub', 'work-edit'],
  ['work', '作品详情 - KE Hub', 'work'],
  ['team', '团队 - KE Hub', 'team'],
  ['team-detail', '团队详情 - KE Hub', 'team-detail'],
  ['user', '个人主页 - KE Hub', 'user'],
  ['admin', '管理后台 - KE Hub', 'admin'],
  ['docs', '开发者文档 - KE Hub', 'docs'],
  ['download', '编辑器下载 - KE Hub', 'download'],
  ['login-at', '登录中 - KE Hub', 'login-at'],
  ['error', '出错了 - KE Hub', 'error']
];

for (const [name, title, page] of PAGES) {
  const scriptName = page === 'plugin-edit' ? 'plugin-edit-fixed' : page;
  const pageJs = page === 'error' ? '' : `<script src="/js/page/${scriptName}.js"></script>`;
  const viewInner =
    page === 'error'
      ? `<div style="text-align:center;padding:90px 20px">
  <div style="font-size:64px;font-weight:800;background:linear-gradient(120deg,#6750a4,#00b8d4);-webkit-background-clip:text;background-clip:text;color:transparent">\{\{code\}\}</div>
  <div style="font-size:16px;color:var(--mdui-color-on-surface-variant);margin:12px 0 24px">\{\{message\}\}</div>
  <a href="/"><mdui-button variant="filled" icon="home">返回首页</mdui-button></a>
</div>`
      : '';
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="renderer" content="webkit"/>
<title>${title}</title>
<link rel="icon" type="image/png" href="/uploads/kn.png">
<link rel="stylesheet" href="${CDN_CSS}">
<link rel="stylesheet" href="${CDN_FA}">
<link rel="stylesheet" href="/vendor/ke/env.css">
<link rel="stylesheet" href="/css/app.css">
</head>
<body class="theme-aurora" data-page="${page}">
<div id="app-shell"></div>
<main class="page-container" id="view">${viewInner}</main>
<script src="/js/core.js"></script>
<script src="/js/ripple.js"></script>
<script src="/js/cards.js"></script>
<script src="/js/upload.js"></script>
<script src="/js/bots-manager.js"></script>
<script src="/js/shell.js"></script>
${pageJs}
<script>window.__mdui && window.__mdui.mutation && window.__mdui.mutation();</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(viewDir, name + '.html'), html);
  console.log('written views/' + name + '.html');
}
