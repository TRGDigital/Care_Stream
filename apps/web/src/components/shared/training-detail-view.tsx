'use client'

// The full picture of the training a supervision is about: each course allocated against it in full (status, score, what was answered
// wrongly with the right answer, time spent), other training allocated since the last supervision, and the gaps they went back over.
// For the supervisor and admins. Plain facts from their training records: nothing here is scored or judged by AI.
import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, CircleDashed, PlayCircle, AlertTriangle, Clock, BookOpen, RotateCcw, Printer, Mail, ChevronDown, Lightbulb, Plus } from 'lucide-react'
import type { TrainingDetail, TrainingCourseDetail, TrainingSuggestion } from '@/lib/api-client'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'

const d = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const STATUS: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-700', Icon: CircleDashed },
  started:     { label: 'Started',     cls: 'bg-blue-50 text-blue-700', Icon: PlayCircle },
  complete:    { label: 'Completed',   cls: 'bg-green-50 text-green-700', Icon: CheckCircle2 },
  expired:     { label: 'Expired',     cls: 'bg-red-50 text-red-700', Icon: AlertTriangle },
}

function CourseCard({ c, actionStatus, actionText, collapsible = false, open = true, onToggle }: { c: TrainingCourseDetail; actionStatus?: string; actionText?: string; collapsible?: boolean; open?: boolean; onToggle?: () => void }) {
  const s = STATUS[c.status]
  const header = (
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* The mark is shown exactly as supplied: no border, tint, crop or added text, original proportions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.cpd && <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={33} height={30} className="h-[30px] w-[33px] shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-dark">{c.module_name}</p>
            <p className="text-xs text-neutral-mid">{c.kind === 'Annual' ? 'Annual training' : 'Training'}</p>
          </div>
        </div>
        <span className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}><s.Icon size={12} /> {s.label}</span>
          {collapsible && <ChevronDown size={18} className={`shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />}
        </span>
      </div>
  )
  // The one line you can read without opening it: how it is going.
  const summary = [c.score_pct != null ? `Score ${c.score_pct}%` : c.status === 'not_started' ? 'Nothing opened yet' : 'No score yet', c.incorrect.length ? `${c.incorrect.length} answered incorrectly` : (c.answered > 0 ? 'Nothing wrong so far' : ''), c.overdue ? 'Overdue' : ''].filter(Boolean).join(' · ')
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {collapsible
        ? <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full p-4 text-left hover:bg-neutral-light/40">{header}<p className={`mt-1.5 text-xs ${c.overdue || c.incorrect.length ? 'font-medium text-red-700' : 'text-neutral-mid'}`}>{summary}</p></button>
        : <div className="p-4 pb-0">{header}</div>}
      {(!collapsible || open) && (
      <div className={collapsible ? 'border-t border-gray-100 p-4 pt-2' : 'px-4 pb-4'}>
      <p className="mt-2 text-xs text-neutral-mid">
        Allocated {d(c.allocated_at)}
        {c.due_date ? <>, <span className={c.overdue ? 'font-semibold text-red-700' : ''}>due {d(c.due_date)}{c.overdue ? ' (overdue)' : ''}</span></> : ''}
        {c.started_at ? `, started ${d(c.started_at)}` : ''}
        {c.completed_at ? `, completed ${d(c.completed_at)}` : ''}
      </p>
      {actionText && <p className="mt-1 text-xs text-neutral-mid">Supervision action: &ldquo;{actionText}&rdquo; <span className={actionStatus === 'done' ? 'font-semibold text-green-700' : 'font-semibold text-neutral-dark'}>({actionStatus === 'done' ? 'done' : actionStatus === 'in_progress' ? 'in progress' : 'open'})</span></p>}

      {c.status === 'not_started' ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-neutral-dark">Nothing has been opened yet. Worth asking what is getting in the way.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Stat label="Score" value={c.score_pct != null ? `${c.score_pct}%` : 'n/a'} sub={c.answered ? `${c.correct} of ${c.answered} answered right` : 'no questions answered'} />
          <Stat label="Questions" value={`${c.answered}/${c.total_questions || '?'}`} sub="answered" />
          <Stat label="Time on lesson" value={c.learn_minutes ? `${c.learn_minutes} min` : 'none'} sub={c.attempts ? `${c.attempts} ${c.attempts === 1 ? 'attempt' : 'attempts'}` : ''} />
          <Stat label="Before the course" value={c.baseline ? `${c.baseline.score}/${c.baseline.total}` : 'n/a'} sub={c.baseline ? 'knowledge check' : ''} />
        </div>
      )}
      {c.relearn_required && <p className="mt-2 text-xs font-medium text-amber-700">Three attempts used: they have to go back over the lesson before trying again.</p>}

      {c.incorrect.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">Answered incorrectly ({c.incorrect.length})</p>
          <ul className="space-y-2">
            {c.incorrect.map((q, i) => (
              <li key={i} className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-sm">
                <p className="font-medium text-neutral-dark">{q.question}</p>
                {q.their_answer && <p className="mt-0.5 text-xs text-red-800">Their answer: {q.their_answer.letter}{q.their_answer.text ? `. ${q.their_answer.text}` : ''}</p>}
                {q.correct_answer && <p className="text-xs text-green-800">Correct answer: {q.correct_answer.letter}{q.correct_answer.text ? `. ${q.correct_answer.text}` : ''}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {c.status !== 'not_started' && c.answered > 0 && c.incorrect.length === 0 && <p className="mt-3 flex items-center gap-1.5 text-xs text-green-700"><CheckCircle2 size={13} /> Everything answered so far was right.</p>}
      {c.reflection && <p className="mt-3 rounded-lg bg-teal-light/20 px-3 py-2 text-xs text-neutral-dark"><span className="font-semibold">Their reflection: </span>{c.reflection}</p>}
      </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-neutral-light/50 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">{label}</p>
      <p className="text-base font-bold text-neutral-dark">{value}</p>
      {sub ? <p className="text-[10px] text-neutral-mid">{sub}</p> : null}
    </div>
  )
}

const TONE: Record<string, { bar: string; label: string; cls: string }> = {
  concern: { bar: 'border-l-red-500', label: 'Worth raising', cls: 'text-red-700' },
  check:   { bar: 'border-l-amber-500', label: 'Worth checking', cls: 'text-amber-700' },
  praise:  { bar: 'border-l-green-500', label: 'Worth recognising', cls: 'text-green-700' },
}

// Ideas for the conversation, from how they did on the training. Rules on the real scores and answers (no AI): each shows what it is based on.
// "Add as agreed action" puts it on the supervision; nothing is added unless the supervisor chooses it.
function SuggestionsBox({ suggestions, onAdd }: { suggestions: TrainingSuggestion[]; onAdd?: (id: string) => Promise<'added' | 'already'> }) {
  const [state, setState] = useState<Record<string, 'busy' | 'added' | 'already' | 'error'>>({})
  if (suggestions.length === 0) return null
  async function add(id: string) {
    if (!onAdd) return
    setState(s => ({ ...s, [id]: 'busy' }))
    try { const r = await onAdd(id); setState(s => ({ ...s, [id]: r })) } catch { setState(s => ({ ...s, [id]: 'error' })) }
  }
  return (
    <div className="rounded-xl border border-teal/25 bg-teal-light/10 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Lightbulb size={15} className="text-teal" /> Suggestions for this supervision</h3>
      <p className="mb-3 mt-0.5 text-xs text-neutral-mid">Ideas for the conversation, based on how they did on this training. They are prompts, not judgements, and each shows what it is based on.</p>
      <div className="space-y-2.5">
        {suggestions.map(s => {
          const t = TONE[s.tone], st = state[s.id]
          return (
            <div key={s.id} className={`rounded-lg border border-gray-200 border-l-4 bg-white p-3 ${t.bar}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.cls}`}>{t.label}</p>
              <p className="text-sm font-semibold text-neutral-dark">{s.title}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-neutral-mid">{s.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
              <p className="mt-1.5 text-sm text-neutral-dark">{s.suggestion}</p>
              {onAdd && (
                <div className="mt-2">
                  {st === 'added' || st === 'already'
                    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> {st === 'added' ? 'Added as an agreed action' : 'Already an agreed action'}</span>
                    : <button type="button" onClick={() => add(s.id)} disabled={st === 'busy'} className="inline-flex items-center gap-1 rounded-md border border-teal/40 px-2.5 py-1 text-xs font-semibold text-teal hover:bg-teal/5 disabled:opacity-60">
                        {st === 'busy' ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add as agreed action
                      </button>}
                  {st === 'error' && <span className="ml-2 text-xs text-red-700">Could not add it, try again.</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TrainingDetailView({ detail, onAddSuggestion }: { detail: TrainingDetail; onAddSuggestion?: (id: string) => Promise<'added' | 'already'> }) {
  // With more than one course the page would be very long, so each course becomes an accordion that starts closed (one line each: status,
  // score, how many wrong). A single course just shows in full. Print and email always carry everything.
  const all = [...detail.linked.map(l => l.course?.enrollment_id).filter(Boolean), ...detail.others.map(c => c.enrollment_id)] as string[]
  const many = all.length > 1
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setOpenIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOpen = many && all.every(id => openIds.has(id))
  return (
    <div className="space-y-5">
      <SuggestionsBox suggestions={detail.suggestions ?? []} onAdd={detail.supervision ? onAddSuggestion : undefined} />
      {many && (
        <div className="flex items-center justify-between text-xs text-neutral-mid">
          <span>{all.length} courses. Open one to see the questions answered wrongly and the detail.</span>
          <button type="button" onClick={() => setOpenIds(allOpen ? new Set() : new Set(all))} className="font-medium text-teal hover:underline">{allOpen ? 'Close all' : 'Open all'}</button>
        </div>
      )}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><BookOpen size={14} className="text-teal" /> Training for this {detail.supervision?.type ?? 'supervision'}</h3>
        {detail.linked.length === 0
          ? <p className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-neutral-mid">No training has been allocated against this {detail.supervision?.type ?? 'supervision'} yet. Tick &ldquo;Also add to their next supervision&rdquo; when you assign a course, or choose training against an agreed action.</p>
          : <div className="space-y-3">{detail.linked.map(l => l.course
              ? <CourseCard key={l.action_id} c={l.course} actionStatus={l.action_status} actionText={l.description} collapsible={many} open={openIds.has(l.course.enrollment_id)} onToggle={() => toggle(l.course!.enrollment_id)} />
              : <p key={l.action_id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid">{l.description}: the course allocation can no longer be found.</p>)}</div>}
      </div>

      {detail.others.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-dark">Also allocated since {detail.since ? d(detail.since) : 'the last supervision'}</h3>
          <div className="space-y-3">{detail.others.map(c => <CourseCard key={c.enrollment_id} c={c} collapsible={many} open={openIds.has(c.enrollment_id)} onToggle={() => toggle(c.enrollment_id)} />)}</div>
        </div>
      )}

      {detail.follow_up.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><RotateCcw size={14} className="text-teal" /> Gaps they went back over</h3>
          <ul className="space-y-1 text-sm text-neutral-dark">
            {detail.follow_up.map((f, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-3 rounded-lg border border-gray-100 px-3 py-1.5">
                <span>{f.label ?? 'A question they had got wrong'}</span>
                <span className="text-xs text-neutral-mid">{f.method === 'learn' ? 'went through the lesson, then retried' : 'retried straight away'} · {d(f.when)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-neutral-mid/80"><Clock size={11} /> Built from their training records on {d(detail.generated_at)}. Shown to the supervisor and admins only.</p>
    </div>
  )
}

export type DetailShare = {
  print: () => Promise<string>                                  // the page to print, as HTML
  email: (toUserId?: string) => Promise<{ sent_to: string }>   // sends it to an admin of the account (the supervisor by default)
  admins: () => Promise<Array<{ id: string; name: string }>>   // who it can be sent to
}

// Print and email. The email goes only to an admin of this account: it holds a member of staff's training records.
function ShareBar({ share }: { share: DetailShare }) {
  const [open, setOpen] = useState(false)
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([])
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState<'print' | 'email' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function print() {
    // The window must be opened by the click itself or a pop-up blocker stops it, so open first and fill it once the page is ready.
    const w = window.open('', '_blank')
    if (!w) { setMsg({ ok: false, text: 'Your browser blocked the print window. Allow pop-ups for this site and try again.' }); return }
    w.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Preparing the page to print&hellip;</p>')
    setBusy('print'); setMsg(null)
    try {
      const html = await share.print()
      w.document.open(); w.document.write(html); w.document.close(); w.focus()
      // Let the logo load before the print dialog, or it prints as a gap (but never wait more than a few seconds).
      const imgs = Array.from(w.document.images)
      await Promise.race([Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = () => r(null) }))), new Promise(r => setTimeout(r, 3000))])
      setTimeout(() => { try { w.print() } catch { /* the page is open, they can print it themselves */ } }, 200)
    } catch { w.close(); setMsg({ ok: false, text: 'Could not prepare the page to print.' }) }
    finally { setBusy(null) }
  }
  async function openEmail() {
    setOpen(o => !o); setMsg(null)
    if (!admins.length) share.admins().then(a => setAdmins(a)).catch(() => {})
  }
  async function send() {
    setBusy('email'); setMsg(null)
    try { const r = await share.email(to || undefined); setMsg({ ok: true, text: `Sent to ${r.sent_to}.` }); setOpen(false) }
    catch (e: any) { setMsg({ ok: false, text: e?.message ?? 'Could not send the email.' }) }
    finally { setBusy(null) }
  }
  return (
    <div className="relative flex flex-wrap items-center justify-end gap-2">
      {msg && <span className={`text-xs font-medium ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</span>}
      <button type="button" onClick={print} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal hover:text-teal disabled:opacity-60">
        {busy === 'print' ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />} Print
      </button>
      <button type="button" onClick={openEmail} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal hover:text-teal disabled:opacity-60">
        <Mail size={13} /> Send to email
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Send to</label>
          <select value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-teal focus:outline-none">
            <option value="">Me</option>
            {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p className="mt-1.5 text-[11px] text-neutral-mid">It holds a member of staff&rsquo;s training records, so it can only go to an admin on this account.</p>
          <button type="button" onClick={send} disabled={busy === 'email'} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60">
            {busy === 'email' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Send
          </button>
        </div>
      )}
    </div>
  )
}

export function TrainingDetailModal({ title, load, onClose, share, onAddSuggestion }: { title: string; load: () => Promise<TrainingDetail | null>; onClose: () => void; share?: DetailShare; onAddSuggestion?: (id: string) => Promise<'added' | 'already'> }) {
  const [detail, setDetail] = useState<TrainingDetail | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    load().then(r => { if (alive) { if (r) setDetail(r); else setErr('Not available.') } }).catch(() => alive && setErr('Could not load the training detail.'))
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="my-2 w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Training detail</p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-dark">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light" aria-label="Close"><X size={18} /></button>
        </div>
        {share && detail && <div className="border-b border-gray-100 px-6 py-2"><ShareBar share={share} /></div>}
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {err ? <p className="text-sm text-red-700">{err}</p> : detail ? <TrainingDetailView detail={detail} onAddSuggestion={onAddSuggestion} /> : <Loader2 size={18} className="animate-spin text-neutral-mid" />}
        </div>
        <div className="flex justify-end border-t border-gray-100 px-6 py-3"><button onClick={onClose} className="rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300">Close</button></div>
      </div>
    </div>
  )
}
