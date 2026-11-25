'use client'

// Files attached to an Ask CareStream chat (the agents that take files: Pay, Finance, Staff, Holiday, Training, Letters and Staff newsletter): the paperclip, the file chips with what was removed and when it is deleted, and the match table
// for a payroll. Administrators only. Nothing here changes anything in CareStream: the files are used to compare and calculate.
import { useRef, useState } from 'react'
import { Paperclip, Trash2, FileSpreadsheet, ShieldCheck, Loader2, Check, AlertTriangle } from 'lucide-react'
import { ask, AskError, type AskAgent, type AskUpload, type MatchRowView } from '@/lib/ask-client'
import { StaffSelect } from '@/components/ask/staff-picker'

const KIND: Record<string, string> = { payroll: 'Payroll', invoice: 'Invoices', rota: 'Rota or timesheet', holiday: 'Holiday sheet', training: 'Training list', other: 'File' }

export function AttachButton({ token, agent, convId, disabled, onAdded, onError }: { token: string; agent: AskAgent; convId: string | null; disabled?: boolean; onAdded: (u: AskUpload) => void; onError: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  if (!agent.uploads) return null
  async function pick(f: File | undefined) {
    if (!f) return
    setBusy(true); onError('')
    try { onAdded((await ask.uploads.add(token, f, agent.id, convId)).upload) } catch (e) { onError(e instanceof AskError ? e.message : 'That file could not be added.') } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  return (
    <>
      <input ref={input} type="file" accept=".xlsx,.csv,.docx,.pdf" className="sr-only" tabIndex={-1} aria-label="Attach a spreadsheet, Word file or PDF" onChange={e => pick(e.target.files?.[0])} />
      <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} title="Attach a spreadsheet, Word file or PDF" aria-label="Attach a file" className="inline-flex h-[52px] w-[44px] flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-neutral-dark hover:border-teal hover:text-teal disabled:opacity-50">
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}
      </button>
    </>
  )
}

