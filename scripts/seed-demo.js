'use strict';

const path = require('path');
const fs = require('fs');
const config = require('../config');

process.env.PGMK_DATA_DIR = config.dataDir;

(async () => {
  const store = require('../lib/store');
  await store.init();

  if (store.col('plugins').size() > 0) {
    console.log('检测到已有插件数据，跳过演示数据。');
    await store.shutdown();
    return;
  }

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const profiles = store.col('profiles_cache');
  profiles.insert({ id: profiles.nextId(), username: 'danjvan', nickname: '阿短', avatar: '', updatedAt: now });
  profiles.insert({ id: profiles.nextId(), username: 'dev', nickname: '开发者小绿', avatar: '', updatedAt: now - 2 * day });
  profiles.insert({ id: profiles.nextId(), username: 'starry_owner', nickname: 'Starry', avatar: '', updatedAt: now });

  const plugins = store.col('plugins');
  const demoPlugins = [
    {
      name: '示例插件：时间显示',
      description: '这是一个演示用插件。\n\n**功能特性**\n- 在画面角落显示当前时间\n- 支持 12/24 小时制切换\n- 字体大小与颜色可调\n\n更多说明请查阅仓库文档。',
      author: 'danjvan',
      version: '1.2.0',
      tags: ['工具', '示例', '时钟'],
      icon: '/uploads/kn.png',
      images: ['/uploads/kn.png'],
      fileUrl: 'https://code.pgrm.top/',
      source: 'external',
      downloadCount: 128,
      viewCount: 2046,
      likeCount: 32,
      coinCount: 7,
      rating: 4.5,
      ratingSum: 9,
      ratingCount: 2
    },
    {
      name: '插件管理器',
      description: '一键管理你的全部插件：**启用 / 停用 / 更新 / 卸载**，并检查插件兼容性。',
      author: 'dev',
      version: '0.9.1',
      tags: ['管理', '工具'],
      source: 'external',
      fileUrl: 'https://code.pgrm.top/',
      downloadCount: 86,
      viewCount: 1503,
      likeCount: 21,
      coinCount: 4,
      rating: 4,
      ratingSum: 4,
      ratingCount: 1
    },
    {
      name: '迷你浏览器面板',
      description: '在播放器内打开网页面板，适合放 Wiki、地图或控制台。',
      author: 'danjvan',
      version: '1.0.0',
      tags: ['网页', '面板'],
      source: 'external',
      fileUrl: 'https://code.pgrm.top/',
      downloadCount: 45,
      viewCount: 920,
      likeCount: 12,
      coinCount: 2,
      rating: 5,
      ratingSum: 5,
      ratingCount: 1
    }
  ];
  demoPlugins.forEach((p, i) => {
    plugins.insert({
      id: plugins.nextId(),
      name: p.name,
      description: p.description,
      author: p.author,
      version: p.version,
      tags: p.tags,
      status: 'active',
      source: p.source,
      fileUrl: p.fileUrl,
      filePath: '',
      fileName: '',
      fileSize: 0,
      fileSha: '',
      icon: p.icon || '',
      cover: '',
      images: p.images || [],
      downloadCount: p.downloadCount,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      coinCount: p.coinCount,
      rating: p.rating,
      ratingSum: p.ratingSum,
      ratingCount: p.ratingCount,
      createdAt: now - i * 4 * day,
      updatedAt: now - i * 4 * day
    });
  });

  const boards = store.col('forum_boards');
  if (boards.size() === 0) {
    [
      ['综合讨论', '插件、开发、使用心得都可以聊'],
      ['求助问答', '遇到问题？在这里提问']
    ].forEach((b, i) => {
      boards.insert({ id: boards.nextId(), name: b[0], description: b[1], icon: 'forum', color: '#5c6bc0', order: i + 1, createdAt: now });
    });
  }

  const posts = store.col('forum_posts');
  const p1 = posts.insert({
    id: posts.nextId(),
    boardId: boards.all()[0].id,
    title: '欢迎来到 KE Hub！',
    content: '这是 KE Hub 的测试帖子。\n\n- 支持 **Markdown 加粗**\n- 支持 `行内代码`\n\n有问题欢迎到「求助问答」板块提问。',
    author: 'danjvan',
    status: 'active',
    isPinned: true,
    viewCount: 230,
    replyCount: 2,
    likeCount: 3,
    createdAt: now - 3 * day,
    updatedAt: now - 3 * day
  });
  const replies = store.col('forum_replies');
  replies.insert({ id: replies.nextId(), postId: p1.id, parentId: 0, author: 'dev', content: '测试回复：支持二级楼中楼～', replyTo: '', status: 'active', isPinned: false, createdAt: now - 2 * day });
  replies.insert({ id: replies.nextId(), postId: p1.id, parentId: 0, author: 'danjvan', content: '欢迎大家常来！', replyTo: '', status: 'active', isPinned: false, createdAt: now - day });

  const works = store.col('works');
  const w1 = works.insert({
    id: works.nextId(),
    title: '示例演示作品',
    description: '这是一个用于演示的作品条目。',
    content: '这是一个用于演示的作品条目。',
    author: 'dev',
    type: 'redirect',
    thumbnail: '/uploads/kn.png',
    fileUrl: 'https://code.pgrm.top/',
    tags: ['演示'],
    status: 'active',
    isHidden: false,
    likeCount: 15,
    favCount: 6,
    commentCount: 1,
    coinCount: 1,
    viewCount: 520,
    createdAt: now - day,
    updatedAt: now - day
  });
  store.col('work_comments').insert({ id: 1, workId: w1.id, parentId: 0, author: 'danjvan', content: '演示评论。', replyTo: '', isDeleted: false, isPinned: false, createdAt: now - 3600e3 });

  const w2 = works.insert({
    id: works.nextId(),
    title: '示例播放器作品',
    description: 'iframe 播放示例（f / u / auth / o / v / auto）',
    content: 'iframe 播放示例',
    author: 'dev',
    type: 'player',
    thumbnail: '/uploads/kn.png',
    fileUrl: 'http://127.0.0.1:5000/1.bcmkn',
    f: 'http://127.0.0.1:5000/1.bcmkn',
    u: '123456', auth: 0, o: '1',
    v: Buffer.from('[http://127.0.0.1:5000/ke.loader.js]','utf8').toString('base64'),
    auto: 1,
    tags: ['示例', '播放器'],
    status: 'active',
    isHidden: false,
    likeCount: 0,
    favCount: 0,
    commentCount: 0,
    coinCount: 0,
    viewCount: 0,
    createdAt: now - 1800e3,
    updatedAt: now - 1800e3
  });

  const bots = store.col('bots');
  bots.insert({
    id: bots.nextId(),
    name: 'KE演示机器人',
    enabled: true,
    apiUrl: 'stub://demo',
    apiKey: 'demo',
    model: 'demo',
    prompt: '',
    probability: 100,
    cooldownSec: 0,
    account: { username: 'ke_demo_bot', nickname: 'KE 演示机器人', avatar: '' },
    replyCount: 0,
    createdBy: 'starry_owner',
    createdAt: now,
    updatedAt: now
  });
  profiles.insert({ id: profiles.nextId(), username: 'ke_demo_bot', nickname: 'KE 演示机器人', avatar: '', updatedAt: now });

  store.markDirty('plugins');
  store.markDirty('forum_posts');
  store.markDirty('forum_replies');
  store.markDirty('forum_boards');
  store.markDirty('works');
  store.markDirty('work_comments');
  store.markDirty('profiles_cache');
  store.markDirty('bots');

  require('../routes/market').buildIndexes();
  require('../routes/forum').buildIndexes();
  require('../routes/workpool').buildIndexes();
  require('../routes/team').buildIndexes();

  await store.shutdown();
  console.log('演示数据已写入 data/ 目录。删除 data/ 可恢复全新站点。');
})();
