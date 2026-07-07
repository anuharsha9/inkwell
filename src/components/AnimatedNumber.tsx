import { useCountUp } from '@/lib/motion'

// Counts up to `value` on mount, formatted like the static number it replaces
// (thousands separators; optional fixed decimals). Reduced-motion → instant.
export function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const live = useCountUp(value)
  const shown = decimals > 0 ? Number(live.toFixed(decimals)) : Math.round(live)
  return <>{shown.toLocaleString(undefined, decimals > 0 ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : undefined)}</>
}
