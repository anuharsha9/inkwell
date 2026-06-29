import nlp from 'compromise'
import { PREDICATE_ADJECTIVES } from './lexicon'

// ─────────────────────────────────────────────────────────────────────────
// Part-of-speech-backed style metrics (via compromise). More accurate than the
// regex heuristics in textmetrics: real adverbs (not every -ly word), real
// passive voice (not "was excited"), plus two new signals — weak verbs and
// nominalizations. Used for the single active draft (kept off the whole-corpus
// aggregate for speed). Defensive: returns null if anything goes wrong, so
// callers fall back to the heuristics.
// ─────────────────────────────────────────────────────────────────────────

export interface PosMetrics {
  adverbPer100: number
  passivePer100: number
  weakVerbPer100: number
  nominalizationPer100: number
}

// Vague "to be / have / do / get / make / go" verbs that usually signal a
// stronger verb is hiding in the sentence.
const WEAK_VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'do', 'does', 'did',
  'get', 'gets', 'got', 'getting', 'make', 'makes', 'made', 'making',
  'go', 'goes', 'went', 'gone', 'seem', 'seems', 'seemed', 'become', 'becomes', 'became',
])

// Noun endings that mark a nominalization (a verb/adjective turned into a noun).
const NOMINAL = /(?:tion|tions|ment|ments|ness|nesses|ity|ities|ance|ances|ence|ences|izations?)$/

export function analyzePos(text: string): PosMetrics | null {
  const words = (text.toLowerCase().match(/[a-z][a-z']*/g) ?? []).length
  if (words < 12) return null
  try {
    const doc = nlp(text)
    const adverbs = doc.adverbs().out('array').length
    // POS finds "be + past-tense"; the stoplist drops predicate adjectives
    // ("was excited") that compromise sometimes tags as past-tense in context.
    let passive = 0
    for (const m of doc.match('(is|am|are|was|were|be|been|being) #Adverb? #PastTense').out('array') as string[]) {
      const last = m.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).pop() ?? ''
      if (!PREDICATE_ADJECTIVES.has(last)) passive++
    }

    let weak = 0
    for (const v of doc.verbs().out('array') as string[]) {
      const last = v.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).pop() ?? ''
      if (WEAK_VERBS.has(last)) weak++
    }

    let nominal = 0
    const nounWords = (doc.nouns().out('array') as string[]).join(' ').toLowerCase().match(/[a-z]+/g) ?? []
    for (const w of nounWords) if (w.length > 5 && NOMINAL.test(w)) nominal++

    const per100 = (n: number) => Math.round((n / words) * 1000) / 10
    return {
      adverbPer100: per100(adverbs),
      passivePer100: per100(passive),
      weakVerbPer100: per100(weak),
      nominalizationPer100: per100(nominal),
    }
  } catch {
    return null
  }
}
