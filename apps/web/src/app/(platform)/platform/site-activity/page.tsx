'use client'

// What visitors do on the public site: pages, time on page, clicks, sign up and demo activity, where they came from, and recent journeys.
// Built from the site's own tracker (components/marketing/site-tracker.tsx), which records only visitors who accepted analytics cookies.
// The "real" counts (accounts created, demo requests, contact enquiries) come from the database and include everyone.
import { useEffect, useState } from 'react'
import { Loader2, Eye, Users, Clock, LogOut, Repeat, Radio, UserPlus, CalendarCheck, Mail, ChevronDown } from 'lucide-react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type SiteActivityData } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'

const RANGES: Array<[number, string]> = [[1, 'Last 24 hours'], [7, '7 days'], [30, '30 days'], [90, '90 days']]
const secs = (n: number) => n >= 60 ? `${Math.floor(n / 60)}m ${n % 60}s` : `${n}s`
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Tile({ label, value, sub, Icon }: { label: string; value: string | number; sub?: string; Icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid"><Icon size={13} className="text-teal" /> {label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-dark">{value}</p>
      {sub ? <p className="text-xs text-neutral-mid">{sub}</p> : null}
    </div>
  )
}
function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-dark">{title}</h2>
      {note ? <p className="mb-2 text-xs text-neutral-mid">{note}</p> : <div className="mb-2" />}
      {children}
    </section>
  )
}

