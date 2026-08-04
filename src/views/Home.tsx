import { useMemo, useState } from 'react'
import { useStore } from '@/store'
import { publishingPlan, readyQueue } from '@/lib/selectors'
import { FORMAT_META, STATUS_META } from '@/lib/constants'
import { Dashboard } from '@/components/Dashboard'
import { Icon } from '@/components/Icon'
import { Markdown } from '@/components/editor/Markdown'
import { useToast } from '@/components/ui'
import { corpusInsight, isAIConfigured, isAIDisabledByGovernance } from '@/lib/ai'
import { analyze } from '@/lib/textmetrics'
import { activeSources } from '@/data/sources'
import { AnimatedNumber } from '@/components/AnimatedNumber'

export function Home() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Home</h1>
          <div className="page-sub">Your studio at a glance — what ships next, what to write, where you're growing.</div>
        </div>
        <button className="btn btn-primary" onClick={() => useStore.getState().createArticle()}>
          <Icon name="plus" size={16} strokeWidth={2} /> New
        </button>
      </div>

      <Dashboard />

      <Momentum />

      <div className="home-grid">
        {/* The pipeline — ready-to-publish + the dated plan + write-next, as one */}
        <Pipeline />
        <InsightCard />
      </div>
    </>
  )
}

// ── The pipeline — "what ships next, on what day, and what to write" ────────
// One widget, three jobs: each dated slot resolves to an action. A ready piece
// offers copy/publish; a draft offers "finish"; an idea offers "write"; an
// empty slot offers the next best thing to write from her source material —
// and adding it claims that slot's date. No loose ends.
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function Pipeline() {
  const articles = useStore((s) => s.articles)
  const publishDays = useStore((s) => s.settings.publishDays)
  const updateSettings = useStore((s) => s.updateSettings)
  const openEditor = useStore((s) => s.openEditor)
  const setView = useStore((s) => s.setView)
  const createIdeaFrom = useStore((s) => s.createIdeaFrom)
  const markPublished = useStore((s) => s.markPublished)
  const unlocked = useStore((s) => s.unlocked)
  const push = useToast((s) => s.push)

  const list = Object.values(articles)
  const readyCount = readyQueue(list).length
  const plan = useMemo(() => publishingPlan(list, publishDays, 10), [list, publishDays])

  // Unused source suggestions queue up for the open slots, in order.
  const nextUp = useMemo(() => {
    const existing = new Set(list.map((a) => a.title.trim().toLowerCase()))
    return activeSources()
      .flatMap((src) => src.suggestions.map((sg) => ({ src, sg })))
      .filter(({ sg }) => !existing.has(sg.title.trim().toLowerCase()))
  }, [list])

  function toggleDay(d: number) {
    const next = publishDays.includes(d) ? publishDays.filter((x) => x !== d) : [...publishDays, d].sort()
    if (next.length) updateSettings({ publishDays: next }) // never allow an empty cadence
  }

  // Adding from an open slot claims that slot's date — the plan stays whole.
  function writeInto(date: string, sg: { title: string; hook: string; tags: import('@/types').Tag[] }, srcName: string) {
    createIdeaFrom(
      { title: sg.title, hook: sg.hook, tags: sg.tags, notes: `Source: ${srcName}`, scheduledFor: date },
      { open: true },
    )
    push(`Scheduled “${sg.title}”`)
  }

  let openIdx = -1
  return (
    <section className="home-section span-2">
      <div className="home-section-head">
        <h2 className="home-section-title">
          <Icon name="calendar" size={18} /> Publishing pipeline
        </h2>
        <span className="home-count">{readyCount} ready</span>
        <div className="plan-days" title="Your cadence — the weekdays you post">
          {DAY_LETTERS.map((l, d) => (
            <button
              key={d}
              className={`plan-day ${publishDays.includes(d) ? 'on' : ''}`}
              onClick={() => toggleDay(d)}
              aria-label={`Post on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}`}
              aria-pressed={publishDays.includes(d)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="plan-rows">
        {plan.map((slot) => {
          const d = new Date(`${slot.date}T12:00:00`)
          const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
          const a = slot.article
          if (a) {
            return (
              <div className={`plan-row ${slot.assigned}`} key={slot.date}>
                <span className="plan-date">{label}</span>
                <button className="plan-title" onClick={() => openEditor(a.id)}>
                  {a.title || <span className="plan-untitled">Untitled — tap to start writing</span>}
                </button>
                <span className="plan-meta">
                  <span className={`plan-format f-${a.format ?? 'article'}`}>
                    {FORMAT_META[a.format ?? 'article'].short}
                  </span>
                  <span className={`plan-status s-${a.status}`}>{STATUS_META[a.status].label}</span>
                </span>
                <span className="plan-actions">
                  {a.status === 'ready' && (
                    <button className="mini-btn plan-publish" onClick={() => markPublished(a.id)} title="Mark this piece as published">
                      <Icon name="check" size={12} strokeWidth={2} /> Publish
                    </button>
                  )}
                </span>
              </div>
            )
          }
          // Open slot — offer the next best thing to write, and let it claim the date.
          openIdx++
          const s = nextUp[openIdx]
          return (
            <div className="plan-row open" key={slot.date}>
              <span className="plan-date">{label}</span>
              {s ? (
                <>
                  <span className="plan-next">
                    <span className="plan-next-label">write next</span>
                    <span className="plan-next-title">{s.sg.title}</span>
                    <span className="plan-next-from">from {s.src.name}</span>
                  </span>
                  <span className="plan-actions">
                    <button className="mini-btn add" onClick={() => writeInto(slot.date, s.sg, s.src.name)}>
                      <Icon name="plus" size={12} strokeWidth={2} /> Write it
                    </button>
                  </span>
                </>
              ) : (
                <span className="plan-open">open slot</span>
              )}
            </div>
          )
        })}
      </div>
      <p className="plan-foot">
        Pinned-date pieces keep their day; open slots fill from Ready, then Drafting, then your source material —
        picking one schedules it.{' '}
        {unlocked && (
          <button className="home-link" onClick={() => setView('sources')}>
            All sources
          </button>
        )}
      </p>
    </section>
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
            <span className="num"><AnimatedNumber value={totalWords} /></span>
            <span className="lbl">words written</span>
          </div>
          <div className="home-stat">
            <span className="num"><AnimatedNumber value={avgEase} /></span>
            <span className="lbl">avg reading ease</span>
          </div>
          <div className="home-stat">
            <span className="num">±<AnimatedNumber value={avgRhythm} decimals={1} /></span>
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

      {busy && !insight && (
        <div className="insight-skeleton">
          <div className="insight-skeleton-stats">
            {[1, 2, 3].map((i) => (
              <div className="insight-skeleton-stat" key={i}>
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            ))}
          </div>
          <div className="skeleton skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton skeleton-line" style={{ width: '70%' }} />
        </div>
      )}

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
        <div className="home-empty" style={{ marginTop: 6 }}>
          <Icon name="spark" size={22} />
          <p>Add your Claude API key to unlock AI-powered writing lessons — pattern detection, voice coaching, and craft insights drawn from your own writing.</p>
          <button className="btn btn-ghost" onClick={() => setView('settings')}>
            {disabled ? 'AI is off — manage in Settings' : 'Connect Claude'}
          </button>
        </div>
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
        <span className="m-num"><AnimatedNumber value={streak} /></span>
        <span className="m-lbl">day{streak === 1 ? '' : 's'} writing</span>
      </div>
      <div className="momentum-stat">
        <span className="m-num"><AnimatedNumber value={weekWords} /></span>
        <span className="m-lbl">words this week</span>
      </div>
      <div className="momentum-stat">
        <span className="m-num"><AnimatedNumber value={published} /></span>
        <span className="m-lbl">published</span>
      </div>
      <span className="momentum-link">
        Your craft <Icon name="chevron" size={14} />
      </span>
    </button>
  )
}
