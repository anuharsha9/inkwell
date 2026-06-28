import type { Tag } from '@/types'
import { DEMO_MODE } from '@/lib/env'

// ─────────────────────────────────────────────────────────────────────────
// Source Material — article ideas grounded in Anuja's REAL body of work
// (case studies, app PRDs, career facts). Every suggestion points back to
// something that actually happened; none are invented. These are *additional*
// angles beyond the 50-article plan — deeper cuts she can pull from when she
// wants more to write. Her husband's projects (FamilyTree, ChaiCoffee) are
// deliberately excluded.
//
// Adding a suggestion creates an Unfiled idea (number: null) per the PRD's
// rule for ad-hoc additions. The `note` is dropped into the article's private
// notes so the source link survives.
// ─────────────────────────────────────────────────────────────────────────

export type SourceKind = 'casestudy' | 'app' | 'career' | 'writing'

export interface Suggestion {
  title: string
  hook: string
  tags: Tag[]
}

export interface Source {
  id: string
  kind: SourceKind
  name: string
  blurb: string
  meta?: string // where it lives / what it is
  suggestions: Suggestion[]
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  casestudy: 'Case study',
  app: 'App / PRD',
  career: 'Career & life',
  writing: 'Existing writing',
}

export const SOURCES: Source[] = [
  // ── Case studies ─────────────────────────────────────────────────────
  {
    id: 'reportcaster',
    kind: 'casestudy',
    name: 'ReportCaster',
    meta: 'WebFOCUS · scheduling engine · shipped Apr 2024',
    blurb:
      'A 40-year-old scheduling engine with zero documentation, 20M+ jobs/week, and customers threatening to leave. You volunteered in week one and shipped a reframe that renewed a multi-million-dollar account.',
    suggestions: [
      {
        title: 'The Two Designs I Threw Away',
        hook: 'V1 and V2 both failed. The unlock was reframing the question from "where should ReportCaster live?" to "how does the platform want workflows to behave?" — and V3 shipped without a rewrite.',
        tags: ['technical', 'process'],
      },
      {
        title: 'Natural Language Was the Whole Unlock',
        hook: '"Runs Monday–Friday at 6 PM, weekly." The moment a 40-year-old engine started speaking like a person was the moment it became usable.',
        tags: ['technical', 'process'],
      },
      {
        title: 'How I Documented a System Nobody Remembered',
        hook: 'No docs, no spec, original authors mostly gone. I built a knowledge network — the support lead, the one remaining engineer — and reverse-engineered the truth into mind maps.',
        tags: ['technical', 'process'],
      },
    ],
  },
  {
    id: 'ml-functions',
    kind: 'casestudy',
    name: 'ML Functions',
    meta: 'WebFOCUS · ML UX · "best screen in the revamp"',
    blurb:
      'Designing machine-learning UX with zero ML background. You self-funded a $3,000 MIT AI/ML certificate, embedded with a Principal Data Scientist for six months, and built a dual-mode flow 5/5 SMEs finished unassisted.',
    suggestions: [
      {
        title: 'I Paid $3,000 to Earn the Vocabulary',
        hook: 'You can\'t design for data scientists in a language you don\'t speak. The MIT cert wasn\'t a credential — it was the price of being taken seriously in the room.',
        tags: ['human', 'technical'],
      },
      {
        title: 'The Confusion Matrix That Took Ten Tries',
        hook: 'I pushed for clarity, the Principal Data Scientist pushed for depth, and the tension is exactly what produced the screen he later called the best in the entire revamp.',
        tags: ['technical', 'process'],
      },
      {
        title: 'Design Two Doors: Guided for the Scared, Advanced for the Expert',
        hook: 'A four-step guided flow for newcomers, a power mode for experts, one screen. Empathy and depth don\'t have to fight if you give them separate entrances.',
        tags: ['technical', 'process'],
      },
    ],
  },
  {
    id: 'iq-plugin',
    kind: 'casestudy',
    name: 'IQ Plugin / DSML Hub',
    meta: 'WebFOCUS · product diplomacy · VP-approved',
    blurb:
      'Three powerful features — NLQ, Insights, Predict — buried and unused. You co-created a unified hub, won VP approval, and defended big-tile navigation against the 20-year lead architect.',
    suggestions: [
      {
        title: 'The Meeting Where I Realized I Was Driving',
        hook: 'Two years in, in a room of decade-long veterans arguing data-flow placement — and the person leading the conversation was me. The moment the imposter story stopped matching the evidence.',
        tags: ['human'],
      },
      {
        title: 'I Argued With the Lead Architect About Big Tiles — and Won',
        hook: 'Twenty years of authority on one side, industry examples and working prototypes on the other. How you defend a design decision without rank.',
        tags: ['process', 'technical'],
      },
      {
        title: 'Three Invisible Features, One Hub',
        hook: 'High capability, near-zero adoption, because nobody could find them. Uniting NLQ + Insights + Predict was product diplomacy as much as it was design.',
        tags: ['technical', 'process'],
      },
    ],
  },

  // ── Apps ─────────────────────────────────────────────────────────────
  {
    id: 'wealthengine',
    kind: 'app',
    name: 'WealthEngine',
    meta: 'finance-app · local-first life-decision engine',
    blurb:
      'A multi-currency household financial OS built on six years of real transactions. It answers "what do I really spend, what\'s my true net worth in USD and INR, and which life path gets me to ₹70 crore?"',
    suggestions: [
      {
        title: 'Median, Not Mean: How One $9K Withdrawal Lied About My Runway',
        hook: 'A single cash withdrawal or car repair distorts every projection if you average it. Why the median is the only honest number in a personal-finance tool.',
        tags: ['live', 'process'],
      },
      {
        title: 'Rules Are Data: Encoding a Cross-Border Family Into a Ledger',
        hook: 'The currency swap with my sister, the India flat paid off over two years, a visa-sponsor reimbursement — every classification rule is a real life decision wearing a config flag.',
        tags: ['live', 'process'],
      },
      {
        title: "You Can't Compound Rupees Like Dollars",
        hook: 'Native-currency growth, then FX depreciation to reconcile. The ₹70-crore goal quietly breaks the moment you treat the two currencies as one.',
        tags: ['live', 'technical'],
      },
    ],
  },
  {
    id: 'sous',
    kind: 'app',
    name: 'Sous',
    meta: 'cooking-app · voice-first AI cooking companion',
    blurb:
      'A hands-free kitchen companion where voice guides you step by step, recipes import from any source, and a state machine — not the LLM — keeps it safe.',
    suggestions: [
      {
        title: 'Constrain the AI Before You Let It Cook',
        hook: 'A hard-coded state machine (idle → importing → ready → cooking → done), not the language model, is what keeps a voice cooking app from hallucinating mid-recipe.',
        tags: ['live', 'technical', 'process'],
      },
      {
        title: 'Make Every Recipe Source Speak the Same Language',
        hook: 'YouTube transcripts, website JSON-LD, pasted text — all forced into one canonical schema. The unglamorous normalization work that makes the magic possible.',
        tags: ['live', 'technical'],
      },
      {
        title: 'A Sous-Chef, Not an Appliance: Pacing as Design',
        hook: 'Silence detection and gentle check-ins instead of robotic timers. The difference between a tool that nags and a partner that waits.',
        tags: ['live', 'process'],
      },
    ],
  },
  {
    id: 'warden',
    kind: 'app',
    name: 'Warden',
    meta: 'warden · AI agent access & guardrails console',
    blurb:
      'A console for governing autonomous AI agents — scoped, least-privilege, auditable identities running every action through a five-gate decision ladder.',
    suggestions: [
      {
        title: 'Triple-A for AI Agents',
        hook: 'Authentication, authorization, administration — the same discipline we give human users, applied to autonomous agents as first-class identities instead of features.',
        tags: ['technical'],
      },
      {
        title: 'Least Privilege Is a Design Surface',
        hook: 'A default-deny grid and an autonomy dial: what an agent may do solo, what needs approval, what\'s simply blocked. Permissions you can see and reason about.',
        tags: ['technical', 'process'],
      },
      {
        title: 'Audit Is the Product',
        hook: 'Every agent action carries a one-line authority and an expandable gate-by-gate trace of exactly why it was allowed or refused. Transparency isn\'t a feature here — it\'s the whole point.',
        tags: ['technical'],
      },
    ],
  },
  {
    id: 'college-os',
    kind: 'app',
    name: 'College OS',
    meta: 'College OS · application decision engine',
    blurb:
      'A dashboard that turns application chaos into a calibrated decision engine — tracking programs, deadlines, and fit, learning from real outcomes.',
    suggestions: [
      {
        title: 'The Chair Test for a Data-Heavy Dashboard',
        hook: 'Every element must telegraph its function and state on sight. What that discipline does to a screen drowning in deadlines and requirements.',
        tags: ['process'],
      },
      {
        title: 'Heuristic First, Then Calibrate: Fit Scores You Can Trust',
        hook: 'Telling someone "92% match" is easy; making it honest is hard. How to build a fit signal that earns confidence instead of faking it.',
        tags: ['technical', 'process'],
      },
    ],
  },
  {
    id: 'job-apply',
    kind: 'app',
    name: 'Profile Pack / job-apply',
    meta: 'job-apply · agent-filled applications',
    blurb:
      'A structured profile pack that lets an AI agent fill job applications hands-free — with honesty guardrails and a hard stop before submit.',
    suggestions: [
      {
        title: 'Profile as Data, Not Narrative',
        hook: 'Thirteen years structured into JSON an agent can actually use — work history, metrics, STAR stories — plus the guardrails that stop it inventing credentials.',
        tags: ['live', 'technical', 'process'],
      },
      {
        title: 'Let the Agent Fill It — Never Let It Submit',
        hook: 'The one action that stays human. Designing automation that does the tedious 95% and hands the consequential click back to you.',
        tags: ['live', 'process'],
      },
    ],
  },

  // ── Career & life ────────────────────────────────────────────────────
  {
    id: 'career',
    kind: 'career',
    name: 'The throughline',
    meta: '13 years · 4 employers · Staff-level',
    blurb:
      'The career facts underneath everything: the system-archaeologist who walks into undocumented legacy and leaves it human, building across a cross-border life.',
    suggestions: [
      {
        title: 'Building Six Apps on a Visa That Won\'t Let Me Earn',
        hook: 'The honest piece about creating production work I legally can\'t monetize yet. The drive doesn\'t wait for permission.',
        tags: ['live', 'human'],
      },
      {
        title: 'What Leaving Taught Me That Staying Couldn\'t',
        hook: 'At WebFOCUS I always felt I wasn\'t enough. I only saw what I\'d actually built after I walked out the door.',
        tags: ['human'],
      },
      {
        title: 'The Designer Who Reads the Manual That Doesn\'t Exist',
        hook: 'System archaeology as a craft: walking into thirteen years of undocumented decisions and reconstructing intent from the rubble.',
        tags: ['technical', 'process'],
      },
    ],
  },

  // ── Existing writing (meta) ──────────────────────────────────────────
  {
    id: 'inkwell-meta',
    kind: 'writing',
    name: 'Inkwell itself',
    meta: 'inkwell · this tool',
    blurb:
      'The tool you\'re reading this in is a design artifact: a writing app that decouples bursts from publishing, built for exactly how you work.',
    suggestions: [
      {
        title: 'Writing as a Burst, Publishing as a Whim',
        hook: 'Standard publishing tools assume a steady cadence and quietly kill the bursts. I built the inverse — write ahead into inventory, publish on impulse, zero pressure in the moment.',
        tags: ['live', 'process'],
      },
      {
        title: 'I Built the CMS That Fits How I Actually Write',
        hook: 'Local-first, a 50-article spine that bends, copy-paste publishing because the platforms killed their APIs. A tool shaped to one writer instead of a million.',
        tags: ['live', 'process', 'technical'],
      },
    ],
  },
]

