import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAdmin } from '../middleware/auth'
import { uploadMiddleware } from '../middleware/upload'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { uploadPolicyFile, downloadExtractedText, downloadFile } from '../services/storage/s3'
import { extractText, isSupportedMimeType } from '../services/rag/extractor'
import { enqueueIngestion } from '../workers/queue'
import { writeAuditLog } from '../lib/audit'
import { ok, err } from '../lib/response'

export const policiesRouter = Router()

// ─── Validation schemas ───────────────────────────────────────────────────────

const UploadSchema = z.object({
  name:                z.string().min(1).max(200),
  document_category:   z.enum(['internal_policy', 'staff_handbook']),  // tenants never upload external_regulation (§4.5)
  tags:                z.string().optional(),                           // JSON array string
  review_interval_days: z.coerce.number().int().min(1).optional(),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw?: string): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// ─── GET /policies ────────────────────────────────────────────────────────────
// List all policies for the current tenant. Admin only.
// Supports filtering by status and document_category; paginated.

policiesRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const { status, document_category } = req.query as Record<string, string>
  const page  = Math.max(1, parseInt((req.query.page  as string) || '1'))
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20')))

  const where: Record<string, unknown> = {}
  if (status)             where.status             = status
  if (document_category)  where.document_category  = document_category

  const [policies, total] = await Promise.all([
    (prisma as any).policy.findMany({
      where,
      skip:      (page - 1) * limit,
      take:      limit,
      orderBy:   { created_at: 'desc' },
      include:   { uploader: { select: { id: true, name: true, email: true } } },
    }),
    (prisma as any).policy.count({ where }),
  ])

  ok(res, { policies, total, page, limit })
})

// ─── POST /policies ───────────────────────────────────────────────────────────
// Upload a new policy document. Admin only.
// 1. Validate file + form fields
// 2. Upload to S3
// 3. Create policy record (status: processing)
// 4. Enqueue ingestion job
// 5. Write audit log

policiesRouter.post('/', requireAdmin, uploadMiddleware, async (req: Request, res: Response) => {
  if (!req.file) {
    err(res, 'FILE_REQUIRED', 'A policy document is required.')
    return
  }

  const parsed = UploadSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { name, document_category, tags: rawTags, review_interval_days } = parsed.data
  const tenantId = getTenantId()
  const policyId = uuidv4()

  const s3Key = await uploadPolicyFile({
    tenantId,
    policyId,
    filename:  req.file.originalname,
    buffer:    req.file.buffer,
    mimeType:  req.file.mimetype,
  })

  const policy = await (prisma as any).policy.create({
    data: {
      id:                  policyId,
      tenant_id:           tenantId,
      name,
      filename:            req.file.originalname,
      s3_key:              s3Key,
      document_category,
      version:             1,
      status:              'processing',
      tags:                parseTags(rawTags),
      uploaded_by:         req.user!.sub,
      review_interval_days: review_interval_days ?? null,
    },
  })

  await enqueueIngestion({
    policy_id:         policyId,
    tenant_id:         tenantId,
    s3_key:            s3Key,
    document_category,
    filename:          req.file.originalname,
    mime_type:         req.file.mimetype,
    version:           1,
  })

  await writeAuditLog({
    tenant_id:    tenantId,
    user_id:      req.user!.sub,
    event_type:   'policy_upload',
    entity_type:  'policy',
    entity_id:    policyId,
    metadata:     { name, document_category, filename: req.file.originalname, size: req.file.size },
  })

  ok(res, { policy }, 201)
})

// ─── POST /policies/:id/version ───────────────────────────────────────────────
// Upload a replacement version of an existing policy (§10.5).
// Old version stays active until the ingestion worker completes the atomic swap.

