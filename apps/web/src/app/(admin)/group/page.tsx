'use client'

// Group overview — a multi-site (Enterprise) console that benchmarks compliance
// across every home in the group. Reuses the existing site-switch flow so a
// regional admin can jump straight into any home.

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import { Building2, Users, GraduationCap, ClipboardCheck, ShieldCheck, TrendingUp, AlertTriangle, Loader2, ArrowRight, Check } from 'lucide-react'

type Overview = Awaited<ReturnType<ReturnType<typeof createApiClient>['sites']['overview']>>

// Colour a compliance percentage: green strong, amber ok, red weak, grey no data.
function pctColour(pct: number | null): string {
  if (pct === null) return 'text-gray-300'
  if (pct >= 80) return 'text-green-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}
function pctText(pct: number | null): string {
  return pct === null ? '—' : `${pct}%`
}

function SummaryCard({ label, value, Icon, colour }: { label: string; value: string; Icon: any; colour: string }) {
  return (
    <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-mid">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10"><Icon size={15} className="text-teal" /></div>
      </div>
      <p className={`text-2xl font-bold ${colour}`}>{value}</p>
    </div>
  )
}

export default function GroupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).sites.overview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  async function openSite(id: string) {
    if (!session?.accessToken || switching) return
    setSwitching(id)
    try {
      const result = await createApiClient(session.accessToken).sites.switch(id)
      await signIn('credentials', {
        redirect:      false,
        mode:          'switch',
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        tenant_name:   result.tenant.name,
        user_name:     session.user.name  ?? '',
        user_email:    session.user.email ?? '',
      })
      pageCache.clear()
      router.push('/dashboard')
      router.refresh()
    } catch {
      setSwitching(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  if (!data || !data.is_group) {
    return (
      <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <Building2 size={34} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-neutral-dark">This account has a single site</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-mid">
          The group overview benchmarks compliance across multiple homes. Add another site from
          Settings, and it will appear here alongside this one.
        </p>
      </div>
    )
  }

  const s = data.summary
  // Rank the homes by overall compliance, strongest first.
  const sites = [...data.sites].sort((a, b) => (b.overall_pct ?? -1) - (a.overall_pct ?? -1))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-dark">Group overview</h1>
        <p className="mt-0.5 text-sm text-neutral-mid">Compliance across all {s.sites} homes in your group. Click a home to open it.</p>
      </div>

      {/* Group summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Homes"      value={String(s.sites)}          Icon={Building2}      colour="text-neutral-dark" />
        <SummaryCard label="Staff"      value={String(s.staff)}          Icon={Users}          colour="text-neutral-dark" />
        <SummaryCard label="Training"   value={pctText(s.training_pct)}   Icon={ShieldCheck}    colour={pctColour(s.training_pct)} />
        <SummaryCard label="Onboarding" value={pctText(s.onboarding_pct)} Icon={GraduationCap}  colour={pctColour(s.onboarding_pct)} />
        <SummaryCard label="Audits"     value={pctText(s.audit_pct)}      Icon={ClipboardCheck} colour={pctColour(s.audit_pct)} />
        <SummaryCard label="Overall"    value={pctText(s.overall_pct)}    Icon={TrendingUp}     colour={pctColour(s.overall_pct)} />
      </div>

      {/* Benchmarking table */}
      <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Homes, ranked by overall compliance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-neutral-mid">
                <th className="px-5 py-3 text-left">Home</th>
                <th className="px-3 py-3 text-center">Staff</th>
                <th className="px-3 py-3 text-center">Training</th>
                <th className="px-3 py-3 text-center">Onboarding</th>
                <th className="px-3 py-3 text-center">Audits</th>
                <th className="px-3 py-3 text-center">Overall</th>
                <th className="px-3 py-3 text-center">Attention</th>
                <th className="px-5 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => (
                <tr key={site.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-neutral-dark">{site.name}</p>
                      {site.is_current && <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium text-teal">Current</span>}
                      {site.is_root && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">HQ</span>}
                    </div>
                    <p className="text-xs text-neutral-mid">{site.account_number}</p>
                  </td>
                  <td className="px-3 py-3 text-center text-neutral-dark">{site.staff}</td>
                  <td className={`px-3 py-3 text-center font-semibold ${pctColour(site.training.pct)}`}>{pctText(site.training.pct)}</td>
                  <td className={`px-3 py-3 text-center font-semibold ${pctColour(site.onboarding.pct)}`}>{pctText(site.onboarding.pct)}</td>
                  <td className={`px-3 py-3 text-center font-semibold ${pctColour(site.audits.pct)}`}>{pctText(site.audits.pct)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                      site.overall_pct === null ? 'bg-gray-50 text-gray-300'
                      : site.overall_pct >= 80 ? 'bg-green-50 text-green-700'
                      : site.overall_pct >= 60 ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-600'}`}>
                      {pctText(site.overall_pct)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {site.overdue > 0
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle size={12} /> {site.overdue}</span>
                      : <span className="text-xs text-neutral-mid">0</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {site.is_current ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal"><Check size={13} /> You are here</span>
                    ) : (
                      <button
                        onClick={() => openSite(site.id)}
                        disabled={!!switching}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal-light/40 disabled:opacity-50"
                      >
                        {switching === site.id ? <><Loader2 size={13} className="animate-spin" /> Opening…</> : <>Open <ArrowRight size={13} /></>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> 80%+ strong</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> 60–79% watch</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> below 60% act</span>
          <span className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-700" /> overdue inductions + expired training</span>
        </div>
      </div>
    </div>
  )
}
