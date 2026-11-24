'use client'

// Holiday requests for the person who decides (an administrator, or a manager when Manager approval is on): the pending list with who else is off on those
// days, approve or reject with an optional note, and the approved bookings with Change and Remove. Used on the Holiday tracking page and in the hub.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { AlertTriangle, Check, Loader2, Pencil, Plus, ShieldAlert, Trash2, X } from 'lucide-react'
import { holiday, describeRange, fmtNum, niceDate, partNotes, unitWord, HolidayError, type ApprovalItem, type DayRow, type Person, type RuleIssue } from '@/lib/holiday-client'
import { partLabel } from '@/lib/holiday-parts'
import { DayHoursEditor } from './day-hours-editor'

const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50'
const total = (r: ApprovalItem) => (r.unit === 'days' ? `${r.days.length} ${unitWord('days', r.days.length)}` : `${fmtNum(r.total_hours)} ${unitWord('hours', r.total_hours)}`)

// Pictures for the people shown in a request (the owner and the others who are off), keyed by person.
const Photos = createContext<Record<string, string>>({})
const Who = ({ id, name, part }: { id: string; name: string; part?: string }) => { const ph = useContext(Photos); return <span className="mr-1.5 inline-flex items-center gap-1 align-middle"><StaffAvatar name={name} photoUrl={ph[id]} size={18} />{name}{partLabel(part) && <span className="rounded bg-teal/10 px-1 text-[10px] font-bold text-teal">{partLabel(part)}</span>}</span> }

/** When the rules say no and the person deciding could still go ahead: the reasons, a tick for "Allow over the allowance", and a reason that is required. */
function OverridePrompt({ issues, checked, onChecked, note, onNote, id }: { issues: RuleIssue[]; checked: boolean; onChecked: (v: boolean) => void; note: string; onNote: (v: string) => void; id: string }) {
  const balance = issues.some(i => i.code === 'balance')
  return (
    <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/70 p-3" role="alert">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-red-800"><ShieldAlert size={15} aria-hidden="true" /> This breaks {issues.length === 1 ? 'a rule' : 'some rules'}</p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-800">{issues.map((i, n) => <li key={n}>{i.message}</li>)}</ul>
      <label className="flex items-start gap-2 text-sm font-medium text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-red-600" checked={checked} onChange={e => onChecked(e.target.checked)} /> {balance ? 'Allow over the allowance' : 'Allow this exception'}</label>
      {checked && (
        <div>
          <label htmlFor={`ov-${id}`} className="mb-1 block text-sm font-medium text-neutral-dark">Why are you allowing it? <span className="font-normal text-neutral-mid">(required, kept on the record)</span></label>
          <textarea id={`ov-${id}`} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => onNote(e.target.value)} />
        </div>
      )}
    </div>
  )
}
/** Runs a save; if the rules refuse and an approver may still go ahead, the reasons are kept so the prompt above can be shown. */
function useRuleSave() {
  const [issues, setIssues] = useState<RuleIssue[]>([])
  const [can, setCan] = useState(false)
  const [allow, setAllow] = useState(false)
  const [why, setWhy] = useState('')
  const [error, setError] = useState('')
  const reset = () => { setIssues([]); setCan(false); setAllow(false); setWhy(''); setError('') }
  const ov = allow ? { override: true, override_note: why } : undefined
  async function run(fn: (ov?: { override?: boolean; override_note?: string }) => Promise<unknown>): Promise<boolean> {
    setError('')
    try { await fn(ov); return true }
    catch (e: any) {
      if (e instanceof HolidayError && e.issues.length) { setIssues(e.issues); setCan(e.canOverride); if (e.code === 'NEEDS_NOTE') setError('Please write a reason for allowing this exception.'); else if (!e.canOverride) setError(e.issues.map(i => i.message).join(' ')) }
      else setError(e?.message ?? 'Something went wrong.')
      return false
    }
  }
  return { issues, can, allow, setAllow, why, setWhy, error, run, reset }
}

