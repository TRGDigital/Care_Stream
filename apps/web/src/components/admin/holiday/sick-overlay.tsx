'use client'

// "Add sick day": an overlay for administrators to record the days someone is, or has been, off sick. Sickness is health information, so it is for administrators only,
// it is kept apart from holiday (it never changes a balance), and the note is short and optional. The same overlay edits a record, marks someone as back, or removes it.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Lock, Search, X } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { DayHoursEditor } from './day-hours-editor'
import { holiday, niceDate, type Certificate, type DayRow, type SickKind, type SickPerson } from '@/lib/holiday-client'

const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50'
export const NOTE_MAX = 200

export function SickOverlay({ token, editId, onClose, onSaved }: { token: string; editId?: string | null; onClose: () => void; onSaved: () => void }) {
  const [people, setPeople] = useState<SickPerson[] | null>(null)
  const [today, setToday] = useState('')
  const [q, setQ] = useState('')
  const [person, setPerson] = useState<SickPerson | null>(null)
  const [days, setDays] = useState<DayRow[]>([])
  const [initial, setInitial] = useState<DayRow[] | undefined>(undefined)
  const [still, setStill] = useState(false)
  const [note, setNote] = useState('')
  const [kind, setKind] = useState<SickKind>('sick')
  const [cert, setCert] = useState<Certificate | ''>('')
  const [rtw, setRtw] = useState(false)
  const [overlap, setOverlap] = useState<Array<{ day: string; request_id: string; hours: number }>>([])
  const [hol, setHol] = useState<'keep' | 'replace'>('keep')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(!editId)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [open, setOpen] = useState(false)   // is an open ended record being edited

  useEffect(() => {
    let live = true
    holiday.admin.sick.people(token).then(async r => {
      if (!live) return
      setPeople(r.people); setToday(r.today)
      if (!editId) return
      try {
        const d = await holiday.admin.sick.spell(token, editId)
        if (!live) return
        const p = r.people.find(x => x.id === d.spell.user_id) ?? { id: d.spell.user_id, name: d.name, job_role: d.job_role, photo_url: null, usual_hours: d.spell.hours_default }
        setPerson(p); setInitial(d.effective_days); setDays(d.effective_days); setStill(d.spell.last_day === null); setOpen(d.spell.last_day === null)
        setNote(d.spell.note ?? ''); setKind(d.spell.kind); setCert(d.spell.certificate ?? ''); setRtw(d.spell.return_to_work_done); setReady(true)
      } catch (e: any) { setError(e?.message ?? 'Could not open that record.'); setReady(true) }
    }).catch(e => { if (live) setError(e?.message ?? 'Could not load the staff.') })
    return () => { live = false }
  }, [token, editId])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [onClose])

  // Which of these days are approved holiday for the person? Ask whenever the person or the days change.
  const dayKey = days.map(d => d.day).join(',')
  useEffect(() => {
    if (!person || !days.length) { setOverlap([]); return }
    let live = true
    const t = setTimeout(() => { holiday.admin.sick.check(token, person.id, days.map(d => d.day)).then(r => { if (live) { setOverlap(r.overlap); if (!r.overlap.length) setHol('keep') } }).catch(() => undefined) }, 300)
    return () => { live = false; clearTimeout(t) }
  }, [token, person?.id, dayKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (people ?? []).filter(p => !t || p.name.toLowerCase().includes(t)).slice(0, 8)
  }, [people, q])
  const onDays = useCallback((d: DayRow[]) => setDays(d), [])

  async function save() {
    if (!person) { setError('Choose who was off sick.'); return }
    if (!days.length) { setError('Choose the days they were off.'); return }
    setBusy(true); setError('')
    const body = { user_id: person.id, first_day: days[0].day, last_day: still ? null : days[days.length - 1].day, still_off: still, days, hours_default: person.usual_hours, note: note.trim(), kind, certificate: cert || null, return_to_work_done: rtw, holiday: overlap.length ? hol : 'keep' }
    try {
      if (editId) await holiday.admin.sick.update(token, editId, body); else await holiday.admin.sick.create(token, body)
      onSaved()
    } catch (e: any) { setError(e?.message ?? 'Could not save that.') } finally { setBusy(false) }
  }
  async function back() {
    if (!editId) return
    setBusy(true); setError('')
    try { await holiday.admin.sick.end(token, editId, { return_to_work_done: rtw }); onSaved() } catch (e: any) { setError(e?.message ?? 'Could not close that record.') } finally { setBusy(false) }
  }
  async function remove() {
    if (!editId) return
    setBusy(true); setError('')
    try { await holiday.admin.sick.remove(token, editId); onSaved() } catch (e: any) { setError(e?.message ?? 'Could not remove that record.') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="sick-title" className="my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="sick-title" className="text-lg font-bold text-neutral-dark">{editId ? 'Sickness record' : 'Add sick day'}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-neutral-light px-3 py-2 text-xs text-neutral-dark"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> This is health information. Only administrators can see it, and every change is logged. It does not change anyone's holiday.</p>

        {!ready || !people ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p> : (
          <div className="space-y-4">
            <div>
              <label htmlFor="sick-who" className="mb-1 block text-sm font-medium text-neutral-dark">Who was off sick?</label>
              {person ? (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-dark"><StaffAvatar name={person.name} photoUrl={person.photo_url} size={24} />{person.name}{person.job_role && <span className="font-normal text-neutral-mid">{person.job_role}</span>}</span>
                  {!editId && <button type="button" onClick={() => { setPerson(null); setQ('') }} className="text-xs font-medium text-teal hover:underline">Change</button>}
                </div>
              ) : (
                <div>
                  <div className="relative"><Search size={14} className="pointer-events-none absolute left-2.5 top-3 text-neutral-mid" aria-hidden="true" /><input id="sick-who" className={`${inp} pl-8`} placeholder="Start typing a name" value={q} onChange={e => setQ(e.target.value)} autoFocus /></div>
                  <ul className="mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200" role="listbox" aria-label="Staff">
                    {matches.map(p => (
                      <li key={p.id}><button type="button" role="option" aria-selected={false} onClick={() => { setPerson(p); setDays([]); setInitial(undefined) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-light"><StaffAvatar name={p.name} photoUrl={p.photo_url} size={22} /><span className="font-medium text-neutral-dark">{p.name}</span>{p.job_role && <span className="ml-auto text-xs text-neutral-mid">{p.job_role}</span>}</button></li>
                    ))}
                    {matches.length === 0 && <li className="px-3 py-2 text-sm text-neutral-mid">Nobody matches.</li>}
                  </ul>
                </div>
              )}
            </div>

            {person && (
              <>
                <div>
                  <p className="mb-1 text-sm font-medium text-neutral-dark">Which days were they off?</p>
                  <DayHoursEditor key={person.id + (editId ?? '')} defaultHours={person.usual_hours} shiftHours={person.usual_hours} unit="hours" max={today || undefined} initial={initial} onChange={onDays} />
                </div>
                <label className="flex items-start gap-2 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={still} onChange={e => setStill(e.target.checked)} /><span><strong>Still off sick.</strong> List the days so far. Every day after the last one counts automatically, at {person.usual_hours} hours a day, until you mark them as back.</span></label>

                {overlap.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950" role="alert">
                    <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={14} aria-hidden="true" /> {overlap.length === 1 ? 'One of these days is' : `${overlap.length} of these days are`} approved holiday: {overlap.map(o => niceDate(o.day)).join(', ')}</p>
                    <label className="mt-2 flex items-start gap-2"><input type="radio" name="hol" className="mt-0.5" checked={hol === 'keep'} onChange={() => setHol('keep')} /><span>Keep the holiday as it is, and also record the sickness.</span></label>
                    <label className="mt-1 flex items-start gap-2"><input type="radio" name="hol" className="mt-0.5" checked={hol === 'replace'} onChange={() => setHol('replace')} /><span>Sickness replaces the holiday on these days. The hours go back to their holiday balance, and they get an email and a hub message saying the booking was changed.</span></label>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label htmlFor="sick-kind" className="mb-1 block text-sm font-medium text-neutral-dark">Kind</label>
                    <select id="sick-kind" className={inp} value={kind} onChange={e => setKind(e.target.value as SickKind)}><option value="sick">Sick</option><option value="injury">Injury</option><option value="medical appointment">Medical appointment</option></select></div>
                  <div><label htmlFor="sick-cert" className="mb-1 block text-sm font-medium text-neutral-dark">Certificate (optional)</label>
                    <select id="sick-cert" className={inp} value={cert} onChange={e => setCert(e.target.value as Certificate | '')}><option value="">Not recorded</option><option value="none">None needed</option><option value="self">Self certificate</option><option value="fit note">Fit note</option></select></div>
                </div>
                <div>
                  <label htmlFor="sick-note" className="mb-1 block text-sm font-medium text-neutral-dark">Note (optional)</label>
                  <input id="sick-note" className={inp} maxLength={NOTE_MAX} value={note} onChange={e => setNote(e.target.value)} />
                  <p className="mt-1 text-xs text-neutral-mid">Do not write medical details. {note.length}/{NOTE_MAX}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-dark"><input type="checkbox" className="h-4 w-4" checked={rtw} onChange={e => setRtw(e.target.checked)} /> Return to work conversation done</label>
              </>
            )}

            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              <button type="button" disabled={busy || !person || !days.length} onClick={save} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy ? <Loader2 size={14} className="animate-spin" /> : null}{editId ? 'Save changes' : 'Save'}</button>
              <button type="button" disabled={busy} onClick={onClose} className={`${btn} border border-gray-300 text-neutral-dark hover:bg-neutral-light`}>Cancel</button>
              {editId && open && <button type="button" disabled={busy} onClick={back} className={`${btn} border border-teal text-teal hover:bg-teal/5`}>They are back at work</button>}
              {editId && (confirmRemove
                ? <span className="ml-auto flex items-center gap-2 text-sm text-neutral-dark">Remove this record? <button type="button" disabled={busy} onClick={remove} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Yes, remove</button><button type="button" onClick={() => setConfirmRemove(false)} className="text-teal hover:underline">No</button></span>
                : <button type="button" disabled={busy} onClick={() => setConfirmRemove(true)} className={`${btn} ml-auto border border-red-300 text-red-700 hover:bg-red-50`}>Remove</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
