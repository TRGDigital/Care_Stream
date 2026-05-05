'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type UsageData } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2 } from 'lucide-react'

export default function UsagePage() {
  const token                 = usePlatformAuth()
  const [data,    setData]    = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).usage()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const maxCount = data ? Math.max(...data.dailySeries.map(d => d.count), 1) : 1

  return (
    <PlatformShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-dark">Usage (last 30 days)</h1>
          {data && (
            <p className="mt-1 text-sm text-neutral-mid">
              {data.totalLast30.toLocaleString()} queries total ·{' '}
              {data.noMatchRatePercent}% not matched
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : data && (
          <div className="space-y-8">
            {/* Daily bar chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Queries per day</h2>
              <div className="flex items-end gap-1" style={{ height: 120 }}>
                {data.dailySeries.map(({ date, count }) => (
                  <div
                    key={date}
                    className="group relative flex-1"
                    style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
                  >
                    <div
                      className="w-full rounded-sm bg-teal transition-all group-hover:bg-teal-dark"
                      style={{ height: `${Math.max(2, (count / maxCount) * 100)}%` }}
                      title={`${date}: ${count}`}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-neutral-dark px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                      {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: {count}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-neutral-mid">
                <span>{data.dailySeries[0]?.date ? new Date(data.dailySeries[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
                <span>{data.dailySeries[data.dailySeries.length - 1]?.date ? new Date(data.dailySeries[data.dailySeries.length - 1].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>
            </div>

            {/* Per-tenant table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-neutral-dark">Queries by client</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3 text-right">Queries (30d)</th>
                    <th className="px-4 py-3">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.tenantUsage.map(t => {
                    const pct = data.totalLast30 > 0
                      ? Math.round((t.query_count / data.totalLast30) * 1000) / 10
                      : 0
                    return (
                      <tr key={t.tenant_id} className="hover:bg-neutral-light/50">
                        <td className="px-4 py-3 font-medium text-neutral-dark">{t.tenant_name}</td>
                        <td className="px-4 py-3 text-right text-neutral-dark">{t.query_count.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-neutral-mid">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
