import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { facilityTypeToSetting, settingLabel } from '../lib/care-setting'
import { classifyTenantPolicies, knownPolicyTypes } from '../lib/policy-classifier'
import { missingPolicies } from '../services/analytics/missing-policies'
import { writePolicy } from '../services/policy-writer/write-policy'
import { verifyPaidPolicyDraft, verificationFailures } from '../services/policy-writer/verify-policy'
import { writeAuditLog } from '../lib/audit'
import { uploadPolicyFile } from '../services/storage/s3'
import { enqueueIngestion } from '../workers/queue'
import { randomUUID } from 'crypto'
import { submitForApproval } from '../services/analytics/policy-adoption'
import { startCoverageAnalysis, analyseCoverageBatch, coverageRunState } from '../services/analytics/regulation-coverage'

// Platform-INTERNAL policy gap analysis. Classifies each client's policies into
// canonical types, then compares a client against peers of the same care setting
// to surface policies they're missing (a future "write & sell the gap" pipeline).
// Never exposed to tenants; no client's policy CONTENT is shared with another —
// only anonymous policy-type names + peer coverage counts.
export const platformPolicyGapsRouter = Router()
platformPolicyGapsRouter.use(requirePlatformAdmin)

// ─── GET / — clients grouped by setting, with classification coverage ──────────
platformPolicyGapsRouter.get('/', async (_req: Request, res: Response) => {
  const [tenants, counts] = await Promise.all([
    (prisma as any).tenant.findMany({ select: { id: true, name: true, account_number: true, facility_type: true } }),
    (prisma as any).policy.groupBy({
      by: ['tenant_id'],
      where: { status: 'active' },
      _count: { _all: true },
    }).catch(() => [] as any[]),
  ])
  const classified = await (prisma as any).policy.groupBy({
    by: ['tenant_id'],
    where: { status: 'active', policy_type: { not: null } },
    _count: { _all: true },
  }).catch(() => [] as any[])

  const totalById = new Map((counts as any[]).map(c => [c.tenant_id, c._count._all]))
  const classById = new Map((classified as any[]).map(c => [c.tenant_id, c._count._all]))

  const clients = (tenants as any[]).map(t => {
    const setting = facilityTypeToSetting(t.facility_type)
    return {
      id: t.id, name: t.name, account_number: t.account_number,
      setting, setting_label: settingLabel(setting),
      policies: totalById.get(t.id) ?? 0,
      classified: classById.get(t.id) ?? 0,
    }
  }).filter(c => c.policies > 0)
    .sort((a, b) => a.setting_label.localeCompare(b.setting_label) || a.name.localeCompare(b.name))

  ok(res, { clients })
})

// ─── POST /:tenantId/classify — classify this client's un-typed policies ───────
platformPolicyGapsRouter.post('/:tenantId/classify', async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId)
  const known = await knownPolicyTypes()
  try {
    const { classified, remaining } = await classifyTenantPolicies(tenantId, known, 40)
    const total = await (prisma as any).policy.count({ where: { tenant_id: tenantId, status: 'active' } })
    ok(res, { classified, remaining, total })
  } catch (e: any) {
    err(res, 'CLASSIFY_FAILED', e.message ?? 'Classification failed', 500)
  }
})

// ─── GET /matrix?setting= — setting-wide gap matrix (the sales pipeline) ───────
// For one care setting: every assessable client (has ≥1 classified policy) × the
// peer-derived catalogue of policy types, so we can see who's missing what.
// NOTE ON ORDER: these are registered BEFORE '/:tenantId' below.
// Express matches in registration order, so with '/:tenantId' first a GET for
// '/orders' was handled as a report for a tenant called "orders" and the queue
// silently looked empty after a real payment. A literal path must always be
// registered before a parameterised one that can swallow it.
// ─── Policies clients have paid for ───────────────────────────────────────────
//
// The work owed. A client pays, and from that moment we owe them a document; this is the
// queue of those debts and how far each has got.
//
// Approval is the step that matters and it is deliberately manual. Nothing reaches a care
// home automatically: a person reads the policy and decides it is good enough to carry that
// home's name. Until then the client sees "with us for final checks", which is true.

