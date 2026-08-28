const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || 'preview (15).html';
const root = process.cwd();
const htmlPath = path.join(root, SRC);

const html = fs.readFileSync(htmlPath, 'utf8');

// 1) 抽取 <head> 里的布局样式 <style>
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const styleCss = styleMatch ? styleMatch[1] : '';

// 2) 抽取 <body> 到第一个 <script> 之间的结构 HTML（即界面布局）
const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
const layout = bodyMatch ? bodyMatch[1].trim() : '';

// 3) 抽取内联脚本（svgBase64List / otic / 图标与卡片接线），即紧挨 editor.js 前的那段
const inlineMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<script src="editor\.js">/);
const inlineScript = inlineMatch ? inlineMatch[1] : '';

// 4) 引擎本体
const editorJs = fs.readFileSync(path.join(root, 'editor.js'), 'utf8');

// 5) 拼 app.js：先注入布局，再跑数据/接线，最后引擎自启动 init()
const appJs = [
  '/* 自动打包生成：布局 + 数据 + 引擎，全部由本文件绘制与驱动 */',
  "document.getElementById('app').innerHTML = " + JSON.stringify(layout) + ";",
  'try { if (window.mdui && mdui.mutation) mdui.mutation(); } catch (e) {}',
  inlineScript,
  editorJs
].join('\n\n');

// 6) 生成极简引导页 index.html
const indexHtml = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<title>编辑器布局</title>',
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mdui@1.0.2/dist/css/mdui.min.css">',
  '<link rel="stylesheet" href="icons.css">',
  '<script src="https://cdn.jsdelivr.net/npm/mdui@1.0.2/dist/js/mdui.min.js"></script>',
  '<style>' + styleCss + '</style>',
  '</head>',
  '<body>',
  '<div id="app"></div>',
  '<script src="app.js"></script>',
  '</body>',
  '</html>'
].join('\n');

fs.writeFileSync(path.join(root, 'index.html'), indexHtml, 'utf8');
fs.writeFileSync(path.join(root, 'app.js'), appJs, 'utf8');
console.log('BUILD OK -> index.html + app.js  (源: ' + SRC + ')');
console.log('layout bytes: ' + layout.length + ', inlineScript bytes: ' + inlineScript.length + ', editorJs bytes: ' + editorJs.length);
