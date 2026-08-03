import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { NavRail, TabBar } from './components/NavRail'
import { ScrollHeader } from './components/ScrollHeader'
import { Toaster } from './components/ui'
import { Home } from './views/Home'
import { Learn } from './views/Learn'
import { Archive } from './views/Archive'
import { Editor } from './views/Editor'
import { Config } from './views/Config'
import { Craft } from './views/Craft'
import { Book } from './views/Book'
import { Sources } from './views/Sources'
import { Settings } from './views/Settings'
import { TourController } from './components/tour/TourController'
import { WardenAnalytics } from './components/WardenAnalytics'
import { NewArticleDialog } from './components/NewArticleDialog'
import { Celebration } from './components/Celebration'
import { applyAccent, clearAccent } from './lib/accent'

const VIEW_TITLES: Record<string, string> = {
  home: 'Home',
  archive: 'The Archive',
  craft: 'Writing Craft',
  book: 'Book',
  config: 'Config Track',
  sources: 'Sources',
  settings: 'Settings',
  learn: 'Inkwell',
}

export function App() {
  const loaded = useStore((s) => s.loaded)
  const view = useStore((s) => s.view)
  const init = useStore((s) => s.init)
  const accent = useStore((s) => s.settings.accent)
  const prevView = useRef(view)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (accent) applyAccent(accent)
    else clearAccent()
  }, [accent])

  // Color temperature: warm in the editor, neutral elsewhere
  useEffect(() => {
    if (view === 'editor') document.body.classList.add('temp-warm')
    else document.body.classList.remove('temp-warm')
    return () => document.body.classList.remove('temp-warm')
  }, [view])

  // View Transitions API for smooth page switches
  useEffect(() => {
    if (prevView.current !== view && document.startViewTransition) {
      document.startViewTransition(() => {})
    }
    prevView.current = view
  }, [view])

  if (!loaded) {
    return (
      <div className="boot">
        <div className="mark">I</div>
      </div>
    )
  }

  return (
    <div className="app">
      <NavRail />
      <main className="main">
        <div className="main-scroll">
          {view === 'editor' ? (
            <Editor />
          ) : (
            <>
              {view !== 'learn' && <ScrollHeader title={VIEW_TITLES[view] || ''} />}
              <div className="page view-fade" key={view}>
                {view === 'home' && <Home />}
                {view === 'learn' && <Learn />}
                {view === 'archive' && <Archive />}
                {view === 'craft' && <Craft />}
                {view === 'book' && <Book />}
                {view === 'config' && <Config />}
                {view === 'sources' && <Sources />}
                {view === 'settings' && <Settings />}
              </div>
            </>
          )}
        </div>
      </main>
      <TabBar />
      <Toaster />
      <NewArticleDialog />
      <Celebration />
      <TourController />
      <WardenAnalytics />
    </div>
  )
}
