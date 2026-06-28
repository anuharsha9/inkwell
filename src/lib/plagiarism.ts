import type { Article } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Local originality check — self-overlap. Finds passages in THIS draft that
// also appear (near-verbatim) in her OTHER articles, so she catches herself
// recycling the same lines across pieces. Pure local string work, no key, no
// network — real and instant. The web-grounded external check lives in ai.ts.
// ─────────────────────────────────────────────────────────────────────────

export interface OverlapMatch {
  text: string // the overlapping passage from this draft
  otherId: string
  otherTitle: string
  words: number
}

const SHINGLE = 7 // window size; ~7 consecutive words is a meaningful echo

function tokens(body: string): string[] {
  return body
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Map every SHINGLE-word window of `text` → the (first) article it came from.
function shingleIndex(others: { id: string; title: string; body: string }[]): Map<string, { id: string; title: string }> {
  const idx = new Map<string, { id: string; title: string }>()
  for (const a of others) {
    const t = tokens(a.body)
    for (let i = 0; i + SHINGLE <= t.length; i++) {
      const key = t.slice(i, i + SHINGLE).join(' ')
      if (!idx.has(key)) idx.set(key, { id: a.id, title: a.title })
    }
  }
  return idx
}

export function selfOverlap(article: Article, all: Article[]): OverlapMatch[] {
  const target = tokens(article.body)
  if (target.length < SHINGLE) return []
  const others = all
    .filter((a) => a.id !== article.id && a.body.trim().split(/\s+/).length >= SHINGLE)
    .map((a) => ({ id: a.id, title: a.title || 'Untitled', body: a.body }))
  if (!others.length) return []

  const idx = shingleIndex(others)
  const matches: OverlapMatch[] = []
  let i = 0
  while (i + SHINGLE <= target.length) {
    const key = target.slice(i, i + SHINGLE).join(' ')
    const hit = idx.get(key)
    if (!hit) {
      i++
      continue
    }
    // Extend the run as long as the same other article keeps matching.
    let end = i + SHINGLE
    while (end < target.length) {
      const next = target.slice(end - SHINGLE + 1, end + 1).join(' ')
      if (idx.get(next)?.id === hit.id) end++
      else break
    }
    const passage = target.slice(i, end).join(' ')
    matches.push({ text: passage, otherId: hit.id, otherTitle: hit.title, words: end - i })
    i = end
  }
  return matches.sort((a, b) => b.words - a.words)
}
