import { useStore } from '@/store'
import { Icon, type IconName } from '@/components/Icon'
import { isAIConfigured } from '@/lib/ai'
import { DEMO_MODE } from '@/lib/env'
import { Onboarding } from '@/components/learn/Onboarding'

// Three differentiators — distinct from the 1-2-3 (which is *how it works*).
// These are *why it's different*: your voice, privacy, and a free local tier.
const TRIO: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'spark',
    title: 'It sounds like you',
    body: 'Inkwell learns your voice from your own writing — then drafts, tightens, and coaches in it. Never generic AI prose.',
  },
  {
    icon: 'home',
    title: 'Private by design',
    body: 'Local-first: your writing, your key, your device. No accounts, no tracking — nothing leaves unless you ask it to.',
  },
  {
    icon: 'chart',
    title: 'Free on-device smarts',
    body: 'Readability, rhythm, vocabulary and originality checks run on your device — instant, offline, no key needed.',
  },
]

export function Learn() {
  const setView = useStore((s) => s.setView)
  const configured = useStore((s) => isAIConfigured(s.settings))

  return (
    <div className="learn">
      <header className="learn-hero">
        <div className="learn-mark">I</div>
        <h1 className="learn-title">Inkwell</h1>
        <p className="learn-tag">
          A personal writing studio — an archive, a publishing queue, an AI coach, and a craft teacher, in one calm,
          local-first tool.
        </p>
        <div className="learn-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setView('home')}>
            <Icon name="arrowLeft" size={16} style={{ transform: 'rotate(180deg)' }} /> Explore the app
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setView('settings')}>
            <Icon name="spark" size={16} /> {configured ? 'AI is connected' : 'Add your own AI key'}
          </button>
        </div>
        {DEMO_MODE && (
          <p className="learn-demo-note">
            You're exploring a demo with fictional sample articles. Everything is real and interactive — the on-device
            features work right now, and you can add your own Anthropic key (it stays in your browser) to try the live
            AI coach.
          </p>
        )}
      </header>

      <Onboarding />

      <section className="learn-trio-wrap">
        <div className="learn-trio">
          {TRIO.map((t) => (
            <div className="learn-trio-card" key={t.title}>
              <div className="learn-trio-icon">
                <Icon name={t.icon} size={20} />
              </div>
              <h3 className="learn-trio-title">{t.title}</h3>
              <p className="learn-trio-body">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="learn-trust">
        <Icon name="shield" size={16} />
        <span>Your writing, your key, your device. No accounts, no tracking, no lock-in.</span>
      </section>

      <section className="learn-cta">
        <h2 className="learn-h2">Try it yourself</h2>
        <p className="learn-cta-lead">
          Open a sample piece and run the Coach. The local stats, vocabulary, and checks all work with no setup — add
          your own key to turn on the live AI coach.
        </p>
        <div className="learn-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setView('home')}>
            Open the studio
          </button>
          <button className="btn btn-soft btn-lg" onClick={() => setView('settings')}>
            <Icon name="settings" size={16} /> Add your key
          </button>
        </div>
      </section>
    </div>
  )
}
