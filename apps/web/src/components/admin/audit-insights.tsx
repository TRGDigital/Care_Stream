'use client'

// Audit trends on the admin Audits page: repeat failures first, then each audit's score over time with
// a detailed view (section trends and every question's results), and the homes in a group side by side.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createApiClient, type AuditInsights as Insights, type AuditTemplateInsights, type AuditGroupInsights } from '@/lib/api-client'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Building2, Loader2, TrendingUp, X } from 'lucide-react'
import { clsx } from 'clsx'

const pctColour = (p: number | null) => p === null ? 'text-neutral-mid' : p >= 80 ? 'text-green-700' : p >= 60 ? 'text-amber-700' : 'text-rose-700'
const barColour = (p: number | null) => p === null ? 'bg-gray-200' : p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-amber-400' : 'bg-rose-500'
const cellColour = (p: number | null) => p === null ? 'bg-gray-50 text-neutral-mid/50' : p >= 80 ? 'bg-green-50 text-green-800' : p >= 60 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
const monthShort = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
const dayShort = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// A small bar per month; hover shows the month and score.
function Sparkbars({ series }: { series: Array<{ month: string; pct: number }> }) {
  const last = series.slice(-12)
  return (
    <div className="flex h-8 items-end gap-0.5" aria-label="Score by month">
      {last.map(s => (
        <span key={s.month} title={`${monthShort(s.month)}: ${s.pct}%`} className={clsx('w-2 rounded-sm', barColour(s.pct))} style={{ height: `${Math.max(8, s.pct)}%` }} />
      ))}
    </div>
  )
}

