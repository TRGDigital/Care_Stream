'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TrainingSeed } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Check, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'

const MODULE_SLUGS = [
  { slug: 'safeguarding-adults',          name: 'Safeguarding Adults' },
  { slug: 'moving-handling',              name: 'Moving & Handling' },
  { slug: 'fire-safety',                  name: 'Fire Safety' },
  { slug: 'infection-prevention-control', name: 'Infection Prevention & Control' },
  { slug: 'health-safety',                name: 'Health & Safety' },
  { slug: 'first-aid-bls',                name: 'First Aid & BLS' },
  { slug: 'food-hygiene',                 name: 'Food Hygiene' },
  { slug: 'medication-administration',    name: 'Medication Administration' },
  { slug: 'mental-capacity-dols',         name: 'Mental Capacity & DoLS' },
  { slug: 'equality-diversity',           name: 'Equality & Diversity' },
  { slug: 'data-protection-gdpr',         name: 'Data Protection & GDPR' },
  { slug: 'duty-of-candour',              name: 'Duty of Candour' },
  { slug: 'dementia-care',                name: 'Dementia Care' },
  { slug: 'learning-disability-autism',   name: 'Learning Disability & Autism' },
  { slug: 'end-of-life-care',             name: 'End of Life Care' },
  { slug: 'pressure-area-care',           name: 'Pressure Area Care' },
  { slug: 'falls-prevention',             name: 'Falls Prevention' },
  { slug: 'continence-care',              name: 'Continence Care' },
  { slug: 'oral-health',                  name: 'Oral Health' },
  { slug: 'lone-working',                 name: 'Lone Working' },
]

