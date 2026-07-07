import { useState } from 'react'
import { useStore } from '@/store'
import { analyzeCorpus } from '@/lib/craft'
import { easeLabel } from '@/lib/textmetrics'
import { Icon } from '@/components/Icon'
import { Markdown } from '@/components/editor/Markdown'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { Heatmap } from '@/components/Heatmap'
import { corpusInsight, isAIConfigured } from '@/lib/ai'

export function Craft() {
  const articles = useStore((s) => s.articles)
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const updateSettings = useStore((s) => s.updateSettings)
  const report = analyzeCorpus(Object.values(articles))

  // The narrative read persists in settings — it shows immediately on load (no
  // API needed) and can be refreshed with Claude.
  const insight = settings.craftInsight
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const configured = isAIConfigured(settings)

  async function deepRead() {
    setBusy(true)
    setError('')
    try {
      const samples = Object.values(articles)
        .map((a) => a.body.trim())
        .filter((b) => b.split(/\s+/).length >= 40)
        .slice(0, 10)
      const text = await corpusInsight(samples, settings)
      updateSettings({ craftInsight: text, craftInsightAt: new Date().toISOString() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read your work right now.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Writing Craft</h1>
          <div className="page-sub">How you write, and where you're growing — measured across everything you've written.</div>
        </div>
      </div>

      {!report ? (
        <div className="empty">
          <div className="glyph">
            <Icon name="pen" size={24} />
          </div>
          <h3>Not enough writing yet</h3>
          <p>Write a few pieces and this becomes a mirror of your craft — your tendencies, your strengths, and what to work on next. It sharpens the more you write.</p>
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => setView('archive')}>
            <Icon name="archive" size={16} /> Go write
          </button>
        </div>
      ) : (
        <div className="craft">
          {/* Headline numbers across the corpus */}
          <div className="craft-stats" data-tour="craft-stats">
            <Stat num={report.pieces} label="pieces with substance" />
            <Stat num={report.totalWords} label="words written" />
            <Stat num={report.avg.readingEase} decimals={1} label="avg reading ease" sub={easeLabel(report.avg.readingEase)} />
            <Stat num={report.avg.rhythm} decimals={1} prefix="±" label="sentence variety" />
          </div>

          {/* Narrative read of her voice — persisted, renders without the API */}
          <section className="craft-section craft-read">
            <h2 className="craft-h2">
              <Icon name="spark" size={17} /> Your voice, read closely
            </h2>
            {insight ? (
              <>
                <div className="coach-teach-card">
                  <Markdown body={insight} />
                </div>
                <div className="craft-read-foot">
                  {settings.craftInsightAt && (
                    <span className="craft-read-meta">
                      Updated {new Date(settings.craftInsightAt).toLocaleDateString()}
                    </span>
                  )}
                  {error && <span className="ai-error">{error}</span>}
                  {configured && (
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={deepRead}>
                      {busy ? (
                        <>
                          <span className="spin" /> Re-reading…
                        </>
                      ) : (
                        <>
                          <Icon name="sources" size={14} /> Refresh with Claude
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="craft-card">
                <p className="craft-card-detail">
                  No close read yet.{' '}
                  {configured
                    ? 'Have Claude read across your writing for a narrative profile of your voice.'
                    : 'Add Claude in Settings for a narrative read.'}
                </p>
                {error && <div className="ai-error" style={{ marginTop: 8 }}>{error}</div>}
                {configured ? (
                  <button className="btn btn-soft" style={{ marginTop: 10 }} disabled={busy} onClick={deepRead}>
                    {busy ? (
                      <>
                        <span className="spin" /> Reading your body of work…
                      </>
                    ) : (
                      <>
                        <Icon name="sources" size={15} /> Have Claude read across your writing
                      </>
                    )}
                  </button>
                ) : (
                  <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setView('settings')}>
                    Add Claude for a narrative read
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Writing consistency — the habit goal, made visible */}
          <section className="craft-section">
            <h2 className="craft-h2">
              <Icon name="calendar" size={17} /> Your writing days
            </h2>
            <Heatmap articles={Object.values(articles)} />
          </section>

          {/* Growth over time */}
          {report.trend.length >= 2 && (
            <section className="craft-section">
              <h2 className="craft-h2">Your months</h2>
              <div className="craft-trend">
                {report.trend.map((m) => {
                  const max = Math.max(...report.trend.map((x) => x.words), 1)
                  return (
                    <div className="trend-col" key={m.label} title={`${m.label} · ${m.words.toLocaleString()} words`}>
                      <div className="trend-bar-wrap">
                        <div className="trend-bar" style={{ height: `${Math.max(3, Math.round((m.words / max) * 100))}%` }} />
                      </div>
                      <div className="trend-words">{m.words.toLocaleString()}w</div>
                      <div className="trend-label">{m.label}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <div className="craft-grid">
            <section className="craft-section">
              <h2 className="craft-h2">
                <Icon name="eye" size={17} /> Habits to work on
              </h2>
              {report.watch.length ? (
                report.watch.map((t) => (
                  <div className="craft-card watch" key={t.title}>
                    <h3 className="craft-card-title">{t.title}</h3>
                    <p className="craft-card-detail">{t.detail}</p>
                    <span className="craft-metric">{t.metric}</span>
                  </div>
                ))
              ) : (
                <p className="craft-none">Nothing glaring — your mechanics are clean. Push on ideas.</p>
              )}
            </section>

            <section className="craft-section">
              <h2 className="craft-h2">
                <Icon name="check" size={17} /> What's working
              </h2>
              {report.strengths.length ? (
                report.strengths.map((t) => (
                  <div className="craft-card strength" key={t.title}>
                    <h3 className="craft-card-title">{t.title}</h3>
                    <p className="craft-card-detail">{t.detail}</p>
                    <span className="craft-metric">{t.metric}</span>
                  </div>
                ))
              ) : (
                <p className="craft-none">Keep writing — strengths show up as your sample grows.</p>
              )}
            </section>
          </div>

          <div className="craft-focus">
            <Icon name="spark" size={18} />
            <p>{report.focus}</p>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({
  num,
  label,
  sub,
  decimals = 0,
  prefix = '',
}: {
  num: number | string
  label: string
  sub?: string
  decimals?: number
  prefix?: string
}) {
  return (
    <div className="craft-stat">
      <span className="num">
        {typeof num === 'number' ? (
          <>
            {prefix}
            <AnimatedNumber value={num} decimals={decimals} />
          </>
        ) : (
          num
        )}
      </span>
      <span className="lbl">{label}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  )
}
