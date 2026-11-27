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
import { AdoptNamedPeople, type AdoptPerson } from './adopt-named-people'

type Alignment = { focus: string; placement: 'amend' | 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string; ref?: string }

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

/** Words in [square brackets] in a suggestion are for the admin to decide. Each gets a box to type in, and a number gets the option of the number of staff already in CareStream. */
function PlaceholderFill({ text, staffCount, onChange }: { text: string; staffCount: number | null; onChange: (t: string) => void }) {
  const tokens = [...new Set(text.match(/\[[^\]]+\]/g) ?? [])]
  const [vals, setVals] = useState<Record<string, string>>({})
  if (tokens.length === 0) return null
  const apply = (tok: string, v: string) => { if (v.trim()) onChange(text.split(tok).join(v.trim())) }
  return (
    <div className="mt-2 space-y-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Words for you to decide</p>
      {tokens.map(tok => {
        const label = tok.slice(1, -1)
        const isCount = /number|employ|staff|headcount|people|size/i.test(label)
        const v = vals[tok] ?? ''
        return (
          <div key={tok}>
            <p className="text-xs font-semibold text-neutral-dark">{label}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {isCount && staffCount != null && (
                <button type="button" onClick={() => apply(tok, String(staffCount))} className="rounded-btn border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50">Use the number of staff in CareStream ({staffCount})</button>
              )}
              <input value={v} onChange={e => setVals(cur => ({ ...cur, [tok]: e.target.value }))} placeholder={isCount ? 'Or type a number' : 'Type your answer'} aria-label={label}
                     className="min-w-[10rem] flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs" />
              <button type="button" disabled={!v.trim()} onClick={() => apply(tok, v)} className="rounded-btn border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-40">Use this</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WordingReviewModal({ token, policyId, policyName, statements, alignments, onClose, onAdopted, variant = 'wording' }: {
  token: string
  policyId: string
  policyName: string
  statements: Array<{ reference_key: string; name: string; we_statement: string }>
  alignments: Alignment[]
  onClose: () => void
  onAdopted?: () => void
  // The same side by side review serves step 4 (CQC wording) and step 5 (clarity and precision).
  variant?: 'wording' | 'clarity' | 'testing'
}) {
  const clar = variant === 'clarity'
  const test = variant === 'testing'
  const P = clar ? 'C' : test ? 'T' : 'W'
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
  // Clarity and policy testing suggestions can be edited before they are adopted: the wording box, the named people from Organisation details (Weave in), and the words in [brackets].
  const editable = variant !== 'wording'
  const [texts, setTexts]       = useState<Record<number, string>>({})
  const [adoptedTexts, setAdoptedTexts] = useState<Record<number, string>>({})
  const [undo, setUndo]         = useState<Record<number, string>>({})
  const [weaving, setWeaving]   = useState<string | null>(null)
  const [weaveErr, setWeaveErr] = useState('')
  const [ctx, setCtx]           = useState<Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['adoptionContext']>> | null>(null)
  const [people, setPeople]     = useState<AdoptPerson[]>([])
  const textOf = (i: number) => texts[i] ?? alignments[i]?.wording ?? ''
  const staffCount = people.length ? people.filter(p => p.is_active !== false).length : null
  useEffect(() => {
    if (!editable) return
    const api = createApiClient(token)
    api.analytics.adoptionContext().then(setCtx).catch(() => {})
    api.users.list().then((d: any) => { const l = Array.isArray(d) ? d : (d?.users ?? []); setPeople(l.map((u: any) => ({ name: String(u.name ?? ''), photo_url: u.photo_url ?? null, is_active: u.is_active !== false }))) }).catch(() => {})
  }, [editable, token])
  async function weave(idx: number, name: string, role: string) {
    setWeaving(name); setWeaveErr('')
    try {
      const r = await createApiClient(token).analytics.weaveName({ text: textOf(idx), name, role, policy_name: policyName })
      setUndo(u => ({ ...u, [idx]: textOf(idx) })); setTexts(t => ({ ...t, [idx]: r.text }))
    } catch (e: any) { setWeaveErr(e?.message ?? 'Could not place the name this time. Your wording is unchanged.') }
    finally { setWeaving(null) }
  }
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
      const shown = adoptedTexts[origIdx] ?? a.wording
      const { title, body } = splitNewWording({ ...a, wording: shown })
      if (a.placement === 'amend') {
        const el = elFor[origIdx]
        if (!el || claimed.has(el)) return          // no block, or would collide → leave unplaced
        claimed.add(el)
        if (adopted.has(origIdx)) markBlockAdoptedEl(el, n, shown, P)
        else markSafBlockEl(el, n, P)
        loc.add(origIdx)
      } else if (a.placement === 'add_under_heading') {
        const node = newBlock(n, title, body, adopted.has(origIdx), 'New wording', P)
        const h = elFor[origIdx]
        if (h) h.after(node); else root.appendChild(node)   // heading gone → append at the end
        loc.add(origIdx)
      } else {                                       // new_section
        root.appendChild(newBlock(n, title ?? (a.section_title || undefined), body, adopted.has(origIdx), 'New section', P))
        loc.add(origIdx)
      }
    })
    setLocated(loc)
    setOrder(ord)
  }, [html, alignments, adopted, adoptedTexts])

  async function adopt(a0: Alignment, idx: number) {
    setAdopting(idx); setAdoptErr('')
    const a: Alignment = { ...a0, wording: textOf(idx) }   // what is in the box, which may have been edited
    try {
      const { title, body } = splitNewWording(a)
      await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: a.ref ?? refKey, requirement: a.focus,
        placement: a.placement, old_text: (a.placement === 'amend' || a.placement === 'add_under_heading') ? a.anchor : '',
        // For a new section, add the title as a bold heading (## …) with just the body beneath it,
        // so the title isn't repeated in the body text.
        new_text: a.placement === 'new_section' ? body : a.wording,
        section_title: a.placement === 'new_section' ? (title || undefined) : undefined,
      })
      setAdoptedTexts(t => ({ ...t, [idx]: a.wording }))
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
            <p className="flex items-center gap-2 text-base font-bold text-neutral-dark"><Sparkles size={16} className="text-indigo-600" /> {clar ? 'Clarity and precision' : test ? 'Policy testing' : 'CQC wording alignment'}</p>
            <p className="truncate text-xs text-neutral-mid">{policyName}{statements.length ? ` · Supports: ${statements.map(s => s.name).join(', ')}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
        </div>

        {clar ? (
          <div className="mx-6 mt-5 overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50/50">
            <div className="flex items-start gap-2.5 px-4 py-3">
              <BookOpen size={15} className="mt-0.5 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">About clarity and precision</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-dark">
                  This finds wording that sounds professional but does not tell staff exactly what to do: vague wording, no named person, passive wording, no escalation route, no timeframe, jargon.
                  Each passage is numbered (C1, C2&hellip;) and highlighted on the policy to the right. Adopting a rewrite replaces that passage in your working draft; nothing changes for staff until you publish the policy.
                  Words in square brackets are for you to decide, so edit them before you publish.
                </p>
              </div>
            </div>
          </div>
        ) : test ? (
          <div className="mx-6 mt-5 overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50/50">
            <div className="flex items-start gap-2.5 px-4 py-3">
              <BookOpen size={15} className="mt-0.5 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">About policy testing</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-dark">
                  These are the points the policy test found the policy does not say, or says only in part. Each suggestion is numbered (T1, T2&hellip;). Wording that rewrites a passage is highlighted in the policy to the right; wording for a point the policy does not mention is added as a new section at the end. Adopting puts it in your working draft; nothing changes for staff until you publish the policy.
                  Run the test again afterwards to confirm the gaps are closed.
                </p>
              </div>
            </div>
          </div>
        ) : (
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
        )}

        <div className="mt-4 grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[80vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {/* Suggestions */}
          <div className="space-y-3 overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
            <p className="text-xs text-neutral-mid">{clar ? `${alignments.length} passage${alignments.length === 1 ? '' : 's'} could tell staff more clearly what to do.` : test ? `${alignments.length} point${alignments.length === 1 ? ' is' : 's are'} not fully covered by this policy.` : `${alignments.length} area${alignments.length === 1 ? '' : 's'} could read in a more person-centred way.`} Adopting a rewrite replaces the highlighted passage in your policy draft.</p>
            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}
            {order.map((origIdx, k) => {
              const a = alignments[origIdx]
              const num = k + 1
              const { title, body } = splitNewWording(a)
              return (
              <div key={origIdx} className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">{P}{num}</span>
                  <p className="text-xs font-semibold text-indigo-700">{a.focus}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-mid">
                  {located.has(origIdx)
                    ? <>Shown as <span className="font-semibold text-indigo-700">{P}{num}</span> in the policy{a.placement === 'amend' ? <>; adopting rewrites that passage.</> : a.placement === 'add_under_heading' ? <>, as a new block under its heading; adopt to add it.</> : <>, as a new section; adopt to add it.</>}</>
                    : html == null
                      ? <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Locating this passage in the policy…</span>
                      : <>Couldn&rsquo;t pinpoint this passage automatically &mdash; adopting still rewrites it in your draft.</>}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">
                  {a.placement === 'amend' ? (clar ? 'Clearer rewrite' : test ? 'Wording that covers this point' : 'Person-centred rewrite') : a.placement === 'new_section' ? 'New section to add' : 'New wording to add'}
                </p>
                {a.placement !== 'amend' && title && <p className="mt-0.5 text-sm font-bold text-neutral-dark">{title}</p>}
                {editable && !adopted.has(origIdx) ? (
                  <>
                    <textarea aria-label={`Wording for ${P}${num}`} value={textOf(origIdx)} onChange={e => setTexts(t => ({ ...t, [origIdx]: e.target.value }))}
                              rows={Math.min(8, Math.max(3, Math.ceil(textOf(origIdx).length / 70)))} className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-neutral-dark focus:border-indigo-300 focus:outline-none" />
                    <PlaceholderFill text={textOf(origIdx)} staffCount={staffCount} onChange={t => setTexts(cur => ({ ...cur, [origIdx]: t }))} />
                    {ctx?.names_v2 && (
                      <AdoptNamedPeople roleHolders={ctx.role_holders} nominated={ctx.variables.find(v => v.key === 'nominated_individual')?.value ?? ''} approver={ctx.variables.find(v => v.key === 'default_approver')?.value ?? ''}
                        people={people} wording={textOf(origIdx)} requirement={a.focus} policyName={policyName} policyText={previewRef.current?.textContent ?? ''}
                        weaving={weaving} canUndo={undo[origIdx] !== undefined} error={weaveErr}
                        onWeave={(name, role) => void weave(origIdx, name, role)} onUndo={() => { const prev = undo[origIdx]; if (prev === undefined) return; setTexts(t => ({ ...t, [origIdx]: prev })); setUndo(u => { const n2 = { ...u }; delete n2[origIdx]; return n2 }) }} />
                    )}
                  </>
                ) : (
                  <p className="mt-0.5 whitespace-pre-line text-sm text-neutral-dark">{adopted.has(origIdx) && adoptedTexts[origIdx] ? adoptedTexts[origIdx] : a.placement === 'amend' ? a.wording : body}</p>
                )}
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
                        <span className={`flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${isNew ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-700'}`}>{P}{num}</span>
                        <span className="min-w-0">
                          {a.placement === 'amend'
                            ? <><span className="font-medium text-indigo-700">{a.focus}</span> <span className="text-neutral-mid">&mdash; {clar ? 'rewrite this passage so staff know exactly what to do.' : test ? 'rewrite this passage so it covers the point.' : 'rewrite this whole passage to read in a more person-centred way.'}</span></>
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
