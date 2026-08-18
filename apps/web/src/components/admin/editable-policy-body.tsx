'use client'

// Click-to-edit proofreading for a rendered policy.
//
// Tenants working through /gaps spot things gap analysis will never flag — a missing word,
// a misspelling. This wraps the rendered policy body so any paragraph, heading or list item
// can be corrected in place.
//
// Three constraints shaped the design:
//
//  1. THE RENDERED HTML IS NOT THE SOURCE. The preview is decorated — <mark> highlights,
//     numbered [data-cs-item] badges, role-name substitutions, SAF markers — all injected
//     into the text, splitting text nodes mid-sentence. Scraping it back to plain text to
//     save would quietly corrupt the policy. So the editor is populated from `raw` (the
//     clean source the preview endpoint returns alongside the HTML), matched to the clicked
//     block on demand. If the match fails we refuse to edit rather than guess.
//
//  2. THE CONTENT NODE IS OWNED IMPERATIVELY. In the gap modal an effect re-asserts
//     innerHTML whenever a suggestion is adopted or the search term changes. So listeners
//     are DELEGATED on the wrapper (they survive innerHTML being replaced), and the editor
//     itself is a React-rendered card floating ABOVE the block rather than a node injected
//     into it — nothing to be wiped mid-typing. The host suspends its rebuild while an edit
//     is open (see `onEditingChange`) so the block cannot move under the card.
//
//  3. EDITING MUST BE OPT-IN. Every surface that renders policy text shares the
//     `.policy-content` class, including the staff hub and the external reviewer link.
//     `editable` therefore defaults to false: a surface has to ask for editing explicitly,
//     so it can never be granted by accident.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Pencil, Loader2, AlertTriangle } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

// Blocks a proofreading fix can apply to. Anything else (tables, wrappers) is not editable
// because we cannot reliably map it back to a single source block.
const EDITABLE = 'p, li, h2, h3, h4'

type EditState = {
  el: HTMLElement
  oldText: string      // exact source substring — what the server matches on
  value: string
  top: number
  height: number
  hasPending: boolean  // a gap suggestion is anchored to this block
}

// Collapse whitespace so a DOM block and its source line compare equal regardless of how
// the formatter wrapped them.
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

// The block's own words, with injected decoration removed. Badges are real elements whose
// text is a number, so a naive textContent would fold "1" into the sentence.
function plainTextOf(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-cs-item], [data-cs-badge], [data-cs-saf]').forEach(n => n.remove())
  return norm(clone.textContent ?? '')
}

// Strip the markdown-ish leaders the renderer consumed, so source and DOM text compare equal.
const stripLeader = (line: string) => line.replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/, '')

// Find the exact substring of `raw` that produced this block.
//
// Paragraphs and headings are their own source block; list items are one line inside a
// block. Both are returned verbatim (leader included) because the server replaces the exact
// string. Returns null when the block cannot be matched unambiguously — better to disable
// editing than to rewrite the wrong text.
function findSource(raw: string, el: HTMLElement): string | null {
  const target = plainTextOf(el)
  if (!target || target.length < 2) return null

  const isListItem = el.tagName === 'LI'
  const candidates: string[] = isListItem
    ? raw.split('\n')                     // a list item is a single line
    : raw.split(/\n{2,}/)                 // paragraphs/headings are blank-line separated

  const matches = candidates.filter(c => norm(stripLeader(c)) === target)
  if (matches.length !== 1) return null   // absent, or repeated — refuse either way

  const source = matches[0]
  // The server refuses ambiguous replacements too, but checking here means the block simply
  // is not offered for editing rather than failing after the tenant has typed.
  if (raw.split(source).length - 1 !== 1) return null
  return source
}

