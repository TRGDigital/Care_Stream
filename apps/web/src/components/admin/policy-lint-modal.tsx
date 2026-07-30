'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { highlightStaleTerms, highlightSearch, quoteColour } from '@/lib/policy-preview'
import { buildPolicyDiffHtml } from '@/lib/policy-diff'
import { X, Loader2, Search, FileText, CheckCircle2, Check, AlertTriangle, Info, FilePenLine, Locate, History, ExternalLink, SquarePen, CalendarClock, Trash2 } from 'lucide-react'

type LintData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyLint']>>
type Finding = LintData['policies'][number]['findings'][number]

const fmtReviewDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

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

  const [adopted, setAdopted] = useState<Set<number>>(new Set())   // original finding indices adopted
  const [busy, setBusy] = useState<number | null>(null)
  const [adoptErr, setAdoptErr] = useState('')
  const [pending, setPending] = useState(0)
  // Editable replacement text (per finding index) for signals with no single clean swap, e.g.
  // pandemic-era wording. Pre-filled with the suggested phrase; the admin can accept or reword.
  const [editText, setEditText] = useState<Record<number, string>>({})
  // Section-delete flow (COVID): the detected section awaiting the admin's confirmation.
  const [sectionDelete, setSectionDelete] = useState<{ idx: number; n: number; text: string } | null>(null)
  const [detecting, setDetecting] = useState<number | null>(null)
  // Pandemic-era (COVID) wording is grouped by SECTION: a section with several COVID mentions is
  // one card (delete/edit the whole block); a lone mention in a general paragraph is its own card.
  const [covidGroups, setCovidGroups] = useState<Array<{ g: number; count: number; context: string; dedicated: boolean; term: string }>>([])
  const [covidSectionDelete, setCovidSectionDelete] = useState<{ g: number; text: string } | null>(null)
  const [covidEdit, setCovidEdit] = useState<{ g: number; dedicated: boolean; original: string; text: string } | null>(null)
  const [covidBusy, setCovidBusy] = useState<number | null>(null)
  const [covidDetecting, setCovidDetecting] = useState<number | null>(null)
  // Which detect a group is running ('edit' vs 'delete'), so each button shows its OWN spinner
  // instead of the delete button spinning while you clicked edit.
  const [covidDetectKind, setCovidDetectKind] = useState<'edit' | 'delete' | null>(null)
  // Per-group inline status/error, shown INSIDE the card. Without this the only feedback was
  // adoptErr rendered far below the card (off-screen in the scrolled column), so a detect that
  // found nothing looked like the button did nothing at all.
  const [covidMsg, setCovidMsg] = useState<{ g: number; text: string } | null>(null)
  const [covidDone, setCovidDone] = useState<Set<number>>(new Set())

  // Fill-in placeholders: typed values + which tokens have been filled.
  const [fillValues, setFillValues] = useState<Record<string, string>>({})
  const [fillBusy, setFillBusy] = useState<string | null>(null)
  const [filled, setFilled] = useState<Set<string>>(new Set())

  // Review-date picker.
  const today = new Date().toISOString().slice(0, 10)
  const [reviewDate, setReviewDate] = useState(today)
  const [reviewInterval, setReviewInterval] = useState(365)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewErr, setReviewErr] = useState('')
  const [numbering, setNumbering] = useState<number[]>([])          // replaceable position → document-order number
  const [markCounts, setMarkCounts] = useState<Record<number, number>>({})  // highlighted occurrences per number
  // Changes already applied to the draft (any session). Replayed onto the preview so the policy
  // side shows what's been changed, and listed under a collapsible "already updated" summary.
  const [appliedChanges, setAppliedChanges] = useState<Array<{ reference_key: string; requirement: string; old_text: string; new_text: string; placement: string }>>([])
  const [draftContent, setDraftContent] = useState<string | null>(null)   // the draft, to verify a change actually landed
  const [showCompleted, setShowCompleted] = useState(false)
  const [isDiff, setIsDiff] = useState(false)   // right panel is the original→draft diff (vs a plain policy)
  const [navPos, setNavPos] = useState<Record<number, number>>({})  // 1-based occurrence last shown per number
  const cycleRef = useRef<Record<number, number>>({})               // next occurrence index per number

  // The distinct stale terms of a finding (phrase + acronyms). Falls back to samples for results
  // cached before terms existed.
  const termsOf = (f: Finding): string[] => (f.terms?.length ? f.terms : [...new Set((f.samples ?? []).map(s => s.match))])

  const isReplaceable = (f: Finding) => f.kind === 'text' && !!f.superseded_by && termsOf(f).length > 0
  const isFillable    = (f: Finding) => f.category === 'placeholder' && f.kind === 'text' && !f.superseded_by && termsOf(f).length > 0
  const isNote        = (f: Finding) => f.category === 'advisory_note' && termsOf(f).length > 0

  // A finding is one-click replaceable when it's a text match with a known replacement.
  const replaceable = findings.map((f, i) => ({ f, i })).filter(({ f }) => isReplaceable(f))
  // A placeholder ([insert name], XXXX…) is fillable: located in the policy, filled with your text.
  const fillable    = findings.map((f, i) => ({ f, i })).filter(({ f }) => isFillable(f))
  // A context note is located + explained, but there is nothing to change.
  const noteworthy  = findings.map((f, i) => ({ f, i })).filter(({ f }) => isNote(f))
  // The review-currency flag ("No review date recorded" / "Overdue for review") → date picker.
  const reviewFinding = findings.find(f => f.signal_key === 'overdue-review') ?? null
  const advisory = findings.filter(f => !isReplaceable(f) && !isFillable(f) && !isNote(f) && f.signal_key !== 'overdue-review')

  // Replaceable, fillable and note findings are all highlighted in the preview, sharing one
  // numbering (in this order) so colours/badges stay unique across the whole document.
  const highlightList = [...replaceable, ...fillable, ...noteworthy]

  const byN = <T extends { n: number }>(a: T, b: T) => (a.n < 0 ? 1e9 : a.n) - (b.n < 0 ? 1e9 : b.n)
  const located     = replaceable.map((r, pos) => ({ ...r, n: numbering[pos] ?? -1 })).filter(o => o.n >= 0).sort(byN)
  // Pandemic-era wording is shown as its own per-occurrence section, so keep it out of the grouped list.
  const locatedMain = located.filter(o => o.f.signal_key !== 'covid-era')
  const locatedFill = fillable.map((r, pos) => ({ ...r, n: numbering[replaceable.length + pos] ?? -1 })).filter(o => o.n >= 0).sort(byN)
  const locatedNote = noteworthy.map((r, pos) => ({ ...r, n: numbering[replaceable.length + fillable.length + pos] ?? -1 })).filter(o => o.n >= 0).sort(byN)

  // Only reflect changes that ACTUALLY landed in the draft: a replacement whose new text is present,
  // or a removal whose old wording is gone. This drops stale/superseded records (e.g. a placeholder
  // re-filled with a different value) so the preview and summary always match the real draft.
  const effectiveChanges = draftContent == null
    ? appliedChanges
    : appliedChanges.filter(c => (c.new_text ? draftContent.includes(c.new_text) : !draftContent.includes(c.old_text)))

  // Completed draft changes grouped by finding, for the collapsible "already updated" summary.
  const completedGroups = (() => {
    const m = new Map<string, { requirement: string; swaps: Array<{ old: string; neu: string; placement: string }> }>()
    for (const c of effectiveChanges) {
      const g = m.get(c.reference_key) ?? { requirement: c.requirement, swaps: [] }
      g.swaps.push({ old: c.old_text, neu: c.new_text, placement: c.placement })
      m.set(c.reference_key, g)
    }
    return [...m.values()]
  })()

  // Scroll to the NEXT occurrence of a finding each click (1st, 2nd, … then wraps), flashing it.
  function scrollToHighlight(n: number) {
    const marks = previewRef.current?.querySelectorAll<HTMLElement>(`mark[data-lint="${n}"]`)
    if (!marks || !marks.length) return
    const idx = (cycleRef.current[n] ?? 0) % marks.length
    cycleRef.current[n] = idx + 1
    const el = marks[idx]
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('ring-2', 'ring-neutral-900', 'ring-offset-1')
    setTimeout(() => el.classList.remove('ring-2', 'ring-neutral-900', 'ring-offset-1'), 1400)
    setNavPos(s => ({ ...s, [n]: idx + 1 }))
  }

  // Reflect an applied change in the right-hand preview so it's visible on the policy side:
  // swap the highlighted wording for the new text and turn it green (an applied change). For a
  // fill, only the marks whose text is the given token are swapped (a finding may have several).
  // keepText greens the highlighted wording WITHOUT rewriting it — used when the preview already
  // shows the new wording (e.g. it was formatted from the draft), so we just tint it green in place
  // rather than swapping the text (which would duplicate a phrase split across markup).
  function updatePreview(n: number, fromText: string | null, toText: string, scroll = true, keepText = false) {
    const marks = previewRef.current?.querySelectorAll<HTMLElement>(`mark[data-lint="${n}"]`)
    if (!marks) return
    const from = fromText?.trim().toLowerCase()
    let first: HTMLElement | null = null
    marks.forEach(m => {
      if (from != null && (m.textContent ?? '').trim().toLowerCase() !== from) return
      if (!keepText) m.textContent = toText
      m.className = 'rounded bg-green-200 px-0.5 font-medium'
      m.removeAttribute('data-lint')
      if (!first) first = m
    })
    if (scroll) (first as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  // Load the right pane. When the policy has an editable draft, render a DETERMINISTIC diff of its
  // original text vs the current draft (replaced wording green, removed wording struck) — no AI, no
  // fuzzy matching, so tenants see exactly what changed on every policy. With no draft yet, fall back
  // to the formatted policy so outstanding findings can still be highlighted.
  useEffect(() => {
    setPreviewLoad(true)
    const client = createApiClient(token)
    client.analytics.policyDocument(policyId)
      .then(d => {
        setAppliedChanges((d.changes ?? []).map(c => ({
          reference_key: c.reference_key, requirement: c.requirement, old_text: c.old_text, new_text: c.new_text, placement: c.placement,
        })))
        const draft = d.document?.draft_content ?? ''
        const original = d.document?.original_content ?? null
        setDraftContent(draft)
        if (original != null && original.trim()) {
          setIsDiff(true)
          setHtml(buildPolicyDiffHtml(original, draft))
          setPreviewLoad(false)
          return
        }
        // No draft document yet — show the formatted policy for context.
        setIsDiff(false)
        client.policies.preview(policyId, { base: true })
          .then(p => setHtml(p.html || ''))
          .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
          .finally(() => setPreviewLoad(false))
      })
      .catch(() => {
        setAppliedChanges([]); setDraftContent('')
        client.policies.preview(policyId, { base: true })
          .then(p => setHtml(p.html || ''))
          .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
          .finally(() => setPreviewLoad(false))
      })
  }, [token, policyId])

  // Re-highlight whenever the policy loads or the search term changes: reset to the original
  // HTML, tint + number each stale phrase's block, then apply the search highlights.
  useEffect(() => {
    const root = previewRef.current
    if (!root || html == null) return
    root.innerHTML = html
    // Highlight the OUTSTANDING findings (still-to-fix wording). Completed changes are already shown
    // by the diff itself (green replacements, struck removals), so there's nothing to replay.
    const num = highlightStaleTerms(root, highlightList.map(({ f }) => termsOf(f)))
    setNumbering(num)

    // Count remaining highlighted occurrences per number and reset the "Show in policy" cycle.
    const counts: Record<number, number> = {}
    root.querySelectorAll<HTMLElement>('mark[data-lint]').forEach(m => { const k = Number(m.dataset.lint); counts[k] = (counts[k] ?? 0) + 1 })
    setMarkCounts(counts)
    cycleRef.current = {}
    setNavPos({})
    // Pandemic-era wording: group highlighted occurrences by the SECTION they sit in (heading to
    // next heading), so a COVID-heavy section is one card and a lone mention elsewhere is its own.
    const covidPos = replaceable.findIndex(o => o.f.signal_key === 'covid-era')
    if (covidPos >= 0 && num[covidPos] != null) {
      const marks = Array.from(root.querySelectorAll<HTMLElement>(`mark[data-lint="${num[covidPos]}"]`))
      const isHeading = (el: Element | null): el is HTMLElement => !!el && /^H[1-6]$/.test(el.tagName)
      const covidRe = /covid|coronavirus|social distancing|shielding|lockdown/i
      const topBlock = (m: HTMLElement): HTMLElement => { let b: HTMLElement = m; while (b.parentElement && b.parentElement !== root) b = b.parentElement; return b }
      const sectionStart = (m: HTMLElement): Element => {
        let start: Element = topBlock(m)
        for (let cur: Element | null = start; cur; cur = cur.previousElementSibling) { start = cur; if (isHeading(cur)) break }
        return start
      }
      const byStart = new Map<Element, HTMLElement[]>()
      for (const m of marks) { const s = sectionStart(m); if (!byStart.has(s)) byStart.set(s, []); byStart.get(s)!.push(m) }
      const blockOf = (m: HTMLElement): Element => (m.closest('p,li,td,h1,h2,h3,h4,h5,h6') as Element | null) ?? topBlock(m)
      let g = 0
      const built: Array<{ g: number; count: number; context: string; dedicated: boolean; term: string }> = []
      for (const [start, ms] of byStart) {
        const startIsHeading = isHeading(start)
        const headingText = startIsHeading ? (start.textContent ?? '').trim() : ''
        // Only a section whose HEADING is about COVID is treated as one dedicated section to delete/reword
        // as a block. Otherwise the mentions are just scattered references (e.g. two DNACPR paragraphs that
        // each cite a COVID-era CQC report) — split them one-card-per-paragraph so each can be edited on its
        // own, rather than collapsing "2 mentions" into a single card that only ever edited the first.
        if (startIsHeading && covidRe.test(headingText)) {
          const gi = g++
          ms.forEach(m => m.setAttribute('data-covid-grp', String(gi)))
          built.push({ g: gi, count: ms.length, context: headingText.slice(0, 400), dedicated: true, term: ms[0].textContent ?? '' })
        } else {
          const byBlock = new Map<Element, HTMLElement[]>()
          for (const m of ms) { const b = blockOf(m); if (!byBlock.has(b)) byBlock.set(b, []); byBlock.get(b)!.push(m) }
          for (const [block, bms] of byBlock) {
            const gi = g++
            bms.forEach(m => m.setAttribute('data-covid-grp', String(gi)))
            built.push({ g: gi, count: bms.length, context: (block.textContent ?? '').trim().slice(0, 400), dedicated: false, term: bms[0].textContent ?? '' })
          }
        }
      }
      setCovidGroups(built)
    } else {
      setCovidGroups([])
    }
    if (policySearch.trim().length >= 2) {
      setMatchCount(highlightSearch(root, policySearch))
      root.querySelector('mark.bg-teal-200')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else {
      setMatchCount(null)
    }
  }, [html, policySearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function replace(f: Finding, idx: number, n: number, newTextOverride?: string) {
    const terms = termsOf(f)
    // newTextOverride may be an empty string — that's an explicit "remove this wording".
    const newText = (newTextOverride !== undefined ? newTextOverride : (f.superseded_by ?? '')).trim()
    if (!terms.length) return
    if (!newText && newTextOverride === undefined) return   // non-removal path needs a replacement
    setBusy(idx); setAdoptErr('')
    try {
      // Replace EVERY distinct stale term (phrase + acronyms) with the chosen wording; each
      // amend does a global replace in the draft, so all occurrences are corrected at once.
      let anyApplied = false, last = 0
      for (const t of terms) {
        const res = await createApiClient(token).analytics.adoptSuggestion({
          policy_id: policyId, reference_key: `policy-lint:${f.signal_key}`,
          requirement: f.label, placement: 'amend',
          old_text: t, new_text: newText,
        })
        anyApplied = anyApplied || res.applied
        last = res.pending
      }
      setAdopted(s => new Set(s).add(idx))
      setPending(last)
      onAdopted?.()
      if (anyApplied) updatePreview(n, null, newText)
      else setAdoptErr('Recorded, but we could not place it automatically — check the draft when you review.')
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not apply this replacement.')
    } finally {
      setBusy(null)
    }
  }

  // COVID section delete: find the section around the flagged wording, then (on confirm) remove it.
  async function detectSection(f: Finding, idx: number, n: number) {
    const anchor = termsOf(f)[0]
    if (!anchor) return
    setDetecting(idx); setAdoptErr('')
    try {
      const r = await createApiClient(token).analytics.detectPolicySection(policyId, anchor)
      if (r.found && r.section_text) setSectionDelete({ idx, n, text: r.section_text })
      else setAdoptErr('Could not find a clear section around this wording to delete. Use Remove or Replace instead.')
    } catch (e: any) { setAdoptErr(e.message ?? 'Could not find the section.') }
    finally { setDetecting(null) }
  }

  // Strike a section in the right-pane preview (from the heading around `mark` to the next heading),
  // so a deletion shows like a replacement turns green. Best-effort visual; the removal already applied.
  function strikeSectionFromMark(mark: HTMLElement | null, scroll = true) {
    const root = previewRef.current
    if (!root || !mark) return
    const isHeading = (el: Element | null): el is HTMLElement => !!el && /^H[1-6]$/.test(el.tagName)
    const strikeEl = (el: HTMLElement) => { el.style.textDecoration = 'line-through'; el.style.opacity = '0.5'; el.style.backgroundColor = '#fef2f2' }
    let block: HTMLElement | null = mark
    while (block && block.parentElement && block.parentElement !== root) block = block.parentElement
    if (!block || block.parentElement !== root) return
    // Find the section's opening heading — but only if the document actually has a heading structure.
    let start: HTMLElement = block, foundHeading = false
    for (let cur: Element | null = block; cur; cur = cur.previousElementSibling) {
      if (isHeading(cur)) { start = cur as HTMLElement; foundHeading = true; break }
      start = cur as HTMLElement
    }
    // No heading before this block (flat document, or wording sits above the first heading): strike
    // ONLY the block that holds the removed wording — never walk to the end and strike everything.
    if (!foundHeading) {
      strikeEl(block)
      if (scroll) block.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    let firstStruck: HTMLElement | null = null
    for (let node: Element | null = start; node; node = node.nextElementSibling) {
      if (node !== start && isHeading(node)) break
      strikeEl(node as HTMLElement)
      if (!firstStruck) firstStruck = node as HTMLElement
    }
    if (scroll) firstStruck?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  const strikeSectionInPreview = (n: number, scroll = true) => strikeSectionFromMark(previewRef.current?.querySelector<HTMLElement>(`mark[data-lint="${n}"]`) ?? null, scroll)

  async function deleteSection() {
    if (!sectionDelete) return
    const { idx, n, text } = sectionDelete
    setBusy(idx); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: 'policy-lint:covid-era',
        requirement: 'Remove pandemic-era section', placement: 'amend',
        old_text: text, new_text: '',
      })
      setAdopted(s => new Set(s).add(idx))
      setPending(res.pending)
      onAdopted?.()
      if (res.applied) strikeSectionInPreview(n)
      else setAdoptErr('Recorded, but we could not place it automatically — check the draft when you review.')
      setSectionDelete(null)
    } catch (e: any) { setAdoptErr(e.message ?? 'Could not delete the section.') }
    finally { setBusy(null) }
  }

  // ── Per-section pandemic-era (COVID) actions ───────────────────────────────────
  const grpMark = (g: number) => previewRef.current?.querySelector<HTMLElement>(`mark[data-covid-grp="${g}"]`) ?? null
  function scrollToGrp(g: number) {
    const el = grpMark(g)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.classList.add('ring-2', 'ring-neutral-900', 'ring-offset-1')
    setTimeout(() => el.classList.remove('ring-2', 'ring-neutral-900', 'ring-offset-1'), 1400)
  }
  async function detectCovidSection(grp: { g: number; context: string; term: string }) {
    setCovidDetecting(grp.g); setCovidDetectKind('delete'); setCovidMsg(null); setAdoptErr('')
    try {
      const r = await createApiClient(token).analytics.detectPolicySection(policyId, grp.term, { context: grp.context, granularity: 'section' })
      if (r.found && r.section_text) setCovidSectionDelete({ g: grp.g, text: r.section_text })
      else if (r.reason === 'not-in-draft') setCovidMsg({ g: grp.g, text: 'This section has already been removed or reworded in your draft, so there is nothing left to delete. Re-run the analysis to refresh the list.' })
      else setCovidMsg({ g: grp.g, text: 'Could not find a clear section to delete here. This wording looks like a passing mention rather than a whole section, so use "Edit this mention" instead.' })
    } catch (e: any) { setCovidMsg({ g: grp.g, text: e.message ?? 'Could not find the section.' }) }
    finally { setCovidDetecting(null); setCovidDetectKind(null) }
  }
  async function deleteCovidSection() {
    if (!covidSectionDelete) return
    const { g, text } = covidSectionDelete
    setCovidBusy(g); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({ policy_id: policyId, reference_key: 'policy-lint:covid-era', requirement: 'Remove pandemic-era section', placement: 'amend', old_text: text, new_text: '' })
      setPending(res.pending); onAdopted?.()
      if (res.applied) { strikeSectionFromMark(grpMark(g)); setCovidDone(s => new Set(s).add(g)) }
      else setCovidMsg({ g, text: 'Recorded, but we could not place it automatically — check the draft when you review.' })
      setCovidSectionDelete(null)
    } catch (e: any) { setCovidMsg({ g, text: e.message ?? 'Could not delete the section.' }) }
    finally { setCovidBusy(null) }
  }
  async function detectCovidEdit(grp: { g: number; context: string; term: string; dedicated: boolean }) {
    setCovidDetecting(grp.g); setCovidDetectKind('edit'); setCovidMsg(null); setAdoptErr('')
    try {
      const api = createApiClient(token).analytics
      let r = await api.detectPolicySection(policyId, grp.term, { context: grp.context, granularity: grp.dedicated ? 'section' : 'sentence' })
      // If we couldn't isolate a whole section (unclear boundaries / model miss), fall back to the
      // sentence so the editor still opens and the user can reword the wording, rather than the
      // button appearing to do nothing.
      let asSection = grp.dedicated
      if ((!r.found || !r.section_text) && grp.dedicated) {
        const s = await api.detectPolicySection(policyId, grp.term, { context: grp.context, granularity: 'sentence' })
        if (s.found && s.section_text) { r = s; asSection = false }
      }
      if (r.found && r.section_text) setCovidEdit({ g: grp.g, dedicated: asSection, original: r.section_text, text: r.section_text })
      else setCovidMsg({ g: grp.g, text: r.reason === 'not-in-draft' ? 'This wording has already been removed or reworded in your draft — re-run the analysis to refresh the list.' : 'Could not locate this wording to edit automatically. You can still reword it directly in the draft after publishing, or use "Delete the whole section".' })
    } catch (e: any) { setCovidMsg({ g: grp.g, text: e.message ?? 'Could not locate the text.' }) }
    finally { setCovidDetecting(null); setCovidDetectKind(null) }
  }
  async function applyCovidEdit() {
    if (!covidEdit) return
    const { g, dedicated, original, text } = covidEdit
    setCovidBusy(g); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({ policy_id: policyId, reference_key: 'policy-lint:covid-era', requirement: 'Reword pandemic-era wording', placement: 'amend', old_text: original, new_text: text })
      setPending(res.pending); onAdopted?.()
      if (res.applied) {
        if (dedicated) { strikeSectionFromMark(grpMark(g)) }
        else { const m = grpMark(g); if (m) { if (text.trim()) { m.textContent = text; m.className = 'rounded bg-green-200 px-0.5 font-medium' } else { m.style.textDecoration = 'line-through'; m.style.opacity = '0.5' } m.removeAttribute('data-covid-grp') } }
        setCovidDone(s => new Set(s).add(g))
      } else setCovidMsg({ g, text: 'Recorded, but we could not place it automatically — check the draft when you review.' })
      setCovidEdit(null)
    } catch (e: any) { setCovidMsg({ g, text: e.message ?? 'Could not apply the change.' }) }
    finally { setCovidBusy(null) }
  }

  // Fill one placeholder token (e.g. [insert name]) with the admin's text, everywhere it appears.
  async function fillToken(f: Finding, term: string, n: number) {
    const key = `${f.signal_key}::${term}`
    const value = (fillValues[key] ?? '').trim()
    if (!value) return
    setFillBusy(key); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({
        policy_id: policyId, reference_key: `policy-lint:${f.signal_key}`,
        requirement: f.label, placement: 'amend', old_text: term, new_text: value,
      })
      setFilled(s => new Set(s).add(key))
      setPending(res.pending)
      onAdopted?.()
      updatePreview(n, term, value)   // reflect on the policy side straight away
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not fill this in.')
    } finally {
      setFillBusy(null)
    }
  }

  // Record a review date on the policy, clearing the "No review date" / "Overdue" flag.
  async function saveReview() {
    setReviewBusy(true); setReviewErr('')
    try {
      await createApiClient(token).policies.setReview(policyId, { last_reviewed_at: reviewDate, review_interval_days: reviewInterval })
      setReviewDone(true)
      onAdopted?.()
    } catch (e: any) {
      setReviewErr(e.message ?? 'Could not save the review date.')
    } finally {
      setReviewBusy(false)
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

            {/* Already updated in the draft — hidden by default (auto-cleared), shown on demand. */}
            {completedGroups.length > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50/40 px-3 py-2">
                <button onClick={() => setShowCompleted(v => !v)} className="flex w-full items-center justify-between gap-2 text-sm font-medium text-green-800">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="shrink-0" /> {completedGroups.length} already updated in your draft</span>
                  <span className="text-xs font-normal text-green-700 underline hover:no-underline">{showCompleted ? 'Hide' : 'Show'}</span>
                </button>
                {showCompleted && (
                  <ul className="mt-2 space-y-2 border-t border-green-200/70 pt-2">
                    {completedGroups.map((g, gi) => (
                      <li key={gi} className="text-xs">
                        <p className="font-medium text-neutral-dark">{g.requirement}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {g.swaps.map((s, k) => (
                            <span key={k} className="inline-flex items-center gap-1">
                              <span className="rounded bg-rose-50 px-1 py-0.5 text-rose-700 line-through">{s.old.length > 40 ? `${s.old.slice(0, 40)}…` : s.old}</span>
                              {s.neu
                                ? <><span className="text-neutral-mid">→</span><span className="rounded bg-green-100 px-1 py-0.5 font-medium text-green-800">{s.neu}</span></>
                                : <span className="italic text-neutral-mid">removed</span>}
                            </span>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {locatedMain.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><FilePenLine size={15} className="text-amber-600" /> Replace out-of-date wording ({locatedMain.length})</p>
                {locatedMain.map(({ f, i, n }) => {
                  const total = markCounts[n] ?? f.count      // highlighted occurrences you can step through
                  const shown = navPos[n]
                  return (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${quoteColour(n)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-neutral-dark">
                          {f.label}
                          {total > 1 && <span className="text-xs font-normal text-neutral-mid">×{total}</span>}
                        </p>
                        {f.detail && (
                          <div className="mt-1.5 flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-2.5 py-2">
                            <History size={13} className="mt-0.5 shrink-0 text-amber-600" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">When this changed</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-neutral-dark">{f.detail}</p>
                              {(f.source_urls ?? []).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                  {(f.source_urls ?? []).map((u, k) => (
                                    <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:no-underline">
                                      Source{(f.source_urls ?? []).length > 1 ? ` ${k + 1}` : ''} <ExternalLink size={10} />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {(() => {
                          // Pandemic-era wording has no single clean swap, so the replacement is editable:
                          // the admin can keep the suggested phrase or write their own before applying.
                          const editable = f.signal_key === 'covid-era'
                          const chosen = editText[i] ?? f.superseded_by ?? ''
                          return editable ? (
                            <div className="mt-2 space-y-1.5">
                              <p className="flex flex-wrap items-center gap-1.5 text-sm">
                                {termsOf(f).map((t, k) => <span key={k} className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 line-through">{t}</span>)}
                                <span className="text-neutral-mid">→ replace with:</span>
                              </p>
                              <input
                                type="text" value={chosen} disabled={adopted.has(i)}
                                onChange={e => setEditText(s => ({ ...s, [i]: e.target.value }))}
                                placeholder="Wording to replace it with"
                                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-neutral-dark focus:border-teal focus:outline-none disabled:bg-gray-50"
                              />
                              <p className="text-[11px] text-neutral-mid">Suggested wording shown. Edit it to fit your policy, or clear it to just remove the pandemic wording.</p>
                            </div>
                          ) : (
                            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                              {termsOf(f).map((t, k) => <span key={k} className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 line-through">{t}</span>)}
                              <span className="text-neutral-mid">→</span>
                              <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-700">{f.superseded_by}</span>
                            </p>
                          )
                        })()}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {adopted.has(i) ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> {f.signal_key === 'covid-era' && !(editText[i] ?? f.superseded_by ?? '').trim() ? 'Removed from your draft' : 'Replaced in your draft'}</span>
                          ) : (
                            <button onClick={() => replace(f, i, n, f.signal_key === 'covid-era' ? (editText[i] ?? f.superseded_by ?? '') : undefined)} disabled={busy !== null}
                              className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50">
                              {busy === i ? <><Loader2 size={13} className="animate-spin" /> Applying…</> : <><Check size={13} /> {f.signal_key === 'covid-era' && !(editText[i] ?? f.superseded_by ?? '').trim() ? `Remove in ${policyName}` : `Replace in ${policyName}`}</>}
                            </button>
                          )}
                          <button onClick={() => scrollToHighlight(n)}
                            className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50">
                            <Locate size={13} /> {total > 1 ? (shown ? `Show ${shown} of ${total}` : `Show in policy (${total})`) : 'Show in policy'}
                          </button>
                          {f.signal_key === 'covid-era' && !adopted.has(i) && (
                            <button onClick={() => detectSection(f, i, n)} disabled={busy !== null || detecting !== null}
                              className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                              {detecting === i ? <><Loader2 size={13} className="animate-spin" /> Finding section…</> : <><Trash2 size={13} /> Delete the whole section</>}
                            </button>
                          )}
                        </div>
                        {/* Confirm before removing an entire section (COVID). */}
                        {sectionDelete?.idx === i && (
                          <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                            <p className="text-xs font-semibold text-rose-700">This will remove the following section from your draft:</p>
                            <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-rose-100 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-neutral-dark">{sectionDelete.text.trim()}</pre>
                            <p className="mt-1.5 text-[11px] text-neutral-mid">It becomes a draft change you review (and can revert) before publishing. If this looks wrong, cancel and use Remove or Replace instead.</p>
                            <div className="mt-2 flex items-center gap-2">
                              <button onClick={deleteSection} disabled={busy !== null}
                                className="inline-flex items-center gap-1.5 rounded-btn bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                                {busy === i ? <><Loader2 size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete section</>}
                              </button>
                              <button onClick={() => setSectionDelete(null)} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}

            {/* Pandemic-era (COVID-19) wording — grouped by section; a lone mention is its own card */}
            {covidGroups.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><History size={15} className="text-amber-600" /> Pandemic-era (COVID-19) wording ({covidGroups.length})</p>
                <p className="text-xs text-neutral-mid">A section that is about COVID is shown as one block to delete or reword; a passing mention elsewhere is its own card.</p>
                {covidGroups.map(grp => {
                  const done = covidDone.has(grp.g)
                  return (
                  <div key={grp.g} className={`rounded-lg border px-4 py-3 ${done ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${done ? 'bg-green-400' : 'bg-amber-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-neutral-dark">
                          {grp.dedicated
                            ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700">COVID section</span>
                            : <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">Passing mention</span>}
                          {grp.count > 1 && <span className="text-xs font-normal text-neutral-mid">{grp.count} mentions</span>}
                        </p>
                        {grp.context && <p className="mt-1 text-xs italic text-neutral-mid">&ldquo;{grp.context.slice(0, 160)}{grp.context.length > 160 ? '…' : ''}&rdquo;</p>}
                        {done ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Actioned in your draft</p>
                        ) : (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <button onClick={() => scrollToGrp(grp.g)} className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50"><Locate size={13} /> Show in policy</button>
                            <button onClick={() => detectCovidSection(grp)} disabled={covidDetecting !== null || covidBusy !== null} className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                              {covidDetecting === grp.g && covidDetectKind === 'delete' ? <><Loader2 size={13} className="animate-spin" /> Finding section…</> : <><Trash2 size={13} /> Delete the whole section</>}
                            </button>
                            <button onClick={() => detectCovidEdit(grp)} disabled={covidDetecting !== null || covidBusy !== null} className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50">{covidDetecting === grp.g && covidDetectKind === 'edit' ? <><Loader2 size={13} className="animate-spin" /> Finding…</> : <><FilePenLine size={13} /> {grp.dedicated ? 'Edit the section' : 'Edit this mention'}</>}</button>
                          </div>
                        )}
                        {covidSectionDelete?.g === grp.g && (
                          <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
                            <p className="text-xs font-semibold text-rose-700">This will remove the following section from your draft:</p>
                            <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-rose-100 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-neutral-dark">{covidSectionDelete.text.trim()}</pre>
                            <div className="mt-2 flex items-center gap-2">
                              <button onClick={deleteCovidSection} disabled={covidBusy !== null} className="inline-flex items-center gap-1.5 rounded-btn bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{covidBusy === grp.g ? <><Loader2 size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete section</>}</button>
                              <button onClick={() => setCovidSectionDelete(null)} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
                            </div>
                          </div>
                        )}
                        {covidEdit?.g === grp.g && (
                          <div className="mt-2.5 rounded-lg border border-teal/30 bg-teal-light/20 p-3">
                            <p className="text-xs font-semibold text-neutral-dark">{covidEdit.dedicated ? 'Edit the whole section' : 'Edit the sentence'} (clear it to remove):</p>
                            <textarea value={covidEdit.text} onChange={e => setCovidEdit(s => (s ? { ...s, text: e.target.value } : s))} rows={covidEdit.dedicated ? 6 : 3} className="mt-1.5 w-full resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-neutral-dark focus:border-teal focus:outline-none" />
                            <div className="mt-2 flex items-center gap-2">
                              <button onClick={applyCovidEdit} disabled={covidBusy !== null} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{covidBusy === grp.g ? <><Loader2 size={13} className="animate-spin" /> Applying…</> : <><Check size={13} /> {covidEdit.text.trim() ? 'Apply' : 'Remove'}</>}</button>
                              <button onClick={() => setCovidEdit(null)} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
                            </div>
                          </div>
                        )}
                        {covidMsg?.g === grp.g && (
                          <p className="mt-2 text-xs text-red-600">{covidMsg.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}

            {/* Fill in placeholders */}
            {locatedFill.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><SquarePen size={15} className="text-sky-600" /> Fill in placeholders ({locatedFill.length})</p>
                {locatedFill.map(({ f, i, n }) => {
                  const total = markCounts[n] ?? f.count
                  const shown = navPos[n]
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${quoteColour(n)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-dark">{f.label}</p>
                          {f.detail && <p className="mt-0.5 text-xs text-neutral-mid">{f.detail}</p>}
                          <div className="mt-2 space-y-2">
                            {termsOf(f).map((t, k) => {
                              const key = `${f.signal_key}::${t}`
                              const done = filled.has(key)
                              return (
                                <div key={k} className="flex flex-wrap items-center gap-2">
                                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700">{t}</span>
                                  <span className="text-neutral-mid">→</span>
                                  {done ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Filled in your draft</span>
                                  ) : (
                                    <>
                                      <input value={fillValues[key] ?? ''} onChange={e => setFillValues(s => ({ ...s, [key]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && fillToken(f, t, n)}
                                        placeholder="Type the value…"
                                        className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
                                      <button onClick={() => fillToken(f, t, n)} disabled={fillBusy !== null || !(fillValues[key] ?? '').trim()}
                                        className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/10 disabled:opacity-50">
                                        {fillBusy === key ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Fill in
                                      </button>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <button onClick={() => scrollToHighlight(n)} className="mt-2 inline-flex items-center gap-1.5 rounded-btn border border-gray-300 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50">
                            <Locate size={13} /> {total > 1 ? (shown ? `Show ${shown} of ${total}` : `Show in policy (${total})`) : 'Show in policy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Review date */}
            {reviewFinding && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><CalendarClock size={15} className="text-teal" /> Review date</p>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                  <p className="text-sm font-medium text-neutral-dark">{reviewFinding.label}</p>
                  {reviewFinding.detail && <p className="mt-0.5 text-xs text-neutral-mid">{reviewFinding.detail}</p>}
                  {reviewDone ? (
                    <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Saved. Last reviewed {fmtReviewDate(reviewDate)}, next review due {fmtReviewDate(new Date(new Date(reviewDate).getTime() + reviewInterval * 86_400_000).toISOString().slice(0, 10))}.</p>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-neutral-mid">Last reviewed
                        <input type="date" value={reviewDate} max={today} onChange={e => setReviewDate(e.target.value)}
                          className="mt-1 block rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
                      </label>
                      <label className="text-xs text-neutral-mid">Review every
                        <select value={reviewInterval} onChange={e => setReviewInterval(Number(e.target.value))}
                          className="mt-1 block rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none">
                          <option value={182}>6 months</option>
                          <option value={365}>12 months</option>
                          <option value={730}>2 years</option>
                          <option value={1095}>3 years</option>
                        </select>
                      </label>
                      <button onClick={saveReview} disabled={reviewBusy || !reviewDate}
                        className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                        {reviewBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save review date
                      </button>
                    </div>
                  )}
                  {reviewErr && <p className="mt-2 text-xs text-red-600">{reviewErr}</p>}
                </div>
              </div>
            )}

            {adoptErr && <p className="text-xs text-red-600">{adoptErr}</p>}

            {/* For awareness — located + explained, nothing to change */}
            {locatedNote.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Info size={15} className="text-sky-600" /> For awareness (no change needed)</p>
                {locatedNote.map(({ f, i, n }) => {
                  const total = markCounts[n] ?? f.count
                  const shown = navPos[n]
                  return (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${quoteColour(n)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-dark">{f.label}</p>
                          {f.detail && <p className="mt-0.5 text-xs leading-relaxed text-neutral-dark">{f.detail}</p>}
                          {(f.source_urls ?? []).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-3">
                              {(f.source_urls ?? []).map((u, k) => (
                                <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-700 underline underline-offset-2 hover:no-underline">Source <ExternalLink size={10} /></a>
                              ))}
                            </div>
                          )}
                          <button onClick={() => scrollToHighlight(n)} className="mt-2 inline-flex items-center gap-1.5 rounded-btn border border-gray-300 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-gray-50">
                            <Locate size={13} /> {total > 1 ? (shown ? `Show ${shown} of ${total}` : `Show in policy (${total})`) : 'Show in policy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {advisory.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Info size={15} className="text-neutral-mid" /> Also flagged</p>
                {advisory.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-neutral-light/30 px-4 py-2.5">
                    {f.severity === 'high' ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" /> : <Info size={14} className="mt-0.5 shrink-0 text-amber-500" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-dark">{f.label}</p>
                      {f.detail && (
                        <div className="mt-1 flex items-start gap-1.5">
                          <History size={12} className="mt-0.5 shrink-0 text-amber-600" />
                          <p className="text-xs leading-relaxed text-neutral-dark">
                            <span className="font-semibold text-amber-700">When this changed: </span>{f.detail}
                            {(f.source_urls ?? []).map((u, k) => (
                              <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 align-baseline text-[11px] font-semibold text-amber-700 underline underline-offset-2 hover:no-underline">
                                Source{(f.source_urls ?? []).length > 1 ? ` ${k + 1}` : ''}<ExternalLink size={10} />
                              </a>
                            ))}
                          </p>
                        </div>
                      )}
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
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">{isDiff ? 'The policy — your changes' : 'The policy'}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">
                <FileText size={14} className="shrink-0 text-teal" /> <span className="min-w-0 break-words">{policyName}</span>
              </p>
              {isDiff ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                  <span>Showing your draft changes:</span>
                  <span className="inline-flex items-center gap-1"><span className="rounded px-1" style={{ background: '#dcfce7', color: '#166534' }}>added / replaced</span></span>
                  <span className="inline-flex items-center gap-1"><span className="rounded px-1 line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>removed</span></span>
                  <span>· still-to-fix wording is highlighted.</span>
                </p>
              ) : (located.length > 0 || locatedFill.length > 0
                ? <p className="mt-0.5 text-xs text-neutral-mid">The flagged wording and placeholders are highlighted below. Use <span className="font-medium">Show in policy</span> on the left to jump to each one.</p>
                : <p className="mt-0.5 text-xs text-neutral-mid">Use the search below to find wording in this policy.</p>)}
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

            {html && !previewLoad && !previewErr && (
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-mid">
                <Info size={12} className="mt-0.5 shrink-0" />
                <span>
                  {isDiff
                    ? 'This is a read-only view that reconstructs the layout (headings, lists and spacing) from your policy’s extracted text to show your changes clearly, so it may not exactly match the formatting of the file you uploaded. Contact details, letterheads and web links are removed for readability. The wording is unchanged, and your original document is not altered.'
                    : 'This is a read-only view reconstructed from your policy’s extracted text, so the layout may not exactly match the file you uploaded. The wording is unchanged and your original document is not altered.'}
                </span>
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
