// Tenant support / service requests. Admins raise them from the Guides page; the
// platform team reads them under Platform → Service Requests. Each request may
// carry one image, which is stored in S3 and attached to the notification email
// (sent to the platform owner, CC'ing the submitting admin, with the CS number).

import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { imageUploadMiddleware } from '../middleware/upload'
import { detectEvidenceType } from '../lib/evidence-file'
import { uploadSupportImage } from '../services/storage/s3'
import { sendSupportRequestNotification } from '../services/email/outbound'

export const supportRequestsRouter = Router()

// POST /support-requests — raise a support request (any signed-in user).
supportRequestsRouter.post('/', imageUploadMiddleware, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const message  = String(req.body?.message ?? '').trim()
  if (!message) { err(res, 'INVALID', 'Please describe your question or issue.', 400); return }

  const [tenant, user] = await Promise.all([
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, account_number: true } }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ])

  // Optional image: validate the actual bytes, then store in S3.
  const file = (req as any).file as Express.Multer.File | undefined
  let image: { s3Key: string; fileName: string; type: string; size: number; buffer: Buffer } | null = null
  if (file) {
    const detected = detectEvidenceType(file.buffer)
    if (!detected || !detected.mime.startsWith('image/')) { err(res, 'INVALID_IMAGE', 'That file is not a valid image.', 400); return }
    const key   = `${randomUUID()}.${detected.ext}`
    const s3Key = await uploadSupportImage({ tenantId, key, buffer: file.buffer, mimeType: detected.mime })
    image = { s3Key, fileName: file.originalname.slice(0, 200), type: detected.mime, size: file.size ?? 0, buffer: file.buffer }
  }

  const created = await (prisma as any).supportRequest.create({
    data: {
      tenant_id: tenantId, user_id: userId,
      tenant_name: tenant?.name ?? null, tenant_cs_number: tenant?.account_number ?? null,
      submitter_name: user?.name ?? null, submitter_email: user?.email ?? null,
      message: message.slice(0, 5000),
      image_s3_key: image?.s3Key ?? null, image_file_name: image?.fileName ?? null,
      image_type: image?.type ?? null, image_size_bytes: image?.size ?? null,
    },
  })

  // Notify the platform owner + CC the submitter (fire-and-forget).
  sendSupportRequestNotification({
    tenantName: tenant?.name ?? 'Unknown client', csNumber: tenant?.account_number ?? null,
    submitterName: user?.name ?? null, submitterEmail: user?.email ?? null,
    message: message.slice(0, 5000),
    image: image ? { buffer: image.buffer, filename: image.fileName, type: image.type } : null,
  }).catch(e => console.error('[support-requests] notify failed:', e?.message ?? e))

  ok(res, { id: created.id }, 201)
})
