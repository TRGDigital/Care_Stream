import Link from 'next/link'
import {
  CheckCircle2, FileText, MessageSquare, BarChart2,
  ShieldCheck, AlertTriangle, HelpCircle,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CQC & Compliance',
  description: 'CareStream builds your CQC evidence as staff use your policies, checks which regulations your policies cover, and produces an inspection-ready report you can download as a PDF.',
  openGraph: {
    title: 'CQC & Compliance | CareStreamAI',
    description: 'Always-on CQC readiness: evidence tracking, regulation coverage analysis, and a downloadable inspection report.',
    url: 'https://carestreamai.com/cqc-compliance',
  },
}

// ── Readiness Report Dashboard Mockup ────────────────────────────────────────

function ReadinessReportMockup() {
  const policies = [
    { name: 'Safeguarding Adults',   queries: 84, pct: 100 },
    { name: 'Medication Management', queries: 61, pct: 73  },
    { name: 'Infection Control',     queries: 52, pct: 62  },
    { name: 'Fire Safety',           queries: 38, pct: 45  },
    { name: 'Moving & Handling',     queries: 29, pct: 35  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CQC Readiness Report</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2">
            <FileText size={13} className="text-white" />
            <p className="text-[11px] font-bold text-white">PDF</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Policies in use', value: '18/20' },
          { label: 'Staff active',    value: '24/26' },
          { label: 'Period',          value: 'Apr 2026' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-sm font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">
          Policy access this month
        </p>
        <div className="space-y-3">
          {policies.map(({ name, queries, pct }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] text-neutral-mid">{queries} queries</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-teal/5 px-5 py-3">
        <CheckCircle2 size={13} className="flex-shrink-0 text-teal" />
        <p className="text-[11px] font-medium text-teal">Inspection evidence · Download as a PDF</p>
      </div>
    </div>
  )
}

// ── Regulation Coverage Mockup ───────────────────────────────────────────────

function CoverageMockup() {
  const rows = [
    { reg: 'Duty of Candour (Reg 20)',        status: 'gap',      reason: 'Not addressed in your current policies.' },
    { reg: 'RIDDOR 2013',                     status: 'partial',  reason: 'Touched on, but the reporting steps are incomplete.' },
    { reg: 'Mental Capacity Act 2005',        status: 'covered',  reason: 'Covered by your Mental Capacity policy.' },
    { reg: 'Safeguarding (Care Act 2014)',    status: 'covered',  reason: 'Covered by your Safeguarding Adults policy.' },
  ]
  const styles: Record<string, { badge: string; text: string; label: string }> = {
    gap:     { badge: 'bg-red-100',   text: 'text-red-600',   label: 'Gap' },
    partial: { badge: 'bg-amber-100', text: 'text-amber-600', label: 'Partial' },
    covered: { badge: 'bg-green-100', text: 'text-green-700', label: 'Covered' },
  }
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-teal px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Regulation Coverage</p>
          <p className="text-sm font-bold text-white">Crossways Care Home</p>
        </div>
        <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
          <p className="text-lg font-extrabold leading-none text-white">84%</p>
          <p className="mt-0.5 text-[9px] font-medium text-white/70">coverage</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map(({ reg, status, reason }) => {
          const s = styles[status]
          return (
            <div key={reg} className="px-5 py-3">
              <div className="mb-0.5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-neutral-dark">{reg}</p>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge} ${s.text}`}>{s.label}</span>
              </div>
              <p className="text-[11px] leading-snug text-neutral-mid">{reason}</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <AlertTriangle size={13} className="flex-shrink-0 text-amber-500" />
        <p className="text-[11px] font-medium text-neutral-mid">Gaps shown first, so you know what to write or update next.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CqcCompliancePage() {
  return (
    <>
      {/* ── Split hero ─────────────────────────────────────────────────────── */}
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
              <SectionLabel light>CQC & Compliance</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Stop preparing for CQC. Start being ready for CQC.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                CareStream builds your compliance evidence in real time, one policy interaction at a time,
                and checks which regulations your policies actually cover. When the inspector arrives, your
                evidence is already prepared.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Start Free Trial
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  Book a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ReadinessReportMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The gap ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Gap Most Care Settings Have</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Policies exist. Evidence of use does not.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  CQC inspectors look for evidence that staff actively use and understand your policies, not
                  just that the policies exist. Most care organisations can show the policy folder. Very few
                  can show the inspector that their team actually reads and applies it.
                </p>
                <p>
                  CareStream closes that gap by logging every policy interaction in a structured, auditable
                  format, and generating a CQC Readiness Report that makes that evidence immediately presentable.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📁',
                  label: 'What most homes can show',
                  text: 'A policy folder. Documents in place. Dated and versioned.',
                  dim: true,
                },
                {
                  icon: '📊',
                  label: 'What CQC wants to see',
                  text: 'Evidence that staff read, query, and act on your policies, by role, over time, across languages.',
                  dim: false,
                },
              ].map(({ icon, label, text, dim }) => (
                <div
                  key={label}
                  className={`card-lift rounded-2xl p-6 ${
                    dim
                      ? 'border-2 border-red-100 bg-red-50/70'
                      : 'bg-teal-gradient shadow-teal-glow'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      dim ? 'text-red-400' : 'text-white/60'
                    }`}>
                      {label}
                    </p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold leading-tight text-neutral-dark">
            Evidence that builds itself, every day.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: MessageSquare,
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                title: 'Staff ask policy questions',
                body: 'Every time a staff member queries a policy in the hub or by email, CareStream logs the interaction, the policy accessed, the role, the language, and the date.',
              },
              {
                step: '02',
                Icon: FileText,
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                title: 'Every interaction is recorded',
                body: 'CareStream structures each interaction into an auditable record, who accessed which policy, when, in what language, building a live evidence base that grows automatically with every query.',
              },
              {
                step: '03',
                Icon: BarChart2,
                iconBg: 'bg-teal-light',
                iconColor: 'text-teal',
                title: 'Generate your Readiness Report',
                body: 'With one click, generate a CQC Readiness Report that presents your evidence clearly, policy access summaries, staff engagement data, knowledge gap logs, and more, ready to download as a PDF.',
              },
            ].map(({ step, Icon, iconBg, iconColor, title, body }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step}
                  </span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={18} className={iconColor} />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regulation coverage ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Regulation Coverage</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            See which regulations your policies cover, and where the gaps are.
          </h2>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Your policies, checked against the regulations that apply to a care service.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStream reads the actual content of your policies, not just the titles, and checks them
                against each regulation that applies to a care service. For every regulation it decides
                whether your policies cover it, partly cover it, or leave a gap, and points to the policy
                that best evidences the decision.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Gaps are listed first, so you know what to write or update before an inspector finds it.
                Every judgement comes with a short reason and a confidence level, and the picture refreshes
                as your policies change.
              </p>
              <div className="space-y-3">
                {[
                  { Icon: CheckCircle2,  label: 'Covered', text: 'A policy clearly and substantively addresses the regulation.' },
                  { Icon: ShieldCheck,   label: 'Partial', text: 'The topic is touched on, but is incomplete for what the regulation requires.' },
                  { Icon: AlertTriangle, label: 'Gap',     text: 'The regulation is not addressed in your current policies.' },
                ].map(({ Icon, label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CoverageMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Report sections ────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <SectionLabel>What the Report Covers</SectionLabel>
            <span className="rounded-pill bg-teal px-3 py-1 text-xs font-bold text-white">Professional plan</span>
          </div>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">The CQC Readiness Report.</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>Report section</span>
              <span>Why it matters at inspection</span>
            </div>
            {[
              ['Policy Access Summary', 'Every active policy with total queries, number of staff who accessed it, and date of most recent access. Proof that policies are live and in use.'],
              ['Policies Not Accessed', 'Policies that received zero queries in the period, an honest self-assessment that shows CQC you identify and address gaps proactively.'],
              ['Policy Version History', 'When each policy was updated and whether staff accessed it after the update, evidence that new guidance reached the team.'],
              ['Staff Engagement by Role', 'Query activity by care staff, seniors, and management, showing policies are accessed at the point of care delivery, not just by management.'],
              ['Regulatory Framework Activity', 'Queries referencing RIDDOR, safeguarding, CQC Fundamental Standards, showing staff engage with the regulatory framework.'],
              ['Multilingual Access', 'Languages used to access policies, direct evidence supporting CQC Equality and Diversity considerations for a multilingual workforce.'],
              ['Knowledge Gap Log', 'Unanswered queries captured as they happen, evidence of ongoing quality improvement and proactive gap identification.'],
            ].map(([section, why], i) => (
              <div key={section} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 6 ? 'border-b border-gray-100' : ''}`}>
                <span className="pr-4 font-semibold text-neutral-dark">{section}</span>
                <span className="text-sm leading-relaxed text-neutral-mid">{why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC key questions ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Key Questions</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">
            How CareStream contributes to each key question.
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                q: 'Well-Led', icon: '🏆',
                badgeBg: 'bg-teal', badgeText: 'text-white',
                evidence: 'An inclusive culture where all staff, regardless of language, have equal access to policy guidance. Leadership demonstrated through the audit trail.',
              },
              {
                q: 'Responsive', icon: '⚡',
                badgeBg: 'bg-amber-500', badgeText: 'text-white',
                evidence: 'Services organised to meet the diverse needs of the workforce delivering them. Multilingual access and language analytics demonstrate responsiveness.',
              },
              {
                q: 'Safe', icon: '🛡️',
                badgeBg: 'bg-blue-600', badgeText: 'text-white',
                evidence: 'Staff acting on correct, approved procedures, with a full log of every policy query and the guidance given.',
              },
              {
                q: 'Effective', icon: '📈',
                badgeBg: 'bg-green-600', badgeText: 'text-white',
                evidence: 'Staff knowledge and competence evidenced through policy access frequency, version adoption, and knowledge gap resolution.',
              },
              {
                q: 'Caring', icon: '❤️',
                badgeBg: 'bg-purple-600', badgeText: 'text-white',
                evidence: 'Equitable support for all staff, including those whose first language is not English, enabling confident, informed care delivery.',
              },
            ].map(({ q, icon, badgeBg, badgeText, evidence }) => (
              <div key={q} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <span className={`rounded-pill ${badgeBg} px-3 py-1.5 text-xs font-bold ${badgeText}`}>{q}</span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-mid">{evidence}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works alongside ────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Part of Your CQC Toolkit</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Readiness is more than a report.
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                Icon: MessageSquare,
                title: 'CQC Report Chat',
                body: 'Upload your inspection report and chat with it. CareStream cross-references it against your policies and the CQC framework to help you understand findings and draft a factual-accuracy challenge.',
                href: '/cqc-report-chat',
                cta: 'Explore CQC Report Chat',
              },
              {
                Icon: HelpCircle,
                title: 'CQC Staff Questions',
                body: 'Prepare your team for the conversations inspectors have on the floor. Open-ended, inspector-style questions across the five key questions, scored by AI, with review and retry.',
                href: '/cqc-staff-questions',
                cta: 'Explore CQC Staff Questions',
              },
            ].map(({ Icon, title, body, href, cta }) => (
              <div key={title} className="card-lift flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{body}</p>
                <Link href={href} className="text-sm font-semibold text-teal hover:underline">{cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal note ─────────────────────────────────────────────────────── */}
      <section className="bg-amber-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex gap-4">
            <div className="mt-1 text-2xl text-amber-600">⚠</div>
            <div>
              <p className="mb-1 font-bold text-amber-900">Inspection evidence, not a rating guarantee</p>
              <p className="text-sm leading-relaxed text-amber-800">
                The CareStream CQC Readiness Report provides factual audit data, evidence of policy access and
                staff engagement. It does not make any assessment of, or claim to influence, CQC inspection ratings.
                CQC assessments involve many factors. CareStream provides one part of the evidence base.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Build your inspection evidence from day one."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
