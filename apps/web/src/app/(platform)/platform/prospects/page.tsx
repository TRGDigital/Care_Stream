'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import {
  createPlatformClient,
  type ProspectsListData,
  type ProspectsMeta,
  type ProspectFilters,
  type ProviderLead,
  type ProspectSegment,
} from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Target, Loader2, RefreshCw, X, Phone, Mail, Globe, FileText, Copy, Check, MapPin, Sparkles, UserSearch, Building2 } from 'lucide-react'

const RATING_STYLE: Record<string, string> = {
  inadequate: 'bg-red-100 text-red-700',
  requires_improvement: 'bg-amber-100 text-amber-700',
  good: 'bg-green-100 text-green-700',
  outstanding: 'bg-teal-light text-teal-dark',
  not_rated: 'bg-gray-100 text-gray-600',
}
const RATING_LABEL: Record<string, string> = {
  inadequate: 'Inadequate',
  requires_improvement: 'Requires Improvement',
  good: 'Good',
  outstanding: 'Outstanding',
  not_rated: 'Not rated',
}
const SEGMENT_STYLE: Record<ProspectSegment, string> = {
  rescue: 'bg-red-100 text-red-700',
  protect: 'bg-amber-100 text-amber-700',
  maintain: 'bg-blue-100 text-blue-700',
  defend: 'bg-teal-light text-teal-dark',
  unrated: 'bg-gray-100 text-gray-600',
}
const STATUS_STYLE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  queued: 'bg-indigo-100 text-indigo-700',
  contacted: 'bg-amber-100 text-amber-700',
  engaged: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-gray-100 text-gray-500',
  suppressed: 'bg-gray-100 text-gray-500',
}
const STATUSES = ['new', 'queued', 'contacted', 'engaged', 'qualified', 'won', 'lost', 'suppressed']

