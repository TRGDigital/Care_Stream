'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { X, Loader2, Check, RotateCcw, FileCheck2, GitCompare, Download } from 'lucide-react'

type Doc = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyDocument']>>
type Change = Doc['changes'][number]
type OrgCtx = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['adoptionContext']>>

const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// A print-ready (A4) HTML document: letterhead from the tenant's organisation details, the
// policy content, and a sign-off block. Opened in a new tab for Save-as-PDF / print. No AI,
// no server rendering — reuses the already-rendered policy DOM.
function buildPrintDoc(policyName: string, contentHtml: string, version: string, tracked: boolean, org: OrgCtx | null): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const months = Number(org?.review_cycle_months || '12') || 12
  const next = new Date(); next.setMonth(next.getMonth() + months)
  const nextReview = next.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const homeName = esc(org?.home_name || '')
  const approver = esc(org?.default_approver || org?.registered_manager || '')
  const manager  = esc(org?.registered_manager || '')
  const line = '<span style="display:inline-block;min-width:200px;border-bottom:1px solid #999">&nbsp;</span>'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(policyName)}</title><style>
    @page { size: A4; margin: 20mm 18mm 22mm; }
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 11pt; line-height: 1.55; margin: 0; }
    .letterhead { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #0d9488; padding-bottom: 12px; }
    .letterhead img { max-height: 60px; max-width: 200px; }
    .home { font-size: 15pt; font-weight: bold; }
    .addr { font-size: 9pt; color: #555; white-space: pre-line; }
    h1.title { font-size: 19pt; margin: 20px 0 4px; }
    .meta { font-size: 9pt; color: #555; margin-bottom: 18px; }
    h2 { font-size: 13pt; margin: 20px 0 6px; border-bottom: 1px solid #e2e2e2; padding-bottom: 3px; }
    h3 { font-size: 11.5pt; margin: 14px 0 4px; }
    p, li { margin: 6px 0; }
    ul, ol { padding-left: 20px; }
    [class*="bg-green"] { background: #dcfce7; padding: 1px 3px; border-radius: 3px; }
    [class*="border-green"] { border: 1px solid #86efac; border-radius: 5px; padding: 8px 12px; margin: 10px 0; background: #f0fdf4; }
    .signoff { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 14px; font-size: 10pt; }
    .signoff table { border-collapse: collapse; }
    .signoff td { padding: 5px 14px 5px 0; vertical-align: top; }
    .signoff td:first-child { color: #555; white-space: nowrap; }
    .foot { margin-top: 24px; border-top: 1px solid #eee; padding-top: 8px; font-size: 8pt; color: #999; }
    @media print { .foot { position: fixed; bottom: 8mm; left: 18mm; right: 18mm; } }
  </style></head><body>
    <div class="letterhead">${org?.logo_url ? `<img src="${org.logo_url}" alt="">` : ''}<div><div class="home">${homeName}</div><div class="addr">${esc(org?.address || '')}</div></div></div>
    <h1 class="title">${esc(policyName)}</h1>
    <div class="meta">Version ${esc(version || '1.0')} &middot; ${tracked ? 'Tracked changes copy' : 'Approved copy'} &middot; Printed ${today}</div>
    <div class="content">${contentHtml}</div>
    <div class="signoff"><table>
      <tr><td>Registered manager:</td><td>${manager || line}</td></tr>
      <tr><td>Approved by:</td><td>${approver || line}</td></tr>
      <tr><td>Date approved:</td><td>${today}</td></tr>
      <tr><td>Next review:</td><td>${nextReview}</td></tr>
      <tr><td>Signature:</td><td>${line}</td></tr>
    </table></div>
    <div class="foot">${homeName} &middot; ${esc(policyName)} &middot; v${esc(version || '1.0')} &middot; Uncontrolled when printed</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
  </body></html>`
}

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
  const [org, setOrg] = useState<OrgCtx | null>(null)
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
  useEffect(() => { createApiClient(token).analytics.adoptionContext().then(setOrg).catch(() => setOrg(null)) }, [token])

  // Open a print-ready version of the CURRENT view (clean or tracked) for Save-as-PDF.
  function downloadPolicy() {
    const root = previewRef.current
    if (!root) return
    const html = buildPrintDoc(policyName, root.innerHTML, doc?.document?.version || '1.0', tracked, org)
    const w = window.open('', '_blank')
    if (!w) { setError('Please allow pop-ups to download the policy.'); return }
    w.document.open(); w.document.write(html); w.document.close()
  }

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
            <button onClick={downloadPolicy} disabled={!doc?.document}
              title={`Download the ${tracked ? 'tracked-changes' : 'clean'} copy for print / PDF`}
              className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-gray-50 disabled:opacity-50">
              <Download size={13} /> Download
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
