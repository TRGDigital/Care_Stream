'use client'

// One collapsible question on a /uses page. Client-side because the template
// itself is a server component and the accordion needs state.

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

export function UseCaseFaq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-neutral-dark">{q}</span>
        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${open ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid'}`}>
          {open ? <Minus size={12} /> : <Plus size={12} />}
        </span>
      </button>
      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-neutral-mid">{a}</p>}
    </div>
  )
}
