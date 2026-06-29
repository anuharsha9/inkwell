import type { Article } from '@/types'
import { articleFilenameMap, listDiskFiles, readDiskFile } from './localArchive'
import { parseArticleMarkdown } from './markdownfile'

// ─────────────────────────────────────────────────────────────────────────
// Two-way sync (read side). Compares the .md files in the project folder to the
// in-app articles and reports which ones differ on disk — so an edit made in
// any external editor can be pulled back in. Never applies anything itself; the
// UI confirms each change. No-op in the demo (no dev endpoints).
// ─────────────────────────────────────────────────────────────────────────

export interface DiskChange {
  articleId: string
  title: string
  filename: string
  diskBody: string
  currentBody: string
}

export async function scanDiskChanges(articles: Record<string, Article>): Promise<DiskChange[]> {
  const map = articleFilenameMap() // articleId → filename
  const byFilename: Record<string, string> = {}
  for (const [id, fn] of Object.entries(map)) byFilename[fn] = id

  const files = await listDiskFiles()
  const changes: DiskChange[] = []
  for (const f of files) {
    const id = byFilename[f.filename]
    if (!id) continue
    const art = articles[id]
    if (!art) continue
    const content = await readDiskFile(f.filename)
    if (content == null) continue
    const parsed = parseArticleMarkdown(content)
    // Only flag real, non-empty divergence in the body.
    if (parsed.body.trim() && parsed.body.trim() !== art.body.trim()) {
      changes.push({
        articleId: id,
        title: art.title || 'Untitled',
        filename: f.filename,
        diskBody: parsed.body,
        currentBody: art.body,
      })
    }
  }
  return changes
}
