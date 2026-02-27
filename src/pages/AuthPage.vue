<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'
import { getAccessToken, setAuthSession } from '@/auth/session'
import { useUiNotifications } from '@/composables/useUiNotifications'
import NotificationStack from '@/components/teams/NotificationStack.vue'
import { consumePendingInviteAfterAuth } from '@/features/invite/composables/consumePendingInviteAfterAuth'
import { navigateToInviteRedirectPath } from '@/features/invite/navigation'
import { useRetroStore } from '@/stores/RetroStore'

type AuthMode = 'login' | 'register'

const router = useRouter()
const retroStore = useRetroStore()
const mode = ref<AuthMode>('login')
const isSubmitting = ref(false)
const errorMessage = ref('')
const { notifications, pushNotification, dismissNotification } = useUiNotifications()

const form = reactive({
  email: '',
  password: '',
  name: '',
})

const isRegisterMode = computed(() => mode.value === 'register')
const submitLabel = computed(() => (isRegisterMode.value ? 'Создать аккаунт' : 'Войти'))
const isGoogleAuthEnabled = computed(() => {
  return import.meta.env.VITE_GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === 'true'
})
const googleAuthStartUrl = computed(() => {
  const apiBaseUrl = import.meta.env.VITE_RETRO_API_BASE_URL?.trim() ?? ''
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '')
  const defaultReturnTo = import.meta.env.VITE_GOOGLE_AUTH_DEFAULT_RETURN_TO?.trim() ?? '/teams'
  const returnTo = defaultReturnTo.startsWith('/') ? defaultReturnTo : '/teams'

  return `${normalizedBaseUrl}/auth/google/start?${new URLSearchParams({ returnTo }).toString()}`
})

const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return 'Не удалось выполнить запрос. Повторите позже.'
  }

  const data = error.response?.data as { message?: unknown } | undefined
  if (Array.isArray(data?.message)) {
    return data.message.join(', ')
  }
  if (typeof data?.message === 'string') {
    return data.message
  }

  return error.message || 'Не удалось выполнить запрос. Повторите позже.'
}

const submit = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const endpoint = isRegisterMode.value ? '/auth/register' : '/auth/login'
    const payload: { email: string; password: string; name?: string } = {
      email: form.email.trim(),
      password: form.password,
    }

    if (isRegisterMode.value && form.name.trim()) {
      payload.name = form.name.trim()
    }

    const response = await httpClient.post(endpoint, payload)

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

    await router.replace('/teams')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

const beginGoogleAuth = () => {
  if (!isGoogleAuthEnabled.value || isSubmitting.value) {
    return
  }

  window.location.assign(googleAuthStartUrl.value)
}

if (getAccessToken()) {
  void router.replace('/teams')
} else {
  retroStore.clearCurrentUser()
}
</script>

<template>
  <NotificationStack
    :notifications="notifications"
    @dismiss="dismissNotification"
  />
  <main class="auth-page">
    <section class="auth-card">
      <h1 class="auth-title">Retro Board</h1>

      <div class="auth-switcher">
        <button
          type="button"
          class="auth-switch"
          :class="{ active: mode === 'login' }"
          :disabled="isSubmitting"
          @click="mode = 'login'"
        >
          Вход
        </button>
        <button
          type="button"
          class="auth-switch"
          :class="{ active: mode === 'register' }"
          :disabled="isSubmitting"
          @click="mode = 'register'"
        >
          Регистрация
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-label">
          <span>Email</span>
          <input
            v-model="form.email"
            class="auth-input"
            type="email"
            required
            autocomplete="email"
          />
        </label>

        <label class="auth-label">
          <span>Пароль</span>
          <input
            v-model="form.password"
            class="auth-input"
            type="password"
            required
            minlength="6"
            autocomplete="current-password"
          />
        </label>

        <label v-if="isRegisterMode" class="auth-label">
          <span>Имя (опционально)</span>
          <input v-model="form.name" class="auth-input" type="text" autocomplete="name" />
        </label>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

        <button class="auth-submit" :disabled="isSubmitting" type="submit">
          {{ isSubmitting ? 'Отправка...' : submitLabel }}
        </button>
      </form>

      <button
        v-if="isGoogleAuthEnabled"
        class="gsi-material-button"
        :disabled="isSubmitting"
        type="button"
        @click="beginGoogleAuth"
      >
        <div class="gsi-material-button-state"></div>
        <div class="gsi-material-button-content-wrapper">
          <div class="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span class="gsi-material-button-contents">Sign in</span>
          <span style="display: none;">Sign in with Google</span>
        </div>
      </button>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(155deg, #f4f7ff 0%, #eef8ff 45%, #f8fbff 100%);
}

.auth-card {
  width: min(420px, 100%);
  box-sizing: border-box;
  padding: 28px 24px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 35px rgba(28, 55, 90, 0.12);
  border: 1px solid #e6ebf5;
}

.auth-title {
  margin: 6px 0 18px;
  font-size: 26px;
  line-height: 1.2;
}

.auth-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 18px;
}

.auth-switch {
  border: 1px solid #d8e1ef;
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}

.auth-switch.active {
  background: #ebf3ff;
  border-color: #80aef7;
}

.auth-form {
  display: grid;
  gap: 12px;
}

.auth-label {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.auth-input {
  border: 1px solid #cfd9e8;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
}

.auth-input:focus {
  outline: none;
  border-color: #7ca8ee;
  box-shadow: 0 0 0 3px rgba(124, 168, 238, 0.22);
}

.auth-error {
  margin: 2px 0 0;
  color: #b3261e;
  font-size: 14px;
}

.auth-submit {
  margin-top: 2px;
  border: 0;
  border-radius: 8px;
  padding: 11px 14px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.gsi-material-button {
  margin-top: 14px;
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: white;
  background-image: none;
  border: 1px solid #747775;
  -webkit-border-radius: 20px;
  border-radius: 20px;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  -webkit-transition: background-color 0.218s, border-color 0.218s, box-shadow 0.218s;
  transition: background-color 0.218s, border-color 0.218s, box-shadow 0.218s;
  vertical-align: middle;
  white-space: nowrap;
  width: auto;
  max-width: 400px;
  min-width: min-content;
}

.gsi-material-button .gsi-material-button-icon {
  height: 20px;
  margin-right: 10px;
  min-width: 20px;
  width: 20px;
}

.gsi-material-button .gsi-material-button-content-wrapper {
  -webkit-align-items: center;
  align-items: center;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-flex-wrap: nowrap;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: space-between;
  position: relative;
  width: 100%;
}

.gsi-material-button .gsi-material-button-contents {
  -webkit-flex-grow: 1;
  flex-grow: 1;
  font-family: 'Roboto', arial, sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}

.gsi-material-button .gsi-material-button-state {
  -webkit-transition: opacity 0.218s;
  transition: opacity 0.218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.gsi-material-button:disabled {
  cursor: default;
  background-color: #ffffff61;
  border-color: #1f1f1f1f;
}

.gsi-material-button:disabled .gsi-material-button-contents {
  opacity: 38%;
}

.gsi-material-button:disabled .gsi-material-button-icon {
  opacity: 38%;
}

.gsi-material-button:not(:disabled):active .gsi-material-button-state,
.gsi-material-button:not(:disabled):focus .gsi-material-button-state {
  background-color: #303030;
  opacity: 12%;
}

.gsi-material-button:not(:disabled):hover {
  -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
}

.gsi-material-button:not(:disabled):hover .gsi-material-button-state {
  background-color: #303030;
  opacity: 8%;
}

.auth-submit:disabled,
.auth-switch:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
