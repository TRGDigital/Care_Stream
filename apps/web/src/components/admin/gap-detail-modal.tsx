'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { applyRoleNames } from '@/lib/policy-names'
import { X, Loader2, CheckCircle2, Check, Plus, FileText, Sparkles, Mail, Scale, FilePlus2, FilePenLine, GraduationCap, Search, BookOpen, ChevronDown, HelpCircle } from 'lucide-react'

type Detail = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gapDetail']>>

// Distinct highlight colours, one per matched passage. Kept as full class strings
// so Tailwind includes them; teal is reserved for the search box.
const QUOTE_PALETTE = ['bg-yellow-200', 'bg-sky-200', 'bg-green-200', 'bg-purple-200', 'bg-pink-200', 'bg-orange-200', 'bg-lime-200', 'bg-fuchsia-200']
const quoteColour = (i: number) => QUOTE_PALETTE[i % QUOTE_PALETTE.length]

// Many policy names already end in "Policy" (e.g. "Staff Training & Development Policy"), so
// only append the word " policy" when the name doesn't already carry it — never "... Policy policy".
const endsWithPolicy = (name: string) => /polic(y|ies)\s*$/i.test((name || '').trim())
const policySuffix = (name: string) => (endsWithPolicy(name) ? '' : ' policy')

type HighlightItem = { i: number; quote: string; placement: string; label?: string }

// Paid "we'll write the policy for you" CTA in the Coverage detail — hidden for now.
const SHOW_PAID_CTA = false

const normText = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

