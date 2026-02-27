<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'
import { setAuthSession } from '@/auth/session'
import Loader from '@/components/common/Loader/Loader.vue'
import NotificationStack from '@/components/teams/NotificationStack.vue'
import { useUiNotifications } from '@/composables/useUiNotifications'
import { consumePendingInviteAfterAuth } from '@/features/invite/composables/consumePendingInviteAfterAuth'
import { navigateToInviteRedirectPath } from '@/features/invite/navigation'
import { useRetroStore } from '@/stores/RetroStore'

const route = useRoute()
const router = useRouter()
const retroStore = useRetroStore()

const isSubmitting = ref(false)
const errorMessage = ref('')
const { notifications, pushNotification, dismissNotification } = useUiNotifications()

const exchangeToken = computed(() => {
  const routeExchangeToken = Array.isArray(route.query.exchangeToken)
    ? route.query.exchangeToken[0]
    : route.query.exchangeToken

  return typeof routeExchangeToken === 'string' ? routeExchangeToken.trim() : ''
})

const returnTo = computed(() => {
  const routeReturnTo = Array.isArray(route.query.returnTo) ? route.query.returnTo[0] : route.query.returnTo
  if (typeof routeReturnTo !== 'string') {
    return '/teams'
  }

  const normalizedReturnTo = routeReturnTo.trim()
  if (!normalizedReturnTo.startsWith('/') || normalizedReturnTo.startsWith('//')) {
    return '/teams'
  }

  if (normalizedReturnTo === '/auth/google/callback') {
    return '/teams'
  }

  return normalizedReturnTo
})

const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return 'Не удалось выполнить вход. Повторите попытку.'
  }

  const data = error.response?.data as { message?: unknown } | undefined
  if (Array.isArray(data?.message)) {
    return data.message.join(', ')
  }
  if (typeof data?.message === 'string') {
    return data.message
  }

  return error.message || 'Не удалось выполнить вход. Повторите попытку.'
}

const backToAuth = async () => {
  await router.replace({ name: 'auth' })
}

const exchangeGoogleToken = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  if (!exchangeToken.value) {
    errorMessage.value = 'Ссылка входа недействительна: не найден exchangeToken.'
    isSubmitting.value = false
    return
  }

  try {
    const response = await httpClient.post('/auth/google/exchange', {
      exchangeToken: exchangeToken.value,
    })

    if (!response.data?.accessToken) {
      throw new Error('Сервер не вернул accessToken')
    }

    setAuthSession(response.data)
    retroStore.clearCurrentUser()
    const pendingInviteResult = await consumePendingInviteAfterAuth()

    if (pendingInviteResult.status === 'accepted') {
      await navigateToInviteRedirectPath(router, pendingInviteResult.redirectPath)
      return
    }

    if (pendingInviteResult.status === 'unauthorized') {
      return
    }

    if (pendingInviteResult.status === 'invalid') {
      pushNotification('error', 'Ссылка больше недействительна')
    } else if (pendingInviteResult.status === 'error') {
      pushNotification(
        'error',
        'Не удалось принять приглашение',
        'Попробуйте открыть invite-ссылку повторно.',
      )
    }

    await router.replace(returnTo.value)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void exchangeGoogleToken()
})
</script>

<template>
  <NotificationStack
    :notifications="notifications"
    @dismiss="dismissNotification"
  />
  <main class="google-auth-page">
    <section class="google-auth-card">
      <template v-if="isSubmitting">
        <Loader />
        <h1 class="google-auth-title">Выполняем вход через Google...</h1>
      </template>

      <template v-else-if="errorMessage">
        <h1 class="google-auth-title">Не удалось завершить вход</h1>
        <p class="google-auth-description">{{ errorMessage }}</p>
        <div class="google-auth-actions">
          <button class="google-auth-button secondary" type="button" @click="backToAuth">
            Вернуться на вход
          </button>
          <button class="google-auth-button" type="button" @click="exchangeGoogleToken">
            Повторить
          </button>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.google-auth-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(155deg, #f4f7ff 0%, #eef8ff 45%, #f8fbff 100%);
}

.google-auth-card {
  width: min(460px, 100%);
  box-sizing: border-box;
  padding: 28px 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 35px rgba(28, 55, 90, 0.12);
  border: 1px solid #e6ebf5;
  display: grid;
  justify-items: center;
  gap: 12px;
}

.google-auth-title {
  margin: 0;
  text-align: center;
  font-size: 24px;
  line-height: 1.2;
}

.google-auth-description {
  margin: 0;
  text-align: center;
  color: #455671;
  line-height: 1.4;
}

.google-auth-actions {
  margin-top: 8px;
  display: flex;
  gap: 10px;
}

.google-auth-button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.google-auth-button:hover {
  background: #1777cc;
}

.google-auth-button.secondary {
  background: #f2f5fa;
  color: #22314c;
}

.google-auth-button.secondary:hover {
  background: #e6edf7;
}
</style>
