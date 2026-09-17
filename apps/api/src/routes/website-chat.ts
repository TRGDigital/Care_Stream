import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { sendLeadNotificationEmail } from '../services/email/outbound'
import { answerWebsiteQuestion } from '../services/website-chat/answer'
import { indexPath, processDueQueue, syncBatch, isIndexablePath } from '../services/website-chat/indexer'

// The website AI chat.
//
//   /public/chat/*     the widget on www.carestreamai.com (unauthenticated, rate limited)
//   /admin/ai-chat/*   the platform AI Chat tab (platform admin only)
//
// A conversation is identified by its id AND the random visitor id held in that visitor's
// browser: knowing a conversation id alone never reads or writes it.

const db = prisma as any

export const publicWebsiteChatRouter = Router()
export const websiteChatAdminRouter = Router()
websiteChatAdminRouter.use(requirePlatformAdmin)

const MAX_MESSAGES_PER_HOUR = 40
const ONLINE_WINDOW_MS = 90_000

async function settings() {
  return db.websiteChatSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } })
}

const agentOnline = (s: { agent_online_until: Date | null }) =>
  !!s.agent_online_until && new Date(s.agent_online_until).getTime() > Date.now()

const visitorId = z.string().trim().regex(/^[A-Za-z0-9_-]{8,64}$/)
const pathField = z.string().trim().max(300).optional().nullable()
  .transform(p => (p && p.startsWith('/') ? p.split('?')[0].split('#')[0] : null))

async function ownConversation(id: string, visitor: string) {
  const conv = await db.websiteChatConversation.findUnique({ where: { id } })
  return conv && conv.visitor_id === visitor ? conv : null
}

const publicMessage = (m: any) => ({
  id: m.id, role: m.role, content: m.content, sources: m.sources ?? [], created_at: m.created_at, feedback: m.feedback,
})

// ── Public: the widget ───────────────────────────────────────────────────────

// GET /public/chat/config?path= — how the assistant presents itself on this page.
publicWebsiteChatRouter.get('/config', async (req: Request, res: Response) => {
  try {
    const s = await settings()
    const path = String(req.query.path ?? '/')
    const suggested = (Array.isArray(s.suggested) ? s.suggested : []) as { prefix: string; questions: string[] }[]
    // The longest matching prefix wins, so /care-policies/x can have its own questions. "/" is the
    // fallback for every page.
    const match = suggested
      .filter(g => g && typeof g.prefix === 'string' &&
        (g.prefix === '/' || path === g.prefix || path.startsWith(g.prefix.replace(/\/?$/, '/'))))
      .sort((a, b) => b.prefix.length - a.prefix.length)[0]
    ok(res, {
      enabled: s.enabled,
      assistant_name: s.assistant_name,
      avatar_url: s.avatar_url,
      greeting: s.greeting,
      questions: (match?.questions ?? []).filter(Boolean).slice(0, 4),
      agent_online: agentOnline(s),
      agent_name: s.agent_name,
    })
  } catch (e) {
    err(res, 'CHAT_CONFIG_FAILED', 'Chat is unavailable right now.', 500)
    return
  }
  // Pages published a couple of minutes ago are refreshed on the back of a widget load. The
  // response has already gone, so the visitor never waits on it.
  processDueQueue(1).catch(() => {})
})

const messageSchema = z.object({
  visitor_id: visitorId,
  conversation_id: z.string().uuid().optional().nullable(),
  path: pathField,
  text: z.string().trim().min(1).max(1000),
})

