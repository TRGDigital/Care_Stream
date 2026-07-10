'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type Regulation } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Plus, Pencil, Trash2, RefreshCw, X, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

// Mirrors apps/api/src/lib/care-setting.ts and service-triggers.ts.
const SETTING_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'residential-care', label: 'Residential Care' },
  { slug: 'nursing-homes', label: 'Nursing Homes' },
  { slug: 'domiciliary-care', label: 'Domiciliary Care' },
  { slug: 'live-in-care', label: 'Live-in Care' },
  { slug: 'complex-care', label: 'Complex Care' },
  { slug: 'shared-lives', label: 'Shared Lives' },
  { slug: 'substance-misuse', label: 'Substance Misuse & Rehab' },
  { slug: 'hospices', label: 'Hospices' },
  { slug: 'independent-hospitals', label: 'Independent Hospitals' },
  { slug: 'gp-practices', label: 'GP & Primary Care' },
  { slug: 'dental-practices', label: 'Dental Practices' },
]
const TRIGGER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'prepares_food', label: 'Prepares food on site' },
  { key: 'manages_medicines', label: 'Manages / administers medicines' },
  { key: 'handles_controlled_drugs', label: 'Handles controlled drugs' },
  { key: 'employs_nurses', label: 'Employs nurses / provides nursing' },
  { key: 'uses_moving_handling_equipment', label: 'Uses hoists / moving & handling equipment' },
  { key: 'supports_mha', label: 'Supports people under the Mental Health Act' },
  { key: 'operates_premises', label: 'Operates its own care premises' },
]
const triggerLabel = (k: string) => TRIGGER_OPTIONS.find(t => t.key === k)?.label ?? k
const settingLabelOf = (s: string) => SETTING_OPTIONS.find(o => o.slug === s)?.label ?? s

