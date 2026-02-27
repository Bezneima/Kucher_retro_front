import { createRouter, createWebHistory } from 'vue-router'
import { getAccessToken } from '@/auth/session'
import { ensureCurrentUserLoaded } from '@/auth/currentUser'
import AuthPage from '../pages/AuthPage.vue'
import RoomPage from '../pages/RoomPage.vue'
import TeamsPage from '../pages/TeamsPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import InvitePage from '../pages/InvitePage.vue'
import GoogleAuthCallbackPage from '../pages/GoogleAuthCallbackPage.vue'

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
      path: '/retro/boards/:id',
      name: 'retro-board',
      component: RoomPage,
    },
    {
      path: '/invite/:code',
      name: 'invite',
      component: InvitePage,
      meta: {
        public: true,
      },
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
      meta: {
        public: true,
      },
    },
    {
      path: '/auth/google/callback',
      name: 'auth-google-callback',
      component: GoogleAuthCallbackPage,
      meta: {
        public: true,
      },
    },
  ],
})

router.beforeEach(async (to) => {
  if (getAccessToken()) {
    await ensureCurrentUserLoaded()
  }

  const hasAccessToken = Boolean(getAccessToken())
  const isPublicRoute = to.matched.some((record) => record.meta.public === true)

  if (!isPublicRoute && !hasAccessToken) {
    return { name: 'auth' }
  }

  if (to.name === 'auth' && hasAccessToken) {
    return { name: 'teams' }
  }

  return true
})

export default router
