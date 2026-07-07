/// <reference types="vite/client" />

interface Document {
  startViewTransition?(callback: () => void): void
}

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string
  readonly VITE_ANTHROPIC_KEY?: string
  readonly VITE_GEMINI_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
