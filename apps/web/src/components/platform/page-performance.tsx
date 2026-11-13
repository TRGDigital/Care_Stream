'use client'

import { useEffect, useState } from 'react'
import { createPlatformClient } from '@/lib/platform-api'

// Per page Performance panel and the Update queue, for the platform blog console. Numbers come from
// /admin/page-performance and /admin/update-queue (Search Console and GA4 daily pull, our own sign ups,
// RalfyIndex submissions). Verdicts are the rules in services/page-metrics/verdict.ts.

// One colour per verdict, with a short word so colour is never the only signal. Used by the Performance
// buttons in the post and collection lists, the legend, the panel badge and the Update queue.
export const VERDICT_UI: Record<string, { short: string; meaning: string; cls: string; group: 'act' | 'hold' | 'good' | 'wait' }> = {
  striking_distance: { short: 'Refresh now', meaning: 'Position 8 to 20 with real impressions. Best return: add the queries it already ranks for and tighten the title.', cls: 'bg-orange-100 text-orange-900 border-orange-400', group: 'act' },
  declining:         { short: 'Declining', meaning: 'Impressions down 30% or more on the previous 28 days. Refresh at the next review.', cls: 'bg-red-100 text-red-800 border-red-400', group: 'act' },
  not_indexed:       { short: 'Not indexed', meaning: 'No impressions and no RalfyIndex submission. Submit it and inspect the URL.', cls: 'bg-red-200 text-red-900 border-red-500', group: 'act' },
  title_test:        { short: 'Test title', meaning: 'Top 10 position but few clicks. The title and description are not winning the click.', cls: 'bg-yellow-100 text-yellow-900 border-yellow-400', group: 'act' },
  cta:               { short: 'Fix CTA', meaning: 'Visits but no free sign ups. Strengthen the Benefits section and call to action.', cls: 'bg-blue-100 text-blue-900 border-blue-400', group: 'act' },
  recently_refreshed:{ short: 'Refreshed', meaning: 'Edited within the last 28 days. Hands off: it is being measured against the 28 days before.', cls: 'bg-purple-100 text-purple-900 border-purple-400', group: 'hold' },
  winning:           { short: 'Winning', meaning: 'Ranking well with a good click rate. Do not edit; link to it from newer pages.', cls: 'bg-green-100 text-green-800 border-green-400', group: 'good' },
  new:               { short: 'New', meaning: 'Under 14 days old. Too early to judge; check indexing at day 14.', cls: 'bg-sky-100 text-sky-800 border-sky-300', group: 'wait' },
  not_enough_data:   { short: 'Too early', meaning: 'Under 100 impressions in 28 days. Not enough data, so it is not judged.', cls: 'bg-gray-100 text-gray-600 border-gray-300', group: 'wait' },
  monitor:           { short: 'Monitor', meaning: 'Some traction, no action needed yet.', cls: 'bg-slate-100 text-slate-700 border-slate-300', group: 'wait' },
  prune:             { short: 'Merge?', meaning: 'Old and almost no impressions. Merge into a stronger page, redirect, or leave.', cls: 'bg-stone-300 text-stone-900 border-stone-500', group: 'hold' },
}
const badge = (key: string) => `inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${VERDICT_UI[key]?.cls ?? 'bg-gray-100 text-gray-700 border-gray-200'}`

/** The coloured Performance button: colour and a short word say what to do, so nobody has to click through. */
export function PerfButton({ verdict, onClick }: { verdict?: { key: string; reason: string } | null; onClick: () => void }) {
  const ui = verdict ? VERDICT_UI[verdict.key] : null
  return (
    <button type="button" onClick={onClick} title={verdict ? `${ui?.short}: ${verdict.reason}` : 'Performance'}
      className={`rounded-md border px-2 py-1 text-xs font-semibold hover:brightness-95 ${ui ? ui.cls : 'border-gray-200 bg-white text-neutral-mid'}`}>
      Performance{ui ? ` · ${ui.short}` : ''}
    </button>
  )
}

