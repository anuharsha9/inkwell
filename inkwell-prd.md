# PRD: Inkwell — A Personal Writing Studio

**Owner:** Anuja Harsha
**Version:** 2.0 — full scope
**Last updated:** June 2026
**Intended builder:** Claude Code (agentic build)
**Tagline:** *Archive · Publishing Queue · AI Writing Coach · Craft Teacher*

---

## 0. How to read this document

Inkwell began (v1.0) as a personal **article archive & publishing queue** — a place to write ahead into inventory during bursts and publish on a whim. In use, the owner realized the deeper job: she doesn't only want to *store* finished writing, she wants to *get better at writing* — to have a tool, laced with her own context, that helps, suggests, teaches, and improves her, the more she writes.

So v2.0 is a **personal writing studio**: the original archive/queue/Config-Track spine, plus an **AI-native Writing Coach** (rewrites, editorial review, craft lessons, web-sourced insights, vocabulary building) and a **privacy/fact-check guard** so nothing confidential ever ships.

This document is the source of truth for the whole product. Sections marked **[BUILT]** are shipped; **[NEXT]** are designed and committed but not yet built; **[FUTURE]** are documented only — architect to allow, build none yet.

The 50 seed articles in **Section 12** load on first run so the app ships populated. Do not invent article bodies — seed only the metadata (title, hook, phase, tags, status); bodies start empty.

---

## 1. The problem

The owner is a prolific writer with a procrastinator's rhythm: long fallow stretches punctuated by intense bursts where she can draft several articles in a sitting. Standard publishing tools assume a steady cadence and create pressure that kills the bursts.

She needs the opposite on two axes:

1. **Decoupled write/publish.** A place to write ahead into an archive during high-energy bursts, store finished pieces as inventory, and publish from that inventory on a whim with zero in-the-moment pressure.
2. **A writing partner that makes her better.** Not just storage — an editor and teacher that knows *her* voice and *her* body of work, tightens and sharpens her drafts, teaches the craft principle behind every fix, grows her vocabulary, and improves her through practice. The more she writes, the better she should get.

She also has a fixed editorial plan — a 50-article roadmap across five phases — but her life generates new material constantly (visa stress, a possible move to Hyderabad, building AI apps, interviews, parenting), so the system must let her add new articles freely without breaking the plan structure.

And because she publishes in public, the tool must **protect her**: never let confidential or identifying details (birthdate, home address, exact salary/finances, exact employer names, contact details) slip into a published piece.

## 2. The user (n=1, but build it well)

One user. No auth, no accounts, no multi-user. A personal tool that lives in her browser; local persistence is sufficient. She is a Staff-level design-engineer who writes sharp, honest, first-person essays about design, AI, and her career — and who will extend this app herself over time. So **code clarity and clean architecture matter more than feature completeness** — leave good seams. She wants to **understand** how it works (teach-as-you-build), and she wants to **improve as a writer**, treating each writing session as practice.

## 3. Goals & non-goals

### Goals
- Capture articles fast during bursts, near-zero friction; never lose written work.
- Store a full inventory with clear status (idea → drafting → ready → published).
- Make "what can I publish right now?" answerable in one glance.
- Preserve the 50-article plan (phases, sequence) while allowing free additions.
- Copy a finished article out to paste into Substack/LinkedIn/Medium in one action.
- **Be an AI writing partner in her voice** — rewrite, review, teach, and source real craft guidance, grounded in her actual drafts and body of work.
- **Grow her as a writer over time** — lessons per draft now; longitudinal craft tracking next.
- **Build her vocabulary** with real dictionary data and a personal word bank.
- **Guard her privacy** — flag confidential/identifying details before publishing.
- Survive refresh and return visits (persistent local storage).

### Non-goals
- No direct API publishing to Substack/LinkedIn/Medium (copy-out only — see §9).
- No rich-text WYSIWYG (plain-markdown editor; she writes markdown or pastes).
- No cloud sync, no backend, no auth, no multi-user.
- No analytics product; no scheduling automation.
- The AI never fabricates facts, figures, employers, or sources; the dictionary is real; insights are grounded in real material.

## 4. Core concepts & data model

### Entity: `Article`
```
Article {
  id, number|null, title, hook, body (markdown), phase, tags[], status,
  platforms[], wordCount, createdAt, updatedAt, publishedAt|null,
  pinned, notes, coverImageId|null, imageIds[], configTalk, configNote
}
```
Enums: `Phase` (phase-1…5, unfiled) · `Status` (idea, drafting, ready, published) · `Tag` (existing, live, process, human, technical) · `Platform` (substack, linkedin, medium).

### Entity: `InkImage`
`{ id, src (data URL or remote), source (upload|url|ai|stock), alt, attribution, prompt|null, createdAt }` — stored under its own key, referenced by id (see §6).

### Entity: `SavedWord` (vocabulary) **[BUILT]**
`{ word, definition, partOfSpeech, savedAt, due, interval, ease, reps, lapses }` — her personal word bank with **spaced-repetition** state (SM-2-lite; see §5.9 Vocabulary). Persisted; older words are migrated with safe defaults.

