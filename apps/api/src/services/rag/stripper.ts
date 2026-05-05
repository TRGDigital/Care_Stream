// §4.1.1 / §4.6.2 — Header and footer stripping for policy documents.
//
// Three-pass strategy:
//   1. Pattern pass  — removes known care-document artefacts (page numbers,
//                      confidentiality stamps, metadata lines) regardless of
//                      document type.
//   2. PDF page pass — uses form-feed boundaries to identify per-page header
//                      and footer zones; removes lines present on ≥ 40 % of
//                      pages.  Only runs when the raw text contains form feeds
//                      (i.e. the PDF was extracted with page separators).
//   3. Frequency pass — removes any remaining short line that appears ≥ 4 times
//                       in the full document (catches repeating headers/footers
//                       missed by the two passes above, and handles DOCX/TXT
//                       where there are no form feeds).
//
// Then normaliseWhitespace collapses blank lines and trims.

// ─── Pattern-based removal ─────────────────────────────────────────────────────
// These regexes match line-level artefacts that are structurally meaningless
// for RAG chunking.

const ARTEFACT_PATTERNS: RegExp[] = [
  // Page numbers — "Page 3 of 24", "3 / 24", "3/24", lone digit(s) on a line
  /^page\s+\d+\s+of\s+\d+$/i,
  /^\d+\s*\/\s*\d+$/,
  /^\d+$/,

  // Confidentiality / document-control stamps
  /^confidential$/i,
  /^strictly\s+confidential$/i,
  /^private\s+and\s+confidential$/i,
  /^draft$/i,
  /^controlled\s+document$/i,
  /^uncontrolled\s+when\s+printed$/i,
  /^not\s+for\s+distribution$/i,
  /^for\s+internal\s+use\s+only$/i,

  // Common care-document metadata lines (key: value or key alone)
  /^review\s+date\s*:/i,
  /^next\s+review\s*:/i,
  /^version\s*:/i,
  /^version\s+\d/i,
  /^policy\s+ref(erence)?\s*:/i,
  /^document\s+(ref|number|no\.?)\s*:/i,
  /^authoris[e|z]d\s+by\s*:/i,
  /^approved\s+by\s*:/i,
  /^owner\s*:/i,
  /^last\s+updated?\s*:/i,
  /^date\s+(of\s+)?(issue|review|approval)\s*:/i,
  /^issuing\s+(department|manager)\s*:/i,
  /^status\s*:\s*(draft|final|approved|active|archived)/i,

  // Copyright / organisational footers
  /^©\s*\d{4}/,
  /^copyright\s+©?\s*\d{4}/i,
  /^all\s+rights\s+reserved/i,

  // Visual divider lines (---, ===, ___, ###, ···)
  /^[-=_#·]{3,}$/,
]

function isArtefactLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length === 0) return false
  for (const re of ARTEFACT_PATTERNS) {
    if (re.test(trimmed)) return true
  }
  return false
}

// ─── PDF page-boundary analysis ───────────────────────────────────────────────
// pdf-parse outputs a form-feed character (\f = \x0C) between pages.
// We use that to extract the first and last N non-empty lines of each page,
// then flag any line present in those zones on ≥ PAGE_FREQUENCY_THRESHOLD
// fraction of pages.

const ZONE_LINES       = 3    // lines from top / bottom to inspect per page
const PAGE_THRESHOLD   = 0.40 // line must appear on ≥ 40 % of pages to be removed

function stripPdfPageZones(text: string): string {
  const pages = text.split('\f')
  if (pages.length < 2) return text  // no page separators — nothing to do

  const candidateFrequency = new Map<string, number>()

  for (const page of pages) {
    const lines = page.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    const topLines    = lines.slice(0, ZONE_LINES)
    const bottomLines = lines.slice(-ZONE_LINES)
    const zoneSet     = new Set([...topLines, ...bottomLines])

    for (const line of zoneSet) {
      if (line.length > 0 && line.length <= 150) {
        candidateFrequency.set(line, (candidateFrequency.get(line) ?? 0) + 1)
      }
    }
  }

  const pageCount = pages.length
  const toRemove  = new Set<string>()
  for (const [line, count] of candidateFrequency) {
    if (count / pageCount >= PAGE_THRESHOLD) {
      toRemove.add(line)
    }
  }

  if (toRemove.size === 0) return text

  // Rebuild text, dropping matched lines but preserving page structure
  return pages
    .map(page =>
      page
        .split('\n')
        .filter(l => !toRemove.has(l.trim()))
        .join('\n')
    )
    .join('\f')
}

// ─── Frequency-based fallback ─────────────────────────────────────────────────
// For documents without form feeds (DOCX, TXT, or sparse PDFs), any short line
// appearing ≥ REPEAT_THRESHOLD times is almost certainly a running header/footer.

const REPEAT_THRESHOLD      = 4
const MAX_CANDIDATE_LENGTH  = 120

function stripRepeatingLines(text: string): string {
  const lines = text.split('\n')

  const frequency = new Map<string, number>()
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length <= MAX_CANDIDATE_LENGTH) {
      frequency.set(trimmed, (frequency.get(trimmed) ?? 0) + 1)
    }
  }

  const toRemove = new Set<string>()
  for (const [line, count] of frequency) {
    if (count >= REPEAT_THRESHOLD) {
      toRemove.add(line)
    }
  }

  if (toRemove.size === 0) return text

  return lines
    .filter(l => !toRemove.has(l.trim()))
    .join('\n')
}

// ─── Whitespace normalisation ─────────────────────────────────────────────────

export function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')          // CRLF → LF
    .replace(/\f/g, '\n')            // form feeds → newlines (done after page analysis)
    .replace(/[ \t]+$/gm, '')        // trailing spaces per line
    .replace(/\n{3,}/g, '\n\n')      // max two consecutive blank lines
    .trim()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function stripHeadersFooters(text: string): string {
  // Pass 1 — pattern-based artefact removal
  const afterPatterns = text
    .split('\n')
    .filter(l => !isArtefactLine(l))
    .join('\n')

  // Pass 2 — PDF page-zone analysis (no-op if no form feeds)
  const afterPageZones = stripPdfPageZones(afterPatterns)

  // Pass 3 — frequency-based catch-all
  const afterFrequency = stripRepeatingLines(afterPageZones)

  return normaliseWhitespace(afterFrequency)
}
