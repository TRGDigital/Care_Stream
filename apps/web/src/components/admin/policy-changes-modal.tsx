'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { X, Loader2, Check, RotateCcw, FileCheck2, GitCompare } from 'lucide-react'

type Doc = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyDocument']>>
type Change = Doc['changes'][number]

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const placementLabel = (p: string) => p === 'amend' ? 'Amended a paragraph' : p === 'add_under_heading' ? 'Added a subsection' : 'New section'

// The smallest block whose text contains the anchor phrase.
function findBlock(root: HTMLElement, anchor: string): HTMLElement | null {
  const needle = norm(anchor)
  if (needle.length < 6) return null
  const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote')) as HTMLElement[]
  let target: HTMLElement | null = null
  for (const b of blocks) {
    if (norm(b.textContent || '').includes(needle)) {
      if (!target || (b.textContent?.length ?? 0) < (target.textContent?.length ?? 0)) target = b
    }
  }
  return target
}

function findHeading(root: HTMLElement, anchor: string): HTMLElement | null {
  const q = norm(anchor)
  if (!q) return null
  return (Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]).find(h => {
    const ht = norm(h.textContent || '')
    return ht === q || (q.length >= 6 && ht.length >= 6 && (ht.includes(q) || q.includes(ht)))
  }) ?? null
}

// Trailing sign-off / dates / company info a new section must sit ABOVE.
const END_MATTER_RE = /\b(signed|signature|date|dated|reviewed|review date|next review|policy review|version|approved by|authorised by|policy owner|source url|declaration|registered (office|number|charity)|company (number|registration)|telephone|©|copyright|\bltd\b|limited)\b/i
function endMatterAnchor(root: HTMLElement): HTMLElement | null {
  const blocks = Array.from(root.children) as HTMLElement[]
  let anchor: HTMLElement | null = null
  for (let i = blocks.length - 1; i >= 0; i--) {
    const t = norm(blocks[i].textContent || '')
    if (!t) continue
    if (t.length <= 240 && END_MATTER_RE.test(t)) { anchor = blocks[i]; continue }
    break
  }
  return anchor
}
function insertBeforeEndMatter(root: HTMLElement, node: HTMLElement) {
  const anchor = endMatterAnchor(root)
  if (anchor && anchor.parentNode === root) root.insertBefore(node, anchor)
  else root.appendChild(node)
}

// Hide the "Source URL: …" metadata line — it isn't part of the policy.
function stripSourceUrl(root: HTMLElement) {
  for (const el of Array.from(root.querySelectorAll('p,li,div')) as HTMLElement[]) {
    if (/^\s*source url\s*[:>]/i.test(el.textContent || '')) el.remove()
  }
}

function contentBlock(text: string, tracked: boolean): HTMLElement {
  const p = document.createElement('p')
  p.textContent = text
  p.className = tracked ? 'rounded bg-green-100 px-1 py-0.5 whitespace-pre-line' : 'whitespace-pre-line'
  return p
}
function sectionBlock(title: string, text: string, tracked: boolean): HTMLElement {
  if (tracked) {
    const wrap = document.createElement('div')
    wrap.className = 'not-prose my-2 rounded-md border border-green-300 bg-green-50 px-3 py-2'
    if (title) { const h = document.createElement('p'); h.className = 'text-sm font-bold text-green-900'; h.textContent = title; wrap.appendChild(h) }
    const p = document.createElement('p'); p.className = 'whitespace-pre-line text-sm leading-relaxed text-green-900'; p.textContent = text; wrap.appendChild(p)
    return wrap
  }
  const wrap = document.createElement('div')
  if (title) { const h = document.createElement('h2'); h.textContent = title; wrap.appendChild(h) }
  const p = document.createElement('p'); p.className = 'whitespace-pre-line'; p.textContent = text; wrap.appendChild(p)
  return wrap
}

// Apply the adopted changes to the rendered (formatted) policy: amend replaces its block,
// a subsection lands under its heading, a new section lands above the sign-off/dates.
function applyChanges(root: HTMLElement, changes: Change[], tracked: boolean) {
  stripSourceUrl(root)
  for (const c of changes) {
    if (c.placement === 'amend' && c.old_text) {
      const block = findBlock(root, c.old_text)
      if (block) {
        block.textContent = c.new_text
        if (tracked) block.classList.add('bg-green-100', 'rounded', 'px-1', 'py-0.5')
        block.classList.add('whitespace-pre-line')
      } else {
        insertBeforeEndMatter(root, contentBlock(c.new_text, tracked))
      }
    } else if (c.placement === 'add_under_heading' && c.old_text) {
      const heading = findHeading(root, c.old_text)
      const node = contentBlock(c.new_text, tracked)
      if (heading) heading.after(node)
      else insertBeforeEndMatter(root, node)
    } else {
      insertBeforeEndMatter(root, sectionBlock(c.section_title, c.new_text, tracked))
    }
  }
}