policiesRouter.post('/:id/version', requireAdmin, uploadMiddleware, async (req: Request, res: Response) => {
  if (!req.file) {
    err(res, 'FILE_REQUIRED', 'A replacement document is required.')
    return
  }

  const tenantId = getTenantId()

  const existing = await (prisma as any).policy.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })

  if (!existing) {
    err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404)
    return
  }

  if (existing.status === 'processing') {
    err(res, 'POLICY_PROCESSING', 'Cannot replace a policy that is still processing.', 409)
    return
  }

  const policyId   = uuidv4()
  const newVersion = existing.version + 1

  const s3Key = await uploadPolicyFile({
    tenantId,
    policyId,
    filename:  req.file.originalname,
    buffer:    req.file.buffer,
    mimeType:  req.file.mimetype,
  })

  const newPolicy = await (prisma as any).policy.create({
    data: {
      id:                  policyId,
      tenant_id:           tenantId,
      name:                existing.name,  // preserves policy name across versions
      filename:            req.file.originalname,
      s3_key:              s3Key,
      document_category:   existing.document_category,
      version:             newVersion,
      status:              'processing',
      tags:                existing.tags,
      uploaded_by:         req.user!.sub,
      review_interval_days: existing.review_interval_days,
    },
  })

  await enqueueIngestion({
    policy_id:                    policyId,
    tenant_id:                    tenantId,
    s3_key:                       s3Key,
    document_category:            existing.document_category,
    filename:                     req.file.originalname,
    mime_type:                    req.file.mimetype,
    version:                      newVersion,
    previous_version_policy_id:   existing.id,  // triggers atomic swap after ingestion
  })

  await writeAuditLog({
    tenant_id:   tenantId,
    user_id:     req.user!.sub,
    event_type:  'policy_update',
    entity_type: 'policy',
    entity_id:   policyId,
    metadata:    {
      previous_policy_id: existing.id,
      previous_version:   existing.version,
      new_version:        newVersion,
      filename:           req.file.originalname,
    },
  })

  ok(res, { policy: newPolicy }, 201)
})

// ─── GET /policies/:id ────────────────────────────────────────────────────────
// Returns the full extracted policy text (§4.3 — full policy return).
// Serves pre-extracted text from S3 cache. Falls back to on-the-fly extraction
// if the cache isn't ready yet (policy still processing).

policiesRouter.get('/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const policy = await (prisma as any).policy.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })

  if (!policy) {
    err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404)
    return
  }

  // Try pre-extracted text cache first
  let text = await downloadExtractedText(tenantId, policy.id)

  // Fallback: extract on the fly (e.g. ingestion still in progress)
  if (text === null) {
    if (policy.status === 'processing') {
      ok(res, { policy, text: null, processing: true })
      return
    }

    const buffer = await downloadFile(policy.s3_key)
    if (!isSupportedMimeType(policy.s3_key.split('.').pop()!)) {
      err(res, 'EXTRACTION_FAILED', 'Policy text could not be extracted.', 500)
      return
    }
    // Derive MIME from filename extension for the fallback path
    const ext = policy.filename.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf:  'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt:  'text/plain',
    }
    const mime = mimeMap[ext ?? ''] ?? 'text/plain'
    if (isSupportedMimeType(mime)) {
      text = await extractText(buffer, mime)
    }
  }

  ok(res, { policy, text })
})

// ─── DELETE /policies/:id ─────────────────────────────────────────────────────
// Archive a policy — never hard-deletes (§10.5).
// Sets status to 'archived', removes from Pinecone (stub until RAG section).
// The S3 file is retained indefinitely.

policiesRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const policy = await (prisma as any).policy.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })

  if (!policy) {
    err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404)
    return
  }

  if (policy.status === 'archived') {
    err(res, 'ALREADY_ARCHIVED', 'This policy is already archived.', 409)
    return
  }

  await (prisma as any).policy.update({
    where: { id: policy.id },
    data:  { status: 'archived' },
  })

  // TODO (RAG section): delete all Pinecone vectors for this policy_id
  // await deletePolicyVectors(tenantId, policy.id)

  await writeAuditLog({
    tenant_id:   tenantId,
    user_id:     req.user!.sub,
    event_type:  'policy_archive',
    entity_type: 'policy',
    entity_id:   policy.id,
    metadata:    { name: policy.name, version: policy.version, document_category: policy.document_category },
  })

  ok(res, { policy: { ...policy, status: 'archived' } })
})
