import { useEffect, useState } from 'react'
import { Icon, type IconName } from '@/components/Icon'

// The interactive "What Inkwell does" 1-2-3. Each step is selectable (and
// auto-advances); the preview panel demonstrates that step with a small, static
// mock — no real data or AI, so it's reliable on the public landing.

interface Step {
  n: number
  icon: IconName
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    n: 1,
    icon: 'archive',
    title: 'Feed it your voice',
    body: 'Drop in your past writing, notes, and links. Inkwell learns how you write — and what you know.',
  },
  {
    n: 2,
    icon: 'pen',
    title: 'Draft on any topic',
    body: 'Tell it what you want to write about. Inkwell writes the first draft — in your voice, grounded in your material.',
  },
  {
    n: 3,
    icon: 'chart',
    title: 'Refine and get sharper',
    body: 'Edit with a coach that improves the piece and teaches you the craft — so the next one comes easier.',
  },
]

const ADVANCE_MS = 4600

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(m.matches)
    const onChange = () => setReduce(m.matches)
    m.addEventListener?.('change', onChange)
    return () => m.removeEventListener?.('change', onChange)
  }, [])
  return reduce
}

export function Onboarding() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduce = usePrefersReducedMotion()

  useEffect(() => {
    if (paused || reduce) return
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), ADVANCE_MS)
    return () => clearTimeout(t)
  }, [active, paused, reduce])

  return (
    <section className="ob">
      <span className="learn-eyebrow">
        <Icon name="spark" size={14} /> What Inkwell does
      </span>
      <h2 className="learn-h2">Beat the blank page — in your own voice</h2>

      <div
        className="ob-stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="ob-steps" role="tablist" aria-label="How Inkwell works">
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`ob-step ${i === active ? 'is-active' : ''}`}
              onClick={() => {
                setActive(i)
                setPaused(true)
              }}
            >
              <span className="ob-step-num">{s.n}</span>
              <span className="ob-step-ic">
                <Icon name={s.icon} size={20} />
              </span>
              <span className="ob-step-tx">
                <span className="ob-step-title">{s.title}</span>
                <span className="ob-step-body">{s.body}</span>
              </span>
              {!reduce && !paused && i === active && <span key={active} className="ob-step-timer" />}
            </button>
          ))}
        </div>

        <div className="ob-preview" key={active} aria-live="polite">
          {active === 0 && <PreviewFeed />}
          {active === 1 && <PreviewDraft />}
          {active === 2 && <PreviewCoach />}
        </div>
      </div>

      <p className="ob-foot">Writer’s block, gone — and you come out a better writer.</p>
    </section>
  )
}

// ── Step 1: your material becoming a voice ──────────────────────────────────
function PreviewFeed() {
  const chips = [
    { icon: 'pen' as IconName, label: 'The Day I Stopped Apologizing' },
    { icon: 'archive' as IconName, label: 'Why I sketch in pen — notes' },
    { icon: 'search' as IconName, label: 'medium.com/@you/essay' },
  ]
  return (
    <div className="ob-card ob-feed">
      <div className="ob-card-head">Your material</div>
      <div className="ob-chips">
        {chips.map((c, i) => (
          <div className="ob-chip" style={{ animationDelay: `${i * 160}ms` }} key={c.label}>
            <Icon name={c.icon} size={14} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      <div className="ob-voice">
        <span className="ob-voice-dot" />
        <span className="ob-voice-text">Voice learned — direct, unhedged, first-person</span>
        <Icon name="check" size={14} strokeWidth={2.4} />
      </div>
    </div>
  )
}

// ── Step 2: a topic becoming a draft ────────────────────────────────────────
function PreviewDraft() {
  const lines = [
    'For years I prefaced every pull request with the same',
    'three words: sorry, it’s rough. I thought I was being',
    'humble. I was teaching everyone to discount my work.',
  ]
  return (
    <div className="ob-card ob-draft">
      <div className="ob-topic">
        <Icon name="pen" size={13} />
        <span>Topic: writing with confidence</span>
      </div>
      <div className="ob-draft-body">
        {lines.map((l, i) => (
          <span className="ob-line" style={{ animationDelay: `${300 + i * 420}ms` }} key={l}>
            {l}
          </span>
        ))}
        <span className="ob-caret" />
      </div>
    </div>
  )
}

// ── Step 3: a coach suggestion that teaches ─────────────────────────────────
function PreviewCoach() {
  return (
    <div className="ob-card ob-coach">
      <div className="ob-coach-tag">Voice · the lesson</div>
      <p className="ob-coach-note">Cut the hedge — commit to the claim so the reader trusts it.</p>
      <div className="ob-diff">
        <span className="ob-before">I think this might be a better approach.</span>
        <span className="ob-after">This is the better approach.</span>
      </div>
      <div className="ob-apply">
        <Icon name="check" size={13} strokeWidth={2.4} /> Apply
      </div>
    </div>
  )
}
