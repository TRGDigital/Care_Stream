'use client'

// CQC wording alignment review — a split-screen overlay (like the Regulation coverage
// gap detail): the person-centred rewrite suggestions on the left, the policy with each
// suggestion highlighted (W-numbered) on the right. Adopting a rewrite replaces the
// highlighted passage in the policy's draft and shows it in place (green).
import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { locateSafBlock, markSafBlock, markBlockAdopted } from './gap-detail-modal'
import { X, Loader2, CheckCircle2, Sparkles } from 'lucide-react'

type Alignment = { focus: string; placement: 'amend' | 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string }

export function WordingReviewModal({ token, policyId, policyName, statements, alignments, onClose, onAdopted }: {
  token: string
  policyId: string
  policyName: string
  statements: Array<{ reference_key: string; name: string; we_statement: string }>
  alignments: Alignment[]
  onClose: () => void
  onAdopted?: () => void
}) {
  const [html, setHtml]         = useState<string | null>(null)
  const [previewErr, setPreviewErr] = useState('')
  const [adopting, setAdopting] = useState<number | null>(null)
  const [adopted, setAdopted]   = useState<Set<number>>(new Set())
  const [located, setLocated]   = useState<Set<number>>(new Set())
  // Display order: original alignment indices sorted by where they land in the policy, so the
  // W-numbers read 1,2,3… top-to-bottom on both panels. Falls back to list order until located.
  const [order, setOrder]       = useState<number[]>(() => alignments.map((_, i) => i))
  const [adoptErr, setAdoptErr] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const refKey = statements[0]?.reference_key ?? ''

  useEffect(() => {
    createApiClient(token).policies.preview(policyId)
      .then(d => setHtml(d.html || ''))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
  }, [policyId, token])

  // Sole owner of the preview node's innerHTML (the JSX div stays empty). Re-applies the
  // highlights whenever the doc loads or a suggestion is adopted, numbering each marker by its
  // position in the document so the left cards and the right badges share W1, W2, W3…
  useEffect(() => {
    const root = previewRef.current
    if (!root || html == null) return
    root.innerHTML = html

    // 1) Locate each suggestion's block (without mutating) and record its document position.
    const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote,h1,h2,h3,h4,h5,h6'))
    const pos = new Map<number, number>()
    alignments.forEach((a, i) => {
      if (!a.anchor) return
      const el = locateSafBlock(root, a.anchor)
      if (el) pos.set(i, blocks.indexOf(el))
    })
    // 2) Located suggestions in document order, then any unlocated ones in their original order.
    const inDoc = [...pos.keys()].sort((x, y) => (pos.get(x) ?? 0) - (pos.get(y) ?? 0))
    const rest  = alignments.map((_, i) => i).filter(i => !pos.has(i))
    const ord   = [...inDoc, ...rest]
    const num   = new Map<number, number>()
    ord.forEach((origIdx, k) => num.set(origIdx, k + 1))

    // 3) Insert the markers with those shared numbers.
    const loc = new Set<number>()
    ord.forEach(origIdx => {
      const a = alignments[origIdx]
      if (!a.anchor) return
      const n = num.get(origIdx) ?? origIdx + 1
      if (adopted.has(origIdx)) { if (markBlockAdopted(root, a.anchor, n - 1, a.wording)) loc.add(origIdx); return }
      if (markSafBlock(root, a.anchor, n)) loc.add(origIdx)
    })
    setLocated(loc)
    setOrder(ord)
  }, [html, alignments, adopted])

  async function adopt(a: Alignment, idx: number) {
    setAdopting(idx); setAdoptErr('')
    try {
      await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: refKey, requirement: a.focus,
        placement: a.placement, old_text: (a.placement === 'amend' || a.placement === 'add_under_heading') ? a.anchor : '',
        new_text: a.wording, section_title: a.placement === 'new_section' ? (a.section_title || undefined) : undefined,
      })
      setAdopted(s => new Set(s).add(idx))
      onAdopted?.()
    } catch (e: any) { setAdoptErr(e?.message ?? 'Could not adopt this.') }
    finally { setAdopting(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[96rem] rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-bold text-neutral-dark"><Sparkles size={16} className="text-indigo-600" /> CQC wording alignment</p>
            <p className="truncate text-xs text-neutral-mid">{policyName}{statements.length ? ` · Supports: ${statements.map(s => s.name).join(', ')}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <div className="grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[87vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Suggestions */}
          <div className="space-y-3 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            <p className="text-xs text-neutral-mid">{alignments.length} area{alignments.length === 1 ? '' : 's'} could read in a more person-centred way. Adopting a rewrite replaces the highlighted passage in your policy draft.</p>
            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            {order.map((origIdx, k) => {
              const a = alignments[origIdx]
              const num = k + 1
              return (
              <div key={origIdx} className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">W{num}</span>
                  <p className="text-xs font-semibold text-indigo-700">{a.focus}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  {located.has(origIdx)
                    ? <>Highlighted <span className="font-semibold text-indigo-700">W{num}</span> in the policy{a.placement === 'amend' ? <>, adopting rewrites that passage.</> : <>, add the wording there.</>}</>
                    : a.placement === 'new_section'
                      ? <>Add as a new section{a.section_title ? ` “${a.section_title}”` : ''}.</>
                      : a.placement === 'amend'
                        ? <>Rewrites: &ldquo;{a.anchor}&rdquo;</>
                        : <>Add near: &ldquo;{a.anchor}&rdquo;</>}
                </p>
                {a.placement === 'amend' && <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Person-centred rewrite</p>}
                <p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{a.wording}</p>
                <div className="mt-2">
                  {adopted.has(origIdx) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Adopted, shown in the policy</span>
                  ) : (
                    <button onClick={() => adopt(a, origIdx)} disabled={adopting !== null}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                      {adopting === origIdx ? <><Loader2 size={13} className="animate-spin" /> Adopting…</> : (a.placement === 'amend' ? 'Adopt this rewrite' : 'Adopt this wording')}
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>

          {/* Policy preview */}
          <div className="overflow-y-auto bg-neutral-light/20 px-6 py-5 lg:max-h-[87vh]">
            {previewErr ? (
              <p className="text-sm text-red-600">{previewErr}</p>
            ) : html == null ? (
              <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading policy…</div>
            ) : (
              <div ref={previewRef} className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
