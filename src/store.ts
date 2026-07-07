import { create } from 'zustand'
import type { Article, Format, InkImage, Phase, Platform, Settings, Status, Tag } from '@/types'
import type { Source, Suggestion } from '@/data/sources'
import * as db from '@/lib/storage'
import { countWords, nowISO, uuid } from '@/lib/text'
import { removeArticleFile, syncArticleFile } from '@/lib/localArchive'
import { parseBackup, type Backup } from '@/lib/backup'
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

export interface NewArticleDialog {
  open: boolean
  format: Format
  scheduledFor: string
}

interface InkState {
  loaded: boolean
  articles: Record<string, Article>
  images: Record<string, InkImage>
  settings: Settings
  vocab: db.SavedWord[]
  customSources: Source[]
  theme: Theme

  view: View
  activeId: string | null
  groupBy: GroupBy
  filters: Filters
  saveState: SaveState
  newDialog: NewArticleDialog
  // Bumps each time a piece is marked published — drives the "shipped" flourish.
  publishTick: number

  // lifecycle
  init: () => Promise<void>

  // navigation
  setView: (view: View) => void
  openEditor: (id: string) => void
  setGroupBy: (g: GroupBy) => void
  setFilters: (patch: Partial<Filters>) => void
  clearFilters: () => void
  toggleTheme: () => void

  // articles — createArticle opens the new-article dialog; confirmCreate finalizes it
  createArticle: () => void
  confirmCreate: () => string
  cancelCreate: () => void
  updateNewDialog: (patch: Partial<NewArticleDialog>) => void
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

  // custom source material (added in-app)
  addSource: (source: Omit<Source, 'id' | 'suggestions'>) => void
  removeSource: (id: string) => void
  addSourceSuggestion: (sourceId: string, sg: Suggestion) => void

  // backup
  importBackup: (
    articles: Article[],
    images: InkImage[],
    settings: Settings,
    vocab?: db.SavedWord[],
    customSources?: Source[],
  ) => Promise<void>
  // Non-destructive merge from the shell backup on launch — propagates data
  // corrections and schema-migration fields without clobbering local edits.
  reconcileFromBackup: (backup: Backup) => Promise<number>
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
    customSources: [],
    theme: 'light',

    view: DEMO_MODE ? 'learn' : 'home', // demo visitors land on the showcase first
    activeId: null,
    groupBy: 'phase',
    filters: EMPTY_FILTERS,
    saveState: 'idle',
    newDialog: { open: false, format: 'article', scheduledFor: '' },
    publishTick: 0,

    async init() {
      await db.ensureSeeded()
      const [articles, images, settings, vocab, customSources] = await Promise.all([
        db.loadArticles(),
        db.loadAllImages(),
        db.loadSettings(),
        db.loadVocab(),
        db.loadCustomSources<Source>(),
      ])
      const articleMap: Record<string, Article> = {}
      for (const a of articles) articleMap[a.id] = a
      const imageMap: Record<string, InkImage> = {}
      for (const i of images) imageMap[i.id] = i

      const savedTheme = (localStorage.getItem('inkwell:theme') as Theme | null) ?? prefersDark()
      applyTheme(savedTheme)

      set({ loaded: true, articles: articleMap, images: imageMap, settings, vocab, customSources, theme: savedTheme })

      // Shell backup sync (no-op in the demo or when the endpoint is absent):
      //  · A never-used install (pristine seed) → full auto-hydration.
      //  · An established install → a non-destructive reconcile that propagates
      //    data corrections and new schema fields (e.g. `format`) from the
      //    durable backup WITHOUT overwriting her local edits. This is how a fix
      //    made to inkwell-backup.json reaches the desktop app on next launch.
      if (!DEMO_MODE) {
        try {
          const res = await fetch('/__inkwell/bootstrap')
          if (res.ok) {
            const backup = parseBackup(await res.text())
            if (db.isPristineSeed(articles)) {
              await get().importBackup(backup.articles, backup.images ?? [], backup.settings, backup.vocab, backup.customSources)
              set({ view: 'home', activeId: null })
            } else {
              await get().reconcileFromBackup(backup)
            }
          }
        } catch {
          /* no shell backup — stay on local data */
        }
      }
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
      set({ newDialog: { open: true, format: 'article', scheduledFor: '' } })
    },

