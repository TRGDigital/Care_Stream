'use client'

// §10.2/10.3 — Analytics dashboard: basic metrics for all plans,
// advanced metrics for Professional plan (has_advanced_analytics = true).

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Language names ────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
}

const CATEGORY_LABELS: Record<string, string> = {
  internal_policy:      'Internal policy',
  staff_handbook:       'Staff handbook',
  external_regulation:  'Ext. regulation',
  unknown:              'Unknown',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-mid">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatCard({
  label, value, changePct, invertTrend = false, suffix = '',
}: {
  label: string; value: string | number; changePct?: number | null; invertTrend?: boolean; suffix?: string
}) {
  const positive = invertTrend ? (changePct ?? 0) < 0 : (changePct ?? 0) > 0
  const negative = invertTrend ? (changePct ?? 0) > 0 : (changePct ?? 0) < 0

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-mid">{label}</p>
      <p className="text-2xl font-bold text-neutral-dark">
        {typeof value === 'number' ? value.toLocaleString('en-GB') : value}{suffix}
      </p>
      {changePct !== undefined && changePct !== null && (
        <div className={clsx('mt-1 flex items-center gap-1 text-xs font-medium', positive ? 'text-status-success' : negative ? 'text-status-error' : 'text-neutral-mid')}>
          {positive ? <TrendingUp size={12} /> : negative ? <TrendingDown size={12} /> : <Minus size={12} />}
          {changePct > 0 ? '+' : ''}{changePct}% vs last month
        </div>
      )}
    </div>
  )
}

