import { useEffect, useRef, useState, type ReactNode } from 'react'

// A light anchored popover. Closes on outside click / Escape. Positioned just
// below its trigger. Used for inline status changes, platform pickers, etc.
export function Menu({
  trigger,
  children,
  align = 'left',
  width,
}: {
  trigger: (open: boolean, toggle: (e: React.MouseEvent) => void) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setOpen((o) => !o)
  }

  return (
    <div className="menu-anchor" ref={ref}>
      {trigger(open, toggle)}
      {open && (
        <div className={`menu-pop ${align}`} style={width ? { width } : undefined} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onClick,
  active,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      className={`menu-item ${active ? 'active' : ''} ${danger ? 'danger' : ''}`}
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {children}
    </button>
  )
}
