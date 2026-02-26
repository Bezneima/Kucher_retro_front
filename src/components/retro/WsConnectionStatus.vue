<script setup lang="ts">
import { onMounted } from 'vue'
import { useBoardSocket } from '@/composables/useBoardSocket'

const props = defineProps<{
  accessToken: string | null
}>()

const { status, lastMessage, errorMessage, connect } = useBoardSocket(props.accessToken)

onMounted(() => {
  connect()
})
</script>

<template>
  <section class="ws-status" aria-live="polite">
    <p><strong>WS status:</strong> {{ status }}</p>
    <p><strong>Last message:</strong> {{ lastMessage || '-' }}</p>
    <p v-if="errorMessage"><strong>Error:</strong> {{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.ws-status {
  margin: 8px 0 12px;
  padding: 10px 12px;
  border: 1px solid #d9e4f2;
  border-radius: 10px;
  background: #f9fbff;
  color: #1b2d47;
}

.ws-status p {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
}

.ws-status p + p {
  margin-top: 4px;
}
</style>
