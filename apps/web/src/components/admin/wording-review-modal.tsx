'use client'

// CQC wording alignment review — a split-screen overlay (like the Regulation coverage
// gap detail): the person-centred rewrite suggestions on the left, the policy with each
// suggestion highlighted (W-numbered) on the right. Adopting a rewrite replaces the
// highlighted passage in the policy's draft and shows it in place (green).
import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { findBlock, markSafBlock, markBlockAdopted } from './gap-detail-modal'
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
  const [adoptErr, setAdoptErr] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const refKey = statements[0]?.reference_key ?? ''

  useEffect(() => {
    createApiClient(token).policies.preview(policyId)
      .then(d => setHtml(d.html || ''))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
  }, [policyId, token])

  // Sole owner of the preview node's innerHTML (the JSX div stays empty). Re-applies the
  // highlights whenever the doc loads or a suggestion is adopted.
  useEffect(() => {
    const root = previewRef.current
    if (!root || html == null) return
    root.innerHTML = html
    const loc = new Set<number>()
    alignments.forEach((a, i) => {
      if (!a.anchor) return
      if (adopted.has(i)) { if (markBlockAdopted(root, a.anchor, i, a.wording)) loc.add(i); return }
      if (markSafBlock(root, a.anchor, i + 1)) loc.add(i)
    })
    setLocated(loc)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-bold text-neutral-dark"><Sparkles size={16} className="text-indigo-600" /> CQC wording alignment</p>
            <p className="truncate text-xs text-neutral-mid">{policyName}{statements.length ? ` · Supports: ${statements.map(s => s.name).join(', ')}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          {/* Suggestions */}
          <div className="min-h-0 space-y-3 overflow-y-auto border-b border-gray-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs text-neutral-mid">{alignments.length} area{alignments.length === 1 ? '' : 's'} could read in a more person-centred way. Adopting a rewrite replaces the highlighted passage in your policy draft.</p>
            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            {alignments.map((a, i) => (
              <div key={i} className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">W{i + 1}</span>
                  <p className="text-xs font-semibold text-indigo-700">{a.focus}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  {located.has(i)
                    ? <>Highlighted <span className="font-semibold text-indigo-700">W{i + 1}</span> in the policy{a.placement === 'amend' ? <>, adopting rewrites that passage.</> : <>, add the wording there.</>}</>
                    : a.placement === 'new_section'
                      ? <>Add as a new section{a.section_title ? ` “${a.section_title}”` : ''}.</>
                      : a.placement === 'amend'
                        ? <>Rewrites: &ldquo;{a.anchor}&rdquo;</>
                        : <>Add near: &ldquo;{a.anchor}&rdquo;</>}
                </p>
                {a.placement === 'amend' && <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Person-centred rewrite</p>}
                <p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{a.wording}</p>
                <div className="mt-2">
                  {adopted.has(i) ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Adopted, shown in the policy</span>
                  ) : (
                    <button onClick={() => adopt(a, i)} disabled={adopting !== null}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                      {adopting === i ? <><Loader2 size={13} className="animate-spin" /> Adopting…</> : (a.placement === 'amend' ? 'Adopt this rewrite' : 'Adopt this wording')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Policy preview */}
          <div className="min-h-0 overflow-y-auto bg-gray-50/40 p-5">
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