// POST /public/chat/message — a visitor's message. Answers with a server-sent event stream when
// the AI replies, or JSON when a person has taken the conversation over.
publicWebsiteChatRouter.post('/message', async (req: Request, res: Response) => {
  const parsed = messageSchema.safeParse(req.body ?? {})
  if (!parsed.success) { err(res, 'INVALID_INPUT', 'Please type a message of up to 1,000 characters.', 400); return }
  const { visitor_id, path, text } = parsed.data

  const s = await settings()
  if (!s.enabled) { err(res, 'CHAT_DISABLED', 'Chat is not available right now.', 403); return }

  const recent = await db.websiteChatMessage.count({
    where: { role: 'visitor', created_at: { gte: new Date(Date.now() - 3600_000) }, conversation: { visitor_id } },
  })
  if (recent >= MAX_MESSAGES_PER_HOUR) {
    err(res, 'RATE_LIMITED', 'You have sent a lot of messages in a short time. Please try again later, or book a demo.', 429)
    return
  }

  let conv = parsed.data.conversation_id ? await ownConversation(parsed.data.conversation_id, visitor_id) : null
  if (!conv) {
    conv = await db.websiteChatConversation.create({
      data: { visitor_id, started_path: path, last_path: path, user_agent: String(req.headers['user-agent'] ?? '').slice(0, 400) || null },
    })
  }
  const history = await db.websiteChatMessage.findMany({
    where: { conversation_id: conv.id }, orderBy: { created_at: 'asc' }, take: 40,
    select: { role: true, content: true },
  })
  const visitorMsg = await db.websiteChatMessage.create({ data: { conversation_id: conv.id, role: 'visitor', content: text, path } })
  await db.websiteChatConversation.update({
    where: { id: conv.id },
    data: { message_count: { increment: 1 }, last_path: path ?? conv.last_path, last_message_at: new Date() },
  })

  // A person has the conversation: the AI stays out of it.
  if (conv.status === 'human') {
    ok(res, { mode: 'human', conversation_id: conv.id, message: publicMessage(visitorMsg) })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  ;(res as any).flushHeaders?.()
  const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  send({ type: 'start', conversation_id: conv.id, visitor_message_id: visitorMsg.id })

  const started = Date.now()
  try {
    const result = await answerWebsiteQuestion({
      history, question: text, path, onText: delta => send({ type: 'delta', text: delta }),
    })
    const aiMsg = await db.websiteChatMessage.create({
      data: {
        conversation_id: conv.id, role: 'ai', content: result.text, sources: result.sources,
        grounded: result.grounded, path, latency_ms: Date.now() - started,
      },
    })
    await db.websiteChatConversation.update({
      where: { id: conv.id },
      data: { message_count: { increment: 1 }, last_message_at: new Date(), ...(result.grounded ? {} : { unanswered: { increment: 1 } }) },
    })
    send({ type: 'done', message: publicMessage(aiMsg), grounded: result.grounded })
  } catch (e) {
    console.error('[website-chat] answer failed:', (e as Error)?.message)
    send({ type: 'error', error: 'Sorry, I could not answer that just now. Please try again, or use "Talk to a person".' })
  }
  res.end()
})

const visitorQuery = z.object({ visitor_id: visitorId })

// GET /public/chat/conversations/:id/messages?visitor_id=&after= — new messages since `after`,
// polled while the chat is open so a person joining, or replying, appears without a reload.
publicWebsiteChatRouter.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  const q = visitorQuery.safeParse(req.query)
  if (!q.success) { err(res, 'INVALID_INPUT', 'Missing visitor.', 400); return }
  const conv = await ownConversation(String(req.params.id), q.data.visitor_id)
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  const after = req.query.after ? new Date(String(req.query.after)) : new Date(0)
  const messages = await db.websiteChatMessage.findMany({
    where: { conversation_id: conv.id, created_at: { gt: isNaN(after.getTime()) ? new Date(0) : after } },
    orderBy: { created_at: 'asc' }, take: 50,
  })
  const s = await settings()
  ok(res, { status: conv.status, agent_online: agentOnline(s), messages: messages.map(publicMessage) })
})

