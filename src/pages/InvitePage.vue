<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAccessToken } from '@/auth/session'
import Loader from '@/components/common/Loader/Loader.vue'
import { useInviteFlow } from '@/features/invite/composables/useInviteFlow'
import { navigateToInviteRedirectPath } from '@/features/invite/navigation'
import { clearPendingInvite, savePendingInvite } from '@/features/invite/storage/pendingInvite'

type InvitePageState =
  | 'loading'
  | 'invalid'
  | 'check_error'
  | 'accept_error'
  | 'auth_redirect'
  | 'redirecting'

const route = useRoute()
const router = useRouter()
const inviteCode = computed(() => {
  const routeCode = Array.isArray(route.params.code) ? route.params.code[0] : route.params.code
  return typeof routeCode === 'string' ? routeCode.trim() : ''
})
const inviteFlow = useInviteFlow(inviteCode)
const pageState = ref<InvitePageState>('loading')

let currentRequestId = 0

const isInvalidInvite = computed(() => {
  return pageState.value === 'invalid' || inviteFlow.isInvalidInvite.value
})

const canRetry = computed(() => {
  return pageState.value === 'check_error' || pageState.value === 'accept_error'
})

const statusTitle = computed(() => {
  if (pageState.value === 'auth_redirect') {
    return 'Перенаправляем на вход...'
  }
  if (pageState.value === 'redirecting') {
    return 'Открываем доску...'
  }
  if (inviteFlow.isAccepting.value) {
    return 'Присоединяем к команде...'
  }

  return 'Проверяем приглашение...'
})

const statusDescription = computed(() => {
  const payload = inviteFlow.inviteInfo.value
  if (!payload) {
    return ''
  }

  return `Команда: ${payload.teamName} · Доска: ${payload.boardName}`
})

const resolveInvalidInviteMessage = () => {
  return 'Ссылка приглашения недействительна или уже отозвана.'
}

const resolveRetryMessage = () => {
  if (pageState.value === 'check_error') {
    return 'Не удалось проверить ссылку. Проверьте соединение и попробуйте снова.'
  }

  return 'Не удалось принять приглашение. Попробуйте снова.'
}

const openFallbackScreen = async () => {
  if (getAccessToken()) {
    await router.replace({ name: 'teams' })
    return
  }

  await router.replace({ name: 'auth' })
}

const runInviteFlow = async () => {
  const requestId = ++currentRequestId
  pageState.value = 'loading'

  const code = inviteCode.value
  if (!code) {
    clearPendingInvite()
    pageState.value = 'invalid'
    return
  }

  const inviteInfo = await inviteFlow.loadInviteInfo()
  if (requestId !== currentRequestId) {
    return
  }

  if (!inviteInfo) {
    if (inviteFlow.checkError.value === 'invalid') {
      clearPendingInvite()
      pageState.value = 'invalid'
      return
    }

    pageState.value = 'check_error'
    return
  }

  if (!inviteInfo.valid) {
    clearPendingInvite()
    pageState.value = 'invalid'
    return
  }

  if (!getAccessToken()) {
    savePendingInvite(code)
    pageState.value = 'auth_redirect'
    await router.replace({ name: 'auth' })
    return
  }

  savePendingInvite(code)
  const acceptResponse = await inviteFlow.acceptInvite()
  if (requestId !== currentRequestId) {
    return
  }

  if (!acceptResponse) {
    if (inviteFlow.acceptError.value === 'invalid') {
      clearPendingInvite()
      pageState.value = 'invalid'
      return
    }

    if (inviteFlow.acceptError.value === 'unauthorized') {
      pageState.value = 'auth_redirect'
      await router.replace({ name: 'auth' })
      return
    }

    clearPendingInvite()
    pageState.value = 'accept_error'
    return
  }

  clearPendingInvite()
  pageState.value = 'redirecting'
  await navigateToInviteRedirectPath(router, acceptResponse.redirectPath)
}

const retry = async () => {
  await runInviteFlow()
}

onMounted(() => {
  void runInviteFlow()
})

watch(inviteCode, () => {
  void runInviteFlow()
})
</script>

<template>
  <main class="invite-page">
    <section class="invite-card">
      <template v-if="isInvalidInvite">
        <h1 class="invite-title">Ссылка недействительна</h1>
        <p class="invite-description">{{ resolveInvalidInviteMessage() }}</p>
        <button class="invite-button" type="button" @click="openFallbackScreen">
          Перейти далее
        </button>
      </template>

      <template v-else-if="canRetry">
        <h1 class="invite-title">Не удалось выполнить действие</h1>
        <p class="invite-description">{{ resolveRetryMessage() }}</p>
        <button class="invite-button" type="button" @click="retry">Попробовать снова</button>
      </template>

      <template v-else>
        <Loader />
        <h1 class="invite-title">{{ statusTitle }}</h1>
        <p v-if="statusDescription" class="invite-description">{{ statusDescription }}</p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.invite-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(145deg, #f6f8fd 0%, #ebf2ff 52%, #f8fbff 100%);
}

.invite-card {
  width: min(560px, 100%);
  border: 1px solid #d7e3f3;
  border-radius: 14px;
  background: #fff;
  padding: 24px;
  box-sizing: border-box;
  box-shadow: 0 16px 38px rgba(20, 40, 74, 0.12);
  display: grid;
  justify-items: center;
  gap: 12px;
}

.invite-title {
  margin: 0;
  text-align: center;
  font-size: 24px;
  color: #1f2c44;
}

.invite-description {
  margin: 0;
  text-align: center;
  color: #455671;
  line-height: 1.4;
}

.invite-button {
  margin-top: 4px;
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.invite-button:hover {
  background: #1777cc;
}

:deep(.loader-wrap) {
  min-height: 72px;
}
</style>
