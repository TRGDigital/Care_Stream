import Link from 'next/link'
import {
  CheckCircle2, MessageSquare, BarChart2,
  ShieldCheck, Users, Brain, Zap, Bell, AlertTriangle, FileText,
  ClipboardCheck, TrendingUp, Calendar,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title:       'Monthly Care Audits | CareStreamAI',
  description: 'Replace time-consuming manual audit processes with structured, guided monthly audits. CareStreamAI generates audit templates, guides completion through chat, and produces formatted reports with action items and CQC evidence.',
  openGraph: {
    title: 'Monthly Care Audits | CareStreamAI',
    description: 'Guided monthly audits with AI-generated templates, chat-based completion, and CQC evidence reports.',
    url: 'https://carestreamai.co.uk/care-audits',
  },
}

// ── Audit Results Card ────────────────────────────────────────────────────────

function AuditResultsMockup() {
  const sections = [
    { name: 'Medication Management',  score: 91, pass: true  },
    { name: 'Infection Control',      score: 88, pass: true  },
    { name: 'Care Planning',          score: 76, pass: true  },
    { name: 'Safeguarding',           score: 94, pass: true  },
    { name: 'Environmental Safety',   score: 68, pass: false },
    { name: 'Staffing and Records',   score: 82, pass: true  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Monthly Care Audit</p>
            <p className="text-sm font-bold text-white">May 2026</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">83%</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">overall</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Passed',   value: '5', color: 'text-green-600' },
          { label: 'Action',   value: '1', color: 'text-amber-500' },
          { label: 'Critical', value: '0', color: 'text-red-500'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Section scores</p>
        <div className="space-y-2.5">
          {sections.map(({ name, score, pass }) => (
            <div key={name} className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-neutral-dark">{name}</p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${pass ? 'bg-green-500' : 'bg-amber-400'}`} />
                <p className={`text-[10px] font-bold ${pass ? 'text-green-600' : 'text-amber-500'}`}>{score}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">1 action required: Environmental Safety review by 28 May.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CareAuditsPage() {
  return (
    <>
      {/* ── Split hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel light>Monthly Care Audits</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Structured monthly audits that take minutes to complete and produce reports you can actually use.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Monthly care audits are a CQC requirement, but the process of completing them manually
                is time-consuming, inconsistently formatted, and rarely produces findings that lead to
                clear action. CareStreamAI guides staff through structured audits via chat, generates
                formatted reports automatically, and tracks action items to closure.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <AuditResultsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Problem With Manual Audits</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Most care home audits take too long, mean too little, and change too little.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  A care manager filling in a paper audit form or a spreadsheet can spend two to
                  three hours on a single monthly audit. The questions vary between months depending
                  on who does it. The resulting report is filed, a few actions are noted, and the
                  cycle repeats next month with the same weaknesses.
                </p>
                <p>
                  CQC inspectors expect to see evidence that internal audits are driving genuine
                  improvement. An audit log with no action closure, no trend analysis, and no
                  connection between findings and service changes is a weak submission.
                  CareStreamAI produces audits that close that gap.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📝',
                  label: 'Traditional monthly audit',
                  text: 'A manager spends two hours on a spreadsheet. The format changes each month. Actions are noted but not tracked. The audit exists on paper but rarely drives change.',
                  dim: true,
                },
                {
                  icon: '✅',
                  label: 'CareStreamAI audit',
                  text: 'A structured audit is completed via guided chat in under 30 minutes. A formatted report with section scores and action items is generated automatically. Actions are tracked to closure and trends are visible month on month.',
                  dim: false,
                },
              ].map(({ icon, label, text, dim }) => (
                <div
                  key={label}
                  className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>{label}</p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How CareStreamAI Audits Work</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Select, complete, and receive your report. No formatting, no spreadsheets.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Pre-built audit templates cover the domains CQC inspects. The completion process is
            guided through a structured conversation. The report is generated automatically when
            the audit is complete.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: ClipboardCheck,
                title: 'Select the audit type and assign it',
                body: 'CareStreamAI includes pre-built audit templates for medication management, infection control, care planning, safeguarding, environmental safety, and staffing. Managers select the audit type, assign it to a member of staff or complete it themselves, and the system handles the rest.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Guided completion via chat',
                body: 'The audit is completed through a structured question-and-answer conversation via the CareStreamAI chat portal. Each question is clear and consistent. Responses are captured in structured format. There is no blank form to fill in and no interpretation required.',
              },
              {
                step: '03',
                Icon: FileText,
                title: 'Formatted report generated automatically',
                body: 'When the audit is complete, CareStreamAI generates a formatted report showing overall score, section scores, findings, and action items with assigned owners and due dates. The report is ready to present to CQC or share with the management team immediately.',
              },
            ].map(({ step, Icon, title, body }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── See it in action ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            A monthly audit completed in a structured conversation.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Every question is consistent. Every answer is captured in a structured format.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                The guided audit conversation walks the auditor through every required question
                in the correct order. Responses are captured as structured data, not free text,
                so every audit is formatted identically regardless of who completes it.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                The conversation can be completed on any device, at any time. A manager completing
                a medication audit at the end of a shift takes the same structured path as one
                completing it at the start of the day.
              </p>
              <div className="space-y-3">
                {[
                  { domain: 'Medication',     q: 'Are all controlled drugs stored in a locked cabinet with access restricted to authorised staff only?' },
                  { domain: 'Infection',      q: 'Is there documented evidence that PPE stocks are checked and replenished at least weekly?' },
                  { domain: 'Care planning',  q: 'Have all care plans been reviewed within the last 28 days and signed off by a senior member of staff?' },
                ].map(({ domain, q }) => (
                  <div key={domain} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{domain}</span>
                    <p className="text-sm font-medium leading-snug text-neutral-dark">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guided audit chat mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CareStreamAI</p>
                    <p className="text-[11px] text-white/70">Medication Audit</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">Q4 / 12</span>
                </div>
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[11px] font-semibold text-teal">Medication Management Audit</p>
                      <p className="mb-2 text-[10px] text-gray-400">Question 4 of 12</p>
                      <p className="mb-2.5 text-xs font-medium leading-snug text-gray-800">
                        Is there a current MAR chart for every resident receiving prescribed medication, with no unexplained gaps in the last 14 days?
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 rounded-lg border border-green-200 bg-green-50 py-1.5 text-[11px] font-semibold text-green-700">Yes</button>
                        <button className="flex-1 rounded-lg border border-red-200 bg-red-50 py-1.5 text-[11px] font-semibold text-red-600">No</button>
                        <button className="flex-1 rounded-lg border border-gray-200 bg-white py-1.5 text-[11px] font-semibold text-gray-500">Partial</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-green-600 px-4 py-2 text-xs font-bold text-white">Yes</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-gray-800">✅ <span className="font-semibold">Recorded.</span> Proceeding to question 5.</p>
                      <p className="mt-1.5 text-[11px] font-medium leading-snug text-gray-700">Are all medication administration errors from the last 30 days documented and reviewed by a senior member of staff?</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-1.5 w-1/3 rounded-full bg-teal" />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-mid">4 of 12 questions complete</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Completed audit report ───────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Finished Report</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            A formatted report with every response, every score, and every action item. Generated instantly.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            The moment the last question is answered, the report is ready. No formatting, no copying
            responses into a template. The completed audit is stored in CareStreamAI and can be
            downloaded, shared with the management team, or presented directly to a CQC inspector.
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            {/* Report header */}
            <div className="border-b border-gray-100 bg-white px-8 py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">Completed</span>
                    <span className="text-[11px] text-neutral-mid">22 May 2026 at 09:14</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-dark">Medication Management Audit</h3>
                  <p className="mt-0.5 text-sm text-neutral-mid">Completed by Sarah Mitchell, Deputy Manager</p>
                </div>
                <div className="flex gap-4 sm:text-right">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 text-center">
                    <p className="text-2xl font-extrabold text-teal">91%</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Overall score</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">1</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Action required</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Responses table */}
            <div className="divide-y divide-gray-50">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_80px_1fr] gap-4 bg-gray-50 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">
                <span>Question</span>
                <span className="text-center">Response</span>
                <span>Notes</span>
              </div>
              {[
                {
                  q: 'Are all controlled drugs stored in a locked cabinet with access restricted to authorised staff only?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there a current MAR chart for every resident receiving prescribed medication, with no unexplained gaps in the last 14 days?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Have all medication administration errors from the last 30 days been documented and reviewed by a senior member of staff?',
                  r: 'Yes',
                  note: 'One near-miss logged on 14 May. Reviewed and signed off by RGN.',
                },
                {
                  q: 'Is there documented evidence that staff administering medication hold a current, in-date medication competency sign-off?',
                  r: 'Partial',
                  note: 'Two staff members due for renewal in June. Renewals scheduled.',
                  action: true,
                },
                {
                  q: 'Are PRN medication protocols in place for every resident prescribed as-required medication, reviewed within the last three months?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there a clear process in place for receiving, checking, and recording new medication from the pharmacy?',
                  r: 'Yes',
                  note: 'Process documented in medication policy, Section 3.',
                },
                {
                  q: 'Are medication storage temperatures checked and recorded daily for all items requiring refrigeration?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there documented evidence that the medication trolley is cleaned and audited at least monthly?',
                  r: 'Yes',
                  note: 'Last cleaned 18 May 2026. Record in medication log.',
                },
              ].map(({ q, r, note, action }, i) => (
                <div key={i} className={`grid grid-cols-[2fr_80px_1fr] items-start gap-4 px-8 py-4 ${action ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {action
                      ? <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
                      : <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-teal" />
                    }
                    <p className="text-sm leading-snug text-neutral-dark">{q}</p>
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      r === 'Yes'     ? 'bg-green-100 text-green-700' :
                      r === 'Partial' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                    }`}>{r}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-mid">{note}</p>
                </div>
              ))}
            </div>

            {/* Action items */}
            <div className="border-t border-amber-100 bg-amber-50 px-8 py-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-700">Action items generated</p>
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-dark">Medication competency renewals for 2 staff members</p>
                    <p className="mt-0.5 text-xs text-neutral-mid">Assigned to: Sarah Mitchell, Deputy Manager</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">Due 10 Jun 2026</span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-mid">Open</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI recommendations ───────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>AI-Generated Recommendations</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Every completed audit generates a prioritised improvement plan. Automatically.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStreamAI analyses the responses from each completed audit and generates specific,
            prioritised recommendations based on what the findings actually show. Not generic
            advice from a template. Recommendations drawn from your audit, your policies, and
            your service type.
          </p>

          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Recommendations tied directly to the findings that generated them.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Each recommendation includes the specific finding it is based on, the risk it
                addresses, a suggested action, and a priority level. Managers can act immediately
                without having to interpret the audit data themselves.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Recommendations are stored alongside the audit report and tracked over time.
                When the same weakness appears across multiple months, CareStreamAI flags it as
                a recurring issue, giving managers the evidence they need to make a structural
                change rather than a one-off fix.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Specific to your findings',    text: 'Recommendations reference the exact questions that returned Partial or No responses, not the audit as a whole.' },
                  { label: 'Drawn from your own policies', text: 'Where your policy documents are relevant to the finding, CareStreamAI links the recommendation to the specific section.' },
                  { label: 'Recurring issue detection',    text: 'If the same finding appears in three consecutive audits, it is escalated as a systemic issue requiring a different approach.' },
                ].map(({ label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations panel mockup */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
              {/* Panel header */}
              <div className="border-b border-gray-100 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-mid">AI Recommendations</p>
                    <p className="text-sm font-bold text-neutral-dark">Medication Management Audit</p>
                    <p className="text-[11px] text-neutral-mid">Based on your completed audit: 22 May 2026</p>
                  </div>
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold text-teal">3 recommendations</span>
                </div>
              </div>

              {/* Recommendation 1 – High */}
              <div className="border-b border-gray-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">High priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: Q4 response</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Schedule medication competency renewals for two staff members before their sign-off lapses.</p>
                <p className="mb-3 text-xs leading-relaxed text-neutral-mid">
                  Two staff members are approaching the end of their current medication competency period.
                  Administering medication without a current sign-off is a CQC compliance risk under the
                  Safe key line of enquiry. Renewals should be completed before 10 June.
                </p>
                <div className="rounded-lg border border-teal/15 bg-teal/5 px-3 py-2">
                  <p className="text-[11px] font-medium text-teal">From your Medication Policy, Section 5.2: All staff administering medication must hold a valid competency assessment renewed annually.</p>
                </div>
              </div>

              {/* Recommendation 2 – Medium */}
              <div className="border-b border-gray-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Medium priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: recurring trend</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Review the competency renewal scheduling process to prevent future near-lapse situations.</p>
                <p className="text-xs leading-relaxed text-neutral-mid">
                  This is the second consecutive month in which staff competency renewals have been
                  flagged as approaching expiry. A proactive reminder process set 60 days before
                  expiry would prevent this from recurring.
                </p>
              </div>

              {/* Recommendation 3 – Low */}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">Low priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: near-miss log entry</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Confirm the near-miss debrief from 14 May has been shared with the wider medication team.</p>
                <p className="text-xs leading-relaxed text-neutral-mid">
                  The near-miss on 14 May was documented and reviewed. To close the learning loop,
                  confirm that the finding was shared at the next team handover or medication briefing
                  and record that a debrief took place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Audit programme features ──────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>A Complete Audit Programme</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            From completion to action tracking to trend analysis. One system for the full audit cycle.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            An audit that produces a report is the beginning, not the end. CareStreamAI tracks
            every action item to closure and shows you how your scores are changing over time.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: ClipboardCheck,
                title: 'Pre-built templates for every domain',
                body: 'Medication management, infection control, care planning, safeguarding, environmental safety, and staffing and records. All templates are aligned to CQC inspection priorities and ready to use immediately.',
              },
              {
                Icon: TrendingUp,
                title: 'Month-on-month trend analysis',
                body: 'Every completed audit is stored and compared to previous months. Section scores are tracked over time so managers can see exactly which domains are improving and which are stalling.',
              },
              {
                Icon: CheckCircle2,
                title: 'Action tracking to closure',
                body: 'Every finding generates an action item with an owner, a due date, and a status. Managers see open actions across all audits in a single view and can mark them complete when resolved.',
              },
              {
                Icon: Bell,
                title: 'Scheduled audit reminders',
                body: 'Managers receive automatic reminders when monthly audits are due. Staff assigned to complete an audit receive their notification via the same channel they use for policy questions.',
              },
              {
                Icon: Users,
                title: 'Assignable to any staff member',
                body: 'Audits can be assigned to any member of the management team. The guided format means anyone can complete an audit to the same standard, removing the dependency on a single person.',
              },
              {
                Icon: Brain,
                title: 'AI-generated improvement suggestions',
                body: 'When a section score is below the expected threshold, CareStreamAI analyses the specific findings and generates targeted improvement suggestions based on your service type and your own policies.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC evidence ──────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Evidence</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            An audit trail that shows inspectors a culture of continuous improvement.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              CQC inspectors assess whether internal audits are robust, whether they produce
              actionable findings, and whether those findings actually lead to improvement.
              CareStreamAI generates the evidence for all three questions.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStreamAI records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              ['Structured audit reports per domain', 'A formatted report for every monthly audit, with section scores, specific findings, and action items. Consistent format regardless of who completed the audit.'],
              ['Month-on-month score trends', 'Score history per domain showing whether the service is improving over time. Direct evidence that the audit programme is driving measurable change.'],
              ['Action items with owner and due date', 'Every finding produces a trackable action. Inspectors can see that findings are assigned to named individuals and managed to a deadline, not left open indefinitely.'],
              ['Closed actions with completion dates', 'When an action is marked complete, the record shows who closed it and when. Evidence that the audit cycle is fully closed, not just initiated.'],
              ['Audit completion rate over time', 'A record showing how consistently audits have been completed each month, demonstrating that the audit programme is embedded in the management routine of the service.'],
              ['AI-generated improvement recommendations', 'Where CareStreamAI generated recommendations based on audit findings, those recommendations are recorded alongside the action taken, showing a structured approach to quality improvement.'],
            ].map(([what, why], i) => (
              <div key={what} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 5 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-2 pr-4">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="font-semibold text-neutral-dark">{what}</span>
                </div>
                <span className="text-sm leading-relaxed text-neutral-mid">{why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature summary ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Everything Included</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            The complete monthly care audit toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ClipboardCheck, label: 'Pre-built domain templates',        desc: 'Medication, infection control, care planning, safeguarding, environment, and staffing. All ready to use and aligned to CQC inspection priorities.',        iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: MessageSquare,  label: 'Guided chat completion',            desc: 'Structured question-and-answer format ensures every audit is consistent regardless of who completes it. No blank form and no interpretation required.',      iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: FileText,       label: 'Automated report generation',       desc: 'A formatted report with overall score, section scores, findings, and action items is generated the moment the audit is complete.',                           iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: CheckCircle2,   label: 'Action tracking to closure',        desc: 'Every finding creates a tracked action with owner and due date. Open actions across all audits are visible in a single management view.',                    iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: TrendingUp,     label: 'Month-on-month trend analysis',     desc: 'Score history per domain shows whether your service is improving. Visible improvement is the evidence CQC looks for from a functioning audit programme.',    iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: Calendar,       label: 'Scheduled audit reminders',         desc: 'Automatic notifications when monthly audits are due. Assigned staff are reminded on the same channel they use for policy questions.',                         iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: Users,          label: 'Assignable to any team member',     desc: 'Audits can be assigned to any manager or senior staff member. The guided format delivers consistent results regardless of who completes it.',                 iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Brain,          label: 'AI improvement suggestions',        desc: 'When a section score is below threshold, CareStreamAI generates targeted improvement suggestions based on your specific findings and your own policies.',    iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
            ].map(({ icon: Icon, label, desc, iconBg, iconColor }) => (
              <div key={label} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{label}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:pr-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">30 min</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                average time to complete a monthly care audit using CareStreamAI guided chat.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                The same audit that takes two hours on a spreadsheet takes 30 minutes in a guided
                conversation, and produces a better formatted report at the end of it.
              </p>
            </div>
            <div className="md:pl-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">6</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                pre-built audit templates covering every CQC priority domain out of the box.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                Medication, infection control, care planning, safeguarding, environmental safety,
                and staffing. All ready to assign and all aligned to the current CQC inspection framework.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Replace inconsistent manual audits with a structured programme that drives real improvement."
        sub="See how CareStreamAI monthly audits work for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
