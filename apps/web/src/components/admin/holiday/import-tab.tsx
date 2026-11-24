'use client'

// Load bookings that already exist (for example from the old spreadsheet). A CSV with email or name, date, hours and status. Check it first, then add it.
// Days a person already has are skipped, so running the same file twice adds nothing new.

import { useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { holiday, type ImportPreview } from '@/lib/holiday-client'

export function ImportTab({ token }: { token: string }) {
  const [csv, setCsv] = useState('')
  const [prev, setPrev] = useState<ImportPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function run(commit: boolean) {
    setBusy(true); setError(''); setDone(null)
    try {
      const r = await holiday.admin.importCsv(token, csv, commit)
      if (commit) { setDone(`Added ${r.summary.to_add} days in ${r.requests ?? 0} bookings.`); setPrev(null); setCsv('') } else setPrev(r)
    } catch (e: any) { setError(e?.message ?? 'Could not read that file.') } finally { setBusy(false) }
  }
  async function pick(f: File | null) { if (!f) return; setCsv(await f.text()); setPrev(null); setDone(null) }
  async function template() {
    const res = await fetch(holiday.admin.templateUrl, { headers: { Authorization: `Bearer ${token}` } })
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = 'holiday-import-template.csv'; a.click(); URL.revokeObjectURL(a.href)
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-neutral-dark">
        <p className="font-semibold">Load holiday that has already been booked</p>
        <p className="mt-1 text-neutral-mid">One row for each day: the person's email (or their full name), the date (2026-03-04 or 04/03/2026), the hours (a whole number, 1 to 13) and the status, which must be approved. Imported days count as approved holiday straight away.</p>
        <button type="button" onClick={template} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-neutral-light"><Download size={14} /> Download the template</button>
      </div>
      <div className="space-y-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><Upload size={14} /> Choose a CSV file
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
        </label>
        <label htmlFor="imp-csv" className="block text-sm font-medium text-neutral-dark">or paste it here</label>
        <textarea id="imp-csv" rows={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs" value={csv} onChange={e => { setCsv(e.target.value); setPrev(null); setDone(null) }} placeholder={'email,date,hours,status\nsample.person@yourhome.co.uk,2026-03-04,8,approved'} />
        <button type="button" disabled={busy || !csv.trim()} onClick={() => run(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy && !prev ? <Loader2 size={14} className="animate-spin" /> : null} Check the file</button>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{done}</p>}
      {prev && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-dark"><strong>{prev.summary.to_add}</strong> days to add, <strong>{prev.summary.duplicates}</strong> already booked (skipped), <strong className={prev.summary.errors ? 'text-red-700' : ''}>{prev.summary.errors}</strong> with problems.</p>
          <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-neutral-light text-left text-xs"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Person</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Result</th></tr></thead>
              <tbody>{(prev.rows ?? []).map(r => (
                <tr key={r.line} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-neutral-mid">{r.line}</td><td className="px-3 py-1.5">{r.matched_name ?? r.who}</td><td className="px-3 py-1.5">{r.day ?? ''}</td><td className="px-3 py-1.5">{r.hours ?? ''}</td>
                  <td className={`px-3 py-1.5 ${r.error ? 'text-red-700' : r.duplicate ? 'text-neutral-mid' : 'text-green-700'}`}>{r.error ?? (r.duplicate ? 'Already booked, skipped' : 'Will be added')}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <button type="button" disabled={busy || prev.summary.errors > 0 || prev.summary.to_add === 0} onClick={() => run(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : null} Add {prev.summary.to_add} days</button>
          {prev.summary.errors > 0 && <p className="text-xs text-neutral-mid">Fix or remove the rows with problems, then check the file again.</p>}
        </div>
      )}
    </div>
  )
}
