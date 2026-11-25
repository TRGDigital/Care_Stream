// Scheduled job entry points. Authorised by a CRON_SECRET bearer token only, so these
// cannot be triggered externally.
//
// Scheduled from Postgres (pg_cron + pg_net), not from vercel.json: every one of these
// stopped silently on 5 June 2026 and nobody found out for 96 days. See
// manual_cron_schedules.sql. The schedule lives in the database because the database is the
// one component that has to be up for anything else to work.
//
// DO NOT add a "crons" block back to apps/api/vercel.json. Both schedulers running would
// fire every job twice. If Vercel scheduling is ever wanted again, remove the pg_cron jobs
// first (see step 4 of that migration).
//
// Note for anyone tempted to leave a note in vercel.json explaining that: you cannot. Vercel
// validates the file against a strict schema and fails the BUILD on any unrecognised
// top-level key, before it prints a single build log. That is what this comment is for.
//
// Every job runs through `job()` below, which records a row in cron_runs whether it succeeds
// or fails. /cron/daily-report then reads EXPECTED jobs against that table, so a job that
// silently stops appears as a missing row rather than as nothing at all.

import { Router, Request, Response } from 'express'
import { sweepExpired as sweepAskUploads } from '../services/ask/uploads/store'
import { timingSafeEqual } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { runKnowledgeGapDailyJob } from '../services/knowledge-gaps/digest'
import { runFamilyReminders } from '../lib/family-reminders'
import { runResidentRetentionReminders } from '../services/residents/retention'
import { evaluateAllLive } from '../services/incentives/engine'
import { sendDailyAuditReminders } from '../services/audits/reminders'
import { sendLicenceRenewalReminders } from '../services/training/licence-renewals'
import { runOfferChanges } from '../services/offers'
import { runSearchTermsDigest } from '../services/ads/search-terms-digest'
import { runConversionMilestones } from '../services/ads/conversion-milestones'
import { collectPageMetrics } from '../services/page-metrics/collector'
import { runReminders } from '../services/ads/reminders'
import { runBasketRecovery, sendBasketRecoveryPreview } from '../services/shop/basket-recovery'
import { runReviewRequests, sendReviewRequestPreview } from '../services/shop/review-requests'
import { sendCapturePreview } from '../services/shop/email-capture'
import { dispatchDue } from '../services/onboarding/dispatch'
import { seedOnboardingEmails } from '../services/onboarding/seed'
import { checkRegulationSources } from '../services/regulations/source-monitor'
import { reviewPendingChanges } from '../services/regulations/change-review'
import { runCredentialExpiryAllTenants } from '../services/workforce/credentialExpiry'
import { runStaffBirthdaysAllTenants, runStaffBirthdaysForTenant } from '../services/workforce/staffBirthdays'
import { remindPostersAllTenants, remindPosterForTenant } from '../services/workforce/tabletPosterReminder'
import { importPendingDrafts } from '../services/content/pendingDrafts'
import { generateAuditImages, generateBlogHeroes } from './audit-images'
import { checkAll as checkDataSources } from '../lib/data-sources'
import { dataSourcesDb } from '../lib/data-sources-db'
import { submitUrlsForIndexing, ralfyIndexBalance } from '../services/ralfyindex/indexer'
import { AUDIT_IMAGE_SCENES } from '../data/audit-image-scenes'
import { siteUrl } from '../lib/urls'
import { runSupervisionReminders } from '../services/workforce/supervisionReminders'
import { runAgencyAccess } from '../services/workforce/agencyAccess'
import { runPolicyReviewReminders } from '../services/policies/review-reminders'
import { runScheduledTrainingDelivery } from '../services/training/delivery-schedule'
import { sendRenewalReminders } from '../services/training/renewalReminders'
import { runWeeklyTrainingReminders } from '../services/training/weeklyReminders'
import { buildCronReport, sendCronReport } from '../services/ops/cron-report'
import { buildIndexingReport } from '../services/ralfyindex/weekly-report'
import { sendIndexingReportEmail, sendDataSourcesEmail } from '../services/email/outbound'

export const cronRouter = Router()

