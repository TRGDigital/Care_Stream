// The Data sources register: external reference figures (the minimum wage, inflation, bank holidays, sick pay, mileage rates) that the "Ask CareStream"
// agents will quote. Every figure is real, dated, sourced and kept fresh:
//   - a weekly check (cron /cron/check-data-sources) fetches each official source, validates it, and records it with its effective date;
//   - a figure that fails to fetch, changes shape or falls outside a sensible range is NOT accepted: the last good value is kept and the source is
//     marked failed or needs review, and the owner is emailed;
//   - getFigure() tells an agent whether the figure can be used, whether it is out of date, and what to say about it ("as of ...");
//   - a person can override a figure by hand from the platform console (status "manual"), which is clearly labelled and logged in the history.
// Skills for Care data is deliberately not here (we have no access to it).
// Everything that touches the network or the database is passed in, so the parsers, the checks and the status rules are tested on their own.

export type SourceStatus = 'ok' | 'changed' | 'needs_review' | 'failed' | 'manual'
export type Json = unknown

export interface Fetched { effective_from: string | null; value: any; next_check_due?: string | null }
export interface SourceDef {
  key: string
  name: string
  publisher: string
  source_url: string
  /** Where the page is fetched from, when that differs from the page people read (GOV.UK content API). */
  fetch_url: string | null
  update_frequency: string
  /** How many days after the last good fetch the figure counts as out of date. */
  stale_after_days: number
  /** The figure itself dates from its effective date: older than this many days means it has not been updated at the source. null = not checked this way. */
  data_stale_after_days: number | null
  /** Check on every weekly run (true) or only when it is due (false: CPI is published monthly). */
  weekly: boolean
  fetch: ((get: (url: string) => Promise<any>, today: string) => Promise<Fetched>) | null
  validate: (value: any) => string | null
  note?: string
  /** Changes every week by nature (road fuel): each new figure is recorded but does not email the owner. */
  routine?: boolean
}

