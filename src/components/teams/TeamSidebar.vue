<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ApiUiError, TeamSummary } from '@/features/teams/types'
import ReloadButton from '@/components/teams/ReloadButton.vue'

const props = defineProps<{
  teams: TeamSummary[]
  selectedTeamId: number | null
  isLoading: boolean
  isCreating: boolean
  error: ApiUiError | null
  createTeamName: string
}>()

const emit = defineEmits<{
  selectTeam: [teamId: number]
  reload: []
  createTeam: []
  'update:createTeamName': [value: string]
}>()

const isCreateModalOpen = ref(false)
const isCreateSubmitPending = ref(false)
const teamSearchQuery = ref('')

const filteredTeams = computed(() => {
  const normalizedQuery = teamSearchQuery.value.trim().toLowerCase()

  if (!normalizedQuery) {
    return props.teams
  }

  return props.teams.filter((team) => team.name.toLowerCase().includes(normalizedQuery))
})

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (props.isCreating) {
    return
  }

  isCreateModalOpen.value = false
  isCreateSubmitPending.value = false
}

const submitCreateTeam = () => {
  isCreateSubmitPending.value = true
  emit('createTeam')
}

watch(
  () => props.isCreating,
  (isCreating) => {
    if (isCreating || !isCreateSubmitPending.value) {
      return
    }

    if (!props.createTeamName.trim()) {
      isCreateModalOpen.value = false
    }

    isCreateSubmitPending.value = false
  },
)
</script>

<template>
  <aside class="teams-sidebar">
    <header class="teams-sidebar-header">
      <h2 class="teams-sidebar-title">Мои команды</h2>
      <div class="teams-header-actions">
        <button
          class="teams-create-trigger-btn"
          type="button"
          :disabled="isCreating"
          @click="openCreateModal"
        >
          Создать
        </button>
      </div>
    </header>

    <section class="teams-sidebar-content">
      <div v-if="teams.length > 0 && !error" class="teams-search-row">
        <label class="teams-search-label">
          <input
            v-model="teamSearchQuery"
            class="teams-search-input"
            type="text"
            maxlength="80"
            placeholder="Введите название команды"
          />
        </label>
        <ReloadButton :disabled="isLoading" :is-loading="isLoading" @click="emit('reload')" />
      </div>

      <div v-if="isLoading && teams.length === 0" class="skeleton-list" aria-hidden="true">
        <div v-for="index in 4" :key="index" class="skeleton-item" />
      </div>

      <div v-else-if="error" class="state state--error">
        <p class="state-title">{{ error.title }}</p>
        <p class="state-description">
          {{ error.description }}
          <span v-if="error.status" class="state-status">[{{ error.status }}]</span>
        </p>
      </div>

      <div v-else-if="teams.length === 0">
        <ul class="teams-list" aria-label="Список команд">
          <li>
            <div class="team-item team-item--placeholder" aria-disabled="true">
              <span class="team-item-name">Команд пока нет</span>
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="filteredTeams.length === 0" class="state">
        <p class="state-title">Команда не найдена</p>
        <p class="state-description">Попробуйте изменить поисковый запрос.</p>
      </div>

      <ul v-else class="teams-list">
        <li v-for="team in filteredTeams" :key="team.id">
          <button
            class="team-item"
            :class="{ active: team.id === selectedTeamId }"
            type="button"
            @click="emit('selectTeam', team.id)"
          >
            <span class="team-item-name">{{ team.name }}</span>
            <span
              v-if="team.role === 'OWNER'"
              class="team-item-role"
              :class="`team-item-role--${team.role.toLowerCase()}`"
            >
              {{ team.role }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <div v-if="isCreateModalOpen" class="team-modal-overlay" @click.self="closeCreateModal">
      <div class="team-modal" role="dialog" aria-modal="true" aria-label="Создать команду">
        <button
          class="team-modal-close"
          type="button"
          :disabled="isCreating"
          @click="closeCreateModal"
        >
          ×
        </button>

        <h3 class="team-modal-title">Создать команду</h3>

        <form class="teams-create-form" @submit.prevent="submitCreateTeam">
          <label class="teams-create-label">
            <span>Новая команда</span>
            <input
              :value="createTeamName"
              class="teams-create-input"
              type="text"
              maxlength="80"
              placeholder="Например: Platform Team"
              :disabled="isCreating"
              @input="emit('update:createTeamName', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <button class="teams-create-btn" type="submit" :disabled="isCreating">
            {{ isCreating ? 'Создание...' : 'Создать команду' }}
          </button>
        </form>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.teams-sidebar {
  min-width: 0;
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  display: grid;
  grid-template-rows: auto auto;
}

.teams-sidebar-header {
  border-bottom: 1px solid #e8eef8;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.teams-sidebar-title {
  margin: 0;
  font-size: 18px;
}

.teams-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.teams-create-trigger-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.teams-create-trigger-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.teams-sidebar-content {
  padding: 12px;
  overflow: visible;
}

.teams-search-label {
  min-width: 0;
  flex: 1;
}

.teams-search-text {
  font-size: 13px;
  color: #4e6282;
}

.teams-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.teams-search-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cdd9ea;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.teams-search-input:focus {
  outline: none;
  border-color: #79a7e3;
  box-shadow: 0 0 0 3px rgba(121, 167, 227, 0.22);
}

.teams-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.team-item {
  width: 100%;
  border: 1px solid #d6e2f2;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}

.team-item--placeholder {
  width: auto;
  cursor: default;
  color: #5f7190;
  border: none;
}

.team-item.active {
  border-color: #6ea0e6;
  box-shadow: 0 0 0 3px rgba(110, 160, 230, 0.2);
}

.team-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1b2940;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.team-item-role {
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 600;
  color: #274770;
  background: #e7effb;
}

.team-item-role--owner {
  color: #24345c;
  background: #e3e9fa;
}

.team-item-role--admin {
  color: #214b64;
  background: #e0f0fa;
}

.team-item-role--member {
  color: #1f4c3f;
  background: #e6f7ef;
}

.teams-create-form {
  display: grid;
  gap: 10px;
}

.teams-create-label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #34445f;
}

.teams-create-input {
  border: 1px solid #cdd9ea;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.teams-create-input:focus {
  outline: none;
  border-color: #79a7e3;
  box-shadow: 0 0 0 3px rgba(121, 167, 227, 0.22);
}

.teams-create-btn {
  border: 0;
  border-radius: 9px;
  padding: 10px 12px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.teams-create-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.team-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 28, 45, 0.48);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 1200;
}

.team-modal {
  position: relative;
  width: min(440px, 100%);
  background: #fff;
  border-radius: 14px;
  border: 1px solid #d5e1f2;
  box-shadow: 0 16px 30px rgba(20, 40, 72, 0.2);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.team-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  border: 0;
  background: transparent;
  color: #50627f;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.team-modal-title {
  margin: 0;
  font-size: 20px;
}

.state {
  border: 1px dashed #d2dfef;
  border-radius: 10px;
  padding: 12px;
  color: #425777;
}

.state--error {
  border-style: solid;
  border-color: #e6b0b0;
}

.state-title {
  margin: 0;
  font-weight: 600;
}

.state-description {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.35;
}

.state-status {
  color: #8a2d2d;
}

.skeleton-list {
  display: grid;
  gap: 8px;
}

.skeleton-item {
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(110deg, #edf2f9 30%, #f8fbff 45%, #edf2f9 60%);
  background-size: 220% 100%;
  animation: pulse 1.25s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
