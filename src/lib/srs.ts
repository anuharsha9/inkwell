import type { SavedWord } from './storage'

// ─────────────────────────────────────────────────────────────────────────
// Spaced repetition (SM-2-lite). Turns the word bank into actual practice:
// recall a word, grade how it went, and the scheduler decides when to show it
// again — soon if you struggled, further out as it sticks. All local.
// ─────────────────────────────────────────────────────────────────────────

export type Grade = 'again' | 'good' | 'easy'

export interface SrsState {
  due: string
  interval: number
  ease: number
  reps: number
  lapses: number
}

const DAY = 24 * 60 * 60 * 1000

export function reviewCard(card: SrsState, grade: Grade, now: number = Date.now()): SrsState {
  let { interval, ease, reps, lapses } = card

  if (grade === 'again') {
    reps = 0
    lapses += 1
    ease = Math.max(1.3, ease - 0.2)
    interval = 0 // due again right away (this session)
  } else {
    reps += 1
    if (grade === 'easy') ease += 0.15
    if (reps === 1) interval = grade === 'easy' ? 2 : 1
    else if (reps === 2) interval = grade === 'easy' ? 5 : 3
    else interval = Math.round(interval * ease * (grade === 'easy' ? 1.3 : 1))
  }

  return {
    interval,
    ease: Math.round(ease * 100) / 100,
    reps,
    lapses,
    due: new Date(now + interval * DAY).toISOString(),
  }
}

export function isDue(w: { due: string }, now: number = Date.now()): boolean {
  return new Date(w.due).getTime() <= now
}

export function dueWords(vocab: SavedWord[], now: number = Date.now()): SavedWord[] {
  return vocab.filter((w) => isDue(w, now)).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
}
