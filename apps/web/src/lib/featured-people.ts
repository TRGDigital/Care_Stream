// The people featured in a newsletter (employee of the month, a story, new starters, a farewell), as the document panel changes them. Pure helpers, so they are easy to test.
// Everyone already featured stays selected when the panel opens, saves or edits; removing one removes only that person; someone new needs their own "happy to be named and photographed".
export const PHOTO_TYPES = ['employee-of-the-month', 'staff-stories', 'welcome-new-starters', 'leavers-farewells']
export const MAX_FEATURED = 8
export const CONSENT_TEXT = 'They are happy to be named and photographed'
/** Does this kind of newsletter take people at all? (the same list the server uses) */
export const takesPeople = (templateId: unknown): boolean => PHOTO_TYPES.includes(String(templateId ?? '').replace(/-(short|standard|detailed)$/, ''))

export interface PeopleChange { added: string[]; removed: string[]; kept: string[]; changed: boolean }
export function diffPeople(current: string[], selected: string[]): PeopleChange {
  const cur = new Set(current), sel = new Set(selected)
  const added = selected.filter((x, i) => !cur.has(x) && selected.indexOf(x) === i)
  const removed = current.filter(x => !sel.has(x))
  const kept = current.filter(x => sel.has(x))
  return { added, removed, kept, changed: added.length > 0 || removed.length > 0 }
}
/** The body to send: everyone selected, in order; a newcomer carries their tick, someone already featured does not need one. */
export function peopleBody(current: string[], selected: string[], agreed: Record<string, boolean>): Array<{ user_id: string; consent?: boolean }> {
  const cur = new Set(current)
  return selected.slice(0, MAX_FEATURED).map(id => cur.has(id) ? { user_id: id } : { user_id: id, consent: agreed[id] === true })
}
/** Can the change be applied? Every newcomer has their tick. */
export const canApplyPeople = (c: PeopleChange, agreed: Record<string, boolean>): boolean => c.changed && c.added.every(id => agreed[id] === true)
