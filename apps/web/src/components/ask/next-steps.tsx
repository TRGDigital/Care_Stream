'use client'

// HOUSE RULE 7: after an agent has produced anything it ends with next step BUTTONS for the next stage, the most likely first (the main button). An `ask` button sends a short structured
// choice back to the agent, an `action` button runs a screen action (save, print, share, edit...), a `link` opens one of our own pages. A small "Something else" box is always there too.
import { useState } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import { formatNext, formatSomethingElse, type NextAction, type NextStep } from '@/lib/ask-blocks'
import { GoBack } from '@/components/ask/go-back'
import type { StepWithReason } from '@/lib/ask-status-steps'

export function NextStepsBar({ steps, disabled, onAsk, onAction, onBack }: { steps: StepWithReason[]; disabled?: boolean; onAsk: (message: string) => void; onAction: (action: NextAction, step: NextStep) => void; /** HOUSE RULE 14: a quiet way back to the step before. */ onBack?: () => void }) {
  const [other, setOther] = useState('')
  return (
    <div className="mt-3 border-t border-gray-100 pt-3" role="group" aria-label="Next steps">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">What next?</p>
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => {
          const cls = `inline-flex min-h-[38px] items-center rounded-lg px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50 ${i === 0 ? 'bg-teal text-white hover:bg-teal-dark' : 'border border-teal text-teal hover:bg-teal/5'}`
          // A step that cannot be used yet stays visible but greyed, with its reason underneath (HOUSE RULE 15).
          if (s.reason) return <span key={s.id} className="inline-flex flex-col"><button type="button" disabled aria-disabled="true" title={s.reason} className="inline-flex min-h-[38px] cursor-not-allowed items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-neutral-mid">{s.label}</button><span className="mt-0.5 text-[11px] text-neutral-mid">{s.reason}</span></span>
          if (s.kind === 'link' && s.payload) return <Link key={s.id} href={s.payload} className={cls}>{s.label}</Link>
          return <button key={s.id} type="button" disabled={disabled} className={cls} onClick={() => s.kind === 'action' ? onAction(s.payload as NextAction, s) : onAsk(formatNext(s))}>{s.label}</button>
        })}
      </div>
      <form className="mt-2 flex items-center gap-2" onSubmit={e => { e.preventDefault(); const t = other.trim(); if (t) { onAsk(formatSomethingElse(t)); setOther('') } }}>
        <label htmlFor="next-else" className="sr-only">Something else</label>
        <input id="next-else" value={other} disabled={disabled} onChange={e => setOther(e.target.value)} maxLength={600} placeholder="Something else..." className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
        <button type="submit" disabled={disabled || !other.trim()} className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><Send size={12} aria-hidden="true" /> Send</button>
      </form>
      {onBack && <div className="mt-2"><GoBack onBack={onBack} disabled={disabled} /></div>}
    </div>
  )
}

/** What was clicked, shown back as the person's message. */
export const nextChoiceText = (label: string) => `You chose: ${label}`
