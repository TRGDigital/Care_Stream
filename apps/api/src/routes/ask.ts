// Ask CareStream. Mounted at /ask after requireAuth. Pilot account and administrators only: anyone else gets a plain 404 so the feature does not show itself.
//   GET  /meta                          the agents (ready, shell, soon) and whether the storage is set up
//   POST /chat                          { agent_id, conversation_id?, message } -> the answer, its sources, and the conversation
//   GET/PATCH/DELETE /conversations...  the person's own chats
//   GET/POST/PATCH/DELETE /documents... the person's saved library
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { PlanLimitError } from '../lib/plan-limits'
import { askRoleFor } from '../lib/ask-pilot'
import { managerMayReach, agentForManager, type AskRole } from '../services/ask/manager-access'
import { managersMayUseMoney } from '../services/ask/funding-bridge'
import { AGENTS, agentById, publicAgent } from '../services/ask/agents'
import { runAgent } from '../services/ask/runner'
import { resolveContext, type ContextLookups } from '../services/ask/page-context'
import { DOCUMENT_TYPES, documentType } from '../services/ask/document-types'
import * as store from '../services/ask/store'
import { ukToday } from '../lib/holiday-math'
import { writeAuditLog } from '../lib/audit'
import { render as renderLetter, validate as validateLetter, getTemplate as letterTemplate } from '../services/letters'
import { needsApproval, canEdit, canSubmit, canApprove, canReturn, canReopen, canShare, sharesFor, SHARE_METHODS, type ShareMethod } from '../services/ask-docs/workflow'
import { pdfFor, emailLetter, emailReportToAdmins, shareAsNotification } from '../services/ask-docs/share'
import { lintReport } from '../services/ask/report-templates'
import { loadStaff } from '../services/ask/data'
import { lintNewsletter } from '../services/ask-docs/newsletter-templates'
import { askActionsRouter } from './ask-actions'
import * as actionStore from '../services/ask/actions/store'
import { buildCard } from '../services/ask/actions/card'
import { loadAskSettings } from '../services/ask/actions/settings'

export const askRouter = Router()
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)
const notReady = (res: Response) => err(res, 'NOT_READY', 'Ask CareStream is not switched on yet.', 503)

async function guard(req: Request, res: Response, next: NextFunction) {
  try {
    const role = await askRoleFor(getTenantId(), req.user as any)   // administrators; deciding managers only when the account allows it; never a shared tablet
    if (!role) { notFound(res); return }
    if (role === 'manager' && !managerMayReach(req.method, req.path)) { notFound(res); return }
    ;(req as any).askRole = role
    next()
  } catch { notFound(res) }
}
const roleOf = (req: Request): AskRole => ((req as any).askRole as AskRole) ?? 'admin'
askRouter.use(guard)
askRouter.use('/actions', askActionsRouter)

// A simple per person limit (per server instance, so soft): 12 questions a minute and 150 an hour.
const hits = new Map<string, number[]>()
export function rateOk(userId: string, now = Date.now()): boolean {
  const list = (hits.get(userId) ?? []).filter(t => now - t < 3_600_000)
  if (list.filter(t => now - t < 60_000).length >= 12 || list.length >= 150) { hits.set(userId, list); return false }
  list.push(now); hits.set(userId, list); return true
}

askRouter.get('/meta', async (req, res) => {
  const manager = roleOf(req) === 'manager'
  const moneyOk = manager ? await managersMayUseMoney(getTenantId()) : true
  ok(res, { enabled: true, role: roleOf(req), ready: await store.tablesReady(), agents: AGENTS.filter(a => !manager || a.status !== 'ready' || agentForManager(a.tools, moneyOk)).map(publicAgent), document_types: DOCUMENT_TYPES.map(t => ({ id: t.id, label: t.label, needs_approval: t.needsApproval })) })
})

const contextLookups: ContextLookups = {
  staffInTenant: async (tenantId, userId) => (await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true, is_shared: false }, select: { id: true, name: true } })) ?? null,
  residentInTenant: async (tenantId, residentId) => !!(await (prisma as any).resident.findFirst({ where: { id: residentId, tenant_id: tenantId }, select: { id: true } })),
}

