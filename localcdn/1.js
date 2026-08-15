// Dan Dev Tools - 开发者工具扩展
// KNExpanse v1.2.2+ 兼容
const utils = require('utils');

/* ===== 全局变量 ===== */
var __CLIPBOARD_CONTENT__ = '';
var __DIRECTORY_CONTENT__ = '';
var __NOTIFICATIONS__ = [];
var __NOTIFICATION_MAX__ = 3;
var __RSA_PUBLIC_KEY__ = '';
var __RSA_PRIVATE_KEY__ = '';
var __RSA_ENCRYPTED__ = '';
var __RSA_DECRYPTED__ = '';
var __HTTP_RESPONSE__ = '';
var __HTTP_STATUS__ = 0;
var __CANVAS__ = null;
var __CANVAS_CONTEXT__ = null;

/* ===== MDUI对话框回调结果 ===== */
var __MDUI_DIALOG_RESULT__ = null;
var __MDUI_DIALOG_READY__ = false;

/* ===== 惠特米勒对象 ===== */
var __WHITMILLER_OBJECT__ = null;

/* ===== 弹窗限制变量 ===== */
var __DIALOG_COOLDOWN_MS__ = 1000;
var __DIALOG_LAST_TIME__ = 0;
var __DIALOG_BLOCKED__ = false;

/* ===== 涟漪效果变量 ===== */
var __RIPPLE_ELEMENTS__ = {};


/* ===== 弹窗限制检查函数 ===== */
function checkDialogLimit() {
    var now = Date.now();
    if (__DIALOG_BLOCKED__) {
        return false;
    }
    if (now - __DIALOG_LAST_TIME__ < __DIALOG_COOLDOWN_MS__) {
        __DIALOG_BLOCKED__ = true;
        setTimeout(function() {
            __DIALOG_BLOCKED__ = false;
        }, __DIALOG_COOLDOWN_MS__);
        return false;
    }
    __DIALOG_LAST_TIME__ = now;
    return true;
}

/* ===== 弹窗位置更新函数 ===== */
function updateNotificationPositions() {
    for (var i = 0; i < __NOTIFICATIONS__.length; i++) {
        var el = document.getElementById(__NOTIFICATIONS__[i].id);
        if (el) {
            el.style.top = (16 + i * 100) + 'px';
        }
    }
}

/* ===== 显示通知函数 ===== */
function showDanNotification(title, detail, isError) {
    try {
        var notificationId = 'dan-notification-' + Date.now();
        
        __NOTIFICATIONS__.push({ id: notificationId, title: title, detail: detail });
        
        if (__NOTIFICATIONS__.length > __NOTIFICATION_MAX__) {
            var oldest = __NOTIFICATIONS__.shift();
            var oldEl = document.getElementById(oldest.id);
            if (oldEl) oldEl.remove();
        }
        
        var el = document.createElement('div');
        el.id = notificationId;
        el.style.cssText = 'position:fixed;right:16px;top:' + (16 + (__NOTIFICATIONS__.length - 1) * 100) + 'px;width:320px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);padding:14px;z-index:2147483647;border:1px solid #eee;';
        
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:600;font-size:14px;color:#333;margin-bottom:6px;';
        titleEl.textContent = title;
        el.appendChild(titleEl);
        
        var detailEl = document.createElement('div');
        detailEl.style.cssText = 'font-size:13px;color:#666;line-height:1.5;margin-bottom:10px;word-break:break-all;max-height:60px;overflow:hidden;';
        detailEl.textContent = detail;
        el.appendChild(detailEl);
        
        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
        
        var copyBtn = document.createElement('button');
        copyBtn.textContent = '复制';
        copyBtn.style.cssText = 'padding:4px 12px;font-size:12px;color:#4CAF50;border:1px solid #4CAF50;border-radius:4px;background:#fff;cursor:pointer;';
        copyBtn.onclick = function() {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(detail).then(function() {
                    copyBtn.textContent = '已复制';
                    setTimeout(function() { copyBtn.textContent = '复制'; }, 2000);
                });
            }
        };
        btnContainer.appendChild(copyBtn);
        
        var closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = 'padding:4px 12px;font-size:12px;color:#999;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;';
        closeBtn.onclick = function() {
            el.remove();
            var index = __NOTIFICATIONS__.findIndex(function(n) { return n.id === notificationId; });
            if (index > -1) __NOTIFICATIONS__.splice(index, 1);
            updateNotificationPositions();
        };
        btnContainer.appendChild(closeBtn);
        
        el.appendChild(btnContainer);
        document.body.appendChild(el);
        
        setTimeout(function() {
            var existingEl = document.getElementById(notificationId);
            if (existingEl) {
                existingEl.remove();
                var index = __NOTIFICATIONS__.findIndex(function(n) { return n.id === notificationId; });
                if (index > -1) __NOTIFICATIONS__.splice(index, 1);
                updateNotificationPositions();
            }
        }, 8000);
        
    } catch (e) {
        if (window.__CUE_TOAST__) window.__CUE_TOAST__(e.message, 'error');
    }
}

