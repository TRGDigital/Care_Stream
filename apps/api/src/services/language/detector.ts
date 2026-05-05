// §5.1 — Language detection using franc (ISO 639-3 codes).
// franc v6 is ESM-only; loaded via dynamic import for CJS compatibility.
//
// Three language interaction patterns (§5.3):
//   1 — Query is English, no explicit language request → respond in English
//   2 — Query is English, explicit language request    → respond in requested language
//   3 — Query is non-English                           → respond in detected language
//
// If detection confidence < MIN_CONFIDENCE, default to English (pattern 1).

const MIN_CONFIDENCE = 0.5

// Phrases that indicate the staff member wants a reply in a specific language.
// Matched case-insensitively against the query text.
const EXPLICIT_LANGUAGE_REQUEST_RE =
  /\b(?:reply|respond|answer|write|translate|send|give (?:me|the response))(?: (?:back|it|me|the (?:reply|response|answer)))? in (?:the )?([a-z]+)\b/i

// Map of ISO 639-3 codes → human-readable English language name for prompt injection.
const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'English',
  pol: 'Polish',
  ron: 'Romanian',
  por: 'Portuguese',
  fil: 'Filipino',
  tgl: 'Tagalog',
  yor: 'Yoruba',
  hin: 'Hindi',
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
}

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}

// Dynamic import cache — loaded once, reused across calls.
let francAllFn: ((text: string, options?: object) => [string, number][]) | null = null

async function getFrancAll() {
  if (francAllFn) return francAllFn
  const mod  = await import('franc')
  francAllFn = mod.francAll as typeof francAllFn
  return francAllFn!
}

export interface LanguageDetection {
  code:       string    // ISO 639-3 code
  confidence: number    // 0–1
  name:       string    // human-readable name for prompt injection
}

export async function detectLanguage(text: string): Promise<LanguageDetection> {
  if (!text.trim()) return { code: 'eng', confidence: 1, name: 'English' }

  try {
    const francAll = await getFrancAll()
    const results  = francAll(text, { minLength: 10 })

    if (results.length === 0) {
      return { code: 'eng', confidence: 0, name: 'English' }
    }

    const [code, confidence] = results[0]

    if (confidence < MIN_CONFIDENCE || code === 'und') {
      return { code: 'eng', confidence, name: 'English' }
    }

    return { code, confidence, name: languageName(code) }
  } catch {
    return { code: 'eng', confidence: 0, name: 'English' }
  }
}

// §5.3 — Determine which language pattern applies for prompt construction.
export function resolveLanguagePattern(
  detected:  LanguageDetection,
  queryText: string,
): { pattern: 1 | 2 | 3; requestedLanguage?: string } {
  // Pattern 3: query was written in a non-English language
  if (detected.code !== 'eng' && detected.confidence >= MIN_CONFIDENCE) {
    return { pattern: 3, requestedLanguage: detected.name }
  }

  // Pattern 2: query is English but explicitly asks for a different language
  const match = EXPLICIT_LANGUAGE_REQUEST_RE.exec(queryText)
  if (match) {
    const requested = match[1]
    // Only apply if the requested language isn't English
    if (!/^english$/i.test(requested)) {
      return { pattern: 2, requestedLanguage: requested }
    }
  }

  // Pattern 1: English in, English out
  return { pattern: 1 }
}
