// §5.1 — Language detection using franc (ISO 639-3 codes).
// franc v6 is ESM-only; loaded via dynamic import for CJS compatibility.
//
// Three language interaction patterns (§5.3):
//   1 — Query is English, no explicit language request  → respond in English
//   2 — Query is English, explicit language request     → respond in requested language
//   3 — Query is non-English                            → respond in detected language
//
// If detection confidence < MIN_CONFIDENCE the system defaults to English and
// sets lowConfidence: true so the caller can flag the query for review (§5.1).

const MIN_CONFIDENCE = 0.5

// ─── Explicit language-request patterns (Pattern 2) ───────────────────────────
//
// Matches phrases like:
//   "please reply in Hindi"       → "Hindi"
//   "respond in Polish please"    → "Polish"
//   "answer in Mandarin Chinese"  → "Mandarin Chinese"
//   "in Romanian please"          → "Romanian"
//   "send it back in Tagalog"     → "Tagalog"
//   "write the response in Urdu"  → "Urdu"

// Form A: verb-led — "reply/respond/answer/... [0–3 filler words] in <Language>"
// Allows fillers like "it back", "the response" between verb and "in".
// Terminates at please/thanks/end-of-string/sentence punctuation.
const VERB_LED_RE =
  /\b(?:reply|respond|answer|write|translate|send|give\s+(?:me|the\s+response))(?:\s+(?!in\b)\w+){0,3}\s+in\s+([A-Za-z]+(?:\s+(?!please\b|thanks\b|thank\b)[A-Za-z]+)?)(?:\s+(?:please|thanks|thank\s+you)|[.,?!]|$)/i

// Form B: "in <Language> please/thanks" — requires explicit politeness marker so
// "in detail" and "in practice" don't produce false positives.
const IN_LED_RE =
  /\bin\s+([A-Za-z]+(?:\s+(?!please\b|thanks\b|thank\b)[A-Za-z]+)?)\s*(?:please|thanks|thank\s+you)/i

// ─── ISO 639-3 code → human-readable English name ─────────────────────────────
// Common languages in UK care settings highlighted (§5.2 note).

const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'English',
  pol: 'Polish',       // common in UK care
  ron: 'Romanian',     // common in UK care
  por: 'Portuguese',   // common in UK care
  fil: 'Filipino',     // common in UK care
  tgl: 'Tagalog',      // common in UK care
  yor: 'Yoruba',       // common in UK care
  hin: 'Hindi',        // common in UK care
  fra: 'French',
  deu: 'German',
  spa: 'Spanish',
  ita: 'Italian',
  nld: 'Dutch',
  swe: 'Swedish',
  nor: 'Norwegian',
  cmn: 'Mandarin Chinese',
  zho: 'Chinese',
  ara: 'Arabic',
  ben: 'Bengali',
  urd: 'Urdu',
  swa: 'Swahili',
  lit: 'Lithuanian',
  lav: 'Latvian',
  ces: 'Czech',
  slk: 'Slovak',
  bul: 'Bulgarian',
  hrv: 'Croatian',
  srp: 'Serbian',
  hun: 'Hungarian',
  ell: 'Greek',
  tur: 'Turkish',
  vie: 'Vietnamese',
  som: 'Somali',
  tir: 'Tigrinya',
  amh: 'Amharic',
  pnb: 'Punjabi',
  guj: 'Gujarati',
  tam: 'Tamil',
  tel: 'Telugu',
  sin: 'Sinhala',
  nep: 'Nepali',
  hat: 'Haitian Creole',
  mfe: 'Mauritian Creole',
  crs: 'Seychellois Creole',
  kea: 'Cape Verdean Creole',
  jam: 'Jamaican Patois',
  gcf: 'Antillean Creole',
  pcm: 'Nigerian Pidgin',
  cym: 'Welsh',
}

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}

// Capitalise the first letter of each word — language names are proper nouns.
function titleCase(str: string): string {
  return str.trim().replace(/\b\w/g, c => c.toUpperCase())
}

// ─── franc dynamic import ─────────────────────────────────────────────────────

type FrancAllFn = (text: string, options?: { minLength?: number }) => [string, number][]
let francAllFn: FrancAllFn | null = null

async function getFrancAll(): Promise<FrancAllFn> {
  if (francAllFn) return francAllFn
  const mod  = await import('franc')
  francAllFn = mod.francAll as FrancAllFn
  return francAllFn
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LanguageDetection {
  code:          string   // ISO 639-3 code (defaults to 'eng' on failure)
  confidence:    number   // 0–1 probability from franc
  name:          string   // human-readable English name for prompt injection
  lowConfidence: boolean  // true = below threshold, defaulted to English (§5.1)
}

// ─── detectLanguage ───────────────────────────────────────────────────────────

export async function detectLanguage(text: string): Promise<LanguageDetection> {
  if (!text.trim()) {
    return { code: 'eng', confidence: 1, name: 'English', lowConfidence: false }
  }

  try {
    const francAll = await getFrancAll()
    const results  = francAll(text, { minLength: 10 })

    if (results.length === 0 || results[0][0] === 'und') {
      return { code: 'eng', confidence: 0, name: 'English', lowConfidence: true }
    }

    const [code, confidence] = results[0]

    if (confidence < MIN_CONFIDENCE) {
      // §5.1 — below threshold: default to English, flag for review
      return { code: 'eng', confidence, name: 'English', lowConfidence: true }
    }

    // franc frequently misidentifies short English text as Scots (sco) or Afrikaans (afr)
    // due to lexical overlap. In a UK care setting treat these as English.
    const ENGLISH_ADJACENT = new Set(['sco', 'afr', 'ang'])
    if (ENGLISH_ADJACENT.has(code)) {
      return { code: 'eng', confidence, name: 'English', lowConfidence: false }
    }

    return { code, confidence, name: languageName(code), lowConfidence: false }

  } catch (err) {
    console.error('[lang] franc detection error:', err)
    return { code: 'eng', confidence: 0, name: 'English', lowConfidence: true }
  }
}

// ─── resolveLanguagePattern ───────────────────────────────────────────────────

export interface LanguageResolution {
  pattern:           1 | 2 | 3
  requestedLanguage?: string   // language name for prompt injection (patterns 2 & 3)
}

export function resolveLanguagePattern(
  detected:  LanguageDetection,
  queryText: string,
): LanguageResolution {
  // Pattern 3 — query is non-English with sufficient confidence
  if (detected.code !== 'eng' && !detected.lowConfidence) {
    return { pattern: 3, requestedLanguage: detected.name }
  }

  // Pattern 2 — English query with explicit language request
  const requestedLang = extractExplicitLanguageRequest(queryText)
  if (requestedLang && !/^english$/i.test(requestedLang)) {
    return { pattern: 2, requestedLanguage: titleCase(requestedLang) }
  }

  // Pattern 1 — English in, English out
  return { pattern: 1 }
}

// ─── Explicit language request extraction ─────────────────────────────────────

function extractExplicitLanguageRequest(text: string): string | null {
  // Try verb-led form first ("reply in Hindi")
  const verbMatch = VERB_LED_RE.exec(text)
  if (verbMatch?.[1]) return verbMatch[1].trim()

  // Try "in <Language> please" form
  const inMatch = IN_LED_RE.exec(text)
  if (inMatch?.[1]) return inMatch[1].trim()

  return null
}
