// The Monday indexing email: how many pages each site pushed through RalfyIndex last week.
//
// Both sites share one RalfyIndex account, so the credit balance is reported once, for
// both. CareStream's numbers come from ralfyindex_submissions here; CareAssura's come from
// its own /api/indexing-stats (token-protected), because its queue lives in its own database.
//
// Written after the key had been rejected for six weeks (11 Aug to 21 Sept) and CareAssura's
// drain had silently stopped for nine days: failures are counted and shown, not just
// successes, so a week of zeros reads as a problem rather than a quiet week.

import { prisma } from '../../db/client'
import { ralfyIndexBalance } from './indexer'

const CAREASSURA_STATS_URL = process.env.CAREASSURA_INDEXING_STATS_URL || 'https://careassura.com/api/indexing-stats'

export type SiteWeek = {
  site: string
  available: boolean
  error?: string
  submitted: number
  failed: number | null      // CareAssura has no failure log; its misses show as pending
  pending: number | null
  breakdown: Array<{ label: string; submitted: number; pending?: number }>
  last_submitted_at: string | null
}

export type IndexingReport = {
  generated_at: string
  days: number
  balance: number | null
  sites: SiteWeek[]
}

async function careStreamWeek(since: Date): Promise<SiteWeek> {
  const rows: Array<{ source: string; status: string; _count: { _all: number } }> =
    await (prisma as any).ralfyIndexSubmission.groupBy({
      by: ['source', 'status'],
      where: { created_at: { gte: since } },
      _count: { _all: true },
    })
  const last = await (prisma as any).ralfyIndexSubmission.findFirst({
    where: { status: 'submitted' },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  })
  const sum = (status: string, source?: string) =>
    rows.filter(r => r.status === status && (!source || r.source === source)).reduce((n, r) => n + r._count._all, 0)
  return {
    site: 'carestreamai.com',
    available: true,
    submitted: sum('submitted'),
    failed: sum('failed'),
    pending: null,
    breakdown: [
      { label: 'Blog posts', submitted: sum('submitted', 'blog') },
      { label: 'Pages', submitted: sum('submitted', 'page') },
    ],
    last_submitted_at: last?.created_at ? new Date(last.created_at).toISOString() : null,
  }
}

async function careAssuraWeek(days: number): Promise<SiteWeek> {
  const empty = (error: string): SiteWeek => ({
    site: 'careassura.com', available: false, error,
    submitted: 0, failed: null, pending: null, breakdown: [], last_submitted_at: null,
  })
  const token = process.env.INDEXING_STATS_TOKEN
  if (!token) return empty('INDEXING_STATS_TOKEN is not set on the CareStream API')
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(`${CAREASSURA_STATS_URL}?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer))
    if (!res.ok) return empty(`CareAssura stats returned ${res.status}`)
    const d: any = await res.json()
    const LABELS: Record<string, string> = {
      blog: 'Blog posts', content: 'Resources', collection: 'Collection pages', profile: 'Provider profiles', tools: 'Tools',
    }
    return {
      site: 'careassura.com',
      available: true,
      submitted: Number(d.submitted) || 0,
      failed: null,
      pending: Number(d.pending) || 0,
      breakdown: Object.entries(d.by_type ?? {})
        .map(([k, v]: [string, any]) => ({ label: LABELS[k] ?? k, submitted: Number(v?.submitted) || 0, pending: Number(v?.pending) || 0 }))
        .filter(b => b.submitted > 0 || (b.pending ?? 0) > 0),
      last_submitted_at: d.last_submitted_at ?? null,
    }
  } catch (e: any) {
    return empty(`CareAssura stats unreachable: ${e?.message ?? e}`)
  }
}

export async function buildIndexingReport(days = 7): Promise<IndexingReport> {
  const since = new Date(Date.now() - days * 864e5)
  const [balance, carestream, careassura] = await Promise.all([
    ralfyIndexBalance(),
    careStreamWeek(since),
    careAssuraWeek(days),
  ])
  return { generated_at: new Date().toISOString(), days, balance, sites: [carestream, careassura] }
}
