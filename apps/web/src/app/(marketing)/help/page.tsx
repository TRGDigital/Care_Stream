import Link from 'next/link'
import { PageHero, SectionLabel } from '@/components/marketing/ui'
import { HELP_CATEGORIES as CATEGORIES } from '@/lib/help-articles'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/help' },
  title: 'Help Centre',
  description: 'Step-by-step guides for getting the most out of CareStreamAI. Covering account setup, policy uploads, staff access, analytics, and CQC compliance features.',
  openGraph: {
    type: 'website',
    images: ['/og-image.png'],
    title: 'CareStreamAI Help Centre',
    description: 'Guides and support articles for CareStreamAI users.',
    url: 'https://www.carestreamai.com/help',
  },
}

const POPULAR = [
  { title: 'How do I upload a policy?', href: '/help/getting-started/upload-policy' },
  { title: 'How does multilingual support work?', href: '/help/languages/how-it-works' },
  { title: 'Is our data used to train AI models?', href: '/help/security/data-isolation' },
  { title: 'How do I generate a CQC Readiness Report?', href: '/help/analytics/cqc-report' },
  { title: 'What happens when I update a policy?', href: '/help/policies/update-policy' },
]

export default function HelpPage() {
  return (
    <>
      <PageHero
        label="Help Centre"
        title="How can we help?"
        subtitle="Guides, explanations, and answers for everything in CareStreamAI."
        centered
      />

      {/* Popular */}
      <section className="bg-white border-b border-gray-100 py-12">
        <div className="mx-auto max-w-content px-6">
          <p className="section-label mb-5 text-teal">Most Popular</p>
          <div className="flex flex-wrap gap-3">
            {POPULAR.map(({ title, href }) => (
              <Link
                key={title}
                href={href}
                className="rounded-pill border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-dark shadow-sm transition-colors hover:border-teal hover:text-teal"
              >
                {title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(({ icon, title, articles }) => (
              <div key={title} className="card-lift rounded-2xl bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-light text-2xl">{icon}</span>
                  <h2 className="font-bold text-neutral-dark">{title}</h2>
                </div>
                <ul className="space-y-2.5">
                  {articles.map(({ title: t, href }) => (
                    <li key={t}>
                      <Link href={href} className="flex items-center gap-2 text-sm text-neutral-mid hover:text-teal transition-colors">
                        <span className="text-gray-300">→</span> {t}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact support */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-extrabold text-neutral-dark">Can&apos;t find the answer?</h2>
          <p className="mb-10 text-lg text-neutral-mid">Our team responds to all support enquiries within one business day.</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/contact" className="btn-amber rounded-btn px-8 py-3.5 text-sm">Contact Support</Link>
            <Link href="/demo" className="btn-ghost-white rounded-btn border-2 border-gray-200 px-8 py-3.5 text-sm text-neutral-dark hover:border-teal hover:text-teal">Book a Demo</Link>
          </div>
        </div>
      </section>
    </>
  )
}
