import type { Article } from '@/types'
import {
  FILLERS,
  IRREGULAR_PARTICIPLES,
  NON_ADVERB_LY,
  PREDICATE_ADJECTIVES,
  SYLLABLE_EXCEPTIONS,
} from './lexicon'

// ─────────────────────────────────────────────────────────────────────────
// Local intelligence layer — real text analysis that runs entirely in the
// browser, no API calls. Readability (Flesch), sentence-rhythm stats, a
// length-robust lexical-diversity measure (MATTR), and style heuristics that
// understand English's irregularities. Free, instant, private, offline.
// ─────────────────────────────────────────────────────────────────────────

export interface TextMetrics {
  words: number
  sentences: number
  readingEase: number // Flesch Reading Ease (higher = easier)
  grade: number // Flesch–Kincaid grade level
  avgSentence: number // mean words per sentence
  rhythm: number // stdev of sentence length — higher = more varied
  longSentencePct: number // % of sentences > 30 words
  lexicalDiversity: number // MATTR (moving-average type-token ratio), 0–1, length-robust
  fillerPer100: number // hedge/filler words per 100 words
  adverbPer100: number // -ly adverbs per 100 words
  passivePer100: number // passive-voice hits per 100 words
}

// ── Syllable counting ──────────────────────────────────────────────────────
// English syllabification without a pronunciation dictionary tops out around
// 90%; this handles the big rules (silent-e, consonant+le, silent -ed/-es) plus
// an exceptions map for the frequent offenders.
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w in SYLLABLE_EXCEPTIONS) return SYLLABLE_EXCEPTIONS[w]
  if (w.length <= 3) return 1

  let groups = (w.match(/[aeiouy]+/g) ?? []).length
  const consonantLE = /[^aeiouy]le$/.test(w) // "table", "candle" — the e is NOT silent

  if (/[^aeiouy]e$/.test(w) && !consonantLE) {
    groups -= 1 // silent trailing e ("make", "code")
  } else if (/[^td]ed$/.test(w)) {
    groups -= 1 // silent -ed after a non-t/d consonant ("walked", "used")
  } else if (/[^aeiouy]es$/.test(w) && !/(?:[sxz]|ch|sh)es$/.test(w)) {
    groups -= 1 // silent e in -es after a non-sibilant ("makes"), but keep "boxes"
  }

  return Math.max(1, groups)
}

// ── Sentence segmentation ──────────────────────────────────────────────────
// Splits prose into sentences while respecting abbreviations ("Mr.", "U.S.",
// "e.g."), decimals ("9.3"), and ellipses — and treats each markdown line
// (list item, heading) as its own unit so they don't fuse into one run-on.
const ABBREV = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Inc|Ltd|Co|Corp|Fig|No|Vol|Gen|Sen|Rep|Gov|Capt|approx|al)\./gi
const SENT = '§' // private placeholder for a "protected" period

function splitLine(line: string): string[] {
  const masked = line
    .replace(/\b([A-Za-z])\.(?=[A-Za-z]\.)/g, `$1${SENT}`) // U.S., U.K.
    .replace(/\b([A-Za-z])\.(?=\s|$)/g, `$1${SENT}`) // trailing single initial "A."
    .replace(ABBREV, (m) => m.replace('.', SENT))
    .replace(/(\d)\.(\d)/g, `$1${SENT}$2`) // decimals
    .replace(/\.\.\./g, `${SENT}${SENT}${SENT}`) // ellipsis
  return masked
    .split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9])/) // sentence boundary before a capital/number
    .map((p) => p.replace(new RegExp(SENT, 'g'), '.').trim())
    .filter((p) => /[a-z]/i.test(p))
}

function splitSentences(cleaned: string): string[] {
  return cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /[a-z]/i.test(l))
    .flatMap(splitLine)
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z']*/g) ?? []
}

// Strip markdown but PRESERVE newlines so the segmenter can see line structure;
// heading markers and list bullets become leading space, not fused text.
function stripMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '') // heading markers
    .replace(/^[ \t]*[-*+][ \t]+/gm, '') // bullet markers
    .replace(/^[ \t]*\d+\.[ \t]+/gm, '') // ordered-list markers
    .replace(/[*_~>]/g, ' ')
}

// ── Lexical diversity: MATTR (moving-average type-token ratio) ──────────────
// Plain unique/total is length-biased — longer texts always look less diverse.
// MATTR averages the type-token ratio over a sliding window, so a 300-word and
// a 1,500-word piece are measured on the same footing.
export function mattr(words: string[], window = 50): number {
  if (words.length === 0) return 0
  if (words.length <= window) return new Set(words).size / words.length
  let sum = 0
  let n = 0
  for (let i = 0; i + window <= words.length; i++) {
    sum += new Set(words.slice(i, i + window)).size / window
    n++
  }
  return sum / n
}

function countFiller(words: string[]): number {
  let n = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w === 'kind' || w === 'sort') {
      if (words[i + 1] === 'of') n++ // "kind of" / "sort of" only
    } else if (FILLERS.has(w)) n++
  }
  return n
}

