// Inkwell desktop (macOS) — a thin Electron shell around the built personal app.
// The main process runs a tiny local HTTP server that serves the app AND the
// same /__inkwell file endpoints the Vite dev plugin provides, so the local .md
// mirror + two-way sync work identically — writing to a real, durable folder in
// ~/Documents/Inkwell (iCloud-syncable). A FIXED port keeps the web origin (and
// thus IndexedDB) stable across launches, so her writing never resets.

const { app, BrowserWindow, shell } = require('electron')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = 39217 // fixed → stable origin → durable IndexedDB
const DIST = path.join(__dirname, '..', 'dist')
const DATA_DIR = path.join(app.getPath('documents'), 'Inkwell')
const ARTICLES_DIR = path.join(DATA_DIR, 'articles')

// Same filename guard as the Vite plugin — a plain "<name>.md", no path tricks.
const safe = (name) =>
  typeof name === 'string' && /^[\w.\- ]+\.md$/.test(name) && !name.includes('..') && !name.includes('/')

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
}

function readJson(req) {
  return new Promise((resolve, reject) => {
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
}

function serveStatic(req, res) {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const file = path.join(DIST, rel === '/' ? '/index.html' : rel)
  if (!file.startsWith(DIST)) {
    res.statusCode = 403
    return res.end('forbidden')
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback — any unknown path renders index.html.
      fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
        if (e2) {
          res.statusCode = 404
          return res.end('not found')
        }
        res.setHeader('Content-Type', 'text/html')
        res.end(idx)
      })
      return
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
    res.end(data)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const p = url.pathname
  try {
    if (p === '/__inkwell/save' && req.method === 'POST') {
      const { filename, content, prevFilename } = await readJson(req)
      if (!safe(filename) || typeof content !== 'string') {
        res.statusCode = 400
        return res.end('bad request')
      }
      fs.mkdirSync(ARTICLES_DIR, { recursive: true })
      fs.writeFileSync(path.join(ARTICLES_DIR, filename), content, 'utf8')
      if (safe(prevFilename) && prevFilename !== filename) {
        try {
          fs.unlinkSync(path.join(ARTICLES_DIR, prevFilename))
        } catch {
          /* old file may be gone */
        }
      }
      return res.end('ok')
    }
    if (p === '/__inkwell/delete' && req.method === 'POST') {
      const { filename } = await readJson(req)
      if (!safe(filename)) {
        res.statusCode = 400
        return res.end('bad request')
      }
      try {
        fs.unlinkSync(path.join(ARTICLES_DIR, filename))
      } catch {
        /* already gone */
      }
      return res.end('ok')
    }
    if (p === '/__inkwell/list' && req.method === 'GET') {
      let files = []
      try {
        files = fs
          .readdirSync(ARTICLES_DIR)
          .filter((f) => safe(f))
          .map((f) => ({ filename: f, mtime: fs.statSync(path.join(ARTICLES_DIR, f)).mtimeMs }))
      } catch {
        /* no articles dir yet */
      }
      res.setHeader('Content-Type', 'application/json')
      return res.end(JSON.stringify({ files }))
    }
    if (p === '/__inkwell/read' && req.method === 'GET') {
      const filename = url.searchParams.get('file')
      if (!safe(filename)) {
        res.statusCode = 400
        return res.end('bad request')
      }
      try {
        const content = fs.readFileSync(path.join(ARTICLES_DIR, filename), 'utf8')
        res.setHeader('Content-Type', 'application/json')
        return res.end(JSON.stringify({ filename, content }))
      } catch {
        res.statusCode = 404
        return res.end('not found')
      }
    }
    serveStatic(req, res)
  } catch {
    res.statusCode = 500
    res.end('server error')
  }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 720,
    minHeight: 560,
    title: 'Inkwell',
    backgroundColor: '#f7f4ee',
    webPreferences: { contextIsolation: true },
  })
  win.loadURL(`http://127.0.0.1:${PORT}/`)
  // External links (Publish-to composers) open in the real browser, not the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) {
      void shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

app.whenReady().then(() => {
  fs.mkdirSync(ARTICLES_DIR, { recursive: true })
  server.listen(PORT, '127.0.0.1', () => createWindow())
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
