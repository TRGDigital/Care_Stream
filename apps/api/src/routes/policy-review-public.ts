// Public, unauthenticated endpoints for an external person (consultant, trustee, etc.) to
// review an updated policy via a one-off token link and approve it or send feedback.
// Mounted before requireAuth. The unguessable token gates all access; the link only works
// while the policy is waiting on external approval.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { getExternalReview, externalDecision } from '../services/analytics/policy-adoption'

export const publicPolicyReviewRouter = Router()

// GET /public/policy-review/:token — the policy + its changes for review
publicPolicyReviewRouter.get('/:token', async (req: Request, res: Response) => {
  const review = await getExternalReview(String(req.params.token))
  if (!review) { err(res, 'UNAVAILABLE', 'This review link is no longer active. The policy may already have been approved, or the link was withdrawn.', 410); return }
  ok(res, review)
})

// POST /public/policy-review/:token/decision — record approve / changes requested
publicPolicyReviewRouter.post('/:token/decision', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim()
  const comment = String(req.body?.comment ?? '').slice(0, 4000)
  const decision = req.body?.decision === 'rejected' ? 'rejected' : 'approved'
  if (!name) { err(res, 'VALIDATION', 'Please enter your name.', 400); return }
  if (decision === 'rejected' && !comment.trim()) { err(res, 'VALIDATION', 'Please add a note so the team knows what to change.', 400); return }
  try {
    const r = await externalDecision(String(req.params.token), name, comment, decision)
    if (!r) { err(res, 'UNAVAILABLE', 'This review link is no longer active.', 410); return }
    ok(res, r)
  } catch (e: any) { err(res, 'DECISION_FAILED', e.message ?? 'Could not record your decision.', 500) }
})
