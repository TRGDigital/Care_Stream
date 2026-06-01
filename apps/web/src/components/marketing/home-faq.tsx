'use client'

import { useState } from 'react'
import { SectionLabel } from './ui'

export type Faq = { question: string; answer: string }

export function HomeFaq({ faqs }: { faqs: Faq[] }) {
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
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="text-center">
          <SectionLabel>FAQs</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark md:text-5xl">
            Frequently asked questions.
          </h2>
        </div>
        <div className="space-y-3 text-left">
          {faqs.map((f) => (
            <Item key={f.question} q={f.question} a={f.answer} />
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  )
}

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${open ? 'border-teal/30 bg-teal-light/30' : 'border-gray-100 bg-white shadow-card'}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-neutral-dark">{q}</span>
        <span className={`ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold transition-colors ${open ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid'}`}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="border-t border-teal/15 px-6 pb-6 pt-4">
          <p className="leading-relaxed text-neutral-mid">{a}</p>
        </div>
      )}
    </div>
  )
}
