// ─────────────────────────────────────────────────────────────────────────
// Inkwell data model — see PRD §4.
// These types are the contract the whole app speaks. Keep them clean; Anuja
// will extend this herself, so every enum stays a plain string union (easy to
// widen) and every Article field maps 1:1 to the PRD.
// ─────────────────────────────────────────────────────────────────────────

export type Phase =
  | 'phase-1' // The Hook — Who I Am Now
  | 'phase-2' // The Build — Real-Time Process
  | 'phase-3' // The Work — Enterprise Mastery
  | 'phase-4' // The Vision — Where It's All Going
  | 'phase-5' // The Resolution — Full Circle
  | 'unfiled' // ad-hoc, doesn't belong to the original plan

export type Status =
  | 'idea' // just a title + hook, no body yet
  | 'drafting' // body in progress
  | 'ready' // finished, sitting in inventory, publishable on a whim
  | 'published' // posted, has publishedAt

export type Tag = 'existing' | 'live' | 'process' | 'human' | 'technical'

export type Platform = 'substack' | 'linkedin' | 'medium'

export type ImageSource = 'upload' | 'url' | 'ai' | 'stock'

export interface InkImage {
  id: string
  src: string // data URL (base64) for uploads, or remote URL
  source: ImageSource
  alt: string // accessibility + platform caption; required before "ready"
  attribution: string // e.g. "Photo by X on Unsplash"
  prompt: string | null // if AI-generated, the prompt used (so she can re-roll)
  createdAt: string // ISO
}

export interface Article {
  id: string
  number: number | null // 1-50 for plan articles; null for ad-hoc additions
  title: string
  hook: string // the one-line editorial brief / angle
  body: string // markdown; starts empty, owner fills in
  phase: Phase
  tags: Tag[]
  status: Status
  platforms: Platform[]
  wordCount: number // derived from body, recompute on save
  createdAt: string // ISO
  updatedAt: string // ISO
  publishedAt: string | null // ISO
  pinned: boolean
  notes: string // private scratch notes, not part of the article body
  coverImageId: string | null // → InkImage.id (images stored separately, see PRD §5.5 storage)
  imageIds: string[] // additional inline images used in the body
  configTalk: boolean // does this article feed the Figma Config talk?
  configNote: string // optional: what this piece contributes to the talk
}

// App-level settings (PRD §5.6, §5.7) — single record persisted alongside articles.
export interface Settings {
  substackUrl: string // her publication's new-post URL
  mediumUsername: string
  linkedinUrl: string
  configThesis: string // editable working spine of the Config talk
  configDeadline: string // ISO date — default Nov 2026
  configOutline: string // the autosaved 200–400 word proposal scratch space
  // Image-AI provider — read at runtime, never hardcoded. Empty = "configure" state.
  imageApiEndpoint: string
  imageApiKey: string
  imageApiModel: string
  // The signature accent color (Moleskine-app style — user picks their one color).
  accent: string
  // AI writing assistant (Claude) — key stored locally, never shipped. Empty = degrade.
  aiApiKey: string
  aiModel: string
  // Governance toggles — she controls what the AI is allowed to do.
  aiEnabled: boolean // master switch for all AI writing features
  allowWebSearch: boolean // permit web search for grounded insights / originality
  // Learned voice profile — derived from her own writing, injected into every AI call.
  voiceProfile: string
  voiceProfileUpdatedAt: string // ISO; empty until first learned
}
