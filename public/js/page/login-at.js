(function () {
  'use strict';

  const spinner = document.getElementById('spinner');
  const errbox = document.getElementById('errbox');

  // 解析 URL query（纯原生，不依赖 App.qs）
  function qs(key) {
    const m = new URL(location.href).searchParams.get(key);
    return m;
  }

  function showError(title, message) {
    spinner.hidden = true;
    errbox.hidden = false;
    errbox.className = 'err';
    errbox.innerHTML =
      `<h2>${title}</h2>` +
      `<p>${message}</p>` +
      `<a href="/login">重新登录</a>` +
      `<a href="/">返回首页</a>`;
  }

  async function main() {
    const login = qs('login');
    if (!login) {
      // 没凭据 → 有 session 就跳首页，否则去登录
      try {
        const r = await fetch('/api/auth/state', { credentials: 'include' });
        const d = await r.json();
        if (d.ok && d.loggedIn) { location.replace('/'); return; }
      } catch {}
      showError('未检测到登录凭据', '请先发起登录流程。');
      return;
    }

    try {
      const r = await fetch('/api/auth/sso/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw { data: d };
      // 成功 → 跳首页（Vue SPA 会自动识别已登录态）
      location.replace('/');
    } catch (e) {
      const err = (e && e.data) || {};
      const tips = {
        EXPIRED: '登录信息已过期，请重新登录',
        REPLAYED: '该登录凭据已被使用，请重新登录',
        DECRYPT_FAILED: '凭据解密失败，请确认密钥配置正确'
      };
      showError('登录失败', tips[err.reason] || err.msg || e.message || '未知错误');
    }
  }

  main();
})();
