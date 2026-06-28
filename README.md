# Inkwell

A personal article archive & publishing queue — write ahead into an archive
during bursts, publish from inventory on a whim. Local-first, no backend, no
accounts. Built from `inkwell-prd.md`.

Design language: the **Moleskine iOS app family** (Timepage, Actions, Flow,
Journal) — warm paper canvas, white floating cards, one user-chosen signature
accent, dot motifs, big focal numbers, generous air, smooth transitions, rich
dark mode. No skeuomorphism, no emoji.

## Run

```bash
npm install
npm run dev      # http://localhost:3120
npm run build    # typecheck + production bundle
```

## Architecture (the seams)

```
src/
  types.ts          # the data model — the contract everything speaks (PRD §4)
  store.ts          # zustand: one persistence path; debounced autosave
  data/seed.ts      # the 50-article plan, metadata only (bodies start empty)
  lib/
    storage.ts      # IndexedDB wrapper + first-run seed (idempotent)
    selectors.ts    # dashboard counts, grouping/filtering, queue, config
    clipboard.ts    # copy-out formatting (the workhorse) + image grab
    image.ts        # downscale-on-store, InkImage factory
    imageAI.ts      # AI-generation ADAPTER — swap the provider here
    backup.ts       # JSON + Markdown-zip export, JSON import
    accent.ts       # the themeable signature accent
    constants.ts    # display metadata (labels, status colors as tokens)
  components/        # Icon set, primitives, NavRail, Dashboard, cards, menus
  views/            # Archive · Editor · Queue · Config · Settings
  styles/           # theme.css (tokens) · app.css (shell) · views.css
```

### Persistence (PRD §6)

IndexedDB database `inkwell`, three object stores:

- **`articles`** — keyed by `id`. The light record only; no image blobs inside,
  so the list loads fast.
- **`images`** — keyed by `id`, **one entry per image** (PRD §5.5 storage
  caution). Articles reference images by id. Uploads are downscaled to a 2000px
  longest edge before storage.
- **`meta`** — `settings` plus a `seeded:v1` flag that makes first-run seeding
  idempotent (never re-seeds over real edits).

Autosave is debounced ~500ms per article; structural ops (create/delete/import)
write immediately. There is exactly one write path (the store). Verified:
edits survive a full page reload.

### Image copy-out for publishing (PRD §5.5)

The platforms can't take local image ids, so the image panel exposes, per image,
**Copy** (to clipboard as PNG) and **Save** (download to disk) next to the text
copy. URL-sourced images are inlined as real URLs in the copied markdown; local
uploads/AI images become a labeled `![alt](attach: …)` placeholder so she knows
to drag the file in. The Markdown export zip writes local images to an
`images/` folder and rewrites references to relative paths.

### Publishing model (PRD §5.6)

None of Substack/LinkedIn/Medium support API publishing from a personal app, so
Inkwell optimizes **Copy → Open composer → Paste → Post**. "Copy article" is the
primary action; "Publish to…" deep-links open each composer in a new tab
(Substack URL is configurable in Settings). "Mark as published" stamps the date.

### Image AI

`lib/imageAI.ts` is a single adapter speaking the common OpenAI-style images
shape. Endpoint, key and model are read from Settings at runtime — **nothing is
hardcoded**. Unconfigured → the AI tab shows a "configure in Settings" state and
Upload / URL keep working fully.

## Not built yet (PRD §9)

Cloud sync, direct API publishing, series/threads, editorial calendar, idea
inbox, burst analytics, version history, stock image search, smarter AI prompts,
multiple talk tracks, AI assist. The architecture leaves room; none are built.

## Known spec note

The PRD conflicts on the starting "ready" count: the per-row tables mark only
#1–#3 as `ready` (→ 3 ready), while §8's intro and acceptance criterion #1 say
"5 ready." Seed currently follows the tables verbatim ("status starts as
listed"). Flipping the other existing-tagged pieces (#18, #27, #45) to ready is
a one-click inline action.
