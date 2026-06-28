// ─────────────────────────────────────────────────────────────────────────
// Word data for the local intelligence layer. Kept apart from the algorithms
// so the heuristics stay readable and these lists are easy to extend.
// ─────────────────────────────────────────────────────────────────────────

// Hedge / filler words that soften a sentence. (kind/sort are handled
// separately — they only count as filler in "kind of" / "sort of".)
export const FILLERS = new Set([
  'very', 'really', 'just', 'actually', 'basically', 'literally', 'simply', 'quite', 'rather',
  'somewhat', 'pretty', 'totally', 'definitely', 'certainly', 'probably', 'maybe', 'perhaps',
  'essentially', 'honestly', 'obviously', 'clearly', 'truly',
])

// Irregular past participles — passive voice / perfect aspect that DON'T end in
// "-ed", so a naive "be + …ed" regex misses them entirely.
export const IRREGULAR_PARTICIPLES = new Set([
  'born', 'written', 'built', 'made', 'given', 'shown', 'taken', 'done', 'seen', 'known',
  'told', 'held', 'found', 'kept', 'left', 'felt', 'brought', 'bought', 'caught', 'taught',
  'thought', 'sought', 'sent', 'spent', 'meant', 'lost', 'won', 'put', 'set', 'cut', 'hit',
  'let', 'shut', 'cost', 'led', 'fed', 'read', 'said', 'paid', 'laid', 'heard', 'understood',
  'stood', 'sold', 'told', 'driven', 'drawn', 'grown', 'thrown', 'flown', 'blown', 'known',
  'chosen', 'frozen', 'broken', 'spoken', 'stolen', 'woken', 'awoken', 'beaten', 'eaten',
  'fallen', 'forgotten', 'gotten', 'hidden', 'ridden', 'risen', 'shaken', 'taken', 'mistaken',
  'forbidden', 'overcome', 'become', 'begun', 'drunk', 'sung', 'sunk', 'swum', 'run', 'rung',
  'worn', 'torn', 'sworn', 'born', 'borne', 'dealt', 'meant', 'dreamt', 'burnt', 'learnt',
  'sent', 'lent', 'bent', 'built', 'gone', 'withheld', 'upheld', 'rebuilt', 'redone',
])

// Words ending in "-ed" that are almost always predicate ADJECTIVES after a
// be-verb ("I was excited"), not true passive voice. Excluding them kills the
// biggest source of passive false-positives.
export const PREDICATE_ADJECTIVES = new Set([
  'excited', 'interested', 'tired', 'worried', 'surprised', 'bored', 'scared', 'confused',
  'pleased', 'satisfied', 'frustrated', 'exhausted', 'motivated', 'dedicated', 'committed',
  'experienced', 'gifted', 'talented', 'qualified', 'complicated', 'detailed', 'limited',
  'advanced', 'involved', 'concerned', 'supposed', 'used', 'located', 'based', 'related',
  'embarrassed', 'amazed', 'astonished', 'delighted', 'disappointed', 'overwhelmed',
  'determined', 'devoted', 'crowded', 'gifted', 'aged', 'wicked', 'naked', 'sacred',
  'rugged', 'skilled', 'spoiled', 'relaxed', 'stressed', 'depressed', 'obsessed', 'blessed',
  'ashamed', 'prepared', 'scared', 'inclined', 'attached', 'engaged', 'focused', 'finished',
])

// Words ending in "-ly" that are NOT adverbs — so the "-ly adverb" density
// signal stops flagging nouns and adjectives.
export const NON_ADVERB_LY = new Set([
  'only', 'family', 'reply', 'apply', 'supply', 'comply', 'imply', 'rely', 'multiply',
  'ally', 'rally', 'tally', 'bully', 'fully', 'jelly', 'belly', 'folly', 'holy', 'ugly',
  'silly', 'lonely', 'likely', 'lovely', 'lively', 'lowly', 'homely', 'friendly', 'deadly',
  'costly', 'orderly', 'elderly', 'earthly', 'monthly', 'weekly', 'daily', 'yearly', 'hourly',
  'italy', 'assembly', 'anomaly', 'monopoly', 'melancholy', 'butterfly', 'supply', 'reply',
  'duly', 'unduly', 'cuddly', 'wobbly', 'bubbly', 'crumbly', 'gravelly', 'measly', 'curly',
  'burly', 'surly', 'godly', 'grisly', 'ghastly', 'gentlemanly', 'womanly', 'manly', 'fly',
  'ply', 'sly', 'spy', 'try', 'pry', 'shy', 'dry', 'cry', 'wry',
])

// Common words an algorithmic syllable counter gets wrong — a small override map
// covers the highest-frequency offenders; the algorithm handles the rest.
export const SYLLABLE_EXCEPTIONS: Record<string, number> = {
  area: 3, idea: 3, ideas: 3, real: 1, really: 2, being: 2, doing: 2, going: 2, seeing: 2,
  every: 2, everyone: 3, everything: 3, everybody: 4, people: 2, business: 2, businesses: 3,
  comfortable: 3, vegetable: 3, interesting: 3, interested: 3, wednesday: 2, science: 2,
  scientist: 3, create: 2, created: 3, creating: 3, creature: 2, quiet: 2, quietly: 3,
  diary: 3, society: 4, lion: 2, prior: 2, fire: 1, hour: 1, our: 1, hours: 1, poem: 2,
  poet: 2, naive: 2, aisle: 1, queue: 1, choir: 1, suite: 1, simile: 3, recipe: 3,
  catastrophe: 4, maybe: 2, coffee: 2, college: 2, average: 3, camera: 3, family: 3,
  favorite: 3, different: 3, difference: 3, finally: 3, usually: 4, actually: 4, total: 2,
  towel: 2, trial: 2, dial: 2, royal: 2, loyal: 2, layer: 2, prayer: 2, mayor: 2, giant: 2,
}
