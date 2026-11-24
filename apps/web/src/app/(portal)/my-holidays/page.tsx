'use client'

// Staff hub: my holiday (pilot, CS-1001 only). My allowance, what I have taken and booked, what is left, what is coming up, and a form to ask for days.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { CalendarDays, Loader2, X } from 'lucide-react'
import { holiday, useHolidayMeta, describeRange, fmtNum, niceDate, unitWord, type DayRow, type Me, type Request } from '@/lib/holiday-client'
import { DayHoursEditor } from '@/components/admin/holiday/day-hours-editor'

const STATUS: Record<Request['status'], { label: string; cls: string }> = {
  pending: { label: 'Waiting for approval', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Not approved', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-neutral-mid' },
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone ?? 'text-neutral-dark'}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-mid">{sub}</p>}
    </div>
  )
}

export default function MyHolidaysPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { meta } = useHolidayMeta()
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState<DayRow[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const load = useCallback(() => { if (token) holiday.me(token).then(setMe).catch(e => setError(e?.message ?? 'Could not load your holiday.')) }, [token])
  useEffect(() => { load() }, [load])

  const unit = me?.unit ?? 'hours'
  const b = me?.balance
  const bank = useMemo(() => Object.fromEntries((me?.bank_holidays ?? []).map(x => [x.date, 'Bank holiday'])), [me])
  const askTotal = unit === 'days' ? days.length : days.reduce((s, d) => s + d.hours, 0)
  const left = b ? Math.round((b.remaining - askTotal) * 100) / 100 : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || busy || days.length === 0) return
    setBusy(true); setError(''); setSent(false)
    try { await holiday.request(token, { days, note: note.trim() || undefined }); setSent(true); setNote(''); setDays([]); setFormKey(k => k + 1); load() }
    catch (err: any) { setError(err?.message ?? 'Could not send your request.') } finally { setBusy(false) }
  }
  async function cancel(id: string) { if (!token) return; try { await holiday.cancel(token, id); load() } catch (e: any) { setError(e?.message ?? 'Could not cancel.') } }

  if (meta && !meta.enabled) return <div className="flex-1 px-4 py-6"><p className="mx-auto max-w-2xl text-sm text-neutral-mid">Holiday booking is not switched on for your service yet.</p></div>
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><CalendarDays size={22} className="text-teal" aria-hidden="true" /> My holidays</h1>
          <p className="mt-1 text-sm text-neutral-mid">{me?.label ? `Holiday year ${me.label}. ` : ''}Only approved holiday is counted.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        {!me ? <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p>
          : !me.tracked ? <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-neutral-mid">Your holiday is not tracked here. Please ask your manager.</p>
          : b && (
            <>
              <section aria-label="My allowance" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Allowance" value={`${fmtNum(b.entitlement)}`} sub={`${unitWord(unit)}${b.carry_in > 0 ? `, including ${fmtNum(b.carry_in)} carried over` : ''}`} />
                <Stat label="Taken" value={fmtNum(b.taken)} sub={`${unitWord(unit)} so far`} />
                <Stat label="Booked coming up" value={fmtNum(b.booked)} sub={unitWord(unit)} />
                <Stat label="Left to book" value={fmtNum(b.remaining)} sub={unitWord(unit)} tone={b.remaining < 0 ? 'text-red-700' : 'text-teal'} />
                <Stat label="Taken so far" value={`${fmtNum(b.percent_taken)}%`} sub="of your allowance" />
              </section>

              {(me.upcoming?.length ?? 0) > 0 && (
                <section aria-label="Coming up">
                  <h2 className="mb-2 text-base font-bold text-neutral-dark">Booked and coming up</h2>
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                    {me.upcoming!.slice(0, 12).map(d => <li key={d.day} className="flex justify-between gap-3 px-4 py-2 text-sm"><span className="text-neutral-dark">{niceDate(d.day, true)}</span><span className="text-neutral-mid">{unit === 'days' ? '1 day' : `${d.hours} ${unitWord('hours', d.hours)}`}</span></li>)}
                  </ul>
                </section>
              )}

              <section aria-label="Ask for holiday" className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-base font-bold text-neutral-dark">Ask for holiday</h2>
                <p className="mb-4 mt-1 text-sm text-neutral-mid">Choose your dates and how many hours you work each day. Your manager will see who else is off before they decide.</p>
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <DayHoursEditor key={formKey} defaultHours={me.default_hours ?? 8} min={me.today} onChange={setDays} bank={bank} />
                  {days.length > 0 && (
                    <p className="rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark" role="status">
                      This request: <strong>{fmtNum(askTotal)} {unitWord(unit, askTotal)}</strong> over {days.length} {days.length === 1 ? 'day' : 'days'}.{' '}
                      <span className={left < 0 ? 'font-semibold text-red-700' : ''}>You would have {fmtNum(left)} {unitWord(unit, left)} left{left < 0 ? ', which is more than your allowance' : ''}.</span>
                    </p>
                  )}
                  <div>
                    <label htmlFor="hol-note" className="mb-1 block text-sm font-medium text-neutral-dark">A note for your manager <span className="font-normal text-neutral-mid">(optional)</span></label>
                    <textarea id="hol-note" rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal" />
                  </div>
                  {sent && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">Thank you. Your request has been sent to your manager.</p>}
                  <button type="submit" disabled={busy || days.length === 0} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                    {busy && <Loader2 size={15} className="animate-spin" />} Send my request
                  </button>
                </form>
              </section>

              <section aria-label="My requests">
                <h2 className="mb-2 text-base font-bold text-neutral-dark">My requests</h2>
                {(me.requests?.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-neutral-mid">You have not asked for any holiday yet.</p> : (
                  <ul className="space-y-2">
                    {me.requests!.map(r => (
                      <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-neutral-dark">{describeRange(r.days)}</p>
                            <p className="text-xs text-neutral-mid">{unit === 'days' ? `${r.days.length} ${unitWord('days', r.days.length)}` : `${fmtNum(r.total_hours)} ${unitWord('hours', r.total_hours)}`}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                        </div>
                        {r.decision_note && <p className="mt-2 rounded-lg bg-neutral-light px-3 py-2 text-sm text-neutral-dark">{r.decided_by_name ?? 'Your manager'}: {r.decision_note}</p>}
                        {r.status === 'pending' && <button type="button" onClick={() => cancel(r.id)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"><X size={14} aria-hidden="true" /> Cancel this request</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
      </div>
    </div>
  )
}
