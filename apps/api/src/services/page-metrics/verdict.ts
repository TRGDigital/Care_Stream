// Decision rules for what to do with a page next. Pure functions: the same rules run for the
// per page panel and the Update queue, and are covered by verdict.test.ts. Thresholds are
// deliberately modest because CareStream is a young domain: a page under MIN_IMPRESSIONS has
// "not enough data" and is never judged, which is a valid outcome.

export const MIN_IMPRESSIONS = 100
export const PRUNE_BELOW = 25
export interface Win { impressions: number; clicks: number; position: number | null; sessions: number }
export interface VerdictInput {
  ageDays: number               // days since the baseline (published, or last refreshed)
  baselineKind?: 'published' | 'refreshed'   // what the baseline is: a refresh gets 28 days left alone to be measured
  submitted: boolean            // pushed to RalfyIndex at least once
  cur: Win                      // last 28 days
  prev: Win | null              // the 28 days before that, when the page is old enough
  signups: number               // sign ups in the last 28 days that came from this page
  topQueries: Array<{ query: string; impressions: number; position: number | null }>
}
export interface Verdict { key: string; label: string; reason: string; priority: number }

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export function decide(i: VerdictInput): Verdict {
  const { cur, prev } = i
  const ctr = cur.impressions > 0 ? cur.clicks / cur.impressions : 0
  const pos = cur.position
  const q = i.topQueries.filter(x => x.impressions >= 10).slice(0, 3).map(x => `"${x.query}"`).join(', ')

  if (i.baselineKind === 'refreshed' && i.ageDays < 28)
    return { key: 'recently_refreshed', label: 'Refreshed, measuring', reason: `Refreshed ${i.ageDays} day${i.ageDays === 1 ? '' : 's'} ago. Leave it alone until day 28, then compare against the 28 days before the refresh.`, priority: 0 }
  if (i.ageDays < 14) return { key: 'new', label: 'Too early', reason: `Day ${i.ageDays}. Nothing to judge yet; check it is indexed at day 14.`, priority: 0 }
  if (!i.submitted && cur.impressions === 0 && i.ageDays >= 14)
    return { key: 'not_indexed', label: 'Check indexing', reason: 'No impressions and no RalfyIndex submission on record. Submit it and inspect the URL in Search Console.', priority: 50 }
  if (cur.impressions < MIN_IMPRESSIONS) {
    // CareStream is young, so 25 to 99 impressions in 28 days is normal and is only watched; a page is a
    // prune candidate when it is old AND shows almost nothing.
    if (i.ageDays >= 85 && cur.impressions < PRUNE_BELOW) return { key: 'prune', label: 'Merge or redirect', reason: `Under ${PRUNE_BELOW} impressions in 28 days after ${i.ageDays} days. Merge into a stronger page, redirect, or leave it.`, priority: 10 }
    return { key: 'not_enough_data', label: 'Not enough data', reason: `${cur.impressions} impressions in 28 days (need ${MIN_IMPRESSIONS}). Keep waiting; do not edit.`, priority: 0 }
  }
  if (prev && prev.impressions >= MIN_IMPRESSIONS && cur.impressions <= prev.impressions * 0.7)
    return { key: 'declining', label: 'Refresh: declining', reason: `Impressions fell from ${prev.impressions} to ${cur.impressions} (${Math.round((1 - cur.impressions / prev.impressions) * 100)}% down). Refresh at the next review.`, priority: prev.impressions - cur.impressions }
  if (pos !== null && pos > 7.5 && pos <= 20)
    return { key: 'striking_distance', label: 'Refresh: striking distance', reason: `Average position ${pos.toFixed(1)} with ${cur.impressions} impressions. Add the queries it already ranks for${q ? ` (${q})` : ''} and tighten the title. Best return on effort.`, priority: cur.impressions }
  if (pos !== null && pos <= 10 && ctr < 0.01 && cur.impressions >= 200)
    return { key: 'title_test', label: 'Test title and description', reason: `Position ${pos.toFixed(1)} but only ${pct(ctr)} click through on ${cur.impressions} impressions. The snippet is not winning the click.`, priority: cur.impressions * 0.5 }
  if (cur.sessions >= 50 && i.signups === 0)
    return { key: 'cta', label: 'Change the call to action', reason: `${cur.sessions} visits and no free sign ups. Strengthen the Benefits section and the call to action.`, priority: cur.sessions * 2 }
  if (pos !== null && pos <= 7.5 && ctr >= 0.03)
    return { key: 'winning', label: 'Leave alone', reason: `Position ${pos.toFixed(1)}, ${pct(ctr)} click through. Do not edit; link to it from newer pages.`, priority: 0 }
  return { key: 'monitor', label: 'Monitor', reason: `Position ${pos !== null ? pos.toFixed(1) : 'n/a'}, ${cur.impressions} impressions. No action needed yet.`, priority: 1 }
}
