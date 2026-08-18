// Keep upstream AI provider errors away from tenants.
//
// The SDKs raise messages written for whoever holds the account, not for the care home using
// the product: "You have no credits remaining. Add credits to continue using the API at
// https://platform.openai.com/settings/organization/billing/". Routes pass `e.message`
// straight into err(), so that text — and that billing link — reached tenants verbatim.
//
// Two things happen here. The tenant gets a plain message that tells them what to do
// (nothing, wait, come back) without exposing a supplier, an account or a URL. And we get an
// email, because a credit failure is silent otherwise: analyses simply stop working and the
// only signal is a tenant complaining.
//
// Detection is deliberately conservative. Rewriting a genuine business error into "internal
// error" would hide something the tenant needs to act on, so a message is only replaced when
// it clearly comes from a provider or the infrastructure underneath us.

import { sendProviderCreditAlert } from '../services/email/outbound'

export type ProviderIssue = 'credit' | 'rate_limit' | 'upstream'

// Billing/quota exhaustion — the account is out of money or over its cap. Needs a human.
const CREDIT_RE = /insufficient_quota|no credits remaining|billing|add credits|quota exceeded|exceeded your current quota|payment required|credit balance (is )?too low|purchase credits/i

// Temporary provider throttling. Recovers on its own, so it is not a billing alert.
const RATE_LIMIT_RE = /rate.?limit|too many requests|429|overloaded|capacity/i

// Anything else that names a provider, an account or an API — never for tenant eyes.
const UPSTREAM_RE = /platform\.openai\.com|console\.anthropic\.com|api\.openai\.com|api\.anthropic\.com|openai|anthropic|pinecone|sendgrid|api key|apikey|authentication.*failed.*api|invalid_request_error|\bsk-[a-z0-9-]/i

export function classifyProviderError(message: string | null | undefined): ProviderIssue | null {
  const m = String(message ?? '')
  if (!m) return null
  if (CREDIT_RE.test(m)) return 'credit'
  // Order matters: an exhausted quota often also reads as a 429, and that is a billing
  // problem rather than a throttle, so credit is tested first.
  if (RATE_LIMIT_RE.test(m)) return 'rate_limit'
  if (UPSTREAM_RE.test(m)) return 'upstream'
  return null
}

// What the tenant sees instead. No supplier, no account, no link — and an honest statement of
// whether waiting will help, because "try again" is wrong advice when credits have run out.
export function tenantMessageFor(issue: ProviderIssue): string {
  switch (issue) {
    case 'credit':
      return 'This didn’t run because of a small internal error on our side. Our team has been alerted and is on it — nothing is wrong with your policies, and nothing you have done has been lost. Please try again a little later.'
    case 'rate_limit':
      return 'The service is busy at the moment, so this didn’t run. Nothing has been lost — please try again in a few minutes.'
    case 'upstream':
      return 'This didn’t run because of a small internal error on our side. Our team has been alerted. Nothing you have done has been lost — please try again shortly.'
  }
}

// ─── Internal alerting ────────────────────────────────────────────────────────
//
// Throttled per issue type: a credit outage breaks every analysis for every tenant, so an
// unthrottled alert would send hundreds of identical emails in a minute. One per quiet
// period is enough to act on.
const QUIET_MS: Record<ProviderIssue, number> = {
  credit:     30 * 60 * 1000,   // needs a human; re-nag every half hour while it persists
  rate_limit: 6 * 60 * 60 * 1000, // usually self-resolving; report rarely
  upstream:   60 * 60 * 1000,
}

// In-process. A recycled serverless instance means at worst a duplicate alert, which is far
// better than a table write on every error.
const lastAlert = new Map<string, number>()

// Only reports whether we are due — it must NOT record the send. Marking here would burn the
// quiet period on an alert that then failed to send, silencing the next real one.
function isDue(issue: ProviderIssue, force = false): boolean {
  if (force) return true
  const prev = lastAlert.get(issue) ?? 0
  return Date.now() - prev >= QUIET_MS[issue]
}

/**
 * Report a provider failure to the team. Never throws into the caller — an alert failing
 * must not turn a handled error into a crashed request.
 */
export async function alertProviderIssue(opts: {
  issue: ProviderIssue
  rawMessage: string
  context?: string          // route or operation, so the email says where it surfaced
  force?: boolean           // bypass throttling (used by the test endpoint)
}): Promise<boolean> {
  const to = process.env.PROVIDER_ALERT_EMAIL || 'lenny@trgdigital.co.uk'
  if (!isDue(opts.issue, opts.force)) return false
  try {
    const sent = await sendProviderCreditAlert({
      to,
      issue: opts.issue,
      rawMessage: opts.rawMessage,
      context: opts.context ?? 'Unknown',
      when: new Date(),
    })
    // Start the quiet period only once it genuinely went out.
    if (sent) lastAlert.set(opts.issue, Date.now())
    return sent
  } catch (e: any) {
    console.error('[provider-alert] failed to send:', e?.message)
    return false
  }
}

/**
 * Sanitise an outbound error message. Returns the original when it is an ordinary business
 * error, and a tenant-safe replacement when it came from a provider — raising an internal
 * alert as a side effect. The raw message is always logged so we keep the diagnostic.
 */
export function sanitiseErrorMessage(message: string, context?: string): string {
  const issue = classifyProviderError(message)
  if (!issue) return message
  console.error(`[provider-error:${issue}] ${context ?? ''} — ${message}`)
  void alertProviderIssue({ issue, rawMessage: message, context })
  return tenantMessageFor(issue)
}
