'use client'

// Read-only view of a completed supervision recording — opened from a staff member's record page.

import { SUP_SECTIONS } from '@/components/hub/supervision-form'
import { X, CalendarDays, ListChecks } from 'lucide-react'

const fmtDate = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export function SupervisionRecordModal({ record, supervisee, onClose }: {
  record: { type: string; held_on: string; next_due?: string | null; conducted_by?: string | null; completed_at?: string | null; form?: any }
  supervisee: string
  onClose: () => void
}) {
  const sections: Record<string, string> = record.form?.sections ?? {}
  const actions: Array<{ description: string }> = Array.isArray(record.form?.agreed_actions) ? record.form.agreed_actions : []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="my-2 w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Supervision record</p>
            <h2 className="mt-0.5 text-lg font-bold capitalize text-neutral-dark">{record.type} — {supervisee}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-gray-100 bg-neutral-light/30 px-4 py-3 text-sm sm:grid-cols-2">
            <div><span className="text-neutral-mid">Supervisor: </span><span className="font-medium text-neutral-dark">{record.conducted_by ?? '—'}</span></div>
            <div><span className="text-neutral-mid">Date held: </span><span className="font-medium text-neutral-dark">{fmtDate(record.held_on)}</span></div>
            <div className="flex items-center gap-1.5"><CalendarDays size={12} className="text-neutral-mid" /><span className="text-neutral-mid">Next supervision: </span><span className="font-medium text-neutral-dark">{fmtDate(record.next_due)}</span></div>
            {record.completed_at && <div><span className="text-neutral-mid">Recorded: </span><span className="font-medium text-neutral-dark">{fmtDate(record.completed_at)}</span></div>}
          </div>

          {SUP_SECTIONS.map((s, i) => (
            <div key={s.key}>
              <p className="text-sm font-medium text-neutral-dark">{i + 1}. {s.label}</p>
              <p className="mt-0.5 whitespace-pre-line rounded-md border border-gray-100 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-dark">{sections[s.key]?.trim() || <span className="text-neutral-mid">—</span>}</p>
            </div>
          ))}

          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-dark"><ListChecks size={14} className="text-teal" /> 10. Agreed actions</p>
            {actions.length === 0 ? (
              <p className="mt-0.5 text-sm text-neutral-mid">None recorded.</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {actions.map((a, k) => (
                  <li key={k} className="flex items-start gap-2 rounded-md border border-gray-100 bg-neutral-light/20 px-3 py-2 text-sm text-neutral-dark">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-bold text-teal">{k + 1}</span>
                    {a.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