askRouter.post('/chat', async (req: Request, res: Response) => {
  const tenantId = getTenantId(), userId = req.user!.sub
  const agent = agentById(String(req.body?.agent_id ?? ''))
  const message = String(req.body?.message ?? '').trim()
  if (!agent || agent.status !== 'ready') { err(res, 'INVALID', 'That agent is not available yet.', 400); return }
  if (roleOf(req) === 'manager' && !agentForManager(agent.tools, await managersMayUseMoney(tenantId))) { notFound(res); return }
  if (!message) { err(res, 'INVALID', 'Please type a question.', 400); return }
  if (!rateOk(userId)) { err(res, 'TOO_MANY', 'You are asking quickly. Please wait a moment and try again.', 429); return }
  try {
    if (!(await store.tablesReady())) { notReady(res); return }
    let convId = String(req.body?.conversation_id ?? '')
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (convId) {
      const c = await store.getConversation(tenantId, userId, convId)
      if (!c || c.agent_id !== agent.id) { notFound(res); return }
      history = (await store.messagesOf(tenantId, convId)).map(m => ({ role: m.role, content: m.content }))
    } else convId = await store.createConversation(tenantId, userId, agent.id, message.slice(0, 80))
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    await store.addMessage(tenantId, convId, 'user', message)
    const pageContext = await resolveContext(tenantId, req.body?.context, contextLookups)   // a pointer only: account checked, labels built here, never the browser's words
    const mgr = roleOf(req) === 'manager'
    const r = await runAgent({ agentId: agent.id, ctx: { tenantId, userId, today: ukToday(), role: roleOf(req), moneyOk: mgr ? await managersMayUseMoney(tenantId) : true }, orgName: tenant?.name ?? 'this organisation', history, message, pageContext, conversationId: convId })
    const saved = await store.addMessage(tenantId, convId, 'assistant', r.answer, r.sources)
    // Any proposals the agent made are tied to this answer and returned as cards (nothing has been done: the administrator confirms on the card).
    let actions: any[] = []
    if (r.proposals.length) {
      await actionStore.linkToMessage(tenantId, r.proposals, saved.id, convId).catch(() => undefined)
      const settings = await loadAskSettings(tenantId)
      for (const id of r.proposals) { const a = await actionStore.getProposal(tenantId, id); if (a) actions.push(await buildCard(tenantId, a, settings)) }
    }
    ok(res, { conversation_id: convId, message: { id: saved.id, role: 'assistant', content: r.answer, sources: r.sources, created_at: saved.created_at }, actions, tools_used: r.tools_used })
  } catch (e: any) {
    if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return }
    if (store.notReady(e)) { notReady(res); return }
    console.error('[ask] run failed:', String(e?.message ?? e).slice(0, 200))
    err(res, 'ERROR', 'Something went wrong working that out. Please try again.', 500)
  }
})

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await fn(req, res) } catch (e: any) { if (store.notReady(e)) notReady(res); else err(res, 'ERROR', 'Something went wrong.', 500) }
}
askRouter.get('/conversations', wrap(async (req, res) => { ok(res, { conversations: await store.listConversations(getTenantId(), req.user!.sub) }) }))
askRouter.get('/conversations/:id', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, c = await store.getConversation(t, u, String(req.params.id))
  if (!c) { notFound(res); return }
  const settings = await loadAskSettings(t)
  const actions: any[] = []
  try { for (const a of await actionStore.forConversation(t, u, c.id)) actions.push({ message_id: a.message_id, card: await buildCard(t, a, settings) }) } catch { /* the actions table is not there yet */ }
  ok(res, { conversation: c, messages: await store.messagesOf(t, c.id), actions })
}))
askRouter.patch('/conversations/:id', wrap(async (req, res) => {
  const title = String(req.body?.title ?? '').trim()
  if (!title) { err(res, 'INVALID', 'Please give it a name.', 400); return }
  if (!(await store.renameConversation(getTenantId(), req.user!.sub, String(req.params.id), title))) { notFound(res); return }
  ok(res, { renamed: true })
}))
askRouter.delete('/conversations/:id', wrap(async (req, res) => { if (!(await store.deleteConversation(getTenantId(), req.user!.sub, String(req.params.id)))) { notFound(res); return } ok(res, { deleted: true }) }))

askRouter.get('/documents', wrap(async (req, res) => { ok(res, { documents: await store.listDocuments(getTenantId(), req.user!.sub) }) }))
askRouter.post('/documents', wrap(async (req, res) => {
  const type = documentType(String(req.body?.type ?? 'answer'))?.id ?? 'answer'
  const title = String(req.body?.title ?? '').trim() || 'Saved answer', body = String(req.body?.body ?? '').trim()
  if (!body) { err(res, 'INVALID', 'There is nothing to save.', 400); return }
  ok(res, { id: await store.saveDocument(getTenantId(), req.user!.sub, { type, title, body, data: req.body?.sources ? { sources: req.body.sources } : undefined }) }, 201)
}))
// ── The library: saved answers (private) and letters and newsletters (shared between the account's administrators, with an approval step) ─────────────────────────────────────────────
const audit = (req: Request, event: Parameters<typeof writeAuditLog>[0]['event_type'], id: string, meta: Record<string, unknown> = {}) => void writeAuditLog({ tenant_id: getTenantId(), user_id: req.user!.sub, event_type: event, entity_type: 'ask_document', entity_id: id, metadata: meta })

