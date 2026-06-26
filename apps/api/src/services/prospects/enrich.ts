// Decision-maker enrichment for prospects. Two best-effort sources:
//   1. The provider's own website — scrape homepage + likely contact pages for a
//      usable contact email (no API key needed).
//   2. Companies House — match the provider name to a company and pull its active
//      directors, giving a named decision-maker (needs COMPANIES_HOUSE_API_KEY,
//      a free key; skipped silently if not set).
// Everything is wrapped in try/catch and time-bounded — partial results are fine.

export interface EnrichInput {
  name: string
  website: string | null
}

export interface EnrichResult {
  contactName: string | null
  contactRole: string | null
  email: string | null
  companyNumber: string | null
  source: 'website' | 'companies-house' | 'website+companies-house' | 'none'
  notes: string | null
}

const UA = 'Mozilla/5.0 (CareStream prospect research)'

async function getText(url: string, ms = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function normaliseUrl(website: string): string | null {
  try {
    const u = new URL(/^https?:\/\//.test(website) ? website : `https://${website}`)
    return u.origin
  } catch {
    return null
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const JUNK_LOCAL = ['noreply', 'no-reply', 'donotreply', 'example', 'your', 'name', 'email', 'user', 'sentry', 'wix', 'webmaster', 'postmaster', 'privacy', 'abuse']
const JUNK_DOMAIN = ['example.com', 'sentry.io', 'wix.com', 'wixpress.com', 'godaddy.com', 'squarespace.com', 'sentry-next.wixpress.com', 'domain.com', 'email.com']
const GOOD_LOCAL = ['manager', 'registeredmanager', 'care', 'enquiries', 'enquiry', 'info', 'hello', 'admin', 'reception', 'contact', 'office', 'home']

function scoreEmail(email: string, siteHost: string | null): number {
  const [local, domain] = email.toLowerCase().split('@')
  if (!local || !domain) return -100
  if (JUNK_LOCAL.some((j) => local.includes(j))) return -100
  if (JUNK_DOMAIN.some((d) => domain.endsWith(d))) return -100
  if (/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/.test(domain)) return -100
  let s = 0
  if (siteHost && (domain === siteHost || domain.endsWith('.' + siteHost) || siteHost.endsWith('.' + domain))) s += 10
  if (GOOD_LOCAL.some((g) => local === g || local.startsWith(g))) s += 5
  if (domain.endsWith('.co.uk') || domain.endsWith('.org.uk') || domain.endsWith('.uk')) s += 1
  return s
}

function extractEmails(html: string): string[] {
  const out = new Set<string>()
  // mailto: links first (highest confidence)
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    const e = decodeURIComponent(m[1]).trim()
    if (EMAIL_RE.test(e)) out.add(e)
    EMAIL_RE.lastIndex = 0
  }
  for (const m of html.matchAll(EMAIL_RE)) out.add(m[0])
  return [...out]
}

// Find a "Registered Manager: Jane Smith" style name in page text.
function extractManager(text: string): { name: string; role: string } | null {
  const m = text.match(/(Registered Manager|Home Manager|Care Manager|Manager)\s*[:\-–]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/)
  if (m && m[2]) return { name: m[2].trim(), role: m[1].trim() }
  return null
}

async function fromWebsite(website: string | null): Promise<{ email: string | null; contactName: string | null; contactRole: string | null }> {
  const empty = { email: null, contactName: null, contactRole: null }
  if (!website) return empty
  const origin = normaliseUrl(website)
  if (!origin) return empty
  const siteHost = (() => { try { return new URL(origin).hostname.replace(/^www\./, '') } catch { return null } })()

  const home = await getText(origin)
  if (!home) return empty

  // Discover a couple of likely contact/about pages to also scan.
  const links = new Set<string>()
  for (const m of home.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = m[1]
    if (/(contact|about|team|meet|our-home|staff)/i.test(href)) {
      try { links.add(new URL(href, origin).href) } catch { /* skip */ }
    }
    if (links.size >= 3) break
  }

  const pages = [home]
  for (const l of links) {
    const t = await getText(l)
    if (t) pages.push(t)
  }
  const allHtml = pages.join('\n')
  const plain = allHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')

  const emails = extractEmails(allHtml)
    .map((e) => ({ e, s: scoreEmail(e, siteHost) }))
    .filter((x) => x.s > -50)
    .sort((a, b) => b.s - a.s)
  const best = emails[0]?.e ?? null

  const mgr = extractManager(plain)
  return { email: best, contactName: mgr?.name ?? null, contactRole: mgr?.role ?? null }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\b(limited|ltd|care|homes?|nursing|residential|services?|group|the|uk)\b/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function fromCompaniesHouse(name: string): Promise<{ companyNumber: string; contactName: string | null; contactRole: string | null } | null> {
  const key = process.env.COMPANIES_HOUSE_API_KEY
  if (!key) return null
  const auth = 'Basic ' + Buffer.from(`${key}:`).toString('base64')
  const base = 'https://api.company-information.service.gov.uk'

  async function chJson(path: string): Promise<any | null> {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${base}${path}`, { headers: { Authorization: auth, 'User-Agent': UA }, signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  const search = await chJson(`/search/companies?q=${encodeURIComponent(name)}&items_per_page=5`)
  const items: any[] = search?.items ?? []
  if (!items.length) return null
  const target = norm(name)
  const active = items.filter((i) => i.company_status === 'active')
  const pool = active.length ? active : items
  // Best by name overlap.
  const best = pool
    .map((i) => ({ i, score: norm(String(i.title ?? '')) === target ? 100 : (norm(String(i.title ?? '')).includes(target) || target.includes(norm(String(i.title ?? '')))) ? 50 : 0 }))
    .sort((a, b) => b.score - a.score)[0]?.i
  if (!best?.company_number) return null
  const companyNumber = String(best.company_number)

  const officers = await chJson(`/company/${companyNumber}/officers?items_per_page=35`)
  const list: any[] = officers?.items ?? []
  const activeDirectors = list.filter((o) => !o.resigned_on && /director/i.test(String(o.officer_role ?? '')))
  const pick = (activeDirectors.length ? activeDirectors : list.filter((o) => !o.resigned_on))[0]
  let contactName: string | null = null
  let contactRole: string | null = null
  if (pick?.name) {
    // CH returns "SURNAME, Forename Middle" — reformat to "Forename SURNAME".
    const raw = String(pick.name)
    if (raw.includes(',')) {
      const [surname, fore] = raw.split(',').map((s) => s.trim())
      contactName = `${titleCase(fore)} ${titleCase(surname)}`.trim()
    } else {
      contactName = titleCase(raw)
    }
    contactRole = pick.officer_role ? titleCase(String(pick.officer_role).replace(/-/g, ' ')) : 'Director'
  }
  return { companyNumber, contactName, contactRole }
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
}

export async function enrichLead(lead: EnrichInput): Promise<EnrichResult> {
  const [web, ch] = await Promise.all([fromWebsite(lead.website), fromCompaniesHouse(lead.name)])

  // Prefer the Companies House director as the named decision-maker; fall back
  // to a registered manager found on the website.
  const contactName = ch?.contactName ?? web.contactName
  const contactRole = ch?.contactName ? ch.contactRole : web.contactRole

  const usedWebsite = !!(web.email || web.contactName)
  const usedCh = !!ch?.contactName
  const source: EnrichResult['source'] =
    usedWebsite && usedCh ? 'website+companies-house' : usedCh ? 'companies-house' : usedWebsite ? 'website' : 'none'

  const notes =
    source === 'none'
      ? lead.website
        ? 'No email or director found from website or Companies House.'
        : 'No website on file and no Companies House match.'
      : null

  return {
    contactName: contactName ?? null,
    contactRole: contactRole ?? null,
    email: web.email,
    companyNumber: ch?.companyNumber ?? null,
    source,
    notes,
  }
}
