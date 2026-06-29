import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TourStep } from './tourSteps'

interface GuidedTourProps {
  steps: TourStep[]
  stepIndex: number
  onNext: () => void
  onBack: () => void
  onClose: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const CARD_WIDTH = 340
const PAD = 8 // spotlight padding around the target
const GAP = 14 // distance from target to coachmark
const MARGIN = 12 // viewport edge margin

function computeCoachPosition(
  target: Rect,
  placement: TourStep['placement'],
  cardW: number,
  cardH: number,
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const place = placement ?? 'bottom'

  let top: number
  let left: number

  if (place === 'top') {
    top = target.top - cardH - GAP
    left = target.left
  } else if (place === 'right') {
    left = target.left + target.width + GAP
    top = target.top
  } else if (place === 'left') {
    left = target.left - cardW - GAP
    top = target.top
  } else {
    top = target.top + target.height + GAP
    left = target.left
  }

  // Flip to the opposite side if the preferred side overflows.
  if (place === 'bottom' && top + cardH > vh - MARGIN) top = target.top - cardH - GAP
  if (place === 'top' && top < MARGIN) top = target.top + target.height + GAP
  if (place === 'right' && left + cardW > vw - MARGIN) left = target.left - cardW - GAP
  if (place === 'left' && left < MARGIN) left = target.left + target.width + GAP

  // Clamp inside the viewport.
  left = Math.max(MARGIN, Math.min(left, vw - cardW - MARGIN))
  top = Math.max(MARGIN, Math.min(top, vh - cardH - MARGIN))
  return { top, left }
}

export function GuidedTour({ steps, stepIndex, onNext, onBack, onClose }: GuidedTourProps) {
  const step = steps[stepIndex]
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [spot, setSpot] = useState<Rect | null>(null)
  const [coach, setCoach] = useState<{ top: number; left: number } | null>(null)

  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  const recompute = useCallback(() => {
    const cardEl = cardRef.current
    const cardW = cardEl?.offsetWidth || CARD_WIDTH
    const cardH = cardEl?.offsetHeight || 200

    const targetEl = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null

    if (step.target && !targetEl) {
      return false // target not in the DOM yet — caller retries
    }

    if (!targetEl) {
      // Anchorless step: dim everything and center the card.
      setSpot(null)
      setCoach({
        top: Math.max(MARGIN, window.innerHeight / 2 - cardH / 2),
        left: Math.max(MARGIN, window.innerWidth / 2 - cardW / 2),
      })
      return true
    }

    const r = targetEl.getBoundingClientRect()
    const target: Rect = { top: r.top, left: r.left, width: r.width, height: r.height }
    setSpot(target)
    setCoach(computeCoachPosition(target, step.placement, cardW, cardH))
    return true
  }, [step.target, step.placement])

  // On each step: scroll the target into view, then position (polling briefly for a
  // target that hasn't mounted yet, e.g. right after a view switch).
  useLayoutEffect(() => {
    const targetEl = step.target ? (document.querySelector(step.target) as HTMLElement | null) : null
    targetEl?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })

    let frame = 0
    let tries = 0
    const tick = () => {
      if (recompute() || tries > 60) return
      tries += 1
      frame = requestAnimationFrame(tick)
    }
    tick()

    return () => cancelAnimationFrame(frame)
  }, [recompute, step.target])

  // Reposition on scroll/resize while the tour is open.
  useEffect(() => {
    const onChange = () => recompute()
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)
    return () => {
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
    }
  }, [recompute])

  // Keyboard: Esc skips, →/Enter advance, ← goes back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        onNext()
      } else if (event.key === 'ArrowLeft' && !isFirst) {
        event.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext, onBack, onClose, isFirst])

  // Move focus to the card on each step so keyboard + screen readers follow along.
  useEffect(() => {
    cardRef.current?.focus()
  }, [stepIndex])

  return (
    <div className="tour-root">
      {spot ? (
        <>
          <div className="tour-block" />
          <div
            aria-hidden="true"
            className="tour-spot"
            style={{
              top: spot.top - PAD,
              left: spot.left - PAD,
              width: spot.width + PAD * 2,
              height: spot.height + PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="tour-block dim" />
      )}

      {coach && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
          tabIndex={-1}
          className="tour-card"
          style={{ top: coach.top, left: coach.left, width: CARD_WIDTH, maxWidth: 'calc(100vw - 24px)' }}
        >
          <p className="tour-step-label">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h2 id="tour-title" className="tour-card-title">
            {step.title}
          </h2>
          <p id="tour-body" className="tour-card-body">
            {step.body}
          </p>

          <div className="tour-card-foot">
            <button type="button" className="tour-skip" onClick={onClose}>
              {isFirst ? 'No thanks' : 'Skip tour'}
            </button>
            <div className="tour-nav">
              {!isFirst && (
                <button type="button" className="btn btn-soft" onClick={onBack}>
                  Back
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onNext}>
                {isLast ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
