import { createRouter, createWebHistory } from 'vue-router'
import AuthPage from '../pages/AuthPage.vue'
import BoardsPage from '../pages/BoardsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/boards',
    },
    {
      path: '/boards',
      name: 'boards',
      component: BoardsPage,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthPage,
    },
  ],
})

export default router
