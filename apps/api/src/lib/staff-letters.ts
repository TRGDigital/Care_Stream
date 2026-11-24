// Letters shared in a staff member's hub ("My letters"). The finished, headed PDF is SNAPSHOTTED into private storage when an administrator shares it, so later edits to the
// draft or the letterhead never change what the staff member received. Only the person it was shared with (and the account's administrators, through the Ask library) can read it.
// A letter marked "print only" never reaches this table, so a staff member can never see it. Raw SQL on purpose: there is no Prisma model for it, so nothing that loads staff or
// documents can pull a letter in by accident. The table may not exist yet (the SQL is run by the owner after the code ships): everything here tolerates that.
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { putPrivateObject } from '../services/storage/s3'

const q = () => prisma as any
const iso = (d: any) => (d ? new Date(d).toISOString() : null)
export const isMissingTable = (e: any) => e?.code === 'P2021' || /does not exist|relation .* does not exist/i.test(String(e?.message ?? ''))

export interface StaffLetter {
  id: string; document_id: string; title: string; filename: string; size_bytes: number; signed: boolean; sent_by: string; sent_by_name: string
  notification_id: string | null; needs_acknowledgement: boolean; shared_at: string | null; read_at: string | null; acknowledged_at: string | null; withdrawn_at: string | null
}
const COLS = 'id, document_id, title, filename, size_bytes, signed, sent_by, sent_by_name, notification_id, needs_acknowledgement, shared_at, read_at, acknowledged_at, withdrawn_at'
const row = (x: any): StaffLetter => ({
  id: String(x.id), document_id: String(x.document_id), title: String(x.title), filename: String(x.filename), size_bytes: Number(x.size_bytes ?? 0), signed: x.signed === true,
  sent_by: String(x.sent_by), sent_by_name: String(x.sent_by_name ?? ''), notification_id: x.notification_id ? String(x.notification_id) : null, needs_acknowledgement: x.needs_acknowledgement === true,
  shared_at: iso(x.shared_at), read_at: iso(x.read_at), acknowledged_at: iso(x.acknowledged_at), withdrawn_at: iso(x.withdrawn_at),
})

export async function lettersReady(): Promise<boolean> { try { await q().$queryRawUnsafe('select 1 from public.staff_letters limit 1'); return true } catch { return false } }

/** The private storage key for a snapshot (tenant scoped; never a public address). */
export const snapshotKey = (tenantId: string, id: string) => `tenants/${tenantId}/staff-letters/${id}.pdf`

