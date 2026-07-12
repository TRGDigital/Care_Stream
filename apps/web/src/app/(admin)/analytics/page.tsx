'use client'

// §10.2/10.3 — Analytics dashboard: basic metrics for all plans,
// advanced metrics for Professional plan (has_advanced_analytics = true).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { UpgradePanel, LockChip } from '@/components/admin/upgrade-gate'
import { TrendingUp, TrendingDown, Minus, Download, Info, GraduationCap, CheckCircle2, AlertCircle, Clock, ClipboardCheck, Users, Activity, Zap, Brain, RefreshCw, Lightbulb, Globe, Award } from 'lucide-react'
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

type TabId = 'overview' | 'engagement' | 'staff' | 'gaps' | 'training' | 'compliance' | 'cqc' | 'advanced' | 'effectiveness' | 'impact' | 'policies'

const TABS: { id: TabId; label: string; premium?: 'has_effectiveness' | 'has_training_impact' }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'staff',      label: 'Staff' },
  { id: 'gaps',       label: 'Knowledge gaps' },
  { id: 'training',   label: 'Training' },
  { id: 'compliance', label: 'Audits' },
  { id: 'cqc',        label: 'CQC Staff Prep' },
  { id: 'effectiveness', label: 'Effectiveness of Training', premium: 'has_effectiveness' },
  { id: 'impact',        label: 'Training Impact',           premium: 'has_training_impact' },
  { id: 'policies',      label: 'Updated Policies' },
]

