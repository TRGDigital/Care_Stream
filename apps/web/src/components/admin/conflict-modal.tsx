'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { highlightStaleTerms, findBlock } from '@/lib/policy-preview'
import { X, Loader2, FileText, CheckCircle2, Check, AlertTriangle, Info, FilePenLine, Ban } from 'lucide-react'

type Conflict = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['consistency']>>['conflicts'][number]

const SEV_BADGE: Record<string, string> = {
  high:   'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-slate-100 text-slate-600',
}

// A/B (switcher) drill-in for one cross-policy conflict: the disagreeing policies' claims on the
// left with a "pick the correct value" step, and the policy preview on the right with a switcher
// and the disputed passage highlighted — the same split-screen as the coverage/lint drill-ins.
export function ConflictModal({ token, conflict, onClose, onResolved, onDismissed }: {
  token:       string
  conflict:    Conflict
  onClose:     () => void
  onResolved:  () => void
  onDismissed: (key: string) => void
}) {
  const positions = conflict.positions
  const [selected, setSelected] = useState(0)                 // which policy shows on the right
  const [correct, setCorrect] = useState<number | null>(null) // which position is the source of truth
  const [htmlBy, setHtmlBy] = useState<Record<string, string>>({})
  const [previewLoad, setPreviewLoad] = useState(false)
  const [previewErr, setPreviewErr] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  const [adopted, setAdopted] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [adoptErr, setAdoptErr] = useState('')
  const [pending, setPending] = useState(0)
  const [dismissing, setDismissing] = useState(false)

  const shownId = positions[selected]?.policy_id

  // Load the selected policy's preview (cached per policy).
  useEffect(() => {
    if (!shownId || htmlBy[shownId] !== undefined) return
    setPreviewLoad(true); setPreviewErr('')
    createApiClient(token).policies.preview(shownId)
      .then(d => setHtmlBy(m => ({ ...m, [shownId]: d.html || '' })))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
      .finally(() => setPreviewLoad(false))
  }, [shownId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight the disputed passage in the shown policy and scroll to it.
  useEffect(() => {
    const root = previewRef.current
    const html = shownId ? htmlBy[shownId] : undefined
    if (!root || html == null) return
    root.innerHTML = html
    const quote = positions[selected]?.quote
    if (!quote) return
    highlightStaleTerms(root, [[quote]])
    let el = root.querySelector<HTMLElement>('mark[data-lint="0"]')
    // The extracted quote isn't always verbatim in the formatted policy — fall back to the
    // sentence/paragraph with the most word overlap so the passage still highlights.
    if (!el) {
      const block = findBlock(root, quote)
      if (block) { block.classList.add('bg-yellow-200', 'rounded', 'px-1', 'py-0.5'); el = block }
    }
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selected, htmlBy]) // eslint-disable-line react-hooks/exhaustive-deps

  async function replaceIn(wrongIdx: number) {
    if (correct == null) return
    const wrong = positions[wrongIdx], right = positions[correct]
    if (!wrong.quote || !right.quote) { setAdoptErr('This one has no exact wording to replace — open the policy and edit it directly.'); return }
    setBusy(wrong.policy_id); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({
        policy_id: wrong.policy_id, reference_key: `consistency:${conflict.key}`,
        requirement: conflict.topic, placement: 'amend',
        old_text: wrong.quote, new_text: right.quote,
      })
      setAdopted(s => new Set(s).add(wrong.policy_id))
      setPending(res.pending)
      onResolved()
      if (!res.applied) setAdoptErr('Recorded, but we could not place it automatically — check the draft when you review.')
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not apply this change.')
    } finally { setBusy(null) }
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
          {/* LEFT — the disagreement + resolution */}
          <div className="space-y-4 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            {conflict.summary && <p className="text-sm text-neutral-dark">{conflict.summary}</p>}
            {pending > 0 && (
              <p className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900">
                <FilePenLine size={12} className="shrink-0" /> {pending} change{pending === 1 ? '' : 's'} adopted into the draft. Review and publish from <a href="/policies" className="font-semibold underline hover:no-underline">Policies</a>.
              </p>
            )}

            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">These policies disagree — pick the correct one</p>
              <div className="space-y-2">
                {positions.map((p, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${correct === i ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} className="mt-1 accent-green-600" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-dark">
                          <FileText size={13} className="shrink-0 text-teal" /> {p.policy_name}
                          {correct === i && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">Correct</span>}
                        </p>
                        <p className="mt-1 text-sm text-neutral-dark">{p.statement}</p>
                        {p.quote && <p className="mt-1 border-l-2 border-gray-200 pl-2 text-xs italic text-neutral-mid">&ldquo;{p.quote}&rdquo;</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button onClick={() => setSelected(i)} className="text-xs font-medium text-teal hover:underline">Show in this policy</button>
                          {correct != null && correct !== i && (
                            adopted.has(p.policy_id) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Aligned in draft</span>
                            ) : (
                              <button onClick={() => replaceIn(i)} disabled={busy !== null}
                                className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-2.5 py-1 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50">
                                {busy === p.policy_id ? <><Loader2 size={12} className="animate-spin" /> Aligning…</> : <><Check size={12} /> Align to the correct value</>}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            {correct == null && <p className="flex items-start gap-1.5 text-xs text-neutral-mid"><Info size={13} className="mt-0.5 shrink-0" /> Pick which policy holds the correct value, then align the others to it. Each change goes through the same approval workflow.</p>}

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
            <p className="mb-3 text-xs text-neutral-mid">The disputed passage is highlighted in <span className="font-medium text-neutral-dark">{positions[selected]?.policy_name}</span>.</p>

            {previewLoad ? (
              <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
            ) : previewErr ? (
              <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{previewErr}</div>
            ) : (
              <div ref={previewRef} className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4" />
            )}
            {!previewLoad && !previewErr && !positions[selected]?.quote && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-mid"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" /> No exact passage recorded for this policy — read it to locate the wording.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
