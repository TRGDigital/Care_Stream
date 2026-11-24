// Live support chat: the rules, in one place, with the database and the email sender passed in so they can be tested without either.
// Customers (signed in admins of any plan) talk to the team in a chat window; the team answers from the platform inbox. When nobody is online the
// customer leaves a message instead, which is stored as an offline conversation, emailed to the team, and answered by email from the inbox.

import { withinSupportHours, supportOnline, stillWaiting, hoursText, nextOpeningText, closedMessage } from './support-chat-hours'

export const BODY_MAX = 4000
export const CUSTOMER_PER_MINUTE = 20
export const NOTIFY_THROTTLE_MS = 10 * 60_000

export interface Mailer {
  notifyTeam: (o: { kind: 'live' | 'offline'; customerName: string; customerEmail: string; reference: string; homeName: string; plan: string; message: string; chatId: string }) => Promise<void>
  replyToCustomer: (o: { to: string; customerName: string; agentName: string; reply: string; original: string }) => Promise<void>
}
export interface Deps { db: any; mail: Mailer; now?: () => Date }
const clock = (d: Deps) => (d.now ? d.now() : new Date())

export class ChatError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}

/** Plain text only: control characters out, line breaks kept, trimmed, limited. */
export function cleanBody(v: unknown, max = BODY_MAX): string {
  return String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, max)
}
const cleanLine = (v: unknown, max: number) => cleanBody(v, max).replace(/\s*\n\s*/g, ' ')

// A small per person limit on how fast messages can be sent. In memory: enough to stop a stuck loop; each server instance counts for itself.
const sent = new Map<string, number[]>()
export function tooFast(userId: string, nowMs: number): boolean {
  const recent = (sent.get(userId) ?? []).filter(t => nowMs - t < 60_000)
  if (recent.length >= CUSTOMER_PER_MINUTE) { sent.set(userId, recent); return true }
  recent.push(nowMs); sent.set(userId, recent); return false
}
export const resetRateLimit = () => sent.clear()

// ─── Who is asking ─────────────────────────────────────────────────────────────
export async function customerFor(db: any, tenantId: string, userId: string) {
  const [tenant, user] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, account_number: true, tier: true, plan_id: true } }),
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ])
  let plan = ''
  try { if (tenant?.plan_id) plan = (await db.plan.findUnique({ where: { id: tenant.plan_id }, select: { name: true } }))?.name ?? '' } catch { /* no plan table row */ }
  if (!plan) plan = tenant?.tier === 'training_only' ? 'Training licences' : tenant?.tier === 'free' ? 'Free' : (tenant?.tier ?? '')
  return { name: user?.name ?? '', email: user?.email ?? '', reference: tenant?.account_number ?? '', home: tenant?.name ?? '', plan }
}

// ─── Is the team online ────────────────────────────────────────────────────────
export async function teamOnline(d: Deps): Promise<boolean> {
  const rows = await d.db.supportAgentPresence.findMany({})
  return supportOnline(rows, clock(d))
}

export async function statusFor(d: Deps, tenantId: string, userId: string) {
  const now = clock(d)
  const [online, chat] = await Promise.all([teamOnline(d), d.db.supportChat.findFirst({ where: { tenant_id: tenantId, user_id: userId, status: { not: 'closed' } }, orderBy: { last_message_at: 'desc' } })])
  return {
    online, in_hours: withinSupportHours(now), hours_text: hoursText(), next_open: withinSupportHours(now) ? null : nextOpeningText(now), closed: closedMessage(now),
    chat: chat ? chatDto(chat, online, now) : null,
  }
}

function chatDto(c: any, online: boolean, now: Date) {
  return { id: c.id, status: c.status, mode: c.mode, agent_online: online, still_waiting: online && stillWaiting(c, now), created_at: c.created_at }
}
const messageDto = (m: any) => ({ id: m.id, sender: m.sender, sender_name: m.sender_name, body: m.body, created_at: m.created_at })

// ─── Customer side ─────────────────────────────────────────────────────────────
async function team(d: Deps, chat: any, kind: 'live' | 'offline', message: string) {
  const now = clock(d)
  if (chat.notified_at && now.getTime() - new Date(chat.notified_at).getTime() < NOTIFY_THROTTLE_MS) return   // one email per chat per ten minutes
  await d.db.supportChat.update({ where: { id: chat.id }, data: { notified_at: now } })
  try {
    await d.mail.notifyTeam({ kind, customerName: chat.customer_name, customerEmail: chat.customer_email, reference: chat.customer_reference, homeName: chat.home_name, plan: chat.plan, message, chatId: chat.id })
  } catch (e: any) { console.error('[support-chat] team email failed:', String(e?.message ?? e).slice(0, 160)) }   // the chat itself is saved; a mail problem must not lose it
}