/* ===== SVG 图标 ===== */
function b64utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
const ICON = `data:image/svg+xml;charset=utf-8;base64,${b64utf8(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#4CAF50" stroke="#fff" stroke-width="2"/><path d="M7 10h4v4H7zm6 0h4v4h-4z" fill="#fff"/></svg>`)}`;

const DAN_DEV_TOOLS = {
    type: 'DAN_DEV_TOOLS',
    title: 'Dan Dev Tools',
    icon: ICON,
    color: '#000000',
    silentFeedback: true,

    /* ==================== 积木定义 ==================== */
    methods: [
        // ──── Base64 操作 ────
        {
            type: 'base64_encode',
            message0: 'Base64 编码 %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            output: 'String',
            tooltip: '将字符串进行 Base64 编码',
            function: (params) => {
                try {
                    const text = String(params.text || '');
                    const bytes = new TextEncoder().encode(text);
                    let bin = '';
                    for (let i = 0; i < bytes.length; i++) {
                        bin += String.fromCharCode(bytes[i]);
                    }
                    return btoa(bin);
                } catch (e) {
                    showDanNotification('错误', 'Base64编码失败: ' + e.message);
                    return '';
                }
            }
        },
        {
            type: 'base64_decode',
            message0: 'Base64 解码 %1',
            args0: [{ type: 'input_value', name: 'encoded', value: '', check: 'String' }],
            output: 'String',
            tooltip: '将 Base64 编码的字符串解码',
            function: (params) => {
                try {
                    const encoded = String(params.encoded || '');
                    const bin = atob(encoded);
                    const bytes = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) {
                        bytes[i] = bin.charCodeAt(i);
                    }
                    return new TextDecoder().decode(bytes);
                } catch (e) {
                    showDanNotification('错误', 'Base64解码失败: ' + e.message);
                    return '';
                }
            }
        },

        // ──── 弹窗消息 ────
        {
            type: 'alert_message',
            message0: '弹出消息 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '显示一个警告弹窗（每秒最多1次）',
            function: (params) => {
                try {
                    if (!checkDialogLimit()) {
                        showDanNotification('提示', '弹窗过于频繁，请稍后再试');
                        return;
                    }
                    window.alert(String(params.message || ''));
                } catch (e) {
                    showDanNotification('错误', '弹窗失败: ' + e.message);
                }
            }
        },
        {
            type: 'confirm_dialog',
            message0: '确认对话框 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            output: 'Boolean',
            tooltip: '显示一个确认对话框，返回用户选择（每秒最多1次）',
            function: (params) => {
                try {
                    if (!checkDialogLimit()) {
                        showDanNotification('提示', '弹窗过于频繁，请稍后再试');
                        return false;
                    }
                    return window.confirm(String(params.message || ''));
                } catch (e) {
                    showDanNotification('错误', '确认对话框失败: ' + e.message);
                    return false;
                }
            }
        },
        {
            type: 'prompt_input',
            message0: '输入对话框 %1 默认值 %2',
            args0: [
                { type: 'input_value', name: 'message', value: '', check: 'String' },
                { type: 'input_value', name: 'default', value: '', check: 'String' }
            ],
            output: 'String',
            tooltip: '显示一个输入对话框，返回用户输入（每秒最多1次）',
            function: (params) => {
                try {
                    if (!checkDialogLimit()) {
                        showDanNotification('提示', '弹窗过于频繁，请稍后再试');
                        return '';
                    }
                    return window.prompt(String(params.message || ''), String(params.default || '')) || '';
                } catch (e) {
                    showDanNotification('错误', '输入对话框失败: ' + e.message);
                    return '';
                }
            }
        },

        // ──── 控制台日志 ────
        {
            type: 'console_log',
            message0: '控制台输出 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '在浏览器控制台输出消息',
            function: (params) => {
                console.log('[Dan Dev Tools]', params.message);
                window.__CUE_TOAST__ && window.__CUE_TOAST__('已输出到控制台', 'ok');
            }
        },
        {
            type: 'console_error',
            message0: '控制台错误 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '在浏览器控制台输出错误消息',
            function: (params) => {
                console.error('[Dan Dev Tools Error]', params.message);
                showDanNotification('错误', '已输出错误到控制台');
            }
        },
        {
            type: 'console_warn',
            message0: '控制台警告 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '在浏览器控制台输出警告消息',
            function: (params) => {
                console.warn('[Dan Dev Tools Warning]', params.message);
                window.__CUE_TOAST__ && window.__CUE_TOAST__('已输出警告到控制台', 'ok');
            }
        },

        // ──── URL 编码/解码 ────
        {
            type: 'url_encode',
            message0: 'URL 编码 %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            output: 'String',
            tooltip: '对字符串进行 URL 编码',
            function: (params) => {
                try {
                    return encodeURIComponent(String(params.text || ''));
                } catch (e) {
                    showDanNotification('错误', 'URL编码失败: ' + e.message);
                    return '';
                }
            }
        },
        {
            type: 'url_decode',
            message0: 'URL 解码 %1',
            args0: [{ type: 'input_value', name: 'encoded', value: '', check: 'String' }],
            output: 'String',
            tooltip: '对 URL 编码的字符串进行解码',
            function: (params) => {
                try {
                    return decodeURIComponent(String(params.encoded || ''));
                } catch (e) {
                    showDanNotification('错误', 'URL解码失败: ' + e.message);
                    return '';
                }
            }
        },

        // ──── JSON 操作 ────
        {
            type: 'json_stringify',
            message0: '对象转 JSON %1',
            args0: [{ type: 'input_value', name: 'obj', value: '', check: 'Object' }],
            output: 'String',
            tooltip: '将对象转换为 JSON 字符串',
            function: (params) => {
                try {
                    let obj = params.obj;
                    if (typeof obj === 'string') {
                        try { obj = JSON.parse(obj); } catch (e) {}
                    }
                    return JSON.stringify(obj, null, 2);
                } catch (e) {
                    showDanNotification('错误', 'JSON序列化失败: ' + e.message);
                    return '';
                }
            }
        },
        {
            type: 'json_parse',
            message0: 'JSON 转对象 %1',
            args0: [{ type: 'input_value', name: 'json', value: '', check: 'String' }],
            output: 'Object',
            tooltip: '将 JSON 字符串转换为对象',
            function: (params) => {
                try {
                    return JSON.parse(String(params.json || '{}'));
                } catch (e) {
                    showDanNotification('错误', 'JSON解析失败: ' + e.message);
                    return {};
                }
            }
        },
        {
            type: 'json_get_key',
            message0: 'JSON 获取键 %1 的值 %2',
            args0: [
                { type: 'input_value', name: 'json', value: '', check: 'String' },
                { type: 'input_value', name: 'key', value: '', check: 'String' }
            ],
            output: 'String',
            tooltip: '解析JSON字符串并获取指定键的值',
            function: (params) => {
                try {
                    const jsonStr = String(params.json || '{}');
                    const key = String(params.key || '');
                    const obj = JSON.parse(jsonStr);
                    const result = obj[key];
                    return result !== undefined ? String(result) : '';
                } catch (e) {
                    showDanNotification('错误', 'JSON解析失败: ' + e.message);
                    return '';
                }
            }
        },

        // ──── RSA 加解密 ────
        {
            type: 'rsa_generate_keys',
            message0: '生成RSA密钥对',
            tooltip: '生成RSA公钥和私钥并存储',
            function: function(params) {
                if (window.crypto && window.crypto.subtle) {
                    window.crypto.subtle.generateKey(
                        { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                        true,
                        ['encrypt', 'decrypt']
                    ).then(function(keyPair) {
                        window.crypto.subtle.exportKey('spki', keyPair.publicKey).then(function(publicKey) {
                            window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey).then(function(privateKey) {
                                __RSA_PUBLIC_KEY__ = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
                                __RSA_PRIVATE_KEY__ = btoa(String.fromCharCode(...new Uint8Array(privateKey)));
                                
                            });
                        });
                    }).catch(function(e) {
                        showDanNotification('错误', '生成密钥失败: ' + e.message);
                    });
                } else {
                    showDanNotification('错误', '浏览器不支持Web Crypto API');
                }
            }
        },
        {
            type: 'rsa_encrypt',
            message0: 'RSA加密 %1 使用公钥 %2',
            args0: [
                { type: 'input_value', name: 'text', value: '', check: 'String' },
                { type: 'input_value', name: 'pubKey', value: '', check: 'String' }
            ],
            output: 'String',
            tooltip: '使用指定公钥加密字符串',
            function: function(params) {
                const publicKey = String(params.pubKey || '') || __RSA_PUBLIC_KEY__;
                if (!publicKey) {
                    showDanNotification('错误', '请提供公钥');
                    return '';
                }
                if (window.crypto && window.crypto.subtle) {
                    try {
                        const text = String(params.text || '');
                        const publicKeyData = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
                        window.crypto.subtle.importKey(
                            'spki',
                            publicKeyData,
                            { name: 'RSA-OAEP', hash: 'SHA-256' },
                            false,
                            ['encrypt']
                        ).then(function(key) {
                            const encoder = new TextEncoder();
                            const data = encoder.encode(text);
                            window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data).then(function(encrypted) {
                                __RSA_ENCRYPTED__ = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
                                
                            }).catch(function(e) {
                                showDanNotification('错误', '加密失败: ' + e.message);
                            });
                        }).catch(function(e) {
                            showDanNotification('错误', '导入公钥失败，请确保使用正确的SPKI格式');
                        });
                    } catch (e) {
                        showDanNotification('错误', '加密失败: ' + e.message);
                    }
                } else {
                    showDanNotification('错误', '浏览器不支持Web Crypto API');
                }
                return __RSA_ENCRYPTED__ || '';
            }
        },
        {
            type: 'rsa_decrypt',
            message0: 'RSA解密 %1 使用私钥 %2',
            args0: [
                { type: 'input_value', name: 'encrypted', value: '', check: 'String' },
                { type: 'input_value', name: 'privKey', value: '', check: 'String' }
            ],
            output: 'String',
            tooltip: '使用指定私钥解密字符串',
            function: function(params) {
                const privateKey = String(params.privKey || '') || __RSA_PRIVATE_KEY__;
                if (!privateKey) {
                    showDanNotification('错误', '请提供私钥');
                    return '';
                }
                if (window.crypto && window.crypto.subtle) {
                    try {
                        const encrypted = String(params.encrypted || __RSA_ENCRYPTED__ || '');
                        if (!encrypted) {
                            showDanNotification('错误', '没有可解密的数据');
                            return '';
                        }
                        const privateKeyData = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
                        window.crypto.subtle.importKey(
                            'pkcs8',
                            privateKeyData,
                            { name: 'RSA-OAEP', hash: 'SHA-256' },
                            false,
                            ['decrypt']
                        ).then(function(key) {
                            const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
                            window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, encryptedData).then(function(decrypted) {
                                const decoder = new TextDecoder();
                                __RSA_DECRYPTED__ = decoder.decode(decrypted);
                                
                            }).catch(function(e) {
                                showDanNotification('错误', '解密失败: ' + e.message);
                            });
                        }).catch(function(e) {
                            showDanNotification('错误', '导入私钥失败，请确保使用正确的PKCS#8格式');
                        });
                    } catch (e) {
                        showDanNotification('错误', '解密失败: ' + e.message);
                    }
                } else {
                    showDanNotification('错误', '浏览器不支持Web Crypto API');
                }
                return __RSA_DECRYPTED__ || '';
            }
        },

        // ──── 字符串操作 ────
        {
            type: 'string_length',
            message0: '字符串长度 %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            output: 'Number',
            tooltip: '返回字符串的长度',
            function: (params) => {
                try {
                    return String(params.text || '').length;
                } catch (e) {
                    return 0;
                }
            }
        },
        {
            type: 'string_to_upper',
            message0: '转大写 %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            output: 'String',
            tooltip: '将字符串转换为大写',
            function: (params) => {
                try {
                    return String(params.text || '').toUpperCase();
                } catch (e) {
                    return '';
                }
            }
        },
        {
            type: 'string_to_lower',
            message0: '转小写 %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            output: 'String',
            tooltip: '将字符串转换为小写',
            function: (params) => {
                try {
                    return String(params.text || '').toLowerCase();
                } catch (e) {
                    return '';
                }
            }
        },

        // ──── 时间操作 ────
        {
            type: 'get_timestamp',
            message0: '获取时间戳',
            output: 'Number',
            tooltip: '获取当前时间戳（毫秒）',
            function: () => {
                return Date.now();
            }
        },
        {
            type: 'get_current_time',
            message0: '获取当前时间',
            output: 'String',
            tooltip: '获取当前日期时间字符串',
            function: () => {
                return new Date().toLocaleString('zh-CN');
            }
        },
        {
            type: 'timestamp_to_date',
            message0: '时间戳转日期 %1',
            args0: [{ type: 'input_value', name: 'timestamp', value: '', check: 'Number' }],
            output: 'String',
            tooltip: '将时间戳转换为日期字符串',
            function: function(params) {
                try {
                    var ts = Number(params.timestamp || Date.now());
                    return new Date(ts).toLocaleString('zh-CN');
                } catch (e) {
                    showDanNotification('错误', '时间戳转换失败: ' + e.message);
                    return '';
                }
            }
        },
        {
            type: 'date_to_timestamp',
            message0: '日期转时间戳 %1',
            args0: [{ type: 'input_value', name: 'dateStr', value: '', check: 'String' }],
            output: 'Number',
            tooltip: '将日期字符串转换为时间戳',
            function: function(params) {
                try {
                    var dateStr = String(params.dateStr || '');
                    if (!dateStr) {
                        return Date.now();
                    }
                    var timestamp = new Date(dateStr).getTime();
                    return isNaN(timestamp) ? Date.now() : timestamp;
                } catch (e) {
                    showDanNotification('错误', '日期转换失败: ' + e.message);
                    return Date.now();
                }
            }
        },

        // ──── 读取剪贴板 ────
        {
            type: 'read_clipboard',
            message0: '读取剪贴板(加载器)',
            tooltip: '使用加载器API读取剪贴板并存储（仅桌面壳内可用）',
            function: function (params) {
                if (window.pywebview && window.pywebview.api.read_clipboard) {
                    window.pywebview.api.read_clipboard().then(function (r) {
                        if (r && r.ok) {
                            __CLIPBOARD_CONTENT__ = r.text;
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('剪贴板已读取', 'ok');
                        } else {
                            __CLIPBOARD_CONTENT__ = '';
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('读取失败: ' + (r && r.error), 'error');
                        }
                    });
                } else {
                    __CLIPBOARD_CONTENT__ = '';
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('仅在桌面壳内可用', 'error');
                }
            }
        },

        // ──── 读取剪贴板(JS API) ────
        {
            type: 'read_clipboard_js',
            message0: '读取剪贴板(JS)',
            tooltip: '使用JavaScript剪贴板API读取并存储',
            function: function (params) {
                if (navigator.clipboard) {
                    navigator.clipboard.readText().then(function (text) {
                        __CLIPBOARD_CONTENT__ = text;
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('剪贴板已读取', 'ok');
                    }).catch(function (e) {
                        __CLIPBOARD_CONTENT__ = '';
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('读取失败: ' + e.message, 'error');
                    });
                } else {
                    __CLIPBOARD_CONTENT__ = '';
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('浏览器不支持剪贴板API', 'error');
                }
            }
        },

        // ──── 设置剪贴板内容(加载器) ────
        {
            type: 'set_clipboard',
            message0: '设置剪贴板(加载器) %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            tooltip: '使用加载器API设置剪贴板内容（仅桌面壳内可用）',
            function: function (params) {
                if (window.pywebview && window.pywebview.api.set_clipboard) {
                    var text = String(params.text || '');
                    window.pywebview.api.set_clipboard(text).then(function (r) {
                        if (r && r.ok) {
                            __CLIPBOARD_CONTENT__ = text;
                        } else {
                            showDanNotification('错误', '设置失败: ' + (r && r.error));
                        }
                    });
                } else {
                    showDanNotification('错误', '仅在桌面壳内可用');
                }
            }
        },

        // ──── 设置剪贴板内容(JS API) ────
        {
            type: 'set_clipboard_js',
            message0: '设置剪贴板(JS) %1',
            args0: [{ type: 'input_value', name: 'text', value: '', check: 'String' }],
            tooltip: '使用JavaScript剪贴板API设置剪贴板内容',
            function: function (params) {
                if (navigator.clipboard) {
                    var text = String(params.text || '');
                    navigator.clipboard.writeText(text).then(function () {
                        __CLIPBOARD_CONTENT__ = text;
                    }).catch(function (e) {
                        showDanNotification('错误', '设置失败: ' + e.message);
                    });
                } else {
                    showDanNotification('错误', '浏览器不支持剪贴板API');
                }
            }
        },

        // ──── 获取剪贴板内容 ────
        {
            type: 'get_clipboard_content',
            message0: '获取剪贴板内容',
            output: 'String',
            tooltip: '返回上次读取的剪贴板内容',
            function: function (params) {
                return __CLIPBOARD_CONTENT__;
            }
        },

        // ──── 列表目录 ────
        {
            type: 'list_directory',
            message0: '列出目录 %1',
            args0: [{ type: 'input_value', name: 'path', value: '.', check: 'String' }],
            tooltip: '列出指定目录内容并存储（仅桌面壳内可用）',
            function: function (params) {
                if (window.pywebview && window.pywebview.api.list_directory) {
                    window.pywebview.api.list_directory(String(params.path || '.')).then(function (r) {
                        if (r && r.ok) {
                            __DIRECTORY_CONTENT__ = r.entries.map(e => (e.is_dir ? '[DIR] ' : '[FILE] ') + e.name).join('\n');
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('目录已读取', 'ok');
                        } else {
                            __DIRECTORY_CONTENT__ = '';
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('读取失败: ' + (r && r.error), 'error');
                        }
                    });
                } else {
                    __DIRECTORY_CONTENT__ = '';
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('仅在桌面壳内可用', 'error');
                }
            }
        },

        // ──── 获取目录内容 ────
        {
            type: 'get_directory_content',
            message0: '获取目录内容',
            output: 'String',
            tooltip: '返回上次列出的目录内容',
            function: function (params) {
                return __DIRECTORY_CONTENT__;
            }
        },

        // ──── HTTP GET 请求 ────
        {
            type: 'http_get',
            message0: 'HTTP GET %1',
            args0: [{ type: 'input_value', name: 'url', value: '', check: 'String' }],
            tooltip: '发送HTTP GET请求',
            function: function(params) {
                var url = String(params.url || '').trim();
                if (!url) {
                    showDanNotification('错误', '请输入URL');
                    return;
                }
                fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }).then(function(response) {
                    __HTTP_STATUS__ = response.status;
                    return response.text();
                }).then(function(data) {
                    __HTTP_RESPONSE__ = data;
                }).catch(function(e) {
                    showDanNotification('错误', 'HTTP请求失败: ' + e.message);
                    __HTTP_RESPONSE__ = '';
                    __HTTP_STATUS__ = 0;
                });
            }
        },

        // ──── HTTP POST 请求 ────
        {
            type: 'http_post',
            message0: 'HTTP POST %1 数据 %2',
            args0: [
                { type: 'input_value', name: 'url', value: '', check: 'String' },
                { type: 'input_value', name: 'data', value: '', check: 'String' }
            ],
            tooltip: '发送HTTP POST请求',
            function: function(params) {
                var url = String(params.url || '').trim();
                if (!url) {
                    showDanNotification('错误', '请输入URL');
                    return;
                }
                var data = String(params.data || '');
                try {
                    var jsonData = data ? JSON.parse(data) : {};
                    fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(jsonData)
                    }).then(function(response) {
                        __HTTP_STATUS__ = response.status;
                        return response.text();
                    }).then(function(data) {
                        __HTTP_RESPONSE__ = data;
                    }).catch(function(e) {
                        showDanNotification('错误', 'HTTP请求失败: ' + e.message);
                        __HTTP_RESPONSE__ = '';
                        __HTTP_STATUS__ = 0;
                    });
                } catch (e) {
                    showDanNotification('错误', 'JSON数据格式错误: ' + e.message);
                }
            }
        },

        // ──── 获取HTTP响应内容 ────
        {
            type: 'get_http_response',
            message0: '获取HTTP响应内容',
            output: 'String',
            tooltip: '返回上次HTTP请求的响应内容',
            function: function(params) {
                return __HTTP_RESPONSE__;
            }
        },

        // ──── 获取HTTP状态码 ────
        {
            type: 'get_http_status',
            message0: '获取HTTP状态码',
            output: 'Number',
            tooltip: '返回上次HTTP请求的状态码',
            function: function(params) {
                return __HTTP_STATUS__;
            }
        },

        // ──── 画布操作 ────
        {
            type: 'create_canvas',
            message0: '创建画布 %1',
            args0: [{ type: 'field_dropdown', name: 'mode', options: [['透明背景', 'transparent'], ['白色背景', 'white']] }],
            tooltip: '在STAGE_CANVAS位置创建置顶画布（不拦截鼠标事件）',
            function: function(params) {
                try {
                    var container = document.getElementById('STAGE_WIDGET');
                    if (!container) {
                        showDanNotification('错误', '未找到STAGE_WIDGET容器');
                        return;
                    }
                    
                    if (__CANVAS__) {
                        __CANVAS__.remove();
                    }
                    
                    var canvas = document.createElement('canvas');
                    canvas.id = 'DAN_CANVAS_OVERLAY';
                    canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:9999;pointer-events:none;';
                    
                    canvas.width = container.offsetWidth || container.clientWidth || 800;
                    canvas.height = container.offsetHeight || container.clientHeight || 600;
                    
                    var ctx = canvas.getContext('2d');
                    var mode = String(params.mode || 'transparent');
                    if (mode === 'white') {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    
                    container.appendChild(canvas);
                    __CANVAS__ = canvas;
                    __CANVAS_CONTEXT__ = ctx;
                } catch (e) {
                    showDanNotification('错误', '创建画布失败: ' + e.message);
                }
            }
        },
        {
            type: 'destroy_canvas',
            message0: '销毁画布',
            tooltip: '销毁已创建的画布',
            function: function(params) {
                try {
                    if (__CANVAS__) {
                        __CANVAS__.remove();
                        __CANVAS__ = null;
                        __CANVAS_CONTEXT__ = null;
                    }
                } catch (e) {
                    showDanNotification('错误', '销毁画布失败: ' + e.message);
                }
            }
        },
        {
            type: 'clear_canvas',
            message0: '清空画布',
            tooltip: '清空画布内容',
            function: function(params) {
                try {
                    if (__CANVAS_CONTEXT__ && __CANVAS__) {
                        __CANVAS_CONTEXT__.clearRect(0, 0, __CANVAS__.width, __CANVAS__.height);
                    }
                } catch (e) {
                    showDanNotification('错误', '清空画布失败: ' + e.message);
                }
            }
        },
        {
            type: 'draw_rect',
            message0: '绘制框 x1%1 y1%2 x2%3 y2%4',
            args0: [
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'x2', value: '', check: 'Number' },
                { type: 'input_value', name: 'y2', value: '', check: 'Number' }
            ],
            tooltip: '在画布上绘制矩形框',
            function: function(params) {
                try {
                    if (!__CANVAS_CONTEXT__) {
                        showDanNotification('错误', '请先创建画布');
                        return;
                    }
                    var x1 = Number(params.x1 || 0);
                    var y1 = Number(params.y1 || 0);
                    var x2 = Number(params.x2 || 0);
                    var y2 = Number(params.y2 || 0);
                    
                    var width = Math.abs(x2 - x1);
                    var height = Math.abs(y2 - y1);
                    var x = Math.min(x1, x2);
                    var y = Math.min(y1, y2);
                    
                    __CANVAS_CONTEXT__.strokeStyle = '#ff0000';
                    __CANVAS_CONTEXT__.lineWidth = 2;
                    __CANVAS_CONTEXT__.strokeRect(x, y, width, height);
                } catch (e) {
                    showDanNotification('错误', '绘制矩形失败: ' + e.message);
                }
            }
        },
        {
            type: 'erase_matrix',
            message0: '擦除矩阵 x1%1 y1%2 x2%3 y2%4',
            args0: [
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'x2', value: '', check: 'Number' },
                { type: 'input_value', name: 'y2', value: '', check: 'Number' }
            ],
            tooltip: '擦除指定矩形区域',
            function: function(params) {
                try {
                    if (!__CANVAS_CONTEXT__) {
                        showDanNotification('错误', '请先创建画布');
                        return;
                    }
                    var x1 = Number(params.x1 || 0);
                    var y1 = Number(params.y1 || 0);
                    var x2 = Number(params.x2 || 0);
                    var y2 = Number(params.y2 || 0);
                    
                    var width = Math.abs(x2 - x1);
                    var height = Math.abs(y2 - y1);
                    var x = Math.min(x1, x2);
                    var y = Math.min(y1, y2);
                    
                    __CANVAS_CONTEXT__.clearRect(x, y, width, height);
                } catch (e) {
                    showDanNotification('错误', '擦除失败: ' + e.message);
                }
            }
        },
        
        
        {
            type: 'draw_image',
            message0: '绘制图 x%1 y%2 base64%3',
            args0: [
                { type: 'input_value', name: 'x', value: '', check: 'Number' },
                { type: 'input_value', name: 'y', value: '', check: 'Number' },
                { type: 'input_value', name: 'base64', value: '', check: 'String' }
            ],
            tooltip: '绘制Base64编码图片（无前缀）',
            function: function(params) {
                try {
                    if (!__CANVAS_CONTEXT__) {
                        showDanNotification('错误', '请先创建画布');
                        return;
                    }
                    var x = Number(params.x || 0);
                    var y = Number(params.y || 0);
                    var base64 = String(params.base64 || '').trim();
                    
                    if (!base64) {
                        showDanNotification('错误', '请输入Base64数据');
                        return;
                    }
                    
                    var img = new Image();
                    img.onload = function() {
                        __CANVAS_CONTEXT__.drawImage(img, x, y);
                    };
                    img.onerror = function() {
                        showDanNotification('错误', 'Base64图片解码失败');
                    };
                    img.src = 'data:image/png;base64,' + base64;
                } catch (e) {
                    showDanNotification('错误', '绘制图片失败: ' + e.message);
                }
            }
        },
        {
            type: 'draw_texture',
            message0: '绘制纹理 x1%1 y1%2 x2%3 y2%4 x3%5 y3%6 x4%7 y4%8 base64%9',
            args0: [
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'x2', value: '', check: 'Number' },
                { type: 'input_value', name: 'y2', value: '', check: 'Number' },
                { type: 'input_value', name: 'x3', value: '', check: 'Number' },
                { type: 'input_value', name: 'y3', value: '', check: 'Number' },
                { type: 'input_value', name: 'x4', value: '', check: 'Number' },
                { type: 'input_value', name: 'y4', value: '', check: 'Number' },
                { type: 'input_value', name: 'base64', value: '', check: 'String' }
            ],
            tooltip: '使用四点矩阵绘制纹理，实现真正的透视投影效果（四点依次为：左上、右上、左下、右下）',
            function: function(params) {
                try {
                    if (!__CANVAS_CONTEXT__) {
                        showDanNotification('错误', '请先创建画布');
                        return;
                    }
                    var x1 = Number(params.x1 || 0);
                    var y1 = Number(params.y1 || 0);
                    var x2 = Number(params.x2 || 0);
                    var y2 = Number(params.y2 || 0);
                    var x3 = Number(params.x3 || 0);
                    var y3 = Number(params.y3 || 0);
                    var x4 = Number(params.x4 || 0);
                    var y4 = Number(params.y4 || 0);
                    var base64 = String(params.base64 || '').trim();
                    
                    if (!base64) {
                        showDanNotification('错误', '请输入Base64数据');
                        return;
                    }
                    
                    var img = new Image();
                    img.onload = function() {
                        var imgW = img.width;
                        var imgH = img.height;
                        
                        var tempCanvas = document.createElement('canvas');
                        tempCanvas.width = imgW;
                        tempCanvas.height = imgH;
                        var tempCtx = tempCanvas.getContext('2d');
                        tempCtx.drawImage(img, 0, 0);
                        var imgData = tempCtx.getImageData(0, 0, imgW, imgH);
                        var pixels = imgData.data;
                        
                        var minX = Math.floor(Math.min(x1, x2, x3, x4));
                        var maxX = Math.ceil(Math.max(x1, x2, x3, x4));
                        var minY = Math.floor(Math.min(y1, y2, y3, y4));
                        var maxY = Math.ceil(Math.max(y1, y2, y3, y4));
                        
                        var destCanvas = document.createElement('canvas');
                        destCanvas.width = maxX - minX + 1;
                        destCanvas.height = maxY - minY + 1;
                        var destCtx = destCanvas.getContext('2d');
                        var destData = destCtx.createImageData(destCanvas.width, destCanvas.height);
                        var destPixels = destData.data;
                        
                        function bilinearInterp(u, v) {
                            var u0 = Math.floor(u), v0 = Math.floor(v);
                            var u1 = Math.min(u0 + 1, imgW - 1), v1 = Math.min(v0 + 1, imgH - 1);
                            var fu = u - u0, fv = v - v0;
                            
                            var idx00 = ((v0 * imgW + u0) << 2);
                            var idx01 = ((v1 * imgW + u0) << 2);
                            var idx10 = ((v0 * imgW + u1) << 2);
                            var idx11 = ((v1 * imgW + u1) << 2);
                            
                            var r = (1-fu)*(1-fv)*pixels[idx00] + fu*(1-fv)*pixels[idx10] + (1-fu)*fv*pixels[idx01] + fu*fv*pixels[idx11];
                            var g = (1-fu)*(1-fv)*pixels[idx00+1] + fu*(1-fv)*pixels[idx10+1] + (1-fu)*fv*pixels[idx01+1] + fu*fv*pixels[idx11+1];
                            var b = (1-fu)*(1-fv)*pixels[idx00+2] + fu*(1-fv)*pixels[idx10+2] + (1-fu)*fv*pixels[idx01+2] + fu*fv*pixels[idx11+2];
                            var a = (1-fu)*(1-fv)*pixels[idx00+3] + fu*(1-fv)*pixels[idx10+3] + (1-fu)*fv*pixels[idx01+3] + fu*fv*pixels[idx11+3];
                            
                            return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
                        }
                        
                        function solvePerspective(src, dst) {
                            var a = [];
                            for (var i = 0; i < 4; i++) {
                                a.push([src[i][0], src[i][1], 1, 0, 0, 0, -src[i][0]*dst[i][0], -src[i][1]*dst[i][0]]);
                                a.push([0, 0, 0, src[i][0], src[i][1], 1, -src[i][0]*dst[i][1], -src[i][1]*dst[i][1]]);
                            }
                            
                            var b = [];
                            for (var i = 0; i < 4; i++) {
                                b.push(dst[i][0]);
                                b.push(dst[i][1]);
                            }
                            
                            function gaussianElimination(A, B) {
                                var n = A.length;
                                for (var i = 0; i < n; i++) {
                                    var max = i;
                                    for (var j = i + 1; j < n; j++) {
                                        if (Math.abs(A[j][i]) > Math.abs(A[max][i])) max = j;
                                    }
                                    var temp = A[i]; A[i] = A[max]; A[max] = temp;
                                    temp = B[i]; B[i] = B[max]; B[max] = temp;
                                    
                                    for (var j = i + 1; j < n; j++) {
                                        var factor = A[j][i] / A[i][i];
                                        for (var k = i; k < n; k++) A[j][k] -= factor * A[i][k];
                                        B[j] -= factor * B[i];
                                    }
                                }
                                
                                var x = new Array(n);
                                for (var i = n - 1; i >= 0; i--) {
                                    x[i] = B[i];
                                    for (var j = i + 1; j < n; j++) x[i] -= A[i][j] * x[j];
                                    x[i] /= A[i][i];
                                }
                                return x;
                            }
                            
                            var coeffs = gaussianElimination(a, b);
                            return [
                                [coeffs[0], coeffs[1], coeffs[2]],
                                [coeffs[3], coeffs[4], coeffs[5]],
                                [coeffs[6], coeffs[7], 1]
                            ];
                        }
                        
                        var src = [[0, 0], [imgW, 0], [0, imgH], [imgW, imgH]];
                        var dst = [[x1, y1], [x2, y2], [x3, y3], [x4, y4]];
                        var M = solvePerspective(src, dst);
                        
                        function applyPerspective(x, y, M) {
                            var denom = M[2][0] * x + M[2][1] * y + M[2][2];
                            if (Math.abs(denom) < 1e-10) return null;
                            var u = (M[0][0] * x + M[0][1] * y + M[0][2]) / denom;
                            var v = (M[1][0] * x + M[1][1] * y + M[1][2]) / denom;
                            return { u: u, v: v };
                        }
                        
                        for (var sy = minY; sy <= maxY; sy++) {
                            for (var sx = minX; sx <= maxX; sx++) {
                                var result = applyPerspective(sx, sy, M);
                                if (result && result.u >= 0 && result.u < imgW && result.v >= 0 && result.v < imgH) {
                                    var color = bilinearInterp(result.u, result.v);
                                    var idx = ((sy - minY) * destCanvas.width + (sx - minX)) << 2;
                                    destPixels[idx] = color[0];
                                    destPixels[idx+1] = color[1];
                                    destPixels[idx+2] = color[2];
                                    destPixels[idx+3] = color[3];
                                }
                            }
                        }
                        
                        destCtx.putImageData(destData, 0, 0);
                        __CANVAS_CONTEXT__.drawImage(destCanvas, minX, minY);
                    };
                    img.onerror = function() {
                        showDanNotification('错误', 'Base64图片解码失败');
                    };
                    img.src = 'data:image/png;base64,' + base64;
                } catch (e) {
                    showDanNotification('错误', '绘制纹理失败: ' + e.message);
                }
            }
        },
        {
            type: 'image_to_base64',
            message0: '将图片转为base64 %1',
            args0: [{ type: 'input_value', name: 'url', value: '', check: 'String' }],
            output: 'String',
            tooltip: '将指定URL的图片转换为Base64编码',
            function: function(params) {
                try {
                    var url = String(params.url || '').trim();
                    if (!url) {
                        showDanNotification('错误', '请输入图片URL');
                        return '';
                    }
                    
                    var cacheKey = '__IMAGE_BASE64_CACHE_' + url;
                    if (window[cacheKey]) {
                        return window[cacheKey];
                    }
                    
                    var img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        var result = canvas.toDataURL('image/png').split(',')[1];
                        window[cacheKey] = result;
                        showDanNotification('成功', '图片已加载，可再次使用该块获取base64');
                    };
                    img.onerror = function() {
                        showDanNotification('错误', '图片加载失败');
                    };
                    img.src = url;
                    
                    showDanNotification('提示', '正在加载图片，请等待后再次运行');
                    return '';
                } catch (e) {
                    showDanNotification('错误', '图片转Base64失败: ' + e.message);
                    return '';
                }
            }
        },

        // ──── 伪3D方块 ────
        {
            type: 'create_block_data',
            message0: '创建方块到数据 x%1 y%2 z%3 base64纹理%4 cid%5',
            args0: [
                { type: 'input_value', name: 'x', value: '', check: 'Number' },
                { type: 'input_value', name: 'y', value: '', check: 'Number' },
                { type: 'input_value', name: 'z', value: '', check: 'Number' },
                { type: 'input_value', name: 'base64', value: '', check: 'String' },
                { type: 'input_value', name: 'cid', value: '', check: 'String' }
            ],
            tooltip: '创建方块数据并存储，cid为数据标识',
            function: function(params) {
                try {
                    var x = Number(params.x || 0);
                    var y = Number(params.y || 0);
                    var z = Number(params.z || 0);
                    var base64 = String(params.base64 || '').trim();
                    var cid = String(params.cid || '').trim();
                    
                    if (!cid) {
                        showDanNotification('错误', '请输入cid');
                        return;
                    }
                    
                    if (!__WHITMILLER_OBJECT__) {
                        __WHITMILLER_OBJECT__ = {};
                    }
                    if (!__WHITMILLER_OBJECT__.blockData) {
                        __WHITMILLER_OBJECT__.blockData = {};
                    }
                    
                    __WHITMILLER_OBJECT__.blockData[cid] = {
                        x: x,
                        y: y,
                        z: z,
                        texture: base64
                    };
                    
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('方块数据已创建', 'ok');
                } catch (e) {
                    showDanNotification('错误', '创建方块数据失败: ' + e.message);
                }
            }
        },
        {
            type: 'draw_block_entity',
            message0: '绘制方块实体 cid%1 摄像机x%2 y%3 z%4 视场角%5 水平角度%6 垂直角度%7 实体uuid%8',
            args0: [
                { type: 'input_value', name: 'cid', value: '', check: 'String' },
                { type: 'input_value', name: 'camX', value: '', check: 'Number' },
                { type: 'input_value', name: 'camY', value: '', check: 'Number' },
                { type: 'input_value', name: 'camZ', value: '', check: 'Number' },
                { type: 'input_value', name: 'fov', value: '', check: 'Number' },
                { type: 'input_value', name: 'hAngle', value: '', check: 'Number' },
                { type: 'input_value', name: 'vAngle', value: '', check: 'Number' },
                { type: 'input_value', name: 'uuid', value: '', check: 'String' }
            ],
            tooltip: '根据摄像机参数绘制伪3D方块实体（900x562画布）',
            function: function(params) {
                try {
                    if (!__CANVAS_CONTEXT__) {
                        showDanNotification('错误', '请先创建画布');
                        return;
                    }
                    
                    var cid = String(params.cid || '').trim();
                    var camX = Number(params.camX || 0);
                    var camY = Number(params.camY || 0);
                    var camZ = Number(params.camZ || 0);
                    var fov = Number(params.fov || 60);
                    var hAngle = Number(params.hAngle || 0);
                    var vAngle = Number(params.vAngle || 0);
                    var uuid = String(params.uuid || '').trim();
                    
                    if (!cid || !uuid) {
                        showDanNotification('错误', '请输入cid和uuid');
                        return;
                    }
                    
                    if (!__WHITMILLER_OBJECT__ || !__WHITMILLER_OBJECT__.blockData || !__WHITMILLER_OBJECT__.blockData[cid]) {
                        showDanNotification('错误', '未找到方块数据');
                        return;
                    }
                    
                    var block = __WHITMILLER_OBJECT__.blockData[cid];
                    var ctx = __CANVAS_CONTEXT__;
                    var canvas = __CANVAS__;
                    var canvasWidth = canvas ? canvas.width : 900;
                    var canvasHeight = canvas ? canvas.height : 562;
                    
                    var halfSize = 1;
                    
                    var corners = [
                        { x: block.x - halfSize, y: block.y - halfSize, z: block.z - halfSize },
                        { x: block.x + halfSize, y: block.y - halfSize, z: block.z - halfSize },
                        { x: block.x + halfSize, y: block.y + halfSize, z: block.z - halfSize },
                        { x: block.x - halfSize, y: block.y + halfSize, z: block.z - halfSize },
                        { x: block.x - halfSize, y: block.y - halfSize, z: block.z + halfSize },
                        { x: block.x + halfSize, y: block.y - halfSize, z: block.z + halfSize },
                        { x: block.x + halfSize, y: block.y + halfSize, z: block.z + halfSize },
                        { x: block.x - halfSize, y: block.y + halfSize, z: block.z + halfSize }
                    ];
                    
                    var radH = (hAngle * Math.PI) / 180;
                    var radV = (vAngle * Math.PI) / 180;
                    
                    var projected = corners.map(function(corner) {
                        var dx = corner.x - camX;
                        var dy = corner.y - camY;
                        var dz = corner.z - camZ;
                        
                        var x = dx * Math.cos(radH) + dz * Math.sin(radH);
                        var y = dy * Math.cos(radV) - dz * Math.sin(radV);
                        var z = dz * Math.cos(radH) * Math.cos(radV) - dx * Math.sin(radH) + dy * Math.sin(radV);
                        
                        if (z <= 0.1) z = 0.1;
                        
                        var scale = (canvasWidth * fov) / (z * 60);
                        var screenX = canvasWidth / 2 + x * scale;
                        var screenY = canvasHeight / 2 - y * scale;
                        
                        return { screenX: screenX, screenY: screenY, z: z, origX: corner.x, origY: corner.y, origZ: corner.z };
                    });
                    
                    var textureImg = null;
                    if (block.texture && block.texture.trim()) {
                        textureImg = new Image();
                        textureImg.onload = function() { textureLoaded = true; };
                        textureImg.onerror = function() { textureLoaded = false; };
                        textureImg.src = 'data:image/png;base64,' + block.texture;
                        if (textureImg.complete) textureLoaded = true;
                    }
                    
                    var faces = [
                        { indices: [0, 1, 2, 3], color: 'rgba(100, 150, 200, 0.9)', uv: [{u:0,v:0},{u:1,v:0},{u:1,v:1},{u:0,v:1}] },
                        { indices: [4, 5, 6, 7], color: 'rgba(60, 100, 150, 0.9)', uv: [{u:0,v:0},{u:1,v:0},{u:1,v:1},{u:0,v:1}] },
                        { indices: [0, 4, 7, 3], color: 'rgba(80, 120, 180, 0.9)', uv: [{u:0,v:0},{u:0,v:1},{u:1,v:1},{u:1,v:0}] },
                        { indices: [1, 5, 6, 2], color: 'rgba(120, 160, 220, 0.9)', uv: [{u:0,v:0},{u:0,v:1},{u:1,v:1},{u:1,v:0}] },
                        { indices: [0, 1, 5, 4], color: 'rgba(140, 180, 240, 0.9)', uv: [{u:0,v:1},{u:1,v:1},{u:1,v:0},{u:0,v:0}] },
                        { indices: [3, 2, 6, 7], color: 'rgba(80, 120, 160, 0.9)', uv: [{u:0,v:1},{u:1,v:1},{u:1,v:0},{u:0,v:0}] }
                    ];
                    
                    faces.sort(function(a, b) {
                        var avgZ = function(indices) {
                            return (projected[indices[0]].z + projected[indices[1]].z + 
                                    projected[indices[2]].z + projected[indices[3]].z) / 4;
                        };
                        return avgZ(b.indices) - avgZ(a.indices);
                    });
                    
                    faces.forEach(function(face) {
                        var pts = face.indices.map(function(i) { return projected[i]; });
                        
                        var allInView = pts.every(function(p) {
                            return p.screenX >= -100 && p.screenX <= canvasWidth + 100 &&
                                   p.screenY >= -100 && p.screenY <= canvasHeight + 100;
                        });
                        
                        if (!allInView) return;
                        
                        ctx.strokeStyle = 'rgba(30, 50, 80, 0.8)';
                        ctx.lineWidth = 1;
                        
                        ctx.beginPath();
                        ctx.moveTo(pts[0].screenX, pts[0].screenY);
                        ctx.lineTo(pts[1].screenX, pts[1].screenY);
                        ctx.lineTo(pts[2].screenX, pts[2].screenY);
                        ctx.lineTo(pts[3].screenX, pts[3].screenY);
                        ctx.closePath();
                        
                        if (textureImg && textureImg.complete) {
                            var pattern = ctx.createPattern(textureImg, 'repeat');
                            ctx.fillStyle = pattern;
                        } else {
                            ctx.fillStyle = face.color;
                        }
                        ctx.fill();
                        ctx.stroke();
                    });
                    
                    if (!__WHITMILLER_OBJECT__.blockEntities) {
                        __WHITMILLER_OBJECT__.blockEntities = {};
                    }
                    
                    __WHITMILLER_OBJECT__.blockEntities[uuid] = {
                        cid: cid,
                        camX: camX,
                        camY: camY,
                        camZ: camZ,
                        fov: fov,
                        hAngle: hAngle,
                        vAngle: vAngle,
                        block: block
                    };
                    
                } catch (e) {
                    showDanNotification('错误', '绘制方块实体失败: ' + e.message);
                }
            }
        },
        {
            type: 'delete_block_entity',
            message0: '删除方块实体 实体uuid%1',
            args0: [{ type: 'input_value', name: 'uuid', value: '', check: 'String' }],
            tooltip: '删除指定的方块实体',
            function: function(params) {
                try {
                    var uuid = String(params.uuid || '').trim();
                    
                    if (!uuid) {
                        showDanNotification('错误', '请输入实体uuid');
                        return;
                    }
                    
                    if (__WHITMILLER_OBJECT__ && __WHITMILLER_OBJECT__.blockEntities) {
                        delete __WHITMILLER_OBJECT__.blockEntities[uuid];
                    }
                    
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('方块实体已删除', 'ok');
                } catch (e) {
                    showDanNotification('错误', '删除方块实体失败: ' + e.message);
                }
            }
        },
        {
            type: 'destroy_block_data',
            message0: '注销方块数据 cid%1',
            args0: [{ type: 'input_value', name: 'cid', value: '', check: 'String' }],
            tooltip: '注销指定的方块数据',
            function: function(params) {
                try {
                    var cid = String(params.cid || '').trim();
                    
                    if (!cid) {
                        showDanNotification('错误', '请输入cid');
                        return;
                    }
                    
                    if (__WHITMILLER_OBJECT__ && __WHITMILLER_OBJECT__.blockData) {
                        delete __WHITMILLER_OBJECT__.blockData[cid];
                    }
                    
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('方块数据已注销', 'ok');
                } catch (e) {
                    showDanNotification('错误', '注销方块数据失败: ' + e.message);
                }
            }
        },
        {
            type: 'redraw_block',
            message0: '重绘方块 实体uuid%1',
            args0: [{ type: 'input_value', name: 'uuid', value: '', check: 'String' }],
            tooltip: '重新绘制指定的方块实体',
            function: function(params) {
                try {
                    var uuid = String(params.uuid || '').trim();
                    
                    if (!uuid) {
                        showDanNotification('错误', '请输入实体uuid');
                        return;
                    }
                    
                    if (!__WHITMILLER_OBJECT__ || !__WHITMILLER_OBJECT__.blockEntities || !__WHITMILLER_OBJECT__.blockEntities[uuid]) {
                        showDanNotification('错误', '未找到方块实体');
                        return;
                    }
                    
                    var entity = __WHITMILLER_OBJECT__.blockEntities[uuid];
                    var ctx = __CANVAS_CONTEXT__;
                    var canvas = __CANVAS__;
                    var canvasWidth = canvas ? canvas.width : 900;
                    var canvasHeight = canvas ? canvas.height : 562;
                    
                    var block = entity.block;
                    var camX = entity.camX;
                    var camY = entity.camY;
                    var camZ = entity.camZ;
                    var fov = entity.fov;
                    var hAngle = entity.hAngle;
                    var vAngle = entity.vAngle;
                    
                    var halfSize = 1;
                    
                    var corners = [
                        { x: block.x - halfSize, y: block.y - halfSize, z: block.z - halfSize },
                        { x: block.x + halfSize, y: block.y - halfSize, z: block.z - halfSize },
                        { x: block.x + halfSize, y: block.y + halfSize, z: block.z - halfSize },
                        { x: block.x - halfSize, y: block.y + halfSize, z: block.z - halfSize },
                        { x: block.x - halfSize, y: block.y - halfSize, z: block.z + halfSize },
                        { x: block.x + halfSize, y: block.y - halfSize, z: block.z + halfSize },
                        { x: block.x + halfSize, y: block.y + halfSize, z: block.z + halfSize },
                        { x: block.x - halfSize, y: block.y + halfSize, z: block.z + halfSize }
                    ];
                    
                    var radH = (hAngle * Math.PI) / 180;
                    var radV = (vAngle * Math.PI) / 180;
                    
                    var projected = corners.map(function(corner) {
                        var dx = corner.x - camX;
                        var dy = corner.y - camY;
                        var dz = corner.z - camZ;
                        
                        var x = dx * Math.cos(radH) + dz * Math.sin(radH);
                        var y = dy * Math.cos(radV) - dz * Math.sin(radV);
                        var z = dz * Math.cos(radH) * Math.cos(radV) - dx * Math.sin(radH) + dy * Math.sin(radV);
                        
                        if (z <= 0.1) z = 0.1;
                        
                        var scale = (canvasWidth * fov) / (z * 60);
                        var screenX = canvasWidth / 2 + x * scale;
                        var screenY = canvasHeight / 2 - y * scale;
                        
                        return { screenX: screenX, screenY: screenY, z: z };
                    });
                    
                    var faces = [
                        { indices: [0, 1, 2, 3], color: 'rgba(100, 150, 200, 0.9)' },
                        { indices: [4, 5, 6, 7], color: 'rgba(60, 100, 150, 0.9)' },
                        { indices: [0, 4, 7, 3], color: 'rgba(80, 120, 180, 0.9)' },
                        { indices: [1, 5, 6, 2], color: 'rgba(120, 160, 220, 0.9)' },
                        { indices: [0, 1, 5, 4], color: 'rgba(140, 180, 240, 0.9)' },
                        { indices: [3, 2, 6, 7], color: 'rgba(80, 120, 160, 0.9)' }
                    ];
                    
                    faces.sort(function(a, b) {
                        var avgZ = function(indices) {
                            return (projected[indices[0]].z + projected[indices[1]].z + 
                                    projected[indices[2]].z + projected[indices[3]].z) / 4;
                        };
                        return avgZ(b.indices) - avgZ(a.indices);
                    });
                    
                    faces.forEach(function(face) {
                        var pts = face.indices.map(function(i) { return projected[i]; });
                        
                        var allInView = pts.every(function(p) {
                            return p.screenX >= -100 && p.screenX <= canvasWidth + 100 &&
                                   p.screenY >= -100 && p.screenY <= canvasHeight + 100;
                        });
                        
                        if (!allInView) return;
                        
                        ctx.fillStyle = face.color;
                        ctx.strokeStyle = 'rgba(30, 50, 80, 0.8)';
                        ctx.lineWidth = 1;
                        
                        ctx.beginPath();
                        ctx.moveTo(pts[0].screenX, pts[0].screenY);
                        ctx.lineTo(pts[1].screenX, pts[1].screenY);
                        ctx.lineTo(pts[2].screenX, pts[2].screenY);
                        ctx.lineTo(pts[3].screenX, pts[3].screenY);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    });
                    
                } catch (e) {
                    showDanNotification('错误', '重绘方块失败: ' + e.message);
                }
            }
        },

        // ──── 物理下坠 ────
        {
            type: 'physics_fall',
            message0: '下坠计算 初始y%1 终点y%2 当前t%3 速度v%4',
            args0: [
                { type: 'input_value', name: 'startY', value: '', check: 'Number' },
                { type: 'input_value', name: 'endY', value: '', check: 'Number' },
                { type: 'input_value', name: 't', value: '', check: 'Number' },
                { type: 'input_value', name: 'v', value: '', check: 'Number' }
            ],
            output: 'Number',
            tooltip: '模拟物理下坠效果，返回当前时间t的Y坐标',
            function: function(params) {
                try {
                    var startY = Number(params.startY || 0);
                    var endY = Number(params.endY || 0);
                    var t = Number(params.t || 0);
                    var v = Number(params.v || 1);
                    
                    t = Math.max(0, Math.min(1, t));
                    
                    var distance = endY - startY;
                    var direction = distance > 0 ? 1 : -1;
                    var absDistance = Math.abs(distance);
                    
                    var gravity = 9.8 * v;
                    var totalTime = Math.sqrt(2 * absDistance / gravity);
                    var actualTime = t * totalTime;
                    
                    var traveled = 0.5 * gravity * actualTime * actualTime;
                    
                    if (traveled >= absDistance) {
                        return endY;
                    }
                    
                    return startY + direction * traveled;
                } catch (e) {
                    showDanNotification('错误', '物理下坠计算失败: ' + e.message);
                    return 0;
                }
            }
        },

        // ──── 赛贝尔曲线 ────
        {
            type: 'bezier_x',
            message0: '赛贝尔曲线X 起点x%1 y%2 终点x%3 y%4 控制点x%5 y%6 时间t%7',
            args0: [
                { type: 'input_value', name: 'x0', value: '', check: 'Number' },
                { type: 'input_value', name: 'y0', value: '', check: 'Number' },
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'cx', value: '', check: 'Number' },
                { type: 'input_value', name: 'cy', value: '', check: 'Number' },
                { type: 'input_value', name: 't', value: '', check: 'Number' }
            ],
            output: 'Number',
            tooltip: '计算二次贝塞尔曲线上指定时间t的X坐标',
            function: function(params) {
                try {
                    var x0 = Number(params.x0 || 0);
                    var x1 = Number(params.x1 || 0);
                    var cx = Number(params.cx || 0);
                    var t = Number(params.t || 0);
                    
                    t = Math.max(0, Math.min(1, t));
                    
                    return (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
                } catch (e) {
                    showDanNotification('错误', '赛贝尔曲线计算失败: ' + e.message);
                    return 0;
                }
            }
        },
        {
            type: 'bezier_y',
            message0: '赛贝尔曲线Y 起点x%1 y%2 终点x%3 y%4 控制点x%5 y%6 时间t%7',
            args0: [
                { type: 'input_value', name: 'x0', value: '', check: 'Number' },
                { type: 'input_value', name: 'y0', value: '', check: 'Number' },
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'cx', value: '', check: 'Number' },
                { type: 'input_value', name: 'cy', value: '', check: 'Number' },
                { type: 'input_value', name: 't', value: '', check: 'Number' }
            ],
            output: 'Number',
            tooltip: '计算二次贝塞尔曲线上指定时间t的Y坐标',
            function: function(params) {
                try {
                    var y0 = Number(params.y0 || 0);
                    var y1 = Number(params.y1 || 0);
                    var cy = Number(params.cy || 0);
                    var t = Number(params.t || 0);
                    
                    t = Math.max(0, Math.min(1, t));
                    
                    return (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
                } catch (e) {
                    showDanNotification('错误', '赛贝尔曲线计算失败: ' + e.message);
                    return 0;
                }
            }
        },

        // ──── 打开新窗口 ────
        {
            type: 'play_video',
            message0: '打开新窗口 %1',
            args0: [{ type: 'input_value', name: 'url', value: '', check: 'String' }],
            tooltip: '在新窗口中打开视频链接',
            function: function(params) {
                try {
                    var videoUrl = String(params.url || '').trim();
                    if (!videoUrl) {
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('请输入视频URL', 'error');
                        return;
                    }
                    
                    window.open(videoUrl, '_blank', 'width=' + window.screen.width + ',height=' + window.screen.height + ',top=0,left=0,toolbar=no,location=no,menubar=no,status=no,scrollbars=yes,resizable=yes');
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('视频已在新窗口打开', 'ok');
                } catch (e) {
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('打开视频失败: ' + e.message, 'error');
                }
            }
        },

        // ──── 涟漪效果 ────
        {
            type: 'create_ripple_area',
            message0: '创建涟漪区域 x1%1 y1%2 x2%3 y2%4 id%5',
            args0: [
                { type: 'input_value', name: 'x1', value: '', check: 'Number' },
                { type: 'input_value', name: 'y1', value: '', check: 'Number' },
                { type: 'input_value', name: 'x2', value: '', check: 'Number' },
                { type: 'input_value', name: 'y2', value: '', check: 'Number' },
                { type: 'input_value', name: 'id', value: '', check: 'String' }
            ],
            tooltip: '在指定区域创建一个可触发涟漪效果的元素',
            function: function(params) {
                try {
                    var x1 = Number(params.x1 || 0);
                    var y1 = Number(params.y1 || 0);
                    var x2 = Number(params.x2 || 0);
                    var y2 = Number(params.y2 || 0);
                    var id = String(params.id || '').trim();
                    
                    if (!id) {
                        showDanNotification('错误', '请输入涟漪区域ID');
                        return;
                    }
                    
                    var width = Math.abs(x2 - x1);
                    var height = Math.abs(y2 - y1);
                    var x = Math.min(x1, x2);
                    var y = Math.min(y1, y2);
                    
                    var container = document.getElementById('STAGE_WIDGET') || document.body;
                    
                    var existingEl = document.getElementById('ripple-area-' + id);
                    if (existingEl) {
                        existingEl.remove();
                    }
                    
                    var el = document.createElement('div');
                    el.id = 'ripple-area-' + id;
                    el.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + width + 'px;height:' + height + 'px;background:rgba(76,175,80,0.1);border:1px dashed #4CAF50;border-radius:4px;cursor:pointer;overflow:hidden;z-index:1000;';
                    el.classList.add('mdui-ripple');
                    
                    container.appendChild(el);
                    __RIPPLE_ELEMENTS__[id] = el;
                    
                } catch (e) {
                    showDanNotification('错误', '创建涟漪区域失败: ' + e.message);
                }
            }
        },
        {
            type: 'destroy_ripple_area',
            message0: '销毁涟漪区域 id%1',
            args0: [{ type: 'input_value', name: 'id', value: '', check: 'String' }],
            tooltip: '销毁指定ID的涟漪区域',
            function: function(params) {
                try {
                    var id = String(params.id || '').trim();
                    if (!id) {
                        showDanNotification('错误', '请输入涟漪区域ID');
                        return;
                    }
                    
                    var el = document.getElementById('ripple-area-' + id);
                    if (el) {
                        el.remove();
                        delete __RIPPLE_ELEMENTS__[id];
                    }
                    
                } catch (e) {
                    showDanNotification('错误', '销毁涟漪区域失败: ' + e.message);
                }
            }
        },
        {
            type: 'trigger_ripple',
            message0: '触发涟漪 id%1 x%2 y%3',
            args0: [
                { type: 'input_value', name: 'id', value: '', check: 'String' },
                { type: 'input_value', name: 'x', value: '', check: 'Number' },
                { type: 'input_value', name: 'y', value: '', check: 'Number' }
            ],
            tooltip: '在指定涟漪区域的指定位置触发涟漪效果',
            function: function(params) {
                try {
                    var id = String(params.id || '').trim();
                    var x = Number(params.x || 0);
                    var y = Number(params.y || 0);
                    
                    if (!id) {
                        showDanNotification('错误', '请输入涟漪区域ID');
                        return;
                    }
                    
                    var el = __RIPPLE_ELEMENTS__[id];
                    if (!el) {
                        showDanNotification('错误', '未找到涟漪区域: ' + id);
                        return;
                    }
                    
                    createRippleEffect(el, x, y);
                    
                } catch (e) {
                    showDanNotification('错误', '触发涟漪失败: ' + e.message);
                }
            }
        },

        // ──── MDUI 对话框（异步回调）───
        {
            type: 'mdui_dialog_msg',
            message0: 'MDUI消息框 标题%1 内容%2',
            args0: [
                { type: 'input_value', name: 'title', value: '提示', check: 'String' },
                { type: 'input_value', name: 'content', value: '', check: 'String' }
            ],
            tooltip: '显示MDUI消息对话框，点击确定后结果存入回调变量',
            function: function(params) {
                try {
                    var title = String(params.title || '提示');
                    var content = String(params.content || '');
                    
                    window.__MDUI_DIALOG_READY_GLOBAL__ = false;
                    window.__MDUI_DIALOG_RESULT_GLOBAL__ = null;
                    
                    if (window.mdui) {
                        mdui.dialog({
                            title: title,
                            content: content,
                            buttons: [
                                {
                                    text: '确定',
                                    onClick: function() {
                                        window.__MDUI_DIALOG_RESULT_GLOBAL__ = 'ok';
                                        window.__MDUI_DIALOG_READY_GLOBAL__ = true;
                                    }
                                }
                            ],
                            onClosed: function() {
                                if (!window.__MDUI_DIALOG_READY_GLOBAL__) {
                                    window.__MDUI_DIALOG_RESULT_GLOBAL__ = 'closed';
                                    window.__MDUI_DIALOG_READY_GLOBAL__ = true;
                                }
                            }
                        });
                    } else {
                        showDanNotification('错误', 'MDUI尚未加载完成，请稍后重试');
                    }
                } catch (e) {
                    showDanNotification('错误', 'MDUI消息框失败: ' + e.message);
                }
            }
        },
        {
            type: 'mdui_dialog_input',
            message0: 'MDUI输入框 标题%1 提示%2 默认%3',
            args0: [
                { type: 'input_value', name: 'title', value: '输入', check: 'String' },
                { type: 'input_value', name: 'hint', value: '', check: 'String' },
                { type: 'input_value', name: 'default', value: '', check: 'String' }
            ],
            tooltip: '显示MDUI输入对话框，用户输入存入回调变量',
            function: function(params) {
                try {
                    var title = String(params.title || '输入');
                    var hint = String(params.hint || '');
                    var defaultValue = String(params.default || '');
                    
                    window.__MDUI_DIALOG_READY_GLOBAL__ = false;
                    window.__MDUI_DIALOG_RESULT_GLOBAL__ = null;
                    
                    var inputHtml = '<input id="mdui-dialog-input" type="text" class="mdui-textfield-input" placeholder="' + hint + '" value="' + defaultValue + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;"/>';
                    
                    if (window.mdui) {
                        mdui.dialog({
                            title: title,
                            content: inputHtml,
                            buttons: [
                                {
                                    text: '取消',
                                    onClick: function() {
                                        window.__MDUI_DIALOG_RESULT_GLOBAL__ = '';
                                        window.__MDUI_DIALOG_READY_GLOBAL__ = true;
                                    }
                                },
                                {
                                    text: '确定',
                                    onClick: function() {
                                        var inputEl = document.getElementById('mdui-dialog-input');
                                        window.__MDUI_DIALOG_RESULT_GLOBAL__ = inputEl ? inputEl.value : '';
                                        window.__MDUI_DIALOG_READY_GLOBAL__ = true;
                                    }
                                }
                            ],
                            onClosed: function() {
                                if (!window.__MDUI_DIALOG_READY_GLOBAL__) {
                                    window.__MDUI_DIALOG_RESULT_GLOBAL__ = '';
                                    window.__MDUI_DIALOG_READY_GLOBAL__ = true;
                                }
                            }
                        });
                    } else {
                        showDanNotification('错误', 'MDUI尚未加载完成，请稍后重试');
                    }
                } catch (e) {
                    showDanNotification('错误', 'MDUI输入框失败: ' + e.message);
                }
            }
        },
        {
            type: 'mdui_dialog_ready',
            message0: 'MDUI对话框就绪',
            output: 'Boolean',
            tooltip: '检查对话框回调是否就绪',
            function: function(params) {
                return window.__MDUI_DIALOG_READY_GLOBAL__ || false;
            }
        },
        {
            type: 'mdui_dialog_result',
            message0: 'MDUI对话框结果',
            output: 'String',
            tooltip: '获取对话框回调结果（消息框返回ok/closed，确认框返回true/false，输入框返回输入内容）',
            function: function(params) {
                var result = window.__MDUI_DIALOG_RESULT_GLOBAL__;
                if (result === true || result === false) {
                    return String(result);
                }
                if (result && typeof result === 'object') {
                    return result.value || '';
                }
                return String(result || '');
            }
        },
        {
            type: 'mdui_snackbar',
            message0: 'MDUI消息条 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '在屏幕底部显示MDUI风格消息条',
            function: function(params) {
                try {
                    var message = String(params.message || '');
                    
                    if (window.mdui) {
                        mdui.snackbar({
                            message: message,
                            position: 'bottom',
                            timeout: 3000
                        });
                    } else {
                        showDanNotification('错误', 'MDUI尚未加载完成，请稍后重试');
                    }
                } catch (e) {
                    showDanNotification('错误', 'MDUI消息条失败: ' + e.message);
                }
            }
        },
        {
            type: 'mdui_toast',
            message0: 'MDUI提示 %1',
            args0: [{ type: 'input_value', name: 'message', value: '', check: 'String' }],
            tooltip: '显示MDUI风格Toast提示',
            function: function(params) {
                try {
                    var message = String(params.message || '');
                    
                    if (window.mdui) {
                        mdui.snackbar({
                            message: message,
                            position: 'top',
                            timeout: 2000
                        });
                    } else {
                        showDanNotification('错误', 'MDUI尚未加载完成，请稍后重试');
                    }
                } catch (e) {
                    showDanNotification('错误', 'MDUI提示失败: ' + e.message);
                }
            }
        },

        // ──── 惠特米勒对象 ────
        {
            type: 'create_whitmiller',
            message0: '创建惠特米勒对象',
            tooltip: '在舞台div中创建HTML容器（只能创建一个）',
            function: function(params) {
                try {
                    var container = document.getElementById('STAGE_WIDGET');
                    if (!container) {
                        showDanNotification('错误', '未找到STAGE_WIDGET容器');
                        return;
                    }
                    
                    if (__WHITMILLER_OBJECT__) {
                        __WHITMILLER_OBJECT__.remove();
                    }
                    
                    var div = document.createElement('div');
                    div.id = 'WHITMILLER_OBJECT';
                    div.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:9998;overflow:hidden;';
                    
                    container.appendChild(div);
                    __WHITMILLER_OBJECT__ = div;
                    
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('惠特米勒对象已创建', 'ok');
                } catch (e) {
                    showDanNotification('错误', '创建惠特米勒对象失败: ' + e.message);
                }
            }
        },
        {
            type: 'destroy_whitmiller',
            message0: '销毁惠特米勒对象',
            tooltip: '销毁已创建的惠特米勒对象',
            function: function(params) {
                try {
                    if (__WHITMILLER_OBJECT__) {
                        __WHITMILLER_OBJECT__.remove();
                        __WHITMILLER_OBJECT__ = null;
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('惠特米勒对象已销毁', 'ok');
                    }
                } catch (e) {
                    showDanNotification('错误', '销毁惠特米勒对象失败: ' + e.message);
                }
            }
        },
        {
            type: 'whitmiller_load_code',
            message0: '加载代码 %1',
            args0: [{ type: 'input_value', name: 'code', value: '', check: 'String' }],
            tooltip: '直接粘贴HTML/CSS/JS代码到舞台',
            function: function(params) {
                try {
                    var container = document.getElementById('STAGE_WIDGET');
                    if (!container) {
                        showDanNotification('错误', '未找到STAGE_WIDGET容器');
                        return;
                    }
                    
                    if (!__WHITMILLER_OBJECT__) {
                        var div = document.createElement('div');
                        div.id = 'WHITMILLER_OBJECT';
                        div.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:9998;overflow:hidden;';
                        container.appendChild(div);
                        __WHITMILLER_OBJECT__ = div;
                    }
                    
                    var code = String(params.code || '');
                    __WHITMILLER_OBJECT__.innerHTML = code;
                    
                    setTimeout(function() {
                        if (window.mdui) {
                            mdui.mutation();
                        }
                    }, 100);
                    
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('代码已加载', 'ok');
                } catch (e) {
                    showDanNotification('错误', '加载代码失败: ' + e.message);
                }
            }
        },
        {
            type: 'whitmiller_load_url',
            message0: '网络加载代码 %1',
            args0: [{ type: 'input_value', name: 'url', value: '', check: 'String' }],
            tooltip: '从URL加载HTML代码到舞台',
            function: function(params) {
                try {
                    var container = document.getElementById('STAGE_WIDGET');
                    if (!container) {
                        showDanNotification('错误', '未找到STAGE_WIDGET容器');
                        return;
                    }
                    
                    var url = String(params.url || '').trim();
                    if (!url) {
                        showDanNotification('错误', '请输入URL');
                        return;
                    }
                    
                    fetch(url)
                        .then(function(response) {
                            if (!response.ok) {
                                throw new Error('HTTP error ' + response.status);
                            }
                            return response.text();
                        })
                        .then(function(html) {
                            if (!__WHITMILLER_OBJECT__) {
                                var div = document.createElement('div');
                                div.id = 'WHITMILLER_OBJECT';
                                div.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:9998;overflow:hidden;';
                                container.appendChild(div);
                                __WHITMILLER_OBJECT__ = div;
                            }
                            
                            __WHITMILLER_OBJECT__.innerHTML = html;
                            
                            setTimeout(function() {
                                if (window.mdui) {
                                    mdui.mutation();
                                }
                            }, 100);
                            
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('代码加载完成', 'ok');
                        })
                        .catch(function(e) {
                            showDanNotification('错误', '网络加载失败: ' + e.message);
                        });
                } catch (e) {
                    showDanNotification('错误', '网络加载失败: ' + e.message);
                }
            }
        },
        {
            type: 'whitmiller_execute_js',
            message0: '执行代码 %1',
            args0: [{ type: 'input_value', name: 'code', value: '', check: 'String' }],
            tooltip: '执行JavaScript代码操作HTML框内元素（支持播放视频等）',
            function: function(params) {
                try {
                    if (!__WHITMILLER_OBJECT__) {
                        showDanNotification('错误', '请先创建惠特米勒对象或加载代码');
                        return;
                    }
                    
                    var code = String(params.code || '');
                    if (!code.trim()) {
                        showDanNotification('错误', '请输入JavaScript代码');
                        return;
                    }
                    
                    var result = null;
                    try {
                        result = new Function(code).call(__WHITMILLER_OBJECT__);
                    } catch (e) {
                        showDanNotification('错误', '代码执行失败: ' + e.message);
                        return;
                    }
                    
                    if (result !== undefined && result !== null) {
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('执行完成: ' + String(result), 'ok');
                    } else {
                        window.__CUE_TOAST__ && window.__CUE_TOAST__('代码执行完成', 'ok');
                    }
                } catch (e) {
                    showDanNotification('错误', '执行代码失败: ' + e.message);
                }
            }
        },

        // ──── 自定义弹窗 ────
        {
            type: 'show_notification',
            message0: '显示弹窗 标题 %1 详情 %2',
            args0: [
                { type: 'input_value', name: 'title', value: '提示', check: 'String' },
                { type: 'input_value', name: 'detail', value: '', check: 'String' }
            ],
            tooltip: '在右上角显示自定义弹窗，最多显示3条',
            function: function(params) {
                try {
                    var title = String(params.title || '提示');
                    var detail = String(params.detail || '');
                    
                    var notificationId = 'dan-notification-' + Date.now();
                    
                    __NOTIFICATIONS__.push({ id: notificationId, title: title, detail: detail });
                    
                    if (__NOTIFICATIONS__.length > __NOTIFICATION_MAX__) {
                        var oldest = __NOTIFICATIONS__.shift();
                        var oldEl = document.getElementById(oldest.id);
                        if (oldEl) oldEl.remove();
                    }
                    
                    var el = document.createElement('div');
                    el.id = notificationId;
                    el.style.cssText = 'position:fixed;right:16px;top:' + (16 + (__NOTIFICATIONS__.length - 1) * 100) + 'px;width:320px;background:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);padding:14px;z-index:2147483647;border:1px solid #eee;';
                    
                    var titleEl = document.createElement('div');
                    titleEl.style.cssText = 'font-weight:600;font-size:14px;color:#333;margin-bottom:6px;';
                    titleEl.textContent = title;
                    el.appendChild(titleEl);
                    
                    var detailEl = document.createElement('div');
                    detailEl.style.cssText = 'font-size:13px;color:#666;line-height:1.5;margin-bottom:10px;word-break:break-all;max-height:60px;overflow:hidden;';
                    detailEl.textContent = detail;
                    el.appendChild(detailEl);
                    
                    var btnContainer = document.createElement('div');
                    btnContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
                    
                    var copyBtn = document.createElement('button');
                    copyBtn.textContent = '复制';
                    copyBtn.style.cssText = 'padding:4px 12px;font-size:12px;color:#4CAF50;border:1px solid #4CAF50;border-radius:4px;background:#fff;cursor:pointer;';
                    copyBtn.onclick = function() {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(detail).then(function() {
                                copyBtn.textContent = '已复制';
                                setTimeout(function() { copyBtn.textContent = '复制'; }, 2000);
                            });
                        } else {
                            window.__CUE_TOAST__ && window.__CUE_TOAST__('浏览器不支持复制', 'error');
                        }
                    };
                    btnContainer.appendChild(copyBtn);
                    
                    var closeBtn = document.createElement('button');
                    closeBtn.textContent = '关闭';
                    closeBtn.style.cssText = 'padding:4px 12px;font-size:12px;color:#999;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;';
                    closeBtn.onclick = function() {
                        el.remove();
                        var index = __NOTIFICATIONS__.findIndex(function(n) { return n.id === notificationId; });
                        if (index > -1) __NOTIFICATIONS__.splice(index, 1);
                        updateNotificationPositions();
                    };
                    btnContainer.appendChild(closeBtn);
                    
                    el.appendChild(btnContainer);
                    document.body.appendChild(el);
                    
                    setTimeout(function() {
                        var existingEl = document.getElementById(notificationId);
                        if (existingEl) {
                            existingEl.remove();
                            var index = __NOTIFICATIONS__.findIndex(function(n) { return n.id === notificationId; });
                            if (index > -1) __NOTIFICATIONS__.splice(index, 1);
                            updateNotificationPositions();
                        }
                    }, 8000);
                    
                } catch (e) {
                    window.__CUE_TOAST__ && window.__CUE_TOAST__('显示弹窗失败: ' + e.message, 'error');
                }
            }
        },

            ],

    /* ==================== 事件定义 ==================== */
    events: [],

    /* ==================== 工具箱布局 ==================== */
    toolbox: [
        { type: 'label', text: 'Base64' },
        { type: 'method', block: 'base64_encode' },
        { type: 'method', block: 'base64_decode' },

        { type: 'label', text: '弹窗消息' },
        { type: 'method', block: 'alert_message' },
        { type: 'method', block: 'confirm_dialog' },
        { type: 'method', block: 'prompt_input' },

        { type: 'label', text: '控制台' },
        { type: 'method', block: 'console_log' },
        { type: 'method', block: 'console_warn' },
        { type: 'method', block: 'console_error' },

        { type: 'label', text: 'URL' },
        { type: 'method', block: 'url_encode' },
        { type: 'method', block: 'url_decode' },

        { type: 'label', text: 'JSON' },
        { type: 'method', block: 'json_stringify' },
        { type: 'method', block: 'json_parse' },
        { type: 'method', block: 'json_get_key' },

        { type: 'label', text: 'RSA' },
        { type: 'method', block: 'rsa_generate_keys' },
        { type: 'method', block: 'rsa_encrypt' },
        { type: 'method', block: 'rsa_decrypt' },

        { type: 'label', text: '字符串' },
        { type: 'method', block: 'string_length' },
        { type: 'method', block: 'string_to_upper' },
        { type: 'method', block: 'string_to_lower' },

        { type: 'label', text: '时间' },
        { type: 'method', block: 'get_timestamp' },
        { type: 'method', block: 'get_current_time' },
        { type: 'method', block: 'timestamp_to_date' },
        { type: 'method', block: 'date_to_timestamp' },

        { type: 'label', text: '工具' },
        { type: 'method', block: 'read_clipboard' },
        { type: 'method', block: 'read_clipboard_js' },
        { type: 'method', block: 'set_clipboard' },
        { type: 'method', block: 'set_clipboard_js' },
        { type: 'method', block: 'get_clipboard_content' },
        { type: 'method', block: 'list_directory' },
        { type: 'method', block: 'get_directory_content' },

        { type: 'label', text: 'HTTP' },
        { type: 'method', block: 'http_get' },
        { type: 'method', block: 'http_post' },
        { type: 'method', block: 'get_http_response' },
        { type: 'method', block: 'get_http_status' },

        { type: 'label', text: '画布' },
        { type: 'method', block: 'create_canvas' },
        { type: 'method', block: 'destroy_canvas' },
        { type: 'method', block: 'clear_canvas' },
        { type: 'method', block: 'draw_rect' },
        { type: 'method', block: 'erase_matrix' },
        { type: 'method', block: 'draw_image' },
        { type: 'method', block: 'draw_texture' },
        { type: 'method', block: 'image_to_base64' },

        { type: 'label', text: '伪3D方块' },
        { type: 'method', block: 'create_block_data' },
        { type: 'method', block: 'draw_block_entity' },
        { type: 'method', block: 'delete_block_entity' },
        { type: 'method', block: 'destroy_block_data' },
        { type: 'method', block: 'redraw_block' },

        { type: 'label', text: '物理效果' },
        { type: 'method', block: 'physics_fall' },

        { type: 'label', text: '赛贝尔曲线' },
        { type: 'method', block: 'bezier_x' },
        { type: 'method', block: 'bezier_y' },

        { type: 'label', text: '打开窗口' },
        { type: 'method', block: 'play_video' },

        { type: 'label', text: '弹窗' },
        { type: 'method', block: 'show_notification' },

        { type: 'label', text: 'MDUI对话框' },
        { type: 'method', block: 'mdui_dialog_msg' },
        { type: 'method', block: 'mdui_dialog_input' },
        { type: 'method', block: 'mdui_dialog_ready' },
        { type: 'method', block: 'mdui_dialog_result' },
        { type: 'method', block: 'mdui_snackbar' },
        { type: 'method', block: 'mdui_toast' },

        { type: 'label', text: '涟漪效果' },
        { type: 'method', block: 'create_ripple_area' },
        { type: 'method', block: 'destroy_ripple_area' },
        { type: 'method', block: 'trigger_ripple' },

        { type: 'label', text: '惠特米勒对象' },
        { type: 'method', block: 'create_whitmiller' },
        { type: 'method', block: 'destroy_whitmiller' },
        { type: 'method', block: 'whitmiller_load_code' },
        { type: 'method', block: 'whitmiller_load_url' },
        { type: 'method', block: 'whitmiller_execute_js' }
    ]
};

exports.extension = DAN_DEV_TOOLS;

/* ===== 自定义涟漪效果实现 ===== */
function createRippleEffect(el, x, y) {
    var ripple = document.createElement('span');
    ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(76,175,80,0.4);transform:translate(-50%,-50%);pointer-events:none;transition:all 0.6s ease-out;';
    
    var size = Math.max(el.offsetWidth, el.offsetHeight) * 2;
    ripple.style.width = ripple.style.height = '0px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    el.appendChild(ripple);
    
    requestAnimationFrame(function() {
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.opacity = '0';
    });
    
    setTimeout(function() {
        ripple.remove();
    }, 600);
}

/* ===== 静默加载 MDUI 界面美化（无积木，自动生效）===== */
(function() {
    var targetSelectors = [
        '.blocklyTreeNode',
        '.FileManagement_fileManagerWrapper__g14oG',
        '.Setting_settingWrapper__LHc0B'
    ];

    function loadCSS(url) {
        return new Promise(function(resolve) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });
    }

    function loadJS(url) {
        return new Promise(function(resolve) {
            var script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
        });
    }

    function hasTargetElements() {
        for (var i = 0; i < targetSelectors.length; i++) {
            if (document.querySelector(targetSelectors[i])) {
                return true;
            }
        }
        return false;
    }

    function addRippleToElements() {
        var selectors = [
            '.blocklyTreeNode:not(.mdui-ripple)',
            'li:not(.mdui-ripple)',
            '.CommonUpLoadPanel_containerWrapper__PxxQt.CommonUpLoadPanel_styleMode__xcTit > *:not(.mdui-ripple)',
            '.Header_tabs__DKUO5 > *:not(.mdui-ripple)',
            '[class*="toolboxSelect"]:not(.mdui-ripple)',
            '.ActorUpLoadPanel_containerWrapper__HPPZx.enter-done > *:not(.mdui-ripple)',
            '#RunnerBtn:not(.mdui-ripple)'
        ];
        
        selectors.forEach(function(selector) {
            var elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                elements.forEach(function(el) {
                    el.classList.add('mdui-ripple');
                });
            }
        });
        
        forceAddRipple('.FileManagement_fileManagerWrapper__g14oG');
        forceAddRipple('.Setting_settingWrapper__LHc0B');
        forceAddRipple('[class*="BackPackButton_backpackBtn"]');
    }
    
    function forceAddRipple(selector) {
        var elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            elements.forEach(function(el) {
                el.classList.remove('mdui-ripple');
                el.classList.add('mdui-ripple');
                el.classList.add('mdui-ripple-white');
            });
        }
    }

    function setupUIEnhancements() {
        var checkInterval = setInterval(function() {
            if (hasTargetElements()) {
                clearInterval(checkInterval);
                
                setTimeout(addRippleToElements, 100);
                
                setInterval(addRippleToElements, 200);
                
                var observer = new MutationObserver(function(mutations) {
                    var shouldUpdate = false;
                    mutations.forEach(function(mutation) {
                        if (mutation.addedNodes.length > 0) {
                            shouldUpdate = true;
                        }
                    });
                    if (shouldUpdate) {
                        addRippleToElements();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                if (window.mdui) {
                    setTimeout(function() {
                        new mdui.Component('.mdui-ripple');
                    }, 200);
                }
            }
        }, 500);
    }

    loadCSS('https://unpkg.com/mdui@1.0.2/dist/css/mdui.min.css').then(function() {
        loadJS('https://unpkg.com/mdui@1.0.2/dist/js/mdui.min.js').then(function() {
            setupUIEnhancements();
        });
    });
})();