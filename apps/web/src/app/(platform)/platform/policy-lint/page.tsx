'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type PolicyLintSignal } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react'

const CATEGORIES = [
  { value: 'superseded_framework',   label: 'Superseded framework / standard' },
  { value: 'superseded_legislation', label: 'Superseded legislation' },
  { value: 'superseded_body',        label: 'Superseded body / regulator' },
  { value: 'time_bound',             label: 'Time-bound (e.g. COVID-19)' },
  { value: 'placeholder',            label: 'Placeholder / template token' },
]
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))
const SEVERITIES = ['high', 'medium', 'low']
const SEV_STYLE: Record<string, string> = {
  high:   'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-slate-100 text-slate-600 border-slate-200',
}

export default function PolicyLintSignalsPage() {
  const token = usePlatformAuth()
  const [signals, setSignals] = useState<PolicyLintSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PolicyLintSignal | 'new' | null>(null)

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).policyLintSignals.list()
      .then(r => setSignals(r.signals))
      .catch(e => setError(e.message ?? 'Could not load.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const m = new Map<string, PolicyLintSignal[]>()
    for (const s of signals) { if (!m.has(s.category)) m.set(s.category, []); m.get(s.category)!.push(s) }
    // Known categories first (in display order), then any custom category.
    const order = [...CATEGORIES.map(c => c.value), ...[...m.keys()].filter(k => !CAT_LABEL[k])]
    return order.filter(c => m.has(c)).map(c => ({ c, items: m.get(c)!.sort((a, b) => a.sort_order - b.sort_order) }))
  }, [signals])

  async function remove(s: PolicyLintSignal) {
    if (!token || !confirm(`Delete "${s.label}"? Tenants will no longer be flagged for this.`)) return
    try { await createPlatformClient(token).policyLintSignals.delete(s.id); load() }
    catch (e: any) { setError(e.message ?? 'Could not delete.') }
  }

  const active = signals.filter(s => s.is_active).length

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Policy Stale Signals</h1>
            <p className="mt-1 text-sm text-neutral-mid">{active} active of {signals.length} · the deterministic (no-AI) catalogue that flags out-of-date policy content on tenants&rsquo; Policy Gap Detection page</p>
          </div>
          <button onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
            <Plus size={14} /> Add signal
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          <strong className="text-neutral-dark">How matching works.</strong> A signal fires if its <em>phrase</em> (matched case-insensitively) or any of its <em>acronyms</em> (matched case-sensitively as whole words, so &ldquo;LINks&rdquo; never matches the ordinary word &ldquo;links&rdquo;) appears in a policy. Structural checks (thin content, missing purpose/scope) and review-date currency are built in and not edited here.
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : (
          grouped.map(g => (
            <section key={g.c}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-mid">{CAT_LABEL[g.c] ?? g.c} <span className="font-normal text-gray-400">· {g.items.length}</span></h2>
              <div className="space-y-2">
                {g.items.map(s => (
                  <SignalRow key={s.id} s={s} onEdit={() => setEditing(s)} onDelete={() => remove(s)} />
                ))}
              </div>
            </section>
          ))
        )}

        {!loading && signals.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-neutral-mid">No signals yet. Add the first one.</div>
        )}

        {editing && token && (
          <EditModal signal={editing} token={token} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
        )}
      </div>
    </PlatformShell>
  )
}

