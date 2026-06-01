import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import AdmZip from 'adm-zip'

// §4.1.1 — Text extraction from PDF, DOCX, ODT, and plain text.
// §4.6.2 — Header/footer stripping delegated to stripper.ts.

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
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
    case 'application/vnd.oasis.opendocument.text':
      return extractFromOdt(buffer)
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

function extractFromOdt(buffer: Buffer): string {
  // ODT is a ZIP archive; text lives in content.xml
  const zip = new AdmZip(buffer)
  const entry = zip.getEntry('content.xml')
  if (!entry) throw new Error('Invalid ODT: content.xml not found')

  const xml = entry.getData().toString('utf-8')

  return xml
    // paragraph/heading/list boundaries → newline
    .replace(/<text:h[^>]*>/gi, '\n')
    .replace(/<text:p[^>]*>/gi, '\n')
    .replace(/<text:list-item[^>]*>/gi, '\n')
    .replace(/<text:line-break(?:[^>]*)>/gi, '\n')
    .replace(/<text:tab(?:[^>]*)>/gi, '\t')
    // strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // decode XML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // normalise whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Header / footer stripping ────────────────────────────────────────────────
// §4.6.2 — Three-pass algorithm in stripper.ts:
//   1. Pattern pass  (care-document artefacts, page numbers, stamps)
//   2. PDF page-zone pass  (header/footer zones via \f boundaries, ≥40% pages)
//   3. Frequency pass  (catch-all: any short line appearing ≥4 times)

// Header/footer stripping + whitespace normalisation live in ./stripper —
// import them directly from there (this module no longer re-exports them).
