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
import { pdfFor, emailLetter, emailReportToAdmins, shareAsNotification, shareInHub } from '../services/ask-docs/share'
import { DRAFT_STAMP } from '../services/ask-docs/render-doc'
import { planShare, summaryLine } from '../services/ask-docs/share-plan'
import { readShareIntent, checkShareIntent, channelsFor, describeIntent, defaultNeedsAcknowledgement } from '../services/ask-docs/share-intent'
import { sharesOfDocument, withdraw as withdrawLetter, isMissingTable as lettersMissing } from '../lib/staff-letters'
import { withdrawNotification } from '../lib/notification-withdraw'
import { lintReport } from '../services/ask/report-templates'
import { loadStaff } from '../services/ask/data'
import { lintForTemplate } from '../services/ask/newsletter-tools'
import { NEWSLETTER_TEMPLATES, newsletterMenu } from '../services/ask-docs/newsletter-templates'
import { askActionsRouter } from './ask-actions'
import { askUploadsRouter } from './ask-uploads'
import * as uploadStore from '../services/ask/uploads/store'
import * as actionStore from '../services/ask/actions/store'
import { buildCard } from '../services/ask/actions/card'
import { loadAskSettings } from '../services/ask/actions/settings'
import { eligibleStaff } from '../services/ask/actions/recipients'
import { notifySubmitted, notifyDecided } from '../services/ask-docs/approver-notify'
import { realDeps as approverDeps } from '../services/ask-docs/approver-deps'

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
askRouter.use('/uploads', askUploadsRouter)   // files attached to a chat: administrators only (ask-uploads.ts)

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
    // A draft the agent saved is shown in the chat as its DESIGNED version: it travels with the message as a source entry that names the document.
    const withDrafts = [...r.sources, ...r.documents.map(d => ({ label: `Draft ${d.type}`, as_of: null, document_id: d.id, doc_type: d.type }))]
    const saved = await store.addMessage(tenantId, convId, 'assistant', r.answer, withDrafts as any)
    // Any proposals the agent made are tied to this answer and returned as cards (nothing has been done: the administrator confirms on the card).
    let actions: any[] = []
    if (r.proposals.length) {
      await actionStore.linkToMessage(tenantId, r.proposals, saved.id, convId).catch(() => undefined)
      const settings = await loadAskSettings(tenantId)
      for (const id of r.proposals) { const a = await actionStore.getProposal(tenantId, id); if (a) actions.push(await buildCard(tenantId, a, settings)) }
    }
    ok(res, { conversation_id: convId, message: { id: saved.id, role: 'assistant', content: r.answer, sources: withDrafts, created_at: saved.created_at }, actions, tools_used: r.tools_used })
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
askRouter.delete('/conversations/:id', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  if (!(await store.getConversation(t, u, id))) { notFound(res); return }
  await uploadStore.removeForConversation(t, u, id).catch(() => undefined)   // a deleted chat takes its uploaded files with it (the person's own chat only)
  if (!(await store.deleteConversation(t, u, id))) { notFound(res); return }
  ok(res, { deleted: true })
}))

// The staff newsletter library for the template picker: categories, types and each layout's sections (what each one is, which are filled from your records). Static, no account data.
askRouter.get('/newsletter-templates', wrap(async (_req, res) => { ok(res, { categories: newsletterMenu(), templates: NEWSLETTER_TEMPLATES.map(t => ({ id: t.id, type: t.type, layout: t.layout, title: t.title, heads_up: t.heads_up, sections: t.sections.map(x => ({ key: x.key, title: x.title, from_data: x.from_data, needs_ticks: x.needs_ticks })) })) }) }))
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

askRouter.get('/approvals', wrap(async (req, res) => {
  // can_approve: the same rule as approving (not your own, unless you are the only administrator), so the badge only counts what this person can act on.
  const list = await store.listPendingApprovals(getTenantId()), admins = await store.countActiveAdmins(getTenantId())
  const approvals = list.map(x => ({ ...x, mine: x.created_by === req.user!.sub, can_approve: canApprove({ type: x.type, status: 'pending', created_by: x.created_by }, req.user!.sub, admins, true).ok }))
  ok(res, { approvals, waiting_for_me: approvals.filter(a => a.can_approve).length })
}))