### Entity: `Version` (per-article history) **[BUILT]**
`{ id (`articleId:ts`), articleId, ts, body, reason }` — a restorable snapshot of an article body. Written before every Coach apply and on a throttled autosave; the last ~25 per article are kept (see §5.15).

### Entity: `Settings` (single record)
```
Settings {
  // publishing
  substackUrl, mediumUsername, linkedinUrl,
  // Config talk
  configThesis, configDeadline, configOutline,
  // image AI provider (runtime; never hardcoded)
  imageApiEndpoint, imageApiKey, imageApiModel,
  // signature accent (Moleskine-app style)
  accent,
  // AI writing partner (Claude) — key stored locally, never shipped
  aiApiKey, aiModel,            // default model: claude-opus-4-8
  aiEnabled, allowWebSearch,    // governance toggles (master switch; web-search permission)
  voiceProfile, voiceProfileUpdatedAt,
  craftInsight, craftInsightAt, // persisted narrative "read" shown on Writing Craft (§11)
  privacyTerms[]                // her own sensitive strings (employers/products/people) flagged locally (§5.11)
}
```

### Transient: `PrivacyFinding` **[BUILT]**
Not persisted — produced on demand by the privacy guard: `{ category (finance|date|address|contact|company|identity), text, suggestion, note, source (local|ai) }`.

### Derived
- `wordCount` recomputed from body on save.
- Inventory counts per status; "X of 50 plan complete" (ready or published).
- "Ready to publish" = `status === ready`, pinned first then most-recently-updated.

---

## 5. Scope — the surfaces

### 5.1 Home — the dashboard / command center **[BUILT]**
The default landing surface answers "where am I and what now?" It holds: the always-visible **inventory strip** (total; Ideas · Drafting · Ready · Published; "X of 50 plan complete"; the emphasized hero **"N ready to publish right now"** — the dopamine number); the **Ready to publish** queue front-and-centre (copy-out · Publish-to deep links · mark-published inline); a **Writing insight** card (an AI teaching moment drawn from her recent pages); and **Write next** (suggested articles from her real Source Material, one-click Add). The standalone Publish Queue from v1 is folded into Home.

### 5.2 View A — The Archive (pure inventory) **[BUILT]**
The complete list of **all** articles, every status, and nothing else — no dashboard, no extras. Grouped by **Phase** by default (I→V then Unfiled, in plan-number order), with toggles to **Status** and **Recent**. Each card: number badge, title, hook (truncated), status pill, tags, word count, platform dots, pinned indicator, cover thumbnail, Config-talk flag. Multi-select filters (status/phase/tag/platform) + full-text search across title+hook+body. Click → editor. **Inline status change** via the pill (no editor needed). **+ New Article** instantly creates an Unfiled idea and opens it (works on mobile).

### 5.3 View B — The Editor **[BUILT]**
Calm, focused writing surface. Large title field, italic hook field, generous plain-markdown body. Live word count + reading time. **Write / Preview / Split** markdown rendering. **Autosave** (debounced ~500ms) with a quiet "Saved" indicator — no manual save, no lose-your-work path. Metadata rail: phase, status chips, tags, platforms, pin, Config toggle + note, image panel, private notes (collapses to a drawer on smaller screens). **Copy article** (full, clean markdown) + **Copy body only**; **Publish to…** deep links; **Mark as published**; delete (confirm). Plus two AI-native affordances in the top bar: the **privacy shield** (§5.11) and the **Coach** button (§5.9).

### 5.4 Publish Queue **[BUILT]** *(now part of Home)*
"What can I post right now": ready-only, pinned first then recent. Each row: cover thumb, number, title, hook, tags, platforms, word count, and inline **Copy article / Publish to… / Mark published**. Lives on the Home dashboard (§5.1) as the centrepiece, with an encouraging empty state in the interface's own voice.

### 5.5 Images — the chore, made painless **[BUILT]**
Every article has one cover + optional inline images. Three ways to add: **upload/paste/drag** (downscaled to ≤2000px, stored as data URL), **paste URL** (+ attribution), **AI-generate** (behind a configurable image-provider adapter; degrades to a "configure API key" state; upload/URL always work). "Suggest a prompt from this article" derives from title+hook. Cover shows as a thumbnail in archive + queue. **Alt text is required before `ready`** but never blocks her — it's backfilled from the title. For copy-out, each image is individually **Copy/Save**-able next to the text; URL-sourced images inline as real URLs; the Markdown export writes local images to disk and rewrites references.

### 5.6 Publishing flow & platform reality **[BUILT]**
None of Substack/LinkedIn/Medium support API publishing from a personal app. So Inkwell optimizes the fastest flow that works: **Copy → Open composer → Paste → Post.** "Copy article" is the primary action; "Publish to…" deep-links open each composer in a new tab (Substack URL configurable in Settings). "Mark as published" stamps the date. The constraint is presented as the intended design, not an error.

