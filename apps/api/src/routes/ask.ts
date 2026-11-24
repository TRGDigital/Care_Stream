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
import { askPilotEnabled } from '../lib/ask-pilot'
import { AGENTS, agentById, publicAgent } from '../services/ask/agents'
import { runAgent } from '../services/ask/runner'
import { DOCUMENT_TYPES, documentType } from '../services/ask/document-types'
import * as store from '../services/ask/store'
import { ukToday } from '../lib/holiday-math'

export const askRouter = Router()
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)
const notReady = (res: Response) => err(res, 'NOT_READY', 'Ask CareStream is not switched on yet.', 503)

async function guard(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== 'admin' || (req.user as any)?.dev) { notFound(res); return }   // administrators only, never a shared tablet
    if (!(await askPilotEnabled(getTenantId()))) { notFound(res); return }
    next()
  } catch { notFound(res) }
}
askRouter.use(guard)

// A simple per person limit (per server instance, so soft): 12 questions a minute and 150 an hour.
const hits = new Map<string, number[]>()
export function rateOk(userId: string, now = Date.now()): boolean {
  const list = (hits.get(userId) ?? []).filter(t => now - t < 3_600_000)
  if (list.filter(t => now - t < 60_000).length >= 12 || list.length >= 150) { hits.set(userId, list); return false }
  list.push(now); hits.set(userId, list); return true
}

askRouter.get('/meta', async (_req, res) => {
  ok(res, { enabled: true, ready: await store.tablesReady(), agents: AGENTS.map(publicAgent), document_types: DOCUMENT_TYPES.map(t => ({ id: t.id, label: t.label, needs_approval: t.needsApproval })) })
})

askRouter.post('/chat', async (req: Request, res: Response) => {
  const tenantId = getTenantId(), userId = req.user!.sub
  const agent = agentById(String(req.body?.agent_id ?? ''))
  const message = String(req.body?.message ?? '').trim()
  if (!agent || agent.status !== 'ready') { err(res, 'INVALID', 'That agent is not available yet.', 400); return }
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
    const r = await runAgent({ agentId: agent.id, ctx: { tenantId, userId, today: ukToday() }, orgName: tenant?.name ?? 'this organisation', history, message })
    const saved = await store.addMessage(tenantId, convId, 'assistant', r.answer, r.sources)
    ok(res, { conversation_id: convId, message: { id: saved.id, role: 'assistant', content: r.answer, sources: r.sources, created_at: saved.created_at }, tools_used: r.tools_used })
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
  ok(res, { conversation: c, messages: await store.messagesOf(t, c.id) })
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
askRouter.get('/documents/:id', wrap(async (req, res) => { const d = await store.getDocument(getTenantId(), req.user!.sub, String(req.params.id)); if (!d) { notFound(res); return } ok(res, { document: d }) }))
askRouter.patch('/documents/:id', wrap(async (req, res) => {
  const title = req.body?.title != null ? String(req.body.title).trim() : undefined, body = req.body?.body != null ? String(req.body.body) : undefined
  if (!(await store.updateDocument(getTenantId(), req.user!.sub, String(req.params.id), { title, body }))) { notFound(res); return }
  ok(res, { saved: true })
}))
askRouter.delete('/documents/:id', wrap(async (req, res) => { if (!(await store.deleteDocument(getTenantId(), req.user!.sub, String(req.params.id)))) { notFound(res); return } ok(res, { deleted: true }) }))