    confirmCreate() {
      const { format, scheduledFor } = get().newDialog
      const id = get().createIdeaFrom(
        { format, scheduledFor: scheduledFor || null },
        { open: true },
      )
      set({ newDialog: { open: false, format: 'article', scheduledFor: '' } })
      return id
    },

    cancelCreate() {
      set({ newDialog: { open: false, format: 'article', scheduledFor: '' } })
    },

    updateNewDialog(patch) {
      set({ newDialog: { ...get().newDialog, ...patch } })
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
        format: 'article',
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
      if (status === 'published') {
        if (!prev.publishedAt) patch.publishedAt = nowISO()
        patch.scheduledFor = null // its plan slot is done
        if (prev.status !== 'published') set((s) => ({ publishTick: s.publishTick + 1 }))
      }
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
      const patch: Partial<Article> = { status: 'published', publishedAt: prev.publishedAt ?? nowISO(), scheduledFor: null }
      if (platforms) patch.platforms = platforms
      if (prev.status !== 'published') set((s) => ({ publishTick: s.publishTick + 1 }))
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

    addSource(source) {
      const full: Source = { ...source, id: `custom-${uuid()}`, suggestions: [] }
      const next = [full, ...get().customSources]
      set({ customSources: next })
      void db.saveCustomSources(next)
    },

    removeSource(id) {
      const next = get().customSources.filter((s) => s.id !== id)
      set({ customSources: next })
      void db.saveCustomSources(next)
    },

    addSourceSuggestion(sourceId, sg) {
      const next = get().customSources.map((s) => {
        if (s.id !== sourceId) return s
        // No exact-duplicate angles (also guards a double-submit).
        if (s.suggestions.some((x) => x.title.trim().toLowerCase() === sg.title.trim().toLowerCase())) return s
        return { ...s, suggestions: [...s.suggestions, sg] }
      })
      set({ customSources: next })
      void db.saveCustomSources(next)
    },

    async importBackup(articles, images, settings, vocab, customSources) {
      const merged = { ...db.DEFAULT_SETTINGS, ...settings }
      await db.replaceAll(articles, images, merged)
      const articleMap: Record<string, Article> = {}
      for (const a of articles) articleMap[a.id] = a
      const imageMap: Record<string, InkImage> = {}
      for (const i of images) imageMap[i.id] = i
      const patch: Partial<InkState> = { articles: articleMap, images: imageMap, settings: merged }
      // Newer backups carry the word bank + custom sources; older ones keep what's here.
      if (vocab) {
        patch.vocab = vocab
        await db.saveVocab(vocab)
      }
      if (customSources) {
        patch.customSources = customSources
        await db.saveCustomSources(customSources)
      }
      set({ ...patch, view: 'archive', activeId: null })
    },

    async reconcileFromBackup(backup) {
      const localArticles = get().articles
      const localImages = get().images
      const toPut: Article[] = []
      const imgToPut: InkImage[] = []

      for (const b of backup.articles) {
        const l = localArticles[b.id]
        if (!l) {
          // A piece that exists in the durable backup but not locally — adopt it.
          toPut.push(b)
          continue
        }
        // Per-article last-write-wins: a genuinely newer backup entry is a
        // correction and replaces the local copy; her newer local edits win.
        if (b.updatedAt && l.updatedAt && b.updatedAt > l.updatedAt) {
          toPut.push({ ...b })
          continue
        }
        // Same-or-older backup: only backfill fields the local copy is MISSING
        // (schema evolution like `format`). Never overwrite an existing value,
        // so not a single word of her drafts is touched.
        let patched: Article | null = null
        for (const k of Object.keys(b) as (keyof Article)[]) {
          if (l[k] === undefined && b[k] !== undefined) {
            patched = patched ?? { ...l }
            ;(patched as unknown as Record<string, unknown>)[k as string] = b[k]
          }
        }
        if (patched) toPut.push(patched)
      }

      // Additive: pull in any images the backup has that we don't (safe — keyed by id).
      for (const img of backup.images ?? []) {
        if (!localImages[img.id]) imgToPut.push(img)
      }

      if (!toPut.length && !imgToPut.length) return 0

      set((s) => {
        const articles = { ...s.articles }
        for (const a of toPut) articles[a.id] = a
        const images = { ...s.images }
        for (const i of imgToPut) images[i.id] = i
        return { articles, images }
      })
      for (const a of toPut) await db.putArticle(a)
      for (const i of imgToPut) await db.putImage(i)
      return toPut.length + imgToPut.length
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
