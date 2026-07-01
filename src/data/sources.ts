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
    id: 'portfolio',
    kind: 'app',
    name: 'The Portfolio',
    meta: 'anujaharsha.com · live since 2026-06-28',
    blurb:
      'The site is itself the strongest case study: a cinematic Next.js/Three.js experience with a live AI that answers in your voice, a token-driven design system including motion, and a 96-mobile Lighthouse score on a WebGL site.',
    suggestions: [
      {
        title: 'My Portfolio Answers Questions When I\'m Asleep',
        hook: 'Ask Anu: ~39 hand-curated answers plus live Claude responses in my voice, on a static site — the API key held server-side on a Cloudflare Worker so it can be public without being exploitable.',
        tags: ['live', 'technical'],
      },
      {
        title: 'Tokenize the Motion, Not Just the Colors',
        hook: 'Everyone tokenizes color and spacing. The maintainability unlock was tokenizing easing curves and durations too — change one token and the whole site\'s choreography follows, CSS and framer-motion alike.',
        tags: ['live', 'technical', 'process'],
      },
      {
        title: 'A 96 Lighthouse Score on a WebGL Portfolio',
        hook: 'Animated portfolios usually score in the 40s–60s. Compositor-only animation, a lazy-loaded brain experience, and a CSS-driven first paint got a cinematic site to 96 mobile with zero layout shift.',
        tags: ['live', 'technical'],
      },
      {
        title: 'The Medium Is the Résumé',
        hook: 'The portfolio doesn\'t describe the work — it is the work. If the hiring manager only experienced the site itself, they\'d already have their answer.',
        tags: ['live', 'process', 'human'],
      },
    ],
  },
  {
    id: 'wealthengine',
    kind: 'app',
    name: 'WealthEngine',
    meta: 'finance-app · local-first life-decision engine · live demo at wealthengine.anujaharsha.com',
    blurb:
      'A multi-currency household financial OS built on six years of real transactions. It answers "what do I really spend, what\'s my true net worth in USD and INR, and which life path gets me to ₹70 crore?" Now public as a fictional-persona demo.',
    suggestions: [
      {
        title: 'How to Publish a Finance App Without Publishing Your Finances',
        hook: 'Two independent safety guarantees: the real data is physically absent from the deploy, and a demo-mode gate serves a fictional family. Either one failing still leaves you safe. Defense in depth for a life\'s worth of numbers.',
        tags: ['live', 'technical', 'process'],
      },
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
    meta: 'cooking-app · voice-first AI cooking companion · TestFlight build 4, App Store next',
    blurb:
      'A hands-free kitchen companion where voice guides you step by step, recipes import from any source, and a state machine — not the LLM — keeps it safe. Now on TestFlight with on-device "Hey Sous" wake words; shipping free on the App Store.',
    suggestions: [
      {
        title: '"Hey Sous" Without a Server: Wake Words From Apple\'s Own Speech Engine',
        hook: 'No Porcupine, no cloud, no subscription — a state machine over Apple\'s on-device speech recognizer listens for "Hey Sous" and "Sous pause." The constraint (free, private, offline) produced the better design.',
        tags: ['live', 'technical'],
      },
      {
        title: 'Answer Most Questions for Free: The Tier-0 Layer',
        hook: '"How much garlic?" doesn\'t need a language model. On-device code, a USDA nutrition table, and a recommender answer the common tail instantly and free — the LLM is reserved for the questions that earn it.',
        tags: ['live', 'technical', 'process'],
      },
      {
        title: 'I Retired My Timers and Gave Them to Siri',
        hook: 'The hardest feature to cut was the one iOS already does better. Knowing what not to build — and handing it to the platform — is a design decision too.',
        tags: ['live', 'process'],
      },
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
    meta: 'warden · AI agent access & guardrails console · live at warden.anujaharsha.com',
    blurb:
      'A console for governing autonomous AI agents — scoped, least-privilege, auditable identities running every action through a five-gate decision ladder. Built for a Datadog Triple-A panel; the agents govern the real WealthEngine app.',
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
      {
        title: 'An Agent Is Not Its Deployer',
        hook: 'The privilege-escalation disaster hiding in every agentic platform: the agent inherits its owner\'s permissions. Warden\'s answer — its own scoped identity, capped at least-privilege, even when the owner is a superadmin.',
        tags: ['technical', 'live'],
      },
      {
        title: 'What Happens to an AI Agent When Its Owner Leaves the Company?',
        hook: 'My favorite edge case: offboard the owner, and the agent auto-pauses on its next action. No zombie agents acting on a ghost\'s authority.',
        tags: ['technical', 'process'],
      },
    ],
  },
  {
    id: 'college-os',
    kind: 'app',
    name: 'Pathwise',
    meta: 'College OS folder · education-ROI decision engine · live at pathwise.anujaharsha.com',
    blurb:
      'Started as an application tracker; pivoted into an education-ROI and career-projection engine. Takes a real profile — résumé, goals, constraints — and answers which program is worth it, with cited sources and honestly-hedged projections.',
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
      {
        title: 'The LLM Proposes, the Code Verifies',
        hook: 'Every program fact ships with a citation because a deterministic verifier re-fetches the source and confirms the quote is still there before it\'s committed. How to use an LLM for data extraction without inheriting its confidence.',
        tags: ['live', 'technical'],
      },
      {
        title: 'I Renamed My App When I Understood What It Was',
        hook: '"College OS" tracked applications. "Pathwise" answers a decision. The rename wasn\'t branding — it was the moment the product\'s real job came into focus.',
        tags: ['live', 'process'],
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
    id: 'copy-and-tone',
    kind: 'writing',
    name: 'Copy & tone guide',
    meta: 'docs/copy-and-tone.md · the voice rules behind anujaharsha.com',
    blurb:
      'Your written voice, codified: Apple-minimalist and straightforward. Simple — no fluff. Direct — talk like a person, not a brochure. Confident, not boastful — state facts, not feelings. Kill flowery language and filler adjectives; lead with outcomes and specifics; short sentences, fragments fine; whitespace over word count. The same rules that shaped every headline on the portfolio.',
    suggestions: [
      {
        title: 'Delete the Adjective, Keep the Number',
        hook: '"Innovative, cutting-edge, world-class" says nothing. "20M jobs a week, 75% fewer clicks" says everything. The edit that transformed my portfolio was subtraction.',
        tags: ['existing', 'process'],
      },
      {
        title: 'Why My Portfolio Talks Like a Person',
        hook: 'Every designer\'s site says "crafting digital experiences." Mine says "I make the tool nobody can figure out obvious." Writing your own tone guide is a design exercise — the chair test applied to sentences.',
        tags: ['existing', 'human', 'process'],
      },
      {
        title: 'Typography Should Breathe: Whitespace Over Word Count',
        hook: 'The hardest copy rule I follow isn\'t about words — it\'s about the space around them. One idea per line. Fragments are fine. The layout is part of the sentence.',
        tags: ['existing', 'process'],
      },
    ],
  },
  {
    id: 'inkwell-meta',
    kind: 'writing',
    name: 'Inkwell itself',
    meta: 'inkwell · this tool · live demo at inkwell.anujaharsha.com',
    blurb:
      'The tool you\'re reading this in is a design artifact: a writing studio that decouples bursts from publishing, coaches in your own learned voice, and guards your privacy before anything ships.',
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
      {
        title: 'An Editor That Learned My Voice Before It Gave Me Notes',
        hook: 'A "learn my voice" pass distills my own published writing into a profile injected into every AI suggestion — so the coach tightens my sentences instead of replacing them with everyone\'s.',
        tags: ['live', 'technical', 'process'],
      },
      {
        title: 'The Readability Score Is Free: What a Local Intelligence Layer Buys You',
        hook: 'Syllable counting, sentence rhythm, passive-voice detection, my own published baseline — all running on-device with zero API calls. The LLM is saved for the work that actually needs it.',
        tags: ['live', 'technical'],
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
