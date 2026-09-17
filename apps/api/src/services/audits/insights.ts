// Audit trends: scores over time, repeat failures ("failed 3 audits running"), section and question
// trends for one audit, and a comparison across the homes in a group.
//
// Scores use the same rules as the audit page and report: a question counts when it was asked (its
// condition met), is scored, and was answered other than N/A. A question is tracked across versions by
// its wording within the audit, so rewording starts a new line rather than mixing two questions.

import { prisma } from '../../db/client'
import { questionsForRun, isVisible, isScored, outcomeFor, type Outcome } from '../../lib/audit-questions'

const db = prisma as any
const DAY = 86_400_000

type RunScore = {
  run_id: string; template_id: string; completed_at: Date; month: string; subject: string | null
  pass: number; total: number; pct: number | null
  sections: Array<{ title: string; pass: number; total: number }>
  questions: Array<{ key: string; text: string; section: string; outcome: Outcome }>
}

const keyOf = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')
const monthOf = (d: Date) => new Date(d).toISOString().slice(0, 7)

// Score every completed run of the given homes in the window.
export async function scoreRuns(tenantIds: string[], since: Date, templateId?: string): Promise<RunScore[]> {
  const runs = await db.auditRun.findMany({
    where: { tenant_id: { in: tenantIds }, status: 'completed', completed_at: { gte: since }, ...(templateId ? { template_id: templateId } : {}) },
    select: { id: true, tenant_id: true, template_id: true, status: true, completed_at: true, room_number: true },
    orderBy: { completed_at: 'asc' },
  })
  if (!(runs as any[]).length) return []
  const templateIds = [...new Set((runs as any[]).map(r => r.template_id))]
  const [templates, answers] = await Promise.all([
    db.auditTemplate.findMany({ where: { id: { in: templateIds } }, include: { sections: { orderBy: { section_order: 'asc' }, include: { questions: { orderBy: { question_order: 'asc' } } } } } }),
    db.auditAnswer.findMany({ where: { run_id: { in: (runs as any[]).map(r => r.id) } } }),
  ])
  const templateBy = new Map((templates as any[]).map(t => [t.id, t]))
  const answersBy = new Map<string, any[]>()
  for (const a of answers as any[]) { const l = answersBy.get(a.run_id) ?? []; l.push(a); answersBy.set(a.run_id, l) }

  return (runs as any[]).map(r => {
    const t = templateBy.get(r.template_id)
    const runAnswers = answersBy.get(r.id) ?? []
    const shaped = { ...r, answers: runAnswers }
    const sections = (t?.sections ?? []).map((s: any) => ({ title: s.title, questions: questionsForRun(shaped, s.questions ?? []) })).filter((s: any) => s.questions.length)
    const all = sections.flatMap((s: any) => s.questions)
    const byId = new Map<string, any>(all.map((q: any) => [q.id, q]))
    const answerMap = new Map<string, any>(runAnswers.map((a: any) => [a.question_id, a]))
    const out: RunScore = { run_id: r.id, template_id: r.template_id, completed_at: r.completed_at, month: monthOf(r.completed_at), subject: r.room_number ?? null, pass: 0, total: 0, pct: null, sections: [], questions: [] }
    for (const s of sections) {
      let sp = 0, st = 0
      for (const q of s.questions) {
        if (!isVisible(q, byId, answerMap) || !isScored(q)) continue
        const o = outcomeFor(q, answerMap.get(q.id))
        out.questions.push({ key: keyOf(q.question_text), text: q.question_text, section: s.title, outcome: o })
        if (o === 'pass' || o === 'fail') { st++; if (o === 'pass') sp++ }
      }
      if (st) out.sections.push({ title: s.title, pass: sp, total: st })
      out.pass += sp; out.total += st
    }
    out.pct = out.total ? Math.round((out.pass / out.total) * 100) : null
    return out
  })
}

