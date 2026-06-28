import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Inkwell is a pure client-side SPA. No backend, no env secrets baked in —
// the image-AI provider is read from in-app Settings at runtime.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 3120 },
})