// GET /orders — every purchase across all clients, unfinished first.
platformPolicyGapsRouter.get('/orders', async (_req: Request, res: Response) => {
  try {
    const rows = await (prisma as any).policyPurchase.findMany({
      orderBy: [{ purchased_at: 'desc' }],
      take: 200,
    })
    const tenantIds = [...new Set(rows.map((r: any) => r.tenant_id))]
    const tenants = await (prisma as any).tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, account_number: true },
    })
    const byId = new Map(tenants.map((t: any) => [t.id, t]))
    // Work still owed floats to the top; delivered work is history.
    const rank = (s: string) => (s === 'drafted' ? 0 : s === 'drafting' ? 1 : s === 'paid' ? 2 : 3)
    const orders = rows
      .map((r: any) => ({ ...r, tenant: byId.get(r.tenant_id) ?? null }))
      .sort((a: any, b: any) => rank(a.status) - rank(b.status))
    ok(res, { orders })
  } catch (e: any) {
    err(res, 'ORDERS_FAILED', e?.message ?? 'could not read the orders', 500)
  }
})

// POST /orders/:id/status — move a purchase along.
//
// Only forwards, and only to a status that exists. 'approved' is what puts the policy in
// front of the client, so it records who approved it and when: if a document carrying a care
// home's name turns out to be wrong, that answer needs to exist.
platformPolicyGapsRouter.post('/orders/:id/status', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const status = String(req.body?.status ?? '').trim()
  const policyId = req.body?.policy_id ? String(req.body.policy_id) : null
  const ALLOWED = new Set(['drafting', 'drafted', 'approved', 'refunded'])
  if (!ALLOWED.has(status)) return err(res, 'INVALID_INPUT', 'Unknown status', 400)

  try {
    const now = new Date()
    const data: Record<string, unknown> = { status }
    if (policyId) data.policy_id = policyId
    if (status === 'drafted') data.drafted_at = now
    if (status === 'approved') {
      data.approved_at = now
      data.approved_by = (req as any).user?.email ?? 'platform'
    }
    const updated = await (prisma as any).policyPurchase.update({ where: { id }, data })
    ok(res, { order: updated })
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e?.message ?? 'could not update that order', 500)
  }
})

// ─── Writing the policy ───────────────────────────────────────────────────────

// POST /orders/:id/write — COSTS CREDIT. Writes the policy and holds it as a draft.
//
// Nothing reaches the client here. The draft sits on the order until a person has read it and
// pressed approve, because a document carrying a care home's name should be seen by someone
// before it carries it.
platformPolicyGapsRouter.post('/orders/:id/write', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  try {
    // Write, verify, and if verification fails feed the failures back as rewrite
    // instructions — up to three attempts. The final state is stored either way; a
    // draft that still fails arrives in the queue with a red checklist, never silently.
    let written = await writePolicy(id)
    let attempts = 1
    await (prisma as any).policyPurchase.update({
      where: { id },
      data: { draft_content: written.markdown, drafted_at: new Date(), drafted_by: (req as any).user?.email ?? 'platform', status: 'drafted' },
    })
    let verification = await verifyPaidPolicyDraft(id)
    while (!verification.passed && attempts < 3) {
      attempts++
      written = await writePolicy(id, verificationFailures(verification))
      await (prisma as any).policyPurchase.update({
        where: { id },
        data: { draft_content: written.markdown, drafted_at: new Date(), drafted_by: (req as any).user?.email ?? 'platform' },
      })
      verification = await verifyPaidPolicyDraft(id)
    }
    const order = await (prisma as any).policyPurchase.findUnique({ where: { id } })
    ok(res, { order, words: written.words, sections: written.sections, verification, attempts })
  } catch (e: any) {
    err(res, 'WRITE_FAILED', e?.message ?? 'could not write that policy', 500)
  }
})

// POST /orders/:id/verify — run (or re-run) the verification gate on the stored draft.
// For drafts written before the gate existed, or after a manual read raises doubt.
platformPolicyGapsRouter.post('/orders/:id/verify', async (req: Request, res: Response) => {
  try {
    const verification = await verifyPaidPolicyDraft(String(req.params.id))
    ok(res, { verification })
  } catch (e: any) {
    err(res, 'VERIFY_FAILED', e?.message ?? 'could not verify that draft', 500)
  }
})

// GET /orders/:id/draft — read what was written, so it can be checked before approval.
platformPolicyGapsRouter.get('/orders/:id/draft', async (req: Request, res: Response) => {
  try {
    const order = await (prisma as any).policyPurchase.findUnique({ where: { id: String(req.params.id) } })
    if (!order) return err(res, 'NOT_FOUND', 'That order was not found', 404)
    ok(res, { draft: order.draft_content ?? null, title: order.policy_title, status: order.status })
  } catch (e: any) {
    err(res, 'DRAFT_FAILED', e?.message ?? 'could not read that draft', 500)
  }
})

