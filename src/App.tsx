import { useEffect } from 'react'
import { useStore } from './store'
import { NavRail, TabBar } from './components/NavRail'
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
import { NewArticleDialog } from './components/NewArticleDialog'
import { applyAccent, clearAccent } from './lib/accent'

export function App() {
  const loaded = useStore((s) => s.loaded)
  const view = useStore((s) => s.view)
  const init = useStore((s) => s.init)
  const accent = useStore((s) => s.settings.accent)

  useEffect(() => {
    void init()
  }, [init])

  // Apply the user's chosen signature accent (Moleskine-app style).
  useEffect(() => {
    if (accent) applyAccent(accent)
    else clearAccent()
  }, [accent])

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
            <div className="page">
              {view === 'home' && <Home />}
              {view === 'learn' && <Learn />}
              {view === 'archive' && <Archive />}
              {view === 'craft' && <Craft />}
              {view === 'book' && <Book />}
              {view === 'config' && <Config />}
              {view === 'sources' && <Sources />}
              {view === 'settings' && <Settings />}
            </div>
          )}
        </div>
      </main>
      <TabBar />
      <Toaster />
      <NewArticleDialog />
      <TourController />
    </div>
  )
}
