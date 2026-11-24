// Tools for the quality and compliance agents: Analytics, CQC analytics, CQC prep, Audits and Governance reports. Every tool is read only (the one exception is saving a
// finished report as a DRAFT in the library, through the store) and scoped to one account. Counts and roles by default: a tool that returns people's names says so
// (contains_names) and is only used when the administrator asks for it. No contact details, dates of birth or health information are ever loaded.
import type { AskTool } from './tools'
import { ownSource } from './sources'
import { loadStaff, ukToday, addDays } from './data'
import { saveDocument } from './store'
import { prisma } from '../../db/client'
import { loadQueries, policyNames, loadDeliveries, loadActions, loadOpenAssignments, regulationCoverageCounts, governanceSnapshot, tenantInsights, getReadinessScore } from './quality-data'
import { summariseUsage, topCounts, usageByRole, redactContact, summariseDeliveries, weakestQuestions, summariseActions, overdueAssignments, lastCompleteMonth, DOMAIN_LABEL, type QueryRow } from './quality-calc'
import { REPORT_TEMPLATES, reportTemplate, REPORT_CHECKLIST, lintReport } from './report-templates'

const db = prisma as any
const OWN = (label: string, today: string) => ownSource(`${label} (CareStream records)`, today)
const clamp = (v: any, d: number, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d }
const days = (input: any, d = 30) => clamp(input?.days, d, 7, 365)
const NAMES_NOTE = 'This result names people. Use it only because the administrator asked, keep it to this conversation, and never put these names into a report meant to be shared.'
const daysProp = { days: { type: 'number', description: 'How many days back to look (default 30, from 7 to 365).' } }

async function usageWindow(tenantId: string, today: string, n: number) {
  const from = addDays(today, -(n - 1)), prevTo = addDays(from, -1), prevFrom = addDays(prevTo, -(n - 1))
  const [rows, prev] = await Promise.all([loadQueries(tenantId, from, today), loadQueries(tenantId, prevFrom, prevTo)])
  return { from, rows, prev }
}

