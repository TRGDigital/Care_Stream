import { Check } from 'lucide-react'
import { PageHero, PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { pageMetadata } from '@/lib/page-meta'
import { HubChatMockup } from '@/components/marketing/hub-chat-mockup'
import { FaqAccordion } from '@/components/marketing/home-faq'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { TRUST_SLOTS } from '@/lib/page-slots/trust'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema } from '@/lib/schema'

// Overridable from the platform console (Blog → Pages / site_pages).
export const generateMetadata = () => pageMetadata('/trust', {
  title:       'Trust & Security | CareStreamAI',
  description: 'CareStreamAI only ever answers from your uploaded documents. No internet searches, no hallucinations, no cross-contamination. Here is how we keep your compliance data safe.',
})

export default async function TrustPage() {
  const s = makeSlot(TRUST_SLOTS, await getContentSlots('/trust'))
  const faqs = [1, 2, 3, 4, 5, 6].map(n => ({ question: s(`faq.q${n}.question`), answer: s(`faq.q${n}.answer`) }))
  return (
    <>
      <JsonLd data={faqPageSchema(faqs)} />
      <PageHero
        label={s('hero.label')}
        title={s('hero.title')}
        subtitle={s('hero.subtitle')}
      />

      {/* What staff see */}
      <section className="bg-neutral-light py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>{s('staff.label')}</SectionLabel>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
                {s('staff.h2')}
              </h2>
              <div
                className="text-lg leading-relaxed text-neutral-mid [&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{ __html: s('staff.body') }}
              />
            </div>
            <div className="flex justify-center lg:justify-end">
              <HubChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* How the AI works */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('ai.label')}</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">{s('ai.h2')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: '👤', key: 'ai.card1' },
              { icon: '⚙️', key: 'ai.card2' },
              { icon: '⚖️', key: 'ai.card3' },
            ].map(({ icon, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-light text-2xl">{icon}</div>
                <p className="mb-3 section-label text-teal">{s(`${key}.audience`)}</p>
                <p className="leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data commitments */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('data.label')}</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">{s('data.h2')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'data.c1' },
              { key: 'data.c2' },
              { key: 'data.c3' },
              { key: 'data.c4' },
              { key: 'data.c5' },
              { key: 'data.c6' },
              { key: 'data.c7' },
            ].map(({ key }) => (
              <div key={key} className="card-lift flex gap-4 rounded-2xl bg-white p-6 shadow-card">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                  <Check size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="mb-1 font-bold text-neutral-dark">{s(`${key}.title`)}</p>
                  <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-2xl px-6">
          <SectionLabel>{s('faq.label')}</SectionLabel>
          <h2 className="mb-12 text-3xl font-extrabold text-neutral-dark">{s('faq.h2')}</h2>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      <EditableContentBlock path="/trust" />

      <PageCta
        heading="Have more questions about security or data?"
        primary={{ href: '/contact', label: 'Talk to Our Team' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
