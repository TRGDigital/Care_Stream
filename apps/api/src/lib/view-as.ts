// "View hub as": an admin looks at a staff member's hub, to see what the person sees. Per account, behind tenant feature flags so it can
// be tried on one test account first:
//   view_as_hub  true  the admin can look (read only: nothing can be changed)
//   view_as_act  true  as well, the admin can act as the person (complete a course, answer a question). It only counts on a TEST account
//                      (feature_flags.is_test): acting as a real person would falsify their training record, so it is refused on any other.
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { writeAuditLog } from './audit'

export type ViewAsMode = 'off' | 'view' | 'act'

/** Pure: what a tenant's flags allow. */
export function modeFromFlags(flags: unknown): ViewAsMode {
  const f = (flags ?? {}) as Record<string, unknown>
  if (f.view_as_hub !== true) return 'off'
  return f.view_as_act === true && f.is_test === true ? 'act' : 'view'
}

/** What this account allows. 'act' implies the admin may also just look. */
export async function viewAsAllowed(tenantId: string): Promise<ViewAsMode> {
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { feature_flags: true } })
    return modeFromFlags(t?.feature_flags)
  } catch { return 'off' }
}

/** Pure: which mode may be started, given what the account allows and what was asked for. null = not allowed. */
export function resolveViewAsMode(allowed: ViewAsMode, asked: unknown): 'view' | 'act' | null {
  if (allowed === 'off') return null
  if (asked === 'act') return allowed === 'act' ? 'act' : null
  return 'view'
}

// The token alone would otherwise keep working for its 45 minutes after the flag is switched off or the account stops being a test
// account, so every request made with a view token re-checks the account (cached for 30 seconds: one lookup per tenant, not per request).
const cache = new Map<string, { at: number; mode: ViewAsMode }>()
const TTL = 30_000
async function allowedCached(tenantId: string): Promise<ViewAsMode> {
  const hit = cache.get(tenantId)
  if (hit && Date.now() - hit.at < TTL) return hit.mode
  const mode = await viewAsAllowed(tenantId)
  cache.set(tenantId, { at: Date.now(), mode })
  return mode
}

/** Mounted straight after requireAuth. Does nothing for ordinary tokens. */
export async function viewAsGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const imp = req.user?.imp
  if (!imp) { next(); return }
  const allowed = await allowedCached(req.user!.tenant_id)
  if (allowed === 'off' || (imp.mode === 'act' && allowed !== 'act')) {
    res.status(403).json({ success: false, error: { code: 'VIEW_ENDED', message: 'This view has been switched off for the account. Go back to admin.' } })
    return
  }
  // Acting as someone: every change is recorded against the admin who made it (the data itself is recorded as the staff member).
  if (imp.mode === 'act' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    void writeAuditLog({ tenant_id: req.user!.tenant_id, user_id: imp.by, event_type: 'admin_view_as_action', entity_type: 'user', entity_id: req.user!.sub, metadata: { method: req.method, path: req.originalUrl.split('?')[0].slice(0, 200) } })
  }
  next()
}