/** Legend for the colours, with a count per verdict and click-to-filter. */
export function PerfLegend({ counts, active, onPick }: { counts: Record<string, number>; active: string; onPick: (k: string) => void }) {
  const order = ['striking_distance', 'declining', 'not_indexed', 'title_test', 'cta', 'recently_refreshed', 'winning', 'prune', 'new', 'not_enough_data', 'monitor']
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-neutral-dark">Performance key:</span>
        <button onClick={() => onPick('all')} className={`rounded-full border px-2 py-0.5 ${active === 'all' ? 'border-teal bg-teal-light text-teal' : 'border-gray-200 text-neutral-mid'}`}>All</button>
        <button onClick={() => onPick('act')} className={`rounded-full border px-2 py-0.5 font-semibold ${active === 'act' ? 'border-teal bg-teal-light text-teal' : 'border-gray-300 text-neutral-dark'}`}>Needs action ({['striking_distance', 'declining', 'not_indexed', 'title_test', 'cta'].reduce((a, k) => a + (counts[k] ?? 0), 0)})</button>
        {order.map(k => (
          <button key={k} onClick={() => onPick(k)} title={VERDICT_UI[k].meaning}
            className={`rounded-full border px-2 py-0.5 font-semibold ${VERDICT_UI[k].cls} ${active === k ? 'ring-2 ring-teal' : ''}`}>{VERDICT_UI[k].short} ({counts[k] ?? 0})</button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-mid">Orange, red, yellow and blue need a decision. Purple means refreshed in the last 28 days: leave it alone while it is measured. Green is winning. Hover a button for the reason. Pages under 100 impressions in 28 days are never judged.</p>
    </div>
  )
}

const n = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString('en-GB'))
const pct = (v: number) => `${(v * 100).toFixed(1)}%`

function Spark({ values, color = '#0f766e' }: { values: number[]; color?: string }) {
  if (values.length < 2) return <p className="text-xs text-neutral-mid">No daily data yet.</p>
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 300},${44 - (v / max) * 40}`).join(' ')
  return <svg viewBox="0 0 300 48" className="h-12 w-full" role="img" aria-label="Trend"><polyline fill="none" stroke={color} strokeWidth="2" points={pts} /></svg>
}

export function PagePerformanceModal({ token, kind, slug, onClose }: { token: string; kind: 'blog' | 'collection'; slug: string; onClose: () => void }) {
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    createPlatformClient(token).pagePerformance(kind, slug).then(setD).catch(e => setErr(e?.message ?? 'Could not load'))
  }, [token, kind, slug])
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Performance · {kind}</p>
            <h2 className="text-lg font-extrabold text-neutral-dark">{d?.page?.title ?? slug}</h2>
            {d && <p className="text-xs text-neutral-mid">/{kind}/{slug} · {d.page.status} · baseline {d.baseline.label} {d.baseline.date} (day {d.baseline.age_days}){d.page.primary_keyword ? ` · primary keyword "${d.page.primary_keyword}"` : ''}</p>}
          </div>
          <button onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1 text-sm">Close</button>
        </div>
        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        {!d && !err && <p className="mt-6 text-sm text-neutral-mid">Loading…</p>}
        {d && (
          <div className="mt-5 space-y-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <span className={badge(d.verdict.key)}>{d.verdict.label}</span>
              <p className="mt-2 text-sm text-neutral-dark">{d.verdict.reason}</p>
              {!d.has_data && <p className="mt-2 text-xs text-neutral-mid">No Search Console data stored for this page yet. The daily job fills it in; a brand new page shows data after about 3 days.</p>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-neutral-dark">Checkpoints since {d.baseline.label} ({d.baseline.date})</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-neutral-mid"><th className="py-1">Day</th><th>Impressions</th><th>Clicks</th><th>Click rate</th><th>Avg position</th><th>Visits</th><th>Sign ups</th><th></th></tr></thead>
                <tbody>{d.windows.map((w: any) => (
                  <tr key={w.days} className="border-b border-gray-100"><td className="py-1.5 font-semibold">{w.days}</td><td>{n(w.impressions)}</td><td>{n(w.clicks)}</td><td>{pct(w.ctr)}</td><td>{n(w.position)}</td><td>{n(w.sessions)}</td><td>{n(w.signups)}</td>
                    <td className="text-xs text-neutral-mid">{w.complete ? 'complete' : 'in progress'}</td></tr>
                ))}</tbody>
              </table></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-3"><p className="text-xs text-neutral-mid">Last 28 days</p><p className="text-lg font-bold">{n(d.last28.impressions)} <span className="text-xs font-normal text-neutral-mid">impressions</span></p><p className="text-xs text-neutral-mid">{n(d.last28.clicks)} clicks · position {n(d.last28.position)} · {n(d.last28.sessions)} visits</p>{d.prev28 && <p className="text-xs text-neutral-mid">Previous 28: {n(d.prev28.impressions)} impressions</p>}</div>
              <div className="rounded-lg border border-gray-200 p-3"><p className="text-xs text-neutral-mid">Against its cluster</p><p className="text-lg font-bold">{d.cluster_avg_impressions_28d === null ? 'n/a' : n(d.cluster_avg_impressions_28d)}</p><p className="text-xs text-neutral-mid">average impressions per page in "{d.page.topic_cluster ?? 'no cluster'}" over 28 days</p></div>
              <div className="rounded-lg border border-gray-200 p-3"><p className="text-xs text-neutral-mid">Sign ups from this page</p><p className="text-lg font-bold">{n(d.signups.last28)} <span className="text-xs font-normal text-neutral-mid">last 28 days</span></p><p className="text-xs text-neutral-mid">{n(d.signups.total)} in total (links carry source=blog-{slug})</p></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><h3 className="mb-1 text-sm font-bold">Impressions, last 90 days</h3><Spark values={d.series.map((r: any) => r.impressions)} /></div>
              <div><h3 className="mb-1 text-sm font-bold">Clicks, last 90 days</h3><Spark values={d.series.map((r: any) => r.clicks)} color="#7c3aed" /></div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 text-sm">
              <h3 className="mb-1 text-sm font-bold">Indexing</h3>
              {d.indexing.submissions === 0 ? <p className="text-neutral-mid">Not yet submitted to RalfyIndex.</p>
                : <p className="text-neutral-dark">{d.indexing.submissions} submission{d.indexing.submissions === 1 ? '' : 's'} · first {String(d.indexing.first).slice(0, 10)} · last {String(d.indexing.last).slice(0, 10)}{d.indexing.failed ? ` · ${d.indexing.failed} failed` : ''}</p>}
              {d.primary_keyword_position && <p className="mt-1 text-neutral-dark">Primary keyword position {d.primary_keyword_position.position} ({n(d.primary_keyword_position.impressions)} impressions).</p>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold">Top queries (last 28 days)</h3>
              {d.queries.length === 0 ? <p className="text-sm text-neutral-mid">No queries stored yet.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-neutral-mid"><th className="py-1">Query</th><th>Impressions</th><th>Clicks</th><th>Position</th></tr></thead>
                  <tbody>{d.queries.map((q: any) => <tr key={q.query} className="border-b border-gray-100"><td className="py-1">{q.query}</td><td>{n(q.impressions)}</td><td>{n(q.clicks)}</td><td>{n(q.position)}</td></tr>)}</tbody></table></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function UpdateQueue({ token }: { token: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [filter, setFilter] = useState('action')
  const [open, setOpen] = useState<{ kind: 'blog' | 'collection'; slug: string } | null>(null)
  useEffect(() => { createPlatformClient(token).updateQueue().then(r => setRows(r.pages)).catch(() => setRows([])) }, [token])
  if (!rows) return <p className="text-sm text-neutral-mid">Loading the queue…</p>
  const ACTION = new Set(['striking_distance', 'title_test', 'declining', 'cta', 'not_indexed', 'prune'])
  const shown = rows.filter(r => filter === 'all' ? true : filter === 'action' ? ACTION.has(r.verdict.key) : r.verdict.key === filter)
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">Every published page, ranked by what to do next. Pages with under 100 impressions in 28 days are never judged. Nothing here edits a page: you approve each refresh.</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {[['action', 'Needs action'], ['striking_distance', 'Striking distance'], ['declining', 'Declining'], ['title_test', 'Title test'], ['cta', 'CTA'], ['winning', 'Winning'], ['all', 'All']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 ${filter === k ? 'border-teal bg-teal-light text-teal' : 'border-gray-200 text-neutral-mid'}`}>{l}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50 text-left text-xs text-neutral-mid"><th className="p-2">Page</th><th>Age</th><th>Impr. 28d</th><th>Pos.</th><th>Sign ups</th><th>Verdict</th><th></th></tr></thead>
          <tbody>{shown.map(r => (
            <tr key={r.kind + r.slug} className="border-b border-gray-100 align-top">
              <td className="p-2"><p className="font-medium text-neutral-dark">{r.title}</p><p className="text-xs text-neutral-mid">/{r.kind}/{r.slug}</p><p className="mt-1 text-xs text-neutral-mid">{r.verdict.reason}</p></td>
              <td className="whitespace-nowrap">{r.age_days}d</td><td>{n(r.impressions_28d)}</td><td>{n(r.position_28d)}</td><td>{n(r.signups_28d)}</td>
              <td><span className={badge(r.verdict.key)}>{r.verdict.label}</span></td>
              <td className="pr-2"><button onClick={() => setOpen({ kind: r.kind, slug: r.slug })} className="rounded-md border border-gray-200 px-2 py-1 text-xs">Performance</button></td>
            </tr>))}
            {shown.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-sm text-neutral-mid">Nothing in this view yet. Data fills in after the first daily run.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <PagePerformanceModal token={token} kind={open.kind} slug={open.slug} onClose={() => setOpen(null)} />}
    </div>
  )
}
