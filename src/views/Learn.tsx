import { useStore } from '@/store'
import { Icon, type IconName } from '@/components/Icon'
import { isAIConfigured } from '@/lib/ai'
import { DEMO_MODE } from '@/lib/env'

interface Feature {
  icon: IconName
  title: string
  body: string
}

const FEATURES: Feature[] = [
  {
    icon: 'archive',
    title: 'Write ahead, publish on a whim',
    body: 'Draft into an archive during bursts; publish from inventory whenever the urge hits. Writing and publishing are fully decoupled — no schedule, no pressure.',
  },
  {
    icon: 'calendar',
    title: 'A publishing pipeline that plans itself',
    body: 'Set a posting cadence, schedule pieces by date, and the dashboard shows the next things you’ll publish and when — filling open days from what’s ready. Every piece knows whether it’s a full article or a feed post.',
  },
  {
    icon: 'focus',
    title: 'Distraction-free focus mode',
    body: 'One click hides everything — rail, panels, chrome — leaving just your words on a calm, centered page. A quiet ring tracks the words you’ve written this sitting. Autosave never stops.',
  },
  {
    icon: 'spark',
    title: 'An AI coach in your voice',
    body: 'It learns your voice from your own writing, then tightens, sharpens, expands, and continues drafts — never flattening you into generic AI prose. When a piece is bound for LinkedIn, it coaches to the platform: hook above the fold, feed-native formatting, endings that earn comments. Review cards apply in one click.',
  },
  {
    icon: 'pen',
    title: 'A teacher, not just an editor',
    body: 'Every fix explains the craft principle behind it. Per-draft lessons ("you explain too much", "vary your rhythm") and web-sourced, cited insights help you get better the more you write.',
  },
  {
    icon: 'dots',
    title: 'Local intelligence — no API needed',
    body: 'Readability on real syllable rules, length-robust vocabulary range (MATTR), sentence rhythm, and part-of-speech analysis — real passive voice, weak verbs, nominalizations — all on your device, instantly, offline. Publish-readiness is even scored against your own published work.',
  },
  {
    icon: 'search',
    title: 'Vocabulary that grows with you',
    body: 'Real dictionary lookups build a personal word bank — then spaced-repetition review turns it into practice: recall, grade, and the words you struggle with come back sooner. Plus an AI pass that lifts weak diction in drafts.',
  },
  {
    icon: 'reroll',
    title: 'Never lose a word',
    body: 'Every edit and AI rewrite is snapshotted. Undo any change in one click, or restore an earlier version from the history panel — so the blank page is always safe to experiment on.',
  },
  {
    icon: 'shield',
    title: 'Privacy & fact-check guard',
    body: 'Before you publish, it flags anything confidential — salary, address, birthdate, named employers — and suggests generic replacements. Nothing personal slips out by accident.',
  },
  {
    icon: 'check',
    title: 'Originality check',
    body: 'Catches passages you’ve reused across your own pieces — verbatim and lightly reworded (echoes) — locally and instantly, and with web search flags lines that match published material. Your work stays yours.',
  },
  {
    icon: 'chart',
    title: 'A mirror for your craft',
    body: 'Writing Craft reads across everything you’ve written — readability, sentence rhythm, lexical range, the habits you lean on and the strengths that recur — then distills a close read of your voice that sharpens the more you write. A writing-days heatmap turns consistency into a habit you can see.',
  },
]

const ENGINE: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'home',
    title: 'Local-first by default',
    body: 'Your articles, images, settings, voice profile and word bank live only in your browser. When you run it on your own machine, every piece is also mirrored to real markdown files in your project folder — so your writing is never lost and never locked in.',
  },
  {
    icon: 'dots',
    title: 'Two tiers of intelligence',
    body: 'Fast, free, private statistical models (readability, rhythm, readiness) handle the everyday analysis on your device. The live AI — Claude — is reserved for genuinely generative work: rewrites, lessons, web-grounded insights. Less dependence on the cloud, more that just works.',
  },
  {
    icon: 'settings',
    title: 'Your key, your device, your controls',
    body: 'The AI key is stored only in your local settings, never bundled or shipped. Governance toggles let you switch all AI off or forbid web search. A clear data-flow disclosure tells you exactly what leaves your device, and when.',
  },
  {
    icon: 'shield',
    title: 'Honest AI',
    body: 'It never invents facts, figures, employers, or sources — it leaves bracketed placeholders for specifics you must supply, and grounds web insights in real cited material. The AI proposes; nothing changes in your draft, or gets published, without your click.',
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
        <p className="learn-tag">A personal writing studio — an archive, a publishing queue, an AI coach, and a craft teacher, in one calm, local-first tool.</p>
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

      <section className="learn-section">
        <h2 className="learn-h2">What makes it different</h2>
        <div className="learn-grid">
          {FEATURES.map((f) => (
            <div className="learn-card" key={f.title}>
              <div className="learn-card-icon">
                <Icon name={f.icon} size={20} />
              </div>
              <h3 className="learn-card-title">{f.title}</h3>
              <p className="learn-card-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="learn-section">
        <h2 className="learn-h2">How the Inkwell engine works</h2>
        <p className="learn-lead">
          Inkwell is built around a simple belief: a writing tool should make you better without ever taking your work,
          your privacy, or your judgement out of your hands.
        </p>
        <div className="learn-engine">
          {ENGINE.map((e) => (
            <div className="learn-engine-row" key={e.title}>
              <div className="learn-engine-icon">
                <Icon name={e.icon} size={20} />
              </div>
              <div>
                <h3 className="learn-engine-title">{e.title}</h3>
                <p className="learn-engine-body">{e.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="learn-cta">
        <h2 className="learn-h2">Try it yourself</h2>
        <p className="learn-lead">
          Browse the sample articles, open one in the editor, and run the Coach. The local stats, vocabulary, privacy
          and originality checks all work with no setup. To unlock the live AI coach, add your own Anthropic API key in
          Settings — it's stored only in your browser, on this device, and never shipped anywhere.
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
