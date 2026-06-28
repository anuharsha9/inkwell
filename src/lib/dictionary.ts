// Vocabulary lookups via the free Dictionary API (dictionaryapi.dev).
// Real data, no key, CORS-friendly. We normalize its response into a small
// shape the UI can render and store.

export interface WordSense {
  partOfSpeech: string
  definition: string
  example?: string
  synonyms: string[]
  antonyms: string[]
}

export interface WordEntry {
  word: string
  phonetic: string
  senses: WordSense[]
  synonyms: string[] // de-duped across senses, for quick "stronger words"
  fetchedAt: string // ISO
}

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

export async function lookupWord(raw: string): Promise<WordEntry> {
  const word = raw.trim().toLowerCase()
  if (!word) throw new Error('Type a word first.')
  const res = await fetch(ENDPOINT + encodeURIComponent(word))
  if (res.status === 404) throw new Error(`No dictionary entry for "${word}".`)
  if (!res.ok) throw new Error('Dictionary lookup failed — check your connection.')
  const data = (await res.json()) as DictApiEntry[]

  const senses: WordSense[] = []
  const synSet = new Set<string>()
  let phonetic = ''

  for (const entry of data) {
    if (!phonetic && entry.phonetic) phonetic = entry.phonetic
    if (!phonetic) phonetic = entry.phonetics?.find((p) => p.text)?.text ?? ''
    for (const m of entry.meanings ?? []) {
      for (const s of m.synonyms ?? []) synSet.add(s)
      for (const d of m.definitions ?? []) {
        senses.push({
          partOfSpeech: m.partOfSpeech ?? '',
          definition: d.definition,
          example: d.example,
          synonyms: [...(m.synonyms ?? []), ...(d.synonyms ?? [])].slice(0, 8),
          antonyms: [...(m.antonyms ?? []), ...(d.antonyms ?? [])].slice(0, 8),
        })
        for (const s of d.synonyms ?? []) synSet.add(s)
      }
    }
  }

  return {
    word,
    phonetic,
    senses: senses.slice(0, 6),
    synonyms: [...synSet].slice(0, 12),
    fetchedAt: new Date().toISOString(),
  }
}

// ── Raw API shape (only what we read) ──────────────────────────────────────
interface DictApiEntry {
  word: string
  phonetic?: string
  phonetics?: { text?: string }[]
  meanings?: {
    partOfSpeech?: string
    synonyms?: string[]
    antonyms?: string[]
    definitions?: { definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }[]
  }[]
}
