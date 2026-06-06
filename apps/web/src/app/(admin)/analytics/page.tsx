'use client'

// §10.2/10.3 — Analytics dashboard: basic metrics for all plans,
// advanced metrics for Professional plan (has_advanced_analytics = true).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import { TrendingUp, TrendingDown, Minus, Download, Info, GraduationCap, CheckCircle2, AlertCircle, Clock, ClipboardCheck, Users, Activity, Zap, Brain, RefreshCw, Lightbulb } from 'lucide-react'
import type { ElementType } from 'react'
import { clsx } from 'clsx'

// ─── Language names ────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
}

const CATEGORY_LABELS: Record<string, string> = {
  internal_policy:      'Internal policy',
  staff_handbook:       'Staff handbook',
  external_regulation:  'Ext. regulation',
  unknown:              'Unknown',
}

const DOMAIN_LABELS: Record<string, string> = {
  safe:        'Safe',
  effective:   'Effective',
  caring:      'Caring',
  responsive:  'Responsive',
  well_led:    'Well-led',
}

function scoreColor(score: number | null) {
  if (score === null || score === 0) return 'text-neutral-mid'
  if (score >= 80) return 'text-status-success'
  if (score >= 60) return 'text-amber-500'
  if (score >= 40) return 'text-orange-500'
  return 'text-status-error'
}

function fmtSecs(secs: number | null | undefined) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return m ? `${m}m${s ? ` ${s}s` : ''}` : `${s}s`
}

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-flex shrink-0">
      <Info size={13} className="cursor-pointer text-neutral-mid/60 hover:text-teal" />
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md bg-neutral-dark px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {text}
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-dark" />
      </div>
    </div>
  )
}

function Card({ title, children, action, info }: { title: string; children: React.ReactNode; action?: React.ReactNode; info?: string }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-neutral-dark">{title}</h2>
          {info && <InfoTooltip text={info} />}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function StatCard({
  label, value, changePct, invertTrend = false, suffix = '', info, Icon, iconBg, iconColor,
}: {
  label: string; value: string | number; changePct?: number | null; invertTrend?: boolean; suffix?: string; info?: string
  Icon?: ElementType; iconBg?: string; iconColor?: string
}) {
  const positive = invertTrend ? (changePct ?? 0) < 0 : (changePct ?? 0) > 0
  const negative = invertTrend ? (changePct ?? 0) > 0 : (changePct ?? 0) < 0

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">{label}</p>
          {info && <InfoTooltip text={info} />}
        </div>
        {Icon && (
          <div className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', iconBg ?? 'bg-gray-100')}>
            <Icon size={15} className={iconColor ?? 'text-neutral-mid'} />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-dark">
        {typeof value === 'number' ? value.toLocaleString('en-GB') : value}{suffix}
      </p>
      {changePct !== undefined && changePct !== null && (
        <div className={clsx('mt-1 flex items-center gap-1 text-xs font-medium', positive ? 'text-status-success' : negative ? 'text-status-error' : 'text-neutral-mid')}>
          {positive ? <TrendingUp size={12} /> : negative ? <TrendingDown size={12} /> : <Minus size={12} />}
          {changePct > 0 ? '+' : ''}{changePct}% vs last month
        </div>
      )}
    </div>
  )
}

function HBar({ label, count, total, color = 'bg-teal' }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-neutral-mid">
        <span>{label}</span>
        <span>{count.toLocaleString('en-GB')} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={clsx('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PlanUsageBar({ used, limit, percent }: { used: number; limit: number; percent: number }) {
  const color = percent >= 95 ? 'bg-status-error' : percent >= 80 ? 'bg-status-warning' : 'bg-teal'
  const textColor = percent >= 95 ? 'text-status-error' : percent >= 80 ? 'text-status-warning' : 'text-teal'
  return (
    <div className="mb-6 rounded-card bg-white p-5 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Plan usage this month</p>
        <p className={clsx('text-sm font-semibold', textColor)}>{used.toLocaleString()} / {limit.toLocaleString()} queries ({percent}%)</p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={clsx('h-3 rounded-full transition-all', color)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {percent >= 80 && (
        <p className={clsx('mt-2 text-xs font-medium', textColor)}>
          {percent >= 95 ? 'Warning: approaching monthly limit.' : 'Heads up: 80% of monthly limit used.'}
        </p>
      )}
    </div>
  )
}

function EmptyTab({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
      <p className="mx-auto max-w-md text-sm text-neutral-mid">{children}</p>
    </div>
  )
}

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 mt-8 flex items-start gap-3 border-b border-gray-100 pb-3">
      <div className="mt-1 h-5 w-1 shrink-0 rounded-full bg-teal" />
      <div>
        <h2 className="text-lg font-semibold text-neutral-dark">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-neutral-mid">{subtitle}</p>}
      </div>
    </div>
  )
}

// Lightweight area chart for the open-gap trend over time.
function GapTrendChart({ points }: { points: Array<{ date: string; open_gaps: number }> }) {
  const W = 560, H = 120, P = 8
  const max = Math.max(1, ...points.map(p => p.open_gaps))
  const n   = points.length
  const x   = (i: number) => P + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * P))
  const y   = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.open_gaps).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - P} L ${x(0).toFixed(1)} ${H - P} Z`
  const first = points[0], last = points[n - 1]
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none">
        <defs><linearGradient id="gapgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#gapgrad)" />
        <path d={line} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.open_gaps)} r={n <= 30 ? 2 : 0} fill="#f59e0b" />)}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-neutral-mid">
        <span>{new Date(first.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(last.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

// ─── CSV export helper ─────────────────────────────────────────────────────────

function exportLanguageCsv(langRows: Array<{ language: string; month: string; count: number }>) {
  const months    = [...new Set(langRows.map(r => r.month))].sort()
  const languages = [...new Set(langRows.map(r => r.language))]
  const pivot     = new Map<string, Map<string, number>>()
  for (const r of langRows) {
    if (!pivot.has(r.month)) pivot.set(r.month, new Map())
    pivot.get(r.month)!.set(r.language, r.count)
  }
  const header = ['Month', ...languages.map(l => LANG_NAMES[l] ?? l)].join(',')
  const rows    = months.map(m => [m, ...languages.map(l => pivot.get(m)?.get(l) ?? 0)].join(','))
  const csv     = [header, ...rows].join('\n')
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = `language-breakdown-${new Date().toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'staff' | 'gaps' | 'training' | 'compliance' | 'cqc' | 'advanced'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'staff',      label: 'Staff' },
  { id: 'gaps',       label: 'Knowledge gaps' },
  { id: 'training',   label: 'Training' },
  { id: 'compliance', label: 'Audits' },
  { id: 'cqc',        label: 'CQC Staff Prep' },
  { id: 'advanced',   label: 'Advanced' },
]

