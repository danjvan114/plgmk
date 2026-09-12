import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/main', name: 'main', component: () => import('@/views/Main.vue') },
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/market', name: 'market', component: () => import('@/views/Market.vue') },
  { path: '/forum', name: 'forum', component: () => import('@/views/Forum.vue') },
  { path: '/forum/:id', name: 'forum-board', component: () => import('@/views/Forum.vue') },
  { path: '/workpool', name: 'workpool', component: () => import('@/views/Workpool.vue') },
  { path: '/team', name: 'team', component: () => import('@/views/Team.vue') },
  { path: '/dev', name: 'dev', component: () => import('@/views/Dev.vue') },
  { path: '/download', name: 'download', component: () => import('@/views/Download.vue') },
  { path: '/docs', name: 'docs', component: () => import('@/views/Docs.vue') },
  { path: '/plugin/:id', redirect: (to) => ({ path: '/market', query: { plugin: to.params.id } }) },
  { path: '/plugin/:id/edit', name: 'plugin-edit', component: () => import('@/views/PluginEdit.vue') },
  { path: '/upload', name: 'upload', component: () => import('@/views/PluginEdit.vue') },
  { path: '/post/new', name: 'post-new', component: () => import('@/views/PostEdit.vue') },
  { path: '/post/:id', name: 'post', component: () => import('@/views/Post.vue') },
  { path: '/work/:id', name: 'work', component: () => import('@/views/Work.vue') },
  { path: '/workpool/publish', name: 'work-publish', component: () => import('@/views/WorkEdit.vue') },
  { path: '/workpool/publish/:id', name: 'work-edit', component: () => import('@/views/WorkEdit.vue') },
  { path: '/team/:id', name: 'team-detail', component: () => import('@/views/TeamDetail.vue') },
  { path: '/u/:username', name: 'user', component: () => import('@/views/User.vue') },
  { path: '/admin', name: 'admin', component: () => import('@/views/Admin.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/Home.vue') },
  { path: '/login/at', name: 'login-at', component: () => import('@/views/Home.vue') },
  { path: '/app/player', name: 'player', component: () => import('@/views/Player.vue') },
  { path: '/app/player/', name: 'player-slash', component: () => import('@/views/Player.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/Error.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
