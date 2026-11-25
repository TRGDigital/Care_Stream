// Conversations and the library, in the ask_* tables (raw SQL: no model that could be pulled into other queries). Every query names the account and, for chats, the person.
import { prisma } from '../../db/client'
const q = () => prisma as any
export const notReady = (e: any) => /ask_conversations|ask_messages|ask_documents|does not exist|42P01|P2010/i.test(String(e?.message ?? e))
const iso = (v: any) => (v ? new Date(v).toISOString() : null)

export async function tablesReady(): Promise<boolean> { try { await q().$queryRawUnsafe('select 1 from public.ask_conversations limit 1'); return true } catch { return false } }

export async function createConversation(tenantId: string, userId: string, agentId: string, title: string) {
  const r: any[] = await q().$queryRawUnsafe('insert into public.ask_conversations (tenant_id, user_id, agent_id, title) values ($1,$2,$3,$4) returning id', tenantId, userId, agentId, title.slice(0, 120))
  return String(r[0].id)
}
export async function getConversation(tenantId: string, userId: string, id: string) {
  const r: any[] = await q().$queryRawUnsafe('select id, agent_id, title, created_at, updated_at from public.ask_conversations where id = $1 and tenant_id = $2 and user_id = $3', id, tenantId, userId)
  return r[0] ? { id: String(r[0].id), agent_id: String(r[0].agent_id), title: String(r[0].title), created_at: iso(r[0].created_at), updated_at: iso(r[0].updated_at) } : null
}
export async function listConversations(tenantId: string, userId: string) {
  const r: any[] = await q().$queryRawUnsafe('select id, agent_id, title, updated_at from public.ask_conversations where tenant_id = $1 and user_id = $2 order by updated_at desc limit 60', tenantId, userId)
  return r.map(x => ({ id: String(x.id), agent_id: String(x.agent_id), title: String(x.title), updated_at: iso(x.updated_at) }))
}
export async function renameConversation(tenantId: string, userId: string, id: string, title: string) {
  return Number(await q().$executeRawUnsafe('update public.ask_conversations set title = $4, updated_at = now() where id = $1 and tenant_id = $2 and user_id = $3', id, tenantId, userId, title.slice(0, 120)))
}
export async function deleteConversation(tenantId: string, userId: string, id: string) {
  const c = await getConversation(tenantId, userId, id); if (!c) return false
  await q().$executeRawUnsafe('delete from public.ask_messages where conversation_id = $1 and tenant_id = $2', id, tenantId)
  await q().$executeRawUnsafe('delete from public.ask_conversations where id = $1 and tenant_id = $2 and user_id = $3', id, tenantId, userId)
  return true
}
export async function addMessage(tenantId: string, conversationId: string, role: 'user' | 'assistant', content: string, sources?: unknown) {
  const r: any[] = await q().$queryRawUnsafe('insert into public.ask_messages (conversation_id, tenant_id, role, content, sources) values ($1,$2,$3,$4,$5::jsonb) returning id, created_at', conversationId, tenantId, role, content.slice(0, 20000), sources ? JSON.stringify(sources) : null)
  await q().$executeRawUnsafe('update public.ask_conversations set updated_at = now() where id = $1 and tenant_id = $2', conversationId, tenantId)
  return { id: String(r[0].id), created_at: iso(r[0].created_at) }
}
export async function messagesOf(tenantId: string, conversationId: string) {
  const r: any[] = await q().$queryRawUnsafe('select id, role, content, sources, created_at from public.ask_messages where conversation_id = $1 and tenant_id = $2 order by created_at asc', conversationId, tenantId)
  return r.map(x => ({ id: String(x.id), role: String(x.role) as 'user' | 'assistant', content: String(x.content), sources: x.sources ?? [], created_at: iso(x.created_at) }))
}

