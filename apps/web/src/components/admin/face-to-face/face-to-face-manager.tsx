'use client'

import { useEffect, useMemo, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import {
  ChevronLeft, ChevronRight, Plus, Users, X, Trash2,
  CheckCircle2, XCircle, Circle, GraduationCap, Send, Info, Mail, AlertTriangle,
} from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const keyOf = (iso: string) => iso.slice(0, 10)
const prettyDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

type Staff = { id: string; name: string; job_role: string | null; is_active?: boolean }
type Module = { id: string; name: string; category: string; ready?: boolean }
type Session = { id: string; module_id: string | null; title: string; session_date: string; delivered_by_user_id: string | null; delivered_by_name: string | null; notes: string | null; allocated: number; attended: number; absent: number; unmarked: number }

export function FaceToFaceManager({ token }: { token?: string }) {
  const api = useMemo(() => (token ? createApiClient(token) : null), [token])

  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())  // 0-based
  const [sessions, setSessions] = useState<Session[]>([])
  const [modules,  setModules]  = useState<Module[]>([])
  const [staff,    setStaff]    = useState<Staff[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<{ mode: 'new'; date?: string } | { mode: 'edit'; session: Session } | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  // Past/today sessions with staff still not marked attended or absent.
  const [unmarked, setUnmarked] = useState<any[]>([])
  const [markBusy, setMarkBusy] = useState<string | null>(null)  // `${sessionId}:${userId}` in flight

  async function loadUnmarked() {
    if (!api) return
    try { const d = await api.faceToFace.unmarked(); setUnmarked(d.sessions) } catch { /* ignore */ }
  }
  async function loadSessions() {
    if (!api) return
    // Fetch a wide window so backfill (last year) and next-year planning are covered.
    const from = `${year - 1}-01-01`, to = `${year + 1}-12-31`
    try { const d = await api.faceToFace.sessions(from, to); setSessions(d.sessions) } catch { /* ignore */ }
    loadUnmarked()
  }
  useEffect(() => {
    if (!api) return
    setLoading(true)
    Promise.all([
      api.faceToFace.sessions(`${year - 1}-01-01`, `${year + 1}-12-31`).then(d => setSessions(d.sessions)).catch(() => {}),
      api.faceToFace.modules().then(d => setModules(d.modules)).catch(() => {}),
      api.users.list().then((d: any) => setStaff((d.users ?? d ?? []).filter((u: any) => u.is_active !== false))).catch(() => {}),
      api.faceToFace.unmarked().then(d => setUnmarked(d.sessions)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [api, year]) // eslint-disable-line react-hooks/exhaustive-deps

  // Quick-mark one person straight from the "still to record" list.
  async function quickMark(sessionId: string, userId: string, status: 'attended' | 'absent') {
    if (!api) return
    setMarkBusy(`${sessionId}:${userId}`)
    try {
      await api.faceToFace.markAttendance(sessionId, [{ user_id: userId, status }])
      // Drop the person locally; drop the session row once it's fully marked.
      setUnmarked(prev => prev
        .map(s => s.id === sessionId ? { ...s, people: s.people.filter((p: any) => p.user_id !== userId) } : s)
        .filter(s => s.people.length > 0))
      loadSessions()
    } catch { /* ignore */ } finally { setMarkBusy(null) }
  }

  // Sessions bucketed by day for the calendar.
  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>()
    for (const s of sessions) { const k = keyOf(s.session_date); if (!m.has(k)) m.set(k, []); m.get(k)!.push(s) }
    return m
  }, [sessions])

  // October planning nudge: from October, prompt to start next year if it's empty.
  const nextYear = today.getFullYear() + 1
  const nextYearCount = sessions.filter(s => new Date(s.session_date).getUTCFullYear() === nextYear).length
  const showPlanNudge = today.getMonth() >= 9 && nextYearCount === 0

  // Build the month grid (Monday-start).
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1))
    const lead = (first.getUTCDay() + 6) % 7
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const out: Array<{ key: string; day: number } | null> = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push({ key: `${year}-${pad(month + 1)}-${pad(d)}`, day: d })
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [year, month])

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  const todayKey = ymd(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-mid">Log the in-person sessions you run, mark who attended, and send the digital module to anyone who missed.</p>
        </div>
        <button onClick={() => setEditing({ mode: 'new' })} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90"><Plus size={16} /> New session</button>
      </div>

      {showPlanNudge && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info size={16} className="shrink-0 text-amber-500" />
          <span>It&apos;s a good time to plan {nextYear}&apos;s face-to-face training. Nothing is scheduled yet.</span>
          <button onClick={() => { setYear(nextYear); setMonth(0) }} className="ml-auto rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Plan {nextYear} →</button>
        </div>
      )}

      {/* Calendar header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:border-teal/40 hover:text-teal"><ChevronLeft size={16} /></button>
          <button onClick={nextMonth} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:border-teal/40 hover:text-teal"><ChevronRight size={16} /></button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">Today</button>
        </div>
        <h2 className="text-lg font-bold text-neutral-dark">{MONTHS[month]} {year}</h2>
        <div className="w-24" />
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-neutral-light/40 text-center text-xs font-semibold text-neutral-mid">
          {DOW.map(d => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => (
            <div key={i} className={`min-h-[92px] border-b border-r border-gray-100 p-1.5 ${i % 7 === 6 ? 'border-r-0' : ''} ${c ? 'cursor-pointer hover:bg-neutral-light/30' : 'bg-neutral-light/20'}`}
                 onClick={c ? () => setEditing({ mode: 'new', date: c.key }) : undefined}>
              {c && (
                <>
                  <div className={`mb-1 text-right text-xs ${c.key === todayKey ? 'font-bold text-teal' : 'text-neutral-mid'}`}>{c.day}</div>
                  <div className="space-y-1">
                    {(byDay.get(c.key) ?? []).map(s => (
                      <button key={s.id} onClick={(e) => { e.stopPropagation(); setViewingId(s.id) }}
                              className="block w-full truncate rounded-md bg-teal/10 px-1.5 py-1 text-left text-[11px] font-medium text-teal hover:bg-teal/20">
                        {s.title}
                        <span className="ml-1 font-normal text-teal/70">{s.attended}/{s.allocated}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {loading && <p className="mt-3 text-center text-sm text-neutral-mid">Loading…</p>}

      {/* Attendance still to record — past/today sessions with unmarked staff */}
      {unmarked.length > 0 && (() => {
        const pending = unmarked.reduce((n: number, s: any) => n + s.people.length, 0)
        return (
          <div className="mt-8">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-neutral-dark">Attendance still to record</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{pending} {pending === 1 ? 'person' : 'people'}</span>
            </div>
            <p className="mb-3 text-xs text-neutral-mid">These sessions have already taken place but some staff aren&apos;t marked attended or missed yet. Mark them here so nobody is left off the record.</p>
            <div className="space-y-3">
              {unmarked.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <button onClick={() => setViewingId(s.id)} className="text-left text-sm font-semibold text-neutral-dark hover:text-teal">{s.title}</button>
                    <span className="text-xs text-neutral-mid">{prettyDate(s.session_date)} · {s.people.length} to mark</span>
                  </div>
                  <div className="space-y-1.5">
                    {s.people.map((p: any) => (
                      <div key={p.user_id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                          {p.job_role && <p className="text-xs text-neutral-mid">{p.job_role}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => quickMark(s.id, p.user_id, 'attended')} disabled={markBusy === `${s.id}:${p.user_id}`} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-green-600 hover:border-green-300 disabled:opacity-50"><CheckCircle2 size={13} /> Attended</button>
                          <button onClick={() => quickMark(s.id, p.user_id, 'absent')} disabled={markBusy === `${s.id}:${p.user_id}`} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-red-500 hover:border-red-300 disabled:opacity-50"><XCircle size={13} /> Missed</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {editing && api && (
        <SessionModal
          api={api} modules={modules} staff={staff}
          initial={editing.mode === 'edit' ? editing.session : null}
          presetDate={editing.mode === 'new' ? editing.date : undefined}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadSessions() }}
        />
      )}

      {viewingId && api && (
        <SessionDetail
          api={api} staff={staff} modules={modules} sessionId={viewingId}
          onClose={() => setViewingId(null)}
          onChanged={loadSessions}
          onEdit={(s) => { setViewingId(null); setEditing({ mode: 'edit', session: s }) }}
        />
      )}
    </div>
  )
}

// ─── Create / edit a session ──────────────────────────────────────────────────
function SessionModal({ api, modules, staff, initial, presetDate, onClose, onSaved }: {
  api: ReturnType<typeof createApiClient>; modules: Module[]; staff: Staff[]
  initial: Session | null; presetDate?: string; onClose: () => void; onSaved: () => void
}) {
  const [moduleId, setModuleId] = useState(initial?.module_id ?? '')
  const [title,    setTitle]    = useState(initial?.title ?? '')
  const [date,     setDate]     = useState(initial ? keyOf(initial.session_date) : (presetDate ?? ymd(new Date())))
  const [trainerMode, setTrainerMode] = useState<'staff' | 'external'>(initial?.delivered_by_user_id ? 'staff' : (initial?.delivered_by_name ? 'external' : 'staff'))
  const [trainerStaff, setTrainerStaff] = useState(initial?.delivered_by_user_id ?? '')
  const [trainerName,  setTrainerName]  = useState(initial?.delivered_by_name ?? '')
  const [notes,    setNotes]    = useState(initial?.notes ?? '')
  const [attendees, setAttendees] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingAttendees, setLoadingAttendees] = useState(!!initial)

  // For an existing session, load its current attendee set.
  useEffect(() => {
    if (!initial) return
    api.faceToFace.session(initial.id).then(d => setAttendees(new Set((d.session.attendance ?? []).map((a: any) => a.user_id)))).catch(() => {}).finally(() => setLoadingAttendees(false))
  }, [initial, api])

  const moduleName = modules.find(m => m.id === moduleId)?.name
  const effectiveTitle = title.trim() || moduleName || ''
  const shownStaff = staff.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))

  async function save(sendReminder = false) {
    if (!date || !effectiveTitle || saving) return
    setSaving(true)
    const payload: any = {
      module_id: moduleId || undefined,
      title: title.trim() || undefined,
      session_date: date,
      delivered_by_user_id: trainerMode === 'staff' ? (trainerStaff || undefined) : null,
      delivered_by_name:    trainerMode === 'external' ? (trainerName.trim() || undefined) : null,
      notes: notes.trim() || undefined,
      attendee_ids: [...attendees],
    }
    try {
      if (initial) {
        await api.faceToFace.updateSession(initial.id, payload)
      } else {
        const r = await api.faceToFace.createSession(payload)
        if (sendReminder && r?.session?.id) await api.faceToFace.remind(r.session.id).catch(() => {})
      }
      onSaved()
    } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-dark">{initial ? 'Edit session' : 'New face-to-face session'}</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Training topic</label>
        <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
          <option value="">— Choose a module —</option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}{m.ready === false ? ' (not built yet)' : ''}</option>)}
        </select>
        {moduleId && modules.find(m => m.id === moduleId)?.ready === false && (
          <p className="-mt-2 mb-3 text-xs text-amber-600">This module hasn&apos;t been built yet. You can still schedule the session, but you won&apos;t be able to send it digitally until it has a lesson or questions.</p>
        )}

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Title {moduleName ? '(defaults to the module name)' : ''}</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={moduleName ?? 'e.g. Moving & Handling refresher'} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Delivered by</label>
        <div className="mb-1 flex gap-2 text-xs">
          <button onClick={() => setTrainerMode('staff')} className={`rounded-lg border px-2.5 py-1 font-medium ${trainerMode === 'staff' ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid'}`}>Staff member</button>
          <button onClick={() => setTrainerMode('external')} className={`rounded-lg border px-2.5 py-1 font-medium ${trainerMode === 'external' ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid'}`}>External / other</button>
        </div>
        {trainerMode === 'staff'
          ? <select value={trainerStaff} onChange={e => setTrainerStaff(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
              <option value="">— Choose a staff member —</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.job_role ? ` (${s.job_role})` : ''}</option>)}
            </select>
          : <input value={trainerName} onChange={e => setTrainerName(e.target.value)} placeholder="Trainer name" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />}

        <label className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-mid">
          <span>Allocated staff ({attendees.size})</span>
          <span className="flex gap-2 font-normal">
            <button onClick={() => setAttendees(new Set(staff.map(s => s.id)))} className="text-teal hover:underline">All</button>
            <button onClick={() => setAttendees(new Set())} className="text-neutral-mid hover:underline">None</button>
          </span>
        </label>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter staff…" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none" />
        <div className="mb-4 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
          {loadingAttendees ? <p className="p-2 text-xs text-neutral-mid">Loading…</p> : shownStaff.map(s => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
              <input type="checkbox" checked={attendees.has(s.id)} onChange={() => setAttendees(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })} className="accent-teal" />
              <span className="text-neutral-dark">{s.name}</span>
              {s.job_role && <span className="text-xs text-neutral-mid">{s.job_role}</span>}
            </label>
          ))}
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Cancel</button>
          {!initial && (
            <button onClick={() => save(true)} disabled={!date || !effectiveTitle || saving || attendees.size === 0} title={attendees.size === 0 ? 'Allocate staff first' : 'Create the session and email the allocated staff a reminder now'} className="inline-flex items-center gap-1.5 rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-teal-light/40 disabled:opacity-50">
              <Mail size={14} /> Create &amp; email reminder
            </button>
          )}
          <button onClick={() => save(false)} disabled={!date || !effectiveTitle || saving} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{saving ? 'Saving…' : initial ? 'Save changes' : 'Create session'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Session detail: attendance + assign the digital module ───────────────────
function SessionDetail({ api, staff, modules, sessionId, onClose, onChanged, onEdit }: {
  api: ReturnType<typeof createApiClient>; staff: Staff[]; modules: Module[]; sessionId: string
  onClose: () => void; onChanged: () => void; onEdit: (s: Session) => void
}) {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignMsg, setAssignMsg] = useState('')
  const [reminding, setReminding] = useState(false)
  const [remindMsg, setRemindMsg] = useState('')

  function load() { api.faceToFace.session(sessionId).then(d => setData(d.session)).catch(() => {}) }
  useEffect(() => { load() }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function remind() {
    if (reminding || (data?.attendance ?? []).length === 0) return
    setReminding(true); setRemindMsg('')
    try { const r = await api.faceToFace.remind(sessionId); setRemindMsg(`Reminder emailed to ${r.sent} staff.`); load(); onChanged() }
    catch (e: any) { setRemindMsg(e?.message ?? 'Could not send the reminder.') } finally { setReminding(false) }
  }

  async function mark(userId: string, status: 'attended' | 'absent' | 'allocated') {
    setData((d: any) => ({ ...d, attendance: d.attendance.map((a: any) => a.user_id === userId ? { ...a, status } : a) }))
    await api.faceToFace.markAttendance(sessionId, [{ user_id: userId, status }]).catch(() => {})
    onChanged()
  }
  async function bulk(status: 'attended' | 'absent') {
    const marks = (data?.attendance ?? []).map((a: any) => ({ user_id: a.user_id, status }))
    setData((d: any) => ({ ...d, attendance: d.attendance.map((a: any) => ({ ...a, status })) }))
    await api.faceToFace.markAttendance(sessionId, marks).catch(() => {})
    onChanged()
  }
  async function assign() {
    if (selected.size === 0 || saving) return
    setSaving(true); setAssignMsg('')
    try {
      const r = await api.faceToFace.assignModule(sessionId, [...selected])
      setAssignMsg(`Sent to ${r.assigned} staff (${r.newly_enrolled} newly enrolled).`)
      setSelected(new Set()); load(); onChanged()
    } catch (e: any) { setAssignMsg(e?.message ?? 'Could not assign the module.') } finally { setSaving(false) }
  }
  async function remove() {
    if (!confirm('Delete this session and its attendance record?')) return
    await api.faceToFace.deleteSession(sessionId).catch(() => {})
    onChanged(); onClose()
  }

  if (!data) return null
  const att = data.attendance ?? []
  const missed = att.filter((a: any) => a.status === 'absent')
  // Only a built module (lesson or questions) can be sent; an empty shell can't.
  const moduleReady = data.module_id ? (modules.find(m => m.id === data.module_id)?.ready !== false) : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">{data.title}</h2>
            <p className="text-sm text-neutral-mid">{prettyDate(data.session_date)}{data.delivered_by_name_resolved ? ` · delivered by ${data.delivered_by_name_resolved}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        {data.notes && <p className="mb-3 rounded-lg bg-neutral-light/50 px-3 py-2 text-sm text-neutral-dark">{data.notes}</p>}

        <div className="mb-2 mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Attendance ({att.length})</p>
          <div className="flex gap-2 text-xs">
            <button onClick={() => bulk('attended')} className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium text-green-600 hover:border-green-300">All attended</button>
            <button onClick={() => bulk('absent')} className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium text-red-500 hover:border-red-300">All missed</button>
          </div>
        </div>
        <div className="space-y-1.5">
          {att.map((a: any) => (
            <div key={a.user_id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-dark">{a.name}</p>
                <p className="text-xs text-neutral-mid">{a.job_role || 'Staff'}{a.module_assigned_at ? ' · module sent' : ''}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => mark(a.user_id, 'attended')} title="Attended" className={`rounded-md border p-1.5 ${a.status === 'attended' ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 text-neutral-mid hover:border-green-300'}`}><CheckCircle2 size={14} /></button>
                <button onClick={() => mark(a.user_id, 'absent')} title="Missed" className={`rounded-md border p-1.5 ${a.status === 'absent' ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-200 text-neutral-mid hover:border-red-300'}`}><XCircle size={14} /></button>
                <button onClick={() => mark(a.user_id, 'allocated')} title="Not marked" className={`rounded-md border p-1.5 ${a.status === 'allocated' ? 'border-gray-300 bg-gray-50 text-neutral-dark' : 'border-gray-200 text-neutral-mid hover:border-gray-300'}`}><Circle size={14} /></button>
              </div>
            </div>
          ))}
          {att.length === 0 && <p className="text-sm text-neutral-mid">No staff allocated. Use Edit to add attendees.</p>}
        </div>

        {/* Email reminder (admin-triggered) */}
        {att.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={remind} disabled={reminding} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal/40 disabled:opacity-50">
              <Mail size={14} /> {reminding ? 'Sending…' : 'Email reminder to allocated staff'}
            </button>
            {data.reminder_sent_at && <span className="text-xs text-neutral-mid">Last sent {prettyDate(data.reminder_sent_at)}</span>}
            {remindMsg && <span className="text-xs text-teal">{remindMsg}</span>}
          </div>
        )}

        {/* Send the digital module */}
        {!data.module_id ? (
          <p className="mt-5 rounded-lg bg-neutral-light/50 px-3 py-2 text-xs text-neutral-mid">No training module is linked to this session, so the digital module can&apos;t be sent. Add one via Edit.</p>
        ) : !moduleReady ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">This session&apos;s training module hasn&apos;t been built yet, so it can&apos;t be sent. Add a lesson or questions in Training → Modules &amp; Questions first.</p>
        ) : (
          <div className="mt-5 rounded-xl border border-teal/30 bg-teal-light/10 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-teal"><GraduationCap size={15} /> Send the digital module</p>
            <p className="mb-2 text-xs text-neutral-mid">Choose who should complete this training digitally (for example, those who missed). They&apos;ll get it in My Training.</p>
            <div className="mb-2 flex gap-2 text-xs">
              <button onClick={() => setSelected(new Set(missed.map((a: any) => a.user_id)))} className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium text-neutral-dark hover:border-teal/40">Select those who missed ({missed.length})</button>
              <button onClick={() => setSelected(new Set())} className="rounded-lg border border-gray-200 px-2.5 py-1 font-medium text-neutral-mid hover:border-teal/40">Clear</button>
            </div>
            <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
              {att.map((a: any) => (
                <label key={a.user_id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white">
                  <input type="checkbox" checked={selected.has(a.user_id)} onChange={() => setSelected(prev => { const n = new Set(prev); n.has(a.user_id) ? n.delete(a.user_id) : n.add(a.user_id); return n })} className="accent-teal" />
                  <span className="text-neutral-dark">{a.name}</span>
                  {a.status === 'absent' && <span className="rounded-full bg-red-50 px-1.5 text-[10px] font-medium text-red-500">missed</span>}
                  {a.module_assigned_at && <span className="rounded-full bg-teal/10 px-1.5 text-[10px] font-medium text-teal">sent</span>}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={assign} disabled={selected.size === 0 || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50"><Send size={14} /> {saving ? 'Sending…' : `Send to ${selected.size}`}</button>
              {assignMsg && <span className="text-xs text-neutral-mid">{assignMsg}</span>}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <button onClick={remove} className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600"><Trash2 size={14} /> Delete</button>
          <button onClick={() => onEdit({ id: data.id, module_id: data.module_id, title: data.title, session_date: data.session_date, delivered_by_user_id: data.delivered_by_user_id, delivered_by_name: data.delivered_by_name, notes: data.notes, allocated: att.length, attended: 0, absent: 0, unmarked: 0 })} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40"><Users size={14} /> Edit session</button>
        </div>
      </div>
    </div>
  )
}
