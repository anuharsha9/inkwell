// ─────────────────────────────────────────────────────────────────────────
// Pure, dependency-free core for Phase 6 semantic embeddings: the vector math,
// the content-hash cache key, and text prep. Split out from embeddings.ts so it
// carries NO worker/model/IndexedDB import — cheap to load and unit-testable
// without ever downloading the model.
// ─────────────────────────────────────────────────────────────────────────

export interface Neighbor {
  id: string
  title: string
  similarity: number // 0–100 cosine, rounded for display
}

/** Minimal shape of a cached vector record (mirrors storage.StoredEmbedding). */
export interface CachedVector {
  hash: string
  vector: number[]
}

// MiniLM is happy up to 512 tokens; ~1500 chars (~375 tokens) keeps us safely
// under that while still capturing an article's gist for similarity.
export const MAX_CHARS = 1500

// Skip stubs/ideas — too short to mean anything semantically.
export const MIN_WORDS = 20

/**
 * Cosine similarity of two equal-length vectors, in [-1, 1]. Model vectors are
 * already L2-normalized (so this is effectively a dot product), but we keep it
 * general — it stays correct for un-normalized inputs and returns 0 if either
 * vector is empty, zero-length, or mismatched rather than NaN.
 */
export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Cheap, stable content hash (FNV-1a, 32-bit, hex). We key each cached vector
 * by the hash of the exact text we embedded, so a vector is reused as long as
 * the body is byte-identical and recomputed the moment it changes.
 */
export function contentHash(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Strip markdown noise to plain prose, collapse whitespace, and bound length. */
export function prepText(body: string): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label
    .replace(/[#>*_~]/g, ' ') // markdown punctuation
    .replace(/\s+/g, ' ')
    .trim()
  return plain.slice(0, MAX_CHARS)
}

/**
 * The cache decision: reuse a stored vector only when it exists, was computed
 * from byte-identical text, and actually holds data. Pure, so it's tested
 * directly without loading the model.
 */
export function shouldReuseCached(cached: CachedVector | undefined, text: string): boolean {
  if (!cached || cached.vector.length === 0) return false
  return cached.hash === contentHash(text)
}

/** Words in a body, markdown and whitespace ignored. */
export function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length
}
