// Free tier: switches, the policy allowance, the AI budget and the signup checks.
//
// Everything here is inert until FREE_TIER_ENABLED=true (or a request carries the preview code).
// Every rule is also guarded by the tenant itself (tier 'free', or a non null
// policies_lifetime_limit), so no existing tenant is ever affected. Design: docs/free-tier.

import crypto from 'crypto'
import { prisma } from '../db/client'
import { PlanLimitError } from './plan-limits'
import { clearTierCache } from './tiers'

// ─── Switches ─────────────────────────────────────────────────────────────────

export const FREE_POLICY_LIMIT = 5
/** Lifetime AI budget for gap analysis on a Free tenant, in USD. */
export const DEFAULT_FREE_AI_BUDGET_USD = Number(process.env.FREE_AI_BUDGET_USD ?? 10)
/** Platform wide safety cap on one day's AI spend by all free tenants together, in USD. */
export const FREE_GLOBAL_DAILY_BUDGET_USD = Number(process.env.FREE_GLOBAL_DAILY_BUDGET_USD ?? 40)

export function freeTierEnabled(): boolean {
  return (process.env.FREE_TIER_ENABLED ?? 'false').toLowerCase() === 'true'
}

/** True when free signups are open, or the request carries the private preview code. */
export function freeSignupAllowed(previewCode?: string | null): boolean {
  if (freeTierEnabled()) return true
  const want = process.env.FREE_TIER_PREVIEW_CODE
  if (!want || !previewCode) return false
  const a = Buffer.from(String(previewCode)), b = Buffer.from(want)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ─── Policy allowance (lifetime, per tenant) ──────────────────────────────────

export interface Allowance { limited: boolean; used: number; limit: number | null; remaining: number | null }

export async function getPolicyAllowance(tenantId: string): Promise<Allowance> {
  const t = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { policies_created_lifetime: true, policies_lifetime_limit: true },
  })
  const limit = (t?.policies_lifetime_limit ?? null) as number | null
  const used = (t?.policies_created_lifetime ?? 0) as number
  return { limited: limit !== null, used, limit, remaining: limit === null ? null : Math.max(0, limit - used) }
}

export class FreePolicyLimitError extends PlanLimitError {
  constructor(public readonly limit: number, public readonly used: number) {
    super('FREE_POLICY_LIMIT_REACHED',
      `Your free account includes ${limit} policies in total and you have used them all. Move to a paid plan to add more. Everything you have is kept.`)
  }
}

/** Count one new policy against the tenant's lifetime allowance.
 *
 *  A tenant with no limit (every paid tenant) is untouched: returns { counted:false } without
 *  writing anything. Otherwise, in one transaction: record the file hash in the ledger (an
 *  identical file already counted is free), then bump the counter with a conditional UPDATE.
 *  The UPDATE takes a row lock, so concurrent uploads cannot overshoot the limit.
 *  Throws FreePolicyLimitError, rolling everything back, when the allowance is spent. */
export async function claimPolicySlot(
  tenantId: string,
  p: { contentHash: string; name?: string | null; policyId?: string | null; source?: string },
): Promise<{ counted: boolean }> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { policies_lifetime_limit: true } })
  const limit = (t?.policies_lifetime_limit ?? null) as number | null
  if (limit === null) return { counted: false }

  return (prisma as any).$transaction(async (tx: any) => {
    const ins: Array<{ id: string }> = await tx.$queryRaw`
      INSERT INTO policy_creation_ledger (tenant_id, content_hash, policy_id, policy_name, source)
      VALUES (${tenantId}, ${p.contentHash}, ${p.policyId ?? null}, ${p.name ?? null}, ${p.source ?? 'upload'})
      ON CONFLICT (tenant_id, content_hash) DO NOTHING
      RETURNING id`
    if (ins.length === 0) return { counted: false }          // this exact file was already counted
    const upd: Array<{ n: number }> = await tx.$queryRaw`
      UPDATE tenants SET policies_created_lifetime = policies_created_lifetime + 1
       WHERE id = ${tenantId} AND policies_created_lifetime < policies_lifetime_limit
      RETURNING policies_created_lifetime AS n`
    if (upd.length === 0) {
      const cur = await tx.tenant.findUnique({ where: { id: tenantId }, select: { policies_created_lifetime: true } })
      throw new FreePolicyLimitError(limit, cur?.policies_created_lifetime ?? limit)
    }
    return { counted: true }
  })
}

