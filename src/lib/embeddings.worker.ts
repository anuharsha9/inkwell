/// <reference lib="webworker" />
import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers'

// ─────────────────────────────────────────────────────────────────────────
// On-device embedding worker (Phase 6). Runs entirely off the main thread so
// the ~23MB model download + inference never freezes the editor.
//
// Strictly opt-in: this file is only ever instantiated when she turns on
// semantic search in Settings (see embeddings.ts / isSemanticEnabled). It
// never runs in the public demo build.
//
// The model is fetched from the Hugging Face hub on first use and cached by
// transformers.js in the browser's Cache Storage, so subsequent loads are
// instant and fully offline. Nothing is ever sent to a server of ours — the
// only network call is the one-time model download.
// ─────────────────────────────────────────────────────────────────────────

// We have no local model files bundled; always resolve from the hub + cache.
env.allowLocalModels = false
env.useBrowserCache = true

const MODEL = 'Xenova/all-MiniLM-L6-v2' // small, quantized (~23MB)

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL, {
      quantized: true,
      // Surface download progress so the UI can show "loading model…".
      progress_callback: (p: unknown) => {
        self.postMessage({ type: 'progress', payload: p })
      },
    })
  }
  return extractorPromise
}

type EmbedRequest = { type: 'embed'; id: number; text: string }

self.onmessage = async (e: MessageEvent<EmbedRequest>) => {
  const msg = e.data
  if (!msg || msg.type !== 'embed') return
  const { id, text } = msg
  try {
    const extractor = await getExtractor()
    // Mean-pool the token embeddings and L2-normalize, so a plain dot product
    // (our cosineSimilarity) reads as cosine similarity directly.
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    // `output.data` is a Float32Array; copy it into a plain transferable array.
    const vector = Array.from(output.data as Float32Array)
    self.postMessage({ type: 'result', id, vector })
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err instanceof Error ? err.message : String(err) })
  }
}
