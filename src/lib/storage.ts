import { openDB, type IDBPDatabase } from 'idb'
import type { Article, InkImage, Settings } from '@/types'
import { buildSeedArticles } from '@/data/seed'
import { buildDemoArticles } from '@/data/demoSeed'
import { DEMO_MODE } from '@/lib/env'

// ─────────────────────────────────────────────────────────────────────────
// Persistence (PRD §6). The contract: nothing here ever loses written work.
//
// Three object stores:
//   articles  — keyed by id. The light record (no image blobs inside).
//   images    — keyed by id. One entry per image, so a heavy base64 cover
//               never bloats the article list load (PRD §5.5 storage caution).
//   meta      — small key/value: settings + the "seeded" flag.
// ─────────────────────────────────────────────────────────────────────────

// Demo mode uses a separate database so a public visitor's tinkering never
// touches (or reveals) her real local data.
const DB_NAME = DEMO_MODE ? 'inkwell-demo' : 'inkwell'
const DB_VERSION = 2
const SEEDED_KEY = 'seeded:v1'
const MAX_VERSIONS = 25 // snapshots kept per article

export const DEFAULT_SETTINGS: Settings = {
  substackUrl: '',
  mediumUsername: '',
  linkedinUrl: '',
  configThesis:
    "A designer who couldn't code used AI agents as a team to build three production apps — and came out believing the job itself is changing.",
  configDeadline: '2026-11-01',
  configOutline: '',
  imageApiEndpoint: '',
  imageApiKey: '',
  imageApiModel: '',
  accent: '', // empty = use the theme default (ink indigo)
  aiApiKey: '',
  aiModel: 'claude-opus-4-8',
  aiEnabled: true,
  allowWebSearch: true,
  semanticEnabled: false, // opt-in only — never auto-download the model
  voiceProfile: '',
  voiceProfileUpdatedAt: '',
  craftInsight: '',
  craftInsightAt: '',
  privacyTerms: [],
  bookTitle: '',
  bookArticleIds: [],
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('articles')) db.createObjectStore('articles', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
        // v2 — per-article version history + cached semantic embeddings.
        if (!db.objectStoreNames.contains('versions')) {
          const vs = db.createObjectStore('versions', { keyPath: 'id' })
          vs.createIndex('articleId', 'articleId')
        }
        if (!db.objectStoreNames.contains('embeddings')) db.createObjectStore('embeddings', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

// ── Articles ──────────────────────────────────────────────────────────────
export async function loadArticles(): Promise<Article[]> {
  const db = await getDB()
  return (await db.getAll('articles')) as Article[]
}

export async function putArticle(article: Article): Promise<void> {
  const db = await getDB()
  await db.put('articles', article)
}

export async function deleteArticle(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('articles', id)
}

export async function putArticlesBulk(articles: Article[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('articles', 'readwrite')
  await Promise.all(articles.map((a) => tx.store.put(a)))
  await tx.done
}

// ── Images (one key per image) ──────────────────────────────────────────
export async function loadAllImages(): Promise<InkImage[]> {
  const db = await getDB()
  return (await db.getAll('images')) as InkImage[]
}

export async function putImage(image: InkImage): Promise<void> {
  const db = await getDB()
  await db.put('images', image)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
}

// ── Settings ──────────────────────────────────────────────────────────────
export async function loadSettings(): Promise<Settings> {
  const db = await getDB()
  const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('meta', settings, 'settings')
}

// ── Vocabulary (her personal word list) ──────────────────────────────────
export interface SavedWord {
  word: string
  definition: string
  partOfSpeech: string
  savedAt: string // ISO
  // Spaced-repetition state (SM-2-lite). See lib/srs.ts.
  due: string // ISO — when it's next due for review
  interval: number // days until next review
  ease: number // ease factor (starts 2.5)
  reps: number // consecutive successful recalls
  lapses: number // times forgotten
}

// Backfill SR fields for words saved before spaced repetition existed.
function normalizeWord(w: Partial<SavedWord> & { word: string; definition: string; partOfSpeech: string; savedAt: string }): SavedWord {
  return {
    word: w.word,
    definition: w.definition,
    partOfSpeech: w.partOfSpeech,
    savedAt: w.savedAt,
    due: w.due ?? w.savedAt ?? new Date().toISOString(),
    interval: w.interval ?? 0,
    ease: w.ease ?? 2.5,
    reps: w.reps ?? 0,
    lapses: w.lapses ?? 0,
  }
}

export async function loadVocab(): Promise<SavedWord[]> {
  const db = await getDB()
  const raw = ((await db.get('meta', 'vocab')) as SavedWord[] | undefined) ?? []
  return raw.map(normalizeWord)
}

export async function saveVocab(words: SavedWord[]): Promise<void> {
  const db = await getDB()
  await db.put('meta', words, 'vocab')
}

// ── Version history (per-article snapshots, PRD §6 — never lose work) ──────
export interface Version {
  id: string // `${articleId}:${ts}`
  articleId: string
  ts: string // ISO
  body: string
  reason: string // why it was snapshotted ("before Tighten", "autosave", …)
}

export async function saveVersion(articleId: string, body: string, reason: string): Promise<void> {
  const db = await getDB()
  const ts = new Date().toISOString()
  await db.put('versions', { id: `${articleId}:${ts}`, articleId, ts, body, reason })
  // Prune to the most recent MAX_VERSIONS for this article.
  const all = (await db.getAllFromIndex('versions', 'articleId', articleId)) as Version[]
  if (all.length > MAX_VERSIONS) {
    const toDrop = all.sort((a, b) => a.ts.localeCompare(b.ts)).slice(0, all.length - MAX_VERSIONS)
    const tx = db.transaction('versions', 'readwrite')
    await Promise.all(toDrop.map((v) => tx.store.delete(v.id)))
    await tx.done
  }
}

export async function loadVersions(articleId: string): Promise<Version[]> {
  const db = await getDB()
  const all = (await db.getAllFromIndex('versions', 'articleId', articleId)) as Version[]
  return all.sort((a, b) => b.ts.localeCompare(a.ts)) // newest first
}

export async function deleteVersionsFor(articleId: string): Promise<void> {
  const db = await getDB()
  const all = (await db.getAllFromIndex('versions', 'articleId', articleId)) as Version[]
  const tx = db.transaction('versions', 'readwrite')
  await Promise.all(all.map((v) => tx.store.delete(v.id)))
  await tx.done
}

// ── Cached semantic embeddings (one vector per article, keyed by content) ──
export interface StoredEmbedding {
  id: string // articleId
  hash: string // content hash so we know when to recompute
  vector: number[]
}

export async function loadEmbedding(id: string): Promise<StoredEmbedding | undefined> {
  const db = await getDB()
  return (await db.get('embeddings', id)) as StoredEmbedding | undefined
}

export async function saveEmbedding(e: StoredEmbedding): Promise<void> {
  const db = await getDB()
  await db.put('embeddings', e)
}

export async function deleteEmbedding(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('embeddings', id)
}

// ── First-run seed (PRD §8) ──────────────────────────────────────────────
// Idempotent: a "seeded" flag guarantees we never re-seed over her real edits.
export async function ensureSeeded(): Promise<void> {
  const db = await getDB()
  const seeded = await db.get('meta', SEEDED_KEY)
  if (seeded) return
  const existing = await db.count('articles')
  if (existing === 0) {
    await putArticlesBulk(DEMO_MODE ? buildDemoArticles() : buildSeedArticles())
  }
  await db.put('meta', true, SEEDED_KEY)
}

// ── Wholesale replace (for import, PRD §6) ───────────────────────────────
export async function replaceAll(articles: Article[], images: InkImage[], settings: Settings): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['articles', 'images', 'meta'], 'readwrite')
  await tx.objectStore('articles').clear()
  await tx.objectStore('images').clear()
  await Promise.all(articles.map((a) => tx.objectStore('articles').put(a)))
  await Promise.all(images.map((i) => tx.objectStore('images').put(i)))
  await tx.objectStore('meta').put(settings, 'settings')
  await tx.objectStore('meta').put(true, SEEDED_KEY)
  await tx.done
}
