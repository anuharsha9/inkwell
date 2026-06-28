import type { Settings } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// AI image generation via Google's Imagen (Gemini API). The key comes from
// Settings → Image generation, or from VITE_GEMINI_KEY in .env.local (local
// only — never set it on a public deploy). If unconfigured, callers show the
// "configure" state and upload/URL paths keep working.
// ─────────────────────────────────────────────────────────────────────────

const ENV_GEMINI_KEY = (import.meta.env.VITE_GEMINI_KEY ?? '').trim()

function imageKey(s: Settings): string {
  return s.imageApiKey.trim() || ENV_GEMINI_KEY
}

export function isImageAIConfigured(s: Settings): boolean {
  return Boolean(imageKey(s))
}

export interface GenerateResult {
  dataUrl: string
}

export async function generateImage(prompt: string, s: Settings): Promise<GenerateResult> {
  const key = imageKey(s)
  if (!key) throw new Error('Image AI is not configured. Add a Gemini API key in Settings (or .env.local).')

  const model = s.imageApiModel.trim() || 'imagen-3.0-generate-002'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9' },
      }),
    },
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Generation failed (${res.status}). ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const pred = json?.predictions?.[0]
  const b64 = pred?.bytesBase64Encoded
  const mime = pred?.mimeType || 'image/png'
  if (!b64) throw new Error('Unexpected response from Gemini — no image returned.')
  return { dataUrl: `data:${mime};base64,${b64}` }
}

// Local heuristic prompt from title + hook (a seam to a text model later).
export function suggestPrompt(title: string, hook: string): string {
  const core = [title.trim(), hook.trim()].filter(Boolean).join(' — ')
  const subject = core || 'an abstract editorial concept'
  return `${subject}. Editorial illustration, muted palette, conceptual, lots of negative space, no text.`
}
