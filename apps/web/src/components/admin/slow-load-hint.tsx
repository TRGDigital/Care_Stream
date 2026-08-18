'use client'

// Explains a slow wait, revealed in stages.
//
// Some analyses genuinely take several seconds — opening a gap searches every policy for
// related wording, then asks the model to draft suggestions. A bare spinner gives the tenant
// no way to tell "working hard" from "stuck", so they refresh, which starts the whole thing
// again.
//
// The stages are keyed off elapsed time, and are deliberately worded as an explanation of
// what the step involves rather than a claim about which part is running right now. The work
// happens in a single request, so real progress isn't observable from here and pretending
// otherwise would be inventing detail we don't have.

import { useEffect, useState } from 'react'

export type HintStage = { after: number; text: string }

export default function SlowLoadHint({ stages, className = '' }: { stages: HintStage[]; className?: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Latest stage whose threshold has passed.
  const active = [...stages].sort((a, b) => b.after - a.after).find(s => elapsed >= s.after)
  if (!active) return null

  return (
    <p
      // Announced politely so the explanation reaches screen readers too, without
      // interrupting whatever they're on.
      aria-live="polite"
      className={`max-w-sm text-center text-xs leading-relaxed text-neutral-mid ${className}`}
    >
      {active.text}
    </p>
  )
}
