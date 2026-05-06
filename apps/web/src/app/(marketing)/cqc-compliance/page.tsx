import Link from 'next/link'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = { title: 'CQC & Compliance — CareStreamAI' }

export default function CqcCompliancePage() {
  return (
    <>
      <PageHero
        label="CQC & Compliance"
        title="Stop preparing for CQC. Start being ready for CQC."
        subtitle="CareStreamAI builds your compliance evidence in real time — one policy interaction at a time. When the inspector arrives, your evidence is already prepared."
      />

      {/* The gap */}
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
                  CQC inspectors look for evidence that staff actively use and understand your policies — not
                  just that the policies exist. Most care organisations can show the policy folder. Very few
                  can show the inspector that their team actually reads and applies it.
                </p>
                <p>
                  CareStreamAI closes that gap by logging every policy interaction in a structured, auditable
                  format — and generating a CQC Readiness Report that makes that evidence immediately presentable.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                { icon: '📁', label: 'What most homes can show', text: 'A policy folder. Documents in place. Dated and versioned.', dim: true },
                { icon: '📊', label: 'What CQC wants to see', text: 'Evidence that staff read, query, and act on your policies — by role, over time, across languages.', dim: false },
              ].map(({ icon, label, text, dim }) => (
                <div key={label} className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}>
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

      {/* Report sections */}
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
              ['Policies Not Accessed', 'Policies that received zero queries in the period — an honest self-assessment that shows CQC you identify and address gaps proactively.'],
              ['Policy Version History', 'When each policy was updated and whether staff accessed it after the update — evidence that new guidance reached the team.'],
              ['Staff Engagement by Role', 'Query activity by care staff, seniors, and management — showing policies are accessed at the point of care delivery, not just by management.'],
              ['Regulatory Framework Activity', 'Queries referencing RIDDOR, safeguarding, CQC Fundamental Standards — showing staff engage with the regulatory framework.'],
              ['Multilingual Access', 'Languages used to access policies — direct evidence for CQC Equality & Diversity requirements and Equality Act 2010 compliance.'],
              ['Knowledge Gap Log', 'Unanswered queries grouped by topic — evidence of ongoing quality improvement and proactive gap identification.'],
            ].map(([section, why], i) => (
              <div key={section} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 6 ? 'border-b border-gray-100' : ''}`}>
                <span className="pr-4 font-semibold text-neutral-dark">{section}</span>
                <span className="text-sm leading-relaxed text-neutral-mid">{why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key questions */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Key Questions</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">
            How CareStreamAI contributes to each key question.
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { q: 'Well-Led', icon: '🏆', evidence: 'An inclusive culture where all staff — regardless of language — have equal access to policy guidance. Leadership demonstrated through the audit trail.' },
              { q: 'Responsive', icon: '⚡', evidence: 'Services organised to meet the diverse needs of the workforce delivering them. Multilingual access and language analytics demonstrate responsiveness.' },
              { q: 'Safe', icon: '🛡️', evidence: 'Staff acting on correct, approved procedures — with a full log of every policy query and the guidance given.' },
              { q: 'Effective', icon: '📈', evidence: 'Staff knowledge and competence evidenced through policy access frequency, version adoption, and knowledge gap resolution.' },
              { q: 'Caring', icon: '❤️', evidence: 'Equitable support for all staff, including those whose first language is not English, enabling confident, informed care delivery.' },
            ].map(({ q, icon, evidence }) => (
              <div key={q} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <span className="rounded-pill bg-teal px-3 py-1.5 text-xs font-bold text-white">{q}</span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-mid">{evidence}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal note */}
      <section className="bg-amber-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex gap-4">
            <div className="mt-1 text-2xl text-amber-600">⚠</div>
            <div>
              <p className="mb-1 font-bold text-amber-900">Inspection evidence, not a rating guarantee</p>
              <p className="text-sm leading-relaxed text-amber-800">
                CareStreamAI&apos;s CQC Readiness Report provides factual audit data — evidence of policy access and
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
