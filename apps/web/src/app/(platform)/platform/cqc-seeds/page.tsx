'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type CqcSeed } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Check, ChevronDown, ChevronUp, Download, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'

const FRAMEWORK_AREAS = ['Safe', 'Effective', 'Caring', 'Responsive', 'Well-led', 'Custom']

export default function CqcSeedsPage() {
  const token                     = usePlatformAuth()
  const [seeds,      setSeeds]      = useState<CqcSeed[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showAdd,    setShowAdd]    = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [syncing,    setSyncing]    = useState(false)
  const [populating, setPopulating] = useState(false)

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).cqcSeeds.list()
      .then(d => setSeeds(d.seeds))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSyncSheet() {
    if (!token) return
    setSyncing(true)
    setError(null)
    try {
      const result = await createPlatformClient(token).cqcSeeds.syncSheet()
      alert(`Sync complete: ${result.upserted} upserted, ${result.unchanged} unchanged${result.errors.length ? `\n\nErrors:\n${result.errors.join('\n')}` : ''}`)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function handlePopulateSheet() {
    if (!token) return
    if (!confirm('This will overwrite the Google Sheet with all seeds from the data file. Continue?')) return
    setPopulating(true)
    setError(null)
    try {
      const result = await createPlatformClient(token).cqcSeeds.populateSheet()
      alert(`Sheet populated: ${result.written} seeds written${result.errors.length ? `\n\nErrors:\n${result.errors.join('\n')}` : ''}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPopulating(false)
    }
  }

  async function handleDelete(seed: CqcSeed) {
    if (!token) return
    if (!confirm(`Delete "${seed.framework_area}" (${seed.slug})?\nThis will permanently remove it from the CQC knowledge base.`)) return
    try {
      await createPlatformClient(token).cqcSeeds.delete(seed.id)
      setSeeds(prev => prev.filter(s => s.id !== seed.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!token) return null

  const filtered = search
    ? seeds.filter(s =>
        s.framework_area.toLowerCase().includes(search.toLowerCase()) ||
        s.slug.toLowerCase().includes(search.toLowerCase()) ||
        s.also_known_as.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : seeds

  // Group by framework_area
  const grouped = FRAMEWORK_AREAS.reduce<Record<string, CqcSeed[]>>((acc, area) => {
    acc[area] = filtered.filter(s => s.framework_area === area)
    return acc
  }, {})
  // Any seeds with framework_area not in the standard list go under 'Custom'
  const customSeeds = filtered.filter(s => !FRAMEWORK_AREAS.slice(0, 5).includes(s.framework_area))
  if (customSeeds.length > 0) {
    grouped['Custom'] = [...(grouped['Custom'] ?? []), ...customSeeds.filter(s => s.framework_area !== 'Custom')]
    grouped['Custom'] = [...new Map(grouped['Custom'].map(s => [s.id, s])).values()]
  }

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">CQC Seeds</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              {seeds.length} CQC framework entr{seeds.length !== 1 ? 'ies' : 'y'} in the knowledge base
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button
              onClick={handlePopulateSheet}
              disabled={populating}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50"
              title="Write all seeds from the data file to the Google Sheet"
            >
              {populating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Populate Sheet
            </button>
            <button
              onClick={handleSyncSheet}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50"
              title="Pull latest content from the Google Sheet into the database"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Sheet
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

        {/* How CQC seeds work */}
        <div className="rounded-xl border border-teal/20 bg-teal-light/30 p-5 text-sm space-y-3">
          <p className="font-semibold text-teal-dark">How CQC seeds work</p>
          <p className="text-neutral-dark leading-relaxed">
            Each seed is a rich knowledge entry for a single CQC framework area — covering its description, what inspectors
            look for, the evidence expected, and what characterises Good and Outstanding ratings.
            This becomes the RAG context that the AI draws from when answering CQC compliance queries,
            ensuring responses are grounded in real CQC methodology rather than hallucinated.
          </p>
          <div className="rounded-lg border border-teal/20 bg-white px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-dark">Field guide</p>
            <ul className="space-y-1 text-neutral-dark leading-relaxed">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Framework area</strong> — one of the 5 CQC key questions (Safe, Effective, Caring, Responsive, Well-led) or a custom area.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Also known as</strong> — all alternative names and abbreviations so the AI can match against staff queries.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Description</strong> — an overview of what this CQC standard area covers and why it matters.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Inspector focus</strong> — what CQC inspectors look for when assessing this area.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Evidence expected</strong> — the documentation and practices inspectors expect to see as evidence.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Rating indicators</strong> — what characterises Good and Outstanding ratings for this area.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /><strong>Source URLs</strong> — links to authoritative CQC guidance and legislation. The AI references these in compliance responses.</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showAdd && (
          <SeedForm
            token={token}
            existingSlugs={seeds.map(s => s.slug)}
            onClose={() => setShowAdd(false)}
            onSaved={seed => { setSeeds(prev => [seed, ...prev]); setShowAdd(false) }}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="space-y-6">
            {FRAMEWORK_AREAS.map(area => {
              const areaSeeds = grouped[area] ?? []
              if (areaSeeds.length === 0 && !search) return null
              return (
                <div key={area}>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-dark">{area}</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-neutral-mid">
                      {areaSeeds.length}
                    </span>
                  </div>
                  {areaSeeds.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 px-4 py-3 text-xs text-neutral-mid">
                      No seeds for this area yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {areaSeeds.map(seed => (
                        <SeedRow
                          key={seed.id}
                          seed={seed}
                          token={token}
                          isEditing={editId === seed.id}
                          onEdit={() => setEditId(seed.id)}
                          onCancelEdit={() => setEditId(null)}
                          onSaved={updated => {
                            setSeeds(prev => prev.map(s => s.id === updated.id ? updated : s))
                            setEditId(null)
                          }}
                          onDelete={() => handleDelete(seed)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-mid">
                {seeds.length === 0 ? 'No CQC seeds yet — add your first entry above.' : 'No results for that search.'}
              </p>
            )}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}

// ─── Seed row ─────────────────────────────────────────────────────────────────

function SeedRow({ seed, token, isEditing, onEdit, onCancelEdit, onSaved, onDelete }: {
  seed:         CqcSeed
  token:        string
  isEditing:    boolean
  onEdit:       () => void
  onCancelEdit: () => void
  onSaved:      (s: CqcSeed) => void
  onDelete:     () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form,     setForm]     = useState<Partial<CqcSeed>>({})
  const [saving,   setSaving]   = useState(false)

  function startEdit() {
    setForm({
      framework_area:    seed.framework_area,
      also_known_as:     seed.also_known_as,
      description:       seed.description,
      inspector_focus:   seed.inspector_focus,
      evidence_expected: seed.evidence_expected,
      rating_indicators: seed.rating_indicators,
      source_urls:       seed.source_urls,
      is_active:         seed.is_active,
    })
    onEdit()
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createPlatformClient(token).cqcSeeds.update(seed.id, form)
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-teal/30 bg-teal-light/20 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-dark">{seed.framework_area} — {seed.slug}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Framework area">
            <select className={INPUT} value={form.framework_area ?? ''} onChange={e => setForm(f => ({ ...f, framework_area: e.target.value }))}>
              {FRAMEWORK_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Also known as (comma-separated)">
            <input
              className={INPUT}
              value={(form.also_known_as ?? []).join(', ')}
              onChange={e => setForm(f => ({ ...f, also_known_as: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Inspector focus" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.inspector_focus ?? ''} onChange={e => setForm(f => ({ ...f, inspector_focus: e.target.value }))} />
          </Field>
          <Field label="Evidence expected" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.evidence_expected ?? ''} onChange={e => setForm(f => ({ ...f, evidence_expected: e.target.value }))} />
          </Field>
          <Field label="Rating indicators (Good/Outstanding)" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.rating_indicators ?? ''} onChange={e => setForm(f => ({ ...f, rating_indicators: e.target.value }))} />
          </Field>
          <Field label="Source URLs (comma-separated)" className="sm:col-span-2">
            <input
              className={INPUT}
              value={(form.source_urls ?? []).join(', ')}
              onChange={e => setForm(f => ({ ...f, source_urls: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </Field>
          <Field label="Active">
            <select className={INPUT} value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-sm text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
          <button onClick={onCancelEdit} className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-neutral-mid hover:bg-white">
            <X size={13} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-neutral-dark text-sm">{seed.framework_area}</p>
            <span className="text-xs text-neutral-mid font-mono">{seed.slug}</span>
            {!seed.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
            )}
          </div>
          {seed.also_known_as.length > 0 && (
            <p className="mt-0.5 text-xs text-neutral-mid">{seed.also_known_as.join(', ')}</p>
          )}
          <p className="mt-1 text-xs text-neutral-mid line-clamp-2">{seed.description}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button onClick={() => setExpanded(e => !e)} className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={startEdit} className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-teal">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 text-sm">
          {seed.inspector_focus && (
            <p><span className="font-bold text-neutral-dark">Inspector focus:</span>{' '}{seed.inspector_focus}</p>
          )}
          {seed.evidence_expected && (
            <p><span className="font-bold text-neutral-dark">Evidence expected:</span>{' '}{seed.evidence_expected}</p>
          )}
          {seed.rating_indicators && (
            <p><span className="font-bold text-neutral-dark">Rating indicators:</span>{' '}{seed.rating_indicators}</p>
          )}
          {seed.source_urls.length > 0 && (
            <p><span className="font-bold text-neutral-dark">Sources:</span>{' '}
              {seed.source_urls.map(url => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline mr-2 text-xs">{url}</a>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add seed form ────────────────────────────────────────────────────────────

function SeedForm({ token, existingSlugs, onClose, onSaved }: {
  token:          string
  existingSlugs:  string[]
  onClose:        () => void
  onSaved:        (s: CqcSeed) => void
}) {
  const [form,   setForm]   = useState<Partial<CqcSeed & { also_known_as_str: string; source_urls_str: string }>>({
    framework_area: 'Safe',
    is_active:      true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Auto-derive slug from framework_area + count of existing seeds for that area
  const autoSlug = form.framework_area
    ? form.framework_area.toLowerCase().replace(/\s+/g, '-') +
      '-' + (existingSlugs.filter(s => s.startsWith(form.framework_area!.toLowerCase().replace(/\s+/g, '-'))).length + 1)
    : ''

  // Use manually-entered slug if set, otherwise fall back to auto-derived
  const [slugOverride, setSlugOverride] = useState('')
  const derivedSlug = slugOverride.trim() || autoSlug

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        slug:          derivedSlug,
        also_known_as: form.also_known_as_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        source_urls:   form.source_urls_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      }
      const seed = await createPlatformClient(token).cqcSeeds.create(payload)
      onSaved(seed)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-dark">Add CQC seed</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Framework area">
          <select className={INPUT} value={form.framework_area ?? 'Safe'} onChange={e => setForm(f => ({ ...f, framework_area: e.target.value }))}>
            {FRAMEWORK_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Slug (auto-derived — edit to override)">
          <input
            className={INPUT}
            value={slugOverride || autoSlug}
            onChange={e => setSlugOverride(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder={autoSlug}
          />
        </Field>
        <Field label="Also known as (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="e.g. Safety, Risk management" value={form.also_known_as_str ?? ''} onChange={e => setForm(f => ({ ...f, also_known_as_str: e.target.value }))} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="Overview of what this CQC standard area covers…" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </Field>
        <Field label="Inspector focus" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What CQC inspectors look for in this area…" value={form.inspector_focus ?? ''} onChange={e => setForm(f => ({ ...f, inspector_focus: e.target.value }))} />
        </Field>
        <Field label="Evidence expected" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="Documentation and practices expected as evidence…" value={form.evidence_expected ?? ''} onChange={e => setForm(f => ({ ...f, evidence_expected: e.target.value }))} />
        </Field>
        <Field label="Rating indicators (Good/Outstanding)" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What characterises Good and Outstanding ratings…" value={form.rating_indicators ?? ''} onChange={e => setForm(f => ({ ...f, rating_indicators: e.target.value }))} />
        </Field>
        <Field label="Source URLs (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="https://www.cqc.org.uk/..., https://www.legislation.gov.uk/..." value={form.source_urls_str ?? ''} onChange={e => setForm(f => ({ ...f, source_urls_str: e.target.value }))} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.framework_area || !form.description}
          className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save seed
        </button>
        <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">
          Cancel
        </button>
      </div>
    </div>
  )
}

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-neutral-mid">{label}</label>
      {children}
    </div>
  )
}
