import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/store'
import { Icon } from '@/components/Icon'
import { Menu, MenuItem } from '@/components/Menu'
import { MetaPanel } from '@/components/editor/MetaPanel'
import { Coach } from '@/components/editor/Coach'
import { History } from '@/components/editor/History'
import { useCopyArticle } from '@/components/PublishActions'
import { PLATFORM_META, PLATFORM_ORDER } from '@/lib/constants'
import { localPrivacyScan } from '@/lib/privacy'
import { NumberBadge } from '@/components/ui'

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
  // Focus mode — hides all chrome (rail, panels, bar) for a distraction-free page.
  const [focus, setFocus] = useState(false)
  const [writingFont, setWritingFontState] = useState<string>(() =>
    localStorage.getItem('inkwell:writing-font') || 'serif'
  )
  const setWritingFont = (f: string) => {
    setWritingFontState(f)
    localStorage.setItem('inkwell:writing-font', f)
  }
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Words written in this sitting — captured when a piece opens, so it counts
  // up as she writes (and resets when she switches to a different piece).
  const sessionBase = useRef<{ id: string; words: number }>({ id: '', words: 0 })
  if (article && sessionBase.current.id !== article.id) {
    sessionBase.current = { id: article.id, words: article.wordCount }
  }
  const sessionWords = Math.max(0, (article?.wordCount ?? 0) - sessionBase.current.words)

  // Always start at the top when a new article opens.
  useEffect(() => {
    setConfirmDel(false)
  }, [activeId])

  // Focus mode toggles a body class (hides the nav rail / tab bar) and listens
  // for Escape to leave. Cleaned up on unmount so chrome never gets stuck hidden.
  useEffect(() => {
    document.body.classList.toggle('focus-mode', focus)
    return () => document.body.classList.remove('focus-mode')
  }, [focus])
  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  useLayoutEffect(() => {
    const ta = bodyRef.current
    if (!ta) return
    const scrollers: [Element, number][] = []
    let el: Element | null = ta
    while ((el = el.parentElement)) {
      if (el.scrollTop > 0) scrollers.push([el, el.scrollTop])
    }
    const wy = window.scrollY
    ta.style.height = '0'
    ta.style.height = `${ta.scrollHeight}px`
    for (const [s, t] of scrollers) s.scrollTop = t
    window.scrollTo(0, wy)
  }, [article?.body, activeId])

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

  function wrapSelection(before: string, after: string) {
    const ta = bodyRef.current
    if (!ta) return
    const body = article!.body
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end)
    const replacement = selected ? `${before}${selected}${after}` : `${before}text${after}`
    const next = body.slice(0, start) + replacement + body.slice(end)
    updateArticle(article!.id, { body: next })
    requestAnimationFrame(() => {
      ta.focus()
      const selStart = start + before.length
      const selEnd = selected ? selStart + selected.length : selStart + 4
      ta.setSelectionRange(selStart, selEnd)
    })
  }

  function prefixLine(marker: string) {
    const ta = bodyRef.current
    if (!ta) return
    const body = article!.body
    const start = ta.selectionStart
    const lineStart = body.lastIndexOf('\n', start - 1) + 1
    const next = body.slice(0, lineStart) + marker + body.slice(lineStart)
    updateArticle(article!.id, { body: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + marker.length, start + marker.length)
    })
  }

  function insertBlock(text: string) {
    const ta = bodyRef.current
    if (!ta) return
    const body = article!.body
    const start = ta.selectionStart
    const pad = start > 0 && body[start - 1] !== '\n' ? '\n' : ''
    const next = body.slice(0, start) + pad + text + body.slice(start)
    updateArticle(article!.id, { body: next })
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + pad.length + text.length
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
    <div className={`editor ${focus ? 'focus-mode' : ''} ${coachOpen || historyOpen ? 'drawer-open' : ''}`}>
      {/* Distraction-free: a quiet way back out when all chrome is hidden. */}
      {focus && (
        <button className="focus-exit" onClick={() => setFocus(false)} title="Leave focus mode (Esc)">
          <Icon name="compress" size={16} /> <span>Esc</span>
        </button>
      )}
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="editor-bar">
        <div className="editor-bar-left">
          <button className="icon-btn" onClick={() => setView('archive')} title="Back to Archive" aria-label="Back to Archive">
            <Icon name="arrowLeft" size={18} />
          </button>
          <NumberBadge number={article.number} />
          <SaveIndicator state={saveState} />
          {privacyCount > 0 && (
            <button
              className="privacy-pill flag"
              onClick={() => openCoach('checks')}
              title={`${privacyCount} possible private detail(s) — review before publishing`}
            >
              <Icon name="shield" size={14} /> {privacyCount}
            </button>
          )}
        </div>

        <div className="editor-bar-right">
          <button className="icon-btn" onClick={() => setFocus(true)} title="Focus mode — hide everything but the page">
            <Icon name="focus" size={18} />
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
                <MenuItem onClick={() => (setCoachOpen(false), setHistoryOpen(true), close())}>
                  <Icon name="reroll" size={14} /> Version history
                </MenuItem>
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
          <div className="compose">
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
              <div className="format-bar">
                <button className="fmt-btn fmt-bold" title="Bold (⌘B)" onMouseDown={(e) => { e.preventDefault(); wrapSelection('**', '**') }}>B</button>
                <button className="fmt-btn fmt-italic" title="Italic (⌘I)" onMouseDown={(e) => { e.preventDefault(); wrapSelection('*', '*') }}>I</button>
                <span className="fmt-sep" />
                <button className="fmt-btn" title="Heading" onMouseDown={(e) => { e.preventDefault(); prefixLine('## ') }}>H2</button>
                <button className="fmt-btn" title="Subheading" onMouseDown={(e) => { e.preventDefault(); prefixLine('### ') }}>H3</button>
                <span className="fmt-sep" />
                <button className="fmt-btn" title="Bullet list" onMouseDown={(e) => { e.preventDefault(); prefixLine('- ') }}>
                  <Icon name="sources" size={15} />
                </button>
                <button className="fmt-btn" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); prefixLine('1. ') }}>1.</button>
                <button className="fmt-btn" title="Quote" onMouseDown={(e) => { e.preventDefault(); prefixLine('> ') }}>"</button>
                <span className="fmt-sep" />
                <button className="fmt-btn" title="Link" onMouseDown={(e) => { e.preventDefault(); wrapSelection('[', '](url)') }}>
                  <Icon name="link" size={15} />
                </button>
                <button className="fmt-btn" title="Inline code" onMouseDown={(e) => { e.preventDefault(); wrapSelection('`', '`') }}>&lt;/&gt;</button>
                <button className="fmt-btn" title="Horizontal rule" onMouseDown={(e) => { e.preventDefault(); insertBlock('\n---\n') }}>—</button>
                <span className="fmt-spacer" />
                <div className="font-picker">
                  <button className={`fmt-btn font-opt${writingFont === 'serif' ? ' active' : ''}`} title="Serif (Newsreader)" onMouseDown={(e) => { e.preventDefault(); setWritingFont('serif') }}>
                    <span style={{ fontFamily: 'Newsreader, Georgia, serif' }}>Aa</span>
                  </button>
                  <button className={`fmt-btn font-opt${writingFont === 'sans' ? ' active' : ''}`} title="Sans (Inter)" onMouseDown={(e) => { e.preventDefault(); setWritingFont('sans') }}>
                    <span style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Aa</span>
                  </button>
                  <button className={`fmt-btn font-opt${writingFont === 'mono' ? ' active' : ''}`} title="Mono (IBM Plex Mono)" onMouseDown={(e) => { e.preventDefault(); setWritingFont('mono') }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>Aa</span>
                  </button>
                </div>
              </div>
              <textarea
                ref={bodyRef}
                className={`body-input font-${writingFont}`}
                value={article.body}
                placeholder="Start writing. Markdown welcome. Everything autosaves — you can't lose this."
                onChange={(e) => updateArticle(article.id, { body: e.target.value })}
                onKeyDown={(e) => {
                  if (e.metaKey && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**') }
                  if (e.metaKey && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*') }
                  if (e.metaKey && e.key === 'k') { e.preventDefault(); wrapSelection('[', '](url)') }
                }}
                spellCheck
              />
            </div>
          </div>

          <div className="editor-foot">
            <span className="wc-big">{article.wordCount.toLocaleString()} words</span>
            <span className="foot-sep">·</span>
            <span>{readingTime(article.wordCount)}</span>
            {sessionWords > 0 && (
              <>
                <span className="foot-sep">·</span>
                <SessionRing words={sessionWords} />
              </>
            )}
          </div>
        </div>

        <MetaPanel article={article} onInsert={insertAtCursor} />
      </div>

      {coachOpen && createPortal(
        <>
          <div className="coach-scrim" onClick={() => setCoachOpen(false)} />
          <Coach key={coachTab} article={article} onClose={() => setCoachOpen(false)} initialTab={coachTab} />
        </>,
        document.documentElement
      )}

      {historyOpen && createPortal(
        <>
          <div className="coach-scrim" onClick={() => setHistoryOpen(false)} />
          <History article={article} onClose={() => setHistoryOpen(false)} />
        </>,
        document.documentElement
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

// A quiet ring that fills toward a gentle 500-word sitting — momentum, not a quota.
function SessionRing({ words, goal = 500 }: { words: number; goal?: number }) {
  const r = 7
  const circ = 2 * Math.PI * r
  const pct = Math.min(1, words / goal)
  return (
    <span className="session-ring" title={`${words} words this session`}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r={r} className="ring-track" fill="none" strokeWidth="2" />
        <circle
          cx="9"
          cy="9"
          r={r}
          className="ring-fill"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 9 9)"
        />
      </svg>
      +{words.toLocaleString()} this session
    </span>
  )
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  // Quiet by default — a plain check (tooltip explains). Only "Saving…" and the
  // brief "Saved" confirmation spell it out, so the bar stays calm at rest.
  if (state === 'saving') {
    return (
      <span className="save-ind saving">
        <span className="save-dot" /> Saving…
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="save-ind saved">
        <Icon name="check" size={13} strokeWidth={2.2} /> Saved
      </span>
    )
  }
  return (
    <span className="save-ind idle" title="Autosave is on — you can't lose your work">
      <Icon name="check" size={13} strokeWidth={2.2} />
    </span>
  )
}

function readingTime(words: number): string {
  const min = Math.max(1, Math.round(words / 225))
  return `${min} min read`
}
