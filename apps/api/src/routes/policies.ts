import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { requireAdmin } from '../middleware/auth'
import { uploadMiddleware, bulkUploadMiddleware } from '../middleware/upload'
import { prisma } from '../db/client'
import { getTenantId, tenantContext } from '../db/tenant-context'
import { uploadPolicyFile, downloadExtractedText, downloadFile } from '../services/storage/s3'
import { extractText, isSupportedMimeType } from '../services/rag/extractor'
import { backfillSignatures } from '../lib/policy-dedup'
import { BUILTIN_CATEGORY_KEYS, isValidCategory } from '../lib/policy-categories'
import { enqueueIngestion } from '../workers/queue'
import { writeAuditLog } from '../lib/audit'
import { ok, err } from '../lib/response'
import { checkPolicyLimit, remainingPolicySlots, PlanLimitError, trackAiAction } from '../lib/plan-limits'
import { getEnglishPolicyHtml } from '../lib/translate'

export const policiesRouter = Router()

// ─── Validation schemas ───────────────────────────────────────────────────────

const UploadSchema = z.object({
  name:                z.string().min(1).max(200),
  document_category:   z.string().min(1).max(60),  // built-in key or a tenant custom category — validated against the tenant below
  tags:                z.string().optional(),                           // JSON array string
  section:             z.string().max(100).optional(),                 // internal-policy section
  review_interval_days: z.coerce.number().int().min(1).optional(),
  generic_onboarding:  z.string().optional(),                          // 'true' → allocatable as a one-step onboarding flow
})

// Resolve the tenant's custom categories and confirm the submitted category is
// allowed (a built-in key, or one the tenant added in Settings).
async function assertValidCategory(tenantId: string, category: string): Promise<boolean> {
  if (BUILTIN_CATEGORY_KEYS.includes(category)) return true
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { policy_categories: true },
  })
  return isValidCategory(category, (tenant?.policy_categories as string[]) ?? [])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw?: string): string[] {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

// SHA-256 of file bytes — for byte-for-byte duplicate detection.
function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Normalise a policy name for "same policy" matching (case/space-insensitive).
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

// ─── GET /policies ────────────────────────────────────────────────────────────
// List all policies for the current tenant. Admin only.
// Supports filtering by status and document_category; paginated.

policiesRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const { status, document_category } = req.query as Record<string, string>
  const page  = Math.max(1, parseInt((req.query.page  as string) || '1'))
  // Admin policy list loads the full library client-side (for tab/category counts),
  // so allow a high cap. A care-home policy set is a few hundred at most.
  const limit = Math.min(2000, Math.max(1, parseInt((req.query.limit as string) || '20')))

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

// ─── POST /policies/check ─────────────────────────────────────────────────────
// Pre-flight duplicate detection. The client sends each file's name + content
// hash; we classify against the tenant's ACTIVE policies so the upload UI can
// auto-skip exact duplicates and offer Replace/Keep-both for name matches.

const CheckSchema = z.object({
  files: z.array(z.object({
    filename: z.string().min(1).max(400),
    name:     z.string().min(1).max(400),
    hash:     z.string().min(8).max(128),
  })).min(1).max(200),
})

policiesRouter.post('/check', requireAdmin, async (req: Request, res: Response) => {
  const parsed = CheckSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', 'Invalid check payload.')
    return
  }
  const tenantId = getTenantId()

  // Match against active AND processing policies so a re-run shortly after an
  // upload (while ingestion is still finishing) doesn't create duplicates.
  const active = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: { in: ['active', 'processing'] } },
    select: { id: true, name: true, version: true, content_hash: true },
  }) as Array<{ id: string; name: string; version: number; content_hash: string | null }>

  const byHash = new Map<string, { id: string; name: string; version: number }>()
  const byName = new Map<string, { id: string; name: string; version: number }>()
  for (const p of active) {
    if (p.content_hash) byHash.set(p.content_hash, p)
    byName.set(normaliseName(p.name), p)
  }

  const checks = parsed.data.files.map(f => {
    const exact = byHash.get(f.hash)
    if (exact) {
      return { filename: f.filename, classification: 'exact_duplicate' as const, existing: { id: exact.id, name: exact.name, version: exact.version } }
    }
    const named = byName.get(normaliseName(f.name))
    if (named) {
      return { filename: f.filename, classification: 'name_match' as const, existing: { id: named.id, name: named.name, version: named.version } }
    }
    return { filename: f.filename, classification: 'new' as const }
  })

  ok(res, { checks })
})