async function addMessage(d: Deps, chatId: string, sender: 'customer' | 'agent' | 'system', senderName: string, body: string) {
  return d.db.supportChatMessage.create({ data: { chat_id: chatId, sender, sender_name: senderName, body } })
}

/** The customer's own chat, or a 404: another home's chat is never revealed. */
async function ownChat(d: Deps, tenantId: string, userId: string, chatId: string) {
  const chat = await d.db.supportChat.findFirst({ where: { id: chatId, tenant_id: tenantId, user_id: userId } })
  if (!chat) throw new ChatError(404, 'NOT_FOUND', 'That chat was not found.')
  return chat
}

export async function startLive(d: Deps, tenantId: string, userId: string, messageRaw: unknown) {
  const now = clock(d)
  const body = cleanBody(messageRaw)
  if (!body) throw new ChatError(400, 'INVALID', 'Please type your question.')
  if (tooFast(userId, now.getTime())) throw new ChatError(429, 'RATE_LIMITED', 'You are sending messages very quickly. Please wait a moment.')
  const open = await d.db.supportChat.findFirst({ where: { tenant_id: tenantId, user_id: userId, mode: 'live', status: { in: ['open', 'waiting'] } }, orderBy: { last_message_at: 'desc' } })
  if (!open && !(await teamOnline(d))) throw new ChatError(409, 'AWAY', 'The team is not online right now.')
  const c = await customerFor(d.db, tenantId, userId)
  const chat = open ?? await d.db.supportChat.create({ data: {
    tenant_id: tenantId, user_id: userId, customer_name: c.name, customer_email: c.email, customer_reference: c.reference, home_name: c.home, plan: c.plan,
    status: 'waiting', mode: 'live', last_message_at: now,
  } })
  const msg = await addMessage(d, chat.id, 'customer', c.name || 'Customer', body)
  const updated = await d.db.supportChat.update({ where: { id: chat.id }, data: { last_message_at: now, last_customer_message_at: now, status: 'waiting', customer_last_read_at: now } })
  await team(d, updated, 'live', body)
  return { chat: chatDto(updated, true, now), message: messageDto(msg) }
}

export async function customerSend(d: Deps, tenantId: string, userId: string, chatId: string, bodyRaw: unknown) {
  const now = clock(d)
  const chat = await ownChat(d, tenantId, userId, chatId)
  if (chat.status === 'closed') throw new ChatError(409, 'CLOSED', 'This chat has ended. Please start a new one.')
  const body = cleanBody(bodyRaw)
  if (!body) throw new ChatError(400, 'INVALID', 'Please type a message.')
  if (tooFast(userId, now.getTime())) throw new ChatError(429, 'RATE_LIMITED', 'You are sending messages very quickly. Please wait a moment.')
  const msg = await addMessage(d, chat.id, 'customer', chat.customer_name || 'Customer', body)
  const updated = await d.db.supportChat.update({ where: { id: chat.id }, data: { last_message_at: now, last_customer_message_at: now, status: 'waiting', customer_last_read_at: now } })
  await team(d, updated, updated.mode === 'offline' ? 'offline' : 'live', body)
  return { chat: chatDto(updated, await teamOnline(d), now), message: messageDto(msg) }
}