// Tolerant normalisation for anchor matching: unify curly quotes and dashes (the extracted
// text the AI quotes from and the rendered HTML often differ on these), then collapse space.
const normMatch = (s: string) => (s || '')
  .toLowerCase()
  .replace(/[‘’‚‛′`]/g, "'")
  .replace(/[“”„″]/g, '"')
  .replace(/[‐-―−]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
// The distinctive words (>= 4 chars) of a string, for overlap scoring.
const sigWords = (s: string): string[] => [...new Set(normMatch(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))]

// Highlight the WHOLE block (paragraph or bullet) the anchor phrase sits in, and badge it
// with its number. We deliberately tint the entire block, not just the matched phrase: the
// suggested wording replaces the whole paragraph, so highlighting only a fragment would
// invite the tenant to swap part of a sentence and end up with a garbled hybrid.
// Tier 1: the smallest block whose text contains the anchor (tolerant of quotes/dashes).
// Tier 2 (fallback): the block sharing the most of the anchor's distinctive words, so an
// anchor that isn't a verbatim substring (formatting/extraction differences, spans blocks)
// still lands on the right paragraph instead of dropping to the "find it yourself" list.
function findBlock(root: HTMLElement, anchor: string): HTMLElement | null {
  const needle = normMatch(anchor)
  if (needle.length < 6) return null
  const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote')) as HTMLElement[]
  let target: HTMLElement | null = null
  for (const b of blocks) {
    if (normMatch(b.textContent || '').includes(needle)) {
      if (!target || (b.textContent?.length ?? 0) < (target.textContent?.length ?? 0)) target = b
    }
  }
  if (target) return target

  const aw = sigWords(anchor)
  if (aw.length < 3) return null
  let best: HTMLElement | null = null; let bestScore = 0
  for (const b of blocks) {
    const bw = new Set(sigWords(b.textContent || ''))
    if (!bw.size) continue
    let hits = 0
    for (const w of aw) if (bw.has(w)) hits++
    const score = hits / aw.length
    if (score > bestScore) { bestScore = score; best = b }
  }
  return bestScore >= 0.6 ? best : null
}

// Highlight the whole containing block (tint + number) for a "where to add" amend anchor.
// A badge is a self-contained pill (solid background + padding + right margin) so that two
// markers on the SAME block — e.g. a gap fix "2" and a SAF suggestion "W3" — read as two
// distinct chips instead of mashing into a single "W32". Legible on any block tint.
function makeBadge(text: string, colour: string): HTMLElement {
  const badge = document.createElement('sup')
  badge.textContent = text
  badge.className = `mr-1 inline-block rounded px-1 text-[10px] font-bold leading-none ${colour}`
  return badge
}

function markBlock(root: HTMLElement, anchor: string, i: number): boolean {
  const target = findBlock(root, anchor)
  if (!target) return false
  target.classList.add(quoteColour(i), 'rounded', 'px-1', 'py-0.5')
  target.dataset.csMarked = '1'
  target.dataset.csGap = '1'   // a "what to add" fix owns this block — SAF wording here is moot
  target.insertBefore(makeBadge(String(i + 1), 'bg-neutral-900 text-white'), target.firstChild)
  return true
}

// Highlight the block/heading a SAF wording suggestion belongs to, in indigo with its number
// (distinct from the amber "what to add" markers). Returns whether it could be placed.
function markSafBlock(root: HTMLElement, anchor: string, num: number): boolean {
  if (!anchor || normText(anchor).length < 6) return false
  let target = findBlock(root, anchor)
  if (!target) {
    const q = normText(anchor)
    const heads = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]
    target = heads.find(h => { const t = normText(h.textContent || ''); return t === q || (t.length >= 6 && (t.includes(q) || q.includes(t))) }) ?? null
  }
  if (!target) return false
  // Don't stack a second background tint on a block a gap marker already tinted — that muddies
  // the colour. Keep the gap tint; the indigo chip is enough to signal the SAF suggestion.
  if (!target.dataset.csMarked) target.classList.add('bg-indigo-100', 'rounded', 'px-1', 'py-0.5')
  target.dataset.csMarked = '1'
  target.insertBefore(makeBadge('W' + num, 'bg-indigo-600 text-white'), target.firstChild)
  return true
}

function greenBadge(i: number): HTMLElement {
  const b = document.createElement('span')
  b.textContent = String(i + 1)
  b.className = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-[11px] font-bold text-green-900'
  return b
}

// A green "Adopted" block — used for adopted headings/new sections, or an adopted amend we
// could not place in situ.
function adoptedBlock(i: number, text: string, title?: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'not-prose my-2 rounded-md border border-green-300 bg-green-50 px-3 py-2'
  const head = document.createElement('div')
  head.className = 'mb-1 flex items-center gap-2'
  head.appendChild(greenBadge(i))
  const tag = document.createElement('span')
  tag.className = 'text-[10px] font-bold uppercase tracking-wide text-green-700'
  tag.textContent = 'Adopted'
  head.appendChild(tag)
  wrap.appendChild(head)
  if (title) {
    const h = document.createElement('p')
    h.className = 'text-sm font-bold text-green-900'
    h.textContent = title
    wrap.appendChild(h)
  }
  const p = document.createElement('p')
  p.className = 'whitespace-pre-line text-sm leading-relaxed text-green-900'
  p.textContent = text
  wrap.appendChild(p)
  return wrap
}

// Amend ADOPTED: replace the whole block content in place with the adopted wording (green).
function markBlockAdopted(root: HTMLElement, anchor: string, i: number, newText: string): boolean {
  const target = findBlock(root, anchor)
  if (!target) return false
  target.classList.add('bg-green-100', 'rounded', 'px-1', 'py-0.5')
  target.dataset.csMarked = '1'
  target.dataset.csGap = '1'
  target.textContent = ''
  target.appendChild(makeBadge(String(i + 1), 'bg-green-600 text-white'))
  target.appendChild(document.createTextNode(newText))
  return true
}

type AdoptedMap = Map<number, { new_text: string; section_title?: string; placement: string }>

// Pass A — AMEND anchors: adopted ones show the applied change in place; the rest are
// tinted as "where to add". Returns items we could not place: non-adopted (dashed "amend
// near") and adopted-but-unplaced (rendered as a green block at the end).
function highlightSentences(root: HTMLElement, items: HighlightItem[], adopted: AdoptedMap): { unplaced: HighlightItem[]; adoptedExtra: Array<{ i: number; text: string }> } {
  const unplaced: HighlightItem[] = []
  const adoptedExtra: Array<{ i: number; text: string }> = []
  for (const it of items) {
    const a = adopted.get(it.i)
    if (a) {
      if (!markBlockAdopted(root, it.quote, it.i, a.new_text)) adoptedExtra.push({ i: it.i, text: a.new_text })
    } else if (!markBlock(root, it.quote, it.i)) {
      unplaced.push(it)
    }
  }
  return { unplaced, adoptedExtra }
}

function numberBadge(i: number): HTMLElement {
  const b = document.createElement('span')
  b.textContent = String(i + 1)
  b.className = `flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour(i)}`
  return b
}

// Trailing "end matter" a new section must sit ABOVE: dates, signatures, version and
// company info. We find the topmost block of that trailing run and insert before it.
const END_MATTER_RE = /\b(date|dated|signed|signature|reviewed|review date|next review|version|approved by|authorised by|policy owner|©|copyright|registered (office|number|charity)|company (number|registration)|\bltd\b|limited)\b/i
function endMatterAnchor(root: HTMLElement): HTMLElement | null {
  const blocks = Array.from(root.children) as HTMLElement[]
  let anchor: HTMLElement | null = null
  for (let i = blocks.length - 1; i >= 0; i--) {
    const t = normText(blocks[i].textContent || '')
    if (!t) continue
    if (t.length <= 200 && END_MATTER_RE.test(t)) { anchor = blocks[i]; continue }
    break
  }
  return anchor
}
function insertBeforeEndMatter(root: HTMLElement, node: HTMLElement) {
  const anchor = endMatterAnchor(root)
  if (anchor && anchor.parentNode === root) root.insertBefore(node, anchor)
  else root.appendChild(node)
}

// Pass C — NEW-SECTION items (and any amend anchor we could not pin) get a numbered
// callout inserted at the end of the BODY but above the sign-off/dates. New sections
// lead with their suggested H2 title so they read as self-contained sections.
function appendEndCallouts(root: HTMLElement, unplacedAmend: HighlightItem[], newSections: HighlightItem[], adopted: AdoptedMap, adoptedExtra: Array<{ i: number; text: string }>) {
  const adoptedNew = newSections.filter(it => adopted.has(it.i))
  const pendingNew = newSections.filter(it => !adopted.has(it.i))
  if (!unplacedAmend.length && !pendingNew.length && !adoptedNew.length && !adoptedExtra.length) return
  const wrap = document.createElement('div')
  wrap.className = 'not-prose mt-4 space-y-2 border-t border-dashed border-gray-300 pt-3'

  // Adopted new sections + adopted amends that could not be placed in situ → green blocks.
  for (const it of adoptedNew) {
    const a = adopted.get(it.i)!
    wrap.appendChild(adoptedBlock(it.i, a.new_text, a.section_title ?? it.label))
  }
  for (const ex of adoptedExtra) wrap.appendChild(adoptedBlock(ex.i, ex.text))

  if (pendingNew.length) {
    const h = document.createElement('p')
    h.className = 'text-[10px] font-bold uppercase tracking-wide text-teal-700'
    h.textContent = 'Add these as new sections here (above the dates and sign-off)'
    wrap.appendChild(h)
    for (const it of pendingNew) {
      const row = document.createElement('div')
      row.className = 'rounded-md border border-dashed border-teal-400 bg-teal-50 px-3 py-2 text-xs text-teal-900'
      const head = document.createElement('div')
      head.className = 'flex items-center gap-2'
      head.appendChild(numberBadge(it.i))
      const title = document.createElement('strong')
      title.className = 'text-sm'
      title.textContent = it.label ? it.label : `New section ${it.i + 1}`
      head.appendChild(title)
      row.appendChild(head)
      const sub = document.createElement('p')
      sub.className = 'mt-0.5 text-teal-800/80'
      sub.textContent = `New H2 section. Use the wording for item ${it.i + 1} on the left.`
      row.appendChild(sub)
      wrap.appendChild(row)
    }
  }

  if (unplacedAmend.length) {
    const h = document.createElement('p')
    h.className = 'mt-2 text-[10px] font-bold uppercase tracking-wide text-amber-700'
    h.textContent = 'Also amend these (find the quoted wording in the policy)'
    wrap.appendChild(h)
    for (const it of unplacedAmend) {
      const row = document.createElement('div')
      row.className = 'flex items-start gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900'
      row.appendChild(numberBadge(it.i))
      const body = document.createElement('span')
      const strong = document.createElement('strong')
      strong.textContent = 'Amend near: '
      body.appendChild(strong)
      const q = it.quote.length > 140 ? it.quote.slice(0, 140) + '…' : it.quote
      body.appendChild(document.createTextNode(`“${q}”`))
      row.appendChild(body)
      wrap.appendChild(row)
    }
  }

  insertBeforeEndMatter(root, wrap)
}

// A dashed "add a subsection here" callout element.
function buildHeadingMarker(i: number, label?: string): HTMLElement {
  const marker = document.createElement('div')
  marker.className = 'not-prose my-2 flex items-start gap-2 rounded-md border border-dashed border-teal-400 bg-teal-50 px-3 py-2 text-xs text-teal-900'
  const badge = document.createElement('span')
  badge.textContent = String(i + 1)
  badge.className = `flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour(i)}`
  const body = document.createElement('span')
  const strong = document.createElement('strong')
  strong.textContent = 'Add a new subsection here. '
  body.appendChild(strong)
  body.appendChild(document.createTextNode(label ? label : `See item ${i + 1} on the left.`))
  marker.appendChild(badge)
  marker.appendChild(body)
  return marker
}

// Pass B — HEADING anchors: find the heading element and drop a numbered "add a
// subsection here" callout directly below it. Handled separately from the inline pass
// so several items under the SAME heading each get their own callout (the old single
// text-node pass could only mark one, which is why some numbers never appeared).
function insertHeadingCallouts(root: HTMLElement, items: HighlightItem[], adopted: AdoptedMap) {
  if (!items.length) return
  const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]
  const byHeading = new Map<HTMLElement, HighlightItem[]>()
  for (const it of items) {
    const q = normText(it.quote)
    if (!q) continue
    const target = headings.find(h => {
      const ht = normText(h.textContent || '')
      return ht === q || (q.length >= 6 && ht.length >= 6 && (ht.includes(q) || q.includes(ht)))
    })
    if (!target) continue
    if (!byHeading.has(target)) byHeading.set(target, [])
    byHeading.get(target)!.push(it)
  }
  for (const [heading, its] of byHeading) {
    let anchor: HTMLElement = heading
    for (const it of its) {
      const a = adopted.get(it.i)
      // Adopted → the actual subsection lands under the heading (green); else the dashed marker.
      const node = a ? adoptedBlock(it.i, a.new_text) : buildHeadingMarker(it.i, it.label)
      anchor.after(node)
      anchor = node
    }
  }
}

// Number and locate every "what to add" item in the policy. Adopted items render as the
// applied change (green) so the tenant sees the wording land in the policy; the rest show
// as "where to add" markers (inline tint for amend, dashed callouts for headings/sections).
function highlightQuotes(root: HTMLElement, quotes: string[], placements: string[] = [], labels: string[] = [], adopted: AdoptedMap = new Map()) {
  const items: HighlightItem[] = quotes.map((quote, i) => ({ i, quote, placement: placements[i] ?? 'amend', label: labels[i] }))
  const { unplaced, adoptedExtra } = highlightSentences(root, items.filter(it => it.placement === 'amend' && it.quote), adopted)
  insertHeadingCallouts(root, items.filter(it => it.placement === 'add_under_heading' && it.quote), adopted)
  const newSections = items.filter(it => it.placement === 'new_section')
  appendEndCallouts(root, unplaced, newSections, adopted, adoptedExtra)
}

// Highlight every occurrence of a plain search term in the rendered policy (text
// nodes only). Returns the match count. Used for the "search this policy" box.
function highlightSearch(root: HTMLElement, term: string): number {
  const t = term.trim()
  if (t.length < 2) return 0
  const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  let count = 0
  for (const node of nodes) {
    const raw = node.nodeValue ?? ''
    re.lastIndex = 0
    if (!re.test(raw)) continue
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      if (m.index > last) frag.appendChild(document.createTextNode(raw.slice(last, m.index)))
      const mark = document.createElement('mark')
      mark.className = 'bg-teal-200 rounded px-0.5'
      mark.textContent = m[0]
      frag.appendChild(mark)
      last = m.index + m[0].length
      count++
      if (m.index === re.lastIndex) re.lastIndex++
    }
    if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)))
    node.parentNode?.replaceChild(frag, node)
  }
  return count
}

export function GapDetailModal({ token, referenceKey, officialName, acknowledged, disclaimer, onAcknowledged, onClose, onVerdictCovered, onCompleted }: {
  token:            string
  referenceKey:     string
  officialName:     string
  acknowledged:     boolean
  disclaimer:       string
  onAcknowledged:   () => void
  onClose:          () => void
  onVerdictCovered: (referenceKey: string) => void
  onCompleted:      (referenceKey: string) => void
}) {
  const [completing, setCompleting] = useState(false)
  const [detail,  setDetail]  = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  // Legal disclaimer gate — the detail is only fetched once accepted.
  const [accepted, setAccepted] = useState(acknowledged)
  const [accepting, setAccepting] = useState(false)
  const [synopsisOpen, setSynopsisOpen] = useState(false)          // "What this regulation covers" Read more
  const [whyOpen, setWhyOpen] = useState<Set<string>>(new Set())   // per-suggestion "why adopt this" toggles

  async function acceptDisclaimer() {
    setAccepting(true)
    try {
      await createApiClient(token).analytics.acknowledgeRemediation()
      onAcknowledged()
      setAccepted(true)
    } catch {
      setAccepted(true)   // don't hard-block on a failed record; proceed
    } finally {
      setAccepting(false)
    }
  }

  // Coverage tab (policy preview + highlight) — loaded lazily.
  const [html,        setHtml]        = useState<string | null>(null)
  const [previewErr,  setPreviewErr]  = useState('')
  const [previewLoad, setPreviewLoad] = useState(false)
  const [policySearch, setPolicySearch] = useState('')
  const [matchCount,   setMatchCount]   = useState<number | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Policy Change Adoption (beta) — adopt a suggestion into the policy's draft.
  const [adoption,     setAdoption]     = useState<{ enabled: boolean; variables: Array<{ key: string; label: string; value: string }>; role_holders: Array<{ key: string; role: string; candidates: string[] }>; role_names?: Record<string, string[]>; show_role_names?: boolean } | null>(null)
  const [adoptingReq,  setAdoptingReq]  = useState<string | null>(null)
  const [adoptText,    setAdoptText]    = useState('')
  const [adoptTitle,   setAdoptTitle]   = useState('')
  const [adoptBusy,    setAdoptBusy]    = useState(false)
  const [adoptErr,     setAdoptErr]     = useState('')
  const [adoptedReqs,  setAdoptedReqs]  = useState<Set<string>>(new Set())
  const [adoptedContent, setAdoptedContent] = useState<Record<string, { new_text: string; section_title?: string }>>({})
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const adoptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!accepted) return
    createApiClient(token).analytics.adoptionContext().then(setAdoption).catch(() => setAdoption(null))
  }, [accepted, token])

  // Reflect changes already adopted into this policy's draft (prior sessions).
  useEffect(() => {
    if (!accepted || !adoption?.enabled || !detail?.target_policy) return
    createApiClient(token).analytics.policyDocument(detail.target_policy.id)
      .then(d => {
        const changes = d.changes ?? []
        setPendingCount(changes.filter(c => !c.published).length)
        setAdoptedReqs(new Set(changes.map(c => c.requirement)))
        setAdoptedContent(Object.fromEntries(changes.map(c => [c.requirement, { new_text: c.new_text }])))
      })
      .catch(() => {})
  }, [accepted, adoption?.enabled, detail?.target_policy, token])

  function openAdopt(r: { requirement: string; suggested_addition?: string | null; section_title?: string | null }) {
    setAdoptingReq(r.requirement)
    setAdoptText(r.suggested_addition ?? '')
    setAdoptTitle(r.section_title ?? '')
    setAdoptErr('')
  }

  // Insert a variable/name at the cursor in the adopt textarea.
  function insertChip(name: string) {
    const ta = adoptRef.current
    if (!ta) { setAdoptText(t => `${t}${name}`); return }
    const start = ta.selectionStart ?? adoptText.length
    const end   = ta.selectionEnd ?? adoptText.length
    setAdoptText(adoptText.slice(0, start) + name + adoptText.slice(end))
    requestAnimationFrame(() => { ta.focus(); const pos = start + name.length; ta.setSelectionRange(pos, pos) })
  }

  async function doAdopt(r: { requirement: string; placement?: string | null; location_quote?: string | null }) {
    if (!detail?.target_policy || !adoptText.trim()) return
    setAdoptBusy(true); setAdoptErr('')
    try {
      const res = await createApiClient(token).analytics.adoptSuggestion({
        policy_id: detail.target_policy.id, reference_key: detail.reference_key, requirement: r.requirement,
        placement: r.placement ?? 'new_section', old_text: r.location_quote ?? '', new_text: adoptText.trim(),
        section_title: r.placement === 'new_section' ? (adoptTitle.trim() || undefined) : undefined,
      })
      setAdoptedReqs(s => new Set(s).add(r.requirement))
      setAdoptedContent(m => ({ ...m, [r.requirement]: { new_text: adoptText.trim(), section_title: adoptTitle.trim() || undefined } }))
      setPendingCount(res.pending)
      setAdoptingReq(null)
      if (!res.applied) setAdoptErr('Adopted and logged, but we could not auto-place it exactly — check the draft when you review.')
    } catch (e: any) {
      setAdoptErr(e.message ?? 'Could not adopt this change.')
    } finally {
      setAdoptBusy(false)
    }
  }

  // Ad-hoc training module generation.
  const [modLoad, setModLoad] = useState(false)
  const [modDone, setModDone] = useState<{ name: string; already: boolean } | null>(null)
  const [modErr,  setModErr]  = useState('')

  // CQC wording alignment (SAF).
  const [safLoad, setSafLoad]     = useState(false)
  const [safResult, setSafResult] = useState<Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['safAlignment']>> | null>(null)
  const [safErr, setSafErr]       = useState('')
  const [safAdopted, setSafAdopted]   = useState<Set<number>>(new Set())
  const [safBusy, setSafBusy]         = useState<number | null>(null)
  const [safLocated, setSafLocated]   = useState<Set<number>>(new Set())   // alignments placed on the preview
  const [safSuppressed, setSafSuppressed] = useState<Set<number>>(new Set())  // alignments hidden: a gap fix owns that block

  async function checkSaf(force = false) {
    if (!detail?.target_policy) return
    setSafLoad(true); setSafErr('')
    if (force) { setSafResult(null); setSafAdopted(new Set()) }
    try { setSafResult(await createApiClient(token).analytics.safAlignment(referenceKey, detail.target_policy.id, force)) }
    catch (e: any) { setSafErr(e.message ?? 'Could not check the wording.') }
    finally { setSafLoad(false) }
  }
  // Auto-run once the policy that evidences this regulation is known (cached server-side).
  useEffect(() => {
    if (!detail?.target_policy || safResult || safLoad) return
    checkSaf()
  }, [detail?.target_policy]) // eslint-disable-line react-hooks/exhaustive-deps
  async function adoptSaf(a: { focus: string; placement: 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string }, idx: number) {
    if (!safResult?.target_policy) return
    setSafBusy(idx); setSafErr('')
    try {
      await createApiClient(token).analytics.adoptSuggestion({
        policy_id: safResult.target_policy.id, reference_key: detail?.reference_key ?? referenceKey, requirement: a.focus,
        placement: a.placement, old_text: a.placement === 'add_under_heading' ? a.anchor : '',
        new_text: a.wording, section_title: a.placement === 'new_section' ? (a.section_title || undefined) : undefined,
      })
      setSafAdopted(s => new Set(s).add(idx))
    } catch (e: any) { setSafErr(e.message ?? 'Could not adopt this.') }
    finally { setSafBusy(null) }
  }

  async function generateOnboarding() {
    setModLoad(true); setModErr('')
    try {
      const { flow, already } = await createApiClient(token).analytics.gapOnboarding(referenceKey)
      setModDone({ name: flow.name, already })
    } catch (e: any) {
      setModErr(e.message ?? 'Could not create the onboarding.')
    } finally {
      setModLoad(false)
    }
  }

  useEffect(() => {
    if (!accepted) return   // don't fetch the remediation detail until the disclaimer is accepted
    let live = true
    createApiClient(token).analytics.gapDetail(referenceKey)
      .then(d => { if (!live) return; setDetail(d); if (d.effective_status === 'covered') onVerdictCovered(referenceKey) })
      .catch(e => { if (live) setError(e.message ?? 'Could not build the detail.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, referenceKey, accepted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load the target policy preview (right pane) as soon as the detail is ready.
  useEffect(() => {
    if (!detail?.target_policy || html !== null || previewLoad) return
    setPreviewLoad(true)
    createApiClient(token).policies.preview(detail.target_policy.id)
      .then(d => setHtml(d.html || ''))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
      .finally(() => setPreviewLoad(false))
  }, [detail, html, previewLoad, token])

  // This effect is the SOLE owner of the preview node's content — the JSX div is left
  // empty (no dangerouslySetInnerHTML) on purpose. If React also managed the innerHTML,
  // any re-render (a background session refresh, the post-analysis reload, or a
  // scroll-driven ancestor update) would re-assert the raw HTML and wipe the injected
  // <mark> highlights, which is exactly the "highlights vanish after a bit / on scroll"
  // bug. Because React never touches this node's children, the marks now persist until
  // the policy, detail, or search term actually changes.
  //
  // Re-render highlights whenever the policy loads or the search term changes: reset to
  // the original HTML, re-apply the coverage highlights, then the search highlights.
  useEffect(() => {
    const root = previewRef.current
    if (!root || !html || !detail) return
    // Adopted suggestions show as the applied change (green) in the preview, so the tenant
    // sees the wording land in the policy; the rest still show as "where to add" markers.
    const adopted = new Map<number, { new_text: string; section_title?: string; placement: string }>()
    for (const r of detail.requirements ?? []) {
      if (r.status !== 'missing' || !adoptedReqs.has(r.requirement) || r.match_index == null) continue
      const c = adoptedContent[r.requirement]
      adopted.set(r.match_index - 1, {
        new_text: c?.new_text ?? r.suggested_addition ?? '',
        section_title: c?.section_title ?? r.section_title ?? undefined,
        placement: r.placement ?? 'new_section',
      })
    }
    root.innerHTML = html
    highlightQuotes(root, detail.highlight_quotes ?? [], detail.highlight_placements ?? [], detail.highlight_labels ?? [], adopted)
    if (adoption?.show_role_names) applyRoleNames(root, adoption.role_names)
    // SAF wording-alignment markers (indigo, W-numbered), when the check is for this policy.
    // If a "what to add" fix already owns the same block (csGap), the SAF wording rewrite of
    // that block is moot — adopting one voids the other — so we suppress it rather than show
    // two competing suggestions on one paragraph. Runs AFTER highlightQuotes has flagged the
    // gap blocks above.
    const located = new Set<number>()
    const suppressed = new Set<number>()
    if (safResult?.alignments?.length && safResult.target_policy?.id === detail.target_policy?.id) {
      safResult.alignments.forEach((a, i) => {
        if (!a.anchor) return
        const block = findBlock(root, a.anchor)
        if (block?.dataset.csGap) { suppressed.add(i); return }   // gap fix already covers this block
        if (markSafBlock(root, a.anchor, i + 1)) located.add(i)
      })
    }
    setSafLocated(located)
    setSafSuppressed(suppressed)
    if (policySearch.trim().length >= 2) {
      setMatchCount(highlightSearch(root, policySearch))
      root.querySelector('mark.bg-teal-200')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    } else {
      setMatchCount(null)
    }
  }, [html, detail, policySearch, adoptedReqs, adoptedContent, adoption, safResult])

  async function markCompleted() {
    setCompleting(true)
    try {
      await createApiClient(token).analytics.completeGap(referenceKey)
      onCompleted(referenceKey)
      onClose()
    } catch { setCompleting(false) }
  }

  // Order the list by the highlight number (document order), so the left checklist
  // reads in the same 1, 2, 3 sequence as the badges down the policy; brand-new
  // sections (no anchor) fall to the end.
  const missing = (detail?.requirements.filter(r => r.status === 'missing') ?? [])
    .slice()
    .sort((a, b) => (a.match_index ?? Number.MAX_SAFE_INTEGER) - (b.match_index ?? Number.MAX_SAFE_INTEGER))
  const covered = detail?.requirements.filter(r => r.status === 'already_covered') ?? []
  const mailto = `mailto:hello@carestreamai.com?subject=${encodeURIComponent('Policy authoring request: ' + officialName)}&body=${encodeURIComponent(`We would like CareStream to write and supply a policy that covers ${officialName}.`)}`

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[96rem] rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Coverage detail</p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-dark">{officialName}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        {!accepted ? (
          <div className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <Scale size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="mb-1.5 text-sm font-bold text-amber-900">Before you use these recommendations</p>
                <p className="text-sm leading-relaxed text-amber-800">{disclaimer}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-mid">By continuing, you confirm you understand this and accept responsibility for reviewing, adapting and approving any changes, and for having them checked by a qualified specialist where appropriate. We record this acknowledgement once, with your name and the date.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={acceptDisclaimer} disabled={accepting}
                className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {accepting ? <><Loader2 size={14} className="animate-spin" /> Recording…</> : 'I understand and accept'}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Loader2 size={26} className="animate-spin text-teal" />
            <p className="text-sm text-neutral-mid">Loading recommendations…</p>
          </div>
        ) : error ? (
          <div className="m-6 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : detail ? (
          <>
            {/* What this regulation covers — synopsis + Read more */}
            {detail.summary && (() => {
              const more = [detail.care_home_context, detail.practical_meaning].map(t => (t ?? '').trim()).filter(Boolean)
              // Collapsed shows ~2 lines of the synopsis; Read more reveals the rest
              // plus the care-setting context and what the policy should cover.
              const hasMore = more.length > 0 || detail.summary.length > 140
              return (
                <div className="mx-6 mt-5 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
                  <div className="flex items-start gap-2.5 px-4 py-3">
                    <BookOpen size={15} className="mt-0.5 shrink-0 text-teal" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal">What this regulation covers</p>
                      <p className={`mt-1 text-sm leading-relaxed text-neutral-dark ${synopsisOpen ? '' : 'line-clamp-2'}`}>{detail.summary}</p>
                      {synopsisOpen && more.length > 0 && (
                        <div className="mt-2 space-y-2 border-t border-teal/10 pt-2">
                          {detail.care_home_context && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal/80">In a care setting</p>
                              <p className="text-sm leading-relaxed text-neutral-mid">{detail.care_home_context}</p>
                            </div>
                          )}
                          {detail.practical_meaning && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal/80">What your policy should cover</p>
                              <p className="text-sm leading-relaxed text-neutral-mid">{detail.practical_meaning}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {hasMore && (
                        <button onClick={() => setSynopsisOpen(o => !o)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline">
                          {synopsisOpen ? 'Show less' : 'Read more'}
                          <ChevronDown size={12} className={`transition-transform ${synopsisOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Verdict correction banner */}
            {detail.effective_status === 'covered' && (
              <div className="mx-6 mt-5 flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Actually covered across your library</p>
                  <p className="text-xs text-green-700">On a closer read, every requirement of this regulation is already addressed in your policies, so there is nothing to add. We have updated the coverage result.</p>
                </div>
              </div>
            )}

            {/* Split screen: what to add (left) · the policy to check it against (right) */}
            <div className="grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[87vh] lg:grid-cols-2 lg:divide-x lg:divide-y-0">

              {/* LEFT — what to add */}
              <div className="overflow-y-auto px-6 py-5 lg:max-h-[87vh]">
                <div className="space-y-5">
                  {/* Legal basis + where to add */}
                  <div className="space-y-2">
                    <div className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 ${detail.authority_basis === 'statutory' ? 'border-rose-200 bg-rose-50' : 'border-sky-200 bg-sky-50'}`}>
                      <Scale size={16} className={`mt-0.5 shrink-0 ${detail.authority_basis === 'statutory' ? 'text-rose-600' : 'text-sky-600'}`} />
                      <div className="min-w-0 text-sm">
                        <p className={`font-semibold ${detail.authority_basis === 'statutory' ? 'text-rose-800' : 'text-sky-800'}`}>
                          {detail.authority_basis === 'statutory' ? 'Legally required in your policies' : 'Advised — good practice'}
                        </p>
                        <p className={detail.authority_basis === 'statutory' ? 'text-rose-700' : 'text-sky-700'}>
                          {detail.authority_basis === 'statutory' ? 'Required by' : 'Recommended by'} {detail.official_name}.
                          {detail.source_urls.map((u, i) => (
                            <span key={u}>{i === 0 ? ' ' : ', '}<a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">source{detail.source_urls.length > 1 ? ` ${i + 1}` : ''}</a></span>
                          ))}
                        </p>
                      </div>
                    </div>
                    {(detail.target_policy || detail.suggested_new_policy_title) && detail.effective_status !== 'covered' && (
                      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/40 px-4 py-2.5 text-sm">
                        {detail.target_policy ? <FileText size={15} className="mt-0.5 shrink-0 text-teal" /> : <FilePlus2 size={15} className="mt-0.5 shrink-0 text-teal" />}
                        <p className="text-neutral-dark">
                          {detail.target_policy
                            ? <>Add the wording below to your <span className="font-semibold">{detail.target_policy.name}</span>{policySuffix(detail.target_policy.name)}.</>
                            : <>You don&rsquo;t have a matching policy yet — you&rsquo;ll need a new <span className="font-semibold">{detail.suggested_new_policy_title}</span>.</>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Missing requirements + suggested wording + where to add */}
                  {missing.length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Plus size={15} className="text-amber-600" /> What to add ({missing.length})</p>
                      {(() => { const located = missing.filter(r => r.placement === 'amend' || r.placement === 'add_under_heading').length; const news = missing.filter(r => r.placement === 'new_section').length; return (located > 0 && news > 0) ? (
                        <p className="-mt-1 text-xs text-neutral-mid">{located} fit{located === 1 ? 's' : ''} into an existing section (numbered &amp; highlighted right) · {news} need{news === 1 ? 's' : ''} a new section (numbered at the end).</p>
                      ) : null })()}
                      {adoption?.enabled && pendingCount !== null && pendingCount > 0 && detail.target_policy && (
                        <p className="-mt-1 flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900"><FilePenLine size={12} className="shrink-0" /> {pendingCount} change{pendingCount === 1 ? '' : 's'} adopted into your {detail.target_policy.name} draft. Review and publish it from <a href="/policies" className="font-semibold underline hover:no-underline">Policies</a>.</p>
                      )}
                      {missing.map((r, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour((r.match_index ?? 1) - 1)}`}>{r.match_index}</span>
                            <p className="text-sm font-medium text-neutral-dark">{r.requirement}</p>
                          </div>
                          <p className="mt-1.5 text-xs text-amber-700">
                            {r.placement === 'add_under_heading'
                              ? <>Add a <span className="font-semibold">new subsection</span> under <span className="font-semibold">highlight {r.match_index}</span> (a heading) in your {detail.target_policy?.name ?? 'policy'} (right).</>
                              : r.placement === 'new_section'
                                ? <>Add as a <span className="font-semibold">new section</span>{detail.target_policy ? <>, shown as <span className="font-semibold">{r.match_index}</span> at the end of your {detail.target_policy.name} (right), above the dates and sign-off</> : detail.suggested_new_policy_title ? <> in a new {detail.suggested_new_policy_title}</> : null}. Add it with the heading below.</>
                                : <><span className="font-semibold">Replace the whole highlighted paragraph {r.match_index}</span> in your {detail.target_policy?.name ?? 'policy'} (right) with the wording below. It keeps everything already in that paragraph and adds what&rsquo;s missing, so swap the paragraph in full rather than part of it.</>}
                          </p>
                          {/* Why this matters / why adopt it */}
                          <div className="mt-1.5">
                            <button
                              onClick={() => setWhyOpen(s => { const n = new Set(s); n.has(r.requirement) ? n.delete(r.requirement) : n.add(r.requirement); return n })}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
                            >
                              <HelpCircle size={12} /> Why adopt this?
                              <ChevronDown size={11} className={`transition-transform ${whyOpen.has(r.requirement) ? 'rotate-180' : ''}`} />
                            </button>
                            {whyOpen.has(r.requirement) && (
                              <p className="mt-1 rounded-md border border-teal/15 bg-teal-light/20 px-3 py-2 text-xs leading-relaxed text-neutral-mid">
                                {detail.authority_basis === 'statutory'
                                  ? <>This is a <span className="font-semibold text-neutral-dark">legally required</span> element of {detail.official_name}. If your policies don&rsquo;t address it, it&rsquo;s a compliance gap a CQC inspector can raise. Adopting the suggested wording brings your policy in line and gives you documented evidence that you cover it.</>
                                  : <>This is <span className="font-semibold text-neutral-dark">recommended good practice</span> under {detail.official_name}. Adopting it strengthens your policy and shows you follow current best-practice guidance, which supports a stronger inspection outcome.</>}
                              </p>
                            )}
                          </div>
                          {r.suggested_addition && (
                            <div className="mt-2 rounded-md border border-amber-100 bg-white px-3 py-2.5">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">{r.placement === 'amend' ? 'Suggested replacement (keeps your wording, adds the rest)' : r.placement === 'new_section' ? 'New section (add with this heading)' : 'Example wording'}</p>
                              {r.placement === 'new_section' && r.section_title && (
                                <p className="mb-1 text-sm font-bold text-neutral-dark">{r.section_title}</p>
                              )}
                              <p className="text-sm leading-relaxed text-neutral-dark">{r.suggested_addition}</p>
                            </div>
                          )}

                          {/* Adopt into the policy (beta) */}
                          {adoption?.enabled && detail.target_policy && r.suggested_addition && (
                            adoptedReqs.has(r.requirement) ? (
                              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700"><Check size={13} /> Adopted into your {detail.target_policy.name} draft</p>
                            ) : adoptingReq === r.requirement ? (
                              <div className="mt-2 rounded-md border border-teal-200 bg-teal-50/40 p-3">
                                {r.placement === 'amend' && r.location_quote && (
                                  <div className="mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Replacing this paragraph</p>
                                    <p className="mt-0.5 rounded bg-white/70 px-2 py-1 text-xs text-neutral-mid line-through decoration-neutral-300">{r.location_quote}</p>
                                  </div>
                                )}
                                {r.placement === 'new_section' && (
                                  <div className="mb-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Section heading</label>
                                    <input value={adoptTitle} onChange={e => setAdoptTitle(e.target.value)} className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                                  </div>
                                )}
                                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Wording to add (edit before adopting)</label>
                                <textarea ref={adoptRef} value={adoptText} onChange={e => setAdoptText(e.target.value)} rows={5}
                                  className="mt-0.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm leading-relaxed focus:border-teal focus:outline-none" />
                                {(adoption.variables.length > 0 || adoption.role_holders.some(rh => rh.candidates.length > 0)) && (
                                  <div className="mt-2">
                                    <p className="text-[10px] text-neutral-mid">Insert a name (click to add at the cursor):</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {adoption.variables.filter(v => v.key !== 'address').map(v => (
                                        <button key={v.key} type="button" onClick={() => insertChip(v.value)} title={v.label}
                                          className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-neutral-dark hover:border-teal hover:text-teal">{v.value}</button>
                                      ))}
                                      {adoption.role_holders.flatMap(rh => rh.candidates.map(c => (
                                        <button key={`${rh.key}-${c}`} type="button" onClick={() => insertChip(c)} title={rh.role}
                                          className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-neutral-dark hover:border-teal hover:text-teal">{c} <span className="text-neutral-mid">· {rh.role}</span></button>
                                      )))}
                                    </div>
                                  </div>
                                )}
                                {adoptErr && <p className="mt-2 text-xs text-amber-700">{adoptErr}</p>}
                                <div className="mt-2 flex items-center gap-2">
                                  <button onClick={() => doAdopt(r)} disabled={adoptBusy || !adoptText.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">
                                    {adoptBusy ? <><Loader2 size={13} className="animate-spin" /> Adopting…</> : <><Check size={13} /> Adopt into {detail.target_policy.name}</>}
                                  </button>
                                  <button onClick={() => setAdoptingReq(null)} className="rounded-btn border border-gray-200 px-3 py-1.5 text-xs text-neutral-mid hover:bg-gray-50">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => openAdopt(r)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-btn border border-teal/40 bg-white px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal-light/30">
                                <FilePenLine size={13} /> Adopt into {detail.target_policy.name}
                              </button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CQC wording alignment (SAF) — runs automatically when a policy evidences this */}
                  {detail?.target_policy && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Sparkles size={15} className="text-indigo-600" /> CQC wording alignment</p>
                        {safResult && !safLoad && (
                          <button onClick={() => checkSaf(true)} className="text-xs font-medium text-indigo-700 hover:text-indigo-900">Re-check</button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-mid">Whether <strong>{detail.target_policy.name}</strong> reads the way CQC&rsquo;s quality statement expects, not just whether it covers the rule.</p>
                      {safLoad && <p className="mt-2 flex items-center gap-2 text-xs text-neutral-mid"><Loader2 size={13} className="animate-spin" /> Checking the wording…</p>}
                      {safErr && !safLoad && <p className="mt-2 text-xs text-red-600">{safErr}</p>}
                      {safResult && !safLoad && (
                        <div className="mt-2 space-y-3">
                          {safResult.statements.length > 0 && <p className="text-xs text-neutral-mid">Supports CQC quality statement{safResult.statements.length === 1 ? '' : 's'}: <span className="font-medium text-neutral-dark">{safResult.statements.map(s => s.name).join(', ')}</span></p>}
                          <p className="text-sm text-neutral-dark">{safResult.message}</p>
                          {safResult.alignments.length > 0 && safSuppressed.size === safResult.alignments.length && (
                            <p className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5 text-xs text-neutral-mid">The wording CQC looks for here is already handled by the &ldquo;What to add&rdquo; suggestions above, adopt those and this policy will read the way the quality statement expects.</p>
                          )}
                          {safResult.alignments.map((a, i) => safSuppressed.has(i) ? null : (
                            <div key={i} className="rounded-lg border border-indigo-100 bg-white px-3 py-2.5">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 px-1.5 text-[11px] font-bold text-indigo-700">W{i + 1}</span>
                                <p className="text-xs font-semibold text-indigo-700">{a.focus}</p>
                              </div>
                              <p className="mt-1.5 text-[11px] text-neutral-mid">
                                {safLocated.has(i)
                                  ? <>Highlighted <span className="font-semibold text-indigo-700">W{i + 1}</span> in your {detail.target_policy?.name ?? 'policy'} (right), add the wording there.</>
                                  : a.placement === 'new_section'
                                    ? <>Add as a <span className="font-semibold">new section</span>{a.section_title ? <> &ldquo;{a.section_title}&rdquo;</> : null} at the end.</>
                                    : <>Add near: &ldquo;{a.anchor}&rdquo;</>}
                              </p>
                              <p className="mt-1.5 whitespace-pre-line text-sm text-neutral-dark">{a.wording}</p>
                              <div className="mt-2">
                                {safAdopted.has(i) ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Adopted, review it in the policy</span>
                                ) : (
                                  <button onClick={() => adoptSaf(a, i)} disabled={safBusy !== null} className="inline-flex items-center gap-1.5 rounded-btn border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                                    {safBusy === i ? <><Loader2 size={13} className="animate-spin" /> Adopting…</> : 'Adopt this wording'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Already covered (quiet footnote — not the focus) */}
                  {covered.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><CheckCircle2 size={15} className="text-green-600" /> Already covered ({covered.length})</p>
                      {covered.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50/50 px-4 py-2.5">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-500" />
                          <div className="min-w-0">
                            <p className="text-sm text-neutral-dark">{r.requirement}</p>
                            {r.already_covered_in && <p className="text-xs text-green-700">In your <span className="font-medium">{r.already_covered_in}</span>{policySuffix(r.already_covered_in)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {missing.length === 0 && covered.length === 0 && (
                    <p className="text-sm text-neutral-mid">No specific requirements could be extracted for this regulation.</p>
                  )}

                  {/* Paid-authoring CTA — hidden for now (flip SHOW_PAID_CTA to restore) */}
                  {SHOW_PAID_CTA && missing.length > 0 && (
                    <div className="flex flex-col items-start gap-2 rounded-lg border border-teal/20 bg-teal-light/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2">
                        <Sparkles size={16} className="mt-0.5 shrink-0 text-teal" />
                        <p className="text-sm text-neutral-dark">Prefer it done for you? CareStream can write and supply a compliant policy for this regulation.</p>
                      </div>
                      <a href={mailto} className="inline-flex shrink-0 items-center gap-1.5 rounded-btn bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
                        <Mail size={14} /> Request this policy
                      </a>
                    </div>
                  )}

                  {/* Turn the policy update into onboarding so staff read and confirm it */}
                  {missing.length > 0 && (
                    modDone ? (
                      <div className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                        <p className="text-green-800">{modDone.already ? 'Onboarding already exists for' : 'Added to onboarding:'} <span className="font-semibold">{modDone.name}</span>. Assign it to staff in <a href="/onboarding" className="underline hover:no-underline">Onboarding</a> so they read and confirm the updated policy.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                          <GraduationCap size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                          <p className="text-sm text-neutral-dark">Once you&rsquo;ve added this to your policy, add it to your onboarding so staff read and confirm the updated policy.</p>
                        </div>
                        <button onClick={generateOnboarding} disabled={modLoad}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-btn bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                          {modLoad ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Sparkles size={14} /> Generate onboarding</>}
                        </button>
                      </div>
                    )
                  )}
                  {modErr && <p className="text-xs text-red-600">{modErr}</p>}

                  {/* Mark completed → archive */}
                  <div className="border-t border-gray-100 pt-4">
                    <button onClick={markCompleted} disabled={completing}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-green-300 bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">
                      {completing ? <><Loader2 size={14} className="animate-spin" /> Archiving…</> : <><CheckCircle2 size={14} /> Mark as completed</>}
                    </button>
                    <p className="mt-1.5 text-xs text-neutral-mid">Once you&rsquo;ve made these changes, mark it completed to move it to your archive.</p>
                  </div>

                  <p className="border-t border-gray-100 pt-3 text-xs italic text-neutral-mid">{detail.disclaimer}</p>
                </div>
              </div>

              {/* RIGHT — the policy to check the suggestion against */}
              <div className="overflow-y-auto bg-neutral-light/20 px-6 py-5 lg:max-h-[87vh]">
                {detail.target_policy ? (
                  <>
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Where to add it</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">
                        <FileText size={14} className="shrink-0 text-teal" /> <span className="min-w-0 break-words">{detail.target_policy.name}</span>
                      </p>
                      {(detail.highlight_quotes?.length ?? 0) > 0
                        ? <p className="mt-0.5 text-xs text-neutral-mid">Each numbered highlight is where to add or amend the same-numbered &ldquo;what to add&rdquo; item on the left.</p>
                        : <p className="mt-0.5 text-xs text-neutral-mid">Use the search below to check the wording on the left isn&rsquo;t already here.</p>}
                    </div>

                    {/* Search the policy — verify a recommended phrase isn't already there. */}
                    <div className="relative mb-3">
                      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-mid" />
                      <input
                        type="text" value={policySearch} onChange={e => setPolicySearch(e.target.value)}
                        placeholder="Search this policy, e.g. Integrated Care Board…"
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
                    {(detail.highlight_quotes?.length ?? 0) > 0 && (
                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-mid">Where to add, key</p>
                        <ul className="space-y-1.5">
                          {(detail.highlight_quotes ?? []).map((q, i) => (
                            <li key={i} className="flex gap-2 text-xs text-neutral-dark">
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${quoteColour(i)}`}>{i + 1}</span>
                              <span className="min-w-0">
                                {detail.highlight_placements?.[i] === 'new_section'
                                  ? <span className="text-neutral-dark">New section{detail.highlight_labels?.[i] ? <>: {detail.highlight_labels[i]}</> : null}</span>
                                  : <>
                                      <span className={`rounded px-1.5 py-0.5 ${quoteColour(i)}`}>{q}</span>
                                      {detail.highlight_placements?.[i] === 'add_under_heading'
                                        ? <span className="ml-1 text-neutral-mid">(heading, add a subsection below it)</span>
                                        : <span className="ml-1 text-neutral-mid">(replace the whole highlighted paragraph)</span>}
                                    </>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                    <FilePlus2 size={28} className="text-teal" />
                    <p className="text-sm font-semibold text-neutral-dark">No existing policy to check against</p>
                    <p className="max-w-xs text-sm text-neutral-mid">You don&rsquo;t have a matching policy yet — you&rsquo;ll need a new {detail.suggested_new_policy_title ?? 'policy'}. The wording on the left is your starting point.</p>
                  </div>
                )}
              </div>

            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
