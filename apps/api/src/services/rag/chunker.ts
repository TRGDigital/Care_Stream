// §4.1.1 — Text chunking: ~500 tokens, 10% overlap.
// §4.6.2 — Chapter-boundary-aware chunking for staff_handbook documents.
//
// Token estimation: 1 token ≈ 4 characters (English prose).
// Target: 500 tokens (2 000 chars). Overlap: 50 tokens (200 chars, 10%).
//
// Strategy:
//  - Split text into paragraphs. If a paragraph exceeds 1.5× target, split
//    further by sentence.
//  - Accumulate segments into a buffer until the target is reached.
//  - Carry the last OVERLAP_CHARS of the previous chunk into the next one.
//  - For handbooks: chunk each chapter independently so chunk boundaries
//    never straddle a chapter break.

import { detectTOC } from './toc-detector'
import type { ChapterBoundary } from './toc-detector'

export type { ChapterBoundary, TocResult } from './toc-detector'
export { detectTOC } from './toc-detector'

const CHARS_PER_TOKEN = 4
const TARGET_TOKENS   = 500
const OVERLAP_TOKENS  = 50

const TARGET_CHARS    = TARGET_TOKENS  * CHARS_PER_TOKEN   // 2 000
const OVERLAP_CHARS   = OVERLAP_TOKENS * CHARS_PER_TOKEN   // 200

export interface Chunk {
  text:            string
  chunkIndex:      number
  chapterTitle?:   string
  sectionHeading?: string
}

export interface ChunkOptions {
  targetTokens?:  number
  overlapTokens?: number
}

// ─── Segment splitting ────────────────────────────────────────────────────────

function splitIntoSegments(text: string, maxSegmentChars: number): string[] {
  const segments: string[] = []

  for (const para of text.split(/\n\n+/)) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (trimmed.length <= maxSegmentChars) {
      segments.push(trimmed)
    } else {
      // Paragraph is too large — split on sentence boundaries
      const sentences = trimmed
        .replace(/([.?!])\s+/g, '$1\n')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
      segments.push(...sentences)
    }
  }

  return segments
}

// ─── Core chunk builder ───────────────────────────────────────────────────────

function buildChunks(
  segments:     string[],
  startIndex:   number,
  targetChars:  number,
  overlapChars: number,
  chapterTitle?: string,
): Chunk[] {
  const chunks: Chunk[] = []
  let buffer      = ''
  let overlapTail = ''
  let idx         = startIndex

  for (const segment of segments) {
    const wouldBeSize = overlapTail.length + buffer.length + segment.length + 2

    if (wouldBeSize > targetChars && buffer.length > 0) {
      const emitted = (overlapTail + (overlapTail ? '\n\n' : '') + buffer).trim()
      chunks.push({ text: emitted, chunkIndex: idx++, chapterTitle })
      overlapTail = emitted.slice(-overlapChars)
      buffer      = ''
    }

    buffer += (buffer ? '\n\n' : '') + segment
  }

  if (buffer.trim()) {
    chunks.push({
      text:        (overlapTail + (overlapTail ? '\n\n' : '') + buffer).trim(),
      chunkIndex:  idx++,
      chapterTitle,
    })
  }

  return chunks
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Standard chunking for internal_policy documents.
export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const targetChars  = (options?.targetTokens  ?? TARGET_TOKENS)  * CHARS_PER_TOKEN
  const overlapChars = (options?.overlapTokens ?? OVERLAP_TOKENS) * CHARS_PER_TOKEN
  const segments     = splitIntoSegments(text, targetChars * 1.5)
  return buildChunks(segments, 0, targetChars, overlapChars)
}

// Chapter-boundary-aware chunking for staff_handbook (§4.6.2).
// Each chapter is chunked independently so chunks never straddle a chapter break.
export function chunkHandbook(
  text:     string,
  chapters: ChapterBoundary[],
  options?: ChunkOptions,
): Chunk[] {
  const targetChars  = (options?.targetTokens  ?? TARGET_TOKENS)  * CHARS_PER_TOKEN
  const overlapChars = (options?.overlapTokens ?? OVERLAP_TOKENS) * CHARS_PER_TOKEN

  if (chapters.length === 0) {
    // No chapter structure — fall back to standard chunking
    const segments = splitIntoSegments(text, targetChars * 1.5)
    return buildChunks(segments, 0, targetChars, overlapChars)
  }

  const allChunks: Chunk[] = []

  // Chunk any preamble that appears before the first detected chapter
  if (chapters[0].startOffset > 0) {
    const preamble  = text.slice(0, chapters[0].startOffset).trim()
    if (preamble) {
      const segs = splitIntoSegments(preamble, targetChars * 1.5)
      allChunks.push(...buildChunks(segs, 0, targetChars, overlapChars))
    }
  }

  for (const chapter of chapters) {
    const body = text.slice(chapter.startOffset, chapter.endOffset).trim()
    if (!body) continue
    const segs = splitIntoSegments(body, targetChars * 1.5)
    allChunks.push(...buildChunks(segs, allChunks.length, targetChars, overlapChars, chapter.title))
  }

  // Re-sequence chunk indices to be globally unique within the document
  allChunks.forEach((c, i) => { c.chunkIndex = i })

  return allChunks
}
