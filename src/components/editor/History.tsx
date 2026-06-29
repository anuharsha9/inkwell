import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import type { Article } from '@/types'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { loadVersions, type Version } from '@/lib/storage'

// Per-article version history — every Coach apply and periodic autosave leaves a
// restorable snapshot here, so a bad edit is never the end of the world.
export function History({ article, onClose }: { article: Article; onClose: () => void }) {
  const restoreVersion = useStore((s) => s.restoreVersion)
  const push = useToast((s) => s.push)
  const [versions, setVersions] = useState<Version[] | null>(null)

  async function refresh() {
    setVersions(await loadVersions(article.id))
  }
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id])

  function restore(v: Version) {
    const current = article.body
    restoreVersion(article.id, v.body)
    void refresh()
    push('Restored', { label: 'Undo', run: () => restoreVersion(article.id, current) })
  }

  return (
    <aside className="coach history-panel">
      <header className="coach-head">
        <div className="coach-title">
          <Icon name="reroll" size={17} /> Version history
        </div>
        <button className="icon-btn sm" onClick={onClose} aria-label="Close history">
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="coach-body">
        <p className="coach-hint" style={{ marginTop: 0 }}>
          Snapshots from your edits and Coach applies — restore any version. Your current draft isn't listed; restoring
          one saves the current text first, so nothing is lost.
        </p>

        {versions === null ? (
          <p className="coach-hint">Loading…</p>
        ) : versions.length === 0 ? (
          <div className="privacy-clean">
            <Icon name="check" size={16} strokeWidth={2.2} /> No earlier versions yet — they appear as you edit.
          </div>
        ) : (
          versions.map((v) => (
            <div className="version-row" key={v.id}>
              <div className="version-meta">
                <span className="version-reason">{v.reason}</span>
                <span className="version-time">{relativeTime(v.ts)}</span>
              </div>
              <p className="version-preview">{snippet(v.body)}</p>
              <div className="cover-actions">
                <button className="mini-btn add" onClick={() => restore(v)}>
                  <Icon name="reroll" size={12} /> Restore
                </button>
                <span className="version-words">{wordCount(v.body)} words</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}

function snippet(body: string): string {
  const clean = body.replace(/[#>*_~`]/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > 140 ? clean.slice(0, 140) + '…' : clean
}
function wordCount(body: string): number {
  return (body.match(/\S+/g) ?? []).length
}
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}
