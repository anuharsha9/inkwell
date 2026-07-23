import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  const anchorRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({
      top: rect.bottom + 6,
      left: align === 'right' ? rect.right : rect.left,
    })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        anchorRef.current?.contains(e.target as Node) ||
        popRef.current?.contains(e.target as Node)
      )
        return
      setOpen(false)
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
    <div className="menu-anchor" ref={anchorRef}>
      {trigger(open, toggle)}
      {open &&
        pos &&
        createPortal(
          <div
            className={`menu-pop ${align}`}
            ref={popRef}
            style={{
              top: pos.top,
              ...(align === 'right' ? { right: window.innerWidth - pos.left } : { left: pos.left }),
              ...(width ? { width } : {}),
            }}
            role="menu"
          >
            {children(() => setOpen(false))}
          </div>,
          document.documentElement,
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