function ratingBadge(r: string | null) {
  const key = r ?? 'not_rated'
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RATING_STYLE[key] ?? RATING_STYLE.not_rated}`}>{RATING_LABEL[key] ?? key}</span>
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProspectsPage() {
  const token = usePlatformAuth()
  const api = useMemo(() => (token ? createPlatformClient(token) : null), [token])

  const [meta, setMeta] = useState<ProspectsMeta | null>(null)
  const [data, setData] = useState<ProspectsListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ProspectFilters>({ sort: 'score', page: 1, pageSize: 50 })
  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [enrichRun, setEnrichRun] = useState(false)
  const [enrichStat, setEnrichStat] = useState<{ done: number; emails: number; remaining: number } | null>(null)
  const [draftRun, setDraftRun] = useState(false)
  const [draftMsg, setDraftMsg] = useState<string | null>(null)

  // Load filter vocab once.
  useEffect(() => {
    if (!api) return
    api.prospects.filters().then(setMeta).catch(() => {})
  }, [api])

  const load = useCallback(() => {
    if (!api) return
    setLoading(true)
    setError(null)
    api.prospects
      .list(filters)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [api, filters])

  useEffect(() => { load() }, [load])

  function patch(next: Partial<ProspectFilters>) {
    setFilters((f) => ({ ...f, ...next, page: next.page ?? 1 }))
  }

  async function runSync() {
    if (!api) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const r = await api.prospects.sync()
      setSyncMsg(`Synced ${r.upserted.toLocaleString()} providers in ${(r.durationMs / 1000).toFixed(0)}s.`)
      load()
      api.prospects.filters().then(setMeta).catch(() => {})
    } catch (e) {
      setSyncMsg(`Sync failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  // One controlled batch of 100 (hottest-first, scoped to the current segment).
  // Click again for the next 100. The cron handles the rest hands-off.
  async function runEnrich() {
    if (!api) return
    setEnrichRun(true)
    try {
      const r = await api.prospects.enrichBulk({ limit: 100, segment: filters.segment })
      setEnrichStat({ done: r.processed, emails: r.withEmail, remaining: r.remaining })
    } finally {
      setEnrichRun(false)
      load()
    }
  }

  async function runDraftEmails() {
    if (!api) return
    setDraftRun(true)
    setDraftMsg(null)
    try {
      const r = await api.prospects.draftEmails({ limit: 10, segment: filters.segment })
      setDraftMsg(`Created ${r.created} draft${r.created === 1 ? '' : 's'} in Gmail${r.errors ? ` (${r.errors} failed)` : ''} · ${r.remaining} emailable left`)
      load()
    } catch (e) {
      setDraftMsg(`Draft failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDraftRun(false)
    }
  }

  if (!token) return null

  const segTabs: Array<{ key?: ProspectSegment; label: string; tagline?: string }> = [
    { label: 'All' },
    ...(meta?.segments ?? []).map((s) => ({ key: s.key, label: s.label, tagline: s.tagline })),
  ]
  const totalCount = data ? Object.values(data.segmentCounts).reduce((a, b) => a + b, 0) : 0
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <PlatformShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark">
              <Target size={22} className="text-teal" /> Prospects
            </h1>
            <p className="mt-1 text-sm text-neutral-mid">UK CQC-regulated providers, scored and segmented from live inspection data.</p>
          </div>
          <div className="flex items-center gap-3">
            {enrichStat && (
              <span className="text-xs text-neutral-mid">
                Enriched {enrichStat.done.toLocaleString()} · {enrichStat.emails.toLocaleString()} emails · {enrichStat.remaining.toLocaleString()} left
              </span>
            )}
            <button
              onClick={runEnrich}
              disabled={enrichRun}
              title={filters.segment ? `Enrich the next 100 ${filters.segment} leads with a website (hottest first)` : 'Enrich the next 100 leads with a website (hottest first)'}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-60"
            >
              {enrichRun ? <><Loader2 size={15} className="animate-spin" /> Enriching 100…</> : <><UserSearch size={15} /> Enrich 100{filters.segment ? ` · ${filters.segment}` : ''}</>}
            </button>
            {draftMsg && <span className="text-xs text-neutral-mid">{draftMsg}</span>}
            <button
              onClick={runDraftEmails}
              disabled={draftRun}
              title="Create up to 10 Gmail drafts for the hottest emailable leads — review & send in your Gmail"
              className="flex items-center gap-2 rounded-lg border border-teal/40 bg-teal-light px-3 py-2 text-sm font-medium text-teal-dark hover:bg-teal-light/70 disabled:opacity-60"
            >
              {draftRun ? <><Loader2 size={15} className="animate-spin" /> Drafting…</> : <><Mail size={15} /> Create drafts</>}
            </button>
            {syncMsg && <span className="text-xs text-neutral-mid">{syncMsg}</span>}
            <button
              onClick={runSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-60"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>

        {/* Segment tabs */}
        <div className="flex flex-wrap gap-2">
          {segTabs.map((t) => {
            const active = filters.segment === t.key || (!filters.segment && !t.key)
            const count = t.key ? data?.segmentCounts[t.key] ?? 0 : totalCount
            return (
              <button
                key={t.label}
                title={t.tagline}
                onClick={() => patch({ segment: t.key })}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${active ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid hover:bg-gray-200'}`}
              >
                {t.label} <span className="opacity-70">{count.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
        {filters.segment && (
          <p className="-mt-2 text-xs text-neutral-mid">{meta?.segments.find((s) => s.key === filters.segment)?.tagline}</p>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => { e.preventDefault(); patch({ q: search || undefined }) }}
            className="flex items-center gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name…"
              className="w-52 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-neutral-light px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-gray-200">Search</button>
          </form>

          <select value={filters.setting ?? ''} onChange={(e) => patch({ setting: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">All settings</option>
            {(meta?.settings ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filters.region ?? ''} onChange={(e) => patch({ region: e.target.value || undefined })} className="max-w-[180px] rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">All regions</option>
            {(meta?.regions ?? []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={filters.status ?? ''} onChange={(e) => patch({ status: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filters.enriched ?? ''} onChange={(e) => patch({ enriched: (e.target.value || undefined) as ProspectFilters['enriched'] })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">All contacts</option>
            <option value="email">Has email ✓</option>
            <option value="enriched">Enriched</option>
            <option value="none">Not enriched</option>
          </select>

          <select value={filters.sort ?? 'score'} onChange={(e) => patch({ sort: e.target.value as ProspectFilters['sort'] })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="score">Sort: Score</option>
            <option value="inspected">Sort: Recently inspected</option>
            <option value="name">Sort: Name</option>
          </select>

          {(filters.setting || filters.region || filters.status || filters.q || filters.enriched) && (
            <button onClick={() => { setSearch(''); setFilters((f) => ({ sort: f.sort, segment: f.segment, page: 1, pageSize: f.pageSize })) }} className="text-sm text-teal hover:underline">Clear</button>
          )}
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : !data || data.rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-neutral-mid">
            No prospects found. {totalCount === 0 && 'Run “Sync now” to import the provider universe.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Setting</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Inspected</th>
                    <th className="px-4 py-3">Failing</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((l) => (
                    <tr key={l.id} onClick={() => setSelectedId(l.id)} className={`cursor-pointer hover:bg-neutral-light/50 ${l.enriched_email ? 'bg-green-50/70' : ''}`}>
                      <td className={`px-4 py-3 ${l.enriched_email ? 'border-l-2 border-green-500' : 'border-l-2 border-transparent'}`}>
                        <div className="font-medium text-neutral-dark">{l.name}</div>
                        <div className="text-xs text-neutral-mid">{[l.town, l.county].filter(Boolean).join(', ') || '—'}</div>
                        {l.enriched_email && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-700">
                            <Mail size={11} />{l.enriched_email}{l.contact_name ? ` · ${l.contact_name}` : ''}
                          </div>
                        )}
                        {l.drafted_at && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-teal-light px-1.5 py-0.5 text-[10px] font-medium text-teal-dark">
                            <Mail size={10} /> Drafted in Gmail
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-mid">{l.setting ?? '—'}</td>
                      <td className="px-4 py-3">{ratingBadge(l.cqc_rating)}</td>
                      <td className="px-4 py-3 text-neutral-mid">{fmtDate(l.cqc_inspection_date)}</td>
                      <td className="px-4 py-3 text-xs text-neutral-mid">{l.failing_domains.length ? l.failing_domains.join(', ') : '—'}</td>
                      <td className="px-4 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span></td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-dark">{l.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-neutral-mid">
              <span>{data.total.toLocaleString()} prospects · page {data.page} of {totalPages.toLocaleString()}</span>
              <div className="flex gap-2">
                <button disabled={data.page <= 1} onClick={() => patch({ page: data.page - 1 })} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50">Prev</button>
                <button disabled={data.page >= totalPages} onClick={() => patch({ page: data.page + 1 })} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedId && api && <LeadDrawer id={selectedId} onClose={() => setSelectedId(null)} onSaved={load} apiToken={token} />}
    </PlatformShell>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function LeadDrawer({ id, onClose, onSaved, apiToken }: { id: string; onClose: () => void; onSaved: () => void; apiToken: string }) {
  const api = useMemo(() => createPlatformClient(apiToken), [apiToken])
  const [lead, setLead] = useState<ProviderLead | null>(null)
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [status, setStatus] = useState('')
  const [owner, setOwner] = useState('')
  const [notes, setNotes] = useState('')
  const [aiDraft, setAiDraft] = useState<{ subject: string; body: string; sources: 'cqc-report' | 'signals' } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiCopied, setAiCopied] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichNote, setEnrichNote] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.prospects.get(id).then(({ lead, draft }) => {
      setLead(lead); setDraft(draft)
      setStatus(lead.status); setOwner(lead.owner ?? ''); setNotes(lead.notes ?? '')
      if (lead.ai_draft_body) {
        setAiDraft({ subject: lead.ai_draft_subject ?? '', body: lead.ai_draft_body, sources: (lead.ai_draft_sources as 'cqc-report' | 'signals') ?? 'signals' })
      } else {
        setAiDraft(null)
      }
    }).finally(() => setLoading(false))
  }, [api, id])

  async function genAi() {
    setAiLoading(true)
    try {
      const d = await api.prospects.draftAi(id)
      setAiDraft(d)
    } finally {
      setAiLoading(false)
    }
  }

  async function copyAi() {
    if (!aiDraft) return
    await navigator.clipboard.writeText(`Subject: ${aiDraft.subject}\n\n${aiDraft.body}`)
    setAiCopied(true); setTimeout(() => setAiCopied(false), 1500)
  }

  async function enrich() {
    setEnriching(true)
    setEnrichNote(null)
    try {
      const { result, lead: updated } = await api.prospects.enrich(id)
      setLead(updated)
      if (result.source === 'none') setEnrichNote(result.notes ?? 'Nothing found.')
    } finally {
      setEnriching(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const { lead: updated } = await api.prospects.update(id, { status, owner: owner || null, notes: notes || null })
      setLead(updated)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function copyDraft() {
    if (!draft) return
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-neutral-dark">{lead?.name ?? 'Loading…'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        {loading || !lead ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={26} className="animate-spin text-neutral-mid" /></div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${SEGMENT_STYLE[lead.segment]}`}>{lead.segment}</span>
              {ratingBadge(lead.cqc_rating)}
              <span className="text-sm font-semibold text-neutral-dark">Score {lead.score}</span>
              <span className="flex items-center gap-1 text-xs text-neutral-mid"><MapPin size={12} />{[lead.town, lead.county, lead.region].filter(Boolean).join(', ') || '—'}</span>
            </div>

            {lead.why_now && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="font-semibold">Why now: </span>{lead.why_now}
              </div>
            )}

            {/* CQC sub-ratings */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {([['Safe', lead.cqc_safe_rating], ['Effective', lead.cqc_effective_rating], ['Caring', lead.cqc_caring_rating], ['Responsive', lead.cqc_responsive_rating], ['Well-led', lead.cqc_well_led_rating]] as const).map(([label, val]) => (
                <div key={label} className="rounded-lg border border-gray-200 p-2">
                  <div className="text-neutral-mid">{label}</div>
                  <div className={`mt-1 rounded px-1 py-0.5 font-medium ${RATING_STYLE[val ?? 'not_rated'] ?? RATING_STYLE.not_rated}`}>{RATING_LABEL[val ?? 'not_rated'] ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-3 text-sm">
              {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-teal hover:underline"><Phone size={14} />{lead.phone}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-teal hover:underline"><Mail size={14} />{lead.email}</a>}
              {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-teal hover:underline"><Globe size={14} />Website</a>}
              {lead.cqc_report_url && <a href={lead.cqc_report_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-teal hover:underline"><FileText size={14} />CQC report</a>}
            </div>

            {/* Decision-maker enrichment */}
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 bg-neutral-light px-4 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid"><UserSearch size={13} /> Decision-maker</span>
                <button onClick={enrich} disabled={enriching} className="flex items-center gap-1 text-xs font-medium text-teal hover:underline disabled:opacity-60">
                  {enriching ? <><Loader2 size={13} className="animate-spin" /> Searching…</> : lead.enriched_at ? 'Re-enrich' : 'Enrich contact'}
                </button>
              </div>
              <div className="space-y-1.5 p-4 text-sm">
                {lead.contact_name && (
                  <div className="text-neutral-dark"><span className="font-semibold">{lead.contact_name}</span>{lead.contact_role && <span className="text-neutral-mid"> · {lead.contact_role}</span>}</div>
                )}
                {lead.enriched_email && (
                  <a href={`mailto:${lead.enriched_email}`} className="flex items-center gap-1.5 text-teal hover:underline"><Mail size={14} />{lead.enriched_email}{lead.contact_name ? ` · ${lead.contact_name}` : ''}</a>
                )}
                {lead.alt_email && (
                  <a href={`mailto:${lead.alt_email}`} className="flex items-center gap-1.5 text-xs text-neutral-mid hover:underline"><Mail size={12} />{lead.alt_email} <span className="text-neutral-mid">(alt)</span></a>
                )}
                {lead.company_number && (
                  <a href={`https://find-and-update.company-information.service.gov.uk/company/${lead.company_number}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-neutral-mid hover:underline"><Building2 size={13} />Companies House {lead.company_number}</a>
                )}
                {!lead.enriched_at && !enriching && <p className="text-neutral-mid">No contact found yet. Click “Enrich contact” to search the provider website and Companies House.</p>}
                {lead.enriched_at && !lead.contact_name && !lead.enriched_email && <p className="text-neutral-mid">{enrichNote ?? 'No email or named director found.'}</p>}
                {lead.enrichment_source && lead.enrichment_source !== 'none' && (
                  <p className="text-[11px] text-neutral-mid">Source: {lead.enrichment_source.replace('+', ' + ')}</p>
                )}
              </div>
            </div>

            {/* Draft message */}
            {draft && (
              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 bg-neutral-light px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Draft outreach</span>
                  <button onClick={copyDraft} className="flex items-center gap-1 text-xs text-teal hover:underline">
                    {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
                <div className="space-y-2 p-4">
                  <div className="text-sm font-semibold text-neutral-dark">{draft.subject}</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-dark">{draft.body}</pre>
                </div>
              </div>
            )}

            {/* AI-sharpened draft */}
            <div className="rounded-lg border border-teal/30">
              <div className="flex items-center justify-between border-b border-teal/20 bg-teal-light px-4 py-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-dark">
                  <Sparkles size={13} /> AI-sharpened draft
                  {aiDraft && <span className="ml-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-teal-dark">{aiDraft.sources === 'cqc-report' ? 'from CQC report' : 'from CQC signals'}</span>}
                </span>
                <div className="flex items-center gap-3">
                  {aiDraft && (
                    <button onClick={copyAi} className="flex items-center gap-1 text-xs text-teal-dark hover:underline">
                      {aiCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                  )}
                  <button onClick={genAi} disabled={aiLoading} className="flex items-center gap-1 text-xs font-medium text-teal-dark hover:underline disabled:opacity-60">
                    {aiLoading ? <><Loader2 size={13} className="animate-spin" /> Writing…</> : aiDraft ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {aiDraft ? (
                  <>
                    <div className="text-sm font-semibold text-neutral-dark">{aiDraft.subject}</div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-dark">{aiDraft.body}</pre>
                  </>
                ) : (
                  <p className="text-sm text-neutral-mid">Generate a personalised email tailored to this provider, drawing on its CQC report where available.</p>
                )}
              </div>
            </div>

            {/* Nurture controls */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm text-neutral-mid">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm text-neutral-mid">Owner</label>
                <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Sales owner" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-neutral-mid">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <button onClick={save} disabled={saving} className="w-full rounded-lg bg-teal py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              {lead.last_contacted_at && <p className="text-xs text-neutral-mid">Last contacted {fmtDate(lead.last_contacted_at)}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
