'use client'

// Public, token-gated external review page for an updated policy. No CareStream login.
// The reviewer reads the policy (with the pending changes applied) and either approves it
// or sends it back with feedback. The unguessable token in the URL is the only gate.

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { applyChanges } from '@/lib/policy-render'
import { applyRoleNames } from '@/lib/policy-names'
import { CheckCircle2, ShieldCheck, AlertTriangle, Loader2, FileText, GitCompare } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Review = {
  policy_id: string; policy_name: string; version: string; home_name: string
  html: string; changes: any[]; show_role_names: boolean; role_names: Record<string, string[]>
}

async function get(path: string) {
  const res = await fetch(`${API_URL}/public/policy-review${path}`)
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) throw new Error(json?.error?.message ?? 'This review link is no longer active.')
  return json.data ?? json
}
async function post(path: string, body: any) {
  const res = await fetch(`${API_URL}/public/policy-review${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) throw new Error(json?.error?.message ?? 'Something went wrong.')
  return json.data ?? json
}

export default function PolicyReviewPage() {
  const token = String(useParams()?.token ?? '')
  const [data, setData]   = useState<Review | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [tracked, setTracked] = useState(true)
  const [decided, setDecided] = useState(false)
  const [name, setName]   = useState('')
  const [comment, setComment] = useState('')
  const [confirm1, setConfirm1] = useState(false)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    get(`/${token}`).then(setData).catch(e => setLoadErr(e.message)).finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    const root = previewRef.current
    if (!root || !data) return
    root.innerHTML = data.html || ''
    applyChanges(root, data.changes ?? [], tracked)
    if (data.show_role_names) applyRoleNames(root, data.role_names)
  }, [data, tracked])

  async function submit(decision: 'approved' | 'rejected') {
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (decision === 'approved' && !confirm1) { setError('Please confirm the statement to approve.'); return }
    if (decision === 'rejected' && !comment.trim()) { setError('Please add a note so the team knows what to change.'); return }
    setBusy(true); setError('')
    try { await post(`/${token}/decision`, { name: name.trim(), comment: comment.trim(), decision }); setDecided(true) }
    catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  if (loading) return <Shell><div className="flex items-center justify-center gap-2 py-24 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div></Shell>

  if (loadErr || !data) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle size={28} className="mx-auto mb-3 text-amber-500" />
          <h1 className="text-lg font-bold text-neutral-dark">Review link unavailable</h1>
          <p className="mt-1 text-sm text-neutral-mid">{loadErr || 'This review link is no longer active. The policy may already have been approved, or the link was withdrawn.'}</p>
        </div>
      </Shell>
    )
  }

  const changeCount = data.changes?.length ?? 0

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Policy for review</p>
          <div className="mt-0.5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-neutral-dark">{data.policy_name}</h1>
              <p className="mt-1 text-xs text-neutral-mid">
                {data.home_name ? <>{data.home_name} · </> : null}
                {data.version ? <>new version {data.version} · </> : null}
                {changeCount} change{changeCount === 1 ? '' : 's'} to review
              </p>
            </div>
            <button onClick={() => setTracked(t => !t)} className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-gray-50"><GitCompare size={13} /> {tracked ? 'Tracked' : 'Clean'}</button>
          </div>
          <p className="mt-2 text-xs text-neutral-mid">{data.home_name || 'The care service'} has asked for your approval before this policy goes live to their team. {tracked ? 'Highlighted passages are the changes. Toggle Clean to read the finished policy.' : 'This is how the finished policy reads.'}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div ref={previewRef} className="policy-content prose prose-sm max-w-none" />
        </div>

        {/* Sign-off */}
        {decided ? (
          <div className="rounded-2xl border border-green-200 bg-green-50/60 p-6 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
            <p className="font-semibold text-neutral-dark">Thank you — your response has been recorded.</p>
            <p className="mt-1 text-sm text-neutral-mid">You can close this page. {data.home_name || 'The care service'} has been notified of your decision.</p>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-teal/30 bg-white p-6 shadow-sm">
            <p className="mb-1 flex items-center gap-1.5 text-base font-bold text-neutral-dark"><ShieldCheck size={18} className="text-teal" /> Your decision</p>
            <p className="mb-4 text-xs text-neutral-mid">Read the policy above, then approve it or send it back with your feedback. Your name is kept as the reviewer of record.</p>
            <div className="grid gap-3">
              <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-mid">Your name *</span><input value={name} onChange={e => setName(e.target.value)} className={INPUT} /></label>
              <label className="block"><span className="mb-1 block text-xs font-medium text-neutral-mid">Comments (required if sending back)</span><textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className={INPUT} placeholder="Anything you would like changed…" /></label>
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-neutral-dark"><input type="checkbox" checked={confirm1} onChange={e => setConfirm1(e.target.checked)} className="mt-0.5 accent-teal" /> I confirm I have reviewed this policy and I am happy for it to be published.</label>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => submit('approved')} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Approve</button>
              <button onClick={() => submit('rejected')} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"><AlertTriangle size={14} /> Send back with feedback</button>
            </div>
          </div>
        )}

        <p className="pb-8 text-center text-[11px] text-neutral-mid"><FileText size={11} className="mr-1 inline" /> CareStream — external policy review</p>
      </div>
    </Shell>
  )
}

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-light px-4 py-8">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.png" alt="CareStream" className="h-20 w-auto object-contain" />
      </div>
      {children}
    </div>
  )
}
