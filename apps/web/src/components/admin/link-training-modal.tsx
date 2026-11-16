'use client'

// Link an audit (a built-in one or the home's own) to training: the free CPD courses and/or the home's own
// training. A completed audit then offers those courses to assign. On every plan.

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCachedQuery } from '@/lib/use-cached-query'
import { createApiClient } from '@/lib/api-client'
import { trainingForAudit } from '@/lib/audit-training'
import { X, Loader2 } from 'lucide-react'

type Opts = { cpd: Array<{ ref: string; slug: string; title: string }>; own: Array<{ ref: string; title: string }> }

export function LinkTrainingModal({ token, template, current, onClose, onSaved }: {
  token: string
  template: { id: string; name: string }
  current: string[]
  onClose: () => void
  onSaved: (refs: string[]) => void
}) {
  const { data: session } = useSession()
  const uid = session?.user?.email ?? 'guest'
  const oq = useCachedQuery<Opts>(`admin-audit-training-links-${uid}`, async () => (await createApiClient(token).audits.trainingLinks()).options)
  const opts = oq.data ?? null
  const [refs, setRefs] = useState<string[]>(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const suggested = new Set(trainingForAudit(template.name).map(c => `cpd:${c.slug}`))

  const toggle = (ref: string) => setRefs(x => x.includes(ref) ? x.filter(y => y !== ref) : [...x, ref])

  async function save() {
    setSaving(true); setError('')
    try { const r = await createApiClient(token).audits.setTrainingLinks(template.id, refs); onSaved(r.refs); onClose() }
    catch { setSaving(false); setError('Could not save. Please try again.') }
  }

  const row = (ref: string, title: string, tag?: string) => (
    <label key={ref} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
      <input type="checkbox" checked={refs.includes(ref)} onChange={() => toggle(ref)} className="accent-teal" />
      <span className="text-neutral-dark">{title}</span>
      {tag && <span className="ml-auto rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">{tag}</span>}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">Linked training</h2>
            <p className="text-sm text-neutral-mid">{template.name}</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <p className="mb-3 text-xs text-neutral-mid">
          Choose the training that supports this audit. When an audit is completed, these courses are offered to assign to your team.
          {refs.length === 0 && suggested.size > 0 ? ' With nothing chosen, we suggest the courses marked Suggested.' : ''}
        </p>
        {!opts ? (
          <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-neutral-mid" /></div>
        ) : (
          <div className="mb-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-100 p-2">
            <div>
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-mid">Free CPD certified courses</p>
              {opts.cpd.map(c => row(c.ref, c.title, suggested.has(c.ref) ? 'Suggested' : undefined))}
            </div>
            {opts.own.length > 0 && (
              <div>
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-mid">Your own training</p>
                {opts.own.map(m => row(m.ref, m.title))}
              </div>
            )}
          </div>
        )}
        {(error || (!opts && oq.error)) && <p className="mb-3 text-sm text-red-600">{error || 'Could not load the training list.'}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Cancel</button>
          <button onClick={save} disabled={saving || !opts} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
