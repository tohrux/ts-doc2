import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/doc' },
  { path: '/doc', component: import('../components/Main.vue') },
  { path: '/doc/:className', component: import('../components/Main.vue') },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: import('../components/NotFound.vue'),
  },
]

//路由对象
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
