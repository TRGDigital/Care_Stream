// The Complaints and incidents tools. CareStream does NOT hold a complaints, incidents, accidents or safeguarding REGISTER (there is no table for one), so these tools do not
// pretend to: they read what does exist, the RESULTS OF THE AUDITS an account runs on those topics (the accident and incident book audit, the complaints audit, the
// safeguarding log review, the duty of candour audit and the body map audit) and the actions raised from them. Counts, percentages and question wording only: never free text
// from an answer or an action, never a resident's or a staff member's name, never the room or person an audit was about, and nothing about health.
import type { AskTool } from './tools'
import { prisma } from '../../db/client'
import { round2 } from './calc'
import { ukToday, addDays } from './data'
import { ownSource } from './sources'
import { scoreRuns, repeatFailures } from '../audits/insights'

const db = prisma as any
export const TOPICS = ['complaints', 'accidents_incidents', 'safeguarding', 'duty_of_candour'] as const
export type Topic = (typeof TOPICS)[number]
export const TOPIC_LABEL: Record<Topic, string> = { complaints: 'Complaints and concerns', accidents_incidents: 'Accidents and incidents', safeguarding: 'Safeguarding', duty_of_candour: 'Duty of candour and notifications' }
const MATCH: Record<Topic, RegExp> = {
  complaints: /complain|concern|compliment/i,
  accidents_incidents: /accident|incident|body map|injur/i,
  safeguarding: /safeguard/i,
  duty_of_candour: /candour|notification/i,
}
/** Which topic an audit name belongs to (first match), or null. */
export function topicOf(auditName: string): Topic | null { return TOPICS.find(t => MATCH[t].test(auditName)) ?? null }

/** What CareStream holds, and what to capture in future. A tool returns this so the agent can always say it plainly and never invent a register. */
export const DATA_SITUATION = {
  structured_register: false,
  summary: 'CareStream does not hold a complaints, incidents, accidents or safeguarding register. There is no list of individual complaints or incidents to count. What it holds is the results of the audits you run on these topics and the actions those audits raise.',
  available: [
    'Results over time of the complaints and concerns audit, the accident and incident book audit, the safeguarding log review, the duty of candour and notifications audit and the body map and injury recording audit (percentage of checks passed, by month, and the questions that fail most).',
    'How many actions those audits raised, and how many are open, overdue or done.',
    'Anything the administrator pastes into the chat (for example the text of complaints with names removed) can be read and summarised for themes in that conversation only.',
  ],
  not_available: ['Counts of individual complaints, incidents, accidents or safeguarding concerns', 'Who or what they were about, outcomes, time to resolve a complaint, or lessons learned', 'Anything about people\'s health'],
  recommended_fields: [
    'Reference number and date received or date it happened', 'Type (complaint, concern, compliment, accident, incident, near miss, safeguarding concern, duty of candour)', 'Source (resident, relative, visitor, staff, commissioner, other)',
    'Short factual summary with no health details', 'Severity or category', 'Reported to (CQC, local authority, police, family) and date', 'Acknowledged on, resolved on and outcome (upheld, partly upheld, not upheld, no action)',
    'Lessons learned and actions raised, with owner and due date', 'Whether the person was informed and an apology given (duty of candour)',
  ],
  pasted_text_rule: 'If the administrator pastes text to analyse, ask them to remove names and any health details first. The text is read in this conversation only. It is not saved anywhere else and is not used for anything else.',
}

interface ActionRow { status: string; priority: string; due_date: string | null; done_at: string | null; created_at: string }
/** Pure: counts of the actions raised from audits (never their wording). */
export function actionStats(rows: ActionRow[], today: string) {
  const open = rows.filter(r => r.status !== 'done')
  const overdue = open.filter(r => r.due_date && r.due_date < today)
  const since = addDays(today, -90)
  const doneRecent = rows.filter(r => r.status === 'done' && r.done_at && r.done_at.slice(0, 10) >= since)
  const days = rows.filter(r => r.status === 'done' && r.done_at).map(r => Math.round((Date.parse(r.done_at!) - Date.parse(r.created_at)) / 86_400_000)).filter(d => d >= 0)
  const prio = (p: string) => open.filter(r => r.priority === p).length
  return {
    raised_in_period: rows.length, open: open.length, in_progress: open.filter(r => r.status === 'in_progress').length, overdue: overdue.length, done_in_last_90_days: doneRecent.length,
    open_by_priority: { immediate: prio('immediate'), priority: prio('priority'), monitor: prio('monitor') },
    average_days_to_complete: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null,
  }
}

