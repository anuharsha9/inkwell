import { describe, it, expect } from 'vitest'
import { countWords, slugify } from './text'
import { analyze, readiness } from './textmetrics'
import { localPrivacyScan } from './privacy'
import { selfOverlap } from './plagiarism'
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
  it('is clean on innocuous text', () => {
    expect(localPrivacyScan('I learned to write by writing every day.')).toHaveLength(0)
  })
})

describe('self-overlap', () => {
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
