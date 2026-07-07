import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { computeCounts } from '@/lib/selectors'
import { Icon } from './Icon'

// Quiet, earned flourishes — never confetti. A brief "shipped" beat on publish,
// and a bigger beat when the body of work crosses 10 / 25 / 50 finished pieces.
const MILESTONES = [10, 25, 50]
const milestoneSub = (n: number) =>
  n >= 50 ? 'Fifty. You built the habit.' : n >= 25 ? 'A quarter-hundred. This is a body of work.' : 'Double digits. It’s compounding.'

interface Beat {
  big: string
  label: string
  sub: string
  milestone: boolean
}

export function Celebration() {
  const publishTick = useStore((s) => s.publishTick)
  const goalDone = useStore((s) => computeCounts(Object.values(s.articles)).goalDone)
  const prev = useRef({ goalDone, publishTick, inited: false })
  const [beat, setBeat] = useState<Beat | null>(null)

  useEffect(() => {
    const p = prev.current
    if (!p.inited) {
      prev.current = { goalDone, publishTick, inited: true }
      return
    }
    let next: Beat | null = null
    const crossed = MILESTONES.find((m) => p.goalDone < m && goalDone >= m)
    if (crossed) next = { big: String(crossed), label: 'pieces finished', sub: milestoneSub(crossed), milestone: true }
    else if (publishTick !== p.publishTick) next = { big: '', label: 'Shipped', sub: 'One more out in the world.', milestone: false }
    prev.current = { goalDone, publishTick, inited: true }
    if (next) {
      setBeat(next)
      const t = setTimeout(() => setBeat(null), next.milestone ? 2800 : 2000)
      return () => clearTimeout(t)
    }
  }, [goalDone, publishTick])

  if (!beat) return null
  return (
    <div className="celebrate" onClick={() => setBeat(null)}>
      <div className={`celebrate-card ${beat.milestone ? 'milestone' : ''}`}>
        <div className="celebrate-mark">
          {beat.big ? <span className="celebrate-big">{beat.big}</span> : <Icon name="check" size={30} strokeWidth={2.2} />}
        </div>
        <div className="celebrate-label">{beat.label}</div>
        <div className="celebrate-sub">{beat.sub}</div>
      </div>
    </div>
  )
}
