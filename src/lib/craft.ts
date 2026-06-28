import type { Article } from '@/types'
import { analyze, type TextMetrics } from './textmetrics'

// ─────────────────────────────────────────────────────────────────────────
// The longitudinal teacher — reads across her whole body of work and turns the
// local metrics into honest, data-grounded observations about how she writes
// and where she's growing. All local, no API. The more she writes, the more
// these stabilize and the better the picture gets.
// ─────────────────────────────────────────────────────────────────────────

export interface Tendency {
  title: string
  detail: string
  metric: string // the number behind it
}

export interface MonthPoint {
  label: string // "May"
  pieces: number
  words: number
  ease: number
}

export interface CraftReport {
  pieces: number
  totalWords: number
  avg: TextMetrics
  watch: Tendency[]
  strengths: Tendency[]
  focus: string
  trend: MonthPoint[]
}

function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0
}
const r1 = (n: number) => Math.round(n * 10) / 10

export function analyzeCorpus(articles: Article[]): CraftReport | null {
  const pieces = articles
    .map((a) => ({ a, m: analyze(a.body) }))
    .filter((x): x is { a: Article; m: TextMetrics } => x.m !== null)
  if (pieces.length === 0) return null

  const ms = pieces.map((p) => p.m)
  const avg: TextMetrics = {
    words: Math.round(mean(ms.map((m) => m.words))),
    sentences: Math.round(mean(ms.map((m) => m.sentences))),
    readingEase: r1(mean(ms.map((m) => m.readingEase))),
    grade: r1(mean(ms.map((m) => m.grade))),
    avgSentence: r1(mean(ms.map((m) => m.avgSentence))),
    rhythm: r1(mean(ms.map((m) => m.rhythm))),
    longSentencePct: Math.round(mean(ms.map((m) => m.longSentencePct))),
    lexicalDiversity: r1(mean(ms.map((m) => m.lexicalDiversity)) * 100) / 100,
    fillerPer100: r1(mean(ms.map((m) => m.fillerPer100))),
    adverbPer100: r1(mean(ms.map((m) => m.adverbPer100))),
    passivePer100: r1(mean(ms.map((m) => m.passivePer100))),
  }

  const watch: Tendency[] = []
  const strengths: Tendency[] = []

  if (avg.fillerPer100 >= 2)
    watch.push({ title: 'You lean on filler words', detail: 'Hedges like “just”, “really”, “basically” soften your point. Cutting them sharpens your voice.', metric: `${avg.fillerPer100} per 100 words` })
  else if (avg.fillerPer100 < 1)
    strengths.push({ title: 'Lean, unhedged prose', detail: 'You rarely soften with filler — your sentences commit.', metric: `${avg.fillerPer100} per 100 words` })

  if (avg.rhythm < 5)
    watch.push({ title: 'Your sentences rarely vary in length', detail: 'Mixing short punches with longer lines creates momentum a steady cadence loses.', metric: `±${avg.rhythm} variance` })
  else if (avg.rhythm >= 7)
    strengths.push({ title: 'Varied sentence rhythm', detail: 'You move between short and long — the prose has music.', metric: `±${avg.rhythm} variance` })

  if (avg.readingEase < 50)
    watch.push({ title: 'Your prose runs dense', detail: 'Shorter sentences and plainer words would let more readers in without dumbing it down.', metric: `${avg.readingEase} reading ease` })
  else if (avg.readingEase >= 55 && avg.readingEase <= 78)
    strengths.push({ title: 'Readable and clear', detail: 'You land in the sweet spot — substantial but easy to follow.', metric: `${avg.readingEase} reading ease` })

  if (avg.passivePer100 >= 3)
    watch.push({ title: 'You reach for the passive voice', detail: 'Active verbs name who did what and hit harder. Watch for “was/were … -ed”.', metric: `${avg.passivePer100} per 100 words` })

  if (avg.longSentencePct >= 15)
    watch.push({ title: 'Several very long sentences', detail: 'Sentences over 30 words make readers work. Break the longest ones in two.', metric: `${avg.longSentencePct}% over 30 words` })

  if (avg.lexicalDiversity >= 0.55)
    strengths.push({ title: 'Rich vocabulary', detail: 'You don’t lean on the same handful of words — your range shows.', metric: `${Math.round(avg.lexicalDiversity * 100)}% unique` })

  const focus =
    watch[0]
      ? `For your next pieces, work on one thing: ${watch[0].title.toLowerCase()}.`
      : 'Your fundamentals are strong — keep writing and push on ideas, not mechanics.'

  // Growth over time — last 6 months by updatedAt.
  const byMonth = new Map<string, { pieces: number; words: number; ease: number[] }>()
  for (const { a, m } of pieces) {
    const d = new Date(a.updatedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const e = byMonth.get(key) ?? { pieces: 0, words: 0, ease: [] }
    e.pieces++
    e.words += m.words
    e.ease.push(m.readingEase)
    byMonth.set(key, e)
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const trend: MonthPoint[] = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, e]) => ({
      label: MONTHS[parseInt(key.slice(5)) - 1],
      pieces: e.pieces,
      words: e.words,
      ease: Math.round(mean(e.ease)),
    }))

  return { pieces: pieces.length, totalWords: ms.reduce((a, m) => a + m.words, 0), avg, watch, strengths, focus, trend }
}
