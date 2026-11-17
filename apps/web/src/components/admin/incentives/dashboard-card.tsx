'use client'

// Dashboard card for Professional and Enterprise: how the live staff incentive is going this month, and what it costs.
// Hidden on plans without incentives. Cached per user so it never blanks the dashboard.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Gift, Pencil } from 'lucide-react'
import { createIncentivesClient } from '@/lib/incentives-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { ProgressBar, monthLabel, pounds } from '@/components/admin/incentives/shared'
import { btnPrimary, btnSecondary, errMsg } from '@/components/admin/residents/ui'

export function IncentivesDashboardCard({ token, userKey }: { token: string; userKey: string }) {
  const q = useCachedQuery(token ? `dash-incentives-${userKey}` : null, () => createIncentivesClient(token).summary())
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const s = q.data
  if (!s) return null   // loading, or a plan without incentives (the call is refused)

  async function saveBudget() {
    const clean = text.trim().replace(/[£,\s]/g, '')
    let pence: number | null = null
    if (clean !== '') {
      const n = Number(clean)
      if (!isFinite(n) || n < 0) { setError('Enter an amount in pounds, for example 100.'); return }
      pence = Math.round(n * 100)
    }
    setBusy(true); setError(null)
    try { await createIncentivesClient(token).saveBudget(pence); await q.reload(); setEditing(false) }
    catch (e) { setError(errMsg(e)) }
    finally { setBusy(false) }
  }

  const running = s.campaigns.length > 0
  const committed = s.value_pence.approved_or_given + s.value_pence.waiting
  const pctEarning = s.people > 0 ? Math.round((s.earners / s.people) * 100) : 0
  const t = s.training
  const diff = t.this_month - t.last_month

  return (
    <div className="mb-6 rounded-card border border-gray-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10"><Gift size={20} className="text-teal" /></div>
          <div>
            <h2 className="text-base font-bold text-neutral-dark">Staff incentives</h2>
            <p className="text-sm text-neutral-mid">{monthLabel(s.month)}{running ? `. ${s.campaigns.map(c => c.name).join(', ')}` : ''}</p>
          </div>
        </div>
        <Link href="/incentives" className="flex items-center gap-1 text-sm font-semibold text-teal hover:underline">Open incentives <ArrowRight size={15} /></Link>
      </div>

      {!running ? (
        <p className="mt-4 rounded-lg bg-neutral-light px-4 py-3 text-sm text-neutral-mid">No incentive is running this month. Set one up to give your team a reason to finish their training.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-3xl font-bold text-neutral-dark">{pctEarning}%</p>
            <p className="text-sm font-semibold text-neutral-dark">of staff have earned points</p>
            <p className="mb-2 text-xs text-neutral-mid">{s.earners} of {s.people} people, {s.points} points in total</p>
            <ProgressBar pct={pctEarning} label="Share of staff who have earned points" />
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            {([['Reached', s.rewards.reached, 'plain'], ['Waiting', s.rewards.waiting, s.rewards.waiting > 0 ? 'warn' : 'plain'], ['Given', s.rewards.given, s.rewards.given > 0 ? 'good' : 'plain']] as const).map(([label, value, tone]) => (
              <div key={label} className={`rounded-xl border px-2 py-3 ${tone === 'warn' ? 'border-amber-200 bg-amber-50/60' : tone === 'good' ? 'border-green-200 bg-green-50/60' : 'border-gray-100 bg-gray-50/60'}`}>
                <dd className="text-2xl font-bold text-neutral-dark">{value}</dd>
                <dt className="mt-0.5 text-xs text-neutral-mid">{label === 'Waiting' ? 'Waiting for a care manager' : `Rewards ${label.toLowerCase()}`}</dt>
              </div>
            ))}
          </dl>

          <div>
            <p className="text-sm font-semibold text-neutral-dark">Cost this month</p>
            <p className="text-2xl font-bold text-neutral-dark">{pounds(s.value_pence.approved_or_given)}<span className="ml-1 text-xs font-normal text-neutral-mid">approved or given</span></p>
            {s.value_pence.waiting > 0 && <p className="text-xs text-neutral-mid">{pounds(s.value_pence.waiting)} more is waiting for approval</p>}
            {s.budget_pence != null && !editing && (
              <div className="mt-2">
                <ProgressBar pct={s.budget_pence > 0 ? (committed / s.budget_pence) * 100 : 100} label="Rewards against the monthly budget" done={committed <= s.budget_pence} />
                <p className={`mt-1 text-xs ${committed > s.budget_pence ? 'font-semibold text-red-700' : 'text-neutral-mid'}`}>{pounds(committed)} of {pounds(s.budget_pence)} monthly budget{committed > s.budget_pence ? ', over budget' : ''}</p>
              </div>
            )}
            {!editing && <button type="button" onClick={() => { setText(s.budget_pence != null ? String(s.budget_pence / 100) : ''); setEditing(true) }} className="mt-2 flex items-center gap-1 text-xs font-semibold text-teal hover:underline"><Pencil size={12} /> {s.budget_pence != null ? 'Change monthly budget' : 'Set a monthly budget'}</button>}
            {editing && (
              <div className="mt-2 space-y-2">
                <label className="block text-xs font-medium text-neutral-dark" htmlFor="incentive-budget">Monthly budget in pounds (leave empty for none)</label>
                <input id="incentive-budget" inputMode="decimal" value={text} onChange={e => setText(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" placeholder="For example 100" />
                {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" className={btnPrimary} onClick={saveBudget} disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
                  <button type="button" className={btnSecondary} onClick={() => { setEditing(false); setError(null) }} disabled={busy}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-gray-100 pt-4 text-sm">
        <p className="text-neutral-dark"><span className="font-bold">{t.this_month}</span> training {t.this_month === 1 ? 'completion' : 'completions'} this month</p>
        <p className="text-neutral-mid">{t.last_month} last month{t.this_month !== t.last_month ? `, ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)}` : ', no change'}</p>
      </div>
    </div>
  )
}
