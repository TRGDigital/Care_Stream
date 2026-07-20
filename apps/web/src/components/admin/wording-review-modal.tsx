'use client'

// CQC wording alignment review — a split-screen overlay (like the Regulation coverage
// gap detail): the person-centred rewrite suggestions on the left, the policy with each
// suggestion highlighted (W-numbered) on the right. Adopting a rewrite replaces the
// highlighted passage in the policy's draft and shows it in place (green).
import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { findBlock, findHeadingBlock, markSafBlockEl, markBlockAdoptedEl, newBlock } from './gap-detail-modal'
import { X, Loader2, CheckCircle2, Sparkles, BookOpen, ChevronDown } from 'lucide-react'

type Alignment = { focus: string; placement: 'amend' | 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string }

// New wording (add-under-heading / new-section) often carries its own title as the first short
// line — split it out so the title can be shown bold and never duplicated in the body.
function splitNewWording(a: Alignment): { title?: string; body: string } {
  if (a.section_title && a.section_title.trim()) return { title: a.section_title.trim(), body: a.wording.trim() }
  const parts = a.wording.split(/\n\n+/)
  const head = parts[0]?.trim() ?? ''
  if (parts.length > 1 && head.length > 0 && head.length <= 80 && !/[.!?:]$/.test(head)) {
    return { title: head, body: parts.slice(1).join('\n\n').trim() }
  }
  return { body: a.wording.trim() }
}

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
  const [synOpen, setSynOpen]   = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const refKey = statements[0]?.reference_key ?? ''

  // Cache the formatted policy HTML on the FIRST open, keyed by policy. The server rebuilds the
  // formatted copy on demand (which is non-deterministic), so re-fetching each time made the
  // highlights/wording appear to shift. Cached client-side, every later open is instant and
  // identical. The preview is the original policy (adoptions are overlaid in the browser), so it
  // never goes stale.
  useEffect(() => {
    const key = `policy-preview-${policyId}`
    const cached = persistentCache.get<string>(key)
    if (cached != null) { setHtml(cached); return }
    createApiClient(token).policies.preview(policyId)
      .then(d => { const h = d.html || ''; persistentCache.set(key, h); setHtml(h) })
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
  }, [policyId, token])

  // Sole owner of the preview node's innerHTML (the JSX div stays empty). Re-applies the
  // highlights whenever the doc loads or a suggestion is adopted, numbering each marker by its
  // position in the document so the left cards and the right badges share W1, W2, W3…
  useEffect(() => {
    const root = previewRef.current
    if (!root || html == null) return
    root.innerHTML = html

    // 1) Locate each suggestion (without mutating), placement-aware: an "amend" rewrites an
    //    existing body block; "add_under_heading" attaches under a heading; "new_section" has
    //    no anchor and lands at the end. A title is never rewritten in place.
    const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote,h1,h2,h3,h4,h5,h6'))
    const elFor  = alignments.map(a =>
      a.placement === 'amend'            ? findBlock(root, a.anchor)
    : a.placement === 'add_under_heading' ? findHeadingBlock(root, a.anchor)
    : null)
    const pos = new Map<number, number>()
    elFor.forEach((el, i) => { if (el) pos.set(i, blocks.indexOf(el)) })

    // 2) Located suggestions in document order, then any without a position (new sections,
    //    or anchors we could not find) in their original order.
    const inDoc = [...pos.keys()].sort((x, y) => (pos.get(x) ?? 0) - (pos.get(y) ?? 0))
    const rest  = alignments.map((_, i) => i).filter(i => !pos.has(i))
    const ord   = [...inDoc, ...rest]
    const num   = new Map<number, number>()
    ord.forEach((origIdx, k) => num.set(origIdx, k + 1))

    // 3) Render the markers with those shared numbers. Each body block hosts at most ONE amend
    //    badge — two suggestions never stack on the same passage.
    const claimed = new Set<Element>()
    const loc = new Set<number>()
    ord.forEach(origIdx => {
      const a = alignments[origIdx]
      const n = num.get(origIdx) ?? origIdx + 1
      const { title, body } = splitNewWording(a)
      if (a.placement === 'amend') {
        const el = elFor[origIdx]
        if (!el || claimed.has(el)) return          // no block, or would collide → leave unplaced
        claimed.add(el)
        if (adopted.has(origIdx)) markBlockAdoptedEl(el, n, a.wording)
        else markSafBlockEl(el, n)
        loc.add(origIdx)
      } else if (a.placement === 'add_under_heading') {
        const node = newBlock(n, title, body, adopted.has(origIdx), 'New wording')
        const h = elFor[origIdx]
        if (h) h.after(node); else root.appendChild(node)   // heading gone → append at the end
        loc.add(origIdx)
      } else {                                       // new_section
        root.appendChild(newBlock(n, title ?? (a.section_title || undefined), body, adopted.has(origIdx), 'New section'))
        loc.add(origIdx)
      }
    })
    setLocated(loc)
    setOrder(ord)
  }, [html, alignments, adopted])

  async function adopt(a: Alignment, idx: number) {
    setAdopting(idx); setAdoptErr('')
    try {
      const { title, body } = splitNewWording(a)
      await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: refKey, requirement: a.focus,
        placement: a.placement, old_text: (a.placement === 'amend' || a.placement === 'add_under_heading') ? a.anchor : '',
        // For a new section, add the title as a bold heading (## …) with just the body beneath it,
        // so the title isn't repeated in the body text.
        new_text: a.placement === 'new_section' ? body : a.wording,
        section_title: a.placement === 'new_section' ? (title || undefined) : undefined,
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

        {/* Synopsis — what SAF wording alignment is and does (like the Coverage detail summary) */}
        <div className="mx-6 mt-5 overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50/50">
          <div className="flex items-start gap-2.5 px-4 py-3">
            <BookOpen size={15} className="mt-0.5 shrink-0 text-indigo-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">About CQC wording alignment</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-dark">
                CQC&rsquo;s Single Assessment Framework (SAF) judges providers against &ldquo;quality statements&rdquo; written as first-person &ldquo;we&rdquo; statements &mdash; plain, person-centred language about people&rsquo;s experiences and outcomes.
              </p>
              {synOpen && (
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-dark">
                  <p>This checks {policyName ? 'this policy' : 'the policy'} against the quality statements it supports{statements.length ? <> ({statements.map(s => s.name).join(', ')})</> : ''}, and suggests rewrites so your wording mirrors that person-centred style. It never changes the policy&rsquo;s meaning or your legal duties &mdash; only how it reads.</p>
                  <p>Each suggestion is numbered (W1, W2&hellip;) and highlighted on the policy to the right. Adopting a rewrite replaces that passage in your working draft; nothing changes for staff until you publish the policy.</p>
                </div>
              )}
              <div className="mt-2">
                <button onClick={() => setSynOpen(o => !o)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 underline underline-offset-2 hover:no-underline">
                  {synOpen ? <>Show less <ChevronDown size={11} className="rotate-180" /></> : <>Read more <ChevronDown size={11} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[80vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Suggestions */}
          <div className="space-y-3 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            <p className="text-xs text-neutral-mid">{alignments.length} area{alignments.length === 1 ? '' : 's'} could read in a more person-centred way. Adopting a rewrite replaces the highlighted passage in your policy draft.</p>
            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            {order.map((origIdx, k) => {
              const a = alignments[origIdx]
              const num = k + 1
              const { title, body } = splitNewWording(a)
              return (
              <div key={origIdx} className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">W{num}</span>
                  <p className="text-xs font-semibold text-indigo-700">{a.focus}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  {located.has(origIdx)
                    ? <>Shown as <span className="font-semibold text-indigo-700">W{num}</span> in the policy{a.placement === 'amend' ? <>; adopting rewrites that passage.</> : a.placement === 'add_under_heading' ? <>, as a new block under its heading; adopt to add it.</> : <>, as a new section; adopt to add it.</>}</>
                    : html == null
                      ? <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Locating this passage in the policy…</span>
                      : <>Couldn&rsquo;t pinpoint this passage automatically &mdash; adopting still rewrites it in your draft.</>}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">
                  {a.placement === 'amend' ? 'Person-centred rewrite' : a.placement === 'new_section' ? 'New section to add' : 'New wording to add'}
                </p>
                {a.placement !== 'amend' && title && <p className="mt-0.5 text-sm font-bold text-neutral-dark">{title}</p>}
                <p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{a.placement === 'amend' ? a.wording : body}</p>
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

            {/* What changes, key — same legend as the Coverage detail, mapping each W-number to
                what it does in the policy above. */}
            {html != null && alignments.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-mid">What changes, key</p>
                <ul className="space-y-1.5">
                  {order.map((origIdx, k) => {
                    const a = alignments[origIdx]
                    const num = k + 1
                    const isNew = a.placement !== 'amend'
                    const { title } = splitNewWording(a)
                    return (
                      <li key={origIdx} className="flex gap-2 text-xs text-neutral-dark">
                        <span className={`flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${isNew ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-700'}`}>W{num}</span>
                        <span className="min-w-0">
                          {a.placement === 'amend'
                            ? <><span className="font-medium text-indigo-700">{a.focus}</span> <span className="text-neutral-mid">&mdash; rewrite this whole passage to read in a more person-centred way.</span></>
                            : a.placement === 'add_under_heading'
                              ? <><span className="text-neutral-dark">New wording{title ? <>: {title}</> : null}</span> <span className="text-neutral-mid">(added under the &ldquo;{a.anchor}&rdquo; heading)</span></>
                              : <span className="text-neutral-dark">New section{title ? <>: {title}</> : null}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
