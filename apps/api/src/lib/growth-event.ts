// Tells the Growth Engine (the TRG lead engine) that someone created a free account, so a cold email sequence for that provider stops
// (docs: trg-lead-engine/docs/growth-events-api.md). Fire and forget: it never throws and never waits on anything but its own 3 second timeout,
// so the Growth Engine being down can never slow or fail a registration. Does nothing until GROWTH_SECRET_CARESTREAM is set.

type Deps = { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> }

export async function reportSignupToGrowth(
  a: { email: string; tenantId: string; growthRef?: string | null },
  deps: Deps = {},
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const env = deps.env ?? process.env
  const secret = env.GROWTH_SECRET_CARESTREAM
  if (!secret) return { ok: false, skipped: 'not configured' }
  const base = (env.GROWTH_ENGINE_URL || 'https://trg-lead-engine.vercel.app').replace(/\/$/, '')
  try {
    const r = await (deps.fetchImpl ?? fetch)(`${base}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-growth-secret': secret },
      body: JSON.stringify({
        kind: 'signup',
        email: a.email,
        ...(a.growthRef ? { contact_ref: a.growthRef } : {}),
        idempotency_key: `signup-${a.tenantId}`,
        detail: { tier: 'free', tenant_id: a.tenantId, source: a.growthRef ? 'growth_email' : 'organic' },
      }),
      signal: AbortSignal.timeout(3000),
    })
    return { ok: r.ok }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) }
  }
}