// ─── GET /policies/duplicates ─────────────────────────────────────────────────
// Policies flagged as possible content duplicates of an existing policy, awaiting
// the tenant's decision (keep both / replace / discard).
policiesRouter.get('/duplicates', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const flagged = await (prisma as any).policy.findMany({
    where:   { tenant_id: tenantId, duplicate_status: 'flagged', status: { in: ['active', 'processing'] } },
    select:  { id: true, name: true, document_category: true, version: true, created_at: true, duplicate_of: true, duplicate_score: true },
    orderBy: { created_at: 'desc' },
  })
  const matchIds = [...new Set((flagged as any[]).map(p => p.duplicate_of).filter(Boolean))]
  const matches = matchIds.length
    ? await (prisma as any).policy.findMany({ where: { id: { in: matchIds }, tenant_id: tenantId }, select: { id: true, name: true, version: true, created_at: true, status: true } })
    : []
  const byId = new Map((matches as any[]).map(m => [m.id, m]))
  const duplicates = (flagged as any[]).map(p => ({
    id: p.id, name: p.name, document_category: p.document_category, version: p.version, created_at: p.created_at,
    score: p.duplicate_score, match: byId.get(p.duplicate_of) ?? null,
  })).filter(d => d.match)   // only surface if the matched policy still exists
  ok(res, { duplicates })
})

// ─── POST /policies/backfill-signatures ───────────────────────────────────────
// Warm content fingerprints for existing policies (uploaded before dedup) in the
// background, decoupled from uploads so an upload never blocks on a big backfill.
// The client loops this until remaining = 0.
policiesRouter.post('/backfill-signatures', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '40'), 10) || 40, 1), 80)
  try {
    const { done, remaining } = await backfillSignatures(tenantId, limit)
    ok(res, { done, remaining })
  } catch (e: any) {
    err(res, 'BACKFILL_FAILED', e.message ?? 'Backfill failed', 500)
  }
})

// ─── GET /policies/similar-named ──────────────────────────────────────────────
// Policies we kept despite a similar name to an existing one (content differed) —
// surfaced as a reassuring "we checked, these are different, both kept" note.
policiesRouter.get('/similar-named', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const rows = await (prisma as any).policy.findMany({
    where:   { tenant_id: tenantId, similar_named_status: 'noted', status: { in: ['active', 'processing'] } },
    select:  { id: true, name: true, similar_named_note: true, created_at: true },
    orderBy: { created_at: 'desc' },
  })
  const notes = (rows as any[]).map(p => {
    const n = (p.similar_named_note ?? {}) as any
    return { id: p.id, name: p.name, matched_name: n.name ?? '', content_pct: typeof n.content_pct === 'number' ? n.content_pct : null }
  }).filter(n => n.matched_name)
  ok(res, { notes })
})

// ─── POST /policies/:id/similar-named/dismiss ─────────────────────────────────
policiesRouter.post('/:id/similar-named/dismiss', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const existing = await (prisma as any).policy.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
  if (!existing) { err(res, 'NOT_FOUND', 'Policy not found', 404); return }
  await (prisma as any).policy.update({ where: { id: existing.id }, data: { similar_named_status: 'dismissed' } })
  ok(res, { dismissed: true })
})

