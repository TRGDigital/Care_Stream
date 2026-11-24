// The life of a letter or newsletter in the library: draft -> pending (submitted for approval) -> approved -> shared. Pure rules, so they are easy to test.
// Who may do what: the author edits and submits; an administrator OTHER than the author approves (the author may approve only when the account has a single administrator);
// the "before you send" checklist must be ticked at approval; only an approved document can be shared. Managers could be added later as approvers by passing them in here.
export type DocStatus = 'draft' | 'pending' | 'approved' | 'shared'
export interface DocLike { type: string; status: string; created_by: string }
export type Verdict = { ok: true } | { ok: false; reason: string }
const NEEDS_APPROVAL = new Set(['letter', 'newsletter', 'report'])
export const needsApproval = (type: string) => NEEDS_APPROVAL.has(type)

export const canEdit = (d: DocLike, actor: string): Verdict =>
  !needsApproval(d.type) ? { ok: true } : d.status !== 'draft' ? { ok: false, reason: 'It can only be edited while it is a draft. Return it to draft first.' } : d.created_by !== actor ? { ok: false, reason: 'Only the person who wrote it can edit it.' } : { ok: true }

export const canSubmit = (d: DocLike, actor: string): Verdict =>
  !needsApproval(d.type) ? { ok: false, reason: 'This does not need approval.' } : d.status !== 'draft' ? { ok: false, reason: 'It has already been submitted.' } : d.created_by !== actor ? { ok: false, reason: 'Only the person who wrote it can submit it.' } : { ok: true }

export function canApprove(d: DocLike, actor: string, activeAdmins: number, checklistConfirmed: boolean): Verdict {
  if (!needsApproval(d.type)) return { ok: false, reason: 'This does not need approval.' }
  if (d.status !== 'pending') return { ok: false, reason: 'It is not waiting for approval.' }
  if (d.created_by === actor && activeAdmins > 1) return { ok: false, reason: 'Someone other than the person who wrote it needs to approve it.' }
  if (!checklistConfirmed) return { ok: false, reason: 'Please tick that you have read the "before you send" checklist.' }
  return { ok: true }
}
/** Sending it back: the approver, or the author withdrawing it. Allowed from pending only. */
export function canReturn(d: DocLike, actor: string, activeAdmins: number): Verdict {
  if (d.status !== 'pending') return { ok: false, reason: 'It is not waiting for approval.' }
  if (d.created_by === actor || activeAdmins <= 1) return { ok: true }
  return { ok: true }
}
/** An approved or shared document can be re-opened to a draft by an administrator (it then needs approving again). */
export const canReopen = (d: DocLike): Verdict => (needsApproval(d.type) && (d.status === 'approved' || d.status === 'shared') ? { ok: true } : { ok: false, reason: 'Only an approved document can be re-opened.' })
export const canShare = (d: DocLike): Verdict => (!needsApproval(d.type) ? { ok: false, reason: 'This is not shared from here.' } : d.status === 'approved' || d.status === 'shared' ? { ok: true } : { ok: false, reason: 'It has to be approved before it can be shared.' })
export const SHARE_METHODS = ['pdf', 'email', 'notification', 'hub'] as const
export type ShareMethod = (typeof SHARE_METHODS)[number]
/** Which ways each kind of document can be shared. A letter is for one person; a newsletter is for staff. */
export const sharesFor = (type: string, data?: { internal_only?: boolean } | null): ShareMethod[] =>
  type === 'letter' ? ['pdf', 'email', 'notification', 'hub']
  : type === 'newsletter' ? ['pdf', 'notification']
  // A governance report can be downloaded, emailed to the account's administrators, or sent to staff as a notification, EXCEPT an internal only report (it may name people), which can never go to staff.
  : type === 'report' ? (data?.internal_only === true ? ['pdf', 'email'] : ['pdf', 'email', 'notification'])
  : []
