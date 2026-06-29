'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import {
  ChevronLeft, ChevronRight, Plus, Users, X, Trash2,
  CheckCircle2, XCircle, Circle, GraduationCap, Send, Info, Mail, AlertTriangle, FileText, Download, Loader2,
  CalendarDays, Grid3x3, Settings2, Upload, Award, Paperclip, ClipboardList, FileDown,
} from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const keyOf = (iso: string) => iso.slice(0, 10)
const prettyDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

type Staff = { id: string; name: string; job_role: string | null; is_active?: boolean }
type Module = { id: string; name: string; category: string; ready?: boolean }
type Session = { id: string; module_id: string | null; title: string; session_date: string; delivered_by_user_id: string | null; delivered_by_name: string | null; duration_hours: number; start_time: string | null; end_time: string | null; location: string | null; capacity: number | null; series_id: string | null; renews_after_months: number | null; notes: string | null; allocated: number; attended: number; absent: number; unmarked: number }

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
  const [training, setTraining] = useState<{ adhoc: any[]; annual: any[] } | null>(null)  // adhoc/annual allocations + completions for the visible month
  const [payrollOpen, setPayrollOpen] = useState(false)
  const [dayDetail, setDayDetail] = useState<string | null>(null)   // open the per-day overlay
  const [view, setView] = useState<'calendar' | 'matrix'>('calendar')   // calendar vs compliance matrix

  // Adhoc + annual training for the visible month (powers the calendar overlay).
  useEffect(() => {
    if (!api) return
    api.faceToFace.trainingMonth(`${year}-${pad(month + 1)}`).then(d => setTraining({ adhoc: d.adhoc, annual: d.annual })).catch(() => setTraining(null))
  }, [api, year, month])

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

  // Adhoc/annual training bucketed by day: allocated (+N) and completed (✓N) counts.
  const byDayTraining = useMemo(() => {
    const m = new Map<string, { adhocAlloc: number; adhocComp: number; annualAlloc: number; annualComp: number }>()
    const get = (k: string) => { let v = m.get(k); if (!v) { v = { adhocAlloc: 0, adhocComp: 0, annualAlloc: 0, annualComp: 0 }; m.set(k, v) } return v }
    const add = (rows: any[], type: 'adhoc' | 'annual') => {
      for (const r of rows ?? []) {
        if (r.allocated_at) get(keyOf(r.allocated_at))[`${type}Alloc` as const]++
        if (r.completed_at) get(keyOf(r.completed_at))[`${type}Comp` as const]++
      }
    }
    if (training) { add(training.adhoc, 'adhoc'); add(training.annual, 'annual') }
    return m
  }, [training])

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
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm font-semibold">
          <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === 'calendar' ? 'bg-teal text-white' : 'text-neutral-mid hover:text-teal'}`}><CalendarDays size={15} /> Calendar</button>
          <button onClick={() => setView('matrix')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 ${view === 'matrix' ? 'bg-teal text-white' : 'text-neutral-mid hover:text-teal'}`}><Grid3x3 size={15} /> Matrix</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPayrollOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 px-4 py-2 text-sm font-semibold text-teal hover:bg-teal-light/40"><FileText size={16} /> Payroll report</button>
          <button onClick={() => setEditing({ mode: 'new' })} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90"><Plus size={16} /> New session</button>
        </div>
      </div>

      {view === 'matrix' && api && <F2FMatrixView api={api} modules={modules} staff={staff} />}

      {view === 'calendar' && (<>

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
                 onClick={c ? () => setDayDetail(c.key) : undefined}>
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
                    {(() => {
                      const t = byDayTraining.get(c.key); if (!t) return null
                      const chip = (cls: string, txt: string) => <span className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{txt}</span>
                      return <>
                        {t.adhocAlloc > 0  && chip('bg-orange-100 text-orange-700', `Adhoc +${t.adhocAlloc}`)}
                        {t.adhocComp > 0   && chip('bg-orange-50 text-orange-600 ring-1 ring-orange-200', `Adhoc ✓${t.adhocComp}`)}
                        {t.annualAlloc > 0 && chip('bg-indigo-100 text-indigo-700', `Annual +${t.annualAlloc}`)}
                        {t.annualComp > 0  && chip('bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200', `Annual ✓${t.annualComp}`)}
                      </>
                    })()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal/30" /> Face-to-face</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-200" /> Adhoc training</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-200" /> Annual training</span>
        <span className="text-neutral-mid/80">+N allocated · ✓N completed</span>
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

      </>)}

      {payrollOpen && api && (
        <PayrollModal api={api} year={year} month={month} onClose={() => setPayrollOpen(false)} />
      )}

      {dayDetail && (
        <DayDetail
          dayKey={dayDetail}
          sessions={byDay.get(dayDetail) ?? []}
          training={training}
          onClose={() => setDayDetail(null)}
          onNew={() => { const k = dayDetail; setDayDetail(null); setEditing({ mode: 'new', date: k }) }}
          onOpenSession={(id) => { setDayDetail(null); setViewingId(id) }}
        />
      )}

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

// ─── Day overlay: everything happening on one calendar day ────────────────────
function DayDetail({ dayKey, sessions, training, onClose, onNew, onOpenSession }: {
  dayKey: string
  sessions: Session[]
  training: { adhoc: any[]; annual: any[] } | null
  onClose: () => void
  onNew: () => void
  onOpenSession: (id: string) => void
}) {
  // Flatten adhoc/annual rows into per-day events (a row can be allocated and/or completed today).
  const eventsFor = (rows: any[]) => (rows ?? []).flatMap((r: any) => {
    const out: Array<{ name: string; title: string; kind: 'Allocated' | 'Completed' }> = []
    if (r.allocated_at && keyOf(r.allocated_at) === dayKey) out.push({ name: r.name, title: r.title, kind: 'Allocated' })
    if (r.completed_at && keyOf(r.completed_at) === dayKey) out.push({ name: r.name, title: r.title, kind: 'Completed' })
    return out
  }).sort((a, b) => a.name.localeCompare(b.name))

  const adhoc = eventsFor(training?.adhoc ?? [])
  const annual = eventsFor(training?.annual ?? [])
  const nothing = sessions.length === 0 && adhoc.length === 0 && annual.length === 0

  const KindTag = ({ kind }: { kind: 'Allocated' | 'Completed' }) =>
    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${kind === 'Completed' ? 'bg-green-50 text-green-600 ring-1 ring-green-200' : 'bg-gray-100 text-neutral-mid'}`}>{kind}</span>

  const EventList = ({ rows, color }: { rows: Array<{ name: string; title: string; kind: 'Allocated' | 'Completed' }>; color: string }) => (
    <div className="space-y-1">
      {rows.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-dark">{e.name}</p>
            <p className={`truncate text-xs ${color}`}>{e.title}</p>
          </div>
          <KindTag kind={e.kind} />
        </div>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">{prettyDate(dayKey)}</h2>
            <p className="text-sm text-neutral-mid">Training on this day</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        {nothing && <p className="rounded-lg bg-neutral-light/50 px-3 py-3 text-sm text-neutral-mid">Nothing scheduled or allocated on this day.</p>}

        {/* Face-to-face sessions */}
        {sessions.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-teal">Face-to-face sessions</p>
            <div className="space-y-1">
              {sessions.map(s => (
                <button key={s.id} onClick={() => onOpenSession(s.id)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-left hover:bg-teal/10">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{s.title}</p>
                    <p className="text-xs text-neutral-mid">{s.attended}/{s.allocated} attended{s.unmarked > 0 ? ` · ${s.unmarked} to mark` : ''}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-teal" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Adhoc training */}
        {adhoc.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-orange-600">Adhoc training</p>
            <EventList rows={adhoc} color="text-orange-600" />
          </div>
        )}

        {/* Annual training */}
        {annual.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600">Annual training</p>
            <EventList rows={annual} color="text-indigo-600" />
          </div>
        )}

        <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
          <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90"><Plus size={14} /> New session this day</button>
        </div>
      </div>
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
  const [duration, setDuration] = useState<number>(initial?.duration_hours ?? 1)
  const [trainerMode, setTrainerMode] = useState<'staff' | 'external'>(initial?.delivered_by_user_id ? 'staff' : (initial?.delivered_by_name ? 'external' : 'staff'))
  const [trainerStaff, setTrainerStaff] = useState(initial?.delivered_by_user_id ?? '')
  const [trainerName,  setTrainerName]  = useState(initial?.delivered_by_name ?? '')
  const [notes,    setNotes]    = useState(initial?.notes ?? '')
  const [startTime, setStartTime] = useState(initial?.start_time ?? '')
  const [endTime,   setEndTime]   = useState(initial?.end_time ?? '')
  const [location,  setLocation]  = useState(initial?.location ?? '')
  const [capacity,  setCapacity]  = useState(initial?.capacity != null ? String(initial.capacity) : '')
  const [renewMonths, setRenewMonths] = useState(initial?.renews_after_months != null ? String(initial.renews_after_months) : '')
  const [repeatMonths, setRepeatMonths] = useState(0)   // additional monthly copies (new sessions only)
  const [attendees, setAttendees] = useState<Set<string>>(new Set())
  const [owedPay, setOwedPay] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingAttendees, setLoadingAttendees] = useState(!!initial)

  // For an existing session, load its current attendee set.
  useEffect(() => {
    if (!initial) return
    api.faceToFace.session(initial.id).then(d => {
      const att = d.session.attendance ?? []
      setAttendees(new Set(att.map((a: any) => a.user_id)))
      setOwedPay(new Set(att.filter((a: any) => a.owed_pay).map((a: any) => a.user_id)))
    }).catch(() => {}).finally(() => setLoadingAttendees(false))
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
      duration_hours: duration,
      start_time: startTime || null,
      end_time: endTime || null,
      location: location.trim() || null,
      capacity: capacity.trim() ? Number(capacity) : null,
      renews_after_months: renewMonths ? Number(renewMonths) : null,
      notes: notes.trim() || undefined,
      attendee_ids: [...attendees],
      owed_pay_ids: [...owedPay],
    }
    try {
      if (initial) {
        await api.faceToFace.updateSession(initial.id, payload)
      } else {
        const r = await api.faceToFace.createSession({ ...payload, repeat_monthly: repeatMonths || undefined })
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

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Length</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
              {[1, 2, 3, 4, 5].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
        <p className="-mt-1 mb-3 text-xs text-neutral-mid">The session length sets how many hours staff who attended <strong className="text-neutral-dark">off shift</strong> are owed on the payroll report.</p>

        {/* Optional logistics: time, location, capacity */}
        <div className="mb-3 flex flex-wrap gap-3">
          <div className="w-28">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">End time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Capacity</label>
            <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="—" className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Location / room</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Training room 2" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Renews after</label>
        <select value={renewMonths} onChange={e => setRenewMonths(e.target.value)} className="mb-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
          <option value="">No expiry</option>
          <option value="6">6 months</option>
          <option value="12">12 months (annual)</option>
          <option value="24">24 months</option>
          <option value="36">36 months</option>
        </select>
        <p className="mb-3 text-xs text-neutral-mid">If the training expires, set how long it stays valid. The compliance matrix then flags people as due soon or overdue.</p>
        {!initial && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Repeat</label>
            <select value={repeatMonths} onChange={e => setRepeatMonths(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
              <option value={0}>Just this date</option>
              {[1, 2, 3, 5, 11].map(n => <option key={n} value={n}>Monthly for {n + 1} months</option>)}
            </select>
            {repeatMonths > 0 && <p className="mt-1 text-xs text-neutral-mid">Creates {repeatMonths + 1} sessions, one a month from this date, each with the same details and allocated staff.</p>}
          </div>
        )}

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
        <div className="mb-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
          {loadingAttendees ? <p className="p-2 text-xs text-neutral-mid">Loading…</p> : shownStaff.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={attendees.has(s.id)} onChange={() => setAttendees(prev => { const n = new Set(prev); if (n.has(s.id)) { n.delete(s.id); setOwedPay(o => { const oo = new Set(o); oo.delete(s.id); return oo }) } else n.add(s.id); return n })} className="accent-teal" />
                <span className="truncate text-neutral-dark">{s.name}</span>
                {s.job_role && <span className="shrink-0 text-xs text-neutral-mid">{s.job_role}</span>}
              </label>
              {attendees.has(s.id) && (
                <label className={`flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium ${owedPay.has(s.id) ? 'text-amber-700' : 'text-neutral-mid'}`} title="Tick if this person attended off shift, so they are owed the session hours">
                  <input type="checkbox" checked={owedPay.has(s.id)} onChange={() => setOwedPay(prev => { const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })} className="accent-amber-600" />
                  Owed pay
                </label>
              )}
            </div>
          ))}
        </div>
        <p className="mb-4 text-xs text-neutral-mid">Tick <strong className="text-amber-700">Owed pay</strong> for anyone who attended <strong className="text-neutral-dark">off shift</strong>, so they are owed the session hours on the payroll report. Leave it unticked for anyone who was on shift (already paid). By default nobody is marked as owed.</p>

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
  const { data: session } = useSession()
  const orgName = (session?.user as any)?.tenantName ?? 'Your service'
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignMsg, setAssignMsg] = useState('')
  const [reminding, setReminding] = useState(false)
  const [remindMsg, setRemindMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const [evidenceMsg, setEvidenceMsg] = useState('')
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)   // 'signin' | `cert:<userId>`
  const fileInputRef = useRef<HTMLInputElement>(null)
  const signInRef = useRef<HTMLDivElement>(null)
  const certRef = useRef<HTMLDivElement>(null)
  const [certFor, setCertFor] = useState<any>(null)   // attendee being certificated

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
  async function setCompetency(userId: string, competency: 'not_assessed' | 'competent' | 'not_yet_competent') {
    setData((d: any) => ({ ...d, attendance: d.attendance.map((a: any) => a.user_id === userId ? { ...a, competency } : a) }))
    await api.faceToFace.markAttendance(sessionId, [{ user_id: userId, competency }]).catch(() => {})
  }
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setEvidenceMsg('')
    try { await api.faceToFace.uploadEvidence(sessionId, file); load() }
    catch (err: any) { setEvidenceMsg(err?.message ?? 'Upload failed.') }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }
  async function openEvidence(ev: any) {
    try { const blob = await api.faceToFace.downloadEvidence(ev.id); const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000) }
    catch { setEvidenceMsg('Could not open the file.') }
  }
  async function deleteEvidence(ev: any) {
    if (!confirm(`Delete "${ev.file_name}"?`)) return
    await api.faceToFace.deleteEvidence(ev.id).catch(() => {}); load()
  }
  async function makeSignInSheet() {
    if (!signInRef.current) return
    setPdfBusy('signin'); setEvidenceMsg('')
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({ margin: [10, 10, 12, 10], filename: `sign-in-${(data.title || 'session').replace(/\s+/g, '-')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, width: 760, windowWidth: 760 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } } as any).from(signInRef.current).save()
    } catch (e: any) { setEvidenceMsg(e?.message ?? 'Could not generate the sheet.') } finally { setPdfBusy(null) }
  }
  async function makeCertificate(a: any) {
    setCertFor(a); setPdfBusy(`cert:${a.user_id}`); setEvidenceMsg('')
    // Wait a tick for the hidden cert node to render with this attendee's details.
    await new Promise(r => setTimeout(r, 50))
    try {
      if (!certRef.current) throw new Error('Certificate not ready.')
      // Filename = course + date (e.g. "Moving-and-Handling-26-Jun-2026.pdf").
      const slug = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
      const filename = `${slug(data.title || 'training')}-${slug(prettyDate(data.session_date))}.pdf`
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({ margin: 0, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, width: 1040, windowWidth: 1040 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: 'avoid-all' } } as any).from(certRef.current).save()
    } catch (e: any) { setEvidenceMsg(e?.message ?? 'Could not generate the certificate.') } finally { setPdfBusy(null) }
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
            <p className="text-sm text-neutral-mid">{prettyDate(data.session_date)}{data.start_time ? ` · ${data.start_time}${data.end_time ? `–${data.end_time}` : ''}` : ''} · {data.duration_hours ?? 1} hour{(data.duration_hours ?? 1) > 1 ? 's' : ''}{data.location ? ` · ${data.location}` : ''}{data.delivered_by_name_resolved ? ` · delivered by ${data.delivered_by_name_resolved}` : ''}</p>
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
            <div key={a.user_id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
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
              {/* Competency outcome + certificate (CQC evidence) */}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-mid">Competency</span>
                  <select value={a.competency ?? 'not_assessed'} onChange={e => setCompetency(a.user_id, e.target.value as any)} className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] focus:border-teal focus:outline-none">
                    <option value="not_assessed">Not assessed</option>
                    <option value="competent">Competent</option>
                    <option value="not_yet_competent">Not yet competent</option>
                  </select>
                </div>
                <button onClick={() => makeCertificate(a)} disabled={pdfBusy === `cert:${a.user_id}`} title="Generate a completion certificate" className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50">
                  {pdfBusy === `cert:${a.user_id}` ? <Loader2 size={12} className="animate-spin" /> : <Award size={12} />} Certificate
                </button>
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

        {/* CQC evidence: sign-in sheet, file uploads */}
        <div className="mt-5 rounded-xl border border-gray-200 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ClipboardList size={15} className="text-teal" /> Evidence</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={makeSignInSheet} disabled={pdfBusy === 'signin'} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal/40 disabled:opacity-50">{pdfBusy === 'signin' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Sign-in sheet</button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal/40 disabled:opacity-50">{uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload file</button>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={onPickFile} className="hidden" />
          </div>
          <p className="mb-2 text-xs text-neutral-mid">Print a sign-in sheet for staff to sign, then upload the scan. You can also attach photos or the trainer&apos;s certificate (PDF or image, up to 15 MB).</p>
          {(data.evidence ?? []).length > 0 && (
            <div className="space-y-1">
              {data.evidence.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-1.5">
                  <button onClick={() => openEvidence(ev)} className="flex min-w-0 items-center gap-1.5 text-left text-sm text-neutral-dark hover:text-teal">
                    <Paperclip size={13} className="shrink-0 text-neutral-mid" /><span className="truncate">{ev.file_name}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-neutral-mid">{(ev.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                    <button onClick={() => openEvidence(ev)} title="Open" className="text-neutral-mid hover:text-teal"><Download size={13} /></button>
                    <button onClick={() => deleteEvidence(ev)} title="Delete" className="text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {evidenceMsg && <p className="mt-2 text-xs font-medium text-red-600">{evidenceMsg}</p>}
        </div>

        {/* Send the digital module */}
        {!data.module_id ? (
          <p className="mt-5 rounded-lg bg-neutral-light/50 px-3 py-2 text-xs text-neutral-mid">No training module is linked to this session, so the digital module can&apos;t be sent. Add one via Edit.</p>
        ) : !moduleReady ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">This session&apos;s training module hasn&apos;t been built yet, so it can&apos;t be sent. Add a lesson or questions in Training → Adhoc Training Modules &amp; Questions first.</p>
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
          <button onClick={() => onEdit({ id: data.id, module_id: data.module_id, title: data.title, session_date: data.session_date, delivered_by_user_id: data.delivered_by_user_id, delivered_by_name: data.delivered_by_name, duration_hours: data.duration_hours ?? 1, start_time: data.start_time ?? null, end_time: data.end_time ?? null, location: data.location ?? null, capacity: data.capacity ?? null, series_id: data.series_id ?? null, renews_after_months: data.renews_after_months ?? null, notes: data.notes, allocated: att.length, attended: 0, absent: 0, unmarked: 0 })} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40"><Users size={14} /> Edit session</button>
        </div>
      </div>

      {/* Hidden printables (sign-in sheet + certificate), captured by html2pdf */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', zIndex: -1 }} onClick={e => e.stopPropagation()}>
        <div ref={signInRef} style={{ width: 760, padding: 24, fontFamily: 'Arial, Helvetica, sans-serif', color: '#1f2937', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0d9488', paddingBottom: 10, marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" style={{ height: 40 }} />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#374151' }}><strong>{orgName}</strong></div>
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: '2px 0 8px' }}>Training sign-in sheet</h1>
          <table style={{ width: '100%', fontSize: 12, marginBottom: 12 }}><tbody>
            <tr><td style={{ padding: '2px 0', color: '#6b7280', width: 110 }}>Training</td><td style={{ fontWeight: 700 }}>{data.title}</td></tr>
            <tr><td style={{ padding: '2px 0', color: '#6b7280' }}>Date</td><td>{prettyDate(data.session_date)}{data.start_time ? ` · ${data.start_time}${data.end_time ? `–${data.end_time}` : ''}` : ''}</td></tr>
            <tr><td style={{ padding: '2px 0', color: '#6b7280' }}>Location</td><td>{data.location || '—'}</td></tr>
            <tr><td style={{ padding: '2px 0', color: '#6b7280' }}>Delivered by</td><td>{data.delivered_by_name_resolved || '—'}</td></tr>
          </tbody></table>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb', width: 28 }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb' }}>Job role</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb', width: 220 }}>Signature</th>
            </tr></thead>
            <tbody>{att.map((a: any, i: number) => (
              <tr key={a.user_id}><td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>{i + 1}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>{a.name}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>{a.job_role || ''}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }} /></tr>
            ))}
            {att.length === 0 && <tr><td colSpan={4} style={{ padding: '10px 8px', color: '#6b7280' }}>No staff allocated.</td></tr>}
            </tbody>
          </table>
          <p style={{ marginTop: 18, fontSize: 12 }}>Trainer signature: ______________________________   Date: __________________</p>
        </div>

        <div ref={certRef} style={{ width: 1040, height: 725, fontFamily: 'Georgia, "Times New Roman", serif', color: '#1f2937', background: '#fff' }}>
          <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', border: '12px solid #0d9488', display: 'table' }}>
            <div style={{ display: 'table-cell', verticalAlign: 'middle', textAlign: 'center', padding: '0 72px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-color.png" alt="CareStream" style={{ height: 54, marginBottom: 22 }} />
              <div style={{ fontSize: 18, letterSpacing: 4, textTransform: 'uppercase', color: '#0d9488', fontWeight: 700 }}>Certificate of Training</div>
              <div style={{ margin: '26px 0 10px', fontSize: 16, color: '#6b7280' }}>This certifies that</div>
              <div style={{ fontSize: 50, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{certFor?.name ?? ''}</div>
              <div style={{ margin: '22px 0 8px', fontSize: 17, color: '#374151' }}>has attended the face-to-face training</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: '#0d9488', lineHeight: 1.3 }}>{data.title}</div>
              <div style={{ marginTop: 20, fontSize: 16, color: '#374151' }}>{prettyDate(data.session_date)} &middot; {data.duration_hours ?? 1} hour{(data.duration_hours ?? 1) > 1 ? 's' : ''}{data.delivered_by_name_resolved ? ` · delivered by ${data.delivered_by_name_resolved}` : ''}</div>
              {certFor?.competency === 'competent' && <div style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: '#0d9488' }}>Assessed as competent</div>}
              <div style={{ marginTop: 48, fontSize: 14, color: '#9ca3af' }}>{orgName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payroll / training report (PDF: download or email) ───────────────────────
function PayrollModal({ api, year, month, onClose }: {
  api: ReturnType<typeof createApiClient>; year: number; month: number; onClose: () => void
}) {
  const { data: session } = useSession()
  const orgName = (session?.user as any)?.tenantName ?? 'Your service'
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly')
  const [y, setY] = useState(year)
  const [m, setM] = useState(month)   // 0-based
  const [weekAnchor, setWeekAnchor] = useState<string>(() => ymd(new Date()))   // any day in the target week
  const [data, setData] = useState<{ f2f: any[]; adhoc: any[]; annual: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]   = useState<'pdf' | 'email' | null>(null)
  const [email, setEmail] = useState('')
  const [msg, setMsg]     = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  const monthStr   = `${y}-${pad(m + 1)}`
  // Monday → Sunday week containing the anchor day.
  const weekMon = (() => { const [Y, M, D] = weekAnchor.split('-').map(Number); const d = new Date(Date.UTC(Y, M - 1, D)); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(Y, M - 1, D - dow)) })()
  const weekSun = new Date(Date.UTC(weekMon.getUTCFullYear(), weekMon.getUTCMonth(), weekMon.getUTCDate() + 6))
  const fromStr = ymd(weekMon), toStr = ymd(weekSun)
  const periodLabel = period === 'weekly' ? `Week of ${prettyDate(fromStr)} to ${prettyDate(toStr)}` : `${MONTHS[m]} ${y}`
  const generated  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    setLoading(true)
    const req = period === 'weekly' ? api.faceToFace.trainingRange(fromStr, toStr) : api.faceToFace.trainingMonth(monthStr)
    req.then(d => setData({ f2f: d.f2f, adhoc: d.adhoc, annual: d.annual })).catch(() => setData(null)).finally(() => setLoading(false))
  }, [period, monthStr, fromStr, toStr]) // eslint-disable-line react-hooks/exhaustive-deps

  // The "Owed pay" tick drives payment. We only withhold it if the person was
  // explicitly marked absent (they didn't attend, so nothing is owed).
  const pay = (status: string, owed_pay: boolean) => status === 'absent' ? 'No' : (owed_pay ? 'Yes' : 'No')
  const f2fRows = (data?.f2f ?? []).flatMap((s: any) => (s.attendees ?? []).map((a: any) => ({ name: a.name, title: s.title, date: s.date, status: a.status, owed_pay: a.owed_pay, hours: s.duration_hours ?? 1, rate: a.hourly_rate as number | null })))
    .sort((a: any, b: any) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date))
  // Hours owed = the session length, but only for payable rows.
  const hoursOwed = (r: any) => pay(r.status, r.owed_pay) === 'Yes' ? r.hours : 0
  const totalHoursOwed = f2fRows.reduce((n: number, r: any) => n + hoursOwed(r), 0)
  // Cost in pence = hours owed x the staff member's hourly rate (when set).
  const costPence = (r: any) => { const h = hoursOwed(r); return h > 0 && typeof r.rate === 'number' ? h * r.rate : 0 }
  const totalCostPence = f2fRows.reduce((n: number, r: any) => n + costPence(r), 0)
  const anyRates = f2fRows.some((r: any) => typeof r.rate === 'number')   // only show £ columns if at least one rate is set
  const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

  // NB: the html2pdf worker is a thenable. Never await it before calling
  // .save()/.outputPdf() or the chain resolves and the worker methods vanish
  // ("Cannot read properties of undefined (reading 'save')"). Chain in one go.
  const pdfOpts = () => ({
    margin: [10, 10, 12, 10],
    filename: `training-report-${periodLabel.replace(/\s+/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    // Pin the capture to the element's true width. Without width/windowWidth,
    // the off-screen (left:-99999) element is sized against the viewport and
    // the right edge gets clipped (cut date, incomplete border).
    html2canvas: { scale: 2, useCORS: true, logging: false, width: 760, windowWidth: 760, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  })
  async function download() {
    if (!reportRef.current) return
    setBusy('pdf'); setMsg('')
    try {
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set(pdfOpts() as any).from(reportRef.current).save()
    } catch (e: any) { setMsg(e?.message ?? 'Could not generate the PDF.') }
    finally { setBusy(null) }
  }
  async function sendEmail() {
    if (!reportRef.current || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg('Enter a valid email address.'); return }
    setBusy('email'); setMsg('')
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const uri = await html2pdf().set(pdfOpts() as any).from(reportRef.current).outputPdf('datauristring')
      await api.faceToFace.payrollEmail(email.trim(), periodLabel, uri)
      setMsg(`Sent to ${email.trim()}`)
    } catch (e: any) { setMsg(e?.message ?? 'Could not send the report.') } finally { setBusy(null) }
  }
  // Spreadsheet export of the same data (one row per record, with a Section column).
  function downloadCsv() {
    const d = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''
    const esc = (v: any) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const header = ['Section', 'Staff', 'Training', 'Date', 'Length (h)', 'Attendance', 'Allocated', 'Completed', 'Pay?', 'Hours owed', 'Hourly rate', 'Cost']
    const rows: any[][] = []
    for (const r of f2fRows) {
      const payable = pay(r.status, r.owed_pay) === 'Yes'
      rows.push(['Face-to-face', r.name, r.title, d(r.date), r.hours, r.status, '', '', pay(r.status, r.owed_pay), payable ? hoursOwed(r) : '', typeof r.rate === 'number' ? (r.rate / 100).toFixed(2) : '', payable && costPence(r) ? (costPence(r) / 100).toFixed(2) : ''])
    }
    for (const r of (data?.adhoc ?? [])) rows.push(['Adhoc', r.name, r.title, '', '', '', d(r.allocated_at), d(r.completed_at), '', '', '', ''])
    for (const r of (data?.annual ?? [])) rows.push(['Annual', r.name, r.title, '', '', '', d(r.allocated_at), d(r.completed_at), '', '', '', ''])
    const csv = [header, ...rows].map(row => row.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `training-report-${periodLabel.replace(/\s+/g, '-')}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const th: CSSProperties = { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }
  const td: CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #f0f0f0', fontSize: 12, color: '#1f2937' }
  const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 800, color: '#111827', margin: '18px 0 6px', borderLeft: '4px solid #9B52B5', paddingLeft: 8 }
  const dateStr = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Outstanding'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-dark"><FileText size={18} className="text-teal" /> Training report</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <p className="mb-3 text-sm text-neutral-mid">A summary of face-to-face, adhoc and annual training allocated and completed, with the pay indicator for face-to-face attendance. Useful for payroll.</p>

        <div className="mb-3 inline-flex rounded-lg border border-gray-200 p-0.5 text-sm font-semibold">
          <button onClick={() => setPeriod('monthly')} className={`rounded-md px-3 py-1.5 ${period === 'monthly' ? 'bg-teal text-white' : 'text-neutral-mid hover:text-teal'}`}>Monthly</button>
          <button onClick={() => setPeriod('weekly')} className={`rounded-md px-3 py-1.5 ${period === 'weekly' ? 'bg-teal text-white' : 'text-neutral-mid hover:text-teal'}`}>Weekly</button>
        </div>

        {period === 'monthly' ? (
          <>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Month</label>
            <input type="month" value={monthStr} onChange={e => { const mm = /^(\d{4})-(\d{2})$/.exec(e.target.value); if (mm) { setY(+mm[1]); setM(+mm[2] - 1) } }} className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Week (pick any day in it)</label>
            <input type="date" value={weekAnchor} onChange={e => e.target.value && setWeekAnchor(e.target.value)} className="mb-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            <p className="mb-4 text-xs text-neutral-mid">Covers <strong className="text-neutral-dark">{prettyDate(fromStr)}</strong> to <strong className="text-neutral-dark">{prettyDate(toStr)}</strong> (Monday to Sunday).</p>
          </>
        )}

        {loading ? <p className="text-sm text-neutral-mid">Loading…</p> : (
          <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-2"><p className="text-lg font-bold text-blue-700">{f2fRows.length}</p>Face-to-face{totalHoursOwed > 0 && <span className="mt-0.5 block font-semibold text-amber-700">{f2fRows.filter((r: any) => pay(r.status, r.owed_pay) === 'Yes').length} payable · {totalHoursOwed}h{anyRates && totalCostPence > 0 ? ` · ${gbp(totalCostPence)}` : ''}</span>}</div>
            <div className="rounded-lg border border-gray-200 p-2"><p className="text-lg font-bold text-orange-600">{data?.adhoc.length ?? 0}</p>Adhoc</div>
            <div className="rounded-lg border border-gray-200 p-2"><p className="text-lg font-bold text-indigo-600">{data?.annual.length ?? 0}</p>Annual</div>
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold text-neutral-mid">Email the PDF to</label>
        <div className="mb-1 flex gap-2">
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setMsg('') }} placeholder="payroll@example.com" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          <button onClick={sendEmail} disabled={!!busy || loading} className="inline-flex items-center gap-1.5 rounded-lg border border-teal px-3 py-2 text-sm font-semibold text-teal hover:bg-teal-light/40 disabled:opacity-50">{busy === 'email' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send</button>
        </div>
        {msg && <p className={`mb-2 text-xs font-medium ${msg.startsWith('Sent') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Close</button>
          <button onClick={downloadCsv} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-teal px-4 py-2 text-sm font-semibold text-teal hover:bg-teal-light/40 disabled:opacity-50"><Download size={14} /> CSV</button>
          <button onClick={download} disabled={!!busy || loading} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF</button>
        </div>
      </div>

      {/* Printable report — kept at on-screen coords (0,0) so html2canvas
          captures it cleanly, but clipped to 0x0 so it's not visible. */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', zIndex: -1 }}>
        <div ref={reportRef} style={{ width: 760, padding: 24, fontFamily: 'Arial, Helvetica, sans-serif', color: '#1f2937', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #9B52B5', paddingBottom: 12, marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" style={{ height: 44 }} />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280' }}>Generated: {generated}</div>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 2px', color: '#111827' }}>Training Report</h1>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}><strong>{orgName}</strong> · {periodLabel}</p>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9ca3af' }}>Face-to-face Pay column: a staff member marked as <strong>owed pay</strong> (attended off shift) is payable for the session hours; on-shift attendance is not.</p>

          <div style={{ border: '2px solid #2563eb', borderRadius: 10, padding: '4px 12px 12px', background: '#eff6ff', marginTop: 14 }}>
            <h2 style={{ ...sectionTitle, borderLeftColor: '#2563eb', color: '#1e3a8a', marginTop: 12 }}>Face-to-face training</h2>
            {f2fRows.length === 0 ? <p style={{ fontSize: 12, color: '#6b7280' }}>None this month.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Staff</th><th style={th}>Training</th><th style={th}>Date</th><th style={th}>Length</th><th style={th}>Attendance</th><th style={th}>Pay?</th><th style={th}>Hours owed</th>{anyRates && <><th style={th}>Rate</th><th style={th}>Cost</th></>}</tr></thead>
                <tbody>{f2fRows.map((r: any, i: number) => {
                  const payable = pay(r.status, r.owed_pay) === 'Yes'
                  const rowTd: CSSProperties = { ...td, ...(payable ? { background: '#fef3c7', borderBottom: '1px solid #fde68a' } : {}) }
                  return (
                    <tr key={i}>
                      <td style={{ ...rowTd, fontWeight: payable ? 700 : 400 }}>{r.name}{payable ? ' 💷' : ''}</td>
                      <td style={rowTd}>{r.title}</td>
                      <td style={rowTd}>{dateStr(r.date)}</td>
                      <td style={rowTd}>{r.hours}h</td>
                      <td style={{ ...rowTd, textTransform: 'capitalize' }}>{r.status}</td>
                      <td style={{ ...rowTd, fontWeight: 700, color: payable ? '#b45309' : '#374151' }}>{pay(r.status, r.owed_pay)}</td>
                      <td style={{ ...rowTd, fontWeight: 700, color: payable ? '#b45309' : '#9ca3af' }}>{payable ? `${hoursOwed(r)}h` : '—'}</td>
                      {anyRates && <td style={rowTd}>{typeof r.rate === 'number' ? gbp(r.rate) : '—'}</td>}
                      {anyRates && <td style={{ ...rowTd, fontWeight: 700, color: payable && costPence(r) ? '#b45309' : '#9ca3af' }}>{payable && costPence(r) ? gbp(costPence(r)) : '—'}</td>}
                    </tr>
                  )
                })}</tbody>
                <tfoot><tr><td style={{ ...td, fontWeight: 700, borderTop: '2px solid #bfdbfe' }} colSpan={6}>Total hours owed</td><td style={{ ...td, fontWeight: 800, color: '#b45309', borderTop: '2px solid #bfdbfe' }}>{totalHoursOwed}h</td>{anyRates && <><td style={{ ...td, borderTop: '2px solid #bfdbfe' }} /><td style={{ ...td, fontWeight: 800, color: '#b45309', borderTop: '2px solid #bfdbfe' }}>{gbp(totalCostPence)}</td></>}</tr></tfoot>
              </table>
            )}
            {f2fRows.some((r: any) => pay(r.status, r.owed_pay) === 'Yes') && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#b45309', fontWeight: 600 }}>Highlighted rows are payable: the staff member was marked as owed pay (attended off shift) and is owed the hours shown{anyRates ? ', costed at their training hourly rate where set' : ''}.</p>
            )}
          </div>

          <h2 style={sectionTitle}>Adhoc training</h2>
          {(data?.adhoc.length ?? 0) === 0 ? <p style={{ fontSize: 12, color: '#6b7280' }}>None this month.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Staff</th><th style={th}>Training</th><th style={th}>Allocated</th><th style={th}>Completed</th></tr></thead>
              <tbody>{(data?.adhoc ?? []).map((r: any, i: number) => (
                <tr key={i}><td style={td}>{r.name}</td><td style={td}>{r.title}</td><td style={td}>{dateStr(r.allocated_at)}</td><td style={td}>{dateStr(r.completed_at)}</td></tr>
              ))}</tbody>
            </table>
          )}

          <h2 style={sectionTitle}>Annual training</h2>
          {(data?.annual.length ?? 0) === 0 ? <p style={{ fontSize: 12, color: '#6b7280' }}>None this month.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Staff</th><th style={th}>Training</th><th style={th}>Allocated</th><th style={th}>Completed</th></tr></thead>
              <tbody>{(data?.annual ?? []).map((r: any, i: number) => (
                <tr key={i}><td style={td}>{r.name}</td><td style={td}>{r.title}</td><td style={td}>{dateStr(r.allocated_at)}</td><td style={td}>{dateStr(r.completed_at)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Compliance matrix: staff × training topic, RAG status ────────────────────
type MatrixData = Awaited<ReturnType<ReturnType<typeof createApiClient>['faceToFace']['matrix']>>

const STATUS_STYLE: Record<string, { cls: string; glyph: string; label: string }> = {
  in_date:  { cls: 'bg-green-100 text-green-700',                     glyph: '✓', label: 'In date' },
  due_soon: { cls: 'bg-amber-100 text-amber-700',                    glyph: '⏳', label: 'Due soon' },
  overdue:  { cls: 'bg-red-100 text-red-700',                        glyph: '✕', label: 'Overdue' },
  missing:  { cls: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-300', glyph: '!', label: 'Missing (required)' },
  none:     { cls: 'bg-neutral-light/60 text-neutral-mid/50',        glyph: '·', label: 'Not recorded' },
}

function F2FMatrixView({ api, modules, staff }: {
  api: ReturnType<typeof createApiClient>; modules: Module[]; staff: Staff[]
}) {
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)

  function load() { setLoading(true); api.faceToFace.matrix().then(setData).catch(() => setData(null)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Roles available to configure = those held by staff plus any already configured.
  const roles = useMemo(() => {
    const s = new Set<string>()
    for (const u of staff) if (u.job_role) s.add(u.job_role)
    for (const m of (data?.mandatory ?? [])) if (m.job_role) s.add(m.job_role)
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [staff, data])

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''
  const cellTitle = (topic: string, c: any) => {
    const s = STATUS_STYLE[c.status]?.label ?? c.status
    if (c.status === 'in_date') return `${topic}: ${s}${c.valid_until ? ` (until ${fmt(c.valid_until)})` : ' (no expiry)'}${c.last_date ? ` · last ${fmt(c.last_date)}` : ''}`
    if (c.status === 'due_soon' || c.status === 'overdue') return `${topic}: ${s}${c.valid_until ? ` ${fmt(c.valid_until)}` : ''}${c.last_date ? ` · last ${fmt(c.last_date)}` : ''}`
    return `${topic}: ${s}`
  }

  if (loading) return <p className="py-8 text-center text-sm text-neutral-mid">Loading the matrix…</p>
  if (!data) return <p className="py-8 text-center text-sm text-neutral-mid">Could not load the matrix.</p>

  const { topics, staff: rows, summary } = data

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-red-100 px-2.5 py-1 font-semibold text-red-700">{summary.overdue} overdue</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">{summary.due_soon} due soon</span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600 ring-1 ring-inset ring-red-200">{summary.missing} missing</span>
        </div>
        <button onClick={() => setConfigOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal/40"><Settings2 size={15} /> Mandatory by role</button>
      </div>

      <p className="mb-3 text-xs text-neutral-mid">Each cell shows the staff member&apos;s latest <strong>attended</strong> face-to-face training for that topic. Set a renewal period on a session to track expiry, and mark training mandatory by role to flag who&apos;s missing it.</p>

      {topics.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-neutral-mid">No training topics yet. Run a session (and mark attendance), or set mandatory training by role, and it will appear here.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-gray-100 bg-neutral-light/60 px-3 py-2 text-left text-xs font-semibold text-neutral-mid">Staff</th>
                {topics.map(t => (
                  <th key={t.key} className="border-b border-l border-gray-100 bg-neutral-light/40 px-2 py-2 text-center align-bottom text-[11px] font-semibold text-neutral-dark" style={{ minWidth: 64, maxWidth: 96 }}>
                    <span className="block leading-tight">{t.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const cellByKey = new Map(r.cells.map(c => [c.topic_key, c]))
                return (
                  <tr key={r.user_id} className="hover:bg-neutral-light/20">
                    <td className="sticky left-0 z-10 border-b border-gray-50 bg-white px-3 py-1.5">
                      <p className="truncate text-sm font-medium text-neutral-dark">{r.name}</p>
                      {r.job_role && <p className="truncate text-[11px] text-neutral-mid">{r.job_role}</p>}
                    </td>
                    {topics.map(t => {
                      const c: any = cellByKey.get(t.key) ?? { status: 'none' }
                      const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.none
                      return (
                        <td key={t.key} className="border-b border-l border-gray-50 px-1 py-1 text-center">
                          <span title={cellTitle(t.label, c)} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${st.cls}`}>{st.glyph}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
        {(['in_date', 'due_soon', 'overdue', 'missing', 'none'] as const).map(k => (
          <span key={k} className="flex items-center gap-1.5"><span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${STATUS_STYLE[k].cls}`}>{STATUS_STYLE[k].glyph}</span>{STATUS_STYLE[k].label}</span>
        ))}
      </div>

      {configOpen && (
        <MandatoryConfigModal api={api} roles={roles} modules={modules} initial={data.mandatory} onClose={() => setConfigOpen(false)} onSaved={() => { setConfigOpen(false); load() }} />
      )}
    </div>
  )
}

// ─── Mandatory training by role ───────────────────────────────────────────────
function MandatoryConfigModal({ api, roles, modules, initial, onClose, onSaved }: {
  api: ReturnType<typeof createApiClient>; roles: string[]; modules: Module[]
  initial: Array<{ job_role: string; module_id: string }>; onClose: () => void; onSaved: () => void
}) {
  // role -> set of required module ids
  const [sel, setSel] = useState<Map<string, Set<string>>>(() => {
    const m = new Map<string, Set<string>>()
    for (const r of initial) { if (!m.has(r.job_role)) m.set(r.job_role, new Set()); m.get(r.job_role)!.add(r.module_id) }
    return m
  })
  const [role, setRole] = useState(roles[0] ?? '')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const current = sel.get(role) ?? new Set<string>()
  const toggle = (moduleId: string) => setSel(prev => {
    const next = new Map(prev)
    const set = new Set(next.get(role) ?? [])
    set.has(moduleId) ? set.delete(moduleId) : set.add(moduleId)
    next.set(role, set)
    return next
  })
  const shown = modules.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()))

  async function save() {
    setSaving(true)
    const items: Array<{ job_role: string; module_id: string }> = []
    for (const [r, set] of sel) for (const id of set) items.push({ job_role: r, module_id: id })
    try { await api.faceToFace.setMandatory(items); onSaved() } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-dark">Mandatory training by role</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <p className="mb-4 text-sm text-neutral-mid">Choose the face-to-face training each role must hold. Anyone in that role without it (in date) is flagged <strong className="text-red-600">missing</strong> on the matrix.</p>

        {roles.length === 0 ? (
          <p className="rounded-lg bg-neutral-light/50 px-3 py-3 text-sm text-neutral-mid">Add job roles to your staff first, then you can set their mandatory training here.</p>
        ) : (
          <>
            <label className="mb-1 block text-xs font-semibold text-neutral-mid">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
              {roles.map(r => <option key={r} value={r}>{r}{(sel.get(r)?.size ?? 0) > 0 ? ` (${sel.get(r)!.size})` : ''}</option>)}
            </select>

            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter training…" className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none" />
            <div className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
              {shown.length === 0 ? <p className="p-2 text-xs text-neutral-mid">No training modules found.</p> : shown.map(m => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
                  <input type="checkbox" checked={current.has(m.id)} onChange={() => toggle(m.id)} className="accent-teal" />
                  <span className="truncate text-neutral-dark">{m.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Cancel</button>
          <button onClick={save} disabled={saving || roles.length === 0} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
