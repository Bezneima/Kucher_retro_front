<template>
  <div class="columns">
    <Loader v-if="retroStore.getIsBoardLoading" />
    <RetroBoardComponent v-else />
  </div>
</template>

<style>
.columns {
  height: 100%;
}
</style>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import RetroBoardComponent from '../components/retro/RetroBoardComponent/RetroBoardComponent.vue'
import Loader from '../components/common/Loader/Loader.vue'
import { useRetroStore } from '../stores/RetroStore'

const retroStore = useRetroStore()
const route = useRoute()

onMounted(() => {
  const routeBoardId = Number(route.params.id)

  if (Number.isFinite(routeBoardId) && routeBoardId > 0) {
    void retroStore.loadBoardById(routeBoardId)
    return
  }
})
</script>
