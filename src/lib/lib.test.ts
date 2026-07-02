import { describe, it, expect } from 'vitest'
import { countWords, slugify } from './text'
import { analyze, readiness, mattr, countSyllables } from './textmetrics'
import { publishedBaseline } from './craft'
import { localPrivacyScan } from './privacy'
import { selfOverlap, nearDuplicates } from './plagiarism'
import { reviewCard, isDue, type SrsState } from './srs'
import { analyzePos } from './pos'
import { cosineSimilarity, contentHash, prepText, shouldReuseCached } from './embeddings-core'
import { isPristineSeed } from './storage'
import { publishingPlan, computeCounts } from './selectors'
import { parseArticleMarkdown } from './markdownfile'
import type { Article } from '@/types'

function article(over: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    number: 1,
    title: 'Test',
    hook: 'A hook',
    body: '',
    phase: 'phase-1',
    tags: ['human'],
    status: 'idea',
    platforms: ['substack'],
    wordCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: null,
    pinned: false,
    notes: '',
    coverImageId: null,
    imageIds: [],
    configTalk: false,
    configNote: '',
    ...over,
  }
}

describe('text', () => {
  it('counts words ignoring markdown', () => {
    expect(countWords('# Hello there **world**')).toBe(3)
    expect(countWords('')).toBe(0)
  })
  it('slugifies', () => {
    expect(slugify('Hello, World! Two')).toBe('hello-world-two')
  })
})

describe('syllables', () => {
  it('applies English rules, not just vowel groups', () => {
    expect(countSyllables('table')).toBe(2) // consonant + le
    expect(countSyllables('apple')).toBe(2)
    expect(countSyllables('code')).toBe(1) // silent e
    expect(countSyllables('makes')).toBe(1) // silent -es
    expect(countSyllables('boxes')).toBe(2) // sibilant -es keeps the syllable
    expect(countSyllables('walked')).toBe(1) // silent -ed
    expect(countSyllables('wanted')).toBe(2) // -ed after t is voiced
    expect(countSyllables('beautiful')).toBe(3)
    expect(countSyllables('the')).toBe(1)
    expect(countSyllables('idea')).toBe(3) // exception map
  })
})

describe('textmetrics', () => {
  it('returns null for trivially short text', () => {
    expect(analyze('too short')).toBeNull()
  })
  it('analyzes a real paragraph', () => {
    const m = analyze(
      'The cat sat on the mat. It was a warm afternoon and the sun came through the window. She watched it sleep, content and still, for a long while.',
    )
    expect(m).not.toBeNull()
    expect(m!.sentences).toBe(3)
    expect(m!.words).toBeGreaterThan(20)
    expect(m!.readingEase).toBeGreaterThan(0)
  })
  it('does not split on abbreviations or decimals', () => {
    const m = analyze('Dr. Smith went to Washington. He left at 9.30 p.m. and never came back home.')
    expect(m!.sentences).toBe(2)
  })
  it('treats markdown list items as separate sentences', () => {
    const m = analyze('Here are the reasons.\n- first reason here\n- second reason here\n- third reason here')
    expect(m!.sentences).toBe(4)
  })
  it('scores readiness higher for a fuller draft', () => {
    const thin = readiness(article({ body: 'A short idea here only.' }), false)
    const full = readiness(
      article({
        body: Array(40).fill('The work was steady and the lessons came slowly but surely over time.').join(' '),
      }),
      true,
    )
    expect(full.score).toBeGreaterThan(thin.score)
  })
})

describe('lexical diversity (MATTR)', () => {
  it('is length-robust where raw TTR is not', () => {
    const distinct = Array.from({ length: 80 }, (_, i) => `word${i}`)
    const doubled = [...distinct, ...distinct] // raw TTR halves; MATTR shouldn't
    const ttrDoubled = new Set(doubled).size / doubled.length
    expect(ttrDoubled).toBeCloseTo(0.5, 1)
    expect(mattr(doubled)).toBeGreaterThan(0.9)
    expect(mattr(distinct)).toBeGreaterThan(0.95)
  })
})

describe('passive voice', () => {
  it('catches irregular participles the naive regex missed', () => {
    const m = analyze('The house was built quickly. The letter was written by her. The bridge was rebuilt last year.')
    expect(m!.passivePer100).toBeGreaterThan(0)
  })
  it('does not flag predicate adjectives as passive', () => {
    const m = analyze('I was excited about it. She was tired after work. He was interested in the topic as well.')
    expect(m!.passivePer100).toBe(0)
  })
})

