import Anthropic from '@anthropic-ai/sdk'
import type { Article, Settings } from '@/types'
import { DEMO_MODE, IS_DEV } from './env'
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

// A key from .env.local (VITE_ANTHROPIC_KEY) is the default for her real build.
// The Settings field takes precedence (so the public demo's per-visitor key
// still works); env is the fallback. NEVER set this var on Vercel — Vite bakes
// it into the public bundle.
const ENV_KEY = (import.meta.env.VITE_ANTHROPIC_KEY ?? '').trim()

// The .env.local key powers the LIVE Claude API in her real (production) build,
// but is deliberately ignored under the dev server: dev mode is where the agent
// authors AI content by hand, so running `npm run dev` never spends her key.
// She can still opt in during dev by pasting a key into Settings explicitly.
function effectiveKey(s: Settings): string {
  return s.aiApiKey.trim() || (IS_DEV ? '' : ENV_KEY)
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

// Personal build defaults to Claude Fable 5 (the most capable model — her
// call: "best possible AI" for her own writing); the demo's BYO-key default
// stays Opus 4.8 so visitors aren't defaulted onto the priciest tier.
export const DEFAULT_MODEL = DEMO_MODE ? 'claude-opus-4-8' : 'claude-fable-5'

const MODEL = (s: Settings) => s.aiModel.trim() || DEFAULT_MODEL

const isFable = (m: string) => m.startsWith('claude-fable') || m.startsWith('claude-mythos')

// One seam for every API call. Fable 5's safety layer can decline a benign
// request (stop_reason "refusal"); the server-side fallback transparently
// re-serves it with Opus 4.8 in the same call — declined-then-rescued requests
// are repriced automatically, so she never sees a dead click.
async function createMsg(
  s: Settings,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>,
): Promise<Anthropic.Message> {
  const model = MODEL(s)
  const c = client(s)
  if (isFable(model)) {
    return (await c.beta.messages.create({
      model,
      ...params,
      betas: ['server-side-fallback-2026-06-01'],
      fallbacks: [{ model: 'claude-opus-4-8' }],
    } as never)) as unknown as Anthropic.Message
  }
  return c.messages.create({ model, ...params })
}

// LinkedIn algorithm knowledge — embedded so every AI surface can give
// platform-aware advice when the piece targets LinkedIn.
const LINKEDIN_PLAYBOOK = `## LinkedIn algorithm & best practices (2024–2026)
**What the algorithm rewards:**
- Dwell time is the #1 signal: long reads that hold attention outperform short hot-takes. Write so people stop scrolling.
- Native text posts (no outbound links in the body) get 2–3× the reach of link posts. Put links in the FIRST COMMENT, never in the body.
- The first 2–3 lines are the hook — they appear above the "…see more" fold. If those lines don't create curiosity or tension, nobody clicks.
- Carousel documents (PDF slides) and image posts get boosted; plain text posts with strong hooks are the next best.
- Early engagement (first 60–90 min) determines viral reach. Posts that get comments (not just likes) in the first hour get pushed to 2nd/3rd degree connections.
- Comments > reactions > reshares in algorithmic weight. Write to provoke thoughtful replies, not just agreement.
- Posting frequency sweet spot: 2–4× per week. Daily posting cannibalizes your own reach.

**What the algorithm penalizes:**
- External links in the post body (LinkedIn wants people to stay on LinkedIn).
- Engagement bait ("like if you agree", "comment YES for…") — explicitly demoted since 2024.
- Excessive hashtags (>5) or irrelevant ones. 3–5 targeted hashtags is optimal.
- Editing a post within the first hour kills its momentum.
- Tagging people who don't engage back (looks spammy to the algorithm).

**Post format that performs best for thought leadership:**
- Hook line (curiosity/tension/bold claim) → story/insight (3–8 short paragraphs, lots of white space, one idea per line) → clear takeaway or question that invites comments.
- Use line breaks liberally — LinkedIn renders as mobile-first; walls of text die.
- 150–300 words for posts; 800–1,200 words for articles (LinkedIn Articles are a separate format with lower reach but SEO value).
- End with a genuine question or a "here's what I'd change" prompt — drives comments.
- Personal stories with professional lessons outperform pure advice.

**Post vs. Article distinction:**
- A "post" is the feed-native format (appears directly in the feed, up to ~3,000 chars). This is where reach lives.
- An "article" is LinkedIn's long-form publishing (separate page, lower feed distribution, but indexed by Google). Use for evergreen/portfolio pieces.
- For building an audience: posts 80%, articles 20%.`

// The persona every call shares: Inkwell's in-house editor who knows HER voice.
function systemPrompt(s: Settings, article?: Article): string {
  const voice = s.voiceProfile.trim()
  const targetsLinkedIn = article ? (article.platforms.includes('linkedin') || article.format === 'post') : true
  // The demo never names the real owner — it ships in a public bundle.
  const owner = DEMO_MODE
    ? 'the writer using it — a thoughtful, first-person essayist writing about design, technology, and craft'
    : 'Anuja Harsha — a Staff-level product designer turned design-engineer who writes sharp, honest, first-person essays about design, AI, and her career'
  return [
    `You are the in-house writing editor AND writing teacher inside Inkwell, a personal writing app owned by ${owner}.`,
    'Your job is to make HER writing better in HER voice — never to flatten it into generic AI prose. Preserve her cadence, her directness, her specifics. Tighten, sharpen, and clarify; do not sanitize or pad.',
    'You are also teaching her to improve. When you suggest a change, make the underlying craft principle legible so she learns it and applies it herself next time — the goal is that she needs you less over time, not more.',
    voice ? `\nHer voice profile (learned from her own writing — honor it):\n${voice}` : '',
    targetsLinkedIn ? `\n${LINKEDIN_PLAYBOOK}\n\nApply this knowledge when drafting, reviewing, or coaching — especially for posts. Suggest LinkedIn-optimal formatting (line breaks, hook above the fold, no outbound links in the body, question ending). When the piece is a "post" format, enforce the post constraints (feed-native, ~150–300 words, mobile-readable spacing). When it's a "full article", it can be longer but still mention where to put the LinkedIn link (first comment).` : '',
    '\nNever invent facts, names, numbers, or events. If a claim needs a real detail she has not provided, leave a clear [bracketed placeholder] rather than fabricating.',
    '\nShe publishes in public, so treat her real personal specifics as private and keep them GENERIC in anything you write or revise: exact salary/compensation/offer amounts and other financial figures (e.g. "$120K" → "a competitive offer" or "[a generic figure]"), her birthdate, home address, and contact details, and exact employer or client company names (→ a generic descriptor like "a large enterprise software company"). Never introduce, amplify, or carry a real specific figure or named company into the draft — even if it appears in the title, hook, or her notes. If genericizing would lose needed meaning, leave a [bracketed placeholder] for her to decide.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function complete(s: Settings, system: string, user: string, maxTokens = 2048): Promise<string> {
  const res = await createMsg(s, {
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
  const formatNote = article.format === 'post'
    ? '\n\nIMPORTANT: This is a LinkedIn POST (feed-native, ~150–300 words, lots of line breaks, mobile-first). Keep it short, punchy, and formatted for the feed — not an article.'
    : ''
  const user = `Title: ${article.title || 'Untitled'}\nAngle: ${article.hook || '—'}${formatNote}\n\n${brief}${strict}\n\n--- DRAFT ---\n${body}`
  const max = action === 'continue' ? 1200 : action === 'expand' ? 3000 : 2600
  return complete(s, systemPrompt(s, article), user, max)
}

// ── Full first draft (from source material, with her writing as voice proof) ─
// Generates a complete first draft for an idea that has no body yet, grounded
// in the article's brief (title + hook + source notes) and PROVEN against her
// actual published writing — two real pieces ride along as voice exemplars so
// the draft sounds like her, not like a model.
export async function draftArticle(
  article: Article,
  exemplars: string[],
  s: Settings,
  ctx?: { voice?: string; story?: string },
): Promise<string> {
  const proof = exemplars
    .filter((t) => t.trim())
    .slice(0, 2)
    .map((t, i) => `--- HER PUBLISHED PIECE ${i + 1} (voice proof — match this register, do not reuse its content) ---\n${t.slice(0, 4500)}`)
    .join('\n\n')

  // Optional grounding for transcript-backed pieces: the real multi-speaker
  // discussion (facts/narrative only) and her verbatim turns (the ONLY voice
  // to emulate — the other speakers must never leak into the draft).
  const storyBlock = ctx?.story
    ? `\n\n--- STORY CONTEXT (the real multi-speaker discussion behind this piece — comprehend it for facts and narrative ONLY; it contains several people's voices; DO NOT emulate anyone's phrasing but hers) ---\n${ctx.story.slice(0, 8000)}`
    : ''
  const voiceBlock = ctx?.voice
    ? `\n\n--- HER OWN VOICE — verbatim from real meetings (match her directness, her first-principles phrasing, her plain-spoken technical confidence; adapt spoken cadence into clean written prose; this is the ONLY voice to emulate) ---\n${ctx.voice.slice(0, 8000)}`
    : ''

  const isPost = article.format === 'post'
  const lengthRule = isPost
    ? '- 150–300 words. This is a LinkedIn POST (feed-native): short paragraphs (1–2 sentences each), generous line breaks, mobile-first. The first 2 lines must hook above the "…see more" fold. End with a question or prompt that invites comments. NO outbound links in the body. NO hashtags in the body (she adds those herself). NO engagement bait.'
    : '- 600–1,100 words of clean markdown (short paragraphs; "##" section headings only where they earn their place).'

  const user = `Write the COMPLETE first draft of the ${isPost ? 'LinkedIn post' : 'article'} briefed below, in her voice.

Title: ${article.title || 'Untitled'}
Editorial angle (the hook): ${article.hook || '—'}
Format: ${isPost ? 'LinkedIn post (feed-native, short)' : 'Full article'}
${article.notes.trim() ? `Source notes (where this idea comes from — stay grounded in it):\n${article.notes.trim()}` : ''}

Rules:
${lengthRule}
- Return ONLY the draft body — no title heading, no preamble, no commentary.
- This is HER first draft, not a finished showpiece: strong shape, real momentum, honest voice. It should feel like she wrote it fast on a good day.
- Ground every claim in the brief and in what her voice-proof pieces establish about her real life and work. Where a specific (a number, a name, a date, an anecdote's detail) is needed but not provided, leave a [bracketed placeholder] — never invent.
- Open the way she opens (no throat-clearing), close the way she closes (a line that lands). Match the rhythm, devices, and register of the voice-proof pieces.
${proof ? `\n${proof}` : ''}${storyBlock}${voiceBlock}`

  return complete(s, systemPrompt(s, article), user, isPost ? 1200 : 4000)
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
  const formatCtx = article.format === 'post'
    ? ' This is a LinkedIn POST — also check: hook above the fold, line break density, length (should be 150–300 words), no outbound links in body, ending with a comment-provoking question.'
    : article.platforms.includes('linkedin')
      ? ' This targets LinkedIn — also flag any outbound links that should move to the first comment, and check that the opening hooks above the fold.'
      : ''
  const user = `Title: ${article.title || 'Untitled'}\nAngle: ${article.hook || '—'}\nFormat: ${article.format === 'post' ? 'LinkedIn post' : 'Full article'}\n\nReview this draft as her editor and surface the highest-impact improvements across clarity, voice, engagement, and correctness.${formatCtx}\n\n${REVIEW_SCHEMA_HINT}\n\n--- DRAFT ---\n${body}`
  const raw = await complete(s, systemPrompt(s, article), user, 2600)
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
  const linkedInNote = (article.format === 'post' || article.platforms.includes('linkedin'))
    ? '\n\nThis piece targets LinkedIn — include one LinkedIn-specific craft tip (hook placement, formatting for mobile feed, comment-driving endings, etc.) if relevant.'
    : ''
  const user = `Read this draft and teach me as my writing coach. Be specific to THIS text — quote from it. Keep it under 220 words, in exactly these three short markdown sections:

**What's working** — one or two genuine strengths (name the craft move).
**One habit to work on** — the single highest-leverage thing (e.g. "you explain too much", "your framing is buried", "sentence length never varies"). Show one before→after from the draft.
**Try this next** — one concrete micro-exercise for her next writing session.${linkedInNote}

--- DRAFT ---
${body}`
  return complete(s, systemPrompt(s, article), user, 1100)
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
  const res = await createMsg(s, {
    max_tokens: 2600,
    system: systemPrompt(s, article),
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
  const res = await createMsg(s, {
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
  const user = `Below are samples of the writer's actual writing. Produce a concise VOICE PROFILE another editor could use to write convincingly in their voice. Cover: tone, sentence rhythm, signature moves, vocabulary, what she avoids, and how she opens and closes. Be specific and quote a few characteristic phrases. 200–300 words, plain prose (not a list of generic adjectives).\n\n${corpus}`
  const system =
    'You are a sharp literary editor who can characterize a writer\'s voice precisely from samples. You never flatter; you describe what is actually on the page.'
  return complete(s, system, user, 1200)
}
