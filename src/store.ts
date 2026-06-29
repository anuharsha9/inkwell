import { create } from 'zustand'
import type { Article, InkImage, Phase, Platform, Settings, Status, Tag } from '@/types'
import * as db from '@/lib/storage'
import { countWords, nowISO, uuid } from '@/lib/text'
import { removeArticleFile, syncArticleFile } from '@/lib/localArchive'
import { reviewCard, type Grade } from '@/lib/srs'
import { DEMO_MODE } from '@/lib/env'

// ─────────────────────────────────────────────────────────────────────────
// Inkwell store. In-memory state updates are synchronous (instant UI); writes
// to IndexedDB happen through here so there is exactly one persistence path.
// Body/metadata edits debounce their write (~500ms, PRD §5.3) and surface a
// quiet save indicator; structural ops (create/delete/import) write at once.
// ─────────────────────────────────────────────────────────────────────────

export type View = 'home' | 'learn' | 'archive' | 'editor' | 'config' | 'craft' | 'book' | 'sources' | 'settings'
export type GroupBy = 'phase' | 'status' | 'recent'
export type Theme = 'light' | 'dark'
export type SaveState = 'idle' | 'saving' | 'saved'

export interface Filters {
  statuses: Status[]
  phases: Phase[]
  tags: Tag[]
  platforms: Platform[]
  search: string
}

const EMPTY_FILTERS: Filters = { statuses: [], phases: [], tags: [], platforms: [], search: '' }

interface InkState {
  loaded: boolean
  articles: Record<string, Article>
  images: Record<string, InkImage>
  settings: Settings
  vocab: db.SavedWord[]
  theme: Theme

  view: View
  activeId: string | null
  groupBy: GroupBy
  filters: Filters
  saveState: SaveState

  // lifecycle
  init: () => Promise<void>

  // navigation
  setView: (view: View) => void
  openEditor: (id: string) => void
  setGroupBy: (g: GroupBy) => void
  setFilters: (patch: Partial<Filters>) => void
  clearFilters: () => void
  toggleTheme: () => void

  // articles
  createArticle: () => string
  createIdeaFrom: (seed: Partial<Article>, opts?: { open?: boolean }) => string
  updateArticle: (id: string, patch: Partial<Article>, opts?: { immediate?: boolean }) => void
  setStatus: (id: string, status: Status) => void
  cycleStatus: (id: string) => void
  togglePinned: (id: string) => void
  toggleConfigTalk: (id: string) => void
  markPublished: (id: string, platforms?: Platform[]) => void
  removeArticle: (id: string) => Promise<void>

  // version history
  snapshotVersion: (id: string, reason: string) => void
  restoreVersion: (id: string, body: string) => void

  // images
  addImage: (img: InkImage) => void
  updateImage: (id: string, patch: Partial<InkImage>) => void
  setCover: (articleId: string, imageId: string | null) => void
  removeImage: (articleId: string, imageId: string) => void

  // settings
  updateSettings: (patch: Partial<Settings>) => void

  // vocabulary
  addVocab: (word: Omit<db.SavedWord, 'due' | 'interval' | 'ease' | 'reps' | 'lapses'>) => void
  removeVocab: (word: string) => void
  reviewVocab: (word: string, grade: Grade) => void

  // backup
  importBackup: (articles: Article[], images: InkImage[], settings: Settings) => Promise<void>
}

const STATUS_CYCLE: Status[] = ['idea', 'drafting', 'ready', 'published']

// Per-article debounced persistence. A pending timer per id coalesces rapid
// keystrokes into one write; the indicator flips saving → saved when it lands.
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Throttle for automatic version snapshots — at most one "autosave" snapshot
// per article per window, capturing the body as it was when editing began.
const lastSnapAt = new Map<string, number>()
const AUTOSNAP_MS = 5 * 60 * 1000

