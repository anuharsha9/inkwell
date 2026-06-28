import { useState } from 'react'
import { useStore } from '@/store'
import { readyQueue } from '@/lib/selectors'
import { Dashboard } from '@/components/Dashboard'
import { ReadyCards } from '@/components/ReadyCards'
import { Icon } from '@/components/Icon'
import { Markdown } from '@/components/editor/Markdown'
import { useToast } from '@/components/ui'
import { corpusInsight, isAIConfigured, isAIDisabledByGovernance } from '@/lib/ai'
import { analyze } from '@/lib/textmetrics'
import { activeSources } from '@/data/sources'

export function Home() {
  const articles = useStore((s) => s.articles)
  const setView = useStore((s) => s.setView)
  const list = Object.values(articles)
  const queue = readyQueue(list)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Home</h1>
          <div className="page-sub">Your studio at a glance — what's ready, what to write, where you're growing.</div>
        </div>
        <button className="btn btn-primary" onClick={() => useStore.getState().createArticle()}>
          <Icon name="plus" size={16} strokeWidth={2} /> New
        </button>
      </div>

      <Dashboard />

      <Momentum />

      <div className="home-grid">
        {/* Ready to publish — the command-center centerpiece */}
        <section className="home-section span-2">
          <div className="home-section-head">
            <h2 className="home-section-title">
              <Icon name="queue" size={18} /> Ready to publish
            </h2>
            <span className="home-count">{queue.length}</span>
          </div>
          {queue.length > 0 ? (
            <ReadyCards queue={queue} />
          ) : (
            <div className="home-empty">
              <p>Nothing's marked ready yet. Draft something, flip it to ready, and it'll wait here for the urge to post.</p>
              <button className="btn btn-soft" onClick={() => setView('archive')}>
                <Icon name="archive" size={15} /> Go to the Archive
              </button>
            </div>
          )}
        </section>

        <InsightCard />
        <SuggestionsCard />
      </div>
    </>
  )
}

// ── AI writing insight / teaching moment ───────────────────────────────────
function InsightCard() {
  const settings = useStore((s) => s.settings)
  const articles = useStore((s) => s.articles)
  const setView = useStore((s) => s.setView)
  const [insight, setInsight] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const configured = isAIConfigured(settings)
  const disabled = isAIDisabledByGovernance(settings)

  async function run() {
    setBusy(true)
    setError('')
    try {
      const samples = Object.values(articles)
        .map((a) => a.body.trim())
        .filter((b) => b.split(/\s+/).length >= 40)
        .slice(0, 8)
      if (!samples.length) {
        setInsight('')
        setError('Write a little first — I learn from your real pages.')
        return
      }
      setInsight(await corpusInsight(samples, settings))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate an insight right now.')
    } finally {
      setBusy(false)
    }
  }

  // Local corpus stats — computed on-device, no API.
  const written = Object.values(articles)
    .map((a) => a.body)
    .filter((b) => b.trim().split(/\s+/).length >= 40)
  const metrics = written.map((b) => analyze(b)).filter(Boolean) as NonNullable<ReturnType<typeof analyze>>[]
  const pieces = metrics.length
  const totalWords = metrics.reduce((s, m) => s + m.words, 0)
  const avgEase = pieces ? Math.round(metrics.reduce((s, m) => s + m.readingEase, 0) / pieces) : 0
  const avgRhythm = pieces ? Math.round((metrics.reduce((s, m) => s + m.rhythm, 0) / pieces) * 10) / 10 : 0

  return (
    <section className="home-section">
      <div className="home-section-head">
        <h2 className="home-section-title">
          <Icon name="spark" size={17} /> Writing insight
        </h2>
      </div>

      {pieces > 0 ? (
        <div className="home-stats">
          <div className="home-stat">
            <span className="num">{totalWords.toLocaleString()}</span>
            <span className="lbl">words written</span>
          </div>
          <div className="home-stat">
            <span className="num">{avgEase}</span>
            <span className="lbl">avg reading ease</span>
          </div>
          <div className="home-stat">
            <span className="num">±{avgRhythm}</span>
            <span className="lbl">sentence variety</span>
          </div>
        </div>
      ) : (
        <p className="home-insight-hint">Write a few pieces and your patterns surface here — measured on this device, no AI.</p>
      )}

      {insight && (
        <div className="home-insight" style={{ marginTop: 12 }}>
          <Markdown body={insight} />
        </div>
      )}
      {error && <div className="ai-error" style={{ marginTop: 10 }}>{error}</div>}

      {configured ? (
        <button className="btn btn-soft btn-block" style={{ marginTop: 12 }} disabled={busy} onClick={run}>
          {busy ? (
            <>
              <span className="spin" /> Reading your writing…
            </>
          ) : (
            <>
              <Icon name="pen" size={15} /> {insight ? 'Another AI insight' : 'AI teaching moment'}
            </>
          )}
        </button>
      ) : (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setView('settings')}>
          {disabled ? 'AI is off — manage in Settings' : 'Add Claude for AI lessons'}
        </button>
      )}
    </section>
  )
}

