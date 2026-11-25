'use client'

// HOUSE RULE 12: a date is always picked, never typed. One component for every date in the Ask panel: a real date input (calendar button, keyboard and phone friendly, shown in the
// browser's own order, which is day first in the UK) with a Today and a Clear helper. `DateTextPicker` is for the newsletter Dates block, which keeps the readable form
// ("Monday 8 December 2026"); an older block whose date was typed as free text still opens: its words stay editable and the picker beside it replaces them.
import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { fromLongDate, isPickable, todayIso, toLongDate } from '@/lib/ask-dates'

const field = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:opacity-60'
const helper = 'rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal'

export function DatePicker({ id, label, value, onChange, min, max, disabled, helpers = true, className = '' }: {
  id?: string; label?: string; value: string; onChange: (iso: string) => void; min?: string; max?: string; disabled?: boolean; helpers?: boolean; className?: string
}) {
  const auto = useId(); const fid = id ?? `dp-${auto}`
  const clamp = (iso: string) => (min && iso < min ? min : max && iso > max ? max : iso)
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <span className="relative inline-flex items-center">
        <CalendarDays size={15} aria-hidden="true" className="pointer-events-none absolute left-2.5 text-neutral-mid" />
        <input id={fid} type="date" aria-label={label} value={value} min={min} max={max} disabled={disabled} onChange={e => onChange(e.target.value)} className={`${field} pl-8`} />
      </span>
      {helpers && <>
        <button type="button" disabled={disabled} onClick={() => onChange(clamp(todayIso()))} className={helper}>Today</button>
        {value && <button type="button" disabled={disabled} onClick={() => onChange('')} className={helper} aria-label="Clear the date">Clear</button>}
      </>}
    </div>
  )
}

/** The Dates block: the stored value is the readable text. A date that was typed in words and cannot be read as a date stays editable beside the picker. */
export function DateTextPicker({ id, label, text, onChange, disabled }: { id: string; label: string; text: string; onChange: (text: string) => void; disabled?: boolean }) {
  const pickable = isPickable(text)
  return (
    <div className="space-y-1.5">
      {!pickable && (
        <div>
          <input id={id} aria-label={`${label} (typed earlier)`} className={`${field} w-full`} maxLength={28} value={text} disabled={disabled} onChange={e => onChange(e.target.value)} />
          <p className="mt-0.5 text-[11px] text-neutral-mid">This one was typed. Pick a date to replace it.</p>
        </div>
      )}
      <DatePicker id={pickable ? id : `${id}-pick`} label={label} value={pickable ? fromLongDate(text) ?? '' : ''} disabled={disabled} onChange={iso => onChange(toLongDate(iso))} />
      {pickable && text && <p className="text-[11px] text-neutral-mid" aria-live="polite">Shown as {text}</p>}
    </div>
  )
}
