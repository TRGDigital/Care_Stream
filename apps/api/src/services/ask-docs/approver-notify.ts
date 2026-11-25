// Telling people about the approval workflow: an approver is told when a document is waiting, the author is told what was decided, and a document that has
// waited 3 days gets ONE reminder. Everything here is title free and content free on purpose: a notification says "A letter is waiting for your approval from Sam"
// and nothing else (a letter's title can name a member of staff, so it is never copied). The rules are pure and the sending is passed in, so they are easy to test.
import { needsApproval } from './workflow'

export const REMIND_AFTER_DAYS = 3
export interface Person { id: string; name: string }
export interface ApprovalMeta { submitted_at?: string | null; notified_at?: string | null; reminded_at?: string | null }

/** "A letter", "A staff newsletter", "A governance report". */
export const kindLabel = (type: string): string => (type === 'letter' ? 'A letter' : type === 'newsletter' ? 'A staff newsletter' : type === 'report' ? 'A governance report' : 'A document')
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const first = (name: string) => String(name || 'a colleague').trim().split(/\s+/)[0] || 'a colleague'

/** Who is told a document is waiting: every active administrator except the author. When the author is the only administrator nobody else can approve it, so nobody is told. */
export function approversToNotify(authorId: string, admins: Person[]): Person[] {
  const others = admins.filter(a => a.id !== authorId)
  return admins.length > 1 ? others : []
}

const HOW = 'Open Ask CareStream, choose Library, then Waiting for approval.'
export function submittedMessage(type: string, authorName: string): { title: string; body: string } {
  return { title: `${kindLabel(type)} is waiting for your approval from ${first(authorName)}`, body: `${first(authorName)} has asked for your approval before it can be shared. ${HOW}` }
}
export function decidedMessage(type: string, decision: 'approved' | 'returned', byName: string): { title: string; body: string } {
  return decision === 'approved'
    ? { title: `${kindLabel(type)} you wrote was approved by ${first(byName)}`, body: `It can now be shared. Open Ask CareStream and choose Library to share it.` }
    : { title: `${kindLabel(type)} you wrote was sent back by ${first(byName)}`, body: `It is a draft again, so you can make changes and submit it once more. Open Ask CareStream, choose Library, and open it to see any note they left.` }
}
export function reminderMessage(count: number, authorName: string | null): { title: string; body: string } {
  return count === 1
    ? { title: `${authorName ? `One item from ${first(authorName)} has` : 'One item has'} been waiting 3 days for your approval`, body: `This is the only reminder for it. ${HOW}` }
    : { title: `${count} items have been waiting 3 days for your approval`, body: `This is the only reminder for each of them. ${HOW}` }
}

const dayMs = 86400000
/** Whether a pending document is due its one reminder: waiting for 3 days or more and never reminded. A document that was never stamped uses the time it was last changed. */
export function reminderDue(meta: ApprovalMeta | null | undefined, updatedAt: string | null | undefined, now: Date): boolean {
  if (meta?.reminded_at) return false
  const since = Date.parse(String(meta?.submitted_at ?? updatedAt ?? ''))
  if (!Number.isFinite(since)) return false
  return now.getTime() - since >= REMIND_AFTER_DAYS * dayMs
}

/** The reminders for one account, grouped so each approver gets ONE message however many items are overdue, and nobody is reminded about their own item when someone else can approve it. */
export function planReminders(overdue: Array<{ id: string; created_by: string }>, admins: Person[]): Array<{ approver: Person; docIds: string[] }> {
  if (!overdue.length) return []
  const out: Array<{ approver: Person; docIds: string[] }> = []
  for (const a of admins) {
    if (admins.length === 1) continue   // the only administrator is the only approver: a reminder to themselves is their own library, not a notification
    const ids = overdue.filter(d => d.created_by !== a.id).map(d => d.id)
    if (ids.length) out.push({ approver: a, docIds: ids })
  }
  return out
}

