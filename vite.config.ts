import { defineConfig, type PluginOption, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ── Local archive plugin ───────────────────────────────────────────────────
// During local dev only, the app posts each article's markdown here and we
// write a real file into <root>/articles/. This makes her writing a permanent
// set of local files in the project folder. It exists ONLY in the dev server —
// the static Vercel demo has no such endpoint, so it silently does nothing.
function localArchive(): PluginOption {
  const safe = (name: unknown): name is string =>
    typeof name === 'string' && /^[\w.\- ]+\.md$/.test(name) && !name.includes('..') && !name.includes('/')

  const readJson = (req: IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'))
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
    })

  return {
    name: 'inkwell-local-archive',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const dir = path.resolve(server.config.root, 'articles')

      const handle = (
        fn: (data: Record<string, unknown>, dir: string) => void,
      ) => async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        try {
          fn(await readJson(req), dir)
          res.statusCode = 200
          res.end('ok')
        } catch {
          res.statusCode = 400
          res.end('bad request')
        }
      }

      server.middlewares.use(
        '/__inkwell/save',
        handle((data, dir) => {
          const { filename, content, prevFilename } = data
          if (!safe(filename) || typeof content !== 'string') throw new Error('invalid')
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, filename), content, 'utf8')
          if (safe(prevFilename) && prevFilename !== filename) {
            try {
              fs.unlinkSync(path.join(dir, prevFilename))
            } catch {
              /* old file may not exist */
            }
          }
        }),
      )

      server.middlewares.use(
        '/__inkwell/delete',
        handle((data, dir) => {
          const { filename } = data
          if (!safe(filename)) throw new Error('invalid')
          try {
            fs.unlinkSync(path.join(dir, filename))
          } catch {
            /* already gone */
          }
        }),
      )
    },
  }
}

// Inkwell is a pure client-side SPA. No backend, no env secrets baked in —
// the image-AI provider is read from in-app Settings at runtime.
export default defineConfig({
  plugins: [react(), localArchive()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 3120 },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks so the main bundle stays lean.
        manualChunks: {
          anthropic: ['@anthropic-ai/sdk'],
          react: ['react', 'react-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          jszip: ['jszip'],
        },
      },
    },
  },
})