export default function SiteActivityPage() {
  const token = usePlatformAuth()
  const [days, setDays] = useState(7)
  const [data, setData] = useState<SiteActivityData | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [mine, setMine] = useState(false)
  useEffect(() => { try { setMine(localStorage.getItem('cs_internal') === '1') } catch { /* ignore */ } }, [])
  useEffect(() => {
    if (!token) return
    let live = true; setLoading(true); setErr('')
    createPlatformClient(token).siteActivity(days).then(r => { if (live) setData(r) }).catch(e => { if (live) setErr(e?.message ?? 'Could not load site activity.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, days])
  function toggleMine() { try { if (mine) localStorage.removeItem('cs_internal'); else localStorage.setItem('cs_internal', '1'); setMine(!mine) } catch { /* ignore */ } }

  const d = data
  const maxVisitors = Math.max(1, ...(d?.daily ?? []).map(x => x.visitors))
  const top = d?.funnel[0]?.visitors || 0
  return (
    <PlatformShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-dark">Site activity</h1>
            <p className="mt-0.5 max-w-3xl text-sm text-neutral-mid">What visitors do on carestreamai.com: which pages, how long they stay, what they click, and whether they start signing up or ask for a demo.</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {RANGES.map(([n, l]) => <button key={n} onClick={() => setDays(n)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${days === n ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>)}
          </div>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          The <strong>Every visitor</strong> box below counts every page view anonymously, with or without cookies. Time on a page, clicks and the visitor numbers are recorded <strong>only for visitors who accept analytics cookies</strong>, so they show a sample.
          The three counts marked &ldquo;everyone&rdquo; come from the database and include every visitor. {d?.recording_since ? <>Recording since {when(d.recording_since)}.</> : <>Nothing has been recorded yet: it starts as visitors accept cookies.</>}
          {' '}<button type="button" onClick={toggleMine} className="font-semibold underline">{mine ? 'Start recording my own visits again' : 'Do not record my own visits in this browser'}</button>
        </p>

        {err && <p className="text-sm text-red-600">{err}</p>}
        {!d && loading && <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>}

        {d && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Tile Icon={Users} label="Visitors" value={d.totals.visitors} sub={`${d.totals.sessions} visits`} />
              <Tile Icon={Eye} label="Page views" value={d.totals.page_views} sub={`${d.totals.pages_per_session} per visit`} />
              <Tile Icon={Clock} label="Time on a page" value={secs(d.totals.avg_active_seconds)} sub="average, really there" />
              <Tile Icon={LogOut} label="Left at once" value={`${d.totals.bounce_pct}%`} sub="one page, under 10s" />
              <Tile Icon={Repeat} label="Returning" value={`${d.totals.returning_pct}%`} sub="of visitors" />
              <Tile Icon={Radio} label="On the site now" value={d.live_visitors} sub="last 30 minutes" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Tile Icon={UserPlus} label="Accounts created" value={d.real.accounts_created} sub="everyone" />
              <Tile Icon={CalendarCheck} label="Demo requests" value={d.real.demo_requests} sub="everyone" />
              <Tile Icon={Mail} label="Contact enquiries" value={d.real.contact_enquiries} sub="everyone" />
            </div>

            {/* Every visitor, with or without cookie consent: an anonymous head count (no cookie, nothing stored, no IP address). */}
            <Card title="Every visitor" note="An anonymous count of every page view, whether or not cookies were accepted. No cookie, nothing stored on the device, no IP address, so it counts pages and not people.">
              {!d.everyone ? (
                <p className="text-xs text-amber-800">Not counting yet: the table behind this count has not been created. Run apps/api/prisma/sql/2026-11-26_site_page_counts.sql in Supabase, and it starts straight away.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
                    <div><p className="text-2xl font-bold text-neutral-dark">{d.everyone.total_views}</p><p className="text-xs text-neutral-mid">page views, everyone{d.everyone.counting_since ? ` (counting since ${d.everyone.counting_since})` : ''}</p></div>
                    <div><p className="text-2xl font-bold text-neutral-dark">{d.totals.page_views}</p><p className="text-xs text-neutral-mid">of them from visitors who accepted cookies{d.everyone.total_views > 0 ? ` (${Math.round((d.totals.page_views / d.everyone.total_views) * 100)}%)` : ''}</p></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Busiest pages</p><ul className="space-y-0.5 text-xs">{d.everyone.pages.slice(0, 10).map(r => <li key={r.path} className="flex justify-between gap-2"><span className="truncate text-neutral-dark">{r.path}</span><span className="font-semibold">{r.views}</span></li>)}</ul></div>
                    <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Where they came from</p><ul className="space-y-0.5 text-xs">{d.everyone.sources.slice(0, 10).map(r => <li key={r.source} className="flex justify-between gap-2"><span className="truncate text-neutral-dark">{r.source}</span><span className="font-semibold">{r.views}</span></li>)}</ul></div>
                    <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Devices</p><ul className="space-y-0.5 text-xs">{d.everyone.devices.map(r => <li key={r.device} className="flex justify-between gap-2"><span className="capitalize text-neutral-dark">{r.device}</span><span className="font-semibold">{r.views}</span></li>)}</ul></div>
                  </div>
                  <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Page views by day</p>
                    <div className="flex h-16 items-end gap-0.5">{(() => { const mx = Math.max(1, ...d.everyone.by_day.map(r => r.views)); return d.everyone.by_day.map(r => <div key={r.day} title={`${r.day}: ${r.views}`} className="flex-1 rounded-sm bg-teal/70" style={{ height: `${Math.max(4, (r.views / mx) * 100)}%` }} />) })()}</div>
                  </div>
                </div>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="What visitors did" note="Distinct visitors who got as far as each step.">
                <ul className="space-y-1.5">
                  {d.funnel.map(f => (
                    <li key={f.key}>
                      <div className="flex justify-between text-xs"><span className="text-neutral-dark">{f.label}</span><span className="font-semibold text-neutral-dark">{f.visitors}{top ? <span className="ml-1 font-normal text-neutral-mid">({Math.round((f.visitors / top) * 100)}%)</span> : null}</span></div>
                      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-teal" style={{ width: `${top ? Math.max(2, (f.visitors / top) * 100) : 0}%` }} /></div>
                    </li>
                  ))}
                </ul>
                {d.conversions.length > 0 && <ul className="mt-3 space-y-0.5 border-t border-gray-100 pt-2 text-xs text-neutral-mid">{d.conversions.map(c => <li key={c.key} className="flex justify-between"><span>{c.label}</span><span><strong className="text-neutral-dark">{c.visitors}</strong> visitors, {c.events} times</span></li>)}</ul>}
              </Card>
              <Card title="Visitors each day">
                <div className="flex h-36 items-end gap-1">
                  {d.daily.map(x => (
                    <div key={x.day} className="flex flex-1 flex-col items-center justify-end" title={`${x.day}: ${x.visitors} visitors, ${x.page_views} page views, ${x.conversions} sign up or demo actions`}>
                      <span className="text-[10px] text-neutral-mid">{x.visitors || ''}</span>
                      <div className="w-full rounded-t bg-teal/80" style={{ height: `${Math.max(2, (x.visitors / maxVisitors) * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-neutral-mid"><span>{d.daily[0]?.day.slice(5)}</span><span>{d.daily[d.daily.length - 1]?.day.slice(5)}</span></div>
              </Card>
            </div>

            <Card title="Pages" note="Most viewed first. Conversions are visits where someone clicked sign up or book a demo, typed an email address, or sent a form.">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-neutral-mid"><th className="py-1.5 pr-3">Page</th><th className="px-2 text-right">Views</th><th className="px-2 text-right">Visitors</th><th className="px-2 text-right">Time</th><th className="px-2 text-right">Scrolled</th><th className="px-2 text-right">Conversions</th></tr></thead>
                  <tbody>{d.pages.map(p => (
                    <tr key={p.path} className="border-b border-gray-50"><td className="max-w-[22rem] truncate py-1.5 pr-3 font-medium text-neutral-dark" title={p.path}>{p.path}</td><td className="px-2 text-right">{p.views}</td><td className="px-2 text-right">{p.visitors}</td><td className="px-2 text-right">{secs(p.avg_active_seconds)}</td><td className="px-2 text-right">{p.avg_scroll_pct}%</td><td className="px-2 text-right">{p.conversions ? `${p.conversions} (${p.conv_rate}%)` : '0'}</td></tr>
                  ))}</tbody>
                </table>
                {d.pages.length === 0 && <p className="py-3 text-sm text-neutral-mid">No page views in this period yet.</p>}
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card title="What they click" note="Buttons and links, most clicked first."><ul className="space-y-1 text-sm">{d.clicks.map((c, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate" title={c.href ?? ''}><span className="font-medium text-neutral-dark">{c.label}</span>{c.href ? <span className="ml-1 text-xs text-neutral-mid">{c.href}</span> : null}</span><span className="shrink-0 font-semibold">{c.count}</span></li>)}{d.clicks.length === 0 && <li className="text-neutral-mid">None yet.</li>}</ul></Card>
              <Card title="Where they came from"><ul className="space-y-1 text-sm">{d.referrers.map(r => <li key={r.source} className="flex justify-between"><span>{r.source}</span><span className="font-semibold">{r.visitors}</span></li>)}{d.referrers.length === 0 && <li className="text-neutral-mid">None yet.</li>}</ul></Card>
              <Card title="Devices"><ul className="space-y-1 text-sm">{Object.entries(d.devices).filter(([, n]) => n > 0).map(([k, n]) => <li key={k} className="flex justify-between capitalize"><span>{k}</span><span className="font-semibold">{n}</span></li>)}</ul></Card>
            </div>

            <Card title="Recent visits, page by page" note="Newest first. Visitors are anonymous: a short code, never a name or an email address.">
              <ul className="divide-y divide-gray-100">
                {d.recent.map(r => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-neutral-light/40">
                      <span className="min-w-0">
                        <span className="font-medium text-neutral-dark">{when(r.started_at)}</span>
                        <span className="ml-2 text-xs text-neutral-mid">{r.device ?? 'device unknown'} · from {r.source}{r.returning ? ' · returning' : ''} · {r.pages.length} {r.pages.length === 1 ? 'page' : 'pages'} · #{r.visitor}</span>
                        {r.conversions.length > 0 && <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">{r.conversions.map(c => <span key={c} className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">{c}</span>)}</span>}
                      </span>
                      <ChevronDown size={15} className={`shrink-0 text-neutral-mid transition-transform ${open === r.id ? 'rotate-180' : ''}`} />
                    </button>
                    {open === r.id && (
                      <ol className="mb-2 ml-3 space-y-1 border-l border-gray-200 pl-3 text-xs">
                        {r.pages.map((p, i) => <li key={i}><span className="font-medium text-neutral-dark">{p.path}</span> <span className="text-neutral-mid">{secs(p.active_seconds)} there, scrolled {p.scroll_pct}%{p.clicks.length ? `, clicked: ${p.clicks.join(', ')}` : ''}</span></li>)}
                      </ol>
                    )}
                  </li>
                ))}
                {d.recent.length === 0 && <li className="py-3 text-sm text-neutral-mid">No visits recorded in this period yet.</li>}
              </ul>
            </Card>
          </>
        )}
      </div>
    </PlatformShell>
  )
}
