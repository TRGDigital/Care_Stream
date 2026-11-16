'use client'

// Audits: a Schedule / Calendar / Matrix switcher. The Schedule tab is the existing list of assigned audits. The Calendar
// shows what is due on which day for a month. The Matrix shows, for each audit the home has scheduled or added, which
// months have been done and which have not. Mirrors the training calendar and matrix. Every plan.

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCachedQuery } from '@/lib/use-cached-query'
import Link from 'next/link'
import { createApiClient, type AuditBoardData, type AuditBoardState } from '@/lib/api-client'
import { AuditSchedule } from '@/components/admin/audit-schedule'
import { CalendarDays, Grid3x3, ListChecks, ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'

type Tab = 'schedule' | 'calendar' | 'matrix'

const STATE: Record<AuditBoardState, { label: string; cls: string }> = {
  done: { label: 'Done', cls: 'bg-green-50 text-green-700 border-green-200' },
  in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  due: { label: 'Due', cls: 'bg-teal/10 text-teal border-teal/30' },
  missed: { label: 'Missed', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  not_done: { label: 'Not done', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  none: { label: '', cls: 'bg-white text-neutral-mid border-gray-100' },
}
const ENTRY_CLS: Record<string, string> = {
  done: 'bg-green-50 text-green-700', in_progress: 'bg-amber-50 text-amber-700', overdue: 'bg-rose-50 text-rose-700',
  due: 'bg-teal/10 text-teal', missed: 'bg-rose-50 text-rose-700',
}
const ENTRY_LABEL: Record<string, string> = { done: 'Done', in_progress: 'In progress', overdue: 'Overdue', due: 'Due', missed: 'Missed' }

const monthLabel = (mk: string) => new Date(`${mk}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthShort = (mk: string) => new Date(`${mk}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const shiftMonth = (mk: string, n: number) => { const [y, m] = mk.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
const thisMonth = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }

export function AuditBoard({ token, templates, rooms, staffNames }: { token: string; templates: any[]; rooms: string[]; staffNames: string[] }) {
  const [tab, setTab] = useState<Tab>('schedule')
  const [month, setMonth] = useState(thisMonth())
  const { data: session } = useSession()
  const uid = session?.user?.email ?? 'guest'
  const q = useCachedQuery<AuditBoardData>(tab !== 'schedule' ? `admin-audit-board-${uid}-${month}` : null, () => createApiClient(token).audits.board(month))
  const data = q.data ?? null
  const loading = q.loading
  const [actionError, setError] = useState('')
  const error = actionError || (q.error ?? '')
  const [pickDay, setPickDay] = useState<string | null>(null)
  const [adding, setAdding] = useState('')

  function load() { setError(''); q.reload() }

  const available = useMemo(() => {
    const on = new Set((data?.rows ?? []).map(r => r.template_id))
    return templates.filter(t => !on.has(t.id)).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  }, [data, templates])

  async function add() {
    if (!adding) return
    try { await createApiClient(token).audits.addToBoard(adding); setAdding(''); load() } catch (e: any) { setError(e?.message ?? 'Could not add') }
  }
  async function remove(id: string) {
    try { await createApiClient(token).audits.removeFromBoard(id); load() } catch (e: any) { setError(e?.message ?? 'Could not remove') }
  }

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'schedule', label: 'Schedule', icon: ListChecks }, { key: 'calendar', label: 'Calendar', icon: CalendarDays }, { key: 'matrix', label: 'Matrix', icon: Grid3x3 },
  ]

  // Calendar grid, Monday first.
  const grid = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const first = new Date(Date.UTC(y, m - 1, 1))
    const lead = (first.getUTCDay() + 6) % 7
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cells: Array<string | null> = Array(lead).fill(null)
    for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)
    while (cells.length % 7) cells.push(null)
    return cells
  }, [month])
  const byDay = useMemo(() => {
    const m = new Map<string, AuditBoardData['entries']>()
    for (const e of data?.entries ?? []) { if (!m.has(e.date)) m.set(e.date, []); m.get(e.date)!.push(e) }
    return m
  }, [data])
  const todayKey = new Date().toISOString().slice(0, 10)

  const MonthNav = ({ step }: { step: number }) => (
    <div className="flex items-center gap-1">
      <button onClick={() => setMonth(shiftMonth(month, -step))} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal" aria-label="Earlier"><ChevronLeft size={15} /></button>
      <button onClick={() => setMonth(thisMonth())} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-mid hover:text-teal">Today</button>
      <button onClick={() => setMonth(shiftMonth(month, step))} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal" aria-label="Later"><ChevronRight size={15} /></button>
    </div>
  )

  return (
    <div className="mb-6">
      <div className="mb-3 inline-flex rounded-xl border border-gray-200 bg-white p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', tab === t.key ? 'bg-teal text-white' : 'text-neutral-mid hover:text-teal')}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && <AuditSchedule token={token} templates={templates} rooms={rooms} staffNames={staffNames} />}

      {tab !== 'schedule' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {loading && !data && <div className="flex items-center gap-2 py-6 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</div>}

          {tab === 'calendar' && data && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-neutral-dark">{monthLabel(month)}</h2>
                  <p className="text-xs text-neutral-mid">{data.counts.overdue} overdue · {data.counts.due_this_month} still to do · {data.counts.done_this_month} done this month</p>
                </div>
                <MonthNav step={1} />
              </div>
              {data.rows.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-neutral-mid">Nothing on the calendar yet. Schedule an audit on the Schedule tab, or add audits to the Matrix, and they appear here on the day they are due.</p>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 text-xs">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="bg-gray-50 px-2 py-1 font-semibold text-neutral-mid">{d}</div>)}
                    {grid.map((day, i) => {
                      const list = day ? byDay.get(day) ?? [] : []
                      return (
                        <button key={i} disabled={!day} onClick={() => day && setPickDay(pickDay === day ? null : day)}
                          className={clsx('min-h-[84px] bg-white p-1.5 text-left align-top', day && 'hover:bg-teal/5', pickDay === day && 'ring-2 ring-inset ring-teal', !day && 'bg-gray-50')}>
                          {day && <span className={clsx('mb-1 inline-block text-[11px] font-semibold', day === todayKey ? 'rounded-full bg-teal px-1.5 text-white' : 'text-neutral-mid')}>{Number(day.slice(8))}</span>}
                          {list.slice(0, 3).map((e, k) => <span key={k} className={clsx('mb-0.5 block truncate rounded px-1 py-0.5 text-[10px] font-medium', ENTRY_CLS[e.status])}>{e.name}</span>)}
                          {list.length > 3 && <span className="text-[10px] text-neutral-mid">+{list.length - 3} more</span>}
                        </button>
                      )
                    })}
                  </div>
                  {pickDay && (
                    <div className="mt-3 rounded-lg border border-gray-200 p-3">
                      <p className="mb-2 text-sm font-semibold text-neutral-dark">{new Date(pickDay + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}</p>
                      {(byDay.get(pickDay) ?? []).length === 0 ? <p className="text-xs text-neutral-mid">Nothing due or done on this day.</p> : (
                        <ul className="divide-y divide-gray-100">
                          {(byDay.get(pickDay) ?? []).map((e, k) => (
                            <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                              <span className="min-w-0">
                                {e.run_id ? <Link href={`/audits/${e.run_id}`} className="font-medium text-neutral-dark hover:text-teal">{e.name}</Link> : <span className="font-medium text-neutral-dark">{e.name}</span>}
                                {e.assignee && <span className="ml-2 text-xs text-neutral-mid">{e.assignee}</span>}
                              </span>
                              <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold', ENTRY_CLS[e.status])}>{ENTRY_LABEL[e.status]}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'matrix' && data && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-neutral-dark">Audit matrix</h2>
                  <p className="text-xs text-neutral-mid">The audits you have scheduled or added, month by month. Red means it should have been done and has not.</p>
                </div>
                <MonthNav step={3} />
              </div>
              {data.rows.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-neutral-mid">No audits on the matrix yet. Schedule one on the Schedule tab, or add one below.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-neutral-mid">
                      <tr><th className="px-3 py-2 font-semibold">Audit</th>{data.months.map(mk => <th key={mk} className="px-2 py-2 text-center font-semibold">{monthShort(mk)}</th>)}<th className="w-8" /></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.rows.map(r => (
                        <tr key={r.template_id}>
                          <td className="px-3 py-2"><span className="font-medium text-neutral-dark">{r.name}</span><span className="ml-2 text-[11px] capitalize text-neutral-mid">{r.frequency}</span></td>
                          {data.months.map(mk => {
                            const c = r.cells[mk]; const st = STATE[c.state]
                            return <td key={mk} className="px-1.5 py-1.5 text-center"><span className={clsx('inline-block min-w-[58px] rounded-md border px-1.5 py-1 text-[11px] font-semibold', st.cls)}>{c.state === 'done' && c.done > 1 ? `${c.done} done` : st.label || '·'}</span></td>
                          })}
                          <td className="pr-2 text-right">{r.source === 'added' && <button onClick={() => remove(r.template_id)} className="text-neutral-mid hover:text-rose-600" title="Take off the matrix" aria-label="Take off the matrix"><X size={14} /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select value={adding} onChange={e => setAdding(e.target.value)} className="min-w-0 max-w-full flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm sm:max-w-md">
                  <option value="">Add an audit to the matrix…</option>
                  {available.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={add} disabled={!adding} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-40"><Plus size={14} /> Add</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
