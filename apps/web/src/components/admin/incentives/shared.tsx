'use client'

import { useState, type ReactNode } from 'react'
import type { CampaignStatus, ClaimStatus } from '@/lib/incentives-api'
import { Dialog, btnSecondary, btnPrimary, btnDanger, ErrorBox, errMsg } from '@/components/admin/residents/ui'

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Draft',
  awaiting_approval: 'Awaiting care manager approval',
  live: 'Live',
  ended: 'Ended',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const STATUS_CLS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  awaiting_approval: 'bg-amber-50 text-amber-700',
  live: 'bg-green-50 text-green-700',
  ended: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[status]}`}>{STATUS_LABEL[status]}</span>
}

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  held: 'Place held, waiting for approval',
  approved: 'Approved',
  given: 'Given',
  missed: 'Places gone',
  rejected: 'Rejected',
  forfeited: 'Left the home',
}

const CLAIM_CLS: Record<ClaimStatus, string> = {
  held: 'bg-amber-50 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  given: 'bg-green-50 text-green-700',
  missed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-700',
  forfeited: 'bg-gray-100 text-gray-600',
}

export function ClaimChip({ status }: { status: ClaimStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLAIM_CLS[status]}`}>{CLAIM_LABEL[status]}</span>
}

export function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  if (!y || !mo) return m
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`

export function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <h3 className="text-sm font-bold text-neutral-dark">{title}</h3>
      {hint && <div className="mt-1 text-xs text-neutral-mid">{hint}</div>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** A confirmation dialog that runs an async action and shows any error inside it. */
export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onClose }: {
  title: string; body: ReactNode; confirmLabel: string; danger?: boolean
  onConfirm: () => Promise<void>; onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function go() {
    setBusy(true); setError(null)
    try { await onConfirm(); onClose() } catch (e) { setError(errMsg(e)); setBusy(false) }
  }
  return (
    <Dialog title={title} onClose={() => { if (!busy) onClose() }}>
      <div className="space-y-3 text-sm text-neutral-mid">
        <div>{body}</div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>Go back</button>
          <button type="button" className={danger ? btnDanger : btnPrimary} onClick={go} disabled={busy}>{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </div>
    </Dialog>
  )
}
