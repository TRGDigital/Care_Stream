'use client'

// HOUSE RULE 3, STAFF SELECTION. The ONE staff picker for the whole Ask panel (question forms, action cards, the newsletter picture, the upload match table, the share panel). The
// administrator chooses from a LIST of the account's active staff: the picture they were given in CareStream (initials and a small "No picture yet" tag when there is none), name and job
// title, administrators first, searchable, single or several. A long list grows with Show more: there is no scroll bar. Pictures arrive through the signed, authenticated address the
// Staff page uses; they are never typed or uploaded again here.
import { useEffect, useId, useMemo, useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import type { ActionPerson } from '@/lib/ask-client'
import { loadStaff } from '@/lib/staff-cache'
import { filterStaff, hasPicture, nextSelection, orderStaff, pageOf, rolesOf } from '@/lib/staff-picker'

const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

/** The account's staff, loaded once. `null` while loading. */
export function useStaff(token: string, enabled = true): ActionPerson[] | null {
  const [staff, setStaff] = useState<ActionPerson[] | null>(null)
  useEffect(() => { let live = true; if (enabled && !staff) loadStaff(token).then(l => { if (live) setStaff(orderStaff(l)) }).catch(() => { if (live) setStaff([]) }); return () => { live = false } }, [enabled, staff, token])
  return staff
}

export interface StaffPickerProps {
  people: ActionPerson[]
  selected: string[]
  onChange: (ids: string[]) => void
  mode?: 'single' | 'multi'
  max?: number
  disabled?: boolean
  /** People without an email address are shown but cannot be picked (a message that needs email). */
  needEmail?: boolean
  suggested?: Set<string>
  /** Everyone, Select shown and Clear buttons (several people). */
  bulk?: boolean
  label?: string
  /** Offer a "None" row in single mode (for example, no picture of anyone). */
  noneLabel?: string
}

export function StaffPicker({ people, selected, onChange, mode = 'multi', max = 500, disabled, needEmail, suggested, bulk, label = 'Staff', noneLabel }: StaffPickerProps) {
  const uid = useId()
  const [q, setQ] = useState(''), [role, setRole] = useState(''), [pages, setPages] = useState(1)
  const ordered = useMemo(() => orderStaff(people), [people])
  const roles = useMemo(() => rolesOf(ordered), [ordered])
  const found = useMemo(() => filterStaff(ordered, q, role), [ordered, q, role])
  const { shown, hidden } = pageOf(found, pages)
  useEffect(() => { setPages(1) }, [q, role])
  const reachable = (p: ActionPerson) => !needEmail || p.has_email !== false
  const sel = new Set(selected)
  const toggle = (id: string) => onChange(nextSelection(selected, id, mode, max))
  return (
    <div className="rounded-lg border border-gray-200 bg-white" role="group" aria-label={label}>
      {(bulk && mode === 'multi') && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-2">
          <button type="button" disabled={disabled} onClick={() => onChange(ordered.filter(reachable).slice(0, max).map(p => p.id))} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50">Everyone</button>
          <button type="button" disabled={disabled} onClick={() => onChange([...new Set([...selected, ...found.filter(reachable).map(p => p.id)])].slice(0, max))} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50">Select shown</button>
          <button type="button" disabled={disabled} onClick={() => onChange([])} className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid hover:text-neutral-dark disabled:opacity-50">Clear</button>
          <span className="ml-auto text-xs font-semibold text-neutral-dark" aria-live="polite">{selected.length} selected <span className="font-normal text-neutral-mid">(up to {max})</span></span>
        </div>
      )}
      <div className="flex gap-2 p-2">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Find a person</span><Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-neutral-mid" aria-hidden="true" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or job" className={`${inp} pl-7`} /></label>
        {roles.length > 1 && <label><span className="sr-only">Job role</span><select value={role} onChange={e => setRole(e.target.value)} className={`${inp} w-auto`}><option value="">All roles</option>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></label>}
      </div>
      <ul className="px-1 pb-1" aria-label={label}>
        {mode === 'single' && noneLabel && (
          <li><label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-light"><input type="radio" name={uid} className="h-4 w-4" checked={selected.length === 0} disabled={disabled} onChange={() => onChange([])} /><span className="font-medium text-neutral-dark">{noneLabel}</span></label></li>
        )}
        {shown.map(p => {
          const ok = reachable(p), on = sel.has(p.id)
          return (
            <li key={p.id}>
              <label className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${ok ? 'cursor-pointer hover:bg-neutral-light' : 'opacity-50'} ${on ? 'bg-teal/5' : ''}`}>
                <input type={mode === 'single' ? 'radio' : 'checkbox'} name={mode === 'single' ? uid : undefined} className="h-4 w-4" checked={on} disabled={disabled || !ok} onChange={() => toggle(p.id)} />
                <StaffAvatar name={p.name} photoUrl={p.photo_url} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-dark">{p.name}
                    {p.is_admin && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-bold text-neutral-mid">Admin</span>}
                    {suggested?.has(p.id) && <span className="ml-1.5 rounded-full bg-teal/10 px-1.5 py-px text-[10px] font-bold text-teal">Suggested</span>}
                  </span>
                  <span className="block truncate text-xs text-neutral-mid">{ok ? (p.job_role ?? 'No job title') : 'No email on file'}</span>
                </span>
                {!hasPicture(p) && <span className="shrink-0 rounded-full border border-gray-200 px-1.5 py-px text-[10px] font-medium text-neutral-mid" title="Their photo will show as initials until a picture is added on their staff profile">No picture yet</span>}
                {on && <Check size={14} className="shrink-0 text-teal" aria-hidden="true" />}
              </label>
            </li>
          )
        })}
        {found.length === 0 && <li className="px-2 py-3 text-sm text-neutral-mid">Nobody matches.</li>}
      </ul>
      {(hidden > 0 || pages > 1) && (
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 text-xs">
          <span className="text-neutral-mid">{shown.length} of {found.length} shown</span>
          <span className="flex gap-3">
            {hidden > 0 && <button type="button" onClick={() => setPages(n => n + 1)} className="font-semibold text-teal underline">Show more</button>}
            {pages > 1 && <button type="button" onClick={() => setPages(1)} className="font-medium text-neutral-mid underline">Show fewer</button>}
          </span>
        </div>
      )}
    </div>
  )
}

/** A compact choice for one person inside a table row (the upload match table): a button showing the person chosen, opening the same picker. `first` lists the likely matches on top. */
export function StaffSelect({ token, value, onChange, first = [], disabled, label, extra }: { token: string; value: string | null; onChange: (id: string | null) => void; first?: string[]; disabled?: boolean; label: string; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const staff = useStaff(token, open || !!value)
  const person = staff?.find(p => p.id === value) ?? null
  const ordered = useMemo(() => staff ? [...staff.filter(p => first.includes(p.id)), ...staff.filter(p => !first.includes(p.id))] : [], [staff, first])
  return (
    <div>
      <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-left text-sm hover:border-teal disabled:opacity-50">
        <span className="sr-only">{label}: </span>
        {person ? <><StaffAvatar name={person.name} photoUrl={person.photo_url} size={22} /><span className="min-w-0 flex-1 truncate font-medium text-neutral-dark">{person.name}</span></> : <span className="flex-1 text-neutral-mid">Choose a person</span>}
        <span className="text-xs font-semibold text-teal">{open ? 'Close' : 'Change'}</span>
      </button>
      {open && (
        <div className="mt-1.5">
          {staff === null ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
            : <StaffPicker people={ordered} selected={value ? [value] : []} onChange={ids => { onChange(ids[0] ?? null); if (ids[0]) setOpen(false) }} mode="single" suggested={new Set(first)} label={label} />}
          {extra}
        </div>
      )}
    </div>
  )
}
