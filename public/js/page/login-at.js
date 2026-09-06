(function () {
  'use strict';

  const App = window.App;
  const A = App.esc;
  const view = document.getElementById('view');

  async function main() {
    await App.ready;
    const login = App.qs.login;
    if (!login) {
      if (App.state.me) {
        location.replace('/');
        return;
      }
      view.innerHTML = `<div class="empty-tip" style="padding-top:100px">
        <div class="material-icons icon">vpn_key_off</div>
        <div style="margin-bottom:16px">未检测到登录凭据</div>
        <a href="/login"><button type="button" class="btn primary">去登录</button></a>
      </div>`;
      return;
    }

    view.innerHTML = `<div class="empty-tip" style="padding-top:120px">
      <span class="ke-spinner"></span>
      <div style="margin-top:14px;color:var(--mdui-color-on-surface-variant)">正在验证登录信息……</div>
    </div>`;

    try {
      const d = await App.post('/api/auth/sso/decode', { login });
      App.state.me = d.user;
      App.toast(`欢迎回来，${A(d.user.nickname || d.user.username)}`);
      const back = App.qs.back || '/';
      setTimeout(() => location.replace(back), 300);
    } catch (e) {
      const err = e.data || {};
      const tips = {
        EXPIRED: '登录信息已过期，请重新登录',
        REPLAYED: '该登录凭据已被使用，请重新登录',
        DECRYPT_FAILED: '凭据解密失败，请确认密钥配置正确'
      };
      view.innerHTML = `<div class="empty-tip" style="padding-top:100px">
        <div class="material-icons icon">error_outline</div>
        <div style="margin-bottom:6px;font-weight:600">登录失败</div>
        <div style="color:var(--mdui-color-on-surface-variant);margin-bottom:18px;max-width:420px">${A(tips[err.reason] || e.message || '未知错误')}</div>
        <a href="/login"><button type="button" class="btn primary">重新登录</button></a>
        <a href="/"><button type="button" class="btn text">返回首页</button></a>
      </div>`;
    }
  }

  main();
})();