describe('adverb + filler heuristics', () => {
  it('ignores non-adverb -ly words', () => {
    const m = analyze('The whole family will reply only when they are good and ready, and that is final.')
    expect(m!.adverbPer100).toBe(0)
  })
  it('only counts kind/sort as filler before "of"', () => {
    const clean = analyze('She is a kind person who will sort the mail each and every morning without fail.')
    expect(clean!.fillerPer100).toBe(0)
    const hedged = analyze('It was kind of nice and sort of fun to write here, really, on most every day.')
    expect(hedged!.fillerPer100).toBeGreaterThan(0)
  })
})

describe('privacy scan', () => {
  it('flags money, email, and phone', () => {
    const f = localPrivacyScan('They paid me $138K. Reach me at me@example.com or 415-555-0199.')
    const cats = f.map((x) => x.category)
    expect(cats).toContain('finance')
    expect(cats).toContain('contact')
  })
  it('dedupes overlapping money matches', () => {
    const f = localPrivacyScan('The offer was $138K, a real number.')
    const money = f.filter((x) => x.category === 'finance')
    expect(money).toHaveLength(1)
    expect(money[0].text).toBe('$138K')
  })
  it('flags money written in words', () => {
    const f = localPrivacyScan('I earned six figures at the new job last year of work here.')
    expect(f.some((x) => x.category === 'finance')).toBe(true)
  })
  it('does not flag bare counts as money', () => {
    const f = localPrivacyScan('The system powered 20 million weekly jobs across the company.')
    expect(f.some((x) => x.category === 'finance')).toBe(false)
  })
  it('still flags currency amounts and Indian money units', () => {
    expect(localPrivacyScan('It cost ₹5 lakh that year.').some((x) => x.category === 'finance')).toBe(true)
    expect(localPrivacyScan('They raised $20 million in funding.').some((x) => x.category === 'finance')).toBe(true)
  })
  it('flags named companies and custom private terms', () => {
    const f = localPrivacyScan('I worked at TIBCO Software for years on hard things.', ['TIBCO'])
    expect(f.some((x) => x.category === 'company')).toBe(true)
  })
  it('does not match abbreviations inside ordinary words', () => {
    expect(localPrivacyScan('Step one is the hardest, but unit testing saved us.')).toHaveLength(0)
    expect(localPrivacyScan('Mail it to Apt 4B when you get a chance.').some((x) => x.category === 'address')).toBe(true)
  })
  it('is clean on innocuous text', () => {
    expect(localPrivacyScan('I learned to write by writing every day.')).toHaveLength(0)
  })
})

describe('self-overlap (verbatim)', () => {
  it('finds a reused passage across articles', () => {
    const shared = 'the most important thing i learned was to keep showing up every single day'
    const a = article({ id: 'a', body: `Here is a thought: ${shared}, and more.` })
    const b = article({ id: 'b', body: `In another piece, ${shared}, she wrote.` })
    const matches = selfOverlap(a, [a, b])
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].otherId).toBe('b')
  })
  it('finds nothing when articles are distinct', () => {
    const a = article({ id: 'a', body: 'A wholly original first sentence about design and craft.' })
    const b = article({ id: 'b', body: 'A completely different line concerning music and rhythm.' })
    expect(selfOverlap(a, [a, b])).toHaveLength(0)
  })
})

describe('near-duplicate echoes', () => {
  it('flags a lightly-reworded repost', () => {
    const base = 'The work was steady and the lessons came slowly but surely over many years of effort'
    const a = article({ id: 'a', body: `${base} and the most important thing i learned was to keep showing up.` })
    const b = article({ id: 'b', body: `${base} and the biggest thing i learned was to keep showing up too.` })
    const echoes = nearDuplicates(a, [a, b])
    expect(echoes.length).toBeGreaterThan(0)
    expect(echoes[0].otherId).toBe('b')
    expect(echoes[0].similarity).toBeGreaterThan(20)
  })
  it('stays quiet on distinct pieces', () => {
    const a = article({ id: 'a', body: 'A wholly original meditation on color, grids, and the discipline of layout.' })
    const b = article({ id: 'b', body: 'An unrelated account of violins, tempo, and the patience that music demands.' })
    expect(nearDuplicates(a, [a, b])).toHaveLength(0)
  })
})