// ─── POST /policies/:id/duplicate/resolve ─────────────────────────────────────
// Resolve a flagged content duplicate. action:
//   keep_both — dismiss the flag, keep the new policy alongside the existing one.
//   replace   — the new policy supersedes the matched existing one (old archived).
//   cancel    — discard the new upload (archive it), keep the existing policy.
policiesRouter.post('/:id/duplicate/resolve', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const action = String(req.body?.action ?? '')
  if (!['keep_both', 'replace', 'cancel'].includes(action)) {
    err(res, 'INVALID_INPUT', 'action must be keep_both, replace or cancel', 400); return
  }
  const policy = await (prisma as any).policy.findFirst({
    where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true, name: true, version: true, document_category: true, duplicate_of: true, duplicate_status: true },
  })
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found', 404); return }

  async function archive(policyId: string, reason: string) {
    await (prisma as any).policy.update({ where: { id: policyId }, data: { status: 'archived' } })
    await writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'policy_archive', entity_type: 'policy', entity_id: policyId, metadata: { reason } })
  }

  if (action === 'replace') {
    if (policy.duplicate_of) await archive(policy.duplicate_of, 'replaced_by_duplicate')
    await (prisma as any).policy.update({ where: { id: policy.id }, data: { duplicate_status: 'dismissed' } })
  } else if (action === 'cancel') {
    await archive(policy.id, 'duplicate_discarded')
    await (prisma as any).policy.update({ where: { id: policy.id }, data: { duplicate_status: 'dismissed' } })
  } else {
    // keep_both
    await (prisma as any).policy.update({ where: { id: policy.id }, data: { duplicate_status: 'dismissed' } })
  }

  ok(res, { resolved: true, action })
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

  const { name, document_category, tags: rawTags, section, review_interval_days, generic_onboarding } = parsed.data
  const isGenericOnboarding = generic_onboarding === 'true'
  const tenantId = req.user!.tenant_id
  const policyId = uuidv4()

  if (!(await assertValidCategory(tenantId, document_category))) {
    err(res, 'INVALID_CATEGORY', 'That category is not available. Add it in Settings first.', 400)
    return
  }

  try {
    await checkPolicyLimit(tenantId, document_category)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      err(res, e.code, e.message, 403)
      return
    }
    throw e
  }

  // S3 upload + DB record + ingestion run sequentially in one function call.
  // Vercel terminates the Lambda as soon as res.json() is called, so we must
  // complete all work before responding. Typical ingestion (extract → embed →
  // Pinecone upsert) takes 15–30 s for standard policy documents — within the
  // 60 s maxDuration.

  let policy: any

  try {
    await tenantContext.run({ tenantId }, async () => {
      const s3Key = await uploadPolicyFile({
        tenantId,
        policyId,
        filename:  req.file!.originalname,
        buffer:    req.file!.buffer,
        mimeType:  req.file!.mimetype,
      })

      policy = await (prisma as any).policy.create({
        data: {
          id:                  policyId,
          tenant_id:           tenantId,
          name,
          filename:            req.file!.originalname,
          s3_key:              s3Key,
          document_category,
          version:             1,
          status:              'processing',
          content_hash:        sha256(req.file!.buffer),
          section:             document_category === 'internal_policy' ? (section?.trim() || null) : null,
          generic_onboarding:  isGenericOnboarding,
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
        filename:          req.file!.originalname,
        mime_type:         req.file!.mimetype,
        version:           1,
      })

      await writeAuditLog({
        tenant_id:   tenantId,
        user_id:     req.user!.sub,
        event_type:  'policy_upload',
        entity_type: 'policy',
        entity_id:   policyId,
        metadata:    { name, document_category, filename: req.file!.originalname, size: req.file!.size },
      })
    })
  } catch (e) {
    console.error('[policies/upload] Error:', e)
    err(res, 'UPLOAD_FAILED', 'Policy upload failed. Check server logs.', 500)
    return
  }

  // Success — respond so the client's upload overlay closes. (Without this the
  // request hangs even though the policy processed fine.)
  ok(res, { policy })
})

// ─── PATCH /policies/:id ──────────────────────────────────────────────────────
// Update editable policy flags — currently the "generic onboarding policy" flag,
// which controls whether this policy is offered on the Onboarding page as an
// allocatable one-step read-policy flow.
policiesRouter.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const existing = await (prisma as any).policy.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
  if (!existing) { err(res, 'NOT_FOUND', 'Policy not found', 404); return }
  const data: Record<string, any> = {}
  if (typeof req.body?.generic_onboarding === 'boolean') data.generic_onboarding = req.body.generic_onboarding
  if (Object.keys(data).length === 0) { err(res, 'NO_CHANGES', 'Nothing to update', 400); return }
  const policy = await (prisma as any).policy.update({ where: { id: existing.id }, data })
  ok(res, { policy })
})

// ─── POST /policies/:id/version ───────────────────────────────────────────────
// Upload a replacement version of an existing policy (§10.5).
// Old version stays active until the ingestion worker completes the atomic swap.

