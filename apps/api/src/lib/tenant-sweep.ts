// Walking every tenant, within a function that will be killed at 300 seconds.
//
// Four scheduled jobs loop tenants one at a time and await each. Measured on the real ten
// tenants: audit-reminders 24.9s, onboarding-emails 25.8s, knowledge-gaps 10.6s,
// credential-expiry 10.0s. The per-tenant component of those projects to roughly 40, 41, 16
// and 15 minutes at a thousand tenants, against a 300 second ceiling.
//
// The failure is worse than slow: Vercel kills the invocation, the tenants reached before the
// cut get their email and the rest get nothing, and nothing raises an error. It looks exactly
// like a job that ran. These crons already died unnoticed for 96 days once.
//
// So a run does what it can and records where it stopped; the next run continues from there.
// A job that cannot finish in one invocation still makes progress on every invocation, and
// the behaviour is the same at ten tenants as at ten thousand.
//
// THE CURSOR IS SAVED AFTER EACH TENANT, not at the end. These jobs send email. If a run were
// killed after sending but before recording, those tenants would be emailed again on the next
// run. Saving per tenant costs one small update each and caps the damage at one duplicate for
// the tenant that was mid-flight.

import { prisma } from '../db/client'

/** Leaves 60s of the 300s ceiling for the final write, the response, and one slow tenant. */
const DEFAULT_BUDGET_MS = 240_000

export interface SweepResult {
  processed: number
  /** True when this run reached the end of the list and the next starts a fresh pass. */
  completedPass: boolean
  /** True when the budget ran out first. */
  stoppedEarly: boolean
  remaining: number
}

/**
 * Run `fn` for every tenant, in id order, resuming where the last run stopped.
 *
 * Ordering by id matters: it is stable, so a cursor means the same thing between runs. A
 * tenant created mid-pass with a lower id is picked up on the next pass rather than this
 * one, which is the right trade for a daily job.
 */
export async function sweepTenants(
  job: string,
  fn: (tenant: { id: string; name: string }) => Promise<void>,
  opts: { budgetMs?: number } = {},
): Promise<SweepResult> {
  const after = await cursorFor(job)
  const tenants = await (prisma as any).tenant.findMany({
    where:   after ? { id: { gt: after } } : {},
    select:  { id: true, name: true },
    orderBy: { id: 'asc' },
  })
  return sweep(job, tenants, fn, opts)
}

/** Where the last run of this job stopped, or null to start a fresh pass. */
export async function cursorFor(job: string): Promise<string | null> {
  const row = await (prisma as any).cronJobCursor
    .findUnique({ where: { job } })
    .catch(() => null)
  return row?.last_tenant_id ?? null
}

/**
 * The budget-and-cursor walk itself, over anything with an id.
 *
 * Tenants are the common case but not the only one: the onboarding drip walks enrolments,
 * and at a thousand tenants there are far more of those than there are tenants. The shape of
 * the problem is identical, so the shape of the fix is too.
 *
 * The caller must have fetched `items` in ascending id order, starting after cursorFor(job).
 */
export async function sweep<T extends { id: string }>(
  job: string,
  items: T[],
  fn: (item: T) => Promise<void>,
  opts: { budgetMs?: number } = {},
): Promise<SweepResult> {
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS
  const deadline = Date.now() + budgetMs
  const tenants = items

  let processed = 0
  let stoppedEarly = false

  for (const t of tenants) {
    // Checked BEFORE the tenant, never during: a tenant is either done or not started, so
    // resuming cannot leave one half-processed.
    if (Date.now() >= deadline) { stoppedEarly = true; break }

    // One tenant failing is not the sweep failing. The cursor still advances, so a tenant
    // that throws every time cannot wedge the job for everyone behind it.
    try { await fn(t) } catch (e: any) {
      console.error(`[sweep:${job}] tenant ${t.id} failed:`, e?.message ?? e)
    }
    processed += 1

    await (prisma as any).cronJobCursor.upsert({
      where:  { job },
      update: { last_tenant_id: t.id, tenants_this_run: processed, updated_at: new Date() },
      create: { job, last_tenant_id: t.id, tenants_this_run: processed },
    }).catch(() => { /* bookkeeping must never stop the work */ })
  }

  const completedPass = !stoppedEarly
  if (completedPass) {
    // Back to the start, and count the lap. passes_completed is the number worth watching:
    // if it stops rising, the job is no longer getting all the way round.
    await (prisma as any).cronJobCursor.upsert({
      where:  { job },
      update: {
        last_tenant_id: null,
        pass_started_at: new Date(),
        passes_completed: { increment: 1 },
        tenants_this_run: processed,
        updated_at: new Date(),
      },
      create: { job, last_tenant_id: null, passes_completed: 1, tenants_this_run: processed },
    }).catch(() => {})
  }

  const remaining = Math.max(0, (tenants as any[]).length - processed)
  console.log(
    `[sweep:${job}] processed=${processed} remaining=${remaining} `
    + `${completedPass ? 'pass complete' : 'stopped on budget, resumes next run'}`,
  )
  return { processed, completedPass, stoppedEarly, remaining }
}