function authed(req: Request): boolean {
  // The bearer token, and nothing else.
  //
  // This used to accept the presence of an x-vercel-cron header as proof on its own. A
  // header is set by whoever makes the request, so that was a bypass: twelve jobs, all
  // GET, most of which email every tenant and two of which spend Anthropic credit, all
  // triggerable by anybody who sent one header. Repeatedly.
  //
  // Nothing legitimate relied on it. These are scheduled from pg_cron, and
  // public.carestream_cron() sends `Authorization: Bearer <secret>` read from the Supabase
  // vault. Vercel scheduling was deliberately removed (see the note at the top of this
  // file), so the header path was dead code with a hole in it.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail closed. An unset secret used to mean the header check was the only gate; it now
    // means nothing runs, which is the safe direction for a job that emails customers.
    console.error('[cron] CRON_SECRET is not set — refusing to run scheduled jobs')
    return false
  }
  const provided = req.headers.authorization
  if (typeof provided !== 'string') return false
  // Constant-time: these are compared on every scheduled run and the endpoint is public.
  const a = Buffer.from(provided)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Run one scheduled job, recording the attempt either way.
 *
 *  The row is written BEFORE the work starts, so a job that crashes the process or is killed
 *  mid-run still leaves evidence it began. A job that never appears at all is the case the
 *  daily report is looking for. */
async function job(
  name: string,
  req: Request,
  res: Response,
  fn: () => Promise<unknown>,
): Promise<void> {
  if (!authed(req)) { err(res, 'FORBIDDEN', 'Not authorised.', 403); return }

  const startedAt = Date.now()
  const run = await (prisma as any).cronRun
    .create({ data: { job: name } })
    .catch(() => null)   // never let bookkeeping stop the job itself

  const finish = (ok_: boolean, summary: unknown, error: string) =>
    run
      ? (prisma as any).cronRun.update({
          where: { id: run.id },
          data: {
            ok: ok_,
            finished_at: new Date(),
            duration_ms: Date.now() - startedAt,
            summary: (summary ?? null) as any,
            error: error.slice(0, 2000),
          },
        }).catch(() => {})
      : Promise.resolve()

  try {
    const result = await fn()
    await finish(true, result, '')
    ok(res, result as any)
  } catch (e: any) {
    const message = e?.message ?? String(e)
    console.error(`[cron/${name}] failed:`, message)
    await finish(false, null, message)
    err(res, 'JOB_FAILED', message, 500)
  }
}

// Daily: snapshot open-gap counts for every tenant; on Mondays also send the
// weekly admin digest + staff auto-refreshers.
cronRouter.get('/knowledge-gaps', (req, res) =>
  job('knowledge-gaps', req, res, () => runKnowledgeGapDailyJob()))

// Daily: email a tenant's admins when policies reach their review date. Several policies due on
// the same day go in ONE email. Fires once per review cycle (re-armed when a new date is set).
// Every 30 minutes: bring every live staff incentive campaign up to date (points, claims, places) and end the ones whose month is over.
cronRouter.get('/incentives', (req, res) =>
  job('incentives', req, res, () => evaluateAllLive()))

// Daily: remind the archive admins when an archived "This is me" profile reaches the end of its retention period.
cronRouter.get('/resident-retention', (req, res) =>
  job('resident-retention', req, res, () => runResidentRetentionReminders()))

// Daily: email family contacts who are due a reminder to add to a "This is me" profile (lib/family-reminders.ts). ?dry=1 works it out and sends nothing.
// pg_cron job cs-family-reminders (see prisma/sql/2026-11-21_resident_reminders.sql).
cronRouter.get('/family-reminders', (req, res) =>
  job('family-reminders', req, res, () => runFamilyReminders({ dryRun: req.query.dry === '1' })))

cronRouter.get('/policy-review-reminders', (req, res) =>
  job('policy-review-reminders', req, res, () => runPolicyReviewReminders({ force: req.query.force === '1' })))

// Every 15 minutes: fire tenant-defined scheduled training-question rules whose
// send_time has come round (Europe/London), at most once per rule per day.
cronRouter.get('/training-delivery', (req, res) =>
  job('training-delivery', req, res, () => runScheduledTrainingDelivery()))

// Daily: staff renewal reminders at 90/30/7 days before a training expiry, plus the
// manager digest (renewals daily; overdue and expired training resurface on Mondays).
// The service existed for months; this is the first thing to actually call it.
cronRouter.get('/training-renewals', (req, res) =>
  job('training-renewals', req, res, () => sendRenewalReminders()))

