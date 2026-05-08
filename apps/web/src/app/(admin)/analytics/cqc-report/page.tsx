'use client'

// §10.4 — CQC Readiness Report. Professional plan feature.
// Framed as 'inspection evidence', not 'CQC compliance' — per spec legal note.

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Printer, ClipboardCheck } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  eng: 'English',   spa: 'Spanish',    pol: 'Polish',     ron: 'Romanian',
  fra: 'French',    deu: 'German',     por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog',   yor: 'Yoruba',     ben: 'Bengali',    urd: 'Urdu',
  zho: 'Chinese',   ara: 'Arabic',     ita: 'Italian',    lit: 'Lithuanian',
  bho: 'Bhojpuri',  guj: 'Gujarati',   pan: 'Punjabi',    tam: 'Tamil',
  tel: 'Telugu',    kan: 'Kannada',    mal: 'Malayalam',  sin: 'Sinhala',
  nep: 'Nepali',    som: 'Somali',     swa: 'Swahili',    cym: 'Welsh',
}

const CATEGORY_LABELS: Record<string, string> = {
  internal_policy:     'Internal policy',
  staff_handbook:      'Staff handbook',
  external_regulation: 'External regulation',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ReportSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx('cqc-report-section mb-8', className)}>
      <h2 className="mb-3 border-b-2 border-teal pb-1 text-base font-bold text-neutral-dark">{title}</h2>
      {children}
    </section>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-light">
            {headers.map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-teal-dark">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-light/40'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-neutral-dark">{cell ?? '—'}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-4 text-center text-xs text-neutral-mid">
                No data for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CQCReportPage() {
  const { data: session } = useSession()

  // Default date range: rolling 12 months
  const todayStr       = new Date().toISOString().slice(0, 10)
  const twelveMonthAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState(twelveMonthAgo)
  const [dateTo,   setDateTo]   = useState(todayStr)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [report,   setReport]   = useState<any>(null)

  async function generate() {
    if (!session?.accessToken) return
    setError('')
    setLoading(true)
    setReport(null)
    const api = createApiClient(session.accessToken)
    try {
      const data = await api.analytics.cqcReport(dateFrom, dateTo)
      setReport(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>

      {/* ── Controls (hidden during print) ──────────────────────────────────── */}
      <div className="cqc-no-print mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-dark">CQC Inspection Evidence Report</h1>
          {report && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Printer size={15} />
              Print / Save as PDF
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-card bg-white p-4 shadow-card">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate report'}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-status-error">{error}</p>
        )}

        {!report && !loading && !error && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-gray-200 py-12 text-center">
            <ClipboardCheck size={36} className="text-neutral-mid" />
            <p className="text-sm font-medium text-neutral-dark">Select a date range and click Generate report</p>
            <p className="max-w-sm text-xs text-neutral-mid">
              The report compiles policy access evidence, staff engagement, and regulatory activity
              into a single document suitable for CQC inspection preparation.
            </p>
          </div>
        )}
      </div>

      {/* ── Report ──────────────────────────────────────────────────────────── */}
      {report && (
        <div id="cqc-print-area">

          {/* Print header (only visible on paper) */}
          <div className="mb-6 hidden border-b-4 border-teal pb-4 print:block">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">CareStreamAI</p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-dark">CQC Inspection Evidence Report</h1>
            <p className="mt-1 text-sm text-neutral-mid">{report.meta.org_name}</p>
          </div>

          {/* Report meta */}
          <div className="mb-6 rounded-card bg-teal-light p-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-medium text-neutral-dark">Organisation: </span>
                <span className="text-neutral-mid">{report.meta.org_name}</span>
              </div>
              <div>
                <span className="font-medium text-neutral-dark">Period: </span>
                <span className="text-neutral-mid">{fmt(report.meta.date_from)} – {fmt(report.meta.date_to)}</span>
              </div>
              <div>
                <span className="font-medium text-neutral-dark">Total queries: </span>
                <span className="text-neutral-mid">{report.meta.total_queries.toLocaleString('en-GB')}</span>
              </div>
              <div>
                <span className="font-medium text-neutral-dark">Staff with activity: </span>
                <span className="text-neutral-mid">{report.meta.total_staff_with_queries}</span>
              </div>
              <div>
                <span className="font-medium text-neutral-dark">Generated: </span>
                <span className="text-neutral-mid">{fmt(report.meta.generated_at)}</span>
              </div>
            </div>
          </div>

          {/* 1. Policy Access Summary */}
          <ReportSection title="1. Policy Access Summary">
            <p className="mb-3 text-xs text-neutral-mid">
              Every active policy showing staff query activity in the period. Demonstrates policies are live, maintained, and being used.
            </p>
            <Table
              headers={['Policy', 'Category', 'Version', 'Total queries', 'Unique staff', 'Last accessed']}
              rows={report.policy_access.map((p: any) => [
                p.name,
                CATEGORY_LABELS[p.document_category] ?? p.document_category,
                `v${p.version}`,
                p.total_queries,
                p.unique_staff,
                fmt(p.last_accessed),
              ])}
            />
          </ReportSection>

          {/* 2. Policies Not Accessed */}
          <ReportSection title="2. Policies Not Accessed">
            <p className="mb-3 text-xs text-neutral-mid">
              Active policies that received zero queries in the period. Review awareness and consider targeted staff communication.
            </p>
            {report.policies_not_accessed.length === 0 ? (
              <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-status-success">
                All active policies were accessed during this period.
              </p>
            ) : (
              <Table
                headers={['Policy', 'Category', 'Version', 'Days active']}
                rows={report.policies_not_accessed.map((p: any) => [
                  p.name,
                  CATEGORY_LABELS[p.document_category] ?? p.document_category,
                  `v${p.version}`,
                  `${p.days_active}d`,
                ])}
              />
            )}
          </ReportSection>

          {/* 3. Policy Version History */}
          <ReportSection title="3. Policy Version History" className="cqc-print-break">
            <p className="mb-3 text-xs text-neutral-mid">
              All policy versions showing upload date, responsible person, and staff engagement in the 30 days following each update.
            </p>
            <Table
              headers={['Policy', 'Version', 'Status', 'Uploaded', 'Uploaded by', 'Queries (30d post-upload)']}
              rows={report.version_history.map((v: any) => [
                v.name,
                `v${v.version}`,
                v.status.charAt(0).toUpperCase() + v.status.slice(1),
                fmt(v.uploaded_at),
                v.uploaded_by_name,
                v.queries_30d,
              ])}
            />
          </ReportSection>

          {/* 4. Staff Engagement Evidence */}
          <ReportSection title="4. Staff Engagement Evidence">
            <p className="mb-3 text-xs text-neutral-mid">
              Aggregate query activity by staff role. Individual identities are withheld to protect staff privacy.
            </p>
            <Table
              headers={['Role', 'Total queries', 'Unique staff members']}
              rows={report.staff_engagement.map((s: any) => [
                s.role.charAt(0).toUpperCase() + s.role.slice(1),
                s.query_count,
                s.unique_staff,
              ])}
            />
          </ReportSection>

          {/* 5. Regulatory Framework Activity */}
          <ReportSection title="5. Regulatory Framework Activity">
            <p className="mb-3 text-xs text-neutral-mid">
              Queries referencing key regulatory frameworks, demonstrating staff awareness of legal and regulatory obligations.
            </p>
            {report.regulatory_activity.length === 0 ? (
              <p className="text-sm text-neutral-mid">No regulatory framework queries detected in this period.</p>
            ) : (
              <Table
                headers={['Regulatory framework', 'Queries', 'Most recently queried']}
                rows={report.regulatory_activity.map((r: any) => [
                  r.framework,
                  r.query_count,
                  fmt(r.last_queried),
                ])}
              />
            )}
          </ReportSection>

          {/* 6. Multi-Language Access */}
          <ReportSection title="6. Multi-Language Access" className="cqc-print-break">
            <p className="mb-3 text-xs text-neutral-mid">
              Languages used by staff when querying policies, demonstrating equitable access for a multilingual workforce.
              Relevant to CQC Equality and Diversity requirements.
            </p>
            {report.multilingual_session_count > 0 && (
              <p className="mb-3 text-xs font-medium text-blue-600">
                {report.multilingual_session_count} chat session{report.multilingual_session_count !== 1 ? 's' : ''} included queries in more than one language.
              </p>
            )}
            {report.multilingual_access.length === 0 ? (
              <p className="text-sm text-neutral-mid">No language data recorded for this period.</p>
            ) : (
              <Table
                headers={['Language', 'Queries', '% of total']}
                rows={report.multilingual_access.map((m: any) => [
                  LANG_NAMES[m.language] ?? m.language,
                  m.query_count,
                  `${m.pct}%`,
                ])}
              />
            )}
          </ReportSection>

          {/* 7. Handbook Access Summary */}
          <ReportSection title="7. Staff Handbook Access Summary">
            <p className="mb-3 text-xs text-neutral-mid">
              Staff handbook query activity, showing active use of employment terms and HR procedures.
            </p>
            {report.handbook_access.length === 0 ? (
              <p className="text-sm text-neutral-mid">No staff handbook queries in this period.</p>
            ) : (
              <Table
                headers={['Handbook section', 'Total queries', 'Unique staff', 'Last accessed']}
                rows={report.handbook_access.map((h: any) => [
                  h.policy_name,
                  h.query_count,
                  h.unique_staff,
                  fmt(h.last_accessed),
                ])}
              />
            )}
          </ReportSection>

          {/* 8. Knowledge Gap Log */}
          <ReportSection title="8. Knowledge Gap Log" className="cqc-print-break">
            <p className="mb-3 text-xs text-neutral-mid">
              Queries where no policy was matched. Presented as evidence of ongoing quality improvement: the organisation
              identified gaps and can evidence the actions taken to resolve them.
            </p>
            {report.knowledge_gaps.length === 0 ? (
              <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-status-success">
                No unmatched queries in this period.
              </p>
            ) : (
              <Table
                headers={['Query', 'Channel', 'Language', 'Date']}
                rows={report.knowledge_gaps.map((g: any) => [
                  g.query_text.length > 120 ? g.query_text.slice(0, 120) + '…' : g.query_text,
                  g.channel.charAt(0).toUpperCase() + g.channel.slice(1),
                  LANG_NAMES[g.language] ?? g.language,
                  fmt(g.created_at),
                ])}
              />
            )}
          </ReportSection>

          {/* Disclaimer */}
          <div className="mt-8 rounded-md border border-gray-200 px-4 py-3 text-xs text-neutral-mid">
            <strong className="font-semibold text-neutral-dark">Important notice:</strong>{' '}
            This report provides factual audit data only. CareStreamAI makes no claims about CQC rating outcomes
            or regulatory compliance. The information contained herein is inspection evidence — the interpretation
            of that evidence and any conclusions drawn remain the responsibility of the organisation and its
            appointed advisors. Legal review of this report format is recommended before presenting to inspectors.
          </div>

        </div>
      )}
    </div>
  )
}
