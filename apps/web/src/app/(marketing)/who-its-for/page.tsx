import Link from 'next/link'
import { Check } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = { title: "Who It's For — CareStreamAI" }

const PERSONAS = [
  {
    badge: 'Registered Manager',
    icon: '🏠',
    headline: "Policy support for your team — even when you're not there.",
    benefits: [
      'Staff on night shifts get instant policy answers without calling you — reducing out-of-hours interruptions and giving your team confidence to act correctly.',
      'Your CQC Readiness Report is built automatically — showing inspectors exactly how your team engages with your policies.',
      'When a policy is updated, CareStreamAI tracks whether staff accessed the new version — so you know the change actually reached your team.',
      'Policy gap detection tells you what your library is missing before a CQC inspector asks.',
    ],
    scenario: "It's 3am. A care worker is unsure about the post-fall observation schedule. They email CareStreamAI. Within 30 seconds they have the correct procedure from your approved falls policy. You start your shift to find the query logged and the right procedure followed.",
  },
  {
    badge: 'HR Director / People Lead',
    icon: '👥',
    headline: 'Stop answering the same questions. Let your handbook answer them.',
    benefits: [
      'Annual leave, sickness procedures, disciplinary processes — staff get instant answers from your actual handbook, 24 hours a day, without HR intervention.',
      'New starters — including international recruits — can ask questions about their employment terms in their own language from day one.',
      'Handbook access is fully logged — you can see which sections staff query most, revealing where your onboarding communications may need improving.',
      'Reduces repetitive HR query load, freeing your team for the work that requires human judgement.',
    ],
    scenario: null,
  },
  {
    badge: 'Operations Director',
    icon: '📊',
    headline: 'One policy library. Consistent answers. Across every home.',
    benefits: [
      'All homes draw from the same centrally managed, approved policy library — eliminating version drift and inconsistent practice.',
      'Per-home analytics show which sites are engaged and where to focus support.',
      'When a policy is updated centrally, you can see which homes\' staff accessed the new version — proof the change reached the team.',
      'Group CQC Readiness Report covers all homes in a single export.',
    ],
    scenario: null,
  },
  {
    badge: 'Finance Director / Owner',
    icon: '💼',
    headline: 'An ROI you can calculate in under five minutes.',
    benefits: [
      'If CareStreamAI saves each manager one hour per week of policy query handling, it pays for itself in the first month.',
      'Reduces procedural risk by ensuring staff act on correct, approved guidance — with a full audit trail to demonstrate due diligence.',
      'Reduces CQC preparation time — inspection evidence is built automatically, not assembled manually under pressure.',
      'Improves staff confidence and reduces early turnover — particularly for international recruits who gain full policy access in their own language from day one.',
    ],
    scenario: null,
  },
]

export default function WhoItsForPage() {
  return (
    <>
      <PageHero
        label="Who It's For"
        title="Built for every role in your organisation."
        subtitle="CareStreamAI solves different problems for different people. Here's what it means for your role."
      />

      <div>
        {PERSONAS.map(({ badge, icon, headline, benefits, scenario }, i) => (
          <section key={badge} className={`py-24 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-light'}`}>
            <div className="mx-auto max-w-content px-6">
              <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
                {/* Left — badge + headline */}
                <div className="lg:sticky lg:top-28">
                  <div className="mb-5 inline-flex items-center gap-3 rounded-pill bg-teal px-5 py-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-bold text-white">{badge}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">{headline}</h2>
                </div>

                {/* Right — benefits + scenario */}
                <div>
                  <ul className="mb-8 space-y-5">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-start gap-4">
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-light">
                          <Check size={13} className="text-teal" />
                        </span>
                        <p className="leading-relaxed text-neutral-mid">{b}</p>
                      </li>
                    ))}
                  </ul>
                  {scenario && (
                    <div className="rounded-2xl border-l-4 border-teal bg-teal-light px-7 py-6">
                      <p className="mb-2 section-label text-teal">Scenario</p>
                      <p className="italic leading-relaxed text-neutral-dark">{scenario}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <PageCta
        heading="Whoever you are — CareStreamAI was built for you."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