export function AuditInsightsPanel({ token }: { token: string }) {
  const [data, setData] = useState<Insights | null>(null)
  const [group, setGroup] = useState<AuditGroupInsights | null>(null)
  const [months, setMonths] = useState(12)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    const api = createApiClient(token)
    api.audits.insights(months).then(setData).catch(() => {}).finally(() => setLoading(false))
    api.audits.groupInsights(3).then(setGroup).catch(() => {})
  }, [token, months])

  if (loading && !data) return <div className="mb-6 h-28 animate-pulse rounded-card bg-gray-50" />
  if (!data || data.completed_runs === 0) return null

  return (
    <div className="mb-6 rounded-card bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><TrendingUp size={15} className="text-teal" /> Trends</h2>
          <p className="mt-0.5 text-xs text-neutral-mid">
            {data.completed_runs} completed audit{data.completed_runs === 1 ? '' : 's'} in the last {months} months
            {data.overall !== null && <>, <span className={clsx('font-semibold', pctColour(data.overall))}>{data.overall}%</span> of scored checks met</>}.
          </p>
        </div>
        <select value={months} onChange={e => setMonths(Number(e.target.value))} className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none">
          {[3, 6, 12, 24].map(m => <option key={m} value={m}>Last {m} months</option>)}
        </select>
      </div>

      {data.repeat_failures.length > 0 && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-800"><AlertTriangle size={13} /> Repeat failures: the same check failed in consecutive audits</p>
          <ul className="space-y-1.5">
            {data.repeat_failures.slice(0, 8).map((f, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="text-neutral-dark">{f.question}</span>
                  <span className="text-xs text-neutral-mid"> · {f.audit_name}{f.subject ? ` · ${f.subject}` : ''}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">Failed {f.streak} audits running</span>
                  <Link href={`/audits/${f.run_id}`} className="text-xs font-medium text-teal hover:underline">Last audit</Link>
                </span>
              </li>
            ))}
          </ul>
          {data.repeat_failures.length > 8 && <p className="mt-2 text-xs text-rose-800">And {data.repeat_failures.length - 8} more. Open an audit below for its full list.</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-neutral-mid">
              <th className="py-2 pr-3 font-medium">Audit</th>
              <th className="py-2 pr-3 font-medium">Audits done</th>
              <th className="py-2 pr-3 font-medium">Latest</th>
              <th className="py-2 pr-3 font-medium">Change</th>
              <th className="py-2 pr-3 font-medium">By month</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data.audits.map(a => (
              <tr key={a.template_id} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-3 font-medium text-neutral-dark">{a.name}</td>
                <td className="py-2 pr-3 text-neutral-mid">{a.runs}</td>
                <td className={clsx('py-2 pr-3 font-semibold', pctColour(a.latest_pct))}>{a.latest_pct === null ? '-' : `${a.latest_pct}%`}</td>
                <td className="py-2 pr-3 text-xs">
                  {a.change === null ? <span className="text-neutral-mid">-</span>
                    : a.change === 0 ? <span className="text-neutral-mid">No change</span>
                    : <span className={clsx('inline-flex items-center gap-0.5 font-medium', a.change > 0 ? 'text-green-700' : 'text-rose-700')}>{a.change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(a.change)} pts</span>}
                </td>
                <td className="py-2 pr-3"><Sparkbars series={a.series} /></td>
                <td className="py-2 text-right"><button onClick={() => setDetail({ id: a.template_id, name: a.name })} className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {group && group.sites.length > 1 && <GroupComparison group={group} />}
      {detail && <TemplateDetail token={token} id={detail.id} name={detail.name} months={months} onClose={() => setDetail(null)} />}
    </div>
  )
}

function GroupComparison({ group }: { group: AuditGroupInsights }) {
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Building2 size={14} className="text-teal" /> Across your homes <span className="text-xs font-normal text-neutral-mid">(last {group.months ?? 3} months)</span></p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-neutral-mid">
              <th className="py-2 pr-3 font-medium">Home</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 pr-3 font-medium">Audits done</th>
              <th className="py-2 pr-3 font-medium">Repeat failures</th>
              <th className="py-2 pr-3 font-medium">Open actions</th>
              <th className="py-2 pr-3 font-medium">Overdue actions</th>
              <th className="py-2 font-medium">Overdue audits</th>
            </tr>
          </thead>
          <tbody>
            {group.sites.map(s => (
              <tr key={s.tenant_id} className={clsx('border-b border-gray-50 last:border-0', s.is_current && 'bg-teal-light/20')}>
                <td className="py-2 pr-3 font-medium text-neutral-dark">{s.name}{s.is_current && <span className="ml-1.5 text-[10px] font-semibold text-teal">This home</span>}</td>
                <td className={clsx('py-2 pr-3 font-semibold', pctColour(s.score))}>{s.score === null ? '-' : `${s.score}%`}</td>
                <td className="py-2 pr-3 text-neutral-mid">{s.completed_runs}</td>
                <td className={clsx('py-2 pr-3', s.repeat_failures ? 'font-semibold text-rose-700' : 'text-neutral-mid')}>{s.repeat_failures}</td>
                <td className="py-2 pr-3 text-neutral-mid">{s.open_actions}</td>
                <td className={clsx('py-2 pr-3', s.overdue_actions ? 'font-semibold text-rose-700' : 'text-neutral-mid')}>{s.overdue_actions}</td>
                <td className={clsx('py-2', s.overdue_scheduled ? 'font-semibold text-rose-700' : 'text-neutral-mid')}>{s.overdue_scheduled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {group.audits.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-neutral-mid">
                <th className="py-1.5 pr-3 font-medium">Same audit in each home</th>
                {group.sites.map(s => <th key={s.tenant_id} className="py-1.5 pr-3 font-medium">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {group.audits.map(a => (
                <tr key={a.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-3 text-neutral-dark">{a.name}</td>
                  {group.sites.map(s => {
                    const p = a.scores[s.tenant_id] ?? null
                    return <td key={s.tenant_id} className="py-1.5 pr-3"><span className={clsx('rounded px-1.5 py-0.5 font-semibold', cellColour(p))}>{p === null ? '-' : `${p}%`}</span></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const DOT: Record<string, string> = { pass: 'bg-green-500', fail: 'bg-rose-500', na: 'bg-gray-300', unanswered: 'bg-amber-300', info: 'bg-gray-200' }

function TemplateDetail({ token, id, name, months, onClose }: { token: string; id: string; name: string; months: number; onClose: () => void }) {
  const [d, setD] = useState<AuditTemplateInsights | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { createApiClient(token).audits.templateInsights(id, months).then(setD).catch(e => setError(e?.message ?? 'Could not load.')) }, [token, id, months])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">{name}</h2>
            <p className="text-xs text-neutral-mid">Every completed audit in the last {months} months, oldest on the left.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!d && !error && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-neutral-mid" /></div>}
          {d && (
            <>
              <div className="mb-5 flex h-28 items-end gap-1.5 overflow-x-auto border-b border-gray-100 pb-1">
                {d.runs.map(r => (
                  <Link key={r.run_id} href={`/audits/${r.run_id}`} title={`${dayShort(r.completed_at)}${r.subject ? `, ${r.subject}` : ''}: ${r.pct ?? '-'}%`} className="flex h-full min-w-[26px] flex-col items-center justify-end gap-1">
                    <span className={clsx('text-[10px] font-semibold', pctColour(r.pct))}>{r.pct ?? '-'}</span>
                    <span className={clsx('w-5 rounded-t', barColour(r.pct))} style={{ height: `${Math.max(4, (r.pct ?? 0) * 0.7)}%` }} />
                    <span className="text-[9px] text-neutral-mid">{dayShort(r.completed_at)}</span>
                  </Link>
                ))}
              </div>

              {d.sections.length > 0 && (
                <div className="mb-5 overflow-x-auto">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Sections</p>
                  <table className="text-xs">
                    <tbody>
                      {d.sections.map(s => (
                        <tr key={s.title}>
                          <td className="whitespace-nowrap py-0.5 pr-3 text-neutral-dark">{s.title}</td>
                          {s.series.map((p, i) => <td key={i} className="px-0.5 py-0.5"><span className={clsx('inline-block w-9 rounded text-center font-semibold', cellColour(p))}>{p === null ? '-' : p}</span></td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Questions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-neutral-mid">
                      <th className="py-1.5 pr-3 font-medium">Check</th>
                      <th className="py-1.5 pr-3 font-medium">Met</th>
                      <th className="py-1.5 pr-3 font-medium">Results (oldest first)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.questions.map(q => (
                      <tr key={q.text} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 pr-3">
                          <span className="text-neutral-dark">{q.text}</span>
                          {q.streak >= 2 && <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">Failed {q.streak} running</span>}
                          <span className="block text-[10px] text-neutral-mid">{q.section}</span>
                        </td>
                        <td className={clsx('py-1.5 pr-3 font-semibold', pctColour(q.pass_rate))}>{q.pass_rate === null ? '-' : `${q.pass_rate}%`}</td>
                        <td className="py-1.5 pr-3">
                          <span className="flex gap-1">
                            {q.outcomes.map((o, i) => <span key={i} title={o ?? 'Not asked'} className={clsx('h-3 w-3 rounded-full', o ? DOT[o] : 'border border-gray-200 bg-white')} />)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-neutral-mid">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Met</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Not met</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> N/A</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-gray-200" /> Not asked</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
