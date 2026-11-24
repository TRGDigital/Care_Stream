// Which admin pages each kind of account can open. The sidebar and the admin search both read these, so they cannot disagree.
// Training only buyers, policies only buyers and Free accounts see the rest locked (the sidebar's upsell).
export const TRAINING_ONLY_NAV = new Set(['/dashboard', '/group', '/staff', '/notifications', '/training', '/analytics', '/settings', '/licences', '/billing'])
// Policies only buyers came in through the shop with no hub and no subscription: Policies, Settings and Billing.
export const POLICIES_ONLY_NAV = new Set(['/policies', '/settings', '/billing'])
// Free accounts: audits, the policy library, gap analysis, staff, settings, billing and help. Everything else opens the paid plans overlay.
export const FREE_NAV = new Set(['/dashboard', '/audits', '/gaps', '/policies', '/staff', '/notifications', '/training', '/training/annual', '/settings', '/billing', '/guides'])
// Items that exist only for full (subscribed) and free accounts; the two shop tiers never see them.
export const NOT_FOR_SHOP_TIERS = new Set(['/training/annual'])

export type AccountKind = { trainingOnly?: boolean; policiesOnly?: boolean; freeTier?: boolean }

/** The sidebar path an href belongs to: '/training?tab=matrix' and '/guides#audits' belong to '/training' and '/guides'. */
export function basePath(href: string): string {
  const p = href.split('#')[0].split('?')[0]
  // /training/annual and /analytics/cqc-report are sidebar items of their own; other subpaths belong to their parent.
  if (p === '/training/annual' || p === '/analytics/cqc-report') return p
  if (p === '/training/diplomas') return '/training'
  return p
}

/** null when the account can open it; otherwise why not. */
export function tierLock(href: string, a: AccountKind): 'tier' | null {
  const p = basePath(href)
  if (a.policiesOnly) return POLICIES_ONLY_NAV.has(p) ? null : 'tier'
  if (a.trainingOnly) return TRAINING_ONLY_NAV.has(p) && !NOT_FOR_SHOP_TIERS.has(p) ? null : 'tier'
  if (a.freeTier) return FREE_NAV.has(p) ? null : 'tier'
  return null
}

// ── Search: what an account may open, and what is shown to it at all ──────────────────────────────────────────────────────────
export type PlanFlags = Partial<Record<'has_advanced_analytics' | 'has_cqc_report' | 'has_gap_detection' | 'has_face_to_face' | 'has_custom_audits' | 'has_effectiveness' | 'has_training_impact' | 'has_workforce_compliance' | 'has_supervisions', boolean>>
export type Lock = { kind: 'tier' } | { kind: 'plan'; plan: string } | null

/** Is this entry shown to this account at all? Benchmarking is for multi site accounts and Licences for training only accounts: elsewhere they are simply not there. */
export function visibleTo(only: 'multisite' | 'training_only' | undefined, a: AccountKind & { multiSite?: boolean }): boolean {
  if (only === 'multisite') return !!a.multiSite
  if (only === 'training_only') return !!a.trainingOnly
  return true
}

/**
 * null when the account can open it. 'tier' = the account type does not include that part of CareStream (Free, training only,
 * policies only): the sidebar's "see what CareStream adds" panel. 'plan' = a paid plan below the one that includes it.
 * features is null while the plan is still loading: never lock on a guess (same rule as the sidebar).
 */
export function lockFor(href: string, requires: { feature: keyof PlanFlags; plan: string } | undefined, a: AccountKind, features: PlanFlags | null): Lock {
  if (tierLock(href, a)) return { kind: 'tier' }
  if (requires && features && !features[requires.feature]) return { kind: 'plan', plan: requires.plan }
  return null
}
