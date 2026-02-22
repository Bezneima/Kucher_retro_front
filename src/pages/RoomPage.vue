<template>
  <main class="room-page">
    <GlobalHeader :user-name="userName" @profile="openProfile" @logout="logout" />

    <section class="room-content">
      <div class="columns">
        <Loader v-if="retroStore.getIsBoardLoading" />
        <RetroBoardComponent v-else />
      </div>
    </section>
  </main>
</template>

<style scoped>
.room-page {
  --teams-page-padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
  padding: var(--teams-page-padding);
  background: linear-gradient(140deg, #f6f8fd 0%, #ecf3ff 45%, #f7fafd 100%);
  display: flex;
  flex-direction: column;
}

.room-content {
  width: calc(100% + (var(--teams-page-padding) * 2));
  margin-left: calc(var(--teams-page-padding) * -1);
  margin-right: calc(var(--teams-page-padding) * -1);
  flex: 1;
  min-height: 0;
  display: flex;
}

.columns {
  width: 100%;
  flex: 1;
  min-height: 0;
}

:deep(.columns > .loader-wrap),
:deep(.columns > .board) {
  height: 100%;
}
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearAuthSession } from '@/auth/session'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'
import RetroBoardComponent from '../components/retro/RetroBoardComponent/RetroBoardComponent.vue'
import Loader from '../components/common/Loader/Loader.vue'
import { useRetroStore } from '../stores/RetroStore'

const retroStore = useRetroStore()
const route = useRoute()
const router = useRouter()
const userName = computed(() => retroStore.getCurrentUserName || 'Пользователь')

const openProfile = async () => {
  await router.push({ name: 'profile' })
}

const logout = async () => {
  retroStore.clearCurrentUser()
  clearAuthSession()
  await router.replace({ name: 'auth' })
}

onMounted(() => {
  const routeBoardId = Number(route.params.id)

  if (Number.isFinite(routeBoardId) && routeBoardId > 0) {
    void retroStore.loadBoardById(routeBoardId)
    return
  }
})
</script>
