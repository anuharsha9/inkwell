import { useStore } from '@/store'
import type { Article, Platform } from '@/types'
import { PLATFORM_META, PLATFORM_ORDER } from '@/lib/constants'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'
import { useToast } from './ui'
import { copyText, formatArticle, formatBodyOnly } from '@/lib/clipboard'

// Resolve the right composer URL for a platform, honoring her settings.
function composerUrl(platform: Platform, s: ReturnType<typeof useStore.getState>['settings']): string {
  if (platform === 'substack') return s.substackUrl.trim() || PLATFORM_META.substack.newPost
  if (platform === 'linkedin') return PLATFORM_META.linkedin.newPost
  return PLATFORM_META.medium.newPost
}

export function useCopyArticle() {
  const images = useStore((s) => s.images)
  const push = useToast((s) => s.push)
  return {
    async copyFull(a: Article) {
      const ok = await copyText(formatArticle(a, images))
      push(ok ? 'Article copied — paste & post' : 'Copy failed')
    },
    async copyBody(a: Article) {
      const ok = await copyText(formatBodyOnly(a, images))
      push(ok ? 'Body copied (no title)' : 'Copy failed')
    },
  }
}

// Compact action cluster used in the Publish Queue rows.
export function PublishActionsCompact({ article }: { article: Article }) {
  const settings = useStore((s) => s.settings)
  const markPublished = useStore((s) => s.markPublished)
  const { copyFull } = useCopyArticle()
  const targets = article.platforms.length ? article.platforms : PLATFORM_ORDER

  return (
    <div className="pub-compact">
      <button className="btn btn-primary" onClick={() => void copyFull(article)}>
        <Icon name="copy" size={15} /> Copy article
      </button>
      <Menu
        align="right"
        width={180}
        trigger={(_o, t) => (
          <button className="btn btn-soft" onClick={t}>
            <Icon name="external" size={15} /> Publish to…
          </button>
        )}
        children={(close) => (
          <>
            {targets.map((p) => (
              <MenuItem
                key={p}
                onClick={() => {
                  window.open(composerUrl(p, settings), '_blank', 'noopener')
                  close()
                }}
              >
                <Icon name="external" size={14} /> {PLATFORM_META[p].label}
              </MenuItem>
            ))}
          </>
        )}
      />
      <button className="btn btn-ghost" onClick={() => markPublished(article.id)} title="Mark as published">
        <Icon name="check" size={15} strokeWidth={2} /> Published
      </button>
    </div>
  )
}
