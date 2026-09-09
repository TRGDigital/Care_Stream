// Monitoring each regulation's source URLs. Fetches every source, fingerprints it
// (Last-Modified where published, otherwise a hash of the page's own text — see the note on
// ETag below), and when a fingerprint changes it:
//
//   1. flags the regulation for review (needs_update)
//   2. diffs the page against the copy stored last time and records WHAT changed
//   3. resolves who it lands on, from the tenants' own coverage analyses
//
// It never edits content. A human always reviews the change against the source.
//
// The diff is the point. A monitor that can only say "this page is different from last week"
// hands a person 95 URLs and no way to triage them, which is why the previous version was
// never worth switching on. PDFs and bot-blocked pages are still skipped, and a page whose
// fingerprint moves without any sentence changing is counted but not recorded.

import crypto from 'crypto'
import { prisma } from '../../db/client'
import { mapLimit } from '../../lib/translate'
import { diffText, resolveImpact } from './change-review'

const FETCH_TIMEOUT_MS = 9000
const UA = 'CareStreamAI-RegulationMonitor/1.0 (+https://www.carestreamai.com)'

// ETag is NOT used, on evidence. Two consecutive runs 45 minutes apart, with no possible
// change to UK legislation in between, produced 16 false "changed" verdicts out of 29
// ETag-fingerprinted URLs — and none at all from the content hash. The reason is that the
// sources that matter most do not serve a content-derived ETag:
//
//   gov.uk, food.gov.uk   etag: W/"4dc9a32f…"      weak: signals semantic equivalence, not
//                                                  byte equality, and rotates per CDN node
//   cqc.org.uk            etag: "1788972608-gzip"  a cache-generation timestamp: it changes
//                                                  when the CDN refreshes, not when the page does
//
// Sixteen spurious flags a week would train a reader to ignore the alerts, which is worse
// than no monitoring because it still looks like it is working. So: Last-Modified first
// (measured stable on 51 of 52 URLs), then a hash of the page's own text.
async function fingerprintUrl(url: string): Promise<{ fp: string; kind: 'last-modified' | 'hash' | 'skip' | 'error'; text: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' } })
    if (!resp.ok) return { fp: `err:${resp.status}`, kind: 'error', text: '' }

    const ctype = (resp.headers.get('content-type') || '').toLowerCase()
    const lastMod = resp.headers.get('last-modified')

    // Non-HTML (PDFs etc.) — can't reliably fingerprint content; skip (never flags).
    if (!ctype.includes('html') && !ctype.includes('xml')) {
      return lastMod && !Number.isNaN(Date.parse(lastMod))
        ? { fp: `lm:${lastMod}`, kind: 'last-modified', text: '' }
        : { fp: 'skip:non-html', kind: 'skip', text: '' }
    }

    // The body is read even when Last-Modified would settle the fingerprint on its own,
    // because the text is what makes a change explainable. Knowing a page changed without
    // being able to say what changed is the state this whole feature exists to leave behind.
    const body = await resp.text()
    const text = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Page furniture, not the guidance: navigation, banners and "related content" rotate on
      // their own schedule and would otherwise read as the regulation having changed.
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) return { fp: 'skip:empty', kind: 'skip', text: '' }
    // A real modification date, where the source publishes one, is a better signal than a
    // hash of a page whose furniture we may not have stripped perfectly.
    if (lastMod && !Number.isNaN(Date.parse(lastMod))) return { fp: `lm:${lastMod}`, kind: 'last-modified', text }
    return { fp: `h:${crypto.createHash('sha256').update(text).digest('hex')}`, kind: 'hash', text }
  } catch {
    return { fp: 'err:fetch', kind: 'error', text: '' }
  } finally {
    clearTimeout(timer)
  }
}

const isReal = (fp: string) => !fp.startsWith('err:') && !fp.startsWith('skip:')

