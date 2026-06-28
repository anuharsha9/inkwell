import { useRef, useState } from 'react'
import { useStore } from '@/store'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { ACCENT_SWATCHES } from '@/lib/accent'
import { exportJSON, exportMarkdownZip, parseBackup } from '@/lib/backup'
import { isAIConfigured, learnVoice } from '@/lib/ai'

export function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const articles = useStore((s) => s.articles)
  const images = useStore((s) => s.images)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const importBackup = useStore((s) => s.importBackup)
  const push = useToast((s) => s.push)

  const setView = useStore((s) => s.setView)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ text: string; count: number } | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  async function learnMyVoice() {
    setVoiceBusy(true)
    setVoiceError('')
    try {
      const samples = Object.values(articles)
        .map((a) => a.body.trim())
        .filter((b) => b.split(/\s+/).length >= 40)
        .slice(0, 12)
      if (samples.length === 0) {
        setVoiceError('Write a few articles first — there’s not enough of your writing to learn from yet.')
        return
      }
      const profile = await learnVoice(samples, settings)
      updateSettings({ voiceProfile: profile, voiceProfileUpdatedAt: new Date().toISOString() })
      push('Learned your voice')
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : 'Could not learn your voice right now.')
    } finally {
      setVoiceBusy(false)
    }
  }

  function onPickFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const backup = parseBackup(reader.result as string)
        setPendingImport({ text: reader.result as string, count: backup.articles.length })
      } catch (e) {
        push(e instanceof Error ? e.message : 'Could not read that file')
      }
    }
    reader.readAsText(file)
  }

  async function confirmImport() {
    if (!pendingImport) return
    const backup = parseBackup(pendingImport.text)
    await importBackup(backup.articles, backup.images ?? [], backup.settings)
    setPendingImport(null)
    push(`Imported ${backup.articles.length} articles`)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Make it yours. Everything saves locally, on this device.</div>
        </div>
      </div>

      <div className="settings">
        {/* ── Appearance ──────────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Appearance</h2>
          <div className="set-field">
            <label>Signature accent</label>
            <div className="swatches">
              {ACCENT_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  className={`swatch ${settings.accent === sw.hex ? 'on' : ''}`}
                  style={{ background: sw.hex }}
                  title={sw.name}
                  onClick={() => updateSettings({ accent: sw.hex })}
                >
                  {settings.accent === sw.hex && <Icon name="check" size={15} strokeWidth={2.4} />}
                </button>
              ))}
              <label className="swatch custom" title="Custom color">
                <input
                  type="color"
                  value={settings.accent || '#3f4ba8'}
                  onChange={(e) => updateSettings({ accent: e.target.value })}
                />
                <Icon name="pen" size={14} />
              </label>
            </div>
          </div>
          <div className="set-field row">
            <div>
              <label>Theme</label>
              <p className="set-hint">{theme === 'dark' ? 'Night — for writing after dark.' : 'Day — warm paper.'}</p>
            </div>
            <button className="btn btn-soft" onClick={toggleTheme}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
              Switch to {theme === 'light' ? 'Night' : 'Day'}
            </button>
          </div>
        </section>

        {/* ── AI writing partner ──────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">AI writing partner</h2>
          <p className="set-hint">
            Powers the Writing Coach — rewrites, draft reviews, lessons, and web-sourced craft insights, all in your
            voice. Uses Claude. Your key is stored only on this device and never shipped.
          </p>
          <Field
            label="Anthropic API key"
            type="password"
            placeholder="sk-ant-…"
            value={settings.aiApiKey}
            onChange={(v) => updateSettings({ aiApiKey: v })}
          />
          <Field
            label="Model"
            placeholder="claude-opus-4-8"
            value={settings.aiModel}
            onChange={(v) => updateSettings({ aiModel: v })}
          />

          <div className="set-field">
            <label>Your voice</label>
            <p className="set-hint" style={{ marginBottom: 10 }}>
              Learn your voice from your own writing so every suggestion sounds like you. Re-run it as you write more —
              it sharpens over time.
            </p>
            <button className="btn btn-soft" disabled={voiceBusy || !isAIConfigured(settings)} onClick={learnMyVoice}>
              {voiceBusy ? 'Reading your writing…' : settings.voiceProfile ? 'Re-learn my voice' : 'Learn my voice'}
            </button>
            {!isAIConfigured(settings) && <p className="set-hint" style={{ marginTop: 8 }}>Add your key above first.</p>}
            {voiceError && <div className="ai-error" style={{ marginTop: 10 }}>{voiceError}</div>}
            {settings.voiceProfile && (
              <textarea
                className="meta-textarea"
                style={{ marginTop: 10, minHeight: 120 }}
                value={settings.voiceProfile}
                onChange={(e) => updateSettings({ voiceProfile: e.target.value })}
              />
            )}
          </div>
        </section>

        {/* ── Trust, transparency & governance ────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Trust, transparency &amp; governance</h2>
          <p className="set-hint">
            Inkwell is local-first and honest about what the AI does. You're in control of all of it.
          </p>

          <div className="trust-flows">
            <div className="meta-label">What leaves this device</div>
            <ul className="trust-list">
              <li>
                <strong>Coaching &amp; reviews</strong> — when you use the Writing Coach, the draft text is sent to
                Anthropic (Claude) to generate the suggestion, then the response comes back. Nothing is stored on their
                side by you here.
              </li>
              <li>
                <strong>Web insights &amp; originality</strong> — these also let Claude run web searches based on your
                draft. Turn this off below if you'd rather it never search the web.
              </li>
              <li>
                <strong>Vocabulary</strong> — only the single word you look up is sent to the public dictionary API.
              </li>
              <li>
                <strong>Everything else</strong> — your articles, images, settings, voice profile and word bank live
                only in this browser. No accounts, no analytics, never sold or shared.
              </li>
            </ul>
          </div>

          <div className="set-field">
            <label>Governance</label>
            <button
              className={`toggle-row ${settings.aiEnabled ? 'on' : ''}`}
              style={{ marginTop: 8 }}
              onClick={() => updateSettings({ aiEnabled: !settings.aiEnabled })}
            >
              <Icon name="spark" size={16} />
              <span>AI writing features</span>
              <span className="switch" />
            </button>
            <button
              className={`toggle-row ${settings.allowWebSearch ? 'on' : ''}`}
              style={{ marginTop: 8 }}
              onClick={() => updateSettings({ allowWebSearch: !settings.allowWebSearch })}
            >
              <Icon name="sources" size={16} />
              <span>Allow web search for insights &amp; originality</span>
              <span className="switch" />
            </button>
          </div>

          <div className="set-field">
            <label>Security</label>
            <p className="set-hint" style={{ marginBottom: 10 }}>
              Your Anthropic key is stored in this browser's local database, unencrypted, on this device only — it's
              never bundled into the app or sent anywhere except Anthropic's API. On a shared computer, clear it when
              you're done.
            </p>
            <div className="set-btn-row">
              <button
                className="btn btn-soft"
                disabled={!settings.aiApiKey}
                onClick={() => {
                  updateSettings({ aiApiKey: '' })
                  push('AI key cleared')
                }}
              >
                <Icon name="close" size={15} /> Clear AI key
              </button>
              <button
                className="btn btn-soft"
                onClick={() => {
                  updateSettings({ aiApiKey: '', voiceProfile: '', voiceProfileUpdatedAt: '' })
                  push('AI key + voice profile cleared')
                }}
              >
                <Icon name="trash" size={15} /> Clear all AI data
              </button>
            </div>
          </div>
        </section>

        {/* ── Source material ─────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Source material</h2>
          <p className="set-hint">
            Article ideas drawn from your real work — case studies, app PRDs, career stories. Add any to the Archive as a
            fresh idea.
          </p>
          <button className="btn btn-soft" onClick={() => setView('sources')}>
            <Icon name="sources" size={16} /> Browse source material
          </button>
        </section>

        {/* ── Publishing ──────────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Publishing destinations</h2>
          <p className="set-hint">
            Used by the “Publish to…” buttons. Copy your article, we open the composer, you paste and post.
          </p>
          <Field
            label="Substack new-post URL"
            placeholder="https://yourname.substack.com/publish/post"
            value={settings.substackUrl}
            onChange={(v) => updateSettings({ substackUrl: v })}
          />
          <Field
            label="LinkedIn profile URL"
            placeholder="https://www.linkedin.com/in/you"
            value={settings.linkedinUrl}
            onChange={(v) => updateSettings({ linkedinUrl: v })}
          />
          <Field
            label="Medium username"
            placeholder="@you"
            value={settings.mediumUsername}
            onChange={(v) => updateSettings({ mediumUsername: v })}
          />
        </section>

        {/* ── Image AI ────────────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Image generation</h2>
          <p className="set-hint">
            Point this at any image provider that speaks the OpenAI-style images API. Stored only on this device; nothing
            is hardcoded. Leave blank and Upload / URL still work fully.
          </p>
          <Field
            label="Endpoint"
            placeholder="https://api.openai.com/v1/images/generations"
            value={settings.imageApiEndpoint}
            onChange={(v) => updateSettings({ imageApiEndpoint: v })}
          />
          <Field
            label="API key"
            type="password"
            placeholder="sk-…"
            value={settings.imageApiKey}
            onChange={(v) => updateSettings({ imageApiKey: v })}
          />
          <Field
            label="Model"
            placeholder="gpt-image-1"
            value={settings.imageApiModel}
            onChange={(v) => updateSettings({ imageApiModel: v })}
          />
        </section>

        {/* ── Backup ──────────────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Backup &amp; portability</h2>
          <p className="set-hint">Your insurance. Export anytime; import to restore or move machines.</p>
          <div className="set-btn-row">
            <button className="btn btn-soft" onClick={() => exportJSON(Object.values(articles), Object.values(images), settings)}>
              <Icon name="download" size={16} /> Export JSON backup
            </button>
            <button className="btn btn-soft" onClick={() => void exportMarkdownZip(Object.values(articles), images)}>
              <Icon name="download" size={16} /> Export Markdown + images
            </button>
            <button className="btn btn-soft" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> Import from JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) onPickFile(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
        </section>

        <p className="set-foot">
          Inkwell · a personal article archive &amp; publishing queue. {Object.keys(articles).length} articles held
          locally.
        </p>
      </div>

      {/* Import confirm */}
      {pendingImport && (
        <div className="modal-scrim" onClick={() => setPendingImport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Replace everything with this backup?</h3>
            <p>
              This will overwrite your current {Object.keys(articles).length} articles with the {pendingImport.count} from
              the file. Export a backup first if you're unsure.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void confirmImport()}>
                Import &amp; replace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="set-field">
      <label>{label}</label>
      <input
        className="meta-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
