import { useStore } from '@/store'
import type { Article, Platform } from '@/types'
import { PLATFORM_META, PLATFORM_ORDER } from '@/lib/constants'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'
import { NumberBadge } from './ui'
import { useCopyArticle } from './PublishActions'

// Compact 3-up cards for "Ready to publish" on Home — horizontal, not a tall
// vertical stack (kinder to vertical space, especially on phones).
export function ReadyCards({ queue }: { queue: Article[] }) {
  return (
    <div className="ready-cards">
      {queue.map((a) => (
        <ReadyCard key={a.id} article={a} />
      ))}
    </div>
  )
}

function ReadyCard({ article }: { article: Article }) {
  const settings = useStore((s) => s.settings)
  const openEditor = useStore((s) => s.openEditor)
  const markPublished = useStore((s) => s.markPublished)
  const { copyFull } = useCopyArticle()
  const targets = article.platforms.length ? article.platforms : PLATFORM_ORDER

  function composer(p: Platform) {
    return p === 'substack' ? settings.substackUrl.trim() || PLATFORM_META.substack.newPost : PLATFORM_META[p].newPost
  }

  return (
    <div className="ready-card">
      <div className="ready-top">
        <NumberBadge number={article.number} />
        {article.pinned && (
          <span className="queue-pinflag" title="Pinned">
            <Icon name="pin" size={12} />
          </span>
        )}
        <span className="wc" style={{ marginLeft: 'auto' }}>
          {article.wordCount.toLocaleString()}w
        </span>
      </div>
      <h3 className="ready-title" onClick={() => openEditor(article.id)}>
        {article.title || 'Untitled'}
      </h3>
      {article.hook && <p className="ready-hook">{article.hook}</p>}
      <div className="ready-actions">
        <button className="btn btn-primary ready-copy" onClick={() => void copyFull(article)}>
          <Icon name="copy" size={14} /> Copy
        </button>
        <Menu
          align="right"
          width={180}
          trigger={(_o, t) => (
            <button className="icon-btn sm" onClick={t} aria-label="More">
              <Icon name="dots" size={16} />
            </button>
          )}
          children={(close) => (
            <>
              <div className="menu-cap">Publish to</div>
              {targets.map((p) => (
                <MenuItem
                  key={p}
                  onClick={() => {
                    window.open(composer(p), '_blank', 'noopener')
                    close()
                  }}
                >
                  <Icon name="external" size={14} /> {PLATFORM_META[p].label}
                </MenuItem>
              ))}
              <div className="menu-sep" />
              <MenuItem onClick={() => (markPublished(article.id), close())}>
                <Icon name="check" size={14} strokeWidth={2} /> Mark published
              </MenuItem>
              <MenuItem onClick={() => (openEditor(article.id), close())}>
                <Icon name="pen" size={14} /> Open in editor
              </MenuItem>
            </>
          )}
        />
      </div>
    </div>
  )
}
