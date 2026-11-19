// Understanding what an admin typed in the admin search. Pure, with no imports but the shared word list, so the browser and the
// API run the SAME code (apps/api/src/lib/admin-search-query.ts is a copy; a test fails if they drift).
//
// Two kinds of word group (search-vocab.json):
//  - topic groups name a KIND of thing: training, audits, policies, staff, incentives... They tell us what the person wants to see
//    and are NOT matched against names. "GDPR training" = courses about GDPR. "Len incentives" = a person called Len.
//  - subject groups are abbreviations and everyday words for a subject: GDPR = data protection, DBS = disclosure and barring.
//    Every phrase counts as a match, so "gdpr" finds "Data Protection and GDPR".
type Group = { topic: boolean; phrases: string[] }

// Words people use for the same thing. A group is a set of equivalent phrases; the first is the canonical one.
const VOCAB: Array<{ topic?: boolean; phrases: string[] }> = [
  { topic: true, phrases: ['training', 'course', 'module', 'learning', 'elearning', 'e learning', 'cpd', 'lesson', 'certificate'] },
  { topic: true, phrases: ['audit', 'checklist', 'check list', 'spot check'] },
  { topic: true, phrases: ['policy', 'procedure', 'sop', 'document', 'handbook'] },
  { topic: true, phrases: ['onboarding', 'induction', 'new starter', 'new joiner'] },
  { topic: true, phrases: ['incentive', 'reward', 'bonus', 'recognition', 'points', 'perks'] },
  { topic: true, phrases: ['staff', 'team', 'employee', 'carer', 'worker', 'colleague', 'person'] },
  { topic: true, phrases: ['supervision', 'supervisions', '1 to 1', 'one to one', '1 1', 'appraisal', 'performance review', 'annual review'] },
  { topic: true, phrases: ['resident', 'service user', 'client', 'person we support', 'patient'] },
  { topic: true, phrases: ['billing', 'invoice', 'payment', 'subscription', 'plan', 'upgrade'] },
  { topic: true, phrases: ['knowledge base', 'kb', 'faq', 'knowledge entry'] },
  { phrases: ['gdpr', 'data protection', 'dpa', 'data privacy', 'information governance', 'ico', 'confidentiality'] },
  { phrases: ['dbs', 'disclosure and barring', 'criminal record check', 'criminal record'] },
  { phrases: ['cqc', 'care quality commission', 'inspection', 'inspector', 'ofsted'] },
  { phrases: ['mca', 'mental capacity', 'capacity act', 'dols', 'deprivation of liberty', 'best interests'] },
  { phrases: ['f2f', 'face to face', 'classroom', 'in person', 'practical session'] },
  { phrases: ['hr', 'human resources', 'personnel', 'disciplinary', 'grievance'] },
  { phrases: ['rtw', 'right to work', 'immigration', 'visa'] },
  { phrases: ['nmc', 'nurse registration', 'registration', 'pin'] },
  { phrases: ['mar', 'medication chart', 'medication administration record', 'mar chart'] },
  { phrases: ['medication', 'medicine', 'medicines', 'meds', 'drugs', 'controlled drugs'] },
  { phrases: ['ppe', 'personal protective equipment', 'gloves and aprons'] },
  { phrases: ['coshh', 'hazardous substances', 'chemicals'] },
  { phrases: ['care certificate', 'cc', 'care cert'] },
  { phrases: ['dnacpr', 'dnar', 'resuscitation', 'cpr', 'do not resuscitate'] },
  { phrases: ['safeguarding', 'adult protection', 'abuse', 'protection of adults', 'safeguard'] },
  { phrases: ['moving and handling', 'manual handling', 'm and h', 'mh', 'hoist', 'lifting'] },
  { phrases: ['infection control', 'ipc', 'infection prevention', 'hygiene', 'handwashing'] },
  { phrases: ['fire', 'fire safety', 'evacuation', 'fire drill', 'peep'] },
  { phrases: ['first aid', 'fa', 'emergency first aid'] },
  { phrases: ['health and safety', 'h and s', 'hs', 'hse', 'risk assessment'] },
  { phrases: ['falls', 'falls prevention', 'slips and trips'] },
  { phrases: ['pressure ulcer', 'pressure care', 'pressure sore', 'skin integrity', 'tissue viability'] },
  { phrases: ['dementia', 'alzheimers', 'memory loss', 'cognitive impairment'] },
  { phrases: ['nutrition', 'hydration', 'food hygiene', 'diet', 'mealtime', 'malnutrition'] },
  { phrases: ['complaint', 'complaints', 'concern', 'whistleblowing', 'whistleblow', 'speak up'] },
  { phrases: ['end of life', 'palliative', 'eol', 'dying', 'bereavement'] },
  { phrases: ['equality and diversity', 'edi', 'equality', 'diversity', 'inclusion'] },
  { phrases: ['mental health', 'wellbeing', 'stress', 'anxiety'] },
  { phrases: ['learning disability', 'ld', 'autism', 'autistic'] },
  { phrases: ['lone working', 'lone worker', 'home visit'] },
  { phrases: ['business continuity', 'bcp', 'contingency', 'emergency plan', 'disaster'] },
  { phrases: ['care plan', 'care planning', 'support plan', 'person centred'] },
  { phrases: ['record keeping', 'documentation', 'recording', 'notes', 'daily notes'] },
  { phrases: ['agency', 'bank staff', 'temp staff', 'locum'] },
  { phrases: ['login', 'sign in', 'password', 'log in', 'reset password', 'forgotten password'] },
  { phrases: ['hub', 'app', 'phone app', 'mobile app', 'install'] },
  { phrases: ['translation', 'translate', 'language', 'languages', 'interpreter'] },
]

