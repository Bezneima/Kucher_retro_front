/// <reference types="vite/client" />
/// <reference types="vite-plugin-svg-icons/client" />

interface ImportMetaEnv {
  readonly VITE_RETRO_API_BASE_URL?: string
  readonly VITE_RETRO_WS_URL?: string
  readonly VITE_GOOGLE_AUTH_ENABLED?: string
  readonly VITE_GOOGLE_AUTH_DEFAULT_RETURN_TO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
