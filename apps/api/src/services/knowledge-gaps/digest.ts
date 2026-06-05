// Phase C — scheduled knowledge-gap jobs:
//  1. Daily snapshot of open-gap counts (powers the trend chart).
//  2. Weekly admin digest email (gated on the knowledge_gap_digest pref).
//  3. Weekly staff "auto-refresher" nudge for anyone with open gaps.
//
// Driven by a Vercel cron (see routes/cron.ts + vercel.json) and runnable for a
// single tenant from the admin settings (manual "send now").

import sgMail from '@sendgrid/mail'
import { prisma } from '../../db/client'
import { notifyUsers, isEmailEnabled } from '../../lib/notify'
import { getKnowledgeGapData, KnowledgeGapData } from '../../lib/knowledge-gaps'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WEB_URL        = process.env.WEB_URL ?? 'https://care-stream-web.vercel.app'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  await (sgMail as any).send({ to, from, subject, html })
}

const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))

function utcMidnight(d = new Date()): Date {
  const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x
}

// ─── Daily snapshot ───────────────────────────────────────────────────────────

export async function snapshotTenant(tenantId: string, data?: KnowledgeGapData): Promise<KnowledgeGapData> {
  const d = data ?? await getKnowledgeGapData(tenantId)
  const date = utcMidnight()
  const row = {
    open_gaps:       d.summary.open_gaps,
    open_training:   d.summary.open_training,
    open_induction:  d.summary.open_induction,
    staff_with_gaps: d.summary.staff_with_gaps,
    resolved_7d:     d.summary.resolved_7d,
  }
  await (prisma as any).knowledgeGapSnapshot.upsert({
    where:  { tenant_id_date: { tenant_id: tenantId, date } },
    update: row,
    create: { tenant_id: tenantId, date, ...row },
  }).catch((e: any) => console.error('[kg/snapshot] failed for tenant', tenantId, e?.message ?? e))
  return d
}

// ─── Weekly admin digest ──────────────────────────────────────────────────────

