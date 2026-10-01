/// <reference types="vite/client" />

interface ViewTransition {
  readonly ready: Promise<void>
  readonly finished: Promise<void>
  readonly updateCallbackDone: Promise<void>
  skipTransition(): void
}

interface Document {
  startViewTransition?(callback: () => void): ViewTransition
}

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string
  readonly VITE_ANTHROPIC_KEY?: string
  readonly VITE_GEMINI_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
