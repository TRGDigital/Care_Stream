'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TenantSummary, type PlanLimits } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { AlertTriangle, Building2, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used = 0, limit, label }: { used?: number; limit: number | null; label: string }) {
  const safeUsed = used ?? 0
  if (limit === null) {
    return (
      <div className="min-w-[80px]">
        <p className="text-right text-xs text-neutral-mid">{safeUsed.toLocaleString()} / ∞</p>
        <p className="text-right text-[10px] text-neutral-mid/60">{label}</p>
      </div>
    )
  }
  const pct     = Math.min(100, Math.round((safeUsed / limit) * 100))
  const colour  = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-teal'
  const textCol = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-neutral-mid'

  return (
    <div className="min-w-[80px]">
      <p className={`text-right text-xs font-medium ${textCol}`}>
        {safeUsed.toLocaleString()} / {limit.toLocaleString()}
      </p>
      <div className="mt-0.5 h-1 w-full rounded-full bg-gray-200">
        <div className={`h-1 rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-right text-[10px] text-neutral-mid/60">{label}</p>
    </div>
  )
}

// ─── Near-limit warning indicator ────────────────────────────────────────────

function atRisk(stats: TenantSummary['stats'], plan: PlanLimits | null): boolean {
  if (!plan) return false
  const checks = [
    { used: stats.queriesThisMonth     ?? 0, limit: plan.monthly_query_limit          },
    { used: stats.policyCount          ?? 0, limit: plan.max_policies                 },
    { used: stats.activeUserCount      ?? 0, limit: plan.max_staff_users              },
    { used: stats.handbookCount        ?? 0, limit: plan.max_handbooks                },
    { used: stats.manualKnowledgeCount ?? 0, limit: plan.max_manual_knowledge_entries },
  ]
  return checks.some(({ used, limit }) => limit != null && limit > 0 && used / limit >= 0.9)
}

export default function ClientsPage() {
  const token                   = usePlatformAuth()
  const [tenants, setTenants]   = useState<TenantSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [search,  setSearch]    = useState('')

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).tenants.list()
      .then(data => setTenants(data.tenants))
      .catch(e  => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const filtered = search
    ? tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase())
      )
    : tenants

  const atRiskCount = filtered.filter(t => atRisk(t.stats, t.plan)).length

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Clients</h1>
            {atRiskCount > 0 && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle size={12} />
                {atRiskCount} {atRiskCount === 1 ? 'client is' : 'clients are'} at or near a plan limit
              </p>
            )}
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Queries (this month)</th>
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3 text-right">Policies</th>
                  <th className="px-4 py-3 text-right">Handbooks</th>
                  <th className="px-4 py-3 text-right">Manual KB</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => {
                  const risk = atRisk(t.stats, t.plan)
                  return (
                    <tr key={t.id} className={`hover:bg-neutral-light/50 ${risk ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                            {t.name}
                          </Link>
                          {risk && <AlertTriangle size={12} className="shrink-0 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-neutral-mid">{t.slug}</p>
                          {t.sub_tenant_count > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              <Building2 size={10} />
                              {t.sub_tenant_count} {t.sub_tenant_count === 1 ? 'site' : 'sites'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-mid">{t.plan?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.subscription_status} />
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar
                          used={t.stats.queriesThisMonth}
                          limit={t.plan?.monthly_query_limit ?? null}
                          label="queries"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar
                          used={t.stats.activeUserCount}
                          limit={t.plan?.max_staff_users ?? null}
                          label="staff"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar
                          used={t.stats.policyCount}
                          limit={t.plan?.max_policies ?? null}
                          label="policies"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar
                          used={t.stats.handbookCount}
                          limit={t.plan?.max_handbooks ?? null}
                          label="handbooks"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar
                          used={t.stats.manualKnowledgeCount}
                          limit={t.plan?.max_manual_knowledge_entries ?? null}
                          label="manual KB"
                        />
                      </td>
                      <td className="px-4 py-3 text-neutral-mid text-xs">
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-mid">No clients found.</p>
            )}
          </div>
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