/** 'lm' | 'h' | 'etag' | 'err' | 'skip' — the method that produced a fingerprint.
 *  Two fingerprints are only comparable when the same method produced them: changing the
 *  method (as dropping ETag does) must re-baseline silently, not report every page as
 *  changed on the next run. */
const method = (fp: string) => fp.split(':', 1)[0]

export type SourceMonitorSummary = {
  regulations: number; urls_checked: number; changed: number; flagged: number; errors: number
  /** Changes with a real textual difference, recorded for review. */
  recorded: number
  /** Fingerprint moved but no sentence did — a header that ticked on its own. Counted so the
   *  gap between "changed" and "recorded" is visible rather than mysterious. */
  unchanged_text: number
  flagged_regs: Array<{ reference_key: string; official_name: string; url: string }>
}

// Check the source URLs for one regulation (referenceKey) or all active ones.
export async function checkRegulationSources(opts: { referenceKey?: string } = {}): Promise<SourceMonitorSummary> {
  const regs = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true, ...(opts.referenceKey ? { reference_key: opts.referenceKey } : {}) },
    select: { reference_key: true, official_name: true, source_urls: true, needs_update: true, review_note: true },
  })

  const summary: SourceMonitorSummary = { regulations: 0, urls_checked: 0, changed: 0, flagged: 0, errors: 0, recorded: 0, unchanged_text: 0, flagged_regs: [] }
  const now = new Date()

  for (const reg of regs as any[]) {
    const urls: string[] = (reg.source_urls ?? []).filter(Boolean)
    if (!urls.length) continue
    summary.regulations++
    let regChangedUrl: string | null = null

    await mapLimit(urls, 3, async (url: string) => {
      summary.urls_checked++
      const { fp, kind, text } = await fingerprintUrl(url)
      if (kind === 'error') summary.errors++

      const prior = await (prisma as any).regulationSourceCheck.findUnique({
        where: { reference_key_url: { reference_key: reg.reference_key, url } },
      }).catch(() => null)

      // A real change = both fingerprints are meaningful, were produced the SAME way, and differ.
      const priorFp = prior?.fingerprint ?? ''
      const changed = !!prior
        && isReal(priorFp) && isReal(fp)
        && method(priorFp) === method(fp)
        && priorFp !== fp
      if (changed) { summary.changed++; regChangedUrl = url }

      // Record WHAT changed, while both versions are in hand. Only when there is prior text
      // to compare against: the first run after this ships has none, and reporting a whole
      // page as "added" would be noise on every source at once.
      if (changed && text && prior?.content) {
        const diff = diffText(String(prior.content), text)
        if (diff.changed) {
          const impacted = await resolveImpact(reg.reference_key).catch(() => [])
          await (prisma as any).regulationChange.create({
            data: {
              reference_key: reg.reference_key,
              official_name: reg.official_name ?? '',
              url,
              added_text:   diff.added,
              removed_text: diff.removed,
              impacted:     impacted as any,
            },
          }).catch((e: any) => console.error('[source-monitor] could not record change:', e?.message))
          summary.recorded++
        } else {
          // The fingerprint moved but no sentence did: a Last-Modified header that ticked on
          // its own, or furniture below the stripping. Not worth a person's attention.
          summary.unchanged_text++
        }
      }

      // Only advance the stored fingerprint on a real read (don't overwrite a good
      // baseline with a transient error/skip). The text advances on the same rule, so the
      // next diff compares against what we actually last saw.
      const nextFp = isReal(fp) ? fp : (prior?.fingerprint ?? fp)
      await (prisma as any).regulationSourceCheck.upsert({
        where:  { reference_key_url: { reference_key: reg.reference_key, url } },
        update: { fingerprint: nextFp, last_checked_at: now, ...(text ? { content: text } : {}), ...(changed ? { last_changed_at: now } : {}) },
        create: { reference_key: reg.reference_key, url, fingerprint: nextFp, last_checked_at: now, content: text || null, last_changed_at: changed ? now : null },
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
