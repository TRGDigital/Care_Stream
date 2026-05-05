'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TenantDetail } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ClientDetailPage() {
  const token                   = usePlatformAuth()
  const { id }                  = useParams<{ id: string }>()
  const [detail,  setDetail]    = useState<TenantDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [tab,     setTab]       = useState<'policies' | 'queries'>('policies')

  useEffect(() => {
    if (!token || !id) return
    createPlatformClient(token).tenants.get(id)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, id])

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/platform/clients" className="text-neutral-mid hover:text-teal">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-semibold text-neutral-dark">
            {detail?.tenant.name ?? 'Loading…'}
          </h1>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : detail && (
          <div className="space-y-6">
            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Staff',             value: detail.userCount    },
                { label: 'Active policies',   value: detail.policies.filter((p: any) => p.status === 'active').length },
                { label: 'Knowledge entries', value: detail.knowledgeCount },
                { label: 'Total queries',     value: detail.recentQueries.length < 20
                    ? detail.recentQueries.length + ' (showing 20 most recent)'
                    : '20+ (showing recent)' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-neutral-mid">{label}</p>
                  <p className="mt-1 text-xl font-bold text-neutral-dark">{value}</p>
                </div>
              ))}
            </div>

            {/* Tenant info */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Account details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  { label: 'Slug',          value: detail.tenant.slug },
                  { label: 'Email domain',  value: detail.tenant.email_domain },
                  { label: 'Plan',          value: (detail.tenant.plan as any)?.name ?? '—' },
                  { label: 'Status',        value: detail.tenant.subscription_status },
                  { label: 'Branding sign-off', value: detail.tenant.branding_signoff },
                  { label: 'Joined',        value: new Date(detail.tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-neutral-mid">{label}</dt>
                    <dd className="mt-0.5 font-medium text-neutral-dark">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Tabs: policies / queries */}
            <div>
              <div className="mb-4 flex gap-1 border-b border-gray-200">
                {(['policies', 'queries'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                      tab === t ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'
                    }`}
                  >
                    {t === 'policies' ? `Policies (${detail.policies.length})` : `Recent queries`}
                  </button>
                ))}
              </div>

              {tab === 'policies' && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                      <tr>
                        <th className="px-4 py-3">Policy name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Version</th>
                        <th className="px-4 py-3">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.policies.map((p: any) => (
                        <tr key={p.id} className="hover:bg-neutral-light/50">
                          <td className="px-4 py-3 font-medium text-neutral-dark">{p.name}</td>
                          <td className="px-4 py-3 text-neutral-mid capitalize">{p.document_category.replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === 'active' ? 'bg-green-100 text-green-700' :
                              p.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-mid">v{p.version}</td>
                          <td className="px-4 py-3 text-xs text-neutral-mid">
                            {new Date(p.created_at).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'queries' && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                      <tr>
                        <th className="px-4 py-3">Query</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Lang</th>
                        <th className="px-4 py-3">No match</th>
                        <th className="px-4 py-3 text-right">Time (ms)</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.recentQueries.map((q: any) => (
                        <tr key={q.id} className="hover:bg-neutral-light/50">
                          <td className="max-w-xs truncate px-4 py-3 text-neutral-dark">{q.query_text}</td>
                          <td className="px-4 py-3 text-neutral-mid">{q.intent_type}</td>
                          <td className="px-4 py-3 text-neutral-mid">{q.language_detected}</td>
                          <td className="px-4 py-3">
                            {q.no_match ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Yes</span>
                            ) : (
                              <span className="text-xs text-neutral-mid">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-mid">{q.response_time_ms}</td>
                          <td className="px-4 py-3 text-xs text-neutral-mid">
                            {new Date(q.created_at).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
