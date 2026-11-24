// Personal signatures for letters and reports.
//   GET    /signatures/me        am I allowed to have one, do I have one (no picture)
//   GET    /signatures/me/image  MY picture, for the editor preview only (authenticated, no-store, never cached)
//   PUT    /signatures/me        add or replace mine (a PNG as a data URL)
//   DELETE /signatures/me        delete mine
//   GET    /signatures           administrators: who has one (names only, never a picture)
//   DELETE /signatures/:userId   administrators: remove someone's (an admin can remove, never see or reuse it)
// Administrators and managers only; pilot accounts only. A signature is used only when its owner chooses "Sign with my signature" on a document (services/ask-docs/render-doc.ts).

import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askPilotEnabled } from '../lib/ask-pilot'
import { canHaveSignature, cleanSignaturePng, deleteSignature, getMeta, holders, saveSignature, signatureTableReady, loadSignatureFor } from '../services/letters/signatures'

export const signaturesRouter = Router()
const db = prisma as any
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)

async function guard(req: Request, res: Response, next: NextFunction) {
  try {
    const t = getTenantId()
    if (!(await askPilotEnabled(t))) { notFound(res); return }
    const u = await db.user.findFirst({ where: { id: req.user!.sub, tenant_id: t, is_active: true }, select: { job_role: true } })
    if (!canHaveSignature(req.user!.role, u?.job_role)) { notFound(res); return }
    next()
  } catch { notFound(res) }
}
signaturesRouter.use(guard)
const adminOnly = (req: Request, res: Response, next: NextFunction) => (req.user!.role === 'admin' ? next() : notFound(res))

signaturesRouter.get('/me', async (req: Request, res: Response) => {
  const t = getTenantId()
  const me = await db.user.findFirst({ where: { id: req.user!.sub, tenant_id: t }, select: { name: true, job_role: true } }).catch(() => null)
  ok(res, { allowed: true, table_ready: await signatureTableReady(), name: me?.name ?? '', job_role: me?.job_role ?? '', ...(await getMeta(t, req.user!.sub)) })
})

// Only the owner's own picture, and only for their editor. The server never sends anyone else's.
signaturesRouter.get('/me/image', async (req: Request, res: Response) => {
  const img = await loadSignatureFor(getTenantId(), req.user!.sub)
  if (!img) { notFound(res); return }
  res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
  res.send(img.png)
})

signaturesRouter.put('/me', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  if (!(await signatureTableReady())) { err(res, 'NOT_READY', 'Signatures are not switched on yet.', 503); return }
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image ?? ''))
  if (!m) { err(res, 'INVALID', 'Please send the signature as a PNG picture.', 400); return }
  try {
    const clean = await cleanSignaturePng(Buffer.from(m[1], 'base64'))
    await saveSignature(t, u, clean.png, clean.width, clean.height)
    void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'signature_saved', entity_type: 'signature', entity_id: u, metadata: {} })
    ok(res, { saved: true, ...(await getMeta(t, u)) })
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    if (/picture|signature|PNG|small|big/i.test(msg)) { err(res, 'INVALID', msg, 400); return }
    console.error('[signatures] save failed:', msg.slice(0, 160)); err(res, 'ERROR', 'The signature could not be saved just now. Please try again.', 500)
  }
})

signaturesRouter.delete('/me', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const gone = await deleteSignature(t, u)
  if (gone) void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'signature_deleted', entity_type: 'signature', entity_id: u, metadata: {} })
  ok(res, { deleted: gone })
})

signaturesRouter.get('/', adminOnly, async (_req: Request, res: Response) => {
  const t = getTenantId()
  const list = await holders(t)
  const users = list.length ? await db.user.findMany({ where: { tenant_id: t, id: { in: list.map(x => x.user_id) } }, select: { id: true, name: true, job_role: true } }) : []
  const by = new Map<string, any>(users.map((x: any) => [x.id, x]))
  ok(res, { signatures: list.map(x => ({ user_id: x.user_id, name: by.get(x.user_id)?.name ?? 'Former member of staff', job_role: by.get(x.user_id)?.job_role ?? null, updated_at: x.updated_at })) })
})

signaturesRouter.delete('/:userId', adminOnly, async (req: Request, res: Response) => {
  const t = getTenantId(), target = String(req.params.userId)
  const gone = await deleteSignature(t, target)
  if (gone) void writeAuditLog({ tenant_id: t, user_id: req.user!.sub, event_type: 'signature_removed_by_admin', entity_type: 'signature', entity_id: target, metadata: {} })
  ok(res, { deleted: gone })
})