export interface NotifyDeps {
  admins(tenantId: string): Promise<Person[]>
  nameOf(tenantId: string, userId: string): Promise<string>
  /** Hub notification, with an email as well when asked. Returns how many were reached. */
  send(o: { tenantId: string; fromUserId: string; toUserIds: string[]; title: string; body: string; email: boolean }): Promise<{ recipients: number; emailed: number }>
  emailsOn(tenantId: string): Promise<boolean>
  stamp(tenantId: string, docId: string, patch: ApprovalMeta): Promise<void>
}

/** Called once, right after a document moves from draft to pending. Never throws: a failed notice must not undo the submit. */
export async function notifySubmitted(deps: NotifyDeps, o: { tenantId: string; docId: string; type: string; authorId: string; now?: Date }): Promise<{ notified: number; emailed: number }> {
  const now = (o.now ?? new Date()).toISOString()
  try {
    if (!needsApproval(o.type)) return { notified: 0, emailed: 0 }
    await deps.stamp(o.tenantId, o.docId, { submitted_at: now, notified_at: null, reminded_at: null })
    const to = approversToNotify(o.authorId, await deps.admins(o.tenantId))
    if (!to.length) return { notified: 0, emailed: 0 }
    const m = submittedMessage(o.type, await deps.nameOf(o.tenantId, o.authorId))
    const r = await deps.send({ tenantId: o.tenantId, fromUserId: o.authorId, toUserIds: to.map(x => x.id), ...m, email: await deps.emailsOn(o.tenantId) })
    await deps.stamp(o.tenantId, o.docId, { notified_at: now })
    return { notified: r.recipients, emailed: r.emailed }
  } catch { return { notified: 0, emailed: 0 } }
}

/** Called when someone else approves or sends it back: the author is told. A person is never told about what they did themselves. */
export async function notifyDecided(deps: NotifyDeps, o: { tenantId: string; type: string; authorId: string; deciderId: string; decision: 'approved' | 'returned' }): Promise<{ notified: number; emailed: number }> {
  try {
    if (o.authorId === o.deciderId || !needsApproval(o.type)) return { notified: 0, emailed: 0 }
    const m = decidedMessage(o.type, o.decision, await deps.nameOf(o.tenantId, o.deciderId))
    const r = await deps.send({ tenantId: o.tenantId, fromUserId: o.deciderId, toUserIds: [o.authorId], ...m, email: await deps.emailsOn(o.tenantId) })
    return { notified: r.recipients, emailed: r.emailed }
  } catch { return { notified: 0, emailed: 0 } }
}

/** The 3 day reminder for one account. Each document is stamped as reminded BEFORE anything is sent, so a failure can never produce a second reminder. */
export async function sendReminders(deps: NotifyDeps, o: { tenantId: string; pending: Array<{ id: string; created_by: string; updated_at: string | null; approval: ApprovalMeta | null }>; now?: Date }): Promise<{ reminded_docs: number; messages: number }> {
  const now = o.now ?? new Date()
  const overdue = o.pending.filter(d => reminderDue(d.approval, d.updated_at, now))
  if (!overdue.length) return { reminded_docs: 0, messages: 0 }
  const plan = planReminders(overdue, await deps.admins(o.tenantId))
  const covered = new Set(plan.flatMap(p => p.docIds))
  for (const id of covered) await deps.stamp(o.tenantId, id, { reminded_at: now.toISOString() })
  let messages = 0; const emails = await deps.emailsOn(o.tenantId)
  for (const p of plan) {
    try {
      const authors = new Set(overdue.filter(d => p.docIds.includes(d.id)).map(d => d.created_by))
      const from = [...authors][0]
      const m = reminderMessage(p.docIds.length, p.docIds.length === 1 ? await deps.nameOf(o.tenantId, from) : null)
      const r = await deps.send({ tenantId: o.tenantId, fromUserId: from, toUserIds: [p.approver.id], ...m, email: emails })
      messages += r.recipients
    } catch { /* the document is already stamped: no second reminder */ }
  }
  return { reminded_docs: covered.size, messages }
}
