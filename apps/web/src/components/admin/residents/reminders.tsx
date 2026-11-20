'use client'

// Family reminders for the manager: how often each family contact is gently asked to add more, when the next one goes out, when they last replied,
// and a notice when someone has not replied to the last 3 reminders (reminders to them then stop).

import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2, TriangleAlert } from 'lucide-react'
import type { ResidentDetail, ResidentInvite } from '@/lib/residents-api'
import { CADENCE_LABELS, WEEKDAYS, type ReminderCadence, type ReminderSetting } from '@/lib/reminders-api'
import { Field, ErrorBox, inputCls, btnPrimary, errMsg, fmtDate, todayIso } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>
const CADENCES: ReminderCadence[] = ['off', 'weekly', 'fortnightly', 'monthly']

/** The reminder choice shown when sending a first invitation. Default is no reminders. */
export function ReminderCadencePick({ value, onChange }: { value: ReminderCadence; onChange: (v: ReminderCadence) => void }) {
  return (
    <Field label="Gentle reminders" htmlFor="fm-reminder" hint="Optional. We email them a fresh private link now and then. They can stop the reminders with one click.">
      <select id="fm-reminder" className={inputCls} value={value} onChange={e => onChange(e.target.value as ReminderCadence)}>
        {CADENCES.map(c => <option key={c} value={c}>{CADENCE_LABELS[c]}</option>)}
      </select>
    </Field>
  )
}

function useReminders(client: Client, resident: ResidentDetail) {
  const [ready, setReady] = useState(true)
  const [items, setItems] = useState<ReminderSetting[]>([])
  const [loaded, setLoaded] = useState(false)
  const key = resident.invites.map(i => i.id + i.status).join(',')
  const reload = useCallback(async () => {
    try { const r = await client.reminders(resident.id); setReady(r.ready); setItems(r.reminders) } catch { /* the rest of the tab still works */ } finally { setLoaded(true) }
  }, [client, resident.id])
  useEffect(() => { void reload() }, [reload, key])
  return { ready, items, loaded, reload, setItems }
}

const nameOf = (resident: ResidentDetail, inviteId: string) => resident.invites.find(i => i.id === inviteId)?.name ?? 'A family member'

/** Shown at the top of Approvals: who has not replied to the last 3 reminders. */
export function ReminderNotices({ client, resident }: { client: Client; resident: ResidentDetail }) {
  const { items } = useReminders(client, resident)
  const stalled = items.filter(r => r.stalled)
  if (!stalled.length) return null
  return (
    <div className="space-y-2">
      {stalled.map(r => <StalledNotice key={r.invite_id} name={nameOf(resident, r.invite_id)} />)}
    </div>
  )
}

function StalledNotice({ name }: { name: string }) {
  return (
    <div role="status" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <p><strong>{name}</strong> has not replied to the last 3 reminders, so we have stopped sending them. You can switch them back on in the Family tab.</p>
    </div>
  )
}

