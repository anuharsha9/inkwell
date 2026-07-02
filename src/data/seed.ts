import type { Article, Phase, Status, Tag } from '@/types'
import { countWords } from '@/lib/text'

// ─────────────────────────────────────────────────────────────────────────
// The 50-article plan (PRD §8). Bodies start EMPTY — we seed only the
// metadata the PRD provides. Status is taken verbatim from the tables
// ("status starts as listed"); see note in the PRD reconciliation.
//
// Row tuple: [number, title, hook, tags, status]
// Phase is derived from the number range below.
// ─────────────────────────────────────────────────────────────────────────

type Row = [number, string, string, Tag[], Status]

const ROWS: Row[] = [
  // ── Phase 1 — The Hook (Who I Am Now) ──────────────────────────────────
  [1, "I Always Thought I Wasn't Good Enough — Until WebFOCUS Made Me Someone New", 'The Starbucks story. The $138K offer. The disbelief. The origin everything else radiates from.', ['existing', 'human'], 'ready'],
  [2, 'How I Rebuilt My Portfolio While Navigating a Layoff, Visa Stress, Two Kids, and Pure Chaos', 'Already written. Raw and specific. The stakes are clear.', ['existing', 'human'], 'ready'],
  [3, 'Never Design Blind: How Learning and Empathy Shaped My Approach to ML UX', 'Already written. The technical empathy that makes her unusual.', ['existing', 'technical'], 'ready'],
  [4, 'What It Actually Feels Like to Interview for a Staff Role When You Have Imposter Syndrome', "No company names. The prep spiral, the nerves before the recruiter screen, the voice that says you're not enough. The piece that makes people subscribe.", ['live', 'human'], 'idea'],

  // ── Phase 2 — The Build (Real-Time Process) ────────────────────────────
  [5, "I'm Building Three AI Apps While Job Hunting. Here's Why That's Not Crazy.", 'The meta piece. Introduces the three apps as design problems, not product pitches.', ['live', 'process'], 'idea'],
  [6, 'Why I Treat Claude, Codex, and Gemini Like a Design Team, Not a Tool', 'The multi-agent orchestration mindset. Passing context between agents. The piece engineers will share.', ['live', 'process', 'technical'], 'idea'],
  [7, 'The Voice App That Started With a Bowl of Noodles', "Chef origin as a design problem. What's wrong with cooking apps. Why voice-first. The Cook Model concept without the implementation.", ['live', 'process'], 'idea'],
  [8, "Why I Don't Ask Users Their Skill Level", 'The behavioral onboarding reframe. Self-rated skill is ego-laden and noisy. Observe behavior instead. Original thinking.', ['live', 'technical', 'process'], 'idea'],
  [9, 'Upgrades Easily. Downgrades Slowly. Never Announced.', 'Asymmetric skill inference as a design philosophy, not a spec. One of her most original ideas. Broadly applicable.', ['live', 'technical'], 'idea'],
  [10, "Building on a Visa I Can't Work On Yet: Creating When You Can't Monetize", "The honest piece about building three apps she legally can't monetize. The drive that doesn't wait for permission.", ['live', 'human'], 'idea'],
  [11, 'What a Wealth App Taught Me About How People Lie to Themselves About Money', 'Wealth engine design — the user psychology, not the product. The gap between stated wants and real needs.', ['live', 'process'], 'idea'],
  [12, 'The PRD I Handed to an AI Agent and What Came Back', 'The actual Claude Code workflow. PRD-to-agent handoff, what works, where it breaks, what judgment she still provides.', ['live', 'process', 'technical'], 'idea'],
  [13, 'Designing an Enterprise OS for Colleges: Where Student Experience Meets Institutional Chaos', 'The college OS — the problem space, the student-vs-administrator tension, what "enterprise" means in education.', ['live', 'process'], 'idea'],
  [14, "I Run Three Parallel AI Coding Sessions at Once. Here's What That Actually Looks Like.", 'tmux, worktrees, context management, quota math. Practical and honest, including where it breaks down.', ['live', 'process', 'technical'], 'idea'],
  [15, 'Agentic Observability: Designing for AI Systems That Explain Themselves', 'What it means to design UX for AI pipelines. Where humans need to see in. Transparency as the core design problem.', ['live', 'technical', 'process'], 'idea'],
  [16, 'Three Months In: What Building Three Apps While Job Hunting Has Taught Me', "The mid-point reflection. What's working, what's harder than expected, what she'd do differently.", ['live', 'human', 'process'], 'idea'],

  // ── Phase 3 — The Work (Enterprise Mastery) ────────────────────────────
  [17, 'Making Scheduling Human Again: The ReportCaster Story', 'The richest case study. 20M jobs/week. Customers threatening to leave. Told as a story, not a process diagram.', ['technical', 'process'], 'idea'],
  [18, "I Don't Need a Manual: System Archaeology and 13 Years of Grit", 'Already written. The manifesto on approaching legacy work.', ['existing', 'technical'], 'idea'],
  [19, 'Designing ML for People Who Are Afraid of Math', 'ML Functions — making data science accessible. Plain language, scaffolding, removing jargon. Empathy as a technical skill.', ['technical', 'process'], 'idea'],
  [20, 'The IQ Plugin: What It Took to Unite Three Fragmented Teams Into One Experience', 'NLQ + Insights + ML in one hub. The political fight as much as the design. Product diplomacy.', ['technical', 'process'], 'idea'],
  [21, 'Leading Without a Title: How I Directed Three Subsystems Without Being Anyone’s Manager', 'Influence through clarity. Prototypes bridging PM and Eng. Staff behavior without Staff authority.', ['process', 'human'], 'idea'],
  [22, 'Legacy Products Don’t Break From Code. They Break From Culture.', "Conway's Law in practice. ReportCaster broke because teams didn't talk. Design as org repair.", ['technical', 'process'], 'idea'],
  [23, 'The "Unsexy" Skill That Separates Senior from Staff: Documentation', 'Logic flows, decision logs, spec depth. The single source of truth when memory fails.', ['process', 'technical'], 'idea'],
  [24, 'Earning Engineering Respect: How to Review a Build Without Being a Jerk', 'Quality Syncs during the build, not audits after. Partnership framing. Shared ownership of UX.', ['process'], 'idea'],
  [25, 'Principal Designers Think in Systems, Not Screens', 'The clearest articulation of what Staff-level means in practice. Data flows, global patterns, scale.', ['technical', 'process'], 'idea'],
  [26, 'What Happens When a Hiring Manager Questions Your Scale', 'The scale-pushback experience, anonymized. Reframing 25M users and distributed teams. Arguing for your level without ego.', ['live', 'human'], 'idea'],
  [27, 'The Real Designer Grind: Building Together, Not Alone', 'Already written. Design starts with chaos, not clarity.', ['existing', 'process'], 'idea'],
  [28, 'Framing Is Everything: How I Learned to Sell Problems Before Pixels', 'A UI cleanup reframed as "reducing support ticket costs." The best framed idea wins.', ['process'], 'idea'],

  // ── Phase 4 — The Vision (Where It's All Going) ────────────────────────
  [29, "Designers Will Become AI Directors. Here's What That Actually Means.", 'Not pixel-pushers, not prompt engineers. Directors — setting intent, checking quality, keeping the human in the loop.', ['technical'], 'idea'],
  [30, 'What AI Will Never Replace: Judgment, Taste, and Context', "AI generates 100 variations; it can't tell you which is right. The three things that stay human.", ['technical'], 'idea'],
  [31, 'The New Skillset: Architecture Over Aesthetics', 'Databases, permissions, APIs, states. Less color, more flowcharts. What being a designer means in 2026.', ['technical'], 'idea'],
  [32, "AI Is Not Replacing Designers. It's Replacing Fear.", "AI amplifies what's already there. The differentiator is curiosity, not skill.", ['technical'], 'idea'],
  [33, 'The Designer-Engineer Wall Is Crumbling. Good.', "AI as common language. Faster iterations, less translation error. Don't protect your turf — merge it.", ['technical'], 'idea'],
  [34, 'UX Education Is Failing Designers Right Now', 'Bootcamps teach the wrong things. The new curriculum: prompts, systems architecture, business logic, APIs.', ['technical'], 'idea'],
  [35, 'High-Impact UX Is Political. The Sooner You Accept That, the Better.', "Decisions are made in rooms you aren't in — unless you earn your way in. Design is power.", ['process'], 'idea'],
  [36, 'Why Observability Is the Most Interesting Design Problem in AI Right Now', "Agentic systems need surfaces where humans see in. Transparency isn't a feature — it's the product.", ['technical', 'live'], 'idea'],
  [37, 'Stop Designing for Output. Start Designing for Outcomes.', '50 screens < 1 solved problem. Measure adoption and silence. Factory mindset to impact mindset.', ['process'], 'idea'],
  [38, "Adoption Fails Because UX Doesn't Tell a Story", 'Users buy a better version of themselves. Narrative is the ultimate usability hack.', ['technical', 'process'], 'idea'],
  [39, "Motherhood Didn't Kill My Career. It Sharpened It.", 'Efficiency as survival. Anticipate needs, remove friction, keep it calm. The mental load as a design lens.', ['human'], 'idea'],
  [40, "Tools Don't Make Designers. Thinking Does.", "Figma didn't make you good; Cursor won't either. Tools change every five years. Thinking lasts a career.", ['process'], 'idea'],

  // ── Phase 5 — The Resolution (Full Circle) ─────────────────────────────
  [41, 'Why Most Case Studies Are Terrible — And How to Write One That Gets You Hired', 'Process porn vs. conflict, villain, victory. Make the hiring manager feel the pain you solved.', ['process'], 'idea'],
  [42, 'The Three Types of Designers. Which One Are You?', 'Execution (Hands), Systems (Brain), Vision (Eyes). The arc from Hands to Eyes.', ['process'], 'idea'],
  [43, 'Anger Fueled My Best Work', 'Not zen — genuinely angry at how bad the product was. That anger powered three years of fighting bureaucracy.', ['human'], 'idea'],
  [44, 'When a Director Trusts You More Than You Trust Yourself', 'Sponsorship changes everything. Borrowed belief until you build your own. Then be that for someone else.', ['human'], 'idea'],
  [45, "I Was 15 When I Knew What I'd Do for the Rest of My Life", 'Already written. The personal origin. 15 as knowing, not acne and algebra.', ['existing', 'human'], 'idea'],
  [46, 'Identity Over Job Title: Who Are You When the Email Is Off?', 'The hollow post-layoff feeling. Self-worth outsourced to a company. Build an identity that travels.', ['human'], 'idea'],
  [47, 'WebFOCUS Taught Me I Was Better Than I Thought', 'The retrospective. Walked in scared, walked out a Principal. The worst environment for comfort, best for growth.', ['human'], 'idea'],
  [48, "What the Job Search Actually Did to Me — And What It Didn't", 'Honest account of a long search. What it cost, what it didn’t break. The real ending, whatever it is by then.', ['live', 'human'], 'idea'],
  [49, 'How I Rebuilt My Career With Zero Ego', 'Ego is heavy. Starting over, asking for help, learning in public. The death of who you were.', ['human'], 'idea'],
  [50, 'I Am Good Enough. And So Are You.', 'A letter to the version of her outside Starbucks in disbelief. Closing the loop. Always the last one.', ['human'], 'idea'],
]

// Articles pre-tagged for the Config talk (PRD §5.7).
const CONFIG_TALK_NUMBERS = new Set([5, 6, 7, 8, 9, 12, 14, 15, 29, 31, 33, 48, 50])

function phaseFor(n: number): Phase {
  if (n <= 4) return 'phase-1'
  if (n <= 16) return 'phase-2'
  if (n <= 28) return 'phase-3'
  if (n <= 40) return 'phase-4'
  return 'phase-5'
}

// A fixed timestamp so the seed is deterministic (no Date.now at module load —
// every seed article shares a creation moment; updatedAt diverges as she edits).
const SEED_TS = '2026-06-01T00:00:00.000Z'

export function buildSeedArticles(): Article[] {
  return ROWS.map(([number, title, hook, tags, status]) => ({
    id: `seed-${number}`,
    number,
    title,
    hook,
    body: '',
    phase: phaseFor(number),
    tags,
    status,
    platforms: ['substack', 'linkedin'],
    wordCount: countWords(''),
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
    publishedAt: null,
    pinned: false,
    notes: '',
    coverImageId: null,
    imageIds: [],
    format: 'article',
    configTalk: CONFIG_TALK_NUMBERS.has(number),
    configNote: '',
  }))
}
