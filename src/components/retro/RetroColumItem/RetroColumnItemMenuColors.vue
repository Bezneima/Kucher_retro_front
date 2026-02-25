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
  border-radius: 8px;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  color: #2f4261;
  font-size: 14px;
  line-height: 1.2;
}

.retro-item-menu-button:hover {
  background: #eef4fe;
}

.retro-item-menu-button-back {
  margin-bottom: 8px;
}

.retro-item-menu-colors-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.retro-item-menu-color-button {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid #d5e2f4;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.retro-item-menu-color-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgb(43 76 128 / 16%);
}
</style>