export const useStore = create<InkState>((set, get) => {
  function persistArticleDebounced(id: string) {
    set({ saveState: 'saving' })
    const existing = pendingTimers.get(id)
    if (existing) clearTimeout(existing)
    pendingTimers.set(
      id,
      setTimeout(async () => {
        pendingTimers.delete(id)
        const a = get().articles[id]
        if (a) {
          await db.putArticle(a)
          void syncArticleFile(a) // mirror to a real .md file in the project folder
        }
        set({ saveState: 'saved' })
      }, 500),
    )
  }

  async function persistArticleNow(id: string) {
    const t = pendingTimers.get(id)
    if (t) {
      clearTimeout(t)
      pendingTimers.delete(id)
    }
    const a = get().articles[id]
    if (a) {
      await db.putArticle(a)
      void syncArticleFile(a)
    }
    set({ saveState: 'saved' })
  }

  return {
    loaded: false,
    articles: {},
    images: {},
    settings: db.DEFAULT_SETTINGS,
    vocab: [],
    theme: 'light',

    view: DEMO_MODE ? 'learn' : 'home', // demo visitors land on the showcase first
    activeId: null,
    groupBy: 'phase',
    filters: EMPTY_FILTERS,
    saveState: 'idle',

    async init() {
      await db.ensureSeeded()
      const [articles, images, settings, vocab] = await Promise.all([
        db.loadArticles(),
        db.loadAllImages(),
        db.loadSettings(),
        db.loadVocab(),
      ])
      const articleMap: Record<string, Article> = {}
      for (const a of articles) articleMap[a.id] = a
      const imageMap: Record<string, InkImage> = {}
      for (const i of images) imageMap[i.id] = i

      const savedTheme = (localStorage.getItem('inkwell:theme') as Theme | null) ?? prefersDark()
      applyTheme(savedTheme)

      set({ loaded: true, articles: articleMap, images: imageMap, settings, vocab, theme: savedTheme })
    },

    setView(view) {
      set({ view, activeId: view === 'editor' ? get().activeId : null })
    },

    openEditor(id) {
      set({ view: 'editor', activeId: id, saveState: 'idle' })
    },

    setGroupBy(groupBy) {
      set({ groupBy })
    },

    setFilters(patch) {
      set({ filters: { ...get().filters, ...patch } })
    },

    clearFilters() {
      set({ filters: EMPTY_FILTERS })
    },

    toggleTheme() {
      const next: Theme = get().theme === 'light' ? 'dark' : 'light'
      applyTheme(next)
      localStorage.setItem('inkwell:theme', next)
      set({ theme: next })
    },

    createArticle() {
      return get().createIdeaFrom({}, { open: true })
    },

    createIdeaFrom(seed, opts) {
      const id = uuid()
      const ts = nowISO()
      const base: Article = {
        id,
        number: null,
        title: '',
        hook: '',
        body: '',
        phase: 'unfiled',
        tags: [],
        status: 'idea',
        platforms: ['substack', 'linkedin'],
        wordCount: 0,
        createdAt: ts,
        updatedAt: ts,
        publishedAt: null,
        pinned: false,
        notes: '',
        coverImageId: null,
        imageIds: [],
        configTalk: false,
        configNote: '',
      }
      // seed may fill title/hook/tags/notes, but never identity or timestamps
      const article: Article = { ...base, ...seed, id, createdAt: ts, updatedAt: ts }
      set((s) => ({
        articles: { ...s.articles, [id]: article },
        ...(opts?.open ? { view: 'editor' as View, activeId: id, saveState: 'saved' as SaveState } : {}),
      }))
      void db.putArticle(article)
      return id
    },

    updateArticle(id, patch, opts) {
      const prev = get().articles[id]
      if (!prev) return
      // Periodic safety snapshot — capture the body as it was when this editing
      // window began, before applying the change (throttled so it never floods).
      if (patch.body !== undefined && patch.body !== prev.body && prev.body.trim()) {
        const last = lastSnapAt.get(id) ?? 0
        if (Date.now() - last > AUTOSNAP_MS) {
          lastSnapAt.set(id, Date.now())
          void db.saveVersion(id, prev.body, 'autosave')
        }
      }
      const next: Article = { ...prev, ...patch, updatedAt: nowISO() }
      if (patch.body !== undefined) next.wordCount = countWords(patch.body)
      set((s) => ({ articles: { ...s.articles, [id]: next } }))
      if (opts?.immediate) void persistArticleNow(id)
      else persistArticleDebounced(id)
    },

    snapshotVersion(id, reason) {
      const a = get().articles[id]
      if (a && a.body.trim()) {
        lastSnapAt.set(id, Date.now())
        void db.saveVersion(id, a.body, reason)
      }
    },

    restoreVersion(id, body) {
      const a = get().articles[id]
      if (!a) return
      if (a.body.trim() && a.body !== body) void db.saveVersion(id, a.body, 'before restore')
      get().updateArticle(id, { body }, { immediate: true })
    },

    setStatus(id, status) {
      const prev = get().articles[id]
      if (!prev) return
      const patch: Partial<Article> = { status }
      if (status === 'published' && !prev.publishedAt) patch.publishedAt = nowISO()
      // Alt text required before "ready" — but never block her: backfill the
      // cover's alt from the title if she left it empty (PRD §5.5).
      if ((status === 'ready' || status === 'published') && prev.coverImageId) {
        const cover = get().images[prev.coverImageId]
        if (cover && !cover.alt.trim()) {
          get().updateImage(prev.coverImageId, { alt: prev.title.trim() || 'Cover image' })
        }
      }
      get().updateArticle(id, patch, { immediate: true })
    },

    cycleStatus(id) {
      const prev = get().articles[id]
      if (!prev) return
      const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(prev.status) + 1) % STATUS_CYCLE.length]
      get().setStatus(id, next)
    },

    togglePinned(id) {
      const prev = get().articles[id]
      if (!prev) return
      get().updateArticle(id, { pinned: !prev.pinned }, { immediate: true })
    },

    toggleConfigTalk(id) {
      const prev = get().articles[id]
      if (!prev) return
      get().updateArticle(id, { configTalk: !prev.configTalk }, { immediate: true })
    },

    markPublished(id, platforms) {
      const prev = get().articles[id]
      if (!prev) return
      const patch: Partial<Article> = { status: 'published', publishedAt: prev.publishedAt ?? nowISO() }
      if (platforms) patch.platforms = platforms
      get().updateArticle(id, patch, { immediate: true })
    },

    async removeArticle(id) {
      const prev = get().articles[id]
      if (prev) void removeArticleFile(prev)
      set((s) => {
        const articles = { ...s.articles }
        delete articles[id]
        return { articles, activeId: s.activeId === id ? null : s.activeId, view: s.activeId === id ? 'archive' : s.view }
      })
      // also drop its images
      if (prev) {
        for (const imgId of [prev.coverImageId, ...prev.imageIds].filter(Boolean) as string[]) {
          set((s) => {
            const images = { ...s.images }
            delete images[imgId]
            return { images }
          })
          void db.deleteImage(imgId)
        }
      }
      await db.deleteArticle(id)
      void db.deleteVersionsFor(id)
      void db.deleteEmbedding(id) // drop its cached semantic vector too
    },

    addImage(img) {
      set((s) => ({ images: { ...s.images, [img.id]: img } }))
      void db.putImage(img)
    },

    updateImage(id, patch) {
      const prev = get().images[id]
      if (!prev) return
      const next = { ...prev, ...patch }
      set((s) => ({ images: { ...s.images, [id]: next } }))
      void db.putImage(next)
    },

    setCover(articleId, imageId) {
      get().updateArticle(articleId, { coverImageId: imageId }, { immediate: true })
    },

    removeImage(articleId, imageId) {
      const a = get().articles[articleId]
      if (a) {
        const patch: Partial<Article> = {
          imageIds: a.imageIds.filter((i) => i !== imageId),
          coverImageId: a.coverImageId === imageId ? null : a.coverImageId,
        }
        get().updateArticle(articleId, patch, { immediate: true })
      }
      set((s) => {
        const images = { ...s.images }
        delete images[imageId]
        return { images }
      })
      void db.deleteImage(imageId)
    },

    updateSettings(patch) {
      const next = { ...get().settings, ...patch }
      set({ settings: next })
      void db.saveSettings(next)
    },

    addVocab(word) {
      if (get().vocab.some((w) => w.word === word.word)) return
      const full: db.SavedWord = { ...word, due: nowISO(), interval: 0, ease: 2.5, reps: 0, lapses: 0 }
      const next = [full, ...get().vocab]
      set({ vocab: next })
      void db.saveVocab(next)
    },

    removeVocab(word) {
      const next = get().vocab.filter((w) => w.word !== word)
      set({ vocab: next })
      void db.saveVocab(next)
    },

    reviewVocab(word, grade) {
      const next = get().vocab.map((w) => (w.word === word ? { ...w, ...reviewCard(w, grade) } : w))
      set({ vocab: next })
      void db.saveVocab(next)
    },

    async importBackup(articles, images, settings) {
      const merged = { ...db.DEFAULT_SETTINGS, ...settings }
      await db.replaceAll(articles, images, merged)
      const articleMap: Record<string, Article> = {}
      for (const a of articles) articleMap[a.id] = a
      const imageMap: Record<string, InkImage> = {}
      for (const i of images) imageMap[i.id] = i
      set({ articles: articleMap, images: imageMap, settings: merged, view: 'archive', activeId: null })
    },
  }
})

// ── theme helpers ────────────────────────────────────────────────────────
function prefersDark(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}
