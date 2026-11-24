'use client'

// An action card in the Ask CareStream panel. The agent only PROPOSED this; nothing happens until the administrator presses Confirm. The card shows exactly who it would
// reach (with a picker to tick or untick people), one fully personalised preview, and lets the wording, people and due date be changed first.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, CheckCircle2, Loader2, Search, ShieldCheck, Undo2, Users, X } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { ask, AskError, type ActionPerson, type AskActionCard } from '@/lib/ask-client'
import { adminNotifications } from '@/lib/notifications-client'

const FIELD_HINTS: Array<[string, string]> = [['{first_name}', 'first name'], ['{hours_left}', 'holiday left'], ['{hours_taken}', 'holiday taken'], ['{holiday_year_end}', 'year end'], ['{training_due}', 'training due']]
const inp = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

let staffCache: { at: number; token: string; list: ActionPerson[] } | null = null
async function loadStaff(token: string): Promise<ActionPerson[]> {
  if (staffCache && staffCache.token === token && Date.now() - staffCache.at < 60_000) return staffCache.list
  const r = await ask.actions.staff(token); staffCache = { at: Date.now(), token, list: r.staff }; return r.staff
}

function Picker({ people, selected, suggested, onChange, max, disabled, needEmail }: { people: ActionPerson[]; selected: Set<string>; suggested: Set<string>; onChange: (ids: string[]) => void; max: number; disabled: boolean; needEmail: boolean }) {
  const [q, setQ] = useState(''), [role, setRole] = useState('')
  const roles = useMemo(() => [...new Set(people.map(p => p.job_role).filter(Boolean) as string[])].sort(), [people])
  const shown = people.filter(p => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!role || p.job_role === role))
  const reachable = (p: ActionPerson) => !needEmail || p.has_email !== false
  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); onChange([...n]) }
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-2">
        <button type="button" disabled={disabled} onClick={() => onChange(people.filter(reachable).slice(0, max).map(p => p.id))} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><Users size={12} className="mr-1 inline" aria-hidden="true" />All active staff</button>
        <button type="button" disabled={disabled} onClick={() => onChange(shown.filter(reachable).map(p => p.id).filter(id => !selected.has(id)).length ? [...new Set([...selected, ...shown.filter(reachable).map(p => p.id)])].slice(0, max) : [])} className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50">Tick shown</button>
        <button type="button" disabled={disabled} onClick={() => onChange([])} className="rounded-md px-2 py-1 text-xs font-medium text-neutral-mid hover:text-neutral-dark disabled:opacity-50">Clear</button>
        <span className="ml-auto text-xs font-semibold text-neutral-dark">{selected.size} selected <span className="font-normal text-neutral-mid">(up to {max})</span></span>
      </div>
      <div className="flex gap-2 p-2">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Find a person</span><Search size={13} className="pointer-events-none absolute left-2 top-2.5 text-neutral-mid" aria-hidden="true" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a person" className={`${inp} pl-7`} /></label>
        {roles.length > 1 && <label><span className="sr-only">Job role</span><select value={role} onChange={e => setRole(e.target.value)} className={`${inp} w-auto`}><option value="">All roles</option>{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></label>}
      </div>
      <ul className="no-scrollbar max-h-64 overflow-y-auto px-1 pb-1" aria-label="Staff">
        {shown.map(p => (
          <li key={p.id}>
            <label className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${reachable(p) ? 'cursor-pointer hover:bg-neutral-light' : 'opacity-50'}`}>
              <input type="checkbox" className="h-4 w-4" checked={selected.has(p.id)} disabled={disabled || !reachable(p)} onChange={() => toggle(p.id)} />
              <StaffAvatar name={p.name} photoUrl={p.photo_url} size={24} />
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-dark">{p.name}{suggested.has(p.id) && <span className="ml-1.5 rounded-full bg-teal/10 px-1.5 py-px text-[10px] font-bold text-teal">Suggested</span>}</span>
              <span className="shrink-0 text-xs text-neutral-mid">{reachable(p) ? p.job_role : 'No email on file'}</span>
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-3 text-sm text-neutral-mid">Nobody matches.</li>}
      </ul>
    </div>
  )
}

export function ActionCard({ token, card: initial, onChanged }: { token: string; card: AskActionCard; onChanged?: (c: AskActionCard) => void }) {
  const [card, setCard] = useState(initial)
  const [staff, setStaff] = useState<ActionPerson[]>(initial.recipients)
  const [title, setTitle] = useState(initial.title ?? ''), [body, setBody] = useState(initial.body ?? '')
  const [due, setDue] = useState(initial.due_date ?? ''), [email, setEmail] = useState(!!initial.email)
  const [ids, setIds] = useState<string[]>(initial.recipients.map(r => r.id))
  const [busy, setBusy] = useState<'save' | 'confirm' | 'cancel' | 'withdraw' | null>(null)
  const [error, setError] = useState('')
  const [withdrawn, setWithdrawn] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const open = card.status === 'proposed'
  const editable = card.type === 'send_staff_notification' || card.type === 'allocate_training'
  const narrowOnly = card.type === 'remind_unread_notification' || card.type === 'send_training_reminders'
  const suggested = useMemo(() => new Set(card.suggested), [card.suggested])

  useEffect(() => { if (open) loadStaff(token).then(setStaff).catch(() => undefined) }, [open, token])
  const update = useCallback((c: AskActionCard) => { setCard(c); onChanged?.(c) }, [onChanged])
  const save = useCallback(async (patch: Parameters<typeof ask.actions.edit>[2]) => {
    setBusy('save'); setError('')
    try { const r = await ask.actions.edit(token, card.id, patch); update(r.card); setIds(r.card.recipients.map(x => x.id)) } catch (e) { setError(e instanceof AskError ? e.message : 'Could not update the card.') } finally { setBusy(null) }
  }, [token, card.id, update])

  function changeIds(next: string[]) { setIds(next); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => save({ user_ids: next }), 500) }
  async function confirm() {
    setBusy('confirm'); setError('')
    try {
      // Save any wording or due date edits first, then confirm.
      if (editable) { const r = await ask.actions.edit(token, card.id, { ...(card.type === 'send_staff_notification' ? { title, body, email } : { due_date: due || null }), user_ids: ids }); update(r.card) }
      const r = await ask.actions.confirm(token, card.id); update(r.card)
    } catch (e) { setError(e instanceof AskError ? e.message : 'It could not be completed. Please check before trying again.'); try { update((await ask.actions.get(token, card.id)).card) } catch { /* keep what is shown */ } } finally { setBusy(null) }
  }
  async function cancel() { setBusy('cancel'); try { await ask.actions.cancel(token, card.id); update({ ...card, status: 'cancelled' }) } catch (e) { setError(e instanceof AskError ? e.message : 'Could not cancel.') } finally { setBusy(null) } }
  async function withdraw() {
    const nids: string[] = card.result?.notification_ids ?? []; if (!nids.length) return
    setBusy('withdraw'); setError('')
    try { let n = 0; for (const id of nids) { await adminNotifications.withdraw(token, id); n++ } setWithdrawn(`Withdrawn from ${n === 1 ? 'the hub' : `${n} hubs`}. Emails already sent cannot be recalled.`) } catch (e: any) { setError(e?.message ?? 'Could not withdraw it.') } finally { setBusy(null) }
  }

  const statusChip = { proposed: ['Waiting for you', 'bg-amber-100 text-amber-900'], done: ['Done', 'bg-green-100 text-green-800'], cancelled: ['Cancelled', 'bg-gray-100 text-neutral-mid'], expired: ['Expired', 'bg-gray-100 text-neutral-mid'], failed: ['Not completed', 'bg-red-100 text-red-800'], confirmed: ['Working', 'bg-sky-100 text-sky-800'] }[card.status]
  const insert = (tok: string) => setBody(b => `${b}${b && !b.endsWith(' ') && !b.endsWith('\n') ? ' ' : ''}${tok}`)

  return (
    <section className="mt-3 rounded-xl border border-teal/40 bg-teal/5 p-4 text-sm" aria-label={card.label}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-neutral-dark"><ShieldCheck size={15} className="text-teal" aria-hidden="true" /> {card.label}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusChip[1]}`}>{statusChip[0]}</span>
      </div>
      <p className="mt-1 text-neutral-dark">{open ? `${ids.length} ${ids.length === 1 ? 'person' : 'people'} selected. ` : ''}{card.summary}</p>
      {open && <p className="mt-0.5 text-xs text-neutral-mid">Nothing has happened yet. Check the people and the wording, then press Confirm.</p>}
      {card.notes.length > 0 && <ul className="mt-2 space-y-1">{card.notes.map(n => <li key={n} className="flex gap-1.5 text-xs text-amber-900"><AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{n}</li>)}</ul>}

      {card.type === 'send_staff_notification' && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-semibold text-neutral-dark">Title<input value={title} onChange={e => setTitle(e.target.value)} disabled={!open} maxLength={120} className={`${inp} mt-1`} /></label>
          <label className="block text-xs font-semibold text-neutral-dark">Message<textarea value={body} onChange={e => setBody(e.target.value)} disabled={!open} rows={5} maxLength={2000} className={`${inp} no-scrollbar mt-1`} /></label>
          {open && <p className="flex flex-wrap items-center gap-1 text-[11px] text-neutral-mid">Put in each person's own figure: {FIELD_HINTS.map(([tok, label]) => <button key={tok} type="button" onClick={() => insert(tok)} className="rounded-full border border-gray-300 bg-white px-2 py-0.5 font-medium text-neutral-dark hover:border-teal">{label}</button>)}</p>}
          {(card.unknown_fields ?? []).length > 0 && <p className="text-xs text-red-700" role="alert">These placeholders are not allowed: {card.unknown_fields!.join(', ')}.</p>}
          {open && (title !== (card.title ?? '') || body !== (card.body ?? '')) && <button type="button" disabled={busy !== null} onClick={() => save({ title, body })} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light">Update the preview</button>}
          {card.preview && <div className="rounded-lg border border-gray-200 bg-white p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">Preview for {card.preview.for_name}</p><p className="mt-1 font-semibold text-neutral-dark">{card.preview.title}</p><p className="mt-1 whitespace-pre-line text-neutral-dark">{card.preview.body}</p>{(card.personalised ?? []).length > 0 && <p className="mt-2 text-[11px] text-neutral-mid">Each person gets their own figures. Nobody sees anyone else's.</p>}</div>}
          <label className="flex items-center gap-2 text-xs text-neutral-dark"><input type="checkbox" className="h-4 w-4" checked={email && !!card.email_allowed} disabled={!open || !card.email_allowed} onChange={e => setEmail(e.target.checked)} /> Also email them{!card.email_allowed && <span className="text-neutral-mid">(emails from Ask CareStream are switched off in Settings)</span>}</label>
        </div>
      )}
      {card.type === 'allocate_training' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-neutral-dark">Course{(card.courses ?? []).length === 1 ? '' : 's'}: <span className="font-normal">{(card.courses ?? []).join(', ')}</span></p>
          <label className="block text-xs font-semibold text-neutral-dark">Due date (optional)<input type="date" value={due} onChange={e => setDue(e.target.value)} disabled={!open} className={`${inp} mt-1 max-w-[12rem]`} /></label>
          {(card.skipped ?? []).length > 0 && <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs"><p className="font-semibold text-neutral-dark">Skipped</p><ul className="mt-1 space-y-0.5">{card.skipped!.map((s, i) => <li key={i} className="text-neutral-mid">{s.name}: {s.course} ({s.reason})</li>)}</ul></div>}
        </div>
      )}
      {card.type === 'send_training_reminders' && (card.items ?? []).length > 0 && (
        <ul className="no-scrollbar mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-xs">{card.items!.filter(i => ids.includes(i.user_id)).map(i => <li key={i.user_id}><span className="font-semibold text-neutral-dark">{i.name}</span>: <span className="text-neutral-mid">{i.courses.join('; ')}</span></li>)}</ul>
      )}

      {open && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-neutral-dark">{narrowOnly ? 'Who gets it (untick anyone you do not want to include)' : 'Who gets it'}</p>
          <Picker people={narrowOnly ? staff.filter(p => card.suggested.includes(p.id)) : staff} selected={new Set(ids)} suggested={suggested} onChange={changeIds} max={card.max_recipients} disabled={busy !== null} needEmail={card.type === 'send_staff_notification' || card.type === 'remind_unread_notification'} />
        </div>
      )}
      {!open && card.recipients.length > 0 && card.status !== 'done' && <p className="mt-2 text-xs text-neutral-mid">{card.recipients.length} people were selected.</p>}

      {card.status === 'done' && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-900" role="status">
          <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={15} aria-hidden="true" /> Done</p>
          <p className="mt-1 text-xs">{resultLine(card)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(card.type === 'send_staff_notification' || card.type === 'remind_unread_notification') && <Link href="/notifications" className="text-xs font-semibold text-teal underline">See it in Notifications</Link>}
            {card.type === 'allocate_training' && <Link href="/training" className="text-xs font-semibold text-teal underline">See it in Training</Link>}
            {card.type === 'send_staff_notification' && (card.result?.notification_ids ?? []).length > 0 && !withdrawn && <button type="button" disabled={busy !== null} onClick={withdraw} className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{busy === 'withdraw' ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} aria-hidden="true" />} Withdraw</button>}
          </div>
          {withdrawn && <p className="mt-2 text-xs">{withdrawn}</p>}
          {card.type === 'send_staff_notification' && !withdrawn && <p className="mt-1.5 text-[11px] text-green-800">Withdrawing removes it from their hubs. An email that was already sent cannot be recalled.</p>}
        </div>
      )}
      {card.status === 'failed' && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{card.result?.error ?? 'It could not be completed.'}</p>}
      {card.status === 'expired' && <p className="mt-3 text-xs text-neutral-mid">This proposal has expired (they last 30 minutes). Ask again for a fresh one.</p>}
      {error && <p className="mt-2 text-xs text-red-700" role="alert">{error}</p>}

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={confirm} disabled={busy !== null || ids.length === 0 || (card.type === 'send_staff_notification' && (!title.trim() || !body.trim()))} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy === 'confirm' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} aria-hidden="true" />} Confirm</button>
          <button type="button" onClick={cancel} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-50"><X size={15} aria-hidden="true" /> Cancel</button>
        </div>
      )}
    </section>
  )
}

function resultLine(c: AskActionCard): string {
  const r = c.result ?? {}
  if (c.type === 'send_staff_notification') return `Sent to ${r.recipients ?? 0} ${r.recipients === 1 ? 'person' : 'people'}${r.emailed ? `, ${r.emailed} emailed` : ''}${r.email_failed ? `, ${r.email_failed} emails failed (they still see it in their hub)` : ''}${r.dropped ? `. ${r.dropped} could not be reached` : ''}.`
  if (c.type === 'remind_unread_notification') return `Reminded ${r.recipients ?? 0} ${r.recipients === 1 ? 'person' : 'people'}${r.emailed ? `, ${r.emailed} emailed` : ''}.`
  if (c.type === 'allocate_training') return `${r.allocated ?? 0} allocation${r.allocated === 1 ? '' : 's'} made${r.skipped ? `, ${r.skipped} skipped because they already had it` : ''}. Staff are told in their hub.`
  return `${r.reminders ?? 0} reminder${r.reminders === 1 ? '' : 's'} sent to ${r.recipients ?? 0} ${r.recipients === 1 ? 'person' : 'people'}${r.skipped ? `, ${r.skipped} skipped (reminded in the last few minutes, or nowhere to send)` : ''}.`
}
