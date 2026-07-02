import type { Format, Phase, Platform, Status, Tag } from '@/types'

// Display metadata kept as data, not scattered through JSX. Colors are CSS var
// names so light/dark themes resolve them — see styles/theme.css.

export const PHASE_ORDER: Phase[] = ['phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'unfiled']

export const PHASE_META: Record<Phase, { roman: string; title: string; subtitle: string }> = {
  'phase-1': { roman: 'I', title: 'The Hook', subtitle: 'Who I Am Now' },
  'phase-2': { roman: 'II', title: 'The Build', subtitle: 'Real-Time Process' },
  'phase-3': { roman: 'III', title: 'The Work', subtitle: 'Enterprise Mastery' },
  'phase-4': { roman: 'IV', title: 'The Vision', subtitle: "Where It's All Going" },
  'phase-5': { roman: 'V', title: 'The Resolution', subtitle: 'Full Circle' },
  unfiled: { roman: '·', title: 'Unfiled', subtitle: 'Loose pages' },
}

export const STATUS_ORDER: Status[] = ['idea', 'drafting', 'ready', 'published']

export const STATUS_META: Record<Status, { label: string; var: string }> = {
  idea: { label: 'Idea', var: '--status-idea' },
  drafting: { label: 'Drafting', var: '--status-drafting' },
  ready: { label: 'Ready', var: '--status-ready' },
  published: { label: 'Published', var: '--status-published' },
}

export const TAG_ORDER: Tag[] = ['existing', 'live', 'process', 'human', 'technical']

export const TAG_META: Record<Tag, { label: string }> = {
  existing: { label: 'existing' },
  live: { label: 'live' },
  process: { label: 'process' },
  human: { label: 'human' },
  technical: { label: 'technical' },
}

export const FORMAT_ORDER: Format[] = ['article', 'post']

export const FORMAT_META: Record<Format, { label: string; short: string }> = {
  article: { label: 'Full article', short: 'Article' },
  post: { label: 'Post', short: 'Post' },
}

export const PLATFORM_ORDER: Platform[] = ['substack', 'linkedin', 'medium']

export const PLATFORM_META: Record<Platform, { label: string; short: string; newPost: string }> = {
  substack: { label: 'Substack', short: 'S', newPost: 'https://substack.com/home' },
  linkedin: { label: 'LinkedIn', short: 'in', newPost: 'https://www.linkedin.com/article/new/' },
  medium: { label: 'Medium', short: 'M', newPost: 'https://medium.com/new-story' },
}