describe('spaced repetition', () => {
  const fresh: SrsState = { due: '2026-01-01T00:00:00.000Z', interval: 0, ease: 2.5, reps: 0, lapses: 0 }
  const now = new Date('2026-06-01T00:00:00.000Z').getTime()

  it('schedules further out as recall succeeds', () => {
    const r1 = reviewCard(fresh, 'good', now)
    expect(r1.reps).toBe(1)
    expect(r1.interval).toBe(1)
    const r2 = reviewCard(r1, 'good', now)
    expect(r2.interval).toBe(3)
    const r3 = reviewCard(r2, 'good', now)
    expect(r3.interval).toBeGreaterThan(3) // interval * ease
  })
  it('resets and lowers ease on a lapse', () => {
    const learned = reviewCard(reviewCard(fresh, 'good', now), 'good', now)
    const lapsed = reviewCard(learned, 'again', now)
    expect(lapsed.reps).toBe(0)
    expect(lapsed.lapses).toBe(1)
    expect(lapsed.ease).toBeLessThan(learned.ease)
    expect(lapsed.interval).toBe(0)
  })
  it('marks a future-due card as not due', () => {
    const r = reviewCard(fresh, 'easy', now)
    expect(isDue({ due: r.due }, now)).toBe(false)
  })
})

describe('POS-backed metrics', () => {
  it('detects passive and real adverbs, ignoring -ly nouns', () => {
    const p = analyzePos('The house was built by hand. She quickly and carefully revised the whole long draft today.')
    expect(p).not.toBeNull()
    expect(p!.passivePer100).toBeGreaterThan(0)
    expect(p!.adverbPer100).toBeGreaterThan(0)
  })
  it('does not count predicate adjectives as passive', () => {
    const p = analyzePos('I was excited about the project. She was interested in the whole idea from the start.')
    expect(p!.passivePer100).toBe(0)
  })
  it('flags weak verbs and nominalizations', () => {
    const p = analyzePos('The implementation of the system was a clear improvement in performance and reliability overall.')
    expect(p!.nominalizationPer100).toBeGreaterThan(0)
    expect(p!.weakVerbPer100).toBeGreaterThan(0)
  })
})

describe('semantic embeddings — cosine similarity', () => {
  it('is 1 for identical vectors and -1 for opposites', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6)
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6)
  })
  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6)
  })
  it('is scale-invariant (direction, not magnitude)', () => {
    expect(cosineSimilarity([2, 0], [5, 0])).toBeCloseTo(1, 6)
  })
  it('returns 0 — never NaN — for zero, empty, or mismatched vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
    expect(cosineSimilarity([], [])).toBe(0)
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })
})

describe('semantic embeddings — cache hash logic', () => {
  it('is deterministic and differs on any content change', () => {
    const body = 'The work was steady and the lessons came slowly.'
    expect(contentHash(prepText(body))).toBe(contentHash(prepText(body)))
    expect(contentHash(prepText(body))).not.toBe(contentHash(prepText(body + ' One more line.')))
    // Whitespace-only edits collapse in prepText → same vector is reused.
    expect(contentHash(prepText(body))).toBe(contentHash(prepText(body.replace(/ /g, '  '))))
  })
  it('reuses a cached vector only when hash matches and data is present', () => {
    const text = prepText('A real article body that is long enough to embed.')
    const hash = contentHash(text)
    expect(shouldReuseCached({ hash, vector: [0.1, 0.2] }, text)).toBe(true) // hit
    expect(shouldReuseCached({ hash, vector: [0.1, 0.2] }, text + ' edited')).toBe(false) // body changed
    expect(shouldReuseCached({ hash, vector: [] }, text)).toBe(false) // empty payload
    expect(shouldReuseCached(undefined, text)).toBe(false) // nothing cached
  })
  it('strips markdown so formatting-only edits do not bust the cache', () => {
    expect(prepText('# Title\n\n**bold** words here.')).toBe('Title bold words here.')
    expect(contentHash(prepText('plain text here'))).toBe(contentHash(prepText('**plain** _text_ here')))
  })
})

