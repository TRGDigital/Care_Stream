'use client'

// Training modals — extracted from the training page and lazy-loaded
// (next/dynamic) so this code is only fetched when a user opens a dialog.

import { useEffect, useState } from 'react'
import { SupervisionLinkCheckbox, useSupervisionLinkEnabled, linkAfterAssign } from './supervision-link'
import { createApiClient } from '@/lib/api-client'
import { useSession } from 'next-auth/react'
import { persistentCache } from '@/lib/page-cache'
import { AlertCircle, Bell, CheckCircle2, ExternalLink, Loader2, Save, X } from 'lucide-react'
import { fmt, DAY_NAMES, type Module, type Staff } from './training-shared'

// ─── Assign modal ─────────────────────────────────────────────────────────────

export function AssignModal({ api, staff, modules, onClose, onAssigned }: {
  api:        ReturnType<typeof createApiClient>
  staff:      Staff[]
  modules:    Module[]
  onClose:    () => void
  onAssigned: () => void
}) {
  const [selectedStaff,   setSelectedStaff]   = useState<Set<string>>(new Set(staff.map(s => s.id)))
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(modules.filter(m => m.category === 'statutory').map(m => m.id))
  )
  const [dueDate, setDueDate] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const linkOn = useSupervisionLinkEnabled(api)
  const [alsoLink, setAlsoLink] = useState(false)
  const [linkMsg, setLinkMsg]   = useState<string | null>(null)

  const statutory  = modules.filter(m => m.category === 'statutory')
  const specialist = modules.filter(m => m.category === 'specialist')

  if (linkMsg !== null) return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="font-semibold text-neutral-dark">Training assigned</h2>
        <p className="mt-3 rounded-lg bg-teal-light/30 px-3 py-2 text-sm text-neutral-dark">{linkMsg}</p>
        <div className="mt-4 flex justify-end"><button onClick={onAssigned} className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90">Done</button></div>
      </div>
    </div>
  )

  function toggleStaff(id: string) {
    setSelectedStaff(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleModule(id: string) {
    setSelectedModules(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function assign() {
    if (selectedStaff.size === 0 || selectedModules.size === 0) {
      setError('Select at least one staff member and one module.'); return
    }
    setSaving(true); setError('')
    try {
      await api.training.enroll({
        user_ids:   [...selectedStaff],
        module_ids: [...selectedModules],
        due_date:   dueDate || undefined,
      })
      // Only for a single course: ticking it across a dozen courses would flood each person's supervision.
      if (linkOn && alsoLink && selectedModules.size === 1) { setLinkMsg(await linkAfterAssign(api, [...selectedStaff], [...selectedModules][0])); setSaving(false) }
      else onAssigned()
    } catch (e: any) {
      setError(e.message ?? 'Failed to assign training')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Assign Training Modules</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>
        <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Staff selection */}
          <div className="px-5 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              Staff ({selectedStaff.size} selected)
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                  <input type="checkbox" checked={selectedStaff.has(s.id)} onChange={() => toggleStaff(s.id)}
                    className="h-4 w-4 accent-teal" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-dark truncate">{s.name}</p>
                    <p className="text-xs text-neutral-mid truncate">{s.job_role ?? s.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Module selection */}
          <div className="px-5 py-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              Modules ({selectedModules.size} selected)
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              <p className="text-xs font-semibold text-teal">Statutory (annual)</p>
              {statutory.map(m => (
                <label key={m.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                  <input type="checkbox" checked={selectedModules.has(m.id)} onChange={() => toggleModule(m.id)}
                    className="mt-0.5 h-4 w-4 accent-teal" />
                  <p className="text-sm text-neutral-dark leading-snug">{m.name}</p>
                </label>
              ))}
              {specialist.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-semibold text-indigo-500">Specialist</p>
                  {specialist.map(m => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-light">
                      <input type="checkbox" checked={selectedModules.has(m.id)} onChange={() => toggleModule(m.id)}
                        className="mt-0.5 h-4 w-4 accent-teal" />
                      <p className="text-sm text-neutral-dark leading-snug">{m.name}</p>
                    </label>
                  ))}
                </>
              )}
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-neutral-mid">Due date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            </div>
          </div>
        </div>

        {linkOn && selectedModules.size === 1 && <div className="px-6 pb-2"><SupervisionLinkCheckbox checked={alsoLink} onChange={setAlsoLink} /></div>}
        {error && <p className="px-6 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          <button onClick={assign} disabled={saving}
            className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="mr-1.5 inline animate-spin" />Assigning…</> : `Assign ${selectedModules.size} module${selectedModules.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Enrollment detail modal ──────────────────────────────────────────────────

export function EnrollmentModal({ api, enrollmentId, onClose, onUpdated }: {
  api:          ReturnType<typeof createApiClient>
  enrollmentId: string
  onClose:      () => void
  onUpdated:    () => void
}) {
  const { data: session } = useSession()
  const encKey = `admin-training-enrollment-${session?.user?.email ?? 'guest'}-${enrollmentId}`
  const [data,       setData]       = useState<any>(() => persistentCache.get<any>(encKey) ?? null)
  const [loading,    setLoading]    = useState(() => persistentCache.get<any>(encKey) === undefined)
  const [completing, setCompleting] = useState(false)
  const [removing,   setRemoving]   = useState(false)
  const [reminding,  setReminding]  = useState(false)
  const [remindMsg,  setRemindMsg]  = useState<{ ok: boolean; text: string } | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)

  useEffect(() => {
    api.training.getEnrollment(enrollmentId)
      .then(d => { setData(d.enrollment); persistentCache.set(encKey, d.enrollment) })
      .finally(() => setLoading(false))
  }, [enrollmentId])

  async function markComplete() {
    setCompleting(true)
    try {
      await api.training.complete(enrollmentId)
      onUpdated()
    } finally { setCompleting(false) }
  }

  // Email plus a hub notification. The reply says what actually went where, because either can be missing.
  async function sendReminder() {
    setReminding(true); setRemindMsg(null)
    try {
      const r = await api.training.remindEnrollment(enrollmentId)
      const how = [r.emailed ? 'an email' : '', r.push_sent ? `a hub notification (${r.push_sent} ${r.push_sent === 1 ? 'device' : 'devices'})` : ''].filter(Boolean)
      setRemindMsg({ ok: true, text: `Reminder sent: ${how.join(' and ') || 'done'}.${r.emailed && !r.push_sent ? ' No hub notification, as they have not switched them on in the hub app.' : ''}` })
      setData((d: any) => d ? { ...d, last_reminded_at: r.last_reminded_at, reminder_count: r.reminder_count } : d)
    } catch (e: any) { setRemindMsg({ ok: false, text: e?.message ?? 'Could not send the reminder.' }) }
    finally { setReminding(false) }
  }

  async function remove() {
    if (!confirm('Remove this training assignment?')) return
    setRemoving(true)
    try {
      await api.training.removeEnrollment(enrollmentId)
      onUpdated()
    } finally { setRemoving(false) }
  }

  const statusColour: Record<string, string> = {
    complete:    'bg-green-100 text-green-700',
    expired:     'bg-red-100 text-red-600',
    in_progress: 'bg-teal/10 text-teal',
    not_started: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Training Record</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>

        {loading && <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>}
        {!loading && data && (
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-neutral-dark">{data.module.name}</p>
                <p className="text-sm text-neutral-mid">{data.user.name} · {data.user.job_role ?? data.user.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColour[data.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {data.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-medium text-neutral-mid">Completed</p>
                <p className="mt-0.5 font-semibold text-neutral-dark">{fmt(data.completed_at)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="font-medium text-neutral-mid">Expires</p>
                <p className={`mt-0.5 font-semibold ${data.expires_at && new Date(data.expires_at) < new Date() ? 'text-red-500' : 'text-neutral-dark'}`}>
                  {fmt(data.expires_at)}
                </p>
              </div>
            </div>

            {/* Where it has got to: issued, opened, part done, and the last reminder. */}
            {(() => {
              const answered = (data.answers ?? []).length
              const total = Array.isArray(data.module?.questions) ? data.module.questions.length : 0
              const mins = Math.round((data.learn_seconds ?? 0) / 60)
              const opened = answered > 0 || (data.learn_seconds ?? 0) > 0 || data.status !== 'not_started'
              const partial = data.status !== 'complete' && data.status !== 'expired' && opened
              const overdue = data.due_date && data.status !== 'complete' && new Date(data.due_date) < new Date()
              return (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-neutral-mid">Issued</p>
                    <p className="mt-0.5 font-semibold text-neutral-dark">{fmt(data.created_at)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-neutral-mid">Due</p>
                    <p className={`mt-0.5 font-semibold ${overdue ? 'text-red-500' : 'text-neutral-dark'}`}>{data.due_date ? fmt(data.due_date) : 'No due date'}{overdue ? ' (overdue)' : ''}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-neutral-mid">Opened</p>
                    <p className="mt-0.5 font-semibold text-neutral-dark">{opened ? 'Yes' : 'Not yet'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-neutral-mid">Progress</p>
                    <p className="mt-0.5 font-semibold text-neutral-dark">
                      {data.status === 'complete' || data.status === 'expired' ? 'Finished' : partial ? 'Partly started' : 'Not started'}
                    </p>
                    {partial && <p className="mt-0.5 text-[11px] text-neutral-mid">{total ? `${answered} of ${total} questions answered` : `${answered} ${answered === 1 ? 'question' : 'questions'} answered`}{mins ? `, ${mins} min on the lesson` : ''}</p>}
                  </div>
                  <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-medium text-neutral-mid">Last reminder</p>
                    <p className="mt-0.5 font-semibold text-neutral-dark">
                      {data.last_reminded_at ? `${fmt(data.last_reminded_at)}${data.reminder_count > 1 ? ` (${data.reminder_count} sent in all)` : ''}` : 'None sent yet'}
                    </p>
                  </div>
                </div>
              )
            })()}

            {data.certificate_url && (
              <a href={data.certificate_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-sm font-medium text-teal hover:bg-teal-light/40">
                <ExternalLink size={13} /> View certificate
              </a>
            )}

            {data.answers.length > 0 && (
              <button type="button" onClick={() => setShowAnswers(true)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light">
                <span>View answers</span>
                <span className="text-xs font-normal text-neutral-mid">{data.answers.length} of {data.module.questions.length} answered</span>
              </button>
            )}

            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
              {(data.status === 'not_started' || data.status === 'in_progress') && (
                <button onClick={markComplete} disabled={completing}
                  className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                  {completing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Mark complete
                </button>
              )}
              {(data.status === 'not_started' || data.status === 'in_progress') && (
                <button onClick={sendReminder} disabled={reminding}
                  className="flex items-center gap-1.5 rounded-lg border border-teal/40 px-4 py-2 text-sm font-medium text-teal hover:bg-teal/5 disabled:opacity-50">
                  {reminding ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                  Send reminder
                </button>
              )}
              <button onClick={remove} disabled={removing}
                className="ml-auto text-xs text-red-500 hover:underline disabled:opacity-50">
                {removing ? 'Removing…' : 'Remove assignment'}
              </button>
            </div>
            {remindMsg && <p className={`text-xs font-medium ${remindMsg.ok ? 'text-green-700' : 'text-red-600'}`}>{remindMsg.text}</p>}
            {(data.status === 'not_started' || data.status === 'in_progress') && !remindMsg && <p className="text-[11px] text-neutral-mid">Send reminder emails them and sends a hub notification to any device where they have the hub app and notifications switched on.</p>}
          </div>
        )}
      </div>
      {showAnswers && data && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowAnswers(false)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-semibold text-neutral-dark">Answers</h2>
                <p className="text-xs text-neutral-mid">{data.module?.name ?? ''}</p>
              </div>
              <button onClick={() => setShowAnswers(false)} aria-label="Close answers"><X size={18} className="text-neutral-mid" /></button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
                <div className="space-y-2">
                {data.module.questions.map((q: any, i: number) => {
                  const answer  = data.answers.find((a: any) => a.question_id === q.id)
                  const options = q.options as string[] | undefined
                  const LABELS  = ['A', 'B', 'C', 'D']
                  return (
                    <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                      <p className="text-xs font-medium text-neutral-mid">Q{i + 1}: {q.text}</p>
                      {options && (
                        <div className="mt-1.5 space-y-0.5">
                          {options.map((opt: string, oi: number) => (
                            <p key={oi} className={`text-xs ${q.correct === oi ? 'font-semibold text-teal' : 'text-neutral-mid'}`}>
                              {LABELS[oi]}. {opt}{q.correct === oi ? ' (correct)' : ''}
                            </p>
                          ))}
                        </div>
                      )}
                      {answer ? (
                        <div className={`mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                          answer.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {answer.is_correct ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          Staff answered: {answer.answer_text}. {answer.is_correct ? 'Correct' : 'Incorrect'}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs italic text-neutral-mid/60">Not answered yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Per-module staff picker — assign one module to selected staff members.
export function PerModuleAssignModal({ api, module, staff, alreadyAssigned, onClose, onAssigned }: {
  api:     ReturnType<typeof createApiClient>
  module:  Module
  staff:   Staff[]
  alreadyAssigned: Set<string>
  onClose: () => void
  onAssigned: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const linkOn = useSupervisionLinkEnabled(api)
  const [alsoLink, setAlsoLink] = useState(false)
  const [linkMsg, setLinkMsg]   = useState<string | null>(null)   // shown after assigning when the box was ticked
  const toggle = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function assign() {
    if (selected.size === 0) { setError('Select at least one staff member.'); return }
    setSaving(true); setError('')
    try {
      await api.training.enroll({ user_ids: [...selected], module_ids: [module.id] })
      if (linkOn && alsoLink) { setLinkMsg(await linkAfterAssign(api, [...selected], module.id)); setSaving(false) }
      else onAssigned()
    }
    catch (e: any) { setError(e.message ?? 'Failed to assign.'); setSaving(false) }
  }

  if (linkMsg !== null) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-card bg-white p-5 shadow-xl">
        <h2 className="font-semibold text-neutral-dark">Assigned</h2>
        <p className="mt-1 text-sm text-neutral-mid">{module.name} has been assigned.</p>
        <p className="mt-3 rounded-lg bg-teal-light/30 px-3 py-2 text-sm text-neutral-dark">{linkMsg}</p>
        <div className="mt-4 flex justify-end"><button onClick={onAssigned} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Done</button></div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-card bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div><h2 className="font-semibold text-neutral-dark">Assign to specific staff</h2><p className="text-xs text-neutral-mid">{module.name}</p></div>
          <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        <div className="flex items-center justify-between px-5 py-2 text-xs">
          <span className="text-neutral-mid">{selected.size} selected</span>
          <button onClick={() => setSelected(selected.size === staff.length ? new Set() : new Set(staff.map(s => s.id)))} className="font-medium text-teal hover:underline">{selected.size === staff.length ? 'Clear all' : 'Select all'}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {staff.map(s => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-light/60">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="accent-teal" />
              <span className="flex-1 text-neutral-dark">{s.name}{s.job_role ? <span className="text-neutral-mid"> · {s.job_role}</span> : ''}</span>
              {alreadyAssigned.has(s.id) && <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">assigned</span>}
            </label>
          ))}
        </div>
        {linkOn && <div className="px-5 pb-2"><SupervisionLinkCheckbox checked={alsoLink} onChange={setAlsoLink} /></div>}
        {error && <p className="px-5 text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
          <button onClick={assign} disabled={saving || selected.size === 0} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{saving ? 'Assigning…' : `Assign to ${selected.size}`}</button>
        </div>
      </div>
    </div>
  )
}

export function RuleModal({ api, modules, staff, rule, onClose, onSaved }: {
  api:     ReturnType<typeof createApiClient>
  modules: Module[]
  staff:   Staff[]
  rule:    any | null
  onClose: () => void
  onSaved: (r: any) => void
}) {
  const [form, setForm] = useState({
    name:               rule?.name               ?? '',
    module_id:          rule?.module_id          ?? '',
    target_audience:    rule?.target_audience    ?? 'all',
    target_user_ids:    (rule?.target_user_ids   ?? []) as string[],
    days_of_week:       (rule?.days_of_week      ?? [1, 2, 3, 4, 5]) as number[],
    send_time:          rule?.send_time          ?? '09:00',
    questions_per_send: rule?.questions_per_send ?? 3,
    frequency_cap_week: rule?.frequency_cap_week ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function toggleDay(d: number) {
    setForm(p => ({
      ...p,
      days_of_week: p.days_of_week.includes(d)
        ? p.days_of_week.filter(x => x !== d)
        : [...p.days_of_week, d].sort(),
    }))
  }

  function toggleUser(id: string) {
    setForm(p => ({
      ...p,
      target_user_ids: p.target_user_ids.includes(id)
        ? p.target_user_ids.filter(x => x !== id)
        : [...p.target_user_ids, id],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Rule name is required'); return }
    setSaving(true); setError('')
    const payload = {
      name:               form.name.trim(),
      module_id:          form.module_id || undefined,
      target_audience:    form.target_audience,
      target_user_ids:    form.target_audience === 'specific' ? form.target_user_ids : [],
      days_of_week:       form.days_of_week,
      send_time:          form.send_time || undefined,
      questions_per_send: Number(form.questions_per_send) || 3,
      frequency_cap_week: form.frequency_cap_week ? Number(form.frequency_cap_week) : null,
    }
    try {
      const res = rule
        ? await api.training.updateDeliveryRule(rule.id, payload)
        : await api.training.createDeliveryRule(payload)
      onSaved(res.rule)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save rule')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">{rule ? 'Edit rule' : 'New delivery rule'}</h2>
          <button onClick={onClose}><X size={18} className="text-neutral-mid" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-6 py-5">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Rule name</label>
            <input
              type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Monday morning questions"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {/* Module */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Module <span className="text-neutral-mid font-normal">(optional — blank = all active modules)</span></label>
            <select
              value={form.module_id}
              onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            >
              <option value="">— All modules —</option>
              {modules.filter(m => (m.questions?.length ?? 0) > 0).map(m => <option key={m.id} value={m.id}>{m.name} ({m.questions.length} question{m.questions.length === 1 ? '' : 's'})</option>)}
            </select>
          </div>

          {/* Target audience */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Send to</label>
            <select
              value={form.target_audience}
              onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            >
              <option value="all">All staff</option>
              <option value="day_shift">Day shift only</option>
              <option value="night_shift">Night shift only</option>
              <option value="specific">Specific staff members</option>
            </select>
          </div>

          {/* Specific staff picker */}
          {form.target_audience === 'specific' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
                Select staff ({form.target_user_ids.length} selected)
              </label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {staff.map(s => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1 hover:bg-neutral-light">
                    <input type="checkbox" checked={form.target_user_ids.includes(s.id)} onChange={() => toggleUser(s.id)} className="h-4 w-4 accent-teal" />
                    <span className="text-sm text-neutral-dark">{s.name}</span>
                    <span className="text-xs text-neutral-mid">{s.job_role ?? ''}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Days of week */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-dark">Send on these days</label>
            <div className="flex gap-2">
              {DAY_NAMES.map((d, i) => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    form.days_of_week.includes(i)
                      ? 'bg-teal text-white'
                      : 'bg-gray-100 text-neutral-mid hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time + questions per send */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Send at (time)</label>
              <input
                type="time" value={form.send_time}
                onChange={e => setForm(p => ({ ...p, send_time: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Questions per send</label>
              <select
                value={form.questions_per_send}
                onChange={e => setForm(p => ({ ...p, questions_per_send: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} question{n !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Frequency cap */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              Max questions per staff per week <span className="font-normal text-neutral-mid">(optional — prevents overloading staff)</span>
            </label>
            <input
              type="number" min="1" max="20"
              value={form.frequency_cap_week}
              onChange={e => setForm(p => ({ ...p, frequency_cap_week: e.target.value }))}
              placeholder="e.g. 5 (leave blank for no limit)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> {rule ? 'Save changes' : 'Create rule'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
