import { useStore, type GroupBy } from '@/store'
import { groupArticles } from '@/lib/selectors'
import { PHASE_META } from '@/lib/constants'
import type { Phase } from '@/types'
import { ArticleCard } from '@/components/ArticleCard'
import { FilterBar } from '@/components/FilterBar'
import { Icon } from '@/components/Icon'

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'phase', label: 'Phase' },
  { value: 'status', label: 'Status' },
  { value: 'recent', label: 'Recent' },
]

const PHASE_KEYS = new Set(['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'unfiled'])

export function Archive() {
  const articles = useStore((s) => s.articles)
  const groupBy = useStore((s) => s.groupBy)
  const setGroupBy = useStore((s) => s.setGroupBy)
  const filters = useStore((s) => s.filters)
  const createArticle = useStore((s) => s.createArticle)

  const groups = groupArticles(Object.values(articles), groupBy, filters)
  const totalShown = groups.reduce((n, g) => n + g.articles.length, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">The Archive</h1>
          <div className="page-sub">Your full inventory — write ahead, publish on a whim.</div>
        </div>
        <div className="head-actions">
          <div className="segmented">
            {GROUP_OPTIONS.map((o) => (
              <button key={o.value} className={groupBy === o.value ? 'active' : ''} onClick={() => setGroupBy(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => createArticle()}>
            <Icon name="plus" size={16} strokeWidth={2} /> New
          </button>
        </div>
      </div>

      <FilterBar />

      {totalShown === 0 ? (
        <div className="empty">
          <div className="glyph">
            <Icon name="search" size={24} />
          </div>
          <h3>Nothing matches</h3>
          <p>No articles fit these filters. Loosen them, or start something new — the blank page is yours.</p>
        </div>
      ) : (
        <div className="groups">
          {groups.map((g) => {
            const isPhase = groupBy === 'phase' && PHASE_KEYS.has(g.key)
            const meta = isPhase ? PHASE_META[g.key as Phase] : null
            return (
              <section className="group" key={g.key}>
                <header className="group-head">
                  {meta ? (
                    <>
                      <span className="group-roman">{meta.roman}</span>
                      <div className="group-titles">
                        <h2 className="group-title">{meta.title}</h2>
                        <span className="group-sub">{meta.subtitle}</span>
                      </div>
                    </>
                  ) : (
                    <h2 className="group-title plain">{g.label}</h2>
                  )}
                  <span className="group-count">{g.articles.length}</span>
                </header>
                <div className="card-grid">
                  {g.articles.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