export default function AnalyticsPage() {
  const { data: session }           = useSession()
  const analyticsCache = pageCache.get<{ data: any; training: any; gaps: any; cqcPrep: any; audits: any; risk: any; reading: any; inductionPerf: any; kgaps: any; annual: any }>('admin-analytics')
  const [data,         setData]     = useState<any>(analyticsCache?.data ?? null)
  const [trainingData, setTraining] = useState<any>(analyticsCache?.training ?? null)
  const [gapsData,     setGaps]     = useState<any>(analyticsCache?.gaps ?? null)
  const [cqcPrepData,  setCqcPrep]  = useState<any>(analyticsCache?.cqcPrep ?? null)
  const [auditData,    setAuditData] = useState<any>(analyticsCache?.audits ?? null)
  const [riskData,     setRiskData]  = useState<any>(analyticsCache?.risk ?? null)
  const [readingData,  setReadingData] = useState<any>(analyticsCache?.reading ?? null)
  const [inductionPerf, setInductionPerf] = useState<any>(analyticsCache?.inductionPerf ?? null)
  const [kgaps,        setKgaps]    = useState<any>(analyticsCache?.kgaps ?? null)
  const [annual,       setAnnual]   = useState<any>(analyticsCache?.annual ?? null)
  const [digestState,  setDigestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [tab,          setTab]      = useState<TabId>('overview')
  const [loading,      setLoading]  = useState(!analyticsCache)
  const [error,        setError]    = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([
      api.analytics.get(),
      api.analytics.training().catch(() => null),
      api.analytics.trainingGaps().catch(() => null),
      api.analytics.cqcPrep().catch((e: any) => { console.error('[CQC Prep analytics]', e?.message ?? e); return null }),
      api.audits.stats().catch(() => null),
      api.analytics.staffRisk().catch(() => null),
      api.analytics.policyReading().catch(() => null),
      api.analytics.inductionPerformance().catch(() => null),
      api.analytics.knowledgeGaps().catch(() => null),
      api.analytics.annualTraining().catch(() => null),
    ])
      .then(([main, training, gaps, cqcPrep, audits, risk, reading, inductionPerf, kgaps, annual]) => {
        setData(main); setTraining(training); setGaps(gaps); setCqcPrep(cqcPrep); setAuditData(audits); setRiskData(risk); setReadingData(reading); setInductionPerf(inductionPerf); setKgaps(kgaps); setAnnual(annual)
        pageCache.set('admin-analytics', { data: main, training, gaps, cqcPrep, audits, risk, reading, inductionPerf, kgaps, annual })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const now       = new Date()
  const monthName = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  async function sendDigest() {
    if (!session?.accessToken || digestState === 'sending') return
    setDigestState('sending')
    try {
      await createApiClient(session.accessToken).settings.sendKnowledgeGapDigest()
      setDigestState('sent')
      createApiClient(session.accessToken).analytics.knowledgeGaps().then(setKgaps).catch(() => {})
    } catch { setDigestState('error') }
  }

  if (loading) return <p className="text-sm text-neutral-mid">Loading analytics…</p>
  if (error || !data) return <p className="text-sm text-status-error">Failed to load analytics.</p>

  const { basic, advanced } = data

  const thisTotal     = basic.total_queries.this_month
  const channelTotal  = basic.queries_by_channel.chat + basic.queries_by_channel.email
  const intentTotal   = basic.full_vs_summary.full_policy + basic.full_vs_summary.summary + basic.full_vs_summary.follow_up

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-neutral-dark">Analytics — {monthName}</h1>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-gray-200 bg-neutral-light/95 px-6 pt-1 backdrop-blur-sm">
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Staff needing attention ─────────────────────────────────────────── */}
      {tab === 'staff' && riskData && riskData.staff.length > 0 && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-neutral-dark">Staff needing attention</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {riskData.summary.total_flagged}{riskData.summary.high > 0 ? ` · ${riskData.summary.high} urgent` : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {riskData.staff.slice(0, 9).map((s: any) => (
              <Link key={s.id} href={`/staff/${s.id}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2.5 transition-colors hover:border-amber-300">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-dark">{s.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.flags.slice(0, 2).map((f: any, i: number) => (
                      <span key={i} className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${f.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.label}</span>
                    ))}
                    {s.flags.length > 2 && <span className="text-[10px] text-neutral-mid">+{s.flags.length - 2}</span>}
                  </div>
                </div>
                {s.severity === 2 && <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" title="Urgent" />}
              </Link>
            ))}
          </div>
          {riskData.staff.length > 9 && <p className="mt-2 text-xs text-neutral-mid">+{riskData.staff.length - 9} more — open the Staff page to review.</p>}
        </div>
      )}

      {tab === 'overview' && (<>
      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total queries"
          value={basic.total_queries.this_month}
          changePct={basic.total_queries.change_pct}
          info="Total policy questions asked by staff this month, compared to last month."
          Icon={Activity} iconBg="bg-teal-light/60" iconColor="text-teal"
        />
        <StatCard
          label="Active users"
          value={basic.active_users.this_month}
          changePct={basic.active_users.change_pct}
          info="Number of staff members who submitted at least one query this month, compared to last month."
          Icon={Users} iconBg="bg-blue-50" iconColor="text-blue-500"
        />
        <StatCard
          label="No-match rate"
          value={basic.no_match_rate.this_month}
          suffix="%"
          changePct={
            basic.no_match_rate.this_month !== null && basic.no_match_rate.last_month !== null
              ? Math.round((basic.no_match_rate.this_month - basic.no_match_rate.last_month) * 10) / 10
              : null
          }
          invertTrend
          info="Percentage of queries where no matching policy was found. Lower is better — a high rate suggests gaps in your policy library."
          Icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-400"
        />
        <StatCard
          label="Avg response time"
          value={basic.avg_response_ms}
          suffix="ms"
          info="Average time to generate an AI response, in milliseconds. Under 3,000ms is considered good performance."
          Icon={Zap} iconBg="bg-purple-50" iconColor="text-purple-500"
        />
      </div>

      {/* ── Plan usage ──────────────────────────────────────────────────────── */}
      {basic.plan_usage.limit && basic.plan_usage.percent !== null && (
        <PlanUsageBar
          used={basic.plan_usage.used}
          limit={basic.plan_usage.limit}
          percent={basic.plan_usage.percent}
        />
      )}

      {/* ── Channel + Intent split ───────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Queries by channel" info="Shows whether staff are asking questions via the chat interface or sending them by email.">
          <HBar label="Chat"  count={basic.queries_by_channel.chat}  total={channelTotal} color="bg-teal" />
          <HBar label="Email" count={basic.queries_by_channel.email} total={channelTotal} color="bg-teal-light border border-teal/30" />
        </Card>
        <Card title="Intent breakdown" info="How staff are using the system — summarising a policy, requesting the full document, or asking a follow-up question in an ongoing conversation.">
          <HBar label="Summary / question" count={basic.full_vs_summary.summary}     total={intentTotal} color="bg-teal"       />
          <HBar label="Full policy"         count={basic.full_vs_summary.full_policy} total={intentTotal} color="bg-teal-dark"  />
          <HBar label="Follow-up"           count={basic.full_vs_summary.follow_up}   total={intentTotal} color="bg-neutral-mid" />
        </Card>
      </div>

      {/* ── Top policies ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Card title="Most cited policies this month" info="Policies referenced most often in AI responses this month. High citation counts show which policies staff rely on most — useful for prioritising reviews and updates.">
          {basic.top_policies.length === 0 ? (
            <p className="text-sm text-neutral-mid">No queries with policy matches yet this month.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Policy</th>
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Category</th>
                  <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Citations</th>
                </tr>
              </thead>
              <tbody>
                {basic.top_policies.map((p: any, i: number) => (
                  <tr key={p.policy_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-neutral-dark">
                      <span className="mr-2 text-xs text-neutral-mid">{i + 1}.</span>
                      {p.policy_name}
                    </td>
                    <td className="py-2 pr-4 text-xs text-neutral-mid">
                      {CATEGORY_LABELS[p.document_category] ?? p.document_category}
                    </td>
                    <td className="py-2 text-right font-medium text-teal">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Top handbook topics ──────────────────────────────────────────────── */}
      {basic.top_handbook_topics.length > 0 && (
        <div className="mb-6">
          <Card title="Most cited handbook sections this month" info="Staff handbook sections referenced most in responses this month. Highlights which HR and employment topics staff are consulting most frequently.">
            {basic.top_handbook_topics.map((t: any, i: number) => (
              <HBar
                key={t.policy_id}
                label={`${i + 1}. ${t.policy_name}`}
                count={t.count}
                total={basic.top_handbook_topics[0].count}
              />
            ))}
          </Card>
        </div>
      )}
      </>)}

      {/* ── Policy reading engagement ───────────────────────────────────────── */}
      {tab === 'staff' && readingData && readingData.summary.total_sessions > 0 && (
        <>
          <SectionDivider
            title="Policy reading engagement"
            subtitle="How thoroughly staff read induction policies — time, scroll depth and completion"
          />
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Reading sessions" value={readingData.summary.total_sessions} info="Total times staff have opened an induction policy to read it." Icon={Activity} iconBg="bg-teal-light" iconColor="text-teal" />
            <StatCard label="Avg time per read" value={fmtSecs(readingData.summary.avg_seconds)} info="Average active time spent reading a policy (paused when the tab is hidden)." Icon={Clock} iconBg="bg-indigo-50" iconColor="text-indigo-500" />
            <StatCard label="Avg scrolled" value={readingData.summary.avg_scroll_pct ?? 0} suffix="%" info="How far down the policy staff scroll on average — a proxy for how much they actually read." Icon={Activity} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Read to the end" value={readingData.summary.pct_reached_end ?? 0} suffix="%" info="Share of reading sessions where the staff member scrolled (almost) to the end of the policy." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
          </div>
        </>
      )}

      {/* ── Induction question performance ───────────────────────────────────── */}
      {tab === 'gaps' && inductionPerf && inductionPerf.summary.total_answered > 0 && (
        <>
          <SectionDivider
            title="Induction question performance"
            subtitle="How well staff answer induction questions — and where the knowledge gaps are"
          />
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Questions answered" value={inductionPerf.summary.total_answered} info="Total induction questions answered across your team." Icon={GraduationCap} iconBg="bg-teal-light" iconColor="text-teal" />
            <StatCard label="Answered correctly" value={inductionPerf.summary.pct_correct ?? 0} suffix="%" info="Share of induction answers that were correct. Multiple-choice is graded automatically; written answers are AI-checked." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="Staff answering" value={inductionPerf.summary.staff_answered} info="Number of staff who have answered at least one induction question." Icon={Users} iconBg="bg-indigo-50" iconColor="text-indigo-500" />
            <StatCard label="Questions to watch" value={inductionPerf.weak_questions.length} info="Distinct questions that have been answered incorrectly at least once." Icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-500" />
          </div>
        </>
      )}

      {/* ── Knowledge gaps (training + induction, team-wide) ─────────────────── */}
      {tab === 'gaps' && kgaps && (kgaps.summary.open_gaps > 0 || kgaps.summary.learn + kgaps.summary.retry > 0) && (
        <>
          <SectionDivider
            title="Knowledge gaps"
            subtitle="Where your team is getting questions wrong — across training and induction — and how those gaps are being closed"
          />
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Open gaps" value={kgaps.summary.open_gaps} info="Questions currently answered incorrectly across training and induction. These are the gaps still to close." Icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Staff affected" value={kgaps.summary.staff_with_gaps} info="Number of staff with at least one open knowledge gap right now." Icon={Users} iconBg="bg-indigo-50" iconColor="text-indigo-500" />
            <StatCard label="Closed (30 days)" value={kgaps.summary.resolved_30d} info="Gaps a staff member has put right in the last 30 days, via the hub Follow-up." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="Engaged with learning" value={kgaps.summary.engaged_pct ?? 0} suffix="%" info="Of gaps closed, the share where staff worked through the policy-grounded micro-lesson ('Learn & retry') rather than just re-answering ('Just retry')." Icon={GraduationCap} iconBg="bg-teal-light" iconColor="text-teal" />
          </div>

          {/* Trend over time + weekly digest control */}
          <div className="mb-4">
            <Card
              title="Knowledge gaps over time"
              info="Open gaps recorded once a day. The weekly digest emails admins a summary every Monday, and nudges staff with open gaps to complete their Follow-up — both honour the 'knowledge_gap_digest' email preference."
              action={
                <div className="flex items-center gap-2">
                  {digestState === 'sent'  && <span className="text-xs font-medium text-green-600">Sent ✓</span>}
                  {digestState === 'error' && <span className="text-xs font-medium text-status-error">Failed</span>}
                  <button onClick={sendDigest} disabled={digestState === 'sending'} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
                    {digestState === 'sending' ? 'Sending…' : 'Send digest now'}
                  </button>
                </div>
              }
            >
              {kgaps.trend && kgaps.trend.length >= 2
                ? <GapTrendChart points={kgaps.trend} />
                : <p className="py-6 text-center text-sm text-neutral-mid">No history yet — a snapshot is recorded daily. Use <span className="font-medium">Send digest now</span> to record the first point and email yourself this week&apos;s digest.</p>}
            </Card>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Most-missed questions (combined) */}
            <Card title="Most-missed questions" info="Questions most often answered incorrectly across the team — training and induction combined. The strongest signal of where to reinforce knowledge.">
              {kgaps.top_missed.length === 0 ? <p className="py-2 text-sm text-neutral-mid">No gaps right now. 🎉</p> : (
                <ul className="divide-y divide-gray-50">
                  {kgaps.top_missed.map((q: any, i: number) => (
                    <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-dark">{q.question || q.topic}</p>
                        <p className="mt-0.5 text-xs text-neutral-mid">
                          <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${q.source === 'training' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'}`}>{q.source === 'training' ? 'Training' : 'Induction'}</span>
                          {q.topic} · {q.staff_count} staff
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium leading-none text-red-600">{q.miss_count} wrong</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Weakest topics */}
            <Card title="Weakest topics" info="Training modules and induction flows with the most open gaps — the areas to prioritise for refresher training.">
              {kgaps.weak_topics.length === 0 ? <p className="py-2 text-sm text-neutral-mid">No gaps right now. 🎉</p> : (
                <ul className="space-y-2.5">
                  {kgaps.weak_topics.map((t: any, i: number) => {
                    const max = kgaps.weak_topics[0].gaps || 1
                    return (
                      <li key={i}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-1.5 text-neutral-dark">
                            {t.source === 'training' ? <Brain size={12} className="shrink-0 text-teal" /> : <GraduationCap size={12} className="shrink-0 text-indigo-500" />}
                            <span className="truncate">{t.topic}</span>
                          </span>
                          <span className="shrink-0 text-neutral-mid">{t.gaps} gap{t.gaps === 1 ? '' : 's'} · {t.staff} staff</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className={t.source === 'training' ? 'h-full bg-teal' : 'h-full bg-indigo-400'} style={{ width: `${Math.round((t.gaps / max) * 100)}%` }} /></div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Remediation effectiveness */}
          {(kgaps.summary.learn + kgaps.summary.retry > 0) && (
            <Card title="How gaps are being closed" info="When staff get a follow-up question wrong, do they work through the micro-lesson ('Learn & retry') or just re-answer ('Just retry')? A healthy lean towards learning means the reinforcement is landing.">
              <div className="mb-3 flex items-end gap-6">
                <div><p className="text-2xl font-bold text-teal">{kgaps.summary.learn}</p><p className="text-xs text-neutral-mid">Learn &amp; retry</p></div>
                <div><p className="text-2xl font-bold text-neutral-dark">{kgaps.summary.retry}</p><p className="text-xs text-neutral-mid">Just retry</p></div>
                <div className="ml-auto text-right"><p className="text-lg font-semibold text-neutral-dark">{kgaps.summary.engaged_pct ?? 0}%</p><p className="text-xs text-neutral-mid">engaged with learning</p></div>
              </div>
              <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="bg-teal" style={{ width: `${kgaps.summary.engaged_pct ?? 0}%` }} />
                <div className="bg-amber-300" style={{ width: `${100 - (kgaps.summary.engaged_pct ?? 0)}%` }} />
              </div>
              {kgaps.recent_resolutions.length > 0 && (
                <>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Recently closed</p>
                  <ul className="divide-y divide-gray-50">
                    {kgaps.recent_resolutions.map((r: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 py-2">
                        {r.method === 'learn' ? <Lightbulb size={13} className="mt-0.5 shrink-0 text-teal" /> : <RefreshCw size={13} className="mt-0.5 shrink-0 text-neutral-mid" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-neutral-dark"><span className="font-medium">{r.user}</span> — {r.label || (r.source === 'training' ? 'Training question' : 'Induction question')}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-mid">
                            <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${r.method === 'learn' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-neutral-mid'}`}>{r.method === 'learn' ? 'Learn & retry' : 'Just retry'}</span>
                            {fmtWhen(r.when)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── Training compliance ─────────────────────────────────────────────── */}
      {tab === 'training' && trainingData && (
        <>
          <SectionDivider
            title="Training compliance"
            subtitle="Statutory and specialist module completion across your team"
          />

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label:  'Statutory compliance',
                value:  `${trainingData.compliance_rate}%`,
                sub:    `${trainingData.compliant_staff} of ${trainingData.total_staff} staff fully current`,
                colour: trainingData.compliance_rate >= 80 ? 'text-status-success' : trainingData.compliance_rate >= 50 ? 'text-status-warning' : 'text-status-error',
                icon:   CheckCircle2,
              },
              {
                label:  'Correct answer rate',
                value:  trainingData.total_answers > 0 ? `${trainingData.correct_answer_rate}%` : '—',
                sub:    `${trainingData.correct_answers} of ${trainingData.total_answers} MCQ answers correct`,
                colour: 'text-teal',
                icon:   GraduationCap,
              },
              {
                label:  'Expiring within 90 days',
                value:  trainingData.expiring_soon_count,
                sub:    'renewals due soon',
                colour: trainingData.expiring_soon_count > 0 ? 'text-status-warning' : 'text-neutral-dark',
                icon:   Clock,
              },
              {
                label:  'Expired / overdue',
                value:  trainingData.expired_count,
                sub:    'require renewal action',
                colour: trainingData.expired_count > 0 ? 'text-status-error' : 'text-neutral-dark',
                icon:   AlertCircle,
              },
            ].map(({ label, value, sub, colour, icon: Icon }) => (
              <div key={label} className="rounded-card bg-white p-5 shadow-card">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={15} className={colour} />
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">{label}</p>
                </div>
                <p className={clsx('text-2xl font-bold', colour)}>{value}</p>
                <p className="mt-1 text-xs text-neutral-mid">{sub}</p>
              </div>
            ))}
          </div>

          {trainingData.module_breakdown.length > 0 && (
            <div className="mb-6">
              <Card title="Module completion breakdown" info="Completion status for every assigned training module. Shows how many staff have completed, are in progress, or have an expired record for each module.">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Module</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Enrolled</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Complete</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">In progress</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Expired</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingData.module_breakdown.map((m: any) => (
                      <tr key={m.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', m.category === 'statutory' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500')}>
                              {m.category === 'statutory' ? 'S' : 'Sp'}
                            </span>
                            <span className="font-medium text-neutral-dark">{m.name}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center text-neutral-mid">{m.enrolled}</td>
                        <td className="py-2 pr-3 text-center font-medium text-status-success">{m.completed}</td>
                        <td className="py-2 pr-3 text-center text-teal">{m.in_progress}</td>
                        <td className="py-2 pr-3 text-center text-status-error">{m.expired}</td>
                        <td className="py-2 text-right">
                          <span className={clsx('font-semibold', m.completion_rate >= 80 ? 'text-status-success' : m.completion_rate >= 50 ? 'text-status-warning' : 'text-status-error')}>
                            {m.completion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Annual training (AI modules) ─────────────────────────────────────── */}
      {tab === 'training' && annual && annual.summary.assigned > 0 && (
        <>
          <SectionDivider
            title="Annual training"
            subtitle="AI-generated, policy-grounded annual modules — completion, renewals and certificates across your team"
          />
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Completion" value={annual.summary.completion_pct ?? 0} suffix="%" info="Share of assigned annual-training enrolments completed (a certificate is issued on pass)." Icon={GraduationCap} iconBg="bg-teal-light" iconColor="text-teal" />
            <StatCard label="Certificates issued" value={annual.summary.completed} info="Annual training modules completed (passed) across your team — each has a printable certificate on the staff record." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
            <StatCard label="Renewals due" value={annual.summary.renewal_due} info="Completed modules that are overdue or due for renewal within 30 days." Icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Practicals to record" value={annual.summary.practical_due} info="Modules that also need a practical/observed assessment recorded against a completed knowledge module." Icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-400" />
          </div>
          {annual.by_module.length > 0 && (
            <Card title="By module" info="Completion and average assessment score for each published annual module.">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Module</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Assigned</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Completed</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                  <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Rate</th>
                </tr></thead>
                <tbody>
                  {annual.by_module.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-neutral-dark">{m.name}{m.requires_practical && <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">+ practical</span>}</td>
                      <td className="py-2 pr-3 text-center text-neutral-mid">{m.assigned}</td>
                      <td className="py-2 pr-3 text-center font-medium text-status-success">{m.completed}</td>
                      <td className="py-2 pr-3 text-center text-neutral-dark">{m.avg_score !== null ? `${m.avg_score}%` : '—'}</td>
                      <td className="py-2 text-right"><span className={clsx('font-semibold', m.completion_pct >= 80 ? 'text-status-success' : m.completion_pct >= 50 ? 'text-status-warning' : 'text-status-error')}>{m.completion_pct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* ── Training knowledge gaps ──────────────────────────────────────────── */}
      {tab === 'gaps' && gapsData && (gapsData.question_gaps.length > 0 || gapsData.module_summary.length > 0) && (
        <>
          <SectionDivider
            title="Training knowledge gaps"
            subtitle="Questions and topics where staff are consistently struggling — use this to target refresher training"
          />

          {gapsData.module_summary.length > 0 && (
            <div className="mb-6">
              <Card title="Module error rates" info="Percentage of MCQ answers that were incorrect per module. Modules above 30% may warrant additional training focus.">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Module</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Answers</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Incorrect</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Flagged gaps</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Error rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapsData.module_summary.map((m: any) => (
                      <tr key={m.module_id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', m.category === 'statutory' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500')}>
                              {m.category === 'statutory' ? 'S' : 'Sp'}
                            </span>
                            <span className="font-medium text-neutral-dark">{m.module_name}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center text-neutral-mid">{m.total_answers}</td>
                        <td className="py-2 pr-3 text-center text-status-error">{m.incorrect}</td>
                        <td className="py-2 pr-3 text-center">
                          {m.gap_count > 0
                            ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{m.gap_count}</span>
                            : <span className="text-neutral-mid/50">—</span>
                          }
                        </td>
                        <td className="py-2 text-right">
                          <span className={clsx('font-semibold', m.incorrect_rate >= 40 ? 'text-status-error' : m.incorrect_rate >= 25 ? 'text-status-warning' : 'text-status-success')}>
                            {m.incorrect_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {gapsData.question_gaps.length > 0 && (
            <div className="mb-6">
              <Card title="Specific question gaps" info="Questions where 40% or more of staff answered incorrectly (minimum 2 responses). These indicate specific knowledge areas requiring attention.">
                <div className="space-y-3">
                  {gapsData.question_gaps.map((q: any) => (
                    <div key={q.question_id} className="rounded-lg border border-red-100 bg-red-50/40 p-4">
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <p className="text-sm font-medium text-neutral-dark">{q.question_text}</p>
                        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600">{q.incorrect_rate}% wrong</span>
                      </div>
                      <p className="text-xs text-neutral-mid">{q.module_name} · {q.incorrect} of {q.total} staff answered incorrectly</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {tab === 'compliance' && (<>
      {/* ── Monthly Audits ──────────────────────────────────────────────────── */}
      <SectionDivider
        title="Monthly Audits"
        subtitle="Audit completion summary across all frequencies"
      />

      {auditData ? (
        <div className="mb-6">
          <div className="mb-4 grid grid-cols-3 gap-4">
            <StatCard label="Total audit runs"  value={auditData.total} />
            <StatCard label="Completed"         value={auditData.completed} />
            <StatCard label="In progress"       value={auditData.in_progress} />
          </div>

          <Card title="Completed audits by frequency" info="Number of completed audit runs grouped by how often each template is designed to be completed.">
            <div className="grid grid-cols-5 divide-x divide-gray-100 -mx-6 px-0">
              {(['daily', 'weekly', 'monthly', 'quarterly', 'periodic'] as const).map(freq => {
                const s = auditData.by_frequency[freq]
                const label = freq.charAt(0).toUpperCase() + freq.slice(1)
                const lastDate = s?.last_completed
                  ? new Date(s.last_completed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : null
                return (
                  <div key={freq} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ClipboardCheck size={12} className="text-teal" />
                      <p className="text-xs font-medium text-neutral-mid">{label}</p>
                    </div>
                    <p className={`text-2xl font-bold ${s?.completed > 0 ? 'text-neutral-dark' : 'text-gray-300'}`}>
                      {s?.completed ?? 0}
                    </p>
                    {s?.in_progress > 0 && (
                      <p className="mt-0.5 text-xs font-medium text-amber-500">{s.in_progress} in progress</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-mid/70">
                      {lastDate ? `Last: ${lastDate}` : 'No runs yet'}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      ) : (
        <div className="mb-6 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <p className="text-sm text-neutral-mid">No audit data yet. Start your first audit from the Monthly Audits page.</p>
        </div>
      )}
      </>)}

      {tab === 'cqc' && (<>
      {/* ── CQC Staff Prep ──────────────────────────────────────────────────── */}
      <SectionDivider
        title="CQC Staff Prep performance"
        subtitle="Staff readiness scores across CQC inspection domains"
      />

      {!cqcPrepData ? (
        <div className="mb-6 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <p className="text-sm text-neutral-mid">No CQC prep activity yet. Send questions to staff from the CQC Staff Prep page to start tracking performance.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Questions sent"
              value={cqcPrepData.summary.total_sent}
              info="Total number of CQC prep questions delivered to staff."
            />
            <StatCard
              label="Answered"
              value={cqcPrepData.summary.total_answered}
              info="Number of questions staff have submitted an answer for."
            />
            <StatCard
              label="Avg score"
              value={cqcPrepData.summary.avg_score !== null ? `${cqcPrepData.summary.avg_score}` : '—'}
              suffix={cqcPrepData.summary.avg_score !== null ? '/100' : ''}
              info="Average AI-evaluated score across all answered questions (0–100)."
            />
            <StatCard
              label="Scoring 80+"
              value={cqcPrepData.summary.pct_80_plus !== null ? `${cqcPrepData.summary.pct_80_plus}` : '—'}
              suffix={cqcPrepData.summary.pct_80_plus !== null ? '%' : ''}
              info="Percentage of answered questions that scored 80 or above — the CQC-ready threshold."
            />
          </div>

          {cqcPrepData.by_domain.length > 0 && (
            <div className="mb-6">
              <Card title="Performance by CQC domain" info="Average score per CQC inspection domain. Domains scoring below 60 indicate areas where staff may need additional preparation.">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Domain</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Sent</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Answered</th>
                      <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Scoring 80+</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cqcPrepData.by_domain.map((d: any) => (
                      <tr key={d.domain} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-neutral-dark">
                          {DOMAIN_LABELS[d.domain] ?? d.domain}
                        </td>
                        <td className="py-2 pr-3 text-center text-neutral-mid">{d.total_sent}</td>
                        <td className="py-2 pr-3 text-center text-neutral-mid">{d.total_answered}</td>
                        <td className={clsx('py-2 pr-3 text-center font-semibold', scoreColor(d.avg_score))}>
                          {d.avg_score !== null ? d.avg_score : '—'}
                        </td>
                        <td className={clsx('py-2 text-right font-semibold', d.pct_80_plus !== null && d.pct_80_plus >= 80 ? 'text-status-success' : d.pct_80_plus !== null ? 'text-status-warning' : 'text-neutral-mid')}>
                          {d.pct_80_plus !== null ? `${d.pct_80_plus}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {cqcPrepData.staff_performance.length > 0 && (
            <div className="mb-6">
              <Card title="Staff performance" info="Individual staff scores across CQC prep questions. Staff scoring below 60 on average may benefit from additional coaching before the next inspection.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Staff member</th>
                        <th className="pb-2 pr-3 text-xs font-medium text-neutral-mid">Role</th>
                        <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Answered</th>
                        <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                        <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Scoring 80+</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cqcPrepData.staff_performance.map((s: any) => (
                        <tr key={s.user_id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 font-medium text-neutral-dark">{s.name}</td>
                          <td className="py-2 pr-3 text-xs capitalize text-neutral-mid">{s.job_role ?? '—'}</td>
                          <td className="py-2 pr-3 text-center text-neutral-mid">{s.total_answered}</td>
                          <td className={clsx('py-2 pr-3 text-center font-semibold', scoreColor(s.avg_score))}>
                            {s.avg_score !== null ? s.avg_score : '—'}
                          </td>
                          <td className={clsx('py-2 text-right font-semibold', s.pct_80_plus !== null && s.pct_80_plus >= 80 ? 'text-status-success' : s.pct_80_plus !== null ? 'text-status-warning' : 'text-neutral-mid')}>
                            {s.pct_80_plus !== null ? `${s.pct_80_plus}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
      </>)}

      {/* ── Advanced section ─────────────────────────────────────────────────── */}
      {tab === 'advanced' && (!advanced ? (
        <div className="rounded-card border-2 border-dashed border-gray-200 p-8 text-center">
          <TrendingUp size={32} className="mx-auto mb-3 text-neutral-mid" />
          <h3 className="mb-1 text-base font-semibold text-neutral-dark">Advanced analytics</h3>
          <p className="text-sm text-neutral-mid">
            Language breakdown, query trends, staff engagement, and more are available on the
            Professional plan.
          </p>
        </div>
      ) : (
        <>
          <SectionDivider
            title="Advanced analytics"
            subtitle="Professional plan — 12-month rolling window"
          />

          {/* Language breakdown */}
          <div className="mb-6">
            <Card
              title="Language breakdown"
              info="Languages detected in staff queries over the last 12 months. Demonstrates multilingual accessibility — relevant to CQC Equality and Diversity requirements."
              action={
                advanced.language_breakdown.length > 0 ? (
                  <button
                    onClick={() => exportLanguageCsv(advanced.language_breakdown)}
                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                ) : undefined
              }
            >
              {advanced.language_breakdown.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Month</th>
                        <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Language</th>
                        <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Queries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanced.language_breakdown.map((r: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 text-neutral-mid">{r.month}</td>
                          <td className="py-2 pr-4 font-medium text-neutral-dark">
                            {LANG_NAMES[r.language] ?? r.language}
                          </td>
                          <td className="py-2 text-right text-teal">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Query trend */}
          <div className="mb-6">
            <Card title="Query trend — last 12 months" info="Monthly query volume over the last 12 months. Useful for spotting usage growth, seasonal patterns, and the impact of staff training or policy changes.">
              {advanced.query_trend.monthly.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (() => {
                const max = Math.max(...advanced.query_trend.monthly.map((r: any) => r.count), 1)
                return (
                  <div className="space-y-1.5">
                    {advanced.query_trend.monthly.map((r: any) => (
                      <div key={r.period} className="flex items-center gap-3">
                        <span className="w-16 text-right text-xs text-neutral-mid">{r.period}</span>
                        <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-5">
                          <div
                            className="h-5 rounded-full bg-teal transition-all"
                            style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-medium text-neutral-dark">{r.count}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Card>
          </div>

          {/* Staff engagement + Category breakdown */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title="Staff engagement this month" info="Individual staff query activity this month. Identifies your most active users and highlights anyone who hasn't yet engaged with the system.">
              {advanced.staff_engagement.length === 0 ? (
                <p className="text-sm text-neutral-mid">No user queries this month.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Staff member</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Role</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Queries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanced.staff_engagement.map((s: any) => (
                      <tr key={s.user_id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-neutral-dark">{s.name}</td>
                        <td className="py-2 pr-4 text-xs text-neutral-mid capitalize">{s.role}</td>
                        <td className="py-2 text-right font-medium text-teal">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Document category breakdown" info="How queries are distributed across internal policies, staff handbook sections, and external regulations. Helps you understand which document types staff consult most.">
              {advanced.category_breakdown.length === 0 ? (
                <p className="text-sm text-neutral-mid">No data yet.</p>
              ) : (() => {
                const catTotal = advanced.category_breakdown.reduce((s: number, c: any) => s + c.count, 0)
                return advanced.category_breakdown.map((c: any) => (
                  <HBar
                    key={c.category}
                    label={CATEGORY_LABELS[c.category] ?? c.category}
                    count={c.count}
                    total={catTotal}
                  />
                ))
              })()}
            </Card>
          </div>

          {/* Response time */}
          <div className="mb-6">
            <Card title="Response time performance this month" info="How quickly the AI is responding to queries. The average is the mean across all queries; the 95th percentile shows the slowest response experienced by most staff.">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-mid">Average</p>
                  <p className="text-2xl font-bold text-neutral-dark">{advanced.response_time.avg_ms.toLocaleString('en-GB')}ms</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-mid">95th percentile</p>
                  <p className="text-2xl font-bold text-neutral-dark">{advanced.response_time.p95_ms.toLocaleString('en-GB')}ms</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Knowledge gaps */}
          <div className="mb-6">
            <Card title={`Knowledge gaps — last 30 days (${advanced.knowledge_gaps.length} unmatched queries)`} info="Queries where the AI couldn't find a matching policy in the last 30 days. Use this list to identify gaps in your policy library and prioritise what to upload next.">
              {advanced.knowledge_gaps.length === 0 ? (
                <p className="text-sm text-neutral-mid">No unmatched queries in the last 30 days.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {advanced.knowledge_gaps.map((g: any) => (
                    <div key={g.id} className="rounded-md bg-neutral-light/60 px-3 py-2">
                      <p className="text-sm text-neutral-dark">{g.query_text}</p>
                      <div className="mt-1 flex gap-3 text-xs text-neutral-mid">
                        <span>{new Date(g.created_at).toLocaleDateString('en-GB')}</span>
                        <span className="capitalize">{g.channel}</span>
                        <span>{LANG_NAMES[g.language_detected] ?? g.language_detected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ))}

      {/* ── Per-tab empty states ─────────────────────────────────────────────── */}
      {tab === 'staff' && !(riskData?.staff?.length || readingData?.summary?.total_sessions) && (
        <EmptyTab>No staff alerts or policy-reading activity yet. Flags appear here when training is overdue, induction stalls, or someone hasn&apos;t logged in.</EmptyTab>
      )}
      {tab === 'gaps' && !((inductionPerf?.summary?.total_answered) || (kgaps && (kgaps.summary.open_gaps > 0 || kgaps.summary.learn + kgaps.summary.retry > 0)) || (gapsData && (gapsData.question_gaps.length > 0 || gapsData.module_summary.length > 0))) && (
        <EmptyTab>No knowledge gaps yet. Once staff start answering training and induction questions, missed questions and remediation will show here.</EmptyTab>
      )}
      {tab === 'training' && !trainingData && (
        <EmptyTab>No training data yet. Assign modules from the Staff page to start tracking completion and compliance.</EmptyTab>
      )}
    </div>
  )
}
