import { Fragment } from 'react'
import Link from 'next/link'
import { Check, Minus, ChevronDown, GraduationCap } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for CareStreamAI. From Starter plans for smaller homes to Enterprise for multi-site providers. 14-day free trial, no charge until day 14.',
  openGraph: {
    title: 'CareStreamAI Pricing',
    description: 'Simple, transparent pricing. 14-day free trial, no charge until day 14.',
    url: 'https://www.carestreamai.com/pricing',
  },
}

// ─── Plan cards ───────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£49',
    annual: '£490/year, save £98',
    highlight: false,
    badge: null as string | null,
    features: [
      '10 annual training allocations per month',
      'Up to 25 policies, 1 handbook, 10 staff users',
      '500 queries per month',
      'Chat, email and voice access',
      'Basic analytics and regulatory knowledge base',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '£129',
    annual: '£1,290/year, save £258',
    highlight: true,
    badge: 'Most popular',
    features: [
      '30 annual training allocations per month',
      'Unlimited policies, handbooks and staff users',
      '5,000 queries per month',
      'Advanced analytics + CQC Readiness Report',
      'Policy Gap Detection: coverage, what-to-add, legal-change tracking + gap training',
      'Face-to-face training and matrix',
      'Renewal tracking and mandatory-by-role gaps',
      'CQC evidence pack (sign-in sheets, certificates)',
      'Training payroll report (PDF, CSV and £ costing)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '£211.99',
    annual: '£2,100/year, save £443.88',
    highlight: false,
    badge: 'Everything included',
    features: [
      'Unlimited annual training allocations',
      'Everything in Professional, plus:',
      'Build your own audits',
      'Effectiveness of training analytics',
      'Audits linked to training + Training Impact',
      'Multi-site group console and benchmarking',
      'Workforce compliance register (DBS, right to work, registration, references)',
      'Supervisions and appraisals tracking',
      'Priority support and a dedicated manager',
    ],
  },
]

// ─── Comparison matrix ────────────────────────────────────────────────────────
// Each row holds the value for [Starter, Professional, Enterprise].

type Cell = string | boolean
type Row = { label: string; values: [Cell, Cell, Cell] }
type Group = { section: string; rows: Row[] }

const MATRIX: Group[] = [
  {
    section: 'Core',
    rows: [
      { label: 'Annual training allocations', values: ['10 / month', '30 / month', 'Unlimited'] },
      { label: 'Policies stored',             values: ['Up to 25', 'Unlimited', 'Unlimited'] },
      { label: 'Staff handbooks',             values: ['1', 'Unlimited', 'Unlimited'] },
      { label: 'Staff users',                 values: ['Up to 10', 'Unlimited', 'Unlimited'] },
      { label: 'Query limit',                 values: ['500 / month', '5,000 / month', 'Unlimited'] },
      { label: 'Languages supported',         values: ['50+', '50+', '50+'] },
    ],
  },
  {
    section: 'Access and knowledge',
    rows: [
      { label: 'Web chat interface',                 values: [true, true, true] },
      { label: 'Email interface',                    values: [true, true, true] },
      { label: 'Voice input',                        values: [true, true, true] },
      { label: 'External regulatory knowledge base', values: [true, true, true] },
      { label: 'Document versioning',                values: [true, true, true] },
      { label: 'Home knowledge base (auto)',         values: [true, true, true] },
      { label: 'Home knowledge base (manual)',       values: ['Up to 50 entries', 'Unlimited', 'Unlimited'] },
    ],
  },
  {
    section: 'Analytics and compliance',
    rows: [
      { label: 'Basic analytics',      values: [true, true, true] },
      { label: 'Advanced analytics',   values: [false, true, true] },
      { label: 'CQC Readiness Report', values: [false, true, true] },
    ],
  },
  {
    section: 'Policy Gap Detection',
    rows: [
      { label: 'Regulation coverage analysis (reads inside your policies)', values: [false, true, true] },
      { label: 'What-to-add remediation with example wording',             values: [false, true, true] },
      { label: 'Legal basis + source citation on each recommendation',      values: [false, true, true] },
      { label: 'Where-to-add (target policy) guidance',                     values: [false, true, true] },
      { label: 'Applicability by care setting + service profile',           values: [false, true, true] },
      { label: 'Regulation change tracking + update alerts',                values: [false, true, true] },
      { label: 'Generate staff training from a policy change',              values: [false, true, true] },
    ],
  },
  {
    section: 'Policy Updates and Approvals',
    rows: [
      { label: 'Adopt a gap fix into your policy (tracked changes)',        values: [false, true, true] },
      { label: 'Role-holder names merged into policies',                   values: [false, true, true] },
      { label: 'Download a print-ready policy (letterhead + sign-off)',     values: [false, true, true] },
      { label: 'Admin approval with full version history',                 values: [false, true, true] },
      { label: 'Care manager approval step (optional)',                    values: [false, true, true] },
      { label: 'Care manager Policies hub (approve + see what changed)',    values: [false, true, true] },
      { label: 'External approval by one-off link (consultant, trustee)',  values: [false, true, true] },
      { label: 'Approval trail + auto re-publish to staff Q&A',            values: [false, true, true] },
    ],
  },
  {
    section: 'Training and audit intelligence',
    rows: [
      { label: 'Face-to-face training and matrix', values: [false, true, true] },
      { label: 'Training compliance matrix (renewals + gaps)', values: [false, true, true] },
      { label: 'Mandatory training by role',       values: [false, true, true] },
      { label: 'CQC evidence pack (sign-in sheets, certificates, files)', values: [false, true, true] },
      { label: 'Training payroll report (PDF + CSV, £ costing)', values: [false, true, true] },
      { label: 'Build your own audits',            values: [false, false, true] },
      { label: 'Effectiveness of training',        values: [false, false, true] },
      { label: 'Audits linked to training',        values: [false, false, true] },
      { label: 'Training Impact',                  values: [false, false, true] },
    ],
  },
  {
    section: 'Multi-site and workforce',
    rows: [
      { label: 'Multi-site group console and benchmarking', values: [false, false, true] },
      { label: 'Workforce compliance register (DBS, right to work, registration, references)', values: [false, false, true] },
      { label: 'Credential document uploads + expiry alerts', values: [false, false, true] },
      { label: 'Supervisions and appraisals tracking', values: [false, false, true] },
    ],
  },
  {
    section: 'Support',
    rows: [
      { label: 'Support',    values: ['Email support', 'Priority email and phone', 'Priority + dedicated manager'] },
      { label: 'Free trial', values: ['14 days', '14 days', '14 days'] },
    ],
  },
]

