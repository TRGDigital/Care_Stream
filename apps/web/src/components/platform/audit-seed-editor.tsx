'use client'

// Preview + edit a platform audit seed. Preview shows the audit the way a tenant
// sees it in their live account; Edit lets you correct section titles, question
// wording and response types, add/remove questions and add sections. Because seed
// templates are shared read-only by every tenant, saving reaches all of them at
// once — edits are applied in place (question history is preserved) by the API.

import { useMemo, useState } from 'react'
import { createPlatformClient, type AuditSeedTemplate } from '@/lib/platform-api'
import { clsx } from 'clsx'
import { Plus, Trash2, Loader2, X, Pencil, Eye, AlertTriangle, ClipboardCheck, CheckCircle2 } from 'lucide-react'

const FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic',
}
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'yes_no',    label: 'Yes / No' },
  { value: 'yes_no_na', label: 'Yes / No / N/A' },
  { value: 'findings',  label: 'Findings (free text)' },
  { value: 'free_text', label: 'Free text' },
]

let _uid = 0
const uid = () => `k${_uid++}`

type QDraft = { _k: string; id?: string; question_text: string; question_type: string }
type SDraft = { _k: string; id?: string; title: string; questions: QDraft[] }

function toDraft(t: AuditSeedTemplate): SDraft[] {
  return t.sections.map(s => ({
    _k: uid(), id: s.id, title: s.title,
    questions: s.questions.map(q => ({ _k: uid(), id: q.id, question_text: q.question_text, question_type: q.question_type })),
  }))
}

// A faithful, disabled rendering of the response controls a tenant gets per type.
function PreviewControls({ type }: { type: string }) {
  if (type === 'findings') {
    return (
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {['Findings', 'Actions & Timescales'].map(l => (
          <div key={l}>
            <p className="mb-1 text-[11px] font-medium text-neutral-mid">{l}</p>
            <div className="h-9 rounded-md border border-dashed border-gray-200 bg-neutral-light/40" />
          </div>
        ))}
      </div>
    )
  }
  if (type === 'free_text') {
    return <div className="mt-2 h-9 rounded-md border border-dashed border-gray-200 bg-neutral-light/40" />
  }
  const opts = type === 'yes_no_na' ? ['Yes', 'No', 'N/A'] : ['Yes', 'No']
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {opts.map(o => (
        <span key={o} className="rounded-md border border-gray-200 bg-neutral-light/50 px-3 py-1 text-xs font-medium text-neutral-mid">{o}</span>
      ))}
      <span className="ml-1 text-[11px] text-neutral-mid/70">+ notes</span>
    </div>
  )
}

