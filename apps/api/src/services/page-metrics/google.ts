// Minimal Google API client for the page-performance job: a service account JWT exchanged for an
// access token (no googleapis dependency), then Search Console and GA4 Data API calls.
// Credentials: GOOGLE_ANALYTICS_SA_JSON (the traffic reporting service account, full JSON key) or,
// failing that, GOOGLE_SERVICE_ACCOUNT_JSON. The account must be a user on the Search Console
// property and the GA4 property.
import crypto from 'crypto'

export const GSC_SITE = process.env.GSC_SITE_URL || 'sc-domain:carestreamai.com'
export const GA4_PROPERTY = process.env.GA4_PROPERTY_ID || '545969251'
const SCOPES = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly'

let cached: { token: string; exp: number } | null = null
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_ANALYTICS_SA_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
}

export async function googleToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const raw = process.env.GOOGLE_ANALYTICS_SA_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_ANALYTICS_SA_JSON is not set')
  const key = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64(JSON.stringify({ iss: key.client_email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64(sig)}` }),
  })
  const j: any = await res.json()
  if (!j.access_token) throw new Error(`Google token error: ${j.error_description ?? j.error ?? res.status}`)
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return cached.token
}

async function post(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await googleToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Google API ${res.status}: ${JSON.stringify(j?.error?.message ?? j).slice(0, 200)}`)
  return j
}

/** Search Console rows for blog and collection pages. dimensions: ['page','date'] or ['page','query']. */
export async function gscQuery(startDate: string, endDate: string, dimensions: string[]): Promise<Array<{ keys: string[]; clicks: number; impressions: number; position: number }>> {
  const out: any[] = []
  for (let startRow = 0; startRow < 100_000; startRow += 25_000) {
    const j = await post(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
      startDate, endDate, dimensions, rowLimit: 25_000, startRow, dataState: 'final',
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'includingRegex', expression: '/(blog|collection)/[^/?#]+/?$' }] }],
    })
    const rows = j.rows ?? []
    out.push(...rows)
    if (rows.length < 25_000) break
  }
  return out
}

/** GA4 sessions and engagement by page path and day. Read in 30 day chunks with a retry on 5xx: one large
 *  request returned a bare 502 from the Data API. */
export async function ga4Pages(startDate: string, endDate: string): Promise<Array<{ path: string; date: string; sessions: number; engaged: number }>> {
  const out: Array<{ path: string; date: string; sessions: number; engaged: number }> = []
  const DAY = 86_400_000
  const end = new Date(endDate + 'T00:00:00Z').getTime()
  for (let from = new Date(startDate + 'T00:00:00Z').getTime(); from <= end; from += 30 * DAY) {
    const to = Math.min(from + 29 * DAY, end)
    const body = {
      dateRanges: [{ startDate: new Date(from).toISOString().slice(0, 10), endDate: new Date(to).toISOString().slice(0, 10) }],
      dimensions: [{ name: 'pagePath' }, { name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'userEngagementDuration' }],
      dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'PARTIAL_REGEXP', value: '^/(blog|collection)/[^/?#]+/?$' } } },
      limit: 20000,
    }
    let j: any = null
    for (let attempt = 0; attempt < 3 && !j; attempt++) {
      try { j = await post(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`, body) }
      catch (e: any) { if (attempt === 2 || !/Google API 5/.test(String(e?.message))) throw e; await new Promise(r => setTimeout(r, 1500 * (attempt + 1))) }
    }
    for (const r of j?.rows ?? []) out.push({ path: r.dimensionValues[0].value, date: r.dimensionValues[1].value, sessions: Number(r.metricValues[0].value), engaged: Math.round(Number(r.metricValues[1].value)) })
  }
  return out
}
