'use client'

// Reusable "Suggest a better translation" control for the staff hub. Shown to
// permitted staff on translated content (questions, lessons, CQC prep, induction).
// Each field is pre-filled with the current translation; changed ones are posted
// for admin approval (or applied immediately if the care setting auto-approves).

import { useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Languages, Loader2 } from 'lucide-react'

export interface SuggestField {
  label: string
  source: string     // English source string (keys the override)
  current: string    // current translation (pre-fill)
  kind: string       // 'question' | 'option' | 'lesson' | 'answer' | 'feedback' | 'text'
  multiline?: boolean
}

export function SuggestTranslation({ token, langCode, contextLabel, fields }: {
  token: string
  langCode: string
  contextLabel: string
  fields: SuggestField[]
}) {
  const usable = fields.filter(f => f.source && f.source.trim())
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState<string[]>(usable.map(f => f.current))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'pending' | 'approved' | null>(null)
  const [err, setErr]   = useState('')

  if (!usable.length || !langCode || langCode === 'eng') return null

  async function submit() {
    setBusy(true); setErr('')
    const api = createApiClient(token)
    const jobs = usable
      .map((f, i) => ({ f, v: vals[i] }))
      .filter(({ f, v }) => v.trim() && v.trim() !== f.current)
      .map(({ f, v }) => api.me.suggestTranslation({
        source_text: f.source, suggested_text: v.trim(), lang_code: langCode,
        machine_text: f.current, content_kind: f.kind, context_label: contextLabel,
      }))
    if (!jobs.length) { setOpen(false); setBusy(false); return }
    try {
      const results = await Promise.all(jobs)
      setDone(results.some(r => r.status === 'approved') ? 'approved' : 'pending')
      setOpen(false)
    } catch (e: any) { setErr(e?.message ?? 'Could not send your suggestion.') }
    finally { setBusy(false) }
  }

  if (done) {
    return <p className="mt-2 text-[11px] font-medium text-teal">{done === 'approved' ? '✓ Thanks — your improved translation is now live.' : '✓ Thanks — your suggestion was sent for approval.'}</p>
  }
  if (!open) {
    return (
      <button type="button" onClick={() => { setVals(usable.map(f => f.current)); setOpen(true) }} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-neutral-mid hover:text-teal">
        <Languages size={11} /> Suggest a better translation
      </button>
    )
  }
  return (
    <div className="mt-2 rounded-lg border border-teal/30 bg-teal-light/10 p-3">
      <p className="mb-1.5 text-[11px] font-semibold text-teal">Improve this translation</p>
      {usable.map((f, i) => (
        <div key={i} className="mb-2">
          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-neutral-mid">{f.label}</label>
          {f.multiline ? (
            <textarea value={vals[i]} onChange={e => setVals(prev => prev.map((x, xi) => xi === i ? e.target.value : x))} rows={3} className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
          ) : (
            <input value={vals[i]} onChange={e => setVals(prev => prev.map((x, xi) => xi === i ? e.target.value : x))} className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
          )}
        </div>
      ))}
      {err && <p className="mb-1 text-[11px] text-red-600">{err}</p>}
      <div className="mt-1 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-neutral-mid hover:text-neutral-dark">Cancel</button>
        <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1 text-[11px] font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{busy ? <Loader2 size={11} className="animate-spin" /> : null} Send</button>
      </div>
    </div>
  )
}
