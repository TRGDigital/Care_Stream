// Staff incentives: turns real events (training completed, CPD, onboarding, practical sign-off) into points, and points into claims.
//
// Nothing here is typed in by hand. A campaign's period is one calendar month; every event in that month for an eligible person is
// found in the source tables, written once to an append only ledger (one row per campaign, rule, person and source event, so it can never
// be counted twice), and each person's running total is compared with their target for every reward. The time a person REACHED a reward is
// the completion time of the event that took them over, so "first to reach it" is decided by when things really happened, not when this
// job ran. Limited rewards hold a place for the earliest people; a care manager approves each payout. CareStream never pays anything.

import { prisma } from '../../db/client'
import { applyCaps, periodFor, rankClaims, reachedAt, type RawEvent } from './logic'

const db = prisma as any
const THROTTLE_MS = 90_000

export interface EligibleUser { id: string; name: string; job_role: string | null; is_active: boolean }

/** The people a campaign applies to: everyone (current staff, agency and CPD assessors excluded) plus any chosen people. */
export async function campaignPeople(tenantId: string, campaign: any, participants: any[]): Promise<EligibleUser[]> {
  const chosen = new Set<string>(participants.map(p => p.user_id))
  const where = campaign.everyone
    ? { tenant_id: tenantId, OR: [{ id: { in: Array.from(chosen) } }, { is_agency: false, is_reviewer: false }] }
    : { tenant_id: tenantId, id: { in: Array.from(chosen) } }
  const rows = await db.user.findMany({ where, select: { id: true, name: true, job_role: true, is_active: true } })
  return rows as EligibleUser[]
}

export const targetFor = (reward: any, participants: any[], userId: string): number => {
  const p = participants.find(x => x.user_id === userId)
  const override = p?.targets?.[reward.key]
  return typeof override === 'number' && override > 0 ? override : reward.target_points
}

interface Found extends RawEvent { label: string; event: string; points: number }

async function findEvents(tenantId: string, campaign: any, rules: any[], userIds: string[]): Promise<Found[]> {
  if (!userIds.length || !rules.length) return []
  const range = { gte: campaign.period_start, lte: campaign.period_end }
  const has = (e: string) => rules.some(r => r.event === e)
  const out: Found[] = []
  const ruleFor = (e: string) => rules.find(r => r.event === e)

  if (has('training_completed') || has('training_on_time') || has('cpd_completed')) {
    const done = await db.trainingEnrollment.findMany({
      where: { tenant_id: tenantId, user_id: { in: userIds }, status: 'complete', completed_at: range },
      select: { id: true, user_id: true, completed_at: true, due_date: true, module: { select: { name: true, tier: true } } },
    })
    for (const e of done as any[]) {
      if (!e.completed_at) continue
      const src = `${e.id}@${new Date(e.completed_at).getTime()}`
      const name = e.module?.name ?? 'a training module'
      const base = { user_id: e.user_id, source_id: src, occurred_at: new Date(e.completed_at) }
      const r1 = ruleFor('training_completed')
      if (r1) out.push({ ...base, rule_id: r1.id, event: r1.event, points: r1.points, label: `Completed ${name}` })
      const r2 = ruleFor('training_on_time')
      if (r2 && e.due_date && new Date(e.completed_at) <= new Date(new Date(e.due_date).getTime() + 86_399_000)) {
        out.push({ ...base, rule_id: r2.id, event: r2.event, points: r2.points, label: `Finished ${name} on time` })
      }
      const r3 = ruleFor('cpd_completed')
      if (r3 && e.module?.tier === 'cpd') out.push({ ...base, rule_id: r3.id, event: r3.event, points: r3.points, label: `Completed the CPD course ${name}` })
    }
  }
  if (has('practical_signed')) {
    const r = ruleFor('practical_signed')
    const signed = await db.trainingEnrollment.findMany({
      where: { tenant_id: tenantId, user_id: { in: userIds }, practical_signed: true, practical_signed_at: range },
      select: { id: true, user_id: true, practical_signed_at: true, module: { select: { name: true } } },
    })
    for (const e of signed as any[]) {
      if (!e.practical_signed_at) continue
      out.push({ user_id: e.user_id, rule_id: r.id, event: r.event, points: r.points, occurred_at: new Date(e.practical_signed_at), source_id: `${e.id}@${new Date(e.practical_signed_at).getTime()}`, label: `Practical sign-off for ${e.module?.name ?? 'a module'}` })
    }
  }
  if (has('onboarding_completed')) {
    const r = ruleFor('onboarding_completed')
    const flows = await db.onboardingEnrollment.findMany({
      where: { tenant_id: tenantId, user_id: { in: userIds }, completed_at: range },
      select: { id: true, user_id: true, completed_at: true, flow: { select: { name: true } } },
    })
    for (const e of flows as any[]) {
      if (!e.completed_at) continue
      out.push({ user_id: e.user_id, rule_id: r.id, event: r.event, points: r.points, occurred_at: new Date(e.completed_at), source_id: `${e.id}@${new Date(e.completed_at).getTime()}`, label: `Completed onboarding: ${e.flow?.name ?? 'induction'}` })
    }
  }
  return out
}

