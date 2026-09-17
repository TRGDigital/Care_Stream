// Status styles for the Training Matrix, shared by the Training Matrix tab and the staff record.

import type { TrainingMatrixCell, TrainingMatrixStatus } from '@/lib/api-client'

export const MATRIX_STATUS: Record<TrainingMatrixStatus, { label: string; glyph: string; cls: string }> = {
  in_date:       { label: 'In date',             glyph: '✓', cls: 'bg-green-100 text-green-700' },
  due_soon:      { label: 'Renewal due soon',    glyph: '⏳', cls: 'bg-amber-100 text-amber-700' },
  expired:       { label: 'Expired',             glyph: '✕', cls: 'bg-red-100 text-red-700' },
  overdue:       { label: 'Overdue',             glyph: '✕', cls: 'bg-red-100 text-red-700' },
  practical_due: { label: 'Practical to sign off', glyph: 'P', cls: 'bg-amber-100 text-amber-700' },
  in_progress:   { label: 'In progress',         glyph: '◔', cls: 'border-2 border-teal bg-teal/10 text-teal' },
  not_started:   { label: 'Assigned, not started', glyph: '○', cls: 'border-2 border-gray-200 bg-gray-50 text-gray-400' },
  missing:       { label: 'Required, not assigned', glyph: '!', cls: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-300' },
  none:          { label: 'Not required',        glyph: '·', cls: 'bg-neutral-light/60 text-neutral-mid/50' },
  agency:        { label: 'Agency worker',       glyph: 'A', cls: 'bg-neutral-light text-neutral-mid' },
}
const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

export function cellSummary(label: string, c: TrainingMatrixCell): string {
  const parts = [`${label}: ${MATRIX_STATUS[c.status].label}`]
  if (c.completed_at && c.status !== 'missing') parts.push(`completed ${fmt(c.completed_at)}`)
  if (c.valid_until) parts.push(`valid until ${fmt(c.valid_until)}`)
  if (c.due_date && (c.status === 'overdue' || c.status === 'not_started' || c.status === 'in_progress')) parts.push(`due ${fmt(c.due_date)}`)
  if (c.detail) parts.push(c.detail)
  if (!c.required && c.status !== 'none' && c.status !== 'agency') parts.push('not required for this role')
  return parts.join(' · ')
}

export function MatrixBadge({ cell, size = 'md' }: { cell: TrainingMatrixCell; size?: 'sm' | 'md' }) {
  const st = MATRIX_STATUS[cell.status]
  const dim = !cell.required && cell.status !== 'none' && cell.status !== 'agency' ? 'opacity-60' : ''
  const box = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs'
  return <span className={`inline-flex ${box} items-center justify-center rounded-full font-bold ${st.cls} ${dim}`}>{st.glyph}</span>
}