policiesRouter.post('/:id/version', requireAdmin, uploadMiddleware, async (req: Request, res: Response) => {
  if (!req.file) {
    err(res, 'FILE_REQUIRED', 'A replacement document is required.')
    return
  }

  const tenantId = req.user!.tenant_id

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
  let newPolicy: any

  await tenantContext.run({ tenantId }, async () => {
    const s3Key = await uploadPolicyFile({
      tenantId,
      policyId,
      filename:  req.file!.originalname,
      buffer:    req.file!.buffer,
      mimeType:  req.file!.mimetype,
    })

    newPolicy = await (prisma as any).policy.create({
      data: {
        id:                  policyId,
        tenant_id:           tenantId,
        name:                existing.name,
        filename:            req.file!.originalname,
        s3_key:              s3Key,
        document_category:   existing.document_category,
        version:             newVersion,
        status:              'processing',
        content_hash:        sha256(req.file!.buffer),
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
      filename:                     req.file!.originalname,
      mime_type:                    req.file!.mimetype,
      version:                      newVersion,
      previous_version_policy_id:   existing.id,
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
        filename:           req.file!.originalname,
      },
    })
  })

  ok(res, { policy: newPolicy }, 201)
})

// ─── POST /policies/bulk ──────────────────────────────────────────────────────
// Upload a batch of policy files in one request (the client splits large
// selections into size-bounded batches, so there is no user-facing file cap).
// Names are derived from filename by default; the client can send a JSON array
// of overrides in the `names` field (indexed to match the files array).
// Category applies to all files in the batch.

function deriveNameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')              // strip extension
    .replace(/^[\d]+[\s.\-_]*/,  '')      // strip leading number (e.g. "538 ", "001_", "12. ")
    .replace(/[-_]+/g, ' ')               // hyphens/underscores → spaces
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())  // title case
}

