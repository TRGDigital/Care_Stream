'use client'

// Notifications: an administrator writes a message and sends it to all staff or chosen staff. Each person gets an email and, at their next sign in,
// an overlay in their hub; they open it and press Mark as read, and this page shows who has read it.

import { useAskPageContext } from '@/lib/ask-context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, ChevronLeft, Loader2, Mail, Search, Send } from 'lucide-react'
import { AttachPicker } from '@/components/notifications/attach-picker'
import { AttachmentList, PaperclipCount, fileIcon } from '@/components/notifications/attachments'
import { adminNotifications, fmtSize, type FileItem, fmtWhen, BODY_MAX, TITLE_MAX, NotificationsError, type SentItem, type SentDetail, type StaffOption } from '@/lib/notifications-client'

const FIELD = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const BTN = 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50'

const paragraphs = (body: string) => body.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(p => p.trim())

function Progress({ read, total }: { read: number; total: number }) {
  const pct = total ? Math.round((read / total) * 100) : 0
  return (
    <div className="min-w-[120px]">
      <p className="text-xs font-medium text-neutral-dark">{read} of {total} read</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${read} of ${total} have read it`}>
        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  useAskPageContext({ page: 'notifications', label: 'the notifications page' })
  const { data: session } = useSession()
  const token = session?.accessToken
  const me = session?.user?.name ?? 'You'

  const [notReady, setNotReady] = useState(false)
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [sent, setSent] = useState<SentItem[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  // A draft from Ask CareStream arrives as ?title=...&body=... : it only fills the form, nothing is sent until the administrator presses Send.
  useEffect(() => {
    try { const q = new URLSearchParams(window.location.search); const t = q.get('title'), b = q.get('body'); if (t) setTitle(t.slice(0, 120)); if (b) setBody(b.slice(0, 2000)) } catch { /* ignore */ }
  }, [])
  const [audience, setAudience] = useState<'all' | 'selected'>('all')
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [files, setFiles] = useState<FileItem[]>([])
  const [query, setQuery] = useState('')
  const [step, setStep] = useState<'write' | 'confirm'>('write')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const [s, l] = await Promise.all([adminNotifications.staff(token), adminNotifications.list(token)])
      setStaff(s.staff); setSent(l.notifications)
    } catch (e) {
      if (e instanceof NotificationsError && e.status === 503) setNotReady(true)
      else setError(e instanceof Error ? e.message : 'Could not load notifications.')
      setSent(prev => prev ?? [])
    }
  }, [token])
  useEffect(() => { void load() }, [load])

  const shown = useMemo(() => staff.filter(s => !query.trim() || `${s.name} ${s.job_role ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [staff, query])
  const recipientCount = audience === 'all' ? staff.length : chosen.size
  const toggle = (id: string) => setChosen(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n })

  function review() {
    setError(''); setDone(null)
    if (!title.trim()) return setError('Please add a title.')
    if (!body.trim()) return setError('Please write the message.')
    if (recipientCount === 0) return setError(audience === 'all' ? 'There is nobody to send it to yet.' : 'Choose at least one person.')
    setStep('confirm')
  }

  async function send() {
    if (!token || busy) return
    setBusy(true); setError('')
    try {
      const r = await adminNotifications.send(token, { title: title.trim(), body: body.trim(), audience, ...(audience === 'selected' ? { user_ids: [...chosen] } : {}), ...(files.length ? { file_ids: files.map(f => f.id) } : {}) })
      setDone(`Sent to ${r.recipients} ${r.recipients === 1 ? 'person' : 'people'}.${r.email_failed ? ` ${r.email_failed} email${r.email_failed === 1 ? '' : 's'} could not be sent, but ${r.email_failed === 1 ? 'it' : 'they'} will still see it in their hub.` : ' They have been emailed and will see it in their hub.'}`)
      setTitle(''); setBody(''); setFiles([]); setChosen(new Set()); setAudience('all'); setStep('write')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send it.'); setStep('write') } finally { setBusy(false) }
  }

  if (openId && token) return <Detail token={token} id={openId} onBack={() => { setOpenId(null); void load() }} />

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><Bell size={22} className="text-teal" aria-hidden="true" /> Notifications</h1>
        <p className="mt-1 text-sm text-neutral-mid">Send a message to your team. They get an email, and an alert in their hub the next time they sign in. You can see who has read it.</p>
      </div>

      {notReady && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">Notifications are not switched on yet. They will be available shortly.</p>}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Write a notification">
        <h2 className="text-base font-semibold text-neutral-dark">{step === 'write' ? 'Write a notification' : 'Check it before you send'}</h2>

        {step === 'write' ? (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="n-title" className="mb-1 flex justify-between text-sm font-medium text-neutral-dark"><span>Title</span><span className="text-xs font-normal text-neutral-mid">{title.length}/{TITLE_MAX}</span></label>
              <input id="n-title" className={FIELD} maxLength={TITLE_MAX} value={title} onChange={e => setTitle(e.target.value)} placeholder="For example: Fire drill on Thursday" />
            </div>
            <div>
              <label htmlFor="n-body" className="mb-1 flex justify-between text-sm font-medium text-neutral-dark"><span>Message</span><span className="text-xs font-normal text-neutral-mid">{body.length}/{BODY_MAX}</span></label>
              <textarea id="n-body" className={FIELD} rows={6} maxLength={BODY_MAX} value={body} onChange={e => setBody(e.target.value)} placeholder="Write what you want your team to know. Plain text, line breaks are kept." />
            </div>

            <AttachPicker token={token} files={files} onChange={setFiles} disabled={busy} />

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-neutral-dark">Send to</legend>
              <div className="flex flex-wrap gap-3">
                {([['all', `All staff (${staff.length})`], ['selected', 'Choose staff']] as const).map(([k, label]) => (
                  <label key={k} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${audience === k ? 'border-teal bg-teal/5 text-teal' : 'border-gray-200 text-neutral-dark'}`}>
                    <input type="radio" name="n-audience" checked={audience === k} onChange={() => setAudience(k)} className="h-4 w-4" /> {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-mid">Active staff with an email address. Agency workers and shared tablets are not included.</p>
            </fieldset>

            {audience === 'selected' && (
              <div className="rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
                  <div className="relative min-w-[200px] flex-1">
                    <Search size={14} className="absolute left-3 top-3 text-neutral-mid" aria-hidden="true" />
                    <input className={`${FIELD} pl-9`} placeholder="Search by name or job role" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search staff" />
                  </div>
                  <button type="button" className={`${BTN} border border-gray-200 text-neutral-dark`} onClick={() => setChosen(new Set([...chosen, ...shown.map(s => s.id)]))}>Select {query.trim() ? 'these' : 'all'}</button>
                  <button type="button" className={`${BTN} border border-gray-200 text-neutral-dark`} onClick={() => setChosen(new Set())}>Clear</button>
                  <span className="text-sm text-neutral-mid" aria-live="polite">{chosen.size} chosen</span>
                </div>
                <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
                  {shown.map(s => (
                    <li key={s.id}>
                      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50">
                        <input type="checkbox" className="h-4 w-4" checked={chosen.has(s.id)} onChange={() => toggle(s.id)} />
                        <span className="text-sm font-medium text-neutral-dark">{s.name}</span>
                        {s.job_role && <span className="text-xs text-neutral-mid">{s.job_role}</span>}
                      </label>
                    </li>
                  ))}
                  {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-mid">Nobody matches that search.</li>}
                </ul>
              </div>
            )}

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {done && <p role="status" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"><Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{done}</p>}
            <button type="button" className={`${BTN} bg-teal text-white hover:bg-teal-dark`} disabled={!token || notReady} onClick={review}><Send size={15} aria-hidden="true" /> Review and send</button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-neutral-mid">This is how it will look in the email and in their hub. Once sent it cannot be taken back.</p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs text-neutral-mid">From {me}</p>
              <p className="mt-2 text-base font-bold text-neutral-dark">{title}</p>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-dark">{paragraphs(body).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-gray-200 pt-3" aria-label="Attached documents">
                  {files.map(f => <li key={f.id} className="flex items-center gap-2 text-sm text-neutral-dark"><span className="text-teal">{fileIcon(f.mime, 16)}</span><span className="truncate">{f.name}</span><span className="text-xs text-neutral-mid">{fmtSize(f.size_bytes)}</span></li>)}
                </ul>
              )}
            </div>
            <p className="flex items-center gap-2 text-sm text-neutral-dark"><Mail size={15} aria-hidden="true" /> {recipientCount} {recipientCount === 1 ? 'person' : 'people'} will be emailed: {audience === 'all' ? 'all staff' : 'the staff you chose'}.</p>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={`${BTN} bg-teal text-white hover:bg-teal-dark`} disabled={busy} onClick={send}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send to {recipientCount} {recipientCount === 1 ? 'person' : 'people'}</button>
              <button type="button" className={`${BTN} border border-gray-200 text-neutral-dark`} disabled={busy} onClick={() => setStep('write')}>Back and edit</button>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Sent notifications">
        <h2 className="mb-3 text-base font-semibold text-neutral-dark">Sent</h2>
        {sent === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p>
          : sent.length === 0 ? <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-neutral-mid">Nothing sent yet. What you send will appear here, with who has read it.</p>
          : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {sent.map(n => (
                <li key={n.id}>
                  <button type="button" onClick={() => setOpenId(n.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal/30">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-neutral-dark">{n.title}</span>
                      <span className="block text-xs text-neutral-mid">{fmtWhen(n.created_at)}, from {n.created_by_name}{n.audience === 'all' ? ', all staff' : ''} <PaperclipCount count={n.file_count} className="ml-1" /></span>
                    </span>
                    {n.withdrawn ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-neutral-mid">Withdrawn</span> : <Progress read={n.read} total={n.total} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}

function Detail({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const [d, setD] = useState<SentDetail | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => adminNotifications.get(token, id).then(setD).catch(e => setError(e instanceof Error ? e.message : 'Could not load it.')), [token, id])
  useEffect(() => { void load() }, [load])

  async function remind() {
    setBusy(true); setError(''); setNote('')
    try { const r = await adminNotifications.remind(token, id); setNote(`Reminder sent to ${r.reminded} ${r.reminded === 1 ? 'person' : 'people'}.`); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not send the reminder.') } finally { setBusy(false) }
  }

  async function withdraw() {
    if (!window.confirm('Withdraw this notification? It will disappear from every recipient\'s hub. Emails that were already sent cannot be recalled.')) return
    setBusy(true); setError(''); setNote('')
    try { const r = await adminNotifications.withdraw(token, id); setNote(`Withdrawn from ${r.recipients} ${r.recipients === 1 ? 'hub' : 'hubs'}. ${r.email_note}`); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not withdraw it.') } finally { setBusy(false) }
  }

  const n = d?.notification
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"><ChevronLeft size={16} aria-hidden="true" /> All notifications</button>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!d ? <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p> : n && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-neutral-dark">{n.title}</h1>
            <p className="mt-1 text-xs text-neutral-mid">{fmtWhen(n.created_at)}, from {n.created_by_name}</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-dark">{paragraphs(n.body).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
            <AttachmentList files={n.files} token={token} pathFor={fid => `/notifications/files/${encodeURIComponent(fid)}/download`} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
              <Progress read={n.read} total={n.total} />
              <div className="text-right">
                {n.withdrawn && <p className="mb-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-neutral-mid">Withdrawn from staff hubs</p>}
                <button type="button" className={`${BTN} border border-teal text-teal hover:bg-teal/5`} disabled={busy || n.withdrawn || n.unread === 0 || n.can_remind_in_minutes > 0} onClick={remind}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Remind unread ({n.unread})
                </button>
                {!n.withdrawn && <button type="button" className={`${BTN} ml-2 border border-red-300 text-red-700 hover:bg-red-50`} disabled={busy} onClick={withdraw}>Withdraw</button>}
                {n.can_remind_in_minutes > 0 && <p className="mt-1 text-xs text-neutral-mid">You can send another reminder in about {Math.ceil(n.can_remind_in_minutes / 60)} hour{Math.ceil(n.can_remind_in_minutes / 60) === 1 ? '' : 's'}.</p>}
              </div>
            </div>
            {note && <p role="status" className="px-5 pt-3 text-sm text-green-700">{note}</p>}
            <ul className="divide-y divide-gray-100">
              {d.people.map(p => (
                <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                  <span className="text-sm font-medium text-neutral-dark">{p.name}{p.job_role && <span className="ml-2 text-xs font-normal text-neutral-mid">{p.job_role}</span>}</span>
                  {p.read_at
                    ? <span className="inline-flex items-center gap-1 text-sm text-green-700"><Check size={14} aria-hidden="true" /> Read {fmtWhen(p.read_at)}</span>
                    : <span className="text-sm text-amber-700">Not read yet{!p.email_sent && ', email not sent'}</span>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