export default function TrainingSeedsPage() {
  const token                     = usePlatformAuth()
  const [seeds,   setSeeds]       = useState<TrainingSeed[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [editId,  setEditId]      = useState<string | null>(null)
  const [error,   setError]       = useState<string | null>(null)
  const [search,  setSearch]      = useState('')

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).trainingSeeds.list()
      .then(d => setSeeds(d.seeds))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(seed: TrainingSeed) {
    if (!token) return
    if (!confirm(`Delete "${seed.training_type}"?\nThis will permanently remove it from the training knowledge base.`)) return
    try {
      await createPlatformClient(token).trainingSeeds.delete(seed.id)
      setSeeds(prev => prev.filter(s => s.id !== seed.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!token) return null

  const filtered = search
    ? seeds.filter(s =>
        s.training_type.toLowerCase().includes(search.toLowerCase()) ||
        s.also_known_as.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : seeds

  const statutory  = filtered.filter(s => s.is_active)
  const inactive   = filtered.filter(s => !s.is_active)

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Training Seeds</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              {seeds.length} training type{seeds.length !== 1 ? 's' : ''} in the knowledge base
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

        {/* How training seeds work */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm space-y-3">
          <p className="font-semibold text-blue-900">How training seeds work</p>
          <p className="text-blue-800 leading-relaxed">
            Each seed is a rich knowledge entry for a single training type. The <strong>slug</strong> must exactly match
            the training module slug — this is how the AI knows which seed to use when generating questions.
            Required slugs are listed below. The slug is shown on each seed row and can be edited.
          </p>
          <div className="rounded-lg border border-blue-200 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">Required module slugs</p>
            <div className="flex flex-wrap gap-1.5">
              {MODULE_SLUGS.map(({ slug, name }) => {
                const matched = seeds.some(s => s.slug === slug)
                return (
                  <span key={slug} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono ${matched ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {matched ? '✓' : '!'} {slug}
                  </span>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-blue-700">Green = seed exists with matching slug · Orange = no seed yet for this module</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showAdd && (
          <SeedForm
            token={token}
            onClose={() => setShowAdd(false)}
            onSaved={seed => { setSeeds(prev => [seed, ...prev]); setShowAdd(false) }}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(seed => (
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
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-mid">
                {seeds.length === 0 ? 'No training seeds yet — add your first entry above.' : 'No results for that search.'}
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
  seed:         TrainingSeed
  token:        string
  isEditing:    boolean
  onEdit:       () => void
  onCancelEdit: () => void
  onSaved:      (s: TrainingSeed) => void
  onDelete:     () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form,     setForm]     = useState<Partial<TrainingSeed>>({})
  const [saving,   setSaving]   = useState(false)

  function startEdit() {
    setForm({
      slug:                     seed.slug,
      training_type:            seed.training_type,
      also_known_as:            seed.also_known_as,
      summary:                  seed.summary,
      care_context:             seed.care_context,
      care_company_interaction: seed.care_company_interaction,
      practical_meaning:        seed.practical_meaning,
      source_urls:              seed.source_urls,
      is_active:                seed.is_active,
    })
    onEdit()
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createPlatformClient(token).trainingSeeds.update(seed.id, form)
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-teal/30 bg-teal-light/20 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-dark">{seed.training_type}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Slug (must match module slug)">
            <input className={INPUT} value={form.slug ?? ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
          </Field>
          <Field label="Training type">
            <input className={INPUT} value={form.training_type ?? ''} onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))} />
          </Field>
          <Field label="Also known as (comma-separated)">
            <input
              className={INPUT}
              value={(form.also_known_as ?? []).join(', ')}
              onChange={e => setForm(f => ({ ...f, also_known_as: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </Field>
          <Field label="Summary" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.summary ?? ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          </Field>
          <Field label="Care context" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.care_context ?? ''} onChange={e => setForm(f => ({ ...f, care_context: e.target.value }))} />
          </Field>
          <Field label="Care company interaction" className="sm:col-span-2">
            <textarea className={INPUT} rows={2} value={form.care_company_interaction ?? ''} onChange={e => setForm(f => ({ ...f, care_company_interaction: e.target.value }))} />
          </Field>
          <Field label="Practical meaning" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.practical_meaning ?? ''} onChange={e => setForm(f => ({ ...f, practical_meaning: e.target.value }))} />
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-neutral-dark text-sm">{seed.training_type}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${seed.care_setting_label ? 'bg-blue-50 text-blue-700' : 'bg-teal/10 text-teal-dark'}`}>
              {seed.care_setting_label ?? 'All settings'}
            </span>
            <span className="text-xs text-neutral-mid font-mono">{seed.slug}</span>
            {!seed.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-mid line-clamp-2">{seed.summary}</p>
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
          {seed.also_known_as.length > 0 && (
            <p><span className="font-bold text-neutral-dark">Also known as:</span>{' '}{seed.also_known_as.join(', ')}</p>
          )}
          {seed.care_context && (
            <p><span className="font-bold text-neutral-dark">Care context:</span>{' '}{seed.care_context}</p>
          )}
          {seed.care_company_interaction && (
            <p><span className="font-bold text-neutral-dark">Care company interaction:</span>{' '}{seed.care_company_interaction}</p>
          )}
          {seed.practical_meaning && (
            <p><span className="font-bold text-neutral-dark">Practical meaning:</span>{' '}{seed.practical_meaning}</p>
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

function SeedForm({ token, onClose, onSaved }: {
  token:   string
  onClose: () => void
  onSaved: (s: TrainingSeed) => void
}) {
  const [form,   setForm]   = useState<Partial<TrainingSeed & { also_known_as_str: string; source_urls_str: string }>>({ is_active: true })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        also_known_as: form.also_known_as_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        source_urls:   form.source_urls_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      }
      const seed = await createPlatformClient(token).trainingSeeds.create(payload)
      onSaved(seed)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-dark">Add training seed</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Training type" className="sm:col-span-2">
          <input className={INPUT} placeholder="e.g. Safeguarding Adults" value={form.training_type ?? ''} onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))} />
        </Field>
        <Field label="Also known as (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="Safeguarding, Adult safeguarding, DoLS" value={form.also_known_as_str ?? ''} onChange={e => setForm(f => ({ ...f, also_known_as_str: e.target.value }))} />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="Brief overview of what this training covers and why it matters…" value={form.summary ?? ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
        </Field>
        <Field label="Care context" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What this training means specifically in a care home or care setting…" value={form.care_context ?? ''} onChange={e => setForm(f => ({ ...f, care_context: e.target.value }))} />
        </Field>
        <Field label="Care company interaction" className="sm:col-span-2">
          <textarea className={INPUT} rows={2} placeholder="How the organisation's policies and responsibilities relate to this training…" value={form.care_company_interaction ?? ''} onChange={e => setForm(f => ({ ...f, care_company_interaction: e.target.value }))} />
        </Field>
        <Field label="Practical meaning" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What staff are expected to know and demonstrate in day-to-day practice…" value={form.practical_meaning ?? ''} onChange={e => setForm(f => ({ ...f, practical_meaning: e.target.value }))} />
        </Field>
        <Field label="Source URLs (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="https://www.cqc.org.uk/..., https://www.skillsforcare.org.uk/..." value={form.source_urls_str ?? ''} onChange={e => setForm(f => ({ ...f, source_urls_str: e.target.value }))} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.training_type || !form.summary}
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
