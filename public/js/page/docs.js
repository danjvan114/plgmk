(function () {
  'use strict';

  const App = window.App;
  const view = document.getElementById('view');

  async function main() {
    await App.ready;
    view.innerHTML = `
      <div class="page-title"><div><h1>开发者文档</h1><div class="sub">KE Hub 插件市场使用与接入说明</div></div></div>
      <div class="markdown-body" style="max-width:860px">
        ${section('一、发布插件', `
          <p>登录后进入「上传插件」页面，填写名称、标签、介绍，并选择插件文件（压缩包 / .bcmkn / .js 等，不超过 10 MB），也可以只填写一条外部下载链接，两者选其一即可。</p>
          <p>发布后插件默认直接上架；你也可以在详情页「下架」随时隐藏。</p>
        `)}
        ${section('二、登录与账号', `
          <p>本社区不保存账号密码。所有登录统一由 <b>KT 用户中心</b>（user.pgrm.top）提供：点击右上角「登录」→ 在用户中心授权 → 自动跳回。登录状态最多保持 30 天。</p>
          <p>请注意「用户名」与「昵称」是两个概念：用户名用于登录与个人页地址（如 /u/danjvan），不可随意修改；在公开场合（作品作者、评论、帖子）展示的是「昵称」。如需修改昵称、头像或邮箱，请前往用户中心个人设置。</p>
          <p>为防范盗号风险，页面会定时向用户中心巡检令牌有效性，一旦失效会立即注销本地登录并要求重新授权。</p>
        `)}
        ${section('三、文件上传', `
          <p>所有上传均通过 JS 异步完成（无整页跳转），带实时进度、速度与剩余时间提示，单文件上限 10 MB。支持图片：png/jpg/gif/webp/svg；插件包：zip/rar/7z/js/py/tar.gz/bcmkn/ttmp4。</p>
          <p>强烈建议上传时保留扩展名；名称含特殊字符的文件会被自动重命名。</p>
        `)}
        ${section('四、论坛与内容', `
          <p>论坛支持板块发帖与多级回复：点击某条回复下的「回复」即可针对该楼层回复；支持 **加粗**、\`行内代码\`、代码块与自动识别的链接。发帖草稿会自动保存在本地浏览器，防止误关丢失。</p>
        `)}
        ${section('五、数据与隐私', `
          <p>本社区的插件 / 作品 / 帖子内容保存在本站，用户基础信息（用户名、昵称、头像）仅以缓存形式存在，实时数据均向用户中心查询。</p>
          <p>公开接口均做了频率限制。评论、点赞等计数由服务端统一维护，删除评论会同步扣减计数。</p>
        `)}
        ${section('六、运行与部署', `
          <p>服务端仅依赖 Node.js（≥18），无需安装任何数据库或第三方组件：数据默认存放在 data/ 目录的 JSON 文件中（写入带原子替换与快照备份），端口默认 8897。</p>
          <p>常用环境变量：PGMK_PORT、PGMK_USER_CENTER、PGMK_AES_KEY、PGMK_AES_IV、PGMK_CALLBACK（强制回调地址）、PGMK_ADMINS（管理员用户名，逗号分隔）、PGMK_DATA_DIR、PGMK_UPLOAD_DIR。</p>
          <p>启动：<code>node server.js</code></p>
        `)}
      </div>`;

    function section(title, html) {
      return `<h2>${title}</h2>${html}`;
    }
  }

  main();
})();
