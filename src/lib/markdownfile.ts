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
