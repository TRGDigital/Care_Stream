'use client'

// Choose the days and what is booked on each: a first and last day (or one day), a default "Hours for each day" (1 to 13), then every day listed with a tick to leave
// out a day the person does not work and a choice for the day: Full day, AM, PM, Part day (their own hours in half hours), or "Use my last X hours" when less than a full
// shift is left. When `available` is given (a staff member asking) nothing can be chosen that goes beyond what is left: a morning or afternoon is capped at what remains and
// the choices that no longer fit are switched off. An approver (no `available`) is not capped; the API still checks the rules and asks for a reason to go over.
// Used for a staff request in the hub, for "Book for someone", and for an approver changing a booking.

import { useEffect, useMemo, useState } from 'react'
import { addDays, eachDay, isWeekendDay, niceDate, type DayRow, type Part, type Unit } from '@/lib/holiday-client'
import { dayChoices, halfHourSteps, halfShift, hoursText } from '@/lib/holiday-parts'

const inp = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-gray-50'
export const HOURS = Array.from({ length: 13 }, (_, i) => i + 1)
type Choice = 'full' | 'am' | 'pm' | 'part' | 'last'
const round2 = (n: number) => Math.round(n * 100) / 100

export function DayHoursEditor({ defaultHours, shiftHours, unit = 'hours', available, min, initial, onChange, bank }: {
  defaultHours: number; shiftHours?: number; unit?: Unit
  /** What is left to book (hours, or days for people measured in days). Leave out for an approver, who is not capped. */
  available?: number | null
  min?: string; initial?: DayRow[]; onChange: (days: DayRow[]) => void; bank?: Record<string, string>
}) {
  const shift = shiftHours ?? defaultHours
  const first = initial?.[0]?.day ?? ''
  const last = initial?.[initial.length - 1]?.day ?? ''
  const [from, setFrom] = useState(first)
  const [to, setTo] = useState(last || first)
  const [dflt, setDflt] = useState(defaultHours)
  const [hours, setHours] = useState<Record<string, number>>(() => Object.fromEntries((initial ?? []).filter(d => !d.part || d.part === 'full').map(d => [d.day, d.hours])))
  const [partHours, setPartHours] = useState<Record<string, number>>(() => Object.fromEntries((initial ?? []).filter(d => d.part === 'part').map(d => [d.day, d.hours])))
  const [choice, setChoice] = useState<Record<string, Choice>>(() => Object.fromEntries((initial ?? []).filter(d => d.part && d.part !== 'full').map(d => [d.day, d.part as Choice])))
  const [off, setOff] = useState<Record<string, boolean>>({})
  const capped = available !== undefined && available !== null

  const range = useMemo(() => (from && to && to >= from ? eachDay(from, to) : []), [from, to])
  const tooLong = range.length >= 60

  // Work out each day in date order, so the earlier days use up what is left first and a later morning or afternoon is capped at what remains.
  const rows = useMemo(() => {
    let spent = 0
    return range.map(d => {
      if (off[d]) return { day: d, off: true as const, cap: null as number | null, c: 'full' as Choice, value: 0, hours: 0, part: 'full' as Part, choices: null as ReturnType<typeof dayChoices> | null }
      const cap = capped ? Math.max(0, round2((available as number) - spent)) : null
      const ch = dayChoices(shift, unit === 'days' ? null : cap)
      let c: Choice = choice[d] ?? 'full'
      let h: number, part: Part
      if (c === 'am' || c === 'pm') { h = unit === 'days' ? halfShift(shift) : ch[c]; part = c }
      else if (c === 'last') { h = ch.last ?? ch.full; part = 'part'; if (ch.last == null) c = 'full' }
      else if (c === 'part') { h = Math.min(partHours[d] ?? halfShift(shift), cap == null ? 13 : Math.floor((cap) * 2) / 2 || 0.5); part = 'part' }
      else { h = hours[d] ?? dflt; part = 'full' }
      const value = unit === 'days' ? (part === 'full' ? 1 : 0.5) : h
      spent = round2(spent + value)
      return { day: d, off: false as const, cap, c, value, hours: h, part, choices: ch }
    })
  }, [range, off, choice, hours, partHours, dflt, shift, available, capped, unit])

  const days = useMemo<DayRow[]>(() => rows.filter(r => !r.off).map(r => ({ day: r.day, hours: r.hours, ...(r.part === 'full' ? {} : { part: r.part }) })), [rows])
  useEffect(() => { onChange(days) }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyDefault(v: number) { setDflt(v); setHours({}) }
  const setC = (d: string, c: Choice) => setChoice(o => ({ ...o, [d]: c }))
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
        {unit !== 'days' && (
          <div>
            <label htmlFor="hol-dflt" className="mb-1 block text-sm font-medium text-neutral-dark">Hours for each full day</label>
            <select id="hol-dflt" className={`${inp} w-full`} value={dflt} onChange={e => applyDefault(Number(e.target.value))}>
              {HOURS.map(h => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>)}
            </select>
          </div>
        )}
      </div>
      {tooLong && <p className="text-sm text-red-700" role="alert">A request can cover up to 60 days. Please choose a shorter range.</p>}
      {range.length > 0 && !tooLong && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-dark">Each day. Untick a day you do not work. Choose a whole day, the morning (AM), the afternoon (PM) or part of a day.</p>
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {rows.map(r => {
              const d = r.day
              return (
                <li key={d} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${r.off ? 'bg-gray-50 text-neutral-mid' : ''}`}>
                  <label className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-teal" checked={!r.off} onChange={e => setOff(o => ({ ...o, [d]: !e.target.checked }))} aria-label={`Include ${niceDate(d, true)}`} />
                    <span className={r.off ? 'line-through' : 'text-neutral-dark'}>{niceDate(d, true)}</span>
                    {isWeekendDay(d) && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-neutral-mid">Weekend</span>}
                    {bank?.[d] && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">{bank[d]}</span>}
                  </label>
                  {!r.off && r.choices && (
                    <div className="flex items-center gap-2">
                      <select aria-label={`What is booked on ${niceDate(d, true)}`} className={`${inp} w-44`} value={r.c} onChange={e => setC(d, e.target.value as Choice)}>
                        <option value="full">Full day</option>
                        <option value="am" disabled={unit !== 'days' && r.cap != null && r.cap < 0.5}>AM{unit !== 'days' ? ` (${hoursText(r.choices.am)})` : ''}</option>
                        <option value="pm" disabled={unit !== 'days' && r.cap != null && r.cap < 0.5}>PM{unit !== 'days' ? ` (${hoursText(r.choices.pm)})` : ''}</option>
                        {unit !== 'days' && <option value="part" disabled={r.cap != null && r.cap < 0.5}>Part day, my own hours</option>}
                        {unit !== 'days' && r.choices.last != null && <option value="last">{`Use my last ${hoursText(r.choices.last)}`}</option>}
                      </select>
                      {unit !== 'days' && r.c === 'full' && (
                        <select aria-label={`Hours on ${niceDate(d, true)}`} className={`${inp} w-28`} value={hours[d] ?? dflt} onChange={e => setHours(h => ({ ...h, [d]: Number(e.target.value) }))}>
                          {HOURS.map(h => <option key={h} value={h}>{h} {h === 1 ? 'hour' : 'hours'}</option>)}
                        </select>
                      )}
                      {unit !== 'days' && r.c === 'part' && (
                        <select aria-label={`Hours on ${niceDate(d, true)}`} className={`${inp} w-28`} value={r.hours} onChange={e => setPartHours(h => ({ ...h, [d]: Number(e.target.value) }))}>
                          {halfHourSteps(r.cap).map(h => <option key={h} value={h}>{hoursText(h)}</option>)}
                        </select>
                      )}
                      {unit !== 'days' && (r.c === 'am' || r.c === 'pm' || r.c === 'last') && <span className="w-28 text-sm text-neutral-mid">{hoursText(r.hours)}</span>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
export { addDays }
