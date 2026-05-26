import Link from 'next/link'
import { CheckCircle2, FileText, MessageSquare, BarChart2 } from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'CQC & Compliance',
  description: 'CareStreamAI gives you an always-on CQC Readiness Report. Track evidence across the five key questions, identify policy gaps, and prepare your team before the inspector arrives.',
  openGraph: {
    title: 'CQC & Compliance | CareStreamAI',
    description: 'Always-on CQC readiness: evidence tracking, policy gap detection, and team preparation tools.',
    url: 'https://carestreamai.co.uk/cqc-compliance',
  },
}

// ── Readiness Report Dashboard Mockup ────────────────────────────────────────

function ReadinessReportMockup() {
  const policies = [
    { name: 'Safeguarding Adults',   queries: 84, pct: 84 },
    { name: 'Medication Management', queries: 61, pct: 61 },
    { name: 'Infection Control',     queries: 52, pct: 52 },
    { name: 'Fire Safety',           queries: 38, pct: 38 },
    { name: 'Moving & Handling',     queries: 29, pct: 29 },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CQC Readiness Report</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">91</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">/ 100</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Policies in use', value: '18/20' },
          { label: 'Staff active',    value: '24/26' },
          { label: 'Period',          value: 'Apr 2025' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-sm font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">
          Policy Access This Month
        </p>
        <div className="space-y-3">
          {policies.map(({ name, queries, pct }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] text-neutral-mid">{queries}</p>
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
        <p className="text-[11px] font-medium text-teal">Inspection-ready · Click to download PDF</p>
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
                CareStreamAI builds your compliance evidence in real time, one policy interaction at a time.
                When the inspector arrives, your evidence is already prepared.
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
              <SectionLabel>The Gap Most Care Homes Have</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Policies exist. Evidence of use doesn&apos;t.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  CQC inspectors look for evidence that staff actively use and understand your policies, not
                  just that the policies exist. Most care organisations can show the policy folder. Very few
                  can show the inspector that their team actually reads and applies it.
                </p>
                <p>
                  CareStreamAI closes that gap by logging every policy interaction in a structured, auditable
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
                body: 'Every time a staff member queries a policy via WhatsApp, email, or the chat portal, CareStreamAI logs the interaction, the policy accessed, the role, the language, and the date.',
              },
              {
                step: '02',
                Icon: FileText,
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                title: 'Every interaction is recorded',
                body: 'CareStreamAI structures each interaction into an auditable record, who accessed which policy, when, in what language, building a live evidence base that grows automatically with every query.',
              },
              {
                step: '03',
                Icon: BarChart2,
                iconBg: 'bg-teal-light',
                iconColor: 'text-teal',
                title: 'Generate your Readiness Report',
                body: 'With one click, generate a CQC Readiness Report that presents your evidence clearly, policy access summaries, staff engagement data, knowledge gap analysis, and more.',
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

      {/* ── Report sections ────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
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
              ['Multilingual Access', 'Languages used to access policies, direct evidence for CQC Equality & Diversity requirements and Equality Act 2010 compliance.'],
              ['Knowledge Gap Log', 'Unanswered queries grouped by topic, evidence of ongoing quality improvement and proactive gap identification.'],
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
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Key Questions</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">
            How CareStreamAI contributes to each key question.
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

      {/* ── Legal note ─────────────────────────────────────────────────────── */}
      <section className="bg-amber-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex gap-4">
            <div className="mt-1 text-2xl text-amber-600">⚠</div>
            <div>
              <p className="mb-1 font-bold text-amber-900">Inspection evidence, not a rating guarantee</p>
              <p className="text-sm leading-relaxed text-amber-800">
                CareStreamAI&apos;s CQC Readiness Report provides factual audit data, evidence of policy access and
                staff engagement. It does not make any assessment of, or claim to influence, CQC inspection ratings.
                CQC assessments involve many factors. CareStreamAI provides one part of the evidence base.
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
