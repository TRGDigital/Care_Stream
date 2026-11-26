// NO CAP is now STANDARD (26 Nov 2026, after it was checked on CS-1001): every account reads every point of a regulation and every page of a policy.
// NO_CAP_ACCOUNTS stays as a switch back: set it to a comma list of account numbers (for example CS-1001) and ONLY those accounts read without the old limits (8 or 12 points, 24,000 or 60,000 characters), or to * for everyone.
import { prisma } from '../../db/client'
import { textWindows } from './in-batches'

const cache = new Map<string, { at: number; open: boolean }>()
export const noCapList = (): string[] => String(process.env.NO_CAP_ACCOUNTS ?? '*').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

/** True when this tenant's account reads with no cap: everyone by default, or only the accounts in NO_CAP_ACCOUNTS when that is set. A lookup that fails (only when the list names accounts) means the old limits. */
export async function noCapFor(tenantId: string): Promise<boolean> {
  const list = noCapList()
  if (list.includes('*') || list.includes('ALL')) return true
  const hit = cache.get(tenantId)
  if (hit && Date.now() - hit.at < 60_000) return hit.open
  let open = false
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true } })
    open = !!t?.account_number && list.includes(String(t.account_number).toUpperCase())
  } catch { open = false }
  cache.set(tenantId, { at: Date.now(), open })
  return open
}

/** The parts of a text to read: with no cap on, every part (one part when it fits); with the old limits, the first `cap` characters only, as before. */
export const partsOf = (text: string, cap: number, open: boolean): string[] => (open ? textWindows(text, cap) : [String(text ?? '').slice(0, cap)])
