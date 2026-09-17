'use client'

// Scheduled audits on the admin Audits page: assign an audit to a named person with a due date and
// an optional repeat, and see what is overdue, due this week, upcoming and done.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createApiClient, type AuditAssignment } from '@/lib/api-client'
import { CalendarClock, Loader2, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'

const VIEWS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'week', label: 'Due in 7 days' },
  { key: 'open', label: 'All open' },
  { key: 'completed', label: 'Done and missed' },
] as const
type View = typeof VIEWS[number]['key']

const REPEAT_LABEL: Record<string, string> = { none: 'Does not repeat', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', quarterly: 'Every quarter' }
const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const isoDay = (d: string) => new Date(d).toISOString().slice(0, 10)

// Runs are one per day for daily audits and one per month otherwise, so only daily audits repeat faster.
const repeatsFor = (frequency?: string) => (frequency === 'daily' ? ['none', 'daily', 'weekly', 'monthly', 'quarterly'] : ['none', 'monthly', 'quarterly'])

function StatusBadge({ a }: { a: AuditAssignment }) {
  const [label, cls] = a.status === 'completed' ? ['Completed', 'bg-green-50 text-green-700']
    : a.status === 'missed' ? ['Missed', 'bg-amber-50 text-amber-700']
    : a.status === 'cancelled' ? ['Cancelled', 'bg-gray-100 text-neutral-mid']
    : a.overdue ? [`Overdue ${a.days_overdue} day${a.days_overdue === 1 ? '' : 's'}`, 'bg-rose-50 text-rose-700']
    : a.run_status === 'in_progress' ? ['In progress', 'bg-amber-50 text-amber-700']
    : ['Due', 'bg-teal/10 text-teal']
  return <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', cls)}>{label}</span>
}

export function AuditSchedule({ token, templates, rooms, staffNames }: { token: string; templates: any[]; rooms: string[]; staffNames: string[] }) {
  const [view, setView] = useState<View>('overdue')
  const [items, setItems] = useState<AuditAssignment[]>([])
  const [counts, setCounts] = useState({ open: 0, overdue: 0, due_this_week: 0 })
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; name: string; job_role: string | null }>>([])
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const firstLoad = useRef(true)

  function load(v: View = view) {
    setLoading(true)
    createApiClient(token).audits.assignments({ view: v })
      .then(d => {
        setItems(d.assignments); setCounts(d.counts)
        // Open on overdue when there is any, otherwise on what is due this week (first load only).
        if (firstLoad.current) { firstLoad.current = false; if (v === 'overdue' && d.counts.overdue === 0 && d.counts.open > 0) setView('week') }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(view) }, [view]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    createApiClient(token).users.list().then((d: any) => setUsers((d.users ?? []).filter((u: any) => u.is_active && u.name))).catch(() => {})
  }, [token])

  async function update(id: string, patch: Parameters<ReturnType<typeof createApiClient>['audits']['updateAssignment']>[1]) {
    setError('')
    try { await createApiClient(token).audits.updateAssignment(id, patch); setEditing(null); load() }
    catch (e: any) { setError(e?.message ?? 'Could not update the scheduled audit.') }
  }

  return (
    <div className="mb-6 rounded-card bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><CalendarClock size={15} className="text-teal" /> Scheduled audits</h2>
          <p className="mt-0.5 text-xs text-neutral-mid">Assign audits to a named person with a due date. They are reminded before it is due and when it is overdue, and overdue audits are escalated to managers.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark"><Plus size={14} /> Schedule an audit</button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {VIEWS.map(v => {
          const n = v.key === 'overdue' ? counts.overdue : v.key === 'week' ? counts.due_this_week : v.key === 'open' ? counts.open : null
          return (
            <button key={v.key} onClick={() => setView(v.key)}
              className={clsx('rounded-full border px-3 py-1 text-xs font-medium', view === v.key ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-mid hover:border-teal hover:text-teal')}>
              {v.label}{n !== null ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-neutral-mid" /></div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-neutral-mid">
          {view === 'overdue' ? 'Nothing overdue.' : view === 'week' ? 'Nothing due in the next 7 days.' : view === 'open' ? 'No audits scheduled yet.' : 'No completed or missed scheduled audits yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map(a => (
            <li key={a.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-dark">{a.template_name}{a.subject ? <span className="text-neutral-mid"> · {a.subject}</span> : null}</p>
                  <p className="text-xs text-neutral-mid">
                    {a.assigned_name} · due {fmt(a.due_date)}{a.repeat !== 'none' ? ` · ${REPEAT_LABEL[a.repeat].toLowerCase()}` : ''}
                    {a.completed_at ? ` · completed ${fmt(a.completed_at)}` : ''}{a.escalated_at && a.status === 'open' ? ' · escalated' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge a={a} />
                  {a.run_id && <Link href={`/audits/${a.run_id}`} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">Open audit</Link>}
                  {a.status === 'open' && (
                    <button onClick={() => setEditing(editing === a.id ? null : a.id)} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">Change</button>
                  )}
                </div>
              </div>
              {editing === a.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-light/40 p-2.5 text-xs">
                  <label>
                    <span className="mb-0.5 block text-neutral-mid">Due date</span>
                    <input type="date" defaultValue={isoDay(a.due_date)} onChange={e => e.target.value && update(a.id, { due_date: e.target.value })} className="rounded border border-gray-200 px-2 py-1" />
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-mid">Assigned to</span>
                    <select defaultValue={a.assigned_user_id} onChange={e => update(a.id, { assigned_user_id: e.target.value })} className="rounded border border-gray-200 px-2 py-1">
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.job_role ? ` (${u.job_role})` : ''}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-0.5 block text-neutral-mid">Repeat</span>
                    <select defaultValue={a.repeat} onChange={e => update(a.id, { repeat: e.target.value })} className="rounded border border-gray-200 px-2 py-1">
                      {repeatsFor(templates.find(t => t.id === a.template_id)?.frequency).map(r => <option key={r} value={r}>{REPEAT_LABEL[r]}</option>)}
                    </select>
                  </label>
                  <button onClick={() => { if (confirm('Cancel this scheduled audit? It will not repeat.')) update(a.id, { status: 'cancelled' }) }} className="rounded border border-gray-200 px-2 py-1 font-medium text-neutral-mid hover:border-red-200 hover:text-red-600">Cancel it</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showNew && (
        <NewAssignment token={token} templates={templates} users={users} rooms={rooms} staffNames={staffNames}
          onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); setView('open'); load('open') }} />
      )}
    </div>
  )
}

function NewAssignment({ token, templates, users, rooms, staffNames, onClose, onCreated }: {
  token: string; templates: any[]; users: Array<{ id: string; name: string; job_role: string | null }>
  rooms: string[]; staffNames: string[]; onClose: () => void; onCreated: () => void
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [userId, setUserId] = useState('')
  const [due, setDue] = useState(() => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10))
  const [repeat, setRepeat] = useState('none')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const tpl = templates.find(t => t.id === templateId)
  const scope = tpl?.subject_scope ?? 'none'
  const allowed = repeatsFor(tpl?.frequency)
  useEffect(() => { if (!allowed.includes(repeat)) setRepeat('none') }, [templateId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setError('')
    if (!templateId || !userId || !due) { setError('Choose the audit, who it is for and a due date.'); return }
    if (scope !== 'none' && !subject.trim()) { setError(`Enter the ${scope === 'resident' ? 'resident' : scope === 'staff' ? 'staff member' : 'room'} this audit is for.`); return }
    setSaving(true)
    try {
      await createApiClient(token).audits.createAssignment({ template_id: templateId, assigned_user_id: userId, due_date: due, repeat, subject: subject.trim() || undefined, notes: notes.trim() || undefined })
      onCreated()
    } catch (e: any) { setError(e?.message ?? 'Could not schedule the audit.') } finally { setSaving(false) }
  }

  const input = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-base font-semibold text-neutral-dark">Schedule an audit</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-mid">Audit</span>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={input}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {scope !== 'none' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium capitalize text-neutral-mid">{scope === 'resident' ? 'Resident' : scope === 'staff' ? 'Staff member' : 'Room'}</span>
              <input list={scope === 'room' ? 'schedule-rooms' : scope === 'staff' ? 'schedule-staff' : undefined} value={subject} onChange={e => setSubject(e.target.value)} className={input} />
              <datalist id="schedule-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
              <datalist id="schedule-staff">{staffNames.map(r => <option key={r} value={r} />)}</datalist>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-mid">Assigned to</span>
            <select value={userId} onChange={e => setUserId(e.target.value)} className={input}>
              <option value="">Choose a person</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.job_role ? ` (${u.job_role})` : ''}</option>)}
            </select>
            <span className="mt-1 block text-[11px] text-neutral-mid">Staff who are not admins are given access to this audit automatically.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-mid">Due date</span>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-mid">Repeat</span>
              <select value={repeat} onChange={e => setRepeat(e.target.value)} className={input}>
                {allowed.map(r => <option key={r} value={r}>{REPEAT_LABEL[r]}</option>)}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-mid">Note (optional)</span>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Include the new sluice room" className={input} />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Schedule
          </button>
        </div>
      </div>
    </div>
  )
}