function digestHtml(orgName: string, d: KnowledgeGapData, prevOpen: number | null): string {
  const s = d.summary
  const delta = prevOpen == null ? '' : (() => {
    const diff = s.open_gaps - prevOpen
    if (diff === 0) return `<span style="color:#6b7280">no change on last week</span>`
    return diff < 0
      ? `<span style="color:#16a34a">▼ ${Math.abs(diff)} fewer than last week</span>`
      : `<span style="color:#dc2626">▲ ${diff} more than last week</span>`
  })()

  const missed = d.top_missed.slice(0, 5).map(q => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#111827">${esc(q.question || q.topic)}
        <div style="font-size:11px;color:#6b7280">${q.source === 'training' ? 'Training' : 'Induction'} · ${esc(q.topic)} · ${q.staff_count} staff</div></td>
      <td style="padding:6px 0;text-align:right;font-size:12px;color:#dc2626;white-space:nowrap">${q.miss_count} wrong</td>
    </tr>`).join('')

  const topics = d.weak_topics.slice(0, 5).map(t =>
    `<li style="font-size:13px;color:#111827;margin:2px 0">${esc(t.topic)} <span style="color:#6b7280">— ${t.gaps} gap${t.gaps === 1 ? '' : 's'}, ${t.staff} staff</span></li>`).join('')

  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
  <h2 style="margin:0 0 4px">Knowledge gaps this week</h2>
  <p style="margin:0 0 20px;color:#6b7280">${esc(orgName)}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="padding:12px;background:#fff7ed;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#ea580c">${s.open_gaps}</div>
        <div style="font-size:11px;color:#6b7280">Open gaps</div>
        <div style="font-size:11px;margin-top:2px">${delta}</div>
      </td>
      <td style="width:8px"></td>
      <td style="padding:12px;background:#eef2ff;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#6366f1">${s.staff_with_gaps}</div>
        <div style="font-size:11px;color:#6b7280">Staff affected</div>
      </td>
      <td style="width:8px"></td>
      <td style="padding:12px;background:#f0fdf4;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#16a34a">${s.resolved_7d}</div>
        <div style="font-size:11px;color:#6b7280">Closed this week</div>
      </td>
      <td style="width:8px"></td>
      <td style="padding:12px;background:#f0fdfa;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#0d9488">${s.engaged_pct ?? 0}%</div>
        <div style="font-size:11px;color:#6b7280">Engaged with learning</div>
      </td>
    </tr>
  </table>

  ${missed ? `<h3 style="margin:0 0 6px;font-size:14px">Most-missed questions</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">${missed}</table>` : ''}

  ${topics ? `<h3 style="margin:0 0 6px;font-size:14px">Weakest topics</h3>
  <ul style="margin:0 0 20px;padding-left:18px">${topics}</ul>` : ''}

  <a href="${WEB_URL}/analytics" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">View full knowledge-gap analytics →</a>

  <p style="margin:24px 0 0;font-size:11px;color:#9ca3af">You're receiving this because the knowledge-gap digest is on for ${esc(orgName)}. Turn it off in Settings → Email preferences.</p>
</div>`
}

export async function sendTenantDigest(tenantId: string, data?: KnowledgeGapData): Promise<boolean> {
  const enabled = await isEmailEnabled(tenantId, 'knowledge_gap_digest')
  if (!enabled) return false
  const d = data ?? await getKnowledgeGapData(tenantId)
  if (d.summary.open_gaps === 0 && d.summary.resolved_7d === 0) return false // nothing worth a send

  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const admins = await (prisma as any).user.findMany({
    where:  { tenant_id: tenantId, role: { in: ['admin', 'manager'] }, is_active: true },
    select: { id: true },
  })
  if (!admins.length) return false

  const sevenAgo  = utcMidnight(new Date(Date.now() - 7 * 86_400_000))
  const prevSnap  = await (prisma as any).knowledgeGapSnapshot.findFirst({
    where: { tenant_id: tenantId, date: { lte: sevenAgo } }, orderBy: { date: 'desc' }, select: { open_gaps: true },
  }).catch(() => null)

  const html = digestHtml(tenant?.name ?? 'Your care home', d, prevSnap?.open_gaps ?? null)
  await notifyUsers(tenantId, 'knowledge_gap_digest', admins.map((a: any) => a.id), (email) =>
    sendEmail(email, `Knowledge gaps this week — ${tenant?.name ?? 'CareStream'}`, html))
  return true
}

// ─── Weekly staff auto-refresher ──────────────────────────────────────────────
// A gentle nudge to staff with open gaps to complete their hub Follow-up.

function refresherHtml(firstName: string, orgName: string, count: number): string {
  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
  <p>Hi ${esc(firstName)},</p>
  <p>You have <strong>${count} question${count === 1 ? '' : 's'}</strong> to revisit in your CareStream Follow-up. Each one comes with a short, plain-language lesson built from ${esc(orgName)}'s own policies — read it, then answer to clear it.</p>
  <p>It only takes a couple of minutes, and it keeps your training up to date.</p>
  <a href="${WEB_URL}/chat" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;margin:8px 0">Open my Follow-up →</a>
  <p style="margin-top:20px;font-size:13px;color:#6b7280">Thank you for keeping your knowledge sharp.<br/>${esc(orgName)}</p>
</div>`
}

export async function sendTenantRefreshers(tenantId: string): Promise<number> {
  const enabled = await isEmailEnabled(tenantId, 'knowledge_gap_digest')
  if (!enabled) return 0

  const [tEnr, oEnr, tenant] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, answers: { where: { is_correct: false }, select: { question_id: true } } } }),
    (prisma as any).onboardingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, progress: { where: { answer_correct: false }, select: { step_id: true } } } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])

  const count = new Map<string, number>()
  for (const e of tEnr as any[]) count.set(e.user_id, (count.get(e.user_id) ?? 0) + (e.answers?.length ?? 0))
  for (const e of oEnr as any[]) count.set(e.user_id, (count.get(e.user_id) ?? 0) + (e.progress?.length ?? 0))

  const withGaps = [...count.entries()].filter(([, n]) => n > 0)
  if (!withGaps.length) return 0

  const users = await (prisma as any).user.findMany({
    where:  { id: { in: withGaps.map(([id]) => id) }, is_active: true },
    select: { id: true, name: true, email: true },
  })
  const orgName = tenant?.name ?? 'Your care home'
  let sent = 0
  await Promise.allSettled((users as any[]).map(async u => {
    const n = count.get(u.id) ?? 0
    if (!u.email || n <= 0) return
    const first = String(u.name ?? '').split(' ')[0] || 'there'
    await sendEmail(u.email, `${n} thing${n === 1 ? '' : 's'} to revisit — ${orgName}`, refresherHtml(first, orgName, n))
    sent += 1
  }))
  return sent
}

// ─── Orchestration ────────────────────────────────────────────────────────────

// One tenant: snapshot + (optionally) digest + refreshers. Used by the admin
// "send now" action.
export async function runKnowledgeGapJobForTenant(tenantId: string, opts: { weekly: boolean } = { weekly: true }): Promise<{ digest_sent: boolean; refreshers: number }> {
  const data = await snapshotTenant(tenantId)
  if (!opts.weekly) return { digest_sent: false, refreshers: 0 }
  const [digest_sent, refreshers] = await Promise.all([
    sendTenantDigest(tenantId, data).catch(() => false),
    sendTenantRefreshers(tenantId).catch(() => 0),
  ])
  return { digest_sent, refreshers }
}

// All tenants: snapshot daily; on the weekly day, also digest + refreshers.
export async function runKnowledgeGapDailyJob(): Promise<{ tenants: number; digests: number; refreshers: number }> {
  const weekly = new Date().getUTCDay() === 1 // Monday
  const tenants = await (prisma as any).tenant.findMany({ select: { id: true } })
  let digests = 0, refreshers = 0
  for (const t of tenants as any[]) {
    try {
      const data = await snapshotTenant(t.id)
      if (weekly) {
        if (await sendTenantDigest(t.id, data).catch(() => false)) digests += 1
        refreshers += await sendTenantRefreshers(t.id).catch(() => 0)
      }
    } catch (e: any) {
      console.error('[kg/daily] tenant failed', t.id, e?.message ?? e)
    }
  }
  console.log(`[kg/daily] tenants=${tenants.length} weekly=${weekly} digests=${digests} refreshers=${refreshers}`)
  return { tenants: tenants.length, digests, refreshers }
}
