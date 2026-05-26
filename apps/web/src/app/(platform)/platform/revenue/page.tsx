'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type RevenueData } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { AlertCircle, Building2, CreditCard, Loader2, TrendingUp, Zap } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pence(p: number) {
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(p / 100)
}

function penceExact(p: number | null) {
  if (p === null) return '—'
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(p / 100)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    trialling: 'bg-blue-100 text-blue-700',
    past_due:  'bg-orange-100 text-orange-700',
    cancelled: 'bg-gray-100  text-gray-600',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function SummaryCard({
  label, value, sub, accent = false, Icon,
}: {
  label:   string
  value:   string
  sub?:    string
  accent?: boolean
  Icon:    React.ElementType
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-teal/30 bg-teal-light' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? 'bg-teal/10' : 'bg-neutral-light'}`}>
          <Icon size={15} className={accent ? 'text-teal' : 'text-neutral-mid'} />
        </div>
        <p className="text-xs font-medium text-neutral-mid">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-teal' : 'text-neutral-dark'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-mid">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const token = usePlatformAuth()
  const [data,    setData]    = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).revenue()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Revenue</h1>
            <p className="mt-1 text-sm text-neutral-mid">
              MRR and ARR are calculated from active subscription plan pricing in the database.
              Historical payment data and daily revenue charts will populate automatically once Stripe is connected.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <AlertCircle size={13} />
            Stripe not yet connected
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : data && (
          <>
            {/* ── Summary cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                label="Monthly recurring revenue"
                value={pence(data.summary.mrr_pence)}
                sub={`${data.summary.active_count} active subscription${data.summary.active_count !== 1 ? 's' : ''}`}
                accent
                Icon={TrendingUp}
              />
              <SummaryCard
                label="Annual recurring revenue"
                value={pence(data.summary.arr_pence)}
                sub="MRR × 12"
                Icon={TrendingUp}
              />
              <SummaryCard
                label="Active subscriptions"
                value={String(data.summary.active_count)}
                sub={`${data.summary.trialling_count} trialling`}
                Icon={Building2}
              />
              <SummaryCard
                label="Total clients"
                value={String(data.summary.total_count)}
                sub={[
                  data.summary.past_due_count  > 0 ? `${data.summary.past_due_count} past due`  : '',
                  data.summary.cancelled_count > 0 ? `${data.summary.cancelled_count} cancelled` : '',
                ].filter(Boolean).join(' · ') || 'All statuses'}
                Icon={Building2}
              />
            </div>

            {/* ── Status breakdown bar ──────────────────────────────────────── */}
            {data.summary.total_count > 0 && (() => {
              const segments = [
                { label: 'Active',    count: data.summary.active_count,    color: 'bg-green-500'  },
                { label: 'Trialling', count: data.summary.trialling_count, color: 'bg-blue-400'   },
                { label: 'Past due',  count: data.summary.past_due_count,  color: 'bg-orange-400' },
                { label: 'Cancelled', count: data.summary.cancelled_count, color: 'bg-gray-300'   },
              ].filter(s => s.count > 0)
              const total = data.summary.total_count
              return (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Subscription status breakdown</h2>
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {segments.map(s => (
                      <div
                        key={s.label}
                        className={`${s.color} transition-all`}
                        style={{ width: `${(s.count / total) * 100}%` }}
                        title={`${s.label}: ${s.count}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {segments.map(s => (
                      <div key={s.label} className="flex items-center gap-2 text-xs text-neutral-mid">
                        <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                        {s.label}: <span className="font-medium text-neutral-dark">{s.count}</span>
                        <span className="text-neutral-mid/60">({Math.round((s.count / total) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Plan breakdown ────────────────────────────────────────────── */}
            {data.plan_breakdown.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h2 className="text-sm font-semibold text-neutral-dark">Revenue by plan</h2>
                  <p className="mt-0.5 text-xs text-neutral-mid">MRR contribution from active subscriptions per plan tier</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    <tr>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3 text-right">Price / mo</th>
                      <th className="px-5 py-3 text-right">Active</th>
                      <th className="px-5 py-3 text-right">Trialling</th>
                      <th className="px-5 py-3 text-right">MRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.plan_breakdown.map(p => (
                      <tr key={p.plan_name} className="hover:bg-neutral-light/50">
                        <td className="px-5 py-3 font-medium text-neutral-dark">{p.plan_name}</td>
                        <td className="px-5 py-3 text-right text-neutral-mid">{penceExact(p.plan_price_pence)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            {p.active_count}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                            {p.trialling_count}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-teal">
                          {p.mrr_pence > 0 ? penceExact(p.mrr_pence) : <span className="text-neutral-mid font-normal">—</span>}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-gray-200 bg-neutral-light/40">
                      <td className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid" colSpan={4}>Total MRR</td>
                      <td className="px-5 py-3 text-right text-base font-bold text-teal">{penceExact(data.summary.mrr_pence)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Revenue charts — Stripe placeholder ──────────────────────── */}
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-light">
                  <CreditCard size={22} className="text-neutral-mid" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-dark">Daily &amp; monthly revenue charts</h3>
                <p className="mt-2 text-sm text-neutral-mid">
                  Once Stripe is connected, this section will show a daily revenue line chart
                  and a monthly revenue bar chart pulled directly from Stripe payment data.
                </p>
                <div className="mt-4 rounded-lg border border-gray-200 bg-neutral-light px-4 py-3 text-left text-xs text-neutral-mid">
                  <p className="font-medium text-neutral-dark">Integration points (admin.ts):</p>
                  <ul className="mt-1.5 space-y-1">
                    <li><code className="text-teal">monthly_series</code> — Stripe payment intents grouped by month</li>
                    <li><code className="text-teal">daily_series</code> — Stripe charges grouped by day for a rolling period</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ── Client revenue table ──────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-neutral-dark">All clients</h2>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  Subscription status and plan pricing per client — source of truth for MRR calculation above
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    <tr>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3 text-right">Price / mo</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Stripe customer</th>
                      <th className="px-5 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.clients.map(c => (
                      <tr key={c.id} className="hover:bg-neutral-light/50">
                        <td className="px-5 py-3 font-medium text-neutral-dark">{c.name}</td>
                        <td className="px-5 py-3 text-neutral-mid">{c.plan_name ?? <span className="italic text-neutral-mid/60">None</span>}</td>
                        <td className="px-5 py-3 text-right">
                          {c.subscription_status === 'active' && c.plan_price_pence
                            ? <span className="font-medium text-neutral-dark">{penceExact(c.plan_price_pence)}</span>
                            : <span className="text-neutral-mid/60">—</span>
                          }
                        </td>
                        <td className="px-5 py-3"><StatusBadge status={c.subscription_status} /></td>
                        <td className="px-5 py-3">
                          {c.stripe_customer_id
                            ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <Zap size={10} />
                                {c.stripe_customer_id}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-mid/60">Not linked</span>
                            )
                          }
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-xs text-neutral-mid">
                          {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                    {data.clients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-mid">No clients yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MRR note */}
              <div className="border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-neutral-mid">
                  MRR is calculated from <strong className="text-neutral-dark">active</strong> subscriptions only.
                  Trialling, past-due, and cancelled clients are excluded.
                  Prices are stored in pence (GBP) and reflect the plan configuration in the database.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformShell>
  )
}