### 5.7 The Config Track — a talk that assembles itself **[BUILT]**
Gathers every article with `configTalk === true` in plan order (title, contribution note, status, word count). Editable thesis + target deadline (default Nov 2026) with a calm months/weeks countdown, and an autosaved **outline scratch space** with a 200–400-word target helper that turns a gentle color in range. Pre-seeded Config articles: #5, 6, 7, 8, 9, 12, 14, 15, 29, 31, 33, 48, 50.

### 5.8 Source Material **[BUILT]** *(lives in Settings)*
Article ideas drawn from her **real** work — case studies (ReportCaster, ML Functions, IQ Plugin), app PRDs (WealthEngine, Sous, Warden, College OS, job-apply, Inkwell), and career/life stories — each with concrete, grounded angles. One-click **Add** drops a suggestion into the Archive as an Unfiled idea (with the source saved to its notes); **Write** adds and opens it. Anything already in the archive shows "In archive" (no duplicates). Her husband's projects are excluded. Reachable from **Settings → Source material**.

### 5.9 The Writing Coach (AI-native) **[BUILT]**
A drawer in the editor (opened from the **Coach** button), with four tabs. Everything runs in **her voice** (see §5.10) and grounds suggestions in her actual draft. The Coach is powered by a single AI adapter (`lib/ai.ts`) calling **Claude** (default **`claude-opus-4-8`**) directly from the browser, with the key stored only in local settings. If unconfigured, the AI tabs degrade to a clear "add your key" state; the Vocabulary and Privacy tabs work without a key.

**Improve** — Grammarly-style. Quick actions: *Improve · Tighten · Expand · Sharpen hook · Lift diction · Continue.* Each returns a proposed rewrite she can **Apply** (replace), **Append** (continue), or **Replace opening** (hook). Plus **Review draft** → suggestion cards grouped **Clarity / Voice / Engagement / Correctness**, each with an inline before→after she can apply in one click. Every suggestion carries the *why* (the craft principle) so she learns it.

**Teach** — the practice layer.
- **Give me a lesson** — reads *this* draft and returns *what's working · one habit to work on (e.g. "you explain too much," "your framing is buried," "vary your sentence length") · a micro-exercise for next time.*
- **Insights from the web** — uses Claude's **web-search** tool to pull *real, cited* writing-craft guidance and apply it to her actual text. Grounded, never invented (honors §10 real-data rule).

**Vocabulary** — real growth, with practice. Wired to the free **Dictionary API** (dictionaryapi.dev — no key): look up any word (phonetics, definitions, examples, clickable synonyms), **save to a personal word bank** (persisted), and browse it. **Spaced-repetition review [BUILT]:** saved words become flashcards — a "N words due" prompt starts a session (recall → reveal → grade *Again / Good / Easy*), and an SM-2-lite scheduler (`lib/srs.ts`) sets the next due date so words you struggle with come back sooner and ones that stick space out. The Improve tab's "Lift diction" upgrades weak/overused words in drafts. Goal: grow her range through use *and* deliberate recall.

**Checks** — pre-publish guard (§5.11): privacy/fact-check + originality.

**Safety:** every Coach action that rewrites the draft (Improve apply, Review suggestion, privacy fix) first writes a **version snapshot** and shows a one-click **Undo** toast (see §5.15).

All AI features are gated by governance toggles (§5.11/§8): a master AI switch and an allow-web-search switch.

### 5.10 Voice profile **[BUILT]**
A **Learn my voice** pass (Settings) analyzes her own article bodies into a concise voice profile (tone, rhythm, signature moves, what she avoids), stored and **injected into every AI call** so suggestions sound like *her*, never generic AI. She re-runs it as she writes more; it sharpens over time. The profile is editable.

### 5.11 Privacy / fact-check guard **[BUILT]**
Because she publishes in public, Inkwell scans drafts for confidential or identifying details before they ship. Her rule: **keep numbers generic and companies generic; never expose birthdate, home address, exact salary/finances, or contact details.**
- A **shield indicator** in the editor top bar runs a local scan continuously: green "Private-safe" when clean, amber with a count when it finds something; click to open the Privacy tab.
- **Local scan** (regex + her own term list, always on, no key): money/salary figures (currency symbols, Indian lakh/crore, and **money written in words** like "six figures") — but *not* bare counts like "20 million weekly jobs"; birthdates and day-level dates; street addresses; emails; phone numbers; and **named companies** — both via a **corporate-suffix heuristic** ("Acme Technologies/Inc/LLC") and her own **private-terms list** (`settings.privacyTerms` — real employers/products/people she names in Settings; e.g. TIBCO, WebFOCUS, ReportCaster). Each gets a generic suggested replacement (`$138K → [a generic figure]`, `4400 … Road → [my city]`, employer → `[a company]`, email/phone → `[redacted]`).
- **Deep scan with AI** (when configured): catches what regex can't — figures written obliquely, doxxable specifics, employer names not on her list.
- Each finding shows category, the exact flagged text, a plain reason, and **Apply → replacement** / **Keep it**. Nothing is changed without her click; she always decides.