interface QScore { text: string; section: string; outcome: string }
/** Pure: the questions that fail most often across runs. */
export function failureTable(runs: Array<{ questions: QScore[] }>, limit = 10) {
  const by = new Map<string, { text: string; section: string; fails: number; asked: number }>()
  for (const r of runs) for (const q of r.questions) {
    if (q.outcome !== 'pass' && q.outcome !== 'fail') continue
    const k = q.text.trim().toLowerCase(); const e = by.get(k) ?? { text: q.text, section: q.section, fails: 0, asked: 0 }
    e.asked++; if (q.outcome === 'fail') e.fails++; by.set(k, e)
  }
  return [...by.values()].filter(e => e.fails > 0).map(e => ({ question: e.text, section: e.section, times_failed: e.fails, times_asked: e.asked, fail_percent: round2((e.fails / e.asked) * 100) }))
    .sort((a, b) => b.times_failed - a.times_failed || b.fail_percent - a.fail_percent).slice(0, Math.max(1, Math.min(25, limit)))
}

const months = (v: any) => Math.max(1, Math.min(24, Math.round(Number(v) || 12)))
const topicIn = (v: any): Topic | 'all' => (TOPICS.includes(v) ? v : 'all')
const topicProp = { topic: { type: 'string', enum: [...TOPICS, 'all'], description: 'complaints, accidents_incidents, safeguarding, duty_of_candour or all (default all).' }, months: { type: 'number', description: 'How many months back (default 12, maximum 24).' } }
const SRC = (today: string) => ownSource('Audit results (CareStream records)', today)

async function relevantTemplates(tenantId: string, topic: Topic | 'all') {
  const list: any[] = await db.auditTemplate.findMany({ where: { is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true, frequency: true } })
  return list.map(t => ({ ...t, topic: topicOf(t.name) as Topic | null })).filter(t => t.topic && (topic === 'all' || t.topic === topic)) as Array<{ id: string; name: string; frequency: string; topic: Topic }>
}