askRouter.get('/documents/:id', wrap(async (req, res) => {
  const d = await store.getDocumentFor(getTenantId(), req.user!.sub, String(req.params.id)); if (!d) { notFound(res); return }
  const checklist = d.type === 'letter' ? (d.data?.before_you_send ?? []) : d.type === 'newsletter' || d.type === 'report' ? (d.data?.checklist ?? []) : []
  const hubShares = d.type === 'letter' ? await sharesOfDocument(getTenantId(), d.id).catch(() => []) : []
  const intent = d.type === 'letter' ? readShareIntent(d.data?.share_intent) : null
  const ackDefault = d.type === 'letter' ? defaultNeedsAcknowledgement(String(d.data?.template_id ?? ''), d.data?.values ?? {}) : undefined
  ok(res, { document: { ...d, share_intent: intent, share_intent_text: d.type === 'letter' ? describeIntent(intent) : undefined, ack_default: ackDefault, hub_shares: hubShares.map(h => ({ id: h.id, person: h.person_name, shared_at: h.shared_at, read_at: h.read_at, needs_acknowledgement: h.needs_acknowledgement, acknowledged_at: h.acknowledged_at, withdrawn_at: h.withdrawn_at, signed: h.signed })), mine: d.created_by === req.user!.sub, checklist, references: d.data?.references ?? [], internal_only: d.type === 'report' ? d.data?.internal_only === true : undefined, shared: d.data?.shared ?? [], staff_name: d.data?.staff_name ?? null, values: d.type === 'letter' ? d.data?.values ?? {} : undefined, fields: d.type === 'letter' ? letterTemplate(String(d.data?.template_id ?? ''))?.fields.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required, choices: f.choices ?? null })) : undefined, actions: await actionsFor(d, req.user!.sub) } })
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
  if (d.type === 'newsletter' && (body || title)) { const problems = await lintForTemplate(`${title ?? d.title}\n${body ?? d.body}`, (d.data as any)?.template_id ?? null); if (problems.length) { err(res, 'RULES', `Not saved. ${problems.join(' ')}`, 400); return } }
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
  audit(req, 'ask_document_submitted', id, { type: d.type })
  // One notice to the other approvers for this submit (never for an edit). A failure here never undoes the submit.
  const told = await notifySubmitted(approverDeps, { tenantId: t, docId: id, type: d.type, authorId: u })
  if (told.notified) audit(req, 'ask_approver_notified', id, { type: d.type, recipients: told.notified, emailed: told.emailed })
  ok(res, { status: 'pending', approvers_notified: told.notified })
}))

askRouter.post('/documents/:id/approve', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canApprove(d, u, await store.countActiveAdmins(t), req.body?.checklist_confirmed === true); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (!(await store.setDocumentStatus(t, id, ['pending'], 'approved', u))) { err(res, 'NOT_ALLOWED', 'It is no longer waiting for approval.', 409); return }
  audit(req, 'ask_document_approved', id, { type: d.type, by_author: d.created_by === u })
  const told = await notifyDecided(approverDeps, { tenantId: t, type: d.type, authorId: d.created_by, deciderId: u, decision: 'approved' })
  if (told.notified) audit(req, 'ask_author_notified', id, { type: d.type, decision: 'approved', emailed: told.emailed })
  ok(res, { status: 'approved' })
}))

