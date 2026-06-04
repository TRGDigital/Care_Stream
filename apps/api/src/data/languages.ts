// Language catalog for staff communications.
//
// Languages are keyed by ISO 639-3 code. Outbound translation is done by Claude,
// which can translate into essentially any named human language — so a language
// only needs a {code, name} pair to be fully usable for outbound comms. Inbound
// auto-detection uses franc (≈400 ISO 639-3 languages); anything franc can't
// detect still works for outbound, driven by the staff member's stored language.
//
// DEFAULT_LANGUAGES are shown in the staff dropdowns out of the box. Admins can
// add more in Settings; we resolve the typed name to a real ISO 639-3 code from
// REFERENCE_LANGUAGES where possible, and fall back to a private-use code
// (qaa–qtz, reserved by ISO 639-3 for local use) for anything not in the catalog.

export interface Language { code: string; name: string }

// ─── Default-visible list (matches the staff dropdown defaults) ────────────────

export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'eng', name: 'English' },
  { code: 'pol', name: 'Polish' },
  { code: 'ron', name: 'Romanian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'tgl', name: 'Tagalog (Filipino)' },
  { code: 'yor', name: 'Yoruba' },
  { code: 'ben', name: 'Bengali' },
  { code: 'urd', name: 'Urdu' },
  { code: 'hin', name: 'Hindi' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'ara', name: 'Arabic' },
  { code: 'som', name: 'Somali' },
  { code: 'swa', name: 'Swahili' },
  { code: 'lit', name: 'Lithuanian' },
  { code: 'guj', name: 'Gujarati' },
  { code: 'pan', name: 'Punjabi' },
  { code: 'tam', name: 'Tamil' },
  { code: 'zho', name: 'Chinese (Mandarin/Cantonese)' },
  { code: 'sin', name: 'Sinhala' },
  { code: 'nep', name: 'Nepali' },
  { code: 'cym', name: 'Welsh' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'kan', name: 'Kannada' },
  { code: 'mal', name: 'Malayalam' },
  { code: 'tel', name: 'Telugu' },
  { code: 'sna', name: 'Shona' },
  // Creoles & related (common in UK care)
  { code: 'mfe', name: 'Mauritian Creole' },
  { code: 'hat', name: 'Haitian Creole' },
  { code: 'crs', name: 'Seychellois Creole' },
  { code: 'kea', name: 'Cape Verdean Creole' },
  { code: 'jam', name: 'Jamaican Patois (Creole)' },
  { code: 'gcf', name: 'Antillean Creole (Guadeloupe/Martinique)' },
  { code: 'pcm', name: 'Nigerian Pidgin' },
]

// ─── Reference catalog (for resolving admin-typed language names) ──────────────
// A broad set of world languages, weighted towards those spoken by UK care staff.
// Used to map a typed name → real ISO 639-3 code so detection & translation are
// optimal. Not all are shown by default; they become visible once added.