const FAQS = [
  {
    q: 'What is an annual training allocation?',
    a: 'Each plan includes a monthly pool of annual-training-module allocations. One allocation is one annual training module assigned to one staff member. For example, on Starter you can assign 10 modules to one person, or one module to 10 people, or any mix up to 10 each month. The pool resets on the 1st. Professional includes 30 per month and Enterprise is unlimited.',
  },
  {
    q: 'What counts as a query?',
    a: 'Any message sent to CareStreamAI counts as one query, regardless of channel. This includes web chat messages, emails, and voice questions. Follow-up messages in the same session or thread each count as one query.',
  },
  {
    q: 'What happens if I reach a monthly limit?',
    a: 'You will receive a dashboard alert as you approach your monthly query or allocation limit. If you reach it, you can upgrade instantly from the dashboard, or wait until the pool resets at the start of the next billing period.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes. Upgrades take effect immediately and unlock features instantly. Downgrades take effect at the start of your next billing period, and your existing data is always kept exactly as it is.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. CareStreamAI is a rolling monthly subscription. Cancel any time with no penalty and no notice period.',
  },
  {
    q: 'What is Policy Gap Detection?',
    a: 'Available on Professional and Enterprise, it reads inside your uploaded policies and tells you which regulations you cover and where the gaps are. For each gap it shows exactly what to add, with example wording, the legal basis (legally required vs advised) and the source, and which policy to add it to. It only assesses the regulations that apply to your service, tracks changes to the standards and alerts you when one changes, and can turn any change into a short staff training module. There is a dedicated overview at /policy-gap-detection.',
  },
  {
    q: 'How do policy updates and approvals work?',
    a: 'When you adopt a gap fix, the change is applied to an editable copy of your policy as a tracked change, so your original upload is never touched. Nothing goes live until it is approved. An admin approves first, then, if you choose, it goes to your care manager for a second approval in their Policies hub, and optionally to an external person (for example a consultant or trustee) on a one-off link to approve or send feedback. You control the care manager and external steps with two toggles in your organisation details, so a smaller home can let an admin approve directly. Every approval is logged, and once the final approval is in, the new version is published to your staff Q&A automatically. Available on Professional and Enterprise.',
  },
  {
    q: 'Do you offer discounts for group operators?',
    a: 'Yes. Enterprise is built for multi-site providers and we offer volume pricing from three homes or more. Contact us for group pricing.',
  },
  {
    q: 'Is my data kept separate from other organisations?',
    a: 'Yes. Every customer has a completely isolated environment. Your policy documents, knowledge base, query history, and staff data are never shared with or accessible by any other organisation. Your documents are never used to train AI models.',
  },
]

function FeatureValue({ val, light = false }: { val: Cell; light?: boolean }) {
  if (val === true)  return <Check size={15} className={`mx-auto ${light ? 'text-white/70' : 'text-teal'}`} />
  if (val === false) return <Minus size={15} className={`mx-auto ${light ? 'text-white/30' : 'text-gray-300'}`} />
  return <span className={`text-sm font-medium ${light ? 'text-white' : 'text-neutral-dark'}`}>{val}</span>
}

