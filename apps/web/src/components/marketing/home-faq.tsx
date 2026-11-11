import { SectionLabel } from './ui'

export type Faq = { question: string; answer: string }

// Headless accordion list + FAQ schema, for dropping into a page's own section
// (keeps that page's heading). HomeFaq wraps this in the standard FAQ section.
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  if (!faqs || faqs.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return (
    <div className="space-y-3 text-left">
      {faqs.map((f) => (
        <Item key={f.question} q={f.question} a={f.answer} />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}

export function HomeFaq({ faqs }: { faqs: Faq[] }) {
  if (!faqs || faqs.length === 0) return null

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="text-center">
          <SectionLabel>FAQs</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark md:text-5xl">
            Frequently asked questions.
          </h2>
        </div>
        <FaqAccordion faqs={faqs} />
      </div>
    </section>
  )
}

// A native <details> so the answer is in the page HTML whether or not it is open: crawlers and AI
// answer engines read it, and the FAQPage markup above describes text that is really on the page.
// (It used to render the answer only after a click, so the text was missing from the HTML.)
function Item({ q, a }: { q: string; a: string }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-colors open:border-teal/30 open:bg-teal-light/30 open:shadow-none">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between px-6 py-5 text-left [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-neutral-dark">{q}</span>
        <span className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-light text-lg font-bold text-neutral-mid transition-colors group-open:bg-teal group-open:text-white">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">{'\u2212'}</span>
        </span>
      </summary>
      <div className="border-t border-teal/15 px-6 pb-6 pt-4">
        <p className="leading-relaxed text-neutral-mid">{a}</p>
      </div>
    </details>
  )
}