/** Give a place back, but only when the policy never became usable (upload failed). A policy
 *  that reached 'active' keeps its place for good: deleting it must not refund the allowance. */
export async function releasePolicySlot(tenantId: string, policy: { id: string; status?: string | null; content_hash?: string | null }): Promise<void> {
  // Only a policy that never became usable gives its place back. An archived or superseded one
  // may have been active, so it never refunds.
  if (!['failed', 'processing'].includes(String(policy.status ?? ''))) return
  try {
    await (prisma as any).$transaction(async (tx: any) => {
      const rows: Array<{ id: string }> = await tx.$queryRaw`
        UPDATE policy_creation_ledger SET released_at = now()
         WHERE tenant_id = ${tenantId} AND released_at IS NULL
           AND (policy_id = ${policy.id} OR (${policy.content_hash ?? null}::text IS NOT NULL AND content_hash = ${policy.content_hash ?? null}))
        RETURNING id`
      if (rows.length) {
        // Release frees the hash too, so the same file can be uploaded again.
        await tx.$executeRaw`DELETE FROM policy_creation_ledger WHERE id = ANY(${rows.map(r => r.id)})`
        await tx.$executeRaw`UPDATE tenants SET policies_created_lifetime = GREATEST(0, policies_created_lifetime - ${rows.length}) WHERE id = ${tenantId} AND policies_lifetime_limit IS NOT NULL`
      }
    })
  } catch (e) { console.error('[free-tier] release slot failed', e) }
}

// ─── AI budget ────────────────────────────────────────────────────────────────

/** Lifetime AI spend of a Free tenant during its current free period, in USD. */
export async function freeAiSpendUsd(tenantId: string): Promise<{ spent: number; budget: number }> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { free_ai_budget_usd: true, free_since: true, created_at: true } })
  const since: Date = t?.free_since ?? t?.created_at ?? new Date(0)
  const agg = await (prisma as any).aiUsageEvent.aggregate({ where: { tenant_id: tenantId, created_at: { gte: since } }, _sum: { cost_usd: true } })
  const budget = t?.free_ai_budget_usd != null ? Number(t.free_ai_budget_usd) : DEFAULT_FREE_AI_BUDGET_USD
  return { spent: Number(agg?._sum?.cost_usd ?? 0), budget }
}

/** Today's AI spend by all Free tenants together, in USD (UTC day). */
export async function freeGlobalSpendToday(): Promise<number> {
  const rows: Array<{ s: number | null }> = await (prisma as any).$queryRaw`
    SELECT COALESCE(SUM(e.cost_usd), 0)::float AS s
      FROM ai_usage_events e JOIN tenants t ON t.id = e.tenant_id
     WHERE t.tier = 'free' AND e.created_at >= date_trunc('day', now())`
  return Number(rows?.[0]?.s ?? 0)
}

/** Throw when a Free tenant has spent its lifetime AI budget, or the platform wide daily cap
 *  for free tenants is reached. A no op for every other tier. Called from checkAiCreditLimit. */
export async function checkFreeAiBudget(tenantId: string): Promise<void> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
  if (t?.tier !== 'free') return
  const { spent, budget } = await freeAiSpendUsd(tenantId)
  if (spent >= budget) {
    throw new PlanLimitError('FREE_AI_BUDGET_REACHED',
      'You have used the free analysis allowance for this account. Move to a paid plan to keep running analyses. Your results are kept.')
  }
  if ((await freeGlobalSpendToday()) >= FREE_GLOBAL_DAILY_BUDGET_USD) {
    throw new PlanLimitError('FREE_DAILY_PAUSE',
      'Free analyses are paused for today because of high demand. Please try again tomorrow, or move to a paid plan.')
  }
}