/** Stores the PDF snapshot and the per person row. Returns the new id. The caller has already checked the document is an approved letter and that the person is an active member of staff of this account. */
export async function shareToHub(o: {
  tenantId: string; documentId: string; userId: string; title: string; filename: string; pdf: Buffer; signed: boolean
  sentBy: string; sentByName: string; needsAcknowledgement: boolean; notificationId?: string | null
}): Promise<string> {
  const id = randomUUID(), key = snapshotKey(o.tenantId, id)
  await putPrivateObject(key, o.pdf, 'application/pdf')
  await q().$executeRawUnsafe(
    'insert into public.staff_letters (id, tenant_id, document_id, user_id, title, filename, storage_key, size_bytes, signed, sent_by, sent_by_name, notification_id, needs_acknowledgement) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    id, o.tenantId, o.documentId, o.userId, o.title.slice(0, 200), o.filename.slice(0, 120), key, o.pdf.length, o.signed, o.sentBy, o.sentByName.slice(0, 120), o.notificationId ?? null, o.needsAcknowledgement)
  return id
}
/** Links the hub notification that was created for this share, so the notification can offer "Open the letter". */
export async function setNotificationFor(tenantId: string, id: string, notificationId: string): Promise<void> {
  await q().$executeRawUnsafe('update public.staff_letters set notification_id = $3 where id = $1 and tenant_id = $2', id, tenantId, notificationId)
}

// ── The staff member's own letters (every read names the account AND the person) ─────────────────────────────────────────────────────────
/** My letters, newest first with the unread ones on top. Withdrawn letters are never returned. */
export async function listMine(tenantId: string, userId: string): Promise<StaffLetter[]> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.staff_letters where tenant_id = $1 and user_id = $2 and withdrawn_at is null order by (read_at is null) desc, shared_at desc limit 200`, tenantId, userId)
  return r.map(row)
}
export async function getMine(tenantId: string, userId: string, id: string): Promise<(StaffLetter & { storage_key: string }) | null> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS}, storage_key from public.staff_letters where id = $1 and tenant_id = $2 and user_id = $3 and withdrawn_at is null`, id, tenantId, userId)
  return r[0] ? { ...row(r[0]), storage_key: String(r[0].storage_key) } : null
}
export async function mineByNotification(tenantId: string, userId: string, notificationId: string): Promise<StaffLetter | null> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.staff_letters where notification_id = $1 and tenant_id = $2 and user_id = $3 and withdrawn_at is null limit 1`, notificationId, tenantId, userId)
  return r[0] ? row(r[0]) : null
}
export async function markRead(tenantId: string, userId: string, id: string): Promise<string | null> {
  const r: any[] = await q().$queryRawUnsafe('update public.staff_letters set read_at = coalesce(read_at, now()) where id = $1 and tenant_id = $2 and user_id = $3 and withdrawn_at is null returning read_at', id, tenantId, userId)
  return r[0] ? iso(r[0].read_at) : null
}
/** Records "I have read and understood this". Only when the letter asked for it; the date is the first time and never changes. Reading is implied. */
export async function acknowledge(tenantId: string, userId: string, id: string): Promise<{ ok: true; acknowledged_at: string | null } | { ok: false; reason: string }> {
  const r: any[] = await q().$queryRawUnsafe('select needs_acknowledgement from public.staff_letters where id = $1 and tenant_id = $2 and user_id = $3 and withdrawn_at is null', id, tenantId, userId)
  if (!r[0]) return { ok: false, reason: 'Letter not found.' }
  if (r[0].needs_acknowledgement !== true) return { ok: false, reason: 'This letter does not need to be acknowledged.' }
  const u: any[] = await q().$queryRawUnsafe('update public.staff_letters set acknowledged_at = coalesce(acknowledged_at, now()), read_at = coalesce(read_at, now()) where id = $1 and tenant_id = $2 and user_id = $3 and withdrawn_at is null returning acknowledged_at', id, tenantId, userId)
  return { ok: true, acknowledged_at: iso(u[0]?.acknowledged_at) }
}
export async function unreadCount(tenantId: string, userId: string): Promise<{ total: number; unread: number; needs_ack: number }> {
  const r: any[] = await q().$queryRawUnsafe('select count(*)::int as total, count(*) filter (where read_at is null)::int as unread, count(*) filter (where needs_acknowledgement and acknowledged_at is null)::int as needs_ack from public.staff_letters where tenant_id = $1 and user_id = $2 and withdrawn_at is null', tenantId, userId)
  return { total: Number(r[0]?.total ?? 0), unread: Number(r[0]?.unread ?? 0), needs_ack: Number(r[0]?.needs_ack ?? 0) }
}

// ── The administrators' side (through the Ask library) ───────────────────────────────────────────────────────────────────────────────────
export interface HubShare extends StaffLetter { user_id: string; person_name: string }
/** Who a letter was shared with in the hub, with read and acknowledged status. Withdrawn shares are listed (marked) so the record stays complete. */
export async function sharesOfDocument(tenantId: string, documentId: string): Promise<HubShare[]> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS}, user_id from public.staff_letters where document_id = $1 and tenant_id = $2 order by shared_at desc`, documentId, tenantId)
  const ids = [...new Set(r.map(x => String(x.user_id)))]
  const names = ids.length ? await q().user.findMany({ where: { id: { in: ids }, tenant_id: tenantId }, select: { id: true, name: true } }) : []
  const by = new Map<string, string>(names.map((n: any) => [String(n.id), String(n.name)]))
  return r.map(x => ({ ...row(x), user_id: String(x.user_id), person_name: by.get(String(x.user_id)) ?? 'Former member of staff' }))
}
/** Takes one shared letter out of the person's hub. The record stays. Returns the notification id (so the caller can withdraw it too) or null when nothing changed. */
export async function withdraw(tenantId: string, id: string, actorId: string): Promise<{ id: string; document_id: string; notification_id: string | null } | null> {
  const r: any[] = await q().$queryRawUnsafe('update public.staff_letters set withdrawn_at = now(), withdrawn_by = $3 where id = $1 and tenant_id = $2 and withdrawn_at is null returning id, document_id, notification_id', id, tenantId, actorId)
  return r[0] ? { id: String(r[0].id), document_id: String(r[0].document_id), notification_id: r[0].notification_id ? String(r[0].notification_id) : null } : null
}
