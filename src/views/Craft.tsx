import { useState } from 'react'
import { useStore } from '@/store'
import { analyzeCorpus } from '@/lib/craft'
import { easeLabel } from '@/lib/textmetrics'
import { Icon } from '@/components/Icon'
import { Markdown } from '@/components/editor/Markdown'
import { corpusInsight, isAIConfigured } from '@/lib/ai'

export function Craft() {
  const articles = useStore((s) => s.articles)
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const report = analyzeCorpus(Object.values(articles))

  const [insight, setInsight] = useState('')
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
      setInsight(await corpusInsight(samples, settings))
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
          <div className="craft-stats">
            <Stat num={report.pieces} label="pieces with substance" />
            <Stat num={report.totalWords.toLocaleString()} label="words written" />
            <Stat num={report.avg.readingEase} label="avg reading ease" sub={easeLabel(report.avg.readingEase)} />
            <Stat num={`±${report.avg.rhythm}`} label="sentence variety" />
          </div>

          {/* Growth over time */}
          {report.trend.length >= 2 && (
            <section className="craft-section">
              <h2 className="craft-h2">Your months</h2>
              <div className="craft-trend">
                {report.trend.map((m) => {
                  const max = Math.max(...report.trend.map((x) => x.words), 1)
                  return (
                    <div className="trend-col" key={m.label}>
                      <div className="trend-bar-wrap">
                        <div className="trend-bar" style={{ height: `${Math.round((m.words / max) * 100)}%` }} />
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

          {/* Optional AI deep-read */}
          <section className="craft-section">
            <h2 className="craft-h2">A deeper read</h2>
            {insight && (
              <div className="coach-teach-card" style={{ marginBottom: 12 }}>
                <Markdown body={insight} />
              </div>
            )}
            {error && <div className="ai-error" style={{ marginBottom: 10 }}>{error}</div>}
            {configured ? (
              <button className="btn btn-soft" disabled={busy} onClick={deepRead}>
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
              <button className="btn btn-ghost" onClick={() => setView('settings')}>
                Add Claude for a narrative read
              </button>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function Stat({ num, label, sub }: { num: number | string; label: string; sub?: string }) {
  return (
    <div className="craft-stat">
      <span className="num">{num}</span>
      <span className="lbl">{label}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  )
}