export const INCIDENT_TOOLS: AskTool[] = [
  {
    name: 'incident_data_situation',
    description: 'ALWAYS call this first for complaints, incidents, accidents or safeguarding questions. It says plainly what CareStream holds (audit results and actions, not a register of individual complaints or incidents), what it does not, and which fields to start capturing. Never invent a register.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: DATA_SITUATION, sources: [ownSource('What CareStream holds on complaints and incidents', ctx.today)] } },
  },
  {
    name: 'incident_audits',
    description: 'Which complaints, accident and incident, safeguarding, duty of candour and body map audits this account has, how often each is set to run, how many were completed in the period, and the latest result. Names and numbers only.',
    input_schema: { type: 'object', properties: topicProp },
    async run(ctx, input) {
      const t = topicIn(input?.topic), m = months(input?.months)
      const tpl = await relevantTemplates(ctx.tenantId, t)
      const scores = await scoreRuns([ctx.tenantId], new Date(Date.now() - m * 31 * 86_400_000))
      const out = tpl.map(x => {
        const runs = scores.filter(s => s.template_id === x.id && s.pct !== null)
        const latest = [...runs].sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at))[0]
        return { audit: x.name, topic: TOPIC_LABEL[x.topic], frequency: x.frequency, completed_in_period: runs.length, latest_result_percent: latest?.pct ?? null, latest_completed: latest ? new Date(latest.completed_at).toISOString().slice(0, 10) : null }
      })
      return { data: { months: m, audits: out, audits_never_completed_in_period: out.filter(o => o.completed_in_period === 0).map(o => o.audit) }, method: 'Result = the percentage of scored checks that passed in that audit. Only completed audits count.', sources: [SRC(ctx.today)] }
    },
  },
  {
    name: 'incident_audit_trends',
    description: 'How the complaints, accident and incident, safeguarding and duty of candour audits are trending: the result by month, latest against previous, and the checks that have failed in a row. Percentages and question wording only, no names and no free text.',
    input_schema: { type: 'object', properties: topicProp },
    async run(ctx, input) {
      const t = topicIn(input?.topic), m = months(input?.months)
      const tpl = await relevantTemplates(ctx.tenantId, t)
      const scores = (await scoreRuns([ctx.tenantId], new Date(Date.now() - m * 31 * 86_400_000))).filter(s => tpl.some(x => x.id === s.template_id))
      const names = new Map(tpl.map(x => [x.id, x.name]))
      const audits = tpl.map(x => {
        const runs = scores.filter(s => s.template_id === x.id && s.pct !== null)
        const by = new Map<string, { pass: number; total: number; runs: number }>()
        for (const r of runs) { const e = by.get(r.month) ?? { pass: 0, total: 0, runs: 0 }; e.pass += r.pass; e.total += r.total; e.runs++; by.set(r.month, e) }
        const series = [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, result_percent: v.total ? Math.round((v.pass / v.total) * 100) : null, audits_done: v.runs }))
        const latest = series[series.length - 1] ?? null, previous = series[series.length - 2] ?? null
        return { audit: x.name, topic: TOPIC_LABEL[x.topic], series, latest_percent: latest?.result_percent ?? null, previous_percent: previous?.result_percent ?? null, change_points: latest && previous && latest.result_percent != null && previous.result_percent != null ? latest.result_percent - previous.result_percent : null }
      }).filter(a => a.series.length > 0)
      const repeats = repeatFailures(scores, names, 2).map(r => ({ audit: r.audit_name, check: r.question, section: r.section, failed_in_a_row: r.streak }))
      return { data: { months: m, audits, checks_failing_repeatedly: repeats.slice(0, 15) }, method: 'Result = passed checks divided by scored checks for the month. A check failing in a row means it failed in each of the most recent audits of that kind.', sources: [SRC(ctx.today)] }
    },
  },
  {
    name: 'incident_audit_failures',
    description: 'The checks that fail most often in the complaints, accident and incident, safeguarding and duty of candour audits over a period, with how many times each was asked and failed. Question wording is from the audit template.',
    input_schema: { type: 'object', properties: { ...topicProp, limit: { type: 'number', description: 'How many to list (default 10, maximum 25).' } } },
    async run(ctx, input) {
      const t = topicIn(input?.topic), m = months(input?.months)
      const tpl = await relevantTemplates(ctx.tenantId, t)
      const scores = (await scoreRuns([ctx.tenantId], new Date(Date.now() - m * 31 * 86_400_000))).filter(s => tpl.some(x => x.id === s.template_id))
      return { data: { months: m, audits_included: [...new Set(scores.map(s => s.template_id))].length, runs_included: scores.length, most_failed_checks: failureTable(scores, Number(input?.limit) || 10) }, method: 'Times failed = how many audits in the period answered that check with a failing answer. Fail percent = times failed divided by times asked (not applicable answers are left out).', sources: [SRC(ctx.today)] }
    },
  },
  {
    name: 'incident_open_actions',
    description: 'The actions raised from the complaints, accident and incident, safeguarding and duty of candour audits: how many were raised, how many are open, in progress or overdue, the open ones by priority, how many were completed in the last 90 days and the average days to complete. Counts only: never the wording of an action.',
    input_schema: { type: 'object', properties: topicProp },
    async run(ctx, input) {
      const t = topicIn(input?.topic), m = months(input?.months)
      const tpl = await relevantTemplates(ctx.tenantId, t)
      if (!tpl.length) return { data: { note: 'This account has none of these audits set up.' }, sources: [SRC(ctx.today)] }
      const since = new Date(Date.now() - m * 31 * 86_400_000)
      const runs: any[] = await db.auditRun.findMany({ where: { tenant_id: ctx.tenantId, template_id: { in: tpl.map(x => x.id) }, created_at: { gte: since } }, select: { id: true } })
      const rows: any[] = runs.length ? await db.auditAction.findMany({ where: { tenant_id: ctx.tenantId, run_id: { in: runs.map(r => r.id) } }, select: { status: true, priority: true, due_date: true, done_at: true, created_at: true } }) : []
      const iso = (d: any) => (d ? new Date(d).toISOString() : null)
      const stats = actionStats(rows.map(r => ({ status: String(r.status), priority: String(r.priority), due_date: iso(r.due_date)?.slice(0, 10) ?? null, done_at: iso(r.done_at), created_at: iso(r.created_at)! })), ctx.today)
      return { data: { months: m, topic: t === 'all' ? 'All four topics' : TOPIC_LABEL[t], ...stats }, method: 'Counted from the actions raised by audits started in the period. Overdue means open with a due date before today.', sources: [SRC(ctx.today)] }
    },
  },
]
