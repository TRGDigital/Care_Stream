// The "Ask CareStream" pilot switch: one account (CS-1001) and administrators only, until Len is satisfied. Every route answers 404 for anyone else and the web hides the button.
// ASK_PILOT_ACCOUNTS (a comma list, for example "CS-1001,CS-1009") adds accounts without a code change.
import { prisma } from '../db/client'

export const ASK_PILOT_DEFAULT = ['CS-1001']
export function askPilotAccounts(env: string | undefined = process.env.ASK_PILOT_ACCOUNTS): string[] {
  const extra = String(env ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return [...new Set([...ASK_PILOT_DEFAULT, ...extra])]
}
export const isAskPilotAccount = (accountNumber: string | null | undefined, env?: string): boolean =>
  !!accountNumber && askPilotAccounts(env).includes(String(accountNumber).trim().toUpperCase())

const memo = new Map<string, { at: number; v: boolean }>()
export async function askPilotEnabled(tenantId: string): Promise<boolean> {
  const hit = memo.get(tenantId)
  if (hit && Date.now() - hit.at < 60_000) return hit.v
  let v = false
  try { v = isAskPilotAccount((await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true } }))?.account_number) } catch { v = false }
  memo.set(tenantId, { at: Date.now(), v })
  return v
}

/** Who may use Ask CareStream in this account: administrators, and deciding managers only when the account has switched on "Let managers use Ask CareStream". Never a shared tablet. */
export async function askRoleFor(tenantId: string, user: { sub: string; role?: string; dev?: unknown }): Promise<'admin' | 'manager' | null> {
  if (user.dev) return null
  if (!(await askPilotEnabled(tenantId))) return null
  if (user.role === 'admin') return 'admin'
  if (user.role !== 'staff') return null
  try {
    const { loadAskSettings } = await import('../services/ask/actions/settings')
    if (!(await loadAskSettings(tenantId)).managers_can_use) return null
    const u = await (prisma as any).user.findFirst({ where: { id: user.sub, tenant_id: tenantId, is_active: true, is_shared: false }, select: { job_role: true } })
    const { isManagerJobRole } = await import('./care-manager')
    return isManagerJobRole(u?.job_role) ? 'manager' : null
  } catch { return null }
}
