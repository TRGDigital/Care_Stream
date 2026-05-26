import Link from 'next/link'
import { Check, Minus, ChevronDown } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for CareStreamAI. From Starter plans for smaller homes to Enterprise for multi-site providers. 14-day free trial, no credit card required.',
  openGraph: {
    title: 'CareStreamAI Pricing',
    description: 'Simple, transparent pricing. 14-day free trial, no credit card required.',
    url: 'https://carestreamai.co.uk/pricing',
  },
}

const STARTER_FEATURES: Array<[string, string | boolean]> = [
  ['Policies stored',                    'Up to 25'          ],
  ['Staff handbooks',                    '1'                 ],
  ['Staff users',                        'Up to 10'          ],
  ['Query limit',                        '500/month'         ],
  ['Languages supported',                '50+'               ],
  ['Web chat interface',                 true                ],
  ['Email interface',                    true                ],
  ['WhatsApp interface',                 true                ],
  ['Voice input',                        true                ],
  ['External regulatory knowledge base', true                ],
  ['Document versioning',                true                ],
  ['Home knowledge base (auto)',         true                ],
  ['Home knowledge base (manual)',       'Up to 50 entries'  ],
  ['Basic analytics',                    true                ],
  ['Advanced analytics',                 false               ],
  ['CQC Readiness Report',               false               ],
  ['Policy gap detection',               false               ],
  ['Support',                            'Email support'     ],
  ['Free trial',                         '14 days'           ],
]

const PRO_FEATURES: Array<[string, string | boolean]> = [
  ['Policies stored',                    'Unlimited'                 ],
  ['Staff handbooks',                    'Unlimited'                 ],
  ['Staff users',                        'Unlimited'                 ],
  ['Query limit',                        '5,000/month'               ],
  ['Languages supported',                '50+'                       ],
  ['Web chat interface',                 true                        ],
  ['Email interface',                    true                        ],
  ['WhatsApp interface',                 true                        ],
  ['Voice input',                        true                        ],
  ['External regulatory knowledge base', true                        ],
  ['Document versioning',                true                        ],
  ['Home knowledge base (auto)',         true                        ],
  ['Home knowledge base (manual)',       'Unlimited'                 ],
  ['Basic analytics',                    true                        ],
  ['Advanced analytics',                 true                        ],
  ['CQC Readiness Report',               true                        ],
  ['Policy gap detection',               true                        ],
  ['Support',                            'Priority email and phone'  ],
  ['Free trial',                         '14 days'                   ],
]

const FAQS = [
  {
    q: 'What counts as a query?',
    a: 'Any message sent to CareStreamAI counts as one query, regardless of channel. This includes web chat messages, emails, WhatsApp messages, and WhatsApp voice notes. Follow-up messages in the same session or thread each count as one query.',
  },
  {
    q: 'How does WhatsApp access work?',
    a: 'Staff message your dedicated CareStreamAI WhatsApp number exactly as they would text a colleague. The manager adds staff phone numbers to the allowlist from the admin dashboard. No app download or login is needed for frontline staff. Voice notes sent via WhatsApp are also fully supported and answered automatically.',
  },
  {
    q: 'What happens if I reach my query limit?',
    a: 'You will receive a dashboard alert at 80% and 95% of your monthly usage. If you reach the limit, queries are queued until the next billing period begins, or you can upgrade instantly from the dashboard.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes. Upgrades take effect immediately. Downgrades take effect at the start of your next billing period.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. CareStreamAI is a rolling monthly subscription. Cancel any time with no penalty and no notice period.',
  },
  {
    q: 'Do you offer discounts for group operators?',
    a: 'Yes. Contact us for group pricing if you are managing multiple homes. We offer volume discounts from three homes or more.',
  },
  {
    q: 'Is the free trial the full product?',
    a: 'Yes. The 14-day trial gives you full access to the Professional plan, all features, no restrictions. No credit card is required to start.',
  },
  {
    q: 'Is my data kept separate from other organisations?',
    a: 'Yes. Every customer has a completely isolated environment. Your policy documents, knowledge base, query history, and staff data are never shared with or accessible by any other organisation. Your documents are never used to train AI models.',
  },
]

function FeatureValue({ val }: { val: string | boolean }) {
  if (val === true)  return <Check size={15} className="mx-auto text-teal" />
  if (val === false) return <Minus size={15} className="mx-auto text-gray-300" />
  return <span className="text-sm font-medium text-neutral-dark">{val}</span>
}

export default function PricingPage() {
  return (
    <>
      <PageHero
        label="Pricing"
        title="Simple pricing. No surprises."
        subtitle="Both plans include a 14-day free trial. No credit card required to start."
        centered
      />

      {/* Plan cards */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid gap-6 md:grid-cols-2">

            {/* Starter */}
            <div className="card-lift rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-mid">Starter</p>
              <p className="mb-1 text-4xl font-extrabold text-neutral-dark">
                £49<span className="text-base font-normal text-neutral-mid">/month</span>
              </p>
              <p className="mb-7 text-sm text-neutral-mid">£490/year, save £98</p>
              <Link href="/register" className="mb-8 block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal transition-colors hover:bg-teal-light">
                Start Free Trial
              </Link>
              <ul className="space-y-3 border-t border-gray-100 pt-6">
                {STARTER_FEATURES.map(([label, val]) => (
                  <li key={label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-mid">{label}</span>
                    <span className="text-right"><FeatureValue val={val} /></span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional */}
            <div className="card-lift relative rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
              <span className="absolute right-6 top-6 rounded-pill bg-amber-brand px-3 py-1 text-xs font-bold text-white">
                Most popular
              </span>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">Professional</p>
              <p className="mb-1 text-4xl font-extrabold text-white">
                £129<span className="text-base font-normal text-white/60">/month</span>
              </p>
              <p className="mb-7 text-sm text-white/60">£1,290/year, save £258</p>
              <Link href="/register" className="btn-amber mb-8 block rounded-btn px-6 py-3 text-center text-sm">
                Start Free Trial
              </Link>
              <ul className="space-y-3 border-t border-white/15 pt-6">
                {PRO_FEATURES.map(([label, val]) => (
                  <li key={label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/70">{label}</span>
                    <span className="text-right">
                      {val === true  ? <Check size={15} className="mx-auto text-white/70" /> :
                       val === false ? <Minus size={15} className="mx-auto text-white/30" /> :
                       <span className="text-sm font-medium text-white">{val}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Guarantee strip */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-wrap items-center justify-center gap-10 text-sm text-neutral-mid">
            {[
              '14-day free trial on any plan',
              'No credit card required',
              'No per-user fees',
              'All four channels included',
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
      <section className="bg-neutral-light py-24">
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
        sub="No credit card. No commitment. Your first policy answer in under an hour."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Talk to Sales First' }}
      />
    </>
  )
}
