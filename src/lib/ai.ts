import Anthropic from '@anthropic-ai/sdk'
import type { Article, Settings } from '@/types'
import type { PrivacyCategory, PrivacyFinding } from './privacy'

// ─────────────────────────────────────────────────────────────────────────
// The AI writing partner. One adapter, one seam. Talks to Claude (default
// Opus 4.8) directly from the browser — the key lives only in her local
// IndexedDB and is never shipped. If unconfigured, every caller degrades to a
// clear "add your key" state; nothing else in the app depends on this.
//
// dangerouslyAllowBrowser is intentional and safe here: Inkwell is a personal,
// local-only tool that she runs on her own machine with her own key.
// ─────────────────────────────────────────────────────────────────────────

// A key from .env.local (VITE_ANTHROPIC_KEY) is a convenient default for her
// local build. The Settings field takes precedence (so the public demo's
// per-visitor key still works); env is the fallback. NEVER set this var on
// Vercel — Vite bakes it into the public bundle.
const ENV_KEY = (import.meta.env.VITE_ANTHROPIC_KEY ?? '').trim()

function effectiveKey(s: Settings): string {
  return s.aiApiKey.trim() || ENV_KEY
}

// Configured AND allowed: a key is present (Settings or env) and AI is on.
export function isAIConfigured(s: Settings): boolean {
  return Boolean(effectiveKey(s)) && s.aiEnabled !== false
}

// Has a key but the user switched AI off via governance.
export function isAIDisabledByGovernance(s: Settings): boolean {
  return Boolean(effectiveKey(s)) && s.aiEnabled === false
}

export function isWebSearchAllowed(s: Settings): boolean {
  return s.allowWebSearch !== false
}

function client(s: Settings): Anthropic {
  return new Anthropic({ apiKey: effectiveKey(s), dangerouslyAllowBrowser: true })
}

const MODEL = (s: Settings) => s.aiModel.trim() || 'claude-opus-4-8'

