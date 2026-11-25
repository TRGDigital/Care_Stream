// How long an account keeps the cleaned copy of uploaded files. The administrator chooses in Ask CareStream settings.
//   chat_end  deleted when the chat is deleted, and in any case after one day
//   30d       deleted after 30 days (the default)
//   keep      kept until the administrator deletes it
import { prisma } from '../../../db/client'
const q = () => prisma as any

export type Retention = 'chat_end' | '30d' | 'keep'
export const DEFAULT_RETENTION: Retention = '30d'
export const RETENTIONS: Array<{ id: Retention; label: string; note: string }> = [
  { id: 'chat_end', label: 'When the chat ends', note: 'Deleted when you delete the chat, and in any case after one day.' },
  { id: '30d', label: 'After 30 days', note: 'Deleted automatically 30 days after it was uploaded.' },
  { id: 'keep', label: 'Keep until I delete it', note: 'Kept until an administrator deletes it.' },
]
export const isRetention = (v: unknown): v is Retention => v === 'chat_end' || v === '30d' || v === 'keep'
export const retentionNote = (r: Retention): string => RETENTIONS.find(x => x.id === r)!.note

/** When an upload made now should be deleted (null = never). */
export function expiryFor(mode: Retention, now: Date): Date | null {
  if (mode === 'keep') return null
  return new Date(now.getTime() + (mode === 'chat_end' ? 1 : 30) * 86_400_000)
}
export const isExpired = (expiresAt: string | Date | null | undefined, now = new Date()) => !!expiresAt && new Date(expiresAt).getTime() <= now.getTime()

export async function loadRetention(tenantId: string): Promise<Retention> {
  try { const r: any[] = await q().$queryRawUnsafe('select upload_retention from public.ask_settings where tenant_id = $1', tenantId); return isRetention(r[0]?.upload_retention) ? r[0].upload_retention : DEFAULT_RETENTION } catch { return DEFAULT_RETENTION }
}
export async function saveRetention(tenantId: string, r: Retention): Promise<void> {
  await q().$executeRawUnsafe('insert into public.ask_settings (tenant_id, upload_retention, updated_at) values ($1,$2, now()) on conflict (tenant_id) do update set upload_retention = $2, updated_at = now()', tenantId, r)
}
