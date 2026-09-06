// ==UserScript==
// @name         EEV3 音频捕获下载面板
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  捕获 eev3.com/mp3 页面音频请求并生成下载面板
// @author       you
// @match        https://www.eev3.com/mp3/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const audioExts = ['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'webm', 'mp4'];
    const captured = new Map();

    /* ---------- 拦截网络请求 ---------- */
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        checkUrl(url);
        return origOpen.apply(this, arguments);
    };

    const origFetch = window.fetch;
    window.fetch = function () {
        const url = arguments[0];
        checkUrl(url);
        return origFetch.apply(this, arguments);
    };

    function checkUrl(url) {
        if (!url || typeof url !== 'string') return;
        const lower = url.toLowerCase();
        if (audioExts.some(ext => lower.includes('.' + ext))) {
            if (!captured.has(url)) {
                captured.set(url, {
                    url,
                    ext: url.split('.').pop().split('?')[0]
                });
            }
        }
    }

    /* ---------- 创建下载面板 ---------- */
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'eev3-dl-panel';
        panel.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 80px;
            width: 360px;
            max-height: 70vh;
            overflow-y: auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,.3);
            z-index: 99999;
            font-size: 14px;
            display: none;
        `;

        const header = document.createElement('div');
        header.innerHTML = `
            <div style="padding:10px;background:#1aa270;color:#fff;font-weight:bold;">
                捕获到的音频资源
                <span style="float:right;cursor:pointer;" id="eev3-close">×</span>
            </div>
        `;
        panel.appendChild(header);

        const list = document.createElement('div');
        list.id = 'eev3-list';
        panel.appendChild(list);

        document.body.appendChild(panel);

        document.getElementById('eev3-close').onclick = () => {
            panel.style.display = 'none';
        };

        return list;
    }

    function updateList(list) {
        list.innerHTML = '';
        if (captured.size === 0) {
            list.innerHTML = '<div style="padding:10px;">暂无捕获到音频</div>';
            return;
        }

        [...captured.values()].forEach(item => {
            const row = document.createElement('div');
            row.style.cssText = 'padding:8px;border-bottom:1px solid #eee;';

            const name = document.createElement('div');
            name.textContent = decodeURIComponent(item.url.split('/').pop());
            name.style.cssText = 'margin-bottom:6px;word-break:break-all;';

            const btn = document.createElement('button');
            btn.textContent = '下载';
            btn.style.cssText = `
                padding:4px 10px;
                background:#1aa270;
                color:#fff;
                border:none;
                border-radius:3px;
                cursor:pointer;
            `;
            btn.onclick = () => {
                const a = document.createElement('a');
                a.href = item.url;
                a.download = item.url.split('/').pop();
                a.click();
            };

            row.appendChild(name);
            row.appendChild(btn);
            list.appendChild(row);
        });
    }

    /* ---------- 注入按钮 ---------- */
    function injectButton() {
        const dj = document.querySelector('.djname');
        if (!dj || document.getElementById('eev3-btn')) return;

        const btn = document.createElement('span');
        btn.id = 'eev3-btn';
        btn.innerHTML = '下载面板';
        btn.style.cssText = `
            padding:1px 8px;
            border-radius:3px;
            background:#1aa270;
            color:#fff;
            float:right;
            margin-left:6px;
            cursor:pointer;
        `;

        btn.onclick = () => {
            const panel = document.getElementById('eev3-dl-panel');
            const list = document.getElementById('eev3-list') || createPanel();
            updateList(list);
            document.getElementById('eev3-dl-panel').style.display = 'block';
        };

        dj.querySelector('h1').appendChild(btn);
    }

    /* ---------- 初始化 ---------- */
    window.addEventListener('load', () => {
        createPanel();
        injectButton();
    });

    // 动态页面兼容
    const observer = new MutationObserver(injectButton);
    observer.observe(document.body, { childList: true, subtree: true });

})();