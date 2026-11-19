'use client'

// The company's Super User: one champion per company. Shared by the platform client page (variant "platform": eligibility and the voucher)
// and the company's Incentives page (variant "admin": how they are getting on, no voucher or money detail).
// Colleagues are counts only: never named, never timed. Only the Super User, who agreed, is measured by name and by minutes.
import { useState } from 'react'
import { Award, CheckCircle2, Circle, Loader2, TrendingUp, TrendingDown, Minus, Clock, Gift } from 'lucide-react'
import type { SuperUserDetail, SuperUserCard as CardData } from '@/lib/platform-api'

const d = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const STATUS: Record<SuperUserDetail['status'], { label: string; cls: string }> = {
  awaiting_consent: { label: 'Has not agreed yet', cls: 'bg-gray-100 text-gray-700' },
  paused:           { label: 'Paused (plan not active)', cls: 'bg-gray-100 text-gray-700' },
  in_window:        { label: 'In the 60 days', cls: 'bg-blue-50 text-blue-700' },
  eligible:         { label: 'Eligible', cls: 'bg-green-100 text-green-700' },
  not_met:          { label: '60 days done, not met', cls: 'bg-amber-100 text-amber-800' },
}
const TREND = {
  rising:    { label: 'Rising', cls: 'text-green-700', Icon: TrendingUp },
  steady:    { label: 'Steady', cls: 'text-neutral-dark', Icon: Minus },
  falling:   { label: 'Falling', cls: 'text-red-700', Icon: TrendingDown },
  too_early: { label: 'Too early', cls: 'text-neutral-mid', Icon: Clock },
} as const

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg bg-neutral-light/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
      <p className="text-lg font-bold text-neutral-dark">{value}</p>
      {sub ? <p className="text-[11px] text-neutral-mid">{sub}</p> : null}
    </div>
  )
}

