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

// ── Near-duplicate / echo detection (paraphrase-tolerant) ──────────────────
// The exact-run detector above misses lightly-reworded repetition. This uses a
// smaller (4-word) shingle window and measures overlap by *containment* — what
// share of the shorter piece's phrasing also shows up in another — so a piece
// you rewrote and re-used still surfaces. (Deep semantic paraphrase still needs
// embeddings; this catches the common "edited repost" case.)
const NEAR_SHINGLE = 4

export interface Echo {
  otherId: string
  otherTitle: string
  similarity: number // 0–100, containment of shared 4-word phrases
  shared: number // count of shared phrases
  sample: string // an example shared phrase
}

function shingleSet(toks: string[], n: number): Set<string> {
  const s = new Set<string>()
  for (let i = 0; i + n <= toks.length; i++) s.add(toks.slice(i, i + n).join(' '))
  return s
}

export function nearDuplicates(article: Article, all: Article[], minShared = 6): Echo[] {
  const target = tokens(article.body)
  if (target.length < NEAR_SHINGLE * 2) return []
  const tSet = shingleSet(target, NEAR_SHINGLE)
  if (tSet.size === 0) return []

  const echoes: Echo[] = []
  for (const a of all) {
    if (a.id === article.id) continue
    const oToks = tokens(a.body)
    if (oToks.length < NEAR_SHINGLE * 2) continue
    const oSet = shingleSet(oToks, NEAR_SHINGLE)

    let shared = 0
    let sample = ''
    for (const sh of tSet) {
      if (oSet.has(sh)) {
        shared++
        if (!sample) sample = sh
      }
    }
    if (shared < minShared) continue
    const denom = Math.min(tSet.size, oSet.size) // containment, not Jaccard
    echoes.push({
      otherId: a.id,
      otherTitle: a.title || 'Untitled',
      similarity: Math.round((shared / denom) * 100),
      shared,
      sample,
    })
  }
  return echoes.sort((a, b) => b.similarity - a.similarity)
}