// POST /orders/:id/deliver — approve the draft and put it in the client's library.
//
// This is the moment the client gets what they paid for, so it is the moment the policy
// becomes a real Policy row: stored like any other, queued for ingestion so it is searchable
// and so the next coverage run reads it as evidence. Until now it existed only as a draft on
// the order.
platformPolicyGapsRouter.post('/orders/:id/deliver', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  try {
    const order = await (prisma as any).policyPurchase.findUnique({ where: { id } })
    if (!order) return err(res, 'NOT_FOUND', 'That order was not found', 404)
    if (!order.draft_content) return err(res, 'NO_DRAFT', 'Write the policy before approving it', 409)
    if (order.status === 'approved') return err(res, 'ALREADY_DELIVERED', 'That policy has already been delivered', 409)

    // The gate: nothing ships unverified. A red or missing checklist blocks Approve.
    // The override exists for judgement calls (e.g. the judge is being over-strict on a
    // document a person has read and stands behind) — it must carry a reason, and it is
    // written to the audit log with the overrider's name.
    const verified = order.verification && (order.verification as any).passed === true
    if (!verified) {
      const override = req.body?.override === true
      const reason = String(req.body?.reason ?? '').trim()
      if (!override || reason.length < 10) {
        return err(res, 'VERIFICATION_REQUIRED',
          'This draft has not passed verification. Fix and re-verify it, or override with a written reason (at least 10 characters).', 409)
      }
      writeAuditLog({
        tenant_id: order.tenant_id, event_type: 'policy_update', entity_type: 'policy', entity_id: id,
        metadata: { paid_policy_override: true, reason, by: (req as any).user?.email ?? 'platform', title: order.policy_title },
      }).catch(() => {})
    }

    // Policy.uploaded_by is a foreign key to User, so it has to be a real user in THIS tenant.
    // A platform admin's email is neither, and using one would have failed the constraint the
    // first time anybody pressed approve. The tenant's own admin owns the document, which is
    // also the honest answer to "who put this in our library".
    const owner = await (prisma as any).user.findFirst({
      where:   { tenant_id: order.tenant_id, role: 'admin', is_active: true },
      orderBy: { created_at: 'asc' },
      select:  { id: true },
    })
    if (!owner) return err(res, 'NO_ADMIN', 'That client has no active admin to own the policy', 409)

    const policyId = randomUUID()
    const filename = `${order.policy_title.replace(/[^A-Za-z0-9 ]+/g, '').trim() || 'Policy'}.md`
    const buffer = Buffer.from(order.draft_content, 'utf8')

    const s3Key = await uploadPolicyFile({
      tenantId: order.tenant_id,
      policyId,
      filename,
      buffer,
      mimeType: 'text/markdown',
    })

    await (prisma as any).policy.create({
      data: {
        id:                 policyId,
        tenant_id:          order.tenant_id,
        name:               order.policy_title,
        filename,
        s3_key:             s3Key,
        document_category:  'internal_policy',
        version:            1,
        status:             'processing',
        uploaded_by:        owner.id,
        // Provenance, so nobody has to wonder later where this document came from.
        carestream_written: true,
      },
    })

    // Index it, so it is searchable and the next coverage run reads it as evidence rather
    // than reporting the gap we were just paid to close.
    await enqueueIngestion({
      policy_id:         policyId,
      tenant_id:         order.tenant_id,
      s3_key:            s3Key,
      document_category: 'internal_policy',
      filename,
      mime_type:         'text/markdown',
      version:           1,
    }).catch(() => {})

    // Into the home's own approval chain, not around it.
    //
    // A home with "require care manager approval" switched on has decided that nobody
    // publishes without their care manager seeing it. A policy we wrote and charged for is the
    // last document that should skip that. Seeding the document and calling the same
    // submitForApproval an adopted change uses means their two settings decide what happens
    // next, exactly as they do for everything else: care manager, then external reviewer, or
    // straight to published when both are off.
    await (prisma as any).policyDocument.create({
      data: {
        tenant_id:        order.tenant_id,
        policy_id:        policyId,
        original_content: order.draft_content,
        draft_content:    order.draft_content,
        version:          '1.0',
      },
    })
    const approval = await submitForApproval(order.tenant_id, policyId, 'CareStream')

    const updated = await (prisma as any).policyPurchase.update({
      where: { id },
      data: {
        status:      'approved',
        policy_id:   policyId,
        approved_at: new Date(),
        approved_by: (req as any).user?.email ?? 'platform',
      },
    })
    // approval.status tells the caller where it landed: pending_manager, pending_external or
    // published. "Delivered" on our side and "live" on theirs are different moments.
    ok(res, { order: updated, policy_id: policyId, approval: approval?.status ?? 'unknown' })
  } catch (e: any) {
    err(res, 'DELIVER_FAILED', e?.message ?? 'could not deliver that policy', 500)
  }
})

