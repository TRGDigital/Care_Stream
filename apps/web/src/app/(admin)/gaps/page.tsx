'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { AlertTriangle, CheckCircle2, FileQuestion, ShieldAlert, TrendingUp } from 'lucide-react'

type GapsData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gaps']>>

export default function GapsPage() {
  const { data: session } = useSession()
  const [data,    setData]    = useState<GapsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.gaps()
      .then(setData)
      .catch((e: any) => setError(e.message ?? 'Failed to load gap analysis'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-card bg-gray-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-card border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  const uncoveredRegs = data.regulation_gaps.filter(r => !r.covered)
  const coveredRegs   = data.regulation_gaps.filter(r => r.covered)

  const scoreColour =
    data.coverage_score >= 80 ? 'text-green-600' :
    data.coverage_score >= 50 ? 'text-amber-600' :
    'text-red-600'

  const scoreBg =
    data.coverage_score >= 80 ? 'bg-green-50 border-green-100' :
    data.coverage_score >= 50 ? 'bg-amber-50 border-amber-100' :
    'bg-red-50 border-red-100'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-dark">Policy Gap Detection</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          Based on staff questions that went unanswered and regulations not yet covered by your policy library.
        </p>
      </div>

      {/* Headline metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-card border px-6 py-5 ${scoreBg}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Coverage score</p>
          <p className={`text-4xl font-extrabold ${scoreColour}`}>{data.coverage_score}%</p>
          <p className="mt-1 text-xs text-neutral-mid">
            {data.meta.regulations_covered} of {data.meta.regulations_total} regulations covered
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white px-6 py-5 shadow-card">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Unanswered questions</p>
          <p className="text-4xl font-extrabold text-neutral-dark">{data.meta.no_match_total}</p>
          <p className="mt-1 text-xs text-neutral-mid">In the last {data.meta.days_analysed} days</p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white px-6 py-5 shadow-card">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Regulation gaps</p>
          <p className="text-4xl font-extrabold text-neutral-dark">{uncoveredRegs.length}</p>
          <p className="mt-1 text-xs text-neutral-mid">Regulations with no matching policy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Unanswered question themes */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <FileQuestion size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-neutral-dark">Top unanswered question themes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.unanswered_themes.length === 0 ? (
              <div className="flex items-center gap-3 px-6 py-5">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-sm text-neutral-mid">No recurring unanswered questions — great coverage.</p>
              </div>
            ) : data.unanswered_themes.map(theme => (
              <div key={theme.theme} className="px-6 py-4">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <p className="font-semibold capitalize text-neutral-dark">{theme.theme}</p>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    {theme.count} {theme.count === 1 ? 'question' : 'questions'}
                  </span>
                </div>
                <ul className="space-y-1">
                  {theme.sample_questions.map((q, i) => (
                    <li key={i} className="truncate text-xs text-neutral-mid">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <a
                    href="/admin/policies"
                    className="text-xs font-semibold text-teal hover:underline"
                  >
                    Upload a policy to cover this →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulation gaps */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <ShieldAlert size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-neutral-dark">Regulations not yet covered</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {uncoveredRegs.length === 0 ? (
              <div className="flex items-center gap-3 px-6 py-5">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-sm text-neutral-mid">All known regulations are covered — well done.</p>
              </div>
            ) : uncoveredRegs.map(reg => (
              <div key={reg.reference_key} className="px-6 py-4">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="font-semibold text-neutral-dark">{reg.official_name}</p>
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
                </div>
                <p className="mb-1 text-xs text-neutral-mid">{reg.summary}</p>
                <p className="mb-3 text-xs italic text-neutral-mid">{reg.care_home_context}</p>
                <a
                  href="/admin/policies"
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Add a policy →
                </a>
              </div>
            ))}
          </div>

          {coveredRegs.length > 0 && (
            <details className="border-t border-gray-100">
              <summary className="cursor-pointer px-6 py-3 text-xs font-medium text-neutral-mid hover:text-neutral-dark">
                {coveredRegs.length} regulation{coveredRegs.length > 1 ? 's' : ''} already covered
              </summary>
              <div className="divide-y divide-gray-50">
                {coveredRegs.map(reg => (
                  <div key={reg.reference_key} className="flex items-center gap-3 px-6 py-3">
                    <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                    <p className="text-sm text-neutral-mid">{reg.official_name}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

      </div>

      {data.meta.no_match_total === 0 && data.unanswered_themes.length === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-card border border-green-100 bg-green-50 px-6 py-5">
          <TrendingUp size={20} className="text-green-600" />
          <div>
            <p className="font-semibold text-green-800">No gaps detected in the last 90 days.</p>
            <p className="text-sm text-green-700">Every staff question was matched to a policy. Keep your library up to date and check back regularly.</p>
          </div>
        </div>
      )}
    </div>
  )
}
