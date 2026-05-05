'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TenantSummary } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-dark">Clients</h1>
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
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3 text-right">Policies</th>
                  <th className="px-4 py-3 text-right">Knowledge</th>
                  <th className="px-4 py-3 text-right">All queries</th>
                  <th className="px-4 py-3 text-right">30d queries</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => (
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
                    <td className="px-4 py-3 text-right">{t.stats.userCount}</td>
                    <td className="px-4 py-3 text-right">{t.stats.policyCount}</td>
                    <td className="px-4 py-3 text-right">{t.stats.knowledgeCount}</td>
                    <td className="px-4 py-3 text-right">{t.stats.queryCount}</td>
                    <td className="px-4 py-3 text-right">{t.stats.queriesThisMonth}</td>
                    <td className="px-4 py-3 text-neutral-mid text-xs">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
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
