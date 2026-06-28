import { useState } from 'react'
import { useStore } from '@/store'
import type { Article } from '@/types'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/ui'
import { Markdown } from '@/components/editor/Markdown'
import { countWords, slugify } from '@/lib/text'

// Compile a book from selected articles, ordered into chapters. Build a single
// manuscript and export it as one markdown file.
export function Book() {
  const articles = useStore((s) => s.articles)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const push = useToast((s) => s.push)
  const [preview, setPreview] = useState(false)

  const byId = articles
  const order = settings.bookArticleIds.filter((id) => byId[id])
  const chapters = order.map((id) => byId[id])
  const available = Object.values(articles)
    .filter((a) => !order.includes(a.id))
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999))

  const totalWords = chapters.reduce((s, a) => s + countWords(a.body), 0)

  const setOrder = (ids: string[]) => updateSettings({ bookArticleIds: ids })
  const add = (id: string) => setOrder([...order, id])
  const remove = (id: string) => setOrder(order.filter((x) => x !== id))
  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }

  function buildManuscript(): string {
    const title = settings.bookTitle.trim() || 'Untitled'
    const toc = chapters.map((a, i) => `${i + 1}. ${a.title || 'Untitled'}`).join('\n')
    const body = chapters
      .map((a, i) => `## ${i + 1}. ${a.title || 'Untitled'}\n\n${a.body.trim() || '*(empty)*'}`)
      .join('\n\n---\n\n')
    return `# ${title}\n\n${toc}\n\n---\n\n${body}\n`
  }

  function exportBook() {
    const blob = new Blob([buildManuscript()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(settings.bookTitle) || 'book'}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    push('Book exported')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Book</h1>
          <div className="page-sub">Compile a book from your articles — pick the pieces, set the order, export the manuscript.</div>
        </div>
        <div className="head-actions">
          <div className="segmented">
            <button className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
              Build
            </button>
            <button className={preview ? 'active' : ''} onClick={() => setPreview(true)}>
              Manuscript
            </button>
          </div>
          <button className="btn btn-primary" disabled={!chapters.length} onClick={exportBook}>
            <Icon name="download" size={16} /> Export
          </button>
        </div>
      </div>

      <input
        className="book-title-input"
        value={settings.bookTitle}
        placeholder="Book title…"
        onChange={(e) => updateSettings({ bookTitle: e.target.value })}
      />
      <div className="book-meta">
        {chapters.length} chapter{chapters.length === 1 ? '' : 's'} · {totalWords.toLocaleString()} words
      </div>

      {preview ? (
        <div className="book-manuscript">
          <Markdown body={buildManuscript()} />
        </div>
      ) : (
        <div className="book-build">
          <section className="book-col">
            <div className="coach-section-label">Chapters · in order</div>
            {chapters.length === 0 ? (
              <p className="coach-hint">No chapters yet — add pieces from the right.</p>
            ) : (
              chapters.map((a, i) => <ChapterRow key={a.id} a={a} i={i} total={order.length} onMove={move} onRemove={remove} />)
            )}
          </section>
          <section className="book-col">
            <div className="coach-section-label">Add from your archive</div>
            {available.length === 0 ? (
              <p className="coach-hint">Every article is already in the book.</p>
            ) : (
              available.map((a) => (
                <div className="book-avail" key={a.id}>
                  <div className="book-avail-main">
                    <span className="book-avail-title">{a.title || 'Untitled'}</span>
                    <span className="wc">{countWords(a.body).toLocaleString()}w</span>
                  </div>
                  <button className="mini-btn add" onClick={() => add(a.id)}>
                    <Icon name="plus" size={12} strokeWidth={2} /> Add
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </>
  )
}

function ChapterRow({
  a,
  i,
  total,
  onMove,
  onRemove,
}: {
  a: Article
  i: number
  total: number
  onMove: (id: string, dir: -1 | 1) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="book-chapter">
      <span className="book-chapter-num">{i + 1}</span>
      <div className="book-chapter-main">
        <span className="book-chapter-title">{a.title || 'Untitled'}</span>
        <span className="wc">{countWords(a.body).toLocaleString()}w</span>
      </div>
      <div className="book-chapter-actions">
        <button className="icon-btn sm" disabled={i === 0} onClick={() => onMove(a.id, -1)} aria-label="Move up">
          <Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button className="icon-btn sm" disabled={i === total - 1} onClick={() => onMove(a.id, 1)} aria-label="Move down">
          <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button className="icon-btn sm" onClick={() => onRemove(a.id)} aria-label="Remove">
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  )
}
