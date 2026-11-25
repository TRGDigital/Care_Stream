// The organisation's letterhead and company details: what prints at the top and bottom of every formal letter, report and newsletter (PDF and Word).
// The details live in the tenant_letterhead table (idempotent SQL in prisma/sql/2026-11-25_letterhead_signatures.sql). A missing table or a missing row never breaks a document:
// the service's display name is used, the footer is simply shorter, and a gentle checklist says what is still to fill in.
//
// Generic code: nothing here is specific to the Ask CareStream pilot. The pilot only decides who sees the Settings screens (routes/letterhead.ts).
// No dashes in anything this file writes (the details a person types are printed as typed).

import { prisma } from '../../db/client'
import { usableBrand } from '../../lib/brand-colour'

const q = () => prisma as any

export const REGISTERED_IN = ['England and Wales', 'Scotland', 'Northern Ireland', 'Other'] as const
export type RegisteredIn = (typeof REGISTERED_IN)[number]
export const LOGO_ALIGN = ['left', 'centre'] as const
export type LogoAlign = (typeof LOGO_ALIGN)[number]

/** What an administrator types in Settings. Every text is optional; empty means "not set". */
export interface LetterheadDetails {
  trading_name: string | null
  legal_name: string | null
  address_line1: string | null
  address_line2: string | null
  town: string | null
  county: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  website: string | null
  company_number: string | null
  registered_in: RegisteredIn | null
  registered_in_other: string | null
  registered_office_same: boolean
  registered_office: string | null
  vat_number: string | null
  cqc_provider_id: string | null
  cqc_location_id: string | null
  ico_number: string | null
  footer_line: string | null
  logo_align: LogoAlign
}

export const EMPTY_DETAILS: LetterheadDetails = {
  trading_name: null, legal_name: null, address_line1: null, address_line2: null, town: null, county: null, postcode: null, phone: null, email: null, website: null,
  company_number: null, registered_in: 'England and Wales', registered_in_other: null, registered_office_same: true, registered_office: null, vat_number: null,
  cqc_provider_id: null, cqc_location_id: null, ico_number: null, footer_line: null, logo_align: 'left',
}

/** What the renderers (PDF and Word) need. Built from the details, the tenant's display name and the logo. */
export interface Letterhead {
  /** The name printed at the top of the page and used in letter text: the trading name, else the account's display name. */
  name: string
  /** Kept for older callers: the address as one string. */
  address?: string | null
  logoDataUrl?: string | null
  legalName?: string | null
  addressLines?: string[]
  contactLines?: string[]
  footerLines?: string[]
  logoAlign?: LogoAlign
  /** The organisation's brand colour (a readable hex), used for rules and headings only. null = the default. */
  brandColour?: string | null
}

const TEXT_LIMITS: Record<string, number> = {
  trading_name: 120, legal_name: 160, address_line1: 120, address_line2: 120, town: 80, county: 80, postcode: 16, phone: 40, email: 120, website: 120,
  company_number: 20, registered_in_other: 60, registered_office: 300, vat_number: 24, cqc_provider_id: 24, cqc_location_id: 24, ico_number: 24, footer_line: 160,
}

const clean = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

/** Cleans what the form sent. Never throws: bad values become empty. */
export function cleanDetails(body: any): LetterheadDetails {
  const d: LetterheadDetails = { ...EMPTY_DETAILS }
  for (const k of Object.keys(TEXT_LIMITS)) (d as any)[k] = clean(body?.[k], TEXT_LIMITS[k])
  d.registered_in = (REGISTERED_IN as readonly string[]).includes(body?.registered_in) ? body.registered_in : (d.registered_in ?? 'England and Wales')
  d.registered_in_other = d.registered_in === 'Other' ? d.registered_in_other : null
  d.registered_office_same = body?.registered_office_same !== false
  if (d.registered_office_same) d.registered_office = null
  d.logo_align = body?.logo_align === 'centre' ? 'centre' : 'left'
  if (d.website) d.website = d.website.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  return d
}

