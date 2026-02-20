<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'
import { getAccessToken, setAuthSession } from '@/auth/session'

type AuthMode = 'login' | 'register'

const router = useRouter()
const mode = ref<AuthMode>('login')
const isSubmitting = ref(false)
const errorMessage = ref('')

const form = reactive({
  email: '',
  password: '',
  name: '',
})

if (getAccessToken()) {
  void router.replace('/teams')
}

const isRegisterMode = computed(() => mode.value === 'register')
const submitLabel = computed(() => (isRegisterMode.value ? 'Создать аккаунт' : 'Войти'))

const extractAuthPayload = (payload: unknown) => {
  const response = payload as
    | {
        accessToken?: unknown
        refreshToken?: unknown
        user?: { name?: unknown }
        name?: unknown
        data?: {
          accessToken?: unknown
          refreshToken?: unknown
          user?: { name?: unknown }
          name?: unknown
        }
      }
    | undefined

  const root = response?.data ?? response
  const accessTokenCandidate = root?.accessToken
  const refreshTokenCandidate = root?.refreshToken
  const userNameCandidate = root?.user?.name ?? root?.name

  return {
    accessToken: typeof accessTokenCandidate === 'string' ? accessTokenCandidate : '',
    refreshToken: typeof refreshTokenCandidate === 'string' ? refreshTokenCandidate : undefined,
    userName: typeof userNameCandidate === 'string' ? userNameCandidate : undefined,
  }
}

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
    const authPayload = extractAuthPayload(response.data)

    if (!authPayload.accessToken) {
      throw new Error('Сервер не вернул accessToken')
    }

    setAuthSession(authPayload)
    await router.replace('/teams')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
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

.auth-submit:disabled,
.auth-switch:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
