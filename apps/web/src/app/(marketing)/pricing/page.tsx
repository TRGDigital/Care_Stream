import { Fragment } from 'react'
import Link from 'next/link'
import { Check, Minus, ChevronDown, GraduationCap, ArrowUpRight } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { PRICING_SLOTS } from '@/lib/page-slots/pricing'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const revalidate = 300

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function toSlug(label: string): string {
  return label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Static feature pages that aren't in the DB but still have a page to link to.
const STATIC_FEATURE_SLUGS = ['web-chat-interface']

// The set of feature slugs that have a live /features/ page (DB-published + static),
// so the matrix can show a link icon next to those feature names.
async function getLinkedFeatureSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>(STATIC_FEATURE_SLUGS)
  try {
    const res = await fetch(`${API_URL}/public/feature-pages`, { next: { revalidate: 300 } })
    if (res.ok) {
      const items = (await res.json())?.data?.featurePages ?? []
      for (const f of items as Array<{ slug?: string }>) if (f.slug) slugs.add(f.slug)
    }
  } catch {
    // fall through — no links rather than a broken page
  }
  return slugs
}

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

// Structural plan config. Copy (name, caption, badge, features) is in PRICING_SLOTS;
// price and layout flags stay here.
const PLANS = [
  { id: 'starter',      slot: 'plans.starter',      price: '£85',   highlight: false, hasBadge: false, featureKeys: ['feat1', 'feat2', 'feat3', 'feat4', 'feat5'] },
  { id: 'professional', slot: 'plans.professional', price: '£230',  highlight: true,  hasBadge: true,  featureKeys: ['feat1', 'feat2', 'feat3', 'feat4', 'feat5', 'feat6', 'feat7', 'feat8', 'feat9'] },
  { id: 'enterprise',   slot: 'plans.enterprise',   price: '£385',  highlight: false, hasBadge: true,  featureKeys: ['feat1', 'feat2', 'feat3', 'feat4', 'feat5', 'feat6', 'feat7', 'feat8', 'feat9'] },
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
      { label: 'Generate onboarding from a policy update',                  values: [false, true, true] },
      { label: 'Out-of-date content detection (superseded law, placeholders)', values: [false, true, true] },
      { label: 'Cross-policy consistency (contradictions between policies)', values: [false, true, true] },
    ],
  },
  {
    section: 'CQC Single Assessment Framework',
    rows: [
      { label: 'Wording alignment to the CQC quality statements',          values: [false, true, true] },
      { label: 'Person-centred rewording suggestions (in your policy voice)', values: [false, true, true] },
      { label: 'Suggestions numbered & highlighted in the policy',         values: [false, true, true] },
      { label: 'Adopt into your policy through review & approval',          values: [false, true, true] },
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

// FAQ copy lives in PRICING_SLOTS (faq.q1/faq.a1 … faq.q9/faq.a9).
const FAQ_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => ({ q: `faq.q${n}`, a: `faq.a${n}` }))

function FeatureValue({ val, light = false }: { val: Cell; light?: boolean }) {
  if (val === true)  return <Check size={15} className={`mx-auto ${light ? 'text-white/70' : 'text-teal'}`} />
  if (val === false) return <Minus size={15} className={`mx-auto ${light ? 'text-white/30' : 'text-gray-300'}`} />
  return <span className={`text-sm font-medium ${light ? 'text-white' : 'text-neutral-dark'}`}>{val}</span>
}

export default async function PricingPage() {
  const linkedFeatures = await getLinkedFeatureSlugs()
  const s = makeSlot(PRICING_SLOTS, await getContentSlots('/pricing'))
  return (
    <>
      <PageHero
        label={s('hero.label')}
        title={s('hero.title')}
        subtitle={s('hero.subtitle')}
        centered
      />

      {/* Plan cards */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map(plan => (
              plan.highlight ? (
                <div key={plan.id} className="card-lift relative rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
                  {plan.hasBadge && (
                    <span className="absolute right-6 top-6 rounded-pill bg-amber-brand px-3 py-1 text-xs font-bold text-white">
                      {s(`${plan.slot}.badge`)}
                    </span>
                  )}
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{s(`${plan.slot}.name`)}</p>
                  <p className="mb-1 text-4xl font-extrabold text-white">
                    {plan.price}<span className="text-base font-normal text-white/60">/month</span>
                  </p>
                  <p className="mb-7 text-sm text-white/60">{s(`${plan.slot}.caption`)}</p>
                  <Link href="/register" className="btn-amber mb-8 block rounded-btn px-6 py-3 text-center text-sm">
                    {s('plans.cta')}
                  </Link>
                  <ul className="space-y-3 border-t border-white/15 pt-6">
                    {plan.featureKeys.map(fk => (
                      <li key={fk} className="flex items-start gap-2.5 text-sm text-white/80">
                        <Check size={15} className="mt-0.5 shrink-0 text-white/70" /> {s(`${plan.slot}.${fk}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div key={plan.id} className="card-lift rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
                  {plan.hasBadge && (
                    <span className="mb-3 inline-block rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
                      {s(`${plan.slot}.badge`)}
                    </span>
                  )}
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-mid">{s(`${plan.slot}.name`)}</p>
                  <p className="mb-1 text-4xl font-extrabold text-neutral-dark">
                    {plan.price}<span className="text-base font-normal text-neutral-mid">/month</span>
                  </p>
                  <p className="mb-7 text-sm text-neutral-mid">{s(`${plan.slot}.caption`)}</p>
                  <Link href="/register" className="mb-8 block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal transition-colors hover:bg-teal-light">
                    {s('plans.cta')}
                  </Link>
                  <ul className="space-y-3 border-t border-gray-100 pt-6">
                    {plan.featureKeys.map(fk => (
                      <li key={fk} className="flex items-start gap-2.5 text-sm text-neutral-mid">
                        <Check size={15} className="mt-0.5 shrink-0 text-teal" /> {s(`${plan.slot}.${fk}`)}
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
                <GraduationCap size={14} /> {s('training.badge')}
              </div>
              <h3 className="mb-1.5 text-xl font-extrabold text-neutral-dark">{s('training.heading')}</h3>
              <p className="max-w-lg text-sm leading-relaxed text-neutral-mid">
                {s('training.body')}
              </p>
            </div>
            <div className="shrink-0 text-center">
              <p className="mb-3">
                <span className="text-3xl font-extrabold text-neutral-dark">£25.99</span>
                <span className="block text-xs text-neutral-mid">{s('training.priceCaption')}</span>
              </p>
              <Link href="/register?tier=training_only" className="inline-block rounded-btn bg-teal px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-dark">
                {s('training.cta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Full comparison matrix */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <SectionLabel>{s('compare.label')}</SectionLabel>
          <h2 className="mb-10 text-3xl font-extrabold text-neutral-dark">{s('compare.h2')}</h2>
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
                    {group.rows.map(row => {
                      const slug = toSlug(row.label)
                      const hasPage = linkedFeatures.has(slug)
                      return (
                      <tr key={row.label} className="border-b border-gray-100 last:border-0">
                        <td className="px-5 py-3 text-neutral-mid">
                          {hasPage ? (
                            <Link href={`/features/${slug}`} className="group inline-flex items-center gap-1.5 text-neutral-dark hover:text-teal">
                              {row.label}
                              <ArrowUpRight size={13} className="text-teal opacity-70 transition-opacity group-hover:opacity-100" aria-label={`Learn more about ${row.label}`} />
                            </Link>
                          ) : row.label}
                        </td>
                        <td className="px-5 py-3 text-center"><FeatureValue val={row.values[0]} /></td>
                        <td className="bg-teal-light/20 px-5 py-3 text-center"><FeatureValue val={row.values[1]} /></td>
                        <td className="px-5 py-3 text-center"><FeatureValue val={row.values[2]} /></td>
                      </tr>
                      )
                    })}
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
            {['guarantee.item1', 'guarantee.item2', 'guarantee.item3', 'guarantee.item4', 'guarantee.item5', 'guarantee.item6'].map(key => (
              <span key={key} className="flex items-center gap-2">
                <Check size={15} className="text-teal" /> {s(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-2xl px-6">
          <SectionLabel>{s('faq.label')}</SectionLabel>
          <h2 className="mb-12 text-3xl font-extrabold text-neutral-dark">{s('faq.h2')}</h2>
          <div className="space-y-3">
            {FAQ_KEYS.map(({ q, a }) => (
              <details key={q} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-bold text-neutral-dark">{s(q)}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-neutral-mid transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-6 pb-6">
                  <div className={`leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s(a) }} />
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
