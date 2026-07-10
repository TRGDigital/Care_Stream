'use client'

import { useEffect, useMemo, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { X, Loader2, Check, RotateCcw, FileCheck2, GitCompare } from 'lucide-react'

type Doc = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyDocument']>>
type Change = Doc['changes'][number]

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

// Split the draft into blocks (headings + paragraphs) for a lightweight, AI-free render.
function parseBlocks(text: string): Array<{ type: 'h2' | 'p'; text: string }> {
  return text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean).map(block => {
    if (block.startsWith('## ')) return { type: 'h2' as const, text: block.slice(3).trim() }
    if (block.startsWith('# '))  return { type: 'h2' as const, text: block.slice(2).trim() }
    return { type: 'p' as const, text: block }
  })
}

const placementLabel = (p: string) => p === 'amend' ? 'Amended a paragraph' : p === 'add_under_heading' ? 'Added a subsection' : 'New section'

export function PolicyChangesModal({ token, policyId, policyName, onClose, onPublished }: {
  token: string
  policyId: string
  policyName: string
  onClose: () => void
  onPublished: (pending: number) => void
}) {
  const [doc, setDoc]         = useState<Doc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tracked, setTracked] = useState(true)
  const [busy, setBusy]       = useState<string | null>(null)   // 'publish' | change id
  const [publishedMsg, setPublishedMsg] = useState('')

  function load() {
    setLoading(true)
    createApiClient(token).analytics.policyDocument(policyId)
      .then(setDoc).catch(e => setError(e.message ?? 'Could not load the document.')).finally(() => setLoading(false))
  }
  useEffect(load, [token, policyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = (doc?.changes ?? []).filter(c => !c.published)

  // Text that changed, for green highlighting of the affected blocks.
  const changedTexts = useMemo(() => (doc?.changes ?? []).flatMap(c => [norm(c.new_text), norm(c.section_title)]).filter(Boolean), [doc])
  const isChanged = (blockText: string) => {
    const b = norm(blockText)
    return b.length >= 8 && changedTexts.some(ct => ct.includes(b))
  }

  const blocks = useMemo(() => parseBlocks(doc?.document?.draft_content ?? ''), [doc])

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
            {/* Left — the draft with changes highlighted */}
            <div className="overflow-y-auto px-6 py-5 lg:max-h-[86vh]">
              {tracked && <p className="mb-3 text-xs text-neutral-mid">Highlighted passages are the adopted changes. Toggle <strong>Clean</strong> to preview the finished policy.</p>}
              <div className="policy-content prose prose-sm max-w-none rounded-lg border border-gray-100 bg-white p-4">
                {blocks.map((b, i) => {
                  const changed = tracked && isChanged(b.text)
                  const cls = changed ? 'rounded bg-green-100 px-1 py-0.5' : ''
                  return b.type === 'h2'
                    ? <h2 key={i} className={cls}>{b.text}</h2>
                    : <p key={i} className={`${cls} whitespace-pre-line`}>{b.text}</p>
                })}
              </div>
            </div>

            {/* Right — the change log with revert */}
            <div className="overflow-y-auto bg-neutral-light/20 px-5 py-5 lg:max-h-[86vh]">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">Adopted changes</p>
              {pending.length === 0 && (doc.changes ?? []).length === 0 && <p className="mt-2 text-sm text-neutral-mid">No changes.</p>}
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
