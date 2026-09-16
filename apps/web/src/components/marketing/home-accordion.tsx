'use client'

import { useState } from 'react'

// The home page's accordions, in the theme's markup (.acc > .acc-item > button.acc-head +
// .acc-body, a chevron in the head) and with its behaviour: one open at a time, the first open
// to begin with, and clicking the open one closes it.

const Chev = () => (
  <span className="chev">
    <svg viewBox="0 0 12 8" fill="none" aria-hidden="true">
      <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  </span>
)

export function HomeAccordion({ items, style }: {
  items: { title: string; body: string }[]
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="acc" style={style}>
      {items.map((it, i) => (
        <div className={`acc-item${open === i ? ' open' : ''}`} key={i}>
          <button type="button" className="acc-head" aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}>
            {it.title}
            <Chev />
          </button>
          <div className="acc-body">{it.body}</div>
        </div>
      ))}
    </div>
  )
}
