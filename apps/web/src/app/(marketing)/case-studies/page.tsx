import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'Case Studies',
  description: 'See how UK care providers have used CareStreamAI to reduce out-of-hours manager calls, support international staff, and build stronger CQC inspection evidence.',
  openGraph: {
    title: 'CareStreamAI Case Studies',
    description: 'Real results from UK care providers using CareStreamAI.',
    url: 'https://carestreamai.com/case-studies',
  },
}

const CASE_STUDIES = [
  {
    tag: 'Residential Care',
    icon: '🏠',
    title: 'Night shift confidence at a 45-bed residential home',
    summary: 'A registered manager was receiving 4–6 calls per week from night staff asking policy questions. After deploying CareStreamAI, out-of-hours calls dropped to near zero within the first month.',
    metrics: [
      { label: 'Out-of-hours calls', before: '4–6 per week', after: 'Near zero' },
      { label: 'Time to answer', before: '10–30 minutes', after: 'Under 30 seconds' },
    ],
    quote: "Night staff actually feel supported now. They get the answer they need without waking me up, and I know the right procedure was followed.",
    attribution: 'Registered Manager, 45-bed residential home',
    initials: 'JM',
  },
  {
    tag: 'Domiciliary Care',
    icon: '🚗',
    title: 'Policy access for a 60% overseas workforce',
    summary: 'A domiciliary provider with a predominantly overseas workforce was spending significant time on induction support. With CareStreamAI, new starters could ask policy questions in their own language from day one.',
    metrics: [
      { label: 'Languages used', before: '—', after: '11' },
      { label: 'HR query load', before: 'High (ongoing)', after: 'Reduced by ~60%' },
    ],
    quote: "Our Romanian and Filipino carers told us they felt included for the first time. They didn't have to guess, they could just ask.",
    attribution: 'HR Director, domiciliary care provider',
    initials: 'AO',
  },
  {
    tag: 'Group Operator',
    icon: '🏢',
    title: 'CQC inspection evidence, built automatically across 4 homes',
    summary: "A group operator with four homes was manually assembling inspection evidence for each CQC visit. CareStreamAI's CQC Readiness Report replaced that process entirely.",
    metrics: [
      { label: 'Evidence prep time', before: '2–3 days per inspection', after: 'One click export' },
      { label: 'Homes covered', before: 'Manually, one at a time', after: 'All 4 in a single report' },
    ],
    quote: 'When the inspector arrived, I handed over a 12-page evidence document showing exactly how our team engages with our policies. That conversation used to take hours to prepare.',
    attribution: 'Operations Director, 4-home group',
    initials: 'PT',
  },
]

export default function CaseStudiesPage() {
  return (
    <>
      <PageHero
        label="Case Studies"
        title="Real results. Real care settings."
        subtitle="How care organisations are using CareStreamAI to support their teams, reduce manager burden, and build continuous compliance evidence."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="space-y-20">
            {CASE_STUDIES.map(({ tag, icon, title, summary, metrics, quote, attribution, initials }, i) => (
              <div key={title} className={`grid gap-12 lg:grid-cols-2 lg:items-start ${i % 2 !== 0 ? 'lg:grid-flow-col-dense' : ''}`}>
                <div className={i % 2 !== 0 ? 'lg:col-start-2' : ''}>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-pill bg-teal-light px-4 py-1.5">
                    <span>{icon}</span>
                    <span className="text-xs font-bold text-teal">{tag}</span>
                  </div>
                  <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark">{title}</h2>
                  <p className="mb-8 text-lg leading-relaxed text-neutral-mid">{summary}</p>
                  <div className="rounded-2xl border-l-4 border-teal bg-teal-light px-7 py-6">
                    <p className="mb-4 text-lg italic leading-relaxed text-neutral-dark">&ldquo;{quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{initials}</div>
                      <p className="text-sm font-semibold text-neutral-dark">{attribution}</p>
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col gap-5 justify-center ${i % 2 !== 0 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                  {metrics.map(({ label, before, after }) => (
                    <div key={label} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                      <p className="mb-5 font-bold text-neutral-dark">{label}</p>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="rounded-xl bg-neutral-light p-4 text-center">
                          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-neutral-mid">Before</p>
                          <p className="text-sm text-neutral-mid">{before}</p>
                        </div>
                        <div className="rounded-xl bg-teal-light p-4 text-center">
                          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-teal">After</p>
                          <p className="font-bold text-neutral-dark">{after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageCta
        heading="Want to see results like these in your organisation?"
        sub="14-day free trial. No credit card required."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
