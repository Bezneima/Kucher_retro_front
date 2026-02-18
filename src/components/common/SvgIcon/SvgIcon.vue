<template>
  <svg :class="svgClass" aria-hidden="true">
    <use :xlink:href="iconName" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    class?: string
  }>(),
  { class: '' },
)

const iconName = computed(() => `#icon-${props.name}`)
const svgClass = computed(() => (props.class ? `svg-icon ${props.class}` : 'svg-icon'))
</script>

<style scoped>
.svg-icon {
  fill: currentColor;
  stroke: currentColor;
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: -0.15em;
}
.svg-icon use {
  fill: inherit;
  stroke: inherit;
}
</style>
