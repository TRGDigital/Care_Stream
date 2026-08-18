// Alerts while a course is with the CPD Certification Service: tell us when their
// assessor actually starts looking, and what they open.
//
// Fires only for users flagged is_reviewer, and only when REVIEWER_ALERT_EMAIL is
// set — so it costs nothing and sends nothing for ordinary staff.
//
// Throttled per (user × event kind) so a normal browsing session produces a
// handful of useful emails rather than one per page view. Sign-in is reported
// once per quiet period; opening a given course is reported once per course.

import { prisma } from '../db/client'
import { sendReviewerActivityEmail } from '../services/email/outbound'

// How long the same event kind stays quiet after firing.
const QUIET_MS: Record<string, number> = {
  signin:   6 * 60 * 60 * 1000,   // a working session, not every tab
  open:     6 * 60 * 60 * 1000,   // per course, per session
  complete: 0,                    // always worth knowing
}

// In-process memory. A serverless instance may be recycled, which at worst means
// a duplicate alert — deliberately preferred over a table write on every request.
const lastSent = new Map<string, number>()

function shouldSend(key: string, kind: string): boolean {
  const quiet = QUIET_MS[kind] ?? 6 * 60 * 60 * 1000
  if (quiet === 0) return true
  const prev = lastSent.get(key) ?? 0
  const now  = Date.now()
  if (now - prev < quiet) return false
  lastSent.set(key, now)
  return true
}

/**
 * Report reviewer activity. Safe to call on any request: it returns immediately
 * for non-reviewers and never throws into the caller.
 */
export async function notifyReviewerActivity(
  userId: string,
  kind: 'signin' | 'open' | 'complete',
  event: string,
  detail?: string | null,
  dedupeSuffix?: string,
): Promise<void> {
  const to = process.env.REVIEWER_ALERT_EMAIL
  if (!to) return

  try {
    const user = await (prisma as any).user.findUnique({
      where:  { id: userId },
      select: { is_reviewer: true, name: true, email: true },
    })
    if (!user?.is_reviewer) return

    if (!shouldSend(`${userId}:${kind}:${dedupeSuffix ?? ''}`, kind)) return

    await sendReviewerActivityEmail({
      to,
      reviewerName:  user.name ?? 'Reviewer',
      reviewerEmail: user.email ?? '',
      event,
      detail: detail ?? null,
      when: new Date(),
    })
  } catch (e: any) {
    console.error('[reviewer-alerts] failed:', e?.message ?? e)
  }
}