function SignalRow({ s, onEdit, onDelete }: { s: PolicyLintSignal; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start gap-2 px-4 py-3">
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="mt-0.5 shrink-0 rounded p-0.5 text-neutral-mid hover:text-teal" title={open ? 'Collapse' : 'Expand'}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button onClick={() => setOpen(o => !o)} className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark">
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEV_STYLE[s.severity] ?? SEV_STYLE.low}`}>{s.severity}</span>
            {s.label}
            {!s.is_active && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-mid">Inactive</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-neutral-mid">
            {s.phrase_source && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">/{s.phrase_source}/i</span>}
            {s.acronyms.map(a => <span key={a} className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-indigo-700">{a}</span>)}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} title="Edit" className="rounded p-1.5 text-neutral-mid hover:bg-teal/10 hover:text-teal"><Pencil size={15} /></button>
          <button onClick={onDelete} title="Delete" className="rounded p-1.5 text-neutral-mid hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
        </div>
      </div>
      {open && (
        <div className="space-y-3 border-t border-gray-100 bg-neutral-light/20 px-4 py-4 text-sm">
          {s.detail && <p className="text-neutral-dark">{s.detail}</p>}
          {s.superseded_by && <p className="text-neutral-mid">Replace with: <span className="font-medium text-neutral-dark">{s.superseded_by}</span></p>}
          <p className="text-[11px] text-gray-400">Key: <span className="font-mono">{s.signal_key}</span></p>
          <div className="pt-1"><button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10"><Pencil size={13} /> Edit this signal</button></div>
        </div>
      )}
    </div>
  )
}

function EditModal({ signal, token, onClose, onSaved }: {
  signal: PolicyLintSignal | 'new'; token: string; onClose: () => void; onSaved: () => void
}) {
  const isNew = signal === 'new'
  const s = isNew ? null : signal
  const [label, setLabel]         = useState(s?.label ?? '')
  const [category, setCategory]   = useState(s?.category ?? 'superseded_legislation')
  const [severity, setSeverity]   = useState(s?.severity ?? 'medium')
  const [detail, setDetail]       = useState(s?.detail ?? '')
  const [phrase, setPhrase]       = useState(s?.phrase_source ?? '')
  const [acronyms, setAcronyms]   = useState((s?.acronyms ?? []).join(', '))
  const [supersededBy, setSupersededBy] = useState(s?.superseded_by ?? '')
  const [active, setActive]       = useState(s?.is_active ?? true)
  const [busy, setBusy]           = useState(false)
  const [err, setErr]             = useState('')

  const acronymList = acronyms.split(/[,\n]/).map(x => x.trim()).filter(Boolean)

  // Live regex validity feedback.
  const phraseValid = useMemo(() => {
    if (!phrase.trim()) return null
    try { new RegExp(phrase, 'i'); return true } catch { return false }
  }, [phrase])

  async function save() {
    if (!label.trim()) { setErr('A label is required.'); return }
    if (phrase.trim() && phraseValid === false) { setErr('The phrase is not a valid regular expression.'); return }
    if (!phrase.trim() && acronymList.length === 0) { setErr('Give a phrase, one or more acronyms, or both.'); return }
    setBusy(true); setErr('')
    const payload = {
      label: label.trim(), category, severity, detail: detail.trim(),
      phrase_source: phrase.trim() || null, acronyms: acronymList,
      superseded_by: supersededBy.trim() || null, is_active: active,
    }
    try {
      const api = createPlatformClient(token).policyLintSignals
      if (isNew) await api.create(payload); else await api.update((s as PolicyLintSignal).id, payload)
      onSaved()
    } catch (e: any) { setErr(e.message ?? 'Could not save.') } finally { setBusy(false) }
  }

  const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-dark">{isNew ? 'Add stale signal' : `Edit · ${s?.label}`}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-mid hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
          {err && <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

          <label className="block"><span className={LABEL}>Label <span className="font-normal normal-case text-gray-400">· what the admin sees</span></span>
            <input value={label} onChange={e => setLabel(e.target.value)} className={INPUT} placeholder="e.g. Refers to CQC Key Lines of Enquiry (KLOEs)" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className={LABEL}>Category</span>
              <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="block"><span className={LABEL}>Severity</span>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className={INPUT}>
                {SEVERITIES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className={LABEL}>Phrase pattern <span className="font-normal normal-case text-gray-400">· regular expression, case-insensitive</span></span>
            <input value={phrase} onChange={e => setPhrase(e.target.value)} className={`${INPUT} font-mono ${phraseValid === false ? 'border-rose-400' : ''}`} placeholder="e.g. key lines? of enquiry" />
            {phraseValid === false && <span className="mt-1 block text-xs text-rose-600">Not a valid regular expression.</span>}
            {phraseValid === true && <span className="mt-1 block text-xs text-green-600">Valid pattern.</span>}
          </label>

          <label className="mt-4 block">
            <span className={LABEL}>Acronyms <span className="font-normal normal-case text-gray-400">· comma-separated, matched CASE-SENSITIVELY as whole words</span></span>
            <input value={acronyms} onChange={e => setAcronyms(e.target.value)} className={`${INPUT} font-mono`} placeholder="e.g. KLOE, KLOEs" />
            <span className="mt-1 block text-xs text-neutral-mid">Use exact capitalisation. &ldquo;CCG&rdquo; matches, &ldquo;ccg&rdquo; does not.</span>
          </label>

          <label className="mt-4 block"><span className={LABEL}>Replace with <span className="font-normal normal-case text-gray-400">· the current term (pre-fills the one-click fix)</span></span>
            <input value={supersededBy} onChange={e => setSupersededBy(e.target.value)} className={INPUT} placeholder="e.g. CQC Single Assessment Framework (quality statements)" />
          </label>

          <label className="mt-4 block"><span className={LABEL}>Why it matters <span className="font-normal normal-case text-gray-400">· shown to the tenant</span></span>
            <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} className={INPUT} />
          </label>

          <label className="mt-4 flex items-center gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-teal" /> Active (scanned for tenants)
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-dark hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
            {busy ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  )
}
