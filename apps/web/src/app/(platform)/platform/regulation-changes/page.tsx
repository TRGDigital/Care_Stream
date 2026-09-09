'use client'

// What changed in the law and guidance we track, and whose policies it lands on.
//
// The summary is shown, but never on its own: every change also shows the ACTUAL SENTENCES
// added and removed. A model summary of a legal change can be wrong in ways that read as
// confident, and the wording is the evidence. Anyone about to tell forty care homes their
// policies need revising should be looking at the source text, not at a paraphrase of it.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createPlatformClient, type RegulationChange } from '@/lib/platform-api'
import {
  AlertTriangle, Check, ExternalLink, Loader2, RefreshCw, Scale, Users, X, ChevronDown,
} from 'lucide-react'

const SEVERITY: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  material: { label: 'Material',  bg: 'bg-red-50',    fg: 'text-red-700',    border: 'border-red-200' },
  minor:    { label: 'Minor',     bg: 'bg-amber-50',  fg: 'text-amber-700',  border: 'border-amber-200' },
  cosmetic: { label: 'Cosmetic',  bg: 'bg-gray-50',   fg: 'text-gray-600',   border: 'border-gray-200' },
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function RegulationChangesPage() {
  const { data: session } = useSession()
  const token = session?.accessToken as string | undefined

  const [changes, setChanges] = useState<RegulationChange[] | null>(null)
  const [counts, setCounts]   = useState<{ new: number; notified: number; dismissed: number; unreviewed: number } | null>(null)
  const [filter, setFilter]   = useState<'new' | 'notified' | 'dismissed' | ''>('new')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState('')
  const [open, setOpen]       = useState<Set<string>>(new Set())

  async function load(status: string) {
    if (!token) return
    try {
      const r = await createPlatformClient(token).regulations.changes(status || undefined)
      setChanges(r.changes); setCounts(r.counts); setError('')
    } catch (e: any) { setError(e?.message ?? 'Could not load detected changes') }
  }

  useEffect(() => { void load(filter) }, [token, filter])

  async function runReview() {
    if (!token) return
    setBusy('review')
    try { await createPlatformClient(token).regulations.reviewChanges(); await load(filter) }
    catch (e: any) { setError(e?.message ?? 'Review failed') }
    finally { setBusy('') }
  }

  async function setStatus(id: string, status: 'dismissed' | 'notified') {
    if (!token) return
    setBusy(id)
    try { await createPlatformClient(token).regulations.setChangeStatus(id, status); await load(filter) }
    catch (e: any) { setError(e?.message ?? 'Could not update that change') }
    finally { setBusy('') }
  }

  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark">
            <Scale size={22} className="text-purple-600" /> Legislation changes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-mid">
            Source pages for the regulations we track, checked weekly. When one changes, the difference is
            recorded and reviewed, and matched to the tenants whose coverage analysis names a policy behind
            that regulation.
          </p>
        </div>
        <button
          onClick={runReview}
          disabled={busy === 'review'}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-purple-300 disabled:opacity-40"
        >
          {busy === 'review' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Review unexplained
          {counts && counts.unreviewed > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">{counts.unreviewed}</span>
          )}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {([['new', 'To review'], ['notified', 'Tenants told'], ['dismissed', 'Dismissed'], ['', 'All']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value as any)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === value ? 'bg-purple-600 text-white' : 'border border-gray-200 text-neutral-mid hover:border-purple-300'
            }`}
          >
            {label}
            {counts && value && ` (${(counts as any)[value] ?? 0})`}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {!changes ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</p>
      ) : changes.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <Check size={22} className="mx-auto mb-3 text-green-600" />
          <p className="font-semibold text-neutral-dark">Nothing to review</p>
          {/* An empty list here is ambiguous — it could mean the monitor is broken. Say which. */}
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">
            No source page has changed since the last check. The monitor runs every Monday at 06:00; if it
            stops, the daily jobs email says so.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {changes.map(c => {
            const tone = SEVERITY[c.severity] ?? SEVERITY.minor
            const withPolicy = c.impacted.filter(i => i.policy_name)
            const isOpen = open.has(c.id)
            return (
              <div key={c.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-neutral-dark">{c.official_name || c.reference_key}</h2>
                      {c.reviewed_at ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.bg} ${tone.fg} ${tone.border}`}>{tone.label}</span>
                      ) : (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Not yet reviewed</span>
                      )}
                      {c.affects_policies === true && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Affects policies</span>
                      )}
                      <span className="text-xs text-neutral-mid">{when(c.detected_at)}</span>
                    </div>

                    {c.summary
                      ? <p className="mt-2 text-sm leading-relaxed text-neutral-dark">{c.summary}</p>
                      : <p className="mt-2 text-sm italic text-neutral-mid">Detected, not yet explained. The wording is below.</p>}

                    {c.impact_note && <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{c.impact_note}</p>}

                    <a href={c.url} target="_blank" rel="noopener noreferrer"
                       className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:underline">
                      <ExternalLink size={11} /> {c.url.replace(/^https?:\/\//, '').slice(0, 70)}
                    </a>
                  </div>

                  {c.status === 'new' && (
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => setStatus(c.id, 'dismissed')} disabled={busy === c.id}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-gray-300 disabled:opacity-40">
                        <X size={12} /> Dismiss
                      </button>
                      <button onClick={() => setStatus(c.id, 'notified')} disabled={busy === c.id || withPolicy.length === 0}
                              title={withPolicy.length === 0 ? 'No tenant has a policy recorded against this regulation yet' : undefined}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40">
                        {busy === c.id ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                        Mark tenants told
                      </button>
                    </div>
                  )}
                </div>

                {/* Who it lands on. Tenants with a named policy first: those have something to revise. */}
                {c.impacted.length > 0 && (
                  <div className="border-t border-gray-100 bg-neutral-light/40 px-5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-mid">
                      {withPolicy.length} {withPolicy.length === 1 ? 'policy' : 'policies'} to revise
                      {c.impacted.length > withPolicy.length && ` · ${c.impacted.length - withPolicy.length} with no policy behind this regulation`}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {c.impacted.slice(0, 10).map(i => (
                        <li key={i.tenant_id} className="text-xs text-neutral-dark">
                          <span className="font-medium">{i.tenant_name}</span>
                          <span className="text-neutral-mid"> {i.account_number && `· ${i.account_number}`} · </span>
                          {i.policy_name
                            ? <span>{i.policy_name}</span>
                            : <span className="text-amber-700">no policy covers this yet</span>}
                        </li>
                      ))}
                      {c.impacted.length > 10 && <li className="text-xs text-neutral-mid">and {c.impacted.length - 10} more</li>}
                    </ul>
                  </div>
                )}

                {/* The evidence. Always available, never replaced by the summary. */}
                <button onClick={() => toggle(c.id)}
                        className="flex w-full items-center justify-between border-t border-gray-100 px-5 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-50/40">
                  {isOpen ? 'Hide the wording' : 'See exactly what changed'}
                  <ChevronDown size={13} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {isOpen && (
                  <div className="space-y-2 border-t border-gray-100 px-5 py-4">
                    {c.added_text && (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-green-700">Added to the page</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-dark">{c.added_text}</p>
                      </div>
                    )}
                    {c.removed_text && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Removed from the page</p>
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-mid">{c.removed_text}</p>
                      </div>
                    )}
                    {!c.added_text && !c.removed_text && (
                      <p className="text-xs text-neutral-mid">No textual difference was captured for this change.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
