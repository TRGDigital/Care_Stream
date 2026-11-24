'use client'

// Holiday requests for the person who decides (an administrator, or a manager when Manager approval is on): the pending list with who else is off on those
// days, approve or reject with an optional note, and the approved bookings with Change and Remove. Used on the Holiday tracking page and in the hub.

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { holiday, describeRange, fmtNum, niceDate, unitWord, type ApprovalItem, type DayRow } from '@/lib/holiday-client'
import { DayHoursEditor } from './day-hours-editor'

const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50'
const total = (r: ApprovalItem) => (r.unit === 'days' ? `${r.days.length} ${unitWord('days', r.days.length)}` : `${fmtNum(r.total_hours)} ${unitWord('hours', r.total_hours)}`)

function Clashes({ r, max }: { r: ApprovalItem; max: number | null }) {
  if (!r.clashes.length) return <p className="text-sm text-green-700">Nobody else is off on these days.</p>
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900"><AlertTriangle size={14} aria-hidden="true" /> Others off on these days{max ? ` (limit ${max} at once)` : ''}</p>
      <ul className="mt-2 space-y-1.5">
        {r.clashes.map(c => (
          <li key={c.day} className="text-sm text-neutral-dark">
            <span className="font-medium">{niceDate(c.day)}</span>
            {c.over_limit && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Over the limit</span>}
            <span className="block text-neutral-mid">
              {c.approved.length > 0 && <>Off: {c.approved.map(a => a.name).join(', ')}. </>}
              {c.pending.length > 0 && <>Also asked: {c.pending.map(a => a.name).join(', ')}.</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EditBox({ token, r, onDone }: { token: string; r: ApprovalItem; onDone: () => void }) {
  const [days, setDays] = useState<DayRow[]>(r.days)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    setBusy(true); setError('')
    try { await holiday.edit(token, r.id, days, note); onDone() } catch (e: any) { setError(e?.message ?? 'Could not save.') } finally { setBusy(false) }
  }
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <DayHoursEditor defaultHours={r.days[0]?.hours ?? 8} initial={r.days} onChange={setDays} />
      <label className="block text-sm font-medium text-neutral-dark" htmlFor={`en-${r.id}`}>Note to {r.name.split(' ')[0]} (optional, they will see it)</label>
      <textarea id={`en-${r.id}`} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || days.length === 0} onClick={save} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save the change</button>
        <button type="button" onClick={onDone} className={`${btn} border border-gray-300 text-neutral-dark`}>Cancel</button>
      </div>
      <p className="text-xs text-neutral-mid">{r.name.split(' ')[0]} is emailed and gets a message in their hub saying the booking was changed.</p>
    </div>
  )
}

function Row({ token, r, max, onChanged }: { token: string; r: ApprovalItem; max: number | null; onChanged: () => void }) {
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'idle' | 'reject' | 'remove' | 'edit'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); onChanged() } catch (e: any) { setError(e?.message ?? 'Something went wrong.') } finally { setBusy(false) } }
  return (
    <li className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-neutral-dark">{r.name}</p>
          <p className="text-sm text-neutral-dark">{describeRange(r.days)}</p>
          <p className="text-sm text-neutral-mid">{total(r)}{r.requested_at ? ` · asked ${new Date(r.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-mid'}`}>{r.status === 'rejected' ? 'Not approved' : r.status[0].toUpperCase() + r.status.slice(1)}</span>
      </div>
      {r.note && <p className="rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark">{r.name.split(' ')[0]} wrote: {r.note}</p>}
      {r.decision_note && r.status !== 'pending' && <p className="rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark">Note: {r.decision_note}</p>}
      {(r.status === 'pending' || r.status === 'approved') && <Clashes r={r} max={max} />}

      {mode === 'edit' ? <EditBox token={token} r={r} onDone={() => { setMode('idle'); onChanged() }} /> : (
        <>
          {(mode === 'reject' || mode === 'remove') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-dark" htmlFor={`n-${r.id}`}>{mode === 'reject' ? 'Why is it not approved?' : 'Why is it being removed?'} <span className="font-normal text-neutral-mid">(optional, {r.name.split(' ')[0]} will see it)</span></label>
              <textarea id={`n-${r.id}`} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {r.status === 'pending' && mode === 'idle' && <>
              <button type="button" disabled={busy} className={`${btn} bg-teal text-white hover:bg-teal-dark`} onClick={() => run(() => holiday.decide(token, r.id, 'approve'))}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
              <button type="button" disabled={busy} className={`${btn} border border-red-300 text-red-700 hover:bg-red-50`} onClick={() => setMode('reject')}><X size={14} /> Do not approve</button>
            </>}
            {r.status === 'approved' && mode === 'idle' && <>
              <button type="button" disabled={busy} className={`${btn} border border-gray-300 text-neutral-dark hover:bg-neutral-light`} onClick={() => setMode('edit')}><Pencil size={14} /> Change</button>
              <button type="button" disabled={busy} className={`${btn} border border-red-300 text-red-700 hover:bg-red-50`} onClick={() => setMode('remove')}><Trash2 size={14} /> Remove</button>
            </>}
            {mode === 'reject' && <button type="button" disabled={busy} className={`${btn} bg-red-600 text-white hover:bg-red-700`} onClick={() => run(() => holiday.decide(token, r.id, 'reject', note))}>{busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Do not approve and tell {r.name.split(' ')[0]}</button>}
            {mode === 'remove' && <button type="button" disabled={busy} className={`${btn} bg-red-600 text-white hover:bg-red-700`} onClick={() => run(() => holiday.remove(token, r.id, note))}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove and tell {r.name.split(' ')[0]}</button>}
            {(mode === 'reject' || mode === 'remove') && <button type="button" disabled={busy} className={`${btn} border border-gray-300 text-neutral-dark`} onClick={() => { setMode('idle'); setNote('') }}>Back</button>}
          </div>
          {mode === 'remove' && <p className="text-xs text-neutral-mid">{r.name.split(' ')[0]} is emailed and gets a message in their hub saying this holiday has been disapproved, with your note.</p>}
        </>
      )}
    </li>
  )
}

export function RequestsPanel({ token, onCount }: { token: string; onCount?: (n: number) => void }) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [items, setItems] = useState<ApprovalItem[] | null>(null)
  const [max, setMax] = useState<number | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setError('')
    holiday.approvals(token, tab).then(r => { setItems(r.requests); setMax(r.max_off); if (tab === 'pending') onCount?.(r.requests.length) }).catch(e => { setItems([]); setError(e?.message ?? 'Could not load the requests.') })
  }, [token, tab, onCount])
  useEffect(() => { setItems(null); load() }, [load])
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Request status" className="flex gap-1 rounded-lg bg-neutral-light p-1 text-sm">
        {([['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Not approved']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${tab === k ? 'bg-white text-teal shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {items === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
        : items.length === 0 ? <p className="rounded-xl bg-neutral-light px-4 py-6 text-center text-sm text-neutral-mid">{tab === 'pending' ? 'No requests are waiting.' : tab === 'approved' ? 'No approved holiday yet.' : 'Nothing here.'}</p>
        : <ul className="space-y-3">{items.map(r => <Row key={r.id} token={token} r={r} max={max} onChanged={load} />)}</ul>}
    </div>
  )
}
