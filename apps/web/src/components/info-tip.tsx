'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

// Small ⓘ that reveals an explanation on hover (desktop) or tap (touch).
export function InfoTip({ text, size = 13, align = 'center' }: { text: string; size?: number; align?: 'center' | 'right' }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label="More information"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-neutral-mid transition-colors hover:text-teal"
      >
        <Info size={size} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-6 z-30 w-60 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal leading-relaxed text-neutral-dark shadow-lg ${
            align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