/** Leave details and a message: any time (the team is away, or nobody answered the live chat). */
export async function leaveMessage(d: Deps, tenantId: string, userId: string, o: { message: unknown; name?: unknown; email?: unknown; chat_id?: unknown }) {
  const now = clock(d)
  const body = cleanBody(o.message)
  if (!body) throw new ChatError(400, 'INVALID', 'Please tell us what you need help with.')
  const email = cleanLine(o.email, 200)
  if (o.email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ChatError(400, 'INVALID', 'That email address does not look right.')
  if (tooFast(userId, now.getTime())) throw new ChatError(429, 'RATE_LIMITED', 'You are sending messages very quickly. Please wait a moment.')
  const c = await customerFor(d.db, tenantId, userId)
  const details = { customer_name: cleanLine(o.name, 120) || c.name, customer_email: email || c.email }
  let chat: any
  if (o.chat_id) {
    // Someone who waited in a live chat and gave up: the same conversation becomes an offline one, so the team sees everything said so far.
    const existing = await ownChat(d, tenantId, userId, String(o.chat_id))
    if (existing.status === 'closed') throw new ChatError(409, 'CLOSED', 'This chat has ended.')
    chat = await d.db.supportChat.update({ where: { id: existing.id }, data: { mode: 'offline', status: 'waiting', ...details } })
    await addMessage(d, chat.id, 'system', '', 'The customer left their details to be answered later.')
  } else {
    chat = await d.db.supportChat.create({ data: {
      tenant_id: tenantId, user_id: userId, ...details, customer_reference: c.reference, home_name: c.home, plan: c.plan, status: 'waiting', mode: 'offline', last_message_at: now,
    } })
  }
  const msg = await addMessage(d, chat.id, 'customer', details.customer_name || 'Customer', body)
  chat = await d.db.supportChat.update({ where: { id: chat.id }, data: { last_message_at: now, last_customer_message_at: now, customer_last_read_at: now } })
  await team(d, chat, 'offline', body)
  return { chat: chatDto(chat, false, now), message: messageDto(msg) }
}

export async function customerMessages(d: Deps, tenantId: string, userId: string, chatId: string, after?: string) {
  const now = clock(d)
  const chat = await ownChat(d, tenantId, userId, chatId)
  const when = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : null
  const rows = await d.db.supportChatMessage.findMany({ where: { chat_id: chat.id, ...(when ? { created_at: { gt: when } } : {}) }, orderBy: { created_at: 'asc' }, take: 200 })
  if (rows.length) await d.db.supportChat.update({ where: { id: chat.id }, data: { customer_last_read_at: now } })
  const online = await teamOnline(d)
  return { chat: chatDto(chat, online, now), messages: rows.map(messageDto) }
}

export async function customerClose(d: Deps, tenantId: string, userId: string, chatId: string) {
  const chat = await ownChat(d, tenantId, userId, chatId)
  if (chat.status === 'closed') return { chat: chatDto(chat, false, clock(d)) }
  const now = clock(d)
  await addMessage(d, chat.id, 'system', '', 'The customer ended the chat.')
  const updated = await d.db.supportChat.update({ where: { id: chat.id }, data: { status: 'closed', closed_at: now, last_message_at: now } })
  return { chat: chatDto(updated, false, now) }
}

// ─── Platform side (the inbox) ─────────────────────────────────────────────────
const FILTERS: Record<string, any> = {
  live:    { mode: 'live', status: { in: ['open', 'waiting'] } },
  waiting: { status: 'waiting' },
  offline: { mode: 'offline', status: { in: ['waiting', 'answered'] } },
  closed:  { status: 'closed' },
}

export async function agentList(d: Deps, filter?: string) {
  const where = FILTERS[String(filter ?? '')] ?? { status: { not: 'closed' } }
  const chats = await d.db.supportChat.findMany({ where, orderBy: { last_message_at: 'desc' }, take: 100 })
  const unread = await unreadCounts(d, chats)
  const online = await teamOnline(d)
  const now = clock(d)
  return { online, in_hours: withinSupportHours(now), hours_text: hoursText(), chats: chats.map((c: any) => ({ ...adminChatDto(c), unread: unread.get(c.id) ?? 0 })) }
}

async function unreadCounts(d: Deps, chats: any[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!chats.length) return out
  const msgs = await d.db.supportChatMessage.findMany({ where: { chat_id: { in: chats.map(c => c.id) }, sender: 'customer' }, select: { chat_id: true, created_at: true } })
  const readAt = new Map<string, number>(chats.map(c => [c.id, c.last_agent_read_at ? new Date(c.last_agent_read_at).getTime() : 0]))
  for (const m of msgs) if (new Date(m.created_at).getTime() > (readAt.get(m.chat_id) ?? 0)) out.set(m.chat_id, (out.get(m.chat_id) ?? 0) + 1)
  return out
}

/** The number on the sidebar badge: chats whose customer message nobody has read yet. */
export async function agentUnreadChats(d: Deps): Promise<number> {
  const chats = await d.db.supportChat.findMany({ where: { status: { not: 'closed' } }, select: { id: true, last_agent_read_at: true, last_customer_message_at: true }, take: 200 })
  return chats.filter((c: any) => c.last_customer_message_at && (!c.last_agent_read_at || new Date(c.last_customer_message_at) > new Date(c.last_agent_read_at))).length
}

const adminChatDto = (c: any) => ({
  id: c.id, tenant_id: c.tenant_id, status: c.status, mode: c.mode, customer_name: c.customer_name, customer_email: c.customer_email, customer_reference: c.customer_reference,
  home_name: c.home_name, plan: c.plan, created_at: c.created_at, last_message_at: c.last_message_at, last_customer_message_at: c.last_customer_message_at, closed_at: c.closed_at,
})

export async function agentGet(d: Deps, chatId: string, after?: string) {
  const chat = await d.db.supportChat.findUnique({ where: { id: chatId } })
  if (!chat) throw new ChatError(404, 'NOT_FOUND', 'That chat was not found.')
  const when = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : null
  const rows = await d.db.supportChatMessage.findMany({ where: { chat_id: chat.id, ...(when ? { created_at: { gt: when } } : {}) }, orderBy: { created_at: 'asc' }, take: 500 })
  await d.db.supportChat.update({ where: { id: chat.id }, data: { last_agent_read_at: clock(d) } })
  return { chat: adminChatDto(chat), messages: rows.map(messageDto) }
}

export async function agentReply(d: Deps, chatId: string, bodyRaw: unknown, agentNameRaw: unknown) {
  const now = clock(d)
  const chat = await d.db.supportChat.findUnique({ where: { id: chatId } })
  if (!chat) throw new ChatError(404, 'NOT_FOUND', 'That chat was not found.')
  if (chat.status === 'closed') throw new ChatError(409, 'CLOSED', 'This chat is closed.')
  const body = cleanBody(bodyRaw)
  if (!body) throw new ChatError(400, 'INVALID', 'Please type a reply.')
  const agent = cleanLine(agentNameRaw, 60) || 'CareStream support'
  const msg = await addMessage(d, chat.id, 'agent', agent, body)
  const offline = chat.mode === 'offline'
  const updated = await d.db.supportChat.update({ where: { id: chat.id }, data: {
    last_message_at: now, last_agent_message_at: now, last_agent_read_at: now, status: offline ? 'answered' : 'open', assigned_to: chat.assigned_to ?? agent,
  } })
  let emailed = false
  if (offline && chat.customer_email) {
    const first = await d.db.supportChatMessage.findFirst({ where: { chat_id: chat.id, sender: 'customer' }, orderBy: { created_at: 'asc' } })
    try {
      await d.mail.replyToCustomer({ to: chat.customer_email, customerName: chat.customer_name, agentName: agent, reply: body, original: first?.body ?? '' })
      emailed = true
    } catch (e: any) { console.error('[support-chat] reply email failed:', String(e?.message ?? e).slice(0, 160)) }
  }
  return { chat: adminChatDto(updated), message: messageDto(msg), emailed }
}

export async function agentClose(d: Deps, chatId: string) {
  const chat = await d.db.supportChat.findUnique({ where: { id: chatId } })
  if (!chat) throw new ChatError(404, 'NOT_FOUND', 'That chat was not found.')
  const now = clock(d)
  if (chat.status !== 'closed') await addMessage(d, chat.id, 'system', '', 'The team closed this chat.')
  const updated = await d.db.supportChat.update({ where: { id: chat.id }, data: { status: 'closed', closed_at: chat.closed_at ?? now, last_message_at: now } })
  return { chat: adminChatDto(updated) }
}

/** The inbox page calls this every 30 seconds while it is open and visible. online is only changed when it is given (the toggle). */
export async function agentHeartbeat(d: Deps, agentKeyRaw: unknown, agentNameRaw: unknown, online?: boolean) {
  const key = cleanLine(agentKeyRaw, 80) || 'platform'
  const name = cleanLine(agentNameRaw, 60)
  const now = clock(d)
  const row = await d.db.supportAgentPresence.upsert({
    where: { agent_key: key },
    create: { agent_key: key, agent_name: name, online: online ?? false, last_seen_at: now },
    update: { agent_name: name || undefined, last_seen_at: now, ...(online === undefined ? {} : { online }) },
  })
  return { online: !!row.online, team_online: await teamOnline(d), in_hours: withinSupportHours(now) }
}