async function actionsFor(d: NonNullable<Awaited<ReturnType<typeof store.getDocumentFor>>>, actor: string) {
  if (!needsApproval(d.type)) return { edit: true, submit: false, approve: false, return: false, reopen: false, share: [] as ShareMethod[], needs_approval: false }
  const admins = await store.countActiveAdmins(getTenantId())
  return {
    needs_approval: true,
    edit: canEdit(d, actor).ok, submit: canSubmit(d, actor).ok && (d.type !== 'letter' || validateLetter(String(d.data?.template_id ?? ''), d.data?.values ?? {}).ok),
    approve: canApprove(d, actor, admins, true).ok, return: canReturn(d, actor, admins).ok, reopen: canReopen(d).ok,
    share: canShare(d).ok ? sharesFor(d.type, d.data) : ([] as ShareMethod[]),
  }
}

askRouter.get('/approvals', wrap(async (req, res) => { ok(res, { approvals: (await store.listPendingApprovals(getTenantId())).map(x => ({ ...x, mine: x.created_by === req.user!.sub })) }) }))

askRouter.get('/documents/:id', wrap(async (req, res) => {
  const d = await store.getDocumentFor(getTenantId(), req.user!.sub, String(req.params.id)); if (!d) { notFound(res); return }
  const checklist = d.type === 'letter' ? (d.data?.before_you_send ?? []) : d.type === 'newsletter' || d.type === 'report' ? (d.data?.checklist ?? []) : []
  ok(res, { document: { ...d, mine: d.created_by === req.user!.sub, checklist, references: d.data?.references ?? [], internal_only: d.type === 'report' ? d.data?.internal_only === true : undefined, shared: d.data?.shared ?? [], staff_name: d.data?.staff_name ?? null, values: d.type === 'letter' ? d.data?.values ?? {} : undefined, fields: d.type === 'letter' ? letterTemplate(String(d.data?.template_id ?? ''))?.fields.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required, choices: f.choices ?? null })) : undefined, actions: await actionsFor(d, req.user!.sub) } })
}))

askRouter.patch('/documents/:id', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const title = req.body?.title != null ? String(req.body.title).trim() : undefined
  if (!needsApproval(d.type)) {
    const body = req.body?.body != null ? String(req.body.body) : undefined
    if (!(await store.updateDocument(t, u, id, { title, body }))) { notFound(res); return }
    ok(res, { saved: true }); return
  }
  const v = canEdit(d, u); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (d.type === 'letter' && req.body?.values && typeof req.body.values === 'object') {
    const tpl = String(d.data?.template_id ?? '')
    const values: Record<string, unknown> = { ...(d.data?.values ?? {}) }
    for (const [k, x] of Object.entries(req.body.values as Record<string, unknown>)) if (/^[a-z0-9_]{1,60}$/i.test(k) && (typeof x === 'string' || typeof x === 'number')) values[k] = x
    const r = renderLetter(tpl, values)
    await store.updateDocumentContent(t, id, { title, body: r.text, data: { ...d.data, values } })
    audit(req, 'ask_document_edited', id, { type: d.type })
    ok(res, { saved: true, missing: r.missing, unreadable: r.invalid.map(i => i.label), body: r.text }); return
  }
  const body = req.body?.body != null ? String(req.body.body) : undefined
  if (d.type === 'newsletter' && (body || title)) { const problems = lintNewsletter(`${title ?? d.title}\n${body ?? d.body}`); if (problems.length) { err(res, 'RULES', `Not saved. ${problems.join(' ')}`, 400); return } }
  if (d.type === 'report') {
    // A governance report is checked again on every save. Shareable means no named people and no pay; internal only may name people but can never be sent to staff.
    const internal = typeof req.body?.internal_only === 'boolean' ? req.body.internal_only : d.data?.internal_only === true
    const problems = lintReport(`${title ?? d.title}\n${body ?? d.body}`, { staffNames: (await loadStaff(t)).map(s => s.name), internalOnly: internal })
    if (problems.length) { err(res, 'RULES', `Not saved. ${problems.join(' ')}`, 400); return }
    await store.updateDocumentContent(t, id, { title, body, data: { ...d.data, internal_only: internal } })
    audit(req, 'ask_document_edited', id, { type: d.type, internal_only: internal })
    ok(res, { saved: true }); return
  }
  await store.updateDocumentContent(t, id, { title, body })
  audit(req, 'ask_document_edited', id, { type: d.type })
  ok(res, { saved: true })
}))