/** The week (Monday to Sunday) around the request, so the approver sees at a glance who else is off or has asked. The requested days are outlined. */
function WeekView({ r, max }: { r: ApprovalItem; max: number | null }) {
  if (!r.weeks?.length) return null
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-sm font-semibold text-neutral-dark">Who is off that week</p>
      <p className="mb-2 text-xs text-neutral-mid">Monday to Sunday. The days {r.name.split(' ')[0]} is asking for are outlined in teal. A green Approved tag means it is already agreed. Dashed names have asked and are waiting.</p>
      <div className="space-y-3 overflow-x-auto">
        {r.weeks.map(w => (
          <div key={w.start} className="min-w-[640px]">
            <p className="mb-1 text-xs font-semibold text-neutral-mid">Week of {niceDate(w.start)}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {w.days.map((d, i) => {
                const approved = d.off.filter(o => o.status === 'approved' && !o.self).length + (d.requested ? 0 : d.off.filter(o => o.status === 'approved' && o.self).length)
                const over = max != null && approved + (d.requested ? 1 : 0) > max
                return (
                  <div key={d.day} className={`min-h-[84px] rounded-lg border p-1.5 text-xs ${d.requested ? 'border-teal bg-teal/5 ring-1 ring-teal' : i > 4 ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                    <p className="flex items-center justify-between font-semibold text-neutral-dark"><span>{dow[i]} {Number(d.day.slice(8))}</span><span className={`rounded-full px-1.5 text-[10px] font-bold ${over ? 'bg-red-100 text-red-700' : d.off.length + (d.requested ? 1 : 0) > 0 ? 'bg-sky-100 text-sky-800' : 'text-neutral-mid'}`}>{d.off.length + (d.requested ? 1 : 0) || ''}</span></p>
                    {d.requested && <p className="mt-0.5 rounded bg-teal/10 px-1 font-semibold text-teal">{r.name.split(' ')[0]}</p>}
                    <ul className="mt-0.5 space-y-0.5">
                      {d.off.map(o => (
                        <li key={o.user_id + o.status} className={o.status === 'pending' ? 'rounded border border-dashed border-amber-400 px-1 text-amber-900' : 'rounded bg-sky-50 px-1 text-sky-900'} title={o.status === 'pending' ? 'Asked, waiting for approval' : 'Approved'}>
                          <Who id={o.user_id} name={o.name} part={o.part} />
                          <span className={`ml-0.5 rounded-full px-1.5 py-px text-[10px] font-bold ${o.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{o.status === 'approved' ? 'Approved' : 'Waiting'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** One line above the week view: how many other people are off or asking on the requested days, and a red note where the limit would be passed. */
function Clashes({ r, max }: { r: ApprovalItem; max: number | null }) {
  if (!r.clashes.length) return <p className="text-sm text-green-700">Nobody else is off on these days.</p>
  const people = new Set<string>(r.clashes.flatMap(c => [...c.approved, ...c.pending].map(x => x.user_id))).size
  const overDays = r.clashes.filter(c => c.over_limit).map(c => niceDate(c.day))
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm font-semibold text-amber-900">
      <AlertTriangle size={14} aria-hidden="true" /> {people} {people === 1 ? 'other person is' : 'other people are'} off or have asked on these days{max ? ` (limit ${max} at once)` : ''}. See the week below.
      {overDays.length > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Over the limit: {overDays.join(', ')}</span>}
    </p>
  )
}

function EditBox({ token, r, onDone }: { token: string; r: ApprovalItem; onDone: () => void }) {
  const [days, setDays] = useState<DayRow[]>(r.days)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const rule = useRuleSave()
  async function save() {
    setBusy(true)
    const done = await rule.run(ov => holiday.edit(token, r.id, days, note, ov))
    setBusy(false)
    if (done) onDone()
  }
  const fullHours = Math.max(...r.days.filter(d => !d.part || d.part === 'full').map(d => d.hours), 8)
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <DayHoursEditor defaultHours={r.days.find(d => !d.part)?.hours ?? 8} shiftHours={fullHours} unit={r.unit} initial={r.days} onChange={d => { setDays(d); rule.reset() }} />
      <label className="block text-sm font-medium text-neutral-dark" htmlFor={`en-${r.id}`}>Note to {r.name.split(' ')[0]} (optional, they will see it)</label>
      <textarea id={`en-${r.id}`} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
      {rule.issues.length > 0 && rule.can && <OverridePrompt id={`e${r.id}`} issues={rule.issues} checked={rule.allow} onChecked={rule.setAllow} note={rule.why} onNote={rule.setWhy} />}
      {rule.error && <p className="text-sm text-red-700" role="alert">{rule.error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || days.length === 0 || (rule.issues.length > 0 && rule.can && !rule.allow)} onClick={save} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {rule.issues.length > 0 && rule.can ? 'Save anyway' : 'Save the change'}</button>
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
  const rule = useRuleSave()
  async function run(fn: () => Promise<unknown>) { setBusy(true); setError(''); try { await fn(); onChanged() } catch (e: any) { setError(e?.message ?? 'Something went wrong.') } finally { setBusy(false) } }
  // Approving checks the balance and the other rules again; if they now fail, the approver sees why and can allow it with a reason.
  async function approve() { setBusy(true); const done = await rule.run(ov => holiday.decide(token, r.id, 'approve', undefined, ov)); setBusy(false); if (done) onChanged() }
  return (
    <li className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-base font-bold text-neutral-dark"><Who id={r.user_id} name={r.name} /></p>
          <p className="text-sm text-neutral-dark">{describeRange(r.days)}</p>
          {/* Every requested day written out, with its hours (and AM or PM), so the approver sees exactly what is being asked for. */}
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Days ${r.name.split(' ')[0]} is asking for`}>
            {r.days.map(d => (
              <li key={d.day} className="rounded-md border border-teal/40 bg-teal/5 px-2 py-0.5 text-xs font-medium text-neutral-dark">
                {niceDate(d.day)}
                <span className="ml-1 text-neutral-mid">{r.unit === 'days' ? (partLabel(d.part) || '1 day') : `${fmtNum(d.hours)} ${unitWord('hours', d.hours)}${partLabel(d.part) ? `, ${partLabel(d.part)}` : ''}`}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-neutral-mid">{total(r)}{r.requested_at ? ` · asked ${new Date(r.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</p>
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {r.over_allowance && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">Over allowance</span>}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-mid'}`}>{r.status === 'rejected' ? 'Not approved' : r.status[0].toUpperCase() + r.status.slice(1)}</span>
        </span>
      </div>
      {r.exception_note && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">Exception note: {r.exception_note}</p>}
      {r.note && <p className="rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark">{r.name.split(' ')[0]} wrote: {r.note}</p>}
      {r.decision_note && r.status !== 'pending' && <p className="rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark">Note: {r.decision_note}</p>}
      {(r.status === 'pending' || r.status === 'approved') && <Clashes r={r} max={max} />}
      {(r.status === 'pending' || r.status === 'approved') && <WeekView r={r} max={max} />}

      {mode === 'edit' ? <EditBox token={token} r={r} onDone={() => { setMode('idle'); onChanged() }} /> : (
        <>
          {(mode === 'reject' || mode === 'remove') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-dark" htmlFor={`n-${r.id}`}>{mode === 'reject' ? 'Why is it not approved?' : 'Why is it being removed?'} <span className="font-normal text-neutral-mid">(optional, {r.name.split(' ')[0]} will see it)</span></label>
              <textarea id={`n-${r.id}`} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          )}
          {mode === 'idle' && r.status === 'pending' && rule.issues.length > 0 && rule.can && <OverridePrompt id={r.id} issues={rule.issues} checked={rule.allow} onChecked={rule.setAllow} note={rule.why} onNote={rule.setWhy} />}
          {mode === 'idle' && r.status === 'pending' && rule.error && <p className="text-sm text-red-700" role="alert">{rule.error}</p>}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {r.status === 'pending' && mode === 'idle' && <>
              <button type="button" disabled={busy || (rule.issues.length > 0 && rule.can && !rule.allow)} className={`${btn} bg-teal text-white hover:bg-teal-dark`} onClick={approve}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {rule.issues.length > 0 && rule.can ? 'Approve anyway' : 'Approve'}</button>
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

/** An administrator or manager books days for someone (approved at once). Over the allowance only with "Allow over the allowance" and a reason. */
function BookModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [who, setWho] = useState('')
  const [days, setDays] = useState<DayRow[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState(0)
  const rule = useRuleSave()
  useEffect(() => { holiday.people(token).then(r => setPeople(r.people)).catch(() => setPeople([])) }, [token])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])
  const person = people?.find(x => x.id === who)
  async function save() {
    if (!person) return
    setBusy(true)
    const done = await rule.run(ov => holiday.book(token, { user_id: person.id, days, note: note.trim() || undefined, ...ov }))
    setBusy(false)
    if (done) onDone()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label="Book holiday for someone" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-neutral-dark">Book holiday for someone</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        {!people ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p> : (
          <div className="space-y-4">
            <div>
              <label htmlFor="book-who" className="mb-1 block text-sm font-medium text-neutral-dark">Who is it for?</label>
              <select id="book-who" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" value={who} onChange={e => { setWho(e.target.value); setKey(k => k + 1); rule.reset() }}>
                <option value="">Choose a person</option>
                {people.map(x => <option key={x.id} value={x.id}>{x.name}{x.job_role ? `, ${x.job_role}` : ''}</option>)}
              </select>
            </div>
            {person && (
              <>
                <DayHoursEditor key={`${person.id}-${key}`} defaultHours={person.default_hours} shiftHours={person.shift_hours} unit={person.unit} onChange={d => { setDays(d); rule.reset() }} />
                <div>
                  <label htmlFor="book-note" className="mb-1 block text-sm font-medium text-neutral-dark">Note to {person.name.split(' ')[0]} <span className="font-normal text-neutral-mid">(optional, they will see it)</span></label>
                  <textarea id="book-note" rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                {rule.issues.length > 0 && rule.can && <OverridePrompt id="book" issues={rule.issues} checked={rule.allow} onChecked={rule.setAllow} note={rule.why} onNote={rule.setWhy} />}
                {rule.error && <p className="text-sm text-red-700" role="alert">{rule.error}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={busy || days.length === 0 || (rule.issues.length > 0 && rule.can && !rule.allow)} onClick={save} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {rule.issues.length > 0 && rule.can ? 'Book anyway' : 'Book it'}</button>
                  <button type="button" onClick={onClose} className={`${btn} border border-gray-300 text-neutral-dark`}>Cancel</button>
                </div>
                <p className="text-xs text-neutral-mid">The booking is approved at once. {person.name.split(' ')[0]} is emailed and gets a message in their hub.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function RequestsPanel({ token, onCount }: { token: string; onCount?: (n: number) => void }) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [items, setItems] = useState<ApprovalItem[] | null>(null)
  const [max, setMax] = useState<number | null>(null)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(false)
  const load = useCallback(() => {
    setError('')
    holiday.approvals(token, tab).then(r => { setItems(r.requests); setMax(r.max_off); setPhotos(r.photos ?? {}); if (tab === 'pending') onCount?.(r.requests.length) }).catch(e => { setItems([]); setError(e?.message ?? 'Could not load the requests.') })
  }, [token, tab, onCount])
  useEffect(() => { setItems(null); load() }, [load])
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" onClick={() => setBooking(true)} className={`${btn} border border-teal text-teal hover:bg-teal/5`}><Plus size={14} aria-hidden="true" /> Book for someone</button></div>
      {booking && <BookModal token={token} onClose={() => setBooking(false)} onDone={() => { setBooking(false); load() }} />}
      <div role="tablist" aria-label="Request status" className="flex gap-1 rounded-lg bg-neutral-light p-1 text-sm">
        {([['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Not approved']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${tab === k ? 'bg-white text-teal shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {items === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
        : items.length === 0 ? <p className="rounded-xl bg-neutral-light px-4 py-6 text-center text-sm text-neutral-mid">{tab === 'pending' ? 'No requests are waiting.' : tab === 'approved' ? 'No approved holiday yet.' : 'Nothing here.'}</p>
        : <Photos.Provider value={photos}><ul className="space-y-3">{items.map(r => <Row key={r.id} token={token} r={r} max={max} onChanged={load} />)}</ul></Photos.Provider>}
    </div>
  )
}
