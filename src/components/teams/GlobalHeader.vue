<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import logoSrc from '@/assets/img/logo.png'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'

const props = defineProps<{
  userName: string
}>()

const emit = defineEmits<{
  profile: []
  logout: []
}>()

const isMenuOpen = ref(false)
const menuRootRef = ref<HTMLElement | null>(null)

const closeMenu = () => {
  isMenuOpen.value = false
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const onProfileClick = () => {
  emit('profile')
  closeMenu()
}

const onLogoutClick = () => {
  emit('logout')
  closeMenu()
}

const onDocumentMouseDown = (event: MouseEvent) => {
  const target = event.target as Node
  if (!menuRootRef.value?.contains(target)) {
    closeMenu()
  }
}

const onDocumentKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

const addListeners = () => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('keydown', onDocumentKeyDown)
}

const removeListeners = () => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
}

const onTelegramClick = () => {
  window.open('https://t.me/appRetro', '_blank')
}

watch(
  isMenuOpen,
  (value) => {
    if (value) {
      addListeners()
      return
    }
    removeListeners()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  removeListeners()
})
</script>

<template>
  <header class="teams-top-strip">
    <div class="teams-top-strip-inner">
      <RouterLink class="teams-top-strip-logo-link" to="/teams" aria-label="Перейти к командам">
        <img class="teams-top-strip-logo" :src="logoSrc" alt="Logo" />
      </RouterLink>

      <div ref="menuRootRef" class="teams-user-menu">
        <button class="teams-user-name" type="button" @click="onProfileClick">
          {{ props.userName }}
        </button>
        <button
          class="teams-user-menu-trigger"
          type="button"
          aria-label="Открыть меню пользователя"
          :aria-expanded="isMenuOpen"
          @click="toggleMenu"
        >
          <SvgIcon name="menu" class="teams-user-menu-trigger-icon" />
        </button>

        <div v-if="isMenuOpen" class="teams-user-dropdown" role="menu">
          <button
            class="teams-user-dropdown-item"
            type="button"
            role="menuitem"
            @click="onProfileClick"
          >
            Профиль
          </button>
          <button
            class="teams-user-dropdown-item"
            type="button"
            role="menuitem"
            @click="onTelegramClick"
          >
            Сообщество телеграмм
          </button>
          <div class="teams-user-dropdown-divider" />
          <button
            class="teams-user-dropdown-item"
            type="button"
            role="menuitem"
            @click="onLogoutClick"
          >
            Выход
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.teams-top-strip {
  height: 56px;
  width: calc(100% + (var(--teams-page-padding, 20px) * 2));
  margin-top: calc(var(--teams-page-padding, 20px) * -1);
  margin-left: calc(var(--teams-page-padding, 20px) * -1);
  margin-right: calc(var(--teams-page-padding, 20px) * -1);
  margin-bottom: 14px;
  box-sizing: border-box;
  border-bottom: 1px solid #d9e4f2;
  background: #fff;
}

.teams-top-strip-inner {
  max-width: calc(1240px + (var(--teams-page-padding, 20px) * 2));
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--teams-page-padding, 20px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.teams-top-strip-logo {
  height: 40px;
  width: auto;
  display: block;
}

.teams-top-strip-logo-link {
  display: inline-flex;
}

.teams-user-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.teams-user-name {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #33445f;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  cursor: pointer;
}

.teams-user-name:hover {
  color: #1f3f72;
  text-decoration: underline;
}

.teams-user-menu-trigger {
  border: 0px solid #cedbed;
  background: #fff;
  border-radius: 8px;
  min-width: 34px;
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #33445f;
}

.teams-user-menu-trigger:hover {
  background: #eef4fe;
}

.teams-user-menu-trigger-icon {
  width: 14px;
  height: 14px;
}

.teams-user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 180px;
  border: 1px solid #d5e2f4;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgb(43 76 128 / 15%);
  padding: 8px;
  display: grid;
  gap: 4px;
  z-index: 30;
}

.teams-user-dropdown-item {
  border: none;
  background: transparent;
  border-radius: 8px;
  text-align: left;
  padding: 9px 10px;
  cursor: pointer;
  color: #2f4261;
  font-size: 14px;
}

.teams-user-dropdown-item:hover {
  background: #eef4fe;
}

.teams-user-dropdown-divider {
  margin: 0;
  border-top: 1px solid #d5e2f4;
}
</style>
