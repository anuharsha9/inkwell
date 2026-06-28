import { useStore } from '@/store'
import { configArticles } from '@/lib/selectors'
import { countWords } from '@/lib/text'
import { StatusPill } from '@/components/ui'
import { Icon } from '@/components/Icon'

// Gentle countdown to the proposal deadline — months/weeks, motivation not pressure.
function countdown(deadlineISO: string): { label: string; past: boolean } {
  const now = new Date()
  const deadline = new Date(deadlineISO + 'T00:00:00')
  const ms = deadline.getTime() - now.getTime()
  if (ms <= 0) return { label: 'the deadline has passed', past: true }
  const days = Math.ceil(ms / 86400000)
  if (days <= 21) return { label: `${days} day${days === 1 ? '' : 's'} to go`, past: false }
  const weeks = Math.round(days / 7)
  if (weeks <= 10) return { label: `~${weeks} weeks to go`, past: false }
  const months = Math.round(days / 30.4)
  return { label: `~${months} months to go`, past: false }
}

export function Config() {
  const articles = useStore((s) => s.articles)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const openEditor = useStore((s) => s.openEditor)
  const toggleConfigTalk = useStore((s) => s.toggleConfigTalk)

  const list = configArticles(Object.values(articles))
  const cd = countdown(settings.configDeadline)
  const outlineWords = countWords(settings.configOutline)
  const inRange = outlineWords >= 200 && outlineWords <= 400

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Config Track</h1>
          <div className="page-sub">A talk that assembles itself from a year of real writing.</div>
        </div>
      </div>

      {/* ── Thesis + deadline ─────────────────────────────────────── */}
      <div className="config-hero">
        <div className="config-thesis">
          <div className="meta-label">Working thesis</div>
          <textarea
            className="thesis-input"
            value={settings.configThesis}
            rows={3}
            onChange={(e) => updateSettings({ configThesis: e.target.value })}
          />
        </div>
        <div className="config-deadline">
          <div className="meta-label">Proposal deadline</div>
          <input
            type="date"
            className="meta-input"
            value={settings.configDeadline}
            onChange={(e) => updateSettings({ configDeadline: e.target.value })}
          />
          <div className={`countdown ${cd.past ? 'past' : ''}`}>
            <Icon name="calendar" size={15} />
            {cd.label}
          </div>
        </div>
      </div>

      {/* ── Gathered pieces ───────────────────────────────────────── */}
      <div className="config-section-head">
        <h2 className="group-title plain">Pieces feeding the talk</h2>
        <span className="group-count">{list.length}</span>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="glyph">
            <Icon name="config" size={24} />
          </div>
          <h3>No pieces tagged yet</h3>
          <p>Flip “Feeds the Config talk” on any article and it gathers here, in plan order.</p>
        </div>
      ) : (
        <div className="config-list">
          {list.map((a) => (
            <div className="config-row" key={a.id}>
              <span className="numbadge">{a.number !== null ? String(a.number).padStart(2, '0') : '+'}</span>
              <div className="config-row-main" onClick={() => openEditor(a.id)}>
                <h3 className="config-row-title">{a.title || 'Untitled'}</h3>
                <p className="config-row-note">
                  {a.configNote || <span className="muted">No contribution note yet — add one in the editor.</span>}
                </p>
              </div>
              <div className="config-row-meta">
                <StatusPill status={a.status} />
                <span className="wc">{a.wordCount.toLocaleString()}w</span>
                <button
                  className="icon-btn sm"
                  title="Remove from talk"
                  onClick={() => toggleConfigTalk(a.id)}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Outline scratch space ─────────────────────────────────── */}
      <div className="config-section-head" style={{ marginTop: 34 }}>
        <h2 className="group-title plain">Proposal outline</h2>
        <span className={`wordwindow ${inRange ? 'in' : ''}`}>
          {outlineWords} words · target 200–400
        </span>
      </div>
      <textarea
        className="outline-input"
        value={settings.configOutline}
        placeholder="Shape the 200–400 word proposal here over the year. Draw from the pieces above. Autosaved like everything else."
        onChange={(e) => updateSettings({ configOutline: e.target.value })}
      />
    </>
  )
}
