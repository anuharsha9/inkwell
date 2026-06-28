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

// Config-talk articles in plan order (PRD §5.7).
export function configArticles(articles: Article[]): Article[] {
  return articles.filter((a) => a.configTalk).sort(planOrder)
}
