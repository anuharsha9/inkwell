import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { activeSources, SOURCE_KIND_LABEL, type SourceKind, type Suggestion, type Source } from '@/data/sources'
import { Icon } from '@/components/Icon'
import { TagList, useToast } from '@/components/ui'

const KINDS: (SourceKind | 'all')[] = ['all', 'casestudy', 'app', 'career', 'writing']

export function Sources() {
  const articles = useStore((s) => s.articles)
  const createIdeaFrom = useStore((s) => s.createIdeaFrom)
  const customSources = useStore((s) => s.customSources)
  const removeSource = useStore((s) => s.removeSource)
  const push = useToast((s) => s.push)
  const [kind, setKind] = useState<SourceKind | 'all'>('all')
  const [adding, setAdding] = useState(false)

  // Titles already in the archive — so we never offer a duplicate.
  const existingTitles = useMemo(
    () => new Set(Object.values(articles).map((a) => a.title.trim().toLowerCase())),
    [articles],
  )

  // Her own sources lead; the built-in ones follow.
  const all = [...customSources, ...activeSources()]
  const shown = kind === 'all' ? all : all.filter((s) => s.kind === kind)

  function add(source: Source, sg: Suggestion, open: boolean) {
    // Transcript sources carry a slug so the draft step can load the real
    // discussion + her voice corpus; other sources keep the human-readable note.
    const notes =
      source.kind === 'transcript' && source.slug
        ? `Transcript: ${source.slug}`
        : `Source: ${source.name}${source.meta ? ` — ${source.meta}` : ''}`
    const id = createIdeaFrom(
      {
        title: sg.title,
        hook: sg.hook,
        tags: sg.tags,
        notes,
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
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setAdding((a) => !a)}>
            <Icon name="plus" size={16} strokeWidth={2} /> Add source
          </button>
        </div>
      </div>

      {adding && <AddSourceForm onDone={() => setAdding(false)} />}

      <div className="filterbar">
        {KINDS.map((k) => (
          <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {k === 'all' ? 'All sources' : SOURCE_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="source-grid">
        {shown.map((source) => {
          const isCustom = source.id.startsWith('custom-')
          return (
            <section className="source-card" key={source.id}>
              <header className="source-head">
                <span className={`source-kind k-${source.kind}`}>{SOURCE_KIND_LABEL[source.kind]}</span>
                <h2 className="source-name">{source.name}</h2>
                {source.meta && <span className="source-meta">{source.meta}</span>}
                {source.blurb && <p className="source-blurb">{source.blurb}</p>}
                {isCustom && (
                  <button
                    className="icon-btn sm source-remove"
                    onClick={() => removeSource(source.id)}
                    aria-label={`Remove ${source.name}`}
                    title="Remove this source"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </header>

              <div className="suggestions">
                {source.suggestions.map((sg, i) => {
                  const exists = existingTitles.has(sg.title.trim().toLowerCase())
                  return (
                    <div className={`suggestion ${exists ? 'used' : ''}`} key={`${sg.title}-${i}`}>
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
                {isCustom && <AddAngleForm sourceId={source.id} />}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

// ── Add a new source (name + kind + where-it-lives) ────────────────────────
function AddSourceForm({ onDone }: { onDone: () => void }) {
  const addSource = useStore((s) => s.addSource)
  const push = useToast((s) => s.push)
  const [name, setName] = useState('')
  const [srcKind, setSrcKind] = useState<SourceKind>('writing')
  const [meta, setMeta] = useState('')
  const [blurb, setBlurb] = useState('')

  function save() {
    if (!name.trim()) return
    addSource({ kind: srcKind, name: name.trim(), meta: meta.trim() || undefined, blurb: blurb.trim() })
    push(`Added source “${name.trim()}”`)
    onDone()
  }

  return (
    <div className="source-form">
      <div className="source-form-row">
        <input
          autoFocus
          placeholder="Source name — a doc, a project, a memory…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <select value={srcKind} onChange={(e) => setSrcKind(e.target.value as SourceKind)}>
          {(Object.keys(SOURCE_KIND_LABEL) as SourceKind[]).map((k) => (
            <option key={k} value={k}>
              {SOURCE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <input placeholder="Where it lives (optional) — a path, a link, a note" value={meta} onChange={(e) => setMeta(e.target.value)} />
      <textarea
        rows={2}
        placeholder="What it is, in a line or two (optional)"
        value={blurb}
        onChange={(e) => setBlurb(e.target.value)}
      />
      <div className="source-form-actions">
        <button className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>
          <Icon name="check" size={15} strokeWidth={2} /> Save source
        </button>
      </div>
    </div>
  )
}

// ── Add an article angle to a custom source ────────────────────────────────
function AddAngleForm({ sourceId }: { sourceId: string }) {
  const addSourceSuggestion = useStore((s) => s.addSourceSuggestion)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [hook, setHook] = useState('')

  function save() {
    if (!title.trim()) return
    addSourceSuggestion(sourceId, { title: title.trim(), hook: hook.trim(), tags: [] })
    setTitle('')
    setHook('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="angle-add" onClick={() => setOpen(true)}>
        <Icon name="plus" size={13} strokeWidth={2} /> Add an angle
      </button>
    )
  }

  return (
    <div className="angle-form">
      <input
        autoFocus
        placeholder="Article title / angle"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <input
        placeholder="The hook — the one-line editorial angle (optional)"
        value={hook}
        onChange={(e) => setHook(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <div className="source-form-actions">
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="btn btn-soft" disabled={!title.trim()} onClick={save}>
          Save angle
        </button>
      </div>
    </div>
  )
}
