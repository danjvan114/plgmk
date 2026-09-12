// WebGL3D - 3D渲染扩展（使用普通画布）
// KNExpanse v1.2.2+ 兼容
const utils = require('utils');

var __GL_CANVAS__ = null;
var __GL_CONTEXT__ = null;
var __GL_CAMERA__ = { x: 0, y: 0, z: 5, rx: 0, ry: 0 };
var __GL_BLOCKS__ = [];

function redrawCanvas() {
    if (!__GL_CONTEXT__) return;
    var ctx = __GL_CONTEXT__;
    var canvas = __GL_CANVAS__;
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var size = 40;
    var offsetX = canvas.width / 2;
    var offsetY = canvas.height / 2;
    var cx = __GL_CAMERA__.x;
    var cy = __GL_CAMERA__.y;
    var cz = __GL_CAMERA__.z;
    __GL_BLOCKS__.forEach(function(block) {
        var dx = block.x - cx;
        var dy = block.y - cy;
        var dz = block.z - cz;
        var screenX = offsetX + dx * size - dz * size * 0.5;
        var screenY = offsetY - dy * size - dz * size * 0.3;
        if (block.type === 'block') {
            ctx.fillStyle = block.color;
            ctx.fillRect(screenX, screenY, size, size);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(screenX, screenY, size, size);
        } else if (block.type === 'texture') {
            var img = new Image();
            img.onload = function() {
                ctx.drawImage(img, screenX, screenY, size, size);
            };
            img.src = 'data:image/png;base64,' + block.base64;
        }
    });
}

