import { useStore } from '@/store'
import { FORMAT_META, FORMAT_ORDER } from '@/lib/constants'
import { Icon } from './Icon'
import type { Format } from '@/types'

export function NewArticleDialog() {
  const { open, format, scheduledFor } = useStore((s) => s.newDialog)
  const updateNewDialog = useStore((s) => s.updateNewDialog)
  const confirmCreate = useStore((s) => s.confirmCreate)
  const cancelCreate = useStore((s) => s.cancelCreate)

  if (!open) return null

  return (
    <div className="modal-scrim" onClick={cancelCreate}>
      <div className="modal new-article-modal" onClick={(e) => e.stopPropagation()}>
        <h3>New piece</h3>

        <div className="na-section">
          <div className="meta-label">Format</div>
          <div className="na-format-row">
            {FORMAT_ORDER.map((f: Format) => (
              <button
                key={f}
                className={`na-format-btn ${format === f ? 'on' : ''}`}
                onClick={() => updateNewDialog({ format: f })}
              >
                <Icon name={f === 'article' ? 'pen' : 'spark'} size={15} />
                {FORMAT_META[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="na-section">
          <div className="meta-label">Schedule date <span className="na-opt">(optional)</span></div>
          <input
            type="date"
            className="meta-date"
            value={scheduledFor}
            onChange={(e) => updateNewDialog({ scheduledFor: e.target.value })}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={cancelCreate}>Cancel</button>
          <button className="btn btn-primary" onClick={() => confirmCreate()}>
            <Icon name="plus" size={15} strokeWidth={2} /> Create
          </button>
        </div>
      </div>
    </div>
  )
}