// ─── Small counters (drill-in taster, monthly forced re-run) ──────────────────

export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

export async function counterGet(tenantId: string, key: string, period = ''): Promise<number> {
  const r = await (prisma as any).freeUsageCounter.findUnique({ where: { tenant_id_key_period: { tenant_id: tenantId, key, period } } })
  return r?.n ?? 0
}

/** Atomically take one unit if fewer than `max` have been used. Returns false when spent. */
export async function counterTake(tenantId: string, key: string, max: number, period = ''): Promise<boolean> {
  const rows: Array<{ n: number }> = await (prisma as any).$queryRaw`
    INSERT INTO free_usage_counters (tenant_id, key, period, n) VALUES (${tenantId}, ${key}, ${period}, 1)
    ON CONFLICT (tenant_id, key, period) DO UPDATE SET n = free_usage_counters.n + 1
      WHERE free_usage_counters.n < ${max}
    RETURNING n`
  return rows.length > 0
}

// ─── Signup checks ────────────────────────────────────────────────────────────

const WEBMAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
  'btinternet.com', 'btopenworld.com', 'sky.com', 'talktalk.net', 'virginmedia.com', 'ntlworld.com', 'tiscali.co.uk',
])
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com', 'tempmail.com', 'temp-mail.org',
  'yopmail.com', 'trashmail.com', 'throwawaymail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com',
  'maildrop.cc', 'fakeinbox.com', 'mailnesia.com', 'mintemail.com', 'emailondeck.com', 'tempail.com',
])

export const emailDomain = (email: string) => String(email).trim().toLowerCase().split('@')[1] ?? ''
export const isWebmail = (domain: string) => WEBMAIL.has(domain.toLowerCase())
export const isDisposableDomain = (domain: string) => DISPOSABLE.has(domain.toLowerCase())

const hashIp = (ip: string) => crypto.createHash('sha256').update(`${process.env.JWT_SECRET ?? 'cs'}|${ip}`).digest('hex').slice(0, 32)

export type FreeSignupVerdict = { ok: true } | { ok: false; code: string; message: string }

/** Abuse checks for a Free signup. Records the attempt either way. */
export async function checkFreeSignup(email: string, ip: string, honeypot?: string | null): Promise<FreeSignupVerdict> {
  const domain = emailDomain(email)
  const ipHash = hashIp(ip || 'unknown')
  const record = (outcome: string) => (prisma as any).signupAttempt.create({ data: { ip_hash: ipHash, email_domain: domain, outcome } }).catch(() => {})
  const deny = async (code: string, message: string, outcome: string): Promise<FreeSignupVerdict> => { await record(outcome); return { ok: false, code, message } }

  if (honeypot) return deny('SIGNUP_REJECTED', 'We could not create this account.', 'honeypot')
  if (isDisposableDomain(domain)) return deny('DISPOSABLE_EMAIL', 'Please use your work email address. Temporary email services are not accepted.', 'disposable')

  const day = new Date(Date.now() - 24 * 3600_000)
  const fromIp = await (prisma as any).signupAttempt.count({ where: { ip_hash: ipHash, outcome: 'created', created_at: { gte: day } } })
  if (fromIp >= 3) return deny('SIGNUP_LIMIT', 'Too many free accounts have been created from this connection today. Please try again tomorrow or contact us.', 'ip_limit')

  if (!isWebmail(domain)) {
    // One free account per company email domain. The people at that organisation can be added as staff.
    const existing = await (prisma as any).user.findFirst({
      where: { email: { endsWith: `@${domain}`, mode: 'insensitive' }, tenant: { tier: 'free' }, role: 'admin' }, select: { id: true },
    })
    if (existing) return deny('DOMAIN_HAS_FREE_ACCOUNT', 'Your organisation already has a free CareStream account. Ask your colleague to add you as a user, or contact us and we will help.', 'domain_exists')
  }
  await record('created')
  return { ok: true }
}

