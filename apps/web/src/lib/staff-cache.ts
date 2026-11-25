import { ask, type ActionPerson } from '@/lib/ask-client'

// The account's active staff for every picker in the Ask panel, with the picture each person was given in CareStream (a signed, authenticated address: pictures are never public).
// Administrators come first. One short lived copy per sign in, so opening several pickers does not ask again.
let staffCache: { at: number; token: string; list: ActionPerson[] } | null = null
export async function loadStaff(token: string): Promise<ActionPerson[]> {
  if (staffCache && staffCache.token === token && Date.now() - staffCache.at < 60_000) return staffCache.list
  const r = await ask.actions.staff(token); staffCache = { at: Date.now(), token, list: r.staff }; return r.staff
}
export const forgetStaff = () => { staffCache = null }
