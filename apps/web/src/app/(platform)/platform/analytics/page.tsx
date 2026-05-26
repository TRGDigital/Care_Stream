'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type OutputRecord, type FeedbackStat } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { ChevronDown, ChevronUp, ClipboardCheck, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPT_USAGES = [
  { value: 'all',                       label: 'All prompts'             },
  { value: 'policy_summary',            label: 'Policies & Procedures'   },
  { value: 'policy_full',               label: 'Full Policy'             },
  { value: 'staff_handbook',            label: 'Staff Handbook'          },
  { value: 'training_chat',             label: 'Training Chat'           },
  { value: 'cqc_query',                 label: 'CQC Compliance'          },
  { value: 'training_question_generation', label: 'Question Generation'  },
  { value: 'knowledge_extraction',      label: 'Knowledge Extraction'    },
]

const CATEGORY_LABEL: Record<string, string> = {
  policy:           'Policies & Procedures',
  internal_policy:  'Policies & Procedures',
  staff_handbook:   'Staff Handbook',
  training_module:  'Training Chat',
  cqc_report:       'CQC Compliance',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const token = usePlatformAuth()
  if (!token) return null
  return (
    <PlatformShell>
      <AnalyticsContent token={token} />
    </PlatformShell>
  )
}

const DOMAIN_LABELS: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring',
  responsive: 'Responsive', well_led: 'Well-led',
}

