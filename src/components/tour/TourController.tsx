import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '@/store'
import { DEMO_MODE } from '@/lib/env'
import { Icon } from '@/components/Icon'
import { TOUR_STEPS } from './tourSteps'
import { GuidedTour } from './GuidedTour'

const SEEN_KEY = 'inkwell:tour-seen'
function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}
function markTourSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

// Orchestrates the guided demo tour: a first-visit auto-start (demo only), an
// always-available "Take a tour" launcher, and a ?tour=1 deep-link. Each step can
// switch Inkwell's view (or open a sample article) so its spotlight target is on
// screen. Skippable at every step (button + Esc); shows once, then on demand.
export function TourController() {
  const setView = useStore((s) => s.setView)
  const view = useStore((s) => s.view)
  const openEditor = useStore((s) => s.openEditor)
  const articles = useStore((s) => s.articles)
  const loaded = useStore((s) => s.loaded)

  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const autoOfferedRef = useRef(false)

  const start = useCallback(() => {
    markTourSeen()
    setStepIndex(0)
    setActive(true)
  }, [])

  // Apply each step's view / action so its target is mounted before spotlighting.
  useEffect(() => {
    if (!active) return
    const step = TOUR_STEPS[stepIndex]
    if (step.action === 'openFirstArticle') {
      const id = Object.values(articles)[0]?.id
      if (id) openEditor(id)
      else if (step.view) setView(step.view)
    } else if (step.view) {
      setView(step.view)
    }
  }, [active, stepIndex, articles, openEditor, setView])

  // ?tour=1 — a shareable "start the tour" link (works in any mode). Deleting the
  // param first means a StrictMode re-run reads no param and is a no-op.
  useEffect(() => {
    if (!loaded) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('tour') !== '1') return
    const url = new URL(window.location.href)
    url.searchParams.delete('tour')
    window.history.replaceState({}, '', url.toString())
    start()
  }, [loaded, start])

  // First-visit auto-offer — demo only. Started directly (no rAF) so a StrictMode
  // double-invoke can't cancel it; the ref keeps it to once.
  useEffect(() => {
    if (autoOfferedRef.current || !loaded) return
    if (DEMO_MODE && !hasSeenTour()) {
      autoOfferedRef.current = true
      start()
    }
  }, [loaded, start])

  const close = useCallback(() => setActive(false), [])
  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        setActive(false)
        return i
      }
      return i + 1
    })
  }, [])
  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), [])

  if (!DEMO_MODE) return null // personal build never shows the tour

  return (
    <>
      {!active && view !== 'learn' && (
        <button type="button" className="tour-launch" onClick={start} aria-label="Take a guided tour of Inkwell">
          <Icon name="spark" size={15} /> Take a tour
        </button>
      )}
      {active && (
        <GuidedTour steps={TOUR_STEPS} stepIndex={stepIndex} onNext={next} onBack={back} onClose={close} />
      )}
    </>
  )
}
