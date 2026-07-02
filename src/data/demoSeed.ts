import type { Article, Phase, Status, Tag } from '@/types'
import { countWords, nowISO } from '@/lib/text'

// ─────────────────────────────────────────────────────────────────────────
// DEMO sample data — a fictional writer ("Maya Rivera", a design-engineer who
// writes about craft, AI, and career). Entirely invented; bears no relation to
// the owner's real 50-article plan, which never ships to the public demo.
// Bodies are real (so the local intelligence, privacy, originality, and
// vocabulary features have something to work on without an API key).
// ─────────────────────────────────────────────────────────────────────────

// [number, title, hook, body, phase, tags, status]
type Row = [number, string, string, string, Phase, Tag[], Status]

const ROWS: Row[] = [
  [
    1,
    'The Day I Stopped Apologizing for My Code',
    'For years I prefaced every pull request with "sorry, this is rough." Then I noticed the men on my team never did.',
    `For years I prefaced every pull request with the same three words: sorry, it's rough. I thought I was being humble. I was actually teaching everyone to read my work as second-rate before they'd seen a single line.

The shift was small. I deleted the apology and wrote what the change did, plainly. "Adds retry logic to the upload path; covers the flaky-network case." No hedging, no softening. The reviews got sharper because people engaged with the work instead of reassuring me about it.

Confidence on the page is not arrogance. It is just removing the noise that tells the reader to discount you. The work can still be wrong — but let them find that out from the work, not from your preamble.`,
    'phase-1',
    ['human', 'process'],
    'published',
  ],
  [
    2,
    'Why I Sketch in Pen, Not Pixels',
    'The undo button is a quiet enemy of good ideas. Pen makes you commit, and commitment is where the thinking happens.',
    `The undo button is a quiet enemy of good ideas. In Figma I can erase a wrong line before it finishes forming, which sounds like a feature until you notice you never sit with anything long enough to learn from it.

Pen makes you commit. A bad stroke stays on the page, and the page fills with bad strokes, and somewhere in that mess the real shape shows up. You can't polish your way there. You have to be willing to make ten ugly versions in a row.

I still build in pixels. But I think in ink, because thinking needs friction, and the tools that remove all friction often remove the thought along with it.`,
    'phase-2',
    ['process', 'technical'],
    'ready',
  ],
  [
    3,
    'The Onboarding Question You Should Never Ask',
    "Don't ask users how experienced they are. They'll lie — not on purpose, but because self-rated skill is mostly mood.",
    `Don't ask users how experienced they are. They will lie to you, not out of malice, but because self-rated skill is mostly a measure of confidence on the day you asked.

The better signal is behavior. Watch what they reach for first. Watch where they hesitate. A beginner and an expert move through the same screen differently, and the difference is legible if you bother to look.

So we stopped asking, and we started observing. The product met people where they actually were, not where they claimed to be. Upgrades happened quietly. Nobody had to declare themselves.`,
    'phase-2',
    ['technical', 'process'],
    'ready',
  ],
  [
    4,
    'Designing for the Five-Minute Attention Span',
    'Everyone designs for focus. Almost nobody designs for the interruption — which is the state your user is actually in.',
    `Everyone designs for focus. We imagine a calm user, coffee in hand, giving us their full attention. That user does not exist. The real one is half-watching a toddler and will be gone in ninety seconds.

Designing for the interruption means the screen has to survive being abandoned and returned to. Where was I? should never be a hard question.`,
    'phase-2',
    ['process'],
    'drafting',
  ],
  [
    5,
    'What a Budgeting App Taught Me About Empathy',
    'People do not want to know the truth about their spending. They want to feel okay. Those are different products.',
    `People do not want the truth about their spending. They want to feel okay about it. For a long time I designed for the first thing and wondered why nobody came back.`,
    'phase-3',
    ['process', 'human'],
    'drafting',
  ],
  [
    6,
    'The Case Against the Perfect Portfolio',
    'A flawless case study reads like a press release. The cracks are where people actually believe you.',
    '',
    'phase-4',
    ['process'],
    'idea',
  ],
  [
    7,
    'Meetings Are a Design Problem',
    'We obsess over the UX of our products and tolerate the worst interface in the building: the recurring sync.',
    '',
    'phase-4',
    ['process', 'technical'],
    'idea',
  ],
  [
    8,
    'I Was Wrong About Minimalism',
    'I spent a decade removing things. Then I watched a "cluttered" interface outperform my clean one, and I had to think again.',
    `I spent a decade removing things. Fewer buttons, fewer words, more white space — the whole catechism. Then a "cluttered" competitor outperformed my clean redesign on every metric that mattered, and I had to sit with the possibility that I'd confused taste with usefulness.

Minimalism is a style, not a virtue. Sometimes the extra button is the one the user came for. The discipline isn't removing things; it's knowing which things earn their place.`,
    'phase-5',
    ['process', 'human'],
    'published',
  ],
]

const SEED_TS = '2026-05-01T00:00:00.000Z'

export function buildDemoArticles(): Article[] {
  const ts = nowISO()
  return ROWS.map(([number, title, hook, body, phase, tags, status], i) => ({
    id: `demo-${number}`,
    number,
    title,
    hook,
    body,
    phase,
    tags,
    status,
    platforms: ['substack', 'linkedin'],
    wordCount: countWords(body),
    createdAt: SEED_TS,
    updatedAt: status === 'published' || status === 'ready' ? SEED_TS : ts,
    publishedAt: status === 'published' ? SEED_TS : null,
    pinned: i === 1,
    notes: '',
    coverImageId: null,
    imageIds: [],
    format: 'article',
    configTalk: number === 2 || number === 3,
    configNote: '',
  }))
}