// Questions that failed in the most recent consecutive audits of the same kind (and subject).
export function repeatFailures(scores: RunScore[], templateNames: Map<string, string>, minStreak = 2) {
  const chains = new Map<string, RunScore[]>()
  for (const s of scores) { const k = `${s.template_id}|${s.subject ?? ''}`; const l = chains.get(k) ?? []; l.push(s); chains.set(k, l) }
  const out: Array<{ template_id: string; audit_name: string; subject: string | null; question: string; section: string; streak: number; last_failed: Date; run_id: string }> = []
  for (const runs of chains.values()) {
    const ordered = [...runs].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    const keys = new Set(ordered.flatMap(r => r.questions.map(q => q.key)))
    for (const key of keys) {
      let streak = 0, last: { q: any; r: RunScore } | null = null
      for (const r of ordered) {
        const q = r.questions.find(x => x.key === key)
        if (!q || q.outcome === 'na' || q.outcome === 'unanswered') continue   // not asked this time: does not break or extend
        if (q.outcome !== 'fail') break
        streak++
        if (!last) last = { q, r }
      }
      if (streak >= minStreak && last) {
        out.push({ template_id: last.r.template_id, audit_name: templateNames.get(last.r.template_id) ?? 'Audit', subject: last.r.subject, question: last.q.text, section: last.q.section, streak, last_failed: last.r.completed_at, run_id: last.r.run_id })
      }
    }
  }
  return out.sort((a, b) => b.streak - a.streak || new Date(b.last_failed).getTime() - new Date(a.last_failed).getTime())
}

// The home's audits over the last N months: a score per month for each audit, and repeat failures.
export async function tenantInsights(tenantId: string, months = 12) {
  const since = new Date(Date.now() - months * 31 * DAY)
  const scores = await scoreRuns([tenantId], since)
  const templateIds = [...new Set(scores.map(s => s.template_id))]
  const templates = templateIds.length ? await db.auditTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, name: true, frequency: true, subject_scope: true } }) : []
  const names = new Map<string, string>((templates as any[]).map(t => [t.id, t.name]))

  const audits = (templates as any[]).map(t => {
    const runs = scores.filter(s => s.template_id === t.id && s.pct !== null)
    const byMonth = new Map<string, { pass: number; total: number; runs: number }>()
    for (const r of runs) { const m = byMonth.get(r.month) ?? { pass: 0, total: 0, runs: 0 }; m.pass += r.pass; m.total += r.total; m.runs++; byMonth.set(r.month, m) }
    const series = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, pct: Math.round((v.pass / v.total) * 100), runs: v.runs }))
    const latest = series[series.length - 1] ?? null, previous = series[series.length - 2] ?? null
    return {
      template_id: t.id, name: t.name, frequency: t.frequency, subject_scope: t.subject_scope,
      runs: runs.length, latest_pct: latest?.pct ?? null, previous_pct: previous?.pct ?? null,
      change: latest && previous ? latest.pct - previous.pct : null, series,
    }
  }).filter(a => a.runs > 0).sort((a, b) => (a.latest_pct ?? 101) - (b.latest_pct ?? 101))

  const failures = repeatFailures(scores, names)
  const allScored = scores.filter(s => s.pct !== null)
  return {
    months,
    overall: allScored.length ? Math.round((allScored.reduce((n, s) => n + s.pass, 0) / allScored.reduce((n, s) => n + s.total, 0)) * 100) : null,
    completed_runs: scores.length,
    audits,
    repeat_failures: failures.slice(0, 50),
  }
}

// One audit in detail: every completed run in the window, section scores and each question's results.
export async function templateInsights(tenantId: string, templateId: string, months = 12) {
  const since = new Date(Date.now() - months * 31 * DAY)
  const template = await db.auditTemplate.findFirst({ where: { id: templateId, OR: [{ tenant_id: null }, { tenant_id: tenantId }] }, select: { id: true, name: true, subject_scope: true } })
  if (!template) return null
  const scores = (await scoreRuns([tenantId], since, templateId)).slice(-24)
  const runs = scores.map(s => ({ run_id: s.run_id, completed_at: s.completed_at, month: s.month, subject: s.subject, pct: s.pct, pass: s.pass, total: s.total }))

  const sectionTitles = [...new Set(scores.flatMap(s => s.sections.map(x => x.title)))]
  const sections = sectionTitles.map(title => ({
    title,
    series: scores.map(s => { const x = s.sections.find(y => y.title === title); return x ? Math.round((x.pass / x.total) * 100) : null }),
  }))

  const qKeys = new Map<string, { text: string; section: string }>()
  for (const s of scores) for (const q of s.questions) if (!qKeys.has(q.key)) qKeys.set(q.key, { text: q.text, section: q.section })
  const failures = repeatFailures(scores, new Map([[template.id, template.name]]))
  const questions = [...qKeys.entries()].map(([key, v]) => {
    const outcomes = scores.map(s => s.questions.find(q => q.key === key)?.outcome ?? null)
    const fails = outcomes.filter(o => o === 'fail').length
    const scored = outcomes.filter(o => o === 'pass' || o === 'fail').length
    const streak = failures.filter(f => f.question === v.text).reduce((m, f) => Math.max(m, f.streak), 0)
    return { text: v.text, section: v.section, outcomes, fails, pass_rate: scored ? Math.round(((scored - fails) / scored) * 100) : null, streak }
  }).sort((a, b) => b.streak - a.streak || b.fails - a.fails)

  return { template, runs, sections, questions }
}