export default function EditablePolicyBody({
  className = '',
  editable = false,
  raw = '',
  html,
  policyId,
  token,
  onSaved,
  onEditingChange,
  contentRef,
}: {
  className?: string
  editable?: boolean
  raw?: string
  // Surfaces that have no decoration pass their HTML here and let this component own the
  // node. /gaps instead leaves this undefined and fills the node itself, because its
  // highlight pass has to run against the same DOM.
  html?: string
  policyId?: string
  token?: string
  onSaved?: (version: string, propagated: boolean) => void
  onEditingChange?: (editing: boolean) => void
  // The host still owns the node's content (imperative in the gap modal, React-rendered
  // elsewhere) — we only attach behaviour to it.
  contentRef?: React.RefObject<HTMLDivElement | null>
}) {
  const ownRef = useRef<HTMLDivElement | null>(null)
  const ref = contentRef ?? ownRef
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const canEdit = editable && !!policyId && !!token && !!raw

  // Own the content when the host handed us HTML. Imperative rather than
  // dangerouslySetInnerHTML on purpose: a React re-render re-asserting innerHTML would strip
  // the hover class mid-interaction, and would fight the gap modal's own highlight pass.
  useEffect(() => {
    if (html === undefined) return
    const root = ref.current
    if (!root || root.innerHTML === html) return
    root.innerHTML = html
  }, [html, ref])

  // Let the host pause its own rebuild while a block is open for editing.
  useEffect(() => { onEditingChange?.(!!edit) }, [edit, onEditingChange])

  const closeEditor = useCallback(() => { setEdit(null); setError('') }, [])

  // Delegated so it survives the host replacing innerHTML.
  useEffect(() => {
    const root = ref.current
    if (!root || !canEdit) return
    const host: HTMLDivElement = root

    function blockFrom(target: EventTarget | null): HTMLElement | null {
      const el = (target as HTMLElement | null)?.closest?.(EDITABLE) as HTMLElement | null
      if (!el || !host.contains(el)) return null
      // A list item inside a paragraph-level match would double up; take the innermost only.
      return el
    }

    function onOver(e: Event) {
      if (edit) return
      const el = blockFrom(e.target)
      host.querySelectorAll('.cs-edit-hover').forEach(n => n.classList.remove('cs-edit-hover'))
      if (el) el.classList.add('cs-edit-hover')
    }
    function onLeave() {
      host.querySelectorAll('.cs-edit-hover').forEach(n => n.classList.remove('cs-edit-hover'))
    }
    function onClick(e: Event) {
      if (edit) return
      const el = blockFrom(e.target)
      if (!el) return
      const source = findSource(raw, el)
      if (!source) {
        setError('This part of the policy can’t be corrected in place — its wording appears more than once, or it isn’t plain text.')
        return
      }
      setError('')
      setEdit({
        el,
        oldText: source,
        value: source,
        top: el.offsetTop,
        height: el.offsetHeight,
        hasPending: !!el.dataset.csGap || !!el.querySelector('[data-cs-item]'),
      })
    }

    host.addEventListener('mouseover', onOver)
    host.addEventListener('mouseleave', onLeave)
    host.addEventListener('click', onClick)
    return () => {
      host.removeEventListener('mouseover', onOver)
      host.removeEventListener('mouseleave', onLeave)
      host.removeEventListener('click', onClick)
    }
  }, [ref, canEdit, raw, edit])

  // Focus the field and size it to its content as soon as the card opens.
  useLayoutEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(ta.scrollHeight, 64)}px`
  }, [edit?.oldText])

  async function save() {
    if (!edit || !policyId || !token) return
    const next = edit.value
    if (norm(next) === norm(edit.oldText)) { closeEditor(); return }
    if (!next.trim()) { setError('The wording can’t be left empty. Delete the section through the policy review instead.'); return }
    setSaving(true)
    setError('')
    try {
      const r = await createApiClient(token).policies.minorEdit(policyId, { old_text: edit.oldText, new_text: next })
      closeEditor()
      onSaved?.(r.version, r.propagated)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save that correction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${canEdit ? 'cs-editable-policy' : ''}`}>
      <div ref={ref as React.RefObject<HTMLDivElement>} className={className} />

      {canEdit && !edit && error && (
        <p className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {edit && (
        <div
          className="absolute left-0 right-0 z-20 rounded-lg border border-purple-300 bg-white p-3 shadow-lg"
          style={{ top: Math.max(edit.top - 6, 0) }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-purple-700">
            <Pencil className="h-3.5 w-3.5" />
            Correct the wording
          </div>

          {edit.hasPending && (
            <p className="mb-2 flex items-start gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                There’s a suggested change waiting on this paragraph. If you reword it here, that
                suggestion may no longer fit and could stop applying — adopt it first if you can.
              </span>
            </p>
          )}

          <textarea
            ref={taRef}
            value={edit.value}
            spellCheck
            onChange={e => {
              const ta = e.currentTarget
              setEdit(s => (s ? { ...s, value: ta.value } : s))
              ta.style.height = 'auto'
              ta.style.height = `${Math.max(ta.scrollHeight, 64)}px`
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') { e.preventDefault(); closeEditor() }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save() }
            }}
            className="w-full resize-none rounded-md border border-gray-300 p-2 text-sm leading-relaxed text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300"
          />

          {error && (
            <p className="mt-2 flex items-start gap-2 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">
              Saves straight to the live policy — no approval needed, and staff keep their acknowledgements.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
