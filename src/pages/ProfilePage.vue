<script setup lang="ts">
import { AxiosError } from 'axios'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { httpClient } from '@/api/httpClient'
import { clearAuthSession, getUserEmail, getUserName, setUserName } from '@/auth/session'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'

type ProfileTab = 'profile' | 'subscription'

const router = useRouter()
const activeTab = ref<ProfileTab>('profile')
const initialUserName = ref(getUserName() || '')
const userName = ref(initialUserName.value || 'Пользователь')
const email = computed(() => getUserEmail() || 'Не указан')
const isSaving = ref(false)
const saveMessage = ref('')
const saveError = ref('')

const form = reactive({
  oldPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
  name: initialUserName.value,
})

const openProfile = async () => {
  activeTab.value = 'profile'
  if (router.currentRoute.value.name !== 'profile') {
    await router.push({ name: 'profile' })
  }
}

const logout = async () => {
  clearAuthSession()
  await router.replace({ name: 'auth' })
}

const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return 'Не удалось сохранить профиль. Повторите позже.'
  }

  const data = error.response?.data as { message?: unknown } | undefined
  if (Array.isArray(data?.message)) {
    return data.message.join(', ')
  }
  if (typeof data?.message === 'string') {
    return data.message
  }

  return error.message || 'Не удалось сохранить профиль. Повторите позже.'
}

const saveProfile = async () => {
  const nextName = form.name.trim()
  const hasPasswordValue = Boolean(form.oldPassword || form.newPassword || form.newPasswordConfirm)

  saveMessage.value = ''
  saveError.value = ''

  if (!nextName) {
    saveError.value = 'Имя не может быть пустым.'
    return
  }

  if (hasPasswordValue && (!form.oldPassword || !form.newPassword || !form.newPasswordConfirm)) {
    saveError.value = 'Заполните старый пароль и оба поля нового пароля.'
    return
  }

  if (hasPasswordValue && form.newPassword !== form.newPasswordConfirm) {
    saveError.value = 'Новые пароли не совпадают.'
    return
  }

  if (hasPasswordValue && form.newPassword.length < 6) {
    saveError.value = 'Новый пароль должен быть не короче 6 символов.'
    return
  }

  const isNameChanged = nextName !== initialUserName.value

  if (!isNameChanged && !hasPasswordValue) {
    saveMessage.value = 'Нет изменений для сохранения.'
    return
  }

  isSaving.value = true

  try {
    if (hasPasswordValue) {
      await httpClient.patch('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      })
    }

    if (isNameChanged) {
      await httpClient.patch('/auth/me', { name: nextName })
      setUserName(nextName)
      initialUserName.value = nextName
      userName.value = nextName
    }

    form.oldPassword = ''
    form.newPassword = ''
    form.newPasswordConfirm = ''

    if (isNameChanged && hasPasswordValue) {
      saveMessage.value = 'Имя и пароль обновлены.'
    } else if (hasPasswordValue) {
      saveMessage.value = 'Пароль обновлен.'
    } else {
      saveMessage.value = 'Имя обновлено.'
    }
  } catch (error) {
    saveError.value = getApiErrorMessage(error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <main class="profile-page">
    <GlobalHeader :user-name="userName" @profile="openProfile" @logout="logout" />

    <section class="profile-layout">
      <aside class="profile-nav">
        <button
          class="profile-nav-button"
          :class="{ active: activeTab === 'profile' }"
          type="button"
          @click="activeTab = 'profile'"
        >
          Профиль
        </button>
        <!-- <button
          class="profile-nav-button"
          :class="{ active: activeTab === 'subscription' }"
          type="button"
          @click="activeTab = 'subscription'"
        >
          Подписка
        </button> -->
      </aside>

      <section v-if="activeTab === 'profile'" class="profile-content">
        <h1 class="profile-title">Профиль</h1>

        <div class="profile-field">
          <p class="profile-field-label">Email</p>
          <p class="profile-email">{{ email }}</p>
        </div>

        <label class="profile-field" for="profile-old-password">
          <span class="profile-field-label">Старый пароль</span>
          <input
            id="profile-old-password"
            v-model="form.oldPassword"
            class="profile-input"
            type="password"
            autocomplete="current-password"
          />
        </label>

        <label class="profile-field" for="profile-new-password">
          <span class="profile-field-label">Новый пароль</span>
          <input
            id="profile-new-password"
            v-model="form.newPassword"
            class="profile-input"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <label class="profile-field" for="profile-new-password-confirm">
          <span class="profile-field-label">Повторите новый пароль</span>
          <input
            id="profile-new-password-confirm"
            v-model="form.newPasswordConfirm"
            class="profile-input"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <label class="profile-field" for="profile-name">
          <span class="profile-field-label">Имя</span>
          <input id="profile-name" v-model="form.name" class="profile-input" type="text" />
        </label>

        <p v-if="saveError" class="profile-error">{{ saveError }}</p>
        <p v-else-if="saveMessage" class="profile-success">{{ saveMessage }}</p>

        <button class="profile-save-button" type="button" :disabled="isSaving" @click="saveProfile">
          {{ isSaving ? 'Сохранение...' : 'Сохранить изменения' }}
        </button>
      </section>

      <section v-else class="profile-content">
        <h1 class="profile-title">Подписка</h1>
        <p class="profile-subscription-placeholder">Раздел будет добавлен позже.</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  --teams-page-padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
  padding: var(--teams-page-padding);
  background: linear-gradient(140deg, #f6f8fd 0%, #ecf3ff 45%, #f7fafd 100%);
}

.profile-layout {
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.profile-nav {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #d6e3f3;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(49 84 129 / 10%);
}

.profile-nav-button {
  border: 1px solid #d0deef;
  border-radius: 10px;
  background: #f8fbff;
  color: #2f4565;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.profile-nav-button:hover {
  background: #edf4ff;
}

.profile-nav-button.active {
  border-color: #7eaaef;
  background: #e7f0ff;
}

.profile-content {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid #d6e3f3;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(49 84 129 / 10%);
}

.profile-title {
  margin: 0;
  font-size: 26px;
  color: #22344f;
}

.profile-field {
  display: grid;
  gap: 8px;
}

.profile-field-label {
  margin: 0;
  color: #4f6584;
  font-size: 14px;
  font-weight: 600;
}

.profile-email {
  margin: 0;
  padding: 11px 12px;
  border: 1px solid #d0deef;
  border-radius: 8px;
  background: #f8fbff;
  color: #2e4160;
}

.profile-input {
  border: 1px solid #cfd9e8;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  color: #22344f;
}

.profile-input:focus {
  outline: none;
  border-color: #7ca8ee;
  box-shadow: 0 0 0 3px rgb(124 168 238 / 22%);
}

.profile-delete-button {
  width: fit-content;
  margin-top: 6px;
  border: 1px solid #e95e5e;
  border-radius: 8px;
  background: #fff;
  color: #d63636;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
}

.profile-delete-button:hover {
  background: #fff3f3;
}

.profile-save-button {
  width: fit-content;
  border: 1px solid #1e88e5;
  border-radius: 8px;
  background: #1e88e5;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
}

.profile-save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.profile-error {
  margin: 0;
  color: #b3261e;
  font-size: 14px;
}

.profile-success {
  margin: 0;
  color: #1e6b2f;
  font-size: 14px;
}

.profile-subscription-placeholder {
  margin: 0;
  color: #4f6584;
}

@media (max-width: 1024px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