// POST /public/chat/messages/:id/feedback { visitor_id, value: 1 | -1 }
publicWebsiteChatRouter.post('/messages/:id/feedback', async (req: Request, res: Response) => {
  const body = z.object({ visitor_id: visitorId, value: z.union([z.literal(1), z.literal(-1)]) }).safeParse(req.body ?? {})
  if (!body.success) { err(res, 'INVALID_INPUT', 'Invalid feedback.', 400); return }
  const msg = await db.websiteChatMessage.findUnique({ where: { id: String(req.params.id) }, include: { conversation: true } })
  if (!msg || msg.role !== 'ai' || msg.conversation.visitor_id !== body.data.visitor_id) {
    err(res, 'NOT_FOUND', 'Message not found.', 404); return
  }
  const prev = msg.feedback as number | null
  await db.websiteChatMessage.update({ where: { id: msg.id }, data: { feedback: body.data.value } })
  const inc = (v: number | null, d: number) => ({
    ...(v === 1 ? { thumbs_up: { increment: d } } : {}), ...(v === -1 ? { thumbs_down: { increment: d } } : {}),
  })
  if (prev !== body.data.value) {
    await db.websiteChatConversation.update({
      where: { id: msg.conversation_id }, data: { ...inc(prev, -1), ...inc(body.data.value, 1) },
    })
  }
  ok(res, { saved: true })
})

// POST /public/chat/conversations/:id/human { visitor_id } — "Talk to a person".
publicWebsiteChatRouter.post('/conversations/:id/human', async (req: Request, res: Response) => {
  const q = visitorQuery.safeParse(req.body ?? {})
  if (!q.success) { err(res, 'INVALID_INPUT', 'Missing visitor.', 400); return }
  const conv = await ownConversation(String(req.params.id), q.data.visitor_id)
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  const s = await settings()
  const online = agentOnline(s)
  await db.websiteChatConversation.update({ where: { id: conv.id }, data: { wants_human: true, last_message_at: new Date() } })
  if (online && !conv.wants_human) {
    await db.websiteChatMessage.create({
      data: { conversation_id: conv.id, role: 'system', content: `${s.agent_name} has been told you would like to talk. They will join this chat shortly.` },
    })
  }
  ok(res, { agent_online: online, agent_name: s.agent_name })
})

// POST /public/chat/start { visitor_id, path } — a conversation with no message yet, so "Talk to a
// person" works before anything has been typed.
publicWebsiteChatRouter.post('/start', async (req: Request, res: Response) => {
  const body = z.object({ visitor_id: visitorId, path: pathField }).safeParse(req.body ?? {})
  if (!body.success) { err(res, 'INVALID_INPUT', 'Missing visitor.', 400); return }
  const conv = await db.websiteChatConversation.create({
    data: { visitor_id: body.data.visitor_id, started_path: body.data.path, last_path: body.data.path,
            user_agent: String(req.headers['user-agent'] ?? '').slice(0, 400) || null },
  })
  ok(res, { conversation_id: conv.id })
})

const leadSchema = z.object({
  visitor_id: visitorId,
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  organisation: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
})

// POST /public/chat/conversations/:id/lead — details left for the team when nobody is online.
publicWebsiteChatRouter.post('/conversations/:id/lead', async (req: Request, res: Response) => {
  const body = leadSchema.safeParse(req.body ?? {})
  if (!body.success) { err(res, 'INVALID_INPUT', 'Please add your name and a valid email address.', 400); return }
  const conv = await ownConversation(String(req.params.id), body.data.visitor_id)
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  const d = body.data
  const transcript = (await db.websiteChatMessage.findMany({
    where: { conversation_id: conv.id, role: { in: ['visitor', 'ai', 'agent'] } }, orderBy: { created_at: 'asc' }, take: 20,
  })).map((m: any) => `${m.role === 'visitor' ? 'Visitor' : m.role === 'ai' ? 'AI' : 'Team'}: ${m.content}`).join('\n')
  const message = [d.message, transcript ? `\n\nChat so far:\n${transcript}` : ''].filter(Boolean).join('').slice(0, 5000)
  const lead = await db.marketingLead.create({
    data: {
      type: 'contact', name: d.name, email: d.email, organisation: d.organisation ?? null,
      subject: 'Website chat', message, source: 'chat',
      user_agent: String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
    },
  })
  await db.websiteChatConversation.update({
    where: { id: conv.id }, data: { visitor_name: d.name, visitor_email: d.email, lead_id: lead.id, wants_human: true },
  })
  await db.websiteChatMessage.create({
    data: { conversation_id: conv.id, role: 'system', content: `Thanks ${d.name.split(' ')[0]}, the team will reply to ${d.email}.` },
  })
  sendLeadNotificationEmail({
    type: 'contact', source: 'web', name: d.name, email: d.email, organisation: d.organisation,
    subject: 'Website chat', message,
  }).catch(e => console.error('[website-chat] lead email failed:', (e as Error)?.message))
  ok(res, { received: true })
})

