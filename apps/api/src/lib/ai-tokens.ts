// Per-tenant AI token allowance.
//
// Each plan carries a monthly token allowance sized at 12% of its subscription
// value. Tenants see a token count because that is a number they can reason
// about; what we actually meter is COST, because token counts are not
// comparable across models. Sonnet costs $4.44 per million tokens and Haiku
// $1.35 — a flat token cap would cost us 3.3x more for the same allowance
// depending on which model a feature happens to route to, and the tenant has no
// control over that routing.
//
// The reconciliation is a fixed reference rate: every call's real USD cost is
// converted into "billed tokens" at REFERENCE_USD_PER_MILLION. A Sonnet call
// therefore consumes about 2.2x its raw token count, and a Haiku call about
// 0.7x. The number on screen stays a token count, the economics stay sound, and
// the two never drift apart because they are the same figure.
//
// The rate is a business constant, not a price: changing it re-prices every
// allowance, so it is set deliberately rather than tracked to the day's model
// mix. Verified against 30 days of real usage on 2026-09-17, when the blended
// rate across all tenant traffic was $1.98 per million.

import { prisma } from '../db/client'
import { PlanLimitError } from './plan-limits'

/** USD per million billed tokens. See the note above before changing this. */
export const REFERENCE_USD_PER_MILLION = 1.98

/** Real spend, expressed in the tokens a tenant sees. */
export function billedTokensFromCost(costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0
  return Math.round((costUsd / REFERENCE_USD_PER_MILLION) * 1_000_000)
}

export interface TokenUsage {
  used:      number
  limit:     number | null
  remaining: number | null
  resets_at: string
  /** What the used figure cost us, for the platform console. Never shown to tenants. */
  cost_usd:  number
}

function monthWindow() {
  const now = new Date()
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), next: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
}

/** Tokens used this month against the plan's allowance. */
export async function getAiTokenUsage(tenantId: string): Promise<TokenUsage> {
  const { start, next } = monthWindow()
  const [tenant, agg] = await Promise.all([
    (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: { select: { monthly_ai_token_limit: true } } },
    }),
    (prisma as any).aiUsageEvent.aggregate({
      where:  { tenant_id: tenantId, created_at: { gte: start } },
      _sum:   { cost_usd: true },
    }),
  ])
  const limit    = (tenant?.plan?.monthly_ai_token_limit ?? null) as number | null
  const costUsd  = (agg?._sum?.cost_usd ?? 0) as number
  const used     = billedTokensFromCost(costUsd)
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(0, limit - used),
    resets_at: next.toISOString(),
    cost_usd:  costUsd,
  }
}

/** Throw if this tenant has spent its monthly token allowance.
 *
 *  Called before GENERATION work only. Everyday staff Q&A is deliberately not
 *  gated on this: a carer asking what the falls policy says at 3am is the use
 *  case the product exists for, and it is governed by the plan's own query
 *  limit instead. Generation is where the money goes anyway — 30 days of real
 *  usage put staff chat at 32 cents against $24 for policy gap analysis. */
export async function checkAiTokenLimit(tenantId: string): Promise<void> {
  const { used, limit } = await getAiTokenUsage(tenantId)
  if (limit !== null && used >= limit) {
    const m = (n: number) => `${(n / 1_000_000).toFixed(1)}M`
    throw new PlanLimitError(
      'AI_TOKEN_LIMIT_REACHED',
      `You have used your ${m(limit)} AI tokens for this month. The allowance resets on the 1st, or you can move up a plan for a larger one. Everyday questions from your staff are not affected.`,
    )
  }
}
