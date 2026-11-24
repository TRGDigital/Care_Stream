'use client'

// Settings > My signature (administrators). The picture is mine alone: I can add, replace or delete it. An administrator can see WHO has a signature and remove one, but never see or use
// another person's picture.

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { signatures, useSignatureAvailable } from '@/lib/letterhead-client'
import { SignatureEditor } from '@/components/admin/signature-editor'
import { LockedBadge } from '@/components/admin/locked-badge'

export function SignatureSettingsBody({ token }: { token: string }) {
  const { meta, reload } = useSignatureAvailable()
  const [list, setList] = useState<Array<{ user_id: string; name: string; job_role: string | null; updated_at: string }> | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => { signatures.list(token).then(r => setList(r.signatures)).catch(() => setList([])) }, [token])
  useEffect(() => { load() }, [load, meta?.updated_at])

  async function removeFor(userId: string, name: string) {
    if (!window.confirm(`Remove ${name}'s signature? They can add a new one.`)) return
    setError('')
    try { await signatures.removeFor(token, userId); load() } catch (e: any) { setError(e?.message ?? 'Could not remove it.') }
  }
  if (!meta) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
  return (
    <div className="space-y-6">
      {meta.table_ready === false && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Signatures are not switched on yet.</p>}
      <SignatureEditor name={meta.name ?? ''} role={meta.job_role ?? ''} meta={meta} onChanged={() => { reload(); load() }} />
      <div className="space-y-2 border-t border-gray-100 pt-4">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-dark">Who has added a signature <LockedBadge variant="icon" managersToo /></p>
        <p className="text-xs text-neutral-mid">You can see who has one and remove it. You cannot see or use anyone else&apos;s signature picture.</p>
        {list === null ? <p className="text-sm text-neutral-mid">Loading</p> : list.length === 0 ? <p className="text-sm text-neutral-mid">Nobody has added one yet.</p> : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {list.map(x => (
              <li key={x.user_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span><strong className="font-medium">{x.name}</strong>{x.job_role ? <span className="text-neutral-mid">, {x.job_role}</span> : null} <span className="text-xs text-neutral-mid">added {new Date(x.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                <button type="button" onClick={() => removeFor(x.user_id, x.name)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 size={12} aria-hidden="true" /> Remove</button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      </div>
    </div>
  )
}
