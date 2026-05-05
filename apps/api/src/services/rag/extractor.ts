import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

// §4.1.1 — Text extraction from PDF, DOCX, and plain text.
// §4.6.2 — Header/footer stripping applied to all document types before chunking.

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
// §4.6.2 — "After text extraction and header/footer stripping"
//
// Strategy: lines that appear identically ≥ REPEAT_THRESHOLD times across the
// document are almost certainly repeating headers or footers (e.g. "Sunrise Care
// Home — Confidential", "Page 1 of 24"). We remove them.
//
// Also strips common page-break artefacts and normalises excessive whitespace.

const REPEAT_THRESHOLD = 4   // a line appearing this many times is treated as a header/footer
const MAX_HEADER_FOOTER_LEN = 120  // only short lines are candidates

export function stripHeadersFooters(text: string): string {
  const lines = text.split('\n')

  // Count exact occurrences of each short line
  const frequency = new Map<string, number>()
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed.length <= MAX_HEADER_FOOTER_LEN) {
      frequency.set(trimmed, (frequency.get(trimmed) ?? 0) + 1)
    }
  }

  // Build set of lines to remove
  const toRemove = new Set<string>()
  for (const [line, count] of frequency) {
    if (count >= REPEAT_THRESHOLD) {
      toRemove.add(line)
    }
  }

  // Filter and clean
  const cleaned = lines
    .filter(line => !toRemove.has(line.trim()))
    .join('\n')

  return normaliseWhitespace(cleaned)
}

// Collapse runs of blank lines to a single blank line; trim leading/trailing space
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')          // trailing whitespace per line
    .replace(/\n{3,}/g, '\n\n')        // max two consecutive newlines
    .trim()
}
