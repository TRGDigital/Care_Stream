// Wording about to be adopted can already name someone who is not (or is no longer) a current role holder, because it was copied from a policy that is out of date. This finds them,
// so the admin can keep the name or replace it. Two layers: an exact, free match against everyone CareStream knows (archived staff are the ones to flag), and an optional small AI check that
// lists the person names in the wording so people who were never in CareStream are found too.

export type OtherName = { name: string; kind: 'archived' | 'unknown'; job_role: string | null; occurrences: number }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** The same careful whole-name matching the name change uses: case sensitive, never inside another word, a possessive still counts. */
export const wholeNameRegex = (name: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}'’-])${escapeRe(name)}(?![\\p{L}\\p{N}-])`, 'gu')
export const countName = (text: string, name: string): number => (text.match(wholeNameRegex(name)) ?? []).length

/** Layer 1: archived staff whose name is written in the wording. Active staff and current holders are current, so they are not flagged. */
export function archivedNamesIn(text: string, users: Array<{ name?: string | null; job_role?: string | null; is_active?: boolean | null }>): OtherName[] {
  const seen = new Set<string>(), out: OtherName[] = []
  for (const u of users) {
    const name = String(u.name ?? '').replace(/,/g, '').trim()
    if (name.length < 5 || u.is_active !== false || seen.has(name.toLowerCase())) continue
    const n = countName(text, name)
    if (!n) continue
    seen.add(name.toLowerCase())
    out.push({ name, kind: 'archived', job_role: u.job_role ?? null, occurrences: n })
  }
  return out
}

export const NAMES_SYSTEM = 'You find the names of individual people in policy wording for a UK care service. Reply with JSON only.'
export const namesPrompt = (text: string): string => [
  'List the names of individual people written in this wording (a first name and surname, or a title and surname).',
  'Do not include organisations, regulators, places, job titles on their own, or the name of a policy or law.',
  '"""', text, '"""',
  'Reply with only: {"names":["Name One","Name Two"]}. If there are none, reply {"names":[]}.',
].join('\n')

/** Layer 2: the AI's list, kept only where each name really is written in the wording (so nothing invented is shown), is not a current person, and is not already flagged. */
export function unknownNamesFrom(raw: string, text: string, current: string[], already: string[]): OtherName[] {
  let list: unknown = []
  try { list = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).names } catch { return [] }
  if (!Array.isArray(list)) return []
  const skip = new Set([...current, ...already].map(n => n.replace(/,/g, '').trim().toLowerCase()))
  const seen = new Set<string>(), out: OtherName[] = []
  for (const item of list.slice(0, 12)) {
    const name = String(item ?? '').replace(/,/g, '').trim()
    const k = name.toLowerCase()
    if (name.length < 5 || name.length > 80 || skip.has(k) || seen.has(k)) continue
    const n = countName(text, name)
    if (!n) continue
    seen.add(k)
    out.push({ name, kind: 'unknown', job_role: null, occurrences: n })
  }
  return out
}
