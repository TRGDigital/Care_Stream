'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { applyChanges } from '@/lib/policy-render'
import { applyRoleNames } from '@/lib/policy-names'
import { Loader2, FileCheck2, ChevronLeft, GitCompare, Check, X, FileText } from 'lucide-react'

type Item = { policy_id: string; name: string; version: string; changes: number; submitted_at: string }
type Detail = Awaited<ReturnType<ReturnType<typeof createApiClient>['me']['policyApprovalDetail']>>

export function PoliciesView({ token }: { token: string }) {
  const [list, setList]       = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Item | null>(null)
  const [detail, setDetail]   = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tracked, setTracked] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  function load() {
    setLoading(true)
    createApiClient(token).me.policyApprovals()
      .then(r => setList(r.policies)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [token])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    setDetailLoading(true); setError('')
    createApiClient(token).me.policyApprovalDetail(selected.policy_id)
      .then(setDetail).catch(e => setError(e.message ?? 'Could not load the policy.')).finally(() => setDetailLoading(false))
  }, [selected, token])

  useEffect(() => {
    const root = previewRef.current
    if (!root || !detail) return
    root.innerHTML = detail.html || ''
    applyChanges(root, detail.changes ?? [], tracked)
    if (detail.show_role_names) applyRoleNames(root, detail.role_names)
  }, [detail, tracked])

  async function approve() {
    if (!selected) return
    if (!confirm(`Approve "${selected.name}"? It goes live to staff once every required approval is in.`)) return
    setBusy(true); setError('')
    try {
      const r = await createApiClient(token).me.approvePolicyAsManager(selected.policy_id)
      setMsg(r.status === 'published' ? `Approved. "${selected.name}" is now live for staff.` : `Approved. Sent on for external approval.`)
      setSelected(null); load()
    } catch (e: any) { setError(e.message ?? 'Could not approve.') } finally { setBusy(false) }
  }
  async function reject() {
    if (!selected) return
    const comment = prompt('Send back to the admin. Add a reason (optional):') ?? ''
    setBusy(true); setError('')
    try {
      await createApiClient(token).me.rejectPolicyAsManager(selected.policy_id, comment)
      setMsg(`Sent "${selected.name}" back to the admin.`)
      setSelected(null); load()
    } catch (e: any) { setError(e.message ?? 'Could not send back.') } finally { setBusy(false) }
  }

  if (loading) return <div className="flex items-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div>

  // ── Review a single policy ──
  if (selected) {
    return (
      <div className="mx-auto max-w-5xl">
        <button onClick={() => setSelected(null)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-teal"><ChevronLeft size={15} /> Back to policies</button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-dark">{selected.name}</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">{detail?.version ? <>New version {detail.version} · </> : null}{selected.changes} change{selected.changes === 1 ? '' : 's'} to approve</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setTracked(t => !t)} className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-gray-50"><GitCompare size={13} /> {tracked ? 'Tracked' : 'Clean'}</button>
            <button onClick={reject} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14} /> Send back</button>
            <button onClick={approve} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin" /> …</> : <><FileCheck2 size={14} /> Approve</>}</button>
          </div>
        </div>
        {error && <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <p className="mt-3 text-xs text-neutral-mid">{tracked ? 'Highlighted passages are the changes to approve. Toggle Clean to preview the finished policy.' : 'This is how the finished policy reads.'}</p>
        {detailLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
        ) : (
          <div ref={previewRef} className="policy-content prose prose-sm mt-2 max-w-none rounded-lg border border-gray-100 bg-white p-4" />
        )}
      </div>
    )
  }

  // ── List ──
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-bold text-neutral-dark">Policies to approve</h2>
      <p className="mt-1 text-sm text-neutral-mid">Policy changes the admin has approved and sent to you for your approval. Review the changes, then approve them or send them back.</p>
      {msg && <div className="mt-4 flex items-center gap-2 rounded-md border border-green-100 bg-green-50 px-4 py-2.5 text-sm text-green-800"><Check size={15} /> {msg}</div>}
      {list.length === 0 ? (
        <div className="mt-6 rounded-card border border-gray-100 bg-white px-6 py-10 text-center">
          <FileCheck2 size={26} className="mx-auto text-teal" />
          <p className="mt-2 text-sm font-medium text-neutral-dark">Nothing to approve</p>
          <p className="text-sm text-neutral-mid">You&rsquo;re all caught up. Policies awaiting your approval will appear here.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {list.map(p => (
            <li key={p.policy_id}>
              <button onClick={() => setSelected(p)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/40 px-4 py-3 text-left hover:bg-teal-50">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} className="shrink-0 text-teal" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                    <p className="text-xs text-neutral-mid">{p.changes} change{p.changes === 1 ? '' : 's'}{p.version ? ` · new version ${p.version}` : ''}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white">Review</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
