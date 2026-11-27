// The Policy testing pilot switch. Until Len is satisfied it works properly, policy testing exists for ONE account (CS-1001).
// The API routes answer 404 for any other account and the web hides the page. POLICY_TESTING_ACCOUNTS (a comma list) adds accounts without a code change.
import { prisma } from '../db/client'
import { pilotsHidden } from './ask-pilot'

export const POLICY_TESTING_DEFAULT = ['CS-1001']

export function policyTestingAccounts(env: string | undefined = process.env.POLICY_TESTING_ACCOUNTS): string[] {
  const extra = String(env ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return [...new Set([...POLICY_TESTING_DEFAULT, ...extra])]
}
export const isPolicyTestingAccount = (accountNumber: string | null | undefined, env?: string): boolean =>
  !!accountNumber && policyTestingAccounts(env).includes(String(accountNumber).trim().toUpperCase())

const memo = new Map<string, { at: number; v: boolean }>()
/** True when this account is in the pilot. Cached for a minute. Any failure means off. */
export async function policyTestingEnabled(tenantId: string): Promise<boolean> {
  const hit = memo.get(tenantId)
  if (hit && Date.now() - hit.at < 60_000) return hit.v
  let v = false
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true, feature_flags: true } })
    v = isPolicyTestingAccount(t?.account_number) && !pilotsHidden(t?.feature_flags)
  } catch { v = false }
  memo.set(tenantId, { at: Date.now(), v })
  return v
}
