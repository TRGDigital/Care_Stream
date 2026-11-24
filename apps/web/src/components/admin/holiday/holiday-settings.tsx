'use client'

// The body of the one "Holiday" accordion in Settings (the accordion wrapper itself is the page's SettingSection): holiday year, carry over,
// approval (managers, most people off at once) and bank holiday pay. Administrators only; pilot accounts only.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { holiday, MONTHS, type HolidaySettings, type BankHoliday } from '@/lib/holiday-client'

const sel = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const DIM = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const SOURCE_NOTE: Record<HolidaySettings['year_start_source'], string> = {
  holiday: 'Set here.',
  workforce: 'Taken from the holiday year saved in the Compliance register. Saving here keeps it.',
  default: 'Not set yet, so it starts on 1 January.',
}

function Sub({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
      <legend className="text-xs font-bold uppercase tracking-wide text-teal">{title}</legend>
      {hint && <p className="text-sm text-neutral-mid">{hint}</p>}
      {children}
    </fieldset>
  )
}
function Radio({ name, checked, onChange, label, hint }: { name: string; checked: boolean; onChange: () => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 p-3 hover:border-teal/40">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 h-4 w-4 accent-teal" />
      <span><span className="block text-sm font-semibold text-neutral-dark">{label}</span>{hint && <span className="block text-sm text-neutral-mid">{hint}</span>}</span>
    </label>
  )
}

export function HolidaySettingsBody({ token }: { token: string }) {
  const [s, setS] = useState<HolidaySettings | null>(null)
  const [bank, setBank] = useState<BankHoliday[]>([])
  const [choices, setChoices] = useState<number[]>([1.25, 1.5, 1.75, 2, 2.5, 3])
  const [maxOff, setMaxOff] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    holiday.admin.settings(token).then(r => { if (!live) return; setS(r.settings); setBank(r.bank_holidays); setChoices(r.multiplier_choices); setMaxOff(r.settings.max_off != null ? String(r.settings.max_off) : '') }).catch(e => { if (live) setError(e?.message ?? 'Could not load the holiday settings.') })
    return () => { live = false }
  }, [token])

  const years = useMemo(() => [...new Set(bank.map(b => b.date.slice(0, 4)))], [bank])
  if (error && !s) return <p className="text-sm text-red-700" role="alert">{error}</p>
  if (!s) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>

  const upd = (patch: Partial<HolidaySettings>) => { setS({ ...s, ...patch }); setSaved(false) }
  const overrideOf = (date: string) => s.bank_overrides[date]
  function setOverride(date: string, v: string) {
    const next = { ...s!.bank_overrides }
    if (v === '') delete next[date]; else next[date] = Number(v)
    upd({ bank_overrides: next })
  }
  async function save() {
    if (!s) return
    setBusy(true); setError(''); setSaved(false)
    try {
      const r = await holiday.admin.saveSettings(token, { ...s, max_off: maxOff.trim() === '' ? null : Number(maxOff) } as any)
      setS(r.settings); setBank(r.bank_holidays); setSaved(true)
    } catch (e: any) { setError(e?.message ?? 'Could not save.') } finally { setBusy(false) }
  }
  const dayCount = DIM[s.year_start.month - 1]

  return (
    <div className="space-y-5">
      <Sub title="Holiday year" hint="When each person's holiday year begins. Most services use 1 January to 31 December.">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Month the holiday year starts" className={sel} value={s.year_start.month} onChange={e => upd({ year_start: { month: Number(e.target.value), day: Math.min(s.year_start.day, DIM[Number(e.target.value) - 1]) } })}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Day the holiday year starts" className={sel} value={s.year_start.day} onChange={e => upd({ year_start: { ...s.year_start, day: Number(e.target.value) } })}>
            {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <p className="text-xs text-neutral-mid">Currently the {s.year_start.day} {MONTHS[s.year_start.month - 1]}. {SOURCE_NOTE[s.year_start_source]}</p>
      </Sub>

      <Sub title="Carry over" hint="What happens to holiday that is not taken by the end of the holiday year.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio name="carry" checked={!s.carry_over} onChange={() => upd({ carry_over: false })} label="Off" hint="Holiday not taken is lost at the end of the year." />
          <Radio name="carry" checked={s.carry_over} onChange={() => upd({ carry_over: true })} label="On" hint="Holiday not taken is added to next year's allowance." />
        </div>
      </Sub>

      <Sub title="Approval" hint="Who decides holiday requests, and how many people can be off at once.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Radio name="mgr" checked={!s.manager_approval} onChange={() => upd({ manager_approval: false })} label="Administrators only" hint="Only administrators approve holiday." />
          <Radio name="mgr" checked={s.manager_approval} onChange={() => upd({ manager_approval: true })} label="Managers approve too" hint="Care managers and registered managers can approve, as they do for policies." />
        </div>
        <label className="mt-2 block text-sm font-medium text-neutral-dark" htmlFor="hol-max">Most people off on one day (optional)</label>
        <input id="hol-max" inputMode="numeric" className={`${sel} w-28`} value={maxOff} onChange={e => { setMaxOff(e.target.value.replace(/[^\d]/g, '').slice(0, 3)); setSaved(false) }} placeholder="No limit" />
        <p className="text-xs text-neutral-mid">The person approving sees a clear warning when a request would go over this. It never blocks a decision.</p>
      </Sub>

      <Sub title="Bank holiday pay" hint="Bank holidays are worked in care, so staff are paid more. Choose the usual multiplier and change it for any bank holiday. This is recorded for you, nothing is calculated from it yet, and bank holidays are never taken off a person's holiday.">
        <label className="block text-sm font-medium text-neutral-dark" htmlFor="hol-mult">Usual bank holiday pay</label>
        <select id="hol-mult" className={sel} value={s.bank_default_multiplier} onChange={e => upd({ bank_default_multiplier: Number(e.target.value) })}>
          {choices.map(c => <option key={c} value={c}>{c} times their hourly rate</option>)}
        </select>
        {years.map(y => (
          <div key={y} className="mt-3">
            <p className="mb-1.5 text-sm font-semibold text-neutral-dark">{y}</p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {bank.filter(b => b.date.startsWith(y)).map(b => {
                const o = overrideOf(b.date)
                return (
                  <li key={b.date} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm text-neutral-dark">{b.name}<span className="ml-2 text-xs text-neutral-mid">{new Date(b.date + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</span></span>
                    <select aria-label={`Pay for ${b.name} ${y}`} className={sel} value={o ?? ''} onChange={e => setOverride(b.date, e.target.value)}>
                      <option value="">{/^(christmas|boxing)/i.test(b.name) ? 'Usual for this day (2 times)' : `Usual (${s.bank_default_multiplier} times)`}</option>
                      {choices.map(c => <option key={c} value={c}>{c} times</option>)}
                    </select>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Sub>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save holiday settings
        </button>
        {saved && <span className="text-sm text-green-700" role="status">Saved</span>}
      </div>
    </div>
  )
}
