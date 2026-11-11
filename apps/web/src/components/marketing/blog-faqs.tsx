import { ChevronDown } from 'lucide-react'

interface Faq { question: string; answer: string }

// Blog post FAQ accordion. Native <details> so every answer is in the page HTML (crawlers and AI
// answer engines can read it; it used to render the answer only after a click). The FAQ JSON-LD
// for SEO is emitted separately on the page, so this is purely presentational.
export function BlogFaqs({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="not-prose mt-12 border-t border-gray-100 pt-8">
      <h2 className="mb-6 text-xl font-extrabold text-neutral-dark">Frequently asked questions</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="group overflow-hidden rounded-xl border border-gray-200 bg-white">
            <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left hover:bg-neutral-light/50 [&::-webkit-details-marker]:hidden">
              <span className="font-semibold text-neutral-dark">{f.question}</span>
              <ChevronDown size={18} className="shrink-0 text-neutral-mid transition-transform group-open:rotate-180" />
            </summary>
            <div
              className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-neutral-mid"
              dangerouslySetInnerHTML={{ __html: f.answer }}
            />
          </details>
        ))}
      </div>
    </div>
  )
}
