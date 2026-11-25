'use client'

// The holiday boxes on a staff member's set up and edit forms (pilot accounts only): annual leave counted in hours or days, the allocation for the
// year (the administrator works out part year starters and types the total), contracted hours a week, start date, and the weekday and weekend pay rates.
// The pay rates are for administrators only (this form is admin only) and are stored for later; nothing is calculated from them yet.
// The parent form gives a ref; after the person is created or saved it calls ref.current(userId) to store these values.

import { LockedBadge } from '@/components/admin/locked-badge'
import { useEffect, useRef, useState } from 'react'
import { holiday, useHolidayMeta, type Unit } from '@/lib/holiday-client'

const inp = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const lbl = 'mb-1.5 block text-sm font-medium text-neutral-dark'

export function HolidayStaffFields({ token, userId, saveRef }: { token: string; userId?: string; saveRef: React.MutableRefObject<((userId: string) => Promise<void>) | null> }) {
  const { meta } = useHolidayMeta()
  const [unit, setUnit] = useState<Unit>('hours')
  const [allowance, setAllowance] = useState('')
  const [firstYear, setFirstYear] = useState('')
  const [contracted, setContracted] = useState('')
  const [start, setStart] = useState('')
  const [weekday, setWeekday] = useState('')
  const [weekend, setWeekend] = useState('')
  const touched = useRef(false)
  const [loaded, setLoaded] = useState(!userId)

  useEffect(() => {
    if (!userId || !(meta?.enabled || meta?.staff_fields)) return
    let live = true
    holiday.admin.staff(token, userId).then(r => {
      if (!live) return
      setUnit(r.unit); setAllowance(r.allowance != null ? String(r.allowance) : ''); setFirstYear(r.first_year_allowance != null ? String(r.first_year_allowance) : ''); setContracted(r.contracted_hours != null ? String(r.contracted_hours) : '')
      setStart(r.start_date ?? ''); setWeekday(r.weekday_rate != null ? String(r.weekday_rate) : ''); setWeekend(r.weekend_rate != null ? String(r.weekend_rate) : ''); setLoaded(true)
    }).catch(() => setLoaded(true))
    return () => { live = false }
  }, [token, userId, meta?.enabled, meta?.staff_fields])

  useEffect(() => {
    saveRef.current = async (id: string) => {
      if (!(meta?.enabled || meta?.staff_fields) || (!touched.current && !userId)) return    // nothing typed on a new person: leave their record as it is
      if (!touched.current) return
      await holiday.admin.saveStaff(token, id, { start_date: start || null, weekday_rate: weekday, weekend_rate: weekend, unit, allowance: allowance === '' ? null : allowance, first_year_allowance: firstYear === '' ? null : firstYear, contracted_hours: contracted === '' ? null : contracted })
    }
    return () => { saveRef.current = null }
  }, [token, userId, meta?.enabled, meta?.staff_fields, start, weekday, weekend, unit, allowance, firstYear, contracted, saveRef])

  if (!(meta?.enabled || meta?.staff_fields) || !meta.is_admin) return null
  const on = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { touched.current = true; set(e.target.value) }

  return (
    <div className="sm:col-span-2 rounded-lg border border-gray-200 p-4" aria-busy={!loaded}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">Holiday and pay <LockedBadge variant="icon" /></p>
      <p className="mb-3 text-xs text-neutral-mid">Only administrators can see this. It is never shown to staff and never used by the hub chat. It feeds Holiday tracking and your reports.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl} htmlFor="hol-unit">Annual leave is counted in</label>
          <select id="hol-unit" className={inp} value={unit} onChange={e => { touched.current = true; setUnit(e.target.value as Unit) }}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
        <div>
          <label className={lbl} htmlFor="hol-alloc">Full yearly annual leave allocation ({unit})</label>
          <input id="hol-alloc" type="number" min={0} step="0.01" inputMode="decimal" className={inp} value={allowance} onChange={on(setAllowance)} placeholder={unit === 'hours' ? 'For example 224' : 'For example 28'} />
          <p className="mt-1 text-xs text-neutral-mid">What they get for a whole holiday year.</p>
        </div>
        <div>
          <label className={lbl} htmlFor="hol-first">Allocation for the rest of this year ({unit})</label>
          <input id="hol-first" type="number" min={0} step="0.01" inputMode="decimal" className={inp} value={firstYear} onChange={on(setFirstYear)} placeholder={unit === 'hours' ? 'For example 112' : 'For example 14'} />
          <p className="mt-1 text-xs text-neutral-mid">For someone who starts part way through the year. Used only for the year of their start date; after that the full yearly allocation applies. Leave empty if they start at the beginning of the year.</p>
        </div>
        <div>
          <label className={lbl} htmlFor="hol-hours">Contracted hours a week</label>
          <input id="hol-hours" type="number" min={0} max={168} step="0.01" inputMode="decimal" className={inp} value={contracted} onChange={on(setContracted)} placeholder="For example 40" />
        </div>
        <div>
          <label className={lbl} htmlFor="hol-start">Start date</label>
          <input id="hol-start" type="date" className={inp} value={start} onChange={on(setStart)} />
        </div>
        <div>
          <label className={lbl} htmlFor="hol-wd">Weekday pay rate <span className="font-normal text-neutral-mid">(optional)</span></label>
          <div className="flex items-center rounded-md border border-gray-300 px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20"><span className="text-sm text-neutral-mid">£</span><input id="hol-wd" type="number" min={0} step="0.01" inputMode="decimal" className="w-full bg-transparent px-2 py-2 text-sm outline-none" value={weekday} onChange={on(setWeekday)} placeholder="0.00" /><span className="text-xs text-neutral-mid">/hr</span></div>
        </div>
        <div>
          <label className={lbl} htmlFor="hol-we">Weekend pay rate <span className="font-normal text-neutral-mid">(optional)</span></label>
          <div className="flex items-center rounded-md border border-gray-300 px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20"><span className="text-sm text-neutral-mid">£</span><input id="hol-we" type="number" min={0} step="0.01" inputMode="decimal" className="w-full bg-transparent px-2 py-2 text-sm outline-none" value={weekend} onChange={on(setWeekend)} placeholder="0.00" /><span className="text-xs text-neutral-mid">/hr</span></div>
        </div>
      </div>
    </div>
  )
}
