// "View hub as": an admin looks at a staff member's hub, to see what the person sees. Per account, behind tenant feature flags so it can
// be tried on one test account first:
//   view_as_hub  true  the admin can look (read only: nothing can be changed)
//   view_as_act  true  as well, the admin can act as the person (complete a course, answer a question). For test accounts only.
import { prisma } from '../db/client'

export type ViewAsMode = 'off' | 'view' | 'act'

/** What this account allows. 'act' implies the admin may also just look. */
export async function viewAsAllowed(tenantId: string): Promise<ViewAsMode> {
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { feature_flags: true } })
    const f = (t?.feature_flags ?? {}) as Record<string, unknown>
    if (f.view_as_hub !== true) return 'off'
    return f.view_as_act === true ? 'act' : 'view'
  } catch { return 'off' }
}

/** Pure: which mode may be started, given what the account allows and what was asked for. null = not allowed. */
export function resolveViewAsMode(allowed: ViewAsMode, asked: unknown): 'view' | 'act' | null {
  if (allowed === 'off') return null
  if (asked === 'act') return allowed === 'act' ? 'act' : null
  return 'view'
}
