// The holiday tracking pilot switch. Until Len is satisfied it is working properly, holiday tracking exists for ONE account only (CS-1001).
// Everything is behind this: the API routes answer 404 for any other account, and the web hides every holiday control.
// HOLIDAY_PILOT_ACCOUNTS (a comma list, for example "CS-1001,CS-1009") adds accounts without a deploy of code changes.
import { prisma } from '../db/client'
import { pilotsHidden } from './ask-pilot'

export const HOLIDAY_PILOT_DEFAULT = ['CS-1001']

export function pilotAccounts(env: string | undefined = process.env.HOLIDAY_PILOT_ACCOUNTS): string[] {
  const extra = String(env ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return [...new Set([...HOLIDAY_PILOT_DEFAULT, ...extra])]
}

export const isPilotAccount = (accountNumber: string | null | undefined, env?: string): boolean =>
  !!accountNumber && pilotAccounts(env).includes(String(accountNumber).trim().toUpperCase())

const memo = new Map<string, { at: number; v: boolean }>()
const MEMO_MS = 60_000

/** True when this account is in the holiday pilot. Cached for a minute. */
export async function holidayPilotEnabled(tenantId: string): Promise<boolean> {
  const hit = memo.get(tenantId)
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.v
  let v = false
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true, feature_flags: true } })
    v = isPilotAccount(t?.account_number) && !pilotsHidden(t?.feature_flags)   // demo switch: feature_flags.hide_pilots
  } catch { v = false }
  memo.set(tenantId, { at: Date.now(), v })
  return v
}