function countPassive(text: string): number {
  const re = /\b(?:am|is|are|was|were|be|been|being)\b\s+(?:\w+ly\s+)?([a-z]+)\b/gi
  let n = 0
  for (const m of text.matchAll(re)) {
    const cand = m[1].toLowerCase()
    if (PREDICATE_ADJECTIVES.has(cand)) continue // "was excited" — adjective, not passive
    if (IRREGULAR_PARTICIPLES.has(cand) || (cand.length > 3 && cand.endsWith('ed'))) n++
  }
  return n
}

export function analyze(body: string): TextMetrics | null {
  const cleaned = stripMarkdown(body)
  const sentences = splitSentences(cleaned)
  const words = wordsOf(cleaned)
  if (words.length < 12 || sentences.length === 0) return null

  const sLens = sentences.map((s) => wordsOf(s).length).filter((n) => n > 0)
  const totalSyll = words.reduce((sum, w) => sum + countSyllables(w), 0)
  const wps = words.length / sLens.length
  const spw = totalSyll / words.length

  const mean = sLens.reduce((a, b) => a + b, 0) / sLens.length
  const variance = sLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sLens.length
  const rhythm = Math.sqrt(variance)

  const adverbs = words.filter((w) => w.length > 4 && w.endsWith('ly') && !NON_ADVERB_LY.has(w)).length
  const per100 = (n: number) => Math.round((n / words.length) * 1000) / 10

  return {
    words: words.length,
    sentences: sLens.length,
    readingEase: clamp(Math.round((206.835 - 1.015 * wps - 84.6 * spw) * 10) / 10, -20, 120),
    grade: Math.max(0, Math.round((0.39 * wps + 11.8 * spw - 15.59) * 10) / 10),
    avgSentence: Math.round(wps * 10) / 10,
    rhythm: Math.round(rhythm * 10) / 10,
    longSentencePct: Math.round((sLens.filter((n) => n > 30).length / sLens.length) * 100),
    lexicalDiversity: Math.round(mattr(words) * 100) / 100,
    fillerPer100: per100(countFiller(words)),
    adverbPer100: per100(adverbs),
    passivePer100: per100(countPassive(cleaned)),
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

// ── Readiness — gates + quality scored against her own published baseline ───
export interface ReadinessFactor {
  label: string
  ok: boolean
  weight: number
}

export interface Readiness {
  score: number // 0–100
  factors: ReadinessFactor[]
  personalized: boolean // true when scored against her own published work
}

// Derived from her published pieces so "good" means good *for her*, not against
// arbitrary cutoffs. Null when there isn't enough published work yet.
export interface ReadinessBaseline {
  easeFloor: number // 20th-percentile reading ease among her published pieces
  rhythmFloor: number // 20th-percentile sentence-rhythm
  fillerCeil: number // 80th-percentile filler/100
  longCeil: number // 80th-percentile long-sentence %
  medianWords: number
}

export function readiness(article: Article, hasCoverAlt: boolean, baseline?: ReadinessBaseline | null): Readiness {
  const m = analyze(article.body)
  const f: ReadinessFactor[] = []
  const add = (label: string, ok: boolean, weight: number) => f.push({ label, ok, weight })
  const b = baseline ?? null

  // Hard gates — true regardless of baseline.
  add('Has a title', article.title.trim().length > 0, 12)
  add('Has a hook', article.hook.trim().length > 0, 10)
  add('Enough substance (300+ words)', (m?.words ?? 0) >= 300, 20)
  add('Cover image with alt text', hasCoverAlt, 6)
  add('Tagged', article.tags.length > 0, 4)

  // Quality factors — measured against her own norms when we have them.
  if (b) {
    add('Typical length for you', (m?.words ?? 0) >= Math.round(b.medianWords * 0.5), 8)
    add('Readable for you', (m?.readingEase ?? 0) >= b.easeFloor, 14)
    add('Rhythm in your range', (m?.rhythm ?? 0) >= b.rhythmFloor, 10)
    add('Filler within your usual', (m?.fillerPer100 ?? 99) <= b.fillerCeil, 8)
    add('Few very-long sentences for you', (m?.longSentencePct ?? 100) <= b.longCeil, 8)
  } else {
    add('Not over-long (≤ 2,000 words)', (m?.words ?? 0) <= 2000, 6)
    add('Readable (Flesch ≥ 50)', (m?.readingEase ?? 0) >= 50, 14)
    add('Varied sentence rhythm', (m?.rhythm ?? 0) >= 5, 10)
    add('Low filler (< 2 per 100 words)', (m?.fillerPer100 ?? 99) < 2, 8)
    add('Few very-long sentences', (m?.longSentencePct ?? 100) < 15, 8)
  }

  const max = f.reduce((a, x) => a + x.weight, 0)
  const got = f.reduce((a, x) => a + (x.ok ? x.weight : 0), 0)
  return { score: Math.round((got / max) * 100), factors: f, personalized: !!b }
}
