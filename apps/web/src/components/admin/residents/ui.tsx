'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:bg-gray-50'
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50'
export const btnSecondary = 'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50'
export const btnDanger = 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
export const btnDangerOutline = 'inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50'

export const errMsg = (e: unknown) => (e as any)?.message ?? 'Something went wrong. Please try again.'

export function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d.length === 10 ? `${d}T12:00:00` : d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-neutral-dark">{label}</label>
      {children}
      {hint && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-neutral-mid">{hint}</p>}
    </div>
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</div>
}

const INVITE_CHIP: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-700',
  opened: 'bg-violet-50 text-violet-700',
  submitted: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  revoked: 'bg-red-50 text-red-700',
}
export function StatusChip({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${INVITE_CHIP[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

/** A smaller dialog that sits above the overlay. Escape closes only this one. */
export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.() }
  }, [onClose])
  return (
    <div data-nested-dialog className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl focus:outline-none sm:rounded-2xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-neutral-dark">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