export function AuditSeedEditor({
  token, template, reviewed, onToggleReviewed, onClose, onSaved,
}: {
  token: string
  template: AuditSeedTemplate
  reviewed: boolean
  onToggleReviewed: (next: boolean) => void
  onClose: () => void
  onSaved: (t: AuditSeedTemplate) => void
}) {
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(template.name)
  const [description, setDesc]  = useState(template.description ?? '')
  const [frequency, setFreq]    = useState(template.frequency)
  const [sections, setSections] = useState<SDraft[]>(() => toDraft(template))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const totalQuestions = useMemo(() => sections.reduce((n, s) => n + s.questions.length, 0), [sections])

  function patchSection(sk: string, patch: Partial<SDraft>) {
    setSections(ss => ss.map(s => (s._k === sk ? { ...s, ...patch } : s)))
  }
  function patchQuestion(sk: string, qk: string, patch: Partial<QDraft>) {
    setSections(ss => ss.map(s => s._k === sk
      ? { ...s, questions: s.questions.map(q => (q._k === qk ? { ...q, ...patch } : q)) }
      : s))
  }
  function addQuestion(sk: string) {
    setSections(ss => ss.map(s => s._k === sk
      ? { ...s, questions: [...s.questions, { _k: uid(), question_text: '', question_type: 'yes_no' }] }
      : s))
  }
  function removeQuestion(sk: string, qk: string) {
    setSections(ss => ss.map(s => s._k === sk ? { ...s, questions: s.questions.filter(q => q._k !== qk) } : s))
  }
  function addSection() {
    setSections(ss => [...ss, { _k: uid(), title: '', questions: [{ _k: uid(), question_text: '', question_type: 'yes_no' }] }])
  }
  function removeSection(sk: string) {
    setSections(ss => ss.filter(s => s._k !== sk))
  }

  function startEditing() { setError(''); setEditing(true) }
  function cancelEditing() {
    // Reset the draft back to the saved template.
    setName(template.name); setDesc(template.description ?? ''); setFreq(template.frequency)
    setSections(toDraft(template)); setError(''); setEditing(false)
  }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Give the audit a name.'); return }
    const cleaned = sections
      .map(s => ({ ...s, title: s.title.trim(), questions: s.questions.filter(q => q.question_text.trim()) }))
      .filter(s => s.questions.length)
    if (!cleaned.length) { setError('Add at least one section with a question.'); return }
    if (cleaned.some(s => !s.title)) { setError('Every section needs a title.'); return }
    setSaving(true)
    try {
      const { template: updated } = await createPlatformClient(token).auditSeeds.update(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        frequency,
        sections: cleaned.map(s => ({
          id: s.id,
          title: s.title,
          questions: s.questions.map(q => ({ id: q.id, question_text: q.question_text.trim(), question_type: q.question_type })),
        })),
      })
      onSaved(updated)
      // Re-seat the draft on the server's canonical response, then drop back to preview.
      setName(updated.name); setDesc(updated.description ?? ''); setFreq(updated.frequency)
      setSections(toDraft(updated)); setEditing(false)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the audit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-teal" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-neutral-dark">{editing ? 'Edit audit template' : name}</h2>
              <p className="mt-0.5 text-xs text-neutral-mid">
                {editing
                  ? 'Correct the content, then save. This is a shared template.'
                  : <>Preview · {FREQUENCY_LABELS[frequency] ?? frequency} · {sections.length} sections · {totalQuestions} questions</>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onToggleReviewed(!reviewed)}
              title={reviewed ? 'Content-checked — click to unmark' : 'Mark as content-checked'}
              className={clsx('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                reviewed ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-white text-neutral-mid hover:bg-neutral-light')}
            >
              <CheckCircle2 size={15} className={reviewed ? '' : 'opacity-40'} /> {reviewed ? 'Checked' : 'Mark checked'}
            </button>
            {!editing && (
              <button onClick={startEditing} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-dark">
                <Pencil size={14} /> Edit content
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5">
          {editing && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>This template is shared by every tenant. Saving updates their live audits immediately. Existing question wording is edited in place, so answers already recorded are kept; removed questions are hidden from new runs.</span>
            </div>
          )}

          {/* Template meta (edit only) */}
          {editing && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">How often</label>
                <select value={frequency} onChange={e => setFreq(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm capitalize focus:border-teal focus:outline-none">
                  {FREQS.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Description (optional)</label>
                <input value={description} onChange={e => setDesc(e.target.value)} placeholder="What this audit covers" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              </div>
            </div>
          )}
          {!editing && description && <p className="mb-5 text-sm text-neutral-mid">{description}</p>}

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((s, si) => (
              <div key={s._k} className="rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-neutral-light/40 px-4 py-2.5">
                  <span className="text-xs font-bold text-teal">{si + 1}</span>
                  {editing ? (
                    <>
                      <input value={s.title} onChange={e => patchSection(s._k, { title: e.target.value })} placeholder="Section title" className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-neutral-dark focus:border-teal focus:outline-none" />
                      <button onClick={() => removeSection(s._k)} disabled={sections.length === 1} aria-label="Remove section" className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
                    </>
                  ) : (
                    <p className="text-sm font-semibold uppercase tracking-wide text-neutral-dark">{s.title}</p>
                  )}
                </div>

                <div className={clsx('px-4 py-3', editing ? 'space-y-2' : 'space-y-3')}>
                  {s.questions.map((q, qi) => (
                    editing ? (
                      <div key={q._k} className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-100 bg-white p-2.5">
                        <span className="mt-2 w-5 shrink-0 text-center text-xs font-semibold text-neutral-mid">{qi + 1}</span>
                        <textarea value={q.question_text} onChange={e => patchQuestion(s._k, q._k, { question_text: e.target.value })} rows={2} placeholder="Question wording" className="min-w-[14rem] flex-1 resize-y rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
                        <select value={q.question_type} onChange={e => patchQuestion(s._k, q._k, { question_type: e.target.value })} className="rounded-md border border-gray-200 px-2 py-2 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button onClick={() => removeQuestion(s._k, q._k)} disabled={s.questions.length === 1} aria-label="Remove question" className="mt-1.5 shrink-0 rounded p-1 text-neutral-mid hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
                      </div>
                    ) : (
                      <div key={q._k} className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums text-neutral-mid/60">{qi + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm text-neutral-dark">{q.question_text}</p>
                          <PreviewControls type={q.question_type} />
                        </div>
                      </div>
                    )
                  ))}
                  {editing && (
                    <button onClick={() => addQuestion(s._k)} className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"><Plus size={14} /> Add question</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {editing && (
            <button onClick={addSection} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-teal/40 px-3 py-2 text-sm font-semibold text-teal hover:bg-teal-light/30"><Plus size={15} /> Add section</button>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-2 rounded-b-2xl border-t border-gray-100 bg-white px-6 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-mid">
            {editing ? <><Pencil size={13} /> Editing</> : <><Eye size={13} /> This is what tenants see</>}
          </span>
          {editing ? (
            <div className="flex gap-2">
              <button onClick={cancelEditing} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light disabled:opacity-50">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save changes'}
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Close</button>
          )}
        </div>
      </div>
    </div>
  )
}
