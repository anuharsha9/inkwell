import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import type { Article } from '@/types'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { Markdown } from './Markdown'
import { copyText } from '@/lib/clipboard'
import { lookupWord, type WordEntry } from '@/lib/dictionary'
import { CATEGORY_LABEL, localPrivacyScan, type PrivacyFinding } from '@/lib/privacy'
import { nearDuplicates, selfOverlap } from '@/lib/plagiarism'
import { MetricsPanel } from '@/components/MetricsPanel'
import {
  coachLesson,
  groundedInsights,
  isAIConfigured,
  isWebSearchAllowed,
  originalityScan,
  privacyScan,
  reviewDraft,
  runQuickAction,
  type QuickAction,
  type Suggestion,
  type SuggestionCategory,
} from '@/lib/ai'

type Tab = 'improve' | 'teach' | 'vocab' | 'checks'

const ACTIONS: { key: QuickAction; label: string; mode: 'replace' | 'append' | 'replaceFirst' }[] = [
  { key: 'improve', label: 'Improve', mode: 'replace' },
  { key: 'tighten', label: 'Tighten', mode: 'replace' },
  { key: 'expand', label: 'Expand', mode: 'replace' },
  { key: 'hook', label: 'Sharpen hook', mode: 'replaceFirst' },
  { key: 'lift', label: 'Lift diction', mode: 'replace' },
  { key: 'continue', label: 'Continue', mode: 'append' },
]

const CAT_LABEL: Record<SuggestionCategory, string> = {
  clarity: 'Clarity',
  voice: 'Voice',
  engagement: 'Engagement',
  correctness: 'Correctness',
}

const TAB_LABEL: Record<Tab, string> = {
  improve: 'Improve',
  teach: 'Teach',
  vocab: 'Vocabulary',
  checks: 'Checks',
}

export function Coach({
  article,
  onClose,
  initialTab = 'improve',
}: {
  article: Article
  onClose: () => void
  initialTab?: Tab
}) {
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const configured = isAIConfigured(settings)
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <aside className="coach">
      <header className="coach-head">
        <div className="coach-title">
          <Icon name="spark" size={17} /> Writing Coach
        </div>
        <button className="icon-btn sm" onClick={onClose} aria-label="Close coach">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="coach-tabs">
        {(['improve', 'teach', 'vocab', 'checks'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Vocabulary, Checks, and Teach run locally (no key); only Improve needs AI */}
      {tab === 'vocab' ? (
        <VocabTab article={article} />
      ) : tab === 'checks' ? (
        <ChecksTab article={article} />
      ) : tab === 'teach' ? (
        <TeachTab article={article} />
      ) : !configured ? (
        <div className="coach-unconfigured">
          <Icon name="spark" size={22} />
          <p>
            Connect Claude and Inkwell becomes a writing partner — it tightens and sharpens drafts in <em>your</em>{' '}
            voice, reviews them like an editor, and teaches you to get better with every piece.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => setView('settings')}>
            Add your key in Settings
          </button>
        </div>
      ) : (
        <ImproveTab article={article} />
      )}
    </aside>
  )
}

