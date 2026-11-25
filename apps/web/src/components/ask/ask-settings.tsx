'use client'

// Settings, Ask CareStream: what the assistant may DO for administrators (never on its own: it proposes, and a person confirms). Everything is off by default.
import { useEffect, useState } from 'react'
import { ask, AskError, type AskSettingsView, type UploadRetention } from '@/lib/ask-client'

export function AskSettingsBody({ token }: { token: string }) {
  const [s, setS] = useState<AskSettingsView | null>(null)
  const [error, setError] = useState('')
  const [up, setUp] = useState<{ retention: UploadRetention; retentions: Array<{ id: UploadRetention; label: string; note: string }> } | null>(null)
  useEffect(() => { let live = true; ask.uploads.config(token).then(r => { if (live) setUp({ retention: r.retention, retentions: r.retentions }) }).catch(() => undefined); return () => { live = false } }, [token])
  async function setRetention(r: UploadRetention) {
    if (!up) return
    setError(''); const was = up; setUp({ ...up, retention: r })
    try { await ask.uploads.saveConfig(token, r) } catch (e) { setUp(was); setError(e instanceof AskError ? e.message : 'Could not save.') }
  }
  useEffect(() => { let live = true; ask.actions.settings(token).then(r => { if (live) setS(r.settings) }).catch(e => { if (live) setError(e instanceof AskError ? e.message : 'Could not load.') }); return () => { live = false } }, [token])
  async function change(patch: Partial<AskSettingsView>) {
    if (!s) return
    setError(''); const was = s; setS({ ...s, ...patch })
    try { setS((await ask.actions.saveSettings(token, patch)).settings) } catch (e) { setS(was); setError(e instanceof AskError ? e.message : 'Could not save.') }
  }
  const sw = (key: keyof AskSettingsView, label: string, hint: string, disabled = false) => (
    <label className="flex items-start gap-2.5 text-sm text-neutral-dark">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!s?.[key]} disabled={!s || disabled} onChange={e => change({ [key]: e.target.checked } as any)} />
      <span><strong>{label}</strong> {hint}</span>
    </label>
  )
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">Ask CareStream can prepare actions for you, such as a staff notification, a reminder or a training allocation. It never does anything on its own: it shows a card with exactly who it would reach, and nothing happens until you press <strong>Confirm</strong>. Everything below is off until you switch it on.</p>
      {sw('actions_enabled', 'Let Ask CareStream take actions.', 'The master switch. With this off, it can only read, calculate and draft.')}
      <div className="space-y-3 border-l-2 border-gray-100 pl-4">
        {sw('notifications_enabled', 'Notifications and reminders.', 'Staff notifications, and reminders for people who have not read one.', !s?.actions_enabled)}
        {sw('training_enabled', 'Training.', 'Allocating courses and sending training reminders.', !s?.actions_enabled)}
        {sw('emails_enabled', 'Emails.', 'Also email staff when a notification is sent from Ask CareStream (to your own staff only, never outside addresses).', !s?.actions_enabled)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-neutral-dark"><span className="font-semibold">Most people in one action</span>
          <input type="number" min={1} max={500} value={s?.max_recipients ?? 100} disabled={!s} onChange={e => s && setS({ ...s, max_recipients: Number(e.target.value) })} onBlur={e => change({ max_recipients: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <span className="mt-0.5 block text-xs text-neutral-mid">Up to 500. Default 100.</span></label>
        <label className="text-sm text-neutral-dark"><span className="font-semibold">Minutes between actions</span>
          <input type="number" min={0} max={60} value={s?.min_gap_minutes ?? 2} disabled={!s} onChange={e => s && setS({ ...s, min_gap_minutes: Number(e.target.value) })} onBlur={e => change({ min_gap_minutes: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <span className="mt-0.5 block text-xs text-neutral-mid">The shortest gap between two confirmed actions by the same person. Default 2.</span></label>
      </div>
      {sw('managers_can_use', 'Let managers use Ask CareStream.', 'Care managers and registered managers can use Ask CareStream, with a safe set of tools: no pay rates, no resident funding and no one else\'s holiday balance (unless you have also switched on "Let managers see funding" under Finance). They can act on the staff of this account.')}
      {sw('approver_emails', 'Email approvers as well.', 'When a letter, newsletter or report is waiting for approval, or has been approved or sent back, the people involved always get a message in their hub. Switch this on to email them as well. The message names the kind of document and who wrote it, never its content. Default on.')}
      {up && (
        <fieldset className="space-y-2 border-t border-gray-100 pt-4">
          <legend className="text-sm font-semibold text-neutral-dark">Files attached to a chat</legend>
          <p className="text-sm text-neutral-mid">Administrators can attach a spreadsheet, Word file or PDF to the Pay, Finance, Staff, Holiday, Training, Letters and Staff newsletter agents (each shows what suits it). It is never offered for anything about sickness, residents or complaints. CareStream removes bank details, National Insurance numbers, addresses, dates of birth, contact details and health columns as the file is read, and never keeps the original. For letters and newsletters it also replaces staff names with [name]. Only the cleaned copy is kept, in private storage, and only the person who attached it can use it. When should it be deleted?</p>
          {up.retentions.map(o => (
            <label key={o.id} className="flex items-start gap-2.5 text-sm text-neutral-dark">
              <input type="radio" name="upload-retention" className="mt-0.5 h-4 w-4" checked={up.retention === o.id} onChange={() => setRetention(o.id)} />
              <span><strong>{o.label}.</strong> {o.note}</span>
            </label>
          ))}
          <p className="text-xs text-neutral-mid">A change applies to files attached from now on. Every file has a Delete button in the chat.</p>
        </fieldset>
      )}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}
