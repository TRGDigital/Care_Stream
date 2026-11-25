// HOUSE RULE 3, STAFF SELECTION: whenever an agent or any Ask screen needs a staff member (or several), the administrator picks from a LIST of the account's real, active staff, never by
// typing a name. Each row shows the staff picture the admin added in CareStream (initials when there is none, with a small "No picture yet" tag), the name and the job title, administrators
// come first (as on the Staff page), it is searchable, and a long list grows with a Show more button (no scroll bars). This is the pure logic, shared by the one picker component.
export interface PickerPerson { id: string; name: string; job_role?: string | null; photo_url?: string | null; is_admin?: boolean; has_email?: boolean }

export const PAGE_SIZE = 8
export const hasPicture = (p: PickerPerson) => !!p.photo_url
export const initialsOf = (name: string) => { const w = String(name ?? '').trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] ?? '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() }

/** Administrators first, then A to Z. Stable for everyone else. */
export function orderStaff<T extends PickerPerson>(list: T[]): T[] {
  return [...list].sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0) || a.name.localeCompare(b.name))
}
/** Search by name or job title (case and accent blind), and optionally by job role. */
export function filterStaff<T extends PickerPerson>(list: T[], q: string, role = ''): T[] {
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const term = n(q.trim())
  return list.filter(p => (!role || p.job_role === role) && (!term || n(p.name).includes(term) || n(p.job_role ?? '').includes(term)))
}
export const rolesOf = (list: PickerPerson[]) => [...new Set(list.map(p => p.job_role).filter(Boolean) as string[])].sort()
/** How many rows are on show: a page at a time, never a scroll area. */
export const pageOf = <T,>(list: T[], pages: number): { shown: T[]; hidden: number } => { const n = Math.max(1, pages) * PAGE_SIZE; return { shown: list.slice(0, n), hidden: Math.max(0, list.length - n) } }

/** The next selection after one row is toggled. Single mode holds at most one person (picking another replaces; picking the same again clears). Multi mode stops at `max`. */
export function nextSelection(current: string[], id: string, mode: 'single' | 'multi', max = 500): string[] {
  const has = current.includes(id)
  if (mode === 'single') return has ? [] : [id]
  if (has) return current.filter(x => x !== id)
  return current.length >= max ? current : [...current, id]
}
/** Only people who are in the list can stay selected (a person who left since is dropped). */
export const keepKnown = (ids: string[], list: PickerPerson[]) => ids.filter(i => list.some(p => p.id === i))
export const selectedPeople = (ids: string[], list: PickerPerson[]) => ids.map(i => list.find(p => p.id === i)).filter((p): p is PickerPerson => !!p)
