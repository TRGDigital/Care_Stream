// Proposals in ask_actions (raw SQL, like the rest of the ask_* tables). Every query names the account. A proposal can be confirmed once: claim() flips it from proposed to
// confirmed in one statement, so two presses (or two people) cannot both run it.
import { prisma } from '../../../db/client'
import { PROPOSAL_MINUTES, type ActionRow, type ActionStatus, type ActionType } from './types'
const q = () => prisma as any
const iso = (v: any) => (v ? new Date(v).toISOString() : null)
const row = (x: any): ActionRow => ({ id: String(x.id), tenant_id: String(x.tenant_id), user_id: String(x.user_id), conversation_id: x.conversation_id ?? null, message_id: x.message_id ?? null, type: x.type, payload: x.payload ?? {}, status: x.status, result: x.result ?? null, created_at: iso(x.created_at)!, expires_at: iso(x.expires_at)!, confirmed_at: iso(x.confirmed_at), confirmed_by: x.confirmed_by ?? null })
const COLS = 'id, tenant_id, user_id, conversation_id, message_id, type, payload, status, result, created_at, expires_at, confirmed_at, confirmed_by'

export async function createProposal(o: { tenantId: string; userId: string; conversationId?: string | null; type: ActionType; payload: unknown }): Promise<ActionRow> {
  const r: any[] = await q().$queryRawUnsafe(`insert into public.ask_actions (tenant_id, user_id, conversation_id, type, payload, expires_at) values ($1,$2,$3,$4,$5::jsonb, now() + ($6 || ' minutes')::interval) returning ${COLS}`,
    o.tenantId, o.userId, o.conversationId ?? null, o.type, JSON.stringify(o.payload), String(PROPOSAL_MINUTES))
  return row(r[0])
}
export async function getProposal(tenantId: string, id: string): Promise<ActionRow | null> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_actions where id = $1 and tenant_id = $2`, id, tenantId)
  return r[0] ? row(r[0]) : null
}
/** The status as the person should see it: a proposal past its time is 'expired' even if nothing has marked it yet. */
export const effectiveStatus = (a: ActionRow, now = Date.now()): ActionStatus => (a.status === 'proposed' && new Date(a.expires_at).getTime() < now ? 'expired' : a.status)

export async function updatePayload(tenantId: string, id: string, payload: unknown): Promise<boolean> {
  return Number(await q().$executeRawUnsafe(`update public.ask_actions set payload = $3::jsonb, updated_at = now() where id = $1 and tenant_id = $2 and status = 'proposed' and expires_at > now()`, id, tenantId, JSON.stringify(payload))) > 0
}
/** Claim a proposal for confirming. True only for the first caller; false if it was already confirmed, cancelled, run, or has expired. */
export async function claim(tenantId: string, id: string, confirmedBy: string): Promise<boolean> {
  return Number(await q().$executeRawUnsafe(`update public.ask_actions set status = 'confirmed', confirmed_at = now(), confirmed_by = $3, updated_at = now() where id = $1 and tenant_id = $2 and status = 'proposed' and expires_at > now()`, id, tenantId, confirmedBy)) > 0
}
export async function finish(tenantId: string, id: string, status: 'done' | 'failed', result: unknown): Promise<void> {
  await q().$executeRawUnsafe(`update public.ask_actions set status = $3, result = $4::jsonb, updated_at = now() where id = $1 and tenant_id = $2`, id, tenantId, status, JSON.stringify(result ?? {}))
}
export async function cancel(tenantId: string, userId: string, id: string): Promise<boolean> {
  return Number(await q().$executeRawUnsafe(`update public.ask_actions set status = 'cancelled', updated_at = now() where id = $1 and tenant_id = $2 and user_id = $3 and status = 'proposed'`, id, tenantId, userId)) > 0
}
export async function linkToMessage(tenantId: string, ids: string[], messageId: string, conversationId: string): Promise<void> {
  if (!ids.length) return
  await q().$executeRawUnsafe(`update public.ask_actions set message_id = $3, conversation_id = $4 where tenant_id = $1 and id = any($2::text[])`, tenantId, ids, messageId, conversationId)
}
export async function forConversation(tenantId: string, userId: string, conversationId: string): Promise<ActionRow[]> {
  const r: any[] = await q().$queryRawUnsafe(`select ${COLS} from public.ask_actions where tenant_id = $1 and user_id = $2 and conversation_id = $3 order by created_at asc`, tenantId, userId, conversationId)
  return r.map(row)
}
/** When this person last confirmed an action (for the minimum gap between actions). */
export async function lastConfirmedAt(tenantId: string, userId: string): Promise<Date | null> {
  const r: any[] = await q().$queryRawUnsafe(`select max(confirmed_at) as t from public.ask_actions where tenant_id = $1 and confirmed_by = $2 and status in ('confirmed','done')`, tenantId, userId)
  return r[0]?.t ? new Date(r[0].t) : null
}
export const tablesReady = async (): Promise<boolean> => { try { await q().$queryRawUnsafe('select 1 from public.ask_actions limit 1'); return true } catch { return false } }
