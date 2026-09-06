const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8746;
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.md': 'text/plain',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.opus': 'audio/opus',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
  '.tar': 'application/x-tar', '.gz': 'application/gzip', '.7z': 'application/x-7z-compressed'
};

function getMime(ext) { return MIME[ext] || 'application/octet-stream'; }

function sendFile(req, res, fullPath, stats, mime) {
  const range = req.headers.range;
  if (range && /^video\/|^audio\//.test(mime)) {
    const size = stats.size;
    const [s, e] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(s, 10), end = e ? parseInt(e, 10) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': mime
    });
    fs.createReadStream(fullPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stats.size });
    fs.createReadStream(fullPath).pipe(res);
  }
}

function sendDir(res, fullPath, reqPath) {
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${reqPath||'/'}</title></head><body>`;
  html += `<h2>${reqPath||'/'}</h2><hr>`;
  if (reqPath) { const parent = reqPath.split('/').slice(0,-1).join('/'); html += `<a href="/${parent}">../</a><br>`; }
  for (const name of fs.readdirSync(fullPath).sort()) {
    const stat = fs.statSync(path.join(fullPath, name));
    const href = '/' + path.posix.join(reqPath, name);
    if (stat.isDirectory()) { html += `<a href="${href}/">${name}/</a><br>`; }
    else if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) { html += `<a href="${href}"><img src="${href}" style="max-width:120px;max-height:120px;vertical-align:middle;margin:2px;"> ${name}</a><br>`; }
    else { html += `<a href="${href}">${name}</a><br>`; }
  }
  html += '</body></html>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function collectEntries(dirPath, reqPath) {
  const entries = [];
  for (const name of fs.readdirSync(dirPath)) {
    const fullPath = path.join(dirPath, name);
    const stat = fs.statSync(fullPath);
    const entryPath = path.posix.join('/', reqPath, name);
    entries.push({ path: entryPath, stat });
    if (stat.isDirectory()) entries.push(...collectEntries(fullPath, path.posix.join(reqPath, name)));
  }
  return entries;
}

function handlePropfind(req, res, fullPath, reqPath) {
  try { fs.statSync(fullPath); } catch { res.writeHead(404); res.end(); return; }
  const depth = req.headers.depth || '1';
  let entries = [];
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    entries.push({ path: '/' + reqPath, stat });
    if (depth === '1' || depth === 'infinity') entries.push(...collectEntries(fullPath, reqPath));
  } else {
    entries.push({ path: '/' + reqPath, stat });
  }
  let xml = `<?xml version="1.0" encoding="utf-8"?>\n<D:multistatus xmlns:D="DAV:">\n`;
  for (const entry of entries) {
    const isDir = entry.stat.isDirectory();
    xml += `  <D:response>\n    <D:href>${entry.path}${isDir && !entry.path.endsWith('/') ? '/' : ''}</D:href>\n    <D:propstat>\n      <D:prop>\n        <D:resourcetype>${isDir ? '<D:collection/>' : ''}</D:resourcetype>\n        ${!isDir ? `<D:getcontentlength>${entry.stat.size}</D:getcontentlength>` : ''}\n        <D:getlastmodified>${entry.stat.mtime.toUTCString()}</D:getlastmodified>\n      </D:prop>\n      <D:status>HTTP/1.1 200 OK</D:status>\n    </D:propstat>\n  </D:response>\n`;
  }
  xml += `</D:multistatus>`;
  res.writeHead(207, { 'Content-Type': 'application/xml; charset=utf-8', 'DAV': '1', 'Content-Length': Buffer.byteLength(xml) });
  res.end(xml);
}

const WRITE_METHODS = ['MKCOL','PUT','DELETE','COPY','MOVE','LOCK','UNLOCK'];

const server = http.createServer((req, res) => {
  if (WRITE_METHODS.includes(req.method)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden - Read Only');
    return;
  }
  const reqPath = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, ''));
  const fullPath = path.join(ROOT, reqPath);
  if (!fullPath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'DAV': '1', 'Allow': 'GET, HEAD, OPTIONS, PROPFIND', 'MS-Author-Via': 'DAV' });
    res.end(); return;
  }
  if (req.method === 'PROPFIND') { handlePropfind(req, res, fullPath, reqPath); return; }

  fs.stat(fullPath, (err, stat) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const mime = getMime(path.extname(fullPath).toLowerCase());
    if (stat.isDirectory()) sendDir(res, fullPath, reqPath);
    else sendFile(req, res, fullPath, stat, mime);
  });
});

server.listen(PORT, () => console.log(`http://localhost:${PORT}`));