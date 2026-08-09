'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

// Counts down to a FIXED deadline (same target for every visitor — not a per-visitor
// rolling reset, which would be a misleading dark pattern). Renders nothing until
// mounted (avoids hydration mismatch) and once the deadline has passed.
export function GoCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const target = new Date(endsAt).getTime()
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (remaining === null || remaining <= 0) return null

  const s = Math.floor(remaining / 1000)
  const days = Math.floor(s / 86400)
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-brand/10 px-3 py-1 text-sm font-bold text-amber-brand [font-variant-numeric:tabular-nums]">
      <Clock size={14} />
      {days > 0
        ? <>Offer ends in {days}d {hh}:{mm}:{ss}</>
        : <>Offer ends today: {hh}:{mm}:{ss}</>}
    </span>
  )
}
