'use client'

// "Also add to their next supervision": a tick box on the training assign screens, shown only when the account has training linked to
// supervisions (Enterprise, feature flag supervision_training). Ticking it AFTER the training is assigned adds one action ("Complete
// training: <course>") to each person's next booked supervision, tied to their enrolment so the action closes when the course is done.
// Nothing is added unless the box is ticked, and nothing is created for anyone without a booked supervision.
import { createApiClient } from '@/lib/api-client'
import { usePlanFeatures } from '@/lib/use-plan-features'

type Api = ReturnType<typeof createApiClient>
export type LinkRow = { user_id: string; name: string; result: 'linked' | 'already' | 'no_supervision' | 'not_enrolled'; supervision_on?: string }

/** On when the account has training linked to supervisions. Read from the plan features the admin pages already load (cached), so no extra call. */
export function useSupervisionLinkEnabled(_api?: Api | null): boolean {
  const { features } = usePlanFeatures()
  return features?.supervision_training === true
}

export function SupervisionLinkCheckbox({ checked, onChange, className = '' }: { checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border border-teal/25 bg-teal-light/20 px-3 py-2 text-sm text-neutral-dark ${className}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 accent-teal" />
      <span>
        Also add to their next supervision
        <span className="block text-xs text-neutral-mid">Adds an action to each person&rsquo;s next booked supervision. It closes by itself when they complete the course.</span>
      </span>
    </label>
  )
}

const day = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

/** Plain words for what happened. Pure, so it can be tested. */
export function describeLinkResults(rows: LinkRow[]): string {
  const linked = rows.filter(r => r.result === 'linked'), already = rows.filter(r => r.result === 'already')
  const none = rows.filter(r => r.result === 'no_supervision'), notEnrolled = rows.filter(r => r.result === 'not_enrolled')
  const names = (l: LinkRow[]) => l.length <= 4 ? l.map(r => r.name).join(', ') : `${l.slice(0, 4).map(r => r.name).join(', ')} and ${l.length - 4} more`
  const parts: string[] = []
  if (linked.length) parts.push(`Added to the next supervision for ${linked.length} ${linked.length === 1 ? 'person' : 'people'}${linked.length === 1 ? ` (${day(linked[0].supervision_on)})` : ''}.`)
  if (already.length) parts.push(`Already on their next supervision: ${names(already)}.`)
  if (none.length) parts.push(`No supervision is booked yet for ${names(none)}. Book one in Workforce, then add it again.`)
  if (notEnrolled.length) parts.push(`Not enrolled on the course, so nothing was added for ${names(notEnrolled)}.`)
  return parts.join(' ') || 'Nothing was added.'
}

/** Call after the training has been assigned. Returns the message to show; never throws (the training is already assigned). */
export async function linkAfterAssign(api: Api, userIds: string[], moduleId: string): Promise<string> {
  try { const r = await api.workforce.linkTraining(userIds, moduleId); return describeLinkResults(r.results) }
  catch { return 'The training was assigned, but it could not be added to their supervisions. Try again from the assign screen.' }
}
