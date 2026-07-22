import { FaqAccordion } from './faq-accordion'
import { PageHero, PageCta } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema } from '@/lib/schema'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { FAQ_SLOTS } from '@/lib/page-slots/faq'

export const metadata = {
  title: 'FAQ',
  description: 'Everything you need to know about CareStreamAI — how the AI works, what it can and cannot do, data security, pricing, and getting started. Answered plainly.',
  openGraph: {
    title: 'CareStreamAI FAQ',
    description: 'Answers to the most common questions about CareStreamAI — plain and direct.',
    url: 'https://www.carestreamai.com/faq',
  },
}

// Section title slot + number of question/answer pairs per section. The actual
// copy lives in FAQ_SLOTS and is editable from the platform (Main site pages → /faq).
const FAQ_SECTIONS = [
  { titleKey: 'general.title',   prefix: 'general',   count: 5 },
  { titleKey: 'ai.title',        prefix: 'ai',        count: 5 },
  { titleKey: 'security.title',  prefix: 'security',  count: 6 },
  { titleKey: 'languages.title', prefix: 'languages', count: 4 },
  { titleKey: 'pricing.title',   prefix: 'pricing',   count: 5 },
  { titleKey: 'getting.title',   prefix: 'getting',   count: 5 },
]

export default async function FaqPage() {
  const s = makeSlot(FAQ_SLOTS, await getContentSlots('/faq'))
  const FAQ_GROUPS = FAQ_SECTIONS.map(({ titleKey, prefix, count }) => ({
    title: s(titleKey),
    items: Array.from({ length: count }, (_, i) => ({
      q: s(`${prefix}.q${i + 1}`),
      a: s(`${prefix}.a${i + 1}`),
    })),
  }))
  const ALL_FAQS = FAQ_GROUPS.flatMap(g => g.items).map(i => ({ question: i.q, answer: i.a }))

  return (
    <>
      <JsonLd data={faqPageSchema(ALL_FAQS)} />
      <PageHero
        label={s('header.label')}
        title={s('header.title')}
        subtitle={s('header.subtitle')}
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <FaqAccordion groups={FAQ_GROUPS} />
        </div>
      </section>

      <EditableContentBlock path="/faq" />

      <PageCta
        heading="Still have a question?"
        sub="We respond to all enquiries within one business day."
        primary={{ href: '/contact', label: 'Contact Us' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
