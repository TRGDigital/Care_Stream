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
  const r: any[] = await q().$queryRawUnsafe('select id, type, title, status, updated_at from public.ask_documents where tenant_id = $1 and created_by = $2 order by updated_at desc limit 100', tenantId, userId)
  return r.map(x => ({ id: String(x.id), type: String(x.type), title: String(x.title), status: String(x.status), updated_at: iso(x.updated_at) }))
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
