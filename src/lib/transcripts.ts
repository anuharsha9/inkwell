import { DEMO_MODE } from './env'

// ─────────────────────────────────────────────────────────────────────────
// Confidential meeting transcripts as a writing source. These are real,
// multi-speaker CSG/WebFOCUS transcripts kept ONLY in the gitignored
// `transcripts.local/` folder (never committed, never in the public build).
//
// Two independent safety guarantees, defense-in-depth:
//   1. DEMO_MODE gate — the public/demo build loads NOTHING here.
//   2. The files are gitignored (`*.local`), so they are absent from the
//      Vercel checkout and `import.meta.glob` resolves to `{}` there anyway.
//
// Rule for drafting: comprehend the full multi-speaker doc for the STORY, but
// emulate voice/tone from Anuja's turns ONLY (`_anuja-voice-corpus.md`). Never
// let another speaker's phrasing leak into a draft.
// ─────────────────────────────────────────────────────────────────────────

// Eager, raw-string globs. On Vercel the folder is gitignored/absent, so both
// resolve to `{}`. In her local build they inline the real files at build time.
const RAW_MD = import.meta.glob<string>('../../transcripts.local/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const RAW_JSON = import.meta.glob<string>('../../transcripts.local/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// True only in her real build AND when the confidential files are actually
// present. False in demo/public (either the gate or the empty glob trips it).
export const TRANSCRIPTS_AVAILABLE: boolean = !DEMO_MODE && Object.keys(RAW_MD).length > 0

export interface TranscriptDoc {
  slug: string
  title: string
  speakers: Record<string, number>
  anujaTurns: number
  body: string
}

interface ManifestEntry {
  slug: string
  source_pdf: string
  speakers: Record<string, number>
  total_turns: number
  anuja_turns: number
  anuja_words: number
  kind?: string
}

// `../../transcripts.local/release-operations.md` → `release-operations`
function fileSlug(path: string): string {
  return (path.split('/').pop() ?? '').replace(/\.md$/, '')
}

// A readable title from the slug: hyphens → spaces, title-cased, trailing
// version marker (`-v1`, `-v2`) dropped since it's noise in a headline.
function humanize(slug: string): string {
  return slug
    .replace(/-v\d+$/, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function loadManifest(): ManifestEntry[] {
  const raw = Object.entries(RAW_JSON).find(([p]) => p.endsWith('_manifest.json'))?.[1]
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ManifestEntry[]) : []
  } catch {
    return []
  }
}

// Anuja's turns only — the voice/tone reference. Empty when unavailable.
export function getVoiceCorpus(): string {
  if (!TRANSCRIPTS_AVAILABLE) return ''
  const found = Object.entries(RAW_MD).find(([p]) => fileSlug(p) === '_anuja-voice-corpus')
  return found ? found[1] : ''
}

// The multi-speaker transcripts — meta files (`_`-prefixed) and the polished
// single-author `.reference.md` case studies are excluded. Speaker tallies and
// Anuja's turn count come from `_manifest.json`.
export function getTranscripts(): TranscriptDoc[] {
  if (!TRANSCRIPTS_AVAILABLE) return []
  const bySlug = new Map(loadManifest().map((m) => [m.slug, m]))
  return Object.entries(RAW_MD)
    .map(([path, body]) => ({ slug: fileSlug(path), body }))
    .filter(({ slug }) => !slug.startsWith('_') && !slug.endsWith('.reference'))
    .map(({ slug, body }) => {
      const m = bySlug.get(slug)
      return {
        slug,
        title: humanize(slug),
        speakers: m?.speakers ?? {},
        anujaTurns: m?.anuja_turns ?? 0,
        body,
      }
    })
    // Keep only genuine multi-speaker docs (present in the manifest with speakers).
    .filter((d) => Object.keys(d.speakers).length > 0)
    .sort((a, b) => b.anujaTurns - a.anujaTurns)
}

// The full multi-speaker body for one slug (empty if unavailable/unknown).
export function getTranscript(slug: string): string {
  if (!TRANSCRIPTS_AVAILABLE) return ''
  const found = Object.entries(RAW_MD).find(([p]) => fileSlug(p) === slug)
  return found ? found[1] : ''
}
