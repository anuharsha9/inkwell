import { describe, it, expect } from 'vitest'
import { countWords, slugify } from './text'
import { analyze, readiness, mattr, countSyllables } from './textmetrics'
import { publishedBaseline } from './craft'
import { localPrivacyScan } from './privacy'
import { selfOverlap, nearDuplicates } from './plagiarism'
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
