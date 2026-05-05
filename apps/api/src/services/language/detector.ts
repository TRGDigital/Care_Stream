// §5.1 — Language detection using franc (ISO 639-3 codes)
// If confidence below threshold → default to English, flag query for review
// Determines which of the three language patterns applies (§5.3)
export function detectLanguage(_text: string): { code: string; confidence: number } {
  throw new Error('Not implemented')
}

export function resolveLanguagePattern(_detected: string, _queryText: string): 1 | 2 | 3 {
  throw new Error('Not implemented')
}
