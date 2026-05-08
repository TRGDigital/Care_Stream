'use client'

import { Fragment, useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import {
  createPlatformClient,
  type PlatformStats,
  type TenantSummary,
} from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import {
  BookOpen, Building2, ChevronDown, ChevronUp,
  FileText, Loader2, MessageSquare, Search, TrendingUp, Users, X,
} from 'lucide-react'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog', yor: 'Yoruba',  ben: 'Bengali',    urd: 'Urdu',
  zho: 'Chinese', ara: 'Arabic',  ita: 'Italian',    lit: 'Lithuanian',
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

type TabId = 'overview' | 'queries' | 'analytics' | 'cqc'

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

  const [tab,      setTab]      = useState<TabId>('overview')
  const [clientId, setClientId] = useState('')

  // Queries tab
  const [queries,       setQueries]   = useState<any[]>([])
  const [queriesTotal,  setQTotal]    = useState(0)
  const [queriesPage,   setQPage]     = useState(1)
  const [queriesLoading, setQL]       = useState(false)
  const [expanded,      setExpanded]  = useState<Set<string>>(new Set())
  const [refSearch,     setRefSearch] = useState('')

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

  if (!token) return null

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',  label: 'Overview'   },
    { id: 'queries',   label: 'Queries'    },
    { id: 'analytics', label: 'Analytics'  },
    { id: 'cqc',       label: 'CQC Report' },
  ]

  const OVERVIEW_CARDS = stats ? [
    { label: 'Total clients',       value: stats.tenantCount,       Icon: Building2,     accent: true  },
    { label: 'Active policies',     value: stats.activePolicyCount, Icon: FileText,      accent: false },
    { label: 'Knowledge entries',   value: stats.knowledgeCount,    Icon: BookOpen,      accent: false },
    { label: 'Queries (all time)',  value: stats.queryCount,        Icon: MessageSquare, accent: false },
    { label: 'Queries (last 7d)',   value: stats.queriesLast7Days,  Icon: TrendingUp,    accent: false },
    { label: 'Regulations (live)',  value: stats.regulationCount,   Icon: BookOpen,      accent: false },
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
                  {OVERVIEW_CARDS.map(({ label, value, Icon, accent }) => (
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
                    </div>
                  ))}
                </div>

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
                          <th className="px-4 py-3 text-right">Policies</th>
                          <th className="px-4 py-3 text-right">Knowledge</th>
                          <th className="px-4 py-3 text-right">Queries (30d)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tenants.map(t => (
                          <tr key={t.id} className="hover:bg-neutral-light/50">
                            <td className="px-4 py-3">
                              <Link href={`/platform/clients/${t.id}`} className="font-medium text-teal hover:underline">
                                {t.name}
                              </Link>
                              <p className="text-xs text-neutral-mid">{t.slug}</p>
                            </td>
                            <td className="px-4 py-3 text-neutral-mid">{t.plan?.name ?? '—'}</td>
                            <td className="px-4 py-3"><StatusBadge status={t.subscription_status} /></td>
                            <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.policyCount}</td>
                            <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.knowledgeCount}</td>
                            <td className="px-4 py-3 text-right text-neutral-dark">{t.stats.queriesThisMonth}</td>
                          </tr>
                        ))}
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
                    {(() => {
                      const filtered = refSearch
                        ? queries.filter(q => sessionRef(q.session_key).includes(refSearch))
                        : queries
                      return (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                          <tr>
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
                              <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-mid">
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
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    q.any_no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                                  }`}>
                                    {q.any_no_match ? 'No match' : 'Matched'}
                                  </span>
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
                                  <td colSpan={7} className="px-6 py-4">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                                      {[
                                        { label: 'Staff',           value: q.user ? `${q.user.name} (${q.user.email})` : '—' },
                                        { label: 'Channel',         value: q.channel ?? '—' },
                                        { label: 'Messages',        value: q.message_count },
                                        { label: 'Response time',   value: q.total_response_time_ms ? fmtMs(q.total_response_time_ms) : '—' },
                                        { label: 'Area',            value: q.document_category_queried ? (CATEGORY_LABELS[q.document_category_queried] ?? q.document_category_queried) : '—' },
                                        { label: 'Language',        value: LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—' },
                                        { label: 'Session started', value: q.started_at ? fmt(q.started_at) : '—' },
                                        { label: 'Last active',     value: q.last_message_at ? fmt(q.last_message_at) : '—' },
                                      ].map(({ label, value }) => (
                                        <div key={label}>
                                          <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">{label}</p>
                                          <p className="mt-0.5 text-neutral-dark">{value}</p>
                                        </div>
                                      ))}
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
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                        <h3 className="mb-3 text-sm font-semibold text-neutral-dark">Multi-language access</h3>
                        <div className="flex flex-wrap gap-2">
                          {cqc.multilingual_access.map((l: any) => (
                            <span key={l.language} className="rounded-full bg-teal-light px-3 py-1 text-xs text-teal">
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

          </>
        )}
      </div>
    </PlatformShell>
  )
}