// The persona every call shares: Inkwell's in-house editor who knows HER voice.
function systemPrompt(s: Settings): string {
  const voice = s.voiceProfile.trim()
  return [
    'You are the in-house writing editor AND writing teacher inside Inkwell, a personal writing app owned by Anuja Harsha — a Staff-level product designer turned design-engineer who writes sharp, honest, first-person essays about design, AI, and her career.',
    'Your job is to make HER writing better in HER voice — never to flatten it into generic AI prose. Preserve her cadence, her directness, her specifics. Tighten, sharpen, and clarify; do not sanitize or pad.',
    'You are also teaching her to improve. When you suggest a change, make the underlying craft principle legible so she learns it and applies it herself next time — the goal is that she needs you less over time, not more.',
    voice ? `\nHer voice profile (learned from her own writing — honor it):\n${voice}` : '',
    '\nNever invent facts, names, numbers, or events. If a claim needs a real detail she has not provided, leave a clear [bracketed placeholder] rather than fabricating.',
    '\nShe publishes in public, so treat her real personal specifics as private and keep them GENERIC in anything you write or revise: exact salary/compensation/offer amounts and other financial figures (e.g. "$138K" → "a competitive offer" or "[a generic figure]"), her birthdate, home address, and contact details, and exact employer or client company names (→ a generic descriptor like "a large enterprise software company"). Never introduce, amplify, or carry a real specific figure or named company into the draft — even if it appears in the title, hook, or her notes. If genericizing would lose needed meaning, leave a [bracketed placeholder] for her to decide.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function complete(s: Settings, system: string, user: string, maxTokens = 2048): Promise<string> {
  const res = await client(s).messages.create({
    model: MODEL(s),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

// ── Quick actions (Grammarly-style rewrites on the body) ───────────────────
export type QuickAction = 'improve' | 'tighten' | 'expand' | 'hook' | 'lift' | 'continue'

const ACTION_BRIEF: Record<QuickAction, (a: Article) => string> = {
  improve: () =>
    'Revise the draft below for clarity, flow, and impact while keeping every idea, the structure, and her voice intact. Return ONLY the revised markdown — no preamble, no commentary.',
  tighten: () =>
    'Tighten the draft below: cut filler, weak hedges, and redundancy; keep every real point and her voice. Aim for noticeably fewer words without losing meaning. Return ONLY the tightened markdown.',
  expand: () =>
    'Develop the draft below: add depth, a concrete example or two, and connective tissue where it feels thin — without padding or inventing facts (use [bracketed placeholders] for any specific she must supply). Keep her voice. Return ONLY the expanded markdown.',
  hook: (a) =>
    `Rewrite the opening so it earns the reader's attention immediately — in her voice, no clickbait. The article's editorial angle is: "${a.hook}". Return ONLY the rewritten opening paragraph(s) as markdown.`,
  lift: () =>
    'Lift the diction of the draft below: replace weak, vague, or overused words with more precise and vivid ones — in her natural register. Do NOT use thesaurus words that sound stiff or pretentious; do not change meaning or structure. Return ONLY the revised markdown.',
  continue: () =>
    'Continue the draft below from exactly where it stops — match her voice and momentum, advance the argument, do not repeat what came before, do not summarize. Return ONLY the new continuation text (what should be appended), as markdown.',
}

export async function runQuickAction(action: QuickAction, article: Article, s: Settings): Promise<string> {
  const brief = ACTION_BRIEF[action](article)
  const body = article.body.trim() || '(The draft is currently empty.)'
  const strict =
    '\n\nCRITICAL: Output ONLY the resulting article text itself — no preamble, no explanation of your changes, no notes, no headings you added, no code fences. The output replaces the draft directly, so it must contain nothing but the writing.'
  const user = `Title: ${article.title || 'Untitled'}\nAngle: ${article.hook || '—'}\n\n${brief}${strict}\n\n--- DRAFT ---\n${body}`
  const max = action === 'continue' ? 1200 : action === 'expand' ? 3000 : 2600
  return complete(s, systemPrompt(s), user, max)
}

// ── Draft review (suggestion cards) ────────────────────────────────────────
export type SuggestionCategory = 'clarity' | 'voice' | 'engagement' | 'correctness'

export interface Suggestion {
  category: SuggestionCategory
  title: string // short label
  note: string // why it matters
  before?: string // optional exact snippet from the draft
  after?: string // optional suggested replacement
}

const REVIEW_SCHEMA_HINT = `Return ONLY a JSON object (no markdown fence, no prose) of the form:
{"suggestions":[{"category":"clarity|voice|engagement|correctness","title":"short label","note":"one or two sentences on why","before":"exact text from the draft to replace (optional, omit if not a direct swap)","after":"the suggested replacement (optional)"}]}
Rules: 4–8 suggestions, highest-impact first. "before" MUST be an exact substring of the draft when present so it can be applied automatically. Honor her voice — do not suggest making it more generic or corporate. Skip trivial nitpicks.`

export async function reviewDraft(article: Article, s: Settings): Promise<Suggestion[]> {
  const body = article.body.trim()
  if (!body) return []
  const user = `Title: ${article.title || 'Untitled'}\nAngle: ${article.hook || '—'}\n\nReview this draft as her editor and surface the highest-impact improvements across clarity, voice, engagement, and correctness.\n\n${REVIEW_SCHEMA_HINT}\n\n--- DRAFT ---\n${body}`
  const raw = await complete(s, systemPrompt(s), user, 2600)
  return parseSuggestions(raw)
}

function parseSuggestions(raw: string): Suggestion[] {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
    const parsed = JSON.parse(json)
    const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
    return list
      .filter((x: unknown): x is Suggestion => !!x && typeof (x as Suggestion).title === 'string')
      .map((x: Suggestion) => ({
        category: (['clarity', 'voice', 'engagement', 'correctness'] as const).includes(x.category)
          ? x.category
          : 'clarity',
        title: x.title,
        note: x.note ?? '',
        before: x.before,
        after: x.after,
      }))
  } catch {
    return []
  }
}

// ── Lesson (teach on the current draft) ───────────────────────────────────
// Returns short markdown: what worked · one habit to work on · a micro-exercise.
export async function coachLesson(article: Article, s: Settings): Promise<string> {
  const body = article.body.trim()
  if (!body) return ''
  const user = `Read this draft and teach me as my writing coach. Be specific to THIS text — quote from it. Keep it under 220 words, in exactly these three short markdown sections:

**What's working** — one or two genuine strengths (name the craft move).
**One habit to work on** — the single highest-leverage thing (e.g. "you explain too much", "your framing is buried", "sentence length never varies"). Show one before→after from the draft.
**Try this next** — one concrete micro-exercise for her next writing session.

--- DRAFT ---
${body}`
  return complete(s, systemPrompt(s), user, 1100)
}

// ── Grounded insights (web-sourced craft guidance, cited) ──────────────────
// Uses Claude's web_search server tool to pull REAL writing-craft material and
// apply it to her actual draft — never invented advice. Returns markdown.
export async function groundedInsights(article: Article, s: Settings): Promise<string> {
  const body = article.body.trim()
  if (!body) return ''
  const user = `I want to become a better writer through practice. Search the web for credible, specific writing-craft guidance relevant to the weaknesses in MY draft below (e.g. tightening framing, over-explaining, vocabulary, sentence rhythm, leading with the point). Then teach me:

- 3 to 4 insights, each tied to a real principle from a named source, applied to a specific moment in my draft (quote it), with a concrete fix.
- End with a one-line "Source(s):" listing what you drew on with links.

Keep it under 350 words, markdown, in my coach's voice. Ground every insight in something you actually found — do not invent principles or sources.

--- MY DRAFT ---
${body}`
  const res = await client(s).messages.create({
    model: MODEL(s),
    max_tokens: 2600,
    system: systemPrompt(s),
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }] as Anthropic.Messages.ToolUnion[],
    messages: [{ role: 'user', content: user }],
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

// ── Privacy / fact-check deep scan ────────────────────────────────────────
// Catches what regex can't: exact employer names, figures written in words,
// home locations, anything doxxable. Returns the same finding shape as the
// local scan so the UI renders them together. Suggestions keep her rule:
// generic numbers, generic companies.
const PRIVACY_SCHEMA_HINT = `Return ONLY a JSON object (no fence, no prose):
{"findings":[{"category":"finance|date|address|contact|company|identity","text":"exact substring from the draft","suggestion":"a generic replacement that preserves the point","note":"one short reason"}]}
Flag: exact salary/compensation/financial figures; her birthdate or other identifying dates; home address or precise location; phone/email; and EXACT employer or client company names (suggest a generic descriptor like "a large enterprise software company"). Do NOT flag generic numbers, well-known public facts, or the names of her OWN apps/projects. "text" must be an exact substring of the draft. If nothing is sensitive, return {"findings":[]}.`

export async function privacyScan(article: Article, s: Settings): Promise<PrivacyFinding[]> {
  const body = article.body.trim()
  if (!body) return []
  const sys =
    'You are a careful privacy and confidentiality reviewer for a writer preparing to publish in public. You protect her from doxxing herself or breaching confidentiality. You are precise and never paranoid about harmless generic detail.'
  const user = `Review this draft before she publishes it publicly. Her rule: keep all numbers generic and all company names generic; never expose her birthdate, home address, exact salary/finances, or contact details.\n\n${PRIVACY_SCHEMA_HINT}\n\n--- DRAFT ---\n${body}`
  const raw = await complete(s, sys, user, 2048)
  return parsePrivacy(raw)
}

function parsePrivacy(raw: string): PrivacyFinding[] {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const a = cleaned.indexOf('{')
    const b = cleaned.lastIndexOf('}')
    const parsed = JSON.parse(a >= 0 && b > a ? cleaned.slice(a, b + 1) : cleaned)
    const list = Array.isArray(parsed?.findings) ? parsed.findings : []
    const known: PrivacyCategory[] = ['finance', 'date', 'address', 'contact', 'company', 'identity']
    return list
      .filter((x: unknown): x is { text: string } => !!x && typeof (x as { text: string }).text === 'string')
      .map((x: { category?: string; text: string; suggestion?: string; note?: string }) => ({
        category: (known.includes(x.category as PrivacyCategory) ? x.category : 'finance') as PrivacyCategory,
        text: x.text,
        suggestion: x.suggestion ?? '[redacted]',
        note: x.note ?? 'Possibly confidential.',
        source: 'ai' as const,
      }))
  } catch {
    return []
  }
}

// ── Corpus insight (dashboard teaching moment) ─────────────────────────────
// A short craft insight drawn from her recent writing — the dashboard surface
// of the longitudinal teacher. Returns markdown.
export async function corpusInsight(samples: string[], s: Settings): Promise<string> {
  const corpus = samples
    .map((t, i) => `--- PIECE ${i + 1} ---\n${t}`)
    .join('\n\n')
    .slice(0, 40000)
  const user = `Across these recent pieces of my writing, give me ONE high-leverage craft insight to work on right now — a pattern you actually see (e.g. "you open with throat-clearing", "your sentences rarely vary in length", "you explain the joke after telling it"). Quote a short real example, name the principle, and give me one thing to practice in my next piece. Under 140 words, markdown, in my coach's voice. If there isn't enough writing yet, say so warmly in one line.\n\n${corpus}`
  return complete(s, systemPrompt(s), user, 700)
}

// ── Originality / plagiarism (web-grounded) ───────────────────────────────
export async function originalityScan(article: Article, s: Settings): Promise<string> {
  const body = article.body.trim()
  if (!body) return ''
  const user = `Check this draft for originality before I publish. Search the web for any distinctive sentences or claims that closely match existing published material (so I don't accidentally echo someone else's phrasing or facts). For each potential match: quote the passage from my draft, name the likely source with a link, and say how close it is. If a factual claim can't be verified, flag it. If it all reads as original and sound, say so plainly. Under 300 words, markdown. Do not invent matches — only report what you actually find.\n\n--- MY DRAFT ---\n${body}`
  const res = await client(s).messages.create({
    model: MODEL(s),
    max_tokens: 2600,
    system:
      'You are an originality and fact reviewer helping a writer avoid accidental plagiarism and unverifiable claims before publishing. You are precise, cite real sources, and never fabricate matches.',
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }] as Anthropic.Messages.ToolUnion[],
    messages: [{ role: 'user', content: user }],
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

// ── Voice profile (learn from her corpus) ─────────────────────────────────
export async function learnVoice(samples: string[], s: Settings): Promise<string> {
  const corpus = samples
    .map((t, i) => `--- SAMPLE ${i + 1} ---\n${t}`)
    .join('\n\n')
    .slice(0, 60000) // keep the prompt bounded
  const user = `Below are samples of Anuja's actual writing. Produce a concise VOICE PROFILE another editor could use to write convincingly in her voice. Cover: tone, sentence rhythm, signature moves, vocabulary, what she avoids, and how she opens and closes. Be specific and quote a few characteristic phrases. 200–300 words, plain prose (not a list of generic adjectives).\n\n${corpus}`
  const system =
    'You are a sharp literary editor who can characterize a writer\'s voice precisely from samples. You never flatter; you describe what is actually on the page.'
  return complete(s, system, user, 1200)
}