export default function PricingPage() {
  return (
    <>
      <PageHero
        label="Pricing"
        title="Simple pricing. No surprises."
        subtitle="Every plan includes a 14-day free trial. No charge until day 14 — cancel anytime."
        centered
      />

      {/* Plan cards */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map(plan => (
              plan.highlight ? (
                <div key={plan.id} className="card-lift relative rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
                  {plan.badge && (
                    <span className="absolute right-6 top-6 rounded-pill bg-amber-brand px-3 py-1 text-xs font-bold text-white">
                      {plan.badge}
                    </span>
                  )}
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{plan.name}</p>
                  <p className="mb-1 text-4xl font-extrabold text-white">
                    {plan.price}<span className="text-base font-normal text-white/60">/month</span>
                  </p>
                  <p className="mb-7 text-sm text-white/60">{plan.annual}</p>
                  <Link href="/register" className="btn-amber mb-8 block rounded-btn px-6 py-3 text-center text-sm">
                    Start Free Trial
                  </Link>
                  <ul className="space-y-3 border-t border-white/15 pt-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                        <Check size={15} className="mt-0.5 shrink-0 text-white/70" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div key={plan.id} className="card-lift rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
                  {plan.badge && (
                    <span className="mb-3 inline-block rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
                      {plan.badge}
                    </span>
                  )}
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-mid">{plan.name}</p>
                  <p className="mb-1 text-4xl font-extrabold text-neutral-dark">
                    {plan.price}<span className="text-base font-normal text-neutral-mid">/month</span>
                  </p>
                  <p className="mb-7 text-sm text-neutral-mid">{plan.annual}</p>
                  <Link href="/register" className="mb-8 block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal transition-colors hover:bg-teal-light">
                    Start Free Trial
                  </Link>
                  <ul className="space-y-3 border-t border-gray-100 pt-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-mid">
                        <Check size={15} className="mt-0.5 shrink-0 text-teal" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>

          {/* Just need training? — à la carte modules, no subscription */}
          <div className="mt-8 rounded-2xl border border-teal/20 bg-white p-8 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div className="mb-6 sm:mb-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
                <GraduationCap size={14} /> Training only
              </div>
              <h3 className="mb-1.5 text-xl font-extrabold text-neutral-dark">Just need training? Buy modules individually.</h3>
              <p className="max-w-lg text-sm leading-relaxed text-neutral-mid">
                No subscription required. Pay per module, per staff member. Each module includes the interactive lesson,
                the assessment, and a certificate on completion. Annual modules renew yearly. Upgrade to a full plan any time.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <p className="mb-3">
                <span className="text-3xl font-extrabold text-neutral-dark">£25.99</span>
                <span className="block text-xs text-neutral-mid">per staff member, per module</span>
              </p>
              <Link href="/register?tier=training_only" className="inline-block rounded-btn bg-teal px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-dark">
                Start with training modules
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Full comparison matrix */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>Compare plans</SectionLabel>
          <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">Every feature, side by side</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-neutral-light">
                  <th className="px-5 py-4 text-left text-sm font-bold text-neutral-dark">Feature</th>
                  <th className="px-5 py-4 text-center text-sm font-bold text-neutral-dark">Starter</th>
                  <th className="px-5 py-4 text-center text-sm font-bold text-teal">Professional</th>
                  <th className="px-5 py-4 text-center text-sm font-bold text-neutral-dark">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(group => (
                  <Fragment key={group.section}>
                    <tr className="bg-neutral-light/50">
                      <td colSpan={4} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">
                        {group.section}
                      </td>
                    </tr>
                    {group.rows.map(row => (
                      <tr key={row.label} className="border-b border-gray-100 last:border-0">
                        <td className="px-5 py-3 text-neutral-mid">{row.label}</td>
                        <td className="px-5 py-3 text-center"><FeatureValue val={row.values[0]} /></td>
                        <td className="bg-teal-light/20 px-5 py-3 text-center"><FeatureValue val={row.values[1]} /></td>
                        <td className="px-5 py-3 text-center"><FeatureValue val={row.values[2]} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Guarantee strip */}
      <section className="bg-neutral-light py-14">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-wrap items-center justify-center gap-10 text-sm text-neutral-mid">
            {[
              '14-day free trial on any plan',
              'No charge until day 14',
              'No per-user fees',
              'All three channels included',
              'Cancel any time',
              'UK data residency',
            ].map(item => (
              <span key={item} className="flex items-center gap-2">
                <Check size={15} className="text-teal" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-2xl px-6">
          <SectionLabel>Pricing FAQs</SectionLabel>
          <h2 className="mb-12 text-3xl font-extrabold text-neutral-dark">Common questions about pricing</h2>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-bold text-neutral-dark">{q}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-neutral-mid transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-6 pb-6">
                  <p className="leading-relaxed text-neutral-mid">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PageCta
        heading="Start your free 14-day trial today."
        sub="No charge until day 14. No commitment. Your first policy answer in under an hour."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Talk to Sales First' }}
      />
    </>
  )
}
