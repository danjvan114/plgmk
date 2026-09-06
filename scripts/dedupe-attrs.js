'use strict';
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'public', 'js');
const files = [];
for (const f of fs.readdirSync(base)) if (f.endsWith('.js')) files.push(path.join(base, f));
const pageDir = path.join(base, 'page');
for (const f of fs.readdirSync(pageDir)) if (f.endsWith('.js')) files.push(path.join(pageDir, f));

const ATTR = /([a-zA-Z_:@-][a-zA-Z0-9_:.@-]*)\s*=\s*("[^"]*"|'[^']*')/g;

function dedupeTag(tagText) {
  const spaceIdx = tagText.search(/\s/);
  if (spaceIdx < 0) return tagText;
  const tagName = tagText.slice(1, spaceIdx);
  let rest = tagText.slice(spaceIdx, -1);
  const seen = new Map();
  let out = '';
  let last = 0;
  let m;
  const matches = [];
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(rest))) matches.push({ name: m[1], value: m[2], start: m.index, end: m.index + m[0].length });
  if (!matches.length) return tagText;
  for (const mm of matches) {
    out += rest.slice(last, mm.start);
    if (!seen.has(mm.name)) {
      seen.set(mm.name, mm);
      out += `${mm.name}=${mm.value}`;
    } else if (mm.name === 'class') {
      const prev = seen.get(mm.name);
      const prevVals = prev.value.slice(1, -1).split(/\s+/).filter(Boolean);
      const newVals = mm.value.slice(1, -1).split(/\s+/).filter(Boolean);
      const merged = prevVals.concat(newVals.filter((v) => prevVals.indexOf(v) < 0));
      const replacement = `class="${merged.join(' ')}"`;
      const idx = out.lastIndexOf(`${prev.name}=${prev.value}`);
      if (idx >= 0) out = out.slice(0, idx) + replacement + out.slice(idx + `${prev.name}=${prev.value}`.length);
      prev.value = `"${merged.join(' ')}"`;
    }
    last = mm.end;
  }
  out += rest.slice(last);
  return '<' + tagName + out + '>';
}

let changed = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/<[a-zA-Z][^<>]*>/g, (tag) => {
    if (!/\s/.test(tag)) return tag;
    ATTR.lastIndex = 0;
    const names = [];
    let m;
    const body = tag.slice(tag.search(/\s/), -1);
    ATTR.lastIndex = 0;
    while ((m = ATTR.exec(body))) names.push(m[1]);
    const dup = names.length !== new Set(names).size;
    return dup ? dedupeTag(tag) : tag;
  });
  if (out !== src) {
    fs.writeFileSync(file, out);
    changed += 1;
    console.log('deduped', path.relative(base, file));
  }
}
console.log('changed', changed);