// ── Admin: the platform AI Chat tab ──────────────────────────────────────────

const days = (req: Request) => Math.min(365, Math.max(1, Number(req.query.days ?? 30) || 30))

// GET /admin/ai-chat/overview?days=30
websiteChatAdminRouter.get('/overview', async (req: Request, res: Response) => {
  const since = new Date(Date.now() - days(req) * 86400_000)
  const [convs, aiMsgs, visitorMsgs, pages] = await Promise.all([
    db.websiteChatConversation.findMany({
      where: { created_at: { gte: since } },
      select: { id: true, created_at: true, message_count: true, unanswered: true, thumbs_up: true, thumbs_down: true,
                wants_human: true, lead_id: true, agent_joined_at: true, started_path: true },
    }),
    db.websiteChatMessage.findMany({
      where: { created_at: { gte: since }, role: 'ai' },
      select: { grounded: true, feedback: true, latency_ms: true, conversation_id: true, created_at: true },
    }),
    db.websiteChatMessage.count({ where: { created_at: { gte: since }, role: 'visitor' } }),
    db.websiteChatPage.groupBy({ by: ['status'], _count: { _all: true } }),
  ])
  const withMessages = convs.filter((c: any) => c.message_count > 0)
  const byDay: Record<string, { conversations: number; questions: number }> = {}
  for (const c of withMessages) {
    const k = c.created_at.toISOString().slice(0, 10)
    byDay[k] = byDay[k] ?? { conversations: 0, questions: 0 }
    byDay[k].conversations++
  }
  const startPages: Record<string, number> = {}
  for (const c of withMessages) if (c.started_path) startPages[c.started_path] = (startPages[c.started_path] ?? 0) + 1
  const answered = aiMsgs.filter((m: any) => m.grounded).length
  const up = aiMsgs.filter((m: any) => m.feedback === 1).length
  const down = aiMsgs.filter((m: any) => m.feedback === -1).length
  const latencies = aiMsgs.map((m: any) => m.latency_ms).filter((n: any) => typeof n === 'number').sort((a: number, b: number) => a - b)
  ok(res, {
    days: days(req),
    conversations: withMessages.length,
    questions: visitorMsgs,
    ai_replies: aiMsgs.length,
    answered_rate: aiMsgs.length ? answered / aiMsgs.length : null,
    unanswered: aiMsgs.length - answered,
    thumbs_up: up, thumbs_down: down,
    wanted_person: withMessages.filter((c: any) => c.wants_human).length,
    taken_over: withMessages.filter((c: any) => c.agent_joined_at).length,
    leads: withMessages.filter((c: any) => c.lead_id).length,
    median_latency_ms: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
    by_day: Object.entries(byDay).sort().map(([day, v]) => ({ day, ...v })),
    top_pages: Object.entries(startPages).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, n]) => ({ path, n })),
    index: Object.fromEntries(pages.map((p: any) => [p.status, p._count._all])),
  })
})

// GET /admin/ai-chat/unanswered?days=30 — questions the site could not answer, and ones marked
// unhelpful: the list of content still to write.
websiteChatAdminRouter.get('/unanswered', async (req: Request, res: Response) => {
  const since = new Date(Date.now() - days(req) * 86400_000)
  const replies = await db.websiteChatMessage.findMany({
    where: { created_at: { gte: since }, role: 'ai', OR: [{ grounded: false }, { feedback: -1 }] },
    orderBy: { created_at: 'desc' }, take: 200,
  })
  const out = []
  for (const r of replies) {
    const q = await db.websiteChatMessage.findFirst({
      where: { conversation_id: r.conversation_id, role: 'visitor', created_at: { lte: r.created_at } },
      orderBy: { created_at: 'desc' },
    })
    out.push({
      conversation_id: r.conversation_id, question: q?.content ?? '', answer: r.content, path: r.path,
      reason: r.feedback === -1 ? 'thumbs_down' : 'not_on_site', created_at: r.created_at,
    })
  }
  ok(res, { items: out })
})