**Originality / plagiarism** (same "Checks" surface): a **local self-overlap** check (no key) flags passages she's reused near-verbatim across her *other* articles — each match shows the passage and which piece it's also in — plus **paraphrase-tolerant echoes** (4-word-shingle containment) that surface lightly-reworded repetition the verbatim pass misses, with a similarity %. A **Check the web** pass (Claude + web search, when allowed) flags distinctive sentences or claims that closely match existing published material and unverifiable facts, with citations — honest, never fabricated. *(Deep semantic paraphrase — reworded ideas, not shared phrasing — needs on-device embeddings; see §12.)*

### 5.12 Settings **[BUILT]**
One page: **Appearance** (signature accent picker — a Moleskine-app signature — + day/night theme), **AI writing partner** (Anthropic key + model + Learn-my-voice + editable voice profile), **Source material** (link to §5.8), **Publishing destinations** (Substack/LinkedIn/Medium URLs), **Image generation** (image-AI provider config), **Backup & portability** (export/import). Every credential is local-only and never shipped.

### 5.13 Local intelligence layer **[BUILT]**
Real client-side analysis that runs with **no API calls**, hardened to genuine accuracy:
- **Readability** (Flesch ease + grade) on a real English **syllable counter** (silent-e, consonant+le, silent -ed/-es + exceptions) and a **proper sentence segmenter** that respects abbreviations ("Mr.", "U.S."), decimals ("9.3"), and markdown lists (so bullet lines don't fuse into one run-on).
- **Lexical diversity** via **MATTR** (moving-average type-token ratio) — length-robust, unlike raw unique/total.
- **Sentence rhythm** (length variance), **filler** density, and — for the **active draft** — **POS-backed** style metrics via `compromise` (`lib/pos.ts`): real adverbs (not every -ly word), real **passive voice** (POS + a predicate-adjective stoplist, so "was excited" isn't flagged), plus **weak verbs** and **nominalizations**. Whole-corpus aggregates keep the fast heuristics for speed; the per-draft panel uses POS. Degrades to heuristics if the POS pass fails.
- **Publish-readiness score** — scored against her **own published baseline** (percentiles of her published pieces: "readable for you", "rhythm in your range", "typical length for you") once she has ≥3 published, with the hard gates (title/hook/substance/cover-alt) always on; falls back to fixed thresholds before then.

This is the **default** insight surface (the Coach's Teach tab leads with it; Home and Writing Craft show live corpus stats), so the everyday work is free, instant, private, and offline. The live AI (Claude) is reserved for genuinely generative tasks. This also makes the public demo interactive without a key.

### 5.15 Version history & undo **[BUILT]**
No edit is ever final. Every Coach action that changes the draft, plus a throttled autosave during editing, writes a **`Version`** snapshot (§4). The editor's **History** panel (clock/restore icon in the top bar) lists snapshots — reason + relative time + preview + word count — and **Restore** brings one back (saving the current text first, so restoring is itself undoable). Destructive applies also surface a one-click **Undo** toast. Snapshots live in their own IndexedDB store, capped at ~25 per article, and are deleted with the article. (§6)

### 5.14 Demo mode **[BUILT]**
A build-time flag (`VITE_DEMO_MODE`) seeds a **fictional sample dataset** ("Maya Rivera", eight invented articles with real bodies) and fictional source suggestions into a **separate IndexedDB** (`inkwell-demo`) — her real 50-article plan and writing **never** ship to the public demo. A "Demo" badge marks the build. The no-key features (local intelligence, vocabulary, privacy, originality) work live, so an audience can explore the app and build a case study from it. The Vercel deploy uses `npm run build:demo`; her personal local app uses the real seed. Repo: `github.com/anuharsha9/inkwell` (private).

---

## 6. Persistence

- IndexedDB, database `inkwell` (**v2**), object stores: **`articles`** (light records, keyed by id) · **`images`** (one entry per image, so heavy base64 never bloats list load) · **`meta`** (settings, vocabulary, the `seeded` flag) · **`versions`** (per-article history, indexed by articleId; §5.15) · **`embeddings`** (cached semantic vectors, reserved for §12).
- **All written work persists across sessions and refreshes. There is no lose-your-work path.** Autosave everywhere; structural ops write immediately.
- Local-only credentials: the Anthropic key, image-AI key, and all settings live in `meta` on her device and are **never** transmitted anywhere except, at her request, directly to the provider's API.
- **Export**: JSON backup (images embedded) + a zip of per-article `.md` files with their images (referenced by relative path). **Import**: from JSON, with an overwrite warning.
- **Local file mirror [BUILT].** During local dev (her personal use), every article with a body is mirrored automatically to a real markdown file in the project folder (`inkwell/articles/NN-slug.md`, with frontmatter) via a dev-server plugin — created/updated on save, removed when emptied or deleted. Her writing thus lives as permanent local files, never lost. The folder is gitignored (stays on her machine) and the mirror is a no-op in the static/Vercel demo build (no server).
- **Two-way sync [BUILT].** The mirror also reads back: the dev plugin exposes `GET /__inkwell/list` + `/read`, and **Settings → Local files → "Scan disk for changes"** compares `articles/*.md` to the in-app articles (matching by the saved filename map, parsing frontmatter via `parseArticleMarkdown`) and lets her **pull** any externally-edited file back in — snapshotting the current body first (§5.15), never a silent overwrite. So she can edit in any editor and the app stays in sync. No-op in the demo (no endpoints).

## 7. Design direction

Reference: the **Moleskine iOS app family** (Timepage, Actions, Flow, Journal) — *not* a skeuomorphic leather notebook. Warm paper-neutral canvas; white floating cards; **one confident, user-chosen signature accent** (themeable — a Moleskine-app signature); dot motifs; big focal numbers; generous whitespace; soft rounded geometry; smooth quiet-magic transitions; rich warm dark mode (she writes at night). Typography-forward: **Inter** (UI chrome) · **Fraunces** (editorial titles, dashboard numbers) · **Newsreader** (reading body/hook) · **IBM Plex Mono** (counts/metadata). Custom thin line icons, **no emoji ever**. Status legible by muted, considered color. Responsive to mobile (the +New → idea path must work on a phone). Respect reduced-motion; visible keyboard focus.

## 8. AI trust, transparency, governance & security

Inkwell is local-first and honest about what the AI does; she controls all of it. A **Trust, transparency & governance** section in Settings makes this explicit and operable.

- **Transparency — disclosed data flows.** Plain-language statement of every external call and exactly what's sent: *coaching/reviews* send the draft text to Anthropic (Claude) to generate a suggestion; *web insights & originality* additionally let Claude run web searches from the draft; *vocabulary* sends only the single looked-up word to the public dictionary API; *everything else* (articles, images, settings, voice profile, word bank) never leaves the device. No accounts, no analytics, never sold or shared.
- **Governance — her switches.** A **master AI switch** (turn all AI writing features off) and an **allow-web-search switch** (forbid web search for insights/originality). The adapter honors both — AI is "configured" only when a key is present *and* the master switch is on.
- **Security — key handling.** The Anthropic key is stored in the browser's local database (IndexedDB), unencrypted, on this device only — never bundled into the app or sent anywhere except Anthropic's API. **Clear AI key** and **Clear all AI data** (key + voice profile) are one click; the app warns to clear on shared machines.
- **Real data, no fabrication.** The AI never invents facts, figures, employers, or sources — it leaves bracketed placeholders for specifics she must supply, grounds web insights and originality checks in real cited material, and the dictionary is the real Dictionary API.
- **She decides.** The AI proposes; nothing is applied to her draft or published without her explicit action.
- **Fact-check & originality before publish.** The Checks guard (§5.11) protects against doxxing, confidentiality breaches, accidental plagiarism, and unverifiable claims; her rule of generic numbers / generic companies is the default.

## 9. Build order (historical + forward)

1–11 (v1): data model + storage + seed → Archive → Editor (autosave, preview) → status/dashboard → Publish Queue + copy-out + deep links → Settings → Images (upload/URL/AI) → filters/search → Config Track → export/import → design pass. **[BUILT]**
12 (v2): AI adapter (Claude) + Settings AI config. **[BUILT]**
13: Writing Coach — Improve (rewrites + review) · Teach (lesson + grounded insights) · Vocabulary (dictionary + word bank) · Privacy guard. **[BUILT]**
14: Voice profile (learn from corpus, inject into prompts). **[BUILT]**
15: Move Source Material into Settings. **[BUILT]**
16: Privacy / fact-check guard + editor shield. **[BUILT]**
17–23 (v3): Writing Craft · Momentum · Book mode · real-corpus import + persisted craft read · **A-grade intelligence layer** (POS, MATTR, personalized readiness, local company-privacy, echoes) · **version history + undo** · **spaced-repetition vocab** · **two-way `.md` sync**. **[BUILT]** — see §5.13, §5.15, §11.
24 (v4): on-device semantic embeddings. **[FUTURE]** — see §12.

## 10. Acceptance criteria (current scope is "done" when…)

1. Loads pre-populated with all 50 seed articles, correctly phased/tagged/numbered/statused; bodies empty. **[✓]**
2. Dashboard shows accurate live counts incl. "N ready to publish right now." **[✓]**
3. Archive groups by phase (toggle status/recent), with working filters + search. **[✓]**
4. Editing autosaves and survives a full refresh; word count live + persists. **[✓]**
5. + New Article instantly creates an Unfiled idea and opens it; works on mobile. **[✓]**
6. Inline status change from the archive without opening the editor. **[✓]**
7. Publish Queue shows ready-only, pinned first, with copy-out + deep links + mark-published. **[✓]**
8. Copy article places clean markdown on the clipboard; images individually grabbable; Publish-to deep links open composers. **[✓]**
9. Images add three ways with graceful AI degrade; cover thumbnails; alt defaults to title before ready. **[✓]**
10. Export (JSON + md zip incl. images) and import (JSON) work. **[✓]**
11. Config Track gathers config articles in plan order with thesis, deadline countdown, and 200–400-word outline helper. **[✓]**
12. **Writing Coach**: Improve rewrites + Review cards apply; Teach gives draft lessons and web-grounded cited insights; all in her learned voice; degrades cleanly without a key. **[✓]**
13. **Vocabulary**: real dictionary lookups; personal word bank persists. **[✓]**
14. **Privacy guard**: local scan flags money/dates/address/contact with generic replacements; AI deep scan adds company/identity; shield reflects count; Apply edits the draft; nothing changes without her click. **[✓]**
15. **Home dashboard** is the default landing: inventory strip + Ready-to-publish + AI writing insight + suggested articles; Archive is the pure all-status inventory; Queue folded into Home. **[✓]**
16. **Trust & governance**: data-flow disclosure; master AI switch + allow-web-search toggle gate the adapter; clear-key / clear-AI-data work; key handling disclosed. **[✓]**
17. **Originality**: local self-overlap flags reused passages across her own articles; web check (when allowed) is cited and honest. **[✓]**
18. Nothing, anywhere, can cause loss of written work. **[✓]**
19. Responsive to mobile; reduced-motion + visible focus respected; no-emoji. **[✓]**

## 11. Recently built (was the roadmap)

- **Writing Craft — the longitudinal teacher [BUILT].** Reads across her *whole* body of work and tracks growth over time: corpus stats (pieces, words, avg readability, sentence variety), a month-by-month trend chart, rule-based **tendencies** (habits to work on / what's working, derived honestly from the local metrics), a one-line **focus for next pieces**, and an optional AI "read across my writing." All local; "the more I write, the better I get" made visible.
- **Momentum [BUILT].** A calm Home strip — writing streak, words this week, pieces published — rewarding the practice, never nagging; links into Writing Craft.
- **Book mode [BUILT].** Compile a book from her articles: pick pieces, order them into chapters (reorder/remove), set a title, preview the full manuscript (title page + contents + chapters), and export a single combined markdown file. Persisted. *(Personal-only — hidden from the public demo.)*
- **Real corpus imported [BUILT].** Her 10 actually-published pieces (8 Medium + 2 IBI Community) live in the Archive and on disk, so the coach, Craft, and metrics work on her real writing. The **Writing Craft** page also carries a persisted, reader-facing **"Your voice, read closely"** narrative (`settings.craftInsight`) — refreshable with Claude, but populated for free.
- **Intelligence layer hardened to A-grade [BUILT].** See §5.13 — real syllables/segmentation, MATTR, POS-backed passive/adverb + weak-verbs + nominalizations, personalized readiness, local company-privacy detection, paraphrase-tolerant echoes, and the month-trend fixed to use publish dates. 33 unit tests.
- **Version history & undo [BUILT].** §5.15.
- **Spaced-repetition vocabulary [BUILT].** §5.9 Vocabulary.
- **Two-way `.md` sync [BUILT].** §6.

### Still open **[NEXT]**
- Craft/Book aren't on the mobile tab bar yet (desktop rail only); reachable on mobile via the momentum link / deep links.
- The 3-vs-5 "ready" seed-count discrepancy is still her call (1-click inline flip) — largely moot now that the existing-tagged pieces are `published`.
- Optional: an AI "compile/outline a book from my writing" assist on top of Book mode.

## 12. Future (DO NOT BUILD YET — architect to allow) **[FUTURE]**

**On-device semantic embeddings** (the deferred A+ frontier; `embeddings` store already in place) — a small quantized model (e.g. `all-MiniLM-L6-v2`) run locally in a web worker for **semantic** originality (reworded *ideas*, not just shared phrasing) and "closest in meaning" across her archive. Strictly opt-in (a ~23MB model download), demo-disabled. *(Task chip filed.)*

Other future ideas: cloud sync across devices · direct API publishing/scheduling · series & threads (mini-arcs beyond phases) · editorial calendar (drag ready pieces onto dates) · idea inbox (lightweight capture that graduates into shells) · stock-image search (Unsplash/Pexels with auto-attribution) · per-platform image presets + a lockable brand kit · multiple talk tracks (generalize the Config Track) · reading-time + SEO metadata per platform.

---

## 13. Seed data — the 50 articles

Load all 50 on first run with the metadata below. **Body starts empty for every article. Status starts as listed** (the five "existing" articles can start as `ready` since they're already written elsewhere and just need cross-posting; everything else starts as `idea`). Platforms default to `["substack", "linkedin"]` for all unless noted.

> **Known spec note:** the per-row tables below mark #1–#3 as `ready` (→ 3 ready), while §13's intro and the original acceptance criterion say "5 ready." The build seeds status verbatim from the tables (3 ready); flipping the other existing-tagged pieces (#18, #27, #45) to ready is a one-click inline action.

### Phase 1 — The Hook (Who I Am Now)

| # | Title | Hook | Tags | Status |
|---|-------|------|------|--------|
| 1 | I Always Thought I Wasn't Good Enough — Until WebFOCUS Made Me Someone New | The Starbucks story. The $138K offer. The disbelief. The origin everything else radiates from. | existing, human | ready |
| 2 | How I Rebuilt My Portfolio While Navigating a Layoff, Visa Stress, Two Kids, and Pure Chaos | Already written. Raw and specific. The stakes are clear. | existing, human | ready |
| 3 | Never Design Blind: How Learning and Empathy Shaped My Approach to ML UX | Already written. The technical empathy that makes her unusual. | existing, technical | ready |
| 4 | What It Actually Feels Like to Interview for a Staff Role When You Have Imposter Syndrome | No company names. The prep spiral, the nerves before the recruiter screen, the voice that says you're not enough. The piece that makes people subscribe. | live, human | idea |

### Phase 2 — The Build (Real-Time Process)

| # | Title | Hook | Tags | Status |
|---|-------|------|------|--------|
| 5 | I'm Building Three AI Apps While Job Hunting. Here's Why That's Not Crazy. | The meta piece. Introduces the three apps as design problems, not product pitches. | live, process | idea |
| 6 | Why I Treat Claude, Codex, and Gemini Like a Design Team, Not a Tool | The multi-agent orchestration mindset. Passing context between agents. The piece engineers will share. | live, process, technical | idea |
| 7 | The Voice App That Started With a Bowl of Noodles | Chef origin as a design problem. What's wrong with cooking apps. Why voice-first. The Cook Model concept without the implementation. | live, process | idea |
| 8 | Why I Don't Ask Users Their Skill Level | The behavioral onboarding reframe. Self-rated skill is ego-laden and noisy. Observe behavior instead. Original thinking. | live, technical, process | idea |
| 9 | Upgrades Easily. Downgrades Slowly. Never Announced. | Asymmetric skill inference as a design philosophy, not a spec. One of her most original ideas. Broadly applicable. | live, technical | idea |
| 10 | Building on a Visa I Can't Work On Yet: Creating When You Can't Monetize | The honest piece about building three apps she legally can't monetize. The drive that doesn't wait for permission. | live, human | idea |
| 11 | What a Wealth App Taught Me About How People Lie to Themselves About Money | Wealth engine design — the user psychology, not the product. The gap between stated wants and real needs. | live, process | idea |
| 12 | The PRD I Handed to an AI Agent and What Came Back | The actual Claude Code workflow. PRD-to-agent handoff, what works, where it breaks, what judgment she still provides. | live, process, technical | idea |
| 13 | Designing an Enterprise OS for Colleges: Where Student Experience Meets Institutional Chaos | The college OS — the problem space, the student-vs-administrator tension, what "enterprise" means in education. | live, process | idea |
| 14 | I Run Three Parallel AI Coding Sessions at Once. Here's What That Actually Looks Like. | tmux, worktrees, context management, quota math. Practical and honest, including where it breaks down. | live, process, technical | idea |
| 15 | Agentic Observability: Designing for AI Systems That Explain Themselves | What it means to design UX for AI pipelines. Where humans need to see in. Transparency as the core design problem. | live, technical, process | idea |
| 16 | Three Months In: What Building Three Apps While Job Hunting Has Taught Me | The mid-point reflection. What's working, what's harder than expected, what she'd do differently. | live, human, process | idea |

### Phase 3 — The Work (Enterprise Mastery)

| # | Title | Hook | Tags | Status |
|---|-------|------|------|--------|
| 17 | Making Scheduling Human Again: The ReportCaster Story | The richest case study. 20M jobs/week. Customers threatening to leave. Told as a story, not a process diagram. | technical, process | idea |
| 18 | I Don't Need a Manual: System Archaeology and 13 Years of Grit | Already written. The manifesto on approaching legacy work. | existing, technical | idea |
| 19 | Designing ML for People Who Are Afraid of Math | ML Functions — making data science accessible. Plain language, scaffolding, removing jargon. Empathy as a technical skill. | technical, process | idea |
| 20 | The IQ Plugin: What It Took to Unite Three Fragmented Teams Into One Experience | NLQ + Insights + ML in one hub. The political fight as much as the design. Product diplomacy. | technical, process | idea |
| 21 | Leading Without a Title: How I Directed Three Subsystems Without Being Anyone's Manager | Influence through clarity. Prototypes bridging PM and Eng. Staff behavior without Staff authority. | process, human | idea |
| 22 | Legacy Products Don't Break From Code. They Break From Culture. | Conway's Law in practice. ReportCaster broke because teams didn't talk. Design as org repair. | technical, process | idea |
| 23 | The "Unsexy" Skill That Separates Senior from Staff: Documentation | Logic flows, decision logs, spec depth. The single source of truth when memory fails. | process, technical | idea |
| 24 | Earning Engineering Respect: How to Review a Build Without Being a Jerk | Quality Syncs during the build, not audits after. Partnership framing. Shared ownership of UX. | process | idea |
| 25 | Principal Designers Think in Systems, Not Screens | The clearest articulation of what Staff-level means in practice. Data flows, global patterns, scale. | technical, process | idea |
| 26 | What Happens When a Hiring Manager Questions Your Scale | The scale-pushback experience, anonymized. Reframing 25M users and distributed teams. Arguing for your level without ego. | live, human | idea |
| 27 | The Real Designer Grind: Building Together, Not Alone | Already written. Design starts with chaos, not clarity. | existing, process | idea |
| 28 | Framing Is Everything: How I Learned to Sell Problems Before Pixels | A UI cleanup reframed as "reducing support ticket costs." The best framed idea wins. | process | idea |

### Phase 4 — The Vision (Where It's All Going)

| # | Title | Hook | Tags | Status |
|---|-------|------|------|--------|
| 29 | Designers Will Become AI Directors. Here's What That Actually Means. | Not pixel-pushers, not prompt engineers. Directors — setting intent, checking quality, keeping the human in the loop. | technical | idea |
| 30 | What AI Will Never Replace: Judgment, Taste, and Context | AI generates 100 variations; it can't tell you which is right. The three things that stay human. | technical | idea |
| 31 | The New Skillset: Architecture Over Aesthetics | Databases, permissions, APIs, states. Less color, more flowcharts. What being a designer means in 2026. | technical | idea |
| 32 | AI Is Not Replacing Designers. It's Replacing Fear. | AI amplifies what's already there. The differentiator is curiosity, not skill. | technical | idea |
| 33 | The Designer-Engineer Wall Is Crumbling. Good. | AI as common language. Faster iterations, less translation error. Don't protect your turf — merge it. | technical | idea |
| 34 | UX Education Is Failing Designers Right Now | Bootcamps teach the wrong things. The new curriculum: prompts, systems architecture, business logic, APIs. | technical | idea |
| 35 | High-Impact UX Is Political. The Sooner You Accept That, the Better. | Decisions are made in rooms you aren't in — unless you earn your way in. Design is power. | process | idea |
| 36 | Why Observability Is the Most Interesting Design Problem in AI Right Now | Agentic systems need surfaces where humans see in. Transparency isn't a feature — it's the product. | technical, live | idea |
| 37 | Stop Designing for Output. Start Designing for Outcomes. | 50 screens < 1 solved problem. Measure adoption and silence. Factory mindset to impact mindset. | process | idea |
| 38 | Adoption Fails Because UX Doesn't Tell a Story | Users buy a better version of themselves. Narrative is the ultimate usability hack. | technical, process | idea |
| 39 | Motherhood Didn't Kill My Career. It Sharpened It. | Efficiency as survival. Anticipate needs, remove friction, keep it calm. The mental load as a design lens. | human | idea |
| 40 | Tools Don't Make Designers. Thinking Does. | Figma didn't make you good; Cursor won't either. Tools change every five years. Thinking lasts a career. | process | idea |

### Phase 5 — The Resolution (Full Circle)

| # | Title | Hook | Tags | Status |
|---|-------|------|------|--------|
| 41 | Why Most Case Studies Are Terrible — And How to Write One That Gets You Hired | Process porn vs. conflict, villain, victory. Make the hiring manager feel the pain you solved. | process | idea |
| 42 | The Three Types of Designers. Which One Are You? | Execution (Hands), Systems (Brain), Vision (Eyes). The arc from Hands to Eyes. | process | idea |
| 43 | Anger Fueled My Best Work | Not zen — genuinely angry at how bad the product was. That anger powered three years of fighting bureaucracy. | human | idea |
| 44 | When a Director Trusts You More Than You Trust Yourself | Sponsorship changes everything. Borrowed belief until you build your own. Then be that for someone else. | human | idea |
| 45 | I Was 15 When I Knew What I'd Do for the Rest of My Life | Already written. The personal origin. 15 as knowing, not acne and algebra. | existing, human | idea |
| 46 | Identity Over Job Title: Who Are You When the Email Is Off? | The hollow post-layoff feeling. Self-worth outsourced to a company. Build an identity that travels. | human | idea |
| 47 | WebFOCUS Taught Me I Was Better Than I Thought | The retrospective. Walked in scared, walked out a Principal. The worst environment for comfort, best for growth. | human | idea |
| 48 | What the Job Search Actually Did to Me — And What It Didn't | Honest account of a long search. What it cost, what it didn't break. The real ending, whatever it is by then. | live, human | idea |
| 49 | How I Rebuilt My Career With Zero Ego | Ego is heavy. Starting over, asking for help, learning in public. The death of who you were. | human | idea |
| 50 | I Am Good Enough. And So Are You. | A letter to the version of her outside Starbucks in disbelief. Closing the loop. Always the last one. | human | idea |

### Note on additions beyond the 50
The owner will add ad-hoc articles over time — visa-stress pieces, the possible move back to Hyderabad, new app milestones, parenting-meets-work moments. These come in as `phase: "unfiled"`, `number: null`, and live alongside the plan articles. The plan is a spine, not a cage. Design every list, filter, and count to handle an arbitrary number of unfiled articles gracefully.

---

*Build the spine well. She'll grow the rest herself — and now the tool grows her, too.*