// ── Momentum (calm motivation — rewards the practice, never nags) ──────────
function Momentum() {
  const articles = useStore((s) => s.articles)
  const setView = useStore((s) => s.setView)
  const list = Object.values(articles)

  // Days she actually wrote (a bodied article updated that day).
  const days = new Set(
    list.filter((a) => a.body.trim()).map((a) => new Date(a.updatedAt).toISOString().slice(0, 10)),
  )
  let streak = 0
  const d = new Date()
  // allow today or yesterday to start the streak
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  const weekAgo = Date.now() - 7 * 86400000
  const weekWords = list
    .filter((a) => a.body.trim() && new Date(a.updatedAt).getTime() >= weekAgo)
    .reduce((s, a) => s + a.wordCount, 0)
  const published = list.filter((a) => a.status === 'published').length

  return (
    <button className="momentum" onClick={() => setView('craft')} title="Open Writing Craft">
      <div className="momentum-stat">
        <Icon name="spark" size={16} />
        <span className="m-num">{streak}</span>
        <span className="m-lbl">day{streak === 1 ? '' : 's'} writing</span>
      </div>
      <div className="momentum-stat">
        <span className="m-num">{weekWords.toLocaleString()}</span>
        <span className="m-lbl">words this week</span>
      </div>
      <div className="momentum-stat">
        <span className="m-num">{published}</span>
        <span className="m-lbl">published</span>
      </div>
      <span className="momentum-link">
        Your craft <Icon name="chevron" size={14} />
      </span>
    </button>
  )
}

// ── Suggested articles (from her real source material) ─────────────────────
function SuggestionsCard() {
  const articles = useStore((s) => s.articles)
  const createIdeaFrom = useStore((s) => s.createIdeaFrom)
  const setView = useStore((s) => s.setView)
  const push = useToast((s) => s.push)

  const existing = new Set(Object.values(articles).map((a) => a.title.trim().toLowerCase()))
  const suggestions = activeSources().flatMap((src) => src.suggestions.map((sg) => ({ src, sg })))
    .filter(({ sg }) => !existing.has(sg.title.trim().toLowerCase()))
    .slice(0, 3)

  return (
    <section className="home-section">
      <div className="home-section-head">
        <h2 className="home-section-title">
          <Icon name="sources" size={17} /> Write next
        </h2>
        <button className="home-link" onClick={() => setView('sources')}>
          All sources
        </button>
      </div>
      {suggestions.length === 0 ? (
        <p className="home-insight-hint">You've pulled in every suggested angle. Nicely done.</p>
      ) : (
        <div className="home-suggestions">
          {suggestions.map(({ src, sg }) => (
            <div className="home-sugg" key={sg.title}>
              <div className="home-sugg-body">
                <h4 className="home-sugg-title">{sg.title}</h4>
                <p className="home-sugg-from">from {src.name}</p>
              </div>
              <button
                className="mini-btn add"
                onClick={() => {
                  createIdeaFrom({ title: sg.title, hook: sg.hook, tags: sg.tags, notes: `Source: ${src.name}` })
                  push(`Added “${sg.title}”`)
                }}
              >
                <Icon name="plus" size={13} strokeWidth={2} /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
