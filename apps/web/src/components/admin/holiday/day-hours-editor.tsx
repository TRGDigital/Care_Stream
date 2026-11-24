'use client'

// Choose the days and the hours for each: a start and end date (or one day), a default "Hours for each day" (1 to 13), then every day listed with its
// own hours dropdown and a tick to leave out a day the person does not work. Used for a staff request in the hub and for an approver changing a booking.

import { useEffect, useMemo, useState } from 'react'
import { addDays, eachDay, isWeekendDay, niceDate, type DayRow } from '@/lib/holiday-client'

const inp = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
export const HOURS = Array.from({ length: 13 }, (_, i) => i + 1)

export function DayHoursEditor({ defaultHours, min, initial, onChange, bank }: {
  defaultHours: number; min?: string; initial?: DayRow[]; onChange: (days: DayRow[]) => void; bank?: Record<string, string>
}) {
  const first = initial?.[0]?.day ?? ''
  const last = initial?.[initial.length - 1]?.day ?? ''
  const [from, setFrom] = useState(first)
  const [to, setTo] = useState(last || first)
  const [dflt, setDflt] = useState(defaultHours)
  const [hours, setHours] = useState<Record<string, number>>(() => Object.fromEntries((initial ?? []).map(d => [d.day, d.hours])))
  const [off, setOff] = useState<Record<string, boolean>>({})

  const range = useMemo(() => (from && to && to >= from ? eachDay(from, to) : []), [from, to])
  const tooLong = range.length >= 60
  const days = useMemo<DayRow[]>(() => range.filter(d => !off[d]).map(d => ({ day: d, hours: hours[d] ?? dflt })), [range, off, hours, dflt])
  useEffect(() => { onChange(days) }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyDefault(v: number) { setDflt(v); setHours({}) }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="hol-from" className="mb-1 block text-sm font-medium text-neutral-dark">First day</label>
          <input id="hol-from" type="date" min={min} className={`${inp} w-full`} value={from} onChange={e => { setFrom(e.target.value); if (!to || to < e.target.value) setTo(e.target.value) }} />
        </div>
        <div>
          <label htmlFor="hol-to" className="mb-1 block text-sm font-medium text-neutral-dark">Last day <span className="font-normal text-neutral-mid">(same day for one day)</span></label>
          <input id="hol-to" type="date" min={from || min} className={`${inp} w-full`} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div>
          <label htmlFor="hol-dflt" className="mb-1 block text-sm font-medium text-neutral-dark">Hours for each day</label>
          <select id="hol-dflt" className={`${inp} w-full`} value={dflt} onChange={e => applyDefault(Number(e.target.value))}>
            {HOURS.map(h => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>)}
          </select>
        </div>
      </div>
      {tooLong && <p className="text-sm text-red-700" role="alert">A request can cover up to 60 days. Please choose a shorter range.</p>}
      {range.length > 0 && !tooLong && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-dark">Each day. Untick a day you do not work, or change its hours.</p>
          <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {range.map(d => (
              <li key={d} className={`flex items-center justify-between gap-3 px-3 py-2 ${off[d] ? 'bg-gray-50 text-neutral-mid' : ''}`}>
                <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={!off[d]} onChange={e => setOff(o => ({ ...o, [d]: !e.target.checked }))} aria-label={`Include ${niceDate(d, true)}`} />
                  <span className={off[d] ? 'line-through' : 'text-neutral-dark'}>{niceDate(d, true)}</span>
                  {isWeekendDay(d) && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-neutral-mid">Weekend</span>}
                  {bank?.[d] && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">{bank[d]}</span>}
                </label>
                <select aria-label={`Hours on ${niceDate(d, true)}`} disabled={!!off[d]} className={`${inp} w-28`} value={hours[d] ?? dflt} onChange={e => setHours(h => ({ ...h, [d]: Number(e.target.value) }))}>
                  {HOURS.map(h => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
export { addDays }
