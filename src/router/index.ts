import { createRouter, createWebHistory } from 'vue-router'
import RoomPage from '../pages/RoomPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: RoomPage,
    },
  ],
})

export default router
