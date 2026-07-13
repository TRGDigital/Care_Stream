'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type QualityStatement, type Regulation } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'

const KEY_QUESTIONS = [
  { value: 'safe',       label: 'Safe' },
  { value: 'effective',  label: 'Effective' },
  { value: 'caring',     label: 'Caring' },
  { value: 'responsive', label: 'Responsive' },
  { value: 'well-led',   label: 'Well-led' },
]
const KQ_LABEL: Record<string, string> = Object.fromEntries(KEY_QUESTIONS.map(k => [k.value, k.label]))

const SETTINGS = ['residential-care', 'nursing-homes', 'domiciliary-care', 'live-in-care', 'complex-care', 'supported-living', 'dental-practices', 'gp-practices']

export default function QualityStatementsPage() {
  const token = usePlatformAuth()
  const [statements, setStatements] = useState<QualityStatement[]>([])
  const [regs, setRegs] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<QualityStatement | 'new' | null>(null)

  function load() {
    if (!token) return
    setLoading(true)
    const api = createPlatformClient(token)
    Promise.all([api.qualityStatements.list(), api.regulations.list()])
      .then(([qs, r]) => { setStatements(qs.statements); setRegs(r.regulations) })
      .catch(e => setError(e.message ?? 'Could not load.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const regName = useMemo(() => Object.fromEntries(regs.map(r => [r.reference_key, r.official_name])) as Record<string, string>, [regs])
  const grouped = useMemo(() => {
    const m = new Map<string, QualityStatement[]>()
    for (const s of statements) { if (!m.has(s.key_question)) m.set(s.key_question, []); m.get(s.key_question)!.push(s) }
    return KEY_QUESTIONS.map(k => k.value).filter(q => m.has(q)).map(q => ({ q, items: m.get(q)!.sort((a, b) => a.number - b.number) }))
  }, [statements])

  async function remove(s: QualityStatement) {
    if (!token || !confirm(`Delete "${s.name}"? This removes it from the SAF library.`)) return
    try { await createPlatformClient(token).qualityStatements.delete(s.id); load() }
    catch (e: any) { setError(e.message ?? 'Could not delete.') }
  }

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">CQC Quality Statements</h1>
            <p className="mt-1 text-sm text-neutral-mid">{statements.length} of 34 · the SAF library that drives coverage inheritance and wording alignment</p>
          </div>
          <button onClick={() => setEditing('new')} className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
            <Plus size={14} /> Add statement
          </button>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : (
          grouped.map(g => (
            <section key={g.q}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-mid">{KQ_LABEL[g.q]} <span className="font-normal text-gray-400">· {g.items.length}</span></h2>
              <div className="space-y-2">
                {g.items.map(s => (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-dark"><span className="mr-1.5 text-xs font-bold tabular-nums text-neutral-mid">{s.number}</span>{s.name}{!s.is_active && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-mid">Inactive</span>}</p>
                        {s.we_statement && <p className="mt-0.5 line-clamp-2 text-xs italic text-neutral-mid">&ldquo;{s.we_statement}&rdquo;</p>}
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-neutral-mid">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">{s.expectation_cues.length} cues</span>
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{s.linked_regulations.length} regulations</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">{s.expected_policies.length} policies</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setEditing(s)} title="Edit" className="rounded p-1.5 text-neutral-mid hover:bg-teal/10 hover:text-teal"><Pencil size={15} /></button>
                        <button onClick={() => remove(s)} title="Delete" className="rounded p-1.5 text-neutral-mid hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {!loading && statements.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-neutral-mid">No quality statements yet. Add the first one.</div>
        )}

        {editing && token && (
          <EditModal statement={editing} regs={regs} regName={regName} token={token} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
        )}
      </div>
    </PlatformShell>
  )
}

function EditModal({ statement, regs, regName, token, onClose, onSaved }: {
  statement: QualityStatement | 'new'; regs: Regulation[]; regName: Record<string, string>; token: string; onClose: () => void; onSaved: () => void
}) {
  const isNew = statement === 'new'
  const s = isNew ? null : statement
  const [keyQuestion, setKeyQuestion] = useState(s?.key_question ?? 'safe')
  const [number, setNumber]           = useState(String(s?.number ?? ''))
  const [refKey, setRefKey]           = useState(s?.reference_key ?? '')
  const [name, setName]               = useState(s?.name ?? '')
  const [weStatement, setWeStatement] = useState(s?.we_statement ?? '')
  const [cues, setCues]               = useState((s?.expectation_cues ?? []).join('\n'))
  const [policies, setPolicies]       = useState((s?.expected_policies ?? []).join('\n'))
  const [linked, setLinked]           = useState<string[]>(s?.linked_regulations ?? [])
  const [settings, setSettings]       = useState<string[]>(s?.applies_to_settings ?? [])
  const [active, setActive]           = useState(s?.is_active ?? true)
  const [regSearch, setRegSearch]     = useState('')
  const [busy, setBusy]               = useState(false)
  const [err, setErr]                 = useState('')

  const matches = useMemo(() => {
    const q = regSearch.trim().toLowerCase()
    if (!q) return []
    return regs.filter(r => !linked.includes(r.reference_key) && (r.official_name.toLowerCase().includes(q) || r.reference_key.includes(q))).slice(0, 8)
  }, [regSearch, regs, linked])

  const lines = (v: string) => v.split('\n').map(x => x.trim()).filter(Boolean)

  async function save() {
    if (!name.trim() || !refKey.trim()) { setErr('Reference key and name are required.'); return }
    setBusy(true); setErr('')
    const payload = {
      reference_key: refKey.trim(), key_question: keyQuestion, number: Number(number) || 0,
      name: name.trim(), we_statement: weStatement.trim(),
      expectation_cues: lines(cues), expected_policies: lines(policies),
      linked_regulations: linked, applies_to_settings: settings, is_active: active,
    }
    try {
      const api = createPlatformClient(token).qualityStatements
      if (isNew) await api.create(payload); else await api.update((s as QualityStatement).id, payload)
      onSaved()
    } catch (e: any) { setErr(e.message ?? 'Could not save.') } finally { setBusy(false) }
  }

  const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none'
  const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-mid'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-dark">{isNew ? 'Add quality statement' : `Edit · ${s?.name}`}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-mid hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
          {err && <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <label className="block"><span className={LABEL}>Key question</span>
              <select value={keyQuestion} onChange={e => setKeyQuestion(e.target.value)} className={INPUT}>
                {KEY_QUESTIONS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <label className="block"><span className={LABEL}>Number</span><input value={number} onChange={e => setNumber(e.target.value)} className={INPUT} placeholder="1-34" /></label>
          </div>
          <label className="mt-4 block"><span className={LABEL}>Reference key</span><input value={refKey} onChange={e => setRefKey(e.target.value)} className={INPUT} placeholder="e.g. safe-safeguarding" /></label>
          <label className="mt-4 block"><span className={LABEL}>Name</span><input value={name} onChange={e => setName(e.target.value)} className={INPUT} /></label>
          <label className="mt-4 block"><span className={LABEL}>We-statement (CQC wording)</span><textarea value={weStatement} onChange={e => setWeStatement(e.target.value)} rows={3} className={INPUT} /></label>

          <label className="mt-4 block"><span className={LABEL}>Expectation cues <span className="font-normal normal-case text-gray-400">· one per line</span></span>
            <textarea value={cues} onChange={e => setCues(e.target.value)} rows={6} className={INPUT} placeholder={'The person-centred anchors a policy is checked against\nOne per line'} />
          </label>

          <div className="mt-4">
            <span className={LABEL}>Linked regulations <span className="font-normal normal-case text-gray-400">· the crosswalk</span></span>
            {linked.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {linked.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    {regName[k] ?? k}
                    <button onClick={() => setLinked(l => l.filter(x => x !== k))} className="hover:text-blue-900"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
              <input value={regSearch} onChange={e => setRegSearch(e.target.value)} className={`${INPUT} pl-9`} placeholder="Search regulations to add…" />
              {matches.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {matches.map(r => (
                    <button key={r.reference_key} onClick={() => { setLinked(l => [...l, r.reference_key]); setRegSearch('') }} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-light">
                      <span className="min-w-0 text-neutral-dark">{r.official_name}</span>
                      <span className="ml-auto shrink-0 text-neutral-mid">{r.reference_key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <label className="mt-4 block"><span className={LABEL}>Expected policies <span className="font-normal normal-case text-gray-400">· one per line</span></span>
            <textarea value={policies} onChange={e => setPolicies(e.target.value)} rows={4} className={INPUT} />
          </label>

          <div className="mt-4">
            <span className={LABEL}>Applies to settings <span className="font-normal normal-case text-gray-400">· empty = all settings</span></span>
            <div className="flex flex-wrap gap-2">
              {SETTINGS.map(sl => {
                const on = settings.includes(sl)
                return (
                  <button key={sl} onClick={() => setSettings(v => on ? v.filter(x => x !== sl) : [...v, sl])}
                    className={`rounded-md border px-2.5 py-1 text-xs ${on ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid hover:bg-gray-50'}`}>{sl}</button>
                )
              })}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-teal" /> Active (assessed for tenants)
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
