// The ask_uploads table (metadata only) and the cleaned copy in private storage. Every query names the account and the person. Raw SQL, no Prisma model.
import { randomUUID } from 'crypto'
import { prisma } from '../../../db/client'
import type { Stored } from './ingest'
import { expiryFor, isExpired, type Retention } from './settings'
const q = () => prisma as any
const storage = () => import('../../storage/s3')

export const notReady = (e: any) => /ask_uploads|upload_retention|does not exist|42P01|42703|P2010/i.test(String(e?.message ?? e))
const iso = (v: any) => (v ? new Date(v).toISOString() : null)
export const keyFor = (tenantId: string, id: string) => `tenants/${tenantId}/ask-uploads/${id}.json`

export type UploadStatus = 'ready' | 'needs_match' | 'deleted'
export interface UploadRow {
  id: string; tenant_id: string; user_id: string; conversation_id: string; agent_id: string; filename: string; kind: string; doc_kind: string
  size_bytes: number; row_count: number; columns: any; status: UploadStatus; match: any; storage_key: string
  created_at: string | null; expires_at: string | null; deleted_at: string | null
}
const map = (x: any): UploadRow => ({ id: String(x.id), tenant_id: String(x.tenant_id), user_id: String(x.user_id), conversation_id: String(x.conversation_id ?? ''), agent_id: String(x.agent_id), filename: String(x.filename), kind: String(x.kind), doc_kind: String(x.doc_kind), size_bytes: Number(x.size_bytes ?? 0), row_count: Number(x.row_count ?? 0), columns: x.columns ?? {}, status: String(x.status) as UploadStatus, match: x.match ?? null, storage_key: String(x.storage_key), created_at: iso(x.created_at), expires_at: iso(x.expires_at), deleted_at: iso(x.deleted_at) })
const COLS = 'id, tenant_id, user_id, conversation_id, agent_id, filename, kind, doc_kind, size_bytes, row_count, columns, status, match, storage_key, created_at, expires_at, deleted_at'

export async function create(o: { tenantId: string; userId: string; conversationId: string; agentId: string; filename: string; sizeBytes: number; stored: Stored; retention: Retention; needsMatch: boolean; columns: any; mime?: string }): Promise<UploadRow> {
  const id = randomUUID(), key = keyFor(o.tenantId, id)
  await (await storage()).putPrivateObject(key, Buffer.from(JSON.stringify(o.stored)), 'application/json')
  const expires = expiryFor(o.retention, new Date())
  try {
    const r: any[] = await q().$queryRawUnsafe(`insert into public.ask_uploads (id, tenant_id, user_id, conversation_id, agent_id, filename, kind, doc_kind, size_bytes, row_count, columns, status, storage_key, expires_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14) returning ${COLS}`, id, o.tenantId, o.userId, o.conversationId, o.agentId, o.filename.slice(0, 200), o.stored.kind, o.stored.doc_kind, o.sizeBytes, o.stored.rows.length, JSON.stringify(o.columns), o.needsMatch ? 'needs_match' : 'ready', key, expires)
    return map(r[0])
  } catch (e) { await (await storage()).deleteFile(key).catch(() => undefined); throw e }
}
export async function listFor(tenantId: string, userId: string, conversationId: string): Promise<UploadRow[]> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_uploads where tenant_id = $1 and user_id = $2 and conversation_id = $3 and deleted_at is null order by created_at asc`, tenantId, userId, conversationId)
  return r.map(map).filter(u => !isExpired(u.expires_at))
}
export async function get(tenantId: string, userId: string, id: string): Promise<UploadRow | null> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_uploads where id = $1 and tenant_id = $2 and user_id = $3 and deleted_at is null`, id, tenantId, userId)
  const u = r[0] ? map(r[0]) : null
  return u && !isExpired(u.expires_at) ? u : null
}
export async function countToday(tenantId: string, userId: string): Promise<number> {
  const r: any[] = await q().$queryRawUnsafe(`select count(*)::int as n from public.ask_uploads where tenant_id = $1 and user_id = $2 and created_at > now() - interval '1 day'`, tenantId, userId)
  return Number(r[0]?.n ?? 0)
}
export async function readStored(u: UploadRow): Promise<Stored> { return JSON.parse((await (await storage()).downloadFile(u.storage_key)).toString('utf8')) as Stored }
export async function saveMatch(tenantId: string, userId: string, id: string, match: unknown, status: UploadStatus): Promise<boolean> {
  return Number(await q().$executeRawUnsafe('update public.ask_uploads set match = $4::jsonb, status = $5 where id = $1 and tenant_id = $2 and user_id = $3 and deleted_at is null', id, tenantId, userId, JSON.stringify(match), status)) > 0
}
/** Removes the cleaned copy from storage first, then marks the record deleted (the record keeps no content). */
export async function remove(u: Pick<UploadRow, 'id' | 'tenant_id' | 'storage_key'>): Promise<void> {
  await (await storage()).deleteFile(u.storage_key).catch(() => undefined)
  await q().$executeRawUnsafe(`update public.ask_uploads set status = 'deleted', deleted_at = now(), match = null where id = $1 and tenant_id = $2`, u.id, u.tenant_id)
}
export async function removeForConversation(tenantId: string, userId: string, conversationId: string): Promise<number> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_uploads where tenant_id = $1 and user_id = $2 and conversation_id = $3 and deleted_at is null`, tenantId, userId, conversationId)
  for (const x of r) await remove(map(x))
  return r.length
}
/** Deletes everything past its date (the schedule calls this; the routes also tidy a few each time so nothing waits long). */
export async function sweepExpired(limit = 50, tenantId?: string): Promise<number> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_uploads where deleted_at is null and expires_at is not null and expires_at <= now() ${tenantId ? 'and tenant_id = $2' : ''} order by expires_at asc limit $1`, ...(tenantId ? [limit, tenantId] : [limit]))
  for (const x of r) await remove(map(x))
  return r.length
}
