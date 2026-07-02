import type { Article, Status } from '@/types'
import type { Filters } from '@/store'
import { PHASE_ORDER } from './constants'

export interface DashboardCounts {
  total: number
  byStatus: Record<Status, number>
  planComplete: number // of 50 plan articles, ready or published
  readyNow: number
}

export function computeCounts(articles: Article[]): DashboardCounts {
  const byStatus: Record<Status, number> = { idea: 0, drafting: 0, ready: 0, published: 0 }
  let planComplete = 0
  for (const a of articles) {
    byStatus[a.status]++
    if (a.number !== null && (a.status === 'ready' || a.status === 'published')) planComplete++
  }
  return { total: articles.length, byStatus, planComplete, readyNow: byStatus.ready }
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

  // group by phase (default)
  return PHASE_ORDER.map((phase) => ({
    key: phase,
    label: phase,
    articles: filtered.filter((a) => a.phase === phase).sort(planOrder),
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
// Slots come from her cadence (publishDays weekdays) plus any explicitly
// scheduled dates. An article with scheduledFor claims its exact date; open
// slots autofill from inventory (ready first — pinned, then plan order — then
// drafting by recency). Deterministic and local; recomputes as things publish.
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
  count = 10,
  now: Date = new Date(),
): PlanSlot[] {
  const days = publishDays.length ? publishDays : [2, 3, 4]
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Explicitly scheduled, unpublished pieces claim their dates (even off-cadence).
  const scheduled = new Map<string, Article>()
  for (const a of articles) {
    if (a.status === 'published' || !a.scheduledFor) continue
    const key = a.scheduledFor.slice(0, 10)
    if (key >= dayKey(today) && !scheduled.has(key)) scheduled.set(key, a)
  }

  // Slot dates = union of the next cadence days and all claimed dates, sorted.
  const dates = new Set<string>(scheduled.keys())
  for (let i = 0; dates.size < count * 3 && i < 120; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (days.includes(d.getDay())) dates.add(dayKey(d))
  }
  const slotDates = [...dates].sort().slice(0, count)

  // Autofill queue: ready (pinned first, then plan order) → drafting (recent first).
  const claimed = new Set([...scheduled.values()].map((a) => a.id))
  const ready = articles
    .filter((a) => a.status === 'ready' && !claimed.has(a.id))
    .sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : planOrder(a, b)))
  const drafting = articles
    .filter((a) => a.status === 'drafting' && !claimed.has(a.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const queue = [...ready, ...drafting]

  return slotDates.map((date) => {
    const claimedArticle = scheduled.get(date)
    if (claimedArticle) return { date, article: claimedArticle, assigned: 'scheduled' as const }
    const next = queue.shift() ?? null
    return { date, article: next, assigned: next ? ('auto' as const) : ('open' as const) }
  })
}

// Config-talk articles in plan order (PRD §5.7).
export function configArticles(articles: Article[]): Article[] {
  return articles.filter((a) => a.configTalk).sort(planOrder)
}
