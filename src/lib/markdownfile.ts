import type { Article } from '@/types'
import { slugify } from './text'

// Turn an article into a real, self-describing markdown file for the local
// project folder — frontmatter + title + hook + body. Human-readable, portable,
// and the canonical on-disk copy of her writing.

export function articleFileName(a: Article): string {
  const slug = slugify(a.title) || 'untitled'
  const base = a.number !== null ? `${String(a.number).padStart(2, '0')}-${slug}` : `x-${slug}-${a.id.slice(0, 6)}`
  return `${base}.md`
}

export interface ParsedArticle {
  title: string
  hook: string
  body: string
  status?: string
  phase?: string
  number?: number | null
  tags?: string[]
  platforms?: string[]
  updated?: string
  published?: string
}

// Inverse of articleToMarkdown — parse a project .md file back into fields so
// external edits can flow into the app (two-way sync, PRD §6).
export function parseArticleMarkdown(md: string): ParsedArticle {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/)
  const fm: Record<string, string> = {}
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const i = line.indexOf(':')
      if (i === -1) continue
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  const after = fmMatch ? md.slice(fmMatch[0].length) : md

  // Body = content after the "# Title" heading and an optional "*hook*" line.
  const lines = after.split('\n')
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (i < lines.length && /^#\s+/.test(lines[i])) i++ // drop the title heading
  while (i < lines.length && !lines[i].trim()) i++
  // a leading fully-italic line is the hook echo — drop it
  if (i < lines.length && /^\*[^*].*\*$/.test(lines[i].trim())) {
    i++
    while (i < lines.length && !lines[i].trim()) i++
  }
  const body = lines.slice(i).join('\n').trim()

  const unquote = (s?: string) => {
    if (!s) return ''
    try {
      return JSON.parse(s)
    } catch {
      return s.replace(/^["']|["']$/g, '')
    }
  }
  const list = (s?: string) =>
    s
      ? s
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      : undefined

  return {
    title: unquote(fm.title) || (after.match(/^#\s+(.+)$/m)?.[1] ?? '').trim(),
    hook: unquote(fm.hook),
    body,
    status: fm.status,
    phase: fm.phase,
    number: fm.number ? parseInt(fm.number, 10) : undefined,
    tags: list(fm.tags),
    platforms: list(fm.platforms),
    updated: fm.updated,
    published: fm.published,
  }
}

export function articleToMarkdown(a: Article): string {
  const fm = [
    '---',
    `title: ${JSON.stringify(a.title)}`,
    a.number !== null ? `number: ${a.number}` : null,
    `phase: ${a.phase}`,
    `status: ${a.status}`,
    `tags: [${a.tags.join(', ')}]`,
    `platforms: [${a.platforms.join(', ')}]`,
    a.hook.trim() ? `hook: ${JSON.stringify(a.hook)}` : null,
    `updated: ${a.updatedAt}`,
    a.publishedAt ? `published: ${a.publishedAt}` : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n')

  const title = a.title.trim() || 'Untitled'
  const hook = a.hook.trim() ? `*${a.hook.trim()}*\n\n` : ''
  return `${fm}\n\n# ${title}\n\n${hook}${a.body.trim()}\n`
}
