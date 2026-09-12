'use client'

// The intro, clamped to two lines with a Read more.
//
// Long enough to answer the search, short enough that the grid is still near the top: on a
// collection page the products are the answer, and copy that pushes them below the fold
// costs the sale the page was written to make.
//
// Clamping is applied here and removed on click, and the button removes itself when the
// text already fits, so a two-line intro does not get a pointless control.

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function CollectionIntro({ html }: { html: string }) {
  const [open, setOpen] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (el) setNeedsToggle(el.scrollHeight > el.clientHeight + 2)
  }, [html])

  return (
    <div className="mt-4">
      <div
        ref={ref}
        className={`prose prose-lg max-w-none text-neutral-mid prose-a:text-teal ${open ? '' : 'line-clamp-2'}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {needsToggle && (
        <button type="button" onClick={() => setOpen(o => !o)}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline">
          {open ? 'Show less' : 'Read more'}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  )
}
