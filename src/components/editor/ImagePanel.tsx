import { useRef, useState } from 'react'
import { useStore } from '@/store'
import type { Article, InkImage } from '@/types'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { fileToStoredDataUrl, makeImage } from '@/lib/image'
import { copyImage, downloadImage } from '@/lib/clipboard'
import { generateImage, isImageAIConfigured, suggestPrompt } from '@/lib/imageAI'
import { slugify } from '@/lib/text'

type AddMode = 'upload' | 'url' | 'ai'

export function ImagePanel({ article, onInsert }: { article: Article; onInsert: (snippet: string) => void }) {
  const images = useStore((s) => s.images)
  const addImage = useStore((s) => s.addImage)
  const updateImage = useStore((s) => s.updateImage)
  const setCover = useStore((s) => s.setCover)
  const removeImage = useStore((s) => s.removeImage)
  const updateArticle = useStore((s) => s.updateArticle)
  const settings = useStore((s) => s.settings)
  const push = useToast((s) => s.push)

  const [mode, setMode] = useState<AddMode>('upload')
  const cover = article.coverImageId ? images[article.coverImageId] : undefined
  const inlineImages = article.imageIds.map((id) => images[id]).filter(Boolean) as InkImage[]

  const defaultAlt = () => article.title.trim() || 'Cover image'

  function attachAsCover(img: InkImage) {
    addImage(img)
    setCover(article.id, img.id)
  }
  function attachInline(img: InkImage) {
    addImage(img)
    updateArticle(article.id, { imageIds: [...article.imageIds, img.id] }, { immediate: true })
    onInsert(`\n![${img.alt}](${img.id})\n`)
  }

  return (
    <div className="imgpanel">
      {/* ── Cover ─────────────────────────────────────────────────── */}
      <div className="meta-label">Cover image</div>
      {cover ? (
        <div className="cover-card">
          <img src={cover.src} alt={cover.alt} />
          <div className="cover-edit">
            <input
              className="alt-input"
              value={cover.alt}
              placeholder="Alt text (required before ready)"
              onChange={(e) => updateImage(cover.id, { alt: e.target.value })}
            />
            {cover.source === 'url' && (
              <input
                className="alt-input"
                value={cover.attribution}
                placeholder="Attribution (e.g. Photo by …)"
                onChange={(e) => updateImage(cover.id, { attribution: e.target.value })}
              />
            )}
            <div className="cover-actions">
              <button className="mini-btn" onClick={() => void grab(cover, push)}>
                <Icon name="copy" size={13} /> Copy
              </button>
              <button className="mini-btn" onClick={() => downloadImage(cover, fileName(article, cover))}>
                <Icon name="download" size={13} /> Save
              </button>
              <button className="mini-btn danger" onClick={() => setCover(article.id, null)}>
                <Icon name="close" size={13} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cover-empty">
          <Icon name="image" size={22} />
          <span>No cover yet — add one below, or make the AI do it.</span>
        </div>
      )}

      {/* ── Add controls ──────────────────────────────────────────── */}
      <div className="segmented add-modes">
        {(['upload', 'url', 'ai'] as AddMode[]).map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m === 'upload' ? 'Upload' : m === 'url' ? 'URL' : 'AI'}
          </button>
        ))}
      </div>

      {mode === 'upload' && (
        <UploadBox
          onFiles={async (files) => {
            for (const file of files) {
              if (!file.type.startsWith('image/')) continue
              const src = await fileToStoredDataUrl(file)
              const img = makeImage({ src, source: 'upload', alt: defaultAlt() })
              if (!article.coverImageId) attachAsCover(img)
              else attachInline(img)
            }
            push('Image added')
          }}
        />
      )}

      {mode === 'url' && (
        <UrlBox
          onAdd={(url, attribution) => {
            const img = makeImage({ src: url, source: 'url', alt: defaultAlt(), attribution })
            if (!article.coverImageId) attachAsCover(img)
            else attachInline(img)
            push('Image added')
          }}
        />
      )}

      {mode === 'ai' && (
        <AiBox
          article={article}
          configured={isImageAIConfigured(settings)}
          onUse={(dataUrl, prompt, as) => {
            const img = makeImage({ src: dataUrl, source: 'ai', alt: defaultAlt(), prompt })
            if (as === 'cover') attachAsCover(img)
            else attachInline(img)
            push('Image added')
          }}
        />
      )}

      {/* ── Inline images (grab-for-publishing) ───────────────────── */}
      {inlineImages.length > 0 && (
        <div className="inline-imgs">
          <div className="meta-label" style={{ marginTop: 18 }}>
            Inline images · {inlineImages.length}
          </div>
          {inlineImages.map((img) => (
            <div className="inline-img" key={img.id}>
              <img src={img.src} alt={img.alt} />
              <div className="inline-img-meta">
                <input
                  className="alt-input"
                  value={img.alt}
                  placeholder="Alt text"
                  onChange={(e) => updateImage(img.id, { alt: e.target.value })}
                />
                <div className="cover-actions">
                  <button className="mini-btn" onClick={() => onInsert(`\n![${img.alt}](${img.id})\n`)}>
                    <Icon name="plus" size={12} /> Insert
                  </button>
                  <button className="mini-btn" onClick={() => void grab(img, push)}>
                    <Icon name="copy" size={12} /> Copy
                  </button>
                  <button className="mini-btn" onClick={() => downloadImage(img, fileName(article, img))}>
                    <Icon name="download" size={12} /> Save
                  </button>
                  <button className="mini-btn" onClick={() => setCover(article.id, img.id)}>
                    Cover
                  </button>
                  <button className="mini-btn danger" onClick={() => removeImage(article.id, img.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function grab(img: InkImage, push: (t: string) => void) {
  const ok = await copyImage(img)
  push(ok ? 'Image copied' : 'Copy not supported — use Save')
}

function fileName(a: Article, img: InkImage): string {
  const base = a.number ? `${String(a.number).padStart(2, '0')}-${slugify(a.title)}` : slugify(a.title) || 'image'
  const ext = img.src.startsWith('data:image/png') ? 'png' : 'jpg'
  return `${base}-${img.id.slice(0, 6)}.${ext}`
}

// ── Upload box: click, drag-drop, or paste ─────────────────────────────
function UploadBox({ onFiles }: { onFiles: (files: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  return (
    <div
      className={`dropzone ${drag ? 'drag' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        onFiles(Array.from(e.dataTransfer.files))
      }}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files)
        if (files.length) onFiles(files)
      }}
      tabIndex={0}
    >
      <Icon name="upload" size={20} />
      <span>
        <strong>Click, drop, or paste</strong> an image
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ── URL box ────────────────────────────────────────────────────────────
function UrlBox({ onAdd }: { onAdd: (url: string, attribution: string) => void }) {
  const [url, setUrl] = useState('')
  const [attr, setAttr] = useState('')
  return (
    <div className="urlbox">
      <input className="alt-input" value={url} placeholder="https://… image URL" onChange={(e) => setUrl(e.target.value)} />
      <input
        className="alt-input"
        value={attr}
        placeholder="Attribution (optional)"
        onChange={(e) => setAttr(e.target.value)}
      />
      <button
        className="btn btn-soft btn-block"
        disabled={!url.trim()}
        onClick={() => {
          onAdd(url.trim(), attr.trim())
          setUrl('')
          setAttr('')
        }}
      >
        Add from URL
      </button>
    </div>
  )
}

// ── AI box ─────────────────────────────────────────────────────────────
function AiBox({
  article,
  configured,
  onUse,
}: {
  article: Article
  configured: boolean
  onUse: (dataUrl: string, prompt: string, as: 'cover' | 'inline') => void
}) {
  const settings = useStore((s) => s.settings)
  const setView = useStore((s) => s.setView)
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  if (!configured) {
    return (
      <div className="ai-unconfigured">
        <Icon name="spark" size={20} />
        <p>
          AI image generation isn't set up yet. Add an image provider endpoint and key, and this becomes a one-click
          chore-killer.
        </p>
        <button className="btn btn-soft btn-block" onClick={() => setView('settings')}>
          Configure in Settings
        </button>
      </div>
    )
  }

  async function run() {
    setBusy(true)
    setError('')
    try {
      const { dataUrl } = await generateImage(prompt.trim(), settings)
      setResult(dataUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="aibox">
      <textarea
        className="ai-prompt"
        value={prompt}
        placeholder="Describe the image…"
        rows={3}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="ai-actions">
        <button className="mini-btn" onClick={() => setPrompt(suggestPrompt(article.title, article.hook))}>
          <Icon name="spark" size={13} /> Suggest from article
        </button>
        <button className="btn btn-primary" disabled={busy || !prompt.trim()} onClick={() => void run()}>
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </div>
      {error && <div className="ai-error">{error}</div>}
      {result && (
        <div className="ai-result">
          <img src={result} alt="Generated preview" />
          <div className="cover-actions">
            <button className="mini-btn" onClick={() => onUse(result, prompt.trim(), 'cover')}>
              Use as cover
            </button>
            <button className="mini-btn" onClick={() => onUse(result, prompt.trim(), 'inline')}>
              Add inline
            </button>
            <button className="mini-btn" disabled={busy} onClick={() => void run()}>
              <Icon name="reroll" size={13} /> Re-roll
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
