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
  { view: 'book', label: 'Book', icon: 'book' },
  { view: 'config', label: 'Config Track', icon: 'config' },
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

// Mobile bottom tab bar — the "+New → idea" path must work on a phone (PRD §10.6).
export function TabBar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createArticle = useStore((s) => s.createArticle)

  return (
    <div className="tabbar">
      <button className={`tab ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
        <Icon name="home" size={20} />
        Home
      </button>
      <button className={`tab ${view === 'archive' ? 'active' : ''}`} onClick={() => setView('archive')}>
        <Icon name="archive" size={20} />
        Archive
      </button>
      <button className="tab fab" onClick={() => createArticle()} aria-label="New article">
        <Icon name="plus" size={22} strokeWidth={2} />
      </button>
      <button className={`tab ${view === 'config' ? 'active' : ''}`} onClick={() => setView('config')}>
        <Icon name="config" size={20} />
        Config
      </button>
      <button className={`tab ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
        <Icon name="settings" size={20} />
        Settings
      </button>
    </div>
  )
}
