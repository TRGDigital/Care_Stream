'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Faq { question: string; answer: string }

// Blog post FAQ accordion (single-open). The FAQ JSON-LD for SEO is emitted
// separately on the page, so this is purely presentational.
export function BlogFaqs({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <div className="not-prose mt-12 border-t border-gray-100 pt-8">
      <h2 className="mb-6 text-xl font-extrabold text-neutral-dark">Frequently asked questions</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = openId === i
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                onClick={() => setOpenId(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-neutral-light/50"
              >
                <span className="font-semibold text-neutral-dark">{f.question}</span>
                <ChevronDown size={18} className={`shrink-0 text-neutral-mid transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div
                  className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-neutral-mid"
                  dangerouslySetInnerHTML={{ __html: f.answer }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
