import type { Article, Status } from '@/types'
import type { Filters } from '@/store'
import { PHASE_ORDER } from './constants'

// 50 is a motivational goal, not a cap — her words: "if I do 50, I'll get
// addicted to writing regularly." Every finished piece counts, planned or not.
export const WRITING_GOAL = 50

export interface DashboardCounts {
  total: number
  byStatus: Record<Status, number>
  goalDone: number // finished pieces (ready or published — ANY article) toward the habit goal
  readyNow: number
}

export function computeCounts(articles: Article[]): DashboardCounts {
  const byStatus: Record<Status, number> = { idea: 0, drafting: 0, ready: 0, published: 0 }
  for (const a of articles) byStatus[a.status]++
  return {
    total: articles.length,
    byStatus,
    goalDone: byStatus.ready + byStatus.published,
    readyNow: byStatus.ready,
  }
}

// Plan-order: by number when present, ad-hoc (null number) sorted by recency.
function planOrder(a: Article, b: Article): number {
  if (a.number !== null && b.number !== null) return a.number - b.number
  if (a.number !== null) return -1
  if (b.number !== null) return 1
  return b.updatedAt.localeCompare(a.updatedAt)
}

export function matchesFilters(a: Article, f: Filters): boolean {
  if (f.statuses.length && !f.statuses.includes(a.status)) return false
  if (f.phases.length && !f.phases.includes(a.phase)) return false
  if (f.tags.length && !f.tags.some((t) => a.tags.includes(t))) return false
  if (f.platforms.length && !f.platforms.some((p) => a.platforms.includes(p))) return false
  if (f.search.trim()) {
    const q = f.search.toLowerCase()
    const hay = `${a.title} ${a.hook} ${a.body}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export interface Group {
  key: string
  label: string
  sublabel?: string
  roman?: string
  articles: Article[]
}

export function groupArticles(articles: Article[], groupBy: 'phase' | 'status' | 'recent', filters: Filters): Group[] {
  const filtered = articles.filter((a) => matchesFilters(a, filters))

  if (groupBy === 'recent') {
    const sorted = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return sorted.length ? [{ key: 'recent', label: 'Recently updated', articles: sorted }] : []
  }

  if (groupBy === 'status') {
    const order: Status[] = ['ready', 'drafting', 'idea', 'published']
    const labels: Record<Status, string> = { ready: 'Ready', drafting: 'Drafting', idea: 'Ideas', published: 'Published' }
    return order
      .map((s) => ({
        key: s,
        label: labels[s],
        articles: filtered.filter((a) => a.status === s).sort(planOrder),
      }))
      .filter((g) => g.articles.length > 0)
  }

  // group by phase (default) — empty/missing phase → "unfiled"
  return PHASE_ORDER.map((phase) => ({
    key: phase,
    label: phase,
    articles: filtered.filter((a) => (a.phase || 'unfiled') === phase).sort(planOrder),
  })).filter((g) => g.articles.length > 0)
}

// "Ready to publish" — pinned first, then most recently updated (PRD §4, §5.4).
export function readyQueue(articles: Article[]): Article[] {
  return articles
    .filter((a) => a.status === 'ready')
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
}

// ── Publishing plan — "the next N things I'll publish, and on what day" ────
// Shows every explicitly scheduled piece in date order, then one trailing
// "write next" slot on the next open cadence day. No auto-filling empty dates.
export interface PlanSlot {
  date: string // yyyy-mm-dd
  article: Article | null
  assigned: 'scheduled' | 'auto' | 'open'
}

const dayKey = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function publishingPlan(
  articles: Article[],
  publishDays: number[],
  _count = 10,
  now: Date = new Date(),
): PlanSlot[] {
  const days = publishDays.length ? publishDays : [2, 3, 4]
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Explicitly scheduled, unpublished pieces claim their dates.
  const scheduled = new Map<string, Article>()
  for (const a of articles) {
    if (a.status === 'published' || !a.scheduledFor) continue
    const key = a.scheduledFor.slice(0, 10)
    if (key >= dayKey(today) && !scheduled.has(key)) scheduled.set(key, a)
  }

  // Every scheduled date, sorted, then one trailing open slot for "write next."
  const slotDates = [...scheduled.keys()].sort()
  const anchor = slotDates.length ? slotDates[slotDates.length - 1] : dayKey(today)
  const anchorDate = new Date(anchor + 'T12:00:00')
  for (let i = 1; i <= 60; i++) {
    const d = new Date(anchorDate)
    d.setDate(anchorDate.getDate() + i)
    if (days.includes(d.getDay())) {
      const key = dayKey(d)
      if (!scheduled.has(key)) { slotDates.push(key); break }
    }
  }

  return slotDates.map((date) => {
    const a = scheduled.get(date)
    if (a) return { date, article: a, assigned: 'scheduled' as const }
    return { date, article: null, assigned: 'open' as const }
  })
}

// Config-talk articles in plan order (PRD §5.7).
export function configArticles(articles: Article[]): Article[] {
  return articles.filter((a) => a.configTalk).sort(planOrder)
}
