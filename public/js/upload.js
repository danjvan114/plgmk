(function () {
  'use strict';

  const App = window.App;

  function fileTooBigMsg(bytes) {
    return '文件超过 ' + Math.floor(bytes / 1048576) + ' MB 限制';
  }

  function uploadFile(opts) {
    const o = opts || {};
    const file = o.file;
    const kind = o.kind || 'plugin';
    const maxBytes = o.maxBytes || 10 * 1048576;
    const onProgress = o.onProgress;
    const onDone = o.onDone;
    const onError = o.onError;

    if (!file) {
      if (onError) onError('未选择文件');
      return null;
    }
    if (file.size > maxBytes) {
      if (onError) onError(fileTooBigMsg(maxBytes));
      return null;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload?kind=' + encodeURIComponent(kind));
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.setRequestHeader('X-File-Size', String(file.size));
    xhr.responseType = 'json';

    let lastTime = Date.now();
    let lastLoaded = 0;
    let speed = 0;

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const t = Date.now();
      const dt = (t - lastTime) / 1000;
      if (dt >= 0.25) {
        const inst = (e.loaded - lastLoaded) / dt;
        speed = speed ? speed * 0.6 + inst * 0.4 : inst;
        lastTime = t;
        lastLoaded = e.loaded;
      }
      if (onProgress) {
        onProgress({
          percent: Math.min(100, Math.round((e.loaded / e.total) * 100)),
          loaded: e.loaded,
          total: e.total,
          speed: speed
        });
      }
    };

    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        if (onProgress) onProgress({ percent: 100, loaded: file.size, total: file.size, speed: 0 });
        if (onDone) onDone(data);
      } else {
        if (onError) onError(data.msg || ('上传失败 (' + xhr.status + ')'));
      }
    };
    xhr.onerror = () => {
      if (onError) onError('网络错误，上传失败');
    };
    xhr.onabort = () => {
      if (onError) onError('上传已取消');
    };

    xhr.send(file);
    return {
      abort: () => xhr.abort(),
      xhr
    };
  }

  App.uploadFile = uploadFile;

  function createUploader(opts) {
    const o = opts || {};
    const kind = o.kind || 'plugin';
    const accept = o.accept;
    const maxBytes = o.maxBytes || 10 * 1048576;
    const multiple = !!o.multiple;
    const label = o.label || '选择文件';

    const root = document.createElement('div');
    root.className = 'ke-uploader';

    const area = document.createElement('div');
    area.className = 'upload-progress-area';
    area.innerHTML = `
      <div class="ke-uploader-idle">
        <span class="material-icons" style="font-size:34px;vertical-align:-8px;color:var(--mdui-color-on-surface-variant)">cloud_upload</span>
        <div style="margin-top:4px;color:var(--mdui-color-on-surface-variant);font-size:13px">${App.esc(label)} · 拖拽或点击选择</div>
        <div style="font-size:12px;color:var(--mdui-color-outline);margin-top:2px">单个文件不超过 ${Math.floor(maxBytes / 1048576)} MB${o.hint ? ' · ' + App.esc(o.hint) : ''}</div>
      </div>
      <div class="uploading-box">
        <div class="progress-track"><div class="progress-fill"></div></div>
        <div class="progress-meta"><span class="ke-up-pct">0%</span><span class="ke-up-eta"></span></div>
      </div>
    `;
    root.appendChild(area);

    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    if (accept) input.accept = accept;
    if (multiple) input.multiple = true;
    root.appendChild(input);

    const results = [];
    let seq = 0;
    const resultBox = document.createElement('div');
    resultBox.className = 'ke-upload-results';
    root.appendChild(resultBox);

    function showResult(item) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px';
      row.innerHTML = `<span class="material-icons" style="color:#2e7d32;font-size:18px">check_circle</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${App.esc(item.file.originalName || item.file.filename)}</span>`;
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'ke-iconbtn';
      rm.innerHTML = '<span class="material-icons">close</span>';
      rm.addEventListener('click', () => {
        const idx = results.indexOf(item);
        if (idx >= 0) results.splice(idx, 1);
        row.remove();
        if (o.onChange) o.onChange(results.slice());
      });
      row.appendChild(rm);
      resultBox.appendChild(row);
      if (o.onChange) o.onChange(results.slice());
      root.dispatchEvent(new Event('change'));
    }

    function start(files) {
      for (const f of files) {
        const current = seq++;
        const areaBox = area.querySelector('.uploading-box');
        const progress = area.querySelector('.progress-fill');
        const pct = area.querySelector('.ke-up-pct');
        const eta = area.querySelector('.ke-up-eta');
        const idle = area.querySelector('.ke-uploader-idle');
        idle.style.display = 'none';
        areaBox.classList.add('show');

        const item = { file: null, uploading: true };
        const task = uploadFile({
          file: f,
          kind,
          maxBytes,
          onProgress: (p) => {
            progress.value = p.percent / 100;
            pct.textContent = p.percent + '%';
            if (p.speed && p.speed > 0) {
              const remain = p.total - p.loaded;
              const secs = Math.max(1, Math.round(remain / p.speed));
              eta.textContent = `${App.fmtBytes(p.speed)}/s · 剩余约 ${secs} 秒`;
            } else {
              eta.textContent = App.fmtBytes(p.loaded) + ' / ' + App.fmtBytes(p.total);
            }
          },
          onDone: (data) => {
            if (current !== seq - 1 || task._finished) {
              // keep simple: only last file controls area reset
            }
            item.file = data;
            item.uploading = false;
            item.originalName = f.name;
            showResult(item);
            if (o.onDone) o.onDone(data, f);
            resetArea();
          },
          onError: (msg) => {
            item.uploading = false;
            App.toast(msg || '上传失败');
            if (o.onError) o.onError(msg);
            resetArea();
          }
        });
      }
    }

    function resetArea() {
      if (area.querySelectorAll('.ke-up-inner').length) return;
      const uploading = results.some((r) => r.uploading) || (resultBox.childElementCount === 0);
      setTimeout(() => {
        if (results.some((r) => r.uploading)) return;
        area.querySelector('.ke-uploader-idle').style.display = '';
        area.querySelector('.uploading-box').classList.remove('show');
        const progress = area.querySelector('.progress-fill');
        progress.value = 0;
        area.querySelector('.ke-up-pct').textContent = '0%';
        area.querySelector('.ke-up-eta').textContent = '';
      }, 500);
    }

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag');
    });
    area.addEventListener('dragleave', () => area.classList.remove('drag'));
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag');
      const files = Array.from(e.dataTransfer.files || []);
      if (!o.multiple) files.splice(1);
      start(files);
    });
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      input.value = '';
      if (!o.multiple) files.splice(1);
      start(files);
    });

    root.getValue = () => results.filter((r) => r.file).map((r) => r.file);
    root.hasFile = () => results.some((r) => r.file);
    root.clear = () => {
      results.length = 0;
      resultBox.innerHTML = '';
      if (o.onChange) o.onChange([]);
    };
    return root;
  }

  App.createUploader = createUploader;
})();
