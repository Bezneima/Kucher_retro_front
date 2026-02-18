<template>
  <button class="retro-item-menu-button retro-item-menu-button-back" type="button" @click="onBackClick">
    Назад
  </button>
  <div class="retro-item-menu-colors-grid">
    <button
      v-for="(color, index) in goodCardColors"
      :key="`${color}-${index}`"
      class="retro-item-menu-color-button"
      type="button"
      :style="{ backgroundColor: color }"
      :title="color"
      @click="onColorClick(color)"
    />
  </div>
</template>

<script setup lang="ts">
import { goodCardColors } from '@/stores/RetroStore'

const emit = defineEmits<{
  back: []
  selectColor: [color: string]
}>()

const onBackClick = () => emit('back')
const onColorClick = (color: string) => emit('selectColor', color)
</script>

<style scoped>
.retro-item-menu-button {
  width: 100%;
  border: none;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

.retro-item-menu-button:hover {
  background-color: #f5f5f5;
}

.retro-item-menu-button-back {
  margin-bottom: 6px;
}

.retro-item-menu-colors-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.retro-item-menu-color-button {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid rgb(0 0 0 / 20%);
  border-radius: 4px;
  cursor: pointer;
}
</style>
