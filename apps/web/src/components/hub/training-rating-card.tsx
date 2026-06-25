'use client'

import { useState } from 'react'
import { createApiClient } from '@/lib/api-client'

function RScale({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-medium text-neutral-dark">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition-colors ${value === n ? 'border-teal bg-teal text-white' : 'border-gray-200 text-neutral-mid hover:border-teal/50'}`}>{n}</button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-mid"><span>{low}</span><span>{high}</span></div>
    </div>
  )
}

// A short, optional rating shown after a piece of training is completed. Feeds the
// "Effectiveness of Training" analytics (confidence to apply + usefulness).
export function TrainingRatingCard({ token, area, refId, title = 'Quick feedback (optional)', onDone }: {
  token: string
  area: 'training' | 'annual' | 'followup' | 'cqc'
  refId?: string
  title?: string
  onDone?: () => void
}) {
  const [confidence, setConfidence] = useState<number | null>(null)
  const [usefulness, setUsefulness] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)

  function finish(submit: boolean) {
    if (submit && (confidence != null || usefulness != null || comment.trim())) {
      createApiClient(token).me.rateTraining({ area, ref: refId, confidence: confidence ?? undefined, usefulness: usefulness ?? undefined, comment: comment.trim() || undefined }).catch(() => {})
    }
    setDone(true)
    onDone?.()
  }

  if (done) return (
    <div className="rounded-xl border border-gray-100 bg-neutral-light/40 px-4 py-3 text-center text-xs text-neutral-mid">Thanks for your feedback.</div>
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-3 text-center text-sm font-semibold text-neutral-dark">{title}</p>
      <RScale label="How confident do you feel using this in your work?" low="Not at all" high="Very confident" value={confidence} onChange={setConfidence} />
      <RScale label="How useful was this training for your role?" low="Not useful" high="Very useful" value={usefulness} onChange={setUsefulness} />
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Anything to add? (optional)" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
      <div className="mt-3 flex justify-center gap-2">
        <button type="button" onClick={() => finish(true)} disabled={confidence == null && usefulness == null && !comment.trim()} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">Submit feedback</button>
        <button type="button" onClick={() => finish(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-teal/40">Skip</button>
      </div>
    </div>
  )
}
