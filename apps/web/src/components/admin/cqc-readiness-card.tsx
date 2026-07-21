'use client'

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { ShieldCheck, TrendingUp, Info } from 'lucide-react'

type Readiness = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['readiness']>>

const RAG_BAR:  Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-400', none: 'bg-gray-200' }
const RAG_TEXT: Record<string, string> = { green: 'text-green-700', amber: 'text-amber-700', red: 'text-red-700', none: 'text-neutral-mid' }
const RAG_RING: Record<string, string> = { green: 'text-green-500', amber: 'text-amber-400', red: 'text-red-400', none: 'text-gray-300' }

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 96, h = 30
  const step = w / (points.length - 1)
  const path = points.map((v, i) => `${(i * step).toFixed(1)},${(h - (Math.max(0, Math.min(100, v)) / 100) * h).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg width={w} height={h} className="overflow-visible text-teal">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - (Math.max(0, Math.min(100, last)) / 100) * h} r="2" fill="currentColor" />
    </svg>
  )
}

export function CqcReadinessCard({ token, userId }: { token: string; userId?: string }) {
  const ck = `cqc-readiness-${userId ?? 'me'}`
  const cached = persistentCache.get<Readiness>(ck)
  const [data, setData]     = useState<Readiness | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    createApiClient(token).analytics.readiness()
      .then(d => { setData(d); persistentCache.set(ck, d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <div className="mb-6 h-40 animate-pulse rounded-card bg-gray-50" />
  if (!data || (!data.has_audit && !data.has_policy)) return null

  const overall = data.overall

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="shrink-0 text-teal" />
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-neutral-dark">
            CQC Readiness Score
            <span className="group relative inline-flex">
              <Info size={13} className="cursor-help text-neutral-mid hover:text-neutral-dark" />
              <span className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-gray-200 bg-white p-3 text-[11px] font-normal leading-relaxed text-neutral-dark opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
                Blends two signals per CQC key question: how your audits are performing <strong>in practice</strong> (AI-scored from your completed monthly audits) and how well your policies cover the regulations <strong>on paper</strong>. The overall score is the mean of the five domains, snapshotted monthly so you can track the trend. It is an internal readiness indicator to focus improvement, not a prediction of your CQC rating.
              </span>
            </span>
          </h2>
          <p className="text-xs text-neutral-mid">If an inspector walked in tomorrow, how ready are you? Blends audit performance with policy coverage.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
        {/* Overall */}
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" className="text-gray-100" stroke="currentColor" strokeWidth="3.2" />
            <circle cx="18" cy="18" r="15.9" fill="none" className={RAG_RING[data.rag] ?? RAG_RING.none} stroke="currentColor" strokeWidth="3.2" strokeDasharray={`${overall ?? 0} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-neutral-dark">{overall ?? '—'}</span>
            <span className={`text-[10px] font-semibold ${RAG_TEXT[data.rag]}`}>{data.band}</span>
          </div>
        </div>

        {/* Domains */}
        <div className="min-w-[240px] flex-1 space-y-2">
          {data.domains.map(d => (
            <div key={d.key} className="flex items-center gap-2.5">
              <span className="w-20 shrink-0 text-xs text-neutral-mid">{d.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-2 rounded-full ${RAG_BAR[d.rag]}`} style={{ width: `${d.score ?? 0}%` }} />
              </div>
              <span className={`w-7 text-right text-xs font-semibold ${RAG_TEXT[d.rag]}`}>{d.score ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Trend */}
        {data.trend.length >= 2 && (
          <div className="shrink-0">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid"><TrendingUp size={11} /> Trend</p>
            <Sparkline points={data.trend.map(p => p.overall)} />
            <p className="mt-1 text-[10px] text-neutral-mid">{data.trend.length} month{data.trend.length === 1 ? '' : 's'}</p>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-1.5 border-t border-gray-50 pt-3 text-[11px] leading-relaxed text-neutral-mid">
        <Info size={12} className="mt-0.5 shrink-0" />
        An internal readiness indicator, not a prediction of your CQC rating. {!data.has_audit && 'Complete a monthly audit (e.g. the SAF Review) to add the in-practice signal. '}{!data.has_policy && 'Run Regulation coverage on the Policy Gaps page to add the on-paper signal.'}{data.has_audit && data.has_policy && 'Each score blends how your audits are performing with how well your policies cover the regulations, per CQC key question. It updates as you complete audits and improve policies, and trends monthly.'}
      </p>
    </div>
  )
}