function HBar({ label, count, total, color = 'bg-teal' }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-neutral-mid">
        <span>{label}</span>
        <span>{count.toLocaleString('en-GB')} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={clsx('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PlanUsageBar({ used, limit, percent }: { used: number; limit: number; percent: number }) {
  const color = percent >= 95 ? 'bg-status-error' : percent >= 80 ? 'bg-status-warning' : 'bg-teal'
  const textColor = percent >= 95 ? 'text-status-error' : percent >= 80 ? 'text-status-warning' : 'text-teal'
  return (
    <div className="mb-6 rounded-card bg-white p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Plan usage this month</p>
        <p className={clsx('text-sm font-semibold', textColor)}>{used.toLocaleString()} / {limit.toLocaleString()} queries ({percent}%)</p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={clsx('h-3 rounded-full transition-all', color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {percent >= 80 && (
        <p className={clsx('mt-2 text-xs font-medium', textColor)}>
          {percent >= 95 ? 'Warning: approaching monthly limit.' : 'Heads up: 80% of monthly limit used.'}
        </p>
      )}
    </div>
  )
}

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 mt-8 border-b border-gray-200 pb-3">
      <h2 className="text-lg font-semibold text-neutral-dark">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-neutral-mid">{subtitle}</p>}
    </div>
  )
}

// ─── CSV export helper ─────────────────────────────────────────────────────────

function exportLanguageCsv(langRows: Array<{ language: string; month: string; count: number }>) {
  const months    = [...new Set(langRows.map(r => r.month))].sort()
  const languages = [...new Set(langRows.map(r => r.language))]
  const pivot     = new Map<string, Map<string, number>>()
  for (const r of langRows) {
    if (!pivot.has(r.month)) pivot.set(r.month, new Map())
    pivot.get(r.month)!.set(r.language, r.count)
  }
  const header = ['Month', ...languages.map(l => LANG_NAMES[l] ?? l)].join(',')
  const rows    = months.map(m => [m, ...languages.map(l => pivot.get(m)?.get(l) ?? 0)].join(','))
  const csv     = [header, ...rows].join('\n')
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = `language-breakdown-${new Date().toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: session }     = useSession()
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.analytics.get()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const now       = new Date()
  const monthName = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  if (loading) return <p className="text-sm text-neutral-mid">Loading analytics…</p>
  if (error || !data) return <p className="text-sm text-status-error">Failed to load analytics.</p>

  const { basic, advanced } = data

  const thisTotal     = basic.total_queries.this_month
  const channelTotal  = basic.queries_by_channel.chat + basic.queries_by_channel.email
  const intentTotal   = basic.full_vs_summary.full_policy + basic.full_vs_summary.summary + basic.full_vs_summary.follow_up

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Analytics — {monthName}</h1>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total queries"
          value={basic.total_queries.this_month}
          changePct={basic.total_queries.change_pct}
        />
        <StatCard
          label="Active users"
          value={basic.active_users.this_month}
          changePct={basic.active_users.change_pct}
        />
        <StatCard
          label="No-match rate"
          value={basic.no_match_rate.this_month}
          suffix="%"
          changePct={
            basic.no_match_rate.this_month !== null && basic.no_match_rate.last_month !== null
              ? Math.round((basic.no_match_rate.this_month - basic.no_match_rate.last_month) * 10) / 10
              : null
          }
          invertTrend
        />
        <StatCard
          label="Avg response time"
          value={basic.avg_response_ms}
          suffix="ms"
        />
      </div>

      {/* ── Plan usage ──────────────────────────────────────────────────────── */}
      {basic.plan_usage.limit && basic.plan_usage.percent !== null && (
        <PlanUsageBar
          used={basic.plan_usage.used}
          limit={basic.plan_usage.limit}
          percent={basic.plan_usage.percent}
        />
      )}

      {/* ── Channel + Intent split ───────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Queries by channel">
          <HBar label="Chat"  count={basic.queries_by_channel.chat}  total={channelTotal} color="bg-teal" />
          <HBar label="Email" count={basic.queries_by_channel.email} total={channelTotal} color="bg-teal-light border border-teal/30" />
        </Card>
        <Card title="Intent breakdown">
          <HBar label="Summary / question" count={basic.full_vs_summary.summary}     total={intentTotal} color="bg-teal"       />
          <HBar label="Full policy"         count={basic.full_vs_summary.full_policy} total={intentTotal} color="bg-teal-dark"  />
          <HBar label="Follow-up"           count={basic.full_vs_summary.follow_up}   total={intentTotal} color="bg-neutral-mid" />
        </Card>
      </div>

      {/* ── Top policies ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Card title="Most cited policies this month">
          {basic.top_policies.length === 0 ? (
            <p className="text-sm text-neutral-mid">No queries with policy matches yet this month.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Policy</th>
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Category</th>
                  <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Citations</th>
                </tr>
              </thead>
              <tbody>
                {basic.top_policies.map((p: any, i: number) => (
                  <tr key={p.policy_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-neutral-dark">
                      <span className="mr-2 text-xs text-neutral-mid">{i + 1}.</span>
                      {p.policy_name}
                    </td>
                    <td className="py-2 pr-4 text-xs text-neutral-mid">
                      {CATEGORY_LABELS[p.document_category] ?? p.document_category}
                    </td>
                    <td className="py-2 text-right font-medium text-teal">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Top handbook topics ──────────────────────────────────────────────── */}
      {basic.top_handbook_topics.length > 0 && (
        <div className="mb-6">
          <Card title="Most cited handbook sections this month">
            {basic.top_handbook_topics.map((t: any, i: number) => (
              <HBar
                key={t.policy_id}
                label={`${i + 1}. ${t.policy_name}`}
                count={t.count}
                total={basic.top_handbook_topics[0].count}
              />
            ))}
          </Card>
        </div>
      )}

      {/* ── Policy ages ──────────────────────────────────────────────────────── */}
      {basic.policy_ages.length > 0 && (
        <div className="mb-6">
          <Card title="Policy library — last updated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Policy</th>
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Version</th>
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Last updated</th>
                  <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Age</th>
                </tr>
              </thead>
              <tbody>
                {basic.policy_ages.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-neutral-dark">{p.name}</td>
                    <td className="py-2 pr-4 text-neutral-mid">v{p.version}</td>
                    <td className="py-2 pr-4 text-neutral-mid">
                      {new Date(p.updated_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className={clsx('py-2 text-right text-xs font-medium', p.days_since_update > 180 ? 'text-status-warning' : 'text-neutral-mid')}>
                      {p.days_since_update}d ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Advanced section ─────────────────────────────────────────────────── */}
      {!advanced ? (
        <div className="rounded-card border-2 border-dashed border-gray-200 p-8 text-center">
          <TrendingUp size={32} className="mx-auto mb-3 text-neutral-mid" />
          <h3 className="mb-1 text-base font-semibold text-neutral-dark">Advanced analytics</h3>
          <p className="text-sm text-neutral-mid">
            Language breakdown, query trends, staff engagement, and more are available on the
            Professional plan.
          </p>
        </div>
      ) : (
        <>
          <SectionDivider
            title="Advanced analytics"
            subtitle="Professional plan — 12-month rolling window"
          />

          {/* Language breakdown */}
          <div className="mb-6">
            <Card
              title="Language breakdown"
              action={
                advanced.language_breakdown.length > 0 ? (
                  <button
                    onClick={() => exportLanguageCsv(advanced.language_breakdown)}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                ) : undefined
              }
            >
              {advanced.language_breakdown.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Month</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Language</th>
                        <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Queries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanced.language_breakdown.map((r: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 text-neutral-mid">{r.month}</td>
                          <td className="py-2 pr-4 font-medium text-neutral-dark">
                            {LANG_NAMES[r.language] ?? r.language}
                          </td>
                          <td className="py-2 text-right text-teal">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Query trend */}
          <div className="mb-6">
            <Card title="Query trend — last 12 months">
              {advanced.query_trend.monthly.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (() => {
                const max = Math.max(...advanced.query_trend.monthly.map((r: any) => r.count), 1)
                return (
                  <div className="space-y-1.5">
                    {advanced.query_trend.monthly.map((r: any) => (
                      <div key={r.period} className="flex items-center gap-3">
                        <span className="w-16 text-right text-xs text-neutral-mid">{r.period}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-5">
                          <div
                            className="h-5 rounded-full bg-teal transition-all"
                            style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-neutral-dark">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Card>
          </div>

          {/* Staff engagement + Category breakdown */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="Staff engagement this month">
              {advanced.staff_engagement.length === 0 ? (
                <p className="text-sm text-neutral-mid">No user queries this month.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Staff member</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Role</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Queries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanced.staff_engagement.map((s: any) => (
                      <tr key={s.user_id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-neutral-dark">{s.name}</td>
                        <td className="py-2 pr-4 text-xs text-neutral-mid capitalize">{s.role}</td>
                        <td className="py-2 text-right font-medium text-teal">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Document category breakdown">
              {advanced.category_breakdown.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (() => {
                const catTotal = advanced.category_breakdown.reduce((s: number, c: any) => s + c.count, 0)
                return advanced.category_breakdown.map((c: any) => (
                  <HBar
                    key={c.category}
                    label={CATEGORY_LABELS[c.category] ?? c.category}
                    count={c.count}
                    total={catTotal}
                  />
                ))
              })()}
            </Card>
          </div>

          {/* Response time */}
          <div className="mb-6">
            <Card title="Response time performance this month">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-mid">Average</p>
                  <p className="text-2xl font-bold text-neutral-dark">{advanced.response_time.avg_ms.toLocaleString('en-GB')}ms</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-mid">95th percentile</p>
                  <p className="text-2xl font-bold text-neutral-dark">{advanced.response_time.p95_ms.toLocaleString('en-GB')}ms</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Knowledge gaps */}
          <div className="mb-6">
            <Card title={`Knowledge gaps — last 30 days (${advanced.knowledge_gaps.length} unmatched queries)`}>
              {advanced.knowledge_gaps.length === 0 ? (
                <p className="text-sm text-neutral-mid">No unmatched queries in the last 30 days.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {advanced.knowledge_gaps.map((g: any) => (
                    <div key={g.id} className="rounded-md bg-neutral-light/60 px-3 py-2">
                      <p className="text-sm text-neutral-dark">{g.query_text}</p>
                      <div className="mt-1 flex gap-3 text-xs text-neutral-mid">
                        <span>{new Date(g.created_at).toLocaleDateString('en-GB')}</span>
                        <span className="capitalize">{g.channel}</span>
                        <span>{LANG_NAMES[g.language_detected] ?? g.language_detected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