policiesRouter.post('/bulk', requireAdmin, bulkUploadMiddleware, async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined
  if (!files || files.length === 0) {
    err(res, 'FILES_REQUIRED', 'At least one file is required.')
    return
  }

  // multer's async callbacks can break AsyncLocalStorage propagation, so read
  // tenant_id from the JWT payload directly and re-enter the context explicitly.
  const tenantId = req.user!.tenant_id
  const rawCategory = typeof req.body.document_category === 'string' ? req.body.document_category : 'internal_policy'
  if (!(await assertValidCategory(tenantId, rawCategory))) {
    err(res, 'INVALID_CATEGORY', 'That category is not available. Add it in Settings first.', 400)
    return
  }
  const category = rawCategory
  // Section applies to internal policies only; one section per bulk batch.
  const section  = category === 'internal_policy' && typeof req.body.section === 'string'
    ? (req.body.section.trim().slice(0, 100) || null)
    : null

  try {
    const slots = await remainingPolicySlots(tenantId, category)
    if (slots !== null && files.length > slots) {
      const label = category === 'staff_handbook' ? 'handbooks' : 'policies'
      err(res, 'POLICY_LIMIT_REACHED',
        slots === 0
          ? `Your plan does not have capacity for any more ${label}. Archive existing ${label} or upgrade your plan.`
          : `Your plan only has capacity for ${slots} more ${label}, but you are uploading ${files.length}. Archive existing ${label} or upgrade your plan.`,
        403,
      )
      return
    }
  } catch (e) {
    if (e instanceof PlanLimitError) {
      err(res, e.code, e.message, 403)
      return
    }
    throw e
  }

  let nameOverrides: string[] = []
  try {
    if (req.body.names) nameOverrides = JSON.parse(req.body.names)
  } catch { /* ignore malformed overrides */ }

  const results: Array<{ filename: string; policy_id: string; name: string; status: string }> = []
  const errors:  Array<{ filename: string; error: string }> = []
  const skipped: Array<{ filename: string; reason: string; existing_name?: string }> = []

  // Fail-safe: auto-skip byte-for-byte duplicates. Load existing active hashes
  // once; also dedupe identical files within this same batch.
  const existingActive = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: { in: ['active', 'processing'] } },
    select: { name: true, content_hash: true },
  }) as Array<{ name: string; content_hash: string | null }>
  const existingHashes = new Map<string, string>()  // hash → existing policy name
  for (const p of existingActive) if (p.content_hash) existingHashes.set(p.content_hash, p.name)
  const seenInBatch = new Set<string>()

  // Re-enter tenant context so all async service calls (Prisma, Pinecone, audit)
  // can access getTenantId() without relying on the multer-broken chain.
  await tenantContext.run({ tenantId }, async () => {
    await Promise.all(files!.map(async (file, i) => {
      const name = (nameOverrides[i] ?? '').trim() || deriveNameFromFilename(file.originalname)
      const hash = sha256(file.buffer)

      // Skip exact duplicates — of an existing active policy, or earlier in this batch.
      const dupOfExisting = existingHashes.get(hash)
      if (dupOfExisting) {
        skipped.push({ filename: file.originalname, reason: 'identical_to_existing', existing_name: dupOfExisting })
        return
      }
      if (seenInBatch.has(hash)) {
        skipped.push({ filename: file.originalname, reason: 'identical_within_upload' })
        return
      }
      seenInBatch.add(hash)

      const policyId = uuidv4()
      try {
        const s3Key = await uploadPolicyFile({
          tenantId,
          policyId,
          filename: file.originalname,
          buffer:   file.buffer,
          mimeType: file.mimetype,
        })

        await (prisma as any).policy.create({
          data: {
            id:                policyId,
            tenant_id:         tenantId,
            name,
            filename:          file.originalname,
            s3_key:            s3Key,
            document_category: category,
            version:           1,
            status:            'processing',
            content_hash:      hash,
            section,
            tags:              [],
            uploaded_by:       req.user!.sub,
          },
        })

        await enqueueIngestion({
          policy_id:         policyId,
          tenant_id:         tenantId,
          s3_key:            s3Key,
          document_category: category,
          filename:          file.originalname,
          mime_type:         file.mimetype,
          version:           1,
        })

        results.push({ filename: file.originalname, policy_id: policyId, name, status: 'processing' })
      } catch (e) {
        errors.push({ filename: file.originalname, error: String(e) })
      }
    }))

    if (results.length > 0) {
      await writeAuditLog({
        tenant_id:   tenantId,
        user_id:     req.user!.sub,
        event_type:  'policy_bulk_upload',
        entity_type: 'policy',
        entity_id:   tenantId,
        metadata:    { count: results.length, errors: errors.length, skipped: skipped.length, category },
      })
    }
  })

  ok(res, { results, errors, skipped, total: files.length }, 201)
})

// ─── GET /policies/:id/preview ────────────────────────────────────────────────
// Render a policy exactly as staff see it: the header/footer-stripped, formatted
// English HTML (same content served in the hub / induction full-copy view), plus
// the original extracted text so the admin can see what was removed. Uses the
// cached formatted HTML when present; generates + caches it on demand otherwise.
policiesRouter.get('/:id/preview', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const policyId = String(req.params.id)
  try {
    const policy = await (prisma as any).policy.findFirst({
      where: { id: policyId, tenant_id: tenantId }, select: { id: true, name: true, filename: true, status: true },
    })
    if (!policy) { err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404); return }

    const raw = await downloadExtractedText(tenantId, policyId).catch(() => null)

    // Self-healing formatted HTML: rebuilds (chunked) if the cache is missing or truncated.
    const { html, cached } = await getEnglishPolicyHtml(tenantId, policyId, raw)
    if (html && !cached) trackAiAction(tenantId, 'policy_format', policyId)

    ok(res, { policy_id: policyId, name: policy.name || policy.filename, status: policy.status, cached, html: html ?? '', raw: raw ?? '', has_raw: !!raw })
  } catch (e: any) {
    err(res, 'PREVIEW_FAILED', e.message ?? 'Preview failed', 500)
  }
})

