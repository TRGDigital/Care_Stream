// Tenant-submitted feature requests. Admins write them from the Guides page; the
// platform team reads them under Platform → Feature Requests.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { sendFeatureRequestNotification } from '../services/email/outbound'
import { normaliseKind, cleanPageUrl } from '../lib/feature-request-kind'

export const featureRequestsRouter = Router()

// POST /feature-requests — submit a new feature idea (any signed-in user).
featureRequestsRouter.post('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const title    = String(req.body?.title ?? '').trim()
  const details  = String(req.body?.details ?? '').trim()
  const kind     = normaliseKind(req.body?.kind)
  const pageUrl  = cleanPageUrl(req.body?.page_url)
  if (!title)   { err(res, 'INVALID', 'Please add a short title.', 400); return }
  if (!details) { err(res, 'INVALID', kind === 'bug' ? 'Please describe what happened.' : 'Please describe the feature.', 400); return }

  const [tenant, user] = await Promise.all([
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ])
  let created: any = { id: null }
  try {
  created = await (prisma as any).featureRequest.create({
    data: {
      tenant_id: tenantId, user_id: userId,
      tenant_name: tenant?.name ?? null, submitter_name: user?.name ?? null, submitter_email: user?.email ?? null,
      title: title.slice(0, 200), details: details.slice(0, 5000),
    },
  })
  // The kind and page live in columns added by prisma/sql/2026-11-24_feature_requests_kind.sql. Before it is run this is skipped, nothing else is affected.
  if (kind === 'bug' || pageUrl) await (prisma as any).$executeRawUnsafe('update feature_requests set kind = $1, page_url = $2 where id = $3', kind, pageUrl, created.id).catch(() => undefined)
  } catch (e: any) {
    console.error('[feature-requests] save failed:', e?.message ?? e)
    if (kind !== 'bug') { err(res, 'SAVE_FAILED', 'We could not save that. Please try again.', 500); return }   // a bug report still reaches us by email below
  }

  // Notify the platform owner (fire-and-forget).
  sendFeatureRequestNotification({
    tenantName: tenant?.name ?? 'Unknown client',
    submitterName: user?.name ?? null, submitterEmail: user?.email ?? null,
    title: title.slice(0, 200), details: details.slice(0, 5000), kind, pageUrl,
  }).catch(e => console.error('[feature-requests] notify failed:', e?.message ?? e))

  ok(res, { id: created.id ?? null }, 201)
})
