var main = document.querySelector('.page-box');
var cw = document.querySelector('.content-wrapper');
var pc = document.querySelector('.pd-content');
var pp = document.querySelector('.pd-pane.active');
var dl = document.querySelector('.detail-layout');
var dm = document.querySelector('.detail-main');
var ds = document.querySelector('.detail-sidebar');
var results = [
  'page-box: ' + (main ? main.offsetWidth + 'x' + main.offsetHeight : 'NOT FOUND'),
  'content-wrapper: ' + (cw ? cw.offsetWidth + 'x' + cw.offsetHeight : 'NOT FOUND'),
  'pd-content: ' + (pc ? pc.offsetWidth + 'x' + pc.offsetHeight : 'NOT FOUND'),
  'pd-pane.active: ' + (pp ? pp.offsetWidth + 'x' + pp.offsetHeight : 'NOT FOUND'),
  'detail-layout: ' + (dl ? dl.offsetWidth + 'x' + dl.offsetHeight + ' display:' + getComputedStyle(dl).display + ' cols:' + getComputedStyle(dl).gridTemplateColumns : 'NOT FOUND'),
  'detail-main: ' + (dm ? dm.offsetWidth + 'x' + dm.offsetHeight : 'NOT FOUND'),
  'detail-sidebar: ' + (ds ? ds.offsetWidth + 'x' + ds.offsetHeight : 'NOT FOUND')
];
console.log(results.join('\n'));
