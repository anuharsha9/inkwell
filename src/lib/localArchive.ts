import type { Article } from '@/types'
import { DEMO_MODE } from './env'
import { articleFileName, articleToMarkdown } from './markdownfile'

// ─────────────────────────────────────────────────────────────────────────
// Mirrors her writing to real .md files in the project folder via the dev
// server's /__inkwell endpoints (see vite.config localArchive plugin). Best-
// effort: if the endpoint isn't there (production/static/demo) it disables
// itself after one miss and never bothers the user. Tracks the last filename
// per article so renames clean up the old file.
// ─────────────────────────────────────────────────────────────────────────

const MAP_KEY = 'inkwell:files'
let disabled = DEMO_MODE

function loadMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveMap(m: Record<string, string>) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

async function post(url: string, body: unknown): Promise<boolean> {
  if (disabled) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      if (res.status === 404 || res.status === 405) disabled = true
      return false
    }
    return true
  } catch {
    disabled = true // endpoint unreachable — stop trying this session
    return false
  }
}

// Write (or update) the article's file. Empty drafts don't get a file; an
// emptied draft has its file removed.
export async function syncArticleFile(article: Article): Promise<void> {
  if (disabled) return
  const map = loadMap()
  const prev = map[article.id]

  if (!article.body.trim()) {
    if (prev) {
      await post('/__inkwell/delete', { filename: prev })
      delete map[article.id]
      saveMap(map)
    }
    return
  }

  const filename = articleFileName(article)
  const ok = await post('/__inkwell/save', {
    filename,
    content: articleToMarkdown(article),
    prevFilename: prev && prev !== filename ? prev : undefined,
  })
  if (ok) {
    map[article.id] = filename
    saveMap(map)
  }
}

export async function removeArticleFile(article: Article): Promise<void> {
  if (disabled) return
  const map = loadMap()
  const name = map[article.id]
  if (name) {
    await post('/__inkwell/delete', { filename: name })
    delete map[article.id]
    saveMap(map)
  }
}
