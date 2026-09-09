'use client'

// What changed in a policy, when, why, and who signed it off.
//
// The row that matters most is "Read it as it was". Every published version keeps its full
// text, so a home can answer "what did our medication policy actually say in March" for an
// inspection, a complaint or a coroner. Everything else here is metadata about a change; that
// is the change.
//
// Only policies with a history appear. History comes from the adoption and approval flow
// rather than from uploading a file, so most of a library has none, and listing those as empty
// rows would read as lost history rather than as nothing having happened yet.

import { useEffect, useState } from 'react'
import { createApiClient, type PolicyHistoryEntry } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { History, Loader2, FileText, X, Check, Undo2, AlertTriangle, Printer, ChevronDown, RefreshCw } from 'lucide-react'

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const STAGE: Record<string, string> = { admin: 'Admin', manager: 'Care manager', external: 'External reviewer' }

const CACHE_KEY = 'policy-history'

export function PolicyHistoryTab({ token }: { token: string }) {
  // Served from cache first so switching tabs is instant. History changes only when a policy
  // is published, which is rare, so a stale minute costs nothing and a spinner on every tab
  // switch costs attention. Refreshed quietly behind whatever is already on screen, and there
  // is a manual refresh for anyone who wants to be sure.
  const [history, setHistory] = useState<PolicyHistoryEntry[] | null>(
    () => persistentCache.get<PolicyHistoryEntry[]>(CACHE_KEY) ?? null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState<{ title: string; version: string; at: string; content: string } | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Which change rows are expanded, keyed by version id and index.
  const [shown, setShown] = useState<Set<string>>(new Set())

  const load = (manual = false) => {
    if (manual) setRefreshing(true)
    createApiClient(token).policies.history()
      .then(r => { setHistory(r.history); persistentCache.set(CACHE_KEY, r.history); setError('') })
      .catch((e: Error) => setError(e.message))
      .finally(() => setRefreshing(false))
  }

  useEffect(() => { load() }, [token])

  async function open(versionId: string) {
    setOpening(versionId); setError('')
    try {
      const v = await createApiClient(token).policies.versionContent(versionId)
      setReading({ title: v.policy_name, version: v.version, at: v.published_at, content: v.content })
    } catch (e: any) { setError(e.message) }
    finally { setOpening(null) }
  }

  if (error && !history) {
    return (
      <p className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Could not load your policy history: {error}
      </p>
    )
  }
  if (!history) {
    return <p className="flex items-center gap-2 px-1 py-8 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading your policy history…</p>
  }
  if (history.length === 0) {
    return (
      <div className="rounded-card border border-gray-100 bg-white px-6 py-10 text-center shadow-card">
        <History size={22} className="mx-auto mb-3 text-neutral-mid" />
        <p className="font-semibold text-neutral-dark">No policy history yet</p>
        {/* Said plainly, because an empty history reads as lost history unless you explain it. */}
        <p className="mx-auto mt-1 max-w-lg text-sm text-neutral-mid">
          History starts the first time a policy is changed and published through CareStream.
          Nothing has been lost: your policies simply have not been changed here yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-neutral-mid">
          Every change published through CareStream, newest first. Open any version to read the
          policy exactly as it stood on that date.
        </p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-teal hover:underline disabled:opacity-40"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {history.map(h => (
        <div key={h.policy_id} className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-neutral-dark">{h.policy_name}</h3>
            {h.carestream_written && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold text-teal">
                <img src="/favicon-32.png" alt="" width={9} height={9} className="rounded-[2px]" /> CareStream
              </span>
            )}
            <span className="ml-auto text-xs text-neutral-mid">
              {h.versions.length} {h.versions.length === 1 ? 'version' : 'versions'}
            </span>
          </div>

          {/* One line per version, so a policy changed four times reads as four rows. */}
          <ul className="divide-y divide-gray-50">
            {h.versions.map(v => (
              <li key={v.version_id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-neutral-dark">Version {v.version}</span>
                  <span className="text-xs text-neutral-mid">{when(v.published_at)}</span>
                  {v.published_by && <span className="text-xs text-neutral-mid">published by {v.published_by}</span>}
                  <button
                    onClick={() => open(v.version_id)}
                    disabled={opening === v.version_id}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-40"
                  >
                    {opening === v.version_id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                    Read it as it was
                  </button>
                </div>

                {v.changes.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {v.changes.map((c, i) => {
                      const key = `${v.version_id}:${i}`
                      const open = shown.has(key)
                      return (
                        <li key={i} className="text-xs leading-relaxed">
                          <div className="flex gap-2">
                            {c.reverted
                              ? <Undo2 size={12} className="mt-0.5 shrink-0 text-neutral-mid" />
                              : <Check size={12} className="mt-0.5 shrink-0 text-green-600" />}
                            <span className={c.reverted ? 'text-neutral-mid line-through' : 'text-neutral-dark'}>
                              {c.section_title ? <strong>{c.section_title}: </strong> : null}
                              {c.requirement}
                              {/* Why it changed. The regulation is the answer an inspector wants. */}
                              {c.regulation && <span className="text-neutral-mid"> · required by {c.regulation}</span>}
                              {c.reverted && <span className="text-neutral-mid"> · later reverted</span>}
                            </span>
                            {/* The requirement names the problem. The wording is the fix, and
                                without it a reader cannot tell what the policy now says. */}
                            {(c.new_text || c.old_text) && (
                              <button
                                onClick={() => setShown(prev => {
                                  const next = new Set(prev)
                                  if (next.has(key)) next.delete(key); else next.add(key)
                                  return next
                                })}
                                className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-teal hover:underline"
                              >
                                {open ? 'Hide wording' : 'See the wording'}
                                <ChevronDown size={11} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                              </button>
                            )}
                          </div>

                          {open && (
                            <div className="ml-5 mt-1.5 space-y-1.5">
                              {c.old_text && (
                                <div className="rounded-md border border-gray-100 bg-neutral-light/40 px-2.5 py-1.5">
                                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Was</p>
                                  <p className="whitespace-pre-wrap text-neutral-mid">{c.old_text}</p>
                                </div>
                              )}
                              {c.new_text && (
                                <div className="rounded-md border border-teal/20 bg-teal-light/20 px-2.5 py-1.5">
                                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">
                                    {c.old_text ? 'Now reads' : 'Added'}
                                  </p>
                                  <p className="whitespace-pre-wrap text-neutral-dark">{c.new_text}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {v.approvals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v.approvals.map((a, i) => (
                      <span
                        key={i}
                        title={a.comment || undefined}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          a.decision === 'rejected' ? 'bg-amber-100 text-amber-800' : 'bg-teal-light/40 text-teal'
                        }`}
                      >
                        {STAGE[a.stage] ?? a.stage}
                        {a.decision === 'rejected' ? ' sent it back' : ' approved'}
                        {a.approver_name ? ` · ${a.approver_name}` : ''}
                        {' · '}{when(a.at)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {reading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReading(null)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
              <FileText size={16} className="text-teal" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-neutral-dark">{reading.title}</h3>
                <p className="text-xs text-neutral-mid">Version {reading.version}, as published on {when(reading.at)}</p>
              </div>
              {/* Inspections want a document, not a screen. */}
              <button onClick={() => window.print()} className="text-neutral-mid hover:text-neutral-dark" title="Print this version"><Printer size={15} /></button>
              <button onClick={() => setReading(null)} className="text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-neutral-dark">{reading.content}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
