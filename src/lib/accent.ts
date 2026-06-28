// The signature accent (Moleskine-app style: one confident, user-chosen color).
// We derive the press/tint/dark-mode variants from a single hex so Settings only
// stores one value. Overrides the --accent token set in theme.css.

export interface AccentSwatch {
  name: string
  hex: string
}

// A curated, considered palette — the kind of restrained set Moleskine offers.
export const ACCENT_SWATCHES: AccentSwatch[] = [
  { name: 'Ink Indigo', hex: '#3f4ba8' },
  { name: 'Oxblood', hex: '#9b3b33' },
  { name: 'Forest', hex: '#3c6b4f' },
  { name: 'Cobalt', hex: '#2f6db0' },
  { name: 'Plum', hex: '#7a4a86' },
  { name: 'Ochre', hex: '#b07d2e' },
  { name: 'Teal', hex: '#2c7d7a' },
  { name: 'Graphite', hex: '#4a4f59' },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  )
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgb = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
const mix = (a: number, b: number, t: number) => clamp(a + (b - a) * t)

// Apply a chosen accent. We only set INPUT tokens (--accent-user / -dark) on
// :root; theme.css decides which one becomes --accent per light/dark mode, so
// the inline value never defeats the dark-theme override.
export function applyAccent(hex: string) {
  const root = document.documentElement.style
  const [r, g, b] = hexToRgb(hex)
  root.setProperty('--accent-user', hex)
  // a lifted version for the dark ground (mix 45% toward white)
  root.setProperty('--accent-user-dark', rgb(mix(r, 255, 0.45), mix(g, 255, 0.45), mix(b, 255, 0.45)))
}

export function clearAccent() {
  const root = document.documentElement.style
  root.removeProperty('--accent-user')
  root.removeProperty('--accent-user-dark')
}
