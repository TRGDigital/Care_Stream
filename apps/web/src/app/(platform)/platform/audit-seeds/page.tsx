'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type AuditSeedTemplate } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { ChevronDown, ClipboardCheck, Loader2, Eye, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { AuditSeedEditor } from '@/components/platform/audit-seed-editor'

const FREQUENCY_LABELS: Record<string, string> = {
  daily:     'Daily',
  weekly:    'Weekly',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
  periodic:  'Periodic',
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  yes_no:     { label: 'Yes / No',          color: 'bg-blue-50 text-blue-700'   },
  yes_no_na:  { label: 'Yes / No / N/A',    color: 'bg-purple-50 text-purple-700' },
  findings:   { label: 'Findings',          color: 'bg-amber-50 text-amber-700'  },
  free_text:  { label: 'Free text',         color: 'bg-gray-100 text-gray-600'   },
}

function QuestionTypeBadge({ type }: { type: string }) {
  const t = TYPE_LABELS[type] ?? { label: type, color: 'bg-gray-100 text-gray-500' }
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', t.color)}>{t.label}</span>
  )
}

function FrequencyBadge({ frequency }: { frequency: string }) {
  return (
    <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal">
      {FREQUENCY_LABELS[frequency] ?? frequency}
    </span>
  )
}

function ReviewedToggle({ reviewed, onToggle, size = 'sm' }: { reviewed: boolean; onToggle: (next: boolean) => void; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={() => onToggle(!reviewed)}
      title={reviewed ? 'Content-checked — click to unmark' : 'Mark as content-checked'}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors',
        size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1.5 text-xs',
        reviewed
          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-gray-200 bg-white text-neutral-mid hover:bg-neutral-light',
      )}
    >
      <CheckCircle2 size={size === 'md' ? 15 : 13} className={reviewed ? '' : 'opacity-40'} />
      {reviewed ? 'Checked' : 'Mark checked'}
    </button>
  )
}

