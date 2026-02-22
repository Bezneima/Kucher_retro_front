import { useRetroStore } from '@/stores/RetroStore'

export const ensureCurrentUserLoaded = async () => {
  const retroStore = useRetroStore()
  await retroStore.ensureCurrentUserLoaded()
}
