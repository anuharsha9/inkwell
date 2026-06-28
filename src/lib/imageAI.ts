import type { Settings } from '@/types'

// ─────────────────────────────────────────────────────────────────────────
// AI image generation — behind a small adapter so the provider can be swapped
// (PRD §5.5). NOTHING is hardcoded: endpoint, key and model come from Settings.
// If unconfigured, callers show the "configure API key" state and upload/URL
// keep working.
//
// The default adapter speaks the common OpenAI-style images shape:
//   POST {endpoint}  Authorization: Bearer {key}
//   body { model, prompt, n, size, response_format: 'b64_json' }
//   → { data: [{ b64_json }] } or { data: [{ url }] }
// Anuja can point `imageApiEndpoint` at any provider that matches, or replace
// this function wholesale — it's the single seam.
// ─────────────────────────────────────────────────────────────────────────

export function isImageAIConfigured(s: Settings): boolean {
  return Boolean(s.imageApiEndpoint.trim() && s.imageApiKey.trim())
}

export interface GenerateResult {
  dataUrl: string
}

export async function generateImage(prompt: string, s: Settings): Promise<GenerateResult> {
  if (!isImageAIConfigured(s)) {
    throw new Error('Image AI is not configured. Add an endpoint and API key in Settings.')
  }
  const res = await fetch(s.imageApiEndpoint.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${s.imageApiKey.trim()}`,
    },
    body: JSON.stringify({
      model: s.imageApiModel.trim() || 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      response_format: 'b64_json',
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Generation failed (${res.status}). ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  const item = json?.data?.[0]
  if (item?.b64_json) return { dataUrl: `data:image/png;base64,${item.b64_json}` }
  if (item?.url) return { dataUrl: item.url }
  throw new Error('Unexpected response shape from the image provider.')
}

// Local heuristic prompt from title + hook (PRD §5.5) — a seam to later route
// through a text model (Section 9). The style suffix is editable by her.
export function suggestPrompt(title: string, hook: string): string {
  const core = [title.trim(), hook.trim()].filter(Boolean).join(' — ')
  const subject = core || 'an abstract editorial concept'
  return `${subject}. Editorial illustration, muted palette, conceptual, lots of negative space, no text.`
}
