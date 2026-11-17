// Staff incentive emails to the people taking part. Three messages, each sent to people one at a time (nobody sees anyone
// else's address or points) and recorded in incentive_notifications so nothing is ever sent twice:
//
//   launch   when a care manager approves the incentive: what it is, how to earn points, what the rewards are
//   points   new points earned: at most one email per person per day, so it is a summary and never a flood
//   result   when the incentive ends: the winners are congratulated, everyone else is thanked, and a new one is promised
//
// If the incentive_notifications table has not been created yet nothing is sent and nothing breaks.

import { prisma } from '../../db/client'
import { siteUrl } from '../../lib/urls'
import { isArchivedEmail } from '../../lib/user-email'
import { sendIncentiveEmail } from '../email/outbound'
import { launchMail, plural, pointsMail, thanksMail, winnerMail } from './content'
import { campaignPeople, targetFor } from './engine'

const db = prisma as any
const DAY_MS = 20 * 60 * 60 * 1000   // a little under a day, so a daily job never skips a person
const link = () => `${siteUrl()}/chat?view=my-incentives`

async function ready(): Promise<boolean> {
  try { await db.incentiveNotification.findFirst({ select: { id: true } }); return true } catch { return false }
}

/** Claim the right to send one email. False means it has already been sent (or is being sent). */
async function claim(tenantId: string, campaignId: string, userId: string, kind: string, ref: string): Promise<boolean> {
  try { await db.incentiveNotification.create({ data: { tenant_id: tenantId, campaign_id: campaignId, user_id: userId, kind, ref } }); return true } catch { return false }
}
async function release(campaignId: string, userId: string, kind: string, ref: string) {
  await db.incentiveNotification.deleteMany({ where: { campaign_id: campaignId, user_id: userId, kind, ref } }).catch(() => {})
}

interface Person { id: string; name: string; email: string }

/** Current, non agency people on the incentive who have a usable email address. */
async function recipients(tenantId: string, campaign: any, participants: any[]): Promise<Person[]> {
  const people = (await campaignPeople(tenantId, campaign, participants)).filter(p => p.is_active)
  if (!people.length) return []
  const rows = await db.user.findMany({ where: { id: { in: people.map(p => p.id) } }, select: { id: true, name: true, email: true } })
  return (rows as any[]).filter(u => u.email && !isArchivedEmail(u.email)).map(u => ({ id: u.id, name: u.name ?? '', email: u.email }))
}

async function sendTo(person: Person, tenantId: string, campaignId: string, kind: string, ref: string, orgName: string, mail: { subject: string; heading: string; body: string; buttonLabel?: string; to?: string }) {
  if (!(await claim(tenantId, campaignId, person.id, kind, ref))) return
  try {
    await sendIncentiveEmail({ to: [person.email], subject: mail.subject, heading: mail.heading, body: mail.body, buttonLabel: mail.buttonLabel ?? 'See my incentives', link: mail.to ?? link(), orgName })
  } catch (e) {
    console.error('[incentives] email failed', kind, e)
    await release(campaignId, person.id, kind, ref)   // try again next time
  }
}

async function inBatches<T>(items: T[], fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += 8) await Promise.all(items.slice(i, i + 8).map(fn))
}

async function load(tenantId: string, campaignId: string) {
  const [campaign, rewards, rules, participants, tenant] = await Promise.all([
    db.incentiveCampaign.findFirst({ where: { id: campaignId, tenant_id: tenantId } }),
    db.incentiveReward.findMany({ where: { campaign_id: campaignId }, orderBy: { position: 'asc' } }),
    db.incentiveRule.findMany({ where: { campaign_id: campaignId } }),
    db.incentiveParticipant.findMany({ where: { campaign_id: campaignId } }),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])
  return { campaign, rewards: rewards as any[], rules: rules as any[], participants: participants as any[], org: (tenant?.name as string) ?? 'your home' }
}

/** When an incentive goes live: tell everyone it applies to. */
export async function notifyLaunch(tenantId: string, campaignId: string): Promise<void> {
  if (!(await ready())) return
  const { campaign, rewards, rules, participants, org } = await load(tenantId, campaignId)
  if (!campaign || campaign.status !== 'live') return
  const mail = launchMail({ name: campaign.name, month: campaign.month, rules, rewards })
  const people = await recipients(tenantId, campaign, participants)
  await inBatches(people, p => sendTo(p, tenantId, campaignId, 'launch', '', org, mail))
}

/** New points: one summary email per person, at most once a day. Safe to call as often as you like. */
export async function notifyPoints(tenantId: string, campaignId: string): Promise<void> {
  if (!(await ready())) return
  const { campaign, rewards, participants, org } = await load(tenantId, campaignId)
  if (!campaign || campaign.status !== 'live') return
  const ledger = await db.incentiveLedger.findMany({ where: { campaign_id: campaignId }, select: { user_id: true, label: true, points: true, created_at: true }, orderBy: { created_at: 'asc' } })
  const people = await recipients(tenantId, campaign, participants)
  const now = Date.now()
  await inBatches(people, async p => {
    const mine = (ledger as any[]).filter(l => l.user_id === p.id)
    if (!mine.length) return
    const last = await db.incentiveNotification.findFirst({ where: { campaign_id: campaignId, user_id: p.id, kind: 'points' }, orderBy: { sent_at: 'desc' } })
    const fresh = last ? mine.filter(l => +l.created_at > +last.sent_at) : mine
    if (!fresh.length) return
    if (last && now - +last.sent_at < DAY_MS) return
    const total = mine.reduce((n, l) => n + l.points, 0)
    const targets = rewards.map(r => ({ title: r.title, target: targetFor(r, participants, p.id) })).sort((a, b) => a.target - b.target)
    const next = targets.find(t => t.target > total)
    const mail = pointsMail({ name: campaign.name, total, fresh, next: next ?? null })
    await sendTo(p, tenantId, campaignId, 'points', String(+fresh[fresh.length - 1].created_at), org, mail)
  })
}

/** When an incentive ends: congratulate the winners, thank everyone else, and say a new one is coming. */
export async function notifyResults(tenantId: string, campaignId: string): Promise<void> {
  if (!(await ready())) return
  const { campaign, rewards, participants, org } = await load(tenantId, campaignId)
  if (!campaign || campaign.status !== 'ended') return
  const [claims, ledger] = await Promise.all([
    db.incentiveClaim.findMany({ where: { campaign_id: campaignId, status: { in: ['held', 'approved', 'given'] } } }),
    db.incentiveLedger.findMany({ where: { campaign_id: campaignId }, select: { user_id: true, points: true } }),
  ])
  const people = await recipients(tenantId, campaign, participants)
  await inBatches(people, async p => {
    const won = (claims as any[]).filter(c => c.user_id === p.id).map(c => rewards.find(r => r.id === c.reward_id)?.title).filter(Boolean) as string[]
    const points = (ledger as any[]).filter(l => l.user_id === p.id).reduce((n, l) => n + l.points, 0)
    if (won.length) { await sendTo(p, tenantId, campaignId, 'result', '', org, winnerMail({ name: campaign.name, org, won })); return }
    const outstanding = await db.trainingEnrollment.count({ where: { tenant_id: tenantId, user_id: p.id, status: { in: ['not_started', 'in_progress'] } } }).catch(() => 0)
    const mail = thanksMail({ name: campaign.name, points, outstanding })
    await sendTo(p, tenantId, campaignId, 'result', '', org, { ...mail, to: mail.toTraining ? `${siteUrl()}/chat?view=training` : undefined })
  })
}