// ─── Downgrade (a paid tenant cancels and falls back to Free) ─────────────────

/** Move a tenant that cancelled its subscription to the Free plan, keeping all its data.
 *
 *  Exact behaviour:
 *  - tier 'free', plan Free, status 'active', stripe subscription cleared (customer id kept so a
 *    later upgrade reuses it), free_since = now (the AI budget starts from this moment, so
 *    spend during the paid period is not counted against them).
 *  - Nothing is deleted or archived. Existing policies stay, and every analysis still reads all
 *    of them (so a downgraded tenant with more than 5 policies analyses more than 5; the AI
 *    budget is what bounds that).
 *  - policies_lifetime_limit = 5 and policies_created_lifetime = max(current counter, number of
 *    non archived policies). So a tenant holding 5 or more policies cannot add any more, and a
 *    tenant with fewer can add policies up to the lifetime total of 5.
 *  Returns false (and does nothing) when the free tier is not enabled or no Free plan exists. */
export async function downgradeToFree(tenantId: string): Promise<boolean> {
  if (!freeTierEnabled()) return false
  const free = await (prisma as any).plan.findUnique({ where: { name: 'Free' }, select: { id: true } })
  if (!free) return false
  const held = await (prisma as any).policy.count({ where: { tenant_id: tenantId, status: { not: 'archived' } } })
  await (prisma as any).$executeRaw`
    UPDATE tenants SET tier = 'free', plan_id = ${free.id}, subscription_status = 'active',
           stripe_subscription_id = NULL, trial_ends_at = NULL, free_since = now(),
           policies_lifetime_limit = ${FREE_POLICY_LIMIT},
           policies_created_lifetime = GREATEST(policies_created_lifetime, ${held})
     WHERE id = ${tenantId}`
  clearTierCache(tenantId)
  return true
}

/** The reverse: a Free tenant that now has a paid subscription is no longer limited. A no op for
 *  any tenant that is not on the Free tier. Also swaps the email drip from the free campaign to the
 *  plan drip. Data is untouched: it is the same tenant. */
export async function liftFreeLimits(tenantId: string): Promise<void> {
  const r = await (prisma as any).tenant.updateMany({
    where: { id: tenantId, tier: 'free' },
    data: { tier: 'full', policies_lifetime_limit: null, free_since: null },
  })
  if (!r.count) return
  clearTierCache(tenantId)
  try {
    await (prisma as any).onboardingEnrolment.updateMany({ where: { tenant_id: tenantId, campaign: 'free_plan', status: 'active' }, data: { status: 'completed' } })
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { plan: { select: { name: true } } } })
    if (t?.plan?.name) {
      const { enrolTenant, ukNow } = await import('../services/onboarding/dispatch')
      await enrolTenant(tenantId, t.plan.name, ukNow().dateStr)
    }
  } catch (e) { console.error('[free-tier] drip swap failed', e) }
}

// ─── Staff safeguards (the number of staff is NOT limited) ─────────────────────

/** Light caps for Free tenants so unlimited staff logins cannot be used as an email relay:
 *  50 staff emails a day and 60 invites an hour per tenant. A no op for every other tier. */
export async function freeStaffGuard(tenantId: string, kind: 'email' | 'invite'): Promise<void> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
  if (t?.tier !== 'free') return
  const iso = new Date().toISOString()
  const ok = kind === 'email'
    ? await counterTake(tenantId, 'staff_email', 50, iso.slice(0, 10))
    : await counterTake(tenantId, 'staff_invite', 60, iso.slice(0, 13))
  if (!ok) {
    throw new PlanLimitError('FREE_STAFF_RATE',
      kind === 'email' ? 'Free accounts can send up to 50 staff emails a day. Please try again tomorrow, or share the sign in link yourself.'
                       : 'Free accounts can add up to 60 staff an hour. Please try again shortly.')
  }
}
