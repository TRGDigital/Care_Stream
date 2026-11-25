'use client'

// "Working on it" while an agent thinks. The sentence changes every few seconds and starts differently each time. A screen reader hears one steady "Working on your request", not every change.
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { linesFor, nextLine, ROTATE_MS } from '@/lib/thinking-lines'

let lastShown: string | null = null   // across waits in this tab, so the next wait does not start on the same line

export function ThinkingLine({ agentId }: { agentId?: string | null }) {
  const pool = useRef(linesFor(agentId))
  const [line, setLine] = useState<string>(() => { const l = nextLine(pool.current, lastShown); lastShown = l; return l })
  useEffect(() => {
    const t = setInterval(() => setLine(prev => { const l = nextLine(pool.current, prev); lastShown = l; return l }), ROTATE_MS)
    return () => clearInterval(t)
  }, [])
  return (
    <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status" aria-live="polite">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Working on your request</span>
      <span aria-hidden="true">{line}</span>
    </p>
  )
}
