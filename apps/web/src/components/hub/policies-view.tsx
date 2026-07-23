'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { applyChanges } from '@/lib/policy-render'
import { applyRoleNames } from '@/lib/policy-names'
import { Loader2, FileCheck2, ChevronLeft, GitCompare, Check, X, FileText, History, Undo2, Send, CalendarClock } from 'lucide-react'

const placementLabel = (p: string) => p === 'amend' ? 'Amended paragraph' : p === 'add_under_heading' ? 'Added subsection' : 'New section'

type Item = { policy_id: string; name: string; version: string; changes: number; submitted_at: string }
type Pub  = { policy_id: string; name: string; version: string; published_at: string; published_by: string }
type Ret  = { policy_id: string; name: string; version: string; returned_at: string; returned_by: string }
type Ext  = { policy_id: string; name: string; version: string; sent: boolean; reviewer_name: string }
type Selected = { policy_id: string; name: string; version: string; changes: number; readOnly: boolean }
type Detail = Awaited<ReturnType<ReturnType<typeof createApiClient>['me']['policyApprovalDetail']>>

export function PoliciesView({ token, userId, onChange }: { token: string; userId?: string; onChange?: () => void }) {
  const cacheKey = `hub-policy-approvals-${userId ?? 'me'}`
  const cached = persistentCache.get<{ policies: Item[]; published: Pub[]; returned: Ret[]; awaiting_external: Ext[] }>(cacheKey)
  const [list, setList]       = useState<Item[]>(cached?.policies ?? [])
  const [published, setPublished] = useState<Pub[]>(cached?.published ?? [])
  const [returned, setReturned]   = useState<Ret[]>(cached?.returned ?? [])
  const [awaitingExt, setAwaitingExt] = useState<Ext[]>(cached?.awaiting_external ?? [])
  const [loading, setLoading] = useState(!cached)
  const [selected, setSelected] = useState<Selected | null>(null)
  const [detail, setDetail]   = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tracked, setTracked] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')
  const [notes, setNotes]     = useState<Record<string, string>>({})   // per-change feedback
  const [general, setGeneral] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  // Policies whose review date has come around (admins only; silently empty for others).
  const dueKey = `hub-due-review-${userId ?? 'me'}`
  const [dueReview, setDueReview] = useState<Array<{ policy_id: string; name: string; next_review_due: string; days_overdue: number }>>(persistentCache.get(dueKey) ?? [])

  function load() {
    createApiClient(token).me.policyApprovals()
      .then(r => { setList(r.policies); setPublished(r.published ?? []); setReturned(r.returned ?? []); setAwaitingExt(r.awaiting_external ?? []); persistentCache.set(cacheKey, { policies: r.policies, published: r.published ?? [], returned: r.returned ?? [], awaiting_external: r.awaiting_external ?? [] }) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [token])

  const [markingId, setMarkingId] = useState<string | null>(null)
  useEffect(() => {
    createApiClient(token).analytics.policiesDueForReview()
      .then(d => { const l = d?.policies ?? []; setDueReview(l); persistentCache.set(dueKey, l) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Mark a policy reviewed: records today's review date, which moves its next review forward and
  // removes it from "due" on every surface (hub, dashboard, admin policies) once they refresh.
  async function markReviewed(policyId: string) {
    setMarkingId(policyId)
    try {
      await createApiClient(token).policies.setReview(policyId, { last_reviewed_at: new Date().toISOString() })
      setDueReview(l => { const n = l.filter(x => x.policy_id !== policyId); persistentCache.set(dueKey, n); return n })
      onChange?.()
    } catch { /* keep it in the list on failure */ }
    finally { setMarkingId(null) }
  }

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

  // Seed the feedback boxes from any notes carried on the changes; reset the general note.
  useEffect(() => {
    if (!detail) { setNotes({}); setGeneral(''); return }
    const seed: Record<string, string> = {}
    for (const c of detail.changes ?? []) if ((c as any).manager_feedback) seed[c.id] = (c as any).manager_feedback
    setNotes(seed); setGeneral('')
  }, [detail])

  async function approve() {
    if (!selected) return
    if (!confirm(`Approve "${selected.name}"? It goes live to staff once every required approval is in.`)) return
    setBusy(true); setError('')
    try {
      const r = await createApiClient(token).me.approvePolicyAsManager(selected.policy_id)
      setMsg(r.status === 'published' ? `Approved. "${selected.name}" is now live for staff.` : `Approved. Sent on for external approval.`)
      setSelected(null); load(); onChange?.()
    } catch (e: any) { setError(e.message ?? 'Could not approve.') } finally { setBusy(false) }
  }
  async function reject() {
    if (!selected) return
    const fb = Object.entries(notes).filter(([, v]) => v.trim()).map(([change_id, note]) => ({ change_id, note: note.trim() }))
    if (!fb.length && !general.trim()) { setError('Add a note on at least one section, or a general note, so the admin knows what to change.'); return }
    if (!confirm(`Send "${selected.name}" back to the admin with your feedback?`)) return
    setBusy(true); setError('')
    try {
      await createApiClient(token).me.rejectPolicyAsManager(selected.policy_id, general.trim(), fb)
      setMsg(`Sent "${selected.name}" back to the admin with your feedback.`)
      setSelected(null); load(); onChange?.()
    } catch (e: any) { setError(e.message ?? 'Could not send back.') } finally { setBusy(false) }
  }

  if (loading) return <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div>

  // ── Review / read a single policy ──
  if (selected) {
    const ro = selected.readOnly
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => setSelected(null)} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-teal"><ChevronLeft size={15} /> Back to policies</button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-neutral-dark">{selected.name}</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">
              {detail?.version ? <>Version {detail.version} · </> : null}
              {ro ? 'Published and live for staff' : <>{selected.changes} change{selected.changes === 1 ? '' : 's'} to approve</>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setTracked(t => !t)} className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-gray-50"><GitCompare size={13} /> {tracked ? 'Tracked' : 'Clean'}</button>
            {!ro && <button onClick={reject} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={14} /> Send back</button>}
            {!ro && <button onClick={approve} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin" /> …</> : <><FileCheck2 size={14} /> Approve</>}</button>}
          </div>
        </div>
        {error && <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <p className="mt-3 text-xs text-neutral-mid">
          {ro ? (tracked ? 'Highlighted passages are the most recent changes. Toggle Clean to read the finished policy.' : 'This is the current, live policy.')
              : (tracked ? 'Highlighted passages are the changes to approve. Toggle Clean to preview the finished policy.' : 'This is how the finished policy reads.')}
        </p>
        {detailLoading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
        ) : (
          <div ref={previewRef} className="policy-content prose prose-sm mt-2 max-w-none rounded-lg border border-gray-100 bg-white p-4" />
        )}

        {/* Per-change feedback — the care manager can pin a specific note to each change,
            so a send-back tells the admin exactly what to revise. */}
        {!ro && !detailLoading && (detail?.changes?.length ?? 0) > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-neutral-dark">Feedback on the changes</h3>
            <p className="mt-1 text-xs text-neutral-mid">Add a note to any change you want revised. Leave a change blank if you&rsquo;re happy with it. Your notes are sent to the admin when you send the policy back.</p>
            <ul className="mt-3 space-y-3">
              {(detail?.changes ?? []).map((c, i) => (
                <li key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[11px] font-bold text-teal">{i + 1}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-mid">{placementLabel(c.placement)}</p>
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-dark">{c.section_title || c.requirement || 'Change'}</p>
                  {c.new_text && <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-neutral-mid">{c.new_text}</p>}
                  <textarea value={notes[c.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))} rows={2}
                    placeholder="Add a note for this section (optional)"
                    className="mt-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-mid">General note (optional)</label>
              <textarea value={general} onChange={e => setGeneral(e.target.value)} rows={2}
                placeholder="Any overall comments for the admin…"
                className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
            </div>
          </div>
        )}
      </div>
      </div>
    )
  }

  // ── List ──
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
    <div className="mx-auto max-w-3xl">
      {/* Policies due for review — the review dates set on the gap-analysis page that have come around. */}
      {dueReview.length > 0 && (
        <div className="mb-6 rounded-card border border-red-200 bg-red-50/50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-red-900"><CalendarClock size={15} /> Policies due for review</h3>
          <p className="mt-1 text-sm text-red-800/80">These policies have reached the review date you set. Review them, then record a new review date.</p>
          <ul className="mt-4 space-y-2">
            {dueReview.map(d => (
              <li key={d.policy_id} className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} className="shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{d.name}</p>
                    <p className="text-xs text-neutral-mid">Due {new Date(d.next_review_due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{d.days_overdue > 0 ? ` · ${d.days_overdue} day${d.days_overdue === 1 ? '' : 's'} overdue` : ''}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a href="/gaps" className="rounded-btn border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Review</a>
                  <button onClick={() => markReviewed(d.policy_id)} disabled={markingId === d.policy_id} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">
                    {markingId === d.policy_id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Mark reviewed
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              <button onClick={() => setSelected({ ...p, readOnly: false })} className="flex w-full items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/40 px-4 py-3 text-left hover:bg-teal-50">
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

      {/* Awaiting external approval — policies that passed internal approval and are now with
          (or ready to go to) the external approver. Lets the care manager track progress. */}
      {awaitingExt.length > 0 && (
        <div className="mt-9">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><Send size={15} className="text-sky-500" /> Awaiting external approval</h3>
          <p className="mt-1 text-sm text-neutral-mid">You approved these. They now need an external sign-off before they go live.</p>
          <ul className="mt-4 space-y-2">
            {awaitingExt.map(p => (
              <li key={p.policy_id} className="flex items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} className="shrink-0 text-sky-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                    <p className="text-xs text-neutral-mid">{p.sent ? `Sent to external approver${p.reviewer_name ? ` · ${p.reviewer_name}` : ''}` : 'Ready to send to external approver'}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-btn border px-3 py-1.5 text-xs font-medium ${p.sent ? 'border-sky-300 bg-white text-sky-700' : 'border-amber-300 bg-white text-amber-700'}`}>{p.sent ? 'Sent' : 'Ready to send'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sent back to the admin — policies this care manager returned that are now with the
          admin for the requested changes, and will come back for re-approval. */}
      {returned.length > 0 && (
        <div className="mt-9">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><Undo2 size={15} className="text-amber-500" /> Sent back to the admin</h3>
          <p className="mt-1 text-sm text-neutral-mid">You returned these with feedback. The admin is making the changes, then they come back to you to approve.</p>
          <ul className="mt-4 space-y-2">
            {returned.map(p => (
              <li key={p.policy_id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={16} className="shrink-0 text-amber-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                    <p className="text-xs text-neutral-mid">Sent back {new Date(p.returned_at).toLocaleDateString('en-GB')} · with the admin</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-btn border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700">Awaiting changes</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recently updated — visibility of policies that went live (e.g. when the admin
          approves directly and your approval is not required). Read only. */}
      {published.length > 0 && (
        <div className="mt-9">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><History size={15} className="text-neutral-mid" /> Recently updated</h3>
          <p className="mt-1 text-sm text-neutral-mid">Policies that have gone live. Open one to read what changed.</p>
          <ul className="mt-4 space-y-2">
            {published.map(p => (
              <li key={p.policy_id}>
                <button onClick={() => setSelected({ policy_id: p.policy_id, name: p.name, version: p.version, changes: 0, readOnly: true })} className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText size={16} className="shrink-0 text-neutral-mid" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                      <p className="text-xs text-neutral-mid">Version {p.version} · updated {new Date(p.published_at).toLocaleDateString('en-GB')}{p.published_by ? ` · ${p.published_by}` : ''}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark">Read</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div>
  )
}
