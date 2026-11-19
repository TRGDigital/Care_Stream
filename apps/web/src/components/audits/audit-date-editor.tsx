'use client'

// The date an audit was carried out. Everyone sees it; only an administrator can change it (the server enforces that too).
// The date follows the audit's period, so changing it can move the audit to another month. The change is kept in the audit log.
import { useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'

const long = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` }

export function AuditDateEditor({ run, isAdmin, save, onChanged }: {
  run: { audit_date?: string | null; audit_month: string; created_at?: string | null }
  isAdmin: boolean
  save: (isoDay: string) => Promise<{ run: any }>
  onChanged: (run: any) => void
}) {
  const current = (run.audit_date ?? run.audit_month).slice(0, 10)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const entered = run.created_at ? run.created_at.slice(0, 10) : null
  const backdated = !!run.audit_date && !!entered && run.audit_date.slice(0, 10) < entered

  async function apply() {
    if (!value || value === current) { setEditing(false); return }
    setBusy(true); setErr('')
    try { const r = await save(value); onChanged(r.run); setEditing(false) }
    catch (e: any) { setErr(e?.message ?? 'Could not change the date.') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-1 text-xs text-neutral-mid">
      {!editing ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CalendarDays size={12} className="text-teal" />
          <span>Audit date: <span className="font-medium text-neutral-dark">{long(current)}</span></span>
          {backdated && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Back-dated</span>}
          {isAdmin && <button type="button" onClick={() => { setValue(current); setErr(''); setEditing(true) }} className="font-medium text-teal hover:underline">Change date</button>}
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <label className="mb-1 block font-medium text-neutral-dark">Date the audit was carried out</label>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={value} max={todayStr()} onChange={e => e.target.value && setValue(e.target.value)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-neutral-dark focus:border-teal focus:outline-none" />
            <button type="button" onClick={apply} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60">{busy && <Loader2 size={12} className="animate-spin" />} Save date</button>
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className="text-xs text-neutral-mid hover:text-neutral-dark">Cancel</button>
          </div>
          <p className="mt-1.5 text-[11px]">Never a future day. The audit moves to that month if it is a different one, and the change is recorded in the audit log.</p>
          {err && <p className="mt-1.5 text-[11px] font-medium text-red-600">{err}</p>}
        </div>
      )}
    </div>
  )
}
