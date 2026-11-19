'use client'

// "Training brief" for the supervisions screen: opens on a click, shown only when the account has training linked to supervisions.
import { useEffect, useState } from 'react'
import { Loader2, GraduationCap, ChevronDown } from 'lucide-react'
import { createApiClient, type TrainingBrief } from '@/lib/api-client'
import { TrainingBriefView } from '@/components/shared/training-brief-view'
import { usePlanFeatures } from '@/lib/use-plan-features'

export function useSupervisionTraining(_token?: string): boolean {
  const { features } = usePlanFeatures()
  return features?.supervision_training === true
}

export function AdminTrainingBrief({ token, userId, name }: { token: string; userId: string; name: string }) {
  const enabled = useSupervisionTraining(token)
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState<TrainingBrief | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (!open || brief || err) return
    createApiClient(token).workforce.trainingBrief(userId).then(r => setBrief(r.brief)).catch(() => setErr('Could not load the brief.'))
  }, [open, brief, err, token, userId])
  if (!enabled) return null
  return (
    <div className="overflow-hidden rounded-lg border border-teal/25 bg-white">
      <button type="button" onClick={() => { if (open) setErr(''); setOpen(o => !o) }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-teal-light/20">
        <GraduationCap size={15} className="text-teal" />
        <span className="flex-1 text-sm font-semibold text-neutral-dark">Training brief for {name}</span>
        <span className="text-xs text-neutral-mid">{open ? 'Hide' : 'See before the meeting'}</span>
        <ChevronDown size={14} className={`text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          {err ? <p className="text-sm text-red-700">{err}</p> : brief ? <TrainingBriefView brief={brief} /> : <Loader2 size={16} className="animate-spin text-neutral-mid" />}
        </div>
      )}
    </div>
  )
}
