'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type PolicySeedMeta, type PolicySeed, type TenantSummary } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Trash2, Check, Download, ChevronDown, ChevronUp, AlertCircle, Pencil, X, Sparkles } from 'lucide-react'

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

const SETTINGS: { value: string; label: string }[] = [
  { value: 'nursing_home', label: 'Nursing home' },
  { value: 'care_home',    label: 'Care home' },
  { value: 'home_care',    label: 'Home care' },
  { value: 'other',        label: 'Other' },
]
const settingLabel = (v: string | null) => SETTINGS.find(s => s.value === v)?.label ?? (v ?? 'Unset')

export default function PolicySeedsPage() {
  const token = usePlatformAuth()
  const [seeds,   setSeeds]   = useState<PolicySeedMeta[]>([])
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [source,  setSource]  = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSetting, setImportSetting] = useState('nursing_home')
  const [editing, setEditing] = useState<PolicySeed | null>(null)
  const [cleaningId, setCleaningId] = useState<string | null>(null)
  const [bulkCleaning, setBulkCleaning] = useState(false)
  const [cleanProgress, setCleanProgress] = useState<{ done: number; total: number } | null>(null)

  const LONG = 12000   // chars — policies above this skipped the AI pass at import

  function load() {
    if (!token) return
    const api = createPlatformClient(token)
    Promise.all([api.policySeeds.list(), api.tenants.list()])
      .then(([s, t]) => { setSeeds(s.seeds); setTenants(t.tenants); if (!source && t.tenants[0]) setSource(t.tenants[0].id) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  async function runImport() {
    if (!token || !source) return
    setImporting(true); setError(''); setProgress(null)
    const api = createPlatformClient(token)
    let fails = 0
    // Loop the batched import until nothing remains; retry transient hiccups.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let r
      try {
        r = await api.policySeeds.importBatch(source, 4, importSetting)
        fails = 0
      } catch {
        fails++
        if (fails >= 3) {
          setError('Import paused after a network hiccup — click Import policies to resume (already-imported policies are skipped).')
          break
        }
        await new Promise(res => setTimeout(res, 2500))
        continue
      }
      const total = r.already + r.imported + r.remaining
      setProgress({ done: r.already + r.imported, total })
      if (r.remaining <= 0 || r.imported === 0) break
    }
    try { setSeeds((await api.policySeeds.list()).seeds) } catch { /* ignore */ }
    setImporting(false)
  }

  async function openEdit(id: string) {
    if (!token) return
    const { seed } = await createPlatformClient(token).policySeeds.get(id)
    setEditing(seed)
  }

  async function saveEdit(patch: Partial<PolicySeed>) {
    if (!token || !editing) return
    const { seed } = await createPlatformClient(token).policySeeds.update(editing.id, patch)
    setSeeds(prev => prev.map(s => s.id === seed.id ? { ...s, ...seed } : s))
    setEditing(null)
  }

  async function toggleReviewed(s: PolicySeedMeta) {
    if (!token) return
    const { seed } = await createPlatformClient(token).policySeeds.update(s.id, { reviewed: !s.reviewed })
    setSeeds(prev => prev.map(x => x.id === seed.id ? { ...x, reviewed: seed.reviewed } : x))
  }

  async function remove(s: PolicySeedMeta) {
    if (!token || !confirm(`Delete the seed "${s.title}"?`)) return
    await createPlatformClient(token).policySeeds.remove(s.id)
    setSeeds(prev => prev.filter(x => x.id !== s.id))
  }

  function applyCleaned(seed: PolicySeed) {
    setSeeds(prev => prev.map(s => s.id === seed.id ? { ...s, reviewed: seed.reviewed, char_count: seed.content.length } : s))
  }

  async function aiCleanOne(s: PolicySeedMeta) {
    if (!token) return
    setCleaningId(s.id); setError('')
    try { applyCleaned((await createPlatformClient(token).policySeeds.aiClean(s.id)).seed) }
    catch (e: any) { setError(e.message) } finally { setCleaningId(null) }
  }

  async function reCleanLong() {
    if (!token) return
    const longOnes = seeds.filter(s => s.char_count > LONG)
    if (longOnes.length === 0) return
    setBulkCleaning(true); setError(''); setCleanProgress({ done: 0, total: longOnes.length })
    const api = createPlatformClient(token)
    let done = 0, fails = 0
    for (const s of longOnes) {
      try {
        applyCleaned((await api.policySeeds.aiClean(s.id)).seed); fails = 0
        done++; setCleanProgress({ done, total: longOnes.length })
      } catch {
        fails++
        if (fails >= 3) { setError('Re-clean paused after a hiccup — click again to resume.'); break }
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    setBulkCleaning(false)
  }

  const sections = Array.from(new Set(seeds.map(s => s.section ?? 'Uncategorised'))).sort()
  const reviewedCount = seeds.filter(s => s.reviewed).length

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Policy Seeds</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              Anonymised reference policies used to ground onboarding question generation. Import from a real home, then review each before it&rsquo;s used.
            </p>
          </div>
        </div>

        {/* Import bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-neutral-dark">Import &amp; anonymise from</span>
            <select value={source} onChange={e => setSource(e.target.value)} disabled={importing} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <span className="text-sm text-neutral-mid">as</span>
            <select value={importSetting} onChange={e => setImportSetting(e.target.value)} disabled={importing} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              {SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={runImport} disabled={importing || !source}
              className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Import policies
            </button>
            {progress && (
              <span className="text-sm text-neutral-mid">{progress.done} / {progress.total} imported</span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-mid">
            <AlertCircle size={12} /> Identifiers (home name, address, people, contacts) are stripped automatically — review each seed before relying on it.
          </p>
          {seeds.filter(s => s.char_count > LONG).length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
              <span className="text-sm text-neutral-dark">
                {seeds.filter(s => s.char_count > LONG).length} long policies skipped the AI pass at import
              </span>
              <button onClick={reCleanLong} disabled={bulkCleaning || importing}
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-dark hover:border-teal disabled:opacity-50">
                {bulkCleaning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI-clean the long ones
              </button>
              {cleanProgress && <span className="text-sm text-neutral-mid">{cleanProgress.done} / {cleanProgress.total} cleaned</span>}
            </div>
          )}
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : seeds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-neutral-mid">
            No policy seeds yet — import from a home above.
          </div>
        ) : (
          <>
            <p className="text-sm text-neutral-mid">{seeds.length} seeds · {reviewedCount} reviewed</p>
            {sections.map(sec => (
              <SectionGroup key={sec} title={sec} seeds={seeds.filter(s => (s.section ?? 'Uncategorised') === sec)}
                onEdit={openEdit} onToggle={toggleReviewed} onRemove={remove} onAiClean={aiCleanOne} cleaningId={cleaningId} longThreshold={LONG} />
            ))}
          </>
        )}
      </div>

      {editing && <EditModal seed={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
    </PlatformShell>
  )
}

function SectionGroup({ title, seeds, onEdit, onToggle, onRemove, onAiClean, cleaningId, longThreshold }: {
  title: string
  seeds: PolicySeedMeta[]
  onEdit: (id: string) => void
  onToggle: (s: PolicySeedMeta) => void
  onRemove: (s: PolicySeedMeta) => void
  onAiClean: (s: PolicySeedMeta) => void
  cleaningId: string | null
  longThreshold: number
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-neutral-dark">{title} <span className="text-neutral-mid">({seeds.length})</span></span>
        {open ? <ChevronUp size={15} className="text-neutral-mid" /> : <ChevronDown size={15} className="text-neutral-mid" />}
      </button>
      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {seeds.map(s => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-neutral-dark">{s.title}</span>
              <span className="shrink-0 rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold text-teal" title="Care setting">{settingLabel(s.care_setting)}</span>
              {s.char_count > longThreshold && (
                <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700" title="Long policy — skipped the AI pass at import">long</span>
              )}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.reviewed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {s.reviewed ? 'Reviewed' : 'Needs review'}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => onAiClean(s)} disabled={cleaningId === s.id} title="Re-anonymise with AI" className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-teal hover:text-teal disabled:opacity-50">
                  {cleaningId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                </button>
                <button onClick={() => onEdit(s.id)} title="Review / edit" className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-teal hover:text-teal"><Pencil size={13} /></button>
                <button onClick={() => onToggle(s)} title={s.reviewed ? 'Mark needs review' : 'Mark reviewed'} className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-green-300 hover:text-green-600"><Check size={13} /></button>
                <button onClick={() => onRemove(s)} title="Delete" className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:border-red-300 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EditModal({ seed, onClose, onSave }: {
  seed: PolicySeed
  onClose: () => void
  onSave: (patch: Partial<PolicySeed>) => void
}) {
  const [title, setTitle]     = useState(seed.title)
  const [content, setContent] = useState(seed.content)
  const [saving, setSaving]   = useState(false)

  async function save(markReviewed: boolean) {
    setSaving(true)
    await onSave({ title, content, ...(markReviewed ? { reviewed: true } : {}) })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl rounded-card bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-dark">Review policy seed</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={20} /></button>
        </div>
        <p className="mb-3 text-xs text-neutral-mid">Check that no identifying details remain (home name, address, people, contact details), then mark as reviewed.</p>
        <input value={title} onChange={e => setTitle(e.target.value)} className={`${INPUT} mb-3`} placeholder="Title" />
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={18} className={`${INPUT} font-mono text-xs`} />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => save(false)} disabled={saving} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-neutral-dark hover:border-teal disabled:opacity-50">Save</button>
          <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save &amp; mark reviewed
          </button>
        </div>
      </div>
    </div>
  )
}
