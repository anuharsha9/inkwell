import { useStore, type View } from '@/store'
import { Icon, type IconName } from './Icon'
import { readyQueue } from '@/lib/selectors'
import { DEMO_MODE } from '@/lib/env'

const NAV: { view: View; label: string; icon: IconName }[] = [
  // The "Learn Inkwell" showcase leads the nav in the demo build.
  ...(DEMO_MODE ? ([{ view: 'learn', label: 'Learn Inkwell', icon: 'spark' }] as const) : []),
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'archive', label: 'Archive', icon: 'archive' },
  { view: 'craft', label: 'Writing Craft', icon: 'chart' },
  // Book and the Config Track are personal features — kept out of the public demo.
  ...(DEMO_MODE
    ? []
    : ([
        { view: 'book', label: 'Book', icon: 'book' },
        { view: 'config', label: 'Config Track', icon: 'config' },
      ] as const)),
  { view: 'settings', label: 'Settings', icon: 'settings' },
]

function useCounts() {
  const articles = useStore((s) => s.articles)
  const list = Object.values(articles)
  return { ready: readyQueue(list).length, config: list.filter((a) => a.configTalk).length }
}

export function NavRail() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createArticle = useStore((s) => s.createArticle)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const { ready, config } = useCounts()

  return (
    <nav className="rail">
      <div className="rail-brand">
        <div className="mark">I</div>
        <div className="wordmark">Inkwell</div>
        {DEMO_MODE && <span className="demo-chip">Demo</span>}
      </div>

      <button className="btn btn-primary btn-block" style={{ marginBottom: 18 }} onClick={() => createArticle()}>
        <Icon name="plus" size={17} strokeWidth={2} /> New Article
      </button>

      <div className="rail-nav">
        {NAV.map((n) => {
          const count = n.view === 'home' ? ready : n.view === 'config' ? config : null
          return (
            <button
              key={n.view}
              className={`nav-item ${view === n.view ? 'active' : ''}`}
              onClick={() => setView(n.view)}
              aria-current={view === n.view ? 'page' : undefined}
            >
              <Icon name={n.icon} size={19} />
              {n.label}
              {count !== null && count > 0 && <span className="badge-count">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="rail-spacer" />

      <div className="rail-foot">
        <button className="nav-item" onClick={toggleTheme}>
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          {theme === 'light' ? 'Night' : 'Day'}
        </button>
      </div>
    </nav>
  )
}

// Mobile chrome — a floating "Liquid Glass" tab bar (iOS 26 register) plus a
// floating compose button. The "+New → idea" path works on a phone (PRD §10.6).
const TABS: { view: View; label: string; icon: IconName }[] = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'archive', label: 'Archive', icon: 'archive' },
  { view: 'craft', label: 'Craft', icon: 'chart' },
  // Config Track is personal-only — omitted from the public demo's tab bar.
  ...(DEMO_MODE ? [] : ([{ view: 'config', label: 'Config', icon: 'config' }] as const)),
  { view: 'settings', label: 'Settings', icon: 'settings' },
]

export function TabBar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createArticle = useStore((s) => s.createArticle)
  const inEditor = view === 'editor'

  return (
    <>
      <button className={`compose-fab ${inEditor ? 'hide' : ''}`} onClick={() => createArticle()} aria-label="New article">
        <Icon name="plus" size={24} strokeWidth={2} />
      </button>
      <nav className={`tabbar ${inEditor ? 'hide' : ''}`} aria-label="Primary">
        {TABS.map((t) => (
          <button
            key={t.view}
            className={`tab ${view === t.view ? 'active' : ''}`}
            onClick={() => setView(t.view)}
            aria-current={view === t.view ? 'page' : undefined}
          >
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
