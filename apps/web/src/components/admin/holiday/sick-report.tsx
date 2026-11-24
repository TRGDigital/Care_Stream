'use client'

// The sickness report: choose the dates (and, if wanted, one person), see a preview, then download it for Excel. Administrators only; every view and download is logged.

import { useEffect, useState } from 'react'
import { Download, Info, Loader2, X } from 'lucide-react'
import { holiday, addDays, niceDate, type SickPerson, type SickReport } from '@/lib/holiday-client'

const inp = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50'
const pad = (n: number) => String(n).padStart(2, '0')
const monthRange = (y: number, m0: number) => ({ from: `${y}-${pad(m0 + 1)}-01`, to: addDays(`${m0 === 11 ? y + 1 : y}-${pad(m0 === 11 ? 1 : m0 + 2)}-01`, -1) })

export function SickReportOverlay({ token, onClose }: { token: string; onClose: () => void }) {
  const now = new Date()
  const [range, setRange] = useState(monthRange(now.getFullYear(), now.getMonth()))
  const [userId, setUserId] = useState('')
  const [people, setPeople] = useState<SickPerson[]>([])
  const [yearStart, setYearStart] = useState<{ month: number; day: number }>({ month: 1, day: 1 })
  const [data, setData] = useState<SickReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    holiday.admin.sick.people(token).then(r => setPeople(r.people)).catch(() => undefined)
    holiday.admin.settings(token).then(r => setYearStart(r.settings.year_start)).catch(() => undefined)
  }, [token])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [onClose])

  const preview = async () => {
    setBusy(true); setError('')
    try { setData(await holiday.admin.sick.report(token, range.from, range.to, userId || undefined)) } catch (e: any) { setError(e?.message ?? 'Could not make the report.'); setData(null) } finally { setBusy(false) }
  }
  useEffect(() => { setData(null) }, [range.from, range.to, userId])

  const file = async (view: 'summary' | 'days') => {
    setBusy(true); setError('')
    try { await holiday.admin.sick.download(token, `report?from=${range.from}&to=${range.to}&format=csv&view=${view}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}${notes && view === 'days' ? '&notes=1' : ''}`, `sickness-${range.from}-to-${range.to}.csv`) }
    catch (e: any) { setError(e?.message ?? 'Could not make the file.') } finally { setBusy(false) }
  }
  const quick = {
    thisMonth: () => setRange(monthRange(now.getFullYear(), now.getMonth())),
    lastMonth: () => setRange(monthRange(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), now.getMonth() === 0 ? 11 : now.getMonth() - 1)),
    thisYear: () => {
      const start = `${now.getFullYear()}-${pad(yearStart.month)}-${pad(yearStart.day)}`
      const y = start <= now.toISOString().slice(0, 10) ? now.getFullYear() : now.getFullYear() - 1
      const from = `${y}-${pad(yearStart.month)}-${pad(yearStart.day)}`
      setRange({ from, to: addDays(`${y + 1}-${pad(yearStart.month)}-${pad(yearStart.day)}`, -1) })
    },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="sr-title" className="my-6 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="sr-title" className="text-lg font-bold text-neutral-dark">Sickness report</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        <p className="mb-4 text-xs text-neutral-mid">Health information: only administrators can see this, and each time it is viewed or downloaded it is logged.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div><label htmlFor="sr-from" className="mb-1 block text-xs font-medium text-neutral-dark">From</label><input id="sr-from" type="date" className={inp} value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value, to: r.to < e.target.value ? e.target.value : r.to }))} /></div>
          <div><label htmlFor="sr-to" className="mb-1 block text-xs font-medium text-neutral-dark">To</label><input id="sr-to" type="date" className={inp} value={range.to} min={range.from} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} /></div>
          <div><label htmlFor="sr-who" className="mb-1 block text-xs font-medium text-neutral-dark">Person (optional)</label>
            <select id="sr-who" className={inp} value={userId} onChange={e => setUserId(e.target.value)}><option value="">Everyone</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="flex gap-1 text-xs">
            <button type="button" onClick={quick.thisMonth} className="rounded-lg border border-gray-200 px-2.5 py-2 font-medium text-neutral-mid hover:text-teal">This month</button>
            <button type="button" onClick={quick.lastMonth} className="rounded-lg border border-gray-200 px-2.5 py-2 font-medium text-neutral-mid hover:text-teal">Last month</button>
            <button type="button" onClick={quick.thisYear} className="rounded-lg border border-gray-200 px-2.5 py-2 font-medium text-neutral-mid hover:text-teal">This holiday year</button>
          </div>
          <button type="button" disabled={busy || !range.from || !range.to} onClick={preview} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy ? <Loader2 size={14} className="animate-spin" /> : null} Show report</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

        {data && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-neutral-dark"><strong>{data.totals.people}</strong> {data.totals.people === 1 ? 'person' : 'people'}, <strong>{data.totals.spells}</strong> {data.totals.spells === 1 ? 'spell' : 'spells'}, <strong>{data.totals.days}</strong> sick days ({data.totals.hours} hours) from {niceDate(data.from, true)} to {niceDate(data.to, true)}.</p>
            {data.rows.length === 0 ? <p className="rounded-lg bg-neutral-light px-4 py-6 text-center text-sm text-neutral-mid">No sickness recorded for those dates.</p> : (
              <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-neutral-light text-left text-xs font-semibold text-neutral-dark"><tr>
                    <th className="px-3 py-2">Name</th><th className="px-3 py-2">Job title</th><th className="px-3 py-2 text-right">Spells</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2 text-right">Hours</th>
                    <th className="px-3 py-2">First</th><th className="px-3 py-2">Last</th><th className="px-3 py-2">Certificate</th><th className="px-3 py-2">Return to work</th><th className="px-3 py-2">Still off</th>
                    <th className="px-3 py-2 text-right"><span className="inline-flex items-center gap-1" title="Bradford factor: the number of spells squared, times the total days off. A common sickness measure that weights frequent short absences more than one long one.">Bradford <Info size={12} aria-hidden="true" /></span></th>
                  </tr></thead>
                  <tbody>{data.rows.map(r => (
                    <tr key={r.user_id} className="border-t border-gray-100"><td className="px-3 py-1.5 font-medium text-neutral-dark">{r.name}</td><td className="px-3 py-1.5 text-neutral-mid">{r.job_role ?? ''}</td><td className="px-3 py-1.5 text-right">{r.spells}</td><td className="px-3 py-1.5 text-right">{r.days}</td><td className="px-3 py-1.5 text-right">{r.hours}</td>
                      <td className="px-3 py-1.5">{niceDate(r.first_day)}</td><td className="px-3 py-1.5">{niceDate(r.last_day)}</td><td className="px-3 py-1.5">{r.certificate}</td><td className="px-3 py-1.5">{r.return_to_work}</td><td className="px-3 py-1.5">{r.still_off ? 'Yes' : 'No'}</td><td className="px-3 py-1.5 text-right font-semibold">{r.bradford}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <button type="button" disabled={busy || data.rows.length === 0} onClick={() => file('summary')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}><Download size={14} aria-hidden="true" /> Download the summary</button>
              <button type="button" disabled={busy || data.rows.length === 0} onClick={() => file('days')} className={`${btn} border border-teal text-teal hover:bg-teal/5`}><Download size={14} aria-hidden="true" /> Download day by day</button>
              <label className="flex items-center gap-1.5 text-sm text-neutral-dark"><input type="checkbox" className="h-4 w-4" checked={notes} onChange={e => setNotes(e.target.checked)} /> Include notes in the day by day file</label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