// ── The lines that print ─────────────────────────────────────────────────────────────────────────
export function addressLines(d: Partial<LetterheadDetails>): string[] {
  const townCounty = [d.town, d.county].filter(Boolean).join(', ')
  return [d.address_line1, d.address_line2, townCounty, d.postcode].map(s => (s ?? '').trim()).filter(Boolean)
}
export function contactLines(d: Partial<LetterheadDetails>): string[] {
  return [d.phone ? `Tel: ${d.phone}` : '', d.email ? `Email: ${d.email}` : '', d.website ? `Web: ${d.website}` : ''].filter(Boolean)
}
const registrationPlace = (d: Partial<LetterheadDetails>): string => (d.registered_in === 'Other' ? (d.registered_in_other ?? '') : (d.registered_in ?? ''))
/** The registered office as one line: the typed registered office, or the address above when "same as above" is on. */
export function registeredOfficeLine(d: Partial<LetterheadDetails>): string {
  if (d.registered_office_same !== false) return addressLines(d).join(', ')
  return (d.registered_office ?? '').trim()
}

/** The small grey lines at the bottom of every page. Empty when nothing is set. */
export function footerLines(d: Partial<LetterheadDetails>): string[] {
  const lines: string[] = []
  const place = registrationPlace(d)
  const reg = d.company_number ? `${d.legal_name ? `${d.legal_name}. ` : ''}${place ? `Registered in ${place}, c` : 'C'}ompany number ${d.company_number}` : (d.legal_name ?? '')
  if (reg) lines.push(reg)
  const office = registeredOfficeLine(d)
  if (office && (d.company_number || d.legal_name)) lines.push(`Registered office: ${office}`)
  const ids = [d.vat_number ? `VAT number ${d.vat_number}` : '', d.cqc_provider_id ? `CQC provider ID ${d.cqc_provider_id}` : '', d.cqc_location_id ? `CQC location ID ${d.cqc_location_id}` : '', d.ico_number ? `ICO registration ${d.ico_number}` : ''].filter(Boolean)
  if (ids.length) lines.push(ids.join(' | '))
  if (d.footer_line) lines.push(d.footer_line)
  return lines
}

/** A gentle checklist of what a formal letter would still like. Never an error. */
export function missingChecklist(d: Partial<LetterheadDetails>, hasLogo: boolean): string[] {
  const m: string[] = []
  if (!d.trading_name) m.push('The name you trade under')
  if (!hasLogo) m.push('Your logo (add it under Organisation logo in Settings)')
  if (addressLines(d).length === 0) m.push('Your address')
  if (!d.phone && !d.email) m.push('A phone number or email address')
  if (!d.legal_name) m.push('Your company’s legal name')
  if (!d.company_number) m.push('Your company registration number')
  return m
}

export function toLetterhead(d: Partial<LetterheadDetails> | null, displayName: string, logoDataUrl: string | null): Letterhead {
  const det = d ?? {}
  const lines = addressLines(det)
  return {
    name: (det.trading_name ?? '').trim() || displayName || 'Your service',
    address: lines.join(', ') || null,
    logoDataUrl,
    legalName: det.legal_name ?? null,
    addressLines: lines,
    contactLines: contactLines(det),
    footerLines: footerLines(det),
    logoAlign: det.logo_align === 'centre' ? 'centre' : 'left',
  }
}

// ── The database (plain SQL: no Prisma model, so nothing existing can be affected) ───────────────────
export async function letterheadTableReady(): Promise<boolean> {
  try { await q().$queryRawUnsafe('select 1 from tenant_letterhead limit 1'); return true } catch { return false }
}

export async function getDetails(tenantId: string): Promise<LetterheadDetails | null> {
  try {
    const r: any[] = await q().$queryRawUnsafe('select * from tenant_letterhead where tenant_id = $1', tenantId)
    if (!r[0]) return null
    return { ...cleanDetails(r[0]), registered_office_same: r[0].registered_office_same !== false, registered_office: r[0].registered_office ?? null }
  } catch { return null }
}

export async function saveDetails(tenantId: string, d: LetterheadDetails, userId: string): Promise<void> {
  const cols = Object.keys(TEXT_LIMITS)
  const vals = cols.map(c => (d as any)[c] ?? null)
  const sql = `insert into tenant_letterhead (tenant_id, ${cols.join(', ')}, registered_in, registered_office_same, logo_align, updated_by, updated_at)
    values ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')}, $${cols.length + 2}, $${cols.length + 3}, $${cols.length + 4}, $${cols.length + 5}, now())
    on conflict (tenant_id) do update set ${cols.map(c => `${c} = excluded.${c}`).join(', ')}, registered_in = excluded.registered_in, registered_office_same = excluded.registered_office_same,
      logo_align = excluded.logo_align, updated_by = excluded.updated_by, updated_at = now()`
  await q().$executeRawUnsafe(sql, tenantId, ...vals, d.registered_in ?? 'England and Wales', d.registered_office_same, d.logo_align, userId)
}