export function SuperUserCard({ variant, data, onMarkSent, onRemove }: {
  variant: 'platform' | 'admin'
  data: { su: SuperUserDetail | null; voucher?: CardData['voucher']; thresholds?: CardData['thresholds']; adminStatus?: 'active' | 'awaiting_consent' }
  onMarkSent?: (note: string) => Promise<void>
  onRemove?: () => Promise<void>
}) {
  const { su, voucher, thresholds } = data
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  if (!su) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Award size={16} className="text-teal" /> Super User</h3>
        <p className="mt-1 text-sm text-neutral-mid">{variant === 'admin'
          ? 'No Super User yet. A Super User is a member of staff who champions CareStream in your service. Tag one when you add a staff member, or open their record.'
          : 'This company has not tagged a Super User.'}</p>
      </div>
    )
  }
  const status = variant === 'admin' ? (data.adminStatus === 'awaiting_consent' ? STATUS.awaiting_consent : { label: 'In the 60 days', cls: 'bg-blue-50 text-blue-700' }) : STATUS[su.status]
  const m = su.measures, c = su.colleagues, T = TREND[c.trend]
  const pct = Math.round((su.window.elapsed / su.window.days) * 100)
  async function run(fn?: () => Promise<void>) { if (!fn) return; setBusy(true); setErr(''); try { await fn() } catch (e: any) { setErr(e?.message ?? 'That did not work.') } finally { setBusy(false) } }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Award size={16} className="text-teal" /> Super User</h3>
          <p className="mt-1 text-base font-bold text-neutral-dark">{su.person.name}{su.person.job_role ? <span className="ml-2 text-sm font-normal text-neutral-mid">{su.person.job_role}</span> : null}</p>
          <p className="text-xs text-neutral-mid">Tagged {d(su.tagged_at)}{su.consent_at ? `, agreed ${d(su.consent_at)}` : ''}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-neutral-mid"><span>Day {su.window.elapsed} of {su.window.days}</span><span>{su.window.left > 0 ? `${su.window.left} days left, ends ${d(su.window.ends_on)}` : `Ended ${d(su.window.ends_on)}`}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      </div>

      {su.daily && su.daily.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Day by day since they were tagged</p>
          <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`${su.measures.active_days} active days of ${su.daily.length} so far`}>
            {su.daily.map((x, i) => (
              <span key={x.day} title={`Day ${i + 1}, ${d(x.day)}: ${x.active ? `active${x.minutes ? `, ${x.minutes} min on the hub` : ''}` : 'no activity'}`}
                className={`h-3.5 w-3.5 rounded-[3px] ${x.active ? (x.minutes >= 20 ? 'bg-teal' : 'bg-teal/60') : 'bg-gray-200'}`} />
            ))}
            {Array.from({ length: Math.max(0, su.window.days - su.daily.length) }).map((_, i) => <span key={`f${i}`} className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-gray-200" />)}
          </div>
          <p className="mt-1 text-[11px] text-neutral-mid">Filled squares are days they did something on the hub (darker when they spent 20 minutes or more). Dashed squares are days still to come.</p>
        </div>
      )}

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Their own use of the hub</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Active days" value={m.active_days} sub={`of ${su.window.days}`} />
        <Tile label="Time on the hub" value={m.minutes.total ? `${m.minutes.total} min` : 'None yet'} sub={m.minutes.total ? `${m.minutes.per_active_day} min per active day` : su.consent_at ? '' : 'recorded once they agree'} />
        <Tile label="Chat questions" value={m.chat.count} sub={`on ${m.chat.days} days`} />
        <Tile label="CQC prep answered" value={m.cqc.count} sub={`on ${m.cqc.days} days`} />
        <Tile label="Audits completed" value={m.audits.count} />
        <Tile label="Policies read" value={m.policies.count} />
        <Tile label="Follow-ups closed" value={m.followups.count} />
        <Tile label="Logins" value={m.logins.count} sub={`on ${m.logins.days} days`} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Tile label="Ad hoc training" value={`${m.training.adhoc.completed}/${m.training.adhoc.started}`} sub="passed / started" />
        <Tile label="CPD training" value={`${m.training.cpd.completed}/${m.training.cpd.started}`} sub="passed / started" />
        <Tile label="Annual training" value={`${m.training.annual.completed}/${m.training.annual.started}`} sub="passed / started" />
      </div>

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Colleagues (counts only)</p>
      <div className="rounded-lg border border-gray-100 p-3">
        <p className={`flex items-center gap-1.5 text-sm font-semibold ${T.cls}`}><T.Icon size={15} /> {T.label}: <span className="font-normal text-neutral-dark">{c.trend_note}</span></p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Active per week" value={c.window_per_week} sub={c.baseline_per_week !== null ? `was ${c.baseline_per_week} before` : 'no earlier baseline'} />
          <Tile label="New to the hub" value={c.reached} sub="first login since the tag" />
          <Tile label="Have logged in" value={c.pct_ever_logged_in !== null ? `${c.pct_ever_logged_in}%` : 'n/a'} sub={`${c.ever_logged_in} of ${c.staff_total} colleagues`} />
          <Tile label="Done by colleagues" value={c.training_completed} sub={`courses passed, ${c.questions_asked} questions asked`} />
        </div>
      </div>

      {variant === 'platform' && (
        <>
          <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Eligibility</p>
          <ul className="space-y-1.5 text-sm">
            {su.checks.map(k => (
              <li key={k.key} className="flex items-start gap-2">
                {k.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" /> : <Circle size={15} className="mt-0.5 shrink-0 text-gray-300" />}
                <span><span className="text-neutral-dark">{k.label}</span> <span className="text-xs text-neutral-mid">{k.detail}</span></span>
              </li>
            ))}
          </ul>
          {thresholds && <p className="mt-1 text-[11px] text-neutral-mid">Thresholds are set in code (api lib/super-user.ts): {thresholds.active_days} active days, {thresholds.passed_training} course passed, colleagues rising.</p>}

          <div className="mt-4 rounded-lg border border-gray-200 bg-neutral-light/40 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Gift size={15} className="text-teal" /> £25 M&amp;S voucher</p>
            {!voucher && <p className="mt-1 text-sm text-neutral-mid">Not due yet. It becomes due the first time they are eligible, after the 60 days. Nothing is sent automatically.</p>}
            {voucher?.status === 'due' && (
              <div className="mt-1">
                <p className="text-sm text-amber-800">Due since {d(voucher.eligible_at)}. Send the voucher yourself, then record it here.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional), e.g. sent by email" className="min-w-[14rem] flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                  <button type="button" onClick={() => run(() => onMarkSent!(note))} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60">{busy && <Loader2 size={12} className="animate-spin" />} Mark sent</button>
                </div>
              </div>
            )}
            {voucher?.status === 'sent' && <p className="mt-1 text-sm text-green-700">Sent {d(voucher.sent_at)}{voucher.sent_by ? ` by ${voucher.sent_by}` : ''}{voucher.note ? `. ${voucher.note}` : ''}. This company's voucher is used.</p>}
            {err && <p className="mt-1 text-xs font-medium text-red-600">{err}</p>}
          </div>
          {onRemove && <button type="button" onClick={() => { if (confirm('Remove the Super User tag from this person? Their 60 days stop and a new Super User starts a new 60 days.')) run(onRemove) }} disabled={busy} className="mt-3 text-xs text-red-600 hover:underline disabled:opacity-50">Remove Super User tag</button>}
        </>
      )}
      {variant === 'admin' && <p className="mt-3 text-[11px] text-neutral-mid">Counts of colleagues only: nobody else is named or timed. The Super User agreed to their own figures being shown.</p>}
    </div>
  )
}
