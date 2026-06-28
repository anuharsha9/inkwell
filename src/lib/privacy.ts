// ─────────────────────────────────────────────────────────────────────────
// Privacy / fact-check guard. Before anything is published, scan the draft for
// confidential or identifying details Anuja does NOT want public — exact
// salary/finances, birthdate, home address, phone/email, and (via the AI pass)
// exact employer names. The rule she set: keep numbers generic and companies
// generic. Nothing here mutates the draft — it flags and suggests; she decides.
//
// This local pass is regex-only, so it always works (no AI key needed). The AI
// pass in lib/ai.ts catches what regex can't (named employers, figures written
// in words, doxxable specifics).
// ─────────────────────────────────────────────────────────────────────────

export type PrivacyCategory = 'finance' | 'date' | 'address' | 'contact' | 'company' | 'identity'

export interface PrivacyFinding {
  category: PrivacyCategory
  text: string // exact substring found in the draft
  suggestion: string // generic replacement she can apply
  note: string // why it's flagged
  source: 'local' | 'ai'
}

interface Rule {
  category: PrivacyCategory
  re: RegExp
  suggestion: string
  note: string
}

const RULES: Rule[] = [
  // ── Money / salary / finances ──────────────────────────────────────────
  {
    category: 'finance',
    re: /[$₹£€]\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|bn|cr|crore|lakhs?|million|billion)?\b/gi,
    suggestion: '[a generic figure]',
    note: 'A specific monetary amount — keep figures generic.',
  },
  {
    category: 'finance',
    re: /\b\d[\d,]*(?:\.\d+)?\s?(?:k|cr|crore|lakhs?|million|billion)\b/gi,
    suggestion: '[a generic figure]',
    note: 'A specific amount — keep figures generic.',
  },
  // ── Birthdate / specific dates ─────────────────────────────────────────
  {
    category: 'date',
    re: /\bborn[^.,\n]{0,24}(?:19|20)\d{2}\b/gi,
    suggestion: '[redacted]',
    note: 'Looks like a birth year — best left out.',
  },
  {
    category: 'date',
    re: /\b(?:0?[1-9]|[12]\d|3[01])[\/.\-](?:0?[1-9]|1[0-2])[\/.\-](?:19|20)\d{2}\b/g,
    suggestion: '[redacted]',
    note: 'A specific calendar date — could identify you.',
  },
  {
    category: 'date',
    re: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b/gi,
    suggestion: '[redacted]',
    note: 'A day-level date — could identify you.',
  },
  // ── Home address ───────────────────────────────────────────────────────
  {
    category: 'address',
    re: /\b\d{1,5}\s+(?:[A-Z][a-zA-Z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace)\b\.?/g,
    suggestion: '[my city]',
    note: 'A street address — publish your city at most.',
  },
  {
    category: 'address',
    re: /\b(?:Apt|Apartment|Suite|Ste|Unit)\.?\s*#?\s*\w+\b/gi,
    suggestion: '',
    note: 'A unit/apartment number — drop it.',
  },
  // ── Contact details ────────────────────────────────────────────────────
  {
    category: 'contact',
    re: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
    suggestion: '[redacted]',
    note: 'An email address.',
  },
  {
    category: 'contact',
    re: /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    suggestion: '[redacted]',
    note: 'A phone number.',
  },
]

export function localPrivacyScan(text: string): PrivacyFinding[] {
  if (!text.trim()) return []
  const seen = new Set<string>()
  const findings: PrivacyFinding[] = []
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const found = m[0].trim()
      const key = `${rule.category}:${found.toLowerCase()}`
      if (!found || seen.has(key)) continue
      seen.add(key)
      findings.push({
        category: rule.category,
        text: found,
        suggestion: rule.suggestion,
        note: rule.note,
        source: 'local',
      })
    }
  }
  // Drop a finding when a longer finding of the same category already contains
  // it (e.g. "138K" inside "$138K") so the same value isn't flagged twice.
  return findings.filter(
    (f, i) =>
      !findings.some(
        (g, j) => j !== i && g.category === f.category && g.text.length > f.text.length && g.text.includes(f.text),
      ),
  )
}

export const CATEGORY_LABEL: Record<PrivacyCategory, string> = {
  finance: 'Money',
  date: 'Date',
  address: 'Address',
  contact: 'Contact',
  company: 'Company',
  identity: 'Identity',
}
