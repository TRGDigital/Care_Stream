// ─── Attribution: which visit (and ad campaign) a sale came from ─────────────
// The browser sends Funnel Insights' anonymous session id, the visit's source, its utm_campaign
// and whether a Google click id was present. It rides on the Stripe session as metadata (never
// trusted for money, only for reporting) and goes to Funnel Insights with the sale.

export interface Attribution { session: string; source: string; campaign: string; gclid: boolean }

export function cleanAttribution(raw: any): Attribution | null {
  if (!raw || typeof raw !== 'object') return null
  const t = (v: unknown, n: number) => String(v ?? '').replace(/[^\w .:@/+-]/g, '').slice(0, n)
  const session = t(raw.session, 64)
  if (!session) return null
  return { session, source: t(raw.source, 60), campaign: t(raw.campaign, 100), gclid: raw.gclid === true }
}

export function attributionMeta(a: Attribution | null | undefined): Record<string, string> {
  if (!a) return {}
  return { fi_sid: a.session, fi_src: a.source, ...(a.campaign ? { fi_cmp: a.campaign } : {}), ...(a.gclid ? { fi_gclid: '1' } : {}) }
}

export function attributionFromMeta(md: Record<string, string> | undefined): Attribution | null {
  if (!md?.fi_sid) return null
  return { session: md.fi_sid, source: md.fi_src || '', campaign: md.fi_cmp || '', gclid: md.fi_gclid === '1' }
}
