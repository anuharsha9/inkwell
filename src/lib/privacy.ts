// ─────────────────────────────────────────────────────────────────────────
// Privacy / fact-check guard. Before anything is published, scan the draft for
// confidential or identifying details Anuja does NOT want public — exact
// salary/finances, birthdate, home address, phone/email, and named employers.
// The rule she set: keep numbers generic and companies generic. Nothing here
// mutates the draft — it flags and suggests; she decides.
//
// All local (regex + her own term list), so it always works with no AI key.
// The AI pass in lib/ai.ts still catches subtler cases (doxxable specifics,
// figures buried in prose) when she chooses to spend a call.
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

const NUM_WORD = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand)'

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
  {
    // Money written in words: "six figures", "twelve thousand rupees", "a few hundred dollars".
    category: 'finance',
    re: new RegExp(`\\b${NUM_WORD}[\\s-]?(?:figures?|${NUM_WORD})?[\\s-]?(?:dollars?|rupees?|figures?|lakhs?|crores?|thousand|million|billion)\\b`, 'gi'),
    suggestion: '[a generic figure]',
    note: 'A figure written out — keep it generic.',
  },
  {
    // "$X a month/year", "X per month"
    category: 'finance',
    re: /\b(?:a|per)\s+(?:month|year|annum|week|hour)\b/gi,
    suggestion: '',
    note: 'A pay-rate phrasing — check the amount near it isn’t exact.',
  },
  // ── Birthdate / specific dates ─────────────────────────────────────────
  {
    category: 'date',
    re: /\b(?:born|birthday|date of birth|d\.?o\.?b\.?)[^.,\n]{0,28}(?:19|20)\d{2}\b/gi,
    suggestion: '[redacted]',
    note: 'Looks like a birth date — best left out.',
  },
  {
    category: 'identity',
    re: /\b\d{1,2}\s+years?\s+old\b/gi,
    suggestion: '[redacted]',
    note: 'Your exact age — consider leaving it vague.',
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
    // Whole-word abbreviation + an actual unit number, so "Ste"/"Unit" don't
    // match inside "step" / "unite" / "unit testing".
    category: 'address',
    re: /\b(?:Apt|Apartment|Suite|Ste|Unit)\b\.?\s*#?\s*\d+[A-Za-z]?\b/gi,
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
  // ── Company / employer (heuristic — named orgs with a corporate suffix) ──
  {
    category: 'company',
    re: /\b(?:[A-Z][A-Za-z0-9&.]+\s){0,3}(?:Inc|LLC|Corp|Corporation|Technologies|Software|Systems|Solutions|Group|Labs|Ltd|GmbH)\b\.?/g,
    suggestion: '[a company]',
    note: 'A named company — keep employers generic.',
  },
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// `terms` is her own list of sensitive strings (real employers, product names,
// people) — matched exactly so the things she most wants kept private always trip.
export function localPrivacyScan(text: string, terms: string[] = []): PrivacyFinding[] {
  if (!text.trim()) return []
  const seen = new Set<string>()
  const findings: PrivacyFinding[] = []

  const customRules: Rule[] = terms
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({
      category: 'company' as PrivacyCategory,
      re: new RegExp(`\\b${escapeRegExp(t)}\\b`, 'gi'),
      suggestion: '[a company]',
      note: 'On your private-terms list — keep it generic.',
    }))

  for (const rule of [...customRules, ...RULES]) {
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
