'use client'

// §10.4 — CQC Readiness Report. Professional plan feature.
// Framed as 'inspection evidence', not 'CQC compliance' — per spec legal note.

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { UpgradePanel } from '@/components/admin/upgrade-gate'
import { Printer, FileDown, ClipboardCheck } from 'lucide-react'
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

function Table({ headers, rows, highlightCols = [] }: { headers: string[]; rows: (string | number | null)[][]; highlightCols?: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-light">
            {headers.map((h, i) => (
              <th key={h} className={clsx(
                'px-3 py-2 text-xs font-semibold',
                highlightCols.includes(i) ? 'text-center text-teal-dark bg-teal/10' : 'text-left text-teal-dark',
              )}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-light/40'}>
              {row.map((cell, j) => (
                <td key={j} className={clsx(
                  'px-3 py-1.5',
                  highlightCols.includes(j)
                    ? 'text-center font-bold text-teal text-base'
                    : 'text-neutral-dark',
                )}>{cell ?? '—'}</td>
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
  const { features } = usePlanFeatures()

  // Default date range: rolling 12 months
  const todayStr       = new Date().toISOString().slice(0, 10)
  const twelveMonthAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)

  const [dateFrom,      setDateFrom]      = useState(twelveMonthAgo)
  const [dateTo,        setDateTo]        = useState(todayStr)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [report,        setReport]        = useState<any>(null)

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

  // Native print-to-PDF (like the staff record). This handles the tenant logo,
  // a tall multi-section report and all page styling reliably — html2canvas would
  // taint on the cross-origin logo and blank out large reports.
  function downloadPdf() {
    if (!report) return
    const org = (report.meta?.org_name ?? 'organisation').replace(/\s+/g, '-')
    const prevTitle = document.title
    document.title = `CQC-Inspection-Evidence-${org}-${String(report.meta?.date_to ?? '').slice(0, 10)}`
    document.body.classList.add('printing-cqc')
    const cleanup = () => {
      document.body.classList.remove('printing-cqc')
      document.title = prevTitle
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  // CQC Readiness Report is a Professional+ feature.
  if (features && !features.has_cqc_report) {
    return (
      <UpgradePanel
        title="CQC Inspection Evidence Report"
        description="Generate a structured, inspection-ready evidence report from your staff's AI interactions and training activity. Available on the Professional and Enterprise plans."
        tier="Professional"
      />
    )
  }

  return (
    <div>

      {/* ── Controls (hidden during print) ──────────────────────────────────── */}
      <div className="cqc-no-print mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-dark">CQC Inspection Evidence Report</h1>
          {report && (
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPdf}
                title="Opens your print dialog — choose “Save as PDF” as the destination"
                className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
              >
                <FileDown size={15} />
                Download PDF
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-md border border-teal px-4 py-2 text-sm font-medium text-teal hover:bg-teal-light"
              >
                <Printer size={15} />
                Print
              </button>
            </div>
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

          {/* Report header — logos + title, shown on screen, PDF, and print */}
          <div className="mb-6 border-b-4 border-teal pb-5">
            <div className="mb-4 flex items-center justify-between">
              {/* Organisation logo (left) */}
              <div className="flex h-14 w-44 items-center">
                {report.meta.org_logo_url ? (
                  <img
                    src={report.meta.org_logo_url}
                    alt={report.meta.org_name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-semibold text-neutral-dark">{report.meta.org_name}</span>
                )}
              </div>
              {/* CareStreamAI branding (right) */}
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal">Powered by</p>
                <p className="text-lg font-bold text-teal">CareStreamAI</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-neutral-dark">CQC Inspection Evidence Report</h1>
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
              highlightCols={[3, 4]}
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

          {/* 9. Staff Training Compliance */}
          {report.training_compliance && (
            <ReportSection title="9. Staff Training Compliance" className="cqc-print-break">
              <p className="mb-3 text-xs text-neutral-mid">
                Training compliance evidence across all active staff. CQC expects staff to have current training records and for organisations to demonstrate active management of renewal. This section provides evidence for the Well-Led and Safe key questions.
              </p>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Statutory compliance rate',
                    value: `${report.training_compliance.compliance_rate}%`,
                    sub:   `${report.training_compliance.compliant_staff} of ${report.training_compliance.total_staff} staff fully current on all statutory modules`,
                  },
                  {
                    label: 'MCQ answers submitted',
                    value: report.training_compliance.total_answers.toLocaleString('en-GB'),
                    sub:   'Training questions answered by staff via the Chat Hub, email, or voice',
                  },
                  {
                    label: 'Correct answer rate',
                    value: report.training_compliance.total_answers > 0 ? `${report.training_compliance.correct_answer_rate}%` : '—',
                    sub:   'Demonstrates active knowledge retention, not just completion',
                  },
                  {
                    label: 'Expired / expiring',
                    value: `${report.training_compliance.expired_count} expired, ${report.training_compliance.expiring_soon_count} due within 90 days`,
                    sub:   'Automatic renewal reminders sent at 90, 30, and 7 days',
                  },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-md border border-gray-100 bg-neutral-light/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
                    <p className="mt-1 text-base font-bold text-neutral-dark">{value}</p>
                    <p className="mt-0.5 text-[10px] text-neutral-mid">{sub}</p>
                  </div>
                ))}
              </div>

              {report.training_compliance.module_breakdown.length > 0 && (
                <Table
                  headers={['Training module', 'Type', 'Enrolled', 'Complete', 'In progress', 'Expired', 'Completion rate']}
                  highlightCols={[6]}
                  rows={report.training_compliance.module_breakdown.map((m: any) => [
                    m.name,
                    m.category === 'statutory' ? 'Statutory (annual)' : 'Specialist',
                    m.enrolled,
                    m.completed,
                    m.in_progress,
                    m.expired,
                    `${m.completion_rate}%`,
                  ])}
                />
              )}

              {report.training_compliance.knowledge_gaps?.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Training knowledge gaps</p>
                  <p className="mb-3 text-xs text-neutral-mid">
                    Questions where 40% or more of respondents answered incorrectly (minimum 2 responses). These represent specific knowledge areas that may benefit from targeted refresher training or updated instructional materials.
                  </p>
                  <Table
                    headers={['Question', 'Module', 'Responses', 'Incorrect', 'Error rate']}
                    highlightCols={[4]}
                    rows={report.training_compliance.knowledge_gaps.map((g: any) => [
                      g.question_text,
                      g.module_name,
                      g.total,
                      g.incorrect,
                      `${g.incorrect_rate}%`,
                    ])}
                  />
                </div>
              )}
            </ReportSection>
          )}

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