export function PolicyChangesModal({ token, policyId, policyName, onClose, onPublished }: {
  token: string
  policyId: string
  policyName: string
  onClose: () => void
  onPublished: (pending: number) => void
}) {
  const [doc, setDoc]         = useState<Doc | null>(null)
  const [html, setHtml]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tracked, setTracked] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)   // 'publish' | change id
  const [publishedMsg, setPublishedMsg] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  function load() {
    setLoading(true)
    const api = createApiClient(token)
    Promise.all([api.analytics.policyDocument(policyId), api.policies.preview(policyId).catch(() => ({ html: '' }))])
      .then(([d, p]) => { setDoc(d); setHtml((p as any).html || '') })
      .catch(e => setError(e.message ?? 'Could not load the document.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token, policyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = (doc?.changes ?? []).filter(c => !c.published)

  // Render the formatted policy (letterhead stripped, real headings) and apply the changes.
  useEffect(() => {
    const root = previewRef.current
    if (!root || html === null || !doc?.document) return
    root.innerHTML = html
    applyChanges(root, doc.changes ?? [], tracked)
  }, [html, doc, tracked])

  async function revert(changeId: string) {
    if (!confirm('Revert this change? It will be removed from the draft.')) return
    setBusy(changeId); setError('')
    try { await createApiClient(token).analytics.revertPolicyChange(changeId); load() }
    catch (e: any) { setError(e.message ?? 'Could not revert.') }
    finally { setBusy(null) }
  }

  async function publish() {
    if (!confirm(`Publish ${policyName}? This approves the adopted changes as the current version of your policy.`)) return
    setBusy('publish'); setError('')
    try {
      const r = await createApiClient(token).analytics.publishPolicyDocument(policyId)
      setPublishedMsg(`Published as version ${r.version}.`)
      onPublished(0)
      load()
    } catch (e: any) { setError(e.message ?? 'Could not publish.') }
    finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-[92rem] rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Review changes</p>
            <h2 className="mt-0.5 truncate text-lg font-bold text-neutral-dark">{policyName}</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">
              {doc?.document?.version ? <>Current version {doc.document.version} · </> : null}
              {pending.length} change{pending.length === 1 ? '' : 's'} to review
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setTracked(t => !t)}
              className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-gray-50">
              <GitCompare size={13} /> {tracked ? 'Tracked' : 'Clean'}
            </button>
            <button onClick={publish} disabled={busy !== null || pending.length === 0}
              className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {busy === 'publish' ? <><Loader2 size={14} className="animate-spin" /> Publishing…</> : <><FileCheck2 size={14} /> Approve &amp; publish</>}
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-mid hover:bg-gray-100 hover:text-neutral-dark"><X size={18} /></button>
          </div>
        </div>

        {error && <div className="mx-6 mt-4 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        {publishedMsg && <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-800"><Check size={15} /> {publishedMsg}</div>}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-mid"><Loader2 size={20} className="animate-spin text-teal" /> Loading…</div>
        ) : !doc?.document ? (
          <p className="px-6 py-20 text-center text-sm text-neutral-mid">Nothing adopted into this policy yet.</p>
        ) : (
          <div className="grid max-h-[84vh] grid-cols-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-[86vh] lg:grid-cols-[1fr_22rem] lg:divide-x lg:divide-y-0">
            {/* Left — the formatted policy with changes applied */}
            <div className="overflow-y-auto px-6 py-5 lg:max-h-[86vh]">
              {tracked
                ? <p className="mb-3 text-xs text-neutral-mid">Highlighted passages are the adopted changes. Toggle <strong>Clean</strong> to preview the finished policy.</p>
                : <p className="mb-3 text-xs text-neutral-mid">This is how the finished policy reads with the changes applied.</p>}
              <div ref={previewRef} className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4" />
            </div>

            {/* Right — the change log with revert */}
            <div className="overflow-y-auto bg-neutral-light/20 px-5 py-5 lg:max-h-[86vh]">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">Adopted changes</p>
              {(doc.changes ?? []).length === 0 && <p className="mt-2 text-sm text-neutral-mid">No changes.</p>}
              <ul className="mt-3 space-y-2">
                {(doc.changes ?? []).map(c => (
                  <li key={c.id} className={`rounded-lg border px-3 py-2.5 ${c.published ? 'border-gray-100 bg-white' : 'border-green-200 bg-green-50/60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">{placementLabel(c.placement)}{c.published ? ' · published' : ''}</p>
                        <p className="mt-0.5 text-sm text-neutral-dark">{c.requirement || c.section_title || 'Change'}</p>
                        <p className="mt-0.5 text-xs text-neutral-mid">{c.applied_by || 'Admin'} · {new Date(c.applied_at).toLocaleDateString('en-GB')}</p>
                      </div>
                      {!c.published && (
                        <button onClick={() => revert(c.id)} disabled={busy !== null} title="Revert"
                          className="shrink-0 rounded p-1 text-neutral-mid hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                          {busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {(doc.changes ?? []).length > 0 && (
                <p className="mt-4 text-xs text-neutral-mid">Publishing records the version, keeps your original upload as history, and updates what staff see. You can revert any change before publishing.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
