const utils = require('utils');

function b64utf8(str){const b=new TextEncoder().encode(str);let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s);}

const WATERMARK_EXT = {
    type: 'WATERMARK_EXT',
    title: '水印工具',
    icon: `data:image/svg+xml;charset=utf-8;base64,${b64utf8(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect x="100" y="100" width="824" height="824" fill="#4CAF50" rx="60"/><text x="512" y="560" font-size="300" text-anchor="middle" fill="#fff">印</text></svg>`)}`,
    color: '#4CAF50',
    methods: [
        {
            type: 'add_watermark',
            message0: '添加水印 %1',
            args0: [
                { type: 'field_input', name: 'text', text: '我的水印' }
            ],
            tooltip: '在画布左上角添加自定义文本水印',
            function: function (params) {
                const text = params.text || '水印';
                
                let canvas = null;
                const possibleSelectors = [
                    'canvas',
                    '.blocklyCanvas',
                    '#canvas',
                    '.stage-canvas',
                    '.editor-canvas'
                ];
                
                for (const selector of possibleSelectors) {
                    canvas = document.querySelector(selector);
                    if (canvas) break;
                }
                
                if (!canvas) {
                    canvas = document.getElementsByTagName('canvas')[0];
                }
                
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    ctx.font = 'bold 16px Arial, sans-serif';
                    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(text, 15, 15);
                    ctx.restore();
                    window.__CUE_TOAST__('水印添加成功: ' + text, 'ok');
                } else {
                    const canvasCount = document.getElementsByTagName('canvas').length;
                    window.__CUE_TOAST__('未找到画布 (共 ' + canvasCount + ' 个canvas)', 'error');
                }
                return null;
            }
        },
        {
            type: 'add_watermark_advanced',
            message0: '添加水印 %1 颜色 %2 字号 %3',
            args0: [
                { type: 'field_input', name: 'text', text: '我的水印' },
                { type: 'field_input', name: 'color', text: '#666666' },
                { type: 'field_input', name: 'size', text: '16' }
            ],
            tooltip: '自定义水印样式',
            function: function (params) {
                const text = params.text || '水印';
                const color = params.color || '#666666';
                const size = parseInt(params.size) || 16;
                
                let canvas = document.querySelector('canvas') || document.getElementsByTagName('canvas')[0];
                
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.save();
                    ctx.font = 'bold ' + size + 'px Arial, sans-serif';
                    ctx.fillStyle = color;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(text, 15, 15);
                    ctx.restore();
                    window.__CUE_TOAST__('水印添加成功', 'ok');
                } else {
                    window.__CUE_TOAST__('未找到画布', 'error');
                }
                return null;
            }
        },
        {
            type: 'clear_canvas',
            message0: '清空画布',
            tooltip: '清空画布内容',
            function: function () {
                let canvas = document.querySelector('canvas') || document.getElementsByTagName('canvas')[0];
                
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    window.__CUE_TOAST__('画布已清空', 'ok');
                } else {
                    window.__CUE_TOAST__('未找到画布', 'error');
                }
                return null;
            }
        },
        {
            type: 'list_canvases',
            message0: '列出画布信息',
            tooltip: '显示当前页面所有canvas信息',
            function: function () {
                const canvases = document.getElementsByTagName('canvas');
                let info = '画布数量: ' + canvases.length + '\n';
                for (let i = 0; i < canvases.length; i++) {
                    const c = canvases[i];
                    info += 'Canvas ' + i + ': ' + c.width + 'x' + c.height + '\n';
                    if (c.className) info += '  Class: ' + c.className + '\n';
                    if (c.id) info += '  ID: ' + c.id + '\n';
                }
                window.__CUE_TOAST__(info, 'ok');
                return null;
            }
        }
    ],
    events: [],
    toolbox: [
        { type: 'label', text: '水印工具' },
        { type: 'method', block: 'add_watermark' },
        { type: 'method', block: 'add_watermark_advanced' },
        { type: 'method', block: 'clear_canvas' },
        { type: 'method', block: 'list_canvases' }
    ]
};

exports.extension = WATERMARK_EXT;