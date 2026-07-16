'use client'

import { useState } from 'react'

type FaqItem = { q: string; a: string }
type FaqGroup = { title: string; items: FaqItem[] }

export function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="space-y-14">
      {groups.map(({ title, items }) => (
        <div key={title}>
          <h2 className="mb-6 text-xl font-extrabold text-neutral-dark">{title}</h2>
          <div className="space-y-3">
            {items.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqItem({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${open ? 'border-teal/30 bg-teal-light/30' : 'border-gray-100 bg-white shadow-card'}`}>
      <button
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
          <p className="leading-relaxed text-neutral-mid [&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2" dangerouslySetInnerHTML={{ __html: a }} />
        </div>
      )}
    </div>
  )
}
