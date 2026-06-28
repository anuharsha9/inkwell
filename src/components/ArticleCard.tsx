import { useStore } from '@/store'
import type { Article } from '@/types'
import { Icon } from './Icon'
import { NumberBadge, PlatformDots, TagList } from './ui'
import { StatusControl } from './StatusControl'

export function ArticleCard({ article }: { article: Article }) {
  const openEditor = useStore((s) => s.openEditor)
  const togglePinned = useStore((s) => s.togglePinned)
  const cover = useStore((s) => (article.coverImageId ? s.images[article.coverImageId] : undefined))

  return (
    <article className="card" onClick={() => openEditor(article.id)} tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? openEditor(article.id) : undefined)}>
      {cover && (
        <div className="card-cover">
          <img src={cover.src} alt={cover.alt} loading="lazy" />
        </div>
      )}
      <div className="card-body">
        <div className="card-top">
          <NumberBadge number={article.number} />
          <StatusControl id={article.id} status={article.status} />
          <div className="card-top-right">
            {article.configTalk && (
              <span className="config-flag" title="Feeds the Config talk">
                <Icon name="config" size={14} />
              </span>
            )}
            <button
              className={`pin-btn ${article.pinned ? 'on' : ''}`}
              title={article.pinned ? 'Unpin' : 'Pin to top of queue'}
              onClick={(e) => {
                e.stopPropagation()
                togglePinned(article.id)
              }}
            >
              <Icon name="pin" size={15} />
            </button>
          </div>
        </div>

        <h3 className="card-title">{article.title || <span className="untitled">Untitled</span>}</h3>
        {article.hook && <p className="card-hook">{article.hook}</p>}

        <div className="card-foot">
          <TagList tags={article.tags} />
          <div className="card-foot-right">
            <span className="wc">{article.wordCount.toLocaleString()}w</span>
            <PlatformDots platforms={article.platforms} />
          </div>
        </div>
      </div>
    </article>
  )
}