export default function AnalyticsPage() {
  const { data: session }           = useSession()
  const { features } = usePlanFeatures()
  const userId = session?.user?.email ?? 'guest'
  const [engagementData, setEngagement] = useState<any>(null)
  const [data,         setData]     = useState<any>(null)
  const [trainingData, setTraining] = useState<any>(null)
  const [gapsData,     setGaps]     = useState<any>(null)
  const [cqcPrepData,  setCqcPrep]  = useState<any>(null)
  const [auditData,    setAuditData] = useState<any>(null)
  const [riskData,     setRiskData]  = useState<any>(null)
  const [readingData,  setReadingData] = useState<any>(null)
  const [inductionPerf, setInductionPerf] = useState<any>(null)
  const [kgaps,        setKgaps]    = useState<any>(null)
  const [annual,       setAnnual]   = useState<any>(null)
  const [langSwitch,   setLangSwitch] = useState<any>(null)
  const [f2f,          setF2f]      = useState<any>(null)
  const [effectiveness, setEffectiveness] = useState<any>(null)
  const [impact,       setImpact]   = useState<any>(null)
  const [policiesOverview, setPoliciesOverview] = useState<any>(null)
  const [digestState,  setDigestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [tab,          setTab]      = useState<TabId>('overview')
  const [loading,      setLoading]  = useState(true)
  const [error,        setError]    = useState(false)

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<{ data: any; training: any; gaps: any; cqcPrep: any; audits: any; risk: any; reading: any; inductionPerf: any; kgaps: any; annual: any; engagement: any; langSwitch: any; f2f: any }>(`admin-analytics-${userId}`)
    if (cached) {
      setEngagement(cached.engagement ?? null); setData(cached.data ?? null); setTraining(cached.training ?? null); setGaps(cached.gaps ?? null); setCqcPrep(cached.cqcPrep ?? null); setAuditData(cached.audits ?? null); setRiskData(cached.risk ?? null); setReadingData(cached.reading ?? null); setInductionPerf(cached.inductionPerf ?? null); setKgaps(cached.kgaps ?? null); setAnnual(cached.annual ?? null); setLangSwitch(cached.langSwitch ?? null); setF2f(cached.f2f ?? null); setEffectiveness((cached as any).effectiveness ?? null); setImpact((cached as any).impact ?? null); setPoliciesOverview((cached as any).policiesOverview ?? null)
      setLoading(false)
    }
  }, [userId])

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
      api.analytics.engagement().catch(() => null),
      api.analytics.languageSwitches().catch(() => null),
      api.faceToFace.analytics().catch(() => null),
      api.analytics.effectiveness().catch(() => null),
      api.analytics.trainingImpact().catch(() => null),
      api.analytics.policyApprovalsOverview().catch(() => null),
    ])
      .then(([main, training, gaps, cqcPrep, audits, risk, reading, inductionPerf, kgaps, annual, engagement, langSw, f2fData, eff, imp, polOv]) => {
        setData(main); setTraining(training); setGaps(gaps); setCqcPrep(cqcPrep); setAuditData(audits); setRiskData(risk); setReadingData(reading); setInductionPerf(inductionPerf); setKgaps(kgaps); setAnnual(annual); setEngagement(engagement); setLangSwitch(langSw); setF2f(f2fData); setEffectiveness(eff); setImpact(imp); setPoliciesOverview(polOv)
        persistentCache.set(`admin-analytics-${userId}`, { data: main, training, gaps, cqcPrep, audits, risk, reading, inductionPerf, kgaps, annual, engagement, langSwitch: langSw, f2f: f2fData, effectiveness: eff, impact: imp, policiesOverview: polOv })
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

  async function openCertificate(certId: string) {
    if (!session?.accessToken) return
    // Open the tab synchronously (popup-blocker safe), then load the fetched PDF; fall back to download.
    const win = window.open('', '_blank')
    try {
      const blob = await createApiClient(session.accessToken).faceToFace.downloadCertificate(certId)
      const url = URL.createObjectURL(blob)
      if (win) { win.location.href = url }
      else { const a = document.createElement('a'); a.href = url; a.download = 'certificate.pdf'; document.body.appendChild(a); a.click(); a.remove() }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { if (win) win.close() }
  }

  if (loading) return <p className="text-sm text-neutral-mid">Loading analytics…</p>
  if (error || !data) return <p className="text-sm text-status-error">Failed to load analytics.</p>

  const { basic, advanced } = data

  const thisTotal     = basic.total_queries.this_month
  const channelTotal  = basic.queries_by_channel.chat + basic.queries_by_channel.email
  const intentTotal   = basic.full_vs_summary.full_policy + basic.full_vs_summary.summary + basic.full_vs_summary.follow_up

  return (
    <div>
      {/* ── Sticky header (title + tabs) ─────────────────────────────────────
          Full-bleed and pinned flush to the very top of the scroll area. The
          -mt-6/-mx-6 cancel <main>'s p-6 padding and -top-6 offsets the sticky
          pin past that padding so the bar locks to the top rather than floating
          24px down (which read as the tabs "following" the scroll). */}
      <div className="sticky -top-6 z-30 -mx-6 -mt-6 mb-6 bg-neutral-light px-6 pt-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-neutral-dark">Analytics — {monthName}</h1>
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.filter(t => t.id !== 'policies' || (policiesOverview?.documents?.length ?? 0) > 0).map(t => {
            const locked = !!t.premium && features != null && !features[t.premium]
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}
              >
                {t.label}{locked && <LockChip tier="Enterprise" />}
              </button>
            )
          })}
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

      {tab === 'engagement' && (<>
      {/* ── Staff engagement scoreboard ─────────────────────────────────────── */}
      <SectionDivider
        title="Staff engagement"
        subtitle="How your team is using the hub — weekly active staff, the trend, and the channel mix"
      />
      {!engagementData ? (
        <div className="mb-6 rounded-card border border-gray-100 bg-white p-6 shadow-card">
          <p className="text-sm text-neutral-mid">No engagement data yet. Once staff use the hub, weekly active % and the channel mix appear here.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Weekly active staff"
              value={engagementData.wau.pct == null ? '—' : `${engagementData.wau.pct}`}
              suffix={engagementData.wau.pct == null ? '' : '%'}
              info="Share of active staff who opened the hub, asked a question, or read a policy in the last 7 days. This is the leading indicator for staff adoption of the hub."
            />
            <StatCard label="Active this week" value={engagementData.wau.active} info="Distinct staff active in the hub in the last 7 days." />
            <StatCard label="Team size" value={engagementData.wau.total_staff} info="Active staff accounts — the denominator for weekly active %." />
            <StatCard
              label="Hub share of questions"
              value={engagementData.channels.hub_pct == null ? '—' : `${engagementData.channels.hub_pct}`}
              suffix={engagementData.channels.hub_pct == null ? '' : '%'}
              info="Share of all questions in the last 30 days that came through the hub vs email/voice."
            />
          </div>

          <div className="mb-6">
            <Card title="Weekly active staff — 8-week trend" info="Distinct staff who asked a question or read a policy each week, as a % of the team. (The headline figure also counts logins; the weekly history is activity-based, as logins aren't time-stamped historically.)">
              <div className="flex items-end gap-2" style={{ height: 160 }}>
                {engagementData.trend.map((w: any, i: number) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-semibold text-neutral-mid">{w.pct}%</span>
                    <div className="w-full rounded-t bg-teal" style={{ height: Math.max(3, (w.pct / 100) * 120) }} title={`${w.active} active staff`} />
                    <span className="text-[9px] leading-tight text-neutral-mid">{new Date(w.week_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="mb-6">
            <Card title="Channel mix (last 30 days)" info="Where staff questions are coming in. Email questions from unknown addresses aren't attributed to a staff member.">
              {engagementData.channels.total === 0 ? (
                <p className="text-sm text-neutral-mid">No questions in the last 30 days yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {([
                    ['Hub (chat)', 'chat',     'bg-teal'],
                    ['Email',      'email',    'bg-blue-500'],
                    ['Voice',      'voice',    'bg-purple-500'],
                  ] as const).map(([label, key, color]) => {
                    const v = engagementData.channels[key] as number
                    const pct = engagementData.channels.total ? Math.round((v / engagementData.channels.total) * 100) : 0
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs text-neutral-mid">{label}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs text-neutral-dark">{v} · {pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
      </>
      )}
      </>)}

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

      {/* ── Second-language switching (aggregate) ────────────────────────────── */}
      {langSwitch && langSwitch.summary.total_switches > 0 && (
        <div className="mb-6">
          <Card
            title="Second-language switching"
            info="How often staff flip a training, induction or CQC set out of English into their second language. A signal of where extra language or training support helps. Last 180 days. The per-staff breakdown is on the Staff tab."
          >
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 bg-neutral-light/40 p-3 text-center">
                <p className="text-2xl font-bold text-teal">{langSwitch.summary.total_switches}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Switches</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-neutral-light/40 p-3 text-center">
                <p className="text-2xl font-bold text-neutral-dark">{langSwitch.summary.staff_count}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Staff using it</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-neutral-light/40 p-3 text-center">
                <p className="text-2xl font-bold text-neutral-dark">{langSwitch.summary.set_count}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Sets switched</p>
              </div>
            </div>

            {langSwitch.by_language.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">By language</p>
                {langSwitch.by_language.map((l: any) => (
                  <HBar key={l.lang} label={`${l.lang_name} · ${l.staff_count} staff`} count={l.count} total={langSwitch.by_language[0].count} color="bg-teal" />
                ))}
              </div>
            )}

            {langSwitch.by_area.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">By area</p>
                {langSwitch.by_area.map((a: any) => (
                  <HBar key={a.area} label={a.label} count={a.count} total={langSwitch.by_area[0].count} color="bg-teal-light border border-teal/30" />
                ))}
              </div>
            )}

            {langSwitch.by_set.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">Most switched sets</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Set</th>
                      <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Area</th>
                      <th className="pb-2 pr-4 text-right text-xs font-medium text-neutral-mid">Staff</th>
                      <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Switches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {langSwitch.by_set.slice(0, 12).map((s: any, i: number) => (
                      <tr key={`${s.area}-${s.set_name}-${i}`} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-neutral-dark"><span className="mr-2 text-xs text-neutral-mid">{i + 1}.</span>{s.set_name}</td>
                        <td className="py-2 pr-4 text-xs text-neutral-mid">{s.area_label}</td>
                        <td className="py-2 pr-4 text-right text-neutral-mid">{s.staff_count}</td>
                        <td className="py-2 text-right font-medium text-teal">{s.switch_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* ── Second-language switching by staff member ───────────────────────── */}
      {tab === 'staff' && langSwitch && langSwitch.by_staff.length > 0 && (
        <>
          <SectionDivider
            title="Second-language switching by staff member"
            subtitle="Who flips their training, induction or CQC sets into their second language — and which sets. A signal of where language or training support is needed (last 180 days)."
          />
          <div className="mb-6 space-y-3">
            {langSwitch.by_staff.map((s: any) => (
              <div key={s.user_id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-dark">{s.name}</p>
                    <p className="text-xs text-neutral-mid">
                      {s.job_role || 'Staff member'} · {s.languages.join(', ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-teal-light/60 px-2.5 py-1 text-xs font-semibold text-teal">
                    {s.total} switch{s.total === 1 ? '' : 'es'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.sets.map((set: any, i: number) => (
                    <span key={`${set.area}-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-neutral-light/40 px-2 py-1 text-xs text-neutral-dark">
                      <Globe size={11} className="text-teal" />
                      {set.set_name}
                      {set.count > 1 && <span className="text-neutral-mid">×{set.count}</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Face-to-face training ────────────────────────────────────────────── */}
      {tab === 'staff' && f2f && f2f.summary.sessions > 0 && (
        <>
          <SectionDivider
            title="Face-to-face training"
            subtitle="Group / in-person sessions: who missed them, who was sent the digital module as a catch-up, and whether they've completed it."
          />
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Sessions logged" value={f2f.summary.sessions} Icon={ClipboardCheck} iconBg="bg-teal-light" iconColor="text-teal" info="Face-to-face training sessions recorded, including any backfilled history." />
            <StatCard label="Marked missed" value={f2f.summary.missed} Icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-500" info="Allocations where the staff member was marked absent from the session." />
            <StatCard label="Digital modules sent" value={f2f.summary.modules_assigned} Icon={GraduationCap} iconBg="bg-indigo-50" iconColor="text-indigo-500" info="Catch-up modules sent to staff off the back of a face-to-face session." />
            <StatCard label="Not yet completed" value={f2f.summary.assigned_incomplete} Icon={AlertCircle} iconBg="bg-orange-50" iconColor="text-orange-400" info="Of the catch-up modules sent, how many the staff member still hasn't completed." />
          </div>
          {f2f.by_staff.length > 0 && (
            <div className="mb-6 space-y-3">
              {f2f.by_staff.map((s: any) => (
                <div key={s.user_id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-neutral-dark">{s.name}</p>
                      <p className="text-xs text-neutral-mid">{s.job_role || 'Staff member'} · attended {s.attended}/{s.allocated}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {s.certificates > 0 && <span className="rounded-full bg-green-50 px-2.5 py-1 font-semibold text-green-700">{s.certificates} certificate{s.certificates === 1 ? '' : 's'}</span>}
                      {s.missed > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{s.missed} missed</span>}
                      {s.assigned_incomplete > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-600">{s.assigned_incomplete} to complete</span>}
                    </div>
                  </div>
                  {s.missed_sessions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.missed_sessions.map((ms: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-neutral-light/40 px-2 py-1 text-xs text-neutral-dark">
                          {ms.title}
                          {ms.module_assigned
                            ? (ms.completion === 'complete'
                                ? <span className="rounded-full bg-green-50 px-1.5 text-[10px] font-medium text-green-600">completed</span>
                                : <span className="rounded-full bg-orange-50 px-1.5 text-[10px] font-medium text-orange-600">{ms.completion === 'in_progress' ? 'in progress' : 'not started'}</span>)
                            : <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-neutral-mid">not sent</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stored completion certificates */}
          {f2f.certificates && f2f.certificates.length > 0 && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Award size={15} className="text-teal" /> Completion certificates</p>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{f2f.summary.certificates} issued</span>
              </div>
              <p className="mb-3 text-xs text-neutral-mid">Certificates issued to staff who attended a face-to-face session. Each is also saved on the individual&apos;s staff record. Click to open the PDF.</p>
              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {f2f.certificates.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-dark">{c.user_name}</p>
                      <p className="truncate text-xs text-neutral-mid">{c.title} · {new Date(c.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{c.competency === 'competent' ? ' · competent' : ''}</p>
                    </div>
                    <button onClick={() => openCertificate(c.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Download size={13} /> Open</button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <Card title="By module" info="Completion, average assessment score, and lesson time (claimed CPD duration vs the average active time staff actually spend on the lesson) for each published annual module.">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-4 text-xs font-medium text-neutral-mid">Module</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Assigned</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Completed</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                  <th className="pb-2 pr-3 text-center text-xs font-medium text-neutral-mid">Lesson time<br/><span className="font-normal text-[10px]">claimed · actual</span></th>
                  <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Rate</th>
                </tr></thead>
                <tbody>
                  {annual.by_module.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-neutral-dark">{m.name}{m.requires_practical && <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">+ practical</span>}</td>
                      <td className="py-2 pr-3 text-center text-neutral-mid">{m.assigned}</td>
                      <td className="py-2 pr-3 text-center font-medium text-status-success">{m.completed}</td>
                      <td className="py-2 pr-3 text-center text-neutral-dark">{m.avg_score !== null ? `${m.avg_score}%` : '—'}</td>
                      <td className="py-2 pr-3 text-center text-xs text-neutral-mid">{m.claimed_minutes ? `${m.claimed_minutes}m` : '—'} · {m.avg_actual_minutes != null ? `${m.avg_actual_minutes}m` : '—'}</td>
                      <td className="py-2 text-right"><span className={clsx('font-semibold', m.completion_pct >= 80 ? 'text-status-success' : m.completion_pct >= 50 ? 'text-status-warning' : 'text-status-error')}>{m.completion_pct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {annual.summary.eval_count > 0 && (
            <Card title="Learner feedback" info="Post-completion learner evaluation (1–5): how confident staff feel applying the training and how useful/relevant they found it. Evidence of learning value for CPD.">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-100 bg-neutral-light/40 p-3 text-center">
                  <p className="text-2xl font-bold text-teal">{annual.summary.avg_confidence ?? '—'}<span className="text-sm font-medium text-neutral-mid">/5</span></p>
                  <p className="mt-0.5 text-xs text-neutral-mid">Avg confidence applying it</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-neutral-light/40 p-3 text-center">
                  <p className="text-2xl font-bold text-teal">{annual.summary.avg_usefulness ?? '—'}<span className="text-sm font-medium text-neutral-mid">/5</span></p>
                  <p className="mt-0.5 text-xs text-neutral-mid">Avg usefulness / relevance</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-neutral-mid">Based on {annual.summary.eval_count} response{annual.summary.eval_count === 1 ? '' : 's'}.</p>
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

          {cqcPrepData.summary.retried > 0 && (
            <div className="mb-6 rounded-card border border-teal/20 bg-teal-light/20 px-5 py-4">
              <p className="text-sm font-semibold text-neutral-dark">Review &amp; retry — evidence staff are learning</p>
              <p className="mt-0.5 text-sm text-neutral-mid">
                <strong className="text-neutral-dark">{cqcPrepData.summary.retried}</strong> answer{cqcPrepData.summary.retried !== 1 ? 's were' : ' was'} reviewed against the model answer and re-attempted
                {cqcPrepData.summary.avg_improvement !== null && <>, improving the score by an average of <strong className="text-status-success">+{cqcPrepData.summary.avg_improvement} points</strong></>}.
              </p>
            </div>
          )}

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
                        <th className="pb-2 text-right text-xs font-medium text-neutral-mid">Reviewed &amp; retried</th>
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
                          <td className="py-2 text-right text-neutral-mid">
                            {s.retried > 0
                              ? <>{s.retried} retried{s.improvement != null && <span className="ml-1 font-semibold text-status-success">+{s.improvement}</span>}</>
                              : '—'}
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
      {tab === 'effectiveness' && (features && !features.has_effectiveness ? (
        <UpgradePanel
          title="Effectiveness of Training"
          description="See evidence that your training and follow-ups are improving knowledge across the team, mapped to recognised learning levels. Available on the Enterprise plan."
          tier="Enterprise"
        />
      ) : !effectiveness ? (
        <EmptyTab>Effectiveness data appears here once staff have completed training and worked through follow-ups.</EmptyTab>
      ) : (() => {
        const e = effectiveness
        const maxTrend = Math.max(1, ...e.loop.trend.map((w: any) => w.resolved))
        return (
          <>
            <SectionDivider
              title="Effectiveness of Training"
              subtitle="Evidence that training and follow-up are improving knowledge across your team — learner reaction, learning, and behaviour change — from your CareStream data."
            />

            {/* Headline proof points */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Questions put right" value={e.headline.gaps_put_right} info="Times a staff member got a question wrong, then worked through follow-up and answered correctly. The core proof that training closes gaps." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
              <StatCard label="Gaps resolved" value={e.headline.resolution_rate ?? 0} suffix="%" info="Of all knowledge gaps surfaced (wrong answers), the share since put right. The remainder are still open." Icon={TrendingUp} iconBg="bg-teal-light" iconColor="text-teal" />
              <StatCard label="Engaged with learning" value={e.headline.engaged_pct ?? 0} suffix="%" info="Of gaps closed, the share where staff worked through the policy-grounded micro-lesson ('Learn & retry') rather than just re-answering." Icon={Brain} iconBg="bg-indigo-50" iconColor="text-indigo-500" />
              <StatCard label="Put right (30 days)" value={e.headline.resolved_30d} info="Knowledge gaps closed in the last 30 days — recent momentum." Icon={Activity} iconBg="bg-amber-50" iconColor="text-amber-500" />
            </div>

            {/* The learning loop */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card title="How gaps get closed" info="When staff close a gap they either work through the micro-lesson first ('Learn & retry') or simply re-answer ('Just retry'). More 'Learn & retry' means deeper engagement.">
                <HBar label="Learn & retry" count={e.loop.learn} total={Math.max(1, e.loop.learn + e.loop.retry)} color="bg-teal" />
                <HBar label="Just retry" count={e.loop.retry} total={Math.max(1, e.loop.learn + e.loop.retry)} color="bg-neutral-mid" />
                <p className="mt-2 text-xs text-neutral-mid">{e.headline.open_gaps} gap{e.headline.open_gaps === 1 ? '' : 's'} still open across the team.</p>
              </Card>
              <Card title="Gaps closed over time" info="Knowledge gaps put right each week over the last 8 weeks — your learning loop in action.">
                <div className="flex h-32 items-end gap-1.5">
                  {e.loop.trend.map((w: any, i: number) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-teal" style={{ height: `${(w.resolved / maxTrend) * 100}%`, minHeight: w.resolved > 0 ? 4 : 0 }} title={`${w.resolved} closed`} />
                      <span className="text-[9px] text-neutral-mid">{new Date(w.week_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Mastery + reaction */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Assessment accuracy" value={e.mastery.avg_assessment_score ?? 0} suffix="%" info="Across every training question answered, the share answered correctly — the team's current knowledge level." Icon={GraduationCap} iconBg="bg-teal-light" iconColor="text-teal" />
              <StatCard label="Training completed" value={e.mastery.completion_pct ?? 0} suffix="%" info="Share of assigned training modules completed." Icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
              <StatCard label="Confidence to apply" value={e.reaction.avg_confidence_pct ?? '—'} suffix={e.reaction.avg_confidence_pct != null ? '%' : ''} info={`How confident staff feel applying what they learned, self-rated after annual modules. Based on ${e.reaction.responses} response${e.reaction.responses === 1 ? '' : 's'}.`} Icon={Brain} iconBg="bg-indigo-50" iconColor="text-indigo-500" />
              <StatCard label="Rated useful" value={e.reaction.avg_usefulness_pct ?? '—'} suffix={e.reaction.avg_usefulness_pct != null ? '%' : ''} info="How useful and relevant staff rated the training to their role." Icon={CheckCircle2} iconBg="bg-amber-50" iconColor="text-amber-500" />
            </div>

            {/* CQC prep close-the-loop */}
            {e.cqc.retried > 0 && (
              <div className="mb-6">
                <Card title="CQC prep: improvement after review" info="When a staff member scores low on a CQC prep question they can review the model answer and try again. Average score before and after — direct evidence of learning.">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border border-gray-100 p-3"><p className="text-2xl font-bold text-orange-500">{e.cqc.avg_first_score ?? '—'}</p><p className="text-xs text-neutral-mid">First attempt</p></div>
                    <div className="rounded-xl border border-gray-100 p-3"><p className="text-2xl font-bold text-green-600">{e.cqc.avg_latest_score ?? '—'}</p><p className="text-xs text-neutral-mid">After review</p></div>
                    <div className="rounded-xl border border-gray-100 bg-teal-light/30 p-3"><p className="text-2xl font-bold text-teal">{e.cqc.avg_improvement != null ? `+${e.cqc.avg_improvement}` : '—'}</p><p className="text-xs text-neutral-mid">Improvement</p></div>
                  </div>
                  <p className="mt-2 text-xs text-neutral-mid">Across {e.cqc.retried} retried answer{e.cqc.retried === 1 ? '' : 's'}.</p>
                </Card>
              </div>
            )}

            {/* Language inclusion parity */}
            {e.language.second_lang_users > 0 && (
              <div className="mb-6">
                <Card title="Language is not a barrier to competency" info="Staff who use second-language support to understand a set, compared with the rest of the team. Equivalent results show language support keeps everyone safely competent — an inclusion point for CQC.">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left"><th className="pb-2 text-xs font-medium text-neutral-mid">Group</th><th className="pb-2 text-right text-xs font-medium text-neutral-mid">Staff</th><th className="pb-2 text-right text-xs font-medium text-neutral-mid">Completion</th><th className="pb-2 text-right text-xs font-medium text-neutral-mid">Assessment accuracy</th></tr></thead>
                    <tbody>
                      <tr className="border-b border-gray-50"><td className="py-2 font-medium text-neutral-dark">Use second-language support</td><td className="py-2 text-right text-neutral-mid">{e.language.with.staff}</td><td className="py-2 text-right text-neutral-dark">{e.language.with.completion_pct ?? '—'}%</td><td className="py-2 text-right text-neutral-dark">{e.language.with.avg_score ?? '—'}%</td></tr>
                      <tr><td className="py-2 font-medium text-neutral-dark">Rest of the team</td><td className="py-2 text-right text-neutral-mid">{e.language.without.staff}</td><td className="py-2 text-right text-neutral-dark">{e.language.without.completion_pct ?? '—'}%</td><td className="py-2 text-right text-neutral-dark">{e.language.without.avg_score ?? '—'}%</td></tr>
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            <p className="mb-6 rounded-xl border border-gray-100 bg-neutral-light/40 px-4 py-3 text-xs text-neutral-mid">
              These measures show training is improving knowledge (reaction, learning and behaviour). Linking training to care outcomes such as antipsychotic use, falls or incident rates is a later phase that needs those outcomes to be recorded in CareStream.
            </p>
          </>
        )
      })())}

      {tab === 'impact' && (features && !features.has_training_impact ? (
        <UpgradePanel
          title="Training Impact"
          description="Link audits to training modules and see whether the training is moving the needle on audited practice over time. The closed loop from training to real-world compliance. Available on the Enterprise plan."
          tier="Enterprise"
        />
      ) : !impact || impact.audits.length === 0 ? (
        <EmptyTab>Link an audit to a training module to see whether the training improves audited practice. On <strong>Monthly Audits</strong>, open one of your own audits and use <strong>Linked training</strong> (or tick modules when building a new audit).</EmptyTab>
      ) : (
        <>
          <SectionDivider
            title="Training Impact"
            subtitle="For audits you've linked to training, how the audit's compliance score moves alongside training completion over time. A correlation and trend, not proof of cause."
          />
          {impact.audits.map((a: any) => (
            <div key={a.template_id} className="mb-6">
              <Card title={a.name} info="Each month: the audit's compliance score (share of 'yes' answers) and the cumulative completion of the linked training. If they rise together, that's evidence the training is landing in practice.">
                <p className="mb-3 text-xs text-neutral-mid">Linked training: <strong>{a.modules.map((m: any) => m.name).join(', ')}</strong></p>
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-gray-100 p-3"><p className="text-2xl font-bold text-neutral-dark">{a.first_score ?? '—'}{a.first_score != null ? '%' : ''}</p><p className="text-xs text-neutral-mid">First audit</p></div>
                  <div className="rounded-xl border border-gray-100 p-3"><p className="text-2xl font-bold text-teal">{a.latest_score ?? '—'}{a.latest_score != null ? '%' : ''}</p><p className="text-xs text-neutral-mid">Latest audit</p></div>
                  <div className={`rounded-xl border p-3 ${a.score_change != null && a.score_change >= 0 ? 'border-green-100 bg-green-50/40' : 'border-gray-100'}`}><p className={`text-2xl font-bold ${a.score_change != null ? (a.score_change >= 0 ? 'text-green-600' : 'text-orange-600') : 'text-gray-300'}`}>{a.score_change != null ? `${a.score_change >= 0 ? '+' : ''}${a.score_change}` : '—'}</p><p className="text-xs text-neutral-mid">Change</p></div>
                </div>
                {a.timeline.length > 0 ? (
                  <div className="space-y-2.5">
                    {a.timeline.map((pt: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="w-14 shrink-0 text-neutral-mid">{new Date(pt.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2"><span className="w-16 text-neutral-mid">Audit</span><div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-teal" style={{ width: `${pt.audit_score ?? 0}%` }} /></div><span className="w-9 text-right text-neutral-dark">{pt.audit_score != null ? `${pt.audit_score}%` : '—'}</span></div>
                          <div className="flex items-center gap-2"><span className="w-16 text-neutral-mid">Trained</span><div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-indigo-400" style={{ width: `${pt.completion_pct ?? 0}%` }} /></div><span className="w-9 text-right text-neutral-dark">{pt.completion_pct != null ? `${pt.completion_pct}%` : '—'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-neutral-mid">No completed audit runs yet. Complete a monthly audit to start building the trend.</p>}
                <p className="mt-3 text-xs text-neutral-mid">{a.current_completion_pct ?? 0}% of allocated staff have completed the linked training, across {a.runs} completed audit{a.runs === 1 ? '' : 's'}.</p>
              </Card>
            </div>
          ))}
          <p className="mb-6 rounded-xl border border-gray-100 bg-neutral-light/40 px-4 py-3 text-xs text-neutral-mid">
            It needs several monthly audit runs to show a meaningful trend. One run is just a point. The view shows whether training and audited practice move together over time, useful evidence of a continuous-improvement loop for CQC, but it&apos;s a correlation, not proof that the training alone caused the change.
          </p>
        </>
      ))}

      {tab === 'policies' && (!policiesOverview || policiesOverview.documents.length === 0 ? (
        <EmptyTab>When you adopt a policy gap fix and take it through approval, the policy and its full sign-off timeline appear here, evidence that every policy change follows the same controlled process.</EmptyTab>
      ) : (
        <>
          <SectionDivider
            title="Updated Policies"
            subtitle="Every policy you've updated through Policy Gaps, with its full approval timeline. Evidence for CQC that policy changes follow one consistent, signed-off process."
          />
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-gray-100 p-3"><p className="text-2xl font-bold text-neutral-dark">{policiesOverview.summary.total}</p><p className="text-xs text-neutral-mid">Policies updated</p></div>
            <div className="rounded-xl border border-green-100 bg-green-50/40 p-3"><p className="text-2xl font-bold text-green-600">{policiesOverview.summary.published}</p><p className="text-xs text-neutral-mid">Approved &amp; live</p></div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3"><p className="text-2xl font-bold text-amber-600">{policiesOverview.summary.in_progress}</p><p className="text-xs text-neutral-mid">In approval</p></div>
          </div>
          {policiesOverview.documents.map((d: any) => {
            const stageLabel = (s: string) => s === 'admin' ? 'Admin' : s === 'manager' ? 'Care manager' : 'External approver'
            const chip = d.approval_status === 'published' ? { label: 'Approved & live', cls: 'border-green-200 bg-green-50 text-green-700' }
              : d.approval_status === 'pending_manager' ? { label: 'With care manager', cls: 'border-amber-200 bg-amber-50 text-amber-700' }
              : d.approval_status === 'pending_external' ? { label: 'Awaiting external approval', cls: 'border-sky-200 bg-sky-50 text-sky-700' }
              : { label: 'Draft', cls: 'border-gray-200 bg-gray-50 text-neutral-mid' }
            return (
              <div key={d.policy_id} className="mb-6">
                <Card title={d.name} info="The approval trail for this policy: who approved or sent it back, and when. A consistent, auditable sign-off process across every updated policy.">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    {d.version && <span className="text-xs text-neutral-mid">Version {d.version}</span>}
                    {d.published_at && <span className="text-xs text-neutral-mid">· Published {new Date(d.published_at).toLocaleDateString('en-GB')}</span>}
                  </div>
                  {d.trail.length === 0 ? (
                    <p className="text-sm text-neutral-mid">Changes adopted, not yet submitted for approval.</p>
                  ) : (
                    <ol className="relative space-y-3 border-l border-gray-200 pl-4">
                      {d.trail.map((s: any, i: number) => (
                        <li key={i} className="relative">
                          <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${s.decision === 'rejected' ? 'bg-rose-400' : 'bg-green-500'}`} />
                          <p className="text-sm text-neutral-dark"><span className="font-medium">{stageLabel(s.stage)}</span> {s.decision === 'rejected' ? 'sent back' : 'approved'}{s.approver_name ? ` · ${s.approver_name}` : ''}</p>
                          <p className="text-xs text-neutral-mid">{new Date(s.created_at).toLocaleString('en-GB')}</p>
                          {s.comment && <p className="mt-0.5 text-xs italic text-neutral-mid">&ldquo;{s.comment}&rdquo;</p>}
                        </li>
                      ))}
                      {d.approval_status === 'published' && d.published_at && (
                        <li className="relative">
                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal ring-2 ring-white" />
                          <p className="text-sm font-medium text-teal">Published to staff{d.version ? ` · version ${d.version}` : ''}</p>
                          <p className="text-xs text-neutral-mid">{new Date(d.published_at).toLocaleString('en-GB')}</p>
                        </li>
                      )}
                    </ol>
                  )}
                </Card>
              </div>
            )
          })}
        </>
      ))}

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
      {tab === 'staff' && !(riskData?.staff?.length || readingData?.summary?.total_sessions || langSwitch?.by_staff?.length || f2f?.summary?.sessions) && (
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