platformPolicyGapsRouter.get('/matrix', async (req: Request, res: Response) => {
  const setting = String(req.query.setting ?? '')
  if (!setting) return err(res, 'INVALID_INPUT', 'setting is required', 400)

  const allTenants = await (prisma as any).tenant.findMany({ select: { id: true, name: true, facility_type: true } })
  const inSetting = (allTenants as any[]).filter(t => facilityTypeToSetting(t.facility_type) === setting)
  const nameById = new Map(inSetting.map(t => [t.id, t.name]))
  const ids = inSetting.map(t => t.id)

  const rows = ids.length
    ? await (prisma as any).policy.findMany({
        where: { tenant_id: { in: ids }, status: 'active', policy_type: { not: null } },
        select: { tenant_id: true, policy_type: true },
      })
    : []

  // client → set of types; type → set of clients.
  const typesByClient = new Map<string, Set<string>>()
  const clientsByType = new Map<string, Set<string>>()
  for (const r of rows as any[]) {
    if (!typesByClient.has(r.tenant_id)) typesByClient.set(r.tenant_id, new Set())
    typesByClient.get(r.tenant_id)!.add(r.policy_type)
    if (!clientsByType.has(r.policy_type)) clientsByType.set(r.policy_type, new Set())
    clientsByType.get(r.policy_type)!.add(r.tenant_id)
  }
  const assessableIds = [...typesByClient.keys()]   // clients with ≥1 classified policy

  const ignores = await (prisma as any).policyTypeCuration.findMany({
    where: { status: 'ignored', OR: [{ care_setting: setting }, { care_setting: null }] }, select: { name: true },
  }).catch(() => [])
  const ignored = new Set((ignores as any[]).map(r => r.name.toLowerCase()))

  const total = assessableIds.length
  const types = [...clientsByType.entries()]
    .filter(([type]) => !ignored.has(type.toLowerCase()))
    .map(([type, haveSet]) => ({
      type,
      have_count: haveSet.size,
      have_pct: total ? Math.round((haveSet.size / total) * 100) : 0,
      missing: assessableIds.filter(id => !haveSet.has(id)).map(id => ({ id, name: nameById.get(id) ?? 'Unknown' })),
    }))
    .sort((a, b) => b.have_count - a.have_count || a.type.localeCompare(b.type))

  const expectedTypes = types.map(t => t.type)
  const clients = assessableIds.map(id => {
    const have = typesByClient.get(id) ?? new Set()
    const missing = expectedTypes.filter(t => !have.has(t)).length
    return { id, name: nameById.get(id) ?? 'Unknown', have: have.size, missing }
  }).sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name))

  ok(res, { setting, setting_label: settingLabel(setting), client_count: total, type_count: types.length, types, clients })
})

// ─── GET /:tenantId — the gap report vs peers of the same setting ──────────────
platformPolicyGapsRouter.get('/:tenantId', async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, facility_type: true } })
  if (!tenant) return err(res, 'NOT_FOUND', 'Client not found', 404)
  const setting = facilityTypeToSetting(tenant.facility_type)

  // Every tenant's setting (facility_type → canonical), to find peers.
  const allTenants = await (prisma as any).tenant.findMany({ select: { id: true, facility_type: true } })
  const peerIds = (allTenants as any[])
    .filter(t => t.id !== tenantId && facilityTypeToSetting(t.facility_type) === setting)
    .map(t => t.id)

  // This client's classified policy types.
  const mine = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' }, select: { policy_type: true },
  })
  const myTypes = new Set((mine as any[]).map(p => p.policy_type).filter(Boolean))
  const unclassified = (mine as any[]).filter(p => !p.policy_type).length

  // Peer catalogue: for each policy type, how many DISTINCT peers have it.
  const peerRows = peerIds.length
    ? await (prisma as any).policy.findMany({
        where: { tenant_id: { in: peerIds }, status: 'active', policy_type: { not: null } },
        select: { tenant_id: true, policy_type: true },
      })
    : []
  const peersWithType = new Map<string, Set<string>>()
  const peersClassified = new Set<string>()
  for (const r of peerRows as any[]) {
    peersClassified.add(r.tenant_id)
    if (!peersWithType.has(r.policy_type)) peersWithType.set(r.policy_type, new Set())
    peersWithType.get(r.policy_type)!.add(r.tenant_id)
  }
  const peerCount = peersClassified.size

  // Curation: types the admin has marked to ignore for this setting (noise).
  const ignores = await (prisma as any).policyTypeCuration.findMany({
    where: { status: 'ignored', OR: [{ care_setting: setting }, { care_setting: null }] }, select: { name: true },
  }).catch(() => [])
  const ignored = new Set((ignores as any[]).map(r => r.name.toLowerCase()))

  // Expected catalogue = types peers have (peer-derived), minus ignored.
  const expected = [...peersWithType.entries()]
    .filter(([type]) => !ignored.has(type.toLowerCase()))
    .map(([type, tenants]) => ({ type, peer_count: tenants.size, peer_pct: peerCount ? Math.round((tenants.size / peerCount) * 100) : 0 }))

  const missing = expected
    .filter(e => !myTypes.has(e.type))
    .sort((a, b) => b.peer_count - a.peer_count || a.type.localeCompare(b.type))
  const have = [...myTypes].sort()

  ok(res, {
    tenant: { id: tenant.id, name: tenant.name, setting, setting_label: settingLabel(setting) },
    peer_count: peerCount,
    unclassified,
    have,
    missing,
  })
})

