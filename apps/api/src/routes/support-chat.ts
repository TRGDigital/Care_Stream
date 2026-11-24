// Live support chat routes. Customer side (signed in admins of any plan): /support-chat. Platform side (the inbox, platform token): /admin/support-chat.
// All rules live in lib/support-chat.ts.

import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin, requirePlatformAdmin } from '../middleware/auth'
import { sendSupportChatNotification, sendSupportChatReplyEmail } from '../services/email/outbound'
import * as chat from '../lib/support-chat'
import { ChatError, type Deps } from '../lib/support-chat'

const deps = (): Deps => ({
  db: prisma as any,
  mail: {
    notifyTeam: o => sendSupportChatNotification(o),
    replyToCustomer: o => sendSupportChatReplyEmail(o),
  },
})

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response, next: NextFunction) => {
  try { await fn(req, res) } catch (e: any) {
    if (e instanceof ChatError) { err(res, e.code, e.message, e.status); return }
    if (/relation .*support_chat|does not exist|P2021/i.test(String(e?.message ?? ''))) { err(res, 'NOT_SET_UP', 'Live chat is not switched on yet.', 503); return }
    next(e)
  }
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export const supportChatRouter = Router()
supportChatRouter.use(requireAdmin)
const who = (req: Request) => ({ tenantId: (req as any).user.tenant_id as string, userId: (req as any).user.sub as string })

supportChatRouter.get('/status', wrap(async (req, res) => { const w = who(req); ok(res, await chat.statusFor(deps(), w.tenantId, w.userId)) }))
supportChatRouter.post('/start', wrap(async (req, res) => { const w = who(req); ok(res, await chat.startLive(deps(), w.tenantId, w.userId, req.body?.message), 201) }))
supportChatRouter.post('/offline', wrap(async (req, res) => { const w = who(req); ok(res, await chat.leaveMessage(deps(), w.tenantId, w.userId, req.body ?? {}), 201) }))
supportChatRouter.get('/:id/messages', wrap(async (req, res) => { const w = who(req); ok(res, await chat.customerMessages(deps(), w.tenantId, w.userId, String(req.params.id), req.query.after ? String(req.query.after) : undefined)) }))
supportChatRouter.post('/:id/messages', wrap(async (req, res) => { const w = who(req); ok(res, await chat.customerSend(deps(), w.tenantId, w.userId, String(req.params.id), req.body?.body), 201) }))
supportChatRouter.post('/:id/close', wrap(async (req, res) => { const w = who(req); ok(res, await chat.customerClose(deps(), w.tenantId, w.userId, String(req.params.id))) }))

// ─── Platform inbox ───────────────────────────────────────────────────────────
export const supportChatAdminRouter = Router()
supportChatAdminRouter.use(requirePlatformAdmin)

supportChatAdminRouter.get('/', wrap(async (req, res) => { ok(res, await chat.agentList(deps(), req.query.filter ? String(req.query.filter) : undefined)) }))
supportChatAdminRouter.get('/unread', wrap(async (_req, res) => { ok(res, { unread: await chat.agentUnreadChats(deps()) }) }))
supportChatAdminRouter.post('/heartbeat', wrap(async (req, res) => {
  const online = typeof req.body?.online === 'boolean' ? req.body.online : undefined
  ok(res, await chat.agentHeartbeat(deps(), req.body?.agent_key, req.body?.agent_name, online))
}))
supportChatAdminRouter.get('/:id', wrap(async (req, res) => { ok(res, await chat.agentGet(deps(), String(req.params.id), req.query.after ? String(req.query.after) : undefined)) }))
supportChatAdminRouter.post('/:id/reply', wrap(async (req, res) => { ok(res, await chat.agentReply(deps(), String(req.params.id), req.body?.body, req.body?.agent_name), 201) }))
supportChatAdminRouter.post('/:id/close', wrap(async (req, res) => { ok(res, await chat.agentClose(deps(), String(req.params.id))) }))
