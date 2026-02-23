<template>
  <section class="board-settings-strip" aria-label="Настройки доски">
    <div class="board-settings-strip-inner">
      <label class="board-search" for="board-card-search-input">
        <input
          id="board-card-search-input"
          v-model="cardSearchQuery"
          class="board-search__input"
          type="search"
          placeholder="Поиск карточки"
          autocomplete="off"
        />
      </label>

      <button
        type="button"
        class="board-action-button"
        @click="onAddColumnClick"
        title="Добавить колонку"
      >
        <SvgIcon name="addColumn" class="board-add-column-button__icon" />
      </button>

      <BoardShareControl />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRetroStore } from '@/stores/RetroStore'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import BoardShareControl from './BoardShareControl.vue'

const retroStore = useRetroStore()
const cardSearchQuery = computed({
  get: () => retroStore.getCardSearchQuery,
  set: (value: string) => {
    retroStore.setCardSearchQuery(value)
  },
})

const onAddColumnClick = () => {
  retroStore.addColumn()
}
</script>

<style scoped>
.board-settings-strip {
  height: 68px;
  width: calc(100% + (var(--teams-page-padding, 20px) * 2));
  margin-left: calc(var(--teams-page-padding, 20px) * -1);
  margin-right: calc(var(--teams-page-padding, 20px) * -1);
  box-sizing: border-box;
}

.board-settings-strip-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 var(--teams-page-padding, 20px);
  box-sizing: border-box;
}

.board-search {
  display: flex;
  align-items: center;
}

.board-search__label {
  font-size: 14px;
  font-weight: 500;
  color: #566074;
}

.board-search__input {
  width: min(200px, calc(100vw - 180px));
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #2f3647;
  background: #fff;
  box-sizing: border-box;
}

.board-search__input:focus {
  outline: 2px solid #8ab4ff;
  outline-offset: 0;
  border-color: #8ab4ff;
}

.board-action-button {
  margin-right: auto;
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  padding: 0 9px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.board-action-button:hover {
  border-color: #8ab4ff;
  color: #204380;
}

.board-add-column-button__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .board-settings-strip {
    height: auto;
  }

  .board-settings-strip-inner {
    flex-wrap: wrap;
    padding: 10px var(--teams-page-padding, 20px);
  }

  .board-search {
    width: 100%;
  }

  .board-search__input {
    width: 100%;
  }
}
</style>