// Every home in the caller's group: audit scores, repeat failures, open and overdue actions, overdue
// scheduled audits. The site set comes from the caller's own group, so it never spans another group.
export async function groupInsights(tenantId: string, months = 3) {
  const current = await db.tenant.findUnique({ where: { id: tenantId }, select: { parent_tenant_id: true } })
  const rootId = current?.parent_tenant_id ?? tenantId
  const sites = await db.tenant.findMany({ where: { OR: [{ id: rootId }, { parent_tenant_id: rootId }] }, select: { id: true, name: true }, orderBy: { created_at: 'asc' } })
  if ((sites as any[]).length < 2) return { sites: [], audits: [] }
  const siteIds = (sites as any[]).map(s => s.id)
  const since = new Date(Date.now() - months * 31 * DAY)
  const today = new Date(new Date().toISOString().slice(0, 10))

  const [scores, actionRows, overdueAssign] = await Promise.all([
    scoreRuns(siteIds, since),
    db.auditAction.findMany({ where: { tenant_id: { in: siteIds }, status: { not: 'done' }, run: { action_plan_status: 'approved' } }, select: { tenant_id: true, due_date: true } }),
    db.auditAssignment.groupBy({ by: ['tenant_id'], where: { tenant_id: { in: siteIds }, status: 'open', due_date: { lt: today } }, _count: { _all: true } }).catch(() => []),
  ])
  const runTenants = scores.length ? await db.auditRun.findMany({ where: { id: { in: scores.map(s => s.run_id) } }, select: { id: true, tenant_id: true } }) : []
  const tenantOfRun = new Map((runTenants as any[]).map(r => [r.id, r.tenant_id]))
  const templateIds = [...new Set(scores.map(s => s.template_id))]
  const templates = templateIds.length ? await db.auditTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, name: true } }) : []
  const names = new Map<string, string>((templates as any[]).map(t => [t.id, t.name]))
  const overdueBy = new Map((overdueAssign as any[]).map(g => [g.tenant_id, g._count._all]))

  const siteRows = (sites as any[]).map(site => {
    const own = scores.filter(s => tenantOfRun.get(s.run_id) === site.id)
    const scored = own.filter(s => s.pct !== null)
    const acts = (actionRows as any[]).filter(a => a.tenant_id === site.id)
    return {
      tenant_id: site.id, name: site.name, is_current: site.id === tenantId,
      completed_runs: own.length,
      score: scored.length ? Math.round((scored.reduce((n, s) => n + s.pass, 0) / scored.reduce((n, s) => n + s.total, 0)) * 100) : null,
      repeat_failures: repeatFailures(own, names).length,
      open_actions: acts.length,
      overdue_actions: acts.filter(a => a.due_date && new Date(a.due_date) < today).length,
      overdue_scheduled: overdueBy.get(site.id) ?? 0,
    }
  })

  // The same audit (by name) across homes: each home's score in the window.
  const byName = new Map<string, Map<string, { pass: number; total: number }>>()
  for (const s of scores) {
    if (s.pct === null) continue
    const name = names.get(s.template_id) ?? 'Audit'
    const tid = tenantOfRun.get(s.run_id)!
    const m = byName.get(name) ?? new Map(); const v = m.get(tid) ?? { pass: 0, total: 0 }
    v.pass += s.pass; v.total += s.total; m.set(tid, v); byName.set(name, m)
  }
  const audits = [...byName.entries()].filter(([, m]) => m.size >= 2).map(([name, m]) => ({
    name, scores: Object.fromEntries([...m.entries()].map(([tid, v]) => [tid, Math.round((v.pass / v.total) * 100)])),
  })).sort((a, b) => a.name.localeCompare(b.name))

  return { months, sites: siteRows, audits }
}
