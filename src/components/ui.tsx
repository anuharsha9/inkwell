import { create } from 'zustand'
import type { Platform, Status, Tag } from '@/types'
import { PLATFORM_META, STATUS_META, TAG_META } from '@/lib/constants'
import { Icon } from './Icon'

// ── Status pill ────────────────────────────────────────────────────────
export function StatusPill({
  status,
  onClick,
  title,
}: {
  status: Status
  onClick?: (e: React.MouseEvent) => void
  title?: string
}) {
  const meta = STATUS_META[status]
  const style = { ['--pill-c' as string]: `var(${meta.var})` }
  if (onClick) {
    return (
      <button className="pill" style={style} onClick={onClick} title={title ?? 'Change status'}>
        <span className="dot" />
        {meta.label}
      </button>
    )
  }
  return (
    <span className="pill" style={style}>
      <span className="dot" />
      {meta.label}
    </span>
  )
}

// ── Tag list ───────────────────────────────────────────────────────────
export function TagList({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null
  return (
    <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
      {tags.map((t) => (
        <span key={t} className="tag">
          {TAG_META[t].label}
        </span>
      ))}
    </span>
  )
}

// ── Platform dots ──────────────────────────────────────────────────────
export function PlatformDots({ platforms }: { platforms: Platform[] }) {
  if (!platforms.length) return null
  return (
    <span className="pdots">
      {platforms.map((p) => (
        <span key={p} className="pdot" title={PLATFORM_META[p].label}>
          {PLATFORM_META[p].short}
        </span>
      ))}
    </span>
  )
}

// ── Number badge ───────────────────────────────────────────────────────
export function NumberBadge({ number }: { number: number | null }) {
  if (number === null) return <span className="numbadge adhoc">+</span>
  return <span className="numbadge">{String(number).padStart(2, '0')}</span>
}

// ═══════════════════════════════════════════════════════════════════════
// Toast — quiet confirmations (the "copied!" moment, PRD §5.3).
// ═══════════════════════════════════════════════════════════════════════
interface ToastAction {
  label: string
  run: () => void
}
interface ToastItem {
  id: number
  text: string
  action?: ToastAction
}
interface ToastState {
  items: ToastItem[]
  push: (text: string, action?: ToastAction) => void
}
let toastSeq = 0
export const useToast = create<ToastState>((set) => ({
  items: [],
  push(text, action) {
    const id = ++toastSeq
    set((s) => ({ items: [...s.items, { id, text, action }] }))
    // Give an actionable toast (e.g. Undo) longer to be clicked.
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), action ? 6000 : 2000)
  },
}))

export function Toaster() {
  const items = useToast((s) => s.items)
  const dismiss = (id: number) => useToast.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }))
  return (
    <div className="toast-wrap" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          <Icon name="check" size={16} className="ok" strokeWidth={2} />
          {t.text}
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
