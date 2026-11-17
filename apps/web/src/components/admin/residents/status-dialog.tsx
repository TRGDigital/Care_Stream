'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Resident } from '@/lib/residents-api'
import { Dialog, Field, ErrorBox, inputCls, btnDanger, btnSecondary, errMsg, todayIso } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>

export function StatusDialog({ client, resident, onClose, onDone }: { client: Client; resident: Resident; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<'deceased' | 'left'>('deceased')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = resident.preferred_name || resident.first_name

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await client.setStatus(resident.id, { status, date: date || undefined, note: note.trim() || undefined })
      onDone()
    } catch (err) { setError(errMsg(err)); setBusy(false) }
  }

  return (
    <Dialog title={`Mark ${name} as died or moved on`} onClose={onClose} wide>
      <form onSubmit={go} className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
          <p className="mb-1 font-semibold">What happens when you confirm</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{name} disappears from the hub and from the assistant straight away.</li>
            <li>Any family links that are still open are cancelled.</li>
            <li>The profile moves to Archived and is kept for seven years unless you change it.</li>
            <li>Admins who have the resident archive permission are asked to action it.</li>
          </ul>
        </div>

        <fieldset>
          <legend className="mb-1 text-xs font-medium text-neutral-dark">What has happened</legend>
          <div className="space-y-2">
            {([['deceased', 'Passed away'], ['left', 'Moved on']] as const).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm text-neutral-dark">
                <input type="radio" name="rs-status" value={v} checked={status === v} onChange={() => setStatus(v)} className="h-4 w-4 accent-teal" /> {l}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={status === 'deceased' ? 'Date they passed away' : 'Date they moved on'} htmlFor="st-date">
          <input id="st-date" type="date" required max={todayIso()} className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)" htmlFor="st-note">
          <textarea id="st-note" rows={2} className={`${inputCls} resize-y`} value={note} onChange={e => setNote(e.target.value)} />
        </Field>

        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={btnDanger} disabled={busy || !date}>
            {busy && <Loader2 size={14} className="animate-spin" />} Confirm and archive
          </button>
        </div>
      </form>
    </Dialog>
  )
}
