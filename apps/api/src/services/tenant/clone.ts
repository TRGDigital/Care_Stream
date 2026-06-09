// Full tenant clone — content/config only (clean slate), used to spin up a Live
// account from a configured Admin/sandbox account. Runs inside the deployed API
// where DB, S3 and Pinecone credentials are all present.
//
//   • Copies: policies (+ files + vectors), policy translations, knowledge base
//     (+ vectors), training modules (+ images + question versions), CQC question
//     bank, onboarding flows + steps.
//   • Skips ALL activity: enrolments, deliveries, runs, progress, query history,
//     sessions, bookmarks, logs, analytics snapshots.
//   • Creates ONE fresh admin user (existing users are NOT copied — email is
//     globally unique).
//
// Vectors are copied namespace→namespace (fetch + re-upsert, NO re-embedding).
// S3 objects are copied server-side (CopyObject).

import { prisma } from '../../db/client'
import { Pinecone } from '@pinecone-database/pinecone'
import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import bcrypt from 'bcrypt'

const pc     = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
const index  = pc.index((process.env.PINECONE_INDEX ?? process.env.PINECONE_INDEX_NAME)!)
const s3     = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-2', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! } })
const BUCKET = process.env.S3_BUCKET!

const nsPolicies  = (t: string) => `tenant_${t}`
const nsChapters  = (t: string) => `tenant_${t}_chapters`
const nsKnowledge = (t: string) => `tenant_${t}_knowledge`

const chunk = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
const strip = (row: any) => { const { id, created_at, updated_at, ...rest } = row; return rest }
const rekey = (key: string | null, oldId: string, newId: string): string | null => key ? key.split(oldId).join(newId) : key

async function copyS3(srcKey: string, dstKey: string): Promise<boolean> {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: srcKey })) } catch { return false }
  await s3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `${BUCKET}/${encodeURIComponent(srcKey)}`, Key: dstKey }))
  return true
}

// Copy an ENTIRE namespace, remapping each vector via `remap` (return null to skip).
async function copyNamespace(srcNs: string, dstNs: string, remap: (rec: any) => { id: string; values: number[]; metadata: any } | null): Promise<number> {
  const src = index.namespace(srcNs)
  const ids: string[] = []
  let token: string | undefined
  do {
    const r: any = await src.listPaginated({ ...(token ? { paginationToken: token } : {}) })
    for (const v of (r.vectors ?? [])) ids.push(v.id)
    token = r.pagination?.next
  } while (token)
  if (!ids.length) return 0
  let n = 0
  for (const batch of chunk(ids, 100)) {
    const fetched = await src.fetch(batch)
    const recs = Object.values(fetched.records ?? {}).map(remap).filter(Boolean) as any[]
    if (recs.length) { await index.namespace(dstNs).upsert(recs as any); n += recs.length }
  }
  return n
}

export interface CloneOpts {
  sourceTenantId: string
  adminRename: { name: string; slug: string; email_domain: string }
  live:        { name: string; slug: string; email_domain: string }
  newAdmin:    { email: string; name: string; password: string }
}