describe('personalized readiness baseline', () => {
  const pub = (id: string, body: string) => article({ id, status: 'published', body })
  const longBody = Array(30).fill('The lesson came slowly but surely, and the work stayed honest over time.').join(' ')
  it('builds a baseline once enough is published and personalizes the score', () => {
    const corpus = [pub('p1', longBody), pub('p2', longBody), pub('p3', longBody)]
    const base = publishedBaseline(corpus)
    expect(base).not.toBeNull()
    const r = readiness(article({ body: longBody }), false, base)
    expect(r.personalized).toBe(true)
  })
  it('returns no baseline with too little published work', () => {
    expect(publishedBaseline([pub('p1', longBody)])).toBeNull()
    expect(readiness(article({ body: longBody }), false, null).personalized).toBe(false)
  })
})

describe('publishing plan', () => {
  const now = new Date('2026-07-01T10:00:00') // a Wednesday
  it('dates slots by cadence and fills ready-first', () => {
    const arts = [
      article({ id: 'r1', status: 'ready', number: 5, body: 'x' }),
      article({ id: 'r2', status: 'ready', number: 2, pinned: true, body: 'x' }),
      article({ id: 'd1', status: 'drafting', updatedAt: '2026-06-30T00:00:00.000Z', body: 'x' }),
    ]
    const plan = publishingPlan(arts, [2, 4], 4, now) // Tue+Thu
    expect(plan.map((s) => s.date)).toEqual(['2026-07-02', '2026-07-07', '2026-07-09', '2026-07-14'])
    expect(plan[0].article?.id).toBe('r2') // pinned ready first
    expect(plan[1].article?.id).toBe('r1')
    expect(plan[2].article?.id).toBe('d1') // then drafting
    expect(plan[3].assigned).toBe('open')
  })
  it('scheduled pieces claim their exact date, even off-cadence', () => {
    const arts = [
      article({ id: 's1', status: 'drafting', scheduledFor: '2026-07-08', body: 'x' }),
      article({ id: 'r1', status: 'ready', body: 'x' }),
    ]
    const plan = publishingPlan(arts, [2, 4], 4, now)
    const wed = plan.find((s) => s.date === '2026-07-08')
    expect(wed?.article?.id).toBe('s1')
    expect(wed?.assigned).toBe('scheduled')
    expect(plan[0].article?.id).toBe('r1') // autofill unaffected
  })
  it('ignores past-dated and published schedules', () => {
    const arts = [
      article({ id: 'old', status: 'ready', scheduledFor: '2026-06-01', body: 'x' }),
      article({ id: 'pub', status: 'published', scheduledFor: '2026-07-07', body: 'x' }),
    ]
    const plan = publishingPlan(arts, [2], 2, now)
    expect(plan.every((s) => s.article?.id !== 'pub')).toBe(true)
    expect(plan[0].article?.id).toBe('old') // past date dropped → autofills as ready
  })
})

describe('markdown import parsing', () => {
  it('parses arbitrary md: H1 title + body, no frontmatter', () => {
    const p = parseArticleMarkdown('# My Title\n\nFirst para.\n\nSecond para.')
    expect(p.title).toBe('My Title')
    expect(p.body).toContain('First para.')
    expect(p.body).not.toContain('# My Title')
  })
  it('honors frontmatter when present', () => {
    const p = parseArticleMarkdown('---\ntitle: "From FM"\nstatus: ready\ntags: [human, process]\n---\n\n# From FM\n\nBody here.')
    expect(p.title).toBe('From FM')
    expect(p.status).toBe('ready')
    expect(p.tags).toEqual(['human', 'process'])
    expect(p.body).toBe('Body here.')
  })
})

describe('pristine-seed detection (desktop auto-hydration)', () => {
  it('is pristine only for untouched seed articles', () => {
    const seedA = article({ id: 'seed-1', body: '' })
    const seedB = article({ id: 'seed-2', body: '   ' })
    expect(isPristineSeed([seedA, seedB])).toBe(true)
    expect(isPristineSeed([seedA, article({ id: 'seed-3', body: 'she wrote something' })])).toBe(false)
    expect(isPristineSeed([seedA, article({ id: 'li-1a', body: '' })])).toBe(false)
    expect(isPristineSeed([])).toBe(false)
  })
})

describe('habit-goal count', () => {
  it('counts every finished piece, planned or not', () => {
    const c = computeCounts([
      article({ id: 'seed-1', number: 1, status: 'published' }),
      article({ id: 'adhoc', number: null, status: 'ready' }),
      article({ id: 'wip', number: null, status: 'drafting' }),
    ])
    expect(c.goalDone).toBe(2) // ad-hoc ready counts too — 50 is a goal, not a plan cap
  })
})
