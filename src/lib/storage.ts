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
const DB_VERSION = 1
const SEEDED_KEY = 'seeded:v1'

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
  voiceProfile: '',
  voiceProfileUpdatedAt: '',
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('articles')) db.createObjectStore('articles', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
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
}

export async function loadVocab(): Promise<SavedWord[]> {
  const db = await getDB()
  return ((await db.get('meta', 'vocab')) as SavedWord[] | undefined) ?? []
}

export async function saveVocab(words: SavedWord[]): Promise<void> {
  const db = await getDB()
  await db.put('meta', words, 'vocab')
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