export const REFERENCE_LANGUAGES: Language[] = [
  // African
  { code: 'twi', name: 'Twi' },
  { code: 'aka', name: 'Akan' },
  { code: 'ewe', name: 'Ewe' },
  { code: 'gaa', name: 'Ga' },
  { code: 'hau', name: 'Hausa' },
  { code: 'ibo', name: 'Igbo' },
  { code: 'ful', name: 'Fula' },
  { code: 'wol', name: 'Wolof' },
  { code: 'kri', name: 'Krio' },
  { code: 'lin', name: 'Lingala' },
  { code: 'kon', name: 'Kongo' },
  { code: 'lug', name: 'Luganda' },
  { code: 'kik', name: 'Kikuyu' },
  { code: 'luo', name: 'Luo' },
  { code: 'kin', name: 'Kinyarwanda' },
  { code: 'run', name: 'Kirundi' },
  { code: 'nya', name: 'Chichewa (Nyanja)' },
  { code: 'bem', name: 'Bemba' },
  { code: 'zul', name: 'Zulu' },
  { code: 'xho', name: 'Xhosa' },
  { code: 'sot', name: 'Sesotho' },
  { code: 'tsn', name: 'Setswana' },
  { code: 'nbl', name: 'Ndebele' },
  { code: 'ssw', name: 'Swati' },
  { code: 'afr', name: 'Afrikaans' },
  { code: 'orm', name: 'Oromo' },
  { code: 'amh', name: 'Amharic' },
  { code: 'tir', name: 'Tigrinya' },
  { code: 'mlg', name: 'Malagasy' },
  // South & Central Asian
  { code: 'mar', name: 'Marathi' },
  { code: 'ori', name: 'Odia (Oriya)' },
  { code: 'asm', name: 'Assamese' },
  { code: 'kok', name: 'Konkani' },
  { code: 'mai', name: 'Maithili' },
  { code: 'bho', name: 'Bhojpuri' },
  { code: 'pnb', name: 'Western Punjabi' },
  { code: 'pus', name: 'Pashto' },
  { code: 'fas', name: 'Persian (Farsi/Dari)' },
  { code: 'prs', name: 'Dari' },
  { code: 'kur', name: 'Kurdish' },
  { code: 'ckb', name: 'Kurdish (Sorani)' },
  { code: 'kmr', name: 'Kurdish (Kurmanji)' },
  { code: 'tgk', name: 'Tajik' },
  { code: 'div', name: 'Dhivehi' },
  // East & Southeast Asian
  { code: 'cmn', name: 'Mandarin Chinese' },
  { code: 'yue', name: 'Cantonese' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'vie', name: 'Vietnamese' },
  { code: 'tha', name: 'Thai' },
  { code: 'lao', name: 'Lao' },
  { code: 'khm', name: 'Khmer' },
  { code: 'mya', name: 'Burmese' },
  { code: 'ind', name: 'Indonesian' },
  { code: 'msa', name: 'Malay' },
  { code: 'ceb', name: 'Cebuano' },
  { code: 'ilo', name: 'Ilocano' },
  { code: 'hil', name: 'Hiligaynon' },
  { code: 'war', name: 'Waray' },
  { code: 'mon', name: 'Mongolian' },
  // Middle East
  { code: 'heb', name: 'Hebrew' },
  { code: 'tur', name: 'Turkish' },
  { code: 'aze', name: 'Azerbaijani' },
  { code: 'kaz', name: 'Kazakh' },
  { code: 'uzb', name: 'Uzbek' },
  { code: 'kir', name: 'Kyrgyz' },
  { code: 'tuk', name: 'Turkmen' },
  // European
  { code: 'rus', name: 'Russian' },
  { code: 'ukr', name: 'Ukrainian' },
  { code: 'bel', name: 'Belarusian' },
  { code: 'bul', name: 'Bulgarian' },
  { code: 'ces', name: 'Czech' },
  { code: 'slk', name: 'Slovak' },
  { code: 'hun', name: 'Hungarian' },
  { code: 'hrv', name: 'Croatian' },
  { code: 'srp', name: 'Serbian' },
  { code: 'bos', name: 'Bosnian' },
  { code: 'slv', name: 'Slovenian' },
  { code: 'mkd', name: 'Macedonian' },
  { code: 'sqi', name: 'Albanian' },
  { code: 'ell', name: 'Greek' },
  { code: 'nld', name: 'Dutch' },
  { code: 'swe', name: 'Swedish' },
  { code: 'nor', name: 'Norwegian' },
  { code: 'dan', name: 'Danish' },
  { code: 'fin', name: 'Finnish' },
  { code: 'est', name: 'Estonian' },
  { code: 'lav', name: 'Latvian' },
  { code: 'isl', name: 'Icelandic' },
  { code: 'gle', name: 'Irish' },
  { code: 'gla', name: 'Scottish Gaelic' },
  { code: 'cat', name: 'Catalan' },
  { code: 'eus', name: 'Basque' },
  { code: 'glg', name: 'Galician' },
  { code: 'mlt', name: 'Maltese' },
  { code: 'ltz', name: 'Luxembourgish' },
  { code: 'fry', name: 'Frisian' },
  // Pacific & other
  { code: 'mri', name: 'Māori' },
  { code: 'smo', name: 'Samoan' },
  { code: 'ton', name: 'Tongan' },
  { code: 'fij', name: 'Fijian' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'cha', name: 'Chamorro' },
  { code: 'hmn', name: 'Hmong' },
]

