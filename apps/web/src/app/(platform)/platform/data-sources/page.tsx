'use client'

// The Data sources register: the reference figures (minimum wage, inflation, bank holidays, sick pay, mileage rates) that the Ask CareStream agents quote.
// Each one is real, dated and sourced; a weekly check keeps them fresh and emails the owner when something changes or cannot be read. A figure that failed
// or looked wrong is never used: the last good figure is held and flagged here. A person can enter a figure by hand when a source breaks (clearly marked and logged).

import { useCallback, useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type DataSourceHistory, type DataSourceRow, type DataSourceRun } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, PenLine, RefreshCw } from 'lucide-react'

const gbp = (n: any) => (typeof n === 'number' ? `£${n.toFixed(2)}` : '')
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never')
const dayOf = (s: string | null) => (s ? new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not dated')

/** The figure in plain words, per source. */
function Summary({ s }: { s: DataSourceRow }) {
  const v = s.value
  if (v == null) return <span className="text-neutral-mid">No figure recorded yet.</span>
  if (s.key === 'nlw') return (
    <span>
      21 and over <strong>{gbp(v.current?.age21)}</strong>, 18 to 20 {gbp(v.current?.age18to20)}, under 18 {gbp(v.current?.under18)}, apprentice {gbp(v.current?.apprentice)}
      {v.upcoming?.length > 0 && <span className="block text-xs text-neutral-mid">Announced from {dayOf(v.upcoming[0].from)}: 21 and over {gbp(v.upcoming[0].age21)}, 18 to 20 {gbp(v.upcoming[0].age18to20)}</span>}
    </span>
  )
  if (s.key === 'cpi' || s.key === 'cpih' || s.key === 'cpi_food') return <span><strong>{v.latest?.rate}%</strong> for {v.latest?.period}{v.next_release && <span className="block text-xs text-neutral-mid">Next release {dayOf(v.next_release)}</span>}</span>
  if (s.key === 'statutory_pay') return <span><strong>{gbp(v.weekly_rate_gbp)}</strong> a week, or {v.earnings_share_pct}% of average weekly earnings if lower, for {v.tax_year}<span className="block text-xs text-neutral-mid">Maternity, paternity, adoption and shared parental pay. The first 6 weeks of maternity and adoption pay are {v.rates?.smp?.first_six_weeks_pct}% of earnings.{v.upcoming ? ` Upcoming ${v.upcoming.tax_year}: ${gbp(v.upcoming.weekly_rate_gbp)} a week.` : ''}</span></span>
  if (s.key === 'employer_ni') return <span><strong>{v.secondary_rate_pct}%</strong> above {gbp(v.thresholds?.secondary_threshold?.year)} a year ({gbp(v.thresholds?.secondary_threshold?.month)} a month, {gbp(v.thresholds?.secondary_threshold?.week)} a week), {v.tax_year}<span className="block text-xs text-neutral-mid">Lower earnings limit {gbp(v.thresholds?.lower_earnings_limit?.year)}, upper earnings limit {gbp(v.thresholds?.upper_earnings_limit?.year)} a year.{v.upcoming ? ` Upcoming ${v.upcoming.tax_year}: ${v.upcoming.secondary_rate_pct}% above ${gbp(v.upcoming.thresholds?.secondary_threshold?.year)}.` : ''}</span></span>
  if (s.key === 'pension_ae') return <span>Enrol from <strong>{gbp(v.earnings_trigger_gbp)}</strong> a year, on earnings between {gbp(v.qualifying_earnings_lower_gbp)} and {gbp(v.qualifying_earnings_upper_gbp)}<span className="block text-xs text-neutral-mid">Minimum {v.minimum_total_pct}% in total: employer {v.minimum_employer_pct}%, employee {v.employee_pct}%{v.age_from ? `, from age ${v.age_from}` : ''}</span></span>
  if (s.key === 'dbs_fees') return <span>Basic <strong>{gbp(v.basic_gbp)}</strong>, standard {gbp(v.standard_gbp)}, enhanced {gbp(v.enhanced_gbp)}, enhanced with barred lists {gbp(v.enhanced_barred_lists_gbp)}{v.volunteers_free ? '. Free for volunteers' : ''}</span>
  if (s.key === 'earnings_growth') return <span><strong>{v.latest?.rate}%</strong> a year for {v.latest?.period} (regular pay, three month average)<span className="block text-xs text-neutral-mid">Average weekly total pay {gbp(v.total_pay?.weekly_gbp)}, up {v.total_pay?.growth_3m_pct}% on a year earlier.{v.next_release ? ` Next release ${dayOf(v.next_release)}.` : ''}</span></span>
  if (s.key === 'bank_rate') return <span><strong>{v.rate_pct}%</strong> since {dayOf(v.changed)}{v.previous ? <span className="block text-xs text-neutral-mid">Before that {v.previous.rate}% from {dayOf(v.previous.changed)}</span> : null}</span>
  if (s.key === 'holiday_rules') return <span><strong>{v.statutory_weeks} weeks</strong> a year, capped at {v.cap_days_five_day_week} days for a five day week; irregular hours and part year workers earn <strong>{v.irregular_hours_pct}%</strong> of the hours worked</span>
  if (s.key === 'road_fuel') return <span>Petrol <strong>{v.latest?.petrol}p</strong>, diesel <strong>{v.latest?.diesel}p</strong> a litre<span className="block text-xs text-neutral-mid">Week of {dayOf(v.latest?.date)}{v.previous ? `. The week before: petrol ${v.previous.petrol}p, diesel ${v.previous.diesel}p` : ''}</span></span>
  if (s.key === 'homecare_private_rate' || s.key === 'homecare_min_price' || s.key === 'council_homecare_rate') return <span><strong>{gbp(v.hourly_gbp)}</strong> an hour{v.low_gbp != null ? `, middle half ${gbp(v.low_gbp)} to ${gbp(v.high_gbp)}` : ''}{v.period ? `, ${v.period}` : ''}<span className="block text-xs text-neutral-mid">{v.basis}</span></span>
  if (s.key === 'care_food_cost') return <span><strong>{gbp(v.low_gbp_week)} to {gbp(v.high_gbp_week)}</strong> per resident per week, {v.price_year} prices{v.councils ? `, ${v.councils} councils` : ''}{v.kent_gbp_week ? `. Kent ${gbp(v.kent_gbp_week)}, West Sussex ${gbp(v.west_sussex_gbp_week)}` : ''}</span>
  if (s.key === 'bank_holidays') return <span>{v.events?.length ?? 0} dates, {v.first_year} to {v.last_year}</span>
  if (s.key === 'ssp') return <span><strong>{gbp(v.weekly_rate_gbp)}</strong> a week{v.maximum_weeks ? `, up to ${v.maximum_weeks} weeks` : ''}</span>
  if (s.key === 'mileage') return <span>Cars and vans <strong>{v.cars_vans_first_10000_pence}p</strong> for the first 10,000 miles then {v.cars_vans_after_10000_pence}p, motorcycles {v.motorcycle_pence}p, bikes {v.bike_pence}p</span>
  if (s.key === 'real_living_wage') return <span><strong>{gbp(v.hourly_rate_gbp)}</strong> an hour{v.london_hourly_rate_gbp ? `, London ${gbp(v.london_hourly_rate_gbp)}` : ''}</span>
  return <code className="text-xs">{JSON.stringify(v).slice(0, 160)}</code>
}

function Chip({ s }: { s: DataSourceRow }) {
  const bad = s.status === 'failed' || s.status === 'needs_review'
  const label = s.status === 'failed' ? 'Could not read' : s.status === 'needs_review' ? 'Needs review' : s.status === 'manual' ? 'Entered by hand' : s.status === 'changed' ? 'Changed' : s.stale ? 'Out of date' : 'Up to date'
  const cls = bad ? 'bg-red-100 text-red-800' : s.stale || s.status === 'changed' || s.status === 'manual' ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-800'
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{bad ? <AlertTriangle size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}{label}</span>
}

const EXAMPLE: Record<string, string> = {
  nlw: '{"current":{"from":"2026-04-01","label":"April 2026","age21":12.71,"age18to20":10.85,"under18":8,"apprentice":8},"upcoming":[]}',
  cpi: '{"latest":{"period":"2026-10","rate":3.6}}', cpih: '{"latest":{"period":"2026-10","rate":3.7}}', cpi_food: '{"latest":{"period":"2026-10","rate":0.9}}',
  statutory_pay: '{"tax_year":"2026 to 2027","weekly_rate_gbp":194.32,"earnings_share_pct":90,"rates":{"smp":{"first_six_weeks_pct":90,"weekly_gbp":194.32,"earnings_share_pct":90},"spp":{"weekly_gbp":194.32,"earnings_share_pct":90},"sap":{"weekly_gbp":194.32,"earnings_share_pct":90},"shpp":{"weekly_gbp":194.32,"earnings_share_pct":90}}}',
  employer_ni: '{"tax_year":"2026 to 2027","secondary_rate_pct":15,"thresholds":{"lower_earnings_limit":{"week":129,"month":559,"year":6708},"secondary_threshold":{"week":96,"month":417,"year":5000},"upper_earnings_limit":{"week":967,"month":4189,"year":50270},"upper_secondary_threshold_under_21":{"week":967,"month":4189,"year":50270}}}',
  pension_ae: '{"earnings_trigger_gbp":10000,"qualifying_earnings_lower_gbp":6240,"qualifying_earnings_upper_gbp":50270,"minimum_employer_pct":3,"employee_pct":5,"minimum_total_pct":8}',
  dbs_fees: '{"basic_gbp":20,"standard_gbp":20,"enhanced_gbp":41,"enhanced_barred_lists_gbp":41,"volunteers_free":true}',
  earnings_growth: '{"latest":{"period":"2026-09","rate":3.5},"total_pay":{"period":"2026-09","weekly_gbp":761,"growth_3m_pct":4.1}}',
  bank_rate: '{"rate_pct":4,"changed":"2026-11-05"}',
  holiday_rules: '{"statutory_weeks":5.6,"cap_days_five_day_week":28,"irregular_hours_pct":12.07}',
  road_fuel: '{"latest":{"date":"2026-11-23","petrol":161.96,"diesel":193.29}}',
  homecare_private_rate: '{"hourly_gbp":31,"low_gbp":25,"high_gbp":34.9,"period":"October 2026","basis":"Median weekday daytime price"}',
  care_food_cost: '{"low_gbp_week":29.05,"high_gbp_week":37.73,"price_year":"2022/23","councils":10}',
  ssp: '{"weekly_rate_gbp":123.25}',
  mileage: '{"cars_vans_first_10000_pence":55,"cars_vans_after_10000_pence":25,"motorcycle_pence":24,"bike_pence":20}',
  real_living_wage: '{"hourly_rate_gbp":14.20,"london_hourly_rate_gbp":15.40}',
  bank_holidays: '{"events":[{"date":"2026-12-25","title":"Christmas Day"}]}',
}

function ManualForm({ s, onSave, onCancel }: { s: DataSourceRow; onSave: (body: { value: any; effective_from: string | null; note: string }) => Promise<void>; onCancel: () => void }) {
  const [value, setValue] = useState(s.value ? JSON.stringify(s.value, null, 1) : EXAMPLE[s.key] ?? '{}')
  const [from, setFrom] = useState(s.effective_from ?? '')
  const [note, setNote] = useState(s.status === 'manual' ? s.note ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    let parsed: any
    try { parsed = JSON.parse(value) } catch { setError('The figure is not valid. It should look like the example.'); return }
    setBusy(true); setError('')
    try { await onSave({ value: parsed, effective_from: from || null, note }) } catch (e: any) { setError(e?.message ?? 'Could not save it.') } finally { setBusy(false) }
  }
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
      <p className="text-sm font-semibold text-amber-900">Enter this figure by hand</p>
      <p className="text-xs text-amber-900">Use this only when the source cannot be read. It is marked "Entered by hand" everywhere, recorded in the history, and the weekly check leaves it alone until you hand it back. The same sense checks apply.</p>
      <label className="block text-xs font-medium text-neutral-dark">The figure (JSON)
        <textarea rows={6} value={value} onChange={e => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-dark">Takes effect on
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
        </label>
        <label className="block text-xs font-medium text-neutral-dark">Why is it being entered by hand?
          <input value={note} maxLength={300} onChange={e => setNote(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm" />
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Save</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
      </div>
    </div>
  )
}

function Card({ s, token, onChanged }: { s: DataSourceRow; token: string; onChanged: () => void }) {
  const api = createPlatformClient(token).dataSources
  const [open, setOpen] = useState(false)
  const [hist, setHist] = useState<DataSourceHistory[] | null>(null)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  async function run(fn: () => Promise<DataSourceRun>) {
    setBusy(true); setError(''); setMsg('')
    try { const r = await fn(); setMsg(r.outcomes[0]?.message ?? 'Checked.'); onChanged() } catch (e: any) { setError(e?.message ?? 'Could not do that.') } finally { setBusy(false) }
  }
  useEffect(() => { if (open && hist === null) api.history(s.key).then(r => setHist(r.history)).catch(() => setHist([])) }, [open, hist, api, s.key])
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-neutral-dark">{s.name}</h2>
          <p className="text-xs text-neutral-mid">{s.publisher} · {s.update_frequency}</p>
        </div>
        <Chip s={s} />
      </div>
      <p className="mt-2 text-sm text-neutral-dark"><Summary s={s} /></p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-neutral-mid sm:grid-cols-4">
        <div><dt className="font-semibold text-neutral-dark">Takes effect</dt><dd>{dayOf(s.effective_from)}</dd></div>
        <div><dt className="font-semibold text-neutral-dark">Last checked</dt><dd>{when(s.last_checked_at)}</dd></div>
        <div><dt className="font-semibold text-neutral-dark">Next check due</dt><dd>{s.auto ? dayOf(s.next_check_due) : 'By hand'}</dd></div>
        <div><dt className="font-semibold text-neutral-dark">Last changed</dt><dd>{when(s.last_changed_at)}</dd></div>
      </dl>
      {s.warning && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{s.warning}</p>}
      {s.last_error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{s.last_error}</p>}
      {s.note && s.status !== 'manual' && <p className="mt-2 text-xs text-neutral-mid">{s.note}</p>}
      {msg && <p className="mt-2 text-sm text-green-800" role="status">{msg}</p>}
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s.auto && s.status !== 'manual' && <button type="button" disabled={busy} onClick={() => run(() => api.checkOne(s.key))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check now</button>}
        {s.auto && s.status === 'manual' && <button type="button" disabled={busy} onClick={() => run(() => api.clearManual(s.key))} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">Hand back to the automatic check</button>}
        <button type="button" onClick={() => setManual(v => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><PenLine size={14} /> {s.auto ? 'Enter by hand' : s.value ? 'Update the figure' : 'Enter the figure'}</button>
        <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline">Open the source <ExternalLink size={13} aria-hidden="true" /></a>
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-neutral-dark">History {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </div>
      {manual && <ManualForm s={s} onCancel={() => setManual(false)} onSave={async body => { await api.setManual(s.key, body); setManual(false); onChanged() }} />}
      {open && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {hist === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
            : hist.length === 0 ? <p className="text-sm text-neutral-mid">No changes recorded yet.</p>
            : <ul className="space-y-1.5 text-sm">{hist.map(h => (
              <li key={h.id} className="flex flex-wrap gap-x-3 text-neutral-dark"><span className="text-xs text-neutral-mid">{when(h.fetched_at)}</span><span className="font-medium">{h.status === 'manual' ? 'Entered by hand' : 'Recorded'}</span><span className="text-xs text-neutral-mid">{h.effective_from ? `from ${dayOf(h.effective_from)}` : ''}</span>{h.note && <span className="text-xs text-neutral-mid">{h.note}</span>}
                <code className="w-full break-all text-[11px] text-neutral-mid">{JSON.stringify(h.value).slice(0, 220)}</code></li>
            ))}</ul>}
        </div>
      )}
    </li>
  )
}

function Page() {
  const token = usePlatformAuth()
  const [rows, setRows] = useState<DataSourceRow[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => { if (!token) return; createPlatformClient(token).dataSources.list().then(r => { setRows(r.sources); setError('') }).catch((e: any) => setError(e?.message ?? 'Could not load the data sources.')) }, [token])
  useEffect(() => { load() }, [load])
  async function checkAll() {
    if (!token) return
    setBusy(true); setMsg(''); setError('')
    try { const r = await createPlatformClient(token).dataSources.checkAll(); setMsg(`Checked ${r.checked}: ${r.changed} changed or new, ${r.failed} could not be read, ${r.needs_review} need a look.${r.emailed ? ' You have been emailed.' : ''}`); load() } catch (e: any) { setError(e?.message ?? 'Could not run the check.') } finally { setBusy(false) }
  }
  const attention = (rows ?? []).filter(r => r.status === 'failed' || r.status === 'needs_review' || r.stale).length
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Data sources</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-mid">The reference figures that Ask CareStream quotes. Each is checked against its official source every Monday, shows the date it takes effect, and is never used if it could not be read or looked wrong. You are emailed only when something changes or needs a look.</p>
        </div>
        <button type="button" onClick={checkAll} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check all now</button>
      </div>
      {rows && <p className={`rounded-lg px-3 py-2 text-sm ${attention ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-800'}`} role="status">{attention ? `${attention} ${attention === 1 ? 'source needs' : 'sources need'} a look.` : 'Everything is up to date.'}</p>}
      {msg && <p className="text-sm text-green-800" role="status">{msg}</p>}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {!rows && !error && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>}
      {rows && token && <ul className="space-y-3">{rows.map(s => <Card key={s.key} s={s} token={token} onChanged={load} />)}</ul>}
      <p className="text-xs text-neutral-mid">Skills for Care data is not held here: we do not have access to it.</p>
    </div>
  )
}

export default function DataSourcesPage() {
  return <PlatformShell><Page /></PlatformShell>
}
