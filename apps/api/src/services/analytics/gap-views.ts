// The detail for ONE policy of a regulation (pure, no database or AI, so it is cheap to test). See gap-detail.ts for how the views are built.
import type { GapDetail } from './gap-detail'

export const GAP_VIEWS_VERSION = 2

/** The detail for ONE policy: that policy as the target, only its items, its numbering and highlights. `viewKey` is the policy id (or 'new:<name>'); without one the first (most work) view is used.
 *  A detail with no views (nothing missing, or an old shape) is returned as it is. */
export function viewOfDetail(d: GapDetail, viewKey?: string | null, viewName?: string | null): GapDetail & { view_key: string | null } {
  const views = d.policy_views
  if (!views?.length) return { ...d, view_key: null }
  const byName = viewName ? views.find(x => x.policy.name.trim().toLowerCase() === viewName.trim().toLowerCase()) : undefined   // a rebuilt detail may route a little differently: the name still finds the right policy
  const v = (viewKey ? views.find(x => x.key === viewKey) : undefined) ?? byName ?? views[0]
  return {
    ...d,
    target_policy: v.policy.id ? { id: v.policy.id, name: v.policy.name } : null,
    suggested_new_policy_title: v.policy.id ? null : v.policy.name,
    requirements: [...d.requirements.filter(r => r.status === 'already_covered'), ...v.requirements],
    highlight_quotes: v.highlight_quotes, highlight_placements: v.highlight_placements, highlight_labels: v.highlight_labels,
    view_key: v.key,
  }
}