const WEBGL3D_EXT = {
    type: 'WEBGL3D',
    title: 'WebGL3D',
    color: '#FFB6C1',
    methods: [
        {
            type: 'gl_create_canvas',
            message0: '创建3D画布',
            tooltip: '创建画布（粉色背景）',
            function: function(params) {
                try {
                    var container = document.getElementById('STAGE_WIDGET');
                    if (!container) {
                        window.__CUE_TOAST__('未找到STAGE_WIDGET容器', 'error');
                        return null;
                    }
                    if (__GL_CANVAS__) {
                        __GL_CANVAS__.remove();
                        __GL_CANVAS__ = null;
                        __GL_CONTEXT__ = null;
                    }
                    var canvas = document.createElement('canvas');
                    canvas.id = 'WEBGL3D_CANVAS';
                    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:100;';
                    var ctx = canvas.getContext('2d');
                    canvas.width = container.offsetWidth || 800;
                    canvas.height = container.offsetHeight || 600;
                    ctx.fillStyle = '#FFB6C1';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    container.appendChild(canvas);
                    __GL_CANVAS__ = canvas;
                    __GL_CONTEXT__ = ctx;
                } catch (e) {
                    window.__CUE_TOAST__('创建画布失败: ' + e.message, 'error');
                }
                return null;
            }
        },
        {
            type: 'gl_destroy_canvas',
            message0: '销毁3D画布',
            tooltip: '销毁画布',
            function: function(params) {
                try {
                    if (__GL_CANVAS__) {
                        __GL_CANVAS__.remove();
                        __GL_CANVAS__ = null;
                        __GL_CONTEXT__ = null;
                    }
                } catch (e) {
                    window.__CUE_TOAST__('销毁画布失败: ' + e.message, 'error');
                }
                return null;
            }
        },
        {
            type: 'gl_draw_base64',
            message0: '渲染Base64图 x1:%1 y1:%2 x2:%3 y2:%4 base64:%5',
            args0: [
                { type: 'field_input', name: 'x1', text: '0' },
                { type: 'field_input', name: 'y1', text: '0' },
                { type: 'field_input', name: 'x2', text: '200' },
                { type: 'field_input', name: 'y2', text: '200' },
                { type: 'field_input', name: 'base64', text: '' }
            ],
            tooltip: '渲染Base64图片',
            function: function(params) {
                if (!__GL_CONTEXT__) {
                    window.__CUE_TOAST__('请先创建画布', 'error');
                    return null;
                }
                var x1 = Number(params.x1 || 0);
                var y1 = Number(params.y1 || 0);
                var x2 = Number(params.x2 || 200);
                var y2 = Number(params.y2 || 200);
                var base64 = String(params.base64 || '').trim();
                if (!base64) {
                    window.__CUE_TOAST__('请输入Base64数据', 'error');
                    return null;
                }
                var img = new Image();
                img.onload = function() {
                    var ctx = __GL_CONTEXT__;
                    ctx.drawImage(img, x1, y1, x2 - x1, y2 - y1);
                };
                img.src = 'data:image/png;base64,' + base64;
                return null;
            }
        },
        {
            type: 'gl_draw_image',
            message0: '渲染网络图片 x1:%1 y1:%2 x2:%3 y2:%4 url:%5',
            args0: [
                { type: 'field_input', name: 'x1', text: '0' },
                { type: 'field_input', name: 'y1', text: '0' },
                { type: 'field_input', name: 'x2', text: '200' },
                { type: 'field_input', name: 'y2', text: '200' },
                { type: 'field_input', name: 'url', text: '' }
            ],
            tooltip: '渲染网络图片',
            function: function(params) {
                if (!__GL_CONTEXT__) {
                    window.__CUE_TOAST__('请先创建画布', 'error');
                    return null;
                }
                var x1 = Number(params.x1 || 0);
                var y1 = Number(params.y1 || 0);
                var x2 = Number(params.x2 || 200);
                var y2 = Number(params.y2 || 200);
                var url = String(params.url || '').trim();
                if (!url) {
                    window.__CUE_TOAST__('请输入URL', 'error');
                    return null;
                }
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function() {
                    var ctx = __GL_CONTEXT__;
                    ctx.drawImage(img, x1, y1, x2 - x1, y2 - y1);
                };
                img.src = url;
                return null;
            }
        },
        {
            type: 'gl_load_font',
            message0: '加载字体 url:%1',
            args0: [{ type: 'field_input', name: 'url', text: '' }],
            tooltip: '加载Web字体',
            function: function(params) {
                var url = String(params.url || '').trim();
                if (!url) {
                    window.__CUE_TOAST__('请输入字体URL', 'error');
                    return null;
                }
                var link = document.createElement('link');
                link.href = url;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
                return null;
            }
        },
        {
            type: 'gl_draw_text',
            message0: '渲染文字 x:%1 y:%2 内容:%3',
            args0: [
                { type: 'field_input', name: 'x', text: '10' },
                { type: 'field_input', name: 'y', text: '50' },
                { type: 'field_input', name: 'text', text: '' }
            ],
            tooltip: '渲染文字',
            function: function(params) {
                if (!__GL_CONTEXT__) {
                    window.__CUE_TOAST__('请先创建画布', 'error');
                    return null;
                }
                var x = Number(params.x || 10);
                var y = Number(params.y || 50);
                var text = String(params.text || '');
                var ctx = __GL_CONTEXT__;
                ctx.fillStyle = '#000';
                ctx.font = '24px Arial';
                ctx.fillText(text, x, y);
                return null;
            }
        },
        {
            type: 'gl_load_obj',
            message0: '加载OBJ模型 url:%1',
            args0: [{ type: 'field_input', name: 'url', text: '' }],
            tooltip: '加载OBJ模型',
            function: function(params) {
                var url = String(params.url || '').trim();
                if (!url) {
                    window.__CUE_TOAST__('请输入模型URL', 'error');
                    return null;
                }
                fetch(url).then(function(r) { return r.text(); }).catch(function(e) { window.__CUE_TOAST__('加载失败: ' + e.message, 'error'); });
                return null;
            }
        },
        {
            type: 'gl_camera_up',
            message0: '摄像机向上移动:%1',
            args0: [{ type: 'field_input', name: 'distance', text: '1' }],
            tooltip: '摄像机向上移动',
            function: function(params) {
                __GL_CAMERA__.y += Number(params.distance || 1);
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_camera_down',
            message0: '摄像机向下移动:%1',
            args0: [{ type: 'field_input', name: 'distance', text: '1' }],
            tooltip: '摄像机向下移动',
            function: function(params) {
                __GL_CAMERA__.y -= Number(params.distance || 1);
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_camera_left',
            message0: '摄像机向左移动:%1',
            args0: [{ type: 'field_input', name: 'distance', text: '1' }],
            tooltip: '摄像机向左移动',
            function: function(params) {
                __GL_CAMERA__.x -= Number(params.distance || 1);
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_camera_right',
            message0: '摄像机向右移动:%1',
            args0: [{ type: 'field_input', name: 'distance', text: '1' }],
            tooltip: '摄像机向右移动',
            function: function(params) {
                __GL_CAMERA__.x += Number(params.distance || 1);
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_camera_position',
            message0: '摄像机移动到 x:%1 y:%2 z:%3',
            args0: [
                { type: 'field_input', name: 'x', text: '0' },
                { type: 'field_input', name: 'y', text: '0' },
                { type: 'field_input', name: 'z', text: '5' }
            ],
            tooltip: '设置摄像机位置',
            function: function(params) {
                __GL_CAMERA__.x = Number(params.x || 0);
                __GL_CAMERA__.y = Number(params.y || 0);
                __GL_CAMERA__.z = Number(params.z || 5);
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_camera_look',
            message0: '摄像机面向 水平:%1度 垂直:%2度',
            args0: [
                { type: 'field_input', name: 'h', text: '0' },
                { type: 'field_input', name: 'v', text: '0' }
            ],
            tooltip: '设置摄像机朝向',
            function: function(params) {
                __GL_CAMERA__.ry = Number(params.h || 0) * Math.PI / 180;
                __GL_CAMERA__.rx = Number(params.v || 0) * Math.PI / 180;
                return null;
            }
        },
        {
            type: 'gl_camera_rotate_h',
            message0: '摄像机水平增加:%1度',
            args0: [{ type: 'field_input', name: 'angle', text: '10' }],
            tooltip: '摄像机水平旋转',
            function: function(params) {
                __GL_CAMERA__.ry += Number(params.angle || 10) * Math.PI / 180;
                return null;
            }
        },
        {
            type: 'gl_camera_rotate_v',
            message0: '摄像机垂直增加:%1度',
            args0: [{ type: 'field_input', name: 'angle', text: '10' }],
            tooltip: '摄像机垂直旋转',
            function: function(params) {
                __GL_CAMERA__.rx += Number(params.angle || 10) * Math.PI / 180;
                return null;
            }
        },
        {
            type: 'gl_draw_block',
            message0: '绘制方块 x:%1 y:%2 z:%3 颜色:%4',
            args0: [
                { type: 'field_input', name: 'x', text: '0' },
                { type: 'field_input', name: 'y', text: '0' },
                { type: 'field_input', name: 'z', text: '0' },
                { type: 'field_input', name: 'color', text: '#FF0000' }
            ],
            tooltip: '绘制3D方块',
            function: function(params) {
                if (!__GL_CONTEXT__) {
                    window.__CUE_TOAST__('请先创建画布', 'error');
                    return null;
                }
                var x = Number(params.x || 0);
                var y = Number(params.y || 0);
                var z = Number(params.z || 0);
                var color = String(params.color || '#FF0000');
                var ctx = __GL_CONTEXT__;
                var size = 40;
                var offsetX = __GL_CANVAS__.width / 2;
                var offsetY = __GL_CANVAS__.height / 2;
                var screenX = offsetX + x * size - z * size * 0.5;
                var screenY = offsetY - y * size - z * size * 0.3;
                ctx.fillStyle = color;
                ctx.fillRect(screenX, screenY, size, size);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(screenX, screenY, size, size);
                __GL_BLOCKS__.push({ x, y, z, color, type: 'block' });
                return null;
            }
        },
        {
            type: 'gl_destroy_block',
            message0: '销毁方块 x:%1 y:%2 z:%3',
            args0: [
                { type: 'field_input', name: 'x', text: '0' },
                { type: 'field_input', name: 'y', text: '0' },
                { type: 'field_input', name: 'z', text: '0' }
            ],
            tooltip: '销毁指定位置方块',
            function: function(params) {
                var x = Number(params.x || 0);
                var y = Number(params.y || 0);
                var z = Number(params.z || 0);
                __GL_BLOCKS__ = __GL_BLOCKS__.filter(function(b) {
                    return !(b.x === x && b.y === y && b.z === z && b.type === 'block');
                });
                redrawCanvas();
                return null;
            }
        },
        {
            type: 'gl_draw_texture_block',
            message0: '绘制纹理方块 x:%1 y:%2 z:%3 base64:%4',
            args0: [
                { type: 'field_input', name: 'x', text: '0' },
                { type: 'field_input', name: 'y', text: '0' },
                { type: 'field_input', name: 'z', text: '0' },
                { type: 'field_input', name: 'base64', text: '' }
            ],
            tooltip: '绘制带纹理的3D方块',
            function: function(params) {
                if (!__GL_CONTEXT__) {
                    window.__CUE_TOAST__('请先创建画布', 'error');
                    return null;
                }
                var x = Number(params.x || 0);
                var y = Number(params.y || 0);
                var z = Number(params.z || 0);
                var base64 = String(params.base64 || '').trim();
                if (!base64) {
                    window.__CUE_TOAST__('请输入Base64数据', 'error');
                    return null;
                }
                var ctx = __GL_CONTEXT__;
                var size = 40;
                var offsetX = __GL_CANVAS__.width / 2;
                var offsetY = __GL_CANVAS__.height / 2;
                var screenX = offsetX + x * size - z * size * 0.5;
                var screenY = offsetY - y * size - z * size * 0.3;
                var img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, screenX, screenY, size, size);
                };
                img.src = 'data:image/png;base64,' + base64;
                __GL_BLOCKS__.push({ x, y, z, base64, type: 'texture' });
                return null;
            }
        },
        {
            type: 'gl_destroy_texture_block',
            message0: '销毁纹理方块 x:%1 y:%2 z:%3',
            args0: [
                { type: 'field_input', name: 'x', text: '0' },
                { type: 'field_input', name: 'y', text: '0' },
                { type: 'field_input', name: 'z', text: '0' }
            ],
            tooltip: '销毁指定位置纹理方块',
            function: function(params) {
                var x = Number(params.x || 0);
                var y = Number(params.y || 0);
                var z = Number(params.z || 0);
                __GL_BLOCKS__ = __GL_BLOCKS__.filter(function(b) {
                    return !(b.x === x && b.y === y && b.z === z && b.type === 'texture');
                });
                redrawCanvas();
                return null;
            }
        }
    ],
    events: [],
    toolbox: [
        { type: 'label', text: '画布' },
        { type: 'method', block: 'gl_create_canvas' },
        { type: 'method', block: 'gl_destroy_canvas' },
        { type: 'label', text: '渲染' },
        { type: 'method', block: 'gl_draw_base64' },
        { type: 'method', block: 'gl_draw_image' },
        { type: 'method', block: 'gl_load_font' },
        { type: 'method', block: 'gl_draw_text' },
        { type: 'method', block: 'gl_load_obj' },
        { type: 'label', text: '方块' },
        { type: 'method', block: 'gl_draw_block' },
        { type: 'method', block: 'gl_destroy_block' },
        { type: 'method', block: 'gl_draw_texture_block' },
        { type: 'method', block: 'gl_destroy_texture_block' },
        { type: 'label', text: '摄像机移动' },
        { type: 'method', block: 'gl_camera_up' },
        { type: 'method', block: 'gl_camera_down' },
        { type: 'method', block: 'gl_camera_left' },
        { type: 'method', block: 'gl_camera_right' },
        { type: 'method', block: 'gl_camera_position' },
        { type: 'label', text: '摄像机朝向' },
        { type: 'method', block: 'gl_camera_look' },
        { type: 'method', block: 'gl_camera_rotate_h' },
        { type: 'method', block: 'gl_camera_rotate_v' }
    ]
};

exports.extension = WEBGL3D_EXT;