// What was added or changed in some wording, compared with the wording as it was first suggested. Word by word, so a woven in name or a replaced name is highlighted as a phrase.
// Pure text, no AI. Recalculated as the admin types, so the highlight stays accurate after editing.

export type DiffSegment = { text: string; added: boolean }

const WORD_LIMIT_PRODUCT = 1_000_000   // beyond this the wording is left unhighlighted rather than slowing the page

/** The current text split into segments; `added` is true for words that are not part of the baseline (the longest run of words they share is kept in order). */
export function diffAdded(baseline: string, current: string): DiffSegment[] {
  const tokens = (s: string) => s.match(/\s+|[^\s]+/g) ?? []
  const cur = tokens(current)
  if (!current) return []
  // Words are compared without the punctuation around them, so "manager" and "manager," are the same word (a comma added by the rewrite is not a different word).
  const key = (t: string) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  const baseWords = tokens(baseline).filter(t => !/^\s/.test(t)).map(key)
  const curIdx: number[] = []                       // positions in `cur` that are words
  cur.forEach((t, i) => { if (!/^\s/.test(t)) curIdx.push(i) })
  const n = baseWords.length, m = curIdx.length
  if (n * m > WORD_LIMIT_PRODUCT) return [{ text: current, added: false }]

  // Longest common subsequence of words, then walk back to see which current words are in it.
  const w = m + 1
  const dp = new Uint16Array((n + 1) * w)
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i * w + j] = baseWords[i] === key(cur[curIdx[j]]) ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1])
  }
  const inBase = new Array<boolean>(m).fill(false)
  for (let i = 0, j = 0; i < n && j < m;) {
    if (baseWords[i] === key(cur[curIdx[j]])) { inBase[j] = true; i++; j++ }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++
    else j++
  }
  // A single shared word between two added words ("Pippa Thornley, THE infection prevention lead") would split one woven in phrase into two blocks: it is highlighted with them.
  for (let k = 1; k + 1 < m; k++) if (inBase[k] && !inBase[k - 1] && !inBase[k + 1]) inBase[k] = false
  const addedAt = new Array<boolean>(cur.length).fill(false)
  curIdx.forEach((pos, k) => { addedAt[pos] = !inBase[k] })
  // Space between two added words belongs to the highlight, so a phrase reads as one block.
  for (let i = 0; i < cur.length; i++) {
    if (!/^\s/.test(cur[i])) continue
    const prev = i > 0 ? addedAt[i - 1] && !/^\s/.test(cur[i - 1]) : false
    const next = i + 1 < cur.length ? addedAt[i + 1] && !/^\s/.test(cur[i + 1]) : false
    addedAt[i] = prev && next
  }
  const out: DiffSegment[] = []
  cur.forEach((t, i) => { const last = out[out.length - 1]; if (last && last.added === addedAt[i]) last.text += t; else out.push({ text: t, added: addedAt[i] }) })
  return out
}

/** True when anything in `current` differs from the baseline words. */
export const hasAdditions = (baseline: string, current: string): boolean => diffAdded(baseline, current).some(s => s.added)