// GET /admin/ai-chat/conversations?filter=all|live|attention&limit=50&before=ISO
websiteChatAdminRouter.get('/conversations', async (req: Request, res: Response) => {
  const filter = String(req.query.filter ?? 'all')
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50))
  const before = req.query.before ? new Date(String(req.query.before)) : null
  // A visitor who pressed "Talk to a person" before typing anything still needs to be seen.
  const where: any = { AND: [{ OR: [{ message_count: { gt: 0 } }, { wants_human: true }] }] }
  if (before && !isNaN(before.getTime())) where.last_message_at = { lt: before }
  if (filter === 'live') {
    where.last_message_at = { ...(where.last_message_at ?? {}), gte: new Date(Date.now() - 15 * 60_000) }
    where.status = { not: 'closed' }
  }
  if (filter === 'attention') where.OR = [{ wants_human: true }, { unanswered: { gt: 0 } }, { thumbs_down: { gt: 0 } }]
  const rows = await db.websiteChatConversation.findMany({ where, orderBy: { last_message_at: 'desc' }, take: limit })
  const firsts = await db.websiteChatMessage.findMany({
    where: { conversation_id: { in: rows.map((r: any) => r.id) }, role: 'visitor' },
    orderBy: { created_at: 'asc' }, distinct: ['conversation_id'], select: { conversation_id: true, content: true },
  })
  const firstBy = new Map(firsts.map((f: any) => [f.conversation_id, f.content]))
  ok(res, { conversations: rows.map((r: any) => ({ ...r, first_question: firstBy.get(r.id) ?? null })) })
})

// GET /admin/ai-chat/conversations/:id
websiteChatAdminRouter.get('/conversations/:id', async (req: Request, res: Response) => {
  const conv = await db.websiteChatConversation.findUnique({
    where: { id: String(req.params.id) }, include: { messages: { orderBy: { created_at: 'asc' } } },
  })
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  ok(res, { conversation: conv })
})

// POST /admin/ai-chat/conversations/:id/takeover — a person joins and the AI stops replying.
websiteChatAdminRouter.post('/conversations/:id/takeover', async (req: Request, res: Response) => {
  const s = await settings()
  const conv = await db.websiteChatConversation.findUnique({ where: { id: String(req.params.id) } })
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  if (conv.status !== 'human') {
    await db.websiteChatConversation.update({ where: { id: conv.id }, data: { status: 'human', agent_joined_at: new Date(), last_message_at: new Date() } })
    await db.websiteChatMessage.create({ data: { conversation_id: conv.id, role: 'system', content: `${s.agent_name} from CareStream has joined the chat.` } })
  }
  ok(res, { status: 'human' })
})

// POST /admin/ai-chat/conversations/:id/handback — the AI answers again.
websiteChatAdminRouter.post('/conversations/:id/handback', async (req: Request, res: Response) => {
  const s = await settings()
  const conv = await db.websiteChatConversation.findUnique({ where: { id: String(req.params.id) } })
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  await db.websiteChatConversation.update({ where: { id: conv.id }, data: { status: 'ai', wants_human: false } })
  await db.websiteChatMessage.create({ data: { conversation_id: conv.id, role: 'system', content: `${s.agent_name} has left the chat. The CareStream assistant will answer from here.` } })
  ok(res, { status: 'ai' })
})

