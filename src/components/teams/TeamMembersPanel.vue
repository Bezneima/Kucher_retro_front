<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ApiUiError, TeamAdminRole, TeamMember, TeamSummary } from '@/features/teams/types'
import reloadIcon from '@/assets/icons/svg/reload.svg'
import unfoldIcon from '@/assets/icons/svg/unfold.svg'

const props = defineProps<{
  team: TeamSummary | null
  members: TeamMember[]
  canManage: boolean
  canChangeRoles: boolean
  isLoading: boolean
  isSubmitting: boolean
  removingMemberId: string | null
  changingRoleMemberId: string | null
  error: ApiUiError | null
  email: string
  role: TeamAdminRole
}>()

const emit = defineEmits<{
  reload: []
  addMember: []
  removeMember: [memberId: string]
  updateMemberRole: [payload: { memberId: string; role: TeamAdminRole }]
  'update:email': [value: string]
  'update:role': [value: TeamAdminRole]
}>()

const defaultVisibleMembersCount = 1
const isMembersExpanded = ref(false)

const hasHiddenMembers = computed(() => props.members.length > defaultVisibleMembersCount)

const visibleMembers = computed(() => {
  if (isMembersExpanded.value || !hasHiddenMembers.value) {
    return props.members
  }

  return props.members.slice(0, defaultVisibleMembersCount)
})

watch(
  () => props.members.length,
  (count) => {
    if (count <= defaultVisibleMembersCount) {
      isMembersExpanded.value = false
    }
  },
)

watch(
  () => props.team?.id,
  () => {
    isMembersExpanded.value = false
  },
)

const onMemberRoleChange = (event: Event, member: TeamMember) => {
  const nextRole = (event.target as HTMLSelectElement).value as TeamAdminRole
  if (member.role === nextRole) {
    return
  }

  emit('updateMemberRole', { memberId: member.id, role: nextRole })
}
</script>