// Weekly training reminders: every Monday, each staff member with training outstanding gets one email and each admin gets one digest.
// Query options (cron secret only): tenant=<id>, preview_to=<email> (sends only there, nothing logged, needs tenant; limit=N staff or users=id1,id2 to choose who, one digest), dry=1 (sends nothing).
cronRouter.get('/training-weekly-reminders', async (req: Request, res: Response) =>
  job('training-weekly-reminders', req, res, () => runWeeklyTrainingReminders({
    tenantId: typeof req.query.tenant === 'string' ? req.query.tenant : undefined,
    previewTo: typeof req.query.preview_to === 'string' ? req.query.preview_to : undefined,
    dryRun: req.query.dry === '1',
    previewStaffLimit: Number(req.query.limit) || undefined,
    previewUserIds: typeof req.query.users === 'string' ? req.query.users.split(',').map(x => x.trim()).filter(Boolean) : undefined,
  })))

// Daily: email Enterprise admins a digest of staff credentials (DBS, right to
// work, registration) that have expired or expire within 30 days.
cronRouter.get('/credential-expiry', (req, res) =>
  job('credential-expiry', req, res, () => runCredentialExpiryAllTenants()))

// Daily: staff birthdays. Admins are told 7 days ahead; the staff member gets a happy birthday email from the company on the day.
// Query options (cron secret only): tenant=<id> runs just that account, dry=1 sends nothing, preview_to=<email> sends the emails only
// there and logs nothing (needs tenant; add on=YYYY-MM-DD to pretend today is that date so a real birthday shows up).
// Makes the next few missing pictures for the audit cards on /care-audits (a unique one for each new home care audit, one per theme for the rest), in the
// house style. limit=N (at most 6 a call, each takes about a minute); dry=1 only counts. Safe to run repeatedly: an existing picture is never remade.
cronRouter.get('/generate-audit-images', (req, res) =>
  job('generate-audit-images', req, res, () => generateAuditImages(Number(req.query.limit) || 3, req.query.dry === '1')))

