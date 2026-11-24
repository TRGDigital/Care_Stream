'use client'

// Who is off, by month, in the same style as the face to face training calendar (Monday first, today ringed). Approved holiday only. Each row ends with a
// summary for that week (a week is 7 days, Monday to Sunday). Bank holidays are marked with their pay multiplier. "This week" lists the week in full.

import { StaffAvatar } from '@/components/admin/staff-avatar'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { holiday, addDays, eachDay, niceDate, type CalendarData } from '@/lib/holiday-client'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n: number) => String(n).padStart(2, '0')
const weekdayIdx = (s: string) => (new Date(s + 'T00:00:00Z').getUTCDay() + 6) % 7
const mondayOf = (s: string) => addDays(s, -weekdayIdx(s))

export function CalendarTab({ token }: { token: string }) {
  const now = new Date()
  const [y, setY] = useState(now.getFullYear())
  const [m, setM] = useState(now.getMonth())   // 0 based
  const [data, setData] = useState<CalendarData | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'month' | 'week'>('month')
  const month = `${y}-${pad(m + 1)}`

  useEffect(() => {
    let live = true
    setData(null); setError('')
    holiday.admin.calendar(token, month).then(r => { if (live) setData(r) }).catch(e => { if (live) setError(e?.message ?? 'Could not load the calendar.') })
    return () => { live = false }
  }, [token, month])

  const today = data?.today ?? now.toISOString().slice(0, 10)
  const byDay = useMemo(() => { const mp = new Map<string, CalendarData['days']>(); for (const d of data?.days ?? []) mp.set(d.day, [...(mp.get(d.day) ?? []), d]); return mp }, [data])
  const bank = useMemo(() => new Map((data?.bank_holidays ?? []).map(b => [b.date, b])), [data])
  const weeks = useMemo(() => {
    const first = `${month}-01`
    const start = mondayOf(first)
    const last = addDays(`${m === 11 ? y + 1 : y}-${pad(m === 11 ? 1 : m + 2)}-01`, -1)
    const out: string[][] = []
    for (let d = start; d <= last; d = addDays(d, 7)) out.push(eachDay(d, addDays(d, 6)))
    return out
  }, [month, m, y])
  const thisWeek = eachDay(mondayOf(today), addDays(mondayOf(today), 6))

  function prev() { if (m === 0) { setM(11); setY(v => v - 1) } else setM(v => v - 1) }
  function next() { if (m === 11) { setM(0); setY(v => v + 1) } else setM(v => v + 1) }
  const monthLabel = new Date(Date.UTC(y, m, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const max = data?.max_off ?? null

  function summary(days: string[]) {
    const people = new Map<string, { name: string; n: number }>()
    for (const d of days) for (const p of byDay.get(d) ?? []) { const e = people.get(p.user_id) ?? { name: p.name, n: 0 }; e.n++; people.set(p.user_id, e) }
    return { count: people.size, list: [...people.values()] }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Earlier month" onClick={prev} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal"><ChevronLeft size={16} /></button>
          <span className="min-w-[10rem] text-center text-base font-bold text-neutral-dark">{monthLabel}</span>
          <button type="button" aria-label="Later month" onClick={next} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal"><ChevronRight size={16} /></button>
          <button type="button" onClick={() => { setY(now.getFullYear()); setM(now.getMonth()) }} className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:text-teal">Today</button>
        </div>
        <div role="tablist" aria-label="Calendar view" className="ml-auto flex gap-1 rounded-lg bg-neutral-light p-1 text-sm">
          {([['month', 'Month'], ['week', 'This week']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} type="button" onClick={() => setView(k)} className={`rounded-md px-3 py-1 font-medium ${view === k ? 'bg-white text-teal shadow-sm' : 'text-neutral-mid'}`}>{l}</button>)}
        </div>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {!data && !error && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>}

      {data && view === 'week' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-neutral-dark">Week of {niceDate(thisWeek[0], true)}: {summary(thisWeek).count} {summary(thisWeek).count === 1 ? 'person is' : 'people are'} off</p>
          <ul className="divide-y divide-gray-100">
            {thisWeek.map(d => {
              const list = byDay.get(d) ?? [], b = bank.get(d)
              return (
                <li key={d} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
                  <span className={`w-28 text-sm font-medium ${d === today ? 'text-teal' : 'text-neutral-dark'}`}>{niceDate(d)}</span>
                  {b && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800">{b.name}, paid at {b.multiplier} times</span>}
                  <span className={`text-sm ${max && list.length > max ? 'font-semibold text-red-700' : 'text-neutral-dark'}`}>{list.length ? list.map(p => <span key={p.user_id} className="mb-1 mr-3 inline-flex w-72 max-w-full items-center justify-between gap-3 rounded-md bg-neutral-light/60 px-2 py-1 align-middle"><span className="inline-flex min-w-0 items-center gap-1"><StaffAvatar name={p.name} photoUrl={p.photo_url} size={18} /><span className="truncate">{p.name}</span>{p.part && p.part !== 'full' && <span className="ml-1 rounded bg-teal/10 px-1 text-[10px] font-bold text-teal">{p.part === 'am' ? 'AM' : p.part === 'pm' ? 'PM' : 'Part'}</span>}</span>{p.job_role && <span className="shrink-0 text-xs text-neutral-mid">{p.job_role}</span>}</span>) : <span className="text-neutral-mid">Nobody off</span>}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {data && view === 'month' && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="grid min-w-[760px] grid-cols-[repeat(7,minmax(0,1fr))_9rem] border-b border-gray-200 bg-neutral-light text-xs font-semibold text-neutral-dark">
            {DOW.map(d => <div key={d} className="px-2 py-2">{d}</div>)}
            <div className="px-2 py-2">This week</div>
          </div>
          {weeks.map(w => {
            const s = summary(w)
            return (
              <div key={w[0]} className="grid min-w-[760px] grid-cols-[repeat(7,minmax(0,1fr))_9rem] border-b border-gray-100 last:border-b-0">
                {w.map(d => {
                  const inMonth = d.startsWith(month), list = byDay.get(d) ?? [], b = bank.get(d), over = !!max && list.length > max
                  return (
                    <div key={d} className={`min-h-[84px] border-r border-gray-100 p-1.5 ${inMonth ? '' : 'bg-gray-50/70'} ${d === today ? 'ring-2 ring-inset ring-teal' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${inMonth ? 'font-semibold text-neutral-dark' : 'text-neutral-mid'}`}>{Number(d.slice(8))}</span>
                        {list.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${over ? 'bg-red-100 text-red-700' : 'bg-teal/10 text-teal'}`}>{list.length}</span>}
                      </div>
                      {b && <p className="mt-0.5 truncate rounded bg-amber-50 px-1 text-[10px] text-amber-800" title={`${b.name}, paid at ${b.multiplier} times`}>{b.name} {b.multiplier}x</p>}
                      <ul className="mt-0.5 space-y-0.5">
                        {list.slice(0, 3).map(p => <li key={p.user_id} className="flex items-center gap-1 truncate text-[11px] text-neutral-dark" title={`${p.name}${p.job_role ? `, ${p.job_role}` : ''}, ${p.hours} hours`}><StaffAvatar name={p.name} photoUrl={p.photo_url} size={14} /><span className="truncate">{p.name}</span>{p.job_role && <span className="ml-auto max-w-[45%] truncate text-[10px] text-neutral-mid">{p.job_role}</span>}{p.part && p.part !== 'full' && <span className="rounded bg-teal/10 px-1 text-[9px] font-bold text-teal">{p.part === 'am' ? 'AM' : p.part === 'pm' ? 'PM' : 'Part'}</span>}</li>)}
                        {list.length > 3 && <li className="text-[11px] text-neutral-mid" title={list.slice(3).map(p => p.name).join(', ')}>+{list.length - 3} more</li>}
                      </ul>
                    </div>
                  )
                })}
                <div className="bg-neutral-light/50 p-2 text-xs text-neutral-dark">
                  <p className="font-semibold">{s.count} {s.count === 1 ? 'person' : 'people'} off</p>
                  <p className="text-neutral-mid">{s.list.reduce((n, p) => n + p.n, 0)} {s.list.reduce((n, p) => n + p.n, 0) === 1 ? 'day' : 'days'} booked</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs text-neutral-mid">Approved holiday only. Weeks run Monday to Sunday. Bank holidays show the pay multiplier from Settings.{max ? ` A red count means more than ${max} people are off.` : ''}</p>
    </div>
  )
}