export default function RegulationsPage() {
  const token                           = usePlatformAuth()
  const [regulations, setRegulations]   = useState<Regulation[]>([])
  const [loading,     setLoading]       = useState(true)
  const [syncing,     setSyncing]       = useState(false)
  const [showAdd,     setShowAdd]       = useState(false)
  const [editId,      setEditId]        = useState<string | null>(null)
  const [error,       setError]         = useState<string | null>(null)
  const [search,      setSearch]        = useState('')
  const [needsUpdateOnly, setNeedsUpdateOnly] = useState(false)

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).regulations.list()
      .then(d => setRegulations(d.regulations))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const [checkingSources, setCheckingSources] = useState(false)
  async function handleCheckSources() {
    if (!token) return
    setCheckingSources(true)
    setError(null)
    try {
      const r = await createPlatformClient(token).regulations.checkSources()
      alert(`Source check complete.\n\nChecked ${r.urls_checked} URLs across ${r.regulations} regulations.\nChanged: ${r.changed} · Flagged for review: ${r.flagged} · Errors: ${r.errors}${r.flagged_regs.length ? `\n\nFlagged:\n${r.flagged_regs.map(f => `• ${f.official_name}`).join('\n')}` : ''}`)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCheckingSources(false)
    }
  }

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

  const needsUpdateCount = regulations.filter(r => r.needs_update).length
  const filtered = regulations
    .filter(r => !needsUpdateOnly || r.needs_update)
    .filter(r => !search ||
      r.official_name.toLowerCase().includes(search.toLowerCase()) ||
      r.reference_key.toLowerCase().includes(search.toLowerCase()))

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
              onClick={handleCheckSources}
              disabled={checkingSources}
              title="Fetch each regulation's source pages and flag any that changed for review (best-effort)"
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50"
            >
              {checkingSources ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Check sources
            </button>
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

        {/* How Policy Gaps uses these regulations */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm space-y-4">
          <p className="font-semibold text-amber-900">How Policy Gaps uses these regulations (tenant &ldquo;Regulation coverage&rdquo; + &ldquo;what to add&rdquo;)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Coverage matching signals</p>
              <p className="leading-relaxed text-amber-900">Three fields decide which of a home&rsquo;s policies get tested against this regulation, and stop near-neighbour regulations being confused. Separate from &ldquo;Also known as&rdquo; (which drives the staff chatbot):</p>
              <ul className="mt-1 space-y-1 text-amber-900">
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /><strong>Expected policy titles</strong> — canonical document names that satisfy this reg.</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /><strong>Match terms</strong> — discriminating words a policy on this reg contains (e.g. &ldquo;section 117&rdquo;, &ldquo;AMHP&rdquo;).</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /><strong>Distinguish from</strong> — the related regs this must NOT be counted as (e.g. MHA 1983 vs MCA 2005 / DoLS).</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Required elements checklist</p>
              <p className="leading-relaxed text-amber-900">The authoritative list of what a compliant policy for this regulation must contain. It is the spine of the tenant-facing &ldquo;what to add&rdquo; deep-dive: a home&rsquo;s policy is checked against this list, and anything missing (and not already covered elsewhere in their library) is what we suggest they add.</p>
            </div>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Applicability — who each regulation is tested for</p>
            <p className="leading-relaxed text-indigo-900/90">A regulation is only checked against a tenant when its <strong>care-setting scope</strong> includes their setting AND all its <strong>required service triggers</strong> are true for them (the tenant confirms these in Settings, pre-filled from their facility type). Leave both empty for a <strong>universal</strong> regulation, tested for everyone. This is why we never flag, say, a Mental Health Act policy for a service that doesn&rsquo;t support people under the Act, or controlled-drug rules for a home that holds none. Set it per regulation in Edit; the row badge shows <strong>Universal</strong> or <strong>Scoped</strong>.</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">How a match is confirmed — three checks before a policy counts</p>
            <p className="leading-relaxed text-emerald-900/90">For each in-scope regulation, the analysis reads the actual content of <strong>every</strong> policy in the tenant&rsquo;s library (via the semantic index), then a policy is only named as coverage if it clears all three of these. This is why a re-run works through the regulations in batches and can take a few minutes on a large library.</p>
            <ol className="mt-1 space-y-1 leading-relaxed text-emerald-900">
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-bold text-emerald-700">1.</span><span><strong>Semantic relevance floor.</strong> A policy with no curated title/term signal is only shown to the judge if its content is genuinely close in meaning to the regulation. Sharing a generic word (e.g. &ldquo;planning&rdquo;, &ldquo;management&rdquo;) is not enough — a near-neighbour policy is dropped before it is ever judged.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-bold text-emerald-700">2.</span><span><strong>Judged against the required elements.</strong> Coverage is decided against this regulation&rsquo;s <strong>Required elements checklist</strong> (above), not just the summary. So &ldquo;partial&rdquo; means the policy misses <em>these specific</em> requirements — the same list that drives the tenant &ldquo;what to add&rdquo; deep-dive.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-bold text-emerald-700">3.</span><span><strong>Adversarial confirmation.</strong> Every &ldquo;covered&rdquo; or &ldquo;partial&rdquo; verdict must survive a strict second reviewer whose only job is to refute it. If the match cannot stand up, the regulation is recorded as a gap. It fails safe: a transient error keeps the first verdict, so a real match is never dropped by accident.</span></li>
            </ol>
            <p className="text-[11px] leading-relaxed text-emerald-800/80">Well-set <strong>Match terms</strong>, <strong>Distinguish from</strong> and <strong>Required elements</strong> make all three checks sharper — they are what the floor, the judge and the skeptic all lean on.</p>
          </div>
          <div className="rounded-lg border border-amber-300 bg-white px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">What the checklist is generated against — important</p>
            <ul className="space-y-1 leading-relaxed text-amber-900">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />Each regulation has its <strong>own</strong> checklist, generated against <strong>that regulation&rsquo;s Authoritative requirements</strong> — your vetted statement of what the actual standard/legislation requires, with its provisions and sources cited. (Not the CQC Fundamental Standards as a set — those drive <strong>applicability</strong>, which is a separate thing.)</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />Set the Authoritative requirements first (paste them, or <strong>Generate a draft and review it against the cited sources</strong>). Your review is what makes them authoritative — the model drafts, you verify.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />The checklist Generate then grounds in those requirements. It does <strong>not</strong> read tenant policies, does <strong>not</strong> scrape the Source URLs, and does <strong>not</strong> use outside knowledge. If a regulation has no Authoritative requirements yet, it falls back to the Summary/context — less precise, so set the requirements first.</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />Every Generate returns a <strong>draft to review</strong> — nothing is saved until you edit and click Save.</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Needs-update tracker */}
        {needsUpdateCount > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-800"><strong>{needsUpdateCount}</strong> regulation{needsUpdateCount === 1 ? '' : 's'} flagged as needing an update (legislation changed or module out of date).</p>
            <button
              onClick={() => setNeedsUpdateOnly(v => !v)}
              className={`shrink-0 rounded-btn px-3 py-1.5 text-xs font-semibold ${needsUpdateOnly ? 'bg-rose-600 text-white' : 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50'}`}
            >
              {needsUpdateOnly ? 'Show all regulations' : 'Show only these'}
            </button>
          </div>
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
  const [notifyTenants, setNotifyTenants] = useState(false)   // per-save: alert assessed tenants of this change?
  const [versions, setVersions] = useState<Array<{ id: string; changed_fields: string[]; material: boolean; created_at: string }> | null>(null)

  useEffect(() => {
    if (expanded && versions === null) {
      createPlatformClient(token).regulations.versions(reg.id).then(d => setVersions(d.versions)).catch(() => setVersions([]))
    }
  }, [expanded]) // eslint-disable-line react-hooks/exhaustive-deps
  const [genList,  setGenList]  = useState(false)
  const [genErr,   setGenErr]   = useState<string | null>(null)
  const [genReqs,  setGenReqs]  = useState(false)
  const [genReqErr,setGenReqErr]= useState<string | null>(null)

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

  async function generateRequirements() {
    setGenReqs(true); setGenReqErr(null)
    try {
      const { authoritative_requirements } = await createPlatformClient(token).regulations.generateRequirements(reg.id)
      setForm(f => ({ ...f, authoritative_requirements }))
    } catch (e: any) {
      setGenReqErr(e.message ?? 'Could not generate the requirements.')
    } finally {
      setGenReqs(false)
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
      authoritative_requirements: reg.authoritative_requirements ?? '',
      authority_basis:          reg.authority_basis ?? 'statutory',
      applies_to_settings:      reg.applies_to_settings ?? [],
      required_triggers:        reg.required_triggers ?? [],
      needs_update:             reg.needs_update ?? false,
      review_note:              reg.review_note ?? '',
      is_active:                reg.is_active,
    })
    setNotifyTenants(false)
    onEdit()
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await createPlatformClient(token).regulations.update(reg.id, { ...form, notify_tenants: notifyTenants })
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

          <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Authoritative requirements</p>
              <button
                type="button"
                onClick={generateRequirements}
                disabled={genReqs}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {genReqs ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate a draft
              </button>
            </div>
            <p className="text-xs leading-relaxed text-neutral-mid">A faithful statement of what this standard/legislation actually requires, with the specific provisions and sources cited. This is the <strong>authoritative anchor</strong> the checklist is generated from — so it is grounded in the real standard, not just our summary. Generate a draft, then <strong>review it against the sources below and edit</strong> before saving; your review is what makes it authoritative.</p>
            <textarea
              className={INPUT}
              rows={Math.max(6, Math.min(20, (form.authoritative_requirements ?? '').split('\n').length + 1))}
              placeholder={'What the standard requires, with provisions cited. e.g.\n- Assess each person’s nutritional and hydration needs (Reg 14(1))\n- ...\nSources: CQC Regulation 14; HSCA 2008 (Regulated Activities) Regs 2014, reg 14'}
              value={form.authoritative_requirements ?? ''}
              onChange={e => setForm(f => ({ ...f, authoritative_requirements: e.target.value }))}
            />
            {genReqErr && <p className="text-xs text-red-600">{genReqErr}</p>}
            {(reg.source_urls?.length ?? 0) > 0 && (
              <p className="text-[11px] text-neutral-mid"><span className="font-semibold text-neutral-dark">Sources:</span>{' '}
                {reg.source_urls.map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mr-2 break-all text-emerald-700 hover:underline">{u}</a>)}
              </p>
            )}
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
            <p className="text-xs leading-relaxed text-neutral-mid">The concrete, per-line checklist a policy is scored against in the tenant &ldquo;what to add&rdquo; deep-dive. <strong>Generate</strong> builds it from the <strong>Authoritative requirements above</strong> when you have set them (otherwise from this regulation&rsquo;s Summary/context), then review and edit. It never scrapes or uses outside knowledge.</p>
            <textarea
              className={INPUT}
              rows={Math.max(6, (form.required_elements ?? []).length + 1)}
              placeholder={'One required element per line, e.g.\nThe process for recognising when the Act applies\nSection 117 aftercare duties and how they are met\nHow staff support access to advocacy (IMHA)'}
              value={(form.required_elements ?? []).join('\n')}
              onChange={e => setForm(f => ({ ...f, required_elements: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
            />
            {genErr && <p className="text-xs text-red-600">{genErr}</p>}
            <div className="rounded-md border border-teal/15 bg-white px-3 py-2 text-[11px] leading-relaxed text-neutral-mid space-y-1">
              <p><span className="font-semibold text-neutral-dark">Generated against:</span> this regulation&rsquo;s <strong>Authoritative requirements</strong> when set (else its Summary/context) — your vetted capture of the standard. Not tenant policies, and not scraped from the source URLs.</p>
              {(reg.source_urls?.length ?? 0) > 0 && (
                <p><span className="font-semibold text-neutral-dark">Reference sources (traceability, not fetched):</span>{' '}
                  {reg.source_urls.map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mr-2 break-all text-teal hover:underline">{u}</a>)}
                </p>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Applicability — who this regulation is tested for</p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-900/80">Leave both empty for a <strong>universal</strong> regulation (tested for every tenant, e.g. CQC Fundamental Standards). Otherwise Policy Gaps only tests it when the tenant&rsquo;s setting is selected AND all selected service triggers are true for them.</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-dark">Legal basis <span className="font-normal text-neutral-mid">(shown to tenants on each recommendation)</span></p>
              <select
                className={`${INPUT} sm:max-w-xs`}
                value={form.authority_basis ?? 'statutory'}
                onChange={e => setForm(f => ({ ...f, authority_basis: e.target.value as 'statutory' | 'advisory' }))}
              >
                <option value="statutory">Legally required in policies (statutory)</option>
                <option value="advisory">Advised — good practice (guidance)</option>
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-dark">Care settings <span className="font-normal text-neutral-mid">(none selected = all settings)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {SETTING_OPTIONS.map(o => {
                  const on = (form.applies_to_settings ?? []).includes(o.slug)
                  return (
                    <button key={o.slug} type="button"
                      onClick={() => setForm(f => { const cur = f.applies_to_settings ?? []; return { ...f, applies_to_settings: on ? cur.filter(s => s !== o.slug) : [...cur, o.slug] } })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-neutral-mid hover:border-indigo-300'}`}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-neutral-dark">Required service triggers <span className="font-normal text-neutral-mid">(all must be true for the tenant)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {TRIGGER_OPTIONS.map(o => {
                  const on = (form.required_triggers ?? []).includes(o.key)
                  return (
                    <button key={o.key} type="button"
                      onClick={() => setForm(f => { const cur = f.required_triggers ?? []; return { ...f, required_triggers: on ? cur.filter(s => s !== o.key) : [...cur, o.key] } })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-gray-300 bg-white text-neutral-mid hover:border-indigo-300'}`}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50/40 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Review &amp; legal change tracking</p>
            <label className="flex items-start gap-2.5 text-sm text-neutral-dark">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                checked={!!form.needs_update}
                onChange={e => setForm(f => ({ ...f, needs_update: e.target.checked }))} />
              <span><strong>Flag as needing update</strong> — the legislation or standard has changed, or this module is out of date. It shows a &ldquo;Needs update&rdquo; badge and appears in the filter at the top until resolved.</span>
            </label>
            <Field label="Review note (what changed / what to update)">
              <textarea className={INPUT} rows={2} placeholder="e.g. Regulation updated April 2026 — refresh the Section 117 aftercare wording." value={form.review_note ?? ''} onChange={e => setForm(f => ({ ...f, review_note: e.target.value }))} />
            </Field>
            <p className="text-[11px] text-neutral-mid">Saving stamps this regulation as reviewed today. Untick and save once you&rsquo;ve updated it — your edit also alerts the affected tenants.</p>
          </div>

          <Field label="Active">
            <select className={INPUT} value={String(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
        <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white p-3 text-sm text-neutral-dark">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal focus:ring-teal"
            checked={notifyTenants}
            onChange={e => setNotifyTenants(e.target.checked)} />
          <span><strong>Notify assessed tenants of this change</strong> — tick only for a genuine standards update. It alerts every tenant assessed against this regulation to review and re-check. Leave unticked for content build-out or minor edits (the change is still recorded in the history).</span>
        </label>
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-neutral-dark text-sm">{reg.official_name}</p>
            <span className="text-xs text-neutral-mid">({reg.reference_key})</span>
            {!reg.is_active && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
            )}
            {reg.needs_update && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Needs update</span>
            )}
            {reg.authoritative_requirements ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <Check size={10} /> Requirements
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">No requirements</span>
            )}
            {reg.required_elements?.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                <Check size={10} /> Checklist ({reg.required_elements.length})
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">No checklist</span>
            )}
            {(reg.match_terms?.length || reg.distinguish_from?.length || reg.expected_policy_titles?.length) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                <Check size={10} /> Signals
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">No signals</span>
            )}
            {(reg.applies_to_settings?.length || reg.required_triggers?.length) ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Scoped</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Universal</span>
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
          {reg.authoritative_requirements ? (
            <div className="rounded-md border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">Authoritative requirements</p>
              <p className="whitespace-pre-wrap text-xs text-neutral-dark">{reg.authoritative_requirements}</p>
            </div>
          ) : (
            <p className="text-xs text-neutral-mid italic">No authoritative requirements set yet — add or Generate them (Edit) so the checklist is grounded in the real standard, not just the summary.</p>
          )}
          {reg.required_elements?.length > 0 ? (
            <div className="rounded-md border border-teal/20 bg-teal-light/20 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-teal">Required elements ({reg.required_elements.length})</p>
              <ul className="space-y-1">
                {reg.required_elements.map((el, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-dark"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />{el}</li>
                ))}
              </ul>
              <div className="mt-2 border-t border-teal/15 pt-2 text-[11px] leading-relaxed text-neutral-mid space-y-1">
                <p><span className="font-semibold text-neutral-dark">Generated against:</span> this regulation&rsquo;s Summary, Care home context and Practical meaning only — not tenant policies, and not scraped from the source URLs.</p>
                {reg.source_urls?.length > 0 && (
                  <p><span className="font-semibold text-neutral-dark">Reference sources:</span>{' '}
                    {reg.source_urls.map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mr-2 break-all text-teal hover:underline">{u}</a>)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-mid italic">No required-elements checklist yet. Add one via Edit (or Generate) to power the tenant &ldquo;what to add&rdquo; deep-dive authoritatively.</p>
          )}
          <div className={`rounded-md border px-3 py-2.5 text-xs ${reg.needs_update ? 'border-rose-200 bg-rose-50/60' : 'border-gray-100 bg-gray-50'}`}>
            <p className={`mb-1 font-bold uppercase tracking-wide ${reg.needs_update ? 'text-rose-700' : 'text-neutral-mid'}`}>Review status</p>
            {reg.needs_update ? (
              <p className="text-rose-800"><span className="font-semibold">Needs update.</span> {reg.review_note || 'No note added.'}</p>
            ) : (
              <p className="text-neutral-dark">Up to date{reg.last_reviewed_at ? ` — last reviewed ${new Date(reg.last_reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.</p>
            )}
          </div>
          <div className="rounded-md border border-indigo-100 bg-indigo-50/50 px-3 py-2.5 text-xs">
            <p className="mb-1 font-bold uppercase tracking-wide text-indigo-700">Applicability</p>
            <p className="mb-1 text-neutral-dark"><span className="font-semibold">Legal basis:</span> {reg.authority_basis === 'advisory' ? 'Advised (good practice)' : 'Legally required (statutory)'}</p>
            {(reg.applies_to_settings?.length || reg.required_triggers?.length) ? (
              <div className="space-y-1 text-neutral-dark">
                <p><span className="font-semibold">Settings:</span> {reg.applies_to_settings?.length ? reg.applies_to_settings.map(settingLabelOf).join(', ') : 'All settings'}</p>
                {reg.required_triggers?.length > 0 && (
                  <p><span className="font-semibold">Requires:</span> {reg.required_triggers.map(triggerLabel).join(', ')}</p>
                )}
              </div>
            ) : (
              <p className="text-neutral-dark"><span className="font-semibold">Universal</span> — tested for every tenant, regardless of setting or service.</p>
            )}
          </div>
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
          <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">Change history</p>
            {versions === null ? (
              <p className="text-xs text-neutral-mid">Loading…</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-neutral-mid italic">No changes recorded yet. Edits from here on are versioned.</p>
            ) : (
              <ul className="space-y-1.5">
                {versions.map(v => (
                  <li key={v.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 text-neutral-mid whitespace-nowrap tabular-nums">{new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {v.material && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">Tenants alerted</span>}
                    <span className="text-neutral-dark">{v.changed_fields.map(f => f.replace(/_/g, ' ')).join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
        <Field label="Authoritative requirements — what the standard actually requires (you can Generate this after saving)" className="sm:col-span-2">
          <textarea className={INPUT} rows={4} placeholder={'A faithful statement of the standard’s requirements, with provisions and sources cited. Grounds the checklist. Generate a draft from the Edit view after saving.'} value={form.authoritative_requirements ?? ''} onChange={e => setForm(f => ({ ...f, authoritative_requirements: e.target.value }))} />
        </Field>
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
