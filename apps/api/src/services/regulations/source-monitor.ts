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
import { diffText, resolveImpact, meaningfulLines } from './change-review'
import { AUDIT_PAGE_SOURCES } from '../../data/audit-page-sources'

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
    // hash of a page whose furniture we may not have stripped perfectly. The live numbers
    // bear that out: Last-Modified flagged 4 of 60 sources, the hash flagged 24 of 31.
    if (lastMod && !Number.isNaN(Date.parse(lastMod))) return { fp: `lm:${lastMod}`, kind: 'last-modified', text }
    // Hash the sentences the diff would actually report, not the whole stripped page.
    // Hashing everything meant a rotating date or a reading-time counter moved the
    // fingerprint while the diff found nothing to show, which is how 24 of 31 hashed
    // sources came to be marked changed with an empty review queue behind them.
    const signature = meaningfulLines(text).join('\n')
    if (!signature) return { fp: 'skip:no-prose', kind: 'skip', text }
    // h2: the noise filter (dates, page numbers, cookie wording) changed what is hashed, so the method name changed too and every page re-baselines silently once.
    return { fp: `h2:${crypto.createHash('sha256').update(signature).digest('hex')}`, kind: 'hash', text }
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
  /** Sources left for the next run because this run's time budget ran out (oldest checked are always done first). */
  deferred: number
  flagged_regs: Array<{ reference_key: string; official_name: string; url: string }>
}

export type Subject = {
  kind: 'regulation' | 'quality_statement' | 'lint_signal' | 'audit_page'
  reference_key: string
  official_name: string
  source_urls: string[]
  /** Only regulations carry a review flag; the other two are surfaced through the changes
   *  page alone, because there is no per-row "needs update" concept on them. */
  needs_update?: boolean
}

/** Everything the monitor watches.
 *
 *  Regulations were the whole list until the blind spots were counted: the 34 CQC quality
 *  statements had no source column at all, so a revision to the framework that judges every
 *  inspection would have gone unnoticed; and the lint signals already carried source URLs
 *  that nothing read, which is the one place a renamed body SHOULD fire. */
export async function gatherSubjects(referenceKey?: string): Promise<Subject[]> {
  const [regs, statements, signals] = await Promise.all([
    (prisma as any).externalRegulation.findMany({
      where:  { is_active: true, ...(referenceKey ? { reference_key: referenceKey } : {}) },
      select: { reference_key: true, official_name: true, source_urls: true, needs_update: true, review_note: true },
    }),
    referenceKey ? [] : (prisma as any).qualityStatement.findMany({
      where:  { is_active: true },
      select: { reference_key: true, name: true, number: true, source_urls: true },
    }).catch(() => []),
    referenceKey ? [] : (prisma as any).policyLintSignal.findMany({
      where:  { is_active: true },
      select: { signal_key: true, label: true, source_urls: true },
    }).catch(() => []),
  ])

  return [
    ...(regs as any[]).map(r => ({
      kind: 'regulation' as const,
      reference_key: r.reference_key,
      official_name: r.official_name ?? r.reference_key,
      source_urls:   r.source_urls ?? [],
      needs_update:  !!r.needs_update,
    })),
    ...(statements as any[]).map(q => ({
      kind: 'quality_statement' as const,
      reference_key: q.reference_key,
      official_name: `Quality statement ${q.number}: ${q.name}`,
      source_urls:   q.source_urls ?? [],
    })),
    ...(signals as any[]).map(l => ({
      kind: 'lint_signal' as const,
      reference_key: l.signal_key,
      official_name: `Stale wording: ${l.label}`,
      source_urls:   l.source_urls ?? [],
    })),
    // The public /care-audits/<slug> pages cite regulations and guidance; if one of those
    // sources changes, the page's wording needs a human look. Not for the single-regulation re-check.
    ...(referenceKey ? [] : AUDIT_PAGE_SOURCES.map(a => ({
      kind: 'audit_page' as const,
      reference_key: a.slug,
      official_name: `Audit page: ${a.name}`,
      source_urls:   a.urls,
    }))),
  ]
}

