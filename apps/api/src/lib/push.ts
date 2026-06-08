// Web-push send path — the in-hub replacement for the WhatsApp nudge.
// Best-effort and additive: callers also keep their WhatsApp/email fallback for now,
// since push only reaches staff who installed the PWA and opted in.

import webpush from 'web-push'
import { prisma } from '../db/client'

let configured: boolean | null = null
function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@carestreamai.com'
  if (!pub || !priv) { configured = false; return false }
  try { webpush.setVapidDetails(subject, pub, priv); configured = true } catch { configured = false }
  return configured
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string }

// Push to every subscribed device for the given users. Prunes dead subscriptions
// (404/410). Never throws — returns how many devices were notified.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (!userIds.length || !ensureConfigured()) return 0
  const subs = await (prisma as any).pushSubscription.findMany({ where: { user_id: { in: userIds } } }).catch(() => [])
  if (!subs.length) return 0

  const body = JSON.stringify({ url: '/chat', ...payload })
  const dead: string[] = []
  let sent = 0

  await Promise.all((subs as any[]).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body)
      sent++
    } catch (e: any) {
      const code = e?.statusCode
      if (code === 404 || code === 410) dead.push(s.id)   // gone — prune
    }
  }))

  if (dead.length) await (prisma as any).pushSubscription.deleteMany({ where: { id: { in: dead } } }).catch(() => {})
  return sent
}
