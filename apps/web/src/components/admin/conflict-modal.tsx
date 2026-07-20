'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { highlightStaleTerms, findBlock } from '@/lib/policy-preview'
import { X, Loader2, FileText, CheckCircle2, Check, AlertTriangle, Info, FilePenLine, Ban, Sparkles } from 'lucide-react'

type Conflict = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['consistency']>>['conflicts'][number]

const SEV_BADGE: Record<string, string> = {
  high:   'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
}

// Drill-in for one cross-policy conflict: the disagreeing policies on the left with a SINGLE
// reconciled wording to adopt into all of them ("Apply to both"), and the policy preview on the
// right with a switcher and the disputed passage highlighted (green once aligned).
export function ConflictModal({ token, conflict, onClose, onResolved, onDismissed }: {
  token:       string
  conflict:    Conflict
  onClose:     () => void
  onResolved:  () => void
  onDismissed: (key: string) => void
}) {
  const positions = conflict.positions
  const [selected, setSelected] = useState(0)                 // which policy shows on the right
  const [htmlBy, setHtmlBy] = useState<Record<string, string>>({})
  const [errBy, setErrBy] = useState<Record<string, string>>({})
  const previewRef = useRef<HTMLDivElement>(null)

  // The single reconciled wording every policy should adopt. Present on newer conflicts; fetched
  // (generated + cached) on open for older ones.
  const [resolution, setResolution] = useState<string>(conflict.resolution ?? '')
  const [resLoad, setResLoad] = useState(!conflict.resolution)
  const [resErr, setResErr] = useState('')

  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [adoptErr, setAdoptErr] = useState('')
  const [pending, setPending] = useState(0)
  const [dismissing, setDismissing] = useState(false)

  const shownId = positions[selected]?.policy_id
  const shownErr = shownId ? errBy[shownId] : ''
  const previewLoad = !!shownId && htmlBy[shownId] === undefined && !errBy[shownId]
  const withQuote = positions.filter(p => p.quote)
  const allApplied = withQuote.length > 0 && withQuote.every(p => applied.has(p.policy_id))
  const applyLabel = positions.length === 2 ? 'Apply to both policies' : `Apply to all ${positions.length} policies`

  // Fetch the reconciled wording if this conflict predates it.
  useEffect(() => {
    if (conflict.resolution) return
    setResLoad(true); setResErr('')
    createApiClient(token).analytics.consistencyResolve(conflict.key)
      .then(d => { if (d.resolution) setResolution(d.resolution); else setResErr('We could not draft a single wording for this one — align the policies by hand.') })
      .catch(e => setResErr(e.message ?? 'Could not draft a reconciled wording.'))
      .finally(() => setResLoad(false))
  }, [conflict.key, conflict.resolution, token])

  // Prefetch + cache EVERY involved policy's formatted preview when the drill-in opens, so
  // switching between them is instant and identical — no slow re-fetch that flashed the policy
  // in a half-formatted state first. The formatted HTML is rebuilt on demand server-side (a few
  // DB + AI calls), so caching it also spares the API a burst of concurrent work. The cache is
  // shared with the wording overlay and survives reloads.
  useEffect(() => {
    let cancelled = false
    positions.forEach(p => {
      const key = `policy-preview-${p.policy_id}`
      const cached = persistentCache.get<string>(key)
      if (cached != null) { setHtmlBy(m => (p.policy_id in m ? m : { ...m, [p.policy_id]: cached })); return }
      createApiClient(token).policies.preview(p.policy_id)
        .then(d => { const h = d.html || ''; persistentCache.set(key, h); if (!cancelled) setHtmlBy(m => ({ ...m, [p.policy_id]: h })) })
        .catch(e => { if (!cancelled) setErrBy(m => ({ ...m, [p.policy_id]: e.message ?? 'Could not load the policy.' })) })
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the disputed passage in the shown policy — or, once aligned, show the reconciled
  // wording in its place (green) — and scroll to it.
  useEffect(() => {
    const root = previewRef.current
    const html = shownId ? htmlBy[shownId] : undefined
    if (!root || html == null) return
    root.innerHTML = html
    const quote = positions[selected]?.quote
    if (!quote) return

    if (applied.has(shownId) && resolution) {
      const block = findBlock(root, quote)
      if (block) {
        block.textContent = resolution
        block.classList.add('bg-green-100', 'rounded', 'px-1', 'py-0.5')
        block.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
    }
    highlightStaleTerms(root, [[quote]])
    let el = root.querySelector<HTMLElement>('mark[data-lint="0"]')
    // The extracted quote isn't always verbatim in the formatted policy — fall back to the
    // sentence/paragraph with the most word overlap so the passage still highlights.
    if (!el) {
      const block = findBlock(root, quote)
      if (block) { block.classList.add('bg-yellow-200', 'rounded', 'px-1', 'py-0.5'); el = block }
    }
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selected, htmlBy, applied, resolution]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply the one reconciled wording to every policy, replacing its conflicting passage.
  async function applyToAll() {
    if (!resolution) return
    setBusy(true); setAdoptErr('')
    const done = new Set(applied)
    let lastPending = pending
    try {
      for (const p of positions) {
        if (!p.quote || done.has(p.policy_id)) continue
        const res = await createApiClient(token).analytics.adoptSuggestion({
          policy_id: p.policy_id, reference_key: `consistency:${conflict.key}`,
          requirement: conflict.topic, placement: 'amend',
          old_text: p.quote, new_text: resolution,
        })
        done.add(p.policy_id); lastPending = res.pending
      }
      setApplied(done); setPending(lastPending); onResolved()
      const noQuote = positions.length - withQuote.length
      if (noQuote > 0) setAdoptErr(`Applied where we could locate the passage. ${noQuote} polic${noQuote === 1 ? 'y has' : 'ies have'} no exact passage recorded — open ${noQuote === 1 ? 'it' : 'them'} and paste the wording in.`)
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not apply the wording.')
    } finally { setBusy(false) }
  }

  async function dismiss() {
    setDismissing(true)
    try { await createApiClient(token).analytics.consistencyDismiss(conflict.key); onDismissed(conflict.key); onClose() }
    catch { setDismissing(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[96rem] rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Cross-policy conflict</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-lg font-bold text-neutral-dark">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEV_BADGE[conflict.severity] ?? SEV_BADGE.low}`}>{conflict.severity}</span>
              {conflict.topic}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        <div className="grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[87vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* LEFT — the disagreement + single reconciled wording */}
          <div className="space-y-4 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            {conflict.summary && <p className="text-sm text-neutral-dark">{conflict.summary}</p>}
            {pending > 0 && (
              <p className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
                <FilePenLine size={12} className="shrink-0" /> {pending} change{pending === 1 ? '' : 's'} adopted into the draft. Review and publish from <a href="/policies" className="font-semibold underline hover:no-underline">Policies</a>.
              </p>
            )}

            {/* What each policy currently says — read-only context */}
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">These policies disagree</p>
              <div className="space-y-2">
                {positions.map((p, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-dark">
                      <FileText size={13} className="shrink-0 text-teal" /> {p.policy_name}
                      {applied.has(p.policy_id) && <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700"><Check size={10} /> Aligned</span>}
                    </p>
                    <p className="mt-1 text-sm text-neutral-dark">{p.statement}</p>
                    {p.quote && <p className="mt-1 border-l-2 border-gray-200 pl-2 text-xs italic text-neutral-mid">&ldquo;{p.quote}&rdquo;</p>}
                    <button onClick={() => setSelected(i)} className="mt-2 text-xs font-medium text-teal hover:underline">Show in this policy</button>
                  </div>
                ))}
              </div>
            </div>

            {/* The one reconciled wording + apply-to-all */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700"><Sparkles size={13} /> Agreed wording for {positions.length === 2 ? 'both policies' : 'all these policies'}</p>
              {resLoad ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Drafting a single wording that resolves the conflict…</p>
              ) : resErr ? (
                <p className="mt-2 text-sm text-red-600">{resErr}</p>
              ) : (
                <>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-neutral-dark">{resolution}</p>
                  <p className="mt-2 text-xs text-neutral-mid">Adopting replaces the conflicting passage in {positions.length === 2 ? 'both policies' : 'each policy'} with this wording, so they all say the same thing.</p>
                  <div className="mt-2.5">
                    {allApplied ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 size={15} /> Applied to {positions.length === 2 ? 'both policies' : 'all policies'}</span>
                    ) : (
                      <button onClick={applyToAll} disabled={busy || !resolution}
                        className="inline-flex items-center gap-1.5 rounded-btn bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                        {busy ? <><Loader2 size={14} className="animate-spin" /> Applying…</> : <><Check size={14} /> {applyLabel}</>}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            <p className="flex items-start gap-1.5 text-xs text-neutral-mid"><Info size={13} className="mt-0.5 shrink-0" /> Each change goes into the policy draft and through the same approval workflow before staff see it.</p>

            <div className="border-t border-gray-100 pt-3">
              <button onClick={dismiss} disabled={dismissing}
                className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50 disabled:opacity-50">
                {dismissing ? <><Loader2 size={13} className="animate-spin" /> Dismissing…</> : <><Ban size={13} /> Not a conflict — dismiss</>}
              </button>
              <p className="mt-1.5 text-xs text-neutral-mid">Dismiss if these are compatible in context; it won&rsquo;t come back on the next check.</p>
            </div>
          </div>

          {/* RIGHT — the policy, with the disputed passage highlighted; switch between them */}
          <div className="overflow-y-auto bg-neutral-light/20 px-6 py-5 lg:max-h-[87vh]">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {positions.map((p, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  className={`rounded-btn px-2.5 py-1.5 text-xs font-semibold ${selected === i ? 'bg-teal text-white' : 'border border-gray-200 bg-white text-neutral-mid hover:bg-gray-50'}`}>
                  {p.policy_name}
                </button>
              ))}
            </div>
            <p className="mb-3 text-xs text-neutral-mid">
              {applied.has(shownId ?? '')
                ? <>The agreed wording is now shown in place (green) in <span className="font-medium text-neutral-dark">{positions[selected]?.policy_name}</span>.</>
                : <>The disputed passage is highlighted in <span className="font-medium text-neutral-dark">{positions[selected]?.policy_name}</span>.</>}
            </p>

            {previewLoad ? (
              <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
            ) : shownErr ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{shownErr}</div>
            ) : (
              <div ref={previewRef} className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4" />
            )}
            {!previewLoad && !shownErr && !positions[selected]?.quote && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-mid"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" /> No exact passage recorded for this policy — read it to locate the wording.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
