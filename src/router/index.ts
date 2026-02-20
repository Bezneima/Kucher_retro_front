import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken } from '@/auth/session'
import AuthPage from '../pages/AuthPage.vue'
import RoomPage from '../pages/RoomPage.vue'
import TeamsPage from '../pages/TeamsPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/teams',
    },
    {
      path: '/teams',
      name: 'teams',
      component: TeamsPage,
    },
    {
      path: '/boards',
      redirect: '/teams',
    },
    {
      path: '/boards/:id',
      name: 'board',
      component: RoomPage,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthPage,
    },
  ],
})

router.beforeEach((to) => {
  const hasAccessToken = Boolean(getAccessToken())

  if (to.name !== 'auth' && !hasAccessToken) {
    return { name: 'auth' }
  }

  if (to.name === 'auth' && hasAccessToken) {
    return { name: 'teams' }
  }

  return true
})

export default router