// POST /admin/ai-chat/conversations/:id/messages { text } — a reply from the person who took over.
websiteChatAdminRouter.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  const body = z.object({ text: z.string().trim().min(1).max(4000) }).safeParse(req.body ?? {})
  if (!body.success) { err(res, 'INVALID_INPUT', 'Type a message.', 400); return }
  const conv = await db.websiteChatConversation.findUnique({ where: { id: String(req.params.id) } })
  if (!conv) { err(res, 'NOT_FOUND', 'Conversation not found.', 404); return }
  if (conv.status !== 'human') {
    const s = await settings()
    await db.websiteChatConversation.update({ where: { id: conv.id }, data: { status: 'human', agent_joined_at: new Date() } })
    await db.websiteChatMessage.create({ data: { conversation_id: conv.id, role: 'system', content: `${s.agent_name} from CareStream has joined the chat.` } })
  }
  const msg = await db.websiteChatMessage.create({ data: { conversation_id: conv.id, role: 'agent', content: body.data.text } })
  await db.websiteChatConversation.update({ where: { id: conv.id }, data: { message_count: { increment: 1 }, last_message_at: new Date() } })
  ok(res, { message: msg })
})

// POST /admin/ai-chat/presence { online } — heartbeat from the AI Chat tab while "I'm online" is on.
websiteChatAdminRouter.post('/presence', async (req: Request, res: Response) => {
  const online = req.body?.online === true
  const s = await db.websiteChatSettings.upsert({
    where: { id: 'default' },
    update: { agent_online_until: online ? new Date(Date.now() + ONLINE_WINDOW_MS) : null },
    create: { id: 'default', agent_online_until: online ? new Date(Date.now() + ONLINE_WINDOW_MS) : null },
  })
  const waiting = await db.websiteChatConversation.count({
    where: { wants_human: true, status: 'ai', last_message_at: { gte: new Date(Date.now() - 30 * 60_000) } },
  })
  ok(res, { online: agentOnline(s), waiting })
})

// GET / PUT /admin/ai-chat/settings
websiteChatAdminRouter.get('/settings', async (_req: Request, res: Response) => {
  ok(res, { settings: await settings() })
})

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  assistant_name: z.string().trim().min(1).max(60).optional(),
  avatar_url: z.string().trim().max(1000).nullable().optional(),
  greeting: z.string().trim().min(1).max(600).optional(),
  agent_name: z.string().trim().min(1).max(60).optional(),
  suggested: z.array(z.object({ prefix: z.string().trim().startsWith('/').max(200), questions: z.array(z.string().trim().max(120)).max(4) })).max(50).optional(),
})
websiteChatAdminRouter.put('/settings', async (req: Request, res: Response) => {
  const body = settingsSchema.safeParse(req.body ?? {})
  if (!body.success) { err(res, 'INVALID_INPUT', 'Check the settings and try again.', 400); return }
  const s = await db.websiteChatSettings.upsert({ where: { id: 'default' }, update: body.data, create: { id: 'default', ...body.data } })
  ok(res, { settings: s })
})

// GET /admin/ai-chat/index — every page the chat knows, and its state.
websiteChatAdminRouter.get('/index', async (_req: Request, res: Response) => {
  const pages = await db.websiteChatPage.findMany({ orderBy: [{ section: 'asc' }, { path: 'asc' }] })
  ok(res, { pages })
})

// POST /admin/ai-chat/index/sync { offset, limit, force } — one batch of a full sync. The tab
// calls it repeatedly until `next` is null.
websiteChatAdminRouter.post('/index/sync', async (req: Request, res: Response) => {
  const offset = Math.max(0, Number(req.body?.offset ?? 0) || 0)
  const limit = Math.min(40, Math.max(1, Number(req.body?.limit ?? 20) || 20))
  try {
    ok(res, await syncBatch(offset, limit, req.body?.force === true))
  } catch (e: any) {
    err(res, 'SYNC_FAILED', e?.message ?? 'Sync failed', 500)
  }
})

// POST /admin/ai-chat/index/page { path } — re-read one page now.
websiteChatAdminRouter.post('/index/page', async (req: Request, res: Response) => {
  const path = String(req.body?.path ?? '').trim()
  if (!isIndexablePath(path)) { err(res, 'INVALID_INPUT', 'That page cannot be indexed.', 400); return }
  ok(res, { result: await indexPath(path, { force: true }) })
})

// POST /admin/ai-chat/index/queue — process pages queued by recent publishes.
websiteChatAdminRouter.post('/index/queue', async (_req: Request, res: Response) => {
  ok(res, { results: await processDueQueue(10) })
})