function ContactRow({ client, resident, invite, setting, onSaved }: { client: Client; resident: ResidentDetail; invite: ResidentInvite; setting: ReminderSetting | undefined; onSaved: (s: ReminderSetting | null) => void }) {
  const [cadence, setCadence] = useState<ReminderCadence>(setting?.cadence ?? 'off')
  const [weekday, setWeekday] = useState<string>(setting?.weekday === null || setting?.weekday === undefined ? '' : String(setting.weekday))
  const [pause, setPause] = useState(setting?.paused_until ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setCadence(setting?.cadence ?? 'off')
    setWeekday(setting?.weekday === null || setting?.weekday === undefined ? '' : String(setting.weekday))
    setPause(setting?.paused_until ?? '')
  }, [setting?.cadence, setting?.weekday, setting?.paused_until])

  async function save() {
    setBusy(true); setError(''); setSaved(false)
    try {
      const r = await client.saveReminder(resident.id, invite.id, { cadence, weekday: cadence === 'off' || weekday === '' ? null : Number(weekday), paused_until: cadence === 'off' || !pause ? null : pause })
      onSaved(r.reminder); setSaved(true)
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }

  const on = cadence !== 'off'
  const paused = !!setting?.paused_until && setting.paused_until >= todayIso()
  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-neutral-dark">{invite.name} <span className="font-normal text-neutral-mid">{invite.relationship}</span></p>
        <p className="text-xs text-neutral-mid">
          {setting?.cadence && setting.cadence !== 'off'
            ? (setting.stalled ? 'Reminders stopped' : paused ? `Paused until ${fmtDate(setting.paused_until)}` : setting.next_due_at ? `Next reminder ${fmtDate(setting.next_due_at)}` : 'Next reminder being worked out')
            : setting?.stopped_by_family ? 'They stopped the reminders' : 'Reminders off'}
        </p>
      </div>
      {setting?.stalled && <StalledNotice name={invite.name} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="How often" htmlFor={`rm-c-${invite.id}`}>
          <select id={`rm-c-${invite.id}`} className={inputCls} value={cadence} onChange={e => { setCadence(e.target.value as ReminderCadence); setSaved(false) }}>
            {CADENCES.map(c => <option key={c} value={c}>{CADENCE_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Preferred day" htmlFor={`rm-w-${invite.id}`}>
          <select id={`rm-w-${invite.id}`} className={inputCls} disabled={!on} value={weekday} onChange={e => { setWeekday(e.target.value); setSaved(false) }}>
            <option value="">Any day</option>
            {WEEKDAYS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </Field>
        <Field label="Pause until" htmlFor={`rm-p-${invite.id}`}>
          <input id={`rm-p-${invite.id}`} type="date" className={inputCls} disabled={!on} min={todayIso()} value={pause} onChange={e => { setPause(e.target.value); setSaved(false) }} />
        </Field>
      </div>
      <p className="text-xs text-neutral-mid">
        Last reply received: {setting?.last_reply_at ? fmtDate(setting.last_reply_at) : invite.submitted_at ? fmtDate(invite.submitted_at) : 'none yet'}
        {setting?.last_sent_at ? `. Last reminder sent ${fmtDate(setting.last_sent_at)}` : ''}
        {on && setting && setting.unanswered_count > 0 && !setting.stalled ? `. ${setting.unanswered_count} reminder${setting.unanswered_count === 1 ? '' : 's'} without a reply so far` : ''}.
      </p>
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>{busy && <Loader2 size={14} className="animate-spin" />} Save</button>
        <span role="status" aria-live="polite" className="text-sm text-green-700">{saved ? 'Saved.' : ''}</span>
      </div>
    </li>
  )
}

/** The reminder settings for every family contact who has an email address and has not been cancelled. */
export function FamilyReminders({ client, resident }: { client: Client; resident: ResidentDetail }) {
  const { ready, items, loaded, reload } = useReminders(client, resident)
  const contacts = resident.invites.filter(i => i.status !== 'revoked' && !!i.email)
  if (!contacts.length) return null
  return (
    <section className="space-y-3" aria-label="Family reminders">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><BellRing size={15} className="text-teal" aria-hidden="true" /> Gentle reminders</h3>
        <p className="mt-1 text-sm text-neutral-mid">Ask someone again every so often. Each reminder carries a fresh private link and a one click way for them to stop. We never send more than one in 6 days, and we stop after 3 reminders with no reply.</p>
      </div>
      {!ready ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-4 text-sm text-neutral-mid">Reminders are being set up. Please check again shortly.</p>
      ) : !loaded ? (
        <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={14} className="animate-spin" /> Loading</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {contacts.map(c => <ContactRow key={c.id} client={client} resident={resident} invite={c} setting={items.find(r => r.invite_id === c.id)} onSaved={() => { void reload() }} />)}
        </ul>
      )}
    </section>
  )
}
