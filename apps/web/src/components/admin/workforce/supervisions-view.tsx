'use client'

// Workforce compliance: supervisions & appraisals (Enterprise). Per staff, the
// latest and next-due supervision and appraisal, colour-coded by due date. Click
// a staff row to see their history and log a new session.

import { useEffect, useState } from 'react'
import { createApiClient, type SupRecord } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Loader2, X, Trash2, AlertTriangle, Users, Plus } from 'lucide-react'

type Overview = Awaited<ReturnType<ReturnType<typeof createApiClient>['workforce']['supervisions']>>
type Row = Overview['staff'][number]

const SUP_STATUS: Record<string, { cls: string; label: string }> = {
  booked:   { cls: 'bg-blue-50 text-blue-700',   label: 'Booked' },
  ok:       { cls: 'bg-green-50 text-green-700', label: 'On track' },
  due_soon: { cls: 'bg-amber-50 text-amber-700', label: 'Due soon' },
  overdue:  { cls: 'bg-red-50 text-red-600',     label: 'Overdue' },
  none:     { cls: 'bg-gray-100 text-gray-500',  label: 'None yet' },
}
function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
function toInputDate(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

function SummaryCard({ label, value, cls, Icon }: { label: string; value: number; cls: string; Icon: any }) {
  return (
    <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-mid">{label}</p>
        <Icon size={15} className={cls} />
      </div>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

function Cell({ cell }: { cell: Row['supervision'] }) {
  const st = SUP_STATUS[cell.status] ?? SUP_STATUS.none
  const booked = cell.status === 'booked'
  const dateStr = booked ? cell.next_on : cell.next_due
  return (
    <div className="text-center">
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
      {dateStr && <p className="mt-0.5 text-[10px] text-neutral-mid">{booked ? 'on ' : 'due '}{fmtDate(dateStr)}</p>}
    </div>
  )
}

export function SupervisionsView({ token, userId }: { token: string; userId: string }) {
  const cacheKey = `admin-workforce-supervisions-${userId}`
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Row | null>(null)

  async function load() {
    try { const d = await createApiClient(token).workforce.supervisions(); setData(d); persistentCache.set(cacheKey, d) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }
  // Paint instantly from the last-loaded snapshot, then revalidate.
  useEffect(() => {
    const cached = persistentCache.get<Overview>(cacheKey)
    if (cached) { setData(cached); setLoading(false) }
    load()
  }, [token])

  if (loading && !data) return <div className="h-72 animate-pulse rounded-card bg-gray-100" />

  const s = data?.summary ?? { supervisions_overdue: 0, appraisals_overdue: 0, no_supervision: 0, no_appraisal: 0 }
  const staff = data?.staff ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Supervisions overdue" value={s.supervisions_overdue} cls="text-red-600"     Icon={AlertTriangle} />
        <SummaryCard label="Appraisals overdue"   value={s.appraisals_overdue}   cls="text-red-600"     Icon={AlertTriangle} />
        <SummaryCard label="No supervision yet"    value={s.no_supervision}       cls="text-neutral-mid" Icon={Users} />
        <SummaryCard label="No appraisal yet"      value={s.no_appraisal}         cls="text-neutral-mid" Icon={Users} />
      </div>

      <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Supervisions &amp; appraisals</h2>
          <p className="mt-0.5 text-xs text-neutral-mid">Click a staff member to see their history and log a session.</p>
        </div>
        {staff.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-mid">No active staff yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-neutral-mid">
                  <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left min-w-[180px]">Staff member</th>
                  <th className="px-3 py-3 text-center min-w-[130px]">Last supervision</th>
                  <th className="px-3 py-3 text-center min-w-[120px]">Next supervision</th>
                  <th className="px-3 py-3 text-center min-w-[130px]">Last appraisal</th>
                  <th className="px-3 py-3 text-center min-w-[120px]">Next appraisal</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(row => (
                  <tr key={row.id} onClick={() => setEditing(row)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                      <p className="font-medium text-neutral-dark">{row.name}</p>
                      <p className="text-xs text-neutral-mid">{row.job_role ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-neutral-dark">
                      {fmtDate(row.supervision.last_on)}
                      {row.supervision.conducted_by && <p className="text-[10px] text-neutral-mid">by {row.supervision.conducted_by}</p>}
                    </td>
                    <td className="px-3 py-3"><Cell cell={row.supervision} /></td>
                    <td className="px-3 py-3 text-center text-neutral-dark">
                      {fmtDate(row.appraisal.last_on)}
                      {row.appraisal.conducted_by && <p className="text-[10px] text-neutral-mid">by {row.appraisal.conducted_by}</p>}
                    </td>
                    <td className="px-3 py-3"><Cell cell={row.appraisal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-green-700">On track</span> next date in the future</span>
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Due soon</span> within 30 days</span>
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-red-600">Overdue</span> past the next-due date</span>
        </div>
      </div>

      {editing && <SupModal token={token} staff={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}

// ── Per-staff history + log form ──────────────────────────────────────────────
function SupModal({ token, staff, onClose, onSaved }: { token: string; staff: Row; onClose: () => void; onSaved: () => void }) {
  const api = createApiClient(token)
  const [records, setRecords] = useState<SupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ type: 'supervision', held_on: '', conducted_by: '', next_due: '', notes: '' })

  async function loadHistory() {
    try { setRecords((await api.workforce.staffSupervisions(staff.id)).records) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }
  useEffect(() => { loadHistory() }, [staff.id])

  async function add() {
    if (!form.held_on) { setErr('Please choose the date it was held.'); return }
    setBusy(true); setErr('')
    try {
      await api.workforce.addSupervision(staff.id, { type: form.type, held_on: form.held_on, conducted_by: form.conducted_by, next_due: form.next_due || null, notes: form.notes })
      setForm({ type: form.type, held_on: '', conducted_by: '', next_due: '', notes: '' })
      await loadHistory(); onSaved()
    } catch (e: any) { setErr(e?.message ?? 'Could not save the record.') }
    finally { setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true)
    try { await api.workforce.deleteSupervision(id); await loadHistory(); onSaved() }
    finally { setBusy(false) }
  }

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">{staff.name}</h2>
            <p className="text-xs text-neutral-mid">{staff.job_role ?? '—'} · supervisions &amp; appraisals</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Log a new session */}
          <div className="rounded-lg border border-gray-200 bg-neutral-light/40 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Plus size={14} className="text-teal" /> Log a session</p>
            {err && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Type</label>
                <select value={form.type} onChange={e => set({ type: e.target.value })} className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none">
                  <option value="supervision">Supervision</option>
                  <option value="appraisal">Appraisal</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Date</label>
                <input type="date" value={form.held_on} onChange={e => set({ held_on: e.target.value })} className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
              </div>
              <p className="text-[11px] text-neutral-mid sm:col-span-2">Choose a future date to <strong>book</strong> an upcoming session (the staff member is emailed, and reminded the day before), or a past date to record one already held.</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Conducted by</label>
                <input value={form.conducted_by} onChange={e => set({ conducted_by: e.target.value })} placeholder="e.g. Jane Smith (Manager)" className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Next due</label>
                <input type="date" value={form.next_due} onChange={e => set({ next_due: e.target.value })} className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={2} className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={add} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                {busy ? <Loader2 size={12} className="animate-spin" /> : null} Save session
              </button>
            </div>
          </div>

          {/* History */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">History</p>
            {loading ? (
              <div className="h-16 animate-pulse rounded bg-gray-100" />
            ) : records.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-neutral-mid">No supervisions or appraisals recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-50 rounded-lg border border-gray-100">
                {records.map(r => (
                  <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-neutral-dark">{r.type} · {fmtDate(r.held_on)}</p>
                      <p className="text-xs text-neutral-mid">
                        {r.conducted_by ? `by ${r.conducted_by}` : 'conductor not recorded'}{r.next_due ? ` · next due ${fmtDate(r.next_due)}` : ''}
                      </p>
                      {r.notes && <p className="mt-1 text-xs text-neutral-mid">{r.notes}</p>}
                    </div>
                    <button onClick={() => remove(r.id)} disabled={busy} className="shrink-0 text-neutral-mid hover:text-red-500 disabled:opacity-50" title="Delete"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Done</button>
        </div>
      </div>
    </div>
  )
}
