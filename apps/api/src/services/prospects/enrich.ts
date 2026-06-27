// Decision-maker enrichment for prospects. Best-effort sources, all time-bounded
// and wrapped in try/catch (partial results are fine):
//   1. The provider's own website — scrape homepage + a couple of contact pages
//      for a usable contact email (free, no key).
//   2. Hunter.io domain email-finder — public-web aggregated emails + named
//      people. Used ONLY as a FALLBACK when the scrape found no email, and only
//      when opts.useFinder is set (manual actions, never the cron) + a key exists.
//   3. Companies House — match the provider name to a company and pull its active
//      directors (needs COMPANIES_HOUSE_API_KEY; skipped silently if absent).
import { Buffer } from 'node:buffer'

export interface EnrichInput {
  name: string
  website: string | null
}

export interface EnrichOpts {
  useFinder?: boolean // allow the paid Hunter fallback (manual actions only)
}

export interface EnrichResult {
  contactName: string | null
  contactRole: string | null
  email: string | null
  companyNumber: string | null
  source: string // '+'-joined contributing sources: website | hunter | companies-house | none
  notes: string | null
}

const UA = 'Mozilla/5.0 (CareStream prospect research)'

async function getText(url: string, ms = 6000): Promise<string | null> {
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

function hostOf(website: string): string | null {
  try {
    return new URL(/^https?:\/\//.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function normaliseUrl(website: string): string | null {
  try {
    return new URL(/^https?:\/\//.test(website) ? website : `https://${website}`).origin
  } catch {
    return null
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const JUNK_LOCAL = ['noreply', 'no-reply', 'donotreply', 'example', 'your', 'name', 'email', 'user', 'sentry', 'wix', 'webmaster', 'postmaster', 'privacy', 'abuse']
const JUNK_DOMAIN = ['example.com', 'sentry.io', 'wix.com', 'wixpress.com', 'godaddy.com', 'squarespace.com', 'domain.com', 'email.com']
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
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    const e = decodeURIComponent(m[1]).trim()
    if (EMAIL_RE.test(e)) out.add(e)
    EMAIL_RE.lastIndex = 0
  }
  for (const m of html.matchAll(EMAIL_RE)) out.add(m[0])
  return [...out]
}

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
  const siteHost = hostOf(website)

  const home = await getText(origin)
  if (!home) return empty

  // Up to 2 likely contact/about pages, to bound per-lead time.
  const links = new Set<string>()
  for (const m of home.matchAll(/href=["']([^"'#]+)["']/gi)) {
    if (/(contact|about|team|meet|our-home|staff)/i.test(m[1])) {
      try { links.add(new URL(m[1], origin).href) } catch { /* skip */ }
    }
    if (links.size >= 2) break
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

// Hunter.io Domain Search — public-web aggregated emails for a domain (or company
// name). Returns the strongest personal/named hit. Skipped if no key.
async function fromHunter(website: string | null, company: string): Promise<{ email: string; name: string | null; role: string | null } | null> {
  const key = process.env.HUNTER_API_KEY
  if (!key) return null
  const params = new URLSearchParams({ api_key: key, limit: '5' })
  const domain = website ? hostOf(website) : null
  if (domain) params.set('domain', domain)
  else if (company) params.set('company', company)
  else return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`https://api.hunter.io/v2/domain-search?${params.toString()}`, { headers: { 'User-Agent': UA }, signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const body: any = await res.json()
    const emails: any[] = body?.data?.emails ?? []
    if (!emails.length) return null
    const best = emails
      .map((e) => ({ e, s: (e.type === 'personal' ? 20 : 0) + (Number(e.confidence) || 0) + (e.first_name && e.last_name ? 10 : 0) }))
      .sort((a, b) => b.s - a.s)[0]?.e
    if (!best?.value) return null
    const name = [best.first_name, best.last_name].filter(Boolean).join(' ') || null
    return { email: best.value, name, role: best.position ?? null }
  } catch {
    return null
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\b(limited|ltd|care|homes?|nursing|residential|services?|group|the|uk)\b/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (_, c) => c.toUpperCase())
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

export async function enrichLead(input: EnrichInput, opts: EnrichOpts = {}): Promise<EnrichResult> {
  const [web, ch] = await Promise.all([fromWebsite(input.website), fromCompaniesHouse(input.name)])

  const sources: string[] = []
  let email = web.email
  let finderName: string | null = null
  let finderRole: string | null = null
  if (web.email || web.contactName) sources.push('website')

  // Paid fallback only when the free scrape found no email.
  if (!email && opts.useFinder) {
    const h = await fromHunter(input.website, input.name)
    if (h?.email) {
      email = h.email
      finderName = h.name
      finderRole = h.role
      sources.push('hunter')
    }
  }
  if (ch?.contactName) sources.push('companies-house')

  // Prefer a Companies House director, then a website-found manager, then Hunter's named hit.
  const contactName = ch?.contactName ?? web.contactName ?? finderName
  const contactRole = ch?.contactName ? ch.contactRole : web.contactName ? web.contactRole : finderRole

  const source = sources.join('+') || 'none'
  const notes =
    source === 'none'
      ? input.website
        ? 'No email or director found from website, finder or Companies House.'
        : 'No website on file and no Companies House match.'
      : null

  return { contactName: contactName ?? null, contactRole: contactRole ?? null, email, companyNumber: ch?.companyNumber ?? null, source, notes }
}
