// The daily scheduled-jobs report.
//
// This exists because of a specific failure: on 5 June 2026 every scheduled job stopped, and
// it was found 96 days later by someone querying a table for an unrelated reason. In that time
// no tenant received an audit reminder, a credential-expiry warning, a policy-review reminder,
// a supervision reminder or a licence-renewal notice.
//
// So the report is built the way round that catches THAT: it starts from the jobs that are
// SUPPOSED to run and looks for their rows, rather than listing the rows that happen to exist.
// A job that stops appearing is the finding. A report that lists nine healthy jobs is worth
// far less than one that says "audit-reminders has not run for 3 days".

import { prisma } from '../../db/client'
import { sendCronReportEmail } from '../email/outbound'

export type JobCadence = 'daily' | 'weekly'

export type ScheduledJob = {
  job: string
  cadence: JobCadence
  /** What a person loses when this stops. Goes in the email, because "credential-expiry
   *  failed" means nothing at 7am and "Enterprise admins were not told about expiring DBS
   *  checks" means quite a lot. */
  matters: string
  /** Hours after which a run is overdue. Generous: a job that runs at 08:00 and is checked at
   *  07:00 the next morning must not read as late. */
  graceHours: number
}

export const SCHEDULED_JOBS: ScheduledJob[] = [
  { job: 'knowledge-gaps',            cadence: 'daily',  graceHours: 26, matters: 'Daily gap snapshot per tenant, and the Monday admin digest' },
  { job: 'policy-review-reminders',   cadence: 'daily',  graceHours: 26, matters: 'Admins are told when a policy reaches its review date' },
  { job: 'credential-expiry',         cadence: 'daily',  graceHours: 26, matters: 'Enterprise admins are warned about expiring DBS, right to work and registrations' },
  { job: 'supervision-reminders',     cadence: 'daily',  graceHours: 26, matters: 'Staff are reminded the day before a supervision or appraisal' },
  { job: 'audit-reminders',           cadence: 'daily',  graceHours: 26, matters: 'Admins are chased to finish audits and start recurring ones' },
  { job: 'onboarding-emails',         cadence: 'daily',  graceHours: 26, matters: 'New tenants receive their onboarding drip' },
  { job: 'licence-renewals',          cadence: 'daily',  graceHours: 26, matters: 'Training licence holders are warned before renewal' },
  { job: 'regulation-source-monitor', cadence: 'weekly', graceHours: 8 * 24, matters: 'Legislation and guidance pages are fingerprinted so changes get noticed' },
  { job: 'agency-access',             cadence: 'daily',  graceHours: 26, matters: 'Agency bookings are warned before they end, and access is withdrawn after' },
]

export type JobStatus = 'ok' | 'failed' | 'overdue' | 'never'

export type JobReport = {
  job: string
  cadence: JobCadence
  matters: string
  status: JobStatus
  last_run_at: string | null
  hours_since: number | null
  duration_ms: number | null
  error: string
  /** Flattened one level, so the email can show what the run actually captured. */
  captured: Array<{ key: string; value: string }>
}

export type CronReport = {
  generated_at: string
  healthy: number
  problems: number
  jobs: JobReport[]
}

/** Flatten a job's summary into printable rows. Nested objects are summarised rather than
 *  dumped: this is a morning email, not a log. */
function capturedRows(summary: unknown): Array<{ key: string; value: string }> {
  if (!summary || typeof summary !== 'object') return []
  const out: Array<{ key: string; value: string }> = []
  for (const [k, v] of Object.entries(summary as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) {
      if (!v.length) continue
      out.push({ key: k, value: `${v.length}` })
    } else if (typeof v === 'object') {
      continue
    } else if (typeof v === 'boolean') {
      out.push({ key: k, value: v ? 'yes' : 'no' })
    } else {
      out.push({ key: k, value: String(v) })
    }
    if (out.length >= 8) break
  }
  return out
}

export async function buildCronReport(): Promise<CronReport> {
  const now = Date.now()

  const jobs: JobReport[] = []
  for (const def of SCHEDULED_JOBS) {
    // The most recent ATTEMPT, successful or not. A job failing every night is a different
    // problem from a job that has stopped being invoked, and the report must tell them apart.
    const last = await (prisma as any).cronRun.findFirst({
      where:   { job: def.job },
      orderBy: { started_at: 'desc' },
    }).catch(() => null)

    if (!last) {
      jobs.push({
        job: def.job, cadence: def.cadence, matters: def.matters, status: 'never',
        last_run_at: null, hours_since: null, duration_ms: null, error: '', captured: [],
      })
      continue
    }

    const hoursSince = (now - new Date(last.started_at).getTime()) / 36e5
    const status: JobStatus =
      hoursSince > def.graceHours ? 'overdue'
      : last.ok                   ? 'ok'
      : 'failed'

    jobs.push({
      job: def.job,
      cadence: def.cadence,
      matters: def.matters,
      status,
      last_run_at: new Date(last.started_at).toISOString(),
      hours_since: Math.round(hoursSince * 10) / 10,
      duration_ms: last.duration_ms ?? null,
      error: String(last.error ?? ''),
      captured: capturedRows(last.summary),
    })
  }

  // Problems first: the email is read in five seconds on a phone.
  const rank: Record<JobStatus, number> = { never: 0, overdue: 1, failed: 2, ok: 3 }
  jobs.sort((a, b) => rank[a.status] - rank[b.status] || a.job.localeCompare(b.job))

  return {
    generated_at: new Date().toISOString(),
    healthy:  jobs.filter(j => j.status === 'ok').length,
    problems: jobs.filter(j => j.status !== 'ok').length,
    jobs,
  }
}

export async function sendCronReport(report: CronReport): Promise<void> {
  await sendCronReportEmail(report)
}