// Fictional sources for the public demo — keeps her real case studies out of it.
export const DEMO_SOURCES: Source[] = [
  {
    id: 'demo-craft',
    kind: 'career',
    name: "Maya's craft notes",
    meta: 'sample source',
    blurb: 'A working designer’s notebook of half-formed observations about taste, tools, and the gap between them.',
    suggestions: [
      {
        title: 'The Tyranny of the Empty State',
        hook: 'We spend weeks on the populated screen and ten minutes on the one every new user sees first.',
        tags: ['process'],
      },
      {
        title: 'Why Good Designers Make Bad Demos',
        hook: 'The skills that make the work great are the opposite of the ones that make it land in a room.',
        tags: ['process', 'human'],
      },
    ],
  },
  {
    id: 'demo-build',
    kind: 'app',
    name: 'A weekend side project',
    meta: 'sample source',
    blurb: 'A tiny app built in a weekend that taught more than a quarter of meetings ever did.',
    suggestions: [
      {
        title: 'Shipping Something Small Every Week',
        hook: 'The portfolio that got me hired wasn’t three big case studies. It was fifty tiny finished things.',
        tags: ['live', 'process'],
      },
    ],
  },
]

export const activeSources = (): Source[] => (DEMO_MODE ? DEMO_SOURCES : SOURCES)
