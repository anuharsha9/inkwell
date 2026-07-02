import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { Icon } from '@/components/Icon'
import { Menu, MenuItem } from '@/components/Menu'
import { MetaPanel } from '@/components/editor/MetaPanel'
import { Coach } from '@/components/editor/Coach'
import { History } from '@/components/editor/History'
import { Markdown } from '@/components/editor/Markdown'
import { useCopyArticle } from '@/components/PublishActions'
import { PLATFORM_META, PLATFORM_ORDER } from '@/lib/constants'
import { localPrivacyScan } from '@/lib/privacy'
import { NumberBadge } from '@/components/ui'

type Pane = 'write' | 'preview' | 'split'

export function Editor() {
  const activeId = useStore((s) => s.activeId)
  const article = useStore((s) => (s.activeId ? s.articles[s.activeId] : undefined))
  const settings = useStore((s) => s.settings)
  const updateArticle = useStore((s) => s.updateArticle)
  const setView = useStore((s) => s.setView)
  const removeArticle = useStore((s) => s.removeArticle)
  const markPublished = useStore((s) => s.markPublished)
  const saveState = useStore((s) => s.saveState)
  const { copyFull, copyBody } = useCopyArticle()

  const [pane, setPane] = useState<Pane>('write')
  const [confirmDel, setConfirmDel] = useState(false)
  // The details panel is collapsible everywhere: open by default on desktop,
  // closed on narrow screens (where it's an overlay drawer). Choice persists.
  const [metaOpen, setMetaOpenState] = useState<boolean>(() => {
    const saved = localStorage.getItem('inkwell:meta-open')
    if (saved !== null) return saved === '1'
    return window.innerWidth > 1000
  })
  const setMetaOpen = (v: boolean | ((o: boolean) => boolean)) => {
    setMetaOpenState((o) => {
      const next = typeof v === 'function' ? v(o) : v
      localStorage.setItem('inkwell:meta-open', next ? '1' : '0')
      return next
    })
  }
  const [coachOpen, setCoachOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [coachTab, setCoachTab] = useState<'improve' | 'checks'>('improve')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Always start at the top when a new article opens.
  useEffect(() => {
    setConfirmDel(false)
  }, [activeId])

  // The writing canvas grows with the text — no inner scrollbar, no dead zone
  // below a cut-off box; the page itself scrolls.
  useLayoutEffect(() => {
    const ta = bodyRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [article?.body, pane, activeId])

  if (!activeId || !article) {
    return (
      <div className="page">
        <button className="btn btn-ghost" onClick={() => setView('archive')}>
          <Icon name="arrowLeft" size={16} /> Back to Archive
        </button>
      </div>
    )
  }

  // Insert an image snippet at the textarea cursor (PRD §5.5 inline images).
  function insertAtCursor(snippet: string) {
    const ta = bodyRef.current
    const current = article!.body
    if (!ta) {
      updateArticle(article!.id, { body: current + snippet })
      return
    }
    const start = ta.selectionStart ?? current.length
    const end = ta.selectionEnd ?? current.length
    const next = current.slice(0, start) + snippet + current.slice(end)
    updateArticle(article!.id, { body: next })
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + snippet.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const targets = article.platforms.length ? article.platforms : PLATFORM_ORDER
  const privacyCount = localPrivacyScan(article.body, settings.privacyTerms).length

  function openCoach(tab: 'improve' | 'checks') {
    setCoachTab(tab)
    setHistoryOpen(false)
    setCoachOpen(true)
  }

  return (
    <div className="editor">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="editor-bar">
        <div className="editor-bar-left">
          <button className="icon-btn" onClick={() => setView('archive')} title="Back to Archive" aria-label="Back to Archive">
            <Icon name="arrowLeft" size={18} />
          </button>
          <NumberBadge number={article.number} />
          <SaveIndicator state={saveState} />
          <button
            className={`privacy-pill ${privacyCount > 0 ? 'flag' : 'clean'}`}
            onClick={() => openCoach('checks')}
            title={privacyCount > 0 ? `${privacyCount} possible private detail(s) — review before publishing` : 'No private details detected'}
          >
            <Icon name="shield" size={14} />
            {privacyCount > 0 ? privacyCount : 'Private-safe'}
          </button>
        </div>

        <div className="editor-bar-right">
          <div className="segmented">
            <button className={pane === 'write' ? 'active' : ''} onClick={() => setPane('write')}>
              <Icon name="pen" size={14} /> Write
            </button>
            <button className={pane === 'preview' ? 'active' : ''} onClick={() => setPane('preview')}>
              <Icon name="eye" size={14} /> Preview
            </button>
            <button className={`split-only ${pane === 'split' ? 'active' : ''}`} onClick={() => setPane('split')}>
              Split
            </button>
          </div>

          <button
            className="icon-btn"
            onClick={() => (historyOpen ? setHistoryOpen(false) : (setCoachOpen(false), setHistoryOpen(true)))}
            title="Version history"
            aria-label="Version history"
          >
            <Icon name="reroll" size={18} />
          </button>

          <button
            className={`btn ${coachOpen ? 'btn-primary' : 'btn-soft'}`}
            onClick={() => (coachOpen ? setCoachOpen(false) : openCoach('improve'))}
            title="Writing Coach"
            data-tour="coach-btn"
          >
            <Icon name="spark" size={15} /> Coach
          </button>

          <button className="btn btn-primary" onClick={() => void copyFull(article)}>
            <Icon name="copy" size={15} /> Copy article
          </button>

          <Menu
            align="right"
            width={210}
            trigger={(_o, t) => (
              <button className="icon-btn" onClick={t} aria-label="More actions">
                <Icon name="dots" size={18} />
              </button>
            )}
            children={(close) => (
              <>
                <MenuItem onClick={() => (copyBody(article), close())}>
                  <Icon name="copy" size={14} /> Copy body only
                </MenuItem>
                <div className="menu-sep" />
                <div className="menu-cap">Open composer</div>
                {targets.map((p) => (
                  <MenuItem
                    key={p}
                    onClick={() => {
                      const url =
                        p === 'substack' ? settings.substackUrl.trim() || PLATFORM_META.substack.newPost : PLATFORM_META[p].newPost
                      window.open(url, '_blank', 'noopener')
                      close()
                    }}
                  >
                    <Icon name="external" size={14} /> {PLATFORM_META[p].label}
                  </MenuItem>
                ))}
                <div className="menu-sep" />
                <MenuItem
                  onClick={() => {
                    markPublished(article.id)
                    close()
                  }}
                >
                  <Icon name="check" size={14} strokeWidth={2} /> Mark as published
                </MenuItem>
                <MenuItem danger onClick={() => (setConfirmDel(true), close())}>
                  <Icon name="trash" size={14} /> Delete article
                </MenuItem>
              </>
            )}
          />

          <button className="icon-btn meta-toggle" onClick={() => setMetaOpen((o) => !o)} aria-label="Toggle details">
            <Icon name="settings" size={18} />
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <div className={`editor-grid ${metaOpen ? 'meta-open' : ''}`}>
        <div className="editor-main">
          <div className={`compose pane-${pane}`}>
            {(pane === 'write' || pane === 'split') && (
              <div className="compose-write">
                <input
                  className="title-input"
                  value={article.title}
                  placeholder="Title"
                  onChange={(e) => updateArticle(article.id, { title: e.target.value })}
                />
                <input
                  className="hook-input"
                  value={article.hook}
                  placeholder="The hook — your editorial angle in one line"
                  onChange={(e) => updateArticle(article.id, { hook: e.target.value })}
                />
                <textarea
                  ref={bodyRef}
                  className="body-input"
                  value={article.body}
                  placeholder="Start writing. Markdown welcome. Everything autosaves — you can't lose this."
                  onChange={(e) => updateArticle(article.id, { body: e.target.value })}
                  spellCheck
                />
              </div>
            )}
            {(pane === 'preview' || pane === 'split') && (
              <div className="compose-preview">
                <h1 className="preview-title">{article.title || 'Untitled'}</h1>
                {article.hook && <p className="preview-hook">{article.hook}</p>}
                <Markdown body={article.body} />
              </div>
            )}
          </div>

          <div className="editor-foot">
            <span className="wc-big">{article.wordCount.toLocaleString()} words</span>
            <span className="foot-sep">·</span>
            <span>{readingTime(article.wordCount)}</span>
          </div>
        </div>

        <MetaPanel article={article} onInsert={insertAtCursor} />
      </div>

      {coachOpen && (
        <>
          <div className="coach-scrim" onClick={() => setCoachOpen(false)} />
          <Coach key={coachTab} article={article} onClose={() => setCoachOpen(false)} initialTab={coachTab} />
        </>
      )}

      {historyOpen && (
        <>
          <div className="coach-scrim" onClick={() => setHistoryOpen(false)} />
          <History article={article} onClose={() => setHistoryOpen(false)} />
        </>
      )}

      {/* ── Delete confirm ────────────────────────────────────────── */}
      {confirmDel && (
        <div className="modal-scrim" onClick={() => setConfirmDel(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this article?</h3>
            <p>“{article.title || 'Untitled'}” and its images will be removed. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(false)}>
                Keep it
              </button>
              <button className="btn btn-danger" onClick={() => void removeArticle(article.id)}>
                <Icon name="trash" size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  return (
    <span className={`save-ind ${state}`}>
      {state === 'saving' ? (
        <>
          <span className="save-dot" /> Saving…
        </>
      ) : state === 'saved' ? (
        <>
          <Icon name="check" size={13} strokeWidth={2.2} /> Saved
        </>
      ) : (
        <>
          <Icon name="check" size={13} strokeWidth={2.2} /> Autosave on
        </>
      )}
    </span>
  )
}

function readingTime(words: number): string {
  const min = Math.max(1, Math.round(words / 225))
  return `${min} min read`
}
