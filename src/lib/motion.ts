import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────
// Small, dependency-free motion helpers. Every animation degrades to an
// instant result under prefers-reduced-motion (accessibility, PRD §7).
// ─────────────────────────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Count a number up from zero to `target` once, on mount and whenever the
// target changes. Returns the live numeric value; the caller formats it (so
// commas / decimals / suffixes stay the caller's business).
export function useCountUp(target: number, duration = 850): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const raf = useRef<number | undefined>(undefined)
  const done = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion() || target === done.current) {
      setValue(target)
      done.current = target
      return
    }
    const from = 0
    let startTs = 0
    const step = (ts: number) => {
      if (!startTs) startTs = ts
      const t = Math.min(1, (ts - startTs) / duration)
      setValue(from + (target - from) * easeOutCubic(t))
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        setValue(target)
        done.current = target
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])

  return value
}
