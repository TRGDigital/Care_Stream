'use client'

// Reusable "Suggest a better translation" control for the staff hub. Shown to
// permitted staff on translated content (questions, lessons, CQC prep, induction).
// Each field is pre-filled with the current translation; changed ones are posted
// for admin approval (or applied immediately if the care setting auto-approves).

import { useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Languages, Loader2, Pencil, Check, X } from 'lucide-react'

export interface SuggestField {
  label: string
  source: string     // English source string (keys the override)
  current: string    // current translation (pre-fill)
  kind: string       // 'question' | 'option' | 'lesson' | 'answer' | 'feedback' | 'text'
  multiline?: boolean
}

// Inline "click to edit" for a single block of translated text (e.g. a lesson
// heading or paragraph). Reads normally; a permitted staff member can click it (or
// the pencil) to correct the wording in place. Falls back to plain text when the
// person can't suggest or the content isn't translated.
export function InlineEditableText({ token, langCode, contextLabel, source, current, kind, editable, className = '' }: {
  token: string
  langCode: string
  contextLabel: string
  source: string           // English source
  current: string          // current translation (what's shown)
  kind: string
  editable: boolean
  className?: string
}) {
  const canEdit = editable && !!source?.trim() && !!current?.trim() && !!langCode && langCode !== 'eng'
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(current)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'pending' | 'approved' | null>(null)
  const [err, setErr] = useState('')

  // Use only phrasing-content elements (span) so the control is valid inside a
  // <p>/<li> and never gets auto-closed. `block`/`flex` come from CSS, so the edit
  // panel still expands to the full width of its container.
  if (!canEdit) return <span className={className}>{current}</span>

  async function save() {
    if (!val.trim() || val.trim() === current) { setEditing(false); return }
    setBusy(true); setErr('')
    try {
      const r = await createApiClient(token).me.suggestTranslation({
        source_text: source, suggested_text: val.trim(), lang_code: langCode,
        machine_text: current, content_kind: kind, context_label: contextLabel,
      })
      setDone(r.status); setEditing(false)
    } catch (e: any) { setErr(e?.message ?? 'Could not send your suggestion.') }
    finally { setBusy(false) }
  }

  if (editing) {
    return (
      <span className="mt-1 block w-full min-w-0 flex-1 rounded-lg border border-teal/40 bg-teal-light/10 p-3 not-italic">
        <span className="mb-1.5 block text-[11px] font-semibold text-teal">Improve this translation</span>
        <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} rows={Math.min(12, Math.max(4, Math.ceil((val.length || 1) / 55)))}
          className="block w-full resize-y rounded border border-gray-200 px-3 py-2 text-sm leading-relaxed text-neutral-dark focus:border-teal focus:outline-none" />
        {err && <span className="mt-1 block text-[11px] text-red-600">{err}</span>}
        <span className="mt-2 flex items-center justify-end gap-2">
          <button type="button" onClick={() => { setEditing(false); setVal(current) }} className="inline-flex items-center gap-1 text-xs text-neutral-mid hover:text-neutral-dark"><X size={12} /> Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Send</button>
        </span>
      </span>
    )
  }

  return (
    <span className="group/edit">
      <span className={className}>{done ? val : current}</span>
      {done ? (
        <span className="ml-1.5 whitespace-nowrap text-[11px] font-medium text-teal">{done === 'approved' ? '✓ now live' : '✓ sent for approval'}</span>
      ) : (
        <button type="button" onClick={() => { setVal(current); setEditing(true) }} title="Suggest a better translation for this text"
          className="ml-1 inline-flex translate-y-0.5 items-center rounded p-0.5 text-neutral-mid/50 opacity-0 transition-opacity hover:text-teal group-hover/edit:opacity-100">
          <Pencil size={12} />
        </button>
      )}
    </span>
  )
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
    <div className="mt-2 w-full rounded-lg border border-teal/30 bg-teal-light/10 p-4">
      <p className="mb-2.5 text-xs font-semibold text-teal">Improve this translation</p>
      {usable.map((f, i) => (
        <div key={i} className="mb-3">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-mid">{f.label}</label>
          {f.multiline ? (
            <textarea value={vals[i]} onChange={e => setVals(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
              rows={Math.min(10, Math.max(3, Math.ceil(((vals[i] || '').length || 1) / 55)))}
              className="block w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed text-neutral-dark focus:border-teal focus:outline-none" />
          ) : (
            <input value={vals[i]} onChange={e => setVals(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
              className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none" />
          )}
        </div>
      ))}
      {err && <p className="mb-1.5 text-xs text-red-600">{err}</p>}
      <div className="mt-1 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-mid hover:text-neutral-dark">Cancel</button>
        <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-teal px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : null} Send</button>
      </div>
    </div>
  )
}