/** Bring one campaign up to date: record new points, form and rank claims, and end it once its month is over. Safe to run any time and repeatedly. */
export async function evaluateCampaign(tenantId: string, campaignId: string, opts: { force?: boolean } = {}): Promise<void> {
  const campaign = await db.incentiveCampaign.findFirst({ where: { id: campaignId, tenant_id: tenantId } })
  if (!campaign || !['live', 'ended'].includes(campaign.status)) return
  if (!opts.force && campaign.last_evaluated_at && Date.now() - +campaign.last_evaluated_at < THROTTLE_MS) return
  const period = periodFor(campaign.month)
  if (!period) return

  const [rules, rewards, participants] = await Promise.all([
    db.incentiveRule.findMany({ where: { campaign_id: campaignId } }),
    db.incentiveReward.findMany({ where: { campaign_id: campaignId }, orderBy: { position: 'asc' } }),
    db.incentiveParticipant.findMany({ where: { campaign_id: campaignId } }),
  ])
  const people = await campaignPeople(tenantId, campaign, participants)
  const active = people.filter(p => p.is_active)
  const activeIds = active.map(p => p.id)

  // 1. Points: find the events, honour each rule's cap, write new ledger rows once.
  const found = await findEvents(tenantId, campaign, rules, activeIds)
  const caps = new Map<string, number | null>(rules.map((r: any) => [r.id, r.max_per_month ?? null]))
  const kept = applyCaps(found, caps)
  if (kept.length) {
    await db.incentiveLedger.createMany({
      data: kept.map(e => ({ tenant_id: tenantId, campaign_id: campaignId, user_id: e.user_id, rule_id: e.rule_id, event: e.event, source_id: e.source_id, label: e.label, points: e.points, occurred_at: e.occurred_at })),
      skipDuplicates: true,
    })
  }

  // 2. Claims: who reached which reward, and when.
  const ledger = await db.incentiveLedger.findMany({ where: { campaign_id: campaignId, user_id: { in: activeIds } }, select: { user_id: true, points: true, occurred_at: true } })
  const byUser = new Map<string, Array<{ occurred_at: Date; points: number }>>()
  for (const l of ledger as any[]) byUser.set(l.user_id, [...(byUser.get(l.user_id) ?? []), { occurred_at: l.occurred_at, points: l.points }])

  const existing = await db.incentiveClaim.findMany({ where: { campaign_id: campaignId } })
  const now = new Date()
  for (const reward of rewards as any[]) {
    const mine = (existing as any[]).filter(c => c.reward_id === reward.id)
    // new or moved claims
    for (const p of active) {
      const reached = reachedAt(byUser.get(p.id) ?? [], targetFor(reward, participants, p.id))
      if (!reached) continue
      const have = mine.find(c => c.user_id === p.id)
      if (!have) {
        const created = await db.incentiveClaim.create({ data: { tenant_id: tenantId, campaign_id: campaignId, reward_id: reward.id, user_id: p.id, reached_at: reached, status: 'held' } })
        mine.push(created)
      } else if (+have.reached_at !== +reached && ['held', 'missed'].includes(have.status)) {
        await db.incentiveClaim.update({ where: { id: have.id }, data: { reached_at: reached } })
        have.reached_at = reached
      }
    }
    // people who have left: no access to any points or awards (a reward already handed over stays on record)
    const activeSet = new Set(activeIds)
    for (const c of mine) {
      if (!activeSet.has(c.user_id) && c.status !== 'given' && c.status !== 'forfeited') {
        await db.incentiveClaim.update({ where: { id: c.id }, data: { status: 'forfeited', rank: null, tied: false } })
        c.status = 'forfeited'
      }
    }
    // order the rest by earliest time reached and give out the places
    const ranked = mine.filter(c => !['rejected', 'forfeited'].includes(c.status))
    const result = rankClaims(ranked.map(c => ({ user_id: c.user_id, reached_at: new Date(c.reached_at) })), reward.quantity ?? null)
    for (const r of result) {
      const c = ranked.find(x => x.user_id === r.user_id)
      const keep = c.status === 'approved' || c.status === 'given'
      const status = keep ? c.status : (r.within ? 'held' : 'missed')
      if (c.status !== status || c.rank !== r.rank || c.tied !== r.tied) {
        await db.incentiveClaim.update({ where: { id: c.id }, data: { status, rank: r.rank, tied: r.tied } })
      }
    }
  }

  const finished = campaign.status === 'live' && now > campaign.period_end
  await db.incentiveCampaign.update({ where: { id: campaignId }, data: { last_evaluated_at: now, ...(finished ? { status: 'ended' } : {}) } })
}

/** Every live campaign (and any that have just run out of month), for the scheduled job. */
export async function evaluateAllLive(): Promise<{ campaigns: number }> {
  let rows: any[] = []
  try { rows = await db.incentiveCampaign.findMany({ where: { status: 'live' }, select: { id: true, tenant_id: true } }) } catch { return { campaigns: 0 } }
  for (const r of rows) {
    try { await evaluateCampaign(r.tenant_id, r.id, { force: true }) } catch (e) { console.error('[incentives] evaluate failed', r.id, e) }
  }
  return { campaigns: rows.length }
}
