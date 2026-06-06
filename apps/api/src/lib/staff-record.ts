// Builds a comprehensive per-staff record: training + onboarding progress,
// engagement, risk flags, team benchmarks, trends and an activity timeline.
// Shared by the admin staff record (/users/:id/record) and the staff-facing
// "My Progress" view (/me/progress).

import { prisma } from '../db/client'

const DAY = 86_400_000

function monthLabel(year: number, month0: number): string {
  return new Date(Date.UTC(year, month0, 1)).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export interface StaffRecordOptions {
  includeTeam?: boolean      // compute tenant-wide benchmarks
  includeReading?: boolean   // include per-policy reading engagement (admin only)
}

function policyTitleFromFilename(filename: string): string {
  return (filename || 'Policy').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
}

export async function buildStaffRecord(tenantId: string, userId: string, opts: StaffRecordOptions = {}) {
  const now  = new Date()
  const soon = new Date(now.getTime() + 30 * DAY)

  const user = await (prisma as any).user.findUnique({
    where:  { id: userId },
    select: {
      id: true, name: true, email: true, role: true, job_role: true, specialisms: true, phone_number: true,
      shift_type: true, first_language: true, second_language: true, comms_always_first_language: true,
      is_active: true, created_at: true, first_login_at: true, last_login_at: true, tenant_id: true,
    },
  })
  if (!user || user.tenant_id !== tenantId) return null

  const [tEnr, oEnr, queriesTotal, queries30d, recentQueries, topTopicsRaw, cqcAll] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId },
      include: {
        module:  { select: { id: true, name: true, category: true, questions: true, source: true, requires_practical: true, frequency: true, pass_mark: true } },
        answers: { select: { is_correct: true, answered_at: true, question_text: true } },
      },
      orderBy: { created_at: 'asc' },
    }),
    (prisma as any).onboardingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId },
      include: { flow: { include: { steps: { select: { id: true, type: true, question: true, options: true, correct_option: true } } } }, progress: true },
      orderBy: { enrolled_at: 'asc' },
    }),
    (prisma as any).queryRecord.count({ where: { tenant_id: tenantId, user_id: userId } }),
    (prisma as any).queryRecord.count({ where: { tenant_id: tenantId, user_id: userId, created_at: { gte: new Date(now.getTime() - 30 * DAY) } } }),
    (prisma as any).queryRecord.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, take: 5, select: { created_at: true, document_category_queried: true } }),
    (prisma as any).queryRecord.groupBy({ by: ['document_category_queried'], where: { tenant_id: tenantId, user_id: userId }, _count: { _all: true } }),
    (prisma as any).cqcStaffDelivery.findMany({ where: { tenant_id: tenantId, user_id: userId }, select: { status: true, answered_at: true } }),
  ])

  // ── Training items ──────────────────────────────────────────────────────────
  const allTrainingItems = (tEnr as any[]).map(e => {
    const answers = e.answers ?? []
    const correct = answers.filter((a: any) => a.is_correct).length
    const total   = answers.length
    const qCount  = Array.isArray(e.module?.questions) ? e.module.questions.length : 0
    const expired = e.expires_at && new Date(e.expires_at) < now && e.status === 'complete'
    const status  = expired ? 'expired' : (e.status as string)
    const overdue = !!e.due_date && new Date(e.due_date) < now && status !== 'complete'
    const dueSoon = !!e.due_date && new Date(e.due_date) >= now && new Date(e.due_date) <= soon && status !== 'complete'
    return {
      enrollment_id: e.id, module_id: e.module?.id, module_name: e.module?.name, category: e.module?.category,
      source: e.module?.source ?? 'manual', requires_practical: !!e.module?.requires_practical, frequency: e.module?.frequency ?? null,
      status, score: total > 0 ? { correct, total, pct: Math.round((correct / total) * 100) } : null,
      question_count: qCount, renewal_count: e.renewal_count ?? 0,
      assigned_at: e.created_at, completed_at: e.completed_at, due_date: e.due_date, expires_at: e.expires_at,
      certificate_url: e.certificate_url ?? null, overdue, due_soon: dueSoon,
      practical_signed: !!e.practical_signed, practical_signed_by: e.practical_signed_by ?? null, practical_signed_at: e.practical_signed_at ?? null, practical_note: e.practical_note ?? null,
    }
  })
  const training       = allTrainingItems.filter(t => t.source !== 'ai_generated')
  const annualTraining = allTrainingItems.filter(t => t.source === 'ai_generated')

  const tCompleted = training.filter(t => t.status === 'complete').length
  const tScores    = training.map(t => t.score?.pct).filter((p): p is number => typeof p === 'number')
  const trainingSummary = {
    assigned:    training.length,
    completed:   tCompleted,
    in_progress: training.filter(t => t.status === 'in_progress').length,
    not_started: training.filter(t => t.status === 'not_started').length,
    overdue:     training.filter(t => t.overdue).length,
    due_soon:    training.filter(t => t.due_soon).length,
    expired:     training.filter(t => t.status === 'expired').length,
    avg_score:   tScores.length ? Math.round(tScores.reduce((a, b) => a + b, 0) / tScores.length) : null,
    completion_pct: training.length ? Math.round((tCompleted / training.length) * 100) : null,
  }

  // ── Annual training (AI modules) summary ────────────────────────────────────
  const aCompleted = annualTraining.filter(t => t.status === 'complete').length
  const annualSummary = {
    assigned:       annualTraining.length,
    completed:      aCompleted,
    overdue:        annualTraining.filter(t => t.overdue).length,
    expired:        annualTraining.filter(t => t.status === 'expired').length,
    practical_due:  annualTraining.filter(t => t.requires_practical && t.status === 'complete' && !t.practical_signed).length,
    completion_pct: annualTraining.length ? Math.round((aCompleted / annualTraining.length) * 100) : null,
  }

  // ── Onboarding items ─────────────────────────────────────────────────────────
  const onboarding = (oEnr as any[]).map(e => {
    const steps     = e.flow?.steps ?? []
    const totalSt   = steps.length
    const completed = (e.progress ?? []).filter((p: any) => p.completed_at).length
    const qSteps    = steps.filter((s: any) => s.type === 'answer_question').length
    const correct   = (e.progress ?? []).filter((p: any) => p.answer_correct === true).length
    const status    = e.completed_at ? 'complete' : (completed > 0 ? 'in_progress' : 'not_started')
    const overdue   = !!e.due_date && new Date(e.due_date) < now && !e.completed_at
    return {
      enrollment_id: e.id, flow_id: e.flow_id, flow_name: e.flow?.name, flow_kind: e.flow?.flow_kind,
      total_steps: totalSt, completed_steps: completed, pct: totalSt ? Math.round((completed / totalSt) * 100) : 0,
      question_steps: qSteps, correct_answers: correct, status,
      enrolled_at: e.enrolled_at, completed_at: e.completed_at, due_date: e.due_date, overdue,
    }
  })
  const oCompleted = onboarding.filter(o => o.status === 'complete').length
  const onboardingSummary = {
    assigned:    onboarding.length,
    completed:   oCompleted,
    in_progress: onboarding.filter(o => o.status === 'in_progress').length,
    not_started: onboarding.filter(o => o.status === 'not_started').length,
    overdue:     onboarding.filter(o => o.overdue).length,
    completion_pct: onboarding.length ? Math.round((oCompleted / onboarding.length) * 100) : null,
  }

  // ── Engagement ────────────────────────────────────────────────────────────────
  const cqcAssigned = (cqcAll as any[]).length
  const cqcAnswered = (cqcAll as any[]).filter(d => d.status !== 'pending').length
  const topTopics = (topTopicsRaw as any[])
    .filter(t => t.document_category_queried)
    .map(t => ({ category: t.document_category_queried as string, count: t._count?._all ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
  const engagement = {
    queries_total: queriesTotal, queries_30d: queries30d,
    last_query_at: (recentQueries as any[])[0]?.created_at ?? null,
    first_login_at: user.first_login_at, last_login_at: user.last_login_at,
    cqc_assigned: cqcAssigned, cqc_answered: cqcAnswered, top_topics: topTopics,
  }

  // ── Risk flags ─────────────────────────────────────────────────────────────────
  const flags: Array<{ level: 'high' | 'medium' | 'low'; kind: string; label: string }> = []
  if (trainingSummary.expired > 0)  flags.push({ level: 'high',   kind: 'training_expired', label: `${trainingSummary.expired} training module${trainingSummary.expired > 1 ? 's' : ''} expired` })
  if (trainingSummary.overdue > 0)  flags.push({ level: 'high',   kind: 'training_overdue', label: `${trainingSummary.overdue} training module${trainingSummary.overdue > 1 ? 's' : ''} overdue` })
  if (onboardingSummary.overdue > 0) flags.push({ level: 'high',  kind: 'onboarding_overdue', label: `Induction overdue` })
  if (!user.first_login_at)         flags.push({ level: 'medium', kind: 'never_logged_in', label: 'Has never logged in' })
  if (trainingSummary.due_soon > 0) flags.push({ level: 'medium', kind: 'training_due_soon', label: `${trainingSummary.due_soon} module${trainingSummary.due_soon > 1 ? 's' : ''} due within 30 days` })
  if (annualSummary.expired > 0)    flags.push({ level: 'high',   kind: 'annual_expired', label: `${annualSummary.expired} annual training module${annualSummary.expired > 1 ? 's' : ''} due for renewal` })
  if (annualSummary.overdue > 0)    flags.push({ level: 'high',   kind: 'annual_overdue', label: `${annualSummary.overdue} annual training module${annualSummary.overdue > 1 ? 's' : ''} overdue` })
  if (annualSummary.practical_due > 0) flags.push({ level: 'medium', kind: 'practical_due', label: `${annualSummary.practical_due} practical assessment${annualSummary.practical_due > 1 ? 's' : ''} to record` })
  const stalled = onboarding.filter(o => o.status === 'not_started' && o.enrolled_at && new Date(o.enrolled_at) < new Date(now.getTime() - 7 * DAY))
  if (stalled.length > 0)           flags.push({ level: 'medium', kind: 'onboarding_stalled', label: 'Induction not started after 7+ days' })
  if (trainingSummary.avg_score !== null && trainingSummary.avg_score < 60 && tScores.length >= 2)
    flags.push({ level: 'medium', kind: 'low_score', label: `Low average quiz score (${trainingSummary.avg_score}%)` })

  // ── Trends — last 6 months of completions ────────────────────────────────────
  const monthBuckets: Array<{ key: string; label: string; training: number; onboarding: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    monthBuckets.push({ key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: monthLabel(d.getUTCFullYear(), d.getUTCMonth()), training: 0, onboarding: 0 })
  }
  const bucketOf = (d: Date) => monthBuckets.find(b => b.key === `${d.getUTCFullYear()}-${d.getUTCMonth()}`)
  for (const t of training) if (t.completed_at) { const b = bucketOf(new Date(t.completed_at)); if (b) b.training++ }
  for (const o of onboarding) if (o.completed_at) { const b = bucketOf(new Date(o.completed_at)); if (b) b.onboarding++ }
  const trends = {
    months: monthBuckets.map(b => b.label),
    training: monthBuckets.map(b => b.training),
    onboarding: monthBuckets.map(b => b.onboarding),
  }

  // ── Activity timeline ───────────────────────────────────────────────────────
  const events: Array<{ at: string; type: string; label: string }> = []
  for (const t of training) {
    if (t.assigned_at)  events.push({ at: t.assigned_at,  type: 'training_assigned',  label: `Assigned training: ${t.module_name}` })
    if (t.completed_at) events.push({ at: t.completed_at, type: 'training_completed', label: `Completed training: ${t.module_name}${t.score ? ` (${t.score.pct}%)` : ''}` })
  }
  for (const o of onboarding) {
    if (o.enrolled_at)  events.push({ at: o.enrolled_at,  type: 'onboarding_enrolled',  label: `Enrolled on induction: ${o.flow_name}` })
    if (o.completed_at) events.push({ at: o.completed_at, type: 'onboarding_completed', label: `Completed induction: ${o.flow_name}` })
  }
  for (const q of recentQueries as any[]) events.push({ at: q.created_at, type: 'query', label: 'Asked a question in the Chat Hub' })
  if (user.first_login_at) events.push({ at: user.first_login_at, type: 'login', label: 'First logged in' })
  const timeline = events
    .filter(e => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 25)

  // ── Team benchmarks ────────────────────────────────────────────────────────────
  let benchmarks: any = null
  if (opts.includeTeam) {
    const [teamTAssigned, teamTComplete, teamAnsTotal, teamAnsCorrect, teamOAssigned, teamOComplete] = await Promise.all([
      (prisma as any).trainingEnrollment.count({ where: { tenant_id: tenantId } }),
      (prisma as any).trainingEnrollment.count({ where: { tenant_id: tenantId, status: 'complete' } }),
      (prisma as any).trainingAnswer.count({ where: { enrollment: { tenant_id: tenantId } } }),
      (prisma as any).trainingAnswer.count({ where: { enrollment: { tenant_id: tenantId }, is_correct: true } }),
      (prisma as any).onboardingEnrollment.count({ where: { tenant_id: tenantId } }),
      (prisma as any).onboardingEnrollment.count({ where: { tenant_id: tenantId, completed_at: { not: null } } }),
    ])
    benchmarks = {
      training_completion: { self: trainingSummary.completion_pct, team: teamTAssigned ? Math.round((teamTComplete / teamTAssigned) * 100) : null },
      avg_score:           { self: trainingSummary.avg_score,      team: teamAnsTotal ? Math.round((teamAnsCorrect / teamAnsTotal) * 100) : null },
      onboarding_completion: { self: onboardingSummary.completion_pct, team: teamOAssigned ? Math.round((teamOComplete / teamOAssigned) * 100) : null },
    }
  }

  // ── Induction question performance (admin record only) ──────────────────────
  let inductionQuestions: any = null
  if (opts.includeReading) {
    const items: any[] = []
    for (const e of oEnr as any[]) {
      const progByStep = new Map<string, any>((e.progress ?? []).map((p: any) => [p.step_id, p]))
      for (const s of (e.flow?.steps ?? [])) {
        if (s.type !== 'answer_question') continue
        const prog = progByStep.get(s.id)
        if (!prog || prog.answer_text == null) continue   // not answered yet
        const opts2  = Array.isArray(s.options) ? s.options : []
        const isMcq  = opts2.length > 0 && s.correct_option != null
        const selIdx = isMcq ? parseInt(String(prog.answer_text), 10) : null
        items.push({
          flow_name:      e.flow?.name,
          question:       s.question,
          selected:       isMcq ? (opts2[selIdx as number] ?? String(prog.answer_text)) : prog.answer_text,
          correct_answer: isMcq ? (opts2[s.correct_option] ?? null) : null,
          is_correct:     prog.answer_correct === true,
          answered_at:    prog.completed_at,
        })
      }
    }
    const answered = items.length
    const correct  = items.filter(i => i.is_correct).length
    inductionQuestions = {
      items,
      summary: { answered, correct, incorrect: answered - correct, pct: answered ? Math.round((correct / answered) * 100) : null },
    }
  }

  // ── Policy reading engagement (admin record only) ───────────────────────────
  let reading: any = null
  if (opts.includeReading) {
    const sessions = await (prisma as any).policyReadSession.findMany({
      where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' },
    }).catch(() => [] as any[])
    const policyIds = [...new Set((sessions as any[]).map(s => s.policy_id))]
    const policies = policyIds.length
      ? await (prisma as any).policy.findMany({ where: { id: { in: policyIds }, tenant_id: tenantId }, select: { id: true, filename: true } }).catch(() => [])
      : []
    const titleById = new Map((policies as any[]).map(p => [p.id, policyTitleFromFilename(p.filename)]))

    const byPolicy = new Map<string, any>()
    for (const s of sessions as any[]) {
      const g = byPolicy.get(s.policy_id) ?? {
        policy_id: s.policy_id, title: titleById.get(s.policy_id) ?? 'Policy',
        sessions: 0, total_seconds: 0, best_scroll_pct: 0, reached_end: false, marked_read: false, last_read_at: null,
      }
      g.sessions       += 1
      g.total_seconds  += s.seconds_spent ?? 0
      g.best_scroll_pct = Math.max(g.best_scroll_pct, s.max_scroll_pct ?? 0)
      g.reached_end     = g.reached_end || !!s.reached_end
      g.marked_read     = g.marked_read || !!s.marked_read
      if (!g.last_read_at) g.last_read_at = s.created_at   // sessions are newest-first
      byPolicy.set(s.policy_id, g)
    }
    const items = [...byPolicy.values()].filter(i => titleById.has(i.policy_id))
    const scrolls = items.map(i => i.best_scroll_pct)
    reading = {
      items,
      summary: {
        policies_read:  items.length,
        avg_scroll_pct: scrolls.length ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length) : null,
        total_seconds:  items.reduce((a, i) => a + i.total_seconds, 0),
        thorough:       items.filter(i => i.best_scroll_pct >= 90).length,
        skimmed:        items.filter(i => i.marked_read && i.best_scroll_pct < 70).length,
      },
    }
  }

  // ── Knowledge-gap follow-up (admin record only) ─────────────────────────────
  let followUp: any = null
  if (opts.includeReading) {
    const gaps: any[] = []
    // Training gaps — questions currently answered incorrectly.
    for (const e of tEnr as any[]) {
      for (const a of (e.answers ?? [])) {
        if (a.is_correct === false) {
          gaps.push({ source: 'training', topic: e.module?.name, enrollment_id: e.id, question: a.question_text ?? null, when: a.answered_at })
        }
      }
    }
    // Induction gaps — question steps currently answered incorrectly.
    for (const q of (inductionQuestions?.items ?? [])) {
      if (!q.is_correct) gaps.push({ source: 'induction', topic: q.flow_name, question: q.question, their_answer: q.selected, correct_answer: q.correct_answer, when: q.answered_at })
    }

    const lastReview = await (prisma as any).knowledgeGapReview.findFirst({
      where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' },
    }).catch(() => null)
    const reviewedAt = lastReview ? new Date(lastReview.created_at).getTime() : 0
    const unreviewed = gaps.filter(g => !g.when || new Date(g.when).getTime() > reviewedAt)

    // How this person has closed gaps: engaged with the lesson ("Learn & retry")
    // vs simply re-answered ("Just retry").
    const attempts = await (prisma as any).remediationAttempt.findMany({
      where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, take: 50,
    }).catch(() => [])
    const learnCount = (attempts as any[]).filter(a => a.method !== 'retry').length
    const retryCount = (attempts as any[]).filter(a => a.method === 'retry').length
    const remediation = {
      learn:  learnCount,
      retry:  retryCount,
      total:  attempts.length,
      recent: (attempts as any[]).slice(0, 10).map(a => ({ source: a.source, method: a.method === 'retry' ? 'retry' : 'learn', label: a.label ?? null, when: a.created_at })),
    }

    followUp = {
      gaps,
      open_count:       gaps.length,
      unreviewed_count: unreviewed.length,
      needs_follow_up:  unreviewed.length > 0,
      last_review:      lastReview ? { at: lastReview.created_at, by: lastReview.reviewed_by_name ?? null, note: lastReview.note ?? null } : null,
      remediation,
    }
  }

  return {
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role, job_role: user.job_role,
      specialisms: user.specialisms, phone_number: user.phone_number, shift_type: user.shift_type,
      first_language: user.first_language, second_language: user.second_language,
      comms_always_first_language: user.comms_always_first_language, is_active: user.is_active,
      created_at: user.created_at, first_login_at: user.first_login_at, last_login_at: user.last_login_at,
    },
    training: { items: training, summary: trainingSummary },
    annual_training: { items: annualTraining, summary: annualSummary },
    onboarding: { items: onboarding, summary: onboardingSummary },
    engagement, flags, trends, timeline, benchmarks, reading,
    induction_questions: inductionQuestions,
    follow_up: followUp,
  }
}
