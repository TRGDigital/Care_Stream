// Which free tier sequence someone joins, from where they signed up.
//
//   an audit page (source audit-<slug>)            -> free_audits
//   a CPD course page (source cpd, or a course)     -> free_training
//   a policy page (source policy-<slug>)            -> free_policies
//   a blog post: the post's topic (audits, cpd, policy) decides, sent by the sign up page as `track`
//   anywhere else (pricing, home page, the overlay) -> free_general
//
// The sign up page sends `track` for blog sign ups, because the API only sees the source ("blog-<slug>"),
// not the post's topic. An explicit `track` wins over the source so that a mapping can be corrected in one place.

import type { CampaignKey } from './campaigns'

export type FreeTrack = 'audits' | 'training' | 'policies'

export function freeCampaignFor(opts: { source?: string | null; course?: string | null; track?: string | null }): CampaignKey {
  const t = opts.track
  if (t === 'audits') return 'free_audits'
  if (t === 'training') return 'free_training'
  if (t === 'policies') return 'free_policies'
  const source = opts.source ?? ''
  if (source.startsWith('audit-')) return 'free_audits'
  if (source === 'cpd' || opts.course) return 'free_training'
  if (source.startsWith('policy-')) return 'free_policies'
  return 'free_general'
}
