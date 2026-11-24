'use client'

// The holiday matrix: one block per active person (what they have taken, and a "Booked" row beneath), by month, with totals, what is left and the percentage taken.
// Like the spreadsheet it replaces. Only approved holiday counts. Click a figure to see the bookings behind it. Export to CSV for payroll.

import { StaffAvatar } from '@/components/admin/staff-avatar'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Info, Loader2, Search, X } from 'lucide-react'
import { remainingState, percentState, REMAINING_STYLE, PERCENT_STYLE } from '@/lib/holiday-colours'
import { holiday, describeRange, fmtNum, unitWord, type Matrix, type MatrixRow, type Request } from '@/lib/holiday-client'

const th = 'whitespace-nowrap border-b border-gray-200 bg-neutral-light px-3 py-2 text-left text-xs font-semibold text-neutral-dark'
const td = 'whitespace-nowrap border-b border-gray-100 px-3 py-1.5 text-sm'
const cell = (n: number) => (n ? fmtNum(n) : '')

/** The key to the colours, above the matrix. Open or closed is remembered in this browser. */
function Legend() {
  const [open, setOpen] = useState(true)
  useEffect(() => { try { setOpen(window.localStorage.getItem('cs-holiday-legend') !== 'closed') } catch { /* storage blocked */ } }, [])
  const toggle = () => { const n = !open; setOpen(n); try { window.localStorage.setItem('cs-holiday-legend', n ? 'open' : 'closed') } catch { /* ignore */ } }
  const chip = (cls: string, text: string) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-neutral-dark">
      <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex items-center gap-1.5 font-semibold text-neutral-dark hover:text-teal"><Info size={13} aria-hidden="true" /> Key to the colours {open ? '(hide)' : '(show)'}</button>
      {open && (
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><p className="font-semibold text-neutral-mid">Remaining</p>
            <p className="flex flex-wrap items-center gap-1.5">{chip('bg-gray-100 text-neutral-dark', 'No colour')} more than 20% left</p>
            <p className="flex flex-wrap items-center gap-1.5">{chip(REMAINING_STYLE.low.cls, 'Low')} 20% or less left</p>
            <p className="flex flex-wrap items-center gap-1.5">{chip(REMAINING_STYLE.used.cls, 'Used up')} none left</p>
            <p className="flex flex-wrap items-center gap-1.5">{chip(REMAINING_STYLE.over.cls, 'Over')} below zero: over the allowance</p>
          </div>
          <div className="space-y-1.5"><p className="font-semibold text-neutral-mid">% taken</p>
            {(['start', 'mid', 'high', 'full', 'over'] as const).map(k => <p key={k} className="flex flex-wrap items-center gap-1.5">{chip(PERCENT_STYLE[k].cls, PERCENT_STYLE[k].label.split(':')[0])}{k === 'full' ? 'fully used' : k === 'over' ? 'more than the allowance' : ''}</p>)}
          </div>
          <div className="space-y-1.5"><p className="font-semibold text-neutral-mid">Months</p>
            <p className="flex flex-wrap items-center gap-1.5"><span className="rounded px-1 font-semibold">12</span> taken (the date has passed)</p>
            <p className="flex flex-wrap items-center gap-1.5"><span className="rounded bg-teal/10 px-1 font-semibold text-teal-900">12</span> booked (still to come, on the Booked row)</p>
            <p className="flex flex-wrap items-center gap-1.5"><span className="rounded px-1 font-semibold">12<sup className="text-sky-700">&bull;</sup></span> includes a monthly figure loaded from the spreadsheet</p>
          </div>
        </div>
      )}
    </div>
  )
}

function csvCell(v: unknown) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
export function matrixToCsv(m: Matrix): string {
  const head = ['Staff name', 'Row', 'Start date', 'Unit', 'Holiday entitlement', 'Contracted hours a week', ...m.months.map(x => x.label), 'Total taken', 'Total booked', 'Remaining', 'Percentage taken']
  const out = [head.map(csvCell).join(',')]
  for (const r of m.rows) {
    out.push([r.name, 'Taken', r.start_date ?? '', r.unit, r.entitlement, r.contracted ?? '', ...m.months.map(x => r.taken_by_month[x.key] || ''), r.taken, '', r.remaining, r.percent_taken].map(csvCell).join(','))
    out.push([r.name, 'Booked', '', '', '', '', ...m.months.map(x => r.booked_by_month[x.key] || ''), '', r.booked, '', ''].map(csvCell).join(','))
  }
  return out.join('\n')
}