// Check the source URLs for one regulation (referenceKey) or every watched subject.
/** `catchupDays`: only fetch sources not checked in that many days (a daily catch-up behind the Monday run, so a run cut short costs a day, not a week). */
export async function checkRegulationSources(opts: { referenceKey?: string; catchupDays?: number } = {}): Promise<SourceMonitorSummary> {
  const regs = await gatherSubjects(opts.referenceKey)

  const summary: SourceMonitorSummary = { regulations: 0, urls_checked: 0, changed: 0, flagged: 0, errors: 0, recorded: 0, unchanged_text: 0, deferred: 0, flagged_regs: [] }
  const now = new Date()

  // One fetch per URL per run, however many subjects cite it. CQC publishes all 34 quality
  // statements on a single framework page, and regulations already share URLs (95 source
  // entries, ~80 distinct), so without this the same page is downloaded repeatedly.
  const fetched = new Map<string, { fp: string; kind: string; text: string }>()
  // The whole list (about 550 sources) cannot be fetched one subject at a time inside a 300 second function: the run was cut off before the audit
  // pages, and the explanation step after it never started. So every distinct URL is fetched up front, 12 at a time, the ones checked longest ago
  // (or never) first, until the fetch budget is spent. Whatever is left is simply first in line next run.
  const t0 = Date.now()
  const FETCH_BUDGET_MS = Number(process.env.REG_MONITOR_FETCH_BUDGET_MS) || 150_000
  const allUrls = [...new Set((regs as any[]).flatMap(r => (r.source_urls ?? []).filter(Boolean)))] as string[]
  const lastRows = await (prisma as any).regulationSourceCheck.findMany({ select: { url: true, last_checked_at: true } }).catch(() => [])
  const lastByUrl = new Map<string, number>()
  for (const r of lastRows as any[]) {
    const t = r.last_checked_at ? new Date(r.last_checked_at).getTime() : 0
    lastByUrl.set(r.url, Math.max(lastByUrl.get(r.url) ?? 0, t))
  }
  allUrls.sort((a, b) => (lastByUrl.get(a) ?? 0) - (lastByUrl.get(b) ?? 0))
  const staleBefore = opts.catchupDays ? Date.now() - opts.catchupDays * 86_400_000 : Infinity
  const toFetch = allUrls.filter(u => (lastByUrl.get(u) ?? 0) < staleBefore)
  await mapLimit(toFetch, 12, async (url: string) => {
    if (Date.now() - t0 > FETCH_BUDGET_MS) return
    fetched.set(url, await fingerprintUrl(url))
  })
  // Per URL, whether a real sentence changed (computed once, shared by every subject that cites the page).
  const realChange = new Map<string, boolean>()
  // And one recorded change per URL per run, for the same reason: 34 statements citing one
  // changed page is one change, not 34 entries for a person to read.
  const recordedUrls = new Set<string>()

  for (const reg of regs as any[]) {
    const urls: string[] = (reg.source_urls ?? []).filter(Boolean)
    if (!urls.length) continue
    summary.regulations++
    let regChangedUrl: string | null = null

    await mapLimit(urls, 3, async (url: string) => {
      const got = fetched.get(url)
      if (!got) { if (!opts.catchupDays) summary.deferred++; return }      // not reached in this run's time budget: left exactly as it was
      summary.urls_checked++
      const { fp, kind, text } = got
      if (kind === 'error') summary.errors++

      const prior = await (prisma as any).regulationSourceCheck.findUnique({
        where: { subject_kind_reference_key_url: { subject_kind: reg.kind, reference_key: reg.reference_key, url } },
      }).catch(() => null)

      // A real change = both fingerprints are meaningful, were produced the SAME way, and differ.
      const priorFp = prior?.fingerprint ?? ''
      const changed = !!prior
        && isReal(priorFp) && isReal(fp)
        && method(priorFp) === method(fp)
        && priorFp !== fp
      if (changed) summary.changed++
      // A regulation is flagged only for a REAL change: a sentence added or removed once dates, page numbers and cookie wording are ignored. A page
      // with no stored text (a PDF) cannot be compared, so a moved Last-Modified there still counts.
      if (changed && !text) regChangedUrl = url

      // Record WHAT changed, while both versions are in hand. Only when there is prior text
      // to compare against: the first run after this ships has none, and reporting a whole
      // page as "added" would be noise on every source at once.
      if (changed && text && prior?.content && realChange.get(url) && regChangedUrl !== url) regChangedUrl = url   // a later subject citing the same changed page
      if (changed && text && prior?.content && !recordedUrls.has(url)) {
        recordedUrls.add(url)
        const diff = diffText(String(prior.content), text)
        realChange.set(url, diff.changed)
        if (diff.changed) {
          regChangedUrl = url
          // Only a regulation has tenant coverage behind it. A quality statement or a stale
          // wording signal changes what we ASK of every tenant, so there is no per-tenant
          // list to resolve and an empty one is the honest answer.
          const impacted = reg.kind === 'regulation'
            ? await resolveImpact(reg.reference_key).catch(() => [])
            : []
          await (prisma as any).regulationChange.create({
            data: {
              subject_kind:  reg.kind,
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
        where:  { subject_kind_reference_key_url: { subject_kind: reg.kind, reference_key: reg.reference_key, url } },
        update: { fingerprint: nextFp, last_checked_at: now, ...(text ? { content: text } : {}), ...(changed ? { last_changed_at: now } : {}) },
        create: { subject_kind: reg.kind, reference_key: reg.reference_key, url, fingerprint: nextFp, last_checked_at: now, content: text || null, last_changed_at: changed ? now : null },
      }).catch(() => {})
    })

    // Flag the regulation for review on a change. Don't overwrite a manual note on a
    // reg that's already flagged.
    // Only regulations carry needs_update. Quality statements and stale-wording signals have
    // no such column, and their change is surfaced through the changes page instead.
    if (regChangedUrl && reg.kind === 'regulation') {
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
