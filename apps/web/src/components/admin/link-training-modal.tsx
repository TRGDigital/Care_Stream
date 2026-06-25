'use client'

// Link an existing custom audit to the training module(s) it measures, so the
// Training Impact analytics can track audit scores against training completion.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { X, Loader2 } from 'lucide-react'

export function LinkTrainingModal({ token, template, onClose, onSaved }: {
  token: string
  template: { id: string; name: string; module_ids?: string[] }
  onClose: () => void
  onSaved: () => void
}) {
  const [modules, setModules] = useState<Array<{ id: string; name: string }>>([])
  const [ids, setIds] = useState<string[]>(template.module_ids ?? [])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    createApiClient(token).faceToFace.modules().then(d => setModules(d.modules)).catch(() => {})
  }, [token])

  async function save() {
    setSaving(true)
    try { await createApiClient(token).audits.updateTemplateModules(template.id, ids); onSaved(); onClose() }
    catch { setSaving(false) }
  }

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
        <p className="mb-3 text-xs text-neutral-mid">Pick the training module(s) this audit measures. <strong>Analytics → Training Impact</strong> then tracks whether completing that training improves this audit&apos;s scores over time.</p>
        {modules.length === 0 ? (
          <p className="text-sm text-neutral-mid">No training modules available to link.</p>
        ) : (
          <div className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
            {modules.map(m => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
                <input type="checkbox" checked={ids.includes(m.id)} onChange={() => setIds(x => x.includes(m.id) ? x.filter(y => y !== m.id) : [...x, m.id])} className="accent-teal" />
                <span className="text-neutral-dark">{m.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
