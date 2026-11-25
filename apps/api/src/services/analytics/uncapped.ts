// WHO GETS "NO CAP". Reading every point of a regulation and every page of a policy (instead of the first 8 or 12 points and the first 24,000 or 60,000 characters) is switched on per account while it
// is checked: NO_CAP_ACCOUNTS is a comma list of account numbers (default CS-1001), or * for everyone. Every other account keeps the old limits exactly.
import { prisma } from '../../db/client'
import { textWindows } from './in-batches'

const cache = new Map<string, { at: number; open: boolean }>()
export const noCapList = (): string[] => String(process.env.NO_CAP_ACCOUNTS ?? 'CS-1001').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

/** True when this tenant's account is switched on for the no cap reading. Looked up once a minute; any failure means the old limits (never the new behaviour by accident). */
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
