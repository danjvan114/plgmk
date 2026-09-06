'use strict';
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'js');
const files = [];
for (const f of fs.readdirSync(targetDir)) if (f.endsWith('.js')) files.push(path.join(targetDir, f));
for (const f of fs.readdirSync(path.join(targetDir, 'page'))) if (f.endsWith('.js')) files.push(path.join(targetDir, 'page', f));

const VARIANT = { filled: 'primary', tonal: 'tonal', text: 'text', outlined: 'outline', elevated: 'primary' };
const SIZE = { small: 'sm', large: 'lg' };

function parseAttrs(attrStr) {
  const attrs = [];
  const re = /([a-zA-Z_:@-][a-zA-Z0-9_:.@-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(attrStr))) {
    attrs.push({ name: m[1], value: m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '', raw: m[0] });
  }
  return attrs;
}

function renderAttrs(attrs) {
  return attrs.filter((a) => a.name !== 'variant' && a.name !== 'size' && a.name !== 'icon' && a.name !== 'selects')
    .map((a) => `${a.name}="${a.value}"`).join(' ');
}

function convert(src) {
  let s = src;

  s = s.replace(/<mdui-button\b([^>]*)>([\s\S]*?)<\/mdui-button>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const variant = (a.find((x) => x.name === 'variant') || {}).value || 'tonal';
    const size = (a.find((x) => x.name === 'size') || {}).value || '';
    const icon = (a.find((x) => x.name === 'icon') || {}).value || '';
    const cls = ['btn', VARIANT[variant] || 'tonal'];
    if (SIZE[size]) cls.push(SIZE[size]);
    const iconHtml = icon ? `<span class="material-icons" style="font-size:18px">${icon}</span>` : '';
    const rest = renderAttrs(a);
    return `<button type="button" class="${cls.join(' ')}"${rest ? ' ' + rest : ''}>${iconHtml}${inner}</button>`;
  });

  s = s.replace(/<mdui-icon-button\b([^>]*)\/?>(?:<\/mdui-icon-button>)?/g, (full, attrStr) => {
    const a = parseAttrs(attrStr);
    const icon = (a.find((x) => x.name === 'icon') || {}).value || '';
    const rest = renderAttrs(a);
    return `<button type="button" class="ke-iconbtn"${rest ? ' ' + rest : ''}><span class="material-icons">${icon}</span></button>`;
  });

  s = s.replace(/<mdui-chip\b([^>]*)>([\s\S]*?)<\/mdui-chip>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const variant = (a.find((x) => x.name === 'variant') || {}).value || 'tonal';
    const rest = renderAttrs(a.filter((x) => x.name !== 'size'));
    const cls = variant === 'outline' ? 'chip outline' : 'chip tonal';
    return `<span class="${cls}"${rest ? ' ' + rest : ''}>${inner}</span>`;
  });

  s = s.replace(/<mdui-circular-progress\b([^>]*)\/?>(?:<\/mdui-circular-progress>)?/g, (full, attrStr) => {
    const a = parseAttrs(attrStr);
    const stroke = (a.find((x) => x.name === 'stroke-width') || {}).value;
    const cls = /^\d+$/.test(String(stroke)) && Number(stroke) >= 4 ? 'ke-spinner lg' : 'ke-spinner';
    return `<span class="${cls}"></span>`;
  });

  s = s.replace(/<mdui-linear-progress\b([^>]*)\/?>(?:<\/mdui-linear-progress>)?/g, '<div class="progress-track"><div class="progress-fill"></div></div>');

  s = s.replace(/<mdui-text-field\b([^>]*)>([\s\S]*?)<\/mdui-text-field>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const get = (n) => (a.find((x) => x.name === n) || {}).value;
    const id = get('id') || '';
    const label = get('label') || '';
    const placeholder = get('placeholder') || label;
    const value = get('value') || '';
    const type = get('type') || 'text';
    const maxlength = get('maxlength') || '';
    const rows = get('rows') || '';
    const multiline = a.some((x) => x.name === 'multiline');
    const rest = renderAttrs(a.filter((x) => !['label', 'placeholder', 'value', 'multiline', 'type', 'variant', 'rows'].includes(x.name)));
    const common = [];
    if (id) common.push(`id="${id}"`);
    if (placeholder) common.push(`placeholder="${placeholder}"`);
    if (maxlength) common.push(`maxlength="${maxlength}"`);
    if (rest) common.push(rest);
    if (multiline) {
      return `<textarea class="textarea-input" ${common.join(' ')}${rows ? ` rows="${rows}"` : ''}>${value}</textarea>`;
    }
    return `<input class="text-input" type="${type}" ${common.join(' ')}${value ? ` value="${value}"` : ''}>`;
  });

  s = s.replace(/<mdui-segmented-button-group\b([^>]*)>([\s\S]*?)<\/mdui-segmented-button-group>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const value = (a.find((x) => x.name === 'value') || {}).value || '';
    const rest = renderAttrs(a);
    const items = inner.replace(/<mdui-segmented-button\b([^>]*)>([\s\S]*?)<\/mdui-segmented-button>/g, (f, ia, itext) => {
      const iaa = parseAttrs(ia);
      const v = (iaa.find((x) => x.name === 'value') || {}).value || '';
      const irest = renderAttrs(iaa);
      return `<button type="button" class="seg-item" data-value="${v}"${irest && irest !== `data-value="${v}"` ? '' : ''}>${itext}</button>`;
    });
    return `<div class="seg-group" data-value="${value}"${rest ? ' ' + rest : ''}>${items}</div>`;
  });

  s = s.replace(/<mdui-select\b([^>]*)>([\s\S]*?)<\/mdui-select>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const value = (a.find((x) => x.name === 'value') || {}).value || '';
    const rest = renderAttrs(a);
    const opts = inner.replace(/<mdui-menu-item\b([^>]*)>([\s\S]*?)<\/mdui-menu-item>/g, (f, oa, otext) => {
      const oaa = parseAttrs(oa);
      const v = (oaa.find((x) => x.name === 'value') || {}).value || '';
      const sel = v && v === value ? ' selected' : '';
      return `<option value="${v}"${sel}>${otext}</option>`;
    });
    return `<select class="select-input ke-select"${rest ? ' ' + rest : ''}>${opts}</select>`;
  });

  s = s.replace(/<mdui-tabs\b([^>]*)>([\s\S]*?)<\/mdui-tabs>/g, (full, attrStr, inner) => {
    const a = parseAttrs(attrStr);
    const value = (a.find((x) => x.name === 'value') || {}).value || '';
    const rest = renderAttrs(a);
    const tabRe = /<mdui-tab\b([^>]*)>([\s\S]*?)<\/mdui-tab>/g;
    let tabHtml = '';
    let m;
    while ((m = tabRe.exec(inner))) {
      const ta = parseAttrs(m[1]);
      const v = (ta.find((x) => x.name === 'value') || {}).value || '';
      const active = v && v === value ? ' active' : '';
      tabHtml += `<button type="button" class="ke-tab${active}" data-tab="${v}">${m[2]}</button>`;
    }
    const panelRe = /<mdui-tab-panel\b([^>]*)>([\s\S]*?)<\/mdui-tab-panel>/g;
    let panels = '';
    while ((m = panelRe.exec(inner))) {
      const pa = parseAttrs(m[1]);
      const v = (pa.find((x) => x.name === 'value') || {}).value || '';
      const active = v && v === value ? '' : ' style="display:none"';
      panels += `<div class="ke-tabpanel" data-panel="${v}"${active}>${m[2]}</div>`;
    }
    return `<div class="tabbar"${rest ? ' ' + rest : ''}><div class="ke-tabs" data-tabs>${tabHtml}</div>${panels}</div>`;
  });

  return s;
}

let changed = 0;
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  const after = convert(before);
  if (before !== after) {
    fs.writeFileSync(f, after);
    changed += 1;
    console.log('converted', path.relative(path.join(targetDir, '..'), f));
  }
}
console.log('changed files:', changed);
