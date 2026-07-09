'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type Regulation } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Pencil, Trash2, RefreshCw, X, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export default function RegulationsPage() {
  const token                           = usePlatformAuth()
  const [regulations, setRegulations]   = useState<Regulation[]>([])
  const [loading,     setLoading]       = useState(true)
  const [syncing,     setSyncing]       = useState(false)
  const [showAdd,     setShowAdd]       = useState(false)
  const [editId,      setEditId]        = useState<string | null>(null)
  const [error,       setError]         = useState<string | null>(null)
  const [search,      setSearch]        = useState('')

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).regulations.list()
      .then(d => setRegulations(d.regulations))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    if (!token) return
    setSyncing(true)
    setError(null)
    try {
      const result = await createPlatformClient(token).regulations.sync()
      alert(`Sync complete: ${result.upserted} upserted, ${result.unchanged} unchanged${result.errors.length ? `\n\nErrors:\n${result.errors.join('\n')}` : ''}`)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function handleDelete(reg: Regulation) {
    if (!token) return
    if (!confirm(`Delete "${reg.official_name}"?\nThis will remove it from the knowledge base and Pinecone.`)) return
    try {
      await createPlatformClient(token).regulations.delete(reg.id)
      setRegulations(prev => prev.filter(r => r.id !== reg.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (!token) return null

  const filtered = search
    ? regulations.filter(r =>
        r.official_name.toLowerCase().includes(search.toLowerCase()) ||
        r.reference_key.toLowerCase().includes(search.toLowerCase())
      )
    : regulations

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">External Regulations</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              {regulations.length} regulations in the platform knowledge base
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
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50"
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

        {/* How regulations work */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm space-y-4">
          <p className="font-semibold text-blue-900">How regulations work in the AI pipeline</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">1. Via policy chunk metadata (automatic)</p>
              <p className="text-blue-800 leading-relaxed">When a policy is ingested, each chunk is tagged with the regulation keys it relates to (e.g. <code className="rounded bg-blue-100 px-1 font-mono text-xs">regulation_12</code>, <code className="rounded bg-blue-100 px-1 font-mono text-xs">gdpr</code>). When a staff member asks a question, the AI retrieves the relevant policy chunks — and if those chunks cite a regulation, the full regulation text is pulled from the database and added to the AI response automatically.</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">2. Via direct name matching (explicit)</p>
              <p className="text-blue-800 leading-relaxed">If a staff member mentions a regulation by name in their question (e.g. "what does CQC Regulation 13 say about safeguarding"), the system detects it by matching against the <strong>Reference key</strong>, <strong>Official name</strong>, and <strong>Also known as</strong> fields — and includes that regulation's full content directly in the AI response.</p>
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Important — what this means in practice</p>
            <ul className="space-y-1 text-blue-800 leading-relaxed">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />A newly added regulation is immediately available to the AI and is searchable by name from the moment it is saved.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />It will <strong>not</strong> appear automatically in responses unless a policy chunk already cites it by its reference key, or a staff member asks a question that names it explicitly.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />Regulations are stored as a single entry — they are <strong>not</strong> chunked like policies. The full summary, care home context, care company interaction, and practical meaning fields are all passed to the AI when the regulation is triggered.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />To link a regulation to existing policies, those policies must be re-ingested so their chunks are tagged with the new regulation's reference key.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />The <strong>Also known as</strong> field is critical for detection — include every abbreviation, short name, and common variant (e.g. for GDPR: "Data Protection, UK GDPR, ICO").</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {showAdd && (
          <RegulationForm
            token={token}
            onClose={() => setShowAdd(false)}
            onSaved={reg => { setRegulations(prev => [reg, ...prev]); setShowAdd(false) }}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(reg => (
              <RegulationRow
                key={reg.id}
                reg={reg}
                token={token}
                isEditing={editId === reg.id}
                onEdit={() => setEditId(reg.id)}
                onCancelEdit={() => setEditId(null)}
                onSaved={updated => {
                  setRegulations(prev => prev.map(r => r.id === updated.id ? updated : r))
                  setEditId(null)
                }}
                onDelete={() => handleDelete(reg)}
              />
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-mid">No regulations found.</p>
            )}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}

// ─── Regulation row ───────────────────────────────────────────────────────────

function RegulationRow({ reg, token, isEditing, onEdit, onCancelEdit, onSaved, onDelete }: {
  reg:         Regulation
  token:       string
  isEditing:   boolean
  onEdit:      () => void
  onCancelEdit: () => void
  onSaved:     (r: Regulation) => void
  onDelete:    () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form,     setForm]     = useState<Partial<Regulation>>({})
  const [saving,   setSaving]   = useState(false)
  const [genList,  setGenList]  = useState(false)
  const [genErr,   setGenErr]   = useState<string | null>(null)

  async function generateChecklist() {
    setGenList(true); setGenErr(null)
    try {
      const { required_elements } = await createPlatformClient(token).regulations.generateChecklist(reg.id)
      setForm(f => ({ ...f, required_elements }))
    } catch (e: any) {
      setGenErr(e.message ?? 'Could not generate the checklist.')
    } finally {
      setGenList(false)
    }
  }

  function startEdit() {
    setForm({
      official_name:            reg.official_name,
      also_known_as:            reg.also_known_as,
      summary:                  reg.summary,
      care_home_context:        reg.care_home_context,
      care_company_interaction: reg.care_company_interaction,
      practical_meaning:        reg.practical_meaning,
      source_urls:              reg.source_urls,
      match_terms:              reg.match_terms ?? [],
      distinguish_from:         reg.distinguish_from ?? [],
      expected_policy_titles:   reg.expected_policy_titles ?? [],
      required_elements:        reg.required_elements ?? [],
      is_active:                reg.is_active,
    })
    onEdit()
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createPlatformClient(token).regulations.update(reg.id, form)
      onSaved(updated)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-teal/30 bg-teal-light/20 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-dark">{reg.official_name}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Official name">
            <input
              className={INPUT}
              value={form.official_name ?? ''}
              onChange={e => setForm(f => ({ ...f, official_name: e.target.value }))}
            />
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
          <Field label="Care home context" className="sm:col-span-2">
            <textarea className={INPUT} rows={3} value={form.care_home_context ?? ''} onChange={e => setForm(f => ({ ...f, care_home_context: e.target.value }))} />
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

          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Coverage matching signals</p>
            <p className="text-xs text-amber-800 leading-relaxed">Used by the Policy Gaps regulation-coverage analysis to pick which of a home&rsquo;s policies to test against this regulation, and to stop near-neighbour regulations being confused. These are separate from &ldquo;Also known as&rdquo; (which drives the staff chatbot).</p>
            <Field label="Expected policy titles (comma-separated) — canonical document names that satisfy this regulation">
              <input
                className={INPUT}
                placeholder="Mental Health Act Policy, Guardianship (Section 7) Policy"
                value={(form.expected_policy_titles ?? []).join(', ')}
                onChange={e => setForm(f => ({ ...f, expected_policy_titles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </Field>
            <Field label="Match terms (comma-separated) — discriminating words a policy on this reg contains">
              <input
                className={INPUT}
                placeholder="section 117, sectioning, AMHP, guardianship"
                value={(form.match_terms ?? []).join(', ')}
                onChange={e => setForm(f => ({ ...f, match_terms: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </Field>
            <Field label="Distinguish from (comma-separated) — related regs this must NOT be confused with">
              <input
                className={INPUT}
                placeholder="Mental Capacity Act 2005, Deprivation of Liberty Safeguards (DoLS)"
                value={(form.distinguish_from ?? []).join(', ')}
                onChange={e => setForm(f => ({ ...f, distinguish_from: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </Field>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-teal/20 bg-teal-light/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-teal">Required elements checklist</p>
              <button
                type="button"
                onClick={generateChecklist}
                disabled={genList}
                className="inline-flex items-center gap-1.5 rounded-md border border-teal/40 bg-white px-2.5 py-1.5 text-xs font-medium text-teal hover:bg-teal-light/40 disabled:opacity-50"
              >
                {genList ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate from this regulation&rsquo;s details
              </button>
            </div>
            <p className="text-xs leading-relaxed text-neutral-mid">The authoritative list of what a compliant policy must contain. Powers the tenant-facing &ldquo;what to add&rdquo; deep-dive. One item per line. Generate a draft from the fields above, then review and edit — this is grounded only in the description you have written, not outside sources.</p>
            <textarea
              className={INPUT}
              rows={Math.max(6, (form.required_elements ?? []).length + 1)}
              placeholder={'One required element per line, e.g.\nThe process for recognising when the Act applies\nSection 117 aftercare duties and how they are met\nHow staff support access to advocacy (IMHA)'}
              value={(form.required_elements ?? []).join('\n')}
              onChange={e => setForm(f => ({ ...f, required_elements: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
            />
            {genErr && <p className="text-xs text-red-600">{genErr}</p>}
          </div>

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
            <X size={13} />
            Cancel
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
            <p className="font-medium text-neutral-dark text-sm">{reg.official_name}</p>
            <span className="text-xs text-neutral-mid">({reg.reference_key})</span>
            {!reg.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-mid line-clamp-2">{reg.summary}</p>
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
          {reg.also_known_as.length > 0 && (
            <p><span className="font-bold text-neutral-dark">Also known as:</span>{' '}{reg.also_known_as.join(', ')}</p>
          )}
          <p><span className="font-bold text-neutral-dark">Care home context:</span>{' '}{reg.care_home_context}</p>
          <p><span className="font-bold text-neutral-dark">Care company interaction:</span>{' '}{reg.care_company_interaction}</p>
          <p><span className="font-bold text-neutral-dark">Practical meaning:</span>{' '}{reg.practical_meaning}</p>
          {reg.required_elements?.length > 0 ? (
            <div className="rounded-md border border-teal/20 bg-teal-light/20 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-teal">Required elements ({reg.required_elements.length})</p>
              <ul className="space-y-1">
                {reg.required_elements.map((el, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-dark"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />{el}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-neutral-mid italic">No required-elements checklist yet. Add one via Edit (or Generate) to power the tenant &ldquo;what to add&rdquo; deep-dive authoritatively.</p>
          )}
          {(reg.expected_policy_titles?.length || reg.match_terms?.length || reg.distinguish_from?.length) ? (
            <div className="rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2.5 space-y-1.5 text-xs">
              <p className="font-bold uppercase tracking-wide text-amber-700">Coverage matching</p>
              {reg.expected_policy_titles?.length > 0 && (
                <p><span className="font-semibold text-neutral-dark">Expected policy titles:</span>{' '}{reg.expected_policy_titles.join(', ')}</p>
              )}
              {reg.match_terms?.length > 0 && (
                <p><span className="font-semibold text-neutral-dark">Match terms:</span>{' '}{reg.match_terms.join(', ')}</p>
              )}
              {reg.distinguish_from?.length > 0 && (
                <p><span className="font-semibold text-neutral-dark">Distinguish from:</span>{' '}{reg.distinguish_from.join(', ')}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-mid italic">No coverage-matching signals set yet. Add them via Edit to tighten Policy Gaps analysis.</p>
          )}
          {reg.source_urls.length > 0 && (
            <p><span className="font-bold text-neutral-dark">Sources:</span>{' '}
              {reg.source_urls.map(url => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline mr-2 text-xs">{url}</a>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add regulation form ──────────────────────────────────────────────────────

function RegulationForm({ token, onClose, onSaved }: {
  token:   string
  onClose: () => void
  onSaved: (r: Regulation) => void
}) {
  const [form,   setForm]   = useState<Partial<Regulation & { also_known_as_str: string; source_urls_str: string; expected_policy_titles_str: string; match_terms_str: string; distinguish_from_str: string; required_elements_str: string }>>({ is_active: true })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        also_known_as:          form.also_known_as_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        source_urls:            form.source_urls_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        expected_policy_titles: form.expected_policy_titles_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        match_terms:            form.match_terms_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        distinguish_from:       form.distinguish_from_str?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        required_elements:      form.required_elements_str?.split('\n').map(s => s.trim()).filter(Boolean) ?? [],
      }
      const reg = await createPlatformClient(token).regulations.create(payload)
      onSaved(reg)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-dark">Add regulation</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Reference key (e.g. gdpr)">
          <input className={INPUT} placeholder="gdpr" value={form.reference_key ?? ''} onChange={e => setForm(f => ({ ...f, reference_key: e.target.value }))} />
        </Field>
        <Field label="Official name">
          <input className={INPUT} placeholder="UK General Data Protection Regulation" value={form.official_name ?? ''} onChange={e => setForm(f => ({ ...f, official_name: e.target.value }))} />
        </Field>
        <Field label="Also known as (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="GDPR, Data Protection" value={form.also_known_as_str ?? ''} onChange={e => setForm(f => ({ ...f, also_known_as_str: e.target.value }))} />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="Brief overview…" value={form.summary ?? ''} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
        </Field>
        <Field label="Care home context" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What this means specifically for a care home…" value={form.care_home_context ?? ''} onChange={e => setForm(f => ({ ...f, care_home_context: e.target.value }))} />
        </Field>
        <Field label="Care company interaction" className="sm:col-span-2">
          <textarea className={INPUT} rows={2} placeholder="How the care company interacts with this regulation…" value={form.care_company_interaction ?? ''} onChange={e => setForm(f => ({ ...f, care_company_interaction: e.target.value }))} />
        </Field>
        <Field label="Practical meaning" className="sm:col-span-2">
          <textarea className={INPUT} rows={3} placeholder="What staff need to do in practice…" value={form.practical_meaning ?? ''} onChange={e => setForm(f => ({ ...f, practical_meaning: e.target.value }))} />
        </Field>
        <Field label="Source URLs (comma-separated)" className="sm:col-span-2">
          <input className={INPUT} placeholder="https://ico.org.uk/..." value={form.source_urls_str ?? ''} onChange={e => setForm(f => ({ ...f, source_urls_str: e.target.value }))} />
        </Field>

        <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Coverage matching signals (optional)</p>
          <p className="text-xs text-amber-800 leading-relaxed">Improve Policy Gaps accuracy: which policy documents satisfy this reg, the words that discriminate it, and the related regs it must not be confused with.</p>
          <Field label="Expected policy titles (comma-separated)">
            <input className={INPUT} placeholder="Mental Health Act Policy, Guardianship (Section 7) Policy" value={form.expected_policy_titles_str ?? ''} onChange={e => setForm(f => ({ ...f, expected_policy_titles_str: e.target.value }))} />
          </Field>
          <Field label="Match terms (comma-separated)">
            <input className={INPUT} placeholder="section 117, sectioning, AMHP, guardianship" value={form.match_terms_str ?? ''} onChange={e => setForm(f => ({ ...f, match_terms_str: e.target.value }))} />
          </Field>
          <Field label="Distinguish from (comma-separated)">
            <input className={INPUT} placeholder="Mental Capacity Act 2005, Deprivation of Liberty Safeguards (DoLS)" value={form.distinguish_from_str ?? ''} onChange={e => setForm(f => ({ ...f, distinguish_from_str: e.target.value }))} />
          </Field>
        </div>
        <Field label="Required elements checklist (one per line) — what a compliant policy must contain" className="sm:col-span-2">
          <textarea className={INPUT} rows={5} placeholder={'One required element per line. You can also Generate this after saving, from the Edit view.'} value={form.required_elements_str ?? ''} onChange={e => setForm(f => ({ ...f, required_elements_str: e.target.value }))} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !form.reference_key || !form.official_name || !form.summary}
          className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save & embed
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
