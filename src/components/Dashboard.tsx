import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { computeCounts, WRITING_GOAL } from '@/lib/selectors'
import { STATUS_META } from '@/lib/constants'
import { AnimatedNumber } from './AnimatedNumber'
import { prefersReducedMotion } from '@/lib/motion'
import type { Status } from '@/types'

const STAT_ORDER: Status[] = ['idea', 'drafting', 'ready', 'published']

export function Dashboard() {
  const articles = useStore((s) => s.articles)
  const c = computeCounts(Object.values(articles))
  // The goal bar can overflow 50 and keep counting — 50 is motivation, not a cap.
  const pct = Math.min(100, Math.round((c.goalDone / WRITING_GOAL) * 100))
  // Grow the fill in from zero on mount (CSS transitions the width change).
  const [fill, setFill] = useState(() => (prefersReducedMotion() ? pct : 0))
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div className="dash">
      {/* The single most useful number, emphasized (PRD §5.1). */}
      <div className="dash-hero" data-tour="home-hero">
        <div className="num"><AnimatedNumber value={c.readyNow} /></div>
        <div className="lbl">ready to publish right now</div>
      </div>

      <div className="dash-stats">
        {STAT_ORDER.map((s) => (
          <div className="stat" key={s}>
            <div className="num"><AnimatedNumber value={c.byStatus[s]} /></div>
            <div className="lbl">
              <span className="stat-dot" style={{ background: `var(${STATUS_META[s].var})` }} />
              {STATUS_META[s].label}
            </div>
          </div>
        ))}

        <div className="stat stat-progress">
          <div className="row">
            <span className="num">
              <AnimatedNumber value={c.goalDone} />
              <span style={{ fontSize: 15, color: 'var(--ink-mute)' }}> / {WRITING_GOAL}</span>
            </span>
            <span className="lbl" style={{ textTransform: 'none', letterSpacing: 0 }}>
              finished toward the habit goal · {c.total} in the studio
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${fill}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
