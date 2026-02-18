<template>
  <div class="loader-wrap" role="status" aria-live="polite" aria-label="Loading">
    <div class="loader-spinner" />
  </div>
</template>

<style scoped>
.loader-wrap {
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid #d9d9d9;
  border-top-color: #181818;
  animation: spin 0.85s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