// ── Improve ────────────────────────────────────────────────────────────────
function ImproveTab({ article }: { article: Article }) {
  const settings = useStore((s) => s.settings)
  const updateArticle = useStore((s) => s.updateArticle)
  const push = useToast((s) => s.push)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<{ mode: string; label: string; text: string } | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  async function doAction(a: (typeof ACTIONS)[number]) {
    setBusy(a.key)
    setError('')
    setDraft(null)
    try {
      setDraft({ mode: a.mode, label: a.label, text: await runQuickAction(a.key, article, settings) })
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy('')
    }
  }

  async function doReview() {
    setBusy('review')
    setError('')
    setSuggestions(null)
    try {
      const list = await reviewDraft(article, settings)
      setSuggestions(list)
      if (!list.length) push('Nothing to flag — looking clean')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy('')
    }
  }

  function applyDraft() {
    if (!draft) return
    const body = article.body
    if (draft.mode === 'append') {
      const sep = body.trim() ? body.replace(/\s+$/, '') + '\n\n' : ''
      updateArticle(article.id, { body: sep + draft.text })
    } else if (draft.mode === 'replaceFirst') {
      const idx = body.indexOf('\n\n')
      updateArticle(article.id, { body: draft.text + (idx >= 0 ? body.slice(idx) : '') })
    } else {
      updateArticle(article.id, { body: draft.text })
    }
    setDraft(null)
    push('Applied — autosaved')
  }

  function applySuggestion(sg: Suggestion, i: number) {
    if (sg.before && sg.after !== undefined && article.body.includes(sg.before)) {
      updateArticle(article.id, { body: article.body.replace(sg.before, sg.after) })
      push('Applied')
      setSuggestions((prev) => (prev ? prev.filter((_, j) => j !== i) : prev))
    } else if (sg.after) {
      void copyText(sg.after).then(() => push('Copied suggestion'))
    }
  }

  return (
    <div className="coach-body">
      <div className="coach-section-label">Quick actions</div>
      <div className="coach-actions">
        {ACTIONS.map((a) => (
          <button key={a.key} className="coach-action" disabled={!!busy} onClick={() => doAction(a)}>
            {busy === a.key ? <span className="spin" /> : a.label}
          </button>
        ))}
      </div>

      <button className="btn btn-soft btn-block coach-review-btn" disabled={!!busy} onClick={doReview}>
        {busy === 'review' ? (
          <>
            <span className="spin" /> Reading your draft…
          </>
        ) : (
          <>
            <Icon name="eye" size={15} /> Review draft
          </>
        )}
      </button>

      {error && <div className="ai-error">{error}</div>}

      {draft && (
        <div className="coach-draft">
          <div className="coach-draft-head">{draft.label}</div>
          <div className="coach-draft-text">{draft.text}</div>
          <div className="cover-actions">
            <button className="mini-btn add" onClick={applyDraft}>
              <Icon name="check" size={13} strokeWidth={2} />{' '}
              {draft.mode === 'append' ? 'Append' : draft.mode === 'replaceFirst' ? 'Replace opening' : 'Apply'}
            </button>
            <button className="mini-btn" onClick={() => void copyText(draft.text).then(() => push('Copied'))}>
              <Icon name="copy" size={13} /> Copy
            </button>
            <button className="mini-btn" onClick={() => setDraft(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="coach-suggestions">
          <div className="coach-section-label">{suggestions.length} suggestions</div>
          {suggestions.map((sg, i) => (
            <div className="coach-sugg" key={i}>
              <span className={`sugg-cat c-${sg.category}`}>{CAT_LABEL[sg.category]}</span>
              <h4 className="sugg-title">{sg.title}</h4>
              {sg.note && <p className="sugg-note">{sg.note}</p>}
              {sg.before && (
                <div className="sugg-diff">
                  <div className="sugg-before">{sg.before}</div>
                  {sg.after && <div className="sugg-after">{sg.after}</div>}
                </div>
              )}
              <div className="cover-actions">
                {sg.before && article.body.includes(sg.before) ? (
                  <button className="mini-btn add" onClick={() => applySuggestion(sg, i)}>
                    <Icon name="check" size={12} strokeWidth={2} /> Apply
                  </button>
                ) : sg.after ? (
                  <button className="mini-btn" onClick={() => applySuggestion(sg, i)}>
                    <Icon name="copy" size={12} /> Copy fix
                  </button>
                ) : null}
                <button
                  className="mini-btn"
                  onClick={() => setSuggestions((p) => (p ? p.filter((_, j) => j !== i) : p))}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Teach (local metrics first; AI lessons + grounded insights on top) ──────
function TeachTab({ article }: { article: Article }) {
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const configured = isAIConfigured(settings)
  const webAllowed = isWebSearchAllowed(settings)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [lesson, setLesson] = useState('')
  const [insights, setInsights] = useState('')

  async function run(kind: 'lesson' | 'insights') {
    setBusy(kind)
    setError('')
    try {
      if (kind === 'lesson') setLesson(await coachLesson(article, settings))
      else setInsights(await groundedInsights(article, settings))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy('')
    }
  }

  const empty = !article.body.trim()

  return (
    <div className="coach-body">
      {/* Local, no-API analysis — the default insight surface */}
      <div className="coach-section-label">Your numbers — measured on this device</div>
      <MetricsPanel article={article} />

      {/* AI lessons sit on top of the local analysis */}
      <div className="coach-section-label" style={{ marginTop: 20 }}>
        Go deeper with AI
      </div>
      {!configured ? (
        <div className="coach-unconfigured" style={{ padding: '14px 12px' }}>
          <p style={{ fontSize: 13 }}>Add your Claude key for craft lessons and web-sourced insights in your voice.</p>
          <button className="btn btn-soft btn-block" onClick={() => setView('settings')}>
            Add your key
          </button>
        </div>
      ) : (
        <>
          <button className="btn btn-soft btn-block" disabled={!!busy || empty} onClick={() => run('lesson')}>
            {busy === 'lesson' ? (
              <>
                <span className="spin" /> Studying your draft…
              </>
            ) : (
              <>
                <Icon name="pen" size={15} /> Give me a lesson
              </>
            )}
          </button>
          {lesson && (
            <div className="coach-teach-card">
              <Markdown body={lesson} />
            </div>
          )}

          <button
            className="btn btn-soft btn-block"
            style={{ marginTop: 10 }}
            disabled={!!busy || empty || !webAllowed}
            onClick={() => run('insights')}
          >
            {busy === 'insights' ? (
              <>
                <span className="spin" /> Searching craft sources…
              </>
            ) : (
              <>
                <Icon name="sources" size={15} /> Insights from the web
              </>
            )}
          </button>
          {!webAllowed && <p className="coach-hint">Web search is off in Settings → Trust &amp; governance.</p>}
          {insights && (
            <div className="coach-teach-card">
              <Markdown body={insights} />
            </div>
          )}
          {error && <div className="ai-error">{error}</div>}
        </>
      )}
    </div>
  )
}

// ── Vocabulary (real dictionary; no AI key needed) ─────────────────────────
function VocabTab({ article }: { article: Article }) {
  const vocab = useStore((s) => s.vocab)
  const addVocab = useStore((s) => s.addVocab)
  const removeVocab = useStore((s) => s.removeVocab)
  const push = useToast((s) => s.push)
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [entry, setEntry] = useState<WordEntry | null>(null)

  async function go(word?: string) {
    const w = (word ?? term).trim()
    if (!w) return
    setTerm(w)
    setBusy(true)
    setError('')
    setEntry(null)
    try {
      setEntry(await lookupWord(w))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  function save() {
    if (!entry || !entry.senses[0]) return
    addVocab({
      word: entry.word,
      definition: entry.senses[0].definition,
      partOfSpeech: entry.senses[0].partOfSpeech,
      savedAt: new Date().toISOString(),
    })
    push(`Saved “${entry.word}”`)
  }

  const saved = entry && vocab.some((w) => w.word === entry.word)

  return (
    <div className="coach-body">
      <div className="vocab-search">
        <input
          value={term}
          placeholder="Look up a word…"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
        <button className="btn btn-primary" disabled={busy || !term.trim()} onClick={() => go()}>
          {busy ? <span className="spin" /> : <Icon name="search" size={15} />}
        </button>
      </div>
      <p className="coach-hint" style={{ marginTop: 0 }}>
        Real definitions from the dictionary — build a personal word bank to grow your range.
      </p>

      {error && <div className="ai-error">{error}</div>}

      {entry && (
        <div className="vocab-entry">
          <div className="vocab-entry-head">
            <span className="vocab-word">{entry.word}</span>
            {entry.phonetic && <span className="vocab-phon">{entry.phonetic}</span>}
            <button className="mini-btn add" disabled={!!saved} onClick={save} style={{ marginLeft: 'auto' }}>
              {saved ? 'Saved' : '+ Save'}
            </button>
          </div>
          {entry.senses.map((s, i) => (
            <div className="vocab-sense" key={i}>
              <span className="vocab-pos">{s.partOfSpeech}</span>
              <p className="vocab-def">{s.definition}</p>
              {s.example && <p className="vocab-ex">“{s.example}”</p>}
              {s.synonyms.length > 0 && (
                <div className="vocab-syns">
                  {s.synonyms.map((sy) => (
                    <button key={sy} className="vocab-syn" onClick={() => go(sy)}>
                      {sy}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {vocab.length > 0 && (
        <div className="vocab-saved">
          <div className="coach-section-label">My words · {vocab.length}</div>
          {vocab.map((w) => (
            <div className="vocab-saved-row" key={w.word}>
              <button className="vocab-saved-word" onClick={() => go(w.word)}>
                {w.word}
              </button>
              <span className="vocab-saved-def">{w.definition}</span>
              <button className="icon-btn sm" onClick={() => removeVocab(w.word)} aria-label={`Remove ${w.word}`}>
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!entry && vocab.length === 0 && (
        <p className="coach-hint">
          Tip: as you read your draft for “{article.title || 'this piece'}”, look up any word you reach for twice —
          collect a sharper one.
        </p>
      )}
    </div>
  )
}

// ── Checks: privacy/fact-check + originality (local always-on; AI optional) ─
function ChecksTab({ article }: { article: Article }) {
  const settings = useStore((s) => s.settings)
  const updateArticle = useStore((s) => s.updateArticle)
  const allArticles = useStore((s) => s.articles)
  const push = useToast((s) => s.push)
  const configured = isAIConfigured(settings)
  const webAllowed = isWebSearchAllowed(settings)
  const [aiFindings, setAiFindings] = useState<PrivacyFinding[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [didDeep, setDidDeep] = useState(false)
  const [orig, setOrig] = useState('')
  const [origBusy, setOrigBusy] = useState(false)

  const localFindings = useMemo(
    () => localPrivacyScan(article.body, settings.privacyTerms),
    [article.body, settings.privacyTerms],
  )
  const overlaps = useMemo(
    () => selfOverlap(article, Object.values(allArticles)).filter((m) => m.words >= 9),
    [article, allArticles],
  )
  const echoes = useMemo(
    () => nearDuplicates(article, Object.values(allArticles)).filter((e) => e.similarity >= 12),
    [article, allArticles],
  )

  async function checkWeb() {
    setOrigBusy(true)
    setError('')
    try {
      setOrig(await originalityScan(article, settings))
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setOrigBusy(false)
    }
  }
  const fkey = (f: PrivacyFinding) => `${f.category}:${f.text}`
  const all = [...localFindings, ...aiFindings].filter((f, i, arr) => {
    if (dismissed.has(fkey(f))) return false
    return arr.findIndex((g) => fkey(g) === fkey(f)) === i // de-dupe local+ai overlap
  })

  async function deepScan() {
    setBusy(true)
    setError('')
    try {
      setAiFindings(await privacyScan(article, settings))
      setDidDeep(true)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  function apply(f: PrivacyFinding) {
    if (article.body.includes(f.text)) {
      updateArticle(article.id, { body: article.body.replace(f.text, f.suggestion) })
      push(f.suggestion ? 'Replaced' : 'Removed')
    }
    setAiFindings((prev) => prev.filter((g) => fkey(g) !== fkey(f)))
  }

  function dismiss(f: PrivacyFinding) {
    setDismissed((prev) => new Set(prev).add(fkey(f)))
  }

  const empty = !article.body.trim()

  return (
    <div className="coach-body">
      <p className="coach-teach-intro">
        Pre-publish checks — keep nothing private public, and nothing accidentally borrowed. Your rule: generic numbers,
        generic companies.
      </p>

      <div className="coach-section-label">Private &amp; confidential</div>

      {all.length > 0 ? (
        <div className="coach-section-label" style={{ color: 'var(--status-drafting)' }}>
          {all.length} thing{all.length === 1 ? '' : 's'} to check
        </div>
      ) : (
        !empty && (
          <div className="privacy-clean">
            <Icon name="check" size={16} strokeWidth={2.2} />
            {didDeep ? 'Clean — nothing private detected.' : 'No obvious private details. Run a deep scan to be sure.'}
          </div>
        )
      )}

      {all.map((f, i) => (
        <div className="coach-sugg privacy-finding" key={i}>
          <span className={`sugg-cat priv-${f.category}`}>{CATEGORY_LABEL[f.category]}</span>
          {f.source === 'ai' && <span className="priv-ai">AI</span>}
          <div className="privacy-found">{f.text}</div>
          <p className="sugg-note">{f.note}</p>
          <div className="cover-actions">
            {article.body.includes(f.text) && (
              <button className="mini-btn add" onClick={() => apply(f)}>
                <Icon name="check" size={12} strokeWidth={2} />{' '}
                {f.suggestion ? `→ ${f.suggestion}` : 'Remove'}
              </button>
            )}
            <button className="mini-btn" onClick={() => dismiss(f)}>
              Keep it
            </button>
          </div>
        </div>
      ))}

      <button
        className="btn btn-soft btn-block"
        style={{ marginTop: 14 }}
        disabled={busy || empty || !configured}
        onClick={deepScan}
      >
        {busy ? (
          <>
            <span className="spin" /> Deep-scanning…
          </>
        ) : (
          <>
            <Icon name="search" size={15} /> Deep scan with AI
          </>
        )}
      </button>
      {!configured && <p className="coach-hint">Add your Claude key in Settings for the AI deep scan. The basic scan runs without it.</p>}
      {empty && <p className="coach-hint">Nothing to check yet — write something first.</p>}

      {/* ── Originality / plagiarism ── */}
      <div className="coach-section-label" style={{ marginTop: 24 }}>
        Originality
      </div>
      {overlaps.length > 0 ? (
        <>
          <p className="coach-hint" style={{ marginTop: 0, marginBottom: 10 }}>
            You've used these lines in other pieces — vary them so each article stays fresh.
          </p>
          {overlaps.slice(0, 6).map((m, i) => (
            <div className="coach-sugg" key={i}>
              <span className="sugg-cat" style={{ ['--c' as string]: 'var(--accent)' }}>
                Also in
              </span>
              <h4 className="sugg-title">{m.otherTitle}</h4>
              <div className="privacy-found">“{m.text}”</div>
            </div>
          ))}
        </>
      ) : (
        !empty &&
        echoes.length === 0 && (
          <div className="privacy-clean">
            <Icon name="check" size={16} strokeWidth={2.2} /> No repeated passages across your other articles.
          </div>
        )
      )}

      {echoes.length > 0 && (
        <>
          <p className="coach-hint" style={{ marginTop: overlaps.length ? 14 : 0, marginBottom: 10 }}>
            Similar phrasing to other pieces (reworded, not verbatim) — worth a fresh angle.
          </p>
          {echoes.slice(0, 4).map((e, i) => (
            <div className="coach-sugg" key={i}>
              <span className="sugg-cat" style={{ ['--c' as string]: 'var(--accent)' }}>
                {e.similarity}% echo
              </span>
              <h4 className="sugg-title">{e.otherTitle}</h4>
              <div className="privacy-found">“…{e.sample}…”</div>
            </div>
          ))}
        </>
      )}

      <button
        className="btn btn-soft btn-block"
        style={{ marginTop: 12 }}
        disabled={origBusy || empty || !configured || !webAllowed}
        onClick={checkWeb}
      >
        {origBusy ? (
          <>
            <span className="spin" /> Checking the web…
          </>
        ) : (
          <>
            <Icon name="search" size={15} /> Check the web for matches
          </>
        )}
      </button>
      {!webAllowed && <p className="coach-hint">Web search is off in Settings → Trust &amp; governance.</p>}
      {orig && (
        <div className="coach-teach-card">
          <Markdown body={orig} />
        </div>
      )}

      {error && <div className="ai-error">{error}</div>}
    </div>
  )
}

function errMsg(e: unknown): string {
  if (e instanceof Error) {
    if (/401|authentication/i.test(e.message)) return 'That API key was rejected. Check it in Settings.'
    if (/429|rate/i.test(e.message)) return 'Rate limited — give it a moment and try again.'
    return e.message
  }
  return 'Something went wrong. Try again.'
}