// ── The brand colour: its own column and its own queries, so a missing column can never break the rest of the letterhead ───────────────
export async function brandColumnReady(): Promise<boolean> {
  try { await q().$queryRawUnsafe('select 1 from tenant_letterhead where brand_colour is null limit 1'); return true } catch { return false }
}
export async function getBrandColour(tenantId: string): Promise<string | null> {
  try {
    const r: any[] = await q().$queryRawUnsafe('select brand_colour from tenant_letterhead where tenant_id = $1', tenantId)
    return usableBrand(r[0]?.brand_colour)
  } catch { return null }
}
/** Saves (or clears with null) the brand colour. The letterhead row must exist: it is created empty when the first colour is set. */
export async function saveBrandColour(tenantId: string, colour: string | null, userId: string): Promise<void> {
  await q().$executeRawUnsafe(
    `insert into tenant_letterhead (tenant_id, brand_colour, updated_by, updated_at) values ($1, $2, $3, now())
     on conflict (tenant_id) do update set brand_colour = excluded.brand_colour, updated_by = excluded.updated_by, updated_at = now()`, tenantId, colour, userId)
}

export interface LoadedLetterhead { head: Letterhead; details: LetterheadDetails | null; missing: string[]; ready: boolean; displayName: string; /** The address typed in Settings, Organisation details, as one line (null when none). */ orgAddress: string | null; /** True when the letterhead has no address of its own and the Organisation details address is being used. */ addressFromOrg: boolean }

const UK_POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
/** The single address line typed in Settings, Organisation details ("3 Amberley Close, Burgess Hill, RH15 8JB") as the parts of a letterhead address. */
export function orgAddressParts(raw: unknown): Partial<LetterheadDetails> | null {
  const parts = String(raw ?? '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean).slice(0, 8)
  if (!parts.length) return null
  let postcode = ''
  if (parts.length > 1 && UK_POSTCODE.test(parts[parts.length - 1])) postcode = parts.pop() as string
  const out: Partial<LetterheadDetails> = { address_line1: parts[0] }
  if (parts.length >= 2) out.town = parts[parts.length - 1]
  if (parts.length >= 3) out.address_line2 = parts.slice(1, -1).join(', ')
  if (postcode) out.postcode = postcode
  return out
}
/** The lines under a newsletter: the address first (one line), then the phone and email, at most three. */
export const footerContactLines = (head: { addressLines?: string[]; contactLines?: string[] }): string[] => [...((head.addressLines ?? []).length ? [(head.addressLines ?? []).join(', ')] : []), ...(head.contactLines ?? [])].slice(0, 3)
/** The letterhead details with the Organisation details address filled in, but ONLY where the letterhead has no address of its own (what the administrator typed for the letterhead always wins). */
export function withOrgAddress(d: LetterheadDetails | null, raw: unknown): { details: LetterheadDetails | null; fromOrg: boolean } {
  if (d && addressLines(d).length) return { details: d, fromOrg: false }
  const parts = orgAddressParts(raw)
  if (!parts) return { details: d, fromOrg: false }
  return { details: { ...(d ?? ({} as LetterheadDetails)), ...parts } as LetterheadDetails, fromOrg: true }
}

/** The letterhead for a tenant. Falls back to the display name and the organisation logo when nothing is saved or the table does not exist yet. */
export async function loadLetterhead(tenantId: string): Promise<LoadedLetterhead> {
  let t: any = null
  try { t = await q().tenant.findUnique({ where: { id: tenantId }, select: { name: true, logo_url: true, organisation_details: true } }) } catch { t = null }
  const logo = typeof t?.logo_url === 'string' && /^data:image\//.test(t.logo_url) ? t.logo_url : null
  const saved = await getDetails(tenantId)
  const orgRaw = (t?.organisation_details as any)?.address
  const { details, fromOrg } = withOrgAddress(saved, orgRaw)
  const head = toLetterhead(details, t?.name ?? 'Your service', logo)
  head.brandColour = await getBrandColour(tenantId)
  return { head, details: saved, missing: missingChecklist(details ?? {}, !!logo), ready: !!saved, displayName: t?.name ?? 'Your service', orgAddress: String(orgRaw ?? '').trim() || null, addressFromOrg: fromOrg }
}
