'use client'

// HOUSE RULE 5, DISTRIBUTION CHOICE: one place, next to Save PDF and Print, to choose HOW a document goes (email, a hub notification, or both) and WHO gets it (one person, chosen staff,
// or all staff), with a summary of exactly what will happen before anything is sent. The summary comes from the server (counts, names for ten or fewer, the Ask settings limits, the
// approval rule). Nothing is sent until the administrator presses Send and then confirms it once more. A letter goes to one person at a time and a print only letter is never sent.
import { useEffect, useRef, useState } from 'react'
import { Check, Eye, Loader2, Send } from 'lucide-react'
import { ask, AskError, type SharePlan } from '@/lib/ask-client'
import { StaffPicker, useStaff } from '@/components/ask/staff-picker'

type How = 'email' | 'hub' | 'both'
type Who = 'one' | 'selected' | 'all'
const WHO_FOR: Record<string, Who[]> = { letter: ['one'], newsletter: ['one', 'selected', 'all'], report: ['one', 'selected'] }
const WHO_LABEL: Record<Who, string> = { one: 'One person', selected: 'Chosen staff', all: 'All staff' }

export function SharePanel({ token, doc, sign, needsAck, onPreview, onSent }: {
  token: string
  doc: { id: string; type: string; title: string; status: string; staff_name?: string | null; share_intent?: { hub: boolean; email: boolean; print_only: boolean } | null }
  sign?: boolean
  needsAck?: boolean
  onPreview?: () => void
  onSent?: () => void
}) {
  const letter = doc.type === 'letter'
  const options = WHO_FOR[doc.type] ?? []
  const intent = doc.share_intent
  const startHow: How = letter ? (intent?.hub && intent?.email ? 'both' : intent?.email ? 'email' : 'hub') : 'both'
  const [open, setOpen] = useState(false)
  const [how, setHow] = useState<How>(startHow)
  const [who, setWho] = useState<Who>(options[0] ?? 'one')
  const [ids, setIds] = useState<string[]>([])
  const [plan, setPlan] = useState<{ plan: SharePlan; summary: string } | null>(null)
  const [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(''), [done, setDone] = useState('')
  const staff = useStaff(token, open && !letter && who !== 'all')
  const seq = useRef(0)
  useEffect(() => { setHow(startHow) }, [intent?.hub, intent?.email, intent?.print_only])   // eslint-disable-line react-hooks/exhaustive-deps
  // Work out what a send WOULD do whenever the choice changes. This sends nothing.
  useEffect(() => {
    if (!open) return
    const n = ++seq.current
    setConfirming(false); setDone('')
    const t = setTimeout(() => { ask.sharePlan(token, doc.id, { how, who, user_ids: ids }).then(r => { if (n === seq.current) setPlan(r) }).catch(e => { if (n === seq.current) setError(e instanceof AskError ? e.message : 'The summary could not be made.') }) }, 200)
    return () => clearTimeout(t)
  }, [open, how, who, ids, token, doc.id, doc.status])
  async function send() {
    setBusy(true); setError('')
    try { const r = await ask.shareSend(token, doc.id, { how, who, user_ids: ids, sign, needs_acknowledgement: needsAck }); setDone(`Sent to ${r.count} ${r.count === 1 ? 'person' : 'people'}.`); setConfirming(false); setOpen(false); onSent?.() }
    catch (e) { setError(e instanceof AskError ? e.message : 'It could not be sent just now.'); setConfirming(false) } finally { setBusy(false) }
  }
  if (!options.length) return null
  const p = plan?.plan
  const hubText = letter ? 'In their hub, under My letters, with a hub notification' : 'A hub notification with the document attached (no email)'
  const emailText = letter ? 'By email, as a PDF from you' : 'By email, and as a hub notification, with the document attached'
  return (
    <div className="w-full rounded-lg border border-teal/40 bg-teal/5 p-3 text-sm text-neutral-dark">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark"><Send size={14} aria-hidden="true" /> {open ? 'Close sharing' : 'Share this'}</button>
        <span className="text-xs text-neutral-mid">Nothing goes until you press Send.</span>
        {done && <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-green-800"><Check size={12} aria-hidden="true" />{done}</span>}
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <fieldset><legend className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">How</legend>
            <div className="mt-1 space-y-1">
              {([['hub', hubText], ['email', emailText], ['both', letter ? 'By email and in their hub' : 'Email and hub notification (the same as email)']] as Array<[How, string]>).filter(([k]) => letter || k !== 'both').map(([k, t]) => (
                <label key={k} className="flex items-start gap-2"><input type="radio" name={`how-${doc.id}`} className="mt-0.5 h-4 w-4" checked={how === k} onChange={() => setHow(k)} /><span>{t}</span></label>
              ))}
            </div>
          </fieldset>
          <fieldset><legend className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Who</legend>
            {letter ? <p className="mt-1">{doc.staff_name ? <strong className="font-medium">{doc.staff_name}</strong> : 'The person this letter is for'}. A letter goes to one person at a time.</p> : (<>
              <div className="mt-1 flex flex-wrap gap-4">{options.map(w => <label key={w} className="flex items-center gap-1.5"><input type="radio" name={`who-${doc.id}`} checked={who === w} onChange={() => { setWho(w); setIds([]) }} /> {WHO_LABEL[w]}</label>)}</div>
              {who !== 'all' && <div className="mt-2">{staff === null ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
                : <StaffPicker people={staff} selected={ids} onChange={setIds} mode={who === 'one' ? 'single' : 'multi'} bulk={who === 'selected'} needEmail label="Who gets it" />}</div>}
            </>)}
          </fieldset>
          <div className="rounded-md border border-gray-200 bg-white p-2.5" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Summary</p>
            {!p ? <p className="mt-1 flex items-center gap-2 text-xs text-neutral-mid"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Checking</p> : p.ok ? (
              <dl className="mt-1 space-y-0.5">
                <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-mid">What</dt><dd className="min-w-0 break-words">{p.what}</dd></div>
                <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-mid">How</dt><dd>{p.how_text}</dd></div>
                <div className="flex gap-2"><dt className="w-14 shrink-0 text-neutral-mid">To</dt><dd>{p.count} {p.count === 1 ? 'person' : 'people'}{p.names.length ? `: ${p.names.join(', ')}` : ''}{p.left_out ? `. ${p.left_out} left out (no email address or not eligible).` : ''}</dd></div>
              </dl>
            ) : <ul className="mt-1 list-disc space-y-0.5 pl-4 text-red-800">{p.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>}
            {onPreview && <button type="button" onClick={onPreview} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal underline"><Eye size={12} aria-hidden="true" /> Preview what they will get</button>}
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {!confirming
              ? <button type="button" disabled={!p?.ok || busy} onClick={() => setConfirming(true)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><Send size={14} aria-hidden="true" /> Send</button>
              : <><button type="button" disabled={busy} onClick={send} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} Yes, send it to {p?.count ?? 0} {p?.count === 1 ? 'person' : 'people'} now</button>
                <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">Not yet</button></>}
            {confirming && <span className="text-xs text-neutral-mid">It cannot be taken back once sent{letter ? ', but a letter in the hub can be withdrawn' : ''}.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
