# Working style — distilled from Claude Code's memory of Anuja

*This is what an AI coding agent actually learned about how Anuja works, accumulated
across months of building together and kept in its persistent memory. Copied here
(privacy-scrubbed) as source material for articles — every observation below comes
from real sessions, not self-description. That distinction is the point: this is a
read of her working style from the thing that works alongside her every day.*

## Her stated principles (verbatim or near-verbatim)

- **The chair test.** "I have a chair philosophy. When you look at a chair, you know
  it's meant to be sat on. That chair obviousness is what I aim for when I design
  anything." Affordance theory turned into a pass/fail test you can apply to any
  element — and turned into named laws (prominence = importance; state before words;
  fact ≠ forecast; actionable looks actionable; one element, one job) that get cited
  in design review like statutes: "that fails law 3."
- **No loose ends.** "Every path in any product should lead to a conclusion and a way
  to solve it. Never, ever a loose question." Every empty state, error, and dead end
  must resolve into a clear next action. She holds her AI agents to the same bar:
  hand back conclusions and a recommendation, never an open-ended menu.
- **Teach as you code.** "I don't want you to blindly code. I want to understand how
  you're doing it." A designer with no formal CS background directing production
  systems — by requiring the *why* alongside the *what*, every session doubles as a
  lesson.
- **Real data, no assumptions.** Models and predictions use real, sourced numbers with
  citations — never invented figures. An AI that fabricates a number fails the same
  test as a forecast dressed up as a fact.
- **UX over polish.** Get the flows and usefulness right; visuals should be appealing,
  never pixel-obsessed. Craft is judged at the workflow level.

## How she runs AI agents

- Treats coding agents as a **design team she directs**, not a tool she prompts —
  PRDs as handoffs, review gates, standing preferences the agent must remember and
  honor across sessions (the agent's memory of her is itself part of the system).
- Standing rules she's issued that reveal the style: never spend her API key on what
  the agent can do itself in dev; the public demo must never contain her real data
  (verified at the bundle level, not by promise); every feature lands with tests,
  a typecheck, and browser proof before it's called done.
- Corrections become durable law. When the agent gets something wrong once — a tone,
  a spend, a scope — the fix is written to memory and never relitigated.

## The Build Lab pattern

- Multiple real products built in parallel with AI agents — a finance decision engine,
  an education-ROI engine, a voice-first cooking companion, an agent-governance
  console, a writing studio — each with the same discipline: local-first, a
  demo-safe public build, a design system with enforced tokens, and a PRD kept
  current as the product evolves.
- Each app ships a *fictional-persona* public demo while the real data stays on her
  machine — a privacy architecture she applies uniformly, not case-by-case.

## Temperament (as observed by the agent)

- Ships daily; treats "done" as verified-and-pushed, not written.
- Wants honest grades, not flattery — asked "how good is this really?" about her own
  app's intelligence layer and accepted a B− verdict, then funded the plan to make
  it an A.
- Prefers free-form conversation over multiple-choice; prefers one recommendation
  over a menu of options.
- Frugal where it doesn't matter (dev-mode API spend), decisive where it does
  (paying for the best model for her own writing).