export async function saveDocument(tenantId: string, userId: string, d: { type: string; title: string; body: string; data?: unknown }) {
  const r: any[] = await q().$queryRawUnsafe('insert into public.ask_documents (tenant_id, type, title, body, data, created_by) values ($1,$2,$3,$4,$5::jsonb,$6) returning id', tenantId, d.type, d.title.slice(0, 160), d.body.slice(0, 60000), d.data ? JSON.stringify(d.data) : null, userId)
  return String(r[0].id)
}
export async function listDocuments(tenantId: string, userId: string) {
  // A person's own saved items, plus every letter and newsletter in the account (administrators approve each other's).
  const r: any[] = await q().$queryRawUnsafe("select id, type, title, status, created_by, data, updated_at from public.ask_documents where tenant_id = $1 and (created_by = $2 or type in ('letter','newsletter','report')) order by updated_at desc limit 150", tenantId, userId)
  return r.map(x => ({ id: String(x.id), type: String(x.type), title: String(x.title), status: String(x.status), mine: String(x.created_by) === userId, staff_name: x.data?.staff_name ?? null, updated_at: iso(x.updated_at) }))
}
export async function getDocument(tenantId: string, userId: string, id: string) {
  const r: any[] = await q().$queryRawUnsafe('select id, type, title, body, data, status, version, created_at, updated_at from public.ask_documents where id = $1 and tenant_id = $2 and created_by = $3', id, tenantId, userId)
  const x = r[0]; return x ? { id: String(x.id), type: String(x.type), title: String(x.title), body: String(x.body), data: x.data ?? null, status: String(x.status), version: Number(x.version), created_at: iso(x.created_at), updated_at: iso(x.updated_at) } : null
}
export async function updateDocument(tenantId: string, userId: string, id: string, p: { title?: string; body?: string }) {
  return Number(await q().$executeRawUnsafe('update public.ask_documents set title = coalesce($4, title), body = coalesce($5, body), version = version + 1, updated_at = now() where id = $1 and tenant_id = $2 and created_by = $3', id, tenantId, userId, p.title?.slice(0, 160) ?? null, p.body?.slice(0, 60000) ?? null))
}
export async function deleteDocument(tenantId: string, userId: string, id: string) {
  return Number(await q().$executeRawUnsafe('delete from public.ask_documents where id = $1 and tenant_id = $2 and created_by = $3', id, tenantId, userId)) > 0
}

// ── Letters and newsletters: the approval workflow (see services/ask-docs/workflow.ts for the rules) ─────────────────────────────────────────────────────────────────
export const SHARED_TYPES = ['letter', 'newsletter', 'report']
/** One document in this account by id, whoever wrote it, when it is a letter or newsletter (administrators approve each other's); a saved answer stays private to its author. */
export async function getDocumentFor(tenantId: string, userId: string, id: string) {
  const r: any[] = await q().$queryRawUnsafe("select id, type, title, body, data, status, version, created_by, approved_by, approved_at, created_at, updated_at from public.ask_documents where id = $1 and tenant_id = $2 and (created_by = $3 or type in ('letter','newsletter','report'))", id, tenantId, userId)
  const x = r[0]
  return x ? { id: String(x.id), type: String(x.type), title: String(x.title), body: String(x.body), data: x.data ?? null, status: String(x.status), version: Number(x.version), created_by: String(x.created_by), approved_by: x.approved_by ? String(x.approved_by) : null, approved_at: iso(x.approved_at), created_at: iso(x.created_at), updated_at: iso(x.updated_at) } : null
}
export async function listPendingApprovals(tenantId: string) {
  const r: any[] = await q().$queryRawUnsafe("select id, type, title, created_by, data, updated_at from public.ask_documents where tenant_id = $1 and status = 'pending' and type in ('letter','newsletter','report') order by updated_at asc limit 100", tenantId)
  return r.map(x => ({ id: String(x.id), type: String(x.type), title: String(x.title), created_by: String(x.created_by), staff_name: x.data?.staff_name ?? null, updated_at: iso(x.updated_at) }))
}
export async function updateDocumentContent(tenantId: string, id: string, p: { title?: string; body?: string; data?: unknown }) {
  return Number(await q().$executeRawUnsafe('update public.ask_documents set title = coalesce($3, title), body = coalesce($4, body), data = coalesce($5::jsonb, data), version = version + 1, updated_at = now() where id = $1 and tenant_id = $2', id, tenantId, p.title?.slice(0, 160) ?? null, p.body?.slice(0, 60000) ?? null, p.data === undefined ? null : JSON.stringify(p.data)))
}
/** Move a document to a new status, but only if it is currently in one of the allowed statuses (so two people cannot both approve it). */
export async function setDocumentStatus(tenantId: string, id: string, from: string[], to: string, approvedBy?: string | null) {
  if (to === 'approved') {
    return Number(await q().$executeRawUnsafe("update public.ask_documents set status = 'approved', approved_by = $4, approved_at = now(), updated_at = now() where id = $1 and tenant_id = $2 and status = any($3::text[])", id, tenantId, from, approvedBy ?? null)) > 0
  }
  return Number(await q().$executeRawUnsafe("update public.ask_documents set status = $4, approved_by = case when $4 = 'draft' then null else approved_by end, approved_at = case when $4 = 'draft' then null else approved_at end, updated_at = now() where id = $1 and tenant_id = $2 and status = any($3::text[])", id, tenantId, from, to)) > 0
}
export async function appendShareRecord(tenantId: string, id: string, entry: { method: string; by: string; at: string; note?: string }) {
  await q().$executeRawUnsafe("update public.ask_documents set data = jsonb_set(coalesce(data, '{}'::jsonb), '{shared}', coalesce(data->'shared', '[]'::jsonb) || $3::jsonb), updated_at = now() where id = $1 and tenant_id = $2", id, tenantId, JSON.stringify([entry]))
}
/** When this person last sent a document to staff (any channel but a PDF or Word download), for the minimum gap between sends. Null when unknown. */
export async function lastSendAt(tenantId: string, userId: string): Promise<Date | null> {
  try {
    const r: any[] = await q().$queryRawUnsafe("select max((s->>'at')::timestamptz) as at from public.ask_documents d, jsonb_array_elements(coalesce(d.data->'shared', '[]'::jsonb)) s where d.tenant_id = $1 and s->>'by' = $2 and s->>'method' in ('email','hub','notification')", tenantId, userId)
    return r[0]?.at ? new Date(r[0].at) : null
  } catch { return null }
}
export async function countActiveAdmins(tenantId: string): Promise<number> {
  return await q().user.count({ where: { tenant_id: tenantId, role: 'admin', is_active: true, is_shared: false } })
}