// Weekly (Monday 07:00 UTC): checks the reference figures (minimum wage, inflation, bank holidays, sick pay, mileage) against the official sources, records changes,
// and emails the owner ONLY when something changed, failed or needs review. force=1 checks every source now; key=<source> checks one.
cronRouter.get('/check-data-sources', (req, res) =>
  job('check-data-sources', req, res, () => checkDataSources({
    db: dataSourcesDb, now: () => new Date(),
    get: async (url: string) => { const r = await fetch(url, { headers: { Accept: 'application/json, text/csv, */*', 'User-Agent': 'CareStream data check (support@carestreamai.com)' } }); if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`); const text = await r.text(); try { return JSON.parse(text) } catch { return text } },
    notify: o => sendDataSourcesEmail(o),
  }, { force: req.query.force === '1', only: req.query.key ? String(req.query.key) : undefined })))

// Deletes uploaded Ask CareStream files that have passed the date the account chose (the cleaned copy in storage, then the record's content). Safe to run often (hourly).
cronRouter.get('/sweep-ask-uploads', (req, res) =>
  job('sweep-ask-uploads', req, res, async () => ({ deleted: await sweepAskUploads(Math.min(200, Number(req.query.limit) || 100)) })))

// Once a day: the ONE reminder for any letter, newsletter or report that has waited 3 days for approval (the pilot account only). Safe to run more often: a document is stamped before
// anything is sent, so it can never be reminded twice. dry=1 only counts.
cronRouter.get('/ask-approval-reminders', (req, res) =>
  job('ask-approval-reminders', req, res, async () => {
    const { listPendingOlderThan } = await import('../services/ask/store')
    const { sendReminders } = await import('../services/ask-docs/approver-notify')
    const { realDeps } = await import('../services/ask-docs/approver-deps')
    const { askPilotEnabled } = await import('../lib/ask-pilot')
    const rows = await listPendingOlderThan(3)
    const byTenant = new Map<string, typeof rows>(); for (const r of rows) byTenant.set(r.tenant_id, [...(byTenant.get(r.tenant_id) ?? []), r])
    if (req.query.dry === '1') return { dry_run: true, documents: rows.length, accounts: byTenant.size }
    let docs = 0, messages = 0
    for (const [tenantId, pending] of byTenant) {
      if (!(await askPilotEnabled(tenantId))) continue
      const r = await sendReminders(realDeps, { tenantId, pending })
      docs += r.reminded_docs; messages += r.messages
      if (r.reminded_docs) void (await import('../lib/audit')).writeAuditLog({ tenant_id: tenantId, user_id: pending[0].created_by, event_type: 'ask_approval_reminded', entity_type: 'tenant', entity_id: tenantId, metadata: { documents: r.reminded_docs, messages: r.messages } })
    }
    return { documents: docs, messages }
  }))

// Makes the hero pictures for the blog drafts listed in data/blog-hero-scenes.ts that have none (limit=N, at most 4 a call; dry=1 only lists).
cronRouter.get('/generate-blog-heroes', (req, res) =>
  job('generate-blog-heroes', req, res, () => generateBlogHeroes(Number(req.query.limit) || 2, req.query.dry === '1')))

// One off: asks RalfyIndex to index the 19 new home care audit pages and the /care-audits listing. dry=1 only shows the URLs and the credit balance.
// Each URL costs a credit, so it does nothing without confirm=1.
cronRouter.get('/index-audit-pages', (req, res) =>
  job('index-audit-pages', req, res, async () => {
    const urls = [`${siteUrl()}/care-audits`, ...AUDIT_IMAGE_SCENES.filter(s => !s.key.startsWith('theme:')).map(s => `${siteUrl()}/care-audits/${s.key}`)]
    const balance = await ralfyIndexBalance().catch(() => null)
    if (req.query.confirm !== '1') return { dry_run: true, urls: urls.length, balance, list: urls }
    return { submitted: urls.length, balance_before: balance, result: await submitUrlsForIndexing(urls, { source: 'page' }) }
  }))

// Nightly: saves pages that were written outside the nightly routine (src/data/pending-drafts) as DRAFTS in the platform. Idempotent: a slug that
// already exists is never touched, and nothing is ever published.
cronRouter.get('/import-pending-drafts', (req, res) =>
  job('import-pending-drafts', req, res, () => importPendingDrafts()))

// Daily: admins of accounts with shared tablets are reminded every quarter to print a new Connect a tablet poster. ?tenant=&dry=1 to check one account.
cronRouter.get('/tablet-poster-reminders', (req, res) =>
  job('tablet-poster-reminders', req, res, async () => typeof req.query.tenant === 'string' ? { due: await remindPosterForTenant(req.query.tenant, req.query.dry === '1') } : remindPostersAllTenants()))

cronRouter.get('/staff-birthdays', (req, res) =>
  job('staff-birthdays', req, res, async () => {
    const tenant = typeof req.query.tenant === 'string' ? req.query.tenant : undefined
    if (!tenant) return runStaffBirthdaysAllTenants()
    const on = typeof req.query.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.on) ? new Date(req.query.on + 'T12:00:00Z') : undefined
    return runStaffBirthdaysForTenant(tenant, { dryRun: req.query.dry === '1', previewTo: typeof req.query.preview_to === 'string' ? req.query.preview_to : undefined, now: on })
  }))

// Daily: remind staff (and admins) the day before a booked supervision/appraisal.
cronRouter.get('/supervision-reminders', (req, res) =>
  job('supervision-reminders', req, res, () => runSupervisionReminders()))

// Daily: remind admins to finish in-progress audits and start recurring ones.
cronRouter.get('/audit-reminders', (req, res) =>
  job('audit-reminders', req, res, () => sendDailyAuditReminders()))

// Runs at 09:00 and 10:00 UTC (covers 10am UK in both BST and GMT); dispatchDue
// only sends when it's actually 10am UK. Each working day it sends the due
// onboarding email to every active admin of every enrolled tenant. `?force=1`
// (cron-authed) bypasses the 10am gate for testing.
cronRouter.get('/onboarding-emails', (req, res) =>
  job('onboarding-emails', req, res, async () => {
    await seedOnboardingEmails().catch(() => {})   // self-heal: ensure templates exist
    return dispatchDue({ force: req.query.force === '1' })
  }))

// Weekly: fingerprint each regulation's source URLs and flag any whose source page
// changed for platform-team review (never auto-edits content).
cronRouter.get('/regulation-source-monitor', (req, res) =>
  job('regulation-source-monitor', req, res, async () => {
    const scan = await checkRegulationSources()
    // Explain what was found in the same run, so Monday morning brings changes that already
    // read as English. Reviewed separately from detection, so a model failure here costs the
    // summaries and not the detections.
    const review = await reviewPendingChanges().catch(() => ({ reviewed: 0, failed: 0 }))
    return { ...scan, ...review }
  }))

// Daily: email training-only admins when their training licences are within 30 days
// of renewal (one reminder per licence, idempotent via renewal_reminded_at).
cronRouter.get('/licence-renewals', (req, res) =>
  job('licence-renewals', req, res, () => sendLicenceRenewalReminders()))

// Daily: warn admins three days before an agency booking ends, and withdraw access 24 hours
// after it has. The grace period exists so a night shift that began on the last booked day is
// not cut off at 3am, which is the one time an agency nurse most needs the medication policy.
cronRouter.get('/agency-access', (req, res) =>
  job('agency-access', req, res, () => runAgencyAccess()))

// Weekly (Monday 07:00 UTC): email the platform owner how many pages each site (CareStream
// and CareAssura) pushed through RalfyIndex, the shared credit balance, and any failures.
cronRouter.get('/indexing-report', (req, res) =>
  job('indexing-report', req, res, async () => {
    const report = await buildIndexingReport(7)
    await sendIndexingReportEmail(report)
    return {
      balance: report.balance,
      ...Object.fromEntries(report.sites.map(s => [s.site, s.available ? s.submitted : 'unavailable'])),
    }
  }))

// Hourly: sync the offer calendar from Funnel Insights into site_offers (what the shop pages
// show and checkout charges), then email the platform owner when an offer starts or ends, with
// every page it changed on. Offers turn over at midnight UK time; the 00:05 run catches it.
cronRouter.get('/offer-changes', (req, res) =>
  job('offer-changes', req, res, () => runOfferChanges()))

// Daily 08:00 UK: Len's Google Ads search term review (negatives, keywords to add, terms to check)
// for CareStream and TRG Digital, from Funnel Insights. pg_cron job cs-search-terms-digest.
cronRouter.get('/search-terms-digest', (req, res) =>
  job('search-terms-digest', req, res, () => runSearchTermsDigest()))

// Bid strategy milestones (services/ads/conversion-milestones.ts): emails Len when a Google Ads
// campaign reaches 30 or 50 confirmed sales or leads in 30 days. pg_cron job cs-conversion-milestones.
cronRouter.get('/conversion-milestones', (req, res) =>
  job('conversion-milestones', req, res, () => runConversionMilestones()))

// Reminders Len sets in Funnel Insights › CRO ideas (services/ads/reminders.ts), emailed on the
// morning they fall due. pg_cron job cs-reminders, daily 08:00 UTC.
cronRouter.get('/reminders', (req, res) =>
  job('reminders', req, res, () => runReminders()))

// Basket recovery emails (services/shop/basket-recovery.ts). Sends only with BASKET_RECOVERY_LIVE=1;
// the third email also needs BASKET_RECOVERY_EMAIL3_LIVE=1.
cronRouter.get('/basket-recovery', (req, res) =>
  job('basket-recovery', req, res, () => runBasketRecovery()))

// All three recovery emails (email 3 even while BASKET_RECOVERY_EMAIL3_LIVE is off), for both shops,
// with sample baskets, to the platform owner to approve.
// The email capture emails (checklists and an offer lock) to the platform owner to approve.
cronRouter.get('/capture-preview', (req, res) =>
  job('capture-preview', req, res, () => sendCapturePreview(process.env.PURCHASE_NOTIFY_EMAIL ?? 'lenny@trgdigital.co.uk')))

cronRouter.get('/basket-recovery-preview', (req, res) =>
  job('basket-recovery-preview', req, res, () => sendBasketRecoveryPreview(process.env.PURCHASE_NOTIFY_EMAIL ?? 'lenny@trgdigital.co.uk')))

// Review requests, 7 days after a training order (services/shop/review-requests.ts). Sends only
// with REVIEW_REQUESTS_LIVE=1; the preview goes to the platform owner to approve.
cronRouter.get('/review-requests', (req, res) =>
  job('review-requests', req, res, () => runReviewRequests()))

cronRouter.get('/review-requests-preview', (req, res) =>
  job('review-requests-preview', req, res, () => sendReviewRequestPreview(process.env.PURCHASE_NOTIFY_EMAIL ?? 'lenny@trgdigital.co.uk')))

// Daily, last: email the platform owner what ran, what it captured, and — the point of the
// whole thing — what was due and did not run at all.
cronRouter.get('/daily-report', (req, res) =>
  job('daily-report', req, res, async () => {
    const report = await buildCronReport()
    await sendCronReport(report)
    return report
  }))

// Daily 05:45 UTC: Search Console and GA4 into page_metrics for every blog and collection page.
// ?days=90 backfills the first run. pg_cron job cs-page-metrics.
cronRouter.get('/page-metrics', (req, res) =>
  job('page-metrics', req, res, () => collectPageMetrics(Number(req.query.days) || 7)))
