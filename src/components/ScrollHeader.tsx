import { useEffect, useRef, useState } from 'react'

interface Props {
  title: string
}

export function ScrollHeader({ title }: Props) {
  const [visible, setVisible] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} style={{ height: 1, pointerEvents: 'none', marginBottom: -1 }} />
      <div className={`scroll-header ${visible ? 'visible' : ''}`}>
        <span className="scroll-header-title">{title}</span>
      </div>
    </>
  )
}
