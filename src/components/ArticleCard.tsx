import { useState } from 'react'
import { useStore } from '@/store'
import type { Article } from '@/types'
import { FORMAT_META } from '@/lib/constants'
import { Icon } from './Icon'
import { NumberBadge } from './ui'
import { StatusControl } from './StatusControl'
import { Menu, MenuItem } from './Menu'

export function ArticleCard({ article }: { article: Article }) {
  const openEditor = useStore((s) => s.openEditor)
  const togglePinned = useStore((s) => s.togglePinned)
  const markPublished = useStore((s) => s.markPublished)
  const removeArticle = useStore((s) => s.removeArticle)
  const cover = useStore((s) => (article.coverImageId ? s.images[article.coverImageId] : undefined))
  const [confirmDel, setConfirmDel] = useState(false)
  const fmt = article.format ?? 'article'

  return (
    <article
      className="card"
      onClick={() => openEditor(article.id)}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? openEditor(article.id) : undefined)}
    >
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
            {article.pinned && (
              <span className="pin-mark" title="Pinned to top">
                <Icon name="pin" size={14} />
              </span>
            )}
            {article.configTalk && (
              <span className="config-flag" title="Feeds the Config talk">
                <Icon name="config" size={14} />
              </span>
            )}
            <Menu
              align="right"
              width={190}
              trigger={(_o, t) => (
                <button className="icon-btn sm card-kebab" onClick={t} aria-label="More actions">
                  <Icon name="dots" size={16} />
                </button>
              )}
              children={(close) => (
                <>
                  <MenuItem onClick={() => (togglePinned(article.id), close())}>
                    <Icon name="pin" size={14} /> {article.pinned ? 'Unpin' : 'Pin to top'}
                  </MenuItem>
                  {article.status !== 'published' && (
                    <MenuItem onClick={() => (markPublished(article.id), close())}>
                      <Icon name="check" size={14} strokeWidth={2} /> Mark as published
                    </MenuItem>
                  )}
                  <div className="menu-sep" />
                  <MenuItem danger onClick={() => (setConfirmDel(true), close())}>
                    <Icon name="trash" size={14} /> Delete
                  </MenuItem>
                </>
              )}
            />
          </div>
        </div>

        <h3 className="card-title">{article.title || <span className="untitled">Untitled</span>}</h3>
        {article.hook && <p className="card-hook">{article.hook}</p>}

        <div className="card-foot">
          <span className={`card-format f-${fmt}`}>{FORMAT_META[fmt].short}</span>
          <span className="wc">{article.wordCount.toLocaleString()}w</span>
        </div>
      </div>

      {confirmDel && (
        <div className="modal-scrim" onClick={(e) => (e.stopPropagation(), setConfirmDel(false))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this piece?</h3>
            <p>“{article.title || 'Untitled'}” and its images will be removed. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(false)}>
                Keep it
              </button>
              <button className="btn btn-danger" onClick={() => void removeArticle(article.id)}>
                <Icon name="trash" size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