// ─── PATCH /policies/:id/review ───────────────────────────────────────────────
// Record when a policy was last reviewed (and optionally its review interval), so the
// "No review date recorded / Overdue for review" lint flag clears and currency can be tracked.
const ReviewSchema = z.object({
  last_reviewed_at:     z.string().optional(),      // ISO date; defaults to today
  review_interval_days: z.coerce.number().int().min(1).max(3650).optional(),
})
policiesRouter.patch('/:id/review', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const policyId = String(req.params.id)
  const parsed = ReviewSchema.safeParse(req.body ?? {})
  if (!parsed.success) { err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', ')); return }

  const policy = await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { id: true } })
  if (!policy) { err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404); return }

  const when = parsed.data.last_reviewed_at ? new Date(parsed.data.last_reviewed_at) : new Date()
  if (isNaN(when.getTime())) { err(res, 'VALIDATION_ERROR', 'Please provide a valid date.'); return }

  // Recording a review starts a fresh cycle, so re-arm the reminder (clear the last-sent stamp).
  const data: any = { last_reviewed_at: when, review_reminder_sent_at: null }
  if (parsed.data.review_interval_days != null) data.review_interval_days = parsed.data.review_interval_days

  const updated = await (prisma as any).policy.update({ where: { id: policyId }, data, select: { last_reviewed_at: true, review_interval_days: true } })
  ok(res, { last_reviewed_at: updated.last_reviewed_at, review_interval_days: updated.review_interval_days })
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
    // Derive MIME from the filename extension (the original browser MIME isn't
    // stored, and is unreliable for office formats anyway).
    const ext = policy.filename.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf:  'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      odt:  'application/vnd.oasis.opendocument.text',
      txt:  'text/plain',
    }
    const mime = mimeMap[ext ?? '']
    if (!mime || !isSupportedMimeType(mime)) {
      err(res, 'EXTRACTION_FAILED', 'Policy text could not be extracted.', 500)
      return
    }
    text = await extractText(buffer, mime)
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

// ─── POST /policies/:id/delete ────────────────────────────────────────────────
// Permanently delete a policy: removes the DB record, local/S3 file, and any
// Pinecone vectors. Intended for accidental uploads. Active policies must be
// archived first to prevent accidental deletion of live content.

policiesRouter.post('/:id/delete', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const policy = await (prisma as any).policy.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })

  if (!policy) {
    err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404)
    return
  }

  if (policy.status === 'active') {
    err(res, 'POLICY_ACTIVE', 'Archive the policy before deleting it.', 409)
    return
  }

  // Remove DB record
  await (prisma as any).policy.delete({ where: { id: policy.id } })

  // Remove local/S3 file (best-effort — don't fail if already gone)
  try {
    const { fileExists } = await import('../services/storage/s3')
    if (await fileExists(policy.s3_key)) {
      // Local dev: delete file from disk
      const fs  = await import('fs')
      const path = await import('path')
      const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR ?? '/tmp/carestreamai'
      const full = path.join(LOCAL_DIR, policy.s3_key)
      if (fs.existsSync(full)) fs.unlinkSync(full)
    }
  } catch { /* non-fatal */ }

  await writeAuditLog({
    tenant_id:   tenantId,
    user_id:     req.user!.sub,
    event_type:  'policy_delete',
    entity_type: 'policy',
    entity_id:   policy.id,
    metadata:    { name: policy.name, filename: policy.filename, status: policy.status },
  })

  ok(res, { deleted: true })
})

// ─── POST /policies/:id/retry ─────────────────────────────────────────────────
// Re-trigger ingestion for a failed policy without requiring re-upload.
// Resets status to 'processing' and re-queues the ingestion job.

policiesRouter.post('/:id/retry', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const policy = await (prisma as any).policy.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })

  if (!policy) {
    err(res, 'POLICY_NOT_FOUND', 'Policy not found.', 404)
    return
  }

  if (policy.status !== 'failed') {
    err(res, 'NOT_FAILED', 'Only failed policies can be retried.', 409)
    return
  }

  const ext      = policy.filename.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    odt:  'application/vnd.oasis.opendocument.text',
    txt:  'text/plain',
  }
  const mimeType = mimeMap[ext ?? ''] ?? 'application/octet-stream'

  await (prisma as any).policy.update({
    where: { id: policy.id },
    data:  { status: 'processing' },
  })

  await enqueueIngestion({
    policy_id:         policy.id,
    tenant_id:         tenantId,
    s3_key:            policy.s3_key,
    document_category: policy.document_category,
    filename:          policy.filename,
    mime_type:         mimeType,
    version:           policy.version,
  })

  ok(res, { policy: { ...policy, status: 'processing' } })
})
