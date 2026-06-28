import type { Article } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// Local intelligence layer — real text analysis that runs entirely in the
// browser, no API calls. These statistical/heuristic models (readability
// formulas, sentence-rhythm stats, lexical diversity, a feature-based
// readiness score) power the everyday insights, so the live AI is reserved
// for genuinely generative work. Free, instant, private, offline.
// ─────────────────────────────────────────────────────────────────────────

export interface TextMetrics {
  words: number
  sentences: number
  readingEase: number // Flesch Reading Ease (higher = easier)
  grade: number // Flesch–Kincaid grade level
  avgSentence: number // mean words per sentence
  rhythm: number // stdev of sentence length — higher = more varied
  longSentencePct: number // % of sentences > 30 words
  lexicalDiversity: number // unique / total words (0–1)
  fillerPer100: number // hedge/filler words per 100 words
  adverbPer100: number // -ly adverbs per 100 words
  passivePer100: number // passive-voice hits per 100 words
}

const FILLERS = new Set([
  'very', 'really', 'just', 'actually', 'basically', 'literally', 'simply', 'quite', 'rather',
  'somewhat', 'pretty', 'kind', 'sort', 'totally', 'definitely', 'certainly', 'probably',
  'maybe', 'perhaps', 'essentially', 'honestly', 'obviously', 'clearly', 'truly',
])

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[a-zA-Z]/.test(s))
}

function wordsOf(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z']*/g) ?? [])
}

function syllables(word: string): number {
  const w = word.replace(/[^a-z]/g, '')
  if (w.length <= 3) return 1
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g)
  return Math.max(1, groups ? groups.length : 1)
}

function stripMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~]/g, ' ')
}

export function analyze(body: string): TextMetrics | null {
  const text = stripMarkdown(body).trim()
  const sentences = splitSentences(text)
  const words = wordsOf(text)
  if (words.length < 12 || sentences.length === 0) return null

  const sLens = sentences.map((s) => wordsOf(s).length).filter((n) => n > 0)
  const totalSyll = words.reduce((sum, w) => sum + syllables(w), 0)
  const wps = words.length / sLens.length
  const spw = totalSyll / words.length

  const mean = sLens.reduce((a, b) => a + b, 0) / sLens.length
  const variance = sLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sLens.length
  const rhythm = Math.sqrt(variance)

  const unique = new Set(words).size
  const filler = words.filter((w) => FILLERS.has(w)).length
  const adverbs = words.filter((w) => w.length > 4 && w.endsWith('ly')).length
  const passive = (text.match(/\b(?:am|is|are|was|were|be|been|being)\b\s+(?:\w+ly\s+)?\w+ed\b/gi) ?? []).length

  const per100 = (n: number) => Math.round((n / words.length) * 1000) / 10

  return {
    words: words.length,
    sentences: sLens.length,
    readingEase: clamp(Math.round((206.835 - 1.015 * wps - 84.6 * spw) * 10) / 10, -20, 120),
    grade: Math.max(0, Math.round((0.39 * wps + 11.8 * spw - 15.59) * 10) / 10),
    avgSentence: Math.round(wps * 10) / 10,
    rhythm: Math.round(rhythm * 10) / 10,
    longSentencePct: Math.round((sLens.filter((n) => n > 30).length / sLens.length) * 100),
    lexicalDiversity: Math.round((unique / words.length) * 100) / 100,
    fillerPer100: per100(filler),
    adverbPer100: per100(adverbs),
    passivePer100: per100(passive),
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

// Human label for Flesch Reading Ease.
export function easeLabel(ease: number): string {
  if (ease >= 70) return 'Easy, conversational'
  if (ease >= 55) return 'Plain, readable'
  if (ease >= 40) return 'Fairly dense'
  return 'Dense — consider simplifying'
}

// ── Readiness score — a feature-based model predicting publish-readiness ────
export interface ReadinessFactor {
  label: string
  ok: boolean
  weight: number
}

export interface Readiness {
  score: number // 0–100
  factors: ReadinessFactor[]
}

export function readiness(article: Article, hasCoverAlt: boolean): Readiness {
  const m = analyze(article.body)
  const f: ReadinessFactor[] = []
  const add = (label: string, ok: boolean, weight: number) => f.push({ label, ok, weight })

  add('Has a title', article.title.trim().length > 0, 12)
  add('Has a hook', article.hook.trim().length > 0, 10)
  add('Enough substance (300+ words)', (m?.words ?? 0) >= 300, 22)
  add('Not over-long (≤ 2,000 words)', (m?.words ?? 0) <= 2000, 6)
  add('Readable (Flesch ≥ 50)', (m?.readingEase ?? 0) >= 50, 14)
  add('Varied sentence rhythm', (m?.rhythm ?? 0) >= 5, 10)
  add('Low filler (< 2 per 100 words)', (m?.fillerPer100 ?? 99) < 2, 8)
  add('Few very-long sentences', (m?.longSentencePct ?? 100) < 15, 8)
  add('Cover image with alt text', hasCoverAlt, 6)
  add('Tagged', article.tags.length > 0, 4)

  const max = f.reduce((a, x) => a + x.weight, 0)
  const got = f.reduce((a, x) => a + (x.ok ? x.weight : 0), 0)
  return { score: Math.round((got / max) * 100), factors: f }
}
