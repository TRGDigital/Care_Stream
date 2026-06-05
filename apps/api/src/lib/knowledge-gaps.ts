// Shared knowledge-gap computation: open gaps (training + induction combined),
// most-missed questions, weakest topics, and remediation effectiveness. Used by
// the /analytics/knowledge-gaps endpoint and the weekly digest / snapshot jobs.

import { prisma } from '../db/client'

export type KnowledgeGapData = {
  summary: {
    open_gaps: number; open_training: number; open_induction: number
    staff_with_gaps: number; resolved_30d: number; resolved_7d: number
    learn: number; retry: number; engaged_pct: number | null
  }
  top_missed: Array<{ source: string; topic: string; question: string; miss_count: number; staff_count: number }>
  weak_topics: Array<{ source: string; topic: string; gaps: number; staff: number }>
  recent_resolutions: Array<{ user: string; source: string; method: string; label: string | null; when: any }>
}

export async function getKnowledgeGapData(tenantId: string): Promise<KnowledgeGapData> {
  const now    = Date.now()
  const since7  = new Date(now - 7  * 86_400_000)
  const since30 = new Date(now - 30 * 86_400_000)

  const [tEnr, oEnr, attempts, users] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId },
      select: { user_id: true, module: { select: { name: true, questions: true } }, answers: { where: { is_correct: false }, select: { question_id: true } } },
    }),
    (prisma as any).onboardingEnrollment.findMany({
      where:   { tenant_id: tenantId },
      include: { flow: { include: { steps: { select: { id: true, type: true, question: true } } } }, progress: { where: { answer_correct: false }, select: { step_id: true } } },
    }),
    (prisma as any).remediationAttempt.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, take: 300 }),
    (prisma as any).user.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true } }),
  ])
  const nameById = new Map((users as any[]).map(u => [u.id, u.name]))

  const byQ     = new Map<string, any>()
  const byTopic = new Map<string, any>()
  const staffWithGaps = new Set<string>()
  let openTraining = 0, openInduction = 0

  const bump = (source: string, ref: string, topic: string, question: string, userId: string) => {
    const qk = `${source}:${ref}`
    const g = byQ.get(qk) ?? { source, topic, question, miss_count: 0, staff: new Set<string>() }
    g.miss_count += 1; g.staff.add(userId); byQ.set(qk, g)
    const tk = `${source}:${topic}`
    const t = byTopic.get(tk) ?? { source, topic, gaps: 0, staff: new Set<string>() }
    t.gaps += 1; t.staff.add(userId); byTopic.set(tk, t)
    staffWithGaps.add(userId)
  }

  for (const e of tEnr as any[]) {
    const qById = new Map((Array.isArray(e.module?.questions) ? e.module.questions : []).map((q: any) => [q.id, q]))
    for (const a of (e.answers ?? [])) {
      const q: any = qById.get(a.question_id); if (!q) continue
      openTraining += 1
      bump('training', a.question_id, e.module?.name ?? 'Training', q.text ?? '', e.user_id)
    }
  }
  for (const e of oEnr as any[]) {
    const stepById = new Map((e.flow?.steps ?? []).map((s: any) => [s.id, s]))
    for (const p of (e.progress ?? [])) {
      const s: any = stepById.get(p.step_id); if (!s || s.type !== 'answer_question') continue
      openInduction += 1
      bump('induction', p.step_id, e.flow?.name ?? 'Induction', s.question ?? '', e.user_id)
    }
  }

  const learn = (attempts as any[]).filter(a => a.method !== 'retry').length
  const retry = (attempts as any[]).filter(a => a.method === 'retry').length
  const resolved_30d = (attempts as any[]).filter(a => new Date(a.created_at) >= since30).length
  const resolved_7d  = (attempts as any[]).filter(a => new Date(a.created_at) >= since7).length

  const top_missed = [...byQ.values()]
    .map(g => ({ source: g.source, topic: g.topic, question: g.question, miss_count: g.miss_count, staff_count: g.staff.size }))
    .sort((a, b) => b.miss_count - a.miss_count || b.staff_count - a.staff_count)
    .slice(0, 12)

  const weak_topics = [...byTopic.values()]
    .map(t => ({ source: t.source, topic: t.topic, gaps: t.gaps, staff: t.staff.size }))
    .sort((a, b) => b.gaps - a.gaps)
    .slice(0, 8)

  const recent_resolutions = (attempts as any[]).slice(0, 10).map(a => ({
    user: nameById.get(a.user_id) ?? 'Unknown', source: a.source,
    method: a.method === 'retry' ? 'retry' : 'learn', label: a.label ?? null, when: a.created_at,
  }))

  return {
    summary: {
      open_gaps:       openTraining + openInduction,
      open_training:   openTraining,
      open_induction:  openInduction,
      staff_with_gaps: staffWithGaps.size,
      resolved_30d, resolved_7d,
      learn, retry,
      engaged_pct: (learn + retry) > 0 ? Math.round((learn / (learn + retry)) * 100) : null,
    },
    top_missed,
    weak_topics,
    recent_resolutions,
  }
}
