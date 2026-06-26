// Prospect sync — pulls the UK CQC-regulated provider universe from CareAssura
// (read-only, via PostgREST + anon key), scores/segments each one, and bulk-
// upserts into our own provider_leads table.
//
// The upsert refreshes the CQC snapshot + computed fields on every run but
// PRESERVES nurture state (status, owner, notes, contact dates) — so re-syncing
// never clobbers sales progress. Designed to run from the deployed API (has
// DATABASE_URL) on demand (admin "Sync now") or a weekly cron.

import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import { scoreProvider, type ProviderInput, type Segment } from './scoring'

const CAREASSURA_URL = process.env.CAREASSURA_SUPABASE_URL
const CAREASSURA_KEY = process.env.CAREASSURA_SUPABASE_ANON_KEY

const SOURCE_COLUMNS = [
  'id', 'slug', 'name', 'town', 'county', 'region', 'postcode', 'phone', 'email', 'website',
  'type_nursing', 'type_homecare',
  'cqc_rating', 'cqc_safe_rating', 'cqc_effective_rating', 'cqc_caring_rating',
  'cqc_responsive_rating', 'cqc_well_led_rating', 'cqc_inspection_date', 'cqc_report_url',
].join(',')

interface SourceRow {
  id: string
  slug: string | null
  name: string
  town: string | null
  county: string | null
  region: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  website: string | null
  type_nursing: boolean | null
  type_homecare: boolean | null
  cqc_rating: string | null
  cqc_safe_rating: string | null
  cqc_effective_rating: string | null
  cqc_caring_rating: string | null
  cqc_responsive_rating: string | null
  cqc_well_led_rating: string | null
  cqc_inspection_date: string | null
  cqc_report_url: string | null
}

function settingOf(r: SourceRow): string {
  if (r.type_nursing) return 'Nursing'
  if (r.type_homecare) return 'Home care'
  return 'Residential'
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
function safeDate(v: string | null): string | null {
  return v && ISO_DATE.test(v) ? v : null
}

// Fetch every published provider from CareAssura in pages of 1000.
async function fetchSource(): Promise<SourceRow[]> {
  if (!CAREASSURA_URL || !CAREASSURA_KEY) {
    throw new Error('CAREASSURA_SUPABASE_URL / CAREASSURA_SUPABASE_ANON_KEY not configured')
  }
  const rows: SourceRow[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const url =
      `${CAREASSURA_URL}/rest/v1/care_homes` +
      `?select=${SOURCE_COLUMNS}&status=eq.published`
    const res = await fetch(url, {
      headers: {
        apikey: CAREASSURA_KEY,
        Authorization: `Bearer ${CAREASSURA_KEY}`,
        Range: `${from}-${from + pageSize - 1}`,
      },
    })
    if (!res.ok) throw new Error(`CareAssura PostgREST ${res.status}: ${await res.text()}`)
    const batch = (await res.json()) as SourceRow[]
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

// Bulk INSERT ... ON CONFLICT for one chunk. Updates snapshot + computed fields;
// leaves nurture columns (status/owner/notes/last_contacted_at/next_action_at)
// and created_at untouched.
async function upsertChunk(rows: Array<{ p: SourceRow; segment: Segment; score: number; angleKey: string; angleLabel: string; failing: string[]; whyNow: string }>): Promise<void> {
  const values = rows.map((r) => {
    const arrayLiteral = `{${r.failing.join(',')}}` // labels are fixed safe tokens (no commas)
    return Prisma.sql`(${r.p.id}, ${r.p.slug}, ${r.p.name}, ${settingOf(r.p)}, ${r.p.town}, ${r.p.county}, ${r.p.region}, ${r.p.postcode}, ${r.p.phone}, ${r.p.email}, ${r.p.website}, ${r.p.cqc_rating}, ${r.p.cqc_safe_rating}, ${r.p.cqc_effective_rating}, ${r.p.cqc_caring_rating}, ${r.p.cqc_responsive_rating}, ${r.p.cqc_well_led_rating}, ${safeDate(r.p.cqc_inspection_date)}::date, ${r.p.cqc_report_url}, ${r.segment}, ${r.score}, ${r.angleKey}, ${r.angleLabel}, ${arrayLiteral}::text[], ${r.whyNow}, now())`
  })

  await prisma.$executeRaw`
    INSERT INTO provider_leads (
      source_id, slug, name, setting, town, county, region, postcode, phone, email, website,
      cqc_rating, cqc_safe_rating, cqc_effective_rating, cqc_caring_rating, cqc_responsive_rating, cqc_well_led_rating,
      cqc_inspection_date, cqc_report_url,
      segment, score, lead_angle_key, lead_angle_label, failing_domains, why_now, synced_at
    )
    VALUES ${Prisma.join(values)}
    ON CONFLICT (source_id) DO UPDATE SET
      slug = EXCLUDED.slug, name = EXCLUDED.name, setting = EXCLUDED.setting,
      town = EXCLUDED.town, county = EXCLUDED.county, region = EXCLUDED.region, postcode = EXCLUDED.postcode,
      phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website,
      cqc_rating = EXCLUDED.cqc_rating, cqc_safe_rating = EXCLUDED.cqc_safe_rating,
      cqc_effective_rating = EXCLUDED.cqc_effective_rating, cqc_caring_rating = EXCLUDED.cqc_caring_rating,
      cqc_responsive_rating = EXCLUDED.cqc_responsive_rating, cqc_well_led_rating = EXCLUDED.cqc_well_led_rating,
      cqc_inspection_date = EXCLUDED.cqc_inspection_date, cqc_report_url = EXCLUDED.cqc_report_url,
      segment = EXCLUDED.segment, score = EXCLUDED.score,
      lead_angle_key = EXCLUDED.lead_angle_key, lead_angle_label = EXCLUDED.lead_angle_label,
      failing_domains = EXCLUDED.failing_domains, why_now = EXCLUDED.why_now,
      synced_at = now(), updated_at = now()
  `
}

export interface SyncResult {
  fetched: number
  upserted: number
  bySegment: Record<string, number>
  durationMs: number
}

export async function syncProspects(): Promise<SyncResult> {
  const startedAt = Date.now()
  const source = await fetchSource()
  const now = new Date()

  const scored = source.map((p) => {
    const input: ProviderInput = {
      cqc_rating: p.cqc_rating,
      cqc_safe_rating: p.cqc_safe_rating,
      cqc_effective_rating: p.cqc_effective_rating,
      cqc_caring_rating: p.cqc_caring_rating,
      cqc_responsive_rating: p.cqc_responsive_rating,
      cqc_well_led_rating: p.cqc_well_led_rating,
      cqc_inspection_date: safeDate(p.cqc_inspection_date),
      setting: settingOf(p),
      name: p.name,
      phone: p.phone,
      email: p.email,
      website: p.website,
    }
    const s = scoreProvider(input, now)
    return { p, segment: s.segment, score: s.score, angleKey: s.angleKey, angleLabel: s.angleLabel, failing: s.failingDomains, whyNow: s.whyNow }
  })

  const bySegment: Record<string, number> = {}
  for (const r of scored) bySegment[r.segment] = (bySegment[r.segment] ?? 0) + 1

  const CHUNK = 500
  let upserted = 0
  for (let i = 0; i < scored.length; i += CHUNK) {
    const chunk = scored.slice(i, i + CHUNK)
    await upsertChunk(chunk)
    upserted += chunk.length
  }

  return { fetched: source.length, upserted, bySegment, durationMs: Date.now() - startedAt }
}