export async function cloneTenant(opts: CloneOpts) {
  const SRC = opts.sourceTenantId
  const src = await (prisma as any).tenant.findUnique({ where: { id: SRC } })
  if (!src) throw new Error('Source tenant not found')

  const emailTaken = await (prisma as any).user.findUnique({ where: { email: opts.newAdmin.email } })
  if (emailTaken) throw new Error(`Admin email already exists (globally unique): ${opts.newAdmin.email}`)
  // Guard against the target slug/email_domain colliding with another tenant.
  for (const v of [opts.live.slug, opts.adminRename.slug]) {
    const clash = await (prisma as any).tenant.findFirst({ where: { slug: v, id: { not: SRC } } })
    if (clash) throw new Error(`Slug already in use: ${v}`)
  }

  const NEW = randomUUID()
  const ADMIN_ID = randomUUID()
  const summary: Record<string, number> = {}

  // [1] free the clean slug by renaming the source
  await (prisma as any).tenant.update({ where: { id: SRC }, data: opts.adminRename })

  // [2] create the Live tenant (config copied, account_number auto-assigned, allowlists reset)
  await (prisma as any).tenant.create({ data: {
    id: NEW, name: opts.live.name, slug: opts.live.slug, email_domain: opts.live.email_domain,
    subscription_status: src.subscription_status, plan_id: src.plan_id, stripe_customer_id: null,
    branding_signoff: src.branding_signoff, facility_type: src.facility_type, response_style: src.response_style,
    logo_url: src.logo_url, email_preferences: src.email_preferences, staff_roles: src.staff_roles,
    specialist_roles: src.specialist_roles, policy_sections: src.policy_sections, training_settings: src.training_settings,
    custom_languages: src.custom_languages, rooms: src.rooms, room_count: src.room_count, parent_tenant_id: null,
    email_allowlist: [], phone_allowlist: [], twilio_whatsapp_number: null,
  } })

  // [3] fresh admin
  await (prisma as any).user.create({ data: {
    id: ADMIN_ID, tenant_id: NEW, email: opts.newAdmin.email, name: opts.newAdmin.name,
    role: 'admin', job_role: 'Administrator', is_active: true, email_verified: true,
    first_language: 'eng', password_hash: await bcrypt.hash(opts.newAdmin.password, 12),
  } })

  // [4] policies
  const policies = await (prisma as any).policy.findMany({ where: { tenant_id: SRC } })
  const policyMap = new Map<string, string>(); policies.forEach((p: any) => policyMap.set(p.id, randomUUID()))
  const policyRows = policies.map((p: any) => {
    const r = strip(p); const newId = policyMap.get(p.id)!
    return { ...r, id: newId, tenant_id: NEW,
      s3_key: r.s3_key ? rekey(rekey(r.s3_key, SRC, NEW)!, p.id, newId) : r.s3_key,
      pinecone_namespace: r.pinecone_namespace ? r.pinecone_namespace.split(SRC).join(NEW) : r.pinecone_namespace,
      uploaded_by: ADMIN_ID, superseded_by: null }
  })
  for (const c of chunk(policyRows, 50)) await (prisma as any).policy.createMany({ data: c })
  for (const p of policies) if (p.superseded_by && policyMap.has(p.superseded_by))
    await (prisma as any).policy.update({ where: { id: policyMap.get(p.id)! }, data: { superseded_by: policyMap.get(p.superseded_by)! } })
  summary.policies = policies.length

  // [4b] policy translations
  const ptrans = await (prisma as any).policyTranslation.findMany({ where: { tenant_id: SRC } })
  const ptransRows = ptrans.filter((t: any) => policyMap.has(t.policy_id)).map((t: any) => ({ ...strip(t), id: randomUUID(), tenant_id: NEW, policy_id: policyMap.get(t.policy_id)! }))
  if (ptransRows.length) await (prisma as any).policyTranslation.createMany({ data: ptransRows })
  summary.policy_translations = ptransRows.length

  // [5] knowledge base
  const knowledge = await (prisma as any).knowledgeEntry.findMany({ where: { tenant_id: SRC } })
  const knowMap = new Map<string, string>(); knowledge.forEach((k: any) => knowMap.set(k.id, randomUUID()))
  const knowRows = knowledge.map((k: any) => {
    const r = strip(k); const newId = knowMap.get(k.id)!
    const source_id = (r.source_type === 'policy' && r.source_id && policyMap.has(r.source_id)) ? policyMap.get(r.source_id)! : r.source_id
    return { ...r, id: newId, tenant_id: NEW, vector_id: `kb_${newId}`, source_id, approved_by: r.approved_by ? ADMIN_ID : null }
  })
  for (const c of chunk(knowRows, 200)) await (prisma as any).knowledgeEntry.createMany({ data: c })
  summary.knowledge_entries = knowledge.length

  // [6] training modules + question versions
  const modules = await (prisma as any).trainingModule.findMany({ where: { tenant_id: SRC } })
  const moduleMap = new Map<string, string>(); modules.forEach((m: any) => moduleMap.set(m.id, randomUUID()))
  const moduleRows = modules.map((m: any) => {
    const r = strip(m); const newId = moduleMap.get(m.id)!
    return { ...r, id: newId, tenant_id: NEW,
      image_key: r.image_key ? r.image_key.split(SRC).join(NEW) : r.image_key,
      illustration_key: r.illustration_key ? r.illustration_key.split(SRC).join(NEW) : r.illustration_key,
      approved_by: r.approved_by ? ADMIN_ID : null, topic_id: null,
      policy_refs: Array.isArray(r.policy_refs) ? r.policy_refs.map((x: string) => policyMap.get(x) ?? x) : r.policy_refs }
  })
  for (const c of chunk(moduleRows, 50)) await (prisma as any).trainingModule.createMany({ data: c })
  const tqv = await (prisma as any).trainingQuestionVersion.findMany({ where: { module_id: { in: modules.map((m: any) => m.id) } } })
  const tqvRows = tqv.map((v: any) => ({ ...strip(v), id: randomUUID(), module_id: moduleMap.get(v.module_id)! }))
  if (tqvRows.length) await (prisma as any).trainingQuestionVersion.createMany({ data: tqvRows })
  summary.training_modules = modules.length

  // [7] CQC question bank
  const cqc = await (prisma as any).cqcStaffQuestion.findMany({ where: { tenant_id: SRC } })
  const cqcRows = cqc.map((q: any) => ({ ...strip(q), id: randomUUID(), tenant_id: NEW }))
  if (cqcRows.length) await (prisma as any).cqcStaffQuestion.createMany({ data: cqcRows })
  summary.cqc_staff_questions = cqc.length

  // [8] onboarding flows + steps
  const flows = await (prisma as any).onboardingFlow.findMany({ where: { tenant_id: SRC } })
  const flowMap = new Map<string, string>(); flows.forEach((f: any) => flowMap.set(f.id, randomUUID()))
  if (flows.length) await (prisma as any).onboardingFlow.createMany({ data: flows.map((f: any) => ({ ...strip(f), id: flowMap.get(f.id)!, tenant_id: NEW })) })
  const steps = await (prisma as any).onboardingStep.findMany({ where: { flow_id: { in: flows.map((f: any) => f.id) } } })
  if (steps.length) await (prisma as any).onboardingStep.createMany({ data: steps.map((s: any) => ({ ...strip(s), id: randomUUID(), flow_id: flowMap.get(s.flow_id)!, policy_id: s.policy_id && policyMap.has(s.policy_id) ? policyMap.get(s.policy_id)! : s.policy_id })) })
  summary.onboarding_flows = flows.length; summary.onboarding_steps = steps.length

  // [9] S3 files
  let s3copied = 0
  for (const p of policies) {
    const newId = policyMap.get(p.id)!
    if (p.s3_key) { const dst = rekey(rekey(p.s3_key, SRC, NEW)!, p.id, newId)!; if (await copyS3(p.s3_key, dst)) s3copied++ }
    if (await copyS3(`tenants/${SRC}/extracted/${p.id}.txt`, `tenants/${NEW}/extracted/${newId}.txt`)) s3copied++
  }
  for (const m of modules) for (const k of [m.image_key, m.illustration_key])
    if (k) { if (await copyS3(k, k.split(SRC).join(NEW))) s3copied++ }
  summary.s3_objects = s3copied

  // [10] Pinecone vectors — whole-namespace bulk copy (no re-embedding)
  const remapPolicyVec = (rec: any) => {
    const us = rec.id.indexOf('_'); if (us < 0) return null
    const oldPid = rec.id.slice(0, us); const newPid = policyMap.get(oldPid); if (!newPid) return null
    return { id: newPid + rec.id.slice(us), values: rec.values, metadata: { ...(rec.metadata ?? {}), tenant_id: NEW, policy_id: newPid } }
  }
  summary.vec_policies  = await copyNamespace(nsPolicies(SRC), nsPolicies(NEW), remapPolicyVec)
  summary.vec_chapters  = await copyNamespace(nsChapters(SRC), nsChapters(NEW), remapPolicyVec)
  summary.vec_knowledge = await copyNamespace(nsKnowledge(SRC), nsKnowledge(NEW), (rec: any) => {
    const oldKid = rec.id.replace(/^kb_/, ''); const newKid = knowMap.get(oldKid); if (!newKid) return null
    return { id: `kb_${newKid}`, values: rec.values, metadata: { ...(rec.metadata ?? {}), tenant_id: NEW } }
  })

  return { new_tenant_id: NEW, admin_user_id: ADMIN_ID, admin_email: opts.newAdmin.email, summary }
}