export function UploadsBlock({ token, uploads, onChange, onRemoved, onError }: { token: string; uploads: AskUpload[]; onChange: (u: AskUpload) => void; onRemoved: (id: string) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  if (!uploads.length) return null
  async function del(u: AskUpload) {
    setDeleting(u.id)
    try { await ask.uploads.remove(token, u.id); onRemoved(u.id) } catch (e) { onError(e instanceof AskError ? e.message : 'Could not delete that file.') } finally { setDeleting(null) }
  }
  return (
    <div className="space-y-3" aria-label="Files in this chat">
      {uploads.map(u => {
        const waiting = u.status === 'needs_match' && !!u.match && !u.match.confirmed
        return (
          <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-3 text-sm">
            <div className="flex items-start gap-2">
              <FileSpreadsheet size={18} className="mt-0.5 flex-shrink-0 text-teal" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-neutral-dark">{u.filename}</p>
                <p className="text-xs text-neutral-mid">{KIND[u.doc_kind] ?? 'File'}{u.kind === 'spreadsheet' ? `, ${u.row_count} rows` : ''}{u.sheet_name && (u.sheets_found ?? 0) > 1 ? `, sheet ${u.sheet_name}` : ''}</p>
              </div>
              <button type="button" onClick={() => del(u)} disabled={deleting === u.id} aria-label={`Delete ${u.filename}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-mid hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 size={14} aria-hidden="true" /> Delete</button>
            </div>
            {u.dropped.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-teal/5 px-2.5 py-1.5 text-xs text-neutral-dark"><ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-teal" aria-hidden="true" />
                <span>Removed {u.dropped.length} sensitive {u.dropped.length === 1 ? 'column' : 'columns'} when the file was read: {u.dropped.map(d => `${d.column} (${d.reason})`).join(', ')}. {u.dropped.length === 1 ? 'It was' : 'They were'} never stored and the assistant never saw {u.dropped.length === 1 ? 'it' : 'them'}.</span></p>
            )}
            {u.dropped.length === 0 && u.kind === 'spreadsheet' && <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-mid"><ShieldCheck size={14} className="text-teal" aria-hidden="true" /> No sensitive columns were found.</p>}
            {u.text_totals && u.text_totals.length > 0 && <p className="mt-2 text-xs text-neutral-mid">Totals read from the text: {u.text_totals.map(t => `${t.label} £${t.amount.toFixed(2)}`).join(', ')}. Please check these are right.</p>}
            <p className="mt-1.5 text-xs text-neutral-mid">{u.retention_note} You can delete it now.</p>
            {u.match && (
              <div className="mt-2">
                {waiting
                  ? <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"><AlertTriangle size={14} aria-hidden="true" /> Matched {u.match.matched} of {u.match.total} names. {u.match.ambiguous + u.match.unmatched} still need you. Nothing is used until you confirm.</p>
                  : <p className="flex items-center gap-1.5 text-xs font-semibold text-green-800"><Check size={14} aria-hidden="true" /> Names confirmed. The assistant can use this file.</p>}
                <button type="button" onClick={() => setOpen(open === u.id ? null : u.id)} className="mt-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-dark hover:border-teal hover:text-teal">{open === u.id ? 'Hide the match table' : waiting ? 'Match the names' : 'Review the match'}</button>
                {open === u.id && <MatchTable token={token} upload={u} onSaved={x => { onChange(x); if (x.match?.confirmed) setOpen(null) }} />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MatchTable({ token, upload, onSaved }: { token: string; upload: AskUpload; onSaved: (u: AskUpload) => void }) {
  const m = upload.match!
  const [choice, setChoice] = useState<Record<string, string | null>>(() => Object.fromEntries(m.rows.filter(r => r.chosen !== undefined).map(r => [String(r.row), r.chosen ?? null])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const valueOf = (r: MatchRowView): string => { const c = choice[String(r.row)]; if (c === null) return 'skip'; if (c) return c; return r.status === 'matched' && r.staff_id ? r.staff_id : '' }
  const open = m.rows.filter(r => valueOf(r) === '').length
  const used = new Map<string, number>(); for (const r of m.rows) { const v = valueOf(r); if (v && v !== 'skip') used.set(v, (used.get(v) ?? 0) + 1) }
  async function save(confirm: boolean) {
    setBusy(true); setError('')
    try { onSaved((await ask.uploads.match(token, upload.id, choice, confirm)).upload) } catch (e) { setError(e instanceof AskError ? e.message : 'Could not save.') } finally { setBusy(false) }
  }
  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-neutral-light/40 p-3">
      <p className="text-xs text-neutral-mid">Check each name in the file against your staff. Pick the right person, or leave a name out. This only decides which rows are compared: nothing in CareStream is changed.</p>
      <div className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {m.rows.map(r => {
          const v = valueOf(r)
          const first = r.candidates.map(c => c.id)
          return (
            <div key={r.row} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_1.2fr]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-dark">{r.file_name}</p>
                <p className={`text-xs ${v === '' ? 'font-semibold text-amber-800' : 'text-neutral-mid'}`}>{v === '' ? (r.status === 'ambiguous' ? 'Needs you: more than one possible match' : 'Needs you: no match found') : v === 'skip' ? 'Left out' : r.status === 'matched' && !choice[String(r.row)] ? 'Matched' : 'Chosen by you'}{v && v !== 'skip' && (used.get(v) ?? 0) > 1 ? '. Two rows use this person.' : ''}</p>
              </div>
              <div>
                {v === 'skip'
                  ? <p className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 text-sm text-neutral-mid">Left out of the comparison <button type="button" className="text-xs font-semibold text-teal underline" onClick={() => setChoice(c => ({ ...c, [String(r.row)]: undefined as any }))}>Choose a person instead</button></p>
                  : <StaffSelect token={token} label={`Person for ${r.file_name}`} value={v || null} first={first} onChange={id => setChoice(c => ({ ...c, [String(r.row)]: id ?? (undefined as any) }))}
                      extra={<button type="button" className="mt-1.5 text-xs font-semibold text-neutral-mid underline hover:text-neutral-dark" onClick={() => setChoice(c => ({ ...c, [String(r.row)]: null }))}>Leave this name out</button>} />}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || open > 0} onClick={() => save(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} Confirm the match</button>
        <button type="button" disabled={busy} onClick={() => save(false)} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-dark hover:border-teal disabled:opacity-50">Save and finish later</button>
        <span className="text-xs text-neutral-mid">{open > 0 ? `${open} ${open === 1 ? 'name still needs' : 'names still need'} a choice.` : 'Every name has a choice.'}</span>
      </div>
    </div>
  )
}
