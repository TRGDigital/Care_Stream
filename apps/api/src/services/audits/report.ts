// The audit report: one shape for the report page, the printed view and the PDF, so they never disagree.

import { prisma } from '../../db/client'
import { SECTIONS_WITH_ALL_QUESTIONS, shapeRunTemplate, visibleQuestions, answerText, outcomeFor } from '../../lib/audit-questions'

export async function qualityStatementNames(ids: string[]): Promise<Record<string, { name: string; key_question: string }>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const rows = await (prisma as any).qualityStatement.findMany({ where: { id: { in: unique } }, select: { id: true, name: true, key_question: true } }).catch(() => [])
  return Object.fromEntries((rows as any[]).map(r => [r.id, { name: r.name, key_question: r.key_question }]))
}

export async function buildAuditReport(tenantId: string, runId: string) {
  const rawRun = await (prisma as any).auditRun.findFirst({
    where: { id: runId, tenant_id: tenantId },
    include: {
      template: { include: SECTIONS_WITH_ALL_QUESTIONS },
      answers: true,
      tenant:  { select: { name: true, logo_url: true } },
    },
  })
  if (!rawRun) return null
  const run = shapeRunTemplate(rawRun)

  const answerMap = new Map<string, any>(run.answers.map((a: any) => [a.question_id, a]))
  const visibleIds = new Set(visibleQuestions(run).map((q: any) => q.id))
  const qsNames = await qualityStatementNames(run.template.sections.flatMap((s: any) => s.questions.map((q: any) => q.quality_statement_id)))

  return {
    id:                run.id,
    template_id:       run.template_id,
    organisation:      run.tenant.name,
    logo_url:          run.tenant.logo_url ?? null,
    audit_name:        run.template.name,
    template_version:  run.template_version ?? null,
    subject:           run.room_number,
    subject_room:      run.subject_room,
    subject_scope:     run.template.subject_scope ?? 'none',
    auditor_name:      run.auditor_name,
    auditor_role:      run.auditor_role,
    audit_month:       run.audit_month,
    status:            run.status,
    completed_at:      run.completed_at,
    approval_status:   run.approval_status,
    submitted_by:      run.submitted_by,
    submitted_at:      run.submitted_at,
    approved_by_name:  run.approved_by_name,
    approved_by_role:  run.approved_by_role,
    approved_at:       run.approved_at,
    approval_note:     run.approval_note,
    auditor_signed_name: run.auditor_signed_name ?? null,
    auditor_signed_at:   run.auditor_signed_at ?? null,
    has_auditor_signature: !!run.auditor_signature_key,
    manager_signed_at:   run.manager_signed_at ?? null,
    has_manager_signature: !!run.manager_signature_key,
    strengths:         run.strengths,
    improvements:      run.improvements,
    actions_deadline:  run.actions_deadline,
    ai_recommendations: run.ai_recommendations,
    sections: run.template.sections.map((s: any) => ({
      title:     s.title,
      questions: s.questions.filter((q: any) => visibleIds.has(q.id)).map((q: any) => {
        const a: any = answerMap.get(q.id)
        return {
          id:            q.id,
          question:      q.question_text,
          question_type: q.question_type,
          settings:      q.settings ?? null,
          answer_yn:     a?.answer_yn    ?? null,
          answer_na:     a?.answer_na    ?? false,
          no_compliant:  a?.no_compliant ?? null,
          answer_value:  a?.answer_value ?? null,
          answer_text:   answerText(q, a),
          outcome:       outcomeFor(q, a),
          quality_statement: q.quality_statement_id ? (qsNames[q.quality_statement_id]?.name ?? null) : null,
          outcome_text:  a?.outcome_text ?? null,
          actions_text:  a?.actions_text ?? null,
        }
      }),
    })).filter((s: any) => s.questions.length),
  }

}
