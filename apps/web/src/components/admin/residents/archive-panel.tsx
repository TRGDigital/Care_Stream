'use client'

import { useState } from 'react'
import { Check, Circle, Download, Loader2, Trash2 } from 'lucide-react'
import type { Resident } from '@/lib/residents-api'
import { Dialog, Field, ErrorBox, inputCls, btnPrimary, btnSecondary, btnDanger, errMsg, fmtDate, todayIso } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>

function StepHead({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark">
      {done ? <Check size={16} className="text-green-600" aria-label="Done" /> : <Circle size={16} className="text-gray-300" aria-label="Not done" />}
      Step {n}: {title}
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${done ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{done ? 'Done' : 'To do'}</span>
    </h4>
  )
}

export function ArchivePanel({ client, resident, retentionYears, onChanged, onDeleted }: {
  client: Client; resident: Resident; retentionYears: number; onChanged: () => void; onDeleted: () => void
}) {
  const a = resident.archive
  const [memory, setMemory] = useState<'shared' | 'declined'>(a && a.memory_book !== 'undecided' ? a.memory_book : 'shared')
  const [note, setNote] = useState(a?.note ?? '')
  const [removeEmails, setRemoveEmails] = useState(false)
  const [retention, setRetention] = useState(resident.retention_until ?? '')
  const [exported, setExported] = useState(false)
  const [retentionSet, setRetentionSet] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [delOpen, setDelOpen] = useState(false)

  const confirmed = !!a?.confirmed_at
  const inFuture = !!resident.retention_until && resident.retention_until > todayIso()

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key); setError(''); setNotice('')
    try { await fn(); setNotice(ok); onChanged() } catch (e) { setError(errMsg(e)) } finally { setBusy(null) }
  }

  async function exportText() {
    setBusy('export'); setError(''); setNotice('')
    try {
      const { filename, text } = await client.exportText(resident.id)
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
      const el = document.createElement('a')
      el.href = url; el.download = filename || 'resident-profile.txt'
      document.body.appendChild(el); el.click(); el.remove()
      URL.revokeObjectURL(url)
      setExported(true); setNotice('Text copy downloaded.')
    } catch (e) { setError(errMsg(e)) } finally { setBusy(null) }
  }

  return (
    <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-4" aria-label="Archive task">
      <div>
        <h3 className="text-base font-semibold text-neutral-dark">Archive task</h3>
        <p className="text-sm text-neutral-mid">
          Kept until {resident.retention_until ? fmtDate(resident.retention_until) : `${retentionYears} years after archiving`} (default is {retentionYears} years).
        </p>
        {a && a.assignee_emails.length > 0 && <p className="text-xs text-neutral-mid">Asked to action: {a.assignee_emails.join(', ')}</p>}
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      <p role="status" aria-live="polite" className="text-sm text-green-700">{notice}</p>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <StepHead n={1} title="Confirm the archive" done={confirmed} />
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-neutral-dark">Memory book</legend>
          {([['shared', 'It was shared with the family'], ['declined', 'The family declined it']] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm text-neutral-dark">
              <input type="radio" name={`mb-${resident.id}`} checked={memory === v} onChange={() => setMemory(v)} className="h-4 w-4 accent-teal" /> {l}
            </label>
          ))}
        </fieldset>
        <Field label="Note (optional)" htmlFor={`an-${resident.id}`}><textarea id={`an-${resident.id}`} rows={2} className={`${inputCls} resize-y`} value={note} onChange={e => setNote(e.target.value)} /></Field>
        <label className="flex items-start gap-2 text-sm text-neutral-dark">
          <input type="checkbox" checked={removeEmails} onChange={e => setRemoveEmails(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal" disabled={!!a?.family_contacts_removed_at} />
          {a?.family_contacts_removed_at ? `Family email addresses removed ${fmtDate(a.family_contacts_removed_at)}` : 'Remove the family email addresses now'}
        </label>
        <button type="button" className={btnPrimary} disabled={busy !== null}
          onClick={() => run('confirm', () => client.confirmArchive(resident.id, { memory_book: memory, note: note.trim() || undefined, remove_family_contacts: removeEmails }), 'Archive confirmed.')}>
          {busy === 'confirm' && <Loader2 size={14} className="animate-spin" />} {confirmed ? 'Update confirmation' : 'Confirm the archive'}
        </button>
        {confirmed && <p className="text-xs text-neutral-mid">Confirmed {fmtDate(a!.confirmed_at)}{a!.confirmed_by ? ` by ${a!.confirmed_by}` : ''}.</p>}
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <StepHead n={2} title="Export a plain text copy" done={exported} />
        <p className="text-sm text-neutral-mid">A text file of the profile, for a memory book or the record. Each export is logged.</p>
        <button type="button" className={btnSecondary} disabled={busy !== null} onClick={exportText}>
          {busy === 'export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download text copy
        </button>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <StepHead n={3} title="Retention date" done={retentionSet} />
        <p className="text-sm text-neutral-mid">The default is {retentionYears} years after archiving. Change it only if your policy says otherwise.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Keep until" htmlFor={`rt-${resident.id}`}><input id={`rt-${resident.id}`} type="date" className={inputCls} value={retention} onChange={e => setRetention(e.target.value)} /></Field>
          <button type="button" className={btnSecondary} disabled={busy !== null || !retention}
            onClick={() => run('retention', async () => { await client.setRetention(resident.id, retention); setRetentionSet(true) }, 'Retention date saved.')}>
            {busy === 'retention' && <Loader2 size={14} className="animate-spin" />} Save date
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
        <StepHead n={4} title="Delete permanently" done={false} />
        <p className="text-sm text-red-900">This removes the whole profile for good. It cannot be undone.{inFuture ? ` The retention date (${fmtDate(resident.retention_until)}) has not passed yet.` : ''}</p>
        <button type="button" className={btnDanger} disabled={busy !== null} onClick={() => setDelOpen(true)}><Trash2 size={14} /> Delete permanently</button>
      </div>

      {delOpen && <DeleteDialog client={client} resident={resident} needReason={inFuture} onClose={() => setDelOpen(false)} onDeleted={onDeleted} />}
    </section>
  )
}

function DeleteDialog({ client, resident, needReason, onClose, onDeleted }: { client: Client; resident: Resident; needReason: boolean; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const full = `${resident.first_name} ${resident.last_name}`
  const ok = typed.trim().toLowerCase() === full.toLowerCase() && (!needReason || reason.trim().length >= 5)

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try { await client.deleteArchived(resident.id, { confirm: true, reason: reason.trim() || undefined }); onDeleted() }
    catch (err) { setError(errMsg(err)); setBusy(false) }
  }
  return (
    <Dialog title="Delete this profile permanently?" onClose={onClose}>
      <form onSubmit={go} className="space-y-4">
        <p className="text-sm text-red-900">You are about to delete the profile for <strong>{full}</strong>, including every family answer. This cannot be undone. Export a text copy first if you may need it.</p>
        {needReason && (
          <div>
            <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">The retention date ({fmtDate(resident.retention_until)}) has not passed. Deleting early needs a reason, which is recorded.</p>
            <Field label="Reason for deleting early" htmlFor="del-reason"><textarea id="del-reason" rows={2} required className={`${inputCls} resize-y`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          </div>
        )}
        <Field label={`Type ${full} to confirm`} htmlFor="del-typed"><input id="del-typed" className={inputCls} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" /></Field>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={btnDanger} disabled={!ok || busy}>{busy && <Loader2 size={14} className="animate-spin" />} Delete permanently</button>
        </div>
      </form>
    </Dialog>
  )
}

export function ArchiveAccessSettings({ client }: { client: Client }) {
  const [open, setOpen] = useState(false)
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string; has_access: boolean }> | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && !admins) {
      setBusy(true); setError('')
      try {
        const r = await client.archiveAccess.get()
        setAdmins(r.admins); setSel(new Set(r.admins.filter(a => a.has_access).map(a => a.id)))
      } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
    }
  }
  async function save() {
    setBusy(true); setError(''); setNotice('')
    try { await client.archiveAccess.set([...sel]); setNotice('Saved.') } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }
  return (
    <div className="border-t border-gray-200 p-3 text-sm">
      <button type="button" onClick={toggle} aria-expanded={open} className="font-medium text-teal hover:underline">Who can action archives</button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-neutral-mid">These admins are asked to action an archive and can export or delete archived profiles.</p>
          {busy && !admins && <Loader2 size={16} className="animate-spin text-neutral-mid" />}
          {error && <ErrorBox>{error}</ErrorBox>}
          {admins?.map(a => (
            <label key={a.id} className="flex items-start gap-2 text-neutral-dark">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal" checked={sel.has(a.id)}
                onChange={e => setSel(s => { const n = new Set(s); e.target.checked ? n.add(a.id) : n.delete(a.id); return n })} />
              <span className="min-w-0 break-words">{a.name} <span className="text-xs text-neutral-mid">{a.email}</span></span>
            </label>
          ))}
          {admins && <button type="button" className={btnPrimary} onClick={save} disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />} Save</button>}
          <p role="status" aria-live="polite" className="text-xs text-green-700">{notice}</p>
        </div>
      )}
    </div>
  )
}
