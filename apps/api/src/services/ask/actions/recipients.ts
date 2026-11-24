// Who an action can reach. The same people the Notifications and Training screens allow: active, in this account, not a shared tablet, not an agency worker (and, for a
// notification, with an email address). Re-checked at confirm time, so a person who left since the proposal is dropped.
import { prisma } from '../../../db/client'
import { ELIGIBLE_WHERE } from '../../../lib/staff-notifications'
import { staffPhotoUrls } from '../../../lib/staff-photos'
const p = () => prisma as any

export interface Eligible { id: string; name: string; job_role: string | null; has_email: boolean }

export async function eligibleStaff(tenantId: string): Promise<Eligible[]> {
  const rows: any[] = await p().user.findMany({ where: ELIGIBLE_WHERE(tenantId), orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, job_role: true } })
  return rows.map(r => ({ id: String(r.id), name: String(r.name ?? ''), job_role: r.job_role ?? null, has_email: !!r.email }))
}
export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Match typed names to people: an exact full name first, then a name that starts the same way (only when it is unambiguous). Unmatched and ambiguous names are reported, never guessed. */
export function matchNames(names: string[], people: Eligible[]): { ids: string[]; unmatched: string[]; ambiguous: string[] } {
  const ids = new Set<string>(), unmatched: string[] = [], ambiguous: string[] = []
  for (const raw of names) {
    const n = normName(String(raw)); if (!n) continue
    const exact = people.filter(x => normName(x.name) === n)
    if (exact.length === 1) { ids.add(exact[0].id); continue }
    if (exact.length > 1) { ambiguous.push(raw); continue }
    const part = people.filter(x => normName(x.name).startsWith(n + ' ') || normName(x.name).split(' ')[0] === n)
    if (part.length === 1) ids.add(part[0].id); else if (part.length > 1) ambiguous.push(raw); else unmatched.push(raw)
  }
  return { ids: [...ids], unmatched, ambiguous }
}

/** Keep only the ids that are still eligible (and, when asked, have an email). Returns what was kept and how many were dropped. */
export function revalidate(ids: string[], people: Eligible[], needEmail: boolean): { kept: string[]; dropped: number } {
  const ok = new Map(people.filter(x => !needEmail || x.has_email).map(x => [x.id, x]))
  const kept = [...new Set(ids)].filter(i => ok.has(i))
  return { kept, dropped: [...new Set(ids)].length - kept.length }
}

export async function recipientCards(tenantId: string, ids: string[], people: Eligible[]) {
  const by = new Map(people.map(x => [x.id, x]))
  const photos = ids.length ? await staffPhotoUrls(tenantId, ids).catch(() => new Map<string, string>()) : new Map<string, string>()
  return ids.map(id => ({ id, name: by.get(id)?.name ?? 'Former member of staff', job_role: by.get(id)?.job_role ?? null, photo_url: (photos as Map<string, string>).get(id) ?? null }))
}
