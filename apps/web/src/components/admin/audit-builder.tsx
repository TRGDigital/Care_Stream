'use client'

// Build-your-own audit. A tenant names the audit and adds questions; each question
// has a free-text field plus the chosen response buttons (Yes/No/N/A by default).
// Saved as a tenant-owned AuditTemplate, which then appears in the staff "Access
// level" allocation list and in the allocated staff member's hub.

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Plus, Trash2, Loader2, X } from 'lucide-react'

type QType = 'yes_no_na' | 'yes_no' | 'findings'
type Q = { text: string; type: QType }

const TYPE_OPTIONS: { value: QType; label: string }[] = [
  { value: 'yes_no_na', label: 'Yes / No / N/A + notes' },
  { value: 'yes_no',    label: 'Yes / No + notes' },
  { value: 'findings',  label: 'Free-text findings only' },
]
const FREQS = ['periodic', 'daily', 'weekly', 'monthly', 'quarterly']

export function AuditBuilder({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName]           = useState('')
  const [frequency, setFrequency] = useState('periodic')
  const [description, setDesc]    = useState('')
  const [questions, setQuestions] = useState<Q[]>([{ text: '', type: 'yes_no_na' }])
  const [modules, setModules]     = useState<Array<{ id: string; name: string }>>([])
  const [moduleIds, setModuleIds] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    createApiClient(token).faceToFace.modules().then(d => setModules(d.modules)).catch(() => {})
  }, [token])

  function setQ(i: number, patch: Partial<Q>) {
    setQuestions(qs => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)))
  }
  function addQ()       { setQuestions(qs => [...qs, { text: '', type: 'yes_no_na' }]) }
  function removeQ(i: number) { setQuestions(qs => qs.filter((_, j) => j !== i)) }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Give the audit a name.'); return }
    const cleaned = questions.filter(q => q.text.trim())
    if (cleaned.length === 0) { setError('Add at least one question.'); return }
    setSaving(true)
    try {
      await createApiClient(token).audits.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        frequency,
        module_ids: moduleIds,
        questions: cleaned.map(q => ({ text: q.text.trim(), type: q.type })),
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Could not create the audit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">Build your own audit</h2>
            <p className="mt-0.5 text-sm text-neutral-mid">Name it and add your questions. Each question gives the auditor the response buttons plus a notes field in the hub.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kitchen hygiene check" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">How often</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm capitalize focus:border-teal focus:outline-none">
              {FREQS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Description (optional)</label>
          <input value={description} onChange={e => setDesc(e.target.value)} placeholder="What this audit covers" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Linked training (optional)</label>
          <p className="mb-2 text-xs text-neutral-mid">Pick the training module(s) this audit measures. CareStream then tracks whether completing that training improves this audit&apos;s scores over time (Analytics → Training Impact).</p>
          {modules.length === 0 ? (
            <p className="text-xs text-neutral-mid">No training modules available to link yet.</p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
              {modules.map(m => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
                  <input type="checkbox" checked={moduleIds.includes(m.id)} onChange={() => setModuleIds(ids => ids.includes(m.id) ? ids.filter(x => x !== m.id) : [...ids, m.id])} className="accent-teal" />
                  <span className="text-neutral-dark">{m.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-neutral-dark">Questions</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-100 bg-neutral-light/40 p-2.5">
                <span className="mt-2 w-5 shrink-0 text-center text-xs font-semibold text-neutral-mid">{i + 1}</span>
                <input
                  value={q.text}
                  onChange={e => setQ(i, { text: e.target.value })}
                  placeholder="Type the question, e.g. Are all surfaces clean and sanitised?"
                  className="min-w-[12rem] flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
                />
                <select value={q.type} onChange={e => setQ(i, { type: e.target.value as QType })} className="rounded-md border border-gray-200 px-2 py-2 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => removeQ(i)} disabled={questions.length === 1} aria-label="Remove question" className="mt-1.5 shrink-0 rounded p-1 text-neutral-mid hover:text-red-500 disabled:opacity-30"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button onClick={addQ} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"><Plus size={14} /> Add question</button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create audit'}
          </button>
        </div>
      </div>
    </div>
  )
}
