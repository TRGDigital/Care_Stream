'use client'

import { Fragment, useEffect, useState, useRef, useContext, createContext, isValidElement, Children, type ReactNode } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import {
  createPlatformClient,
  type PlatformStats,
  type TenantSummary,
  type AgentEventsData,
  type LeadsData,
} from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import {
  AlertTriangle, BookOpen, Building2, ChevronDown, ChevronUp,
  FileText, Loader2, Mail, MessageSquare, Search, TrendingUp, Users, X,
  Cpu, Globe, Database, Zap, GitBranch, Shield, GraduationCap, Bot,
  CheckCircle2, XCircle, RefreshCw, ClipboardList, ChevronRight, ChevronLeft, Download,
  Lock, Phone, Mic, CreditCard, BarChart2, LayoutGrid, Settings, HardDrive, Smartphone,
} from 'lucide-react'
import type { PlanLimits } from '@/lib/platform-api'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// recharts is heavy (~90KB) and only used on the Overview tab — load it lazily.
const QueryVolumeChart = dynamic(() => import('@/components/query-volume-chart'), {
  ssr: false,
  loading: () => <div className="flex h-[220px] items-center justify-center"><p className="text-sm text-neutral-mid">Loading chart…</p></div>,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog', yor: 'Yoruba',  ben: 'Bengali',    urd: 'Urdu',
  zho: 'Chinese', ara: 'Arabic',  ita: 'Italian',    lit: 'Lithuanian',
  bho: 'Bhojpuri', guj: 'Gujarati', pan: 'Punjabi', tam: 'Tamil',
  tel: 'Telugu',  kan: 'Kannada', mal: 'Malayalam',  sin: 'Sinhala',
  nep: 'Nepali',  som: 'Somali',  swa: 'Swahili',    cym: 'Welsh',
}

const CATEGORY_LABELS: Record<string, string> = {
  internal_policy: 'Policies & Procedures',
  staff_handbook:  'Staff Handbook',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

function fmtMs(ms: number) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms` }

function sessionRef(key: string) { return 'REF-' + key.replace(/-/g, '').slice(0, 6).toUpperCase() }

function ResultBadge({ anyNoMatch, allNoMatch }: { anyNoMatch: boolean; allNoMatch: boolean }) {
  if (!anyNoMatch)
    return <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Matched</span>
  if (!allNoMatch)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">Partial</span>
  return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">No match</span>
}

function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-teal/30 bg-teal-light' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-medium text-neutral-mid">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-teal' : 'text-neutral-dark'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-mid">{sub}</p>}
    </div>
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

function atRisk(stats: TenantSummary['stats'], plan: PlanLimits | null): boolean {
  if (!plan) return false
  return [
    { used: stats.queriesThisMonth     ?? 0, limit: plan.monthly_query_limit          },
    { used: stats.policyCount          ?? 0, limit: plan.max_policies                 },
    { used: stats.activeUserCount      ?? 0, limit: plan.max_staff_users              },
    { used: stats.handbookCount        ?? 0, limit: plan.max_handbooks                },
    { used: stats.manualKnowledgeCount ?? 0, limit: plan.max_manual_knowledge_entries },
  ].some(({ used, limit }) => limit != null && limit > 0 && used / limit >= 0.9)
}

type TabId = 'overview' | 'queries' | 'analytics' | 'cqc' | 'costs' | 'channels' | 'agents' | 'reference' | 'qa'

// ─── Client selector ──────────────────────────────────────────────────────────

function ClientSelector({
  tenants,
  selectedId,
  onChange,
}: {
  tenants:    TenantSummary[]
  selectedId: string
  onChange:   (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-neutral-mid">Client:</span>
      <select
        value={selectedId}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark focus:outline-none focus:ring-2 focus:ring-teal/30"
      >
        <option value="">— select a client —</option>
        {tenants.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformDashboard() {
  const token = usePlatformAuth()

  const [stats,   setStats]   = useState<PlatformStats | null>(null)
  const [tenants, setTenants] = useState<TenantSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [chartData, setChartData] = useState<Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }>>([])
  const [chartDays, setChartDays] = useState(30)

  const [tab,      setTab]      = useState<TabId>('overview')
  const [clientId, setClientId] = useState('')

  // Queries tab
  const [queries,       setQueries]   = useState<any[]>([])
  const [queriesTotal,  setQTotal]    = useState(0)
  const [queriesPage,   setQPage]     = useState(1)
  const [queriesLoading, setQL]       = useState(false)
  const [expanded,      setExpanded]  = useState<Set<string>>(new Set())
  const [refSearch,     setRefSearch] = useState('')
  const [modal,         setModal]     = useState<{ row: any; messages: any[]; loading: boolean } | null>(null)

  // Analytics tab
  const [analytics,        setAnalytics] = useState<any | null>(null)
  const [analyticsLoading, setAL]        = useState(false)

  // CQC tab
  const [cqc,        setCqc] = useState<any | null>(null)
  const [cqcLoading, setCL]  = useState(false)

  const LIMIT = 20

  // Load top-level stats + tenant list on mount
  useEffect(() => {
    if (!token) return
    const api = createPlatformClient(token)
    Promise.all([api.stats(), api.tenants.list()])
      .then(([s, t]) => { setStats(s); setTenants(t.tenants) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  // Load chart data when token or day range changes
  useEffect(() => {
    if (!token) return
    createPlatformClient(token).dailyActivity(chartDays)
      .then(d => setChartData(d.series.map((s: any) => ({ voice: 0, ...s }))))
      .catch(() => {})
  }, [token, chartDays])

  // Reset per-client data whenever the selected client changes
  useEffect(() => {
    setQueries([]); setQTotal(0); setQPage(1); setExpanded(new Set()); setRefSearch('')
    setAnalytics(null)
    setCqc(null)
  }, [clientId])

  // Load tab data whenever tab or clientId changes
  useEffect(() => {
    if (!token || !clientId) return
    const api = createPlatformClient(token)

    if (tab === 'queries' && queries.length === 0 && !queriesLoading) {
      setQL(true)
      api.tenants.queries(clientId, { page: '1', limit: String(LIMIT) })
        .then((d: any) => { setQueries(d.queries ?? []); setQTotal(d.total ?? 0) })
        .catch(() => {})
        .finally(() => setQL(false))
    }

    if (tab === 'analytics' && !analytics && !analyticsLoading) {
      setAL(true)
      api.tenants.analytics(clientId)
        .then(setAnalytics)
        .catch(() => {})
        .finally(() => setAL(false))
    }

    if (tab === 'cqc' && !cqc && !cqcLoading) {
      setCL(true)
      api.tenants.cqcReport(clientId)
        .then(setCqc)
        .catch(() => {})
        .finally(() => setCL(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, clientId, token])

  // Paginate queries
  useEffect(() => {
    if (!token || !clientId || tab !== 'queries' || queries.length === 0) return
    setQL(true)
    createPlatformClient(token)
      .tenants.queries(clientId, { page: String(queriesPage), limit: String(LIMIT) })
      .then((d: any) => { setQueries(d.queries ?? []); setQTotal(d.total ?? 0) })
      .catch(() => {})
      .finally(() => setQL(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriesPage])

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }

  function handleClientChange(id: string) {
    setClientId(id)
  }

  async function openModal(row: any) {
    if (!token || !clientId) return
    setModal({ row, messages: [], loading: true })
    try {
      const data = await createPlatformClient(token).tenants.sessionMessages(clientId, row.chat_session_id)
      setModal({ row, messages: data.messages, loading: false })
    } catch {
      setModal({ row, messages: [{ query_text: row.first_query, response_text: row.response_text, created_at: row.created_at, no_match: row.any_no_match }], loading: false })
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!token) return null

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',  label: 'Overview'        },
    { id: 'queries',   label: 'Queries'         },
    { id: 'analytics', label: 'Analytics'       },
    { id: 'cqc',       label: 'CQC Report'      },
    { id: 'costs',     label: 'Costs'           },
    { id: 'channels',  label: 'Channel Routing'  },
    { id: 'agents',    label: 'AI Agents'       },
    { id: 'reference', label: 'System Reference' },
    { id: 'qa',        label: 'QA Testing'      },
  ]

  const OVERVIEW_CARDS = stats ? [
    { label: 'Total clients',       value: stats.tenantCount,       Icon: Building2,     accent: true  },
    { label: 'Active policies',     value: stats.activePolicyCount, Icon: FileText,      accent: false },
    { label: 'Knowledge entries',   value: stats.knowledgeCount,    Icon: BookOpen,      accent: false },
    { label: 'Queries (all time)',  value: stats.queryCount,        Icon: MessageSquare, accent: false },
    { label: 'Queries (last 7d)',   value: stats.queriesLast7Days,  Icon: TrendingUp,    accent: false },
    { label: 'Regulations (live)',  value: stats.regulationCount,   Icon: BookOpen,      accent: false },
    { label: 'Pages auto-indexed',  value: stats.indexedPageCount ?? 0, Icon: Search,    accent: true,
      sub: stats.indexBalance != null ? `${stats.indexBalance.toLocaleString()} RalfyIndex credits left` : 'RalfyIndex' },
  ] : []

  return (
    <PlatformShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-neutral-dark">Platform Overview</h1>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-teal text-teal'
                  : 'border-transparent text-neutral-mid hover:text-neutral-dark'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : (
          <>

            {/* ── Overview ─────────────────────────────────────────────── */}
            {tab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {OVERVIEW_CARDS.map(({ label, value, Icon, accent, sub }: { label: string; value: number; Icon: typeof Search; accent: boolean; sub?: string }) => (
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
                      {sub && <p className="mt-0.5 text-xs text-neutral-mid">{sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Daily activity chart */}
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                      <h2 className="font-semibold text-neutral-dark">Daily interactions</h2>
                      <p className="mt-0.5 text-xs text-neutral-mid">Platform-wide queries per day, split by channel</p>
                    </div>
                    <div className="flex gap-1 rounded-md border border-gray-200 p-0.5 text-xs font-medium">
                      {[7, 30, 90].map(d => (
                        <button
                          key={d}
                          onClick={() => setChartDays(d)}
                          className={`rounded px-3 py-1.5 transition-colors ${
                            chartDays === d
                              ? 'bg-teal text-white'
                              : 'text-neutral-mid hover:text-neutral-dark'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-5">
                    {loading ? (
                      <div className="flex h-48 items-center justify-center">
                        <p className="text-sm text-neutral-mid">Loading…</p>
                      </div>
                    ) : (
                      <QueryVolumeChart data={chartData} days={chartDays} />
                    )}
                  </div>
                </div>

                {/* At-risk clients */}
                {tenants.filter(t => atRisk(t.stats, t.plan)).length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <h2 className="text-sm font-semibold text-amber-800">
                        Clients approaching plan limits
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {tenants.filter(t => atRisk(t.stats, t.plan)).map(t => {
                        const plan = t.plan as PlanLimits
                        const items = [
                          { label: 'queries', used: t.stats.queriesThisMonth,     limit: plan.monthly_query_limit          },
                          { label: 'policies', used: t.stats.policyCount,          limit: plan.max_policies                 },
                          { label: 'staff',    used: t.stats.activeUserCount,      limit: plan.max_staff_users              },
                          { label: 'KB',       used: t.stats.manualKnowledgeCount, limit: plan.max_manual_knowledge_entries },
                        ].filter(i => i.limit !== null && i.used / i.limit! >= 0.9)
                        return (
                          <div key={t.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5">
                            <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                              {t.name}
                            </Link>
                            <div className="flex items-center gap-3">
                              {items.map(i => (
                                <span key={i.label} className="text-xs font-medium text-red-600">
                                  {i.used}/{i.limit} {i.label}
                                </span>
                              ))}
                              <Link href={`/platform/clients/${t.id}`} className="text-xs text-teal hover:underline">
                                View →
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

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
                          <th className="px-4 py-3 text-right">Queries (this month)</th>
                          <th className="px-4 py-3 text-right">Policies</th>
                          <th className="px-4 py-3 text-right">Staff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tenants.map(t => {
                          const risk = atRisk(t.stats, t.plan)
                          return (
                            <tr key={t.id} className={`hover:bg-neutral-light/50 ${risk ? 'bg-amber-50/40' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                                    {t.name}
                                  </Link>
                                  {risk && <AlertTriangle size={12} className="text-amber-500" />}
                                </div>
                                <p className="text-xs text-neutral-mid">{t.slug}</p>
                              </td>
                              <td className="px-4 py-3 text-neutral-mid">{t.plan?.name ?? '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={t.subscription_status} /></td>
                              <td className="px-4 py-3 text-right">
                                <span className={`text-sm font-medium ${
                                  t.plan?.monthly_query_limit != null && t.stats.queriesThisMonth / t.plan.monthly_query_limit >= 0.9
                                    ? 'text-red-600' : 'text-neutral-dark'
                                }`}>
                                  {t.stats.queriesThisMonth.toLocaleString()}
                                  {t.plan?.monthly_query_limit != null && (
                                    <span className="ml-1 text-xs font-normal text-neutral-mid">
                                      / {t.plan.monthly_query_limit.toLocaleString()}
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.policyCount}</td>
                              <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.activeUserCount}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Queries ──────────────────────────────────────────────── */}
            {tab === 'queries' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <ClientSelector tenants={tenants} selectedId={clientId} onChange={handleClientChange} />
                  {clientId && (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
                      <input
                        type="text"
                        placeholder="Search by REF…"
                        value={refSearch}
                        onChange={e => setRefSearch(e.target.value.toUpperCase())}
                        className="h-9 rounded-lg border border-gray-200 bg-white pl-8 pr-8 text-sm text-neutral-dark placeholder:text-neutral-mid focus:outline-none focus:ring-2 focus:ring-teal/30 w-44"
                      />
                      {refSearch && (
                        <button
                          onClick={() => setRefSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!clientId ? (
                  <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-neutral-mid">
                    Select a client above to view their queries
                  </div>
                ) : queriesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-neutral-mid" /></div>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-xs text-neutral-mid">
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">Matched</span>
                        Every question was answered from the client&apos;s policies.
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-600">Partial</span>
                        Some questions were answered, others were not.
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-600">No match</span>
                        Nothing in the chat was answered.
                      </span>
                    </div>

                    {(() => {
                      const filtered = refSearch
                        ? queries.filter(q => sessionRef(q.session_key).includes(refSearch))
                        : queries
                      return (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                          <tr>
                            <th className="px-4 py-3">Channel</th>
                            <th className="px-4 py-3">Staff member</th>
                            <th className="px-4 py-3">First question</th>
                            <th className="px-4 py-3">Area</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Last active</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-sm text-neutral-mid">
                                {refSearch ? `No sessions matching "${refSearch}"` : 'No queries yet'}
                              </td>
                            </tr>
                          ) : filtered.map((q: any) => (
                            <Fragment key={q.session_key}>
                              <tr
                                className="cursor-pointer border-b border-gray-50 hover:bg-neutral-light/50"
                                onClick={() => toggleExpand(q.session_key)}
                              >
                                <td className="px-4 py-3">
                                  {q.channel === 'email' ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                                      <Mail size={9} /> Email
                                    </span>
                                  ) : q.channel === 'whatsapp' ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                      <MessageSquare size={9} /> WhatsApp
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
                                      <MessageSquare size={9} /> Chat
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {q.user ? (
                                    <div>
                                      <p className="font-medium text-neutral-dark">{q.user.name}</p>
                                      <p className="text-xs text-neutral-mid">{q.user.email}</p>
                                    </div>
                                  ) : <span className="text-neutral-mid">—</span>}
                                </td>
                                <td className="max-w-xs px-4 py-3">
                                  <p className="line-clamp-2 text-neutral-dark">{q.first_query}</p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                    <span className="rounded-full bg-teal-light px-1.5 py-0.5 text-xs font-medium text-teal">
                                      {sessionRef(q.session_key)}
                                    </span>
                                    {q.message_count > 1 && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-light px-1.5 py-0.5 text-xs text-teal">
                                        <MessageSquare size={9} />{q.message_count} msgs
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {q.document_category_queried ? (
                                    <span className="flex items-center gap-1 text-xs text-neutral-mid">
                                      {q.document_category_queried === 'internal_policy'
                                        ? <BookOpen size={10} className="text-teal" />
                                        : <Users    size={10} className="text-teal" />}
                                      {CATEGORY_LABELS[q.document_category_queried] ?? q.document_category_queried}
                                    </span>
                                  ) : <span className="text-xs text-neutral-mid">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <ResultBadge anyNoMatch={q.any_no_match} allNoMatch={q.all_no_match} />
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    q.deleted_from_chat ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'
                                  }`}>
                                    {q.deleted_from_chat ? 'Removed' : 'Live'}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-mid">
                                  {q.last_message_at ? fmt(q.last_message_at) : '—'}
                                </td>
                                <td className="px-4 py-3 text-neutral-mid">
                                  {expanded.has(q.session_key) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </td>
                              </tr>
                              {expanded.has(q.session_key) && (
                                <tr className="border-b border-gray-100 bg-neutral-light/40">
                                  <td colSpan={8} className="px-6 py-4">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                                      {[
                                        { label: 'Staff',           value: q.user ? `${q.user.name} (${q.user.email})` : '—' },
                                        { label: 'Channel',         value: q.channel ?? '—' },
                                        { label: 'Messages',        value: q.message_count },
                                        { label: 'Response time',   value: q.total_response_time_ms ? fmtMs(q.total_response_time_ms) : '—' },
                                        { label: 'Area',            value: q.document_category_queried ? (CATEGORY_LABELS[q.document_category_queried] ?? q.document_category_queried) : '—' },
                                        { label: 'Session started', value: q.started_at ? fmt(q.started_at) : '—' },
                                        { label: 'Last active',     value: q.last_message_at ? fmt(q.last_message_at) : '—' },
                                      ].map(({ label, value }) => (
                                        <div key={label}>
                                          <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">{label}</p>
                                          <p className="mt-0.5 text-neutral-dark">{value}</p>
                                        </div>
                                      ))}
                                      <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Language(s)</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {(q.all_languages?.length > 0 ? q.all_languages : [q.language_detected]).filter(Boolean).map((l: string) => (
                                            <span key={l} className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                              l === q.language_detected ? 'bg-teal-light text-teal' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                              {LANG_NAMES[l] ?? l}{l === q.language_detected ? ' ✦' : ''}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                      <button
                                        onClick={e => { e.stopPropagation(); openModal(q) }}
                                        className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
                                      >
                                        <MessageSquare size={14} />
                                        View full interaction
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                      )
                    })()}

                    {!refSearch && queriesTotal > LIMIT && (
                      <div className="flex items-center justify-between text-xs text-neutral-mid">
                        <span>
                          Showing {Math.min((queriesPage - 1) * LIMIT + 1, queriesTotal)}–{Math.min(queriesPage * LIMIT, queriesTotal)} of {queriesTotal}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setQPage(p => Math.max(1, p - 1))}
                            disabled={queriesPage === 1}
                            className="rounded px-3 py-1.5 font-medium hover:bg-neutral-light disabled:opacity-40"
                          >Previous</button>
                          <button
                            onClick={() => setQPage(p => p + 1)}
                            disabled={queriesPage * LIMIT >= queriesTotal}
                            className="rounded px-3 py-1.5 font-medium hover:bg-neutral-light disabled:opacity-40"
                          >Next</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Analytics ────────────────────────────────────────────── */}
            {tab === 'analytics' && (
              <div className="space-y-6">
                <ClientSelector tenants={tenants} selectedId={clientId} onChange={handleClientChange} />

                {!clientId ? (
                  <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-neutral-mid">
                    Select a client above to view their analytics
                  </div>
                ) : analyticsLoading || !analytics ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-neutral-mid" /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                      <StatCard
                        label="Queries this month"
                        value={analytics.total_queries.this_month}
                        sub={`Last month: ${analytics.total_queries.last_month}`}
                        accent
                      />
                      <StatCard
                        label="Active users"
                        value={analytics.active_users.this_month}
                        sub={`Last month: ${analytics.active_users.last_month}`}
                      />
                      <StatCard
                        label="No-match rate"
                        value={`${analytics.no_match_rate}%`}
                        sub="Questions unanswered"
                      />
                      <StatCard
                        label="Avg response time"
                        value={fmtMs(analytics.avg_response_ms)}
                        sub="This month"
                      />
                      <StatCard
                        label="Multilingual sessions"
                        value={analytics.multilingual_sessions ?? 0}
                        sub="Language switched mid-chat"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Channel split</h3>
                        {(() => {
                          const total    = analytics.channel_split.chat + analytics.channel_split.email
                          const chatPct  = total > 0 ? Math.round((analytics.channel_split.chat  / total) * 100) : 0
                          const emailPct = total > 0 ? Math.round((analytics.channel_split.email / total) * 100) : 0
                          return (
                            <div className="space-y-2">
                              {[
                                { label: 'Chat',  count: analytics.channel_split.chat,  pct: chatPct,  color: 'bg-teal' },
                                { label: 'Email', count: analytics.channel_split.email, pct: emailPct, color: 'bg-blue-400' },
                              ].map(({ label, count, pct, color }) => (
                                <div key={label}>
                                  <div className="mb-1 flex justify-between text-xs text-neutral-mid">
                                    <span>{label}</span><span>{count} ({pct}%)</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Monthly query trend</h3>
                        {analytics.monthly_trend.length === 0 ? (
                          <p className="text-xs text-neutral-mid">No data yet</p>
                        ) : (
                          <div className="space-y-1">
                            {analytics.monthly_trend.slice(-6).map((m: any) => {
                              const max = Math.max(...analytics.monthly_trend.map((r: any) => r.count), 1)
                              return (
                                <div key={m.period} className="flex items-center gap-2 text-xs">
                                  <span className="w-14 text-neutral-mid">{m.period}</span>
                                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
                                    <div className="h-full rounded-full bg-teal" style={{ width: `${(m.count / max) * 100}%` }} />
                                  </div>
                                  <span className="w-8 text-right text-neutral-dark">{m.count}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {analytics.top_policies.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Most queried policies (this month)</h3>
                        <div className="space-y-1.5">
                          {analytics.top_policies.map((p: any) => {
                            const max = analytics.top_policies[0].count
                            return (
                              <div key={p.policy_id} className="flex items-center gap-3 text-xs">
                                <span className="w-48 truncate text-neutral-dark">{p.policy_name}</span>
                                <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
                                  <div className="h-full rounded-full bg-teal" style={{ width: `${(p.count / max) * 100}%` }} />
                                </div>
                                <span className="w-6 text-right text-neutral-mid">{p.count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {analytics.knowledge_gaps.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">
                          Recent knowledge gaps{' '}
                          <span className="text-xs font-normal text-neutral-mid">(unanswered queries, last 30 days)</span>
                        </h3>
                        <div className="divide-y divide-gray-100">
                          {analytics.knowledge_gaps.map((g: any, i: number) => (
                            <div key={i} className="flex items-start justify-between gap-4 py-2 text-sm">
                              <span className="text-neutral-dark">{g.query_text}</span>
                              <span className="shrink-0 text-xs text-neutral-mid">{new Date(g.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CQC Report ───────────────────────────────────────────── */}
            {tab === 'cqc' && (
              <div className="space-y-6">
                <ClientSelector tenants={tenants} selectedId={clientId} onChange={handleClientChange} />

                {!clientId ? (
                  <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-neutral-mid">
                    Select a client above to view their CQC report
                  </div>
                ) : cqcLoading || !cqc ? (
                  <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-neutral-mid" /></div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Report summary</h3>
                      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        {[
                          { label: 'Organisation',   value: cqc.meta.org_name },
                          { label: 'Total queries',  value: cqc.meta.total_queries },
                          { label: 'Staff querying', value: cqc.meta.total_staff_with_queries },
                          { label: 'Period',         value: `${new Date(cqc.meta.date_from).toLocaleDateString('en-GB')} – ${new Date(cqc.meta.date_to).toLocaleDateString('en-GB')}` },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <dt className="text-xs text-neutral-mid">{label}</dt>
                            <dd className="mt-0.5 font-medium text-neutral-dark">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white">
                      <div className="border-b border-gray-100 px-5 py-3">
                        <h3 className="text-sm font-semibold text-neutral-dark">Policy access summary</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                          <tr>
                            <th className="px-4 py-2">Policy</th>
                            <th className="px-4 py-2 text-right">Queries</th>
                            <th className="px-4 py-2 text-right">Unique staff</th>
                            <th className="px-4 py-2">Last accessed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cqc.policy_access.map((p: any) => (
                            <tr key={p.id} className="hover:bg-neutral-light/50">
                              <td className="px-4 py-2 font-medium text-neutral-dark">
                                {p.name} <span className="text-xs font-normal text-neutral-mid">v{p.version}</span>
                              </td>
                              <td className="px-4 py-2 text-right text-neutral-dark">{p.total_queries}</td>
                              <td className="px-4 py-2 text-right text-neutral-mid">{p.unique_staff}</td>
                              <td className="px-4 py-2 text-xs text-neutral-mid">
                                {p.last_accessed ? new Date(p.last_accessed).toLocaleDateString('en-GB') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {cqc.staff_engagement.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Staff engagement by role</h3>
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                            <tr>
                              <th className="pb-2">Role</th>
                              <th className="pb-2 text-right">Queries</th>
                              <th className="pb-2 text-right">Unique staff</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cqc.staff_engagement.map((s: any) => (
                              <tr key={s.role}>
                                <td className="py-2 capitalize text-neutral-dark">{s.role}</td>
                                <td className="py-2 text-right text-neutral-dark">{s.query_count}</td>
                                <td className="py-2 text-right text-neutral-mid">{s.unique_staff}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {cqc.regulatory_activity.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Regulatory framework activity</h3>
                        <div className="space-y-2">
                          {cqc.regulatory_activity.map((r: any) => {
                            const max = cqc.regulatory_activity[0].query_count
                            return (
                              <div key={r.framework} className="flex items-center gap-3 text-xs">
                                <span className="w-52 truncate text-neutral-dark">{r.framework}</span>
                                <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
                                  <div className="h-full rounded-full bg-teal" style={{ width: `${(r.query_count / max) * 100}%` }} />
                                </div>
                                <span className="w-6 text-right text-neutral-mid">{r.query_count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {cqc.multilingual_access.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-neutral-dark">Language usage</h3>
                          {cqc.multilingual_session_count > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                              {cqc.multilingual_session_count} session{cqc.multilingual_session_count !== 1 ? 's' : ''} switched language mid-chat
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {cqc.multilingual_access.map((l: any) => (
                            <span key={l.language} className={`rounded-full px-3 py-1 text-xs ${
                              l.language === 'eng' ? 'bg-teal-light text-teal' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {LANG_NAMES[l.language] ?? l.language} — {l.query_count} queries ({l.pct}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {cqc.policies_not_accessed.length > 0 && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                        <h3 className="mb-3 text-sm font-semibold text-orange-800">
                          Policies not accessed in period ({cqc.policies_not_accessed.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {cqc.policies_not_accessed.map((p: any) => (
                            <span key={p.id} className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs text-orange-700">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {cqc.knowledge_gaps.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">
                          Knowledge gaps{' '}
                          <span className="text-xs font-normal text-neutral-mid">({cqc.knowledge_gaps.length} unanswered queries)</span>
                        </h3>
                        <div className="divide-y divide-gray-100">
                          {cqc.knowledge_gaps.map((g: any, i: number) => (
                            <div key={i} className="flex items-start justify-between gap-4 py-2 text-sm">
                              <span className="text-neutral-dark">{g.query_text}</span>
                              <span className="shrink-0 text-xs text-neutral-mid">{new Date(g.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Channel Routing ──────────────────────────────────────────── */}
            {tab === 'costs' && <PlatformCosts token={token} />}

            {tab === 'channels' && <ChannelRoutingMap />}

            {/* ── AI Agents (WebMCP) ───────────────────────────────────────── */}
            {tab === 'agents' && <AgentInteractions token={token} />}

            {/* ── System Reference ─────────────────────────────────────────── */}
            {tab === 'reference' && <SystemReference />}

            {/* ── QA Testing ───────────────────────────────────────────────── */}
            {tab === 'qa' && <QATestingPanel />}

          </>
        )}
      </div>

      {/* ── Full interaction modal ──────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-semibold text-neutral-dark">
                  Full interaction — {modal.row.message_count} {modal.row.message_count === 1 ? 'message' : 'messages'}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  <span className="font-medium text-teal">{sessionRef(modal.row.session_key)}</span>
                  {' · '}{modal.row.user?.name ?? 'Unknown'}
                  {' · '}{fmt(modal.row.created_at)}
                  {modal.row.document_category_queried && (
                    <> · {CATEGORY_LABELS[modal.row.document_category_queried] ?? modal.row.document_category_queried}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation thread */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {modal.loading ? (
                <p className="py-8 text-center text-sm text-neutral-mid">Loading conversation…</p>
              ) : (
                modal.messages.map((msg: any, i: number) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal px-4 py-3 text-sm leading-relaxed text-white">
                        {msg.query_text}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-neutral-light px-4 py-3">
                        {msg.response_text ? (
                          <div
                            className="message-content text-sm leading-relaxed text-neutral-dark"
                            dangerouslySetInnerHTML={{ __html: msg.response_text }}
                          />
                        ) : (
                          <p className="text-sm text-neutral-mid">Response not available.</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 border-t border-gray-200 pt-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            msg.no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                          }`}>
                            {msg.no_match ? 'No match' : 'Matched'}
                          </span>
                          {msg.response_time_ms && (
                            <span className="text-xs text-neutral-mid">{fmtMs(msg.response_time_ms)}</span>
                          )}
                          {msg.created_at && (
                            <span className="ml-auto text-xs text-neutral-mid">{fmt(msg.created_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-100 px-6 py-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-md px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}

// ─── AI Agents (WebMCP interaction tracking) ──────────────────────────────────

function AgentStatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-teal/30 bg-teal-light/40' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-medium text-neutral-mid">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-teal-dark' : 'text-neutral-dark'}`}>{value.toLocaleString()}</p>
    </div>
  )
}

function PlatformCosts({ token }: { token: string | null }) {
  const [costs,   setCosts]   = useState<import('@/lib/platform-api').PlatformCosts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).tenants.costs()
      .then(setCosts)
      .catch((e: Error) => setError(e.message ?? 'Failed to load costs'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  const fmtUsd   = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtBytes = (b: number) => {
    if (b < 1024) return `${b} B`
    const u = ['KB', 'MB', 'GB', 'TB']; let i = -1; let v = b
    do { v /= 1024; i++ } while (v >= 1024 && i < u.length - 1)
    return `${v.toFixed(1)} ${u[i]}`
  }
  const fmtNum = (n: number) => n.toLocaleString('en-GB')

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
  }
  if (error) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  }
  if (!costs) return null

  const cards = [
    {
      key: 'ai', label: 'AI (Claude)', Icon: Cpu, usd: costs.ai.usd,
      badge: costs.ai.measured ? { text: 'Measured', cls: 'bg-green-50 text-green-700' } : { text: 'Part-estimated', cls: 'bg-amber-50 text-amber-700' },
      lines: [
        `${fmtNum(costs.ai.total_queries)} queries (30d)`,
        `${fmtNum(costs.ai.input_tokens)} in / ${fmtNum(costs.ai.output_tokens)} out tokens`,
        costs.ai.uncosted_queries > 0 ? `${fmtNum(costs.ai.uncosted_queries)} pre-logging (estimated)` : 'All queries token-logged',
      ],
    },
    {
      key: 'pinecone', label: 'Pinecone (vectors)', Icon: Database, usd: costs.pinecone.usd,
      badge: { text: 'Estimated', cls: 'bg-gray-100 text-neutral-mid' },
      lines: [
        `${fmtNum(costs.pinecone.vectors)} vectors`,
        `${fmtNum(costs.pinecone.namespaces)} namespaces`,
        'Monthly storage',
      ],
    },
    {
      key: 's3', label: 'S3 (file storage)', Icon: HardDrive, usd: costs.s3.usd,
      badge: { text: 'Estimated', cls: 'bg-gray-100 text-neutral-mid' },
      lines: [
        fmtBytes(costs.s3.bytes),
        `${fmtNum(costs.s3.objects)} files`,
        'Monthly storage',
      ],
    },
    {
      key: 'email', label: 'Email (SendGrid)', Icon: Mail, usd: costs.email.usd,
      badge: { text: 'Estimated', cls: 'bg-gray-100 text-neutral-mid' },
      lines: [
        `${fmtNum(costs.email.sends)} sends (30d)`,
        `${fmtNum(costs.email.reply_emails)} reply emails`,
        `${fmtNum(costs.email.training_sends)} training sends`,
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-dark">Platform costs</h2>
          <p className="text-sm text-neutral-mid">Across all clients · last {costs.period_days} days (storage is point-in-time monthly)</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-neutral-mid hover:text-neutral-dark">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Total */}
      <div className="rounded-xl border border-teal/20 bg-teal-light/30 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal">Estimated total / month</p>
        <p className="mt-1 text-4xl font-extrabold text-neutral-dark">{fmtUsd(costs.total_monthly_usd)}</p>
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <c.Icon size={16} className="text-teal" />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge.cls}`}>{c.badge.text}</span>
            </div>
            <p className="text-xs font-medium text-neutral-mid">{c.label}</p>
            <p className="mt-0.5 text-2xl font-bold text-neutral-dark">{fmtUsd(c.usd)}</p>
            <ul className="mt-3 space-y-0.5 border-t border-gray-100 pt-3 text-xs text-neutral-mid">
              {c.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-neutral-mid">{costs.note}</p>
    </div>
  )
}

function AgentInteractions({ token }: { token: string | null }) {
  const [events,  setEvents]  = useState<AgentEventsData | null>(null)
  const [leads,   setLeads]   = useState<LeadsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    const api = createPlatformClient(token)
    Promise.all([api.agentEvents(), api.leads()])
      .then(([e, l]) => { setEvents(e); setLeads(l) })
      .catch((err: Error) => setError(err.message ?? 'Failed to load agent data'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
  }
  if (error) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
  }

  const maxToolCount = Math.max(1, ...(events?.byTool ?? []).map(t => t.count))
  const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const agentLeads = (leads?.leads ?? []).filter(l => l.source === 'agent').length

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal/20 bg-teal-light/30 px-5 py-4">
        <p className="text-sm font-semibold text-teal-dark">AI Agent Interactions (WebMCP)</p>
        <p className="mt-1 text-xs text-neutral-mid">
          How AI agents are using CareStream&rsquo;s WebMCP tools. One row is logged per tool invocation
          (<code className="rounded bg-gray-100 px-1">/public/marketing/agent-events</code>). Live once browsers ship WebMCP — Chrome Canary today.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <AgentStatCard label="Tool calls (all time)" value={events?.total ?? 0} accent />
        <AgentStatCard label="Last 7 days"           value={events?.last7Days ?? 0} />
        <AgentStatCard label="Last 30 days"          value={events?.last30Days ?? 0} />
        <AgentStatCard label="Confirmed mutations"   value={events?.mutations ?? 0} />
        <AgentStatCard label="Leads via agents"      value={agentLeads} />
      </div>

      {/* Per-tool breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-sm font-semibold text-neutral-dark">Invocations by tool</p>
        {(events?.byTool ?? []).length === 0 ? (
          <p className="text-sm text-neutral-mid">No agent tool calls recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {events!.byTool.map(t => (
              <div key={t.tool} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate font-mono text-xs text-neutral-dark">{t.tool}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${(t.count / maxToolCount) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-semibold text-neutral-dark">{t.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent invocations */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <p className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-neutral-dark">Recent invocations</p>
        {(events?.recent ?? []).length === 0 ? (
          <p className="px-5 py-4 text-sm text-neutral-mid">Nothing yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-light/50 text-left text-xs text-neutral-mid">
              <tr>
                <th className="px-5 py-2 font-medium">Tool</th>
                <th className="px-5 py-2 font-medium">Detail</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events!.recent.map(r => (
                <tr key={r.id}>
                  <td className="px-5 py-2">
                    <span className="font-mono text-xs text-neutral-dark">{r.tool_name}</span>
                    {r.mutation && <RefTag color="amber">mutation</RefTag>}
                  </td>
                  <td className="px-5 py-2 text-neutral-mid">{r.summary ?? r.path ?? '—'}</td>
                  <td className="px-5 py-2">
                    <span className={r.status === 'ok' ? 'text-green-600' : r.status === 'declined' ? 'text-amber-600' : 'text-red-500'}>{r.status}</span>
                  </td>
                  <td className="px-5 py-2 text-neutral-mid">{fmt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leads (so they're never lost) */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-semibold text-neutral-dark">Recent leads (contact &amp; demo)</p>
          <span className="text-xs text-neutral-mid">{leads?.newCount ?? 0} new · {leads?.total ?? 0} total</span>
        </div>
        {(leads?.leads ?? []).length === 0 ? (
          <p className="px-5 py-4 text-sm text-neutral-mid">No leads captured yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-light/50 text-left text-xs text-neutral-mid">
              <tr>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Organisation</th>
                <th className="px-5 py-2 font-medium">Via</th>
                <th className="px-5 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads!.leads.slice(0, 30).map(l => (
                <tr key={l.id}>
                  <td className="px-5 py-2"><RefTag color={l.type === 'demo' ? 'purple' : 'blue'}>{l.type}</RefTag></td>
                  <td className="px-5 py-2 text-neutral-dark">{l.name}</td>
                  <td className="px-5 py-2 text-neutral-mid">{l.email}</td>
                  <td className="px-5 py-2 text-neutral-mid">{l.organisation ?? '—'}</td>
                  <td className="px-5 py-2">{l.source === 'agent' ? <RefTag color="teal">AI agent</RefTag> : <span className="text-xs text-neutral-mid">web</span>}</td>
                  <td className="px-5 py-2 text-neutral-mid">{fmt(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── System Reference ─────────────────────────────────────────────────────────

// Active System-Reference search query (lowercased), shared with every RefSection.
const RefSearchCtx = createContext('')

// Recursively gather all searchable text from a React subtree — RefRow label/value,
// RefSection title, paragraph text and any nested children.
function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(' ')
  if (isValidElement(node)) {
    const p = node.props as any
    return [p?.label, p?.value, p?.title, nodeText(p?.children)].filter(Boolean).map(String).join(' ')
  }
  return ''
}

function RefSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  const query = useContext(RefSearchCtx)
  const [open, setOpen] = useState(false)

  // ── Search mode: hide non-matching sections, auto-expand + narrow to matches ──
  if (query) {
    const titleMatch = title.toLowerCase().includes(query)
    if (!titleMatch && !nodeText(children).toLowerCase().includes(query)) return null
    const shown = titleMatch
      ? children
      : Children.toArray(children).filter(c => nodeText(c).toLowerCase().includes(query))
    return (
      <div data-refsec className="rounded-xl border border-teal/30 bg-white overflow-hidden">
        <div className="flex w-full items-center gap-3 px-5 py-4">
          <Icon size={16} className="shrink-0 text-teal" />
          <span className="flex-1 text-sm font-semibold text-neutral-dark">{title}</span>
        </div>
        <div className="border-t border-gray-100 px-5 py-4 text-sm text-neutral-dark space-y-3">
          {shown}
        </div>
      </div>
    )
  }

  return (
    <div data-refsec className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-neutral-light/50 transition-colors"
      >
        <Icon size={16} className="shrink-0 text-teal" />
        <span className="flex-1 text-sm font-semibold text-neutral-dark">{title}</span>
        {open ? <ChevronUp size={14} className="text-neutral-mid" /> : <ChevronDown size={14} className="text-neutral-mid" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-sm text-neutral-dark space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function RefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(11rem,max-content)_1fr] gap-x-4 gap-y-0.5">
      <span className="font-medium text-neutral-mid whitespace-nowrap">{label}</span>
      <span className="text-neutral-dark">{value}</span>
    </div>
  )
}

function RefTag({ children, color = 'teal' }: { children: React.ReactNode; color?: 'teal' | 'blue' | 'amber' | 'green' | 'purple' }) {
  const cls = {
    teal:   'bg-teal-light text-teal',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

// ─── Channel Routing Map ──────────────────────────────────────────────────────

type Avail = 'yes' | 'no' | 'partial'

const MATRIX_TOOLS: { label: string; sub: string; web: Avail; wa: Avail; email: Avail; voice: Avail; note?: string }[] = [
  { label: 'Policies & Procedures', sub: 'internal_policy',  web: 'yes', wa: 'yes',     email: 'yes', voice: 'yes' },
  { label: 'Staff Handbook',        sub: 'staff_handbook',   web: 'yes', wa: 'yes',     email: 'yes', voice: 'yes' },
  { label: 'Training & Learning',   sub: 'training_module',  web: 'yes', wa: 'yes',     email: 'yes', voice: 'yes' },
  { label: 'CQC Compliance',        sub: 'cqc_report',       web: 'yes', wa: 'yes',     email: 'yes', voice: 'yes' },
  { label: 'Auditing (AI chat)',     sub: 'audit_report',     web: 'yes', wa: 'no',      email: 'no',  voice: 'no',  note: 'Web chat only — answers questions about AI recommendations from completed audits' },
  { label: 'Business Continuity',   sub: 'business_continuity', web: 'yes', wa: 'no',   email: 'no',  voice: 'no',  note: 'Web chat only — reads approved KnowledgeEntry records tagged business_continuity from Postgres' },
  { label: 'Audit Form (conv.)',     sub: 'WhatsApp only',    web: 'no',  wa: 'yes',     email: 'no',  voice: 'no',  note: 'Conversational state machine — "audit" keyword triggers guided form completion' },
  { label: 'CQC Staff Prep',        sub: 'cqc_staff_prep',   web: 'no',  wa: 'partial', email: 'no',  voice: 'no',  note: 'WhatsApp: staff can practise CQC question & answer drills' },
]

function AvailCell({ val }: { val: Avail }) {
  if (val === 'yes')     return <span className="flex items-center justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 size={13} /></span></span>
  if (val === 'no')      return <span className="flex items-center justify-center"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400"><XCircle size={13} /></span></span>
  return                  <span className="flex items-center justify-center"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">partial</span></span>
}

interface RoutingStepProps {
  num:     number
  title:   string
  detail:  string
  color?:  'teal' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'
  lock?:   boolean
}

function RoutingStep({ num, title, detail, color = 'gray', lock = false }: RoutingStepProps) {
  const numBg: Record<string, string> = {
    teal:   'bg-teal text-white',
    amber:  'bg-amber-400 text-white',
    red:    'bg-red-500 text-white',
    blue:   'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
    gray:   'bg-gray-200 text-neutral-mid',
  }
  const border: Record<string, string> = {
    teal:   'border-teal/20 bg-teal-light/20',
    amber:  'border-amber-200 bg-amber-50/60',
    red:    'border-red-200 bg-red-50/60',
    blue:   'border-blue-200 bg-blue-50/60',
    purple: 'border-purple-200 bg-purple-50/60',
    gray:   'border-gray-200 bg-white',
  }
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${border[color]}`}>
      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${numBg[color]}`}>{num}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-dark flex items-center gap-1.5">
          {title}
          {lock && <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600"><Lock size={10} /> session lock</span>}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-mid">{detail}</p>
      </div>
    </div>
  )
}

function ChannelCard({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-neutral-light/40 transition-colors"
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${color}`}>
          <Icon size={17} className="text-white" />
        </div>
        <p className="flex-1 font-semibold text-neutral-dark">{title}</p>
        {open ? <ChevronUp size={15} className="text-neutral-mid" /> : <ChevronDown size={15} className="text-neutral-mid" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

function ChannelRoutingMap() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal/20 bg-teal-light/30 px-5 py-4">
        <p className="text-sm font-semibold text-teal-dark">Channel Routing Map</p>
        <p className="mt-1 text-xs text-neutral-mid">
          Which tools are available on each channel and the exact routing rules that govern how each message is classified and handled.
          Expand any channel card to see the step-by-step flow.
        </p>
      </div>

      {/* ── Tool × Channel matrix ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-semibold text-neutral-dark">Tool availability by channel</p>
          <p className="mt-0.5 text-xs text-neutral-mid">Green = fully available · Grey = not available · Amber = partial/specialist</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-medium text-neutral-mid">
                <th className="px-5 py-3 text-left">Tool</th>
                <th className="px-4 py-3 text-center w-24">
                  <div className="flex flex-col items-center gap-1"><MessageSquare size={14} className="text-teal" /><span>Web Chat</span></div>
                </th>
                <th className="px-4 py-3 text-center w-24">
                  <div className="flex flex-col items-center gap-1"><Phone size={14} className="text-green-600" /><span>WhatsApp</span></div>
                </th>
                <th className="px-4 py-3 text-center w-24">
                  <div className="flex flex-col items-center gap-1"><Mail size={14} className="text-indigo-500" /><span>Email</span></div>
                </th>
                <th className="px-4 py-3 text-center w-24">
                  <div className="flex flex-col items-center gap-1"><Mic size={14} className="text-purple-500" /><span>Voice</span></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_TOOLS.map((row, i) => (
                <tr key={i} className={`border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-neutral-light/20' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-dark">{row.label}</p>
                    <p className="text-xs text-neutral-mid font-mono">{row.sub}</p>
                    {row.note && <p className="mt-0.5 text-xs text-neutral-mid italic">{row.note}</p>}
                  </td>
                  <td className="px-4 py-3"><AvailCell val={row.web} /></td>
                  <td className="px-4 py-3"><AvailCell val={row.wa} /></td>
                  <td className="px-4 py-3"><AvailCell val={row.email} /></td>
                  <td className="px-4 py-3"><AvailCell val={row.voice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Per-channel routing flows ───────────────────────────────────────── */}
      <p className="text-sm font-semibold text-neutral-dark">Routing flow — expand a channel</p>

      <ChannelCard icon={MessageSquare} title="Web Chat (Staff Portal)" color="bg-teal">
        <RoutingStep num={1} title="Category selected by staff" color="teal"
          detail="Staff clicks a category card (Policies & Procedures, Staff Handbook, Training & Learning, CQC Compliance, or Auditing) before typing. The document_category is set in the UI — no classification needed." />
        <RoutingStep num={2} title="Query sent with explicit category" color="teal"
          detail="The API receives document_category in the request body. runQueryPipeline() branches immediately on selectedCategory — Pinecone RAG (policies/handbook/CQC) or Postgres-only (training seeds, audit recommendations)." />
        <RoutingStep num={3} title="Conversation history passed for multi-turn" color="gray"
          detail="The last 10 messages are trimmed and sent as conversationHistory. Claude maintains context across follow-up questions within the same session. Sessions persist in localStorage (up to 50 per user)." />
        <RoutingStep num={4} title="Response + suggested follow-up questions" color="gray"
          detail="Claude appends <!--FOLLOWUP:[...]-->  to its response. The API strips this before delivery and returns suggestedQuestions. Thumbs up/down feedback is recorded per query." />
        <div className="mt-1 rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-xs text-teal">
          <strong>New-chat starter questions (role-linked + rotating):</strong> <span className="text-neutral-dark">GET <code className="font-mono">/query/starters?category=</code> generates a pool of 6 prompts per (user, category) via Haiku (temp 0.8), seeded with the staff member&rsquo;s <code className="font-mono">job_role</code> + <code className="font-mono">facility_type</code> + their last ~15 chat queries (from the <code className="font-mono">queries</code> table) so prompts stay relevant and don&rsquo;t repeat. Pool cached in-memory 30 min per (user, category); localised via translateTextsBatch (glossary/overrides applied). Client (EmptyState) shows a random 3 from the pool, re-rolled on each new chat via sessionId. Falls back to the static SUGGESTED defaults if generation fails or the user has no job role.</span>
        </div>
        <div className="mt-1 space-y-1.5">
          <div className="rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-xs text-teal">
            <strong>Auditing category:</strong> Uses completed AuditRun.ai_recommendations from Postgres as context — no Pinecone search. Fetches up to 6 most recent completed audits for the tenant. Prompt slot: <code className="font-mono">audit_report_chat</code>.
          </div>
          <div className="rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-xs text-teal">
            <strong>Business Continuity category:</strong> Fetches all approved KnowledgeEntry records with <code className="font-mono">knowledge_category = 'business_continuity'</code> for the tenant from Postgres — no Pinecone search. Entries added/managed via Knowledge Base → Add entry → Category: Business Continuity. Prompt slot: <code className="font-mono">business_continuity_chat</code>.
          </div>
        </div>
      </ChannelCard>

      <ChannelCard icon={Phone} title="WhatsApp" color="bg-green-600">
        <div className="mb-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>Key rule:</strong> The Audit state machine runs BEFORE intent classification. While an audit is active, every message goes to the audit handler regardless of content — policies, training, and CQC queries are all blocked.
        </div>
        <RoutingStep num={1} title="Voice note? → transcribe first" color="purple"
          detail="If the message is a voice note (MediaContentType = audio/*), Whisper transcribes it. The transcript is then treated as a text message through the rest of the pipeline." />
        <RoutingStep num={2} title="Audit state machine check (SESSION LOCK)" color="red" lock
          detail="If session.detected_category === 'audit' OR message === 'audit' → handleAuditConversation() runs. Returns { handled: true } which exits the pipeline immediately. Active audit sessions consume ALL inbound messages. States: confirm → shift (Fire Marshall) / room (Resident Bedrooms) / yn → outcome → actions → summary. 'stop' or 'pause' keyword saves progress and releases the session lock." />
        <RoutingStep num={3} title="Intent classification" color="amber"
          detail="(1) Keyword scoring on message body → score against policy / training / CQC keyword lists. (2) If score ≥ threshold → detected_category set. (3) If unclear → Claude Haiku micro-classification (≤200 tokens). (4) If still unclear → clarification reply with label buttons (Policies / Training / HR / CQC). Detected category is cached on the session so follow-up messages skip re-classification." />
        <RoutingStep num={4} title="RAG pipeline" color="teal"
          detail="Routes to the correct runQueryPipeline() path based on detected_category: internal_policy → Pinecone vector search, training_module → training seeds (Postgres), cqc_report → multi-source CQC path, staff_handbook → two-stage chapter retrieval. Response is always concise mode (≤200 words) for WhatsApp." />
        <RoutingStep num={5} title="5-minute feedback timer" color="gray"
          detail="A BullMQ job is scheduled 5 minutes after response delivery. If the staff member replies before the timer fires, the feedback message is cancelled. Otherwise, a thumbs up/down prompt is sent." />
        <div className="mt-1 space-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-neutral-mid">
          <p><strong className="text-neutral-dark">Audit tool interactions on WhatsApp:</strong></p>
          <p>• While audit is active: Policies ✗ · Training ✗ · HR ✗ · CQC ✗ · Audit form ✓</p>
          <p>• After pause/complete: session lock released → all tools available again immediately</p>
          <p>• Fire Marshall: requires shift (day/night) — creates separate run per shift per day</p>
          <p>• Resident Bedrooms: requires room number — creates separate run per room</p>
          <p>• All other templates: single in_progress run per template per month</p>
        </div>
      </ChannelCard>

      <ChannelCard icon={Mail} title="Email" color="bg-indigo-500">
        <RoutingStep num={1} title="SendGrid Inbound Parse webhook" color="blue"
          detail="Inbound email hits /email/inbound → services/email/inbound.ts. Subject line is extracted first as a strong intent signal. Thread continuity is maintained via Message-ID and In-Reply-To headers." />
        <RoutingStep num={2} title="Intent classification" color="amber"
          detail="(1) Subject line keyword scoring → high-confidence categories skipped straight to RAG. (2) Body scoring if subject unclear. (3) Combined score → if still unclear, sends a 1/2/3 clarification reply in-thread. (4) Category cached on 7-day session so subsequent replies in the same thread skip classification." />
        <RoutingStep num={3} title="RAG pipeline — standard mode" color="teal"
          detail="Routes to runQueryPipeline() with channel='email'. Verbosity defaults to standard (full policy references). Conversation history from the thread is passed for multi-turn continuity. Response is formatted as HTML for email delivery." />
        <RoutingStep num={4} title="Email delivery via SendGrid" color="gray"
          detail="Response sent as a reply to the original thread. Session TTL: 7 days from last message. Email sessions do not support audit forms or auditing chat — those categories are web/WhatsApp only." />
      </ChannelCard>

      <ChannelCard icon={Mic} title="Voice (WhatsApp voice notes)" color="bg-purple-600">
        <RoutingStep num={1} title="Voice note detected" color="purple"
          detail="Twilio sends MediaContentType = audio/*. The API downloads the audio file and passes it to OpenAI Whisper for transcription. The transcript is then treated identically to a text message." />
        <RoutingStep num={2} title="Audit check (same as WhatsApp text)" color="red" lock
          detail="The transcribed text passes through the same audit state machine check. If an audit session is active, the voice note is handled by the audit handler. Voice notes cannot be used to answer yes/no questions in an audit — they are treated as free-text input." />
        <RoutingStep num={3} title="Intent classification — no clarification" color="amber"
          detail="Keyword scoring → Claude Haiku classification. If still unclear after AI classification, falls through to the general policy path. No clarification reply is sent for voice — the user cannot reply with a number in a voice note." />
        <RoutingStep num={4} title="RAG pipeline — always concise mode" color="teal"
          detail="Same pipeline as WhatsApp text. Response is always concise (≤200 words), written as clear spoken sentences (short paragraphs, minimal lists) suitable for reading aloud. No citation blocks." />
      </ChannelCard>

    </div>
  )
}

function SystemReference() {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasResults, setHasResults] = useState(true)

  // After each query change, count the sections that actually rendered.
  useEffect(() => {
    if (!query) { setHasResults(true); return }
    setHasResults((containerRef.current?.querySelectorAll('[data-refsec]').length ?? 0) > 0)
  }, [query])

  return (
    <RefSearchCtx.Provider value={query}>
    <div className="space-y-3" ref={containerRef}>
      <div className="rounded-xl border border-teal/20 bg-teal-light/30 px-5 py-4">
        <p className="text-sm font-semibold text-teal-dark">CareStream AI — Internal System Reference</p>
        <p className="mt-1 text-xs text-neutral-mid">
          Quick reference for the core systems, logic, and integrations. Search or click any section to expand.
          Last reviewed: June 2026.
        </p>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-10 -mx-1 bg-neutral-light/80 px-1 py-2 backdrop-blur">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search the reference — e.g. Stripe, webhook, Pinecone, refresh token…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-mid hover:text-neutral-dark"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {query && !hasResults && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-neutral-mid">
          No reference entries match “{q.trim()}”.
        </div>
      )}

      {/* Architecture Overview */}
      <RefSection icon={Cpu} title="Architecture Overview">
        <p className="leading-relaxed text-neutral-mid">
          CareStream AI is a monorepo with two apps: <strong>API</strong> (Express + Prisma, port 4000) and
          <strong> Web</strong> (Next.js 15 App Router, port 3000). The database is Supabase (PostgreSQL with RLS).
          Vectors are stored in Pinecone. Files in AWS S3. Emails via SendGrid. WhatsApp via Twilio.
          Background jobs via BullMQ + Redis.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="API framework"        value="Express 4 + TypeScript + tsx watch (dev)" />
          <RefRow label="Web framework"        value="Next.js 15 App Router, Tailwind CSS" />
          <RefRow label="Database"             value="Supabase PostgreSQL — carestreamai_api role (RLS enforced), service_role for migrations" />
          <RefRow label="ORM"                  value="Prisma 5 — client at /Care_Stream/node_modules (monorepo root)" />
          <RefRow label="Vector store"         value="Pinecone — index: carestreamai, region: eu-west-2" />
          <RefRow label="Embeddings"           value="OpenAI text-embedding-3-small" />
          <RefRow label="LLM"                  value="Claude Sonnet (main), Claude Haiku (intent classifier, button labels)" />
          <RefRow label="File storage"         value="AWS S3 eu-west-2" />
          <RefRow label="Background jobs"      value="BullMQ + Redis — ingestion worker at src/workers/ingestion.worker.ts" />
          <RefRow label="Dev API restart"      value="tsx watch does NOT detect Claude edits — must manually restart after any file change" />
          <RefRow label="Prisma regenerate"    value="cd /Care_Stream && npx prisma generate --schema=apps/api/prisma/schema.prisma" />
        </div>
      </RefSection>

      {/* Multi-site Groups (Enterprise) */}
      <RefSection icon={Building2} title="Multi-site Groups & Group Console (Enterprise)">
        <p className="leading-relaxed text-neutral-mid">
          A provider group is modelled with <strong>no separate Group table</strong>: sites are linked by
          <code className="text-xs bg-gray-100 px-1 rounded">tenants.parent_tenant_id</code>. The group root is
          <code className="text-xs bg-gray-100 px-1 rounded">parent_tenant_id ?? own id</code>; child sites point at the root.
          Only 2 levels are allowed (root → site, no nesting). A group admin is a normal admin user on one tenant who
          <strong> switches</strong> between sites; each switch mints a fresh JWT for the target tenant. Added 2026-07-02.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Grouping"          value="tenants.parent_tenant_id (self-relation TenantGroup). Root = null; sites = root id. Group root = parent_tenant_id ?? own id." />
          <RefRow label="List sites"        value="GET /sites → all tenants where id = groupRoot OR parent_tenant_id = groupRoot (admin-only). Returns is_current / is_root." />
          <RefRow label="Add a site"        value="POST /sites (self-service) or platform POST /admin/tenants/:id/sub-tenants. Always attaches to the group root; issues tokens so the admin can switch straight in." />
          <RefRow label="Switch site"       value="POST /auth/switch-site — admin-only; validates target is in the SAME group (currentRoot === targetRoot) then issues a new JWT with the target tenant_id. Web: NextAuth credentials mode:'switch' + pageCache.clear()." />
          <RefRow label="Group console UI"  value="apps/web/src/app/(admin)/group/page.tsx. Nav item 'Group' (Building2) injected into the Overview section by admin-shell.tsx ONLY when multiSite (sites.length > 1)." />
          <RefRow label="Rollup endpoint"   value="GET /sites/overview (routes/sites.ts). Derives the group from the caller's tenant (never trusts client input), then aggregates per-site training/onboarding/audit compliance + a group summary." />
          <RefRow label="Metrics"           value="Training % = complete/total (trainingEnrollment.status); Onboarding % = completed_at/total (+ overdue = due_date past & incomplete); Audits % = completed/total (auditRun.status). Overall = mean of the three that have data. Attention = overdue inductions + expired training." />
          <RefRow label="Isolation"         value="Aggregates use where: { tenant_id: { in: siteIds } } with siteIds derived server-side from the caller's own group — cannot span another group. Standard getTenantId() tenant-scoping is bypassed intentionally for these group-wide queries." />
          <RefRow label="api-client"        value="createApiClient(token).sites.overview() / .list() / .switch(id) — apps/web/src/lib/api-client.ts." />
          <RefRow label="Not yet built"     value="Central policy push to all homes, group trends over time, per-metric drill-down, a dedicated group-admin role. parent_tenant_id + switch are the only primitives so far." />
        </div>
      </RefSection>

      {/* Workforce Compliance Register (Enterprise) */}
      <RefSection icon={Building2} title="Workforce Compliance Register (Enterprise)">
        <p className="leading-relaxed text-neutral-mid">
          Enterprise-only staff credential register: DBS, right to work, professional registration and references,
          with expiry-driven Red/Amber/Green status. Gated by a new plan feature flag; the register itself is the
          first slice (V1) of the Workforce compliance feature. Added 2026-07-02.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Feature flag"    value="plans.has_workforce_compliance (boolean). true on the Enterprise plan only. PlanFeature 'has_workforce_compliance' → FEATURE_TIER Enterprise (apps/api/src/lib/plan-limits.ts). Surfaced via GET /billing/summary → features.has_workforce_compliance." />
          <RefRow label="DB table"        value="staff_credentials (text ids to match Prisma): tenant_id, user_id, type, reference, issued_at, expires_at, notes. UNIQUE(user_id, type). RLS enabled with tenant_isolation policy for carestreamai_api (tenant_id = get_current_tenant_id()), same as other tenant tables." />
          <RefRow label="Credential types" value="dbs | right_to_work | passport | professional_registration | reference (just a text value on staff_credentials — no migration to add one). A missing row = 'missing' (or 'outstanding' for references). No row is created until a credential is recorded." />
          <RefRow label="Status logic"    value="Computed at read time, NOT stored: reference → received/outstanding; others → expired (past) | expiring (≤30 days) | valid | missing. See statusFor() in routes/workforce.ts." />
          <RefRow label="Endpoints"       value="GET /workforce/register (grid + summary), GET /workforce/staff/:userId (per-staff), PUT …/credentials/:type (upsert), DELETE …/:type (clear). Router is requireAdmin + checkFeature('has_workforce_compliance') → 402 if not Enterprise." />
          <RefRow label="Documents (V2)"  value="Per-credential evidence upload: POST/GET/DELETE /workforce/staff/:userId/credentials/:type/document. Reuses evidenceUploadMiddleware + detectEvidenceType (shared lib/evidence-file.ts) + scanBuffer (Cloudmersive, fail-closed if configured) + uploadCredentialFile → S3 tenants/{tenant}/credentials/{user}/. Columns evidence_key/name/type/size/uploaded_at on staff_credentials. Served sandboxed like F2F evidence." />
          <RefRow label="Web UI"          value="apps/web/src/app/(admin)/workforce/page.tsx (register + per-staff editor with upload/view/replace). Nav 'Compliance' (BadgeCheck) in Team, greyed on non-Enterprise via usePlanFeatures()/hasFeature in admin-shell.tsx. Staff record /staff/[id] has a read-only 'Compliance credentials' section (Enterprise-gated) with View-document links." />
          <RefRow label="Expiry alerts (V3)" value="services/workforce/credentialExpiry.ts emails a tenant's active admins a digest of credentials expired or expiring within 30 days (references excluded — no expiry). PASSPORT also emails the staff member personally (overseas staff): on the cron only at renewal thresholds {30,14,7,3,1,0} days to avoid daily spam; the manual button always sends. Cron GET /cron/credential-expiry (0 8) over Enterprise tenants; gated by the compliance_expiry_alerts preference; manual 'Email expiry alerts' on /workforce → POST /settings/compliance-expiry/send (force). Uses sendTrainingUpdateEmail." />
          <RefRow label="Supervisions (V4)" value="staff_supervisions table: one row per session (type supervision|appraisal, held_on, conducted_by, next_due, notes). held_on may be FUTURE (booked) or past (held). GET /workforce/supervisions builds per-staff cell = last past session + earliest upcoming (next_on) + status (booked | overdue | due_soon(≤30d) | ok | none). GET/POST /workforce/staff/:userId/supervisions, DELETE /workforce/supervisions/:id. UI: 2nd tab on /workforce + read-only section on /staff/[id]." />
          <RefRow label="Supervision emails" value="Booking: POST supervisions emails the staff member when held_on ≥ today (notifyUsers, 'supervision_updates' pref). Reminder: services/workforce/supervisionReminders.ts (cron GET /cron/supervision-reminders, vercel.json 0 8) finds sessions held_on = tomorrow across Enterprise tenants and emails the staff member + an admin digest. Both gated by the supervision_updates email preference." />
          <RefRow label="Staff hub"       value="GET /me/supervisions (returns {enabled, records}; enabled=false when not Enterprise). Hub 'Supervisions' view (components/hub/supervisions-view.tsx) shows the staff member's upcoming (booked) + past sessions; nav item gated on planFeatures.has_workforce_compliance. api-client: me.supervisions()." />
          <RefRow label="api-client"      value="workforce.register() / .staff / .saveCredential / .deleteCredential / .uploadDocument / .downloadDocument / .deleteDocument / .supervisions / .staffSupervisions / .addSupervision / .deleteSupervision. settings.sendComplianceExpiryAlerts()." />
          <RefRow label="Roadmap"         value="V1 register (done). V2 document uploads (done). V3 expiry alerts (done). V4 supervisions & appraisals (done). Mandatory training matrix is covered by the existing training modules; not rebuilt. Care Certificate deferred. Remaining: CQC evidence export + group rollup." />
        </div>
      </RefSection>

      {/* Onboarding Email Drip */}
      <RefSection icon={Mail} title="Onboarding Email Drip (Email Marketing)">
        <p className="leading-relaxed text-neutral-mid">
          Plan-specific welcome sequence sent to new clients, one email per working day, benefit-led, one feature each.
          Managed under <strong>Platform &rarr; Email Marketing</strong> (edit subject line + preview text per email).
          Per-client activity shows on each client&rsquo;s detail page. Built 2026-06-26.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Sequences"         value="Starter 12 emails · Professional 16 · Enterprise 20. Core emails 1–11 are shared; later emails are plan-specific premium features + a finale." />
          <RefRow label="Cadence"           value="One email per working day (weekends skipped) at 10am UK. DST-aware (cron at 09:00 & 10:00 UTC; dispatch only sends when it is 10am Europe/London)." />
          <RefRow label="On signup"         value="Day-1 welcome sent immediately on registration; then dripped by plan. Skipped for training-only tenants. Plan refreshed on billing /sync so days 12+ match the chosen plan." />
          <RefRow label="Recipients"        value="Every ACTIVE admin user on the tenant." />
          <RefRow label="From / reply-to"   value="hello@carestreamai.com (SendGrid). Open + click tracking enabled; events via the SendGrid Event Webhook." />
          <RefRow label="DB tables"         value="onboarding_emails (templates, editable subject/preheader, body JSONB) · onboarding_enrolments (tenant, plan, start_date, status) · onboarding_sends (per recipient: sent/delivered/opened/clicked)." />
          <RefRow label="Cron"              value="GET /cron/onboarding-emails (vercel.json, 0 9,10 * * *). Self-heals the template seed each run. ?force=1 bypasses the 10am gate (cron-authed)." />
          <RefRow label="Code"              value="apps/api/src/services/onboarding/ (content, seed, render, dispatch) · routes/onboarding-public.ts (unsubscribe + /onboarding/events webhook) · admin.ts (/admin/onboarding/*)." />
          <RefRow label="Images"            value="Screenshots at /email-previews/*.png (web public dir), referenced as absolute URLs in emails. NOTE: contain real Ferndale data — anonymise before wider rollout." />
          <RefRow label="Webhook"           value="SendGrid Event Webhook → POST https://api.carestreamai.com/onboarding/events (acts only on events carrying our onboarding_send_id custom arg)." />
          <RefRow label="Unsubscribe"       value="GET /onboarding/unsubscribe?e=<enrolment>&t=<hmac> cancels the tenant's drip." />
          <RefRow label="First live test"   value="Mon 2026-06-29 10am UK — Enterprise sequence to all active admins of CS-1001, CS-1002, CS-1009 (live test accounts)." />
        </div>
      </RefSection>

      {/* Channel Routing & Intent Classification */}
      <RefSection icon={GitBranch} title="Channel Routing & Intent Classification">
        <p className="leading-relaxed text-neutral-mid">
          Inbound messages arrive on four channels. Web chat uses UI buttons to set the category explicitly.
          Email, WhatsApp, and voice run through the intent classifier before hitting the main RAG pipeline.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Web chat</p>
            <p className="text-neutral-mid">User clicks a category button (Policies, Training, CQC). <code className="text-xs bg-gray-100 px-1 rounded">document_category</code> is set before the query reaches the API. No classification needed.</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Email</p>
            <p className="text-neutral-mid">SendGrid Inbound Parse → <code className="text-xs bg-gray-100 px-1 rounded">/email/inbound</code> → <code className="text-xs bg-gray-100 px-1 rounded">services/email/inbound.ts</code>. Subject line is scored first (strong signal). If unclear, sends a 1/2/3 clarification reply in-thread. Thread continuity via Message-ID / In-Reply-To headers. 7-day session TTL.</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">WhatsApp</p>
            <p className="text-neutral-mid">Twilio webhook → <code className="text-xs bg-gray-100 px-1 rounded">/whatsapp/inbound</code> → <code className="text-xs bg-gray-100 px-1 rounded">services/whatsapp/inbound.ts</code>. Voice notes are transcribed automatically first. If intent unclear, sends a label-based clarification (Policies / Training / CQC). 24-hour session TTL. Feedback prompt sent 5 minutes after response — skipped if the user replies first.</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Voice (via WhatsApp voice notes)</p>
            <p className="text-neutral-mid">Voice notes are transcribed with Whisper then classified. If still unclear after AI classification, falls through to the general policy path (no clarification message — cannot reply with numbers in a voice note).</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Intent classifier</p>
            <p className="text-neutral-mid"><code className="text-xs bg-gray-100 px-1 rounded">services/intent/classifier.ts</code> — Resolution order: (1) keyword scoring on subject line, (2) keyword scoring on body, (3) combined score, (4) Claude Haiku micro-classification (≤200 tokens), (5) 'unclear' → clarification. Detected category is persisted on the session so subsequent messages in the same thread don't re-classify.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <RefTag color="teal">internal_policy</RefTag>
          <RefTag color="blue">training_module</RefTag>
          <RefTag color="purple">cqc_report</RefTag>
          <RefTag color="amber">unclear → clarification</RefTag>
        </div>
      </RefSection>

      {/* Language Detection & Multilingual Responses */}
      <RefSection icon={Globe} title="Language Detection & Multilingual Responses">
        <p className="leading-relaxed text-neutral-mid">
          Every inbound message (web chat, email, WhatsApp) is language-detected so the AI can reply in the
          staff member&rsquo;s own language. Detection uses <strong>franc</strong> (ISO 639-3, 180+ languages); the answer
          is generated in the target language by Claude. There is no language menu — it&rsquo;s automatic.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Three interaction patterns</p>
            <ul className="ml-4 list-disc space-y-1 text-neutral-mid">
              <li><strong>Pattern 1</strong> — English question, no request → English answer.</li>
              <li><strong>Pattern 2</strong> — English question with an explicit request (&ldquo;reply in Polish&rdquo;, &ldquo;in Tagalog please&rdquo;) → answer in that language (extracted by regex).</li>
              <li><strong>Pattern 3</strong> — non-English question → answer in the detected language.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Accuracy safeguards</p>
            <p className="text-neutral-mid">
              Below <strong>0.5 confidence</strong> the system defaults to English and flags the message
              <code className="text-xs bg-gray-100 px-1 rounded"> lowConfidence</code> for review. franc over-detects short English as Scots/Afrikaans/Old English, so those are
              treated as English. A staff member&rsquo;s saved <strong>first/second language</strong> (Staff tab) is also used to
              proactively deliver training in their language.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Engine"            value="franc (ISO 639-3), dynamic ESM import. apps/api/src/services/language/detector.ts." />
          <RefRow label="Confidence floor"  value="0.5 — below this defaults to English + lowConfidence flag for review." />
          <RefRow label="Response language" value="apps/api/src/lib/translate.ts (langName) maps the code to a name fed to Claude; staff first/second language drives proactive training delivery." />
          <RefRow label="Translation overrides" value="Human-verified overrides that replace machine translation for an exact source string, per care setting + language. Table translation_overrides (unique tenant_id+lang_code+source_hash; source_hash = sha256 of trimmed English). Permission: users.can_suggest_translations (per-staff, default false; toggle in staff Edit form + detail overlay). Staff submit via POST /me/translation-suggestion → status 'pending' unless tenant.translation_suggestions_auto_approve (default false). overrides.ts approvedOverrideMap (60s in-memory TTL) overlays approved suggested_text on top of machine output inside translate.ts (translateTextsBatch + translateQuestionsBatch), applied AFTER the machine cache read so translation_cache still stores the machine value. Admin review: /translation-suggestions (approve/edit/reject) = 'Translation Review' page (sidebar, Team). Platform oversight across all care settings: /admin/translation-changes = 'Translation Changes' tab. Hub controls (components/hub/suggest-translation.tsx): SuggestTranslation (field editor) on standard-training questions (My Training list), annual/lesson-module assessment questions, induction MCQ steps, CQC prep (question + model answer); InlineEditableText (click-to-edit in place) on lesson section heading/body. Both first-language and flipped second-language views are supported (each surface picks can_suggest/lang/source from the active fetch: data vs data2, or the ?lang=2 responses). Each hub endpoint returns an English source snapshot + can_suggest + lang_code only when lang!=eng: /training/my-enrollments (question.source_en), /me/annual-training/:id (source_questions, source_sections), /onboarding/my (step.source_en), /cqc-questions/my-deliveries (source_en). No override for a phrase → normal glossary-aware machine translation (English fallback)." />
          <RefRow label="Translation glossary" value="Term-locking at two levels. UNIVERSAL: platform_glossary table, managed at /platform/glossary (admin/platform-glossary route), applies to every tenant. PER-TENANT: tenant.translation_glossary (JSON [{term,keep,note}]) in Settings → Translation glossary. translate.ts effectiveGlossary() merges platform (5-min in-memory TTL cache) under the tenant list — tenant wins on a same-term conflict, and a tenant entry {term,exclude:true} opts the home OUT of that universal term (shown as removable 'Saved terms' in the tenant's Settings) — then buildGlossary() appends a 'keep verbatim / follow this note' instruction to every translate prompt (questions, texts, HTML/policy, bundle) and partitions translation_cache by a 12-char glossary sig (langCode#sig) so any glossary change never serves a stale cache. Wired through me.ts, training.ts, cqc-staff-questions.ts, onboarding.ts, query.ts, proactive.ts, conversation.ts." />
          <RefRow label="Channels"          value="Detection runs on web chat, email and WhatsApp inbound; replies stay in-thread in the same language." />
          <RefRow label="Hub voice (WS5)"   value="Voice INPUT: apps/web/src/hooks/useSpeech.ts (browser Web Speech API) now dictates in the staff member's language via apps/web/src/lib/locale.ts bcp47() (ISO 639-3 → BCP-47). Voice OUTPUT: 'Listen' button on every answer reads it aloud via speechSynthesis in the answer's language." />
          <RefRow label="Reply-lang default" value="GET /me/profile exposes first_language + comms_always_first_language to the hub; the chat 'Reply in' picker now defaults to the staff member's own language (unless they've picked one on the device) — parity with WhatsApp. (Whisper-quality server voice input remains a future upgrade; deferred to avoid OpenAI cost.)" />
        </div>
        <p className="mt-3 mb-1 text-sm font-semibold text-neutral-dark">Languages we name &amp; respond in</p>
        <p className="mb-2 text-xs text-neutral-mid">franc can detect 180+ languages; these are the ones we map to a friendly name (UK-care-common in bold). Claude can answer in many more.</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['English', true], ['Polish', true], ['Romanian', true], ['Portuguese', true], ['Filipino', true], ['Tagalog', true], ['Yoruba', true], ['Hindi', true],
            ['French', false], ['German', false], ['Spanish', false], ['Italian', false], ['Dutch', false], ['Swedish', false], ['Norwegian', false],
            ['Mandarin Chinese', false], ['Chinese', false], ['Vietnamese', false], ['Arabic', false], ['Turkish', false], ['Greek', false],
            ['Bengali', false], ['Urdu', false], ['Punjabi', false], ['Gujarati', false], ['Tamil', false], ['Telugu', false], ['Sinhala', false], ['Nepali', false],
            ['Lithuanian', false], ['Latvian', false], ['Czech', false], ['Slovak', false], ['Bulgarian', false], ['Croatian', false], ['Serbian', false], ['Hungarian', false],
            ['Swahili', false], ['Somali', true], ['Tigrinya', false], ['Amharic', false], ['Welsh', false],
            ['Mauritian Creole', false], ['Haitian Creole', false], ['Seychellois Creole', false], ['Cape Verdean Creole', false], ['Jamaican Patois', false], ['Antillean Creole', false], ['Nigerian Pidgin', false],
          ].map(([lang, common]) => (
            <span key={lang as string} className={`rounded-full px-2.5 py-0.5 text-xs ${common ? 'bg-teal-light font-semibold text-teal' : 'bg-gray-100 text-neutral-mid'}`}>{lang}</span>
          ))}
        </div>
      </RefSection>

      {/* Email — SendGrid */}
      <RefSection icon={Mail} title="Email — SendGrid">
        <p className="leading-relaxed text-neutral-mid">
          SendGrid handles both directions of staff email communication — receiving queries via the Inbound Parse webhook
          and sending AI-generated replies as branded HTML emails that stay in the same thread.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Inbound (staff → CareStream)</p>
            <p className="text-neutral-mid">
              Staff send an email to <code className="text-xs bg-gray-100 px-1 rounded">policies@{'{slug}'}.carestreamai.co.uk</code>.
              SendGrid Inbound Parse forwards it as a POST to <code className="text-xs bg-gray-100 px-1 rounded">/email/inbound</code> →
              <code className="text-xs bg-gray-100 px-1 rounded"> services/email/inbound.ts</code>.
              The tenant is resolved from the subdomain slug in the <code className="text-xs bg-gray-100 px-1 rounded">to</code> address.
              The sender is checked against the tenant's staff list — non-staff get a rejection email.
              Quoted reply text is stripped so only the new message is sent to the RAG pipeline.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Outbound (CareStream → staff)</p>
            <p className="text-neutral-mid">
              Replies are sent via <code className="text-xs bg-gray-100 px-1 rounded">services/email/outbound.ts → sendEmailReply()</code> using the
              <code className="text-xs bg-gray-100 px-1 rounded"> @sendgrid/mail</code> library.
              Each reply sets <code className="text-xs bg-gray-100 px-1 rounded">In-Reply-To</code> and <code className="text-xs bg-gray-100 px-1 rounded">References</code> headers
              so all messages appear in the same thread in the staff member's inbox.
              Emails are branded HTML with a purple gradient header and CareStream logo.
              A thumbs up/thumbs down feedback link is included, signed with an HMAC token.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Other outbound uses</p>
            <p className="text-neutral-mid">
              Clarification emails (when intent is unclear — sends a 1/2/3 choice reply),
              rejection emails (non-staff senders), and proactive training module delivery to staff
              enrolled with the email channel all use the same outbound service.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Inbound domain"         value="carestreamai.co.uk — per-tenant address: policies@{slug}.carestreamai.co.uk" />
          <RefRow label="From address"           value="noreply@carestreamai.co.uk" />
          <RefRow label="Thread continuity"      value="Message-ID / In-Reply-To / References headers — replies always land in the same inbox thread" />
          <RefRow label="Session TTL"            value="7 days — conversation history kept across replies within that window" />
          <RefRow label="Webhook validation"     value="SENDGRID_INBOUND_PARSE_KEY used to verify the webhook signature on every inbound POST" />
          <RefRow label="SENDGRID_API_KEY"       value="Authorises all outbound sends via @sendgrid/mail" />
          <RefRow label="Service file (in)"      value="apps/api/src/services/email/inbound.ts" />
          <RefRow label="Service file (out)"     value="apps/api/src/services/email/outbound.ts" />
        </div>
      </RefSection>

      {/* Staff Notification Emails */}
      <RefSection icon={Mail} title="Staff Notification Emails">
        <p className="leading-relaxed text-neutral-mid">
          What CareStream emails STAFF (all via SendGrid, gated by the tenant&rsquo;s email preferences in
          Settings, and deep-linking into the <code className="text-xs bg-gray-100 px-1 rounded">/chat</code> hub).
          Senders live in <code className="text-xs bg-gray-100 px-1 rounded">apps/api/src/services/email/outbound.ts</code>;
          gating + the allocation helper in <code className="text-xs bg-gray-100 px-1 rounded">apps/api/src/lib/notify.ts</code>.
        </p>
        <p className="mt-2 mb-1 text-sm font-semibold text-neutral-dark">When an admin allocates work (added June 2026)</p>
        <div className="space-y-1">
          <RefRow label="New induction"        value="Admin enrols staff on a flow (POST /onboarding/flows/:id/enroll) → 'Start my induction' → /chat?view=induction. Pref: onboarding_updates. (Link previously pointed at the admin /onboarding page — fixed.)" />
          <RefRow label="New training"          value="Admin assigns a manual module (POST /training/enroll) → 'Go to my training' → /chat?view=training. Pref: training_updates. (Also still sends the proactive first question via WhatsApp/email.)" />
          <RefRow label="New annual training"   value="Admin assigns an AI/annual module (same /training/enroll, source=ai_generated) → 'Start annual training' → /chat?view=annual. Pref: training_updates." />
          <RefRow label="New CQC prep"          value="Admin delivers a question (POST /cqc-questions/:id/deliver) → 'View my CQC questions' → /cqc. Pref: cqc_staff_prep. (Also web-push.)" />
          <RefRow label="Helper"                value="notifyStaffAllocation(tenantId, userIds, kind) + sendStaffAllocationEmail (kinds: induction | training | annual_training | cqc_prep | follow_up). /chat?view= deep links handled in the hub page." />
          <RefRow label="Follow-up"             value="Fires when a staff member answers a TRAINING or INDUCTION question WRONG (creates a follow-up) → 'Complete my follow-up' → /chat?view=followup. Pref: training_updates. DEBOUNCED to ≤1 email / 24h per staff (users.last_followup_email_at) so a bad session doesn't spam. notifyFollowUp() in lib/notify.ts. (The weekly Monday knowledge-gap digest still nudges anyone with open follow-ups too.)" />
        </div>
        <p className="mt-3 mb-1 text-sm font-semibold text-neutral-dark">Other staff emails (pre-existing)</p>
        <div className="space-y-1">
          <RefRow label="Sign-in link"          value="sendStaffLoginLinkEmail — admin 'Sign-in link' or staff 'Email me a sign-in link' (passwordless)." />
          <RefRow label="Welcome / credentials" value="sendStaffWelcomeEmail — admin 'Send credentials' on a new staff member." />
          <RefRow label="Training renewals"      value="renewalReminders (90/30/7-day) via WhatsApp/email + push." />
          <RefRow label="Verify / reset"         value="sendVerificationEmail (org-admin signup) + sendPasswordResetEmail." />
        </div>
      </RefSection>

      {/* RAG Pipeline */}
      <RefSection icon={Zap} title="RAG Query Pipeline">
        <p className="leading-relaxed text-neutral-mid">
          All queries run through <code className="text-xs bg-gray-100 px-1 rounded">services/rag/query.ts → runQueryPipeline()</code>.
          The pipeline branches on <code className="text-xs bg-gray-100 px-1 rounded">selectedCategory</code>.
        </p>
        <div className="mt-2 space-y-2">
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
            <p className="font-semibold text-neutral-dark text-xs uppercase tracking-wide">Policies & Procedures path (default)</p>
            <p className="text-neutral-mid">Embeds query → Pinecone vector search (policy namespace) → load policy metadata → detect intent (summary / full / follow-up) → Prompt A or Prompt B → Claude Sonnet → extract suggestions → record query.</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
            <p className="font-semibold text-neutral-dark text-xs uppercase tracking-wide">CQC Compliance path (cqc_report)</p>
            <p className="text-neutral-mid">Embeds query → parallel search: CQC report chunks + internal policies + handbook + all active CQC seeds from DB + knowledge entries + regulation context → build labelled context block with [CHANNEL], [CQC INSPECTION REPORT], [CQC REGULATORY FRAMEWORK] etc. → cqc_query prompt → Claude → extract suggestions.</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
            <p className="font-semibold text-neutral-dark text-xs uppercase tracking-wide">Training path (training_module)</p>
            <p className="text-neutral-mid">Training seeds (RAG) → training_chat prompt → Claude → multi-choice question generation or conversational answer depending on context.</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
            <p className="font-semibold text-neutral-dark text-xs uppercase tracking-wide">Audit report chat path (audit_report) — web only</p>
            <p className="text-neutral-mid">Fetches up to 6 most recent completed AuditRun records with ai_recommendations from Postgres → audit_report_chat prompt → Claude → extract suggestions. No Pinecone search.</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1">
            <p className="font-semibold text-neutral-dark text-xs uppercase tracking-wide">Business Continuity path (business_continuity) — web only</p>
            <p className="text-neutral-mid">Fetches all approved KnowledgeEntry records with knowledge_category = 'business_continuity' for tenant from Postgres → business_continuity_chat prompt → Claude → extract suggestions. No Pinecone search. Entries managed at /knowledge → Add entry → Category: Business Continuity.</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Embedding model"     value="text-embedding-3-small (OpenAI)" />
          <RefRow label="Top-K chunks"        value="Configurable TOP_K_CHUNKS — typically 8 policy chunks + CQC seeds" />
          <RefRow label="Response format"     value="HTML for web/email, plain text for WhatsApp, spoken sentences for voice — injected via [CHANNEL] in context" />
          <RefRow label="Follow-up questions" value="Extracted from <!--FOLLOWUP:[...]-->  comment appended by the AI — stripped before delivery" />
          <RefRow label="Feedback"            value="Thumbs up/down stored on query record; WhatsApp sends one-click feedback links with a 5-minute delay — cancelled if user replies before timer fires" />
          <RefRow label="Language detection"  value="franc library — auto-detects and responds in staff member's language" />
        </div>
      </RefSection>

      {/* CQC Report Chat */}
      <RefSection icon={Shield} title="CQC Report Chat">
        <p className="leading-relaxed text-neutral-mid">
          The CQC compliance feature lets providers upload their CQC inspection report and ask questions against it.
          Available on all four channels.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Trigger"             value="document_category = 'cqc_report'" />
          <RefRow label="AI prompt slot"      value="cqc_query — managed at /platform/prompts → 'CQC Compliance Director'" />
          <RefRow label="RAG sources"         value="Uploaded CQC report chunks + internal policies + staff handbook + CQC seeds (all active) + knowledge entries + regulations" />
          <RefRow label="CQC seeds"           value="59 seeds across Safe, Effective, Caring, Responsive, Well-led, Custom — managed at /platform/cqc-seeds" />
          <RefRow label="Seeds coverage"      value="Framework overview + inspector focus + evidence expected + Good/Outstanding indicators per area" />
          <RefRow label="Key seeds to note"   value="effective-6 and effective-10 cover Oliver McGowan Mandatory Training; effective-2 covers DoLS; safe-3 covers safeguarding" />
          <RefRow label="Google Sheets sync"  value="Bidirectional sync via GOOGLE_SHEETS_CQC_SEEDS_ID — Populate Sheet writes data file → Sheet, Sync Sheet pulls Sheet → DB" />
          <RefRow label="Plan gate"           value="has_cqc_report flag on plan — Professional plan only" />
        </div>
      </RefSection>

      {/* Policies & Procedures */}
      <RefSection icon={FileText} title="Policies & Procedures">
        <p className="leading-relaxed text-neutral-mid">
          Per-tenant policy documents uploaded by the manager. Chunked, embedded, and indexed in Pinecone
          for semantic search. Staff query against them via any channel.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Ingestion"           value="Upload → S3 → BullMQ ingestion queue → PDF/DOCX extraction → chunk (800 tokens, 100 overlap) → embed → Pinecone upsert" />
          <RefRow label="Namespaces"          value="Pinecone: policy namespace (internal_policy + staff_handbook), knowledge namespace" />
          <RefRow label="Versioning"          value="Each upload increments version number; old chunks removed from Pinecone on new upload" />
          <RefRow label="Categories"          value="internal_policy, staff_handbook, external_regulation, training_module, cqc_report" />
          <RefRow label="Prompt A"            value="Summary + follow-up questions — used for most staff queries" />
          <RefRow label="Prompt B"            value="Full policy formatter — used when staff ask for the complete section" />
          <RefRow label="Knowledge extraction" value="Prompt C — extracts Q&A pairs from uploaded documents for the per-tenant knowledge base" />
        </div>
      </RefSection>

      {/* AWS S3 File Storage */}
      <RefSection icon={HardDrive} title="AWS S3 File Storage">
        <p className="leading-relaxed text-neutral-mid">
          All policy documents uploaded by care home managers are stored in AWS S3.
          S3 is the permanent file store — Pinecone holds the derived vectors, but the original files always live in S3.
        </p>
        <div className="mt-3 space-y-1">
          <RefRow label="Bucket"               value="carestreamai-docs-prod-3" />
          <RefRow label="Region"               value="eu-west-2 (London)" />
          <RefRow label="IAM user"             value="carestreamai-api — access scoped to carestreamai-docs-prod-3 only" />
          <RefRow label="Local fallback"       value="When S3_BUCKET env var is not set (dev), files go to /tmp/carestreamai — USE_LOCAL flag in s3.ts" />
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid mb-1.5">Key layout (tenant-scoped, never mixed)</p>
          <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1.5 font-mono text-xs text-neutral-mid">
            <div><span className="text-teal font-semibold">tenants/</span><span className="text-neutral-dark">{'{tenant_id}'}</span><span className="text-teal font-semibold">/policies/</span><span className="text-neutral-dark">{'{policy_id}'}/{'{filename}'}</span> <span className="text-neutral-mid ml-2">— live document</span></div>
            <div><span className="text-teal font-semibold">tenants/</span><span className="text-neutral-dark">{'{tenant_id}'}</span><span className="text-teal font-semibold">/extracted/</span><span className="text-neutral-dark">{'{policy_id}'}.txt</span> <span className="text-neutral-mid ml-2">— plain-text cache post-ingestion</span></div>
            <div><span className="text-teal font-semibold">tenants/</span><span className="text-neutral-dark">{'{tenant_id}'}</span><span className="text-teal font-semibold">/versions/</span><span className="text-neutral-dark">{'{policy_id}'}/v{'{n}'}/{'{file}'}</span> <span className="text-neutral-mid ml-2">— superseded versions archived</span></div>
            <div><span className="text-teal font-semibold">tenants/</span><span className="text-neutral-dark">{'{tenant_id}'}</span><span className="text-teal font-semibold">/face_to_face/</span><span className="text-neutral-dark">{'{session_id}'}/{'{uuid}'}.{'{ext}'}</span> <span className="text-neutral-mid ml-2">— F2F evidence (private)</span></div>
            <div><span className="text-teal font-semibold">tenants/</span><span className="text-neutral-dark">{'{tenant_id}'}</span><span className="text-teal font-semibold">/f2f_certificates/</span><span className="text-neutral-dark">{'{cert_id}'}.pdf</span> <span className="text-neutral-mid ml-2">— stored completion certificates (private)</span></div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">Malware screening on user uploads</p>
          <p className="text-xs leading-relaxed text-neutral-dark">
            Face-to-face training <strong>evidence uploads</strong> (admin-supplied scans, photos, trainer certs) pass a layered check before they are ever stored:
          </p>
          <ol className="mt-1.5 ml-4 list-decimal space-y-1 text-xs text-neutral-mid">
            <li><strong>Magic-byte content validation</strong> — the real file bytes must be a genuine PDF/JPEG/PNG/GIF/WebP/HEIC; the browser-claimed type and extension are ignored. Blocks disguised payloads (HTML/SVG/script renamed .png).</li>
            <li><strong>Malware scan</strong> — Cloudmersive Virus Scan API (<code className="font-mono">apps/api/src/services/security/malware-scan.ts</code>), gated by <code className="font-mono">CLOUDMERSIVE_API_KEY</code>. Infected → rejected. Scanner configured but erroring → <strong>fail closed</strong> (not stored). No key set → scan skipped, content validation still applies. Stored result in <code className="font-mono">face_to_face_evidence.scan_status</code>.</li>
            <li><strong>Locked-down serving</strong> — known-safe Content-Type only, <code className="font-mono">X-Content-Type-Options: nosniff</code>, sandboxed CSP, <code className="font-mono">no-store</code>; non-previewable types forced to attachment. Max 15 MB, 40 files/session.</li>
          </ol>
          <p className="mt-1.5 text-xs text-neutral-mid">Stored completion certificates are system-generated PDFs (not user uploads), so they bypass the scanner but use the same private, locked-down serving.</p>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Retention"            value="Files are never deleted — old versions archived under /versions/ (§10.5)" />
          <RefRow label="Malware scanner"      value="Cloudmersive Virus Scan API — set CLOUDMERSIVE_API_KEY in Vercel env to activate (fail-closed when configured)" />
          <RefRow label="Upload flow"          value="POST /policies/upload → multer buffer → S3 PutObject → Prisma creates policy record → ingestDocument() runs inline on Vercel (no Redis)" />
          <RefRow label="Ingestion flow"       value="S3 GetObject → PDF/DOCX text extraction → chunk (800 tokens, 100 overlap) → OpenAI embed → Pinecone upsert → policy.status = active" />
          <RefRow label="Text extraction"      value="pdf-parse for PDF files, mammoth for DOCX" />
          <RefRow label="Service file"         value="apps/api/src/services/storage/s3.ts" />
          <RefRow label="AWS_ACCESS_KEY_ID"    value="IAM user access key — set in Vercel Production env" />
          <RefRow label="AWS_SECRET_ACCESS_KEY" value="IAM user secret — set in Vercel Production env" />
          <RefRow label="AWS_REGION"           value="eu-west-2" />
          <RefRow label="S3_BUCKET"            value="carestreamai-docs-prod-3" />
        </div>
      </RefSection>

      {/* Staff Training */}
      <RefSection icon={GraduationCap} title="Staff Training System">
        <p className="leading-relaxed text-neutral-mid">
          Multi-choice training questions delivered proactively via WhatsApp or email. Staff reply A/B/C/D and get instant feedback.
          Training is always a separate flow — questions are never injected into policy or CQC conversations.
          <span className="mt-1 block text-xs italic text-neutral-mid">Distinct from <strong>Annual Training (AI modules)</strong> below — that&apos;s the teach-then-assess, certificate-issuing annual refresher system. This section is the lightweight proactive quiz delivery.</span>
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Training seeds"      value="Per-topic knowledge entries at /platform/training-seeds — framework area, description, key points, source URLs" />
          <RefRow label="Question generation" value="training_question_generation prompt + seed content → Claude generates 4-option MCQ with explanation" />
          <RefRow label="Delivery"            value="Proactive send on enrollment (if trigger=auto) via WhatsApp or email; A/B/C/D answers advance the sequence" />
          <RefRow label="Session tracking"    value="handleTrainingConversation() in services/training/conversation.ts intercepts A/B/C/D answers before main pipeline" />
          <RefRow label="Training modules"    value="Multi-step modules with multiple questions per topic — progress tracked per user in TrainingEnrollment" />
          <RefRow label="Training chat"       value="training_chat prompt — conversational learning support for open-ended training questions" />
          <RefRow label="Language translation" value="Questions translated at send time via Claude Haiku (lib/translate.ts) using user.first_language — falls back to English on error" />
          <RefRow label="Supported languages" value="27 languages: eng, pol, ron, por, tgl, yor, ben, urd, hin, spa, fra, ara, som, swa, lit, guj, pan, tam, zho, sin, nep, cym, deu, ita, kan, mal, tel" />
          <RefRow label="Translation scope"   value="Question text + answer options translated; A/B/C/D labels remain unchanged (reply mechanism is language-agnostic)" />
        </div>
      </RefSection>

      {/* Staff Language Preferences */}
      <RefSection icon={Users} title="Staff Language Preferences">
        <p className="leading-relaxed text-neutral-mid">
          Each staff member has a <code className="text-xs bg-gray-100 px-1 rounded">first_language</code> (ISO 639-3, default <strong>eng</strong>) and an optional <code className="text-xs bg-gray-100 px-1 rounded">second_language</code>.
          These are set when adding or editing a staff member and drive all outbound communication language.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Schema fields"     value="users.first_language TEXT NOT NULL DEFAULT 'eng', users.second_language TEXT (nullable)" />
          <RefRow label="Set/updated via"   value="POST /users/invite and PATCH /users/:id — first_language and second_language fields" />
          <RefRow label="Used by"           value="Training proactive delivery (proactive.ts) and answer-advance (conversation.ts) — both translate before sending" />
          <RefRow label="Translation call"  value="translateTrainingQuestion(q, lang) in src/lib/translate.ts — single Claude Haiku call per question" />
          <RefRow label="Existing staff"    value="All existing users default to eng — no data migration needed" />
        </div>
      </RefSection>

      {/* Knowledge Gaps & Learn-and-Retry */}
      <RefSection icon={GraduationCap} title="Knowledge Gaps & Learn-and-Retry">
        <p className="leading-relaxed text-neutral-mid">
          A closed loop that turns wrong answers into reinforced learning: a staff member misses a training or
          induction question → it surfaces in their hub <strong>Follow-up</strong> → they either re-answer
          (<RefTag color="amber">Just retry</RefTag>) or work through a policy-grounded micro-lesson
          (<RefTag color="teal">Learn &amp; retry</RefTag>) → resolving it clears the gap everywhere and is tracked →
          admins see it on the staff record and the team-wide <strong>Knowledge gaps</strong> analytics → a weekly
          digest + auto-refresher keep it moving.
        </p>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">What counts as a gap</p>
          <RefRow label="Training gap"   value="TrainingAnswer.is_correct = false for a module question" />
          <RefRow label="Induction gap"  value="OnboardingProgress.answer_correct = false for an answer_question step" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Staff side (hub Follow-up)</p>
          <RefRow label="List gaps"      value="GET /me/follow-up — exact wrong MCQs (training + induction), translated to first_language; correct answer withheld" />
          <RefRow label="Micro-lesson"   value="GET /me/follow-up/lesson?source&ref&enrollment_id — corrective 'why' + key points + scenario + a FRESH check question" />
          <RefRow label="Grade check"    value="POST /me/follow-up/lesson/answer — graded server-side; correct → resolves the original gap (sets is_correct / answer_correct = true)" />
          <RefRow label="Log method"     value="POST /me/follow-up/resolved — records method ('learn' | 'retry') + question label snapshot" />
          <RefRow label="Just retry"     value="Re-answers the original question via the normal training/onboarding grading paths" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Lesson generation (grounded + cached)</p>
          <RefRow label="Lib"            value="apps/api/src/lib/remediation.ts — buildGapContext + generateLesson + getOrCreateLesson" />
          <RefRow label="Grounding"      value="Induction → the step's linked policy text (downloadExtractedText); Training → matching tenant policy (filename keyword) + PolicySeed reference policies for the topic" />
          <RefRow label="Model"          value="Claude Sonnet (callClaude), temp 0.5 — returns strict JSON (why, key_points, scenario, check{question,options,correct_option})" />
          <RefRow label="Cache"          value="remediation_lessons (ref_key '<source>:<ref>' + lang, payload JSONB) — one generation per gap concept per language" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Admin side (analytics)</p>
          <RefRow label="Staff record"   value="/staff/[id] — 'Recommended follow-up' (open gaps) + 'How gaps get resolved' (Learn vs Just retry counts, %, recent list) — both in the CQC PDF" />
          <RefRow label="Team-wide"      value="GET /analytics/knowledge-gaps — summary, most-missed (training+induction), weakest topics, recent resolutions, + trend[]" />
          <RefRow label="Shared lib"     value="apps/api/src/lib/knowledge-gaps.ts — getKnowledgeGapData(tenantId), used by the endpoint AND the scheduled jobs" />
          <RefRow label="Page section"   value="/analytics 'Knowledge gaps' — stat cards, trend area chart, most-missed, weakest topics, remediation effectiveness, 'Send digest now'" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Scheduled jobs (Phase C)</p>
          <RefRow label="Service"        value="apps/api/src/services/knowledge-gaps/digest.ts — snapshotTenant, sendTenantDigest, sendTenantRefreshers, runKnowledgeGapDailyJob" />
          <RefRow label="Cron"           value="vercel.json → GET /cron/knowledge-gaps, daily 07:00 UTC. Mounted BEFORE requireAuth; auth via x-vercel-cron header or CRON_SECRET bearer" />
          <RefRow label="Daily"          value="Snapshot open-gap counts → knowledge_gap_snapshots (tenant_id, date unique) — powers the trend chart" />
          <RefRow label="Weekly (Mon)"   value="Admin digest email (week-over-week delta) + staff auto-refresher nudge — both gated on the knowledge_gap_digest email preference" />
          <RefRow label="Manual"         value="POST /settings/knowledge-gap-digest/send (admin) — snapshot + digest + refreshers for that tenant on demand" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Tables</p>
          <RefRow label="remediation_lessons"      value="cached lessons — ref_key + lang (unique), payload JSONB" />
          <RefRow label="remediation_attempts"     value="one per closed gap — source, ref, method, label, lang, created_at" />
          <RefRow label="knowledge_gap_snapshots"  value="daily counts — open_gaps/training/induction, staff_with_gaps, resolved_7d (tenant_id+date unique)" />
          <RefRow label="Note"                     value="All use TEXT ids (existing-table convention) — never uuid columns" />
        </div>
      </RefSection>

      {/* CQC Staff Prep */}
      {/* Annual Training (AI modules) */}
      <RefSection icon={GraduationCap} title="Annual Training (AI modules)">
        <p className="leading-relaxed text-neutral-mid">
          AI-generated, policy-grounded annual training. Teach-then-assess modules come two ways: <strong>standard</strong>
          (platform-controlled library, tenant_id=null, seed-grounded, free to assign) or <strong>tailored</strong> (RAG over the
          tenant&apos;s own policies + seeds, costs 1 AI credit). Both are source=&apos;ai_generated&apos;; admins review/approve,
          assign by role/individual, and staff complete them in the hub in their first language. Passing issues a
          knowledge-assessment certificate; renewals reuse the existing training expiry engine. Extends <code className="rounded bg-gray-100 px-1 text-xs">TrainingModule</code>/<code className="rounded bg-gray-100 px-1 text-xs">TrainingEnrollment</code> — not a separate silo.
        </p>
        <div className="mt-3 rounded-lg border border-teal/20 bg-teal-light/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal">How it works — end to end</p>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-neutral-mid marker:font-semibold marker:text-teal">
            <li><strong>Catalogue.</strong> ~44 UK care topics at <em>Training → Annual training modules</em>. Each topic offers a <strong>standard</strong> module (platform library, free) and/or a <strong>tailored</strong> one.</li>
            <li><strong>Get a module.</strong> <em>Assign standard</em> (ready-made, no credit) or <em>Tailor to our policies</em> (AI reads the home&apos;s own policies via RAG — <strong>1 AI credit</strong>). Tailored arrives as a draft.</li>
            <li><strong>Structured content.</strong> Each module has <strong>measurable learning outcomes</strong>, an estimated <strong>duration → CPD hours</strong>, and an interactive lesson built from <strong>sections</strong> — each section teaches a point, then applies it with a <strong>mandatory scenario</strong> and an in-lesson <strong>knowledge check</strong>.</li>
            <li><strong>Review &amp; approve.</strong> Edit the outcomes, sections (scenario + check), every question, pass mark, duration &amp; frequency; optionally generate an AI cover image. Approve to publish — nothing reaches staff until approved.</li>
            <li><strong>Assign.</strong> To individuals or a whole role, with an optional due date.</li>
            <li><strong>Staff take it (hub).</strong> Outcomes + interactive sections (scenario reveal + instant-feedback checks, cover image, first language) → assessment (pass mark) → <strong>pass = certificate</strong>; fail → review &amp; retry. <strong>Active lesson time is tracked</strong> (substantiates CPD hours) and a short <strong>confidence/usefulness evaluation</strong> is captured on pass.</li>
            <li><strong>Certificate &amp; practical.</strong> CareStream-branded, printable; CPD block (CPD hours + provider no.) when the module is CPD-accredited. Practical-required topics also need a <em>Record practical</em> sign-off.</li>
            <li><strong>Renewals.</strong> Frequency sets an expiry; resurfaces automatically when due. Every ~6 months a <strong>Review due</strong> flag → <em>Regenerate questions</em> (avoids every question ever used).</li>
            <li><strong>CPD governance (standard library only).</strong> Console QA gate + <strong>standards mapping</strong> (Care Cert/CQC/legislation) + <strong>provenance</strong> (cited sources). Publish needs a <strong>named attestation</strong> — internal, OR via a <strong>password-protected external review link</strong> where an independent specialist signs off (per-section/per-question approve or request-change, snapshot-frozen). A printable <strong>course specification</strong> is the CPD-assessor artefact.</li>
            <li><strong>Tenant self-certification.</strong> A tenant publishing their <em>own</em> AI-tailored module must confirm it&apos;s internally generated and sits outside the independently-reviewed/CPD-accredited library.</li>
            <li><strong>Credits.</strong> Tailoring, cover images and question generation draw the plan&apos;s monthly <strong>AI credits</strong> (separate from everyday <em>queries</em>); translations &amp; some other AI are tracked for cost only.</li>
          </ol>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Data model</p>
          <RefRow label="TrainingTopic"   value="catalogue of ~44 platform topics (group, default_frequency, requires_practical, aliases) — seeded on first GET /training/catalogue" />
          <RefRow label="TrainingModule+"  value="AI fields: source='ai_generated', tenant_id (null=standard library), approved (draft until true), learning_content {summary,key_points}, questions bank, frequency, renewal_months, pass_mark, image_key (category icon), illustration_key (S3 AI cover), policy_refs, topic_id, group_key" />
          <RefRow label="TrainingEnrollment+" value="practical_signed/_by/_at/_note (observed-competency sign-off for requires_practical topics)" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Generation</p>
          <RefRow label="Service"   value="services/training/moduleGenerator.ts — generateAnnualModuleDraft(tenantId|null): null=seed-only (standard); set=embedText + queryVectors(getTenantNamespace) policy chunks + PolicySeeds → Claude → draft (title, learning, 20-question bank, policy_refs)" />
          <RefRow label="Images"    value="services/training/moduleImage.ts — generateModuleIllustration() OpenAI gpt-image-1 (flat illustration, no text/faces) → sharp WebP → uploadTrainingImage() S3 training/images/. Served public via GET /public/training/image/:file" />
          <RefRow label="Prompt"    value="ai_prompts: training_module_generation — editable in Platform → AI Prompts ('Annual Training — Module Generation')" />
          <RefRow label="Honesty"   value="requires_practical topics flagged as knowledge-component-only; certificates worded as non-accredited knowledge assessments" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">AI credits (lib/plan-limits.ts)</p>
          <RefRow label="Limit"     value="Plan.monthly_ai_credit_limit (Starter 5, Professional 25, null=unlimited). Separate meter from monthly_query_limit. ai_credit_logs (one row per action)." />
          <RefRow label="Billable"  value="logAiCredit() billable=true — training (tailor), training_image, cqc_questions, training_questions. checkAiCreditLimit() throws AI_CREDIT_LIMIT_REACHED (402)." />
          <RefRow label="Tracked"   value="trackAiAction() billable=false (cost visibility only, no limit) — translation, policy_format, audit_recs, remediation." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Admin endpoints (requireAdmin)</p>
          <RefRow label="Catalogue" value="GET /training/catalogue (topics → module + standard_module) · POST /training/catalogue/generate (tailor, 1 credit)" />
          <RefRow label="Review"    value="GET /training/modules/:id/full · PATCH /training/modules/:id · POST /training/modules/:id/approve · POST /training/modules/:id/generate-image (1 credit)" />
          <RefRow label="Standard"  value="Console (requirePlatformAdmin) /admin/standard-training: GET / · POST /generate · GET|PATCH /modules/:id · POST /modules/:id/approve · POST /modules/:id/generate-image (free)" />
          <RefRow label="Q-history" value="POST /admin/standard-training/modules/:id/regenerate-questions — snapshots current bank → TrainingQuestionVersion, gathers ALL prior question texts (current + every version), passes as excludeQuestions to generateAnnualModuleDraft (prompt 'do not repeat' + normalised-text dedup filter), sets module back to draft. Full view returns question_history {used_count, prior_versions, last_regenerated_at, review_due (>6mo), review_due_at}. Console shows Created/Published dates + 6-monthly 'Review due' flag." />
          <RefRow label="Assign"    value="POST /training/enroll (existing) — role-based assignment resolves to user_ids in the UI" />
          <RefRow label="Practical" value="POST /users/:id/annual-training/:enrollmentId/practical (sign-off)" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">CPD content &amp; governance (standard library)</p>
          <RefRow label="Content"   value="learning_content { summary, outcomes[] (measurable), key_points[], sections[] { heading, body, scenario{situation,prompt,answer} (mandatory), check{q,options,correct} } }. TrainingModule.duration_minutes → CPD hours (min/60). Generator (moduleGenerator.ts) produces all; prompt asks for plain language that translates cleanly." />
          <RefRow label="Engagement" value="TrainingEnrollment.learn_seconds (active lesson time, POST /me/annual-training/:id/learn-time) substantiates CPD hours; eval_confidence/eval_usefulness/eval_comment (POST /me/annual-training/:id/evaluate) post-completion. Both aggregated in /analytics/annual-training (claimed vs actual minutes, avg confidence/usefulness)." />
          <RefRow label="QA gate"   value="services/training/moduleQa.ts — hard checks (outcomes≥3, sections≥3 w/ scenario+check, questions≥10 well-formed) BLOCK publish; soft (sources, duration, standards, plain-language ≤22 words/sentence) advise. Runs on approve + before sending for review." />
          <RefRow label="Standards" value="data/training-standards.ts catalogue (Care Certificate 15 / CQC 5 / HSCA 2014 regs / legislation), multi-select per module → TrainingModule.standards[]. Provenance = policy_refs (seed sources captured in buildGrounding)." />
          <RefRow label="Attestation" value="POST /admin/standard-training/modules/:id/approve {reviewer_name,reviewer_role | external_link_id} → attested_by_name/role/at (cleared on rebuild/regenerate). Catalogue shows 'Approved by <name>, <role> · <date>'. cpd_accredited flag → CPD cert block (CPD_PROVIDER_NUMBER env)." />
          <RefRow label="Ext review" value="module_review_links (password-protected, snapshot-frozen, 30-day). POST /modules/:id/review-link (returns token + one-time password) · GET /modules/:id/review-links · /review-links/:id/revoke|resolve. Public /public/training-review/:token/unlock|decision + page /review/[token]. Reviewer signs off per-section + per-question (item_feedback {ref,label,status,note,resolved}); any change → changes_requested. External Approve + internal 'Publish citing this approval' (stale guard via content_hash)." />
          <RefRow label="Artefacts" value="Course specification (printable, components/course-specification.tsx) = the CPD-assessor doc. Tenant self-cert overlay on tenant-tailored publish (internally-generated, outside the accredited library)." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Staff endpoints (/me)</p>
          <RefRow label="List/take"  value="GET /me/annual-training · GET /me/annual-training/:id (learning+questions translated, correct stripped, linked policies)" />
          <RefRow label="Submit"     value="POST /me/annual-training/:id/submit — grade vs pass_mark → complete + set renewal expiry + issue certificate" />
          <RefRow label="Certificate" value="GET /me/annual-training/:id/certificate — data for the printable cert" />
          <RefRow label="My Training" value="AI modules are filtered out of /training/my-enrollments; /me/counts splits training vs annual for the hub badge" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Where it surfaces</p>
          <RefRow label="Staff record" value="buildStaffRecord.annual_training (items + summary) + risk flags (overdue/renewal-due/practical-due); printable certificate; in the CQC PDF" />
          <RefRow label="Analytics"     value="GET /analytics/annual-training → Analytics 'Training' tab section (completion, certs, renewals, practicals, per-module)" />
        </div>
      </RefSection>

      <RefSection icon={GraduationCap} title="Per-Setting Standard Training Library">
        <p className="mb-2 text-sm text-neutral-mid">
          The standard training library is built per regulated setting (the 11 /who-we-serve slugs), using a
          <strong> universal base + per-setting overlay</strong> model, so each kind of provider (care home, dental, GP, hospice…)
          gets training that fits it.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <RefTag color="teal">universal = care_setting NULL</RefTag>
          <RefTag color="blue">overlay = care_setting set</RefTag>
          <RefTag color="purple">11 settings</RefTag>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Model</p>
          <RefRow label="Taxonomy"        value="apps/api/src/lib/care-setting.ts — CARE_SETTINGS = the 11 /who-we-serve slugs (residential-care, nursing-homes, domiciliary-care, live-in-care, complex-care, shared-lives, substance-misuse, hospices, independent-hospitals, gp-practices, dental-practices). NULL = universal." />
          <RefRow label="Universal base"  value="TrainingTopic/Module with care_setting = NULL — cross-over subjects (safeguarding, fire, IPC…) shown under every setting, written once, setting-neutral voice." />
          <RefRow label="Setting overlay" value="TrainingTopic with care_setting = a slug — only that setting's specific topics (e.g. dental: HTM 01-05 decontamination, IR(ME)R radiography, medical emergencies, GDC standards). Seeded in apps/api/src/data/training-topics.ts." />
          <RefRow label="Tenant mapping"  value="facilityTypeToSetting(tenant.facility_type) → a slug (default residential-care); settingFallbackOrder() for content fallback." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Console — /platform/standard-training</p>
          <RefRow label="Setting tabs"    value="“All settings” tab = the universal base; each setting tab shows only that setting's overlay modules (with counts). Review + send for external approval per setting." />
          <RefRow label="Neutralise voice" value="Per-module wand + bulk 'Neutralise voice (all)' on the All-settings tab. POST /standard-training/modules/:id/neutralise rewrites wording setting-neutral, PRESERVING section/question counts, every correct index, and every image_key (neutraliseVoice.ts). Un-publishes + supersedes review (like a regenerate)." />
          <RefRow label="Setting-aware gen" value="generateAnnualModuleDraft appends settingGenerationContext(care_setting) — per-setting voice/scenarios/regulators (NULL = neutral). Generated module inherits the topic's care_setting." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Grounding — Training Seeds</p>
          <RefRow label="Training Seeds"  value="console → /training-seeds (TrainingSeed model). buildGrounding() now LEADS generation grounding with the topic's TrainingSeed (matched by training_type = topic title). Blank, inactive placeholders auto-create for every setting-specific topic (ensureSettingTrainingSeeds) — fill + activate to ground that module." />
          <RefRow label="Policy seeds"     value="PolicySeed grounding is setting-aware: a setting-specific topic only pulls same-setting policy seeds (dental no longer grounds in nursing-home policy text)." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Tenant-facing</p>
          <RefRow label="Catalogue scope" value="GET /training/catalogue filters topics + standard library to the tenant's setting + universal — a dental practice sees universal + dental only, not other settings' overlays." />
          <RefRow label="Marketing"        value="TODO (Phase 3): setting tabs on /staff-training 'Annual Mandatory Training Library' + care_setting on /public/training/standard-modules." />
        </div>
      </RefSection>

      <RefSection icon={ClipboardList} title="CQC Staff Prep">
        <p className="leading-relaxed text-neutral-mid">
          Inspector-style practice questions sent to staff, evaluated by AI against a model answer. Free-text answers only — no multiple choice.
          Questions are rephrased at delivery time to prevent rote memorisation.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="DB tables"          value="cqc_staff_questions (question bank + model answers), cqc_staff_deliveries (per-user deliveries, answers, scores)" />
          <RefRow label="Seed questions"     value="21 pre-loaded questions across 5 domains — auto-seeded on first GET /cqc-questions per tenant" />
          <RefRow label="API routes"         value="GET /cqc-questions, POST /generate, POST /:id/deliver, GET /deliveries, POST /deliveries/:id/answer" />
          <RefRow label="Question generation prompt" value="cqc_question_generation — uses {{domain}} and {{topic}} placeholders" />
          <RefRow label="Answer evaluation prompt"   value="cqc_answer_evaluation — uses {{question}}, {{model_answer}}, {{staff_answer}} placeholders" />
          <RefRow label="Scoring"            value="Claude Haiku evaluates answer → score 0–100 + 2–3 sentence feedback, stored on CqcStaffDelivery" />
          <RefRow label="Admin page"         value="/cqc-questions — Question Bank tab (send, add, remove) + Performance tab (staff × domain grid)" />
          <RefRow label="Staff portal"       value="/cqc — pending questions to answer + results with score and feedback" />
          <RefRow label="First-language delivery" value="GET /deliveries translates the rephrased question, model answer (once evaluated) and feedback into each staff member's first_language at serve time (translateTextsBatch, budget-guarded). The answer they submit is evaluated against the canonical English model answer — Claude scores meaning across languages — and the live feedback + revealed model answer are returned already translated. The English rephrase + feedback stay stored, so the admin Performance view is consistent. Honours comms_always_first_language." />
          <RefRow label="Both prompts"       value="Editable at /platform/prompts — changes take effect immediately with no restart" />
        </div>
      </RefSection>

      {/* Knowledge Base */}
      <RefSection icon={Database} title="Knowledge Base">
        <p className="leading-relaxed text-neutral-mid">
          Per-tenant Q&A pairs, either extracted from uploaded documents (Prompt C) or manually added.
          Embedded in Pinecone (knowledge namespace) and injected into all query responses when relevant.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Model"               value="KnowledgeEntry — tenant_id, question, answer, source_name, approved" />
          <RefRow label="Approval flow"       value="Extracted entries require manager approval before they appear in responses" />
          <RefRow label="Retrieval"           value="Semantic search against knowledge namespace — min score threshold before injection" />
          <RefRow label="Admin"               value="/platform (tenant admin panel) → Knowledge Base section" />
        </div>
      </RefSection>

      {/* Regulations Database */}
      <RefSection icon={BookOpen} title="Regulations Database">
        <p className="leading-relaxed text-neutral-mid">
          Platform-level regulatory knowledge base — shared read-only across all tenants.
          The Health and Social Care Act 2008 Regulations and related legislation, structured for RAG injection.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Model"               value="ExternalRegulation — official_name, summary, care_home_context, source_url, is_active" />
          <RefRow label="Admin"               value="/platform/regulations — add, edit, toggle active" />
          <RefRow label="Google Sheets sync"  value="Bidirectional sync via GOOGLE_SHEETS_ID — same pattern as CQC seeds" />
          <RefRow label="Injection"           value="fetchRegulationContextByQueryText() — keyword match on query text → injected as [RELATED REGULATIONS] in context" />
          <RefRow label="Scope"               value="Cited in all pipeline paths when a regulation matches the query — not just CQC path" />
        </div>
      </RefSection>

      {/* Prompt Management */}
      <RefSection icon={Bot} title="AI Prompt Management">
        <p className="leading-relaxed text-neutral-mid">
          All AI system prompts are stored in the database and editable at <strong>/platform/prompts</strong> without a code deploy.
          Changes take effect on the next query — no restart required.
        </p>
        <div className="mt-3 space-y-2">
          {[
            { slot: 'policy_summary',               label: 'Prompt A — Summary & Questions',      desc: 'Generates the concise answer + follow-up questions shown to staff for policy queries.' },
            { slot: 'policy_full',                  label: 'Prompt B — Full Policy Formatter',     desc: 'Formats the full policy section response when staff request more detail.' },
            { slot: 'knowledge_extraction',         label: 'Prompt C — Knowledge Base Extraction', desc: 'Extracts structured Q&A pairs from uploaded policy documents.' },
            { slot: 'training_question_generation', label: 'Training Question Generation',          desc: 'Generates multi-choice training questions from training seed data and source URLs.' },
            { slot: 'cqc_query',                   label: 'CQC Compliance Director',               desc: 'Drives the CQC compliance chat. Cross-references uploaded CQC reports with policies and the CQC seed knowledge base. Must include <!--FOLLOWUP:[...]-> at end.' },
            { slot: 'training_chat',               label: 'Training Chat',                         desc: 'Conversational training support for open-ended staff training questions.' },
            { slot: 'cqc_question_generation',     label: 'CQC Staff Prep — Question Generation',  desc: 'Generates a CQC inspector-style question + model answer from a domain and topic. Placeholders: {{domain}}, {{topic}}.' },
            { slot: 'cqc_answer_evaluation',       label: 'CQC Staff Prep — Answer Evaluation',    desc: 'Evaluates a staff answer against the model answer → score 0–100 + feedback. Placeholders: {{question}}, {{model_answer}}, {{staff_answer}}.' },
          ].map(p => (
            <div key={p.slot} className="rounded-lg bg-gray-50 px-4 py-2.5">
              <p className="font-semibold text-neutral-dark text-sm">{p.label}</p>
              <p className="text-xs text-neutral-mid font-mono mt-0.5">{p.slot}</p>
              <p className="text-xs text-neutral-mid mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-mid">
          All prompts receive a [CHANNEL] context block so they can adapt output format for web chat (HTML),
          email (HTML), WhatsApp (plain text), and voice (spoken sentences).
        </p>
      </RefSection>

      {/* Integrations */}
      <RefSection icon={Globe} title="Integrations & Environment Variables">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Supabase</p>
            <RefRow label="DATABASE_URL"            value="carestreamai_api role — RLS enforced, used by running app" />
            <RefRow label="DATABASE_DIRECT_URL"     value="service_role — bypasses RLS, used only for Prisma migrations" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">AI</p>
            <RefRow label="ANTHROPIC_API_KEY"       value="Claude Sonnet (main LLM) + Claude Haiku (classifier, button labels)" />
            <RefRow label="OPENAI_API_KEY"          value="text-embedding-3-small (embeddings) + Whisper (voice transcription)" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Pinecone</p>
            <RefRow label="PINECONE_API_KEY"        value="Vector store — index: carestreamai" />
            <RefRow label="PINECONE_INDEX"          value="carestreamai" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Email (SendGrid)</p>
            <RefRow label="SENDGRID_API_KEY"        value="Outbound emails" />
            <RefRow label="SENDGRID_INBOUND_PARSE_KEY" value="Webhook signature validation for inbound" />
            <RefRow label="SENDGRID_FROM_ADDRESS"   value="noreply@carestreamai.co.uk" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">WhatsApp (Twilio)</p>
            <RefRow label="TWILIO_ACCOUNT_SID"      value="Account identifier" />
            <RefRow label="TWILIO_AUTH_TOKEN"       value="Webhook signature validation + REST API auth" />
            <RefRow label="TWILIO_WHATSAPP_NUMBER"  value="Platform sandbox: +14155238886 (production: per-tenant)" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Google Sheets (regulations + CQC seeds sync)</p>
            <RefRow label="GOOGLE_SERVICE_ACCOUNT_JSON" value="Full service account JSON as single-line string" />
            <RefRow label="GOOGLE_SHEETS_ID"        value="Regulations sheet ID (from sheet URL)" />
            <RefRow label="GOOGLE_SHEETS_CQC_SEEDS_ID" value="CQC Seeds sheet ID (from sheet URL)" />
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Other</p>
            <RefRow label="JWT_SECRET"              value="Access token signing (15-min expiry)" />
            <RefRow label="JWT_REFRESH_SECRET"      value="Refresh token signing (7-day expiry)" />
            <RefRow label="STRIPE_SECRET_KEY"       value="Subscription billing (use sk_live_… in production)" />
            <RefRow label="STRIPE_WEBHOOK_SECRET"   value="whsec_… for the LIVE webhook endpoint — see Billing & Subscriptions section" />
            <RefRow label="REDIS_HOST / PORT"       value="BullMQ job queue" />
            <RefRow label="AWS_ACCESS_KEY_ID"       value="S3 file storage (eu-west-2)" />
          </div>
        </div>
      </RefSection>

      {/* Billing & Subscriptions */}
      <RefSection icon={CreditCard} title="Billing & Subscriptions">
        <p className="leading-relaxed text-neutral-mid">
          Stripe-hosted Checkout + Customer Portal, with <strong>Managed Payments</strong> (Stripe is the
          merchant of record and settles tax). Card data never touches our servers (PCI SAQ A).
          Tenant admins subscribe from <code className="text-xs bg-gray-100 px-1 rounded">/billing</code>.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Subscribe flow"   value="POST /billing/checkout (admin only) → creates a hosted Stripe Checkout Session (mode: subscription) for the chosen plan and redirects. On first use it lazily creates the Stripe Product + recurring GBP Price for the plan and stores plans.stripe_price_id_monthly — no manual dashboard price setup needed." />
          <RefRow label="Free trial — card up front" value="Checkout starts a 14-day trial with the card captured up front (subscription_data.trial_period_days=14 + payment_method_collection:'always'); £0 due now, Stripe auto-charges at trial end. Webhook stores tenants.trial_ends_at. New tenants are HARD-GATED: a trialling tenant with no Stripe subscription (needs_billing) is redirected to /billing by web middleware and can't reach the hub/console until a card is added. Exempt: any tenant that is 'active' (e.g. manually-provisioned accounts) — never gated." />
          <RefRow label="Auto-login on verify" value="Clicking the email verification link auto-verifies (no button) and logs the user straight in: /auth/verify-email returns a one-time login_token (15-min) → web calls signIn(mode:'magic') → lands on /billing (the card step). Reuses the magic-link infra (login_tokens / consumeLoginToken)." />
          <RefRow label="Managed Payments" value="Checkout runs with managed_payments.enabled = true → Stripe acts as merchant of record and settles tax. Plan products carry the SaaS tax code txcd_10103100 (business use). Product/price creation AND the Checkout Session are pinned per-request to the preview API version 2026-02-25.preview (the Stripe client itself stays un-pinned). Kill switch: env STRIPE_MANAGED_PAYMENTS=false reverts to standard checkout. services/billing/stripe.ts → managedPaymentsRequestOptions()." />
          <RefRow label="Plan chooser"     value="GET /billing/plans lists active AND public plans (is_active && is_public); the /billing page shows the chooser until subscription_status = 'active'. Internal plans (is_public=false, e.g. the £1 Sandbox) are hidden from real signups but still checkout-able by plan_id for testing." />
          <RefRow label="Manage / invoices" value="GET /billing/portal → Stripe Customer Portal (update card, cancel, invoices). GET /billing/summary + /billing/invoices pull live data from Stripe (next billing date, period, interval, invoice PDFs)." />
          <RefRow label="Webhook"          value="POST /billing/webhook — raw body, signature-verified (STRIPE_WEBHOOK_SECRET). Mounted before express.json + before rate-limiting so events are never dropped. services/billing/stripe.ts → handleWebhook." />
          <RefRow label="Events to register" value="checkout.session.completed · customer.subscription.created · customer.subscription.updated · customer.subscription.deleted · invoice.paid · invoice.payment_failed → keep tenants.subscription_status / plan_id / stripe_customer_id / stripe_subscription_id in sync." />
          <RefRow label="Go-live checklist" value="(1) STRIPE_SECRET_KEY = sk_live_… (2) enrol the Stripe account in Managed Payments (preview / limited-access — until then the checkout call errors; set STRIPE_MANAGED_PAYMENTS=false to fall back) (3) register the live webhook at /billing/webhook + set its STRIPE_WEBHOOK_SECRET (4) enable the Customer Portal in the Stripe Dashboard (5) complete the PCI SAQ A questionnaire (6) if you tested in TEST mode first, null out plans.stripe_price_id_monthly so LIVE Prices are created on first live checkout (a test price id won't work in live mode). SCA/3-D Secure is handled automatically by hosted Checkout." />
          <RefRow label="Test before live" value="With test keys, do one subscription using card 4242 4242 4242 4242 (any future expiry / CVC) and confirm the webhook flips the tenant to subscription_status = 'active'." />
          <RefRow label="Plans" value="plans table — Starter £49/mo (price 4900p), Professional £129/mo (12900p). Prices in pence (GBP). stripe_price_id_monthly auto-filled on first checkout." />
        </div>
      </RefSection>

      {/* Payment Security (Stripe) — audit 2026-06-09 */}
      <RefSection icon={Lock} title="Payment Security (Stripe / PCI)">
        <p className="leading-relaxed text-neutral-mid">
          Security review of the Stripe integration, 2026-06-09. Verdict: architecture meets Stripe's
          requirements — lowest PCI tier (SAQ A) with correct webhook, secret and transport handling.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="PCI scope — SAQ A" value="Card data NEVER touches our servers: no Stripe Elements, no card inputs, no raw PAN anywhere. All capture is on Stripe-hosted Checkout + Customer Portal. Keeps us in SAQ A (simplest self-assessment). Rule: never add raw card fields — always use hosted Checkout/Portal." />
          <RefRow label="Webhook signature"  value="VERIFIED — stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET). Raw body preserved (express.raw mounted before express.json) and mounted before apiLimiter so legit events are never rate-limited away. (app.ts, services/billing/stripe.ts)" />
          <RefRow label="Secrets handling"   value="No sk_/whsec_ keys in source; .env git-ignored (only .env.example tracked); keys read from env only. Logs contain customer/tenant IDs only — never card or PII." />
          <RefRow label="Transport + headers" value="HTTPS/TLS enforced by Vercel; helmet() sets HSTS + X-Frame-Options etc.; CORS is an allowlist (WEB_URL), not '*'; trust proxy = 1 for correct IP behind Vercel." />
          <RefRow label="SCA / 3-D Secure"   value="Required in UK/EEA — handled automatically by hosted Checkout. (If raw PaymentIntents are ever used directly, SCA must be handled manually — don't.)" />
          <RefRow label="API version" value="Client is left un-pinned (new Stripe(key)) so it uses the account default; Managed Payments product/price + Checkout calls override per-request to the preview version 2026-02-25.preview that feature requires. Don't pin a global apiVersion — it would override the per-request preview version." />
          <RefRow label="Optional hardening" value="Webhook event de-duplication by event.id (current handlers are already idempotent, so low priority)." />
        </div>
      </RefSection>

      {/* Monthly Audits */}
      <RefSection icon={ClipboardList} title="Monthly Audits">
        <p className="leading-relaxed text-neutral-mid">
          12 platform-seeded audit templates covering daily, monthly, quarterly, and periodic governance checks. Tenants complete audits on the web or via WhatsApp. On completion, an AI recommendations report is generated and stored against the run.
        </p>
        <div className="mt-3 space-y-1">
          <RefRow label="DB models"      value="AuditTemplate (seed + tenant), AuditSection, AuditQuestion, AuditRun (shift?, room_number?), AuditAnswer" />
          <RefRow label="Seed templates" value="12 templates seeded at platform level (tenant_id: null, is_seed: true) — auto-seeded on first GET /audits/templates" />
          <RefRow label="Admin"          value="/platform/audit-seeds — view all seeded templates, sections, and questions grouped by frequency" />
          <RefRow label="Reminders"      value="Daily cron (sendDailyAuditReminders) emails admins/managers an 'Audits to complete' list (gated on the audit_updates pref) + a hub badge on the Audits nav. services/audits/due.ts (getAuditsDue) flags what needs attention: daily=not run today, weekly/monthly=not run this period, quarterly=not run this quarter. Long-cycle audits only nag in their deadline window (monthly = last 10 days; quarterly = final month of the quarter, Mar/Jun/Sep/Dec) so admins aren't reminded for the whole period. me.counts returns `audits` (due + in-progress) for admins." />
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Seeded templates</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-neutral-mid">
            {[
              ['Daily',     'Fire Marshall Checklist ⚑'],
              ['Daily',     'Resident Bedrooms 🛏'],
              ['Monthly',   'Health & Safety'],
              ['Monthly',   'Resident Bedroom Audit'],
              ['Monthly',   'Medicines Management'],
              ['Monthly',   'Kitchen Audit'],
              ['Monthly',   'Accident & Incident Book Audit'],
              ['Monthly',   'Accident & Incident Book Analysis'],
              ['Quarterly', 'Infection Control'],
              ['Quarterly', 'Fire Drill Record Form'],
              ['Periodic',  'Quality Assurance'],
              ['Periodic',  'GDPR Audit Checklist'],
            ].map(([freq, name]) => (
              <div key={name} className="flex gap-2">
                <span className="w-20 shrink-0 font-medium text-teal">{freq}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Question types</p>
          <RefRow label="yes_no"    value="Yes / No toggle + optional outcome text + actions text" />
          <RefRow label="yes_no_na" value="Yes / No / N/A toggle — N/A counts as answered, skips outcome fields" />
          <RefRow label="findings"  value="Two free-text fields: Findings and Actions & Timescales. No toggle." />
          <RefRow label="free_text" value="Single narrative field. No toggle. Always counted as answered for progress." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">WhatsApp conversation flow</p>
          <RefRow label="Trigger"      value="Send 'audit' → template list sent → reply with number" />
          <RefRow label="Confirmation" value="After selecting template: 'Ready to start [Name]? Reply yes or no' — session is locked from step 3.6; policy RAG cannot interrupt" />
          <RefRow label="Shift step"   value="Fire Marshall Checklist only — after yes: 'Day shift or night shift? Reply day or night'. Creates separate AuditRun per shift. Resuming the same shift reuses the existing in_progress run." />
          <RefRow label="Room step"    value="Resident Bedrooms only — after yes: 'Enter room number'. Creates a separate AuditRun per room. Resuming the same room reuses the existing in_progress run." />
          <RefRow label="Pause"        value="Send 'stop' or 'pause' at any time during an audit. Clears detected_category/audit_run_id/audit_step from session — progress saved on AuditRun. If no answers yet (confirm/shift/room step), the placeholder run is deleted." />
          <RefRow label="Resume"       value="Send 'audit' → select same template → getOrCreateActiveRun finds existing in_progress run → confirmation shows 'Resuming — X of N already answered'" />
          <RefRow label="Session lock" value="detected_category='audit' locks ALL messages to the audit handler before intent classification — no other category can fire mid-audit" />
          <RefRow label="Safety net"   value="Unrecognised audit_step values also return handled:true — no message can escape to the RAG pipeline while an audit is active" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">AuditRun context fields</p>
          <RefRow label="shift"       value="'day' | 'night' — stamped on Fire Marshall Checklist runs. Code constant: SHIFT_REQUIRED_TEMPLATES in conversation.ts" />
          <RefRow label="room_number" value="Free text room identifier — stamped on Resident Bedrooms runs. Code constant: ROOM_REQUIRED_TEMPLATES in conversation.ts" />
          <RefRow label="Adding more" value="To require shift/room for a different template, add its name to the relevant constant in apps/api/src/services/audit/conversation.ts" />
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="AI recommendations" value="Generated on completion via audit_recommendations prompt slot — maps findings to the CQC key questions, produces six structured sections including a Quality Rating" />
          <RefRow label="AI prompt slot"      value="audit_recommendations — editable at /platform/prompts" />
          <RefRow label="Routes"              value="GET /audits/templates, POST /audits/runs, GET/PATCH /audits/runs/:id, POST /audits/runs/:id/complete" />
        </div>
      </RefSection>

      {/* Tenant Isolation */}
      <RefSection icon={Lock} title="Staff Sign-In & Account Provisioning">
        <p className="leading-relaxed text-neutral-mid">
          Part of the <strong>WhatsApp → Hub migration</strong>: getting staff into the hub with as little friction as
          possible. Auth is next-auth (credentials) issuing a backend JWT; the hub is the <code className="text-xs bg-gray-100 px-1 rounded">/chat</code> portal.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Sign-in"             value="next-auth CredentialsProvider (email + password) → apps/api /auth/login issues access + refresh JWT. Login is blocked for users where email_verified is false." />
          <RefRow label="Staff provisioning"  value="Managers create staff in /staff (InviteModal) → POST /users/invite (apps/api/src/routes/users.ts): creates the user with a random temp password; admin can copy it or email it (sendStaffWelcomeEmail / SendGrid)." />
          <RefRow label="Email verification"  value="Self-service org-admin /register requires email verification. Manager-provisioned STAFF are AUTO-VERIFIED at creation (email_verified=true) — the admin is the trust anchor and staff get no verification email." />
          <RefRow label="Fix (June 2026)"     value="Previously invited staff were created email_verified=false with no verification email, so they were hard-blocked at login. Invite now sets email_verified=true; existing unverified staff were backfilled." />
          <RefRow label="Passwordless"        value="Magic-link / QR sign-in (login_tokens table, single-use hashed, lib/login-tokens.ts). Endpoints: POST /auth/magic-link/request (staff 'email me a link', 30-min, no enumeration) + /auth/magic-link/verify; POST /users/:id/login-link (admin, 14-day). Consumed at /auth/link (web) via a next-auth 'magic' credentials mode. Bypasses the password + email-verified gate." />
          <RefRow label="UX surfaces"         value="Login page 'Email me a sign-in link'; staff record 'Sign-in link' button → modal with QR + copy + 'Email it to them' (components/admin/staff/sign-in-link.tsx, qrcode lib). Email: sendStaffLoginLinkEmail (outbound.ts)." />
          <RefRow label="Sessions"            value="'Stay signed in like WhatsApp': next-auth session.maxAge 90d + backend REFRESH_EXPIRY 90d (services/auth/tokens.ts)." />
          <RefRow label="Refresh rotation"    value="refresh_tokens table (id=jti) + lib/refresh-tokens.ts. Each /auth/refresh rotates: marks the old token consumed + issues a fresh one (sliding 90d window, returned to the web jwt callback which stores it). Reusing a consumed/unknown but validly-signed token = theft → revokeUserRefreshTokens (all sessions). Legacy pre-rotation tokens are grandfathered once." />
          <RefRow label="WhatsApp (no login)" value="The WhatsApp channel stays frictionless (tenant phone_allowlist, no login) and remains the fallback while the hub ramps up." />
          <RefRow label="Open account (operator)" value="Console → Clients → 'Open' button signs you into a client's own dashboard to view/support their account. POST /admin/tenants/:id/open-account (platform-admin only) mints a single-use 5-min login link for the client's first/owner admin (reuses login_tokens) and opens it in a new tab — a separate next-auth cookie session, so your console login is untouched. Logged server-side. Optional body { user_id } targets a specific staff member." />
          <RefRow label="New-account alert" value="Every new tenant registration (POST /auth/register) emails the platform owner the org name, account number, plan, admin name/email + slug. Recipient defaults to len@carestreamai.com (override with PLATFORM_NOTIFY_EMAIL). sendNewTenantNotification in services/email/outbound.ts. Clones don't trigger it." />
          <RefRow label="Clone tenant" value="POST /admin/tenants/:id/clone (platform-admin only · services/tenant/clone.ts) deep-copies a tenant into a brand-new account: policies (+S3 files +Pinecone vectors), policy translations, knowledge base (+vectors), training modules (+images +question versions), CQC question bank, onboarding flows+steps. CLEAN SLATE — no activity (enrolments, deliveries, runs, progress, query history, sessions, bookmarks); ONE fresh admin (existing users not copied — email is globally unique). Source is renamed first to free its slug. Vectors copied namespace→namespace (no OpenAI re-embedding); S3 via server-side CopyObject. Body: { live{name,slug,email_domain}, admin_rename{name,slug,email_domain}, admin{email,name,password?} } → returns new_tenant_id + temp_password. Used 2026-06-09 to split Ferndale into 'Ferndale Nursing Home - Admin' (CS-1001, sandbox) + live 'Ferndale Nursing Home' (CS-1002)." />
        </div>
      </RefSection>

      <RefSection icon={TrendingUp} title="Engagement Scoreboard (WhatsApp → Hub)">
        <p className="leading-relaxed text-neutral-mid">
          The leading indicator for the WhatsApp → Hub migration: <strong>weekly active staff %</strong>, an 8-week
          trend, and the <strong>channel mix</strong> so you can watch the hub take over as WhatsApp ramps down.
          Surfaced in <code className="text-xs bg-gray-100 px-1 rounded">Analytics → Engagement</code> (admin).
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Endpoint"       value="GET /analytics/engagement (apps/api/src/routes/analytics.ts) — requireAdmin, tenant-scoped." />
          <RefRow label="'Active' def"   value="A staff member is active in a window if they opened the hub (last_login_at), asked a question (QueryRecord) OR read a policy (PolicyReadSession) in it. Denominator = count(User where is_active)." />
          <RefRow label="Weekly active %" value="active in last 7d ÷ active team size. Headline counts logins too; the 8-week TREND is activity-based (QueryRecord + PolicyReadSession) because last_login_at has no history." />
          <RefRow label="Channel mix"    value="QueryRecord.channel over 30d: chat (hub) | whatsapp | email | voice, plus hub_pct (chat share). Email questions with null user_id aren't user-attributed." />
          <RefRow label="UI"             value="apps/web .../analytics/page.tsx — new 'Engagement' tab: WAU% + active/team/hub-share stat cards, 8-week trend bars, channel-mix bars." />
        </div>
      </RefSection>

      <RefSection icon={Smartphone} title="Staff Hub PWA & Push">
        <p className="leading-relaxed text-neutral-mid">
          The hub is an installable <strong>PWA</strong> (&ldquo;Add to Home Screen&rdquo;) so it opens standalone like an app —
          the foundation for the WhatsApp → Hub move and the prerequisite for iOS web-push.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Manifest"        value="apps/web/src/app/manifest.ts (Next App Router convention) — name CareStream, display standalone, start_url /chat, theme #9B52B5. Served at /manifest.webmanifest." />
          <RefRow label="Icons"           value="public/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png — generated from logo-color.png via sharp (centred on a white square)." />
          <RefRow label="iOS"             value="appleWebApp metadata + apple-touch-icon in apps/web/src/app/layout.tsx (viewport themeColor #9B52B5). iOS push requires the user to Add to Home Screen first." />
          <RefRow label="Service worker"  value="public/sw.js — skipWaiting/clients.claim, no-op fetch (aids installability), and push + notificationclick handlers (deep-link to /chat). Registered by components/pwa/pwa-register.tsx." />
          <RefRow label="Install prompt"  value="components/pwa/install-prompt.tsx — Android/desktop 'Install' button via beforeinstallprompt; iOS shows a Share→Add-to-Home-Screen hint. Dismissible (localStorage cs_install_dismissed). Mounted in (portal)/layout.tsx." />
          <RefRow label="Push — keys"     value="web-push (VAPID). Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT on care-stream-api; NEXT_PUBLIC_VAPID_PUBLIC_KEY on care-stream-web (client subscribe)." />
          <RefRow label="Push — storage"  value="push_subscriptions table / PushSubscription model (one row per device; endpoint unique). Subscribe/unsubscribe: POST /me/push/subscribe + /me/push/unsubscribe (apps/api/src/routes/me.ts)." />
          <RefRow label="Push — send"     value="apps/api/src/lib/push.ts sendPushToUsers(userIds, {title,body,url,tag}) — loads subs, sends via web-push, prunes dead (404/410). Never throws." />
          <RefRow label="Push — opt-in"   value="components/pwa/notifications-optin.tsx — shown only inside the INSTALLED app (standalone); requests permission, subscribes with the VAPID key, POSTs to /me/push/subscribe. Mounted in (portal)/layout.tsx." />
          <RefRow label="Push — wired in" value="Additive (WhatsApp/email kept as fallback): CQC prep delivery, proactive training question, and renewal reminders push to subscribed devices. Extend by calling sendPushToUsers in other proactive flows." />
        </div>
      </RefSection>

      <RefSection icon={Shield} title="Multi-tenancy & Security">
        <p className="leading-relaxed text-neutral-mid">
          Every data model (except platform-level shared tables) has a <code className="text-xs bg-gray-100 px-1 rounded">tenant_id</code>.
          Isolation is enforced at two layers.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Primary (app layer)"  value="The app connects as the postgres role (BYPASSRLS), so tenant isolation is enforced in the app: Prisma middleware auto-injects tenant_id for 6 models + every other tenant query includes where:{ tenant_id } explicitly." />
          <RefRow label="DB layer (RLS)"        value="Defence-in-depth: as of June 2026 RLS is enabled on ALL tables. Tenant tables have tenant-scoped policies (get_current_tenant_id()); child tables scope via their parent. Denies the Supabase anon/PostgREST roles." />
          <RefRow label="Auto-scoped models"    value="User, Policy, QueryRecord, EmailSession, AuditLog, KnowledgeEntry — Prisma middleware injects tenant_id automatically (note: NOT for findUnique)" />
          <RefRow label="Manually-scoped models" value="Training*, Audit* (tool), Cqc*, Onboarding*, WhatsAppSession — NOT auto-scoped; every query includes where:{ tenant_id } explicitly" />
          <RefRow label="Platform-only (shared)" value="ExternalRegulation, Plan, *Seed, AiPrompt(+versions), TrainingModule(+versions), Blog*, SitePage — no tenant_id; RLS-enabled (read-only to the app role, denied to anon)" />
          <RefRow label="Pinecone isolation"    value="Each chunk metadata includes tenant_id — all vector queries filter by tenant_id" />
          <RefRow label="Future hardening"      value="To make RLS protect the app's own queries too, switch the app to the carestreamai_api role + set_config('app.current_tenant_id') per request (withTenantTx)." />
        </div>
      </RefSection>

      {/* Security Hardening */}
      <RefSection icon={Lock} title="Security Hardening — June 2026">
        <p className="leading-relaxed text-neutral-mid">
          Full security review of the API completed 1 June 2026. The Critical, High and Medium
          severity findings below were identified and fixed. Foundations already in place beforehand:
          bcrypt(12) password hashing, JWT auth with a separate refresh secret, account lockout,
          enumeration-resistant password resets, helmet, scoped CORS, and per-user rate limiting.
        </p>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Critical — fixed</p>
          <RefRow label="Audit-tool isolation"  value="Every /audits/* handler read an unset variable for tenant_id, so Prisma dropped the filter and all audit data was cross-tenant readable/writable. Now scoped to the caller's JWT tenant_id. (routes/audits.ts)" />
          <RefRow label="SQLi — chat sessions"  value="GET /query interpolated document_category / language_detected from the query string into raw SQL. Converted to bound parameters. (routes/query.ts)" />
          <RefRow label="SQLi — admin analytics" value="Three /admin/* analytics routes interpolated tenant_id into raw SQL. Converted to bound parameters. (routes/admin.ts)" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">High — fixed</p>
          <RefRow label="Platform console login" value="Now email allowlist (PLATFORM_ADMIN_EMAILS) + password, not password-only. Constant-time compare, 10 req/min rate limit, generic 'incorrect email or password' error. Returns PLATFORM_ADMIN_TOKEN on success." />
          <RefRow label="Training integrity"   value="answer / complete / upload-certificate now require the enrolled staff member (or admin) — no forging another user's record. /enroll is admin-only and validates recipients + modules belong to the tenant. (routes/training.ts)" />
          <RefRow label="CQC staff prep"       value="create / generate / delete / deliver / all-deliveries are now admin-only; deliver validates recipient user_ids belong to the tenant. (routes/cqc-staff-questions.ts)" />
          <RefRow label="Feedback link signing" value="FEEDBACK_HMAC_SECRET set in production — one-click feedback links are HMAC-signed and verified in constant time (no shared dev-fallback secret)." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600">Medium — fixed</p>
          <RefRow label="SVG logo XSS"          value="Tenant logo upload no longer accepts image/svg+xml (SVGs can carry scripts and were stored as inline data: URLs). PNG/JPEG/WebP only. (routes/settings.ts)" />
          <RefRow label="Self-deactivation bug" value="The 'can't deactivate your own account' guard compared req.user.id, but the JWT field is `sub` — so it never fired. Fixed, an admin can no longer lock themselves out. (routes/users.ts)" />
          <RefRow label="Onboarding policy refs" value="Onboarding flow steps now validate that each referenced policy_id belongs to the tenant before storing (POST + PATCH). (routes/onboarding.ts)" />
          <RefRow label="Feedback secret"       value="Removed the hard-coded HMAC fallback in production — feedback-link signing fails closed if the env secret is missing. (lib/feedback-token.ts)" />
          <RefRow label="Inbound email auth"    value="Shared-secret verification added to /email/inbound (timing-safe ?key check). Built and deployed but OFF by default — activate via SendGrid Parse URL ?key=… + ENFORCE_INBOUND_PARSE_KEY=true. (routes/email.ts)" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">Database hardening — done</p>
          <RefRow label="RLS widened"          value="Row Level Security now enabled on EVERY table (was 6). All 17 tenant-data tables got tenant-scoped policies (child tables scope via their parent); 10 platform tables are RLS-on, app-role read-only. Closes the Supabase anon/REST path to tenant data. Supabase security advisor: clean." />
          <RefRow label="Function search_path"  value="Pinned a non-mutable search_path on the RLS/trigger helper functions (get_current_tenant_id, prevent_audit_log_mutation, update_email_session_expiry)." />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Known follow-ups</p>
          <RefRow label="Inbound email activation" value="Point the SendGrid Inbound Parse URL at .../email/inbound?key=<SENDGRID_INBOUND_PARSE_KEY>, then set ENFORCE_INBOUND_PARSE_KEY=true to enforce sender verification." />
          <RefRow label="Shared module editing" value="TrainingModule has no tenant_id (global catalog); any tenant admin can edit the shared question bank. Consider restricting to platform admin (product decision)." />
        </div>
      </RefSection>

      {/* Blog CMS */}
      <RefSection icon={FileText} title="Blog (database-driven CMS)">
        <p className="leading-relaxed text-neutral-mid">
          The marketing blog is fully database-driven and managed here in the platform console (Blog tab).
          Setting a post to <strong>published</strong> makes it appear on the live <code className="text-xs bg-gray-100 px-1 rounded">/blog</code> automatically — no code changes.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Storage"        value="blog_posts table — platform-level (no tenant_id). Authors in blog_authors." />
          <RefRow label="Public API"     value="GET /public/blog/posts (published list) + /public/blog/posts/:slug — no auth, published only" />
          <RefRow label="Public pages"   value="(marketing)/blog list + dynamic /blog/[slug], ISR (revalidate 60s), renders HTML content via ArticleLayout" />
          <RefRow label="Editor"         value="WYSIWYG visual editor (contentEditable) — Style/H1-H3, bold, italic, link, lists, quote. Stores HTML. Also special message, key-info box, FAQs, CTA." />
          <RefRow label="Feature images" value="Resized in-browser (max 1600px JPEG) before upload to stay under Vercel's 4.5MB limit; stored PRIVATELY in S3, served via GET /public/blog/image/:file with CORP: cross-origin." />
          <RefRow label="Migration"      value="The 6 original hand-coded articles were migrated into the DB and their static files removed; all posts are now editable here." />
        </div>
      </RefSection>

      {/* RalfyIndex auto-indexing */}
      <RefSection icon={Search} title="RalfyIndex — Auto Search Indexing">
        <p className="leading-relaxed text-neutral-mid">
          New public pages are pushed to <a href="https://ralfyindex.com" target="_blank" rel="noopener noreferrer" className="text-teal underline">ralfyindex.com</a> for
          automatic search-engine indexing the moment they go live — no manual submission. The
          <strong> Pages auto-indexed</strong> card on the Overview tab shows the running total plus credits remaining.
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="Triggers"       value="A blog post published (status=published) → carestreamai.com/blog/<slug>. A marketing/SEO site page published (Pages tab) → its path, e.g. /staff-training/<slug>." />
          <RefRow label="Excluded"       value="Landing pages (demos.carestreamai.com /lp/*) are noindex by design, so they are never submitted." />
          <RefRow label="Mode"           value="Standard indexing — 1 credit per URL (instant_index=false). Instant Indexer (10 credits/URL) is available via the instant_index flag but off by default." />
          <RefRow label="Dedupe"         value="Each URL is submitted at most once (filters URLs already logged as 'submitted'), so re-saving or editing a post never spends extra credits." />
          <RefRow label="Service"        value="apps/api/src/services/ralfyindex — client.ts (POST /status, /balance, /project; 8s timeout) + indexer.ts submitUrlsForIndexing(). Fire-and-forget safe: never throws into the blog/page save." />
          <RefRow label="Hooks"          value="routes/admin.ts — POST/PATCH /admin/blog/posts and POST/PATCH /admin/site-pages, after the write when status=published." />
          <RefRow label="Config"         value="ralfyindex_config (singleton row): api_key, enabled, instant_index, project_prefix. API key lives in the DB (not in git); can be toggled off via enabled=false." />
          <RefRow label="Tracking"       value="ralfyindex_submissions logs every push (url, source blog|page, project_name, status, credits_used). GET /admin/stats returns indexedPageCount + indexBalance for the dashboard card." />
          <RefRow label="Project names"  value="Auto-named '<project_prefix>_<UTC timestamp>' (default prefix 'CareStream'), sanitised to RalfyIndex's allowed characters." />
        </div>
      </RefSection>

      {/* GDPR / Cookie Consent */}
      <RefSection icon={Shield} title="GDPR & Cookie Consent">
        <p className="leading-relaxed text-neutral-mid">
          The public marketing site shows a GDPR cookie-consent banner on first visit. No tracking
          loads until the visitor explicitly accepts — this keeps the site compliant with UK GDPR /
          PECR (consent before non-essential cookies).
        </p>
        <div className="mt-2 space-y-1">
          <RefRow label="What it gates"     value="Microsoft Clarity (privacy-friendly analytics: heatmaps + session insight). Nothing else loads without consent." />
          <RefRow label="Banner behaviour"  value="Shown on first visit. Accept → loads Clarity; Decline → loads nothing. The choice is remembered so the banner doesn't reappear." />
          <RefRow label="Where the choice is stored" value="Browser localStorage key 'cookie_consent' = 'accepted' | 'declined'. Per-device, no server record (privacy by design)." />
          <RefRow label="Changing consent"  value="A 'Cookie settings' button (CookieSettingsButton, for the footer) re-opens the banner via the 'open-cookie-consent' window event so visitors can change their mind." />
          <RefRow label="Cookie Policy"     value="The banner links to /cookies. Keep that page's wording in step with what Clarity collects." />
          <RefRow label="Config"            value="Set NEXT_PUBLIC_CLARITY_ID in the web project's Vercel env to enable Clarity. Without it, consent is still recorded but no analytics script loads." />
          <RefRow label="Code"              value="components/marketing/cookie-consent.tsx (CookieConsent + CookieSettingsButton), mounted in app/layout.tsx." />
        </div>
      </RefSection>

      {/* Policy Upload & Ingestion */}
      <RefSection icon={Database} title="Policy Upload, Storage & Ingestion">
        <p className="leading-relaxed text-neutral-mid">
          Admins upload policies (single or bulk) in the tenant app. Files are stored in S3, then an async
          worker extracts the text and embeds it into Pinecone for retrieval. A policy is queryable once its
          status reaches <code className="text-xs bg-gray-100 px-1 rounded">active</code>.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Storage (S3)</p>
            <p className="text-neutral-mid">
              Bucket <code className="text-xs bg-gray-100 px-1 rounded">{`$S3_BUCKET`}</code> (e.g. carestreamai-docs-prod-3, eu-west-2). Key pattern:
              <code className="text-xs bg-gray-100 px-1 rounded">tenants/&#123;tenantId&#125;/policies/&#123;policyId&#125;/&#123;filename&#125;</code>.
              The prefix is the immutable tenant ID, so it survives renames. Each client&rsquo;s S3 prefix is shown on
              their Clients → detail page (Document storage card).
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Ingestion pipeline</p>
            <p className="text-neutral-mid">
              Upload → S3 → DB row (<code className="text-xs bg-gray-100 px-1 rounded">processing</code>) → enqueue (BullMQ/Redis) →
              worker downloads from S3, extracts text (PDF/DOCX/ODT/TXT), caches extracted text to S3, embeds to Pinecone →
              status <code className="text-xs bg-gray-100 px-1 rounded">active</code>. So <strong>active = a confirmed S3 round-trip</strong> (written and read back), the practical &ldquo;it hit the bucket&rdquo; signal.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Bulk upload — the 4.5MB body limit</p>
            <p className="text-neutral-mid">
              Vercel rejects any request body over 4.5MB <em>before</em> it reaches the API, so a single bulk request with many
              files silently fails (0 created, &ldquo;N failed&rdquo;). The client therefore <strong>splits the selection into batches</strong>
              (&lt;4MB and ≤20 files each) and uploads them sequentially. If a response is lost mid-batch, it
              <strong> reconciles against the server</strong> (re-fetches the policy list, matches by filename) so files that landed are
              never falsely marked failed and a duplicate re-upload is never invited.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Duplicate detection (on upload)</p>
            <p className="text-neutral-mid">
              Every file is SHA-256 hashed (column <code className="text-xs bg-gray-100 px-1 rounded">policies.content_hash</code>). On bulk upload the client first
              calls <code className="text-xs bg-gray-100 px-1 rounded">POST /policies/check</code>, which classifies each file against the tenant&rsquo;s ACTIVE policies as:
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-neutral-mid">
              <li><strong>exact_duplicate</strong> (hash matches) → <strong>auto-skipped</strong>, reported in the summary. Never stored twice.</li>
              <li><strong>name_match</strong> (same policy name, different content) → admin chooses <strong>Replace</strong> (new version via the <code className="text-xs bg-gray-100 px-1 rounded">/:id/version</code> flow — old archived/superseded) or <strong>Keep both</strong>, per file.</li>
              <li><strong>new</strong> → uploaded as a brand-new policy.</li>
            </ul>
            <p className="mt-2 text-neutral-mid">
              The bulk endpoint <em>also</em> skips byte-identical files server-side (and within the same batch) as a fail-safe, returning them in a <code className="text-xs bg-gray-100 px-1 rounded">skipped</code> array.
              Policies uploaded before this feature have no hash yet, so they match by <strong>name</strong> only until re-versioned.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs">
            <p className="font-semibold text-neutral-dark mb-1">Content duplicate detection (after ingestion)</p>
            <p className="text-neutral-mid">
              The upload check only sees the filename + byte hash, so a same-policy-different-name pair (e.g. &ldquo;Holiday Policy&rdquo; vs &ldquo;Staff Annual Leave Policy&rdquo;) isn&rsquo;t caught there. After ingestion, we compare the <strong>extracted text</strong>:
              <code className="text-xs bg-gray-100 px-1 rounded ml-1">apps/api/src/lib/content-similarity.ts</code> builds a bottom-k (KMV) sketch of 5-word shingle hashes (<code className="text-xs bg-gray-100 px-1 rounded">policies.content_signature</code>);
              <code className="text-xs bg-gray-100 px-1 rounded ml-1">policy-dedup.ts</code> compares the new policy against other active policies of the SAME category by Jaccard similarity.
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-neutral-mid">
              <li>Runs in the ingestion worker (brand-new uploads only; a version swap is skipped). Backfills missing signatures for existing policies on the fly (cap 150/pass), so it self-heals for pre-feature libraries.</li>
              <li>Similarity ≥ <strong>0.85</strong> (DUPLICATE_THRESHOLD) → sets <code className="text-xs bg-gray-100 px-1 rounded">duplicate_of</code> / <code className="text-xs bg-gray-100 px-1 rounded">duplicate_score</code> / <code className="text-xs bg-gray-100 px-1 rounded">duplicate_status='flagged'</code>. Pure hashing, no AI cost.</li>
              <li>Tenant resolves on the Policies page: <code className="text-xs bg-gray-100 px-1 rounded">GET /policies/duplicates</code> + <code className="text-xs bg-gray-100 px-1 rounded">POST /policies/:id/duplicate/resolve</code> {`{action: keep_both | replace | cancel}`}. replace archives duplicate_of; cancel archives the new one; all set status='dismissed'.</li>
              <li><strong>Similarly-named but distinct</strong> (trust/reassurance): when NOT a content duplicate but the closest candidate shares a distinctive name keyword (nameKeywords, ≥4 chars, minus NAME_STOPWORDS), policy-dedup.ts records similar_named_note {`{policy_id, name, content_pct}`} + similar_named_status='noted'. Policies page shows a teal 'checked, kept as separate' panel with the content %. GET /policies/similar-named + POST /policies/:id/similar-named/dismiss. Reinforces the gap/revenue angle (both are legitimate policies).</li>
            </ul>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Policy gaps (INTERNAL)" value="Cross-setting gap analysis — /platform/policy-gaps (admin/policy-gaps route). policy-classifier.ts classifies each active policy into a canonical policy_type via Haiku (guided by SEED_POLICY_TYPES + already-seen types so names converge), stored on policies.policy_type. Peers = tenants whose facilityTypeToSetting(facility_type) matches the target's. Peer catalogue = types ≥1 peer has (minus policy_type_curation 'ignored'); missing = catalogue types the target lacks, ranked by peer coverage %. GET /:tenantId report (per-client), GET /matrix?setting= (setting-wide grid: every assessable client × policy types → who's missing what, ranked; the sales pipeline), POST /:tenantId/classify (batched loop), POST /types/ignore. Platform-only; never shares one client's policy content with another (types + counts only). Future: write & sell the gap." />
          <RefRow label="Upload UI"          value="apps/web/src/app/(admin)/policies/page.tsx — single + bulk; bulk auto-chunks by size/count, runs a duplicate-check review step, shows per-file progress." />
          <RefRow label="Duplicate check"    value="POST /policies/check — SHA-256 + normalised-name match vs active policies. Exact dupes auto-skip; name matches prompt Replace/Keep both. content_hash column + policies_tenant_hash_idx." />
          <RefRow label="API"                value="POST /policies (single), POST /policies/bulk (≤50 files), GET /policies. apps/api/src/routes/policies.ts." />
          <RefRow label="Upload limits"      value="multer memoryStorage, 50MB/file; accepted: PDF, DOCX, ODT, TXT (MIME + extension checked). middleware/upload.ts." />
          <RefRow label="Storage service"    value="apps/api/src/services/storage/s3.ts — buildPolicyKey(); falls back to local disk if S3_BUCKET unset." />
          <RefRow label="Worker"             value="src/workers/ingestion.worker.ts — text extraction + Pinecone embedding; sets status active." />
          <RefRow label="Status meanings"    value="processing = uploaded, awaiting ingestion · active = ingested & queryable · failed = ingestion error · archived/superseded = replaced." />
          <RefRow label="Verify a client"    value="DB policies row (s3_key + status) and Clients → detail → Document storage prefix. status active confirms the bucket landing." />
        </div>
      </RefSection>

      {/* SEO — Structured Data (schema.org JSON-LD) */}
      <RefSection icon={Globe} title="SEO — Structured Data (schema.org JSON-LD)">
        <p className="leading-relaxed text-neutral-mid">
          Every public page emits schema.org JSON-LD so Google can build rich results (sitelinks search box,
          breadcrumbs, FAQ accordions, article cards) and understand the entity behind the site. All builders
          live in one file and render through a single <code className="text-xs bg-gray-100 px-1 rounded">&lt;JsonLd&gt;</code> component.
          CareStreamAI is described as a <strong>B2B SaaS (Organization + SoftwareApplication)</strong> — deliberately
          NOT LocalBusiness/NursingHome, which would be misleading structured data for a software company and an SEO risk.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Site-wide (root layout — every page)</p>
            <p className="text-neutral-mid">
              <code className="text-xs bg-gray-100 px-1 rounded">Organization</code> (CareStreamAI Limited, logo, support ContactPoint),
              <code className="text-xs bg-gray-100 px-1 rounded"> WebSite</code>, and
              <code className="text-xs bg-gray-100 px-1 rounded"> SiteNavigationElement</code> (the 10 primary nav links).
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Page-specific</p>
            <p className="text-neutral-mid">
              Homepage adds <code className="text-xs bg-gray-100 px-1 rounded">WebApplication/SoftwareApplication</code> (HealthApplication
              category + Starter £49 / Professional £129 Offers) and <code className="text-xs bg-gray-100 px-1 rounded">FAQPage</code>.
              All marketing pages add <code className="text-xs bg-gray-100 px-1 rounded">BreadcrumbList</code>.
              <code className="text-xs bg-gray-100 px-1 rounded"> /faq</code> adds FAQPage (all Q&amp;As).
              Blog articles add <code className="text-xs bg-gray-100 px-1 rounded">BlogPosting</code> (+ FAQPage when the post has FAQs).
              CMS catch-all pages add FAQPage when the page carries FAQs.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Builders"           value="apps/web/src/lib/schema.ts — organizationSchema, webSiteSchema, siteNavigationSchema, webApplicationSchema, breadcrumbSchema, blogPostingSchema, faqPageSchema" />
          <RefRow label="Render component"    value="components/json-ld.tsx (<JsonLd>) + components/breadcrumbs-json-ld.tsx (client, derives crumbs from usePathname)" />
          <RefRow label="Wired in"            value="app/layout.tsx (Org+WebSite+Nav), (marketing)/layout.tsx (Breadcrumbs), app/page.tsx (WebApp+FAQ), blog/[slug], faq, [...slug] catch-all" />
          <RefRow label="Canonical site URL"  value="https://carestreamai.com (SITE_URL constant) — metadataBase, sitemap, OG and all @id anchors use it" />
          <RefRow label="Entity type"         value="Organization (SaaS) — NOT LocalBusiness/NursingHome. No address/geo/openingHours (would be misleading for software)." />
          <RefRow label="Pending real data"   value="Org address (PostalAddress), telephone, and sameAs social URLs are intentionally omitted until supplied — add to organizationSchema() in schema.ts." />
          <RefRow label="Validate"            value="Test live with Google Rich Results Test (search.google.com/test/rich-results) and Schema.org Validator (validator.schema.org). See QA Testing tab." />
        </div>
      </RefSection>

      {/* WebMCP — AI-Agent Tooling */}
      <RefSection icon={Bot} title="WebMCP — AI-Agent Tooling & llms.txt">
        <p className="leading-relaxed text-neutral-mid">
          WebMCP (Web Model Context Protocol) lets the site hand AI agents a typed
          &ldquo;instruction manual&rdquo; of actions via <code className="text-xs bg-gray-100 px-1 rounded">document.modelContext.registerTool()</code>.
          Once a tool is registered the agent can invoke it directly through the browser instead of simulating clicks.
          It&rsquo;s a W3C <strong>Community Group draft</strong> (June 2026) — live only in Chrome Canary behind a flag — so we
          feature-detect and <strong>no-op everywhere it&rsquo;s unsupported</strong>; existing users are never affected.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Imperative API (what we use today)</p>
            <p className="text-neutral-mid">
              <code className="text-xs bg-gray-100 px-1 rounded">lib/webmcp.ts</code> wraps registerTool with feature detection +
              an AbortSignal so tools auto-unregister on unmount. <code className="text-xs bg-gray-100 px-1 rounded">hooks/use-agent-tool.ts</code>
              (<code className="text-xs bg-gray-100 px-1 rounded">useAgentTool</code> / <code className="text-xs bg-gray-100 px-1 rounded">useAgentTools</code>) ties registration to the React lifecycle.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Declarative API (forms)</p>
            <p className="text-neutral-mid">
              The WebMCP HTML declarative API (auto-deriving a tool from <code className="text-xs bg-gray-100 px-1 rounded">&lt;form&gt;</code> markup) is still a
              spec TODO, so <code className="text-xs bg-gray-100 px-1 rounded">components/agent/use-agent-form.ts</code> gives a declarative-feeling wrapper that
              compiles a form&rsquo;s fields into the imperative call today. The contact form (<code className="text-xs bg-gray-100 px-1 rounded">contact_carestream</code>)
              and demo form (<code className="text-xs bg-gray-100 px-1 rounded">book_demo</code>) are wrapped. When the HTML standard ships, only this wrapper changes.
            </p>
          </div>
          <div>
            <p className="font-semibold text-neutral-dark mb-1">Safety annotations</p>
            <p className="text-neutral-mid">
              Read/lookup tools are tagged <code className="text-xs bg-gray-100 px-1 rounded">readOnlyHint</code>; anything returning customer-uploaded text is
              tagged <code className="text-xs bg-gray-100 px-1 rounded">untrustedContentHint</code> (treat as data, not instructions — our prompt-injection guard).
              Form submits are NOT read-only.
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Core + hooks"        value="apps/web/src/lib/webmcp.ts, hooks/use-agent-tool.ts, components/agent/use-agent-form.ts" />
          <RefRow label="Public tool registry" value="lib/agent-tools.ts — carestream_overview, get_pricing, search_blog (all read-only). Mounted site-wide via components/agent/marketing-agent-tools.tsx in (marketing)/layout.tsx." />
          <RefRow label="Form tools"          value="contact_carestream (contact form), book_demo (demo form) — wrapped with useAgentForm. Submit to POST /public/marketing/leads with source='agent'." />
          <RefRow label="Lead capture"        value="POST /public/marketing/leads (apps/api/src/routes/marketing-public.ts) → persists to marketing_leads table + emails sales via sendLeadNotificationEmail (SALES_NOTIFICATION_EMAIL, falls back to PLATFORM_ADMIN_EMAILS[0], then hello@). Both the website forms and agent tools use it — leads are no longer lost." />
          <RefRow label="Agent tracking"      value="Every tool execute() fires a beacon to POST /public/marketing/agent-events → one row per invocation in agent_events (tool_name, path, status, source). Wrapped in lib/webmcp.ts; fire-and-forget, never blocks the tool." />
          <RefRow label="Console view"        value="Platform console → Dashboard → 'AI Agents' tab: total / 7d / 30d tool calls, per-tool breakdown, recent invocations, plus recent leads (contact+demo) with web vs AI-agent source. API: GET /admin/agent-events and GET /admin/leads." />
          <RefRow label="Auth context"        value="Tools run client-side under the visitor's own session — so tenant isolation / RLS hold automatically. No new credentials or API surface." />
          <RefRow label="Tenant tools (Phase 2)" value="components/agent/tenant-agent-tools.tsx — ask_policy_question, search_policies, list_training_modules. Mounted in (portal) + (admin) layouts; use the user's NextAuth accessToken via createApiClient, so RLS/role/tenant checks all hold. Read-only; answers tagged untrustedContentHint." />
          <RefRow label="Mutating tools (Phase 3)" value="Admin-only: create_knowledge_entry, start_audit (+ list_audit_templates helper). Each AWAITS a human-confirmation dialog before running, then logs the decision (approved/declined/error) to the agent audit log. Server also enforces admin (requireAdmin)." />
          <RefRow label="Confirmation gate"   value="lib/agent-confirm.ts (module store) + components/agent/agent-action-dialog.tsx (modal, rendered by TenantAgentTools). No agent-initiated mutation runs without an explicit human click." />
          <RefRow label="Agent audit log"     value="POST /agent-actions (apps/api/src/routes/agent-actions.ts, requireAuth+requireAdmin) writes an agent_events row with mutation=true, confirmed, summary, tenant_id + user_id (from JWT — agent can only log under its own tenant). Shown in the AI Agents tab (Confirmed mutations stat + 'mutation' tag + summary)." />
          <RefRow label="Phase 4 (optional)"  value="Hosted MCP server for headless/desktop agents (Claude/ChatGPT desktop) with per-tenant API keys/OAuth — separate, heavier security model." />
          <RefRow label="llms.txt"            value="GET /llms.txt — curated site map for LLMs per llmstxt.org (H1 + blockquote + H2 link-lists + Optional section). Route at app/llms.txt/route.ts." />
          <RefRow label="Data tables"         value="marketing_leads + agent_events (platform-level, RLS-enabled, no anon policies — API postgres role bypasses). Migration: apps/api/prisma/migrations/manual_marketing_leads_and_agent_events.sql." />
          <RefRow label="Browser support"     value="Chrome Canary only (flag), HTTPS-only, June 2026. Verify in Rich Results-style agent tooling once GA. See QA Testing tab." />
        </div>
      </RefSection>

      {/* Policy Seeds */}
      <RefSection icon={FileText} title="Policy Seeds (anonymised reference library)">
        <p className="leading-relaxed text-neutral-mid">
          Policy Seeds are a <strong>platform-level library of anonymised reference policies</strong> sourced from a real home.
          They serve two jobs: they <strong>ground onboarding question generation</strong> in real policy wording, and they give
          the tenant-adoption flow a canonical reference to match a home&rsquo;s own policies against. Managed in
          <strong> Platform console → Policy Seeds</strong>.
        </p>
        <div className="mt-3 space-y-1">
          <RefRow label="Table"            value="policy_seeds (platform-level): section, title, content (anonymised), document_category, source_tenant_id, source_policy_id (UNIQUE — dedupe), reviewed." />
          <RefRow label="Import"           value="POST /admin/policy-seeds/import/:tenantId?limit= — BATCHED. Per policy: downloadExtractedText (S3) → deterministic strip → Haiku anonymise pass → policy_seeds row (reviewed=false)." />
          <RefRow label="Timeout safety"   value="Each import call self-limits to a 45s wall-clock budget (and a count cap) so a batch of large policies can't exceed the 60s function limit; client loops with retry. Resumable via source_policy_id dedupe." />
          <RefRow label="Review gate"      value="Seeds land as 'needs review'. The platform owner reviews/edits each (check no identifying detail remains) and marks Reviewed before it is used." />
          <RefRow label="AI clean action"  value="Per-seed ✨ + bulk 'AI-clean the long ones' (POST /admin/policy-seeds/:id/ai-clean). Re-runs the full genericisation pipeline (chunked, no length cap) and resets Reviewed. Use during review to catch residual named individuals." />
          <RefRow label="Grounding"        value="Onboarding AI-draft injects REVIEWED seed excerpts (one per section, ≤1000 chars) so generated questions reflect real policy text. No effect until seeds are imported + reviewed." />
          <RefRow label="Editable prompt"  value="usage 'policy_anonymisation' ('Policy Seed Anonymisation') in /prompts — Haiku instructions for the anonymise pass." />
          <RefRow label="Files"            value="apps/api/src/routes/policy-seeds.ts; console apps/web/src/app/(platform)/platform/policy-seeds/page.tsx." />
        </div>

        <div className="mt-4">
          <p className="font-semibold text-neutral-dark mb-1">Genericisation rules (applied to every imported policy)</p>
          <p className="text-neutral-mid mb-2">
            Same process is run on every policy at import and on every AI-clean, in this order. Codified in
            <code className="text-xs bg-gray-100 px-1 rounded">policy-seeds.ts</code> so new policies are genericised identically.
          </p>
          <div className="space-y-1">
            <RefRow label="1. Deterministic strip" value="buildDeterministicAnonymiser(): replace the home's name → 'the Home', slug → 'the-home', email_domain → example.com, branding_signoff → 'The Care Team', and every staff name → [Name], email → [email], phone → [phone]; plus generic email + UK-phone regex." />
            <RefRow label="2. AI pass (Haiku)"     value="aiAnonymise(): chunked on paragraph boundaries (~9k chars, NO length cap) so long policies are fully processed. Genericises residual identifiers — address, town, named individuals (directors/managers), registration numbers — per the editable 'policy_anonymisation' prompt. Falls back to the deterministic text on failure." />
            <RefRow label="3. Boilerplate removal" value="stripBoilerplate(): removes standard care-policy-template furniture — (a) Word image auto-captions ('… Description automatically generated …'); (b) the letterhead header ('the Home / Registered Office: / [address] / Telephone: […] / […]', incl. markdown-bold + #-title variants), anchored on the run of [..] placeholder lines so body uses of 'registered office/provider' are never touched; (c) the signature footer (Signed: / Date: / Policy review date:); (d) the 'Copyright © <year> the Home All rights reserved.' line." />
            <RefRow label="Not codified"            value="One-off, source-specific bits handled manually during review (e.g. a named local supplier/pharmacy + town, a single home's bespoke governance/management section). Use the ✨ AI-clean or edit/delete the seed. Body uses of generic terms ('registered provider', a national body's public address) are intentionally kept." />
          </div>
          <div className="mt-2 rounded-lg border border-teal/20 bg-teal-light/20 px-3 py-2 text-xs text-teal">
            <strong>Staff-facing policy rendering &amp; preview (different path):</strong> <span className="text-neutral-dark">When a staff member opens a full policy (or reads one in induction), <code className="font-mono">formatPolicyHtml()</code> (apps/api/src/lib/translate.ts) strips letterhead/address/phone/email/signature/copyright/Word-captions and formats to clean HTML (h2/h3/p/ul/ol/strong), cached in <code className="font-mono">policy_translations</code> (lang=&lsquo;eng&rsquo;). To QA this, Clients → client → Policies → <strong>Preview</strong> (GET <code className="font-mono">/admin/tenants/:id/policies/:policyId/preview</code>) renders that exact cached HTML with a toggle to the original extracted text; generates + caches on demand if not yet rendered (tracks policy_format). This is separate from the Policy Seed genericisation above (which anonymises into shareable templates).</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="font-semibold text-neutral-dark mb-1">Care-setting dimension</p>
          <p className="text-neutral-mid mb-2">
            Seeds, onboarding flows and training modules are tagged by <strong>care setting</strong> so a tenant gets content built from policies for THEIR kind of home (Ferndale = nursing home, Crossways = care home, future: home care, …).
          </p>
          <div className="space-y-1">
            <RefRow label="Taxonomy"      value="apps/api/src/lib/care-setting.ts — CARE_SETTINGS: nursing_home | care_home | home_care | other. facilityTypeToSetting() maps the tenant's facility_type (set at signup) to a setting. settingFallbackOrder() picks the nearest setting WITH seeds so generation never breaks for a setting that has no library yet." />
            <RefRow label="Seeds"         value="policy_seeds.care_setting (319 Ferndale → nursing_home). Import is tagged via the 'as <setting>' selector (or derived from the source home). Policy Seeds console has Nursing / Care / Home care / Other TABS." />
            <RefRow label="Templates"     value="onboarding_flows.care_setting + training_modules.care_setting (NULL = all settings). Set per template in the console. Tenants only see/adopt templates for their setting (or 'all'); adopted copies inherit it." />
            <RefRow label="Grounding"     value="Onboarding AI-draft + training generate-questions ground in the tenant/template setting's reviewed seeds (training matches seeds to the module topic by keyword). Training module catalog (ensureTenantModules) only clones templates for the tenant's setting + universal ones." />
          </div>
        </div>
      </RefSection>

      {/* Staff Onboarding */}
      <RefSection icon={ClipboardList} title="Staff Onboarding Flows (templates → tenant adoption)">
        <p className="leading-relaxed text-neutral-mid">
          Two layers, mirroring the training-template model. <strong>Platform templates</strong> (OnboardingFlow with
          <code className="text-xs bg-gray-100 px-1 rounded">tenant_id = NULL</code>) are shared inductions for each role/specialism.
          A tenant <strong>adopts</strong> one, which clones it into an editable tenant-owned copy and uses AI to map + tailor it to
          that home&rsquo;s own policies. New starters are then auto-enrolled.
        </p>
        <div className="mt-3 space-y-2">
          <RefTag color="teal">read_policy step</RefTag>
          <RefTag color="blue">answer_question (MCQ, auto-marked)</RefTag>
          <RefTag color="purple">primary = job role</RefTag>
          <RefTag color="amber">secondary = specialism</RefTag>
        </div>
        <div className="mt-3 space-y-1">
          <RefRow label="Template model"    value="OnboardingFlow: tenant_id NULL = template; flow_kind (primary|secondary); source_flow_id links a tenant copy to its template. OnboardingStep: policy_section (abstract area), question, options[] + correct_option (MCQ)." />
          <RefRow label="Platform console"  value="/platform/onboarding-flows — 'Create role templates' seeds 13 primary roles + 8 specialisms (data/onboarding-roles.ts); 'AI draft' generates policy areas + an MCQ each; Activate when reviewed. Only ACTIVE templates are visible to tenants." />
          <RefRow label="AI draft"          value="POST /admin/onboarding-templates/:id/ai-draft — Claude (editable prompt 'onboarding_flow_generation'), grounded in reviewed Policy Seeds. JSON parsed robustly (first { to last })." />
          <RefRow label="Tenant adoption"   value="GET /onboarding/templates (available, not yet adopted) → POST /onboarding/templates/:id/adopt: clones to tenant copy + matchStepsToPolicies (Haiku, sets policy_id per step; deterministic section-match fallback) + tailorQuestionsToPolicies (Haiku, rewrites each MCQ to the matched policy's wording). Reports unmapped read steps." />
          <RefRow label="New-starter enrol" value="Staff invite (users.ts) with new_starter=true auto-enrols into every ACTIVE tenant flow (adopted or custom) whose job_roles match — adopted flows are tenant-owned + active, so this is automatic." />
          <RefRow label="Staff completion"  value="Portal (apps/web/(portal)/chat). MCQ graded deterministically (selected index vs correct_option) — wrong answer keeps the step incomplete so they retry. Free-text uses a Haiku yes/no verdict. GET /onboarding/my exposes options but NEVER correct_option." />
          <RefRow label="Question source"   value="FlowPreview shows per-question provenance. READY-MADE flows (flow.source_flow_id set = adopted from a CareStream template) → 'CareStream Sources' (questions authored/generated platform-side, no tenant AI cost; read steps still map to tenant policies). CUSTOM flows → OnboardingStep.policy_id resolved to the tenant policy name ('Generated from X'); the tenant 'Generate questions from policy' path now sets policy_id = source policy (onboarding-modals.tsx). No policy_id → 'Source not recorded'. All sources are the tenant's own content or a platform label — no exposure risk." />
          <RefRow label="Flow Preview"      value="FlowPreview (onboarding-modals.tsx) — read-only view of a flow as staff experience it (reads + questions + correct answer + per-question source). Inline × deletes a step, persisted via PATCH /onboarding/flows/:id (full steps replace, minus the removed one). 'Preview' button on each Active flow card." />
          <RefRow label="Files"             value="apps/api/src/routes/onboarding.ts (tenant + adoption), routes/onboarding-templates.ts (platform), data/onboarding-roles.ts. Tenant UI: (admin)/onboarding/page.tsx + components/admin/onboarding/onboarding-modals.tsx." />
        </div>

        <div className="mt-4">
          <p className="font-semibold text-neutral-dark mb-1">Positions & specialist roles (the link to staff)</p>
          <p className="text-neutral-mid mb-2">
            How a staff member's role drives which onboarding + training they get. ONE canonical list keeps positions, specialisms, onboarding flows and training modules aligned.
          </p>
          <div className="space-y-1">
            <RefRow label="Source of truth"   value="apps/api/src/data/onboarding-roles.ts — PRIMARY_ROLES (14, incl. Nurse) = staff Positions; SECONDARY_ROLES (8) = Specialist roles. effectiveStaffRoles/effectiveSpecialistRoles fall back to these when a tenant hasn't customised. Same strings are used as the onboarding flows' job_roles and (where set) training modules." />
            <RefRow label="Staff data"        value="User.job_role = position (single). User.specialisms = String[] (zero or more). Set on the Staff invite/edit form: Position dropdown + Yes/No specialist toggle → multi-select." />
            <RefRow label="Tenant settings"   value="Tenant.staff_roles = configurable Positions list; Tenant.specialist_roles = configurable Specialist list. Managed in tenant Settings (Positions + Specialist roles cards). GET/PATCH /settings serve/accept both (effective = tenant's or defaults)." />
            <RefRow label="Onboarding link"   value="New-starter invite (users.ts) enrols into every active onboarding flow whose job_roles is empty OR intersects ([position] ∪ specialisms). So a flow tagged 'Care Assistant' matches their position; a secondary flow tagged 'Infection Control' matches a specialism." />
            <RefRow label="Training link"     value="Position drives the training module catalog (ensureTenantModules) + question grounding. Module question generation grounds in the tenant's care-setting policy seeds matched to the module topic. (Specialisms not yet factored into training question relevance — onboarding only.)" />
            <RefRow label="Flow"              value="Settings list → Staff form dropdowns → User.job_role + specialisms → New-starter enrolment into matching primary + secondary onboarding flows → setting-specific, role-specific questions." />
          </div>
        </div>

        <div className="mt-4">
          <p className="font-semibold text-neutral-dark mb-1">Question generation controls (per onboarding flow)</p>
          <p className="text-neutral-mid mb-2">
            How the platform owner controls AI question generation per role, in the Onboarding Flows editor.
          </p>
          <div className="space-y-1">
            <RefRow label="Difficulty"      value="OnboardingFlow.difficulties (very_easy | easy | medium | hard, tickable, multiple). Fed into the prompt with descriptions (DIFFICULTY_GUIDE) so a Kitchen Porter gets very-easy awareness questions and a Nurse gets hard ones. Set in the editor; shown as a card badge. Order: Save → AI draft (draft reads the saved value)." />
            <RefRow label="Role specificity" value="The user message names the role and instructs the model to write questions specific to that role's actual duties and NEVER another role's question (e.g. no clinical question for a kitchen porter). The default 'onboarding_flow_generation' prompt carries the same rule (editable in /prompts)." />
            <RefRow label="Uniqueness"       value="Within a draft, duplicate questions are dropped (seenQuestions set). Cross-flow dedup isn't automatic (the model can't see other flows) — role + difficulty + the prompt drive distinctness." />
            <RefRow label="Keep (lock)"      value="OnboardingStep.locked. Per-question 'Keep' toggle in the editor (locks the question + its paired read step). A kept question is preserved verbatim through a re-generate." />
            <RefRow label="Re-generate"      value="POST /onboarding-templates/:id/ai-draft with body { keep: [locked steps] }. Keeps the locked steps verbatim, tells the model NOT to repeat them, generates fresh questions for the rest (skipping kept sections), and merges (kept first, then new). No keep = full re-draft. Editor 'Re-generate questions' button sends the currently-kept steps." />
          </div>
        </div>
      </RefSection>
    </div>
    </RefSearchCtx.Provider>
  )
}

// ─── QA Testing Panel ─────────────────────────────────────────────────────────

type TestStatus = 'pending' | 'pass' | 'fail' | 'needs_dev'

interface TestItem {
  id:       string
  category: string
  name:     string
  steps:    string
  expected: string
}

interface TestResult {
  status: TestStatus
  notes:  string
}

const QA_CATEGORIES = [
  'Authentication',
  'Email Channel',
  'WhatsApp Channel',
  'Web Chat',
  'Policy RAG Pipeline',
  'CQC Reports',
  'Training System',
  'Language Preferences',
  'CQC Staff Prep',
  'Monthly Audits',
  'Business Continuity',
  'Response Verbosity',
  'Settings',
  'Staff Management',
  'Analytics',
  'Knowledge Base',
  'Policies & Upload',
  'SEO & Structured Data',
  'WebMCP & AI Agents',
] as const

const QA_TESTS: TestItem[] = [
  // ── Authentication ──────────────────────────────────────────────────────────
  {
    id: 'auth-platform-login',
    category: 'Authentication',
    name: 'Platform admin login',
    steps: 'Navigate to /platform/login and enter an allowlisted admin email and the platform admin password.',
    expected: 'Access is granted and you are redirected to the platform dashboard.',
  },
  {
    id: 'auth-admin-login',
    category: 'Authentication',
    name: 'Tenant admin login',
    steps: 'Navigate to /login and sign in with an admin email and password.',
    expected: 'Redirected to /dashboard with admin-level navigation visible (Settings, Staff, Analytics etc.).',
  },
  {
    id: 'auth-staff-login',
    category: 'Authentication',
    name: 'Staff member login',
    steps: 'Navigate to /login and sign in with a staff member account (non-admin role).',
    expected: 'Redirected to the chat interface. Admin-only pages (Settings, Staff management) are not accessible.',
  },
  {
    id: 'auth-bad-password',
    category: 'Authentication',
    name: 'Incorrect password rejected',
    steps: 'Attempt to log in with an incorrect password.',
    expected: 'A clear error message is shown. No access is granted.',
  },

  // ── Email Channel ───────────────────────────────────────────────────────────
  {
    id: 'email-policy-query',
    category: 'Email Channel',
    name: 'Policy query via email',
    steps: 'Send an email to the tenant inbound address (visible in Settings) with a clear policy question, e.g. "What is our falls management procedure?"',
    expected: 'An email reply arrives containing the relevant policy content, citations with policy name, and suggested follow-up questions.',
  },
  {
    id: 'email-intent-clarification',
    category: 'Email Channel',
    name: 'Intent clarification email',
    steps: 'Send an ambiguous email with a vague subject and body, e.g. "Can you help me with the training?" (could be training or policy).',
    expected: 'A clarification reply is sent asking you to reply with Policies, Training, or CQC (or 1, 2, or 3).',
  },
  {
    id: 'email-clarification-reply',
    category: 'Email Channel',
    name: 'Replying to clarification',
    steps: 'Reply to the clarification email with just "1" or "Policies".',
    expected: 'CareStream processes the original query as a policy question and sends a substantive response in the same thread.',
  },
  {
    id: 'email-thread-continuity',
    category: 'Email Channel',
    name: 'Thread continuity',
    steps: 'Reply to a previous CareStream response email with a follow-up question that builds on the first answer.',
    expected: 'CareStream picks up the conversation thread and gives a contextually aware response referencing the prior exchange.',
  },
  {
    id: 'email-allowlist-blocked',
    category: 'Email Channel',
    name: 'Blocked sender (allowlist)',
    steps: 'Add an email allowlist in Settings. Then send an email from an address NOT on the list.',
    expected: 'The email is rejected. A rejection/guidance email is sent back to the sender. No policy response is given.',
  },

  // ── WhatsApp Channel ────────────────────────────────────────────────────────
  {
    id: 'wa-policy-query',
    category: 'WhatsApp Channel',
    name: 'Policy query via WhatsApp',
    steps: 'Send a policy question to the CareStream WhatsApp number from an allowed phone number, e.g. "What should I do if a resident falls?"',
    expected: 'A clear, WhatsApp-formatted response arrives with the relevant policy answer and source name.',
  },
  {
    id: 'wa-intent-clarification',
    category: 'WhatsApp Channel',
    name: 'Intent clarification (labels)',
    steps: 'Send an ambiguous message, e.g. "I need some help with training please".',
    expected: 'A clarification message arrives: "Reply *Policies*, *Training*, or *CQC* (or just 1, 2, or 3)".',
  },
  {
    id: 'wa-label-reply',
    category: 'WhatsApp Channel',
    name: 'Replying with a label',
    steps: 'Reply "Policies" (or "1") to the clarification message.',
    expected: 'The original query is processed as a policy question and a full response is sent.',
  },
  {
    id: 'wa-feedback-delay',
    category: 'WhatsApp Channel',
    name: 'Feedback prompt after 5 minutes',
    steps: 'Send a policy question via WhatsApp and then do NOT reply for 5+ minutes.',
    expected: 'After approximately 5 minutes, a "Was this helpful? 👍 / 👎" message is received.',
  },
  {
    id: 'wa-feedback-cancelled',
    category: 'WhatsApp Channel',
    name: 'Feedback prompt cancelled by reply',
    steps: 'Send a policy question via WhatsApp, then reply with another message within 5 minutes.',
    expected: 'The "Was this helpful?" prompt is NOT sent because the user was still active.',
  },
  {
    id: 'wa-voice-note',
    category: 'WhatsApp Channel',
    name: 'Voice note query',
    steps: 'Send a WhatsApp voice note asking a policy question.',
    expected: 'CareStream replies confirming what it heard ("I heard: ...") and then provides the policy answer.',
  },
  {
    id: 'wa-phone-allowlist',
    category: 'WhatsApp Channel',
    name: 'Blocked sender (phone allowlist)',
    steps: 'Message the CareStream WhatsApp number from a number NOT on the phone allowlist in Settings.',
    expected: 'A rejection/guidance message is sent back. No policy response is provided.',
  },

  // ── Web Chat ────────────────────────────────────────────────────────────────
  {
    id: 'chat-policy-query',
    category: 'Web Chat',
    name: 'Policy query via web chat',
    steps: 'Log in as a staff member, open the Chat page, select the Policies category, and ask a question about a policy.',
    expected: 'A formatted HTML response arrives with the relevant policy content, citation badges, and suggested follow-up questions.',
  },
  {
    id: 'chat-cqc-query',
    category: 'Web Chat',
    name: 'CQC query via web chat',
    steps: 'In the chat interface, select the CQC category and ask a CQC-related question.',
    expected: 'A response draws from uploaded CQC report data and relevant regulatory context.',
  },
  {
    id: 'chat-conversation-history',
    category: 'Web Chat',
    name: 'Multi-turn conversation',
    steps: 'Ask an initial question, then ask a follow-up in the same session that references the first answer (e.g. "What about for dementia residents specifically?").',
    expected: 'The follow-up response is contextually aware — it does not ask for clarification and builds on the prior exchange.',
  },
  {
    id: 'chat-feedback',
    category: 'Web Chat',
    name: 'Response feedback (thumbs)',
    steps: 'After receiving a chat response, click the thumbs up or thumbs down button.',
    expected: 'Feedback is saved. The button state changes to confirm. The rating should later appear in the Analytics tab.',
  },
  {
    id: 'chat-session-delete',
    category: 'Web Chat',
    name: 'Delete a chat session',
    steps: 'From the chat history sidebar, delete a previous session.',
    expected: 'Session disappears from the staff member\'s view. It is still visible to admins in the Queries tab (soft-deleted).',
  },

  // ── Policy RAG Pipeline ─────────────────────────────────────────────────────
  {
    id: 'rag-policy-match',
    category: 'Policy RAG Pipeline',
    name: 'Policy match with citation',
    steps: 'Ask a question that is directly covered by one of the uploaded policies.',
    expected: 'Response includes the specific policy name as a citation. The answer reflects the actual content of that policy.',
  },
  {
    id: 'rag-no-match',
    category: 'Policy RAG Pipeline',
    name: 'No-match handling',
    steps: 'Ask a completely off-topic question that has no match in any uploaded policy (e.g. "What is the weather in London today?").',
    expected: 'CareStream responds honestly that no matching policy was found. It does not fabricate an answer or cite a policy incorrectly.',
  },
  {
    id: 'rag-multi-policy',
    category: 'Policy RAG Pipeline',
    name: 'Cross-policy retrieval',
    steps: 'Ask a question that spans multiple policies (e.g. "What do I need to know about medication and safeguarding together?").',
    expected: 'Response draws from both relevant policies and cites each one. No critical information from either policy is omitted.',
  },
  {
    id: 'rag-language',
    category: 'Policy RAG Pipeline',
    name: 'Non-English query',
    steps: 'Send a policy question in a language other than English (e.g. Polish or Romanian).',
    expected: 'CareStream detects the language and responds in the same language. Language is recorded in the analytics.',
  },

  // ── CQC Reports ─────────────────────────────────────────────────────────────
  {
    id: 'cqc-report-generation',
    category: 'CQC Reports',
    name: 'Generate inspection evidence report',
    steps: 'In the admin panel, navigate to the CQC Report section and trigger report generation.',
    expected: 'A report is produced showing the five key questions (Safe, Effective, Caring, Responsive, Well-led) with evidence drawn from uploaded policies and CQC data.',
  },
  {
    id: 'cqc-query-match',
    category: 'CQC Reports',
    name: 'CQC regulatory query match',
    steps: 'Ask a question referencing a specific CQC regulation or key question via chat or email.',
    expected: 'The response includes content from the CQC reports database alongside any relevant internal policies.',
  },

  // ── Training System ─────────────────────────────────────────────────────────
  {
    id: 'training-assignment',
    category: 'Training System',
    name: 'Assign training to a staff member',
    steps: 'In the Training admin tab, assign a training module to a staff member.',
    expected: 'The assignment appears in the staff member\'s record. If proactive mode is set, the first training question is sent via their preferred channel.',
  },
  {
    id: 'training-answer-abcd',
    category: 'Training System',
    name: 'Answer a training question (A/B/C/D)',
    steps: 'Receive a training question via WhatsApp or email and reply with A, B, C, or D.',
    expected: 'The system processes the answer (correct or incorrect feedback) and sends the next question in the sequence.',
  },
  {
    id: 'training-completion',
    category: 'Training System',
    name: 'Training module completion',
    steps: 'Answer all questions in a training module correctly.',
    expected: 'A completion confirmation is sent to the staff member. The module is marked complete in the admin Training tab.',
  },
  {
    id: 'training-no-injection',
    category: 'Training System',
    name: 'Training NOT injected into policy chat',
    steps: 'Send a policy question via WhatsApp (not a training answer — just a normal policy query).',
    expected: 'The response contains ONLY the policy answer. No training questions are appended or sent as a follow-up. Training is a completely separate flow.',
  },
  {
    id: 'training-renewal-reminder',
    category: 'Training System',
    name: 'Renewal reminder notifications',
    steps: 'In Settings > Training renewal notifications, enable reminders. Check that a staff member with an upcoming expiry (within 90 days) is in the system.',
    expected: 'The staff member receives a renewal reminder at the configured intervals (90d / 30d / 7d). The reminder arrives on their preferred channel.',
  },

  // ── Language Preferences ────────────────────────────────────────────────────
  {
    id: 'lang-set-on-invite',
    category: 'Language Preferences',
    name: 'Set language when adding a staff member',
    steps: 'Add a new staff member via the Staff page. In the Language preferences panel, set First language to Polish and leave Second language blank. Complete the invite.',
    expected: 'Staff member is created successfully. On the Staff list, their record reflects the Polish language preference.',
  },
  {
    id: 'lang-set-second',
    category: 'Language Preferences',
    name: 'Set a second language',
    steps: 'When adding or editing a staff member, set First language to Romanian and Second language to English.',
    expected: 'Both languages are saved. The second language dropdown excludes the selected first language to prevent duplicates.',
  },
  {
    id: 'lang-edit-existing',
    category: 'Language Preferences',
    name: 'Update language on existing staff member',
    steps: 'Open the edit modal for an existing staff member. Change their First language from English to Tagalog and save.',
    expected: 'Language is updated immediately. From this point, training questions sent to this staff member will be delivered in Tagalog.',
  },
  {
    id: 'lang-training-translated',
    category: 'Language Preferences',
    name: 'Training question delivered in first language',
    steps: 'Assign a training module to a staff member whose First language is set to a non-English language (e.g. Polish). Ensure the question trigger is set to "Send automatically on assignment" in Settings.',
    expected: 'The training question arrives on the staff member\'s WhatsApp or email in Polish — both the question text and the answer options are translated. The A/B/C/D labels remain unchanged.',
  },
  {
    id: 'lang-training-next-q-translated',
    category: 'Language Preferences',
    name: 'Follow-up questions also translated',
    steps: 'With a non-English staff member in an active training module, answer the first question (reply A, B, C, or D).',
    expected: 'The feedback (correct/incorrect) and the next training question are both delivered in the staff member\'s first language.',
  },
  {
    id: 'lang-english-unchanged',
    category: 'Language Preferences',
    name: 'English staff receive unmodified questions',
    steps: 'Assign a training module to a staff member whose first language is English.',
    expected: 'Training questions are delivered in English, exactly as written. No translation API call is made.',
  },
  {
    id: 'lang-default-existing',
    category: 'Language Preferences',
    name: 'Existing staff default to English',
    steps: 'Open the edit modal for a staff member who was created before the language feature was added.',
    expected: 'First language defaults to English. No errors occur. Their training and communications are unaffected.',
  },

  // ── CQC Staff Prep ──────────────────────────────────────────────────────────
  {
    id: 'cqc-question-bank-loads',
    category: 'CQC Staff Prep',
    name: 'Question bank loads with seed questions',
    steps: 'Navigate to Admin → CQC Staff Prep. Open the Question Bank tab.',
    expected: '21 pre-loaded questions appear across the five CQC domains (Safe, Effective, Caring, Responsive, Well-led). Each domain accordion shows the correct question count.',
  },
  {
    id: 'cqc-send-to-staff',
    category: 'CQC Staff Prep',
    name: 'Send a question to a staff member',
    steps: 'Open any domain accordion. Click "Send to staff" on a question. Select one staff member and click Send.',
    expected: 'The question is delivered to the staff member\'s portal. A "Sent!" confirmation appears. The question appears in the staff member\'s CQC Prep page with status "Awaiting answer".',
  },
  {
    id: 'cqc-send-all-domain',
    category: 'CQC Staff Prep',
    name: 'Send all questions in a domain to all staff',
    steps: 'Click "Send all to staff" in the header of any domain (e.g. Safe). Confirm the action.',
    expected: 'All active questions in that domain are sent to all active staff members simultaneously. The button shows a spinner then "Sent!" briefly. The Performance tab updates to show pending indicators for those staff.',
  },
  {
    id: 'cqc-question-rephrased',
    category: 'CQC Staff Prep',
    name: 'Question is rephrased before delivery',
    steps: 'Send the same question to two different staff members on separate occasions.',
    expected: 'The rephrased_q stored on each delivery differs from the original question text. Staff see a varied wording that tests the same knowledge.',
  },
  {
    id: 'cqc-staff-answer-submit',
    category: 'CQC Staff Prep',
    name: 'Staff submits a free-text answer',
    steps: 'Log in as a staff member. Navigate to CQC Prep in the portal. Open a pending question and type an answer. Click Submit answer.',
    expected: 'The answer is submitted, the AI evaluates it, and a score (0–100) plus written feedback is shown immediately. The question moves from "To answer" to "Completed".',
  },
  {
    id: 'cqc-scoring-bands',
    category: 'CQC Staff Prep',
    name: 'Scoring reflects answer quality',
    steps: 'Submit a comprehensive, detailed answer to one question. Submit a vague one-sentence answer to another.',
    expected: 'The detailed answer scores significantly higher (80+). The vague answer scores lower. Feedback is specific and constructive in both cases.',
  },
  {
    id: 'cqc-performance-grid',
    category: 'CQC Staff Prep',
    name: 'Performance grid shows per-domain scores',
    steps: 'After one or more staff members have submitted answers, open the Performance tab in Admin → CQC Staff Prep.',
    expected: 'The staff × domain grid shows average scores as coloured badges (green 80+, amber 60–79, orange 40–59, red <40). Domains with no answers show "—". Pending unanswered deliveries show a teal "…" indicator.',
  },
  {
    id: 'cqc-ai-generate-question',
    category: 'CQC Staff Prep',
    name: 'AI generates a new question from a topic',
    steps: 'Click "Add question". Select a domain. Switch to "AI Generate". Enter a topic (e.g. "end-of-life care"). Click Generate question.',
    expected: 'An open-ended CQC inspector-style question and model answer are generated and pre-filled in the manual form. Both can be edited before saving.',
  },
  {
    id: 'cqc-prompt-editable',
    category: 'CQC Staff Prep',
    name: 'CQC prompts are editable in platform console',
    steps: 'Navigate to /platform/prompts. Find "CQC Staff Prep — Question Generation" and "CQC Staff Prep — Answer Evaluation" in the sidebar.',
    expected: 'Both prompts are visible with their full content. They can be edited and saved. Changes take effect on the next question generation or answer evaluation without an API restart.',
  },

  // ── Monthly Audits ──────────────────────────────────────────────────────────
  {
    id: 'audits-page-loads',
    category: 'Monthly Audits',
    name: 'Monthly Audits page loads with templates',
    steps: 'Navigate to Admin → Monthly Audits.',
    expected: 'The page loads without errors. The "New audit" button is visible. The "How to use Monthly Audits" help accordion is present.',
  },
  {
    id: 'audits-create-run',
    category: 'Monthly Audits',
    name: 'Create a new audit run',
    steps: 'Click "New audit". Select a template (e.g. Health & Safety – Monthly), choose a month, enter an auditor name, and click "Start audit".',
    expected: 'You are redirected to the audit form page. The correct template name is shown in the heading. Sections appear as tabs across the top.',
  },
  {
    id: 'audits-yn-question',
    category: 'Monthly Audits',
    name: 'Answer a yes/no question',
    steps: 'Open an in-progress audit with yes/no questions. Click "Yes" on one question and "No" on another.',
    expected: 'Buttons highlight correctly. For the "No" answer, outcome and actions text fields appear immediately. The progress bar updates after each answer.',
  },
  {
    id: 'audits-yn-na-question',
    category: 'Monthly Audits',
    name: 'Answer a yes/no/N/A question',
    steps: 'In an audit that contains yes/no/N/A questions (e.g. Daily Room Checklist), click the N/A button on a question.',
    expected: 'The N/A button highlights teal. The question is counted as answered in the progress bar. No outcome/actions fields appear for N/A answers.',
  },
  {
    id: 'audits-findings-question',
    category: 'Monthly Audits',
    name: 'Answer a findings-type question',
    steps: 'Open an audit with findings-type questions (e.g. Medicines Management). Type observations in the Findings field and planned steps in Actions & Timescales.',
    expected: 'Both text fields are visible without a yes/no toggle. Text is saved automatically. The question counts as answered for progress purposes regardless of whether both fields are filled.',
  },
  {
    id: 'audits-complete-flow',
    category: 'Monthly Audits',
    name: 'Complete an audit and get AI recommendations',
    steps: 'Answer all required questions in an audit. Navigate to the Summary tab. Fill in strengths, areas for improvement, and a deadline. Click "Complete & get AI recommendations".',
    expected: 'The audit status changes to Completed. An AI-generated report appears with sections: Immediate Actions Required, Priority Improvements, CQC Key Questions Analysis, Commendations, Next Audit Cycle Focus, and a Quality Rating.',
  },
  {
    id: 'audits-whatsapp-flow',
    category: 'Monthly Audits',
    name: 'Complete an audit via WhatsApp',
    steps: 'Send "audit" to the CareStream WhatsApp number. Reply with a template number. Answer each question with yes, no, n/a, or typed findings. Confirm completion when prompted.',
    expected: 'Each question is sent conversationally in sequence. Appropriate prompts appear for each question type (yes/no hint vs. findings prompt). On completion, answers are reflected in the web form.',
  },
  {
    id: 'audits-auto-save',
    category: 'Monthly Audits',
    name: 'Answers persist after navigating away',
    steps: 'Start an audit. Answer several questions. Navigate away from the audit page. Return to the audit by clicking it in the "In progress" list.',
    expected: 'All previously entered answers are still present. Progress bar reflects the saved state. No data is lost between sessions.',
  },
  {
    id: 'audits-repository',
    category: 'Monthly Audits',
    name: 'Completed audit appears in repository',
    steps: 'After completing an audit, navigate back to Monthly Audits.',
    expected: 'The audit no longer appears in "In progress". It appears in the Audit Repository table with status Completed, the correct month, and auditor name.',
  },
  {
    id: 'audits-prompt-editable',
    category: 'Monthly Audits',
    name: 'Audit recommendations prompt editable in platform console',
    steps: 'Navigate to /platform/prompts. Find "Audit Recommendations" in the prompt list.',
    expected: 'The full prompt is visible and editable. Saving a change takes effect on the next audit completion without an API restart.',
  },
  {
    id: 'audits-web-confirmation',
    category: 'Monthly Audits',
    name: 'Web: confirmation step before audit starts',
    steps: 'Click "New audit". Select a template, choose a month, optionally enter auditor name. Click "Start audit".',
    expected: 'A confirmation panel appears showing the template name, month, and auditor details with "Yes, start audit" and "Edit details" buttons. Clicking "Edit details" returns to the form. Clicking "Yes, start audit" navigates to the audit form.',
  },
  {
    id: 'audits-web-save-exit',
    category: 'Monthly Audits',
    name: 'Web: pause an in-progress audit with Save & exit',
    steps: 'Open an in-progress audit. Answer a few questions. Click the "Save & exit" button in the top-right header.',
    expected: 'You are returned to the Monthly Audits page. The audit appears in the "In progress" section with the correct template name. No answers are lost.',
  },
  {
    id: 'audits-web-resume',
    category: 'Monthly Audits',
    name: 'Web: resume a paused audit',
    steps: 'From the Monthly Audits page, click any row in the "In progress" section.',
    expected: 'The audit form opens. All previously entered answers are pre-populated. The progress bar reflects the saved state. You can continue answering from where you left off.',
  },
  {
    id: 'audits-whatsapp-confirmation',
    category: 'Monthly Audits',
    name: 'WhatsApp: confirmation step before audit starts',
    steps: 'Send "audit" to the WhatsApp number. Reply with a template number (e.g. "1").',
    expected: 'CareStream replies: "Ready to start [Template Name]? Reply yes to begin or no to cancel." Replying "no" cancels and returns a cancellation message. Replying "yes" proceeds to questions (or the shift/room prompt for applicable templates).',
  },
  {
    id: 'audits-whatsapp-shift',
    category: 'Monthly Audits',
    name: 'WhatsApp: Fire Marshall Checklist shift selection',
    steps: 'Send "audit". Select "Fire Marshall Checklist" by number. Reply "yes" to confirm.',
    expected: 'CareStream asks "Is this a day shift or night shift audit? Reply day or night." Replying "day" or "night" starts the questions and labels the run with the chosen shift. Sending an invalid reply prompts again.',
  },
  {
    id: 'audits-whatsapp-room',
    category: 'Monthly Audits',
    name: 'WhatsApp: Resident Bedrooms room number prompt',
    steps: 'Send "audit". Select "Resident Bedrooms" by number. Reply "yes" to confirm.',
    expected: 'CareStream asks "Please enter the room number for this checklist." After typing a room number (e.g. "12"), CareStream confirms the room and begins the questions.',
  },
  {
    id: 'audits-whatsapp-pause',
    category: 'Monthly Audits',
    name: 'WhatsApp: pause an audit mid-way with "stop"',
    steps: 'Start a WhatsApp audit and answer at least one question. Then send the word "stop".',
    expected: 'CareStream replies "⏸ Audit paused. Progress saved — X of N questions answered. Send audit to continue where you left off." The session is unlocked — sending a policy question receives a normal policy response (not an audit prompt).',
  },
  {
    id: 'audits-whatsapp-resume',
    category: 'Monthly Audits',
    name: 'WhatsApp: resume a paused audit',
    steps: 'After pausing an audit, send "audit" and select the same template by number. Reply "yes" to the confirmation.',
    expected: 'CareStream confirms resuming: "Resuming — X of N questions already answered." The first unanswered question is sent and the session lock is re-applied.',
  },
  {
    id: 'audits-whatsapp-shift-resume',
    category: 'Monthly Audits',
    name: 'WhatsApp: Fire Marshall Checklist resumes correct shift run',
    steps: 'Start a Fire Marshall Checklist day-shift audit, answer a few questions, then send "stop". Start again, select Fire Marshall Checklist, reply "yes", then reply "day".',
    expected: 'CareStream finds the existing in-progress day-shift run and resumes it from the correct question — it does not create a duplicate run.',
  },

  // ── Business Continuity ─────────────────────────────────────────────────────
  {
    id: 'bc-knowledge-category-dropdown',
    category: 'Business Continuity',
    name: 'Knowledge Base: category dropdown includes Business Continuity',
    steps: 'Go to Admin → Knowledge Base → Add entry. Open the Category dropdown.',
    expected: 'The dropdown contains: General, Business Continuity, Policies & Procedures, HR & Staff Handbook, Health & Safety, Medication, Infection Control.',
  },
  {
    id: 'bc-knowledge-add-entry',
    category: 'Business Continuity',
    name: 'Adding a Business Continuity entry',
    steps: 'Add an entry with Category = Business Continuity (e.g. Q: "What do I do if we have a power cut?" A: "Call the on-call manager on ..."). Save and approve it.',
    expected: 'Entry is saved as pending, then approved. It appears in the Knowledge Base list under the Business Continuity category group.',
  },
  {
    id: 'bc-chat-card-visible',
    category: 'Business Continuity',
    name: 'Business Continuity card visible in staff Chat Hub',
    steps: 'Open the staff portal chat. Look at the category selection screen.',
    expected: 'A Business Continuity card with a LifeBuoy icon is visible alongside the other category cards.',
  },
  {
    id: 'bc-chat-reads-kb',
    category: 'Business Continuity',
    name: 'Business Continuity chat reads approved entries',
    steps: 'With at least one approved Business Continuity entry added, open the portal chat → click Business Continuity → ask the question you added.',
    expected: 'The AI responds with an answer drawn from the approved Business Continuity entry. The response does not reference policies or CQC content.',
  },
  {
    id: 'bc-chat-no-entries',
    category: 'Business Continuity',
    name: 'Business Continuity chat with no entries',
    steps: 'If no Business Continuity entries exist (or all are unapproved), open the portal chat → Business Continuity → ask any question.',
    expected: 'The AI acknowledges that no business continuity information has been added yet and advises the admin to add entries via the Knowledge Base.',
  },
  {
    id: 'bc-chat-not-on-whatsapp',
    category: 'Business Continuity',
    name: 'Business Continuity not available on WhatsApp',
    steps: 'Send a message on WhatsApp asking "What is our business continuity plan?" without starting an audit.',
    expected: 'WhatsApp treats this as a general policy query (not a Business Continuity chat). The BC knowledge base entries do not appear in the response — the response comes from the general RAG pipeline.',
  },

  // ── Response Verbosity ──────────────────────────────────────────────────────
  {
    id: 'verbosity-standard-web',
    category: 'Response Verbosity',
    name: 'Standard responses via web chat',
    steps: 'In Settings > Response detail level, select Standard. Then ask a policy question via the web chat.',
    expected: 'A thorough response arrives: bullet points, full regulatory context, practical summary paragraph, and cited policy name.',
  },
  {
    id: 'verbosity-concise-web',
    category: 'Response Verbosity',
    name: 'Concise responses via web chat',
    steps: 'In Settings > Response detail level, select Concise. Ask the same policy question via web chat.',
    expected: 'A shorter response arrives — 2 to 3 key points only, no lengthy prose, under approximately 200 words.',
  },
  {
    id: 'verbosity-whatsapp-always-concise',
    category: 'Response Verbosity',
    name: 'WhatsApp always concise (ignores setting)',
    steps: 'Set response detail level to Standard in Settings. Then ask the same question via WhatsApp.',
    expected: 'The WhatsApp response is still concise, not a long formatted reply. WhatsApp ignores the tenant setting and always uses the concise format.',
  },
  {
    id: 'verbosity-toggle-saves',
    category: 'Response Verbosity',
    name: 'Response style toggle saves correctly',
    steps: 'Switch between Standard and Concise in Settings, then reload the page.',
    expected: 'The selected option persists after reload — the setting was saved to the database.',
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  {
    id: 'settings-facility-type',
    category: 'Settings',
    name: 'Facility type saves',
    steps: 'Change the facility type field in Settings (e.g. to "nursing home") and click Save.',
    expected: 'Value is saved. On reload, the updated facility type is shown. Future AI responses may reference the correct setting type.',
  },
  {
    id: 'settings-email-allowlist',
    category: 'Settings',
    name: 'Email allowlist add and remove',
    steps: 'Add a new email address to the email allowlist in Settings. Then remove it.',
    expected: 'Address appears immediately on add. Disappears immediately on remove. No page reload required.',
  },
  {
    id: 'settings-phone-allowlist',
    category: 'Settings',
    name: 'Phone allowlist add and remove',
    steps: 'Add a phone number in international format (+447...) to the WhatsApp allowlist. Then remove it.',
    expected: 'Number appears on add. Disappears on remove. Format validation rejects non-international numbers.',
  },
  {
    id: 'settings-logo-upload',
    category: 'Settings',
    name: 'Organisation logo upload',
    steps: 'Upload a PNG or JPEG logo file (under 2 MB) in Settings.',
    expected: 'Logo is displayed in the settings panel immediately. It should also appear on generated CQC reports.',
  },
  {
    id: 'settings-staff-roles',
    category: 'Settings',
    name: 'Custom staff roles',
    steps: 'Add a new custom role (e.g. "Senior Carer") in Settings > Staff role types.',
    expected: 'Role appears in the tags list. It should be available as an option when adding a new staff member.',
  },
  {
    id: 'settings-email-prefs',
    category: 'Settings',
    name: 'Email preference toggles',
    steps: 'Toggle one of the email preferences (e.g. Monthly usage report) from On to Off and back.',
    expected: 'Each toggle saves immediately. On reload, the saved state is reflected.',
  },
  {
    id: 'settings-multi-site',
    category: 'Settings',
    name: 'Multi-site: add and switch',
    steps: 'In Settings > Sites, add a new site. Then switch to it using the Switch button.',
    expected: 'New site appears in the list. Switching reloads the admin context to the new site — policies, staff, and queries shown are for the new site only.',
  },

  // ── Staff Management ────────────────────────────────────────────────────────
  {
    id: 'staff-add',
    category: 'Staff Management',
    name: 'Add a new staff member',
    steps: 'In the Staff admin tab, add a new staff member with a name, email, role, and (optionally) phone number.',
    expected: 'Staff member appears in the list. A welcome email is sent to their address. They can log in and use the chat.',
  },
  {
    id: 'staff-role-change',
    category: 'Staff Management',
    name: 'Change a staff member\'s role',
    steps: 'Select an existing staff member and change their role (e.g. from Staff to Admin).',
    expected: 'Role updates immediately. If promoted to admin, the staff member gains access to Settings, Staff, and Analytics on next login.',
  },
  {
    id: 'staff-deactivate',
    category: 'Staff Management',
    name: 'Deactivate a staff member',
    steps: 'Remove or deactivate a staff member from the Staff tab.',
    expected: 'Staff member can no longer log in. Their historical queries remain visible in the admin analytics.',
  },

  // ── Analytics ───────────────────────────────────────────────────────────────
  {
    id: 'analytics-query-count',
    category: 'Analytics',
    name: 'Query count accuracy',
    steps: 'Note the current query count in Analytics. Send 3 queries via web chat. Refresh Analytics.',
    expected: 'Query count increases by 3. The new sessions appear in the query list.',
  },
  {
    id: 'analytics-no-match',
    category: 'Analytics',
    name: 'No-match rate tracking',
    steps: 'Send a clearly off-topic query (no matching policy). Check the Analytics tab.',
    expected: 'The query appears with a "No match" badge. The no-match rate percentage updates accordingly.',
  },
  {
    id: 'analytics-language',
    category: 'Analytics',
    name: 'Language detection in analytics',
    steps: 'Send a query in a language other than English. Check the Analytics tab.',
    expected: 'The query is listed with the detected language (e.g. Polish). Language breakdown is visible in the analytics summary.',
  },
  {
    id: 'analytics-feedback',
    category: 'Analytics',
    name: 'Feedback rating visible',
    steps: 'Rate a web chat response (thumbs up or down). Check the Analytics tab for that session.',
    expected: 'Feedback rating is shown against the relevant query record.',
  },

  // ── Knowledge Base ───────────────────────────────────────────────────────────
  {
    id: 'kb-add-entry',
    category: 'Knowledge Base',
    name: 'Add a knowledge entry',
    steps: 'In the Knowledge admin tab, add a new knowledge entry with a question and answer.',
    expected: 'Entry appears in the list with a "Pending approval" status.',
  },
  {
    id: 'kb-approve-entry',
    category: 'Knowledge Base',
    name: 'Approve a knowledge entry',
    steps: 'Approve the pending knowledge entry you just added.',
    expected: 'Entry status changes to Active. The entry is now included in the vector search used by the RAG pipeline.',
  },
  {
    id: 'kb-retrieval',
    category: 'Knowledge Base',
    name: 'Knowledge entry retrieval in chat',
    steps: 'Ask a question via web chat that closely matches the approved knowledge entry.',
    expected: 'The response includes content from the knowledge entry, not just uploaded policies.',
  },

  // ── Policies & Upload ────────────────────────────────────────────────────────
  {
    id: 'policy-upload',
    category: 'Policies & Upload',
    name: 'Upload a new policy PDF',
    steps: 'In the Policies admin tab, upload a new policy PDF document.',
    expected: 'Policy appears in the list with a processing status. After ingestion completes, its status becomes Active and it is queryable.',
  },
  {
    id: 'policy-query-after-upload',
    category: 'Policies & Upload',
    name: 'Query a newly uploaded policy',
    steps: 'Once a newly uploaded policy is Active, ask a question via chat that is answered by that policy.',
    expected: 'The response cites the newly uploaded policy. Content matches what is in the document.',
  },
  {
    id: 'policy-version',
    category: 'Policies & Upload',
    name: 'Policy versioning',
    steps: 'Upload a revised version of an existing policy.',
    expected: 'Previous version is archived. New version is marked Active and used in subsequent queries.',
  },

  // ── SEO & Structured Data ────────────────────────────────────────────────────
  // Tick these off once the live site (carestreamai.com) is serving on its own domain.
  {
    id: 'seo-domain-live',
    category: 'SEO & Structured Data',
    name: 'Live domain resolves & serves',
    steps: 'Visit https://carestreamai.com (and https://www.carestreamai.com). Confirm DNS has propagated from GoDaddy and the site loads over HTTPS with a valid certificate.',
    expected: 'Both apex and www load the marketing site over HTTPS (one redirects to the other consistently). No certificate warning.',
  },
  {
    id: 'seo-org-schema',
    category: 'SEO & Structured Data',
    name: 'Organization schema (site-wide)',
    steps: "View page source on any page and search for application/ld+json. Confirm an Organization block is present (name CareStreamAI, legalName CareStreamAI Limited, logo, support ContactPoint). Or paste the URL into validator.schema.org.",
    expected: 'Organization JSON-LD is present on every page and validates with no errors. (Address / telephone / sameAs are intentionally absent until supplied.)',
  },
  {
    id: 'seo-website-nav-schema',
    category: 'SEO & Structured Data',
    name: 'WebSite + SiteNavigation schema',
    steps: 'In page source, confirm a WebSite block and a SiteNavigationElement block (listing the 10 primary nav links) are present.',
    expected: 'Both WebSite and SiteNavigationElement JSON-LD are present site-wide and validate.',
  },
  {
    id: 'seo-webapp-homepage',
    category: 'SEO & Structured Data',
    name: 'Homepage WebApplication + FAQ',
    steps: 'On the homepage, confirm a WebApplication/SoftwareApplication block (HealthApplication category, Starter £49 + Professional £129 Offers) and an FAQPage block are present.',
    expected: 'Both render. Google Rich Results Test (search.google.com/test/rich-results) detects FAQ rich result eligibility.',
  },
  {
    id: 'seo-breadcrumbs',
    category: 'SEO & Structured Data',
    name: 'Breadcrumbs on interior pages',
    steps: 'Open an interior marketing page (e.g. /pricing) and confirm a BreadcrumbList block (Home › … › Page) is present.',
    expected: 'BreadcrumbList renders on every marketing page; positions and URLs are correct. Validates in Rich Results Test.',
  },
  {
    id: 'seo-faq-page',
    category: 'SEO & Structured Data',
    name: '/faq FAQPage rich result',
    steps: 'Run /faq through Google Rich Results Test.',
    expected: 'FAQPage detected with all questions/answers; eligible for the FAQ rich result. No errors.',
  },
  {
    id: 'seo-blogposting',
    category: 'SEO & Structured Data',
    name: 'Blog article BlogPosting schema',
    steps: 'Open any /blog/[slug] article and run it through Rich Results Test. Confirm a BlogPosting block (headline, author, datePublished, publisher) — plus FAQPage if the post has FAQs.',
    expected: 'BlogPosting (and FAQPage when present) detected and valid. Article eligible for rich results.',
  },
  {
    id: 'seo-no-404s',
    category: 'SEO & Structured Data',
    name: 'No broken internal links (404s)',
    steps: 'Crawl the live site (e.g. Screaming Frog free tier, or browse the nav + footer links). Confirm no internal link returns 404.',
    expected: 'All internal links resolve (200). The previously-fixed /admin/policies link now points to /policies.',
  },
  {
    id: 'seo-meta-canonical',
    category: 'SEO & Structured Data',
    name: 'Meta titles, descriptions & canonical',
    steps: 'Spot-check key pages (home, pricing, about, a blog post). Confirm each has a unique <title>, meta description, OpenGraph tags, and a canonical URL pointing to https://carestreamai.com.',
    expected: 'Every page has a unique title + description; OG image renders in a link preview; canonical uses the .com domain.',
  },
  {
    id: 'seo-sitemap-robots',
    category: 'SEO & Structured Data',
    name: 'Sitemap & robots.txt',
    steps: 'Visit /sitemap.xml and /robots.txt on the live domain. Confirm the sitemap lists current pages with .com URLs and robots allows indexing. Submit the sitemap in Google Search Console.',
    expected: 'Sitemap loads with carestreamai.com URLs; robots.txt allows crawling; sitemap accepted in Search Console.',
  },
  {
    id: 'seo-org-data-complete',
    category: 'SEO & Structured Data',
    name: 'Organization real data added',
    steps: 'Once the postal address, telephone, and social (LinkedIn) URLs are confirmed, add them to organizationSchema() in apps/web/src/lib/schema.ts (address as PostalAddress, telephone, sameAs).',
    expected: 'Organization schema includes address, telephone and sameAs, and still validates with no errors.',
  },

  // ── WebMCP & AI Agents ───────────────────────────────────────────────────────
  // WebMCP is Chrome-Canary-only behind a flag (June 2026). Test in Canary with
  // the WebMCP/agent flag enabled; the site must stay 100% normal in all other browsers.
  {
    id: 'webmcp-no-regression',
    category: 'WebMCP & AI Agents',
    name: 'No regression in normal browsers',
    steps: 'Open the marketing site, contact form and demo form in a standard browser (Chrome stable, Safari, Firefox). Use them as a normal visitor.',
    expected: 'Everything works exactly as before. No console errors. WebMCP feature-detects to a no-op when unsupported.',
  },
  {
    id: 'webmcp-tools-register',
    category: 'WebMCP & AI Agents',
    name: 'Public tools register (Chrome Canary)',
    steps: 'In Chrome Canary with the WebMCP flag on, open a marketing page and inspect document.modelContext (or the agent tool list). Confirm carestream_overview, get_pricing and search_blog are registered.',
    expected: 'All three read-only tools appear and return correct data (overview, pricing £49/£129, blog results).',
  },
  {
    id: 'webmcp-form-tools',
    category: 'WebMCP & AI Agents',
    name: 'Form tools registered on form pages',
    steps: 'In Chrome Canary, open /contact and /demo. Confirm contact_carestream (on /contact) and book_demo (on /demo) are registered, and that invoking them with test values populates and submits the form.',
    expected: 'Form tools appear only on their page, fill the visible fields, and trigger the success state.',
  },
  {
    id: 'webmcp-unregister',
    category: 'WebMCP & AI Agents',
    name: 'Tools unregister on navigation',
    steps: 'In Chrome Canary, navigate away from /contact to another page and re-check the tool list.',
    expected: 'contact_carestream is no longer registered after leaving the page (AbortSignal cleanup works).',
  },
  {
    id: 'llmstxt-live',
    category: 'WebMCP & AI Agents',
    name: 'llms.txt served and valid',
    steps: 'Visit https://carestreamai.com/llms.txt. Confirm it returns the curated markdown (H1 CareStreamAI, blockquote summary, Product / Company / Resources / Compliance / Optional sections) with absolute .com links.',
    expected: 'llms.txt loads as text, follows the llmstxt.org format, and every link resolves (200).',
  },
  {
    id: 'webmcp-form-persistence',
    category: 'WebMCP & AI Agents',
    name: 'Contact/demo submissions reach the backend',
    steps: 'Submit the contact form and the demo form as a normal visitor. Then check the AI Agents tab → Recent leads, and confirm the sales inbox (SALES_NOTIFICATION_EMAIL) received an email.',
    expected: 'Each submission appears in marketing_leads (shown in the AI Agents tab) with source "web", and a notification email is delivered to sales. No lead is lost.',
  },
  {
    id: 'webmcp-form-error',
    category: 'WebMCP & AI Agents',
    name: 'Form shows an error if submit fails',
    steps: 'Temporarily block the API (e.g. offline) and submit the contact form.',
    expected: 'A clear inline error is shown ("Something went wrong — please try again, or email hello@…") and the form is NOT marked as sent.',
  },
  {
    id: 'webmcp-agent-source',
    category: 'WebMCP & AI Agents',
    name: 'Agent-submitted leads tagged correctly',
    steps: 'In Chrome Canary, invoke the book_demo (or contact_carestream) tool via an agent with test values.',
    expected: 'The lead is saved with source "agent" and shows an "AI agent" tag in the AI Agents tab → Recent leads.',
  },
  {
    id: 'webmcp-event-tracking',
    category: 'WebMCP & AI Agents',
    name: 'Tool invocations are tracked',
    steps: 'In Chrome Canary, invoke a few tools (get_pricing, search_blog). Open the platform console → Dashboard → AI Agents tab.',
    expected: 'Tool-call totals (all-time / 7d / 30d) increase, the per-tool breakdown lists the tools used, and recent invocations show tool, page, status and time.',
  },
  {
    id: 'webmcp-agents-tab',
    category: 'WebMCP & AI Agents',
    name: 'AI Agents dashboard tab loads',
    steps: 'Open the platform console → Dashboard → AI Agents tab.',
    expected: 'The tab loads without error and shows the stat cards, invocations-by-tool, recent invocations, and recent leads sections (empty states read cleanly when there is no data yet).',
  },
  {
    id: 'webmcp-tenant-tools-register',
    category: 'WebMCP & AI Agents',
    name: 'Tenant tools register when logged in',
    steps: 'In Chrome Canary, log in as a tenant user and open the app (/chat or an admin page). Inspect the registered tools.',
    expected: 'ask_policy_question, search_policies and list_training_modules are registered. They are NOT present on the public marketing site or when logged out.',
  },
  {
    id: 'webmcp-ask-policy',
    category: 'WebMCP & AI Agents',
    name: 'ask_policy_question answers from policies',
    steps: 'Logged in, invoke ask_policy_question with a question your policies cover (e.g. "what is our fire evacuation procedure?").',
    expected: 'Returns a grounded answer with citations, in the same way the chat does. Runs under your session — only your tenant’s policies are used (RLS/tenant isolation hold).',
  },
  {
    id: 'webmcp-tenant-isolation',
    category: 'WebMCP & AI Agents',
    name: 'Tenant tools respect isolation & role',
    steps: 'Invoke search_policies / list_training_modules as a staff user, then as an admin in a different tenant.',
    expected: 'Each only ever sees their own tenant’s data. No tool can reach another tenant’s policies or training — calls go through the authenticated API, not a privileged path.',
  },
  {
    id: 'webmcp-mutate-admin-only',
    category: 'WebMCP & AI Agents',
    name: 'Mutating tools are admin-only',
    steps: 'Log in as a non-admin staff user (Chrome Canary) and inspect the registered tools.',
    expected: 'create_knowledge_entry, start_audit and list_audit_templates are NOT registered for staff. They appear only for admins. (The API also enforces requireAdmin.)',
  },
  {
    id: 'webmcp-confirm-gate',
    category: 'WebMCP & AI Agents',
    name: 'Mutations require human confirmation',
    steps: 'As an admin, invoke create_knowledge_entry (or start_audit) via an agent. A confirmation dialog should appear. Click Cancel.',
    expected: 'Nothing is created/started; the tool returns "declined". Then repeat and click Approve — only now is the change made.',
  },
  {
    id: 'webmcp-audit-log',
    category: 'WebMCP & AI Agents',
    name: 'Confirmed mutations are audit-logged',
    steps: 'Approve a create_knowledge_entry, then open the platform console → AI Agents tab.',
    expected: 'The "Confirmed mutations" stat increments and the action appears in recent invocations with a "mutation" tag, the summary, and status "ok". A declined attempt shows status "declined".',
  },
]

const STORAGE_KEY = 'carestream_qa_results_v1'

function loadResults(): Record<string, TestResult> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveResults(results: Record<string, TestResult>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results)) } catch {}
}

function QATestingPanel() {
  const [results,     setResults]     = useState<Record<string, TestResult>>(() => loadResults())
  const [activeCategory, setActiveCategory] = useState<string>(QA_CATEGORIES[0])
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [showReport,  setShowReport]  = useState(false)

  function setStatus(id: string, status: TestStatus) {
    setResults(prev => {
      const next = { ...prev, [id]: { ...prev[id], status, notes: prev[id]?.notes ?? '' } }
      saveResults(next)
      return next
    })
  }

  function setNotes(id: string, notes: string) {
    setResults(prev => {
      const next = { ...prev, [id]: { status: prev[id]?.status ?? 'pending', notes } }
      saveResults(next)
      return next
    })
  }

  function clearAll() {
    if (!confirm('Clear all test results? This cannot be undone.')) return
    setResults({})
    saveResults({})
  }

  const categoryTests = (cat: string) => QA_TESTS.filter(t => t.category === cat)

  function countForCategory(cat: string) {
    const tests = categoryTests(cat)
    return {
      pass:       tests.filter(t => results[t.id]?.status === 'pass').length,
      fail:       tests.filter(t => results[t.id]?.status === 'fail').length,
      needs_dev:  tests.filter(t => results[t.id]?.status === 'needs_dev').length,
      pending:    tests.filter(t => !results[t.id] || results[t.id].status === 'pending').length,
      total:      tests.length,
    }
  }

  const totals = {
    pass:      QA_TESTS.filter(t => results[t.id]?.status === 'pass').length,
    fail:      QA_TESTS.filter(t => results[t.id]?.status === 'fail').length,
    needs_dev: QA_TESTS.filter(t => results[t.id]?.status === 'needs_dev').length,
    pending:   QA_TESTS.filter(t => !results[t.id] || results[t.id].status === 'pending').length,
    total:     QA_TESTS.length,
  }

  const pct = (n: number) => Math.round((n / totals.total) * 100)

  if (showReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-dark">QA Test Report</h2>
            <p className="text-xs text-neutral-mid mt-0.5">Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <button
            onClick={() => setShowReport(false)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:bg-neutral-light"
          >
            <ChevronLeft size={14} />Back to tests
          </button>
        </div>

        {/* Summary bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-neutral-dark">Overall progress — {totals.total - totals.pending} / {totals.total} tests completed</p>
          <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
            {totals.pass > 0     && <div className="h-full bg-green-500"  style={{ width: `${pct(totals.pass)}%` }} title={`Pass: ${totals.pass}`} />}
            {totals.needs_dev > 0 && <div className="h-full bg-amber-400" style={{ width: `${pct(totals.needs_dev)}%` }} title={`Needs dev: ${totals.needs_dev}`} />}
            {totals.fail > 0     && <div className="h-full bg-red-400"    style={{ width: `${pct(totals.fail)}%` }} title={`Fail: ${totals.fail}`} />}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" /><strong className="text-neutral-dark">{totals.pass}</strong> <span className="text-neutral-mid">Working</span></span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-400" /><strong className="text-neutral-dark">{totals.needs_dev}</strong> <span className="text-neutral-mid">Needs development</span></span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400" /><strong className="text-neutral-dark">{totals.fail}</strong> <span className="text-neutral-mid">Didn't work</span></span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-gray-300" /><strong className="text-neutral-dark">{totals.pending}</strong> <span className="text-neutral-mid">Not tested</span></span>
          </div>
        </div>

        {/* Per-category breakdown */}
        <div className="space-y-4">
          {QA_CATEGORIES.map(cat => {
            const tests = categoryTests(cat)
            const failing = tests.filter(t => results[t.id]?.status === 'fail' || results[t.id]?.status === 'needs_dev')
            return (
              <div key={cat} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <p className="text-sm font-semibold text-neutral-dark">{cat}</p>
                  <div className="flex gap-2 text-xs">
                    {(() => { const c = countForCategory(cat); return (<>
                      <span className="text-green-600">{c.pass} pass</span>
                      {c.needs_dev > 0 && <span className="text-amber-500">{c.needs_dev} dev</span>}
                      {c.fail > 0     && <span className="text-red-500">{c.fail} fail</span>}
                      {c.pending > 0  && <span className="text-neutral-mid">{c.pending} pending</span>}
                    </>) })()}
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {tests.map(t => {
                    const r = results[t.id]
                    const status = r?.status ?? 'pending'
                    return (
                      <div key={t.id} className="flex items-start gap-3 px-5 py-3">
                        <div className="mt-0.5 shrink-0">
                          {status === 'pass'      && <CheckCircle2 size={15} className="text-green-500" />}
                          {status === 'fail'      && <XCircle      size={15} className="text-red-400" />}
                          {status === 'needs_dev' && <RefreshCw    size={15} className="text-amber-500" />}
                          {status === 'pending'   && <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 mt-0.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-dark">{t.name}</p>
                          {r?.notes && <p className="mt-0.5 text-xs text-neutral-mid italic">"{r.notes}"</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          status === 'pass'      ? 'bg-green-50 text-green-600' :
                          status === 'fail'      ? 'bg-red-50 text-red-500' :
                          status === 'needs_dev' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {status === 'pass' ? 'Working' : status === 'fail' ? "Didn't work" : status === 'needs_dev' ? 'Needs dev' : 'Not tested'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {failing.length > 0 && (
                  <div className="border-t border-dashed border-gray-200 bg-amber-50/50 px-5 py-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Items needing attention:</p>
                    <ul className="space-y-0.5 text-xs text-amber-800">
                      {failing.map(t => <li key={t.id}>• {t.name}{results[t.id]?.notes ? ` — ${results[t.id].notes}` : ''}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-dark">CareStream QA Testing</h2>
          <p className="mt-0.5 text-xs text-neutral-mid">
            Work through each test, mark the result, and add notes. Results are saved in your browser.
            Use the Report view to see a full summary of what needs attention.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={clearAll}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-neutral-mid hover:bg-neutral-light"
          >
            Reset all
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-xs font-medium text-white hover:bg-teal-dark"
          >
            <ClipboardList size={13} />Generate report
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-neutral-dark">{totals.total - totals.pending} / {totals.total} tested</span>
          <div className="flex gap-3">
            <span className="text-green-600">{totals.pass} working</span>
            <span className="text-amber-500">{totals.needs_dev} needs dev</span>
            <span className="text-red-500">{totals.fail} failed</span>
          </div>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
          {totals.pass > 0      && <div className="h-full bg-green-500 transition-all"  style={{ width: `${pct(totals.pass)}%` }} />}
          {totals.needs_dev > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct(totals.needs_dev)}%` }} />}
          {totals.fail > 0      && <div className="h-full bg-red-400 transition-all"    style={{ width: `${pct(totals.fail)}%` }} />}
        </div>
      </div>

      {/* Layout: category sidebar + test list */}
      <div className="flex gap-4">

        {/* Category sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {QA_CATEGORIES.map(cat => {
            const c = countForCategory(cat)
            const active = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-teal text-white' : 'bg-white border border-gray-200 text-neutral-dark hover:bg-neutral-light'
                }`}
              >
                <p className={`text-xs font-medium truncate ${active ? 'text-white' : 'text-neutral-dark'}`}>{cat}</p>
                <div className={`mt-0.5 flex gap-1.5 text-[10px] ${active ? 'text-teal-light' : 'text-neutral-mid'}`}>
                  <span>{c.pass}✓</span>
                  {c.fail > 0     && <span className={active ? 'text-red-200' : 'text-red-400'}>{c.fail}✗</span>}
                  {c.needs_dev > 0 && <span className={active ? 'text-amber-200' : 'text-amber-500'}>{c.needs_dev}~</span>}
                  <span className="ml-auto">{c.total}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Test cards */}
        <div className="flex-1 space-y-3 min-w-0">
          {categoryTests(activeCategory).map(test => {
            const result  = results[test.id]
            const status  = result?.status ?? 'pending'
            const isOpen  = expandedId === test.id

            return (
              <div
                key={test.id}
                className={`rounded-xl border bg-white overflow-hidden transition-colors ${
                  status === 'pass'      ? 'border-green-200' :
                  status === 'fail'      ? 'border-red-200' :
                  status === 'needs_dev' ? 'border-amber-200' :
                  'border-gray-200'
                }`}
              >
                {/* Card header */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() => setExpandedId(isOpen ? null : test.id)}
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {status === 'pass'      && <CheckCircle2 size={18} className="text-green-500" />}
                    {status === 'fail'      && <XCircle      size={18} className="text-red-400" />}
                    {status === 'needs_dev' && <RefreshCw    size={18} className="text-amber-500" />}
                    {status === 'pending'   && <div className="h-4.5 w-4.5 rounded-full border-2 border-gray-300" style={{ height: 18, width: 18 }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-dark">{test.name}</p>
                    {!isOpen && (
                      <p className="mt-0.5 truncate text-xs text-neutral-mid">{test.steps.slice(0, 90)}{test.steps.length > 90 ? '…' : ''}</p>
                    )}
                  </div>

                  {/* Inline status buttons (always visible) */}
                  <div className="flex shrink-0 gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      title="Working"
                      onClick={() => setStatus(test.id, status === 'pass' ? 'pending' : 'pass')}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        status === 'pass'
                          ? 'bg-green-100 text-green-700'
                          : 'border border-gray-200 text-neutral-mid hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      ✓ Working
                    </button>
                    <button
                      title="Didn't work"
                      onClick={() => setStatus(test.id, status === 'fail' ? 'pending' : 'fail')}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        status === 'fail'
                          ? 'bg-red-100 text-red-600'
                          : 'border border-gray-200 text-neutral-mid hover:bg-red-50 hover:text-red-500'
                      }`}
                    >
                      ✗ Didn't work
                    </button>
                    <button
                      title="Needs development"
                      onClick={() => setStatus(test.id, status === 'needs_dev' ? 'pending' : 'needs_dev')}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        status === 'needs_dev'
                          ? 'bg-amber-100 text-amber-600'
                          : 'border border-gray-200 text-neutral-mid hover:bg-amber-50 hover:text-amber-500'
                      }`}
                    >
                      ~ Needs dev
                    </button>
                  </div>

                  <ChevronRight size={14} className={`shrink-0 text-neutral-mid transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-blue-50 px-4 py-3">
                        <p className="mb-1 text-xs font-semibold text-blue-700">How to test</p>
                        <p className="text-xs leading-relaxed text-blue-800">{test.steps}</p>
                      </div>
                      <div className="rounded-lg bg-green-50 px-4 py-3">
                        <p className="mb-1 text-xs font-semibold text-green-700">Expected result</p>
                        <p className="text-xs leading-relaxed text-green-800">{test.expected}</p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-mid">Notes (optional)</label>
                      <textarea
                        value={result?.notes ?? ''}
                        onChange={e => setNotes(test.id, e.target.value)}
                        placeholder="Describe what happened, any error messages, or what needs fixing…"
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
