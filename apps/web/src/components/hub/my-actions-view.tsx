'use client'

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Loader2, ListChecks, Check, Clock, CalendarDays, CheckCircle2, HardHat } from 'lucide-react'

type Action = { id: string; description: string; priority: string; due_date: string | null; status: string; done_at: string | null; run_id: string; audit_name: string; external_name?: string | null }

const PRIORITY: Record<string, { label: string; cls: string }> = {
  immediate: { label: 'Do now',   cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  priority:  { label: 'Priority', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  monitor:   { label: 'Monitor',  cls: 'border-slate-200 bg-slate-50 text-slate-600' },
}
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const isOverdue = (iso: string | null, status: string) => !!iso && status !== 'done' && new Date(iso) < new Date(new Date().toDateString())

export function MyActionsView({ token, userId, isAdmin, onChange }: { token: string; userId?: string; isAdmin?: boolean; onChange?: () => void }) {
  const mineKey = `hub-my-actions-${userId ?? 'me'}`
  const extKey  = `hub-ext-actions-${userId ?? 'me'}`
  const [actions, setActions]   = useState<Action[]>(persistentCache.get<Action[]>(mineKey) ?? [])
  const [external, setExternal] = useState<Action[]>(persistentCache.get<Action[]>(extKey) ?? [])
  const [loading, setLoading]   = useState(!persistentCache.get<Action[]>(mineKey))
  const [busy, setBusy]         = useState<string | null>(null)

  const applyMine = (list: Action[]) => { setActions(list); persistentCache.set(mineKey, list) }
  const applyExt  = (list: Action[]) => { setExternal(list); persistentCache.set(extKey, list) }

  useEffect(() => {
    createApiClient(token).me.actions().then(r => applyMine(r.actions)).catch(() => {}).finally(() => setLoading(false))
    if (isAdmin) createApiClient(token).me.externalActions().then(r => applyExt(r.actions)).catch(() => {})
  }, [token, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function setMyStatus(id: string, status: 'open' | 'in_progress' | 'done') {
    setBusy(id)
    try { const r = await createApiClient(token).me.setActionStatus(id, status); applyMine(r.actions); onChange?.() }
    catch { /* keep current */ } finally { setBusy(null) }
  }
  async function setExtStatus(id: string, status: 'open' | 'in_progress' | 'done') {
    setBusy(id)
    try { const r = await createApiClient(token).me.setExternalActionStatus(id, status); applyExt(r.actions); onChange?.() }
    catch { /* keep current */ } finally { setBusy(null) }
  }

  if (loading) return <div className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div>

  const card = (a: Action, onStatus: (id: string, s: 'open' | 'in_progress' | 'done') => void) => {
    const p = PRIORITY[a.priority] ?? PRIORITY.priority
    const overdue = isOverdue(a.due_date, a.status)
    return (
      <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-neutral-dark">{a.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${p.cls}`}>{p.label}</span>
          <span className="truncate">{a.audit_name}</span>
          {a.external_name && <span className="inline-flex items-center gap-1"><HardHat size={12} /> {a.external_name}</span>}
          {a.due_date && <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-rose-600' : ''}`}><CalendarDays size={12} /> Due {dateLabel(a.due_date)}{overdue ? ' · overdue' : ''}</span>}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {a.status === 'open' ? (
            <button onClick={() => onStatus(a.id, 'in_progress')} disabled={busy === a.id}
              className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><Clock size={13} /> Start</button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-btn border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"><Clock size={13} /> In progress</span>
          )}
          <button onClick={() => onStatus(a.id, 'done')} disabled={busy === a.id}
            className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50">
            {busy === a.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Mark done
          </button>
        </div>
      </div>
    )
  }

  const doneRow = (a: Action, onStatus: (id: string, s: 'open' | 'in_progress' | 'done') => void) => (
    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-neutral-dark line-through decoration-neutral-mid/40">{a.description}</p>
        <p className="mt-0.5 text-xs text-neutral-mid">{a.audit_name}{a.external_name ? ` · ${a.external_name}` : ''}{a.done_at ? ` · done ${dateLabel(a.done_at)}` : ''}</p>
      </div>
      <button onClick={() => onStatus(a.id, 'open')} disabled={busy === a.id}
        className="shrink-0 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-50">
        {busy === a.id ? <Loader2 size={13} className="animate-spin" /> : 'Reopen'}
      </button>
    </li>
  )

  const mineOut  = actions.filter(a => a.status !== 'done')
  const mineDone = actions.filter(a => a.status === 'done')
  const extOut   = external.filter(a => a.status !== 'done')
  const extDone  = external.filter(a => a.status === 'done')
  const nothingAtAll = actions.length === 0 && external.length === 0

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-dark"><ListChecks size={19} className="text-teal" /> My actions</h2>
        <p className="mt-1 text-sm text-neutral-mid">Actions from your care home&rsquo;s audits that have been assigned to you. Mark each one as you go so your manager can see it is being handled.</p>

        {nothingAtAll ? (
          <div className="mt-6 rounded-card border border-gray-100 bg-white px-6 py-10 text-center">
            <CheckCircle2 size={26} className="mx-auto text-teal" />
            <p className="mt-2 text-sm font-medium text-neutral-dark">Nothing assigned to you</p>
            <p className="text-sm text-neutral-mid">When your manager assigns you an audit action, it will appear here.</p>
          </div>
        ) : (
          <>
            {actions.length > 0 && (
              <div className="mt-5 space-y-2">
                {mineOut.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800"><Check size={15} /> You&rsquo;re all caught up. Every action assigned to you is done.</div>
                ) : mineOut.map(a => card(a, setMyStatus))}
              </div>
            )}

            {mineDone.length > 0 && (
              <div className="mt-8">
                <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><CheckCircle2 size={15} className="text-green-600" /> Completed</h3>
                <ul className="mt-3 space-y-2">{mineDone.map(a => doneRow(a, setMyStatus))}</ul>
              </div>
            )}

            {/* ── External contractors (admins) ── */}
            {isAdmin && external.length > 0 && (
              <div className="mt-10">
                <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><HardHat size={16} className="text-teal" /> External contractor actions</h3>
                <p className="mt-1 text-xs text-neutral-mid">Audit actions assigned to external contractors. Track their progress and tick each off once the work is complete.</p>
                <div className="mt-3 space-y-2">
                  {extOut.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800"><Check size={15} /> All external contractor actions are complete.</div>
                  ) : extOut.map(a => card(a, setExtStatus))}
                </div>
                {extDone.length > 0 && (
                  <ul className="mt-3 space-y-2">{extDone.map(a => doneRow(a, setExtStatus))}</ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
