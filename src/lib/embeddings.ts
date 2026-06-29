import type { Settings } from '@/types'
import { DEMO_MODE } from '@/lib/env'
import { loadEmbedding, saveEmbedding } from '@/lib/storage'
import {
  cosineSimilarity,
  contentHash,
  prepText,
  shouldReuseCached,
  wordCount,
  MIN_WORDS,
  type Neighbor,
} from '@/lib/embeddings-core'

// ─────────────────────────────────────────────────────────────────────────
// Phase 6 — on-device semantic embeddings (the A+ "originality/voice" frontier).
//
// All local. The only network access is a one-time ~23MB model download from
// the Hugging Face hub, cached forever by transformers.js. No API, no key, no
// data ever leaves the device for inference. STRICTLY opt-in (Settings) and
// HARD-disabled in the public demo, so a visitor never triggers the download.
//
// The pure math/cache helpers live in embeddings-core.ts (worker-free, unit-
// tested without the model). This module owns the worker lifecycle and wires
// the cache to IndexedDB.
// ─────────────────────────────────────────────────────────────────────────

// Re-export the pure helpers so callers have a single import surface.
export { cosineSimilarity, contentHash, prepText, type Neighbor } from '@/lib/embeddings-core'

/** True only when she has turned semantic search on AND we're not in the demo. */
export function isSemanticEnabled(settings: Pick<Settings, 'semanticEnabled'>): boolean {
  return !!settings.semanticEnabled && !DEMO_MODE
}

// ── Worker bridge ───────────────────────────────────────────────────────────

type WorkerMsg =
  | { type: 'result'; id: number; vector: number[] }
  | { type: 'error'; id: number; error: string }
  | { type: 'progress'; payload: unknown }

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>()
const progressListeners = new Set<(p: ModelProgress) => void>()

export interface ModelProgress {
  status: string // "initiate" | "download" | "progress" | "done" | "ready" …
  file?: string
  progress?: number // 0–100, present while downloading
}

/** Subscribe to model download/load progress. Returns an unsubscribe fn. */
export function onModelProgress(cb: (p: ModelProgress) => void): () => void {
  progressListeners.add(cb)
  return () => progressListeners.delete(cb)
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./embeddings.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        for (const cb of progressListeners) cb(msg.payload as ModelProgress)
        return
      }
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.type === 'error') p.reject(new Error(msg.error))
      else p.resolve(Float32Array.from(msg.vector))
    }
    worker.onerror = () => {
      const err = new Error('The on-device model failed to load. Check your connection and try again.')
      for (const p of pending.values()) p.reject(err)
      pending.clear()
      // Drop the dead worker so a later attempt re-creates it fresh.
      worker?.terminate()
      worker = null
    }
  }
  return worker
}

/** Embed arbitrary text → a mean-pooled, normalized vector. Lazily boots the worker (and, on first use, downloads the model). */
export function embed(text: string): Promise<Float32Array> {
  const id = ++seq
  const w = getWorker()
  return new Promise<Float32Array>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ type: 'embed', id, text })
  })
}

// ── Cached, per-article embeddings ──────────────────────────────────────────

/**
 * Embed an article's body, reusing the cached vector unless the content changed.
 * The cache lives in the existing `embeddings` IndexedDB store, keyed by article
 * id with a content hash so we only recompute (and re-run the model) on edits.
 */
export async function embedArticle(id: string, body: string): Promise<Float32Array> {
  const text = prepText(body)
  const cached = await loadEmbedding(id)
  if (cached && shouldReuseCached(cached, text)) {
    return Float32Array.from(cached.vector)
  }
  const vector = await embed(text)
  await saveEmbedding({ id, hash: contentHash(text), vector: Array.from(vector) })
  return vector
}

/**
 * Rank the archive by semantic closeness to `target`. Embeds the target and
 * every eligible other piece (reusing cached vectors), then sorts by cosine
 * similarity. This is what powers "Closest in meaning" in the Coach.
 */
export async function semanticNeighbors(
  target: { id: string; body: string },
  others: { id: string; title: string; body: string }[],
): Promise<Neighbor[]> {
  if (wordCount(target.body) < MIN_WORDS) return []

  const targetVec = await embedArticle(target.id, target.body)
  const candidates = others.filter((o) => o.id !== target.id && wordCount(o.body) >= MIN_WORDS)

  const out: Neighbor[] = []
  for (const o of candidates) {
    const vec = await embedArticle(o.id, o.body)
    out.push({
      id: o.id,
      title: o.title || 'Untitled',
      similarity: Math.round(cosineSimilarity(targetVec, vec) * 100),
    })
  }
  return out.sort((a, b) => b.similarity - a.similarity)
}
