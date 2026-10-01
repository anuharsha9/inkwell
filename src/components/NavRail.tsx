import { useState } from 'react'
import { useStore, type View } from '@/store'
import { Icon, type IconName } from './Icon'
import { readyQueue } from '@/lib/selectors'

type NavItem = { view: View; label: string; icon: IconName }

// Nav is runtime now — locked (demo) shows the showcase and hides the personal
// features (Book, Config Track); unlocking reveals them.
function buildNav(unlocked: boolean): NavItem[] {
  return [
    ...(!unlocked ? ([{ view: 'learn', label: 'Learn Inkwell', icon: 'spark' }] as NavItem[]) : []),
    { view: 'home', label: 'Home', icon: 'home' },
    { view: 'archive', label: 'Archive', icon: 'archive' },
    { view: 'craft', label: 'Writing Craft', icon: 'chart' },
    ...(unlocked
      ? ([
          { view: 'book', label: 'Book', icon: 'book' },
          { view: 'config', label: 'Config Track', icon: 'config' },
        ] as NavItem[])
      : []),
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ]
}

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
  const unlocked = useStore((s) => s.unlocked)
  const NAV = buildNav(unlocked)
  const { ready, config } = useCounts()
  // Collapsible to an icons-only rail; the choice persists across sessions.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('inkwell:rail-collapsed') === '1')
  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem('inkwell:rail-collapsed', c ? '0' : '1')
      return !c
    })
  }

  return (
    <nav className={`rail ${collapsed ? 'collapsed' : ''}`}>
      <div className="rail-brand">
        <div className="mark">I</div>
        <span className="nav-label wordmark">Inkwell</span>
        {!unlocked && !collapsed && <span className="demo-chip">Demo</span>}
        <button
          className="icon-btn sm rail-collapse"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          <Icon name="chevron" size={15} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
        </button>
      </div>

      <button
        className="btn btn-primary btn-block rail-new"
        style={{ marginBottom: 18 }}
        onClick={() => createArticle()}
        title="New Article"
      >
        <Icon name="plus" size={17} strokeWidth={2} /> <span className="nav-label">New Article</span>
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
              title={collapsed ? n.label : undefined}
            >
              <Icon name={n.icon} size={19} />
              <span className="nav-label">{n.label}</span>
              {count !== null && count > 0 && <span className="badge-count">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="rail-spacer" />

      <div className="rail-foot">
        <button
          className="nav-item"
          onClick={toggleTheme}
          title={collapsed ? (theme === 'light' ? 'Night' : 'Day') : undefined}
        >
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
          <span className="nav-label">{theme === 'light' ? 'Night' : 'Day'}</span>
        </button>
      </div>
    </nav>
  )
}

// Mobile chrome — a floating "Liquid Glass" tab bar (iOS 26 register) plus a
// floating compose button. The "+New → idea" path works on a phone (PRD §10.6).
function buildTabs(unlocked: boolean): NavItem[] {
  return [
    { view: 'home', label: 'Home', icon: 'home' },
    { view: 'archive', label: 'Archive', icon: 'archive' },
    { view: 'craft', label: 'Craft', icon: 'chart' },
    // Config Track is personal-only — shown once unlocked.
    ...(unlocked ? ([{ view: 'config', label: 'Config', icon: 'config' }] as NavItem[]) : []),
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ]
}

export function TabBar() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const createArticle = useStore((s) => s.createArticle)
  const unlocked = useStore((s) => s.unlocked)
  const TABS = buildTabs(unlocked)
  const inEditor = view === 'editor'

  return (
    <>
      <button className={`compose-fab ${inEditor || view === 'learn' ? 'hide' : ''}`} onClick={() => createArticle()} aria-label="New article">
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
