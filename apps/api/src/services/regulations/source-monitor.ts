// Best-effort monitoring of each regulation's source URLs. Fetches every source,
// fingerprints it (preferring the ETag / Last-Modified header, falling back to a
// hash of the page's visible text), and when a fingerprint changes it FLAGS the
// regulation for review (needs_update) with a note. It never edits content — a
// human always reviews the change against the source.
//
// Caveats (by design it errs toward flagging): dynamic pages can change cosmetically
// and trigger a flag, and PDFs / bot-blocked pages are skipped. This surfaces "worth
// a look", not "the law definitely changed".

import crypto from 'crypto'
import { prisma } from '../../db/client'
import { mapLimit } from '../../lib/translate'

const FETCH_TIMEOUT_MS = 9000
const UA = 'CareStreamAI-RegulationMonitor/1.0 (+https://www.carestreamai.com)'

async function fingerprintUrl(url: string): Promise<{ fp: string; kind: 'etag' | 'last-modified' | 'hash' | 'skip' | 'error' }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' } })
    if (!resp.ok) return { fp: `err:${resp.status}`, kind: 'error' }

    const ctype = (resp.headers.get('content-type') || '').toLowerCase()
    // Prefer strong validators — they change only when the resource does.
    const etag = resp.headers.get('etag')
    if (etag) return { fp: `etag:${etag}`, kind: 'etag' }
    const lastMod = resp.headers.get('last-modified')
    if (lastMod) return { fp: `lm:${lastMod}`, kind: 'last-modified' }

    // Non-HTML (PDFs etc.) — can't reliably fingerprint content; skip (never flags).
    if (!ctype.includes('html') && !ctype.includes('xml')) return { fp: 'skip:non-html', kind: 'skip' }

    const body = await resp.text()
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) return { fp: 'skip:empty', kind: 'skip' }
    return { fp: `h:${crypto.createHash('sha256').update(text).digest('hex')}`, kind: 'hash' }
  } catch {
    return { fp: 'err:fetch', kind: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

const isReal = (fp: string) => !fp.startsWith('err:') && !fp.startsWith('skip:')

export type SourceMonitorSummary = {
  regulations: number; urls_checked: number; changed: number; flagged: number; errors: number
  flagged_regs: Array<{ reference_key: string; official_name: string; url: string }>
}

// Check the source URLs for one regulation (referenceKey) or all active ones.
export async function checkRegulationSources(opts: { referenceKey?: string } = {}): Promise<SourceMonitorSummary> {
  const regs = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true, ...(opts.referenceKey ? { reference_key: opts.referenceKey } : {}) },
    select: { reference_key: true, official_name: true, source_urls: true, needs_update: true, review_note: true },
  })

  const summary: SourceMonitorSummary = { regulations: 0, urls_checked: 0, changed: 0, flagged: 0, errors: 0, flagged_regs: [] }
  const now = new Date()

  for (const reg of regs as any[]) {
    const urls: string[] = (reg.source_urls ?? []).filter(Boolean)
    if (!urls.length) continue
    summary.regulations++
    let regChangedUrl: string | null = null

    await mapLimit(urls, 3, async (url: string) => {
      summary.urls_checked++
      const { fp, kind } = await fingerprintUrl(url)
      if (kind === 'error') summary.errors++

      const prior = await (prisma as any).regulationSourceCheck.findUnique({
        where: { reference_key_url: { reference_key: reg.reference_key, url } },
      }).catch(() => null)

      // A real change = both old and new fingerprints are meaningful and differ.
      const changed = !!prior && isReal(prior.fingerprint ?? '') && isReal(fp) && prior.fingerprint !== fp
      if (changed) { summary.changed++; regChangedUrl = url }

      // Only advance the stored fingerprint on a real read (don't overwrite a good
      // baseline with a transient error/skip).
      const nextFp = isReal(fp) ? fp : (prior?.fingerprint ?? fp)
      await (prisma as any).regulationSourceCheck.upsert({
        where:  { reference_key_url: { reference_key: reg.reference_key, url } },
        update: { fingerprint: nextFp, last_checked_at: now, ...(changed ? { last_changed_at: now } : {}) },
        create: { reference_key: reg.reference_key, url, fingerprint: nextFp, last_checked_at: now, last_changed_at: changed ? now : null },
      }).catch(() => {})
    })

    // Flag the regulation for review on a change. Don't overwrite a manual note on a
    // reg that's already flagged.
    if (regChangedUrl) {
      const dateStr = now.toISOString().slice(0, 10)
      await (prisma as any).externalRegulation.updateMany({
        where: { reference_key: reg.reference_key },
        data: {
          needs_update: true,
          ...(reg.needs_update ? {} : { review_note: `Source page changed (auto-detected ${dateStr}): ${regChangedUrl}. Review this regulation against the source and update if needed.` }),
        },
      }).catch(() => {})
      summary.flagged++
      summary.flagged_regs.push({ reference_key: reg.reference_key, official_name: reg.official_name, url: regChangedUrl })
    }
  }
  return summary
}