export function MatrixTab({ token }: { token: string }) {
  const [m, setM] = useState<Matrix | null>(null)
  const [year, setYear] = useState<number | undefined>(undefined)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<{ row: MatrixRow; monthKey: string; label: string; kind: 'taken' | 'booked'; items: Request[] | null } | null>(null)

  useEffect(() => {
    let live = true
    setM(null); setError('')
    holiday.admin.matrix(token, year).then(r => { if (live) setM(r) }).catch(e => { if (live) setError(e?.message ?? 'Could not load the matrix.') })
    return () => { live = false }
  }, [token, year])

  const rows = useMemo(() => (m?.rows ?? []).filter(r => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())), [m, q])

  function open(row: MatrixRow, monthKey: string, label: string, kind: 'taken' | 'booked') {
    if (!m) return
    const from = `${monthKey}-01`
    const to = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)).toISOString().slice(0, 10)
    setDetail({ row, monthKey, label, kind, items: null })
    holiday.admin.personRequests(token, row.user_id, from, to).then(r => setDetail(d => (d ? { ...d, items: r.requests } : d))).catch(() => setDetail(d => (d ? { ...d, items: [] } : d)))
  }
  function download() {
    if (!m) return
    const blob = new Blob(['﻿' + matrixToCsv(m)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `holiday-matrix-${m.label.replace('/', '-')}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  if (error) return <p className="text-sm text-red-700" role="alert">{error}</p>
  if (!m) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading the matrix</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Earlier holiday year" onClick={() => setYear(m.year - 1)} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal"><ChevronLeft size={16} /></button>
          <span className="min-w-[5.5rem] text-center text-base font-bold text-neutral-dark">{m.label}</span>
          <button type="button" aria-label="Later holiday year" onClick={() => setYear(m.year + 1)} className="rounded-lg border border-gray-200 p-1.5 text-neutral-mid hover:text-teal"><ChevronRight size={16} /></button>
        </div>
        <label className="relative">
          <span className="sr-only">Find a person</span>
          <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-neutral-mid" aria-hidden="true" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a person" className="w-56 rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-teal" />
        </label>
        <button type="button" onClick={download} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><Download size={14} /> Export CSV</button>
      </div>
      <p className="text-xs text-neutral-mid">Only approved holiday is counted. Taken is up to and including today, booked is after today.{m.carry_over ? ' Holiday carried over from last year is included in the entitlement.' : ''}</p>

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className={`${th} sticky left-0 z-30 min-w-[11rem]`}>Staff name</th>
              <th className={th}>Start date</th>
              <th className={th}>Entitlement</th>
              <th className={th}>Contracted hrs/wk</th>
              {m.months.map(x => <th key={x.key} className={`${th} text-right`}>{x.label}</th>)}
              <th className={`${th} bg-sky-50 text-right`}>Total taken</th>
              <th className={`${th} bg-sky-50 text-right`}>Remaining</th>
              <th className={`${th} bg-yellow-50 text-right`}>% taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8 + m.months.length} className="px-3 py-6 text-center text-sm text-neutral-mid">No staff match.</td></tr>}
            {rows.map(r => (
              <MatrixBlock key={r.user_id} r={r} months={m.months} onOpen={open} />
            ))}
          </tbody>
        </table>
      </div>

      <Legend />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setDetail(null) }}>
          <div role="dialog" aria-modal="true" aria-label="Bookings" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><StaffAvatar name={detail.row.name} photoUrl={detail.row.photo_url} size={36} /><div><p className="text-base font-bold text-neutral-dark">{detail.row.name}</p><p className="text-sm text-neutral-mid">{detail.kind === 'taken' ? 'Taken' : 'Booked'} in {detail.label}</p></div></div>
              <button type="button" aria-label="Close" onClick={() => setDetail(null)} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
            </div>
            {(() => {
              const f = detail.row.imported_by_month?.[detail.monthKey], v = f ? (detail.kind === 'taken' ? f.taken : f.booked) : 0
              return v > 0 ? <p className="mb-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">Imported figure from your spreadsheet: <strong>{fmtNum(v)} {detail.row.unit === 'days' ? unitWord('days', v) : unitWord('hours', v)}</strong> {detail.kind === 'taken' ? 'taken' : 'booked'} in {detail.label}. It has no dates, so it is not on the calendar.</p> : null
            })()}
            {detail.items === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
              : detail.items.length === 0 ? <p className="text-sm text-neutral-mid">{detail.row.imported_by_month?.[detail.monthKey] ? 'No dated bookings.' : 'No bookings found.'}</p>
              : <ul className="space-y-2">{detail.items.map(i => (
                <li key={i.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-medium text-neutral-dark">{describeRange(i.days)}</p>
                  <p className="text-neutral-mid">{i.status === 'approved' ? 'Approved' : 'Waiting for approval'} · {detail.row.unit === 'days' ? `${i.days.length} ${unitWord('days', i.days.length)}` : `${fmtNum(i.total_hours)} ${unitWord('hours', i.total_hours)}`}{i.decided_by_name ? ` · by ${i.decided_by_name}` : ''}</p>
                  {i.note && <p className="mt-1 text-neutral-mid">{i.note}</p>}
                </li>))}</ul>}
          </div>
        </div>
      )}
    </div>
  )
}

function MatrixBlock({ r, months, onOpen }: { r: MatrixRow; months: Matrix['months']; onOpen: (r: MatrixRow, key: string, label: string, kind: 'taken' | 'booked') => void }) {
  const unit = r.unit === 'days' ? 'days' : 'hrs'
  const num = (n: number, key: string, label: string, kind: 'taken' | 'booked') => n
    ? <button type="button" onClick={() => onOpen(r, key, label, kind)} className="rounded px-1 text-neutral-dark underline decoration-dotted underline-offset-2 hover:bg-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40" aria-label={`${fmtNum(n)} ${kind} in ${label}. Show bookings`}>{fmtNum(n)}{(() => { const f = r.imported_by_month?.[key]; return f && (kind === 'taken' ? f.taken : f.booked) > 0 ? <sup className="ml-0.5 text-sky-700" title="Includes a monthly figure loaded from the spreadsheet">&bull;</sup> : null })()}</button>
    : <span aria-hidden="true"></span>
  return (
    <>
      <tr className="bg-white">
        <td className={`${td} sticky left-0 z-10 bg-white font-medium text-neutral-dark`}><span className="inline-flex items-center gap-2"><StaffAvatar name={r.name} photoUrl={r.photo_url} size={24} />{r.name}</span>{r.carry_in > 0 && <span className="ml-1 text-[11px] font-normal text-neutral-mid">(+{fmtNum(r.carry_in)} carried)</span>}</td>
        <td className={`${td} text-neutral-mid`}>{r.start_date ? new Date(r.start_date + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''}</td>
        <td className={`${td} font-semibold`}>{fmtNum(r.entitlement)} {unit}</td>
        <td className={td}>{r.contracted != null ? fmtNum(r.contracted) : ''}</td>
        {months.map(x => <td key={x.key} className={`${td} text-right`}>{num(r.taken_by_month[x.key] ?? 0, x.key, x.label, 'taken')}</td>)}
        <td className={`${td} bg-sky-50/60 text-right font-semibold`}>{cell(r.taken)}</td>
        {(() => {
          const rs = remainingState(r.entitlement, r.remaining), st = REMAINING_STYLE[rs], ps = percentState(r.percent_taken), pt = PERCENT_STYLE[ps]
          const over = `${fmtNum(Math.abs(r.remaining))} ${r.unit === 'days' ? 'days' : 'hours'}`
          return (<>
            <td className={`${td} text-right font-semibold ${st.cls}`} title={st.tip(over)}>
              <span className="inline-flex items-center justify-end gap-1">{rs === 'over' && <AlertTriangle size={13} aria-hidden="true" />}{fmtNum(r.remaining)}{st.label && <span className="text-[10px] font-bold uppercase tracking-wide">{st.label}</span>}</span>
            </td>
            <td className={`${td} text-right font-semibold ${pt.cls}`} title={pt.label}>{fmtNum(r.percent_taken)}%</td>
          </>)
        })()}
      </tr>
      <tr className="bg-neutral-light/50">
        <td className={`${td} sticky left-0 z-10 bg-neutral-light pl-6 text-xs font-semibold text-neutral-mid`}>Booked</td>
        <td className={td} /><td className={td} /><td className={td} />
        {months.map(x => <td key={x.key} className={`${td} text-right ${(r.booked_by_month[x.key] ?? 0) ? 'bg-teal/10 text-teal-900' : ''}`}>{num(r.booked_by_month[x.key] ?? 0, x.key, x.label, 'booked')}</td>)}
        <td className={`${td} bg-sky-50/40 text-right text-neutral-mid`}>{cell(r.booked)}</td><td className={td} /><td className={td} />
      </tr>
    </>
  )
}
