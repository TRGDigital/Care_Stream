'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

// One overlay for every long analysis on /gaps (coverage, cross-policy, CQC wording). These runs are driven from this page, so leaving the page pauses them.
// It blocks the page, says plainly to stay, warns before a refresh or close, and offers a deliberate Stop (progress is kept and Resume carries on).
// It only ever says what is happening and what the tenant can do, never how the check works.

const TIPS = [
  'When you have changed a policy, tick Mark as updated and it leaves the list.',
  'Your results appear on this page as soon as the check finishes.',
  'Large libraries take several minutes. This is normal.',
  'Every item is checked, so nothing in your library is skipped.',
]

/** Ask the browser to confirm before the tab is closed or refreshed, for as long as `active` is true. */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}

export function RunOverlay({ title, unit, progress, phase, onStop }: {
  title: string
  unit: string                                  // 'regulations' or 'policies'
  progress: { done: number; total: number } | null
  phase?: string | null                         // a short plain line for a stage with no count, e.g. 'Comparing your policies'
  onStop?: () => void
}) {
  const [tip, setTip] = useState(0)
  const [confirmStop, setConfirmStop] = useState(false)
  useLeaveWarning(true)
  useEffect(() => { const t = setInterval(() => setTip(n => (n + 1) % TIPS.length), 9000); return () => clearInterval(t) }, [])
  const hasCount = !!progress && progress.total > 0
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
        <Loader2 size={30} className="mx-auto animate-spin text-teal" />
        <h2 className="mt-3 text-lg font-bold text-neutral-dark">{title}</h2>
        <p className="mt-1 text-sm text-neutral-mid">
          {phase
            ? phase
            : hasCount
              ? <>Checked <strong className="text-neutral-dark">{progress!.done}</strong> of <strong className="text-neutral-dark">{progress!.total}</strong> {unit}.</>
              : 'Getting started…'}
        </p>
        {hasCount && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${Math.min(100, Math.round((progress!.done / progress!.total) * 100))}%` }} />
          </div>
        )}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-amber-800">
            Please stay on this page until it finishes. If you leave or refresh, it pauses. Your progress is saved, and you can resume from where it stopped.
          </p>
        </div>
        <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-neutral-mid">{TIPS[tip]}</p>
        {onStop && (confirmStop
          ? (
            <div className="mt-2 text-xs text-neutral-mid">
              Stop the check? What is finished is kept.{' '}
              <button type="button" onClick={onStop} className="font-semibold text-red-600 hover:underline">Yes, stop</button>
              <span className="mx-1.5">or</span>
              <button type="button" onClick={() => setConfirmStop(false)} className="font-semibold text-teal hover:underline">Keep going</button>
            </div>
          )
          : <button type="button" onClick={() => setConfirmStop(true)} className="mt-2 text-xs text-neutral-mid underline-offset-2 hover:text-neutral-dark hover:underline">Stop the check</button>)}
      </div>
    </div>
  )
}
