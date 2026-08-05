import { useRef, useState } from 'react'
import { useStore } from '@/store'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { ACCENT_SWATCHES } from '@/lib/accent'
import { exportJSON, exportMarkdownZip, parseBackup } from '@/lib/backup'
import { isAIConfigured, learnVoice } from '@/lib/ai'
import { scanDiskChanges, type DiskChange } from '@/lib/disksync'
import { DEMO_MODE } from '@/lib/env'

export function Settings() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const articles = useStore((s) => s.articles)
  const images = useStore((s) => s.images)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const importBackup = useStore((s) => s.importBackup)
  const vocab = useStore((s) => s.vocab)
  const customSources = useStore((s) => s.customSources)
  const push = useToast((s) => s.push)

  const setView = useStore((s) => s.setView)
  const snapshotVersion = useStore((s) => s.snapshotVersion)
  const updateArticle = useStore((s) => s.updateArticle)
  const unlocked = useStore((s) => s.unlocked)
  const unlock = useStore((s) => s.unlock)
  const lock = useStore((s) => s.lock)
  const [pass, setPass] = useState('')
  const [unlockErr, setUnlockErr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ text: string; count: number } | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [diskChanges, setDiskChanges] = useState<DiskChange[] | null>(null)
  const [scanning, setScanning] = useState(false)

  async function scanDisk() {
    setScanning(true)
    try {
      setDiskChanges(await scanDiskChanges(articles))
    } finally {
      setScanning(false)
    }
  }
  function pullChange(c: DiskChange) {
    snapshotVersion(c.articleId, 'before disk sync')
    updateArticle(c.articleId, { body: c.diskBody }, { immediate: true })
    setDiskChanges((prev) => (prev ? prev.filter((x) => x.articleId !== c.articleId) : prev))
    push(`Pulled “${c.title}” from disk`)
  }

  async function doUnlock() {
    const ok = await unlock(pass)
    if (ok) {
      setPass('')
      setUnlockErr(false)
      push('Personal features unlocked')
    } else {
      setUnlockErr(true)
    }
  }

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
    await importBackup(backup.articles, backup.images ?? [], backup.settings, backup.vocab, backup.customSources)
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
        {/* ── Personal unlock ─────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Personal</h2>
          {unlocked ? (
            <>
              <p className="set-hint">
                Personal features are unlocked on this device — the Config Track, Book, and your source material.
              </p>
              <button className="btn btn-soft" onClick={() => lock()}>
                <Icon name="settings" size={16} /> Return to demo (lock)
              </button>
            </>
          ) : (
            <>
              <p className="set-hint">
                You’re viewing the demo. Enter your passphrase to unlock your personal features (Config Track, Book,
                source material). Your real writing is never in this build — it lives in your own workspace.
              </p>
              <form
                className="set-field"
                onSubmit={(e) => {
                  e.preventDefault()
                  void doUnlock()
                }}
              >
                <input
                  type="password"
                  className="input"
                  placeholder="unlock passphrase"
                  value={pass}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setPass(e.target.value)
                    setUnlockErr(false)
                  }}
                />
                <button className="btn btn-primary" type="submit" style={{ marginTop: 10 }}>
                  Unlock personal features
                </button>
                {unlockErr && (
                  <p className="set-hint" style={{ color: 'var(--danger, #ef4444)', marginTop: 8 }}>
                    That passphrase didn’t match.
                  </p>
                )}
              </form>
            </>
          )}
        </section>

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
            placeholder={DEMO_MODE ? 'claude-opus-4-8' : 'claude-fable-5'}
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
            <label>Private terms — never publish these</label>
            <p className="set-hint" style={{ marginBottom: 8 }}>
              Real employers, product names, or people you want kept out of published pieces. The privacy guard flags any
              of these in a draft, locally — one per line. (Kept on this device; never shipped to the demo.)
            </p>
            <textarea
              className="meta-textarea"
              rows={4}
              placeholder={'Acme Corp\nProjectX\na former manager’s name'}
              value={settings.privacyTerms.join('\n')}
              onChange={(e) =>
                updateSettings({
                  privacyTerms: e.target.value
                    .split(/[\n,]/)
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
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

        {/* ── Semantic search (on-device) — personal ──────────────── */}
        {unlocked && (
          <section className="set-card">
            <h2 className="set-title">Semantic search (on-device)</h2>
            <p className="set-hint">
              Turns on “Closest in meaning” in the Writing Coach — it finds past pieces that echo a draft's{' '}
              <em>ideas</em>, not just its wording, so you catch yourself re-treading themes. Runs a small AI model
              entirely in your browser: no key, no API, nothing sent anywhere. The first time you use it, it downloads a
              one-time ~23&nbsp;MB model and caches it for offline use after that.
            </p>
            <button
              className={`toggle-row ${settings.semanticEnabled ? 'on' : ''}`}
              style={{ marginTop: 8 }}
              onClick={() => updateSettings({ semanticEnabled: !settings.semanticEnabled })}
            >
              <Icon name="spark" size={16} />
              <span>On-device semantic similarity</span>
              <span className="switch" />
            </button>
            {settings.semanticEnabled && (
              <p className="set-hint" style={{ marginTop: 10 }}>
                Enabled. Open any article's Writing Coach → Checks to find its closest matches. The model downloads on
                first use.
              </p>
            )}
          </section>
        )}

        {/* ── Source material (personal) ──────────────────────────── */}
        {unlocked && (
          <section className="set-card">
            <h2 className="set-title">Source material</h2>
            <p className="set-hint">
              Article ideas drawn from your real work — case studies, app PRDs, career stories. Add any to the Archive as
              a fresh idea.
            </p>
            <button className="btn btn-soft" onClick={() => setView('sources')}>
              <Icon name="sources" size={16} /> Browse source material
            </button>
          </section>
        )}

        {/* ── Local files (two-way sync) — personal ───────────────── */}
        {unlocked && (
          <section className="set-card">
            <h2 className="set-title">Local files</h2>
            <p className="set-hint">
              Inkwell mirrors every article to <code>articles/*.md</code> in this project. Edited one in another editor?
              Pull the change back in — your current text is snapshotted first, so nothing is lost.
            </p>
            <button className="btn btn-soft" disabled={scanning} onClick={scanDisk}>
              {scanning ? (
                <>
                  <span className="spin" /> Scanning…
                </>
              ) : (
                <>
                  <Icon name="reroll" size={16} /> Scan disk for changes
                </>
              )}
            </button>
            {diskChanges !== null && diskChanges.length === 0 && (
              <p className="set-hint" style={{ marginTop: 10 }}>
                Everything's in sync — no external edits found.
              </p>
            )}
            {diskChanges && diskChanges.length > 0 && (
              <div className="disk-changes">
                {diskChanges.map((c) => (
                  <div className="disk-change" key={c.articleId}>
                    <div className="disk-change-info">
                      <strong>{c.title}</strong>
                      <span className="disk-file">{c.filename}</span>
                    </div>
                    <button className="mini-btn add" onClick={() => pullChange(c)}>
                      <Icon name="download" size={12} /> Pull into app
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

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

        {/* ── Image AI (Gemini / Imagen) ──────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Image generation (Gemini)</h2>
          <p className="set-hint">
            Cover and inline images are generated with Google's Imagen via the Gemini API. Your key is stored only on
            this device — or set <code>VITE_GEMINI_KEY</code> in <code>.env.local</code> for your local build. Leave
            blank and Upload / URL still work fully.
          </p>
          <Field
            label="Gemini API key"
            type="password"
            placeholder="AIza… (or set VITE_GEMINI_KEY in .env.local)"
            value={settings.imageApiKey}
            onChange={(v) => updateSettings({ imageApiKey: v })}
          />
          <Field
            label="Model"
            placeholder="imagen-3.0-generate-002"
            value={settings.imageApiModel}
            onChange={(v) => updateSettings({ imageApiModel: v })}
          />
        </section>

        {/* ── Warden cadence auto-tracking (owner-only) ───────────── */}
        {!DEMO_MODE && (
          <section className="set-card">
            <h2 className="set-title">Cadence auto-tracking</h2>
            <p className="set-hint">
              Paste your dedicated Warden signal key and publishing an article will auto-complete its Cadence
              commitment in Warden — no manual tap. Stored only on this device, scrubbed from backups, and absent
              from the public demo, so only your real publishes count.
            </p>
            <Field
              label="Warden signal key"
              type="password"
              placeholder="paste your Warden cadence key…"
              value={settings.wardenKey}
              onChange={(v) => updateSettings({ wardenKey: v })}
            />
          </section>
        )}

        {/* ── Backup ──────────────────────────────────────────────── */}
        <section className="set-card">
          <h2 className="set-title">Backup &amp; portability</h2>
          <p className="set-hint">Your insurance. Export anytime; import to restore or move machines.</p>
          <div className="set-btn-row">
            <button
              className="btn btn-soft"
              onClick={() =>
                exportJSON(Object.values(articles), Object.values(images), settings, vocab, customSources)
              }
            >
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