// ─── POST /types/ignore — hide a noisy type from the expected catalogue ────────
platformPolicyGapsRouter.post('/types/ignore', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim()
  const care_setting = req.body?.care_setting ? String(req.body.care_setting) : null
  if (!name) return err(res, 'INVALID_INPUT', 'name is required', 400)
  await (prisma as any).policyTypeCuration.upsert({
    where:  { care_setting_name: { care_setting, name } },
    update: { status: 'ignored' },
    create: { care_setting, name, status: 'ignored' },
  }).catch(() => {})
  ok(res, { ignored: true })
})

// ─── POST /types/restore — bring an ignored type back ──────────────────────────
platformPolicyGapsRouter.post('/types/restore', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim()
  const care_setting = req.body?.care_setting ? String(req.body.care_setting) : null
  if (!name) return err(res, 'INVALID_INPUT', 'name is required', 400)
  await (prisma as any).policyTypeCuration.deleteMany({ where: { care_setting, name } }).catch(() => {})
  ok(res, { restored: true })
})

// ─── Missing policies, judged against legislation rather than against peers ────
//
// The routes above compare a client to other clients of the same care setting. These compare
// a client to the law: for every regulation in scope for their service, is there a policy
// whose subject is that regulation. That is the exercise that found Gas Safety, Electrical
// Safety and Asbestos Management missing at Ferndale, none of which any peer held either, so
// peer comparison could never have surfaced them.
//
// Read and run are deliberately separate. Reading is free and instant. Running reads every
// policy the client holds against every regulation and costs Anthropic credit, so it is never
// a side effect of opening a screen.

// GET /:tenantId/missing-policies — FREE. Reads coverage that has already been analysed.
platformPolicyGapsRouter.get('/:tenantId/missing-policies', async (req: Request, res: Response) => {
  try {
    ok(res, await missingPolicies(String(req.params.tenantId)))
  } catch (e: any) {
    err(res, 'ANALYSIS_FAILED', e?.message ?? 'could not build the missing-policy list', 500)
  }
})

// GET /:tenantId/coverage/state — how far a run has got, and how much is left to pay for.
platformPolicyGapsRouter.get('/:tenantId/coverage/state', async (req: Request, res: Response) => {
  try {
    ok(res, await coverageRunState(String(req.params.tenantId)))
  } catch (e: any) {
    err(res, 'ANALYSIS_FAILED', e?.message ?? 'could not read the run state', 500)
  }
})

// POST /:tenantId/coverage/start — COSTS CREDIT. Queues every in-scope regulation.
platformPolicyGapsRouter.post('/:tenantId/coverage/start', async (req: Request, res: Response) => {
  try {
    ok(res, await startCoverageAnalysis(String(req.params.tenantId)))
  } catch (e: any) {
    err(res, 'ANALYSIS_FAILED', e?.message ?? 'could not start the analysis', 500)
  }
})

// POST /:tenantId/coverage/batch — COSTS CREDIT. One batch; the caller loops until remaining
// is 0, which is how the tenant-facing /gaps page drives the same service.
platformPolicyGapsRouter.post('/:tenantId/coverage/batch', async (req: Request, res: Response) => {
  try {
    ok(res, await analyseCoverageBatch(String(req.params.tenantId)))
  } catch (e: any) {
    err(res, 'ANALYSIS_FAILED', e?.message ?? 'analysis batch failed', 500)
  }
})
