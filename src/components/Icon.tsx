// Thin custom line icons — Moleskine-app register. 24×24, currentColor, no emoji.
import type { CSSProperties } from 'react'

export type IconName =
  | 'archive'
  | 'queue'
  | 'config'
  | 'settings'
  | 'plus'
  | 'search'
  | 'pin'
  | 'copy'
  | 'check'
  | 'sun'
  | 'moon'
  | 'chevron'
  | 'close'
  | 'image'
  | 'upload'
  | 'link'
  | 'spark'
  | 'trash'
  | 'external'
  | 'download'
  | 'eye'
  | 'pen'
  | 'arrowLeft'
  | 'filter'
  | 'calendar'
  | 'reroll'
  | 'dots'
  | 'sources'
  | 'shield'
  | 'home'

const P: Record<IconName, JSX.Element> = {
  archive: (
    <>
      <rect x="3.5" y="4.5" width="17" height="4" rx="1.2" />
      <path d="M5 8.5v9a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-9" />
      <path d="M10 12h4" />
    </>
  ),
  queue: (
    <>
      <path d="M4 11.5 19.5 4.5 15 20l-4-6-7-2.5Z" />
      <path d="m11 14 4-9.5" />
    </>
  ),
  config: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v3.5M9 20.5h6" />
    </>
  ),
  settings: (
    <>
      <path d="M5 7h14M5 12h14M5 17h14" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  pin: (
    <>
      <path d="M9 3.5h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
      <path d="M12 15.5V21" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 6.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="m4.5 17 4.5-4.5 3.5 3.5 3-3 4 4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5V4.5M8 8l4-4 4 4" />
      <path d="M5 14.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11 7" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7L13 17" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
      <path d="M18.5 4.5 19 6.5 21 7l-2 .5-.5 2-.5-2L16 7l2-.5Z" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.8 11a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10.5M8 11l4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" />
      <path d="m14 7 3 3" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.2" />
      <path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" />
    </>
  ),
  reroll: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4v3.2h-3.2" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
  sources: (
    <>
      <path d="M12 6.5C10.5 5 8.5 4.5 5 4.5v12c3.5 0 5.5.5 7 2 1.5-1.5 3.5-2 7-2v-12c-3.5 0-5.5.5-7 2Z" />
      <path d="M12 6.5v11" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z" />
      <path d="m9 11.5 2 2 3.5-4" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
}

interface Props {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 20, className, style, strokeWidth = 1.6 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  )
}