<template>
  <section class="team-panel">
    <header class="team-panel-header">
      <div>
        <h2 class="team-panel-title">Участники</h2>
        <p v-if="team" class="team-panel-subtitle">{{ team.name }}</p>
      </div>
      <button
        class="team-panel-reload"
        type="button"
        :disabled="isLoading || !team"
        aria-label="Обновить"
        @click="emit('reload')"
      >
        <img
          :class="['team-panel-reload-icon', { 'team-panel-reload-icon--loading': isLoading }]"
          :src="reloadIcon"
          alt=""
        />
      </button>
    </header>

    <div v-if="!team" class="state">
      <p class="state-title">Выберите команду</p>
      <p class="state-description">После выбора команды появится список ее участников.</p>
    </div>

    <template v-else>
      <form v-if="canManage" class="member-form" @submit.prevent="emit('addMember')">
        <label class="member-form-label">
          <span>Email участника</span>
          <input
            :value="email"
            class="member-form-input"
            type="email"
            autocomplete="email"
            placeholder="alice@example.com"
            :disabled="isSubmitting"
            @input="emit('update:email', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="member-form-label">
          <span>Роль</span>
          <select
            :value="role"
            class="member-form-select"
            :disabled="isSubmitting"
            @change="
              emit('update:role', ($event.target as HTMLSelectElement).value as TeamAdminRole)
            "
          >
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>

        <button class="member-form-submit" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Добавление...' : 'Добавить участника' }}
        </button>
      </form>

      <div v-if="error" class="state state--error">
        <p class="state-title">{{ error.title }}</p>
        <p class="state-description">
          {{ error.description }}
          <span v-if="error.status" class="state-status">[{{ error.status }}]</span>
        </p>
      </div>

      <div v-else-if="isLoading" class="skeleton-list" aria-hidden="true">
        <div v-for="index in 4" :key="index" class="skeleton-row" />
      </div>

      <div v-else-if="members.length === 0" class="state">
        <p class="state-title">Участников пока нет</p>
        <p class="state-description">Добавьте первого участника через email.</p>
      </div>

      <div v-else class="members-list-wrap">
        <ul class="members-list">
          <li v-for="member in visibleMembers" :key="member.id" class="member-item">
            <div class="member-main">
              <p class="member-name">{{ member.name || 'Без имени' }}</p>
              <p class="member-email">{{ member.email }}</p>
            </div>
            <div class="member-side">
              <select
                v-if="canChangeRoles && ['ADMIN', 'MEMBER'].includes(member.role)"
                :value="member.role"
                class="member-role-select"
                :disabled="changingRoleMemberId === member.id || removingMemberId === member.id"
                @change="onMemberRoleChange($event, member)"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <span v-else class="member-role" :class="`member-role--${member.role.toLowerCase()}`">
                {{ member.role }}
              </span>
              <button
                v-if="canManage && ['ADMIN', 'MEMBER'].includes(member.role)"
                class="member-remove"
                type="button"
                :disabled="removingMemberId === member.id || changingRoleMemberId === member.id"
                @click="emit('removeMember', member.id)"
              >
                {{ removingMemberId === member.id ? '...' : 'Удалить' }}
              </button>
            </div>
          </li>
        </ul>

        <div v-if="hasHiddenMembers && !isMembersExpanded" class="members-list-fade" />

        <button
          v-if="hasHiddenMembers"
          class="members-list-toggle"
          type="button"
          :aria-label="
            isMembersExpanded ? 'Свернуть список участников' : 'Развернуть список участников'
          "
          @click="isMembersExpanded = !isMembersExpanded"
        >
          <img
            :class="[
              'members-list-toggle-icon',
              { 'members-list-toggle-icon--expanded': isMembersExpanded },
            ]"
            :src="unfoldIcon"
            alt=""
          />
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.team-panel {
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.team-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.team-panel-title {
  margin: 0;
  font-size: 20px;
}

.team-panel-subtitle {
  margin: 4px 0 0;
  color: #4c607f;
  font-size: 14px;
}

.team-panel-reload {
  border: 1px solid #cedbed;
  background: #fff;
  border-radius: 8px;
  padding: 10px 10px;
  cursor: pointer;
}

.team-panel-reload:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.team-panel-reload-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.team-panel-reload-icon--loading {
  animation: reload-spin 0.85s linear infinite;
}

.member-form {
  border: 1px solid #dce7f6;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 150px auto;
  gap: 10px;
  align-items: end;
}

.member-form-label {
  display: grid;
  gap: 6px;
  color: #33445f;
  font-size: 13px;
}

.member-form-input,
.member-form-select {
  border: 1px solid #cfdbec;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.member-form-input:focus,
.member-form-select:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.member-form-submit {
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.member-form-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.member-readonly-note {
  margin: 0;
  color: #4a5f7f;
  background: #edf4ff;
  border: 1px solid #cfe0fa;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.members-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.members-list-wrap {
  position: relative;
}

.members-list-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 34px;
  height: 72px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #ffffff 100%);
  pointer-events: none;
}

.members-list-toggle {
  margin: 4px auto 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 1px solid #dce8f7;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
}

.members-list-toggle-icon {
  width: 14px;
  height: 14px;
  display: block;
  transition: transform 0.2s ease;
}

.members-list-toggle-icon--expanded {
  transform: rotate(180deg);
}

.member-item {
  border: 1px solid #dce8f7;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.member-main {
  min-width: 0;
}

.member-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e2f4e;
}

.member-email {
  margin: 4px 0 0;
  font-size: 13px;
  color: #4b6387;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-side {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-role {
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 600;
}

.member-role-select {
  border: 1px solid #cfdbec;
  border-radius: 999px;
  padding: 4px 10px;
  min-width: 96px;
  font-size: 12px;
  font-weight: 600;
  color: #243b63;
  background: #fff;
}

.member-role-select:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.member-role--owner {
  color: #283f6a;
  background: #e2eafb;
}

@keyframes reload-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.member-role--admin {
  color: #1f4f67;
  background: #e0f2fb;
}

.member-role--member {
  color: #245444;
  background: #e6f7ef;
}

.member-remove {
  border: 1px solid #efc6c6;
  color: #9d2f2f;
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.member-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state {
  border: 1px dashed #d1def0;
  border-radius: 10px;
  padding: 12px;
  color: #445c80;
}

.state--error {
  border-style: solid;
  border-color: #e1b0b0;
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
  color: #8d2c2c;
}

.skeleton-list {
  display: grid;
  gap: 8px;
}

.skeleton-row {
  height: 54px;
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

@media (max-width: 860px) {
  .member-form {
    grid-template-columns: 1fr;
  }
}
</style>