/** Saves how a letter is to be shared ({ hub, email, print_only }) on the draft. Allowed at any stage (a download or a print marks a letter shared, and it may still go in the hub); it does not change the version or the approval. */
export async function setShareIntent(tenantId: string, id: string, intent: { hub: boolean; email: boolean; print_only: boolean }) {
  return Number(await q().$executeRawUnsafe("update public.ask_documents set data = jsonb_set(coalesce(data, '{}'::jsonb), '{share_intent}', $3::jsonb), updated_at = now() where id = $1 and tenant_id = $2 and type = 'letter' and status in ('draft','pending','approved','shared')", id, tenantId, JSON.stringify(intent))) > 0
}

// ── Approver notifications (see services/ask-docs/approver-notify.ts): the times live in the document's own data, so there is no new table ─────────────────────────
/** Merges times into data.approval ({ submitted_at, notified_at, reminded_at }). Does not change the version or the approval. */
export async function setApprovalMeta(tenantId: string, id: string, patch: Record<string, string | null>) {
  await q().$executeRawUnsafe("update public.ask_documents set data = jsonb_set(coalesce(data, '{}'::jsonb), '{approval}', coalesce(data->'approval', '{}'::jsonb) || $3::jsonb) where id = $1 and tenant_id = $2", id, tenantId, JSON.stringify(patch))
}
/** Every pending letter, newsletter or report that has waited at least `days`, across accounts (for the daily reminder). Times only, never content. */
export async function listPendingOlderThan(days: number, limit = 500) {
  const r: any[] = await q().$queryRawUnsafe("select id, tenant_id, created_by, updated_at, data->'approval' as approval from public.ask_documents where status = 'pending' and type in ('letter','newsletter','report') and coalesce(nullif(data->'approval'->>'submitted_at','')::timestamptz, updated_at) <= now() - ($1::int * interval '1 day') and coalesce(data->'approval'->>'reminded_at','') = '' order by updated_at asc limit $2", days, limit)
  return r.map(x => ({ id: String(x.id), tenant_id: String(x.tenant_id), created_by: String(x.created_by), updated_at: iso(x.updated_at), approval: x.approval ?? null }))
}
/** Active administrators of an account (id and name), for the people who may approve. */
export async function activeAdmins(tenantId: string): Promise<Array<{ id: string; name: string }>> {
  const r: any[] = await q().user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true, is_shared: false }, select: { id: true, name: true } })
  return r.map(x => ({ id: String(x.id), name: String(x.name ?? '') }))
}
export async function userName(tenantId: string, userId: string): Promise<string> {
  const u: any = await q().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { name: true } })
  return String(u?.name ?? '')
}
