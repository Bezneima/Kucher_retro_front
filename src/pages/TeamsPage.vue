<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearAuthSession, getUserName } from '@/auth/session'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'
import NotificationStack from '@/components/teams/NotificationStack.vue'
import TeamBoardsPanel from '@/components/teams/TeamBoardsPanel.vue'
import TeamMembersPanel from '@/components/teams/TeamMembersPanel.vue'
import TeamSettingsPanel from '@/components/teams/TeamSettingsPanel.vue'
import TeamSidebar from '@/components/teams/TeamSidebar.vue'
import { useTeamsDashboard } from '@/features/teams/composables/useTeamsDashboard'

const route = useRoute()
const router = useRouter()
const dashboard = useTeamsDashboard()
const userName = ref(getUserName() || '')

const parseTeamIdQueryParam = (value: unknown): number | undefined => {
  const rawValue = Array.isArray(value) ? value[0] : value
  const teamId = Number(rawValue)
  return Number.isInteger(teamId) && teamId > 0 ? teamId : undefined
}

const syncTeamInQuery = async (teamId: number | null) => {
  const currentQueryTeamId = parseTeamIdQueryParam(route.query.teamId)
  if (teamId === currentQueryTeamId) {
    return
  }

  const nextQuery = { ...route.query }
  if (teamId) {
    nextQuery.teamId = String(teamId)
  } else {
    delete nextQuery.teamId
  }

  await router.replace({ query: nextQuery })
}

const openBoard = async (boardId: number) => {
  await router.push({
    name: 'board',
    params: { id: boardId },
  })
}

const openProfile = async () => {
  await router.push({ name: 'profile' })
}

const logout = async () => {
  clearAuthSession()
  await router.replace({ name: 'auth' })
}

onMounted(() => {
  void dashboard.initialize(parseTeamIdQueryParam(route.query.teamId))
})

watch(dashboard.selectedTeamId, (teamId) => {
  void syncTeamInQuery(teamId)
})

watch(
  () => route.query.teamId,
  (queryTeamId) => {
    const parsedTeamId = parseTeamIdQueryParam(queryTeamId)
    if (!parsedTeamId || parsedTeamId === dashboard.selectedTeamId.value) {
      return
    }

    void dashboard.selectTeam(parsedTeamId)
  },
)
</script>

<template>
  <main class="teams-page">
    <GlobalHeader :user-name="userName" @profile="openProfile" @logout="logout" />

    <NotificationStack
      :notifications="dashboard.notifications.value"
      @dismiss="dashboard.dismissNotification"
    />

    <section class="teams-layout">
      <TeamSidebar
        :teams="dashboard.teams.value"
        :selected-team-id="dashboard.selectedTeamId.value"
        :is-loading="dashboard.isTeamsLoading.value"
        :is-creating="dashboard.isTeamCreating.value"
        :error="dashboard.teamsError.value"
        :create-team-name="dashboard.createTeamName.value"
        @reload="dashboard.reloadTeams"
        @select-team="dashboard.selectTeam"
        @create-team="dashboard.createTeam"
        @update:create-team-name="dashboard.createTeamName.value = $event"
      />

      <div class="teams-content">
        <TeamSettingsPanel
          :team="dashboard.selectedTeam.value"
          :members-count="dashboard.members.value.length"
          :boards-count="dashboard.boards.value.length"
          :can-manage="dashboard.canManageSelectedTeam.value"
          :is-renaming="dashboard.isTeamRenaming.value"
          :is-leaving="dashboard.isTeamLeaving.value"
          @rename="dashboard.renameTeam"
          @leave="dashboard.leaveTeam"
        />

        <TeamBoardsPanel
          :team="dashboard.selectedTeam.value"
          :boards="dashboard.boards.value"
          :can-manage="dashboard.canManageSelectedTeam.value"
          :is-loading="dashboard.isBoardsLoading.value"
          :is-creating="dashboard.isBoardCreating.value"
          :error="dashboard.boardsError.value"
          :name="dashboard.createBoardName.value"
          :description="dashboard.createBoardDescription.value"
          @reload="dashboard.reloadBoards"
          @create-board="dashboard.createBoard"
          @open-board="openBoard"
          @update:name="dashboard.createBoardName.value = $event"
          @update:description="dashboard.createBoardDescription.value = $event"
        />

        <TeamMembersPanel
          :team="dashboard.selectedTeam.value"
          :members="dashboard.members.value"
          :can-manage="dashboard.canManageSelectedTeam.value"
          :can-change-roles="dashboard.canChangeMemberRoles.value"
          :is-loading="dashboard.isMembersLoading.value"
          :is-submitting="dashboard.isMemberAdding.value"
          :removing-member-id="dashboard.removingMemberId.value"
          :changing-role-member-id="dashboard.changingMemberRoleId.value"
          :error="dashboard.membersError.value"
          :email="dashboard.addMemberEmail.value"
          :role="dashboard.addMemberRole.value"
          @reload="dashboard.reloadMembers"
          @add-member="dashboard.addMember"
          @remove-member="dashboard.removeMember"
          @update-member-role="dashboard.updateMemberRole($event.memberId, $event.role)"
          @update:email="dashboard.addMemberEmail.value = $event"
          @update:role="dashboard.addMemberRole.value = $event"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.teams-page {
  --teams-page-padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
  padding: var(--teams-page-padding);
  background: linear-gradient(140deg, #f6f8fd 0%, #ecf3ff 45%, #f7fafd 100%);
}

.teams-layout {
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.teams-content {
  min-width: 0;
  display: grid;
  gap: 14px;
}

@media (max-width: 1024px) {
  .teams-layout {
    grid-template-columns: 1fr;
  }
}
</style>
