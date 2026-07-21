// ─── Audit action plan ────────────────────────────────────────────────────────
// When an audit's recommendations are generated we also extract a structured DRAFT action plan.
// The tenant reviews it, edits actions, assigns them to staff and sets due dates, then approves
// it — after which it is a tracked list worked to completion.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

const PRIORITY_RANK: Record<string, number> = { immediate: 0, priority: 1, monitor: 2 }
const normPriority = (p: any): string => (p === 'immediate' || p === 'monitor' ? p : 'priority')

// Extract draft actions from a completed audit (grounded in its evidence). Never throws.
export async function extractDraftActions(auditName: string, auditResultsText: string): Promise<Array<{ description: string; priority: string }>> {
  const system = 'You turn a completed UK care-home audit into a short, practical action plan for a busy care team. Base every action only on the audit evidence.'
  const user = [
    `From the "${auditName}" audit below, list the specific actions the team should take to fix gaps and improve. For each action give:`,
    '- description: what to do, one clear sentence (say what to do, not just what is wrong).',
    '- priority: "immediate" (a safety, safeguarding or compliance risk, do within days), "priority" (fix within a few weeks), or "monitor" (keep an eye on, or check at the next audit).',
    'Only include real actions supported by the audit. If there is nothing to act on, return an empty list. Return at most 12 actions.',
    'Return ONLY JSON: {"actions":[{"description":"...","priority":"immediate|priority|monitor"}]}',
    '',
    'AUDIT RESULTS:',
    auditResultsText.slice(0, 12000),
  ].join('\n')
  try {
    const out = await callClaude(system, user, { maxTokens: 900, temperature: 0 })
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    return (Array.isArray(parsed.actions) ? parsed.actions : [])
      .map((a: any) => ({ description: String(a.description ?? '').trim(), priority: normPriority(a.priority) }))
      .filter((a: any) => a.description)
      .slice(0, 12)
  } catch {
    return []
  }
}

// Create the draft plan for a run — only when it has none yet, so tenant edits are never overwritten.
export async function createDraftActionPlan(tenantId: string, runId: string, actions: Array<{ description: string; priority: string }>): Promise<void> {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { action_plan_status: true } })
  if (!run || run.action_plan_status !== 'none') return
  if (actions.length) {
    await (prisma as any).auditAction.createMany({
      data: actions.map(a => ({ run_id: runId, tenant_id: tenantId, description: a.description.slice(0, 1000), priority: a.priority, source: 'ai' })),
    }).catch(() => {})
  }
  await (prisma as any).auditRun.update({ where: { id: runId }, data: { action_plan_status: 'draft' } }).catch(() => {})
}

// Generate a draft plan on demand for an already-completed audit that has none yet (e.g. audits
// completed before the tracker existed). Extracts the actions from the run's recommendations.
export async function generateActionPlanForRun(tenantId: string, runId: string): Promise<void> {
  const run = await (prisma as any).auditRun.findFirst({
    where: { id: runId, tenant_id: tenantId },
    select: { action_plan_status: true, ai_recommendations: true, template: { select: { name: true } } },
  })
  if (!run) throw new Error('Audit not found')
  if (run.action_plan_status !== 'none') return
  if (!run.ai_recommendations) throw new Error('Complete the audit first so there are recommendations to work from.')
  const actions = await extractDraftActions(run.template?.name ?? 'Audit', run.ai_recommendations)
  await createDraftActionPlan(tenantId, runId, actions)
}

export async function getActionPlan(tenantId: string, runId: string) {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { action_plan_status: true } })
  if (!run) return null
  const rows = await (prisma as any).auditAction.findMany({ where: { run_id: runId, tenant_id: tenantId } })
  const actions = (rows as any[])
    .map(a => ({ id: a.id, description: a.description, priority: a.priority, due_date: a.due_date ? new Date(a.due_date).toISOString() : null, assigned_to: a.assigned_to ?? null, status: a.status, source: a.source, done_at: a.done_at ? new Date(a.done_at).toISOString() : null }))
    .sort((x, y) => (PRIORITY_RANK[x.priority] ?? 1) - (PRIORITY_RANK[y.priority] ?? 1))
  return { status: run.action_plan_status as string, actions }
}

export async function addAction(tenantId: string, runId: string, description: string, priority: string): Promise<void> {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true } })
  if (!run) throw new Error('Audit not found')
  await (prisma as any).auditAction.create({ data: { run_id: runId, tenant_id: tenantId, description: description.slice(0, 1000), priority: normPriority(priority), source: 'manual' } })
}

export async function updateAction(tenantId: string, actionId: string, patch: { description?: string; priority?: string; due_date?: string | null; assigned_to?: string | null; status?: string }): Promise<void> {
  const existing = await (prisma as any).auditAction.findFirst({ where: { id: actionId, tenant_id: tenantId }, select: { id: true, status: true } })
  if (!existing) throw new Error('Action not found')
  const data: any = {}
  if (patch.description !== undefined) data.description = String(patch.description).slice(0, 1000)
  if (patch.priority !== undefined) data.priority = normPriority(patch.priority)
  if (patch.due_date !== undefined) data.due_date = patch.due_date ? new Date(patch.due_date) : null
  if (patch.assigned_to !== undefined) data.assigned_to = patch.assigned_to ? String(patch.assigned_to).slice(0, 120) : null
  if (patch.status !== undefined && ['open', 'in_progress', 'done'].includes(patch.status)) {
    data.status = patch.status
    data.done_at = patch.status === 'done' ? new Date() : null
  }
  await (prisma as any).auditAction.update({ where: { id: actionId }, data })
}

export async function deleteAction(tenantId: string, actionId: string): Promise<void> {
  const existing = await (prisma as any).auditAction.findFirst({ where: { id: actionId, tenant_id: tenantId }, select: { id: true } })
  if (!existing) throw new Error('Action not found')
  await (prisma as any).auditAction.delete({ where: { id: actionId } })
}

export async function approveActionPlan(tenantId: string, runId: string): Promise<void> {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true } })
  if (!run) throw new Error('Audit not found')
  await (prisma as any).auditRun.update({ where: { id: runId }, data: { action_plan_status: 'approved' } })
}
