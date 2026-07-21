'use client'

// The action plan for a completed audit. Created as a DRAFT from the AI recommendations: the tenant
// edits actions, sets due dates, assigns them to staff, then approves it to start tracking.
// The editor opens in an overlay (same pattern as starting a new audit); the audit page shows a
// compact summary card that launches it.
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { ClipboardList, Plus, Trash2, Loader2, Check, X } from 'lucide-react'

type Action = { id: string; description: string; priority: string; due_date: string | null; assigned_to: string | null; status: string; source: string; done_at: string | null }
type Plan = { status: string; actions: Action[] }

const PRIORITY: Record<string, { label: string; cls: string }> = {
  immediate: { label: 'Immediate', cls: 'bg-red-50 text-red-700 border-red-200' },
  priority:  { label: 'Priority',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  monitor:   { label: 'Monitor',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}
const STATUS_CLS: Record<string, string> = { open: 'text-neutral-mid', in_progress: 'text-amber-700', done: 'text-green-700' }

export function AuditActionPlan({ token, runId, canGenerate }: { token: string; runId: string; canGenerate?: boolean }) {
  const [plan, setPlan]   = useState<Plan | null>(null)
  const [staff, setStaff] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [open, setOpen]   = useState(false)
  const api = createApiClient(token)

  function load() {
    Promise.all([api.audits.actionPlan(runId), api.audits.templates().catch(() => ({ staff: [] as string[] }))])
      .then(([p, t]) => { setPlan(p); setStaff((t as any).staff ?? []) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setLocal = (id: string, p: Partial<Action>) => setPlan(pl => pl ? { ...pl, actions: pl.actions.map(a => a.id === id ? { ...a, ...p } : a) } : pl)
  const save = (id: string, p: Partial<Action>) => { setLocal(id, p); api.audits.updateAuditAction(id, p as any).catch(() => {}) }
  async function remove(id: string) { setPlan(pl => pl ? { ...pl, actions: pl.actions.filter(a => a.id !== id) } : pl); await api.audits.deleteAuditAction(id).catch(() => {}) }
  async function add() { const d = newDesc.trim(); if (!d) return; setNewDesc(''); const p = await api.audits.addAuditAction(runId, d, 'priority').catch(() => null); if (p) setPlan(p as Plan) }
  async function approve() { setBusy(true); try { const p = await api.audits.approveActionPlan(runId); setPlan(p as Plan) } catch { /* ignore */ } finally { setBusy(false) } }
  async function generate() { setGenerating(true); try { const p = await api.audits.generateActionPlan(runId); setPlan(p as Plan); setOpen(true) } catch { /* ignore */ } finally { setGenerating(false) } }

  if (loading) return <div className="h-24 animate-pulse rounded-card bg-gray-50" />
  if (!plan) return null

  const isNone = plan.status === 'none'
  if (isNone && !canGenerate) return null

  const draft = plan.status === 'draft'
  const openCount = plan.actions.filter(a => a.status !== 'done').length

  const StatusBadge = draft
    ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Draft</span>
    : <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">Approved</span>

  return (
    <>
      {/* ── Summary card on the audit page ── */}
      <div className="rounded-card bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-teal" />
            <h2 className="font-semibold text-neutral-dark">Action plan</h2>
            {!isNone && StatusBadge}
            {!isNone && <span className="text-xs text-neutral-mid">{draft ? `${plan.actions.length} action${plan.actions.length === 1 ? '' : 's'}` : `${openCount} open`}</span>}
          </div>
          {isNone ? (
            <button onClick={generate} disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><ClipboardList size={14} /> Generate action plan tracker</>}
            </button>
          ) : (
            <button onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">
              {draft ? <><Check size={14} /> Review &amp; approve</> : <><ClipboardList size={14} /> View action plan</>}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-mid">
          {isNone
            ? 'Turn this audit’s recommendations into a tracked action plan you can edit, assign to staff and work to completion.'
            : draft
              ? 'Drafted from the recommendations. Review, edit, set due dates and assign to staff, then approve to start tracking.'
              : 'Track each action to completion. Staff you assign also see their actions in their hub.'}
        </p>
      </div>

      {/* ── Editor overlay ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-teal" />
                <h2 className="font-semibold text-neutral-dark">Action plan</h2>
                {StatusBadge}
              </div>
              <button onClick={() => setOpen(false)} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-xs text-neutral-mid">
                {draft
                  ? 'Edit the actions, set due dates, assign them to staff and add any of your own, then approve to start tracking.'
                  : 'Update each action’s status as the work is done. You can still reassign or change due dates.'}
              </p>

              <div className="mt-4 space-y-2.5">
                {plan.actions.map(a => {
                  const pr = PRIORITY[a.priority] ?? PRIORITY.priority
                  return (
                    <div key={a.id} className="rounded-lg border border-gray-100 bg-neutral-light/20 p-3">
                      <div className="flex items-start gap-2">
                        {draft ? (
                          <select value={a.priority} onChange={e => save(a.id, { priority: e.target.value })}
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${pr.cls}`}>
                            <option value="immediate">Immediate</option>
                            <option value="priority">Priority</option>
                            <option value="monitor">Monitor</option>
                          </select>
                        ) : (
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${pr.cls}`}>{pr.label}</span>
                        )}
                        {draft ? (
                          <textarea value={a.description} rows={1}
                            onChange={e => setLocal(a.id, { description: e.target.value })}
                            onBlur={e => save(a.id, { description: e.target.value })}
                            className="min-h-[2rem] flex-1 resize-y rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-neutral-dark focus:border-teal focus:outline-none" />
                        ) : (
                          <p className={`flex-1 text-sm ${a.status === 'done' ? 'text-neutral-mid line-through' : 'text-neutral-dark'}`}>{a.description}</p>
                        )}
                        {draft && <button onClick={() => remove(a.id)} className="shrink-0 rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-1 text-xs">
                        <label className="text-neutral-mid">Due</label>
                        <input type="date" value={a.due_date ? a.due_date.slice(0, 10) : ''} onChange={e => save(a.id, { due_date: e.target.value || null })}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
                        <label className="text-neutral-mid">Assign to</label>
                        <select value={a.assigned_to ?? ''} onChange={e => save(a.id, { assigned_to: e.target.value || null })}
                          className="w-44 rounded-md border border-gray-200 px-2 py-1 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                          <option value="">Unassigned</option>
                          {staff.map(s => <option key={s} value={s}>{s}</option>)}
                          {a.assigned_to && !staff.includes(a.assigned_to) && <option value={a.assigned_to}>{a.assigned_to}</option>}
                        </select>
                        {!draft && (
                          <select value={a.status} onChange={e => save(a.id, { status: e.target.value })}
                            className={`rounded-md border border-gray-200 px-2 py-1 text-xs font-medium ${STATUS_CLS[a.status] ?? ''}`}>
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
                {plan.actions.length === 0 && <p className="text-sm text-neutral-mid">No actions{draft ? ' — add the first one below.' : '.'}</p>}
              </div>

              {draft && (
                <div className="mt-3 flex gap-2">
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
                    placeholder="Add an action…"
                    className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
                  <button onClick={add} disabled={!newDesc.trim()} className="inline-flex items-center gap-1.5 rounded-btn border border-teal/40 px-3 py-2 text-sm font-medium text-teal hover:bg-teal-light/30 disabled:opacity-50"><Plus size={14} /> Add</button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
              <button onClick={() => setOpen(false)} className="rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300">Close</button>
              {draft && (
                <button onClick={approve} disabled={busy || !plan.actions.length}
                  className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve action plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
