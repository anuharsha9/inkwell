import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { activeSources, SOURCE_KIND_LABEL, type SourceKind, type Suggestion, type Source } from '@/data/sources'
import { Icon } from '@/components/Icon'
import { TagList, useToast } from '@/components/ui'

const KINDS: (SourceKind | 'all')[] = ['all', 'casestudy', 'app', 'career', 'writing']

export function Sources() {
  const articles = useStore((s) => s.articles)
  const createIdeaFrom = useStore((s) => s.createIdeaFrom)
  const push = useToast((s) => s.push)
  const [kind, setKind] = useState<SourceKind | 'all'>('all')

  // Titles already in the archive — so we never offer a duplicate.
  const existingTitles = useMemo(
    () => new Set(Object.values(articles).map((a) => a.title.trim().toLowerCase())),
    [articles],
  )

  const all = activeSources()
  const shown = kind === 'all' ? all : all.filter((s) => s.kind === kind)

  function add(source: Source, sg: Suggestion, open: boolean) {
    const id = createIdeaFrom(
      {
        title: sg.title,
        hook: sg.hook,
        tags: sg.tags,
        notes: `Source: ${source.name}${source.meta ? ` — ${source.meta}` : ''}`,
      },
      { open },
    )
    if (!open) push(`Added “${sg.title}” to the Archive`)
    return id
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Source Material</h1>
          <div className="page-sub">Ideas pulled from your real work. Add any to the Archive as a fresh idea.</div>
        </div>
      </div>

      <div className="filterbar">
        {KINDS.map((k) => (
          <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {k === 'all' ? 'All sources' : SOURCE_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="source-grid">
        {shown.map((source) => (
          <section className="source-card" key={source.id}>
            <header className="source-head">
              <span className={`source-kind k-${source.kind}`}>{SOURCE_KIND_LABEL[source.kind]}</span>
              <h2 className="source-name">{source.name}</h2>
              {source.meta && <span className="source-meta">{source.meta}</span>}
              <p className="source-blurb">{source.blurb}</p>
            </header>

            <div className="suggestions">
              {source.suggestions.map((sg) => {
                const exists = existingTitles.has(sg.title.trim().toLowerCase())
                return (
                  <div className={`suggestion ${exists ? 'used' : ''}`} key={sg.title}>
                    <div className="suggestion-body">
                      <h3 className="suggestion-title">{sg.title}</h3>
                      <p className="suggestion-hook">{sg.hook}</p>
                      <TagList tags={sg.tags} />
                    </div>
                    <div className="suggestion-actions">
                      {exists ? (
                        <span className="used-flag">
                          <Icon name="check" size={14} strokeWidth={2.2} /> In archive
                        </span>
                      ) : (
                        <>
                          <button className="mini-btn add" onClick={() => add(source, sg, false)} title="Add to Archive">
                            <Icon name="plus" size={14} strokeWidth={2} /> Add
                          </button>
                          <button
                            className="mini-btn"
                            onClick={() => add(source, sg, true)}
                            title="Add and open in editor"
                          >
                            <Icon name="pen" size={13} /> Write
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