function TemplateRow({ template, onOpen, onToggleReviewed }: { template: AuditSeedTemplate; onOpen: () => void; onToggleReviewed: (next: boolean) => void }) {
  const [open, setOpen] = useState(false)

  const totalQuestions = template.sections.reduce((n, s) => n + s.questions.length, 0)
  const typeBreakdown  = Object.entries(
    template.sections.flatMap(s => s.questions).reduce<Record<string, number>>((acc, q) => {
      acc[q.question_type] = (acc[q.question_type] ?? 0) + 1
      return acc
    }, {}),
  )

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex w-full items-center gap-3 px-4 py-3.5">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown size={16} className={clsx('shrink-0 text-neutral-mid transition-transform', !open && '-rotate-90')} />
          <ClipboardCheck size={15} className="shrink-0 text-teal" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-dark">{template.name}</p>
            {template.description && (
              <p className="mt-0.5 text-xs text-neutral-mid line-clamp-1">{template.description}</p>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <FrequencyBadge frequency={template.frequency} />
          <span className="hidden text-xs text-neutral-mid sm:inline">{template.sections.length} sections · {totalQuestions} questions</span>
          <ReviewedToggle reviewed={!!template.seed_reviewed} onToggle={onToggleReviewed} />
          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40"
          >
            <Eye size={13} /> Preview / edit
          </button>
        </div>
      </div>

      {open && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {/* Type breakdown */}
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {typeBreakdown.map(([type, count]) => (
              <span key={type} className="flex items-center gap-1.5 text-xs text-neutral-mid">
                <QuestionTypeBadge type={type} />
                <span className="font-medium text-neutral-dark">{count}</span>
              </span>
            ))}
          </div>

          {/* Sections & questions */}
          {template.sections.map((section, si) => (
            <div key={section.id} className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.questions.map((q, qi) => (
                  <div key={q.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-xs text-neutral-mid/60 tabular-nums w-5 shrink-0 text-right">{qi + 1}.</span>
                    <p className="flex-1 text-xs text-neutral-dark">{q.question_text}</p>
                    {q.question_type !== 'yes_no' && (
                      <QuestionTypeBadge type={q.question_type} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Platform-facing explainer of how the audit AI recommendations are generated and what feeds
// the prompt. Collapsible so it stays out of the way once read.
function AiRecsAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/40">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-5 py-4 text-left">
        <ClipboardCheck size={16} className="shrink-0 text-indigo-600" />
        <span className="text-sm font-semibold text-neutral-dark">How the AI recommendations are generated</span>
        <ChevronDown size={16} className={clsx('ml-auto shrink-0 text-neutral-mid transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-indigo-100 px-5 py-4 text-sm leading-relaxed text-neutral-dark">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">When it runs</p>
            <p className="mt-1">When a Monthly Audit is completed, CareStream generates a set of AI recommendations. If the tenant has <strong>manager approval</strong> switched on for audits, the recommendations are generated at the point the care manager approves; otherwise they are generated on completion.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">What feeds the AI prompt</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /><strong>The audit itself</strong> — every question and its answer (Yes / No / N/A, findings text, and actions text), section by section.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /><strong>The auditor&rsquo;s summary</strong> — strengths, areas requiring improvement, and the action deadline.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /><strong>Context</strong> — audit name, organisation, auditor name and role, and the audit month.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /><strong>The 34 CQC Single Assessment Framework quality statements</strong> — grouped by key question, read live from <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">/platform/quality-statements</code>, so the CQC section cites real statements rather than guessing.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">The prompt</p>
            <p className="mt-1">The instructions come from the editable <strong>Monthly Audit — AI Recommendations</strong> prompt in <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">/platform/prompts</code>. Editing it changes the output for every tenant. It can position the quality statements with a <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">{'{{cqc_quality_statements}}'}</code> placeholder; if the placeholder is absent, the statements are appended automatically.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">The output</p>
            <p className="mt-1">A structured report with Immediate actions, Priority improvements, CQC compliance notes, Commendations, and Next month focus. It is grounded only in the audit data provided, and is shown to the tenant as formatted text on the audit and its printable report.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuditSeedsPage() {
  const token                        = usePlatformAuth()
  const [templates, setTemplates]    = useState<AuditSeedTemplate[]>([])
  const [loading,   setLoading]      = useState(true)
  const [error,     setError]        = useState<string | null>(null)
  const [search,    setSearch]       = useState('')
  const [editId,    setEditId]       = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).auditSeeds.list()
      .then(d => setTemplates(d.templates))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const FREQ_ORDER = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']

  const filtered = search
    ? templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.sections.some(s =>
          s.questions.some(q => q.question_text.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : templates

  const grouped = FREQ_ORDER.reduce<Record<string, AuditSeedTemplate[]>>((acc, f) => {
    acc[f] = filtered.filter(t => t.frequency === f)
    return acc
  }, {})

  const totalQuestions = templates.reduce(
    (n, t) => n + t.sections.reduce((m, s) => m + s.questions.length, 0),
    0,
  )
  const reviewedCount = templates.filter(t => t.seed_reviewed).length

  // Mark/unmark a seed as content-checked (optimistic; revert on failure).
  async function toggleReviewed(id: string, next: boolean) {
    setTemplates(ts => ts.map(t => (t.id === id ? { ...t, seed_reviewed: next } : t)))
    try {
      await createPlatformClient(token!).auditSeeds.setReviewed(id, next)
    } catch {
      setTemplates(ts => ts.map(t => (t.id === id ? { ...t, seed_reviewed: !next } : t)))
    }
  }

  return (
    <PlatformShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Audit Seeds</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              {templates.length} audit template{templates.length !== 1 ? 's' : ''} · {totalQuestions} total questions seeded into the platform
            </p>
            {templates.length > 0 && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-mid">
                <CheckCircle2 size={13} className={reviewedCount === templates.length ? 'text-green-600' : 'text-neutral-mid/50'} />
                {reviewedCount} of {templates.length} content-checked
              </p>
            )}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates or questions…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none"
          />
        </div>

        {/* How the AI recommendations are generated (collapsible) */}
        <AiRecsAccordion />

        {/* Info panel */}
        <div className="rounded-xl border border-teal/20 bg-teal-light/30 p-5 text-sm space-y-3">
          <p className="font-semibold text-teal-dark">How audit seeds work</p>
          <p className="text-neutral-dark leading-relaxed">
            These are the platform-default audit templates seeded into every CareStream tenant. They appear in each
            tenant's <strong>Monthly Audits</strong> page as shared read-only templates.
            Tenants can start a run against any template, answer questions via the web form or WhatsApp,
            and generate AI recommendations on completion. Templates are seeded on the first
            <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs font-mono">GET /audits/templates</code>
            request per environment.
          </p>
          <div className="rounded-lg border border-teal/20 bg-white px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-dark">Question types</p>
            <ul className="space-y-1 text-neutral-dark leading-relaxed">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Yes / No</strong> — toggle answer with optional outcome and actions text fields.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Yes / No / N/A</strong> — same as Yes/No with a third Not Applicable option (e.g. daily room checklists).</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Findings</strong> — two free-text fields labelled Findings and Actions &amp; Timescales; no toggle (e.g. Medicines Management).</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Free text</strong> — single narrative text field; no toggle (e.g. Fire Drill observations).</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-mid">
            {templates.length === 0
              ? 'No audit seeds found. Templates are seeded automatically on the first request to /audits/templates.'
              : 'No results for that search.'}
          </p>
        ) : (
          <div className="space-y-6">
            {FREQ_ORDER.map(freq => {
              const group = grouped[freq] ?? []
              if (group.length === 0) return null
              return (
                <div key={freq}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-dark">{FREQUENCY_LABELS[freq]}</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-neutral-mid">{group.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map(t => <TemplateRow key={t.id} template={t} onOpen={() => setEditId(t.id)} onToggleReviewed={next => toggleReviewed(t.id, next)} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editId && token && (() => {
        const t = templates.find(x => x.id === editId)
        if (!t) return null
        return (
          <AuditSeedEditor
            token={token}
            template={t}
            reviewed={!!t.seed_reviewed}
            onToggleReviewed={next => toggleReviewed(t.id, next)}
            onClose={() => setEditId(null)}
            onSaved={updated => setTemplates(ts => ts.map(x => (x.id === updated.id ? { ...updated, seed_reviewed: x.seed_reviewed, seed_reviewed_at: x.seed_reviewed_at } : x)))}
          />
        )
      })()}
    </PlatformShell>
  )
}