export const QUALITY_TOOLS: AskTool[] = [
  // ── Analytics: how the team uses CareStream ─────────────────────────────────────────────────────────────────────────
  {
    name: 'usage_summary',
    description: 'How the team has used CareStream over a number of days: questions asked, change on the period before, by channel, week by week, how many staff asked, adoption, questions with no answer found, response time and feedback.',
    input_schema: { type: 'object', properties: daysProp },
    async run(ctx, input) {
      const n = days(input), w = await usageWindow(ctx.tenantId, ctx.today, n)
      const staff = await loadStaff(ctx.tenantId, ctx.today)
      return { data: summariseUsage(w.rows, w.prev, staff.length, n, ctx.today), method: 'Counts every question staff asked in the window, and the same number of days before it for the comparison. Adoption is the share of active staff who asked at least once.', sources: [OWN('Staff questions and answers', ctx.today)] }
    },
  },
  {
    name: 'usage_topics',
    description: 'What staff ask about: the most common policy categories and the policies cited most often, over a number of days. Counts only.',
    input_schema: { type: 'object', properties: { ...daysProp, limit: { type: 'number', description: 'How many to show (default 10).' } } },
    async run(ctx, input) {
      const n = days(input), from = addDays(ctx.today, -(n - 1)), rows = await loadQueries(ctx.tenantId, from, ctx.today)
      const cited = rows.flatMap(r => r.policy_ids)
      const names = await policyNames(ctx.tenantId, [...new Set(cited)])
      const top = topCounts(cited, clamp(input?.limit, 10, 3, 25)).map(x => ({ policy: names.get(x.value) ?? 'A policy that has since changed', times_cited: x.count }))
      return { data: { window: { from, to: ctx.today }, questions: rows.length, top_categories: topCounts(rows.map(r => r.category), clamp(input?.limit, 10, 3, 25)).map(x => ({ category: x.value, questions: x.count })), top_policies_cited: top }, method: 'Counts the category each question was filed under and the policies each answer cited.', sources: [OWN('Staff questions and answers', ctx.today)] }
    },
  },
  {
    name: 'unanswered_questions',
    description: 'Questions where CareStream found no matching policy (the knowledge gaps), most recent first, with the category. Question wording is shortened and any email or phone number is removed. No staff names.',
    input_schema: { type: 'object', properties: { ...daysProp, limit: { type: 'number', description: 'How many to show (default 15, up to 40).' } } },
    async run(ctx, input) {
      const n = days(input), from = addDays(ctx.today, -(n - 1)), rows = (await loadQueries(ctx.tenantId, from, ctx.today, true)).filter(r => r.no_match)
      const limit = clamp(input?.limit, 15, 1, 40)
      return { data: { window: { from, to: ctx.today }, total_unanswered: rows.length, by_category: topCounts(rows.map(r => r.category ?? 'No category'), 8).map(x => ({ category: x.value, count: x.count })), examples: rows.slice(0, limit).map(r => ({ date: new Date(r.created_at).toISOString().slice(0, 10), channel: r.channel, category: r.category ?? null, question: redactContact(r.text ?? '') })) }, method: 'A question counts as unanswered when no policy matched it. Each could mean a missing policy, or a policy that needs clearer wording: suggest checking Policy Gaps for the detail.', sources: [OWN('Staff questions and answers', ctx.today)] }
    },
  },
  {
    name: 'usage_by_role',
    description: 'Use of CareStream by job role without naming anyone: for each role how many staff there are, how many asked, how many never asked, and the number of questions.',
    input_schema: { type: 'object', properties: daysProp },
    async run(ctx, input) {
      const n = days(input), from = addDays(ctx.today, -(n - 1)), [rows, staff] = await Promise.all([loadQueries(ctx.tenantId, from, ctx.today), loadStaff(ctx.tenantId, ctx.today)])
      return { data: { window: { from, to: ctx.today }, roles: usageByRole(rows, staff.map(s => ({ id: s.id, job_role: s.job_role }))) }, method: 'Groups active staff by job role and counts who asked at least one question in the window.', sources: [OWN('Staff questions and the staff roster', ctx.today)] }
    },
  },
  {
    name: 'usage_never_asked',
    description: 'NAMES the active staff who have not asked CareStream anything in the window. Only use when the administrator asks who, for their own follow up. Never for a report that will be shared.',
    input_schema: { type: 'object', properties: daysProp },
    async run(ctx, input) {
      const n = days(input, 60), from = addDays(ctx.today, -(n - 1)), [rows, staff] = await Promise.all([loadQueries(ctx.tenantId, from, ctx.today), loadStaff(ctx.tenantId, ctx.today)])
      const asked = new Set(rows.filter(r => r.user_id).map(r => r.user_id as string))
      const list = staff.filter(s => !asked.has(s.id)).map(s => ({ name: s.name, job_role: s.job_role }))
      return { data: { window: { from, to: ctx.today }, count: list.length, people: list.slice(0, 60), contains_names: true, note: NAMES_NOTE }, method: 'Active staff with no question recorded in the window.', sources: [OWN('Staff questions and the staff roster', ctx.today)] }
    },
  },

  // ── CQC analytics ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'cqc_readiness',
    description: 'How the records line up with the five CQC key questions (Safe, Effective, Caring, Responsive, Well-led): a score for each from audits and from policy coverage, an overall score and the trend. Also the CQC prep staff question scores by key question over the last 12 months.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const from = addDays(ctx.today, -365)
      const [r, d] = await Promise.all([getReadinessScore(ctx.tenantId).catch(() => null), loadDeliveries(ctx.tenantId, from, ctx.today)])
      const staffQ = summariseDeliveries(d.rows, [], ctx.today).by_domain
      return { data: { overall: r?.overall ?? null, rating_band: r?.band ?? null, has_audit_evidence: r?.has_audit ?? false, has_policy_evidence: r?.has_policy ?? false, by_key_question: (r?.domains ?? []).map(x => ({ key_question: x.label, score: x.score, from_audits: x.audit, from_policies: x.policy })), trend: r?.trend ?? [], staff_question_scores: staffQ.map(x => ({ key_question: x.label, questions_sent: x.sent, answered: x.answered, average_score: x.average_score })), display_note: r && !r.visible ? 'The readiness score is switched off on the Audits settings page for staff screens. It is shown here for the administrator.' : null }, method: 'Each key question score is the average of the audit domain scores from the last 120 days and the policy coverage of the linked regulations. This is an internal readiness indicator, not a CQC rating.', sources: [OWN('Audit readiness scores, policy coverage and CQC prep answers', ctx.today)] }
    },
  },
  {
    name: 'regulation_coverage_counts',
    description: 'A headline count of how many regulations the policies cover, partly cover or leave a gap, and when it was last analysed. Counts only: for the detail point the administrator to the Policy Gaps page.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const c = await regulationCoverageCounts(ctx.tenantId), total = c.covered + c.partial + c.gap
      return { data: { ...c, total, covered_percent: total ? Math.round((c.covered / total) * 100) : null, detail: 'The Policy Gaps page lists each regulation, the evidence and what to do. Policy gaps are managed there.' }, method: 'Counts the latest regulation coverage analysis for this account.', sources: [OWN('Policy gap analysis', c.last_analysed ?? ctx.today)] }
    },
  },
  {
    name: 'policy_engagement_counts',
    description: 'Evidence that staff use the policies, as counts for the CQC report: active policies, how many were cited in staff answers in the window, how many were not, and staff who asked. No policy or staff names.',
    input_schema: { type: 'object', properties: { days: { type: 'number', description: 'Window in days (default 365).' } } },
    async run(ctx, input) {
      const n = clamp(input?.days, 365, 30, 365), from = addDays(ctx.today, -(n - 1)), rows = await loadQueries(ctx.tenantId, from, ctx.today)
      const active: number = await db.policy.count({ where: { tenant_id: ctx.tenantId, status: 'active' } }).catch(() => 0)
      const cited = new Set(rows.flatMap(r => r.policy_ids))
      return { data: { window: { from, to: ctx.today }, active_policies: active, cited_in_staff_answers: cited.size, not_cited: Math.max(0, active - cited.size), staff_who_asked: new Set(rows.filter(r => r.user_id).map(r => r.user_id)).size, questions: rows.length }, method: 'Counts distinct policies cited by CareStream in staff answers in the window. The CQC Reports page has the full evidence report by role.', sources: [OWN('Policies and staff answers', ctx.today)] }
    },
  },

  // ── CQC prep ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'cqc_prep_summary',
    description: 'How staff are doing with the CQC prep questions sent to them: sent, answered, waiting, average score, improvement after a retry, results by key question and by job role, and how many staff have been reached. Counts and averages only.',
    input_schema: { type: 'object', properties: { days: { type: 'number', description: 'Questions sent in the last N days (default 90, up to 365).' } } },
    async run(ctx, input) {
      const n = clamp(input?.days, 90, 14, 365), from = addDays(ctx.today, -(n - 1)), [d, staff] = await Promise.all([loadDeliveries(ctx.tenantId, from, ctx.today), loadStaff(ctx.tenantId, ctx.today)])
      return { data: { window: { from, to: ctx.today }, ...summariseDeliveries(d.rows, staff.map(s => s.id), ctx.today) }, method: 'Scores are 0 to 100 from the evaluation of each answer. Improvement compares the first attempt with the latest for people who retried.', sources: [OWN('CQC prep questions and answers', ctx.today)] }
    },
  },
  {
    name: 'cqc_prep_weakest_questions',
    description: 'The CQC prep questions staff find hardest (lowest average score), with the key question and how many people answered. No people are named. Good for deciding what to cover in a team meeting or training.',
    input_schema: { type: 'object', properties: { days: { type: 'number', description: 'Questions sent in the last N days (default 180).' }, limit: { type: 'number', description: 'How many (default 8).' } } },
    async run(ctx, input) {
      const n = clamp(input?.days, 180, 30, 365), from = addDays(ctx.today, -(n - 1)), d = await loadDeliveries(ctx.tenantId, from, ctx.today)
      const list = weakestQuestions(d.rows.map(r => ({ question_id: r.question_id, question: d.questionText.get(r.question_id) ?? '', domain: r.domain, score: r.score, status: r.status })), clamp(input?.limit, 8, 3, 20))
      return { data: { window: { from, to: ctx.today }, questions: list, note: 'Only questions answered by at least two people are shown.' }, method: 'Average score per question across everyone who answered it.', sources: [OWN('CQC prep questions and answers', ctx.today)] }
    },
  },
  {
    name: 'cqc_prep_chase_list',
    description: 'NAMES the staff with a CQC prep question waiting a long time, or with the lowest average scores, so the administrator can follow up. Only use when the administrator asks who. Never for a report that will be shared.',
    input_schema: { type: 'object', properties: { mode: { type: 'string', enum: ['waiting', 'lowest_scores'] }, days_waiting: { type: 'number', description: 'For waiting: how many days counts as a long time (default 14).' } }, required: ['mode'] },
    async run(ctx, input) {
      const from = addDays(ctx.today, -365), d = await loadDeliveries(ctx.tenantId, from, ctx.today)
      let list: Array<Record<string, unknown>> = []
      if (input?.mode === 'lowest_scores') {
        const by = new Map<string, number[]>()
        for (const r of d.rows) if (r.status === 'evaluated' && r.score != null) by.set(r.user_id, [...(by.get(r.user_id) ?? []), r.score])
        list = [...by].map(([id, v]) => ({ name: d.names.get(id) ?? 'Unknown', answers: v.length, average_score: Math.round(v.reduce((s, x) => s + x, 0) / v.length) })).filter(x => (x.answers as number) >= 2).sort((a, b) => (a.average_score as number) - (b.average_score as number)).slice(0, 15)
      } else {
        const cutoff = addDays(ctx.today, -clamp(input?.days_waiting, 14, 3, 120))
        const by = new Map<string, number>()
        for (const r of d.rows) if (r.status === 'pending' && new Date(r.sent_at).toISOString().slice(0, 10) <= cutoff) by.set(r.user_id, (by.get(r.user_id) ?? 0) + 1)
        list = [...by].map(([id, n]) => ({ name: d.names.get(id) ?? 'Unknown', questions_waiting: n })).sort((a, b) => (b.questions_waiting as number) - (a.questions_waiting as number)).slice(0, 25)
      }
      return { data: { mode: input?.mode, people: list, contains_names: true, note: NAMES_NOTE }, method: 'Based on the CQC prep questions sent in the last 12 months.', sources: [OWN('CQC prep questions and answers', ctx.today)] }
    },
  },

  // ── Audits ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'audit_overview',
    description: 'The audits over the last months: overall score, completed audits, each audit with its score by month and the change on last month, and the questions that failed in consecutive audits (repeat failures). No people are named.',
    input_schema: { type: 'object', properties: { months: { type: 'number', description: 'How many months back (default 6, up to 12).' } } },
    async run(ctx, input) {
      const m = clamp(input?.months, 6, 1, 12), t = await tenantInsights(ctx.tenantId, m)
      return { data: { months: t.months, overall_score_percent: t.overall, audits_completed: t.completed_runs, audits: t.audits.map(a => ({ audit: a.name, frequency: a.frequency, runs: a.runs, latest_percent: a.latest_pct, previous_percent: a.previous_pct, change: a.change, by_month: a.series })), repeat_failures: t.repeat_failures.slice(0, 12).map(f => ({ audit: f.audit_name, section: f.section, question: f.question, times_in_a_row: f.streak })) }, method: 'Scored questions only: a question counts when it was asked and answered other than N/A. Percent is passed divided by scored.', sources: [OWN('Completed audits', ctx.today)] }
    },
  },
  {
    name: 'audit_actions_summary',
    description: 'The actions raised from audits: how many raised, done, open and overdue, by priority, average days to close, how many were checked at the next audit as fixed or not fixed, and extension requests waiting. Counts only.',
    input_schema: { type: 'object', properties: { days: { type: 'number', description: 'Actions raised in the last N days, plus anything still open (default 90).' } } },
    async run(ctx, input) {
      const n = clamp(input?.days, 90, 14, 365), from = addDays(ctx.today, -(n - 1)), list = await loadActions(ctx.tenantId, from)
      return { data: { raised_since: from, ...summariseActions(list, ctx.today) }, method: 'Overdue means open with a due date before today. Closure percent is done divided by raised in the list.', sources: [OWN('Audit actions', ctx.today)] }
    },
  },
  {
    name: 'audit_overdue',
    description: 'Audits that were assigned and are now past their due date: how many, which audits, how many days overdue, and the job role responsible. Names of people only when include_names is true and the administrator asked.',
    input_schema: { type: 'object', properties: { include_names: { type: 'boolean', description: 'True only when the administrator asks who.' } } },
    async run(ctx, input) {
      const rows = await loadOpenAssignments(ctx.tenantId), r = overdueAssignments(rows, ctx.today, input?.include_names === true)
      return { data: { ...r, note: r.contains_names ? NAMES_NOTE : null }, method: 'Open audit assignments with a due date before today.', sources: [OWN('Audit assignments', ctx.today)] }
    },
  },
  {
    name: 'audit_library_facts',
    description: 'Facts about the audit library: how many ready made audits CareStream offers, by how often they run, and how many this account has made or adopted itself.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const lib: any[] = await db.auditTemplate.groupBy({ by: ['frequency'], where: { tenant_id: null, is_active: true }, _count: { _all: true } }).catch(() => [])
      const own: number = await db.auditTemplate.count({ where: { tenant_id: ctx.tenantId, is_active: true } }).catch(() => 0)
      const total = lib.reduce((s, r) => s + Number(r._count?._all ?? 0), 0)
      return { data: { ready_made_audits: total, by_frequency: lib.map(r => ({ frequency: r.frequency, audits: Number(r._count?._all ?? 0) })).sort((a, b) => b.audits - a.audits), audits_in_use_by_this_account: own, where: 'The free audit library is on the Audits page and at carestreamai.com/care-audits.' }, sources: [OWN('Audit library', ctx.today)] }
    },
  },

  // ── Governance reports ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'list_report_templates',
    description: 'The governance report templates, their sections, and the "before you send" checklist. Use first, to offer a choice.',
    input_schema: { type: 'object', properties: {} },
    async run() { return { data: { templates: REPORT_TEMPLATES, checklist: REPORT_CHECKLIST, kinds: 'A shareable report uses counts and roles only and can be shared with staff. An internal only report may name people and can never be sent to staff.' }, sources: [] } },
  },
  {
    name: 'governance_snapshot',
    description: 'ALL the figures for one governance month in one call: headline numbers (with last month beside them when compare is true), training and compliance, audits and actions, holiday and workforce pressure, and the list of what needs attention. Counts and roles only. Use this for every number in a governance report.',
    input_schema: { type: 'object', properties: { month: { type: 'string', description: 'The month as YYYY-MM. Default: the last complete month.' }, compare: { type: 'boolean', description: 'Compare with the month before where the records keep history (default true).' } } },
    async run(ctx, input) {
      const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(input?.month ?? '')) ? String(input.month) : lastCompleteMonth(ctx.today)
      const snap = await governanceSnapshot(ctx.tenantId, month, input?.compare !== false, ctx.today)
      return { data: snap, method: 'Each figure comes from the CareStream records for that month. Items marked as at today (headcount, overdue counts, holiday balances) are the position now, not at the end of that month.', sources: [OWN('Staff, training, audits, CQC prep and holiday records', ctx.today)] }
    },
  },
  {
    name: 'save_report_draft',
    description: 'Save the finished governance report as a DRAFT in the library for approval. body is plain text: ## for a heading, - for a bullet, blank lines between paragraphs. Refused if it has a dash, health or discipline wording, superlatives, pay figures, or (unless internal_only is true) the names of people. internal_only may only be true when the administrator asked for a report that names people.',
    input_schema: { type: 'object', properties: { title: { type: 'string' }, template_id: { type: 'string' }, month: { type: 'string', description: 'YYYY-MM the report covers.' }, body: { type: 'string' }, internal_only: { type: 'boolean' } }, required: ['title', 'body'] },
    async run(ctx, input) {
      const title = String(input?.title ?? '').trim().slice(0, 120), body = String(input?.body ?? '').trim(), internal = input?.internal_only === true
      if (!title || body.length < 60) return { data: { saved: false, message: 'Please give a title and the report text.' }, sources: [] }
      const staff = await loadStaff(ctx.tenantId, ctx.today)
      const problems = lintReport(`${title}\n${body}`, { staffNames: staff.map(s => s.name), internalOnly: internal })
      if (problems.length) return { data: { saved: false, problems, message: 'Not saved. Fix these and try again.' }, sources: [] }
      const tpl = reportTemplate(String(input?.template_id ?? ''))
      const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(input?.month ?? '')) ? String(input.month) : lastCompleteMonth(ctx.today)
      const id = await saveDocument(ctx.tenantId, ctx.userId, { type: 'report', title, body, data: { template_id: tpl?.id ?? null, month, internal_only: internal, report_label: 'Governance report', checklist: REPORT_CHECKLIST } })
      return { data: { saved: true, document_id: id, status: 'draft', internal_only: internal, next: internal ? 'Open it in the library to review and approve. An internal only report can be downloaded or emailed to the administrators, but never sent to staff.' : 'Open it in the library to review, edit, submit for approval and then share it.' }, sources: [] }
    },
  },
]
export { DOMAIN_LABEL }
export type { QueryRow }
