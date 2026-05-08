'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TenantDetail } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function ClientDetailPage() {
  const token = usePlatformAuth()
  const { id } = useParams<{ id: string }>()

  const [detail,  setDetail]  = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    if (!token || !id) return
    createPlatformClient(token).tenants.get(id)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, id])

  async function handleSeedTenant() {
    if (!token || !id) return
    setSeeding(true); setSeedMsg(''); setError(null)
    try {
      const result = await createPlatformClient(token).seeds.seedTenant(id)
      setSeedMsg(`${result.seeded} new entries added, ${result.skipped} already present.`)
    } catch (e: any) {
      setError(e.message ?? 'Seeding failed')
    } finally {
      setSeeding(false)
    }
  }

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/platform/clients" className="text-neutral-mid hover:text-teal">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-dark">
                {detail?.tenant.name ?? 'Loading…'}
              </h1>
              {detail && (
                <p className="text-xs text-neutral-mid">
                  {detail.tenant.slug} · {(detail.tenant.plan as any)?.name ?? 'No plan'}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSeedTenant} disabled={seeding || loading} size="md" variant="secondary">
            <Sparkles size={14} className="mr-1.5" />
            {seeding ? 'Seeding…' : 'Seed knowledge'}
          </Button>
        </div>

        {seedMsg && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{seedMsg}</div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : detail && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Staff',             value: detail.userCount },
                { label: 'Active policies',   value: detail.policies.filter((p: any) => p.status === 'active').length },
                { label: 'Knowledge entries', value: detail.knowledgeCount },
                { label: 'Recent queries',    value: detail.recentQueries.length, sub: 'last 20 shown' },
              ].map(({ label, value, sub }: any) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-neutral-mid">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-dark">{value}</p>
                  {sub && <p className="mt-0.5 text-xs text-neutral-mid">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Account details */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Account details</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  { label: 'Slug',              value: detail.tenant.slug },
                  { label: 'Email domain',      value: detail.tenant.email_domain },
                  { label: 'Plan',              value: (detail.tenant.plan as any)?.name ?? '—' },
                  { label: 'Status',            value: detail.tenant.subscription_status },
                  { label: 'Branding sign-off', value: detail.tenant.branding_signoff },
                  { label: 'Joined',            value: new Date(detail.tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-neutral-mid">{label}</dt>
                    <dd className="mt-0.5 font-medium text-neutral-dark">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Policies */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-neutral-dark">Policies ({detail.policies.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Version</th>
                    <th className="px-4 py-2">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.policies.map((p: any) => (
                    <tr key={p.id} className="hover:bg-neutral-light/50">
                      <td className="px-4 py-2 font-medium text-neutral-dark">{p.name}</td>
                      <td className="px-4 py-2 text-xs text-neutral-mid capitalize">
                        {p.document_category.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'active'     ? 'bg-green-100 text-green-700'  :
                          p.status === 'processing' ? 'bg-blue-100 text-blue-700'   :
                                                      'bg-gray-100 text-gray-600'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-neutral-mid">v{p.version}</td>
                      <td className="px-4 py-2 text-xs text-neutral-mid">
                        {new Date(p.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
