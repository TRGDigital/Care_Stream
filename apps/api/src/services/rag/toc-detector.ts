// §4.6.2 — TOC detection for staff handbook ingestion.
// Used to identify chapter boundaries so the chunker can respect them.
//
// Two strategies, tried in order:
//  1. Explicit TOC block — a "Contents" / "Table of Contents" section at the
//     start of the document, with lines like "1. Introduction ........ 3".
//     If found, chapter titles are located in the body text to give accurate
//     character offsets.
//  2. Structural heading detection — no explicit TOC but the body has
//     consistently formatted headings (short, capitalised, optionally numbered).
//
// Returns { detected: true } only when an explicit TOC block was found.
// Chapters are returned regardless — the caller uses them for chunk boundaries.

export interface TocEntry {
  title:       string
  pageNumber?: number
}

export interface ChapterBoundary {
  title:       string
  startOffset: number
  endOffset:   number   // exclusive; last chapter extends to end of text
  pageStart?:  number   // page number from TOC (if available)
  pageEnd?:    number
  tocIndex:    number
}

export interface TocResult {
  detected: boolean          // true = explicit TOC block was found
  chapters: ChapterBoundary[]
}

// Matches lines like:
//   "1. Introduction ............. 3"
//   "Welcome to the Handbook ..... 3"
//   "  2.1 Working Hours ......... 8"
const TOC_ENTRY_RE = /^[\s\d.]*(.+?)[\s.]{2,}(\d{1,4})\s*$/

function looksLikeTocEntry(line: string): boolean {
  return TOC_ENTRY_RE.test(line.trim())
}

function extractTocEntry(line: string): TocEntry | null {
  const m = TOC_ENTRY_RE.exec(line.trim())
  if (!m) return null
  return { title: m[1].trim(), pageNumber: parseInt(m[2], 10) }
}

// Search the opening 15 % of the document (or first 10 000 chars) for a TOC block.
function findTocBlock(text: string): TocEntry[] {
  const preamble = text.slice(0, Math.min(Math.floor(text.length * 0.15), 10_000))
  const lines    = preamble.split('\n')

  // Locate the "Contents" / "Table of Contents" header
  let tocStartLine = -1
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim().toLowerCase()
    if (t === 'contents' || t === 'table of contents' || t === 'content') {
      tocStartLine = i
      break
    }
  }

  // Fallback: find the first run of 3+ consecutive TOC-entry lines
  if (tocStartLine === -1) {
    for (let i = 0; i + 2 < lines.length; i++) {
      if (
        looksLikeTocEntry(lines[i]) &&
        looksLikeTocEntry(lines[i + 1]) &&
        looksLikeTocEntry(lines[i + 2])
      ) {
        tocStartLine = i
        break
      }
    }
  }

  if (tocStartLine === -1) return []

  const entries: TocEntry[] = []
  let consecutiveNonEntries = 0

  for (let i = tocStartLine + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.length === 0) continue

    const entry = extractTocEntry(line)
    if (entry) {
      entries.push(entry)
      consecutiveNonEntries = 0
    } else {
      consecutiveNonEntries++
      if (consecutiveNonEntries > 3) break  // end of TOC block
    }
  }

  return entries
}

// Locate each TOC title as a standalone heading line in the body text.
function locateChapters(text: string, entries: TocEntry[]): ChapterBoundary[] {
  const chapters: ChapterBoundary[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    // Escape regex special chars in the title
    const escaped = entry.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Allow optional leading section number and trailing whitespace
    const re    = new RegExp(`^(?:\\d+\\.?\\s+)?${escaped}\\s*$`, 'mi')
    const match = re.exec(text)

    if (match) {
      chapters.push({
        title:       entry.title,
        startOffset: match.index,
        endOffset:   text.length,
        pageStart:   entry.pageNumber,
        tocIndex:    i,
      })
    }
  }

  // Sort by position in case the heading search returned them out of order
  chapters.sort((a, b) => a.startOffset - b.startOffset)

  // Fill in endOffset and pageEnd from the next chapter
  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].endOffset = chapters[i + 1].startOffset
    if (chapters[i + 1].pageStart !== undefined) {
      chapters[i].pageEnd = chapters[i + 1].pageStart! - 1
    }
  }

  return chapters
}

// Structural heading detection used when there is no explicit TOC.
// A heading is: short (<= 80 chars), starts with a capital or digit,
// does not end with sentence-ending punctuation, and is followed by a blank line.
function detectBodyHeadings(text: string): ChapterBoundary[] {
  const lines    = text.split('\n')
  const chapters: ChapterBoundary[] = []
  let offset     = 0

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trim()

    const looksLikeHeading =
      trimmed.length >= 4 &&
      trimmed.length <= 80 &&
      /^(?:\d+\.?\s+)?[A-Z]/.test(trimmed) &&
      !/[,;]$/.test(trimmed) &&
      !/^\d+$/.test(trimmed)           // not a bare page number

    // Only treat as heading if followed by a blank line or another heading-like line
    const nextLine = lines[i + 1]?.trim() ?? ''
    const followedByBlank = nextLine.length === 0

    if (looksLikeHeading && followedByBlank) {
      chapters.push({
        title:       trimmed,
        startOffset: offset,
        endOffset:   text.length,
        tocIndex:    chapters.length,
      })
    }

    offset += line.length + 1  // +1 for the \n
  }

  // Not enough headings to be meaningful
  if (chapters.length < 3) return []

  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].endOffset = chapters[i + 1].startOffset
  }

  return chapters
}

export function detectTOC(text: string): TocResult {
  const tocEntries = findTocBlock(text)

  if (tocEntries.length >= 3) {
    const chapters = locateChapters(text, tocEntries)
    if (chapters.length >= 2) {
      return { detected: true, chapters }
    }
  }

  // Fallback: structural heading detection (no explicit TOC)
  const chapters = detectBodyHeadings(text)
  return { detected: false, chapters }
}