askRouter.post('/documents/:id/return', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canReturn(d, u, await store.countActiveAdmins(t)); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  if (!(await store.setDocumentStatus(t, id, ['pending'], 'draft'))) { err(res, 'NOT_ALLOWED', 'It is no longer waiting for approval.', 409); return }
  const note = String(req.body?.note ?? '').trim().slice(0, 300)
  if (note) await store.updateDocumentContent(t, id, { data: { ...d.data, review_note: { note, by: u, at: new Date().toISOString() } } })
  audit(req, 'ask_document_returned', id, { type: d.type, has_note: !!note })
  // Sent back by someone else: the author is told. If the author withdrew it themselves there is nothing to tell.
  const told = await notifyDecided(approverDeps, { tenantId: t, type: d.type, authorId: d.created_by, deciderId: u, decision: 'returned' })
  if (told.notified) audit(req, 'ask_author_notified', id, { type: d.type, decision: 'returned', emailed: told.emailed })
  ok(res, { status: 'draft' })
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
  // HOUSE RULE: an administrator can always Save PDF or Print. A document that is not approved yet comes out as a DRAFT COPY, stamped on every page, and nothing is recorded as shared.
  const v = canShare(d), draft = !v.ok
  if (draft && req.query.draft !== '1') { err(res, 'NOT_ALLOWED', v.ok ? '' : v.reason, 409); return }
  try {
    const lay = { orientation: req.query.orientation === 'landscape' ? 'landscape' as const : req.query.orientation === 'portrait' ? 'portrait' as const : undefined, pages: req.query.pages === 'two' ? 'two' as const : req.query.pages === 'one' ? 'one' as const : undefined }
    const { buffer, filename } = await pdfFor(t, d, req.query.sign === '1' ? req.user!.sub : null, req.user!.sub, draft ? DRAFT_STAMP : undefined, lay)   // MY signature only when I ask for it
    if (draft) audit(req, 'ask_document_draft_copy', d.id, { type: d.type, format: 'pdf' })
    else { audit(req, 'ask_document_pdf_downloaded', d.id, { type: d.type }); await store.appendShareRecord(t, d.id, { method: 'pdf', by: req.user!.sub, at: new Date().toISOString() }); await store.setDocumentStatus(t, d.id, ['approved'], 'shared') }
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`)
    res.send(buffer)
  } catch (e: any) {
    // HOUSE RULE 10: a newsletter that will not fit one page at a readable size is never silently shrunk or cut; the screen asks what to do.
    if (e?.code === 'TOO_LONG') { res.status(422).json({ success: false, error: { code: 'TOO_LONG', message: 'This newsletter is too long for one page at a readable size. Switch to landscape, shorten it, or (Detailed layout) allow two pages.', details: { orientation: e.fit?.orientation ?? 'portrait', can_allow_two_pages: !!e.fit?.canAllowTwoPages, scale: e.fit?.scale ?? null } } }); return }
    err(res, 'PDF_FAILED', 'The PDF could not be made just now. Please try again.', 500)
  }
}))

// Saves HOW a letter is to be shared (in their hub, by email, print only, or hub and email). The Letters agent asks the administrator and saves the answer; the document panel shows and edits it.
// Print only is exclusive: the letter stays with the administrator and the staff member never sees it.
askRouter.post('/documents/:id/share-intent', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  if (d.type !== 'letter') { err(res, 'INVALID', 'Only a letter has a share choice.', 400); return }
  const c = checkShareIntent(readShareIntent(req.body))
  if (!c.ok) { err(res, 'INVALID', c.reason, 400); return }
  if (!(await store.setShareIntent(t, id, c.intent))) { err(res, 'NOT_ALLOWED', 'The choice could not be changed.', 409); return }
  audit(req, 'ask_document_share_intent_set', id, { type: d.type, hub: c.intent.hub, email: c.intent.email, print_only: c.intent.print_only })
  ok(res, { share_intent: c.intent, share_intent_text: describeIntent(c.intent) })
}))

askRouter.post('/documents/:id/share', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  const v = canShare(d); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  const method = String(req.body?.method ?? '') as ShareMethod | 'now'
  const sign = req.body?.sign === true
  // 'now' = share by the choice saved on the letter (hub and or email). Print only has nothing to share: it is downloaded and printed from the library.
  const channels: Array<'email' | 'notification' | 'hub'> = []
  if (method === 'now') {
    if (d.type !== 'letter') { err(res, 'INVALID', 'Only a letter has a saved share choice.', 400); return }
    const c = checkShareIntent(readShareIntent(d.data?.share_intent))
    if (!c.ok) { err(res, 'INVALID', c.reason, 409); return }
    const list = channelsFor(c.intent)
    if (!list.length) { err(res, 'INVALID', 'This letter is print only. Download it from here and print it: nothing is shared with the staff member.', 409); return }
    channels.push(...list)
  } else {
    if (!SHARE_METHODS.includes(method as ShareMethod) || method === 'pdf' || !sharesFor(d.type, d.data).includes(method as ShareMethod)) { err(res, 'INVALID', 'Choose the hub, email or notification.', 400); return }
    // A letter marked print only is never put in the hub, emailed or sent as a notification.
    if (d.type === 'letter' && d.data?.share_intent?.print_only === true) { err(res, 'NOT_ALLOWED', 'This letter is marked print only, so it is not shared. Change how it is shared first.', 409); return }
    channels.push(method as 'email' | 'notification' | 'hub')
  }
  try {
    const done: string[] = []
    for (const ch of channels) {
      if (ch === 'email') {
        const r = d.type === 'report' ? await emailReportToAdmins({ tenantId: t, actorId: u, doc: d }) : await emailLetter({ tenantId: t, actorId: u, doc: d, signerUserId: sign ? u : null })
        if (!(d.type === 'report' ? (r as any).sent > 0 : (r as any).sent)) { err(res, 'NOT_SENT', (r as any).reason ?? 'It could not be emailed.', 409); return }
        audit(req, 'ask_document_shared_email', id, { type: d.type })
      } else if (ch === 'hub') {
        const r = await shareInHub({ tenantId: t, actorId: u, doc: d, signerUserId: sign ? u : null, needsAcknowledgement: typeof req.body?.needs_acknowledgement === 'boolean' ? req.body.needs_acknowledgement : undefined })
        if (!r.ok) { err(res, r.code ?? 'NOT_SHARED', r.reason, r.code === 'NOT_SET_UP' ? 503 : 409); return }
        void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'staff_letter_shared', entity_type: 'staff_letter', entity_id: r.letter_id, metadata: { document_id: id, needs_acknowledgement: r.needs_acknowledgement, signed: sign } })
      } else {
        const r = await shareAsNotification({ tenantId: t, actorId: u, doc: d, audience: req.body?.audience, userIds: req.body?.user_ids, signerUserId: sign ? u : null })
        if (!r.ok) { err(res, r.code, r.message, r.status); return }
        audit(req, 'ask_document_shared_notification', id, { type: d.type })
      }
      done.push(ch)
      await store.appendShareRecord(t, id, { method: ch, by: u, at: new Date().toISOString() })
    }
    await store.setDocumentStatus(t, id, ['approved'], 'shared')
    ok(res, { shared: true, method, channels: done })
  } catch (e: any) { console.error('[ask] share failed:', String(e?.message ?? e).slice(0, 160)); err(res, 'SHARE_FAILED', 'It could not be shared just now. Please try again.', 500) }
}))

// HOUSE RULE 5, DISTRIBUTION CHOICE. Step 1: the plan. Checks how and who, counts the people (names for ten or fewer) and applies the Ask settings limits and the approval rule. Sends NOTHING.
// Step 2: the send, only with confirm: true, and only for a plan that is allowed (it is worked out again here, never trusted from the browser). Chat text can never reach this.
async function planFor(req: any, d: any) {
  const t = getTenantId()
  const [people, settings, last] = await Promise.all([eligibleStaff(t), loadAskSettings(t), store.lastSendAt(t, req.user!.sub)])
  return planShare(d, { how: req.body?.how, who: req.body?.who, user_ids: req.body?.user_ids }, people, { max_recipients: settings.max_recipients, min_gap_minutes: settings.min_gap_minutes, emails_enabled: settings.emails_enabled }, { lastShareAt: last })
}
askRouter.post('/documents/:id/share-plan', wrap(async (req, res) => {
  const t = getTenantId(), d = await store.getDocumentFor(t, req.user!.sub, String(req.params.id)); if (!d) { notFound(res); return }
  const plan = await planFor(req, d)
  audit(req, 'ask_share_planned', d.id, { type: d.type, who: plan.who, how: plan.how, count: plan.count, ok: plan.ok })
  ok(res, { plan, summary: summaryLine(plan) })
}))
askRouter.post('/documents/:id/share-send', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d) { notFound(res); return }
  if (req.body?.confirm !== true) { err(res, 'CONFIRM_REQUIRED', 'Nothing was sent. Check the summary and press Send to confirm.', 400); return }
  const plan = await planFor(req, d)
  if (!plan.ok) { err(res, 'NOT_ALLOWED', plan.blockers[0] ?? 'This cannot be sent.', 409); return }
  const sign = req.body?.sign === true
  try {
    const done: string[] = []
    for (const ch of plan.channels) {
      if (ch === 'email') {
        const r = await emailLetter({ tenantId: t, actorId: u, doc: d, signerUserId: sign ? u : null })
        if (!(r as any).sent) { err(res, 'NOT_SENT', (r as any).reason ?? 'It could not be emailed.', 409); return }
      } else if (ch === 'hub') {
        const r = await shareInHub({ tenantId: t, actorId: u, doc: d, signerUserId: sign ? u : null, needsAcknowledgement: typeof req.body?.needs_acknowledgement === 'boolean' ? req.body.needs_acknowledgement : undefined })
        if (!r.ok) { err(res, r.code ?? 'NOT_SHARED', r.reason, r.code === 'NOT_SET_UP' ? 503 : 409); return }
        void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'staff_letter_shared', entity_type: 'staff_letter', entity_id: r.letter_id, metadata: { document_id: id, needs_acknowledgement: r.needs_acknowledgement, signed: sign } })
      } else {
        const r = await shareAsNotification({ tenantId: t, actorId: u, doc: d, audience: plan.audience ?? 'selected', userIds: plan.user_ids, signerUserId: sign ? u : null, email: plan.notification_email })
        if (!r.ok) { err(res, r.code, r.message, r.status); return }
      }
      done.push(ch)
      await store.appendShareRecord(t, id, { method: ch, by: u, at: new Date().toISOString() })
    }
    await store.setDocumentStatus(t, id, ['approved'], 'shared')
    audit(req, 'ask_share_confirmed', id, { type: d.type, who: plan.who, how: plan.how, count: plan.count, channels: done.join(',') })   // counts and kinds only, never names or content
    ok(res, { sent: true, count: plan.count, channels: done })
  } catch (e: any) { console.error('[ask] share-send failed:', String(e?.message ?? e).slice(0, 160)); err(res, 'SHARE_FAILED', 'It could not be sent just now. Please try again.', 500) }
}))

// Who has the letter in their hub, and taking one back. Withdrawing removes it (and its hub notification) from the person's hub; the record stays here, with the withdrawal logged.
askRouter.post('/documents/:id/hub-shares/:letterId/withdraw', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, id = String(req.params.id)
  const d = await store.getDocumentFor(t, u, id); if (!d || d.type !== 'letter') { notFound(res); return }
  try {
    const w = await withdrawLetter(t, String(req.params.letterId), u)
    if (!w || w.document_id !== id) { err(res, 'NOT_FOUND', 'That shared letter was not found, or it has already been withdrawn.', 404); return }
    if (w.notification_id) await withdrawNotification(t, u, w.notification_id).catch(() => undefined)
    void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'staff_letter_withdrawn', entity_type: 'staff_letter', entity_id: w.id, metadata: { document_id: id } })
    ok(res, { withdrawn: true })
  } catch (e) { lettersMissing(e) ? err(res, 'NOT_SET_UP', 'Letters in the hub are not switched on yet.', 503) : err(res, 'ERROR', 'Could not withdraw it.', 500) }
}))

askRouter.delete('/documents/:id', wrap(async (req, res) => {
  const t = getTenantId(), u = req.user!.sub, d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d) { notFound(res); return }
  if (needsApproval(d.type) && (d.status !== 'draft' || d.created_by !== u)) { err(res, 'NOT_ALLOWED', 'Only the author can delete a draft. Submitted, approved and shared documents are kept as a record.', 409); return }
  if (!(await store.deleteDocument(t, u, d.id))) { notFound(res); return }
  ok(res, { deleted: true })
}))
