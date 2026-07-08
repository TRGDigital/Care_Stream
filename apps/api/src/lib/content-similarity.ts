// Near-duplicate detection for policy content.
// We compare the extracted TEXT of policies (not their filenames), so two policies
// with different names but the same content (e.g. "Holiday Policy" vs "Staff Annual
// Leave Policy") are recognised as the same document.
//
// Method: word k-shingling + a bottom-k (KMV) sketch. Each policy is reduced to a
// small, fixed set of the smallest shingle hashes; the Jaccard similarity of two
// sketches estimates how much text the policies share. This is deterministic,
// cheap (pure hashing, no AI) and compact to store.

import { createHash } from 'crypto'

const SKETCH_SIZE = 256   // how many shingle hashes we keep per policy
const SHINGLE     = 5     // words per shingle

// Normalise text to a stream of words: lowercase, punctuation removed. This makes
// matching robust to casing, spacing and light formatting differences.
function words(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// 32-bit unsigned hash of a string (first 8 hex chars of sha256).
function hash32(s: string): number {
  return parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
}

// Build the bottom-k content sketch for a policy's text. Returns a sorted array of
// the smallest SKETCH_SIZE distinct shingle hashes (fewer if the text is short).
export function contentSignature(text: string): number[] {
  const w = words(text)
  const set = new Set<number>()
  if (w.length < SHINGLE) {
    for (const word of w) set.add(hash32(word))
  } else {
    for (let i = 0; i + SHINGLE <= w.length; i++) {
      set.add(hash32(w.slice(i, i + SHINGLE).join(' ')))
    }
  }
  return [...set].sort((a, b) => a - b).slice(0, SKETCH_SIZE)
}

// Jaccard similarity (0..1) between two content sketches. 1.0 = identical text,
// ~0.9+ = the same policy with minor edits/renaming, low = different policies.
export function contentSimilarity(a?: number[] | null, b?: number[] | null): number {
  if (!a?.length || !b?.length) return 0
  const sa = new Set(a)
  let inter = 0
  for (const x of b) if (sa.has(x)) inter++
  const union = sa.size + new Set(b).size - inter
  return union ? inter / union : 0
}

// Coerce a stored JSON value back into a number[] sketch (defensive).
export function asSignature(v: unknown): number[] | null {
  return Array.isArray(v) && v.every(x => typeof x === 'number') ? (v as number[]) : null
}

// Threshold above which two policies are treated as near-duplicates.
export const DUPLICATE_THRESHOLD = 0.85
