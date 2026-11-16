'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createPlatformClient, type StaffRecord, type StaffRecordItem } from '@/lib/platform-api'

// A personal view of one staff member for the platform console: what they have been allocated and done, when they were last active and from where,
// and the reminders they have been sent. AI questions show as counts and times only (never what was typed). Every view is logged by the API.

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never')
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const ACTIVITY_STYLE: Record<string, string> = {
  'Active this week': 'bg-emerald-100 text-emerald-800', 'Occasional': 'bg-amber-100 text-amber-800', 'Dormant': 'bg-red-100 text-red-700',
  'Never signed in': 'bg-red-100 text-red-700', 'No activity': 'bg-gray-100 text-gray-600',
}
const STATUS_STYLE: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-800', in_progress: 'bg-blue-100 text-blue-800', not_started: 'bg-gray-100 text-gray-600', expired: 'bg-red-100 text-red-700',
}
const STATUS_LABEL: Record<string, string> = { complete: 'Complete', in_progress: 'In progress', not_started: 'Not started', expired: 'Expired' }

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-neutral-mid">{label}</dt><dd className="mt-0.5 text-sm font-medium text-neutral-dark">{children}</dd></div>
}

export function StaffRecordDrawer({ tenantId, token, user, onClose }: { tenantId: string; token: string; user: { id: string; name: string } | null; onClose: () => void }) {
  const [rec, setRec] = useState<StaffRecord | null>(null)
  const [error, setError] = useState('')
  const [onlyOutstanding, setOnlyOutstanding] = useState(false)

  useEffect(() => {
    if (!user) return
    let live = true
    setRec(null); setError('')
    createPlatformClient(token).tenants.staffRecord(tenantId, user.id).then(r => { if (live) setRec(r) }).catch(e => { if (live) setError(e?.message ?? 'Could not load the record') })
    return () => { live = false }
  }, [user, tenantId, token])

  if (!user) return null
  const items: Array<StaffRecordItem & { kind: 'Annual' | 'Training' }> = rec
    ? [...rec.annual_training.items.map(i => ({ ...i, kind: 'Annual' as const })), ...rec.training.items.map(i => ({ ...i, kind: 'Training' as const }))]
    : []
  const shown = (onlyOutstanding ? items.filter(i => i.status !== 'complete') : items)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.status === 'complete' ? 1 : 0) - (b.status === 'complete' ? 1 : 0) || a.module_name.localeCompare(b.module_name))
  const total = items.length, done = items.filter(i => i.status === 'complete').length, overdue = items.filter(i => i.overdue).length, notStarted = items.filter(i => i.status === 'not_started').length
  const lastLogin = rec?.user.last_login

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-dark">{user.name}</h2>
            {rec && <p className="mt-0.5 text-xs text-neutral-mid">{rec.user.email} · {rec.user.role}{rec.user.job_role ? ` · ${rec.user.job_role}` : ''}</p>}
            {rec && <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTIVITY_STYLE[rec.activity.label] ?? 'bg-gray-100'}`}>{rec.activity.label}</span>
              {!rec.user.is_active && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Deactivated</span>}
            </div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-mid hover:bg-gray-100"><X size={18} /></button>
        </div>

        {!rec && !error && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>}
        {error && <p className="px-5 py-6 text-sm text-red-600">{error}</p>}

        {rec && (
          <div className="space-y-6 px-5 py-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Last active">{when(rec.activity.last_active_at)}</Stat>
              <Stat label="Last login">{when(rec.user.last_login_at)}</Stat>
              <Stat label="First login">{rec.user.first_login_at ? when(rec.user.first_login_at) : <span className="text-red-600">Never</span>}</Stat>
              <Stat label="Last login from">{lastLogin?.ip ? <>{lastLogin.ip}<span className="block text-xs font-normal text-neutral-mid">{[lastLogin.city, lastLogin.region, lastLogin.country].filter(Boolean).join(', ')}</span></> : 'Not recorded yet'}</Stat>
              <Stat label="Account added">{dateOnly(rec.user.created_at)}</Stat>
              <Stat label="AI questions asked">{rec.activity.queries_total} <span className="text-xs font-normal text-neutral-mid">({rec.activity.queries_30d} in the last 30 days)</span></Stat>
            </dl>
            {lastLogin?.user_agent && <p className="-mt-3 break-words text-xs text-neutral-mid">Device: {lastLogin.user_agent}</p>}

            {rec.flags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rec.flags.map(f => <span key={f.kind} className={`rounded-full px-2.5 py-1 text-xs font-medium ${f.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{f.label}</span>)}
              </div>
            )}

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-dark">Training allocated ({done} of {total} complete{overdue ? `, ${overdue} overdue` : ''}{notStarted ? `, ${notStarted} not started` : ''})</h3>
                <label className="flex items-center gap-1.5 text-xs text-neutral-mid"><input type="checkbox" checked={onlyOutstanding} onChange={e => setOnlyOutstanding(e.target.checked)} /> Only what is outstanding</label>
              </div>
              {shown.length === 0 ? <p className="text-sm text-neutral-mid">{total === 0 ? 'Nothing has been allocated yet.' : 'Everything is complete.'}</p> : (
                <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-neutral-light text-left text-xs uppercase tracking-wide text-neutral-mid"><tr><th className="px-3 py-2">Module</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">Reminders</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {shown.map((i, n) => (
                        <tr key={`${i.module_name}-${n}`}>
                          <td className="px-3 py-2"><span className="text-neutral-dark">{i.module_name}</span><span className="block text-xs capitalize text-neutral-mid">{i.kind} · {i.category}</span></td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.status] ?? 'bg-gray-100'}`}>{STATUS_LABEL[i.status] ?? i.status}</span></td>
                          <td className="px-3 py-2 text-xs">{i.score ? `${i.score.pct}%` : '—'}</td>
                          <td className={`px-3 py-2 text-xs ${i.overdue ? 'font-semibold text-red-600' : 'text-neutral-mid'}`}>{i.due_date ? dateOnly(i.due_date) : '—'}{i.overdue ? ' (overdue)' : ''}</td>
                          <td className="px-3 py-2 text-xs text-neutral-mid">{i.reminders_sent > 0 ? `${i.reminders_sent}, last ${dateOnly(i.last_reminded_at)}` : '—'}</td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-neutral-dark">Reminders sent</h3>
              {rec.reminders.weekly.length === 0 && rec.reminders.manual_total === 0 ? <p className="text-sm text-neutral-mid">No reminders yet. The weekly reminder goes out on Mondays while training is outstanding.</p> : (
                <ul className="space-y-1 text-sm text-neutral-dark">
                  {rec.reminders.weekly.map(r => <li key={`${r.kind}-${r.week_start}`} className="flex justify-between gap-3 rounded-lg bg-neutral-light/60 px-3 py-1.5"><span>Weekly reminder, week of {dateOnly(r.week_start)}</span><span className="text-xs text-neutral-mid">{r.outstanding} outstanding</span></li>)}
                  {rec.reminders.manual_total > 0 && <li className="text-xs text-neutral-mid">Plus {rec.reminders.manual_total} sent by an administrator.</li>}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-neutral-dark">Recent activity</h3>
              {rec.timeline.length === 0 ? <p className="text-sm text-neutral-mid">No activity recorded yet.</p> : (
                <ul className="space-y-1.5 text-sm">
                  {rec.timeline.map((e, n) => <li key={`${e.at}-${n}`} className="flex gap-3"><span className="w-32 shrink-0 text-xs text-neutral-mid">{when(e.at)}</span><span className="text-neutral-dark">{e.label}</span></li>)}
                </ul>
              )}
            </section>

            <p className="border-t border-gray-100 pt-3 text-xs text-neutral-mid">AI questions show as counts and times only, never what was typed. Viewing this record is logged against the account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
