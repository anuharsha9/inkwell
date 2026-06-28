// Rough word count (PRD §4 derived): strip the loudest markdown syntax, then
// split on whitespace. "A rough count is fine."
export function countWords(body: string): number {
  const stripped = body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep text
    .replace(/[#>*_~`-]/g, ' ') // misc markdown punctuation
  const tokens = stripped.trim().match(/\S+/g)
  return tokens ? tokens.length : 0
}

// URL-safe slug for export filenames (number + slug).
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

// uuid with a graceful fallback (older webviews).
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowISO(): string {
  return new Date().toISOString()
}
