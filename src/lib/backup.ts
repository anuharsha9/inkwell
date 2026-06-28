import JSZip from 'jszip'
import type { Article, InkImage, Settings } from '@/types'
import { slugify } from './text'

// ─────────────────────────────────────────────────────────────────────────
// Export / import (PRD §6). Her insurance and portability — never locked in.
//   · JSON backup: everything, images embedded as base64.
//   · Markdown zip: one .md per article + image files, referenced by relative
//     path, so the folder is readable anywhere.
//   · JSON import: restores/moves between machines (warns before overwrite).
// ─────────────────────────────────────────────────────────────────────────

export interface Backup {
  app: 'inkwell'
  version: 1
  exportedAt: string
  articles: Article[]
  images: InkImage[]
  settings: Settings
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Full JSON backup (images embedded) ────────────────────────────────────
export function exportJSON(articles: Article[], images: InkImage[], settings: Settings) {
  const backup: Backup = {
    app: 'inkwell',
    version: 1,
    exportedAt: new Date().toISOString(),
    articles,
    images,
    settings,
  }
  triggerDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `inkwell-backup-${stamp()}.json`)
}

function articleFileBase(a: Article): string {
  const slug = slugify(a.title) || 'untitled'
  return a.number !== null ? `${String(a.number).padStart(2, '0')}-${slug}` : `x-${slug}-${a.id.slice(0, 6)}`
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } | null {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/i.exec(dataUrl)
  if (!m) return null
  const ext = m[1].split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg')
  const bin = atob(m[2])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, ext }
}

// ── Markdown + images zip ──────────────────────────────────────────────────
export async function exportMarkdownZip(articles: Article[], images: Record<string, InkImage>) {
  const zip = new JSZip()
  const imgFolder = zip.folder('images')!

  for (const a of articles) {
    const base = articleFileBase(a)
    // collect this article's images (cover + inline), write the local ones to disk
    const ids = [a.coverImageId, ...a.imageIds].filter(Boolean) as string[]
    const relPath: Record<string, string> = {}
    for (const id of ids) {
      const img = images[id]
      if (!img) continue
      if (img.source === 'url') {
        relPath[id] = img.src // remote — reference directly
        continue
      }
      const decoded = dataUrlToBytes(img.src)
      if (!decoded) continue
      const name = `${base}-${id.slice(0, 6)}.${decoded.ext}`
      imgFolder.file(name, decoded.bytes)
      relPath[id] = `images/${name}`
    }

    // resolve inline ![alt](id) → relative path
    const body = a.body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt: string, ref: string) => {
      const p = relPath[ref.trim()]
      return p ? `![${alt}](${p})` : whole
    })

    const fm = [
      '---',
      `title: ${JSON.stringify(a.title)}`,
      a.number !== null ? `number: ${a.number}` : null,
      `phase: ${a.phase}`,
      `status: ${a.status}`,
      `tags: [${a.tags.join(', ')}]`,
      `platforms: [${a.platforms.join(', ')}]`,
      a.publishedAt ? `published: ${a.publishedAt}` : null,
      '---',
    ]
      .filter(Boolean)
      .join('\n')

    const cover = a.coverImageId ? relPath[a.coverImageId] : null
    const coverLine = cover ? `![${images[a.coverImageId!]?.alt ?? ''}](${cover})\n\n` : ''
    const md = `${fm}\n\n# ${a.title || 'Untitled'}\n\n${a.hook ? `*${a.hook}*\n\n` : ''}${coverLine}${body}\n`
    zip.file(`${base}.md`, md)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, `inkwell-markdown-${stamp()}.zip`)
}

// ── Import from JSON backup ───────────────────────────────────────────────
export function parseBackup(text: string): Backup {
  const data = JSON.parse(text)
  if (data?.app !== 'inkwell' || !Array.isArray(data.articles)) {
    throw new Error('This file is not an Inkwell backup.')
  }
  return data as Backup
}
