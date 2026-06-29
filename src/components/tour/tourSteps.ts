import type { View } from '@/store'

export interface TourStep {
  id: string
  title: string
  body: string
  /** CSS selector to spotlight. Omit for a centered, anchorless step. */
  target?: string
  /** Preferred side of the target for the coachmark; flips if there's no room. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Switch Inkwell to this view before the step (so its target is on screen). */
  view?: View
  /** A one-off action to run before the step (e.g. open a sample article). */
  action?: 'openFirstArticle'
}

// A short hands-on tour that actually walks through the live demo — each step
// switches to the real view and spotlights the real element. ~6 steps, skippable.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Inkwell',
    body: 'A personal writing studio — an archive, an AI coach in your voice, and a craft teacher, all in one calm, local-first tool. Here’s a 40-second tour. Not in the mood? Hit Skip anytime.',
    view: 'home',
  },
  {
    id: 'home',
    title: 'Your command center',
    body: 'Home answers “where am I, and what now?” — what’s ready to publish, your momentum, and an at-a-glance read of your writing. Write ahead during bursts; publish from inventory on a whim.',
    target: '[data-tour="home-hero"]',
    placement: 'bottom',
    view: 'home',
  },
  {
    id: 'archive',
    title: 'Every piece, every status',
    body: 'The Archive is your full inventory — ideas, drafts, ready, and published — grouped by phase. Filters, search, inline status changes. Click any card to open it.',
    target: '[data-tour="archive-head"]',
    placement: 'bottom',
    view: 'archive',
  },
  {
    id: 'coach',
    title: 'An AI coach in your voice',
    body: 'Open any article and this is your writing partner: it tightens, sharpens, and continues drafts in your voice, teaches the craft behind each fix, and checks privacy + originality — all before you publish.',
    target: '[data-tour="coach-btn"]',
    placement: 'bottom',
    action: 'openFirstArticle',
  },
  {
    id: 'craft',
    title: 'A mirror for your craft',
    body: 'Writing Craft reads across everything you’ve written — readability, rhythm, the habits you lean on and the strengths that recur — so you can watch yourself get better the more you write.',
    target: '[data-tour="craft-stats"]',
    placement: 'bottom',
    view: 'craft',
  },
  {
    id: 'byok',
    title: 'Bring your own AI',
    body: 'The everyday analysis — readability, vocabulary, privacy, originality — runs free on the on-device engine, no key needed. Add your own Anthropic key in Settings to power the live coach; it stays in your browser. Enjoy exploring.',
    view: 'home',
  },
]
