// API allow list for Free tenants.
//
// Until now the only thing keeping a tenant out of the features it has not paid for was the
// web app's middleware; the API trusted any valid token. That was tolerable while every tenant
// had a card, but a Free tenant costs us money on every AI route it can reach, so the API itself
// is default closed for them: a route that is not listed here answers 402 UPGRADE_REQUIRED.
//
// Paid tenants (and every tier other than 'free') pass straight through after one cached tier
// lookup, so a bug here cannot affect them.

import { Request, Response, NextFunction } from 'express'
import { tierOf } from '../lib/tiers'

// Prefix (or exact) matches on the request path. The analytics group is listed route by route
// because most of /analytics is paid: adopting a fix, approvals, publishing, training and
// onboarding generated from a gap, and the CQC report all stay behind a plan.
const ALLOW: RegExp[] = [
  /^\/audits(\/|$)/,                                   // every platform audit; custom audit routes keep their own plan flag
  /^\/policies(\/|$)/,                                 // upload and manage (the lifetime allowance is enforced inside); intake is denied below
  /^\/users(\/|$)/,                                    // unlimited staff logins (emails are rate capped in the route)
  /^\/billing(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/sites(\/|$)/,
  /^\/feedback(\/|$)/,
  /^\/support-requests(\/|$)/,
  /^\/feature-requests(\/|$)/,
  /^\/me\/(profile|counts|document-categories|push\/.*|audit-approvals(\/.*)?|actions(\/.*)?|external-actions(\/.*)?)$/,
  // The four gap analyses and what belongs to them.
  /^\/analytics\/gaps$/,
  /^\/analytics\/gaps\/(pipeline|missing-policies|run-state|analyse|analyse\/start|analyse\/batch|detect-section|acknowledge-remediation|acknowledge-analysis)$/,
  /^\/analytics\/gaps\/alerts\/[^/]+\/dismiss$/,
  /^\/analytics\/gaps\/[^/]+\/(detail|decision|complete|reopen)$/,   // detail is metered by a 3 example taster in the route
  /^\/analytics\/policy-lint(\/.*)?$/,
  /^\/analytics\/review-resolutions$/,
  /^\/analytics\/consistency(\/.*)?$/,
  /^\/analytics\/wording-alignment(\/.*)?$/,
  /^\/analytics\/readiness$/,
]

// Denied even though the prefix above matches.
const DENY: RegExp[] = [
  /^\/policies\/intake(\/|$)/,            // the paid AI policy writer
  /^\/policies\/[^/]+\/(minor-edit|legislation-pdf)$/,
  /^\/audits\/templates\/import$/,        // AI import (also needs has_custom_audits)
]

export function freeRouteAllowed(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  if (DENY.some(r => r.test(p))) return false
  return ALLOW.some(r => r.test(p))
}

export async function freeTierGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenantId = req.user?.tenant_id
  if (!tenantId) { next(); return }
  let tier = 'full'
  try { tier = await tierOf(tenantId) } catch { /* fail open: tierOf already does */ }
  if (tier !== 'free' || freeRouteAllowed(req.path)) { next(); return }
  res.status(402).json({
    success: false,
    error: { code: 'UPGRADE_REQUIRED', message: 'This is not included in the free plan. Move to a paid plan to use it. Everything you have is kept.' },
  })
}
