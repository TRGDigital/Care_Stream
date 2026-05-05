'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type PlatformStats, type TenantSummary } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Building2, FileText, BookOpen, MessageSquare, TrendingUp, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PlatformDashboard() {
  const token                     = usePlatformAuth()
  const [stats,   setStats]       = useState<PlatformStats | null>(null)
  const [tenants, setTenants]     = useState<TenantSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [error,   setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const api = createPlatformClient(token)
    Promise.all([api.stats(), api.tenants.list()])
      .then(([s, t]) => { setStats(s); setTenants(t.tenants) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const CARDS = stats ? [
    { label: 'Total clients',       value: stats.tenantCount,       Icon: Building2,    accent: true  },
    { label: 'Active policies',     value: stats.activePolicyCount, Icon: FileText,     accent: false },
    { label: 'Knowledge entries',   value: stats.knowledgeCount,    Icon: BookOpen,     accent: false },
    { label: 'Queries (all time)',  value: stats.queryCount,        Icon: MessageSquare,accent: false },
    { label: 'Queries (last 7d)',   value: stats.queriesLast7Days,  Icon: TrendingUp,   accent: false },
    { label: 'Regulations (live)',  value: stats.regulationCount,   Icon: BookOpen,     accent: false },
  ] : []

  return (
    <PlatformShell>
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-neutral-dark">Platform Overview</h1>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {CARDS.map(({ label, value, Icon, accent }) => (
                <div
                  key={label}
                  className={`rounded-xl border p-4 ${accent ? 'border-teal/30 bg-teal-light' : 'border-gray-200 bg-white'}`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon size={14} className={accent ? 'text-teal' : 'text-neutral-mid'} />
                    <p className="text-xs font-medium text-neutral-mid">{label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${accent ? 'text-teal' : 'text-neutral-dark'}`}>
                    {value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Clients table */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-dark">All clients</h2>
                <Link href="/platform/clients" className="text-sm text-teal hover:underline">
                  View all →
                </Link>
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Policies</th>
                      <th className="px-4 py-3 text-right">Knowledge</th>
                      <th className="px-4 py-3 text-right">Queries (30d)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tenants.map(t => (
                      <tr key={t.id} className="hover:bg-neutral-light/50">
                        <td className="px-4 py-3">
                          <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                            {t.name}
                          </Link>
                          <p className="text-xs text-neutral-mid">{t.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-mid">{t.plan?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.subscription_status} />
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.policyCount}</td>
                        <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.knowledgeCount}</td>
                        <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.queriesThisMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PlatformShell>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    trialling: 'bg-blue-100 text-blue-700',
    past_due:  'bg-orange-100 text-orange-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
