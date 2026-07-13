'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { markStalePhrase, highlightSearch, quoteColour } from '@/lib/policy-preview'
import { X, Loader2, Search, FileText, CheckCircle2, Check, AlertTriangle, Info, FilePenLine } from 'lucide-react'

type LintData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyLint']>>
type Finding = LintData['policies'][number]['findings'][number]

// The same split-screen as the Regulation-coverage drill-in, for out-of-date content: the
// stale findings on the left (each with a one-click "Replace" that flows through the same
// approval workflow), the policy on the right with the stale wording highlighted.
export function PolicyLintModal({ token, policyId, policyName, findings, onClose, onAdopted }: {
  token:      string
  policyId:   string
  policyName: string
  findings:   Finding[]
  onClose:    () => void
  onAdopted?: () => void
}) {
  const [html, setHtml] = useState<string | null>(null)
  const [previewLoad, setPreviewLoad] = useState(false)
  const [previewErr, setPreviewErr] = useState('')
  const [policySearch, setPolicySearch] = useState('')
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const [adopted, setAdopted] = useState<Set<number>>(new Set())   // indices of replaceable findings adopted
  const [busy, setBusy] = useState<number | null>(null)
  const [adoptErr, setAdoptErr] = useState('')
  const [pending, setPending] = useState(0)

  // A finding is one-click replaceable when it's a text match with a known replacement.
  const replaceable = findings
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.kind === 'text' && !!f.superseded_by && f.samples.length > 0)
  const advisory = findings.filter(f => !(f.kind === 'text' && f.superseded_by && f.samples.length > 0))

  // Load the policy preview (right pane).
  useEffect(() => {
    setPreviewLoad(true)
    createApiClient(token).policies.preview(policyId)
      .then(d => setHtml(d.html || ''))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
      .finally(() => setPreviewLoad(false))
  }, [token, policyId])

  // Re-highlight whenever the policy loads or the search term changes: reset to the original
  // HTML, tint + number each stale phrase's block, then apply the search highlights.
  useEffect(() => {
    const root = previewRef.current
    if (!root || html == null) return
    root.innerHTML = html
    replaceable.forEach(({ f }, n) => {
      const anchor = f.samples[0]?.match
      if (anchor) markStalePhrase(root, anchor, n)
    })
    if (policySearch.trim().length >= 2) {
      setMatchCount(highlightSearch(root, policySearch))
      root.querySelector('mark.bg-teal-200')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else {
      setMatchCount(null)
    }
  }, [html, policySearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function replace(f: Finding, idx: number) {
    if (!f.superseded_by || !f.samples[0]) return
    setBusy(idx); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: `policy-lint:${f.signal_key}`,
        requirement: f.label, placement: 'amend',
        old_text: f.samples[0].match, new_text: f.superseded_by,
      })
      setAdopted(s => new Set(s).add(idx))
      setPending(res.pending)
      onAdopted?.()
      if (!res.applied) setAdoptErr('Recorded, but we could not place it automatically — check the draft when you review.')
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not apply this replacement.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[96rem] rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Out-of-date content</p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-dark">{policyName}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        {/* Split screen: what to change (left) · the policy (right) */}
        <div className="grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[87vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">

          {/* LEFT — what to change */}
          <div className="space-y-5 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            {pending > 0 && (
              <p className="-mt-1 flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
                <FilePenLine size={12} className="shrink-0" /> {pending} change{pending === 1 ? '' : 's'} adopted into your {policyName} draft. Review and publish it from <a href="/policies" className="font-semibold underline hover:no-underline">Policies</a>.
              </p>
            )}

            {replaceable.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><FilePenLine size={15} className="text-amber-600" /> Replace out-of-date wording ({replaceable.length})</p>
                {replaceable.map(({ f, i }, n) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour(n)}`}>{n + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-neutral-dark">
                          {f.label}
                          {f.count > 1 && <span className="text-xs font-normal text-neutral-mid">×{f.count}</span>}
                        </p>
                        {f.detail && <p className="mt-0.5 text-xs text-neutral-mid">{f.detail}</p>}
                        <p className="mt-2 text-sm">
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 line-through">{f.samples[0].match}</span>
                          <span className="mx-1.5 text-neutral-mid">→</span>
                          <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-700">{f.superseded_by}</span>
                        </p>
                        <div className="mt-2.5">
                          {adopted.has(i) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Replaced in your draft</span>
                          ) : (
                            <button onClick={() => replace(f, i)} disabled={busy !== null}
                              className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50">
                              {busy === i ? <><Loader2 size={13} className="animate-spin" /> Replacing…</> : <><Check size={13} /> Replace in {policyName}</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}

            {advisory.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Info size={15} className="text-neutral-mid" /> Also flagged</p>
                {advisory.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-neutral-light/30 px-4 py-2.5">
                    {f.severity === 'high' ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" /> : <Info size={14} className="mt-0.5 shrink-0 text-amber-500" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-dark">{f.label}</p>
                      {f.detail && <p className="text-xs text-neutral-mid">{f.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="border-t border-gray-100 pt-3 text-xs italic text-neutral-mid">
              Replacements are applied to your policy draft and go through the same approval workflow as coverage changes. Review and publish from Policies.
            </p>
          </div>

          {/* RIGHT — the policy, with the out-of-date wording highlighted */}
          <div className="overflow-y-auto bg-neutral-light/20 px-6 py-5 lg:max-h-[87vh]">
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">The policy</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">
                <FileText size={14} className="shrink-0 text-teal" /> <span className="min-w-0 break-words">{policyName}</span>
              </p>
              {replaceable.length > 0
                ? <p className="mt-0.5 text-xs text-neutral-mid">Each numbered highlight is the out-of-date wording for the same-numbered item on the left.</p>
                : <p className="mt-0.5 text-xs text-neutral-mid">Use the search below to find wording in this policy.</p>}
            </div>

            {/* Search the policy */}
            <div className="relative mb-3">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-mid" />
              <input
                type="text" value={policySearch} onChange={e => setPolicySearch(e.target.value)}
                placeholder="Search this policy…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-24 text-sm focus:border-teal focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {policySearch.trim().length >= 2 && (
                  <span className="text-xs font-medium text-neutral-mid">{matchCount ?? 0} match{matchCount === 1 ? '' : 'es'}</span>
                )}
                {policySearch && (
                  <button type="button" onClick={() => setPolicySearch('')} aria-label="Clear search"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-mid hover:bg-gray-100 hover:text-neutral-dark">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {previewLoad ? (
              <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
            ) : previewErr ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{previewErr}</div>
            ) : html ? (
              <div ref={previewRef} className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4" />
            ) : (
              <p className="text-sm text-neutral-mid">This policy isn&rsquo;t ready to preview yet.</p>
            )}

            {replaceable.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-mid">Highlight key</p>
                <ul className="space-y-1.5">
                  {replaceable.map(({ f }, n) => (
                    <li key={n} className="flex gap-2 text-xs text-neutral-dark">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour(n)}`}>{n + 1}</span>
                      <span className="min-w-0"><span className={`rounded px-1.5 py-0.5 ${quoteColour(n)}`}>{f.samples[0].match}</span> <span className="ml-1 text-neutral-mid">replace with {f.superseded_by}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
