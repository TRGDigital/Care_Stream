'use client'

// "Funding and fees" for one resident or client. LOCKED: only administrators see it, and staff never do. It is kept apart from the profile on the server.
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, Trash2 } from 'lucide-react'
import { funding, pounds, type Funding, type FundingMeta, type FeeModel, type FundingType } from '@/lib/funding-client'
import { LockedBadge } from '@/components/admin/locked-badge'

const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const lbl = 'mb-1 block text-xs font-medium text-neutral-dark'

function Money({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className={lbl}>{label}</label>
      <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
        <span className="text-sm text-neutral-mid">£</span>
        <input id={id} inputMode="decimal" className="w-full bg-transparent px-2 py-2 text-sm outline-none" value={value} onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" />
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-neutral-mid">{hint}</p>}
    </div>
  )
}
const s = (v: number | null | undefined) => (v == null ? '' : String(v))
const n = (v: string) => (v.trim() === '' ? null : Number(v))

export function FundingTab({ token, residentId, meta }: { token: string; residentId: string; meta: FundingMeta }) {
  const [loaded, setLoaded] = useState(false)
  const [existing, setExisting] = useState<Funding | null>(null)
  const [model, setModel] = useState<FeeModel>(meta.default_model)
  const [type, setType] = useState<FundingType>('self')
  const [f, setF] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (k: string) => (v: string) => { setF(o => ({ ...o, [k]: v })); setSaved(false) }

  useEffect(() => {
    let live = true; setLoaded(false); setError('')
    funding.get(token, residentId).then(r => {
      if (!live) return
      const x = r.funding; setExisting(x)
      if (x) {
        setModel(x.fee_model); setType(x.funding_type)
        setF({ weekly_fee: s(x.weekly_fee), council_name: x.council_name ?? '', council_contribution: s(x.council_contribution), family_contribution: s(x.family_contribution), fnc_contribution: s(x.fnc_contribution),
          hourly_rate_weekday: s(x.hourly_rate_weekday), hourly_rate_weekend: s(x.hourly_rate_weekend), hourly_rate_bank_holiday: s(x.hourly_rate_bank_holiday), hourly_rate_night: s(x.hourly_rate_night),
          planned_hours_per_week: s(x.planned_hours_per_week), visits_per_week: s(x.visits_per_week), visit_minutes: s(x.visit_minutes), daily_rate: s(x.daily_rate), placing_authority: x.placing_authority ?? '',
          last_review_date: x.last_review_date ?? '', last_increase_date: x.last_increase_date ?? '', next_review_date: x.next_review_date ?? '', note: x.note ?? '' })
      } else { setModel(meta.default_model); setType('self'); setF({}) }
      setLoaded(true)
    }).catch(e => { if (live) { setError(e?.message ?? 'Could not load.'); setLoaded(true) } })
    return () => { live = false }
  }, [token, residentId, meta.default_model])

  const body = useMemo(() => ({
    fee_model: model, funding_type: type,
    weekly_fee: n(f.weekly_fee ?? ''), council_name: f.council_name ?? '', council_contribution: n(f.council_contribution ?? ''), family_contribution: n(f.family_contribution ?? ''), fnc_contribution: n(f.fnc_contribution ?? ''),
    hourly_rate_weekday: n(f.hourly_rate_weekday ?? ''), hourly_rate_weekend: n(f.hourly_rate_weekend ?? ''), hourly_rate_bank_holiday: n(f.hourly_rate_bank_holiday ?? ''), hourly_rate_night: n(f.hourly_rate_night ?? ''),
    planned_hours_per_week: n(f.planned_hours_per_week ?? ''), visits_per_week: n(f.visits_per_week ?? ''), visit_minutes: n(f.visit_minutes ?? ''), daily_rate: n(f.daily_rate ?? ''), placing_authority: f.placing_authority ?? '',
    last_review_date: f.last_review_date || null, last_increase_date: f.last_increase_date || null, next_review_date: f.next_review_date || null, note: f.note ?? '',
  }), [model, type, f])

  // The same sums as the server, shown live (the server's figure is the one stored).
  const live = useMemo(() => {
    const b: any = body
    let amount: number | null = null, how = '', estimate = false
    if (model === 'hourly' || model === 'supported_living') {
      const hours = model === 'hourly' && b.visits_per_week != null && b.visit_minutes != null ? (b.visits_per_week * b.visit_minutes) / 60 : b.planned_hours_per_week
      if (hours != null && b.hourly_rate_weekday != null) { const we = b.hourly_rate_weekend ?? b.hourly_rate_weekday; amount = Math.round(hours * (b.hourly_rate_weekday * 5 / 7 + we * 2 / 7) * 100) / 100; estimate = true; how = `${Math.round(hours * 100) / 100} hours a week at ${pounds(b.hourly_rate_weekday)} on weekdays and ${pounds(we)} at weekends (5 weekday and 2 weekend days assumed). An estimate.` }
    } else if (model === 'live_in') {
      if (b.weekly_fee != null) amount = b.weekly_fee; else if (b.daily_rate != null) { amount = Math.round(b.daily_rate * 7 * 100) / 100; estimate = true; how = 'The daily rate times 7 days.' }
    } else if (b.weekly_fee != null) amount = b.weekly_fee
    const check = model === 'weekly' && b.weekly_fee && (type === 'part_self' || type === 'council')
      ? (() => { const total = Math.round(((b.council_contribution ?? 0) + (b.family_contribution ?? 0) + (b.fnc_contribution ?? 0)) * 100) / 100; return { ok: Math.abs(b.weekly_fee - total) < 0.005, total, difference: Math.round((b.weekly_fee - total) * 100) / 100 } })() : null
    return { amount, how, estimate, check }
  }, [body, model, type])

  async function save() {
    setBusy(true); setError(''); setSaved(false)
    try { const r = await funding.save(token, residentId, body); setExisting(r.funding); setSaved(true) } catch (e: any) { setError(e?.message ?? 'Could not save.') } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Remove the funding details for this person?')) return
    setBusy(true); setError('')
    try { await funding.remove(token, residentId); setExisting(null); setF({}); setType('self'); setModel(meta.default_model); setSaved(false) } catch (e: any) { setError(e?.message ?? 'Could not remove.') } finally { setBusy(false) }
  }

  if (!loaded) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
  const funded = type !== 'self'
  return (
    <section className="space-y-4" aria-label="Funding and fees">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-bold text-neutral-dark">Funding and fees</h3>
        <LockedBadge managersToo={meta.managers_can_see} />
      </div>
      <p className="text-sm text-neutral-mid">Used to understand income and costs. It is kept separate from the person's profile: it never appears in the staff hub, the assistant, family links or any export.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="fd-model" className={lbl}>How this person is charged</label>
          <select id="fd-model" className={inp} value={model} onChange={e => { setModel(e.target.value as FeeModel); setSaved(false) }}>{meta.models.map(m => <option key={m.key} value={m.key}>{m.label}{m.key === meta.default_model ? ' (usual for this service)' : ''}</option>)}</select></div>
        <div><label htmlFor="fd-type" className={lbl}>How they are funded</label>
          <select id="fd-type" className={inp} value={type} onChange={e => { setType(e.target.value as FundingType); setSaved(false) }}>{meta.funding_types.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(model === 'weekly' || model === 'live_in' || model === 'supported_living' || model === 'placement') && <Money id="fd-weekly" label="Weekly fee" value={f.weekly_fee ?? ''} onChange={set('weekly_fee')} />}
        {model === 'live_in' && <Money id="fd-daily" label="Daily rate" value={f.daily_rate ?? ''} onChange={set('daily_rate')} hint="Used if there is no weekly fee." />}
        {(model === 'hourly' || model === 'supported_living') && <>
          <Money id="fd-wd" label="Weekday rate per hour" value={f.hourly_rate_weekday ?? ''} onChange={set('hourly_rate_weekday')} />
          <Money id="fd-we" label="Weekend rate per hour" value={f.hourly_rate_weekend ?? ''} onChange={set('hourly_rate_weekend')} hint="Leave empty to use the weekday rate." />
          <Money id="fd-bh" label="Bank holiday rate per hour" value={f.hourly_rate_bank_holiday ?? ''} onChange={set('hourly_rate_bank_holiday')} />
        </>}
        {model === 'hourly' && <Money id="fd-night" label="Night rate per hour" value={f.hourly_rate_night ?? ''} onChange={set('hourly_rate_night')} />}
        {(model === 'hourly' || model === 'supported_living') && <div><label htmlFor="fd-hrs" className={lbl}>Planned hours a week</label><input id="fd-hrs" inputMode="decimal" className={inp} value={f.planned_hours_per_week ?? ''} onChange={e => set('planned_hours_per_week')(e.target.value.replace(/[^\d.]/g, ''))} /></div>}
        {model === 'hourly' && <>
          <div><label htmlFor="fd-vis" className={lbl}>Visits a week <span className="font-normal text-neutral-mid">(optional)</span></label><input id="fd-vis" inputMode="numeric" className={inp} value={f.visits_per_week ?? ''} onChange={e => set('visits_per_week')(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label htmlFor="fd-len" className={lbl}>Minutes per visit <span className="font-normal text-neutral-mid">(optional)</span></label><input id="fd-len" inputMode="numeric" className={inp} value={f.visit_minutes ?? ''} onChange={e => set('visit_minutes')(e.target.value.replace(/\D/g, ''))} /></div>
        </>}
        {model === 'placement' && <div><label htmlFor="fd-auth" className={lbl}>Placing authority</label><input id="fd-auth" className={inp} maxLength={120} value={f.placing_authority ?? ''} onChange={e => set('placing_authority')(e.target.value)} /></div>}
      </div>

      {funded && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="fd-council" className={lbl}>Council or funder name</label><input id="fd-council" className={inp} maxLength={120} value={f.council_name ?? ''} onChange={e => set('council_name')(e.target.value)} /></div>
          {model === 'weekly' && <>
            <Money id="fd-cc" label="Council contribution a week" value={f.council_contribution ?? ''} onChange={set('council_contribution')} />
            {(type === 'part_self' || type === 'council') && <Money id="fd-fc" label="Family contribution a week" value={f.family_contribution ?? ''} onChange={set('family_contribution')} hint="A top up paid by the family." />}
            <Money id="fd-fnc" label="Nursing care contribution a week" value={f.fnc_contribution ?? ''} onChange={set('fnc_contribution')} />
          </>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor="fd-last" className={lbl}>Last fee review</label><input id="fd-last" type="date" className={inp} value={f.last_review_date ?? ''} onChange={e => set('last_review_date')(e.target.value)} /></div>
        <div><label htmlFor="fd-inc" className={lbl}>Last fee increase</label><input id="fd-inc" type="date" className={inp} value={f.last_increase_date ?? ''} onChange={e => set('last_increase_date')(e.target.value)} /></div>
        <div><label htmlFor="fd-next" className={lbl}>Next fee review</label><input id="fd-next" type="date" className={inp} value={f.next_review_date ?? ''} onChange={e => set('next_review_date')(e.target.value)} /></div>
      </div>
      <div><label htmlFor="fd-note" className={lbl}>Note <span className="font-normal text-neutral-mid">(optional, no medical details)</span></label><input id="fd-note" className={inp} maxLength={200} value={f.note ?? ''} onChange={e => set('note')(e.target.value)} /><p className="mt-0.5 text-[11px] text-neutral-mid">{(f.note ?? '').length}/200</p></div>

      <div className="rounded-xl border border-gray-200 bg-neutral-light/60 px-4 py-3 text-sm">
        <p className="font-semibold text-neutral-dark">Weekly value: {live.amount != null ? <span>{pounds(live.amount)}{live.estimate ? ' (estimate)' : ''}</span> : <span className="font-normal text-neutral-mid">not worked out yet</span>}</p>
        {live.how && <p className="mt-0.5 text-xs text-neutral-mid">{live.how}</p>}
        {live.check && !live.check.ok && <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> The contributions add up to {pounds(live.check.total)}, which is {pounds(Math.abs(live.check.difference))} {live.check.difference > 0 ? 'less' : 'more'} than the weekly fee. You can still save.</p>}
      </div>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
        {existing && <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><Trash2 size={14} /> Remove</button>}
        {saved && <span className="text-sm text-green-700" role="status">Saved</span>}
      </div>
    </section>
  )
}
