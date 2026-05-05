import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { stripHeadersFooters as _strip, normaliseWhitespace } from './stripper'

// §4.1.1 — Text extraction from PDF, DOCX, and plain text.
// §4.6.2 — Header/footer stripping delegated to stripper.ts.

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number]

export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType)
}

// ─── Extraction ───────────────────────────────────────────────────────────────

export async function extractText(buffer: Buffer, mimeType: SupportedMimeType): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractFromPdf(buffer)

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer)

    case 'text/plain':
      return buffer.toString('utf-8')
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer)
  return result.text
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

// ─── Header / footer stripping ────────────────────────────────────────────────
// §4.6.2 — Three-pass algorithm in stripper.ts:
//   1. Pattern pass  (care-document artefacts, page numbers, stamps)
//   2. PDF page-zone pass  (header/footer zones via \f boundaries, ≥40% pages)
//   3. Frequency pass  (catch-all: any short line appearing ≥4 times)

export { normaliseWhitespace } from './stripper'
export function stripHeadersFooters(text: string): string {
  return _strip(text)
}
