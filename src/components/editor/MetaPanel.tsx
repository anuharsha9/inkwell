import { useStore } from '@/store'
import type { Article, Phase, Platform, Tag } from '@/types'
import {
  PHASE_META,
  PHASE_ORDER,
  PLATFORM_META,
  PLATFORM_ORDER,
  STATUS_META,
  STATUS_ORDER,
  TAG_META,
  TAG_ORDER,
} from '@/lib/constants'
import { Icon } from '@/components/Icon'
import { ImagePanel } from './ImagePanel'

export function MetaPanel({ article, onInsert }: { article: Article; onInsert: (snippet: string) => void }) {
  const updateArticle = useStore((s) => s.updateArticle)
  const setStatus = useStore((s) => s.setStatus)
  const togglePinned = useStore((s) => s.togglePinned)
  const toggleConfigTalk = useStore((s) => s.toggleConfigTalk)

  const toggleIn = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <aside className="metapanel">
      {/* Status */}
      <section className="meta-section">
        <div className="meta-label">Status</div>
        <div className="status-row">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={`status-chip ${article.status === s ? 'on' : ''}`}
              style={{ ['--pill-c' as string]: `var(${STATUS_META[s].var})` }}
              onClick={() => setStatus(article.id, s)}
            >
              <span className="dot" />
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </section>

      {/* Phase */}
      <section className="meta-section">
        <div className="meta-label">Phase</div>
        <select
          className="meta-select"
          value={article.phase}
          onChange={(e) => updateArticle(article.id, { phase: e.target.value as Phase }, { immediate: true })}
        >
          {PHASE_ORDER.map((p) => (
            <option key={p} value={p}>
              {p === 'unfiled' ? 'Unfiled' : `${PHASE_META[p].roman}. ${PHASE_META[p].title} — ${PHASE_META[p].subtitle}`}
            </option>
          ))}
        </select>
      </section>

      {/* Tags */}
      <section className="meta-section">
        <div className="meta-label">Tags</div>
        <div className="chip-wrap">
          {TAG_ORDER.map((t: Tag) => (
            <button
              key={t}
              className={`chip ${article.tags.includes(t) ? 'on' : ''}`}
              onClick={() => updateArticle(article.id, { tags: toggleIn(article.tags, t) }, { immediate: true })}
            >
              {TAG_META[t].label}
            </button>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section className="meta-section">
        <div className="meta-label">Platforms</div>
        <div className="chip-wrap">
          {PLATFORM_ORDER.map((p: Platform) => (
            <button
              key={p}
              className={`chip ${article.platforms.includes(p) ? 'on' : ''}`}
              onClick={() => updateArticle(article.id, { platforms: toggleIn(article.platforms, p) }, { immediate: true })}
            >
              {PLATFORM_META[p].label}
            </button>
          ))}
        </div>
      </section>

      {/* Publish date — claims a slot in the Home publishing plan */}
      {article.status !== 'published' && (
        <section className="meta-section">
          <div className="meta-label">Scheduled publish date</div>
          <div className="meta-schedule">
            <input
              type="date"
              className="meta-date"
              value={article.scheduledFor ?? ''}
              onChange={(e) => updateArticle(article.id, { scheduledFor: e.target.value || null }, { immediate: true })}
            />
            {article.scheduledFor && (
              <button
                className="mini-btn"
                onClick={() => updateArticle(article.id, { scheduledFor: null }, { immediate: true })}
              >
                Clear
              </button>
            )}
          </div>
        </section>
      )}

      {/* Pinned */}
      <section className="meta-section">
        <button className={`toggle-row ${article.pinned ? 'on' : ''}`} onClick={() => togglePinned(article.id)}>
          <Icon name="pin" size={16} />
          <span>Pin to top of queue</span>
          <span className="switch" />
        </button>
      </section>

      {/* Config track */}
      <section className="meta-section">
        <button className={`toggle-row ${article.configTalk ? 'on' : ''}`} onClick={() => toggleConfigTalk(article.id)}>
          <Icon name="config" size={16} />
          <span>Feeds the Config talk</span>
          <span className="switch" />
        </button>
        {article.configTalk && (
          <input
            className="meta-input"
            style={{ marginTop: 8 }}
            value={article.configNote}
            placeholder="What this piece contributes…"
            onChange={(e) => updateArticle(article.id, { configNote: e.target.value })}
          />
        )}
      </section>

      {/* Images */}
      <section className="meta-section">
        <ImagePanel article={article} onInsert={onInsert} />
      </section>

      {/* Private notes */}
      <section className="meta-section">
        <div className="meta-label">Private notes</div>
        <textarea
          className="meta-textarea"
          value={article.notes}
          placeholder="Scratch notes — never published."
          rows={3}
          onChange={(e) => updateArticle(article.id, { notes: e.target.value })}
        />
      </section>
    </aside>
  )
}
