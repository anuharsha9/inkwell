import { defineConfig, type PluginOption, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import os from 'node:os'
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

      // ── Bootstrap (auto-hydration) ── a pristine-seed profile pulls her full
      // backup on first load. Browser IndexedDB is per-profile and disposable;
      // ~/Documents/Inkwell/inkwell-backup.json is the durable source of truth.
      server.middlewares.use('/__inkwell/bootstrap', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end()
        }
        try {
          const backup = fs.readFileSync(path.join(os.homedir(), 'Documents', 'Inkwell', 'inkwell-backup.json'), 'utf8')
          res.setHeader('Content-Type', 'application/json')
          res.end(backup)
        } catch {
          res.statusCode = 404
          res.end('no backup')
        }
      })

      // ── Backup write (phone sync) ── the browser POSTs its full backup here
      // after edits. We MERGE into the durable file (last-write-wins per article
      // by updatedAt, never dropping one) and mirror a copy into iCloud Drive, so
      // both the phone's local-server pull (/__inkwell/bootstrap) and its
      // "Import from Files" path always see her latest dev edits. Dev-only.
      const DOCS_BACKUP = path.join(os.homedir(), 'Documents', 'Inkwell', 'inkwell-backup.json')
      const ICLOUD_BACKUP = path.join(
        os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Inkwell', 'inkwell-backup.json',
      )

      type Backuplike = { articles?: { id: string; updatedAt?: string }[] } & Record<string, unknown>

      const mergeBackups = (existing: Backuplike | null, incoming: Backuplike): Backuplike => {
        const byId = new Map<string, { id: string; updatedAt?: string }>()
        for (const a of existing?.articles ?? []) byId.set(a.id, a)
        for (const a of incoming.articles ?? []) {
          const prev = byId.get(a.id)
          // keep whichever has the newer updatedAt; unknown timestamps sort oldest
          if (!prev || (a.updatedAt ?? '') >= (prev.updatedAt ?? '')) byId.set(a.id, a)
        }
        // non-article fields (images/settings/vocab/sources) come from the live browser
        return { ...existing, ...incoming, articles: Array.from(byId.values()) }
      }

      const writeBoth = (obj: unknown) => {
        const json = JSON.stringify(obj, null, 2)
        for (const target of [DOCS_BACKUP, ICLOUD_BACKUP]) {
          try {
            fs.mkdirSync(path.dirname(target), { recursive: true })
            fs.writeFileSync(target, json, 'utf8')
          } catch {
            /* iCloud dir may not exist if iCloud Drive is off — skip that mirror */
          }
        }
      }

      server.middlewares.use('/__inkwell/backup', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        try {
          const incoming = (await readJson(req)) as Backuplike
          if (!Array.isArray(incoming.articles)) throw new Error('no articles')
          let existing: Backuplike | null = null
          try {
            existing = JSON.parse(fs.readFileSync(DOCS_BACKUP, 'utf8')) as Backuplike
          } catch {
            /* first write — no existing file */
          }
          writeBoth(mergeBackups(existing, incoming))
          res.statusCode = 200
          res.end('ok')
        } catch {
          res.statusCode = 400
          res.end('bad request')
        }
      })

      // ── Read side (two-way sync) ── list the .md files, and read one back, so
      // edits made in any external editor can flow back into the app.
      server.middlewares.use('/__inkwell/list', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end()
        }
        let files: { filename: string; mtime: number }[] = []
        try {
          files = fs
            .readdirSync(dir)
            .filter((f) => safe(f))
            .map((f) => ({ filename: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        } catch {
          /* no articles dir yet */
        }
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ files }))
      })

      server.middlewares.use('/__inkwell/read', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          return res.end()
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const filename = url.searchParams.get('file')
        if (!safe(filename)) {
          res.statusCode = 400
          return res.end('bad request')
        }
        try {
          const content = fs.readFileSync(path.join(dir, filename), 'utf8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ filename, content }))
        } catch {
          res.statusCode = 404
          res.end('not found')
        }
      })
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
  // host:true binds to all interfaces so the phone can reach /__inkwell/bootstrap
  // over the LAN or Tailscale; allowedHosts:true lets those non-localhost Host
  // headers through Vite's dev-server host check. Dev-only, on her own machine.
  server: {
    host: true,
    allowedHosts: true,
    port: process.env.PORT ? Number(process.env.PORT) : 3120,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own chunks so the main bundle stays lean.
        manualChunks: {
          anthropic: ['@anthropic-ai/sdk'],
          react: ['react', 'react-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          jszip: ['jszip'],
          nlp: ['compromise'],
        },
      },
    },
  },
})
