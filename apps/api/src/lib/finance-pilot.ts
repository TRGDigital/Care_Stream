// The finance pilot switch (resident funding and fees). Until Len is satisfied it is working properly it exists for ONE account only (CS-1001).
// Everything is behind this: the API routes answer 404 for any other account, and the web hides every funding control.
// FINANCE_PILOT_ACCOUNTS (a comma list, for example "CS-1001,CS-1009") adds accounts without a code change.
import { prisma } from '../db/client'

export const FINANCE_PILOT_DEFAULT = ['CS-1001']

export function financePilotAccounts(env: string | undefined = process.env.FINANCE_PILOT_ACCOUNTS): string[] {
  const extra = String(env ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return [...new Set([...FINANCE_PILOT_DEFAULT, ...extra])]
}

export const isFinancePilotAccount = (accountNumber: string | null | undefined, env?: string): boolean =>
  !!accountNumber && financePilotAccounts(env).includes(String(accountNumber).trim().toUpperCase())

const memo = new Map<string, { at: number; v: boolean }>()
const MEMO_MS = 60_000

/** True when this account is in the finance pilot. Cached for a minute. */
export async function financePilotEnabled(tenantId: string): Promise<boolean> {
  const hit = memo.get(tenantId)
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.v
  let v = false
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true } })
    v = isFinancePilotAccount(t?.account_number)
  } catch { v = false }
  memo.set(tenantId, { at: Date.now(), v })
  return v
}