function AnalyticsContent({ token }: { token: string }) {
  const [stats,        setStats]        = useState<FeedbackStat[]>([])
  const [outputs,      setOutputs]      = useState<OutputRecord[]>([])
  const [cqcStats,     setCqcStats]     = useState<any>(null)
  const [auditStats,   setAuditStats]   = useState<any>(null)
  const [auditError,   setAuditError]   = useState<string | null>(null)
  const [usage,        setUsage]        = useState('all')
  const [filter,       setFilter]       = useState<'all' | 'positive' | 'negative' | 'no_match'>('all')
  const [loadingS,     setLoadingS]     = useState(true)
  const [loadingO,     setLoadingO]     = useState(true)
  const [loadingCqc,   setLoadingCqc]   = useState(true)
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)

  const client = createPlatformClient(token)

  useEffect(() => {
    setLoadingS(true)
    client.prompts.feedbackStats()
      .then(d => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoadingS(false))

    setLoadingCqc(true)
    client.cqcPrepSummary()
      .then(d => setCqcStats(d))
      .catch(() => {})
      .finally(() => setLoadingCqc(false))

    setLoadingAudit(true)
    setAuditError(null)
    client.auditSummary()
      .then(d => setAuditStats(d))
      .catch(e => setAuditError(e.message ?? 'Failed to load audit data'))
      .finally(() => setLoadingAudit(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadingO(true)
    setExpandedId(null)

    const load = usage === 'all'
      ? Promise.all(
          ['policy_summary', 'training_chat', 'cqc_query'].map(u =>
            client.prompts.promptOutputs(u, 20)
              .then(r => r.outputs)
              .catch(() => [] as OutputRecord[]),
          ),
        ).then(results =>
          results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        )
      : client.prompts.promptOutputs(usage, 50).then(r => r.outputs)

    load
      .then(rows => setOutputs(rows))
      .catch(() => setOutputs([]))
      .finally(() => setLoadingO(false))
  }, [token, usage]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalRated   = stats.reduce((s, r) => s + Number(r.positive) + Number(r.negative), 0)
  const totalPos     = stats.reduce((s, r) => s + Number(r.positive), 0)
  const overallPct   = totalRated > 0 ? Math.round((totalPos / totalRated) * 100) : null

  const filtered = outputs.filter(o => {
    if (filter === 'positive')  return o.feedback === 'positive'
    if (filter === 'negative')  return o.feedback === 'negative'
    if (filter === 'no_match')  return o.no_match
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-dark">AI Analytics</h1>
        <p className="mt-1 text-sm text-neutral-mid">
          Analyse AI response quality and staff feedback across all prompt types.
        </p>
      </div>

      {/* ── Feedback quality cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Overall card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Overall</p>
          {loadingS ? (
            <Loader2 size={16} className="mt-2 animate-spin text-neutral-mid" />
          ) : overallPct !== null ? (
            <>
              <p className={`mt-1 text-2xl font-bold ${overallPct >= 70 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {overallPct}%
              </p>
              <p className="text-xs text-neutral-mid">{totalRated} rated</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-neutral-mid">No ratings yet</p>
          )}
        </div>

        {/* Per-category cards */}
        {stats.map(s => {
          const rated = Number(s.positive) + Number(s.negative)
          const pct   = s.positive_pct !== null ? Number(s.positive_pct) : null
          return (
            <div key={s.category} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-mid">
                {CATEGORY_LABEL[s.category] ?? s.category}
              </p>
              {pct !== null ? (
                <>
                  <p className={`mt-1 text-2xl font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {pct}%
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-neutral-mid">
                    <span className="flex items-center gap-0.5 text-green-600"><ThumbsUp size={10} /> {s.positive}</span>
                    <span className="flex items-center gap-0.5 text-red-500"><ThumbsDown size={10} /> {s.negative}</span>
                    <span>{rated} rated</span>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-sm text-neutral-mid">No ratings yet</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Output browser ── */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3">
          <h2 className="mr-auto text-sm font-semibold text-neutral-dark">Response outputs</h2>

          {/* Prompt filter */}
          <select
            value={usage}
            onChange={e => setUsage(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-neutral-dark focus:border-teal focus:outline-none"
          >
            {PROMPT_USAGES.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>

          {/* Feedback filter */}
          <div className="flex rounded-lg border border-gray-200 text-xs">
            {(['all', 'positive', 'negative', 'no_match'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  filter === f
                    ? 'bg-teal text-white'
                    : 'text-neutral-mid hover:bg-neutral-light'
                }`}
              >
                {f === 'all' ? 'All' : f === 'positive' ? '👍 Helpful' : f === 'negative' ? '👎 Not helpful' : 'No match'}
              </button>
            ))}
          </div>
        </div>

        {loadingO ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-neutral-mid" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-mid">No outputs match the current filter.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(row => {
              const isExpanded = expandedId === row.id
              return (
                <div key={row.id} className="px-5 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-dark">{row.query_text}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {row.no_match && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">No match</span>
                        )}
                        {row.feedback === 'positive' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600"><ThumbsUp size={11} /> Helpful</span>
                        )}
                        {row.feedback === 'negative' && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500"><ThumbsDown size={11} /> Could be better</span>
                        )}
                        {row.feedback === null && (
                          <span className="text-xs text-gray-400">Not rated</span>
                        )}
                        <span className="text-xs text-neutral-mid">{row.response_time_ms}ms</span>
                        <span className="text-xs text-neutral-mid">
                          {new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {row.user_name && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-neutral-mid">{row.user_name}</span>
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={14} className="mt-0.5 shrink-0 text-neutral-mid" />
                      : <ChevronDown size={14} className="mt-0.5 shrink-0 text-neutral-mid" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Staff question</p>
                        <p className="text-sm text-neutral-dark">{row.query_text}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">AI response</p>
                        <div
                          className="prose prose-sm max-w-none text-neutral-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                          dangerouslySetInnerHTML={{ __html: row.response_text }}
                        />
                      </div>
                      <div className="flex items-center gap-3 border-t border-gray-200 pt-3">
                        <span className="text-xs text-neutral-mid">Response time: {row.response_time_ms}ms</span>
                        {row.language_detected && row.language_detected !== 'eng' && (
                          <span className="text-xs text-neutral-mid">Language: {row.language_detected}</span>
                        )}
                        <span className="text-xs text-neutral-mid">
                          {new Date(row.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* ── Monthly Audits ── */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-neutral-dark">Monthly Audits — cross-tenant summary</h2>

        {loadingAudit ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-10">
            <Loader2 size={20} className="animate-spin text-neutral-mid" />
          </div>
        ) : auditError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{auditError}</div>
        ) : auditStats ? (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total runs',     value: auditStats.summary.total },
                { label: 'Completed',      value: auditStats.summary.completed },
                { label: 'In progress',    value: auditStats.summary.in_progress },
                { label: 'Tenants active', value: auditStats.summary.tenants_active },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-dark">{value}</p>
                </div>
              ))}
            </div>

            {/* By frequency */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
                <ClipboardCheck size={14} className="text-teal" />
                <h3 className="text-sm font-semibold text-neutral-dark">Completed audits by frequency</h3>
              </div>
              <div className="grid grid-cols-5 divide-x divide-gray-100">
                {auditStats.by_frequency.map((f: any) => {
                  const label = f.frequency.charAt(0).toUpperCase() + f.frequency.slice(1)
                  const lastDate = f.last_completed
                    ? new Date(f.last_completed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null
                  return (
                    <div key={f.frequency} className="p-4 text-center">
                      <p className="text-xs font-medium text-neutral-mid">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${f.completed > 0 ? 'text-neutral-dark' : 'text-gray-300'}`}>
                        {f.completed}
                      </p>
                      {f.in_progress > 0 && (
                        <p className="mt-0.5 text-xs font-medium text-amber-600">{f.in_progress} in progress</p>
                      )}
                      {lastDate ? (
                        <p className="mt-1 text-xs text-neutral-mid/70">Last: {lastDate}</p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-300">No runs yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By tenant */}
            {auditStats.by_tenant.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-3">
                  <h3 className="text-sm font-semibold text-neutral-dark">Usage by tenant</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-2.5 text-xs font-medium text-neutral-mid">Organisation</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Completed</th>
                      <th className="py-2.5 pr-5 text-right text-xs font-medium text-neutral-mid">In progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditStats.by_tenant.map((t: any) => (
                      <tr key={t.tenant_id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2.5 font-medium text-neutral-dark">{t.tenant_name}</td>
                        <td className="py-2.5 pr-5 text-center font-semibold text-teal">{t.completed}</td>
                        <td className="py-2.5 pr-5 text-right text-neutral-mid">{t.in_progress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── CQC Staff Prep ── */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-neutral-dark">CQC Staff Prep — cross-tenant summary</h2>

        {loadingCqc ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-10">
            <Loader2 size={20} className="animate-spin text-neutral-mid" />
          </div>
        ) : !cqcStats ? (
          <p className="text-sm text-neutral-mid">No CQC prep data available yet.</p>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Questions sent',  value: cqcStats.summary.total_sent },
                { label: 'Answered',        value: cqcStats.summary.total_answered },
                { label: 'Avg score',       value: cqcStats.summary.avg_score !== null ? `${cqcStats.summary.avg_score}/100` : '—' },
                { label: 'Scoring 80+',     value: cqcStats.summary.pct_80_plus !== null ? `${cqcStats.summary.pct_80_plus}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-dark">{value}</p>
                </div>
              ))}
            </div>

            {/* By domain */}
            {cqcStats.by_domain.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-3">
                  <h3 className="text-sm font-semibold text-neutral-dark">Performance by domain (all tenants)</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-2.5 text-xs font-medium text-neutral-mid">Domain</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Sent</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Answered</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                      <th className="py-2.5 pr-5 text-right text-xs font-medium text-neutral-mid">80+%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cqcStats.by_domain.map((d: any) => (
                      <tr key={d.domain} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2.5 font-medium text-neutral-dark">{DOMAIN_LABELS[d.domain] ?? d.domain}</td>
                        <td className="py-2.5 pr-5 text-center text-neutral-mid">{d.total_sent}</td>
                        <td className="py-2.5 pr-5 text-center text-neutral-mid">{d.total_answered}</td>
                        <td className="py-2.5 pr-5 text-center font-semibold text-teal">{d.avg_score ?? '—'}</td>
                        <td className="py-2.5 pr-5 text-right text-neutral-mid">{d.pct_80_plus !== null ? `${d.pct_80_plus}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* By tenant */}
            {cqcStats.by_tenant.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-3">
                  <h3 className="text-sm font-semibold text-neutral-dark">Usage by tenant</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-2.5 text-xs font-medium text-neutral-mid">Organisation</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Sent</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Answered</th>
                      <th className="py-2.5 pr-5 text-center text-xs font-medium text-neutral-mid">Avg score</th>
                      <th className="py-2.5 pr-5 text-right text-xs font-medium text-neutral-mid">80+%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cqcStats.by_tenant.map((t: any) => (
                      <tr key={t.tenant_id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2.5 font-medium text-neutral-dark">{t.tenant_name}</td>
                        <td className="py-2.5 pr-5 text-center text-neutral-mid">{t.total_sent}</td>
                        <td className="py-2.5 pr-5 text-center text-neutral-mid">{t.total_answered}</td>
                        <td className="py-2.5 pr-5 text-center font-semibold text-teal">{t.avg_score ?? '—'}</td>
                        <td className="py-2.5 pr-5 text-right text-neutral-mid">{t.pct_80_plus !== null ? `${t.pct_80_plus}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
