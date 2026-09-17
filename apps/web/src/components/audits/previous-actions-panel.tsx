'use client'

// At the next audit of the same kind, the previous audit's actions to check: is each one still fixed?
// "Not fixed" reopens the action and tells the person it was assigned to.

import { useEffect, useState } from 'react'
import { createApiClient, type PreviousAuditAction } from '@/lib/api-client'
import { AuthedImage } from '@/components/authed-image'
import { History, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function PreviousActionsPanel({ token, runId, readOnly }: { token: string; runId: string; readOnly?: boolean }) {
  const [data, setData] = useState<{ previous_run: any; actions: PreviousAuditAction[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const api = createApiClient(token)

  useEffect(() => { api.audits.previousActions(runId).then(setData).catch(() => {}) }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(a: PreviousAuditAction, result: 'fixed' | 'not_fixed') {
    setBusy(a.id); setError('')
    try { setData(await api.audits.verifyAction(a.id, runId, result, notes[a.id]?.trim() || undefined)) }
    catch (e: any) { setError(e?.message ?? 'Could not save the check.') } finally { setBusy(null) }
  }

  if (!data?.previous_run || !data.actions.length) return null
  const checked = data.actions.filter(a => a.verified_result).length

  return (
    <div className="mb-6 rounded-card border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><History size={15} className="text-indigo-600" /> Actions from the last audit</h2>
        <span className="text-xs text-neutral-mid">{checked} of {data.actions.length} checked</span>
      </div>
      <p className="mb-3 text-xs text-neutral-mid">
        From the audit completed {fmt(data.previous_run.completed_at)}. Check each one is still fixed. &ldquo;Not fixed&rdquo; reopens the action for the person it was assigned to.
      </p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <ul className="space-y-2">
        {data.actions.map(a => (
          <li key={a.id} className={clsx('rounded-lg border bg-white p-3', a.verified_result === 'not_fixed' ? 'border-rose-200' : a.verified_result === 'fixed' ? 'border-green-200' : 'border-gray-100')}>
            <p className="text-sm text-neutral-dark">{a.description}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">
              {a.external_name || a.assigned_to || 'Unassigned'}
              {a.status === 'done' ? ` · done${a.done_at ? ` ${fmt(a.done_at)}` : ''}` : ` · ${a.status === 'in_progress' ? 'in progress' : 'still open'}`}
            </p>
            {a.completion_note && <p className="mt-1 rounded bg-neutral-light/60 px-2 py-1 text-xs text-neutral-dark"><span className="text-neutral-mid">What was done: </span>{a.completion_note}</p>}
            {a.evidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.evidence.map(ev => (
                  <AuthedImage key={ev.id} id={ev.id} load={() => api.audits.actionEvidenceBlob(ev.id)} alt={ev.file_name}
                    onClick={() => api.audits.actionEvidenceBlob(ev.id).then(b => window.open(URL.createObjectURL(b), '_blank', 'noopener')).catch(() => {})}
                    className="h-14 w-14 cursor-pointer rounded object-cover ring-1 ring-gray-200" />
                ))}
              </div>
            )}
            {a.verified_result ? (
              <p className={clsx('mt-2 text-xs font-medium', a.verified_result === 'fixed' ? 'text-green-700' : 'text-rose-700')}>
                {a.verified_result === 'fixed' ? 'Checked: still fixed' : 'Checked: not fixed, reopened'}{a.verified_by ? ` by ${a.verified_by}` : ''}{a.verify_note ? `. ${a.verify_note}` : ''}
              </p>
            ) : !readOnly && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input value={notes[a.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))} placeholder="Note (optional)"
                  className="min-w-[10rem] flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
                <button onClick={() => verify(a, 'fixed')} disabled={busy === a.id} className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  {busy === a.id ? <Loader2 size={12} className="animate-spin" /> : 'Still fixed'}
                </button>
                <button onClick={() => verify(a, 'not_fixed')} disabled={busy === a.id} className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Not fixed</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