askRouter.post('/documents/:id/submit', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canSubmit(d, u); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (d.type === 'letter') { const c = validateLetter(String(d.data?.template_id ?? ''), d.data?.values ?? {}); if (!c.ok) { err(res, 'INCOMPLETE', `The letter is not finished: ${[...c.missing, ...c.invalid.map(i => i.label)].join(', ')}.`, 409); return } }
  if (!(await store.setDocumentStatus(t, id, ['draft'], 'pending'))) { err(res, 'NOT_ALLOWED', 'It has already been submitted.', 409); return }
  audit(req, 'ask_document_submitted', id, { type: d.type }); ok(res, { status: 'pending' })
}))

askRouter.post('/documents/:id/approve', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canApprove(d, u, await store.countActiveAdmins(t), req.body?.checklist_confirmed === true); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (!(await store.setDocumentStatus(t, id, ['pending'], 'approved', u))) { err(res, 'NOT_ALLOWED', 'It is no longer waiting for approval.', 409); return }
  audit(req, 'ask_document_approved', id, { type: d.type, by_author: d.created_by === u }); ok(res, { status: 'approved' })
}))

askRouter.post('/documents/:id/return', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canReturn(d, u, await store.countActiveAdmins(t)); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (!(await store.setDocumentStatus(t, id, ['pending'], 'draft'))) { err(res, 'NOT_ALLOWED', 'It is no longer waiting for approval.', 409); return }
  const note = String(req.body?.note ?? '').trim().slice(0, 300)
  if (note) await store.updateDocumentContent(t, id, { data: { ...d.data, review_note: { note, by: u, at: new Date().toISOString() } } })
  audit(req, 'ask_document_returned', id, { type: d.type }); ok(res, { status: 'draft' })
}))

askRouter.post('/documents/:id/reopen', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canReopen(d); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (!(await store.setDocumentStatus(t, id, ['approved', 'shared'], 'draft'))) { err(res, 'NOT_ALLOWED', 'It cannot be re-opened.', 409); return }
  audit(req, 'ask_document_reopened', id, { type: d.type }); ok(res, { status: 'draft' })
}))

askRouter.get('/documents/:id/pdf', wrap(async (req, res) => {
  const t = getTenantId(), d = await store.getDocumentFor(t, req.user!.sub, String(req.params.id)); if (!d) { notFound(res); return }
  const v = canShare(d); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  try {
    const { buffer, filename } = await pdfFor(t, d, req.query.sign === '1' ? req.user!.sub : null)   // MY signature only when I ask for it
    audit(req, 'ask_document_pdf_downloaded', d.id, { type: d.type })
    await store.appendShareRecord(t, d.id, { method: 'pdf', by: req.user!.sub, at: new Date().toISOString() }); await store.setDocumentStatus(t, d.id, ['approved'], 'shared')
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`)
    res.send(buffer)
  } catch (e: any) { err(res, 'PDF_FAILED', 'The PDF could not be made just now. Please try again.', 500) }
}))

askRouter.post('/documents/:id/share', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canShare(d); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  const method = String(req.body?.method ?? '') as ShareMethod
  if (!SHARE_METHODS.includes(method) || method === 'pdf' || !sharesFor(d.type, d.data).includes(method)) { err(res, 'INVALID', 'Choose email or notification.', 400); return }
  try {
    if (method === 'email') {
      const r = d.type === 'report' ? await emailReportToAdmins({ tenantId: t, actorId: u, doc: d }) : await emailLetter({ tenantId: t, actorId: u, doc: d, signerUserId: req.body?.sign === true ? u : null })
      if (!(d.type === 'report' ? (r as any).sent > 0 : (r as any).sent)) { err(res, 'NOT_SENT', (r as any).reason ?? 'It could not be emailed.', 409); return }
    } else {
      const r = await shareAsNotification({ tenantId: t, actorId: u, doc: d, audience: req.body?.audience, userIds: req.body?.user_ids, signerUserId: req.body?.sign === true ? u : null })
      if (!r.ok) { err(res, r.code, r.message, r.status); return }
    }
    await store.appendShareRecord(t, id, { method, by: u, at: new Date().toISOString() }); await store.setDocumentStatus(t, id, ['approved'], 'shared')
    audit(req, method === 'email' ? 'ask_document_shared_email' : 'ask_document_shared_notification', id, { type: d.type }); ok(res, { shared: true, method })
  } catch (e: any) { console.error('[ask] share failed:', String(e?.message ?? e).slice(0, 160)); err(res, 'SHARE_FAILED', 'It could not be shared just now. Please try again.', 500) }
}))

askRouter.delete('/documents/:id', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d) { notFound(res); return }
  if (needsApproval(d.type) && (d.status !== 'draft' || d.created_by !== u)) { err(res, 'NOT_ALLOWED', 'Only the author can delete a draft. Submitted, approved and shared documents are kept as a record.', 409); return }
  if (!(await store.deleteDocument(t, u, d.id))) { notFound(res); return }
  ok(res, { deleted: true })
}))
