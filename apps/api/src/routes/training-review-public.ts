// Public, unauthenticated endpoints for an external specialist to review + sign off
// a standard training module via a password-protected link. Mounted before requireAuth.
// Exposes only the frozen snapshot (platform content from anonymised seeds — no tenant
// or personal data). The password gates all access.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { passwordMatches } from '../lib/review-links'

export const publicTrainingReviewRouter = Router()

async function loadLink(token: string) {
  return (prisma as any).moduleReviewLink.findUnique({ where: { id: token } }).catch(() => null)
}

function linkState(link: any): { ok: true } | { ok: false; reason: string } {
  if (!link) return { ok: false, reason: 'This review link was not found.' }
  if (link.status === 'revoked') return { ok: false, reason: 'This review link has been revoked.' }
  if (new Date(link.expires_at) < new Date()) return { ok: false, reason: 'This review link has expired.' }
  return { ok: true }
}

// POST /public/training-review/:token/unlock — { password } → frozen content
publicTrainingReviewRouter.post('/:token/unlock', async (req: Request, res: Response) => {
  const link = await loadLink(String(req.params.token))
  const state = linkState(link)
  if (!state.ok) { err(res, 'UNAVAILABLE', state.reason, 410); return }
  if (!passwordMatches(link.id, String(req.body?.password ?? ''), link.password_hash)) {
    err(res, 'BAD_PASSWORD', 'Incorrect password.', 401); return
  }
  ok(res, {
    snapshot: link.snapshot,
    status: link.status,
    expires_at: link.expires_at,
    decision: link.decision ?? null,
    reviewer_name: link.reviewer_name ?? null,
    decided_at: link.decided_at ?? null,
  })
})

// POST /public/training-review/:token/decision — record the reviewer's sign-off
publicTrainingReviewRouter.post('/:token/decision', async (req: Request, res: Response) => {
  const link = await loadLink(String(req.params.token))
  const state = linkState(link)
  if (!state.ok) { err(res, 'UNAVAILABLE', state.reason, 410); return }
  if (!passwordMatches(link.id, String(req.body?.password ?? ''), link.password_hash)) {
    err(res, 'BAD_PASSWORD', 'Incorrect password.', 401); return
  }
  if (link.status !== 'pending') { err(res, 'ALREADY_DECIDED', 'This review has already been completed.', 409); return }

  const decision = req.body?.decision === 'approved' ? 'approved' : req.body?.decision === 'changes_requested' ? 'changes_requested' : null
  const name = String(req.body?.reviewer_name ?? '').trim()
  const role = String(req.body?.reviewer_role ?? '').trim()
  if (!decision) { err(res, 'VALIDATION', 'A decision is required.', 400); return }
  if (!name || !role) { err(res, 'VALIDATION', 'Your name and role are required.', 400); return }

  await (prisma as any).moduleReviewLink.update({
    where: { id: link.id },
    data:  {
      status: decision, decision,
      reviewer_name: name, reviewer_role: role,
      reviewer_org: String(req.body?.reviewer_org ?? '').trim() || null,
      reviewer_email: String(req.body?.reviewer_email ?? '').trim() || null,
      comments: String(req.body?.comments ?? '').slice(0, 4000) || null,
      decided_at: new Date(),
    },
  })
  ok(res, { recorded: true, decision })
})