// Full catalog = defaults + reference (deduped by code, defaults win on name).
const CATALOG: Language[] = (() => {
  const byCode = new Map<string, Language>()
  for (const l of [...DEFAULT_LANGUAGES, ...REFERENCE_LANGUAGES]) {
    if (!byCode.has(l.code)) byCode.set(l.code, l)
  }
  return [...byCode.values()]
})()

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(CATALOG.map(l => [l.code, l.name]))

// name (lowercased) → code, including a handful of common aliases.
const NAME_TO_CODE: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const l of CATALOG) m[l.name.toLowerCase()] = l.code
  const aliases: Record<string, string> = {
    'filipino': 'tgl', 'tagalog': 'tgl', 'pilipino': 'tgl',
    'mandarin': 'cmn', 'cantonese': 'yue', 'chinese': 'zho',
    'farsi': 'fas', 'persian': 'fas', 'dari': 'prs',
    'panjabi': 'pan', 'oriya': 'ori', 'odia': 'ori',
    'nyanja': 'nya', 'chichewa': 'nya', 'chewa': 'nya',
    'fulani': 'ful', 'fulfulde': 'ful', 'pulaar': 'ful',
    'twi': 'twi', 'akan': 'aka',
    'sesotho': 'sot', 'sotho': 'sot', 'setswana': 'tsn', 'tswana': 'tsn',
    'kurdish': 'kur', 'sorani': 'ckb', 'kurmanji': 'kmr',
    'maori': 'mri', 'greek': 'ell', 'flemish': 'nld',
    'tigrigna': 'tir', 'amharic': 'amh',
    'punjabi (western)': 'pnb', 'mirpuri': 'pnb', 'pahari': 'pnb',
  }
  return { ...m, ...aliases }
})()

// Private-use range qaa–qtz (ISO 639-3 reserves these for local use).
function* privateUseCodes(): Generator<string> {
  for (let a = 0; a < 20; a++) {            // second letter a..t
    for (let b = 0; b < 26; b++) {          // third letter a..z
      yield 'q' + String.fromCharCode(97 + a) + String.fromCharCode(97 + b)
    }
  }
}

// ─── Public helpers ────────────────────────────────────────────────────────────

// The tenant's effective language list = defaults + their custom additions.
export function effectiveLanguages(custom?: unknown): Language[] {
  const customList = Array.isArray(custom)
    ? (custom as any[]).filter(c => c && typeof c.code === 'string' && typeof c.name === 'string')
    : []
  const seen = new Set(DEFAULT_LANGUAGES.map(l => l.code))
  const merged: Language[] = [...DEFAULT_LANGUAGES]
  for (const c of customList) {
    if (!seen.has(c.code)) { merged.push({ code: c.code, name: c.name }); seen.add(c.code) }
  }
  return merged
}

// Human-readable name for a code (catalog first, then the code itself).
export function languageNameForCode(code: string, custom?: unknown): string {
  if (CODE_TO_NAME[code]) return CODE_TO_NAME[code]
  const customList = Array.isArray(custom) ? (custom as any[]) : []
  const hit = customList.find(c => c && c.code === code)
  return (hit && typeof hit.name === 'string') ? hit.name : code
}

// Resolve an admin-typed language name to a {code, name, resolved} entry.
// `resolved` = true when matched to a real ISO 639-3 code; false = private-use code.
export function resolveLanguageName(rawName: string, takenCodes: Set<string>): { code: string; name: string; resolved: boolean } | null {
  const name = rawName.trim().replace(/\s+/g, ' ')
  if (!name) return null
  const known = NAME_TO_CODE[name.toLowerCase()]
  if (known) {
    // Use the catalog's canonical name for a known code.
    return { code: known, name: CODE_TO_NAME[known] ?? name, resolved: true }
  }
  // Unknown name → assign the next free private-use code.
  for (const code of privateUseCodes()) {
    if (!takenCodes.has(code)) return { code, name, resolved: false }
  }
  return { code: 'qaa', name, resolved: false }
}