export const normQ = (s: string): string => s.toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const GROUPS: Group[] = VOCAB.map(g => ({ topic: !!g.topic, phrases: g.phrases.map(normQ) }))
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'my', 'our', 'how', 'do', 'i', 'new', 'all', 'me', 'show', 'find', 'open', 'go', 'please', 'can', 'where', 'is', 'what', 'with', 'at', 'be', 'add', 'create', 'make', 'start', 'member', 'members'])

/** "audits" to "audit", "policies" to "policy". */
export const stem = (w: string): string => w.length <= 3 ? w : w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.endsWith('ing') && w.length > 5 ? w.slice(0, -3) : w.endsWith('ss') ? w : w.endsWith('s') ? w.slice(0, -1) : w

export type Parsed = {
  /** Each entry is a need: one of its phrases must be present. Plain words have one phrase (the stem). */
  subject: Array<{ phrases: string[]; plain: string | null }>
  /** The kinds of thing asked for, by their first phrase: 'training', 'audit', 'staff', 'incentive'... */
  topics: string[]
  words: string[]
}

// Index every phrase by its first word so matching is quick, longest phrase first.
const BY_FIRST = new Map<string, Array<{ g: Group; words: string[] }>>()
for (const g of GROUPS) for (const p of g.phrases) {
  const words = p.split(' ')
  const l = BY_FIRST.get(words[0]) ?? []
  l.push({ g, words }); BY_FIRST.set(words[0], l)
}
for (const l of BY_FIRST.values()) l.sort((a, b) => b.words.length - a.words.length)

export function parseQuery(q: string): Parsed {
  const words = normQ(q).split(' ').filter(Boolean)
  const subject: Parsed['subject'] = []
  const topics: string[] = []
  for (let i = 0; i < words.length;) {
    const w = words[i]
    // A word and its stem both start a phrase ("policies" starts "policy"): try both.
    const cands = [...(BY_FIRST.get(w) ?? []), ...(BY_FIRST.get(stem(w)) ?? [])].sort((a, b) => b.words.length - a.words.length)
    const hit = cands.find(c => c.words.every((cw, k) => words[i + k] !== undefined && (words[i + k] === cw || stem(words[i + k]) === stem(cw))))
    if (hit) {
      if (hit.g.topic) { if (!topics.includes(hit.g.phrases[0])) topics.push(hit.g.phrases[0]) }
      else if (!subject.some(s => s.phrases[0] === hit.g.phrases[0])) subject.push({ phrases: hit.g.phrases, plain: null })
      i += hit.words.length
    } else {
      if (!STOP.has(w)) subject.push({ phrases: [stem(w)], plain: w })
      i += 1
    }
  }
  return { subject, topics, words }
}

/** Alternative spellings of the whole query, swapping each abbreviation for each of its equivalents. Used to score pages and guides. */
export function variants(q: string, cap = 8): string[] {
  const words = normQ(q).split(' ').filter(Boolean)
  let out: string[][] = [[]]
  const usedGroups = new Set<string>()
  for (let i = 0; i < words.length;) {
    const w = words[i]
    const cands = [...(BY_FIRST.get(w) ?? []), ...(BY_FIRST.get(stem(w)) ?? [])].sort((a, b) => b.words.length - a.words.length)
    const hit = cands.find(c => c.words.every((cw, k) => words[i + k] !== undefined && (words[i + k] === cw || stem(words[i + k]) === stem(cw))))
    if (hit) {
      if (usedGroups.has(hit.g.phrases[0])) { i += hit.words.length; continue }
      usedGroups.add(hit.g.phrases[0])
      const alts = hit.g.phrases.slice(0, 6)
      out = out.flatMap(p => alts.map(a => [...p, a]))
      i += hit.words.length
    } else { out = out.map(p => [...p, w]); i += 1 }
    if (out.length > 60) out = out.slice(0, 60)
  }
  const seen = new Set<string>(); const res: string[] = []
  const orig = normQ(q)
  for (const p of [[orig], ...out]) { const s = p.join(' ').replace(/\s+/g, ' ').trim(); if (s && !seen.has(s)) { seen.add(s); res.push(s) } }
  return res.slice(0, cap)
}

/** The record kind a search is asking for, when it names only a kind and nothing more specific. */
export type Kind = 'audit' | 'training' | 'policy' | 'onboarding'
export function kindOnly(q: string): Kind | null {
  const p = parseQuery(q)
  if (p.subject.length > 0 || p.topics.length === 0) return null
  for (const [k, t] of [['audit', 'audit'], ['training', 'training'], ['policy', 'policy'], ['onboarding', 'onboarding']] as const) if (p.topics.includes(t)) return k
  return null
}