// ── small helpers ───────────────────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 }
const LONG_MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }
const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d) }
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
const isYmd = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const textOf = (html: string) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&pound;/g, '£').replace(/&amp;/g, '&').replace(/&rsquo;|&#8217;/g, "'").replace(/\s+/g, ' ').trim()
const money = (s: string): number | null => { const m = /£\s*(\d+(?:\.\d+)?)/.exec(s); return m ? Number(m[1]) : null }
const inRange = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi

// ── National Living Wage and National Minimum Wage (GOV.UK) ─────────────────────────────
/** "April 2026" to 2026-04-01 (the rates change on 1 April, but the page names only the month). */
function monthLabelToDate(label: string): string | null {
  const m = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(label)
  const mon = m ? LONG_MONTHS[m[1].toLowerCase()] : undefined
  return m && mon ? `${m[2]}-${pad(mon)}-01` : null
}
export function parseNlw(content: any, today: string): Fetched {
  const html: string = content?.details?.body ?? ''
  const at = html.indexOf('id="current-rates"')
  if (at < 0) throw new Error('The "Current rates" section was not found on the page.')
  const table = /<table[\s\S]*?<\/table>/.exec(html.slice(at))
  if (!table) throw new Error('The rates table was not found.')
  const head = [...table[0].matchAll(/<th[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map(m => textOf(m[1]).toLowerCase())
  const col = (re: RegExp) => head.findIndex(h => re.test(h))
  const cols = { age21: col(/21 and over|21\+/), age18to20: col(/18 to 20/), under18: col(/under 18/), apprentice: col(/apprentice/) }
  if (Object.values(cols).some(i => i < 0)) throw new Error('The columns on the rates table have changed (expected 21 and over, 18 to 20, under 18, apprentice).')
  const rows: Array<{ from: string; label: string; age21: number; age18to20: number; under18: number; apprentice: number }> = []
  for (const tr of table[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const label = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/.exec(tr[1])
    if (!label) continue
    const from = monthLabelToDate(textOf(label[1]))
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => money(textOf(m[1])))
    if (!from || cells.length < 4) continue
    const get = (i: number) => cells[i]   // the header's <th scope="col"> cells are counted on their own, so column i is the i-th <td> of a body row
    const r = { from, label: textOf(label[1]), age21: get(cols.age21), age18to20: get(cols.age18to20), under18: get(cols.under18), apprentice: get(cols.apprentice) }
    if ([r.age21, r.age18to20, r.under18, r.apprentice].some(v => v == null)) throw new Error('A rate on the table could not be read.')
    rows.push(r as any)
  }
  if (!rows.length) throw new Error('No rate rows were found on the table.')
  rows.sort((a, b) => a.from.localeCompare(b.from))
  const current = [...rows].reverse().find(r => r.from <= today) ?? null
  const upcoming = rows.filter(r => r.from > today)
  if (!current) throw new Error('None of the rates on the page has started yet.')
  return { effective_from: current.from, value: { current, upcoming, as_published: rows, page_updated: content?.public_updated_at ?? null } }
}
export function validateNlw(v: any): string | null {
  const c = v?.current
  if (!c) return 'No current rate.'
  if (!inRange(c.age21, 8, 20)) return `The National Living Wage ${c.age21} is outside 8 to 20 pounds.`
  for (const k of ['age18to20', 'under18', 'apprentice']) if (!inRange(c[k], 3, 20)) return `The ${k} rate ${c[k]} is outside 3 to 20 pounds.`
  if (!(c.age21 >= c.age18to20 && c.age18to20 >= c.under18)) return 'The age bands are not in order (21 and over should be the highest).'
  return null
}

// ── CPI and CPIH annual rate (ONS) ──────────────────────────────────────────────────────
function onsPeriod(date: string): string | null {   // "2026 OCT" to "2026-10"
  const m = /^(\d{4})\s+([A-Z]{3})$/.exec(String(date).trim().toUpperCase())
  return m && MONTHS[m[2]] ? `${m[1]}-${pad(MONTHS[m[2]])}` : null
}
function parseOnsDate(s: unknown): string | null {   // "16 December 2026"
  const m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(String(s ?? '').trim())
  const mon = m ? LONG_MONTHS[m[2].toLowerCase()] : undefined
  return m && mon ? `${m[3]}-${pad(mon)}-${pad(Number(m[1]))}` : null
}
export function parseOnsRate(json: any, expectCdid: string): Fetched {
  const d = json?.description
  if (!d || String(d.cdid ?? '').toUpperCase() !== expectCdid) throw new Error(`The ONS series is not ${expectCdid}.`)
  const months: any[] = Array.isArray(json.months) ? json.months : []
  const pts = months.map(m => ({ period: onsPeriod(m.date), rate: Number(m.value) })).filter(p => p.period && Number.isFinite(p.rate)) as Array<{ period: string; rate: number }>
  if (!pts.length) throw new Error('No monthly figures were found.')
  pts.sort((a, b) => a.period.localeCompare(b.period))
  const latest = pts[pts.length - 1]
  const release = typeof d.releaseDate === 'string' ? d.releaseDate.slice(0, 10) : null
  const next = parseOnsDate(d.nextRelease)
  return {
    effective_from: `${latest.period}-01`,
    next_check_due: next ? addDays(next, 1) : null,
    value: { cdid: expectCdid, title: d.title, latest, release_date: release, next_release: next, series: pts.slice(-13), unit: d.unit ?? '%' },
  }
}
export function validateRate(v: any): string | null {
  if (!v?.latest) return 'No latest figure.'
  if (!inRange(v.latest.rate, -5, 25)) return `The rate ${v.latest.rate}% is outside -5% to 25%.`
  if (!/^\d{4}-\d{2}$/.test(v.latest.period ?? '')) return 'The period is not a month.'
  return null
}

// ── Care home food cost per resident per week (manual: from the councils' published cost of care exercises, as held by Orrery) ──
export function validateFoodCost(v: any): string | null {
  if (!inRange(v?.low_gbp_week, 10, 80)) return `The low figure ${v?.low_gbp_week} is outside 10 to 80 pounds a week.`
  if (!inRange(v?.high_gbp_week, 10, 80)) return `The high figure ${v?.high_gbp_week} is outside 10 to 80 pounds a week.`
  if (v.low_gbp_week > v.high_gbp_week) return 'The low figure is above the high figure.'
  if (!/^\d{4}(\/\d{2})?$/.test(String(v?.price_year ?? ''))) return 'Say which prices these are, for example 2022/23.'
  return null
}

// ── Road fuel prices (DESNZ weekly, GOV.UK) ──────────────────────────────────────────────
/** The page lists the CSV; the CSV has one row a week: date, petrol, diesel (pence a litre). */
export function fuelCsvUrl(content: any): string {
  const atts: any[] = content?.details?.attachments ?? []
  const hit = atts.find(a => /csv/i.test(String(a?.title ?? '')) && /2018/.test(String(a?.title ?? '')) && typeof a?.url === 'string')
  if (!hit) throw new Error('The weekly fuel price CSV was not found on the page.')
  return hit.url
}
export function parseFuel(csv: string): Fetched {
  const rows = String(csv ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1).map(l => l.split(',')).filter(r => /^\d{2}\/\d{2}\/\d{4}$/.test(r[0] ?? ''))
  const weeks = rows.map(r => { const [d, m, y] = r[0].split('/'); return { date: `${y}-${m}-${d}`, petrol: Number(r[1]), diesel: Number(r[2]) } }).filter(w => Number.isFinite(w.petrol) && Number.isFinite(w.diesel)).sort((a, b) => a.date.localeCompare(b.date))
  if (!weeks.length) throw new Error('No weekly fuel prices were found in the file.')
  const latest = weeks[weeks.length - 1]
  const previous = weeks.length > 1 ? weeks[weeks.length - 2] : null
  return { effective_from: latest.date, next_check_due: addDays(latest.date, 8), value: { unit: 'pence per litre', latest, previous, weeks: weeks.slice(-13), petrol_pounds_per_litre: Math.round(latest.petrol) / 100, diesel_pounds_per_litre: Math.round(latest.diesel) / 100 } }
}
export function validateFuel(v: any): string | null {
  if (!inRange(v?.latest?.petrol, 80, 300)) return `The petrol price ${v?.latest?.petrol} is outside 80 to 300 pence a litre.`
  if (!inRange(v?.latest?.diesel, 80, 320)) return `The diesel price ${v?.latest?.diesel} is outside 80 to 320 pence a litre.`
  if (!isYmd(v?.latest?.date)) return 'The week is not a date.'
  return null
}

// ── Home care hourly figures (manual: from Orrery's collections and published reports) ────────────────────────
export function validateHomecareRate(v: any): string | null {
  if (!inRange(v?.hourly_gbp, 8, 80)) return `The hourly figure ${v?.hourly_gbp} is outside 8 to 80 pounds.`
  if (v?.low_gbp != null && v?.high_gbp != null && v.low_gbp > v.high_gbp) return 'The low figure is above the high figure.'
  if (!String(v?.basis ?? '').trim()) return 'Say what the figure is (the basis).'
  return null
}


// ── Staff and payroll figures (GOV.UK rates page, pensions, DBS, ONS earnings, Bank of England, holiday rules) ───────────────────────────────
/** The tax year runs 6 April to 5 April: 5 April 2027 is still 2026 to 2027, 6 April 2027 is 2027 to 2028. */
export function taxYearOf(today: string): number {
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)), d = Number(today.slice(8, 10))
  return m > 4 || (m === 4 && d >= 6) ? y : y - 1
}
export const ratesPageSlug = (startYear: number) => `rates-and-thresholds-for-employers-${startYear}-to-${startYear + 1}`
const ratesPageUrl = (startYear: number) => `https://www.gov.uk/api/content/guidance/${ratesPageSlug(startYear)}`
/** All the text in a GOV.UK content item (the body, or every part of a guide), tags removed. */
export function govText(content: any): string {
  const d = content?.details ?? {}
  const bits: string[] = []
  if (typeof d.body === 'string') bits.push(d.body)
  for (const p of Array.isArray(d.parts) ? d.parts : []) if (typeof p?.body === 'string') bits.push(p.body)
  return textOf(bits.join(' '))
}
const pageDate = (content: any): string | null => typeof content?.public_updated_at === 'string' ? content.public_updated_at.slice(0, 10) : null
/** The first table after the heading with this id, as rows of cell texts (a line break inside a cell becomes " | "). */
function tableAfter(html: string, id: string): string[][] {
  const at = html.indexOf(`id="${id}"`)
  if (at < 0) throw new Error(`The "${id}" section was not found on the page.`)
  const t = /<table[\s\S]*?<\/table>/.exec(html.slice(at))
  if (!t) throw new Error(`The table under "${id}" was not found.`)
  return [...t[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(tr => [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => textOf(c[1].replace(/<br\s*\/?>/gi, ' | '))))
}
const pounds = (s: string): number | null => { const m = /£\s*([\d,]+(?:\.\d+)?)/.exec(s); return m ? Number(m[1].replace(/,/g, '')) : null }
const pct = (s: string): number | null => { const m = /(\d+(?:\.\d+)?)\s*%/.exec(s); return m ? Number(m[1]) : null }
export interface Per { week: number; month: number; year: number }
function perPeriod(cell: string): Per {
  const g = (u: string) => { const m = new RegExp(`£\\s*([\\d,]+(?:\\.\\d+)?)\\s*per\\s*${u}`, 'i').exec(cell); if (!m) throw new Error(`A "${u}" figure was missing from "${cell}".`); return Number(m[1].replace(/,/g, '')) }
  return { week: g('week'), month: g('month'), year: g('year') }
}
function pageTaxYear(content: any): { label: string; start: string } {
  const m = /(\d{4})[-\s]to[-\s](\d{4})/.exec(`${content?.base_path ?? ''} ${content?.title ?? ''}`)
  if (!m) throw new Error('The tax year could not be read from the page.')
  return { label: `${m[1]} to ${m[2]}`, start: `${m[1]}-04-06` }
}

// Statutory maternity, paternity, adoption and shared parental pay
export function parseStatutoryPay(content: any): Fetched {
  const html: string = content?.details?.body ?? ''
  const ty = pageTaxYear(content)
  const rows = tableAfter(html, 'statutory-maternity-paternity-adoption-shared-parental-parental-bereavement-and-neonatal-care-pay')
  const rates: Record<string, { weekly_gbp?: number; first_six_weeks_pct?: number; earnings_share_pct?: number }> = {}
  for (const [label, rate] of rows) {
    const k = /\b(SMP|SPP|SAP|ShPP)\b/.exec(label ?? '')?.[1]?.toLowerCase()
    if (!k || !rate) continue
    const r = (rates[k] ??= {})
    if (/first 6 weeks/i.test(label)) r.first_six_weeks_pct = pct(rate) ?? undefined
    else { r.weekly_gbp = pounds(rate) ?? undefined; r.earnings_share_pct = pct(rate.replace(/£\s*[\d,.]+/, '')) ?? undefined }
  }
  const from = /Statutory Maternity Pay[^.]*?applies from (\d{1,2}) ([A-Za-z]+) (\d{4})/i.exec(textOf(html))
  const smpMon = from ? LONG_MONTHS[from[2].toLowerCase()] : undefined
  const flat = Object.values(rates).map(r => r.weekly_gbp).filter((x): x is number => typeof x === 'number')
  return { effective_from: ty.start, value: { tax_year: ty.label, weekly_rate_gbp: flat[0] ?? null, earnings_share_pct: Object.values(rates).map(r => r.earnings_share_pct).find(x => x != null) ?? null, rates, smp_applies_from: from && smpMon ? `${from[3]}-${pad(smpMon)}-${pad(Number(from[1]))}` : null, ssp: 'See the Statutory Sick Pay figure.', page_updated: pageDate(content) } }
}
export function validateStatutoryPay(v: any): string | null {
  const r = v?.rates ?? {}
  for (const k of ['smp', 'spp', 'sap', 'shpp']) {
    if (!inRange(r[k]?.weekly_gbp, 100, 400)) return `The ${k.toUpperCase()} weekly rate ${r[k]?.weekly_gbp} is outside 100 to 400 pounds.`
    if (!inRange(r[k]?.earnings_share_pct, 70, 100)) return `The ${k.toUpperCase()} share of earnings ${r[k]?.earnings_share_pct} is outside 70 to 100 percent.`
  }
  if (!/^\d{4} to \d{4}$/.test(v?.tax_year ?? '')) return 'The tax year is missing.'
  return null
}

// Employer National Insurance
export function parseEmployerNi(content: any): Fetched {
  const html: string = content?.details?.body ?? ''
  const ty = pageTaxYear(content)
  const th = tableAfter(html, 'class-1-national-insurance-thresholds')
  const row = (re: RegExp) => { const r = th.find(x => re.test(x[0] ?? '')); if (!r || !r[1]) throw new Error(`The "${re.source}" row was not found.`); return perPeriod(r[1]) }
  const thresholds = { lower_earnings_limit: row(/^Lower earnings limit/i), secondary_threshold: row(/^Secondary threshold/i), upper_earnings_limit: row(/^Upper earnings limit/i), upper_secondary_threshold_under_21: row(/^Upper secondary threshold \(under 21\)/i) }
  const sec = tableAfter(html, 'employer-secondary-contribution-rates')
  const a = sec.find(r => /^A$/.test(r[0] ?? ''))
  if (!a) throw new Error('Category A was not found in the employer rates table.')
  const rates = a.slice(1).map(c => pct(c))
  if (!rates.length || rates.some(x => x == null) || new Set(rates).size !== 1) throw new Error(`Category A pays different rates in different bands (${a.slice(1).join(', ')}): the figure needs a person to read it.`)
  const m = sec.find(r => /^M\b/.test(r[0] ?? ''))
  return { effective_from: ty.start, value: { tax_year: ty.label, secondary_rate_pct: rates[0], thresholds, under_21_rate_up_to_upper_limit_pct: m ? pct(m[3] ?? '') : null, page_updated: pageDate(content) } }
}
export function validateEmployerNi(v: any): string | null {
  if (!inRange(v?.secondary_rate_pct, 5, 25)) return `The employer rate ${v?.secondary_rate_pct} is outside 5 to 25 percent.`
  const t = v?.thresholds ?? {}
  if (!inRange(t.secondary_threshold?.year, 2000, 20000)) return `The secondary threshold ${t.secondary_threshold?.year} is outside 2,000 to 20,000 a year.`
  if (!inRange(t.lower_earnings_limit?.year, 3000, 12000)) return `The lower earnings limit ${t.lower_earnings_limit?.year} is outside 3,000 to 12,000 a year.`
  if (!inRange(t.upper_earnings_limit?.year, 30000, 100000)) return `The upper earnings limit ${t.upper_earnings_limit?.year} is outside 30,000 to 100,000 a year.`
  if (!(t.secondary_threshold.year < t.upper_earnings_limit.year)) return 'The secondary threshold is not below the upper earnings limit.'
  return null
}
/** Employer National Insurance on a gross pay for one pay period. Category A (standard) pays on everything above the secondary threshold; under 21s, apprentices under 25 and veterans pay nothing up to the upper limit. Employment Allowance is not taken off here. */
export function employerNi(v: any, grossPay: number, period: 'week' | 'month' | 'year' = 'month', who: 'standard' | 'under_21' | 'apprentice_under_25' | 'veteran' = 'standard') {
  const t = v?.thresholds
  if (!t || !(grossPay >= 0)) throw new Error('Employer National Insurance needs the figures and a pay of 0 or more.')
  const rate = Number(v.secondary_rate_pct) / 100
  const start = t.secondary_threshold[period] as number
  const free = who === 'standard' ? start : Math.max(start, t.upper_secondary_threshold_under_21[period] as number)
  const taxable = Math.max(0, grossPay - free)
  return { employer_ni: Math.round(taxable * rate * 100) / 100, rate_pct: Number(v.secondary_rate_pct), pay_above_threshold: Math.round(taxable * 100) / 100, threshold_used: free, period, who, note: 'Before any Employment Allowance, and not for other National Insurance categories.' }
}

// Workplace pension automatic enrolment
export function parsePensionAe(content: any): Fetched {
  const t = govText(content)
  const trigger = /earn at least £\s*([\d,]+)\s*(?:a|per)\s*year/i.exec(t)
  const band = /between £\s*([\d,]+)\s*and\s*£\s*([\d,]+)\s*(?:a|per)\s*year/i.exec(t)
  const contrib = /From April 2019\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/i.exec(t)
  const age = /aged between (\d+) and (?:the )?State Pension age/i.exec(t)
  if (!trigger || !band || !contrib) throw new Error('The automatic enrolment thresholds or contributions were not found on the page.')
  const n = (x: string) => Number(x.replace(/,/g, ''))
  return { effective_from: null, value: { earnings_trigger_gbp: n(trigger[1]), qualifying_earnings_lower_gbp: n(band[1]), qualifying_earnings_upper_gbp: n(band[2]), minimum_employer_pct: Number(contrib[1]), employee_pct: Number(contrib[2]), minimum_total_pct: Number(contrib[3]), age_from: age ? Number(age[1]) : null, page_updated: pageDate(content) } }
}
export function validatePensionAe(v: any): string | null {
  if (!inRange(v?.earnings_trigger_gbp, 5000, 20000)) return `The earnings trigger ${v?.earnings_trigger_gbp} is outside 5,000 to 20,000.`
  if (!inRange(v?.qualifying_earnings_lower_gbp, 3000, 15000)) return `The lower qualifying limit ${v?.qualifying_earnings_lower_gbp} is outside 3,000 to 15,000.`
  if (!inRange(v?.qualifying_earnings_upper_gbp, 30000, 100000)) return `The upper qualifying limit ${v?.qualifying_earnings_upper_gbp} is outside 30,000 to 100,000.`
  if (!inRange(v?.minimum_total_pct, 4, 25) || !inRange(v?.minimum_employer_pct, 1, 15)) return 'The minimum contributions are outside what is expected.'
  if (Math.abs(v.minimum_employer_pct + v.employee_pct - v.minimum_total_pct) > 0.01) return 'The employer and employee shares do not add up to the total.'
  return null
}
/** What the employer minimum costs on an annual pay: the employer share of earnings between the qualifying limits. */
export function pensionEmployerMinimum(v: any, annualPay: number) {
  const q = Math.max(0, Math.min(annualPay, v.qualifying_earnings_upper_gbp) - v.qualifying_earnings_lower_gbp)
  return { qualifying_earnings: Math.round(q * 100) / 100, employer_minimum: Math.round(q * v.minimum_employer_pct) / 100, employer_pct: v.minimum_employer_pct, enrolled_automatically: annualPay >= v.earnings_trigger_gbp }
}

// DBS fees
export function parseDbsFees(content: any): Fetched {
  const t = govText(content)
  const basic = /A basic check costs £\s*(\d+(?:\.\d+)?)/i.exec(t)
  const std = /Standard\s+£\s*(\d+(?:\.\d+)?)/.exec(t)
  const enh = /Enhanced\s+£\s*(\d+(?:\.\d+)?)/.exec(t)
  const bar = /Enhanced with barred lists?\s+£\s*(\d+(?:\.\d+)?)/i.exec(t)
  if (!basic || !std || !enh || !bar) throw new Error('The DBS fees were not found on the page (basic, standard, enhanced, enhanced with barred lists).')
  return { effective_from: null, value: { basic_gbp: Number(basic[1]), standard_gbp: Number(std[1]), enhanced_gbp: Number(enh[1]), enhanced_barred_lists_gbp: Number(bar[1]), volunteers_free: /free for volunteers/i.test(t), umbrella_body_admin_fee: /administration fee/i.test(t) ? 'The organisation that processes the check may add an administration fee.' : null, page_updated: pageDate(content) } }
}
export function validateDbsFees(v: any): string | null {
  for (const k of ['basic_gbp', 'standard_gbp', 'enhanced_gbp', 'enhanced_barred_lists_gbp']) if (!inRange(v?.[k], 5, 100)) return `The ${k.replace(/_gbp$/, '').replace(/_/g, ' ')} fee ${v?.[k]} is outside 5 to 100 pounds.`
  if (v.enhanced_gbp < v.standard_gbp) return 'The enhanced fee is below the standard fee.'
  return null
}

// Earnings growth (ONS average weekly earnings): the headline growth (regular pay, whole economy, three month average on a year earlier) and the level of total pay
const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
export function parseEarningsGrowth(growthJson: any, levelJson: any): Fetched {
  const g = parseOnsRate(growthJson, 'KAI9')
  const d = levelJson?.description
  if (!d || String(d.cdid ?? '').toUpperCase() !== 'KAB9') throw new Error('The ONS earnings level series is not KAB9.')
  const pts = (Array.isArray(levelJson.months) ? levelJson.months : []).map((m: any) => ({ period: onsPeriod(m.date), v: Number(m.value) })).filter((p: any) => p.period && Number.isFinite(p.v)).sort((a: any, b: any) => a.period.localeCompare(b.period))
  if (pts.length < 15) throw new Error('There are not enough months of earnings to work out growth.')
  const now = pts.slice(-3).map((p: any) => p.v), before = pts.slice(-15, -12).map((p: any) => p.v)
  const last = pts[pts.length - 1]
  return { effective_from: g.effective_from, next_check_due: g.next_check_due ?? null, value: {
    measure: 'Average weekly earnings, whole economy, regular pay, annual growth (three month average on the same three months a year earlier), seasonally adjusted',
    latest: g.value.latest, release_date: g.value.release_date, next_release: g.value.next_release, series: g.value.series,
    total_pay: { period: last.period, weekly_gbp: last.v, growth_3m_pct: Math.round((average(now) / average(before) - 1) * 1000) / 10, note: 'Total pay excluding arrears, seasonally adjusted, worked out from the monthly levels (KAB9).' } } }
}
export function validateEarningsGrowth(v: any): string | null {
  const r = validateRate(v); if (r) return r
  if (!inRange(v?.total_pay?.weekly_gbp, 300, 2500)) return `Weekly total pay ${v?.total_pay?.weekly_gbp} is outside 300 to 2,500 pounds.`
  if (!inRange(v?.total_pay?.growth_3m_pct, -10, 25)) return `Total pay growth ${v?.total_pay?.growth_3m_pct} is outside -10 to 25 percent.`
  return null
}

// Bank of England Bank Rate
export function parseBankRate(html: string): Fetched {
  const rows = [...String(html ?? '').matchAll(/<td[^>]*>\s*(\d{1,2} [A-Za-z]{3} \d{2,4})\s*<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d+)?)\s*<\/td>/g)].map(m => {
    const [d, mon, y] = m[1].split(' '); const mm = MONTHS[mon.toUpperCase()]
    const yy = y.length === 2 ? (Number(y) >= 70 ? '19' : '20') + y : y   // the page prints two digit years; its history starts in the 1970s
    return mm ? { changed: `${yy}-${pad(mm)}-${pad(Number(d))}`, rate: Number(m[2]) } : null
  }).filter((r): r is { changed: string; rate: number } => !!r).sort((a, b) => b.changed.localeCompare(a.changed))
  if (!rows.length) throw new Error('The Bank Rate table was not found on the page.')
  return { effective_from: rows[0].changed, value: { rate_pct: rows[0].rate, changed: rows[0].changed, previous: rows[1] ?? null, history: rows.slice(0, 8) } }
}
export function validateBankRate(v: any): string | null {
  if (!inRange(v?.rate_pct, 0, 15)) return `Bank Rate ${v?.rate_pct} is outside 0 to 15 percent.`
  if (!isYmd(v?.changed)) return 'The date it last changed is missing.'
  return null
}

// Holiday pay rules (GOV.UK holiday entitlement)
export function parseHolidayRules(content: any): Fetched {
  const t = govText(content)
  const weeks = /(\d+(?:\.\d+)?) weeks[’'] paid holiday a year/i.exec(t)
  const cap = /at least (\d+) days[’']? paid annual leave a year/i.exec(t)
  const irregular = /entitlement will be (\d+(?:\.\d+)?)% of the hours they worked/i.exec(t)
  if (!weeks || !cap || !irregular) throw new Error('The holiday rules (5.6 weeks, the day cap and the irregular hours percentage) were not all found on the page.')
  return { effective_from: null, value: { statutory_weeks: Number(weeks[1]), cap_days_five_day_week: Number(cap[1]), irregular_hours_pct: Number(irregular[1]), irregular_hours_rounding: /rounded up to the nearest hour if the entitlement is 0\.5 of an hour or more/i.test(t) ? 'Round up to the nearest hour if the entitlement is half an hour or more.' : null, starters_accrue_one_twelfth_a_month: /one-twelfth of their leave/i.test(t), page_updated: pageDate(content) } }
}
export function validateHolidayRules(v: any): string | null {
  if (!inRange(v?.statutory_weeks, 4, 8)) return `The statutory weeks ${v?.statutory_weeks} are outside 4 to 8.`
  if (!inRange(v?.cap_days_five_day_week, 20, 40)) return `The day cap ${v?.cap_days_five_day_week} is outside 20 to 40.`
  if (!inRange(v?.irregular_hours_pct, 5, 20)) return `The irregular hours percentage ${v?.irregular_hours_pct} is outside 5 to 20.`
  return null
}

/** The rates page for this tax year (required) and, once it exists, next year's (shown as "upcoming"). */
async function fetchRatesPage(get: (url: string) => Promise<any>, today: string, parse: (c: any) => Fetched): Promise<Fetched> {
  const y = taxYearOf(today)
  const current = parse(await get(ratesPageUrl(y)))
  let upcoming: any = null
  try { const n = parse(await get(ratesPageUrl(y + 1))); upcoming = { effective_from: n.effective_from, ...n.value } } catch { /* next year's page is not published yet */ }
  return { ...current, value: { ...current.value, upcoming } }
}

// ── Bank holidays (GOV.UK, England and Wales) ───────────────────────────────────────────
export function parseBankHolidays(json: any): Fetched {
  const ew = json?.['england-and-wales']
  const events: any[] = Array.isArray(ew?.events) ? ew.events : []
  const list = events.filter(e => isYmd(e?.date) && typeof e?.title === 'string').map(e => ({ date: e.date as string, title: e.title as string })).sort((a, b) => a.date.localeCompare(b.date))
  if (!list.length) throw new Error('No bank holidays were found for England and Wales.')
  return { effective_from: list[0].date.slice(0, 4) + '-01-01', value: { division: 'england-and-wales', events: list, first_year: Number(list[0].date.slice(0, 4)), last_year: Number(list[list.length - 1].date.slice(0, 4)) } }
}
export function validateBankHolidays(v: any, today = ymd(new Date())): string | null {
  const ev: Array<{ date: string; title: string }> = v?.events ?? []
  const year = Number(today.slice(0, 4))
  for (const y of [year, year + 1]) {
    const inYear = ev.filter(e => e.date.startsWith(String(y)))
    if (inYear.length < 7 || inYear.length > 12) return `${y} has ${inYear.length} bank holidays (expected 7 to 12).`
    // Christmas Day moves to the next working day when it falls on a weekend (2027: Monday 27 December), so it is found by name, not by date.
    if (!inYear.some(e => /^christmas day/i.test(e.title))) return `${y} has no Christmas Day.`
  }
  return null
}

// ── Statutory Sick Pay (GOV.UK) ─────────────────────────────────────────────────────────
export function parseSsp(content: any): Fetched {
  const parts: any[] = content?.details?.parts ?? []
  const part = parts.find(p => p.slug === 'what-youll-get') ?? parts.find(p => p.slug === 'overview')
  if (!part) throw new Error('The sick pay page has changed (no "What you will get" section).')
  const t = textOf(part.body)
  const m = /£\s*(\d+(?:\.\d{1,2})?)\s*(?:a|per)\s*week/i.exec(t)
  if (!m) throw new Error('The weekly sick pay rate was not found in the text.')
  // GOV.UK does not put an effective date on this page (its "updated" date is when the page was last restructured), so there is none to record.
  return { effective_from: null, value: { weekly_rate_gbp: Number(m[1]), maximum_weeks: /up to 28 weeks/i.test(t) ? 28 : null, earnings_share_pct: /80%/.test(t) ? 80 : null } }
}
export function validateSsp(v: any): string | null {
  if (!inRange(v?.weekly_rate_gbp, 80, 300)) return `The weekly rate ${v?.weekly_rate_gbp} is outside 80 to 300 pounds.`
  return null
}

// ── HMRC approved mileage allowance payments (GOV.UK) ───────────────────────────────────
export function parseMileage(content: any): Fetched {
  const parts: any[] = content?.details?.parts ?? []
  const part = parts.find(p => p.slug === 'rules-for-tax')
  if (!part) throw new Error('The mileage page has changed (no "Rules for tax" section).')
  const t = textOf(part.body)
  const at = t.indexOf('Cars and vans')
  if (at < 0) throw new Error('The cars and vans rate was not found.')
  const seg = t.slice(at, at + 400)
  // "Cars and vans 55p from 6 April 2026 (45p before 6 April 2026) 25p Motorcycles 24p 24p Bikes 20p 20p"  or  "Cars and vans 45p 25p Motorcycles ..."
  const withDate = /Cars and vans\s+(\d+)p\s+from\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*\(\s*(\d+)p before[^)]*\)\s+(\d+)p/.exec(seg)
  const plain = /Cars and vans\s+(\d+)p\s+(\d+)p/.exec(seg)
  let first: number, after: number, from: string | null = null, previous: number | null = null
  if (withDate) { first = Number(withDate[1]); from = parseOnsDate(withDate[2]); previous = Number(withDate[3]); after = Number(withDate[4]) }
  else if (plain) { first = Number(plain[1]); after = Number(plain[2]) }
  else throw new Error('The cars and vans rates could not be read.')
  const moto = /Motorcycles\s+(\d+)p/.exec(seg), bike = /Bikes\s+(\d+)p/.exec(seg)
  if (!moto || !bike) throw new Error('The motorcycle or bike rate was not found.')
  return { effective_from: from, value: { cars_vans_first_10000_pence: first, cars_vans_after_10000_pence: after, cars_vans_rate_from: from, cars_vans_previous_first_10000_pence: previous, motorcycle_pence: Number(moto[1]), bike_pence: Number(bike[1]) } }
}
export function validateMileage(v: any): string | null {
  for (const k of ['cars_vans_first_10000_pence', 'cars_vans_after_10000_pence', 'motorcycle_pence', 'bike_pence']) if (!inRange(v?.[k], 5, 100)) return `${k} ${v?.[k]} is outside 5 to 100 pence.`
  if (v.cars_vans_after_10000_pence > v.cars_vans_first_10000_pence) return 'The rate after 10,000 miles is higher than the first 10,000 miles.'
  return null
}

// ── Real Living Wage (manual entry only: no stable machine readable source) ──────────────
export function validateRealLivingWage(v: any): string | null {
  if (!inRange(v?.hourly_rate_gbp, 8, 25)) return `The rate ${v?.hourly_rate_gbp} is outside 8 to 25 pounds.`
  if (v?.london_hourly_rate_gbp != null && !inRange(v.london_hourly_rate_gbp, 8, 30)) return `The London rate ${v.london_hourly_rate_gbp} is outside 8 to 30 pounds.`
  return null
}

// ── The register ────────────────────────────────────────────────────────────────────────
export const SOURCES: SourceDef[] = [
  { key: 'nlw', name: 'National Living Wage and National Minimum Wage', publisher: 'GOV.UK', source_url: 'https://www.gov.uk/national-minimum-wage-rates', fetch_url: 'https://www.gov.uk/api/content/national-minimum-wage-rates',
    update_frequency: 'Every April (announced in the autumn)', stale_after_days: 396, data_stale_after_days: 400, weekly: true,
    fetch: async (get, today) => parseNlw(await get('https://www.gov.uk/api/content/national-minimum-wage-rates'), today), validate: validateNlw },
  { key: 'cpi', name: 'CPI annual inflation rate (all items)', publisher: 'Office for National Statistics', source_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23', fetch_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data',
    update_frequency: 'Monthly (ONS release, mid month)', stale_after_days: 62, data_stale_after_days: 75, weekly: false,
    fetch: async get => parseOnsRate(await get('https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data'), 'D7G7'), validate: validateRate },
  { key: 'cpih', name: 'CPIH annual inflation rate (all items)', publisher: 'Office for National Statistics', source_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23', fetch_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data',
    update_frequency: 'Monthly (ONS release, mid month)', stale_after_days: 62, data_stale_after_days: 75, weekly: false,
    fetch: async get => parseOnsRate(await get('https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data'), 'L55O'), validate: validateRate },
  { key: 'cpi_food', name: 'CPI annual inflation rate, food and non-alcoholic beverages', publisher: 'Office for National Statistics', source_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g8/mm23', fetch_url: 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g8/mm23/data',
    update_frequency: 'Monthly (ONS release, mid month)', stale_after_days: 62, data_stale_after_days: 75, weekly: false,
    fetch: async get => parseOnsRate(await get('https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g8/mm23/data'), 'D7G8'), validate: validateRate,
    note: 'The same ONS food series Orrery uses for its running costs section. Use it to bring an older food cost forward to today.' },
  { key: 'care_food_cost', name: 'Care home food cost per resident per week (cost of care exercises)', publisher: 'Councils\' cost of care exercises, as held by Orrery Intelligence', source_url: 'https://www.orreryintelligence.com', fetch_url: null,
    update_frequency: 'When councils publish new cost of care exercises (every one to three years)', stale_after_days: 1100, data_stale_after_days: null, weekly: false, fetch: null, validate: validateFoodCost,
    note: 'Entered by hand from Orrery: median food supplies per resident per week, residential care for people aged 65 and over, in the prices of the exercise year. It is a council benchmark, not a supplier price list. Bring it to today with the food CPI rate.' },
  { key: 'road_fuel', name: 'Road fuel prices, petrol and diesel (weekly)', publisher: 'DESNZ (GOV.UK)', source_url: 'https://www.gov.uk/government/statistics/weekly-road-fuel-prices', fetch_url: 'https://www.gov.uk/api/content/government/statistics/weekly-road-fuel-prices',
    update_frequency: 'Weekly (Monday figures)', stale_after_days: 16, data_stale_after_days: 21, weekly: true, routine: true,
    fetch: async get => parseFuel(await get(fuelCsvUrl(await get('https://www.gov.uk/api/content/government/statistics/weekly-road-fuel-prices')))), validate: validateFuel,
    note: 'Average pump prices across the UK, in pence a litre. Use with the HMRC mileage rates when looking at what home care visits cost to reach.' },
  { key: 'homecare_private_rate', name: 'Private home care hourly rate, England (agencies\' own published prices)', publisher: 'Orrery Intelligence (collected from agency websites)', source_url: 'https://www.orreryintelligence.com', fetch_url: null,
    update_frequency: 'Quarterly', stale_after_days: 140, data_stale_after_days: null, weekly: false, fetch: null, validate: validateHomecareRate,
    note: 'Entered by hand from Orrery: the median weekday daytime hourly price that 102 agencies publish. Agencies that publish a price are not all agencies, and "from" prices pull it down. It is a market guide, not what any one agency charges.' },
  { key: 'homecare_min_price', name: 'Minimum Price for Homecare (Homecare Association)', publisher: 'Homecare Association', source_url: 'https://homecareassociation.org.uk/', fetch_url: null,
    update_frequency: 'Every year (published around December, with an update before April)', stale_after_days: 396, data_stale_after_days: null, weekly: false, fetch: null, validate: validateHomecareRate,
    note: 'Entered by hand. The hourly price the Homecare Association says a council should pay for a sustainable service; the 2026/27 figure is from its July 2026 response to the Low Pay Commission.' },
  { key: 'council_homecare_rate', name: 'What councils pay per hour for external home care (median across England)', publisher: 'DHSC, Adult social care finance report', source_url: 'https://www.gov.uk/government/statistics/adult-social-care-finance-report-england-2025-to-2026', fetch_url: null,
    update_frequency: 'Every year (published in the autumn)', stale_after_days: 500, data_stale_after_days: null, weekly: false, fetch: null, validate: validateHomecareRate,
    note: 'Entered by hand from Orrery: the median across 154 councils of the unit cost per hour of home care bought from other providers, 2025/26. Individual councils range widely.' },
  { key: 'statutory_pay', name: 'Statutory maternity, paternity, adoption and shared parental pay', publisher: 'GOV.UK (HMRC rates and thresholds for employers)', source_url: 'https://www.gov.uk/government/publications/rates-and-thresholds-for-employers-2026-to-2027', fetch_url: 'https://www.gov.uk/api/content/guidance/rates-and-thresholds-for-employers-2026-to-2027',
    update_frequency: 'Every April (the page for the next tax year appears in the autumn)', stale_after_days: 396, data_stale_after_days: 400, weekly: true,
    fetch: async (get, today) => fetchRatesPage(get, today, parseStatutoryPay), validate: validateStatutoryPay,
    note: 'Read from the rates and thresholds page for the current tax year (6 April to 5 April). When next year\'s page appears it is shown as "upcoming". Statutory Sick Pay has its own figure.' },
  { key: 'employer_ni', name: 'Employer National Insurance (rate and thresholds)', publisher: 'GOV.UK (HMRC rates and thresholds for employers)', source_url: 'https://www.gov.uk/government/publications/rates-and-thresholds-for-employers-2026-to-2027', fetch_url: 'https://www.gov.uk/api/content/guidance/rates-and-thresholds-for-employers-2026-to-2027',
    update_frequency: 'Every April (announced at the Budget)', stale_after_days: 396, data_stale_after_days: 400, weekly: true,
    fetch: async (get, today) => fetchRatesPage(get, today, parseEmployerNi), validate: validateEmployerNi,
    note: 'Category A (most staff). The rate must be the same in every band or the figure goes to review. Employment Allowance is not taken off.' },
  { key: 'pension_ae', name: 'Workplace pension automatic enrolment (thresholds and minimum contributions)', publisher: 'GOV.UK', source_url: 'https://www.gov.uk/workplace-pensions', fetch_url: 'https://www.gov.uk/api/content/workplace-pensions',
    update_frequency: 'Usually reviewed every April', stale_after_days: 396, data_stale_after_days: null, weekly: true,
    fetch: async get => parsePensionAe(await get('https://www.gov.uk/api/content/workplace-pensions')), validate: validatePensionAe,
    note: 'GOV.UK does not date these figures on the page, so the date shown is when we last checked them.' },
  { key: 'dbs_fees', name: 'DBS check fees', publisher: 'GOV.UK (Disclosure and Barring Service)', source_url: 'https://www.gov.uk/dbs-check-applicant-criminal-record', fetch_url: 'https://www.gov.uk/api/content/dbs-check-applicant-criminal-record',
    update_frequency: 'When the DBS changes its fees (about every few years)', stale_after_days: 396, data_stale_after_days: null, weekly: true,
    fetch: async get => parseDbsFees(await get('https://www.gov.uk/api/content/dbs-check-applicant-criminal-record')), validate: validateDbsFees,
    note: 'The fee paid to the DBS. The organisation that processes the check (an umbrella body) may add its own administration fee. Checks are free for volunteers.' },
  { key: 'earnings_growth', name: 'Average weekly earnings growth, whole economy', publisher: 'Office for National Statistics', source_url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai9/lms', fetch_url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai9/lms/data',
    update_frequency: 'Monthly (ONS labour market release, mid month)', stale_after_days: 62, data_stale_after_days: 120, weekly: false,
    fetch: async get => parseEarningsGrowth(await get('https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai9/lms/data'), await get('https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kab9/lms/data')), validate: validateEarningsGrowth,
    note: 'A guide to what pay is doing across the whole economy, for pay review conversations. It is not a care sector figure.' },
  { key: 'bank_rate', name: 'Bank of England Bank Rate', publisher: 'Bank of England', source_url: 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate', fetch_url: 'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp',
    update_frequency: 'When the Monetary Policy Committee changes it (eight meetings a year)', stale_after_days: 16, data_stale_after_days: null, weekly: true,
    fetch: async get => parseBankRate(await get('https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp')), validate: validateBankRate,
    note: 'If the Bank of England page cannot be read, enter the rate by hand from the Platform console.' },
  { key: 'holiday_rules', name: 'Holiday pay rules (statutory leave and irregular hours)', publisher: 'GOV.UK', source_url: 'https://www.gov.uk/holiday-entitlement-rights', fetch_url: 'https://www.gov.uk/api/content/holiday-entitlement-rights',
    update_frequency: 'Rarely changes (the 12.07 percent rule started for leave years after 31 March 2024)', stale_after_days: 396, data_stale_after_days: null, weekly: true,
    fetch: async get => parseHolidayRules(await get('https://www.gov.uk/api/content/holiday-entitlement-rights')), validate: validateHolidayRules,
    note: 'GOV.UK does not date these rules on the page, so the date shown is when we last checked them. The holiday calculator in CareStream uses the same figures.' },
  { key: 'bank_holidays', name: 'Bank holidays in England and Wales', publisher: 'GOV.UK', source_url: 'https://www.gov.uk/bank-holidays', fetch_url: 'https://www.gov.uk/bank-holidays.json',
    update_frequency: 'Yearly (dates announced ahead)', stale_after_days: 365, data_stale_after_days: null, weekly: true,
    fetch: async get => parseBankHolidays(await get('https://www.gov.uk/bank-holidays.json')), validate: v => validateBankHolidays(v) },
  { key: 'ssp', name: 'Statutory Sick Pay weekly rate', publisher: 'GOV.UK', source_url: 'https://www.gov.uk/statutory-sick-pay', fetch_url: 'https://www.gov.uk/api/content/statutory-sick-pay',
    update_frequency: 'Every April', stale_after_days: 396, data_stale_after_days: null, weekly: true,
    fetch: async get => parseSsp(await get('https://www.gov.uk/api/content/statutory-sick-pay')), validate: validateSsp,
    note: 'GOV.UK does not date this figure on the page, so the date shown is when we last checked it.' },
  { key: 'mileage', name: 'HMRC approved mileage allowance payments', publisher: 'GOV.UK (HMRC)', source_url: 'https://www.gov.uk/expenses-and-benefits-business-travel-mileage/rules-for-tax', fetch_url: 'https://www.gov.uk/api/content/expenses-and-benefits-business-travel-mileage',
    update_frequency: 'When HMRC changes the rates', stale_after_days: 396, data_stale_after_days: null, weekly: true,
    fetch: async get => parseMileage(await get('https://www.gov.uk/api/content/expenses-and-benefits-business-travel-mileage')), validate: validateMileage },
  { key: 'real_living_wage', name: 'Real Living Wage (Living Wage Foundation)', publisher: 'Living Wage Foundation', source_url: 'https://www.livingwage.org.uk/what-real-living-wage', fetch_url: null,
    update_frequency: 'Every autumn (announced in the autumn, applies within 6 months)', stale_after_days: 396, data_stale_after_days: null, weekly: false, fetch: null, validate: validateRealLivingWage,
    note: 'Entered by hand: the Foundation does not publish a stable machine readable source.' },
]
export const sourceByKey = (key: string) => SOURCES.find(s => s.key === key)

// ── diff and status rules ───────────────────────────────────────────────────────────────
/** Stable text of a value (keys sorted) so two equal figures compare equal whatever the key order. */
export function stable(v: Json): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v as any).sort().map(k => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`
  return JSON.stringify(v ?? null)
}
/** The part of a value that counts as the figure changing (the "page updated" stamp and the repeated series do not). */
export function essence(key: string, v: any): Json {
  if (!v) return v
  if (key === 'nlw') return { current: v.current, upcoming: v.upcoming }
  if (key === 'cpi' || key === 'cpih' || key === 'cpi_food') return { latest: v.latest }
  if (key === 'road_fuel') return { latest: v.latest }
  if (key === 'earnings_growth') return { latest: v.latest, total_pay: v.total_pay }
  if (key === 'bank_rate') return { rate_pct: v.rate_pct, changed: v.changed }
  if (['statutory_pay', 'employer_ni', 'pension_ae', 'dbs_fees', 'holiday_rules'].includes(key)) { const { page_updated, ...rest } = v; return rest }
  return v
}
export const sameFigure = (key: string, a: Json, b: Json) => stable(essence(key, a)) === stable(essence(key, b))

export interface Row {
  key: string; name: string; publisher: string; source_url: string; update_frequency: string
  effective_from: string | null; value: any; previous_value: any
  fetched_at: string | null; last_checked_at: string | null; last_changed_at: string | null; next_check_due: string | null
  status: SourceStatus; last_error: string | null; note: string | null
}
export interface Outcome { key: string; name: string; result: 'unchanged' | 'first' | 'changed' | 'failed' | 'needs_review' | 'skipped_manual' | 'skipped_not_due'; message: string; before?: any; after?: any; row: Row | null }

/** What one check does to one row. Pure: no network, no database. */
export function applyCheck(def: SourceDef, prev: Row | null, result: { ok: true; fetched: Fetched } | { ok: false; error: string }, nowIso: string, today: string): { row: Row; outcome: Outcome; history: boolean } {
  const base: Row = prev ?? { key: def.key, name: def.name, publisher: def.publisher, source_url: def.source_url, update_frequency: def.update_frequency, effective_from: null, value: null, previous_value: null, fetched_at: null, last_checked_at: null, last_changed_at: null, next_check_due: null, status: 'needs_review', last_error: null, note: def.note ?? null }
  const weeklyNext = addDays(today, 7)
  const row: Row = { ...base, name: def.name, publisher: def.publisher, source_url: def.source_url, update_frequency: def.update_frequency, last_checked_at: nowIso, note: base.note ?? def.note ?? null }
  const out = (result_: Outcome['result'], message: string, extra: Partial<Outcome> = {}) => ({ key: def.key, name: def.name, result: result_, message, row, ...extra })

  if (!result.ok) {
    row.status = 'failed'; row.last_error = result.error; row.next_check_due = weeklyNext
    return { row, outcome: out('failed', `Could not read ${def.name}: ${result.error}${prev?.value ? ' The last good figure is still held.' : ''}`), history: false }
  }
  const problem = def.validate(result.fetched.value)
  if (problem) {
    row.status = 'needs_review'; row.last_error = `The new figure was not accepted: ${problem}`; row.next_check_due = weeklyNext
    return { row, outcome: out('needs_review', `${def.name}: the page gave a figure that was not accepted (${problem}). The last good figure is still held. Please look at it.`, { after: result.fetched.value }), history: false }
  }
  const same = prev?.value != null && sameFigure(def.key, prev.value, result.fetched.value)
  row.fetched_at = nowIso; row.last_error = null
  row.next_check_due = result.fetched.next_check_due ?? weeklyNext
  if (same) {
    row.value = result.fetched.value   // keep the latest copy of the full value (for example the 13 month series)
    row.effective_from = result.fetched.effective_from ?? prev!.effective_from
    row.status = prev!.status === 'changed' && prev!.last_changed_at && daysBetween(prev!.last_changed_at.slice(0, 10), today) < 14 ? 'changed' : 'ok'
    return { row, outcome: out('unchanged', `${def.name}: no change.`), history: false }
  }
  row.previous_value = prev?.value ?? null
  row.value = result.fetched.value
  row.effective_from = result.fetched.effective_from
  row.last_changed_at = nowIso
  row.status = prev?.value == null || def.routine ? 'ok' : 'changed'
  return { row, outcome: out(prev?.value == null ? 'first' : 'changed', prev?.value == null ? `${def.name}: first figure recorded.` : `${def.name}: the figure has changed.`, { before: prev?.value, after: result.fetched.value }), history: true }
}

// ── reading a figure (for the agents) ───────────────────────────────────────────────────
export interface Figure {
  key: string; name: string; value: any; effective_from: string | null; last_checked_at: string | null; fetched_at: string | null
  status: SourceStatus; stale: boolean; usable: boolean; source_url: string; publisher: string; note: string | null; warning: string | null
}
/** Whether a stored row is out of date: not fetched for longer than its cadence, or the figure itself has not moved on at the source. */
export function isStale(def: SourceDef, row: Pick<Row, 'fetched_at' | 'effective_from' | 'status'>, today: string): boolean {
  if (row.status === 'manual') return row.fetched_at ? daysBetween(row.fetched_at.slice(0, 10), today) > def.stale_after_days : false
  if (!row.fetched_at) return true
  if (daysBetween(row.fetched_at.slice(0, 10), today) > def.stale_after_days) return true
  if (def.data_stale_after_days != null && row.effective_from && daysBetween(row.effective_from, today) > def.data_stale_after_days) return true
  return false
}
export function toFigure(def: SourceDef, row: Row | null, today: string): Figure {
  const base = { key: def.key, name: def.name, source_url: def.source_url, publisher: def.publisher }
  if (!row || row.value == null) return { ...base, value: null, effective_from: null, last_checked_at: row?.last_checked_at ?? null, fetched_at: null, status: row?.status ?? 'needs_review', stale: true, usable: false, note: row?.note ?? def.note ?? null, warning: `${def.name} has not been recorded yet, so it cannot be used.` }
  const stale = isStale(def, row, today)
  const bad = row.status === 'failed' || row.status === 'needs_review'
  let warning: string | null = null
  if (bad) warning = `${def.name} could not be confirmed at its last check (${row.status === 'failed' ? 'the source could not be read' : 'the new figure needs a person to review it'}). This is the last good figure${row.effective_from ? `, as of ${row.effective_from}` : ''}.`
  else if (stale) warning = `${def.name} may be out of date: it was last confirmed on ${(row.fetched_at ?? '').slice(0, 10) || 'an unknown date'}.`
  else if (row.status === 'manual') warning = `${def.name} was entered by hand${row.note ? `: ${row.note}` : ''}.`
  return { ...base, value: row.value, effective_from: row.effective_from, last_checked_at: row.last_checked_at, fetched_at: row.fetched_at, status: row.status, stale, usable: !bad, note: row.note ?? def.note ?? null, warning }
}
/** The sentence an agent puts after a figure: where it is from and how fresh it is. */
export function asOfText(f: Figure): string {
  const when = f.effective_from ? `as of ${f.effective_from}` : `checked ${(f.fetched_at ?? '').slice(0, 10) || 'on an unknown date'}`
  return `Source: ${f.publisher}, ${when}.${f.warning ? ` Warning: ${f.warning}` : ''}`
}

// ── the run ─────────────────────────────────────────────────────────────────────────────
export interface Db {
  all(): Promise<Row[]>
  save(row: Row): Promise<void>
  history(key: string, row: Row, status: string, note?: string | null): Promise<void>
}
export interface RunDeps { db: Db; get: (url: string) => Promise<any>; now: () => Date; notify: (o: { subject: string; lines: string[] }) => Promise<void> }
export interface RunSummary { checked: number; changed: number; failed: number; needs_review: number; emailed: boolean; outcomes: Array<Omit<Outcome, 'row'>> }

/** Check the sources. `force` checks every source whatever its due date; `only` limits it to one. Sends ONE email, and only when something changed, failed or needs review. */
export async function checkAll(deps: RunDeps, opts: { force?: boolean; only?: string } = {}): Promise<RunSummary> {
  const now = deps.now(), nowIso = now.toISOString(), today = ymd(now)
  const rows = new Map((await deps.db.all()).map(r => [r.key, r]))
  const outcomes: Outcome[] = []
  for (const def of SOURCES) {
    if (opts.only && def.key !== opts.only) continue
    const prev = rows.get(def.key) ?? null
    if (!def.fetch) {
      // Manual only: make sure the row exists so it shows on the page, waiting for a figure.
      if (!prev) { const row: Row = { key: def.key, name: def.name, publisher: def.publisher, source_url: def.source_url, update_frequency: def.update_frequency, effective_from: null, value: null, previous_value: null, fetched_at: null, last_checked_at: nowIso, last_changed_at: null, next_check_due: null, status: 'manual', last_error: null, note: def.note ?? null }; await deps.db.save(row) }
      continue
    }
    if (prev?.status === 'manual' && !opts.only) { outcomes.push({ key: def.key, name: def.name, result: 'skipped_manual', message: `${def.name}: entered by hand, not checked.`, row: prev }); continue }
    if (!opts.force && !opts.only && !def.weekly && prev?.next_check_due && prev.next_check_due > today && prev.status !== 'failed' && prev.status !== 'needs_review') {
      outcomes.push({ key: def.key, name: def.name, result: 'skipped_not_due', message: `${def.name}: not due until ${prev.next_check_due}.`, row: prev }); continue
    }
    let res: { ok: true; fetched: Fetched } | { ok: false; error: string }
    try { res = { ok: true, fetched: await def.fetch(deps.get, today) } } catch (e: any) { res = { ok: false, error: String(e?.message ?? e).slice(0, 300) } }
    const r = applyCheck(def, prev, res, nowIso, today)
    await deps.db.save(r.row)
    if (r.history) await deps.db.history(def.key, r.row, r.row.status)
    outcomes.push(r.outcome)
  }
  let emailed = false
  const worth = outcomes.filter(o => (o.result === 'changed' && !sourceByKey(o.key)?.routine) || o.result === 'failed' || o.result === 'needs_review')
  if (worth.length) {
    const lines = worth.map(o => o.result === 'changed' ? `${o.message} Before: ${brief(o.key, o.before)}. Now: ${brief(o.key, o.after)}.` : o.message)
    try { await deps.notify({ subject: `Data sources: ${worth.length} to look at`, lines }); emailed = true } catch { /* the check still counts */ }
  }
  return {
    checked: outcomes.filter(o => !o.result.startsWith('skipped')).length,
    changed: outcomes.filter(o => o.result === 'changed' || o.result === 'first').length,
    failed: outcomes.filter(o => o.result === 'failed').length,
    needs_review: outcomes.filter(o => o.result === 'needs_review').length,
    emailed, outcomes: outcomes.map(({ row, ...o }) => o),
  }
}
/** A short plain description of a value, for the email. */
export function brief(key: string, v: any): string {
  if (v == null) return 'nothing recorded'
  if (key === 'nlw') return `${v.current?.label ?? '?'}: 21 and over £${v.current?.age21}, 18 to 20 £${v.current?.age18to20}, under 18 £${v.current?.under18}, apprentice £${v.current?.apprentice}`
  if (key === 'cpi' || key === 'cpih' || key === 'cpi_food') return `${v.latest?.rate}% for ${v.latest?.period}`
  if (key === 'ssp') return `£${v.weekly_rate_gbp} a week`
  if (key === 'mileage') return `cars and vans ${v.cars_vans_first_10000_pence}p then ${v.cars_vans_after_10000_pence}p, motorcycles ${v.motorcycle_pence}p, bikes ${v.bike_pence}p`
  if (key === 'bank_holidays') return `${(v.events ?? []).length} dates, ${v.first_year} to ${v.last_year}`
  if (key === 'real_living_wage') return `£${v.hourly_rate_gbp}`
  if (key === 'statutory_pay') return `£${v.weekly_rate_gbp} a week or ${v.earnings_share_pct}% of average earnings if lower (${v.tax_year})`
  if (key === 'employer_ni') return `${v.secondary_rate_pct}% above £${v.thresholds?.secondary_threshold?.year} a year (£${v.thresholds?.secondary_threshold?.month} a month), ${v.tax_year}`
  if (key === 'pension_ae') return `enrol at £${v.earnings_trigger_gbp}, qualifying earnings £${v.qualifying_earnings_lower_gbp} to £${v.qualifying_earnings_upper_gbp}, minimum ${v.minimum_total_pct}% (employer ${v.minimum_employer_pct}%)`
  if (key === 'dbs_fees') return `basic £${v.basic_gbp}, standard £${v.standard_gbp}, enhanced £${v.enhanced_gbp}${v.volunteers_free ? ', free for volunteers' : ''}`
  if (key === 'earnings_growth') return `${v.latest?.rate}% regular pay growth for ${v.latest?.period}, average weekly total pay £${v.total_pay?.weekly_gbp}`
  if (key === 'bank_rate') return `${v.rate_pct}% since ${v.changed}`
  if (key === 'holiday_rules') return `${v.statutory_weeks} weeks (capped at ${v.cap_days_five_day_week} days), irregular hours ${v.irregular_hours_pct}%`
  if (key === 'road_fuel') return `petrol ${v.latest?.petrol}p, diesel ${v.latest?.diesel}p a litre (week of ${v.latest?.date})`
  if (key === 'homecare_private_rate' || key === 'homecare_min_price' || key === 'council_homecare_rate') return `£${v.hourly_gbp} an hour${v.low_gbp != null ? ` (£${v.low_gbp} to £${v.high_gbp})` : ''}, ${v.period ?? ''}`.trim()
  if (key === 'care_food_cost') return `£${v.low_gbp_week} to £${v.high_gbp_week} per resident per week (${v.price_year} prices${v.councils ? ', ' + v.councils + ' councils' : ''})`
  return stable(v).slice(0, 120)
}

// ── a manual figure (platform console) ──────────────────────────────────────────────────
export function applyManual(def: SourceDef, prev: Row | null, input: { value: any; effective_from?: string | null; note?: string | null }, nowIso: string): { row: Row } | { error: string } {
  const problem = def.validate(input.value)
  if (problem) return { error: problem }
  if (input.effective_from != null && input.effective_from !== '' && !isYmd(input.effective_from)) return { error: 'The effective date must look like 2026-04-01.' }
  const note = String(input.note ?? '').trim().slice(0, 300)
  if (def.fetch && !note) return { error: 'Please say why the figure is being entered by hand.' }
  const row: Row = {
    key: def.key, name: def.name, publisher: def.publisher, source_url: def.source_url, update_frequency: def.update_frequency,
    effective_from: input.effective_from || null, value: input.value, previous_value: prev?.value ?? null,
    fetched_at: nowIso, last_checked_at: nowIso, last_changed_at: nowIso, next_check_due: null, status: 'manual', last_error: null, note: note || prev?.note || def.note || null,
  }
  return { row }
}
