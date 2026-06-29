import { useMemo } from 'react'
import { useStore } from '@/store'
import type { Article } from '@/types'
import { analyze, easeLabel, readiness } from '@/lib/textmetrics'
import { analyzePos } from '@/lib/pos'
import { publishedBaseline } from '@/lib/craft'
import { Icon } from './Icon'

// Local, no-API analysis of a single draft — the default insight surface.
export function MetricsPanel({ article }: { article: Article }) {
  const cover = useStore((s) => (article.coverImageId ? s.images[article.coverImageId] : undefined))
  const articles = useStore((s) => s.articles)
  const baseline = useMemo(() => publishedBaseline(Object.values(articles)), [articles])
  const m = analyze(article.body)
  // POS-backed style metrics for this draft (more accurate than the heuristics).
  const pos = useMemo(() => analyzePos(article.body), [article.body])
  const r = readiness(article, Boolean(cover?.alt.trim()), baseline)

  if (!m) {
    return <p className="coach-hint">Write a dozen words or so and your live writing stats appear here — no AI needed.</p>
  }

  const tone =
    r.score >= 75 ? 'good' : r.score >= 45 ? 'mid' : 'low'

  return (
    <div className="metrics">
      <div className={`readiness r-${tone}`}>
        <div className="readiness-ring" style={{ ['--pct' as string]: `${r.score}` }}>
          <span>{r.score}</span>
        </div>
        <div className="readiness-label">
          <strong>Publish-readiness</strong>
          <span>{r.score >= 75 ? 'In good shape' : r.score >= 45 ? 'Getting there' : 'Early draft'}</span>
          {r.personalized && <span className="readiness-personal">scored against your published work</span>}
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Reading ease" value={`${m.readingEase}`} sub={easeLabel(m.readingEase)} />
        <Metric label="Grade level" value={`${m.grade}`} sub="US grade" />
        <Metric label="Avg sentence" value={`${m.avgSentence}w`} sub={`rhythm ±${m.rhythm}`} />
        <Metric label="Word variety" value={`${Math.round(m.lexicalDiversity * 100)}%`} sub="lexical range" />
        <Metric label="Filler" value={`${m.fillerPer100}`} sub="per 100 words" warn={m.fillerPer100 >= 2} />
        <Metric
          label="Passive"
          value={`${pos ? pos.passivePer100 : m.passivePer100}`}
          sub={pos ? 'per 100 · POS' : 'per 100 words'}
          warn={(pos ? pos.passivePer100 : m.passivePer100) >= 3}
        />
        <Metric label="Long sentences" value={`${m.longSentencePct}%`} sub="> 30 words" warn={m.longSentencePct >= 15} />
        <Metric label="Length" value={`${m.words}`} sub={`${m.sentences} sentences`} />
        {pos && (
          <>
            <Metric label="Adverbs" value={`${pos.adverbPer100}`} sub="per 100 · POS" warn={pos.adverbPer100 >= 5} />
            <Metric label="Weak verbs" value={`${pos.weakVerbPer100}`} sub="is/has/get/make" warn={pos.weakVerbPer100 >= 12} />
            <Metric
              label="Nominalizations"
              value={`${pos.nominalizationPer100}`}
              sub="-tion/-ment nouns"
              warn={pos.nominalizationPer100 >= 6}
            />
          </>
        )}
      </div>

      <div className="readiness-factors">
        {r.factors.map((f) => (
          <div key={f.label} className={`factor ${f.ok ? 'ok' : 'no'}`}>
            <Icon name={f.ok ? 'check' : 'close'} size={12} strokeWidth={2.2} />
            {f.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`metric ${warn ? 'warn' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  )
}
