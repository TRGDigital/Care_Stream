'use client'

// What a supervisor should know about a person's training before the meeting. Presentational: the data comes from the API
// (supervisor and admins only; see lib/supervision-training.ts on the API). Plain words, nothing is scored or judged by AI.
import { CheckCircle2, Clock, ListChecks } from 'lucide-react'
import type { TrainingBrief, TrainingBriefItem } from '@/lib/api-client'

const d = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

function Group({ title, tone, items, extra }: { title: string; tone: 'red' | 'amber' | 'green' | 'neutral'; items: TrainingBriefItem[]; extra: (i: TrainingBriefItem) => string }) {
  if (!items.length) return null
  const cls = { red: 'text-red-700', amber: 'text-amber-700', green: 'text-green-700', neutral: 'text-neutral-dark' }[tone]
  return (
    <div>
      <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${cls}`}>{title} ({items.length})</p>
      <ul className="space-y-0.5 text-sm text-neutral-dark">
        {items.slice(0, 8).map((i, k) => <li key={k} className="flex flex-wrap justify-between gap-x-3"><span>{i.module_name}</span><span className="text-xs text-neutral-mid">{extra(i)}</span></li>)}
        {items.length > 8 && <li className="text-xs text-neutral-mid">and {items.length - 8} more</li>}
      </ul>
    </div>
  )
}

export function TrainingBriefView({ brief }: { brief: TrainingBrief }) {
  const t = brief.training
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
        <span><strong className="text-neutral-dark">{brief.totals.assigned}</strong> courses allocated</span>
        <span><strong className="text-neutral-dark">{brief.totals.completed}</strong> completed</span>
        <span><strong className={brief.totals.overdue ? 'text-red-700' : 'text-neutral-dark'}>{brief.totals.overdue}</strong> overdue</span>
        {brief.totals.avg_score != null && <span>average score <strong className="text-neutral-dark">{brief.totals.avg_score}%</strong></span>}
        {brief.totals.cpd_completed > 0 && <span><strong className="text-neutral-dark">{brief.totals.cpd_hours}</strong> CPD hours</span>}
        <span>{brief.previous ? `since the last ${brief.previous.type} on ${d(brief.previous.held_on)}` : 'last 90 days'}</span>
      </div>

      {brief.topics.length > 0 && (
        <div className="rounded-lg border border-teal/25 bg-teal-light/20 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal"><ListChecks size={13} /> Worth raising</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">{brief.topics.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}

      <Group title="Overdue" tone="red" items={t.overdue} extra={i => i.due_date ? `was due ${d(i.due_date)}` : ''} />
      <Group title="Expired, needs renewing" tone="red" items={t.expired} extra={() => ''} />
      <Group title="Due in the next 30 days" tone="amber" items={t.due_soon} extra={i => i.due_date ? `due ${d(i.due_date)}` : ''} />
      <Group title="In progress" tone="neutral" items={t.in_progress} extra={() => 'started'} />
      <Group title="Low scores" tone="amber" items={t.low_scores} extra={i => i.score_pct != null ? `${i.score_pct}%` : ''} />
      <Group title="Completed since" tone="green" items={t.completed_since} extra={i => `${i.completed_at ? d(i.completed_at) : ''}${i.score_pct != null ? `, ${i.score_pct}%` : ''}`} />

      {brief.cqc.assigned > 0 && (
        <p className="text-xs text-neutral-mid">CQC prep: <strong className="text-neutral-dark">{brief.cqc.answered}</strong> of {brief.cqc.assigned} answered{brief.cqc.avg_score != null ? `, average ${brief.cqc.avg_score}%` : ''}{brief.cqc.weak.length ? `. Weaker areas: ${brief.cqc.weak.map(w => w.domain).join(', ')}` : ''}.</p>
      )}
      {brief.actions.filter(a => a.status !== 'done').length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-dark"><Clock size={12} /> Open actions from earlier</p>
          <ul className="space-y-0.5 text-sm text-neutral-dark">{brief.actions.filter(a => a.status !== 'done').map(a => <li key={a.id}>{a.description}{a.set_on ? <span className="text-xs text-neutral-mid"> (set {d(a.set_on)})</span> : null}</li>)}</ul>
        </div>
      )}
      {brief.actions.filter(a => a.status === 'done' && a.module_name).length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-green-700"><CheckCircle2 size={13} className="mt-0.5 shrink-0" /> Done since: {brief.actions.filter(a => a.status === 'done' && a.module_name).map(a => a.module_name).join(', ')}</p>
      )}
      {brief.topics.length === 0 && t.overdue.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-green-700"><CheckCircle2 size={15} /> Nothing to flag on training.</p>
      )}
      <p className="text-[11px] text-neutral-mid/80">Built from their training records on {d(brief.generated_at)}. Shown to the supervisor and admins only.</p>
    </div>
  )
}
