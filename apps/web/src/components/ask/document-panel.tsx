'use client'

// One saved item in the library. A saved answer is just text. A LETTER or NEWSLETTER goes draft -> waiting for approval -> approved -> shared: this panel shows the status, lets the
// author edit and submit, lets another administrator tick the "before you send" checklist and approve, and then shares it (PDF, email to the person, or a staff notification with the PDF).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, FileText, Loader2, Mail, Bell, Pencil, RotateCcw, Send, X } from 'lucide-react'
import { ask, AskError, type AskDocFull } from '@/lib/ask-client'
import { adminNotifications, type StaffOption } from '@/lib/notifications-client'
import { MarkdownLite } from './markdown-lite'

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-neutral-dark' }, pending: { label: 'Waiting for approval', cls: 'bg-amber-100 text-amber-900' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800' }, shared: { label: 'Shared', cls: 'bg-sky-100 text-sky-800' },
}
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50'

export function DocumentPanel({ token, id, onClose, onChanged }: { token: string; id: string; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<AskDocFull | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState('')
  const [ticked, setTicked] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(''), [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)   // a governance report marked internal only (it may name people and can never be sent to staff)
  const [values, setValues] = useState<Record<string, string | number>>({})
  const [note, setNote] = useState('')
  const [staff, setStaff] = useState<StaffOption[] | null>(null)
  const [sign, setSign] = useState(false)
  const [docStatus, setDocStatus] = useState<{ letterhead_ready: boolean; trading_name: string; missing: string[]; signature: boolean } | null>(null)
  const [paper, setPaper] = useState<{ html: string; css: string } | null>(null)
  const [showPaper, setShowPaper] = useState(false)
  const [picking, setPicking] = useState(false), [audience, setAudience] = useState<'all' | 'selected'>('all'), [chosen, setChosen] = useState<Set<string>>(new Set()), [q, setQ] = useState('')

  const load = useCallback(async () => {
    try { const r = await ask.document(token, id); setD(r.document); setTitle(r.document.title); setBody(r.document.body); setValues(r.document.values ?? {}); setInternal(r.document.internal_only === true); setTicked(false); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open it.') }
  }, [token, id])
  useEffect(() => { load() }, [load])
  // The letterhead and signature status (never the picture): the tick defaults to on when I have a signature.
  useEffect(() => { ask.docStatus(token).then(s => { setDocStatus(s); setSign(s.signature) }).catch(() => undefined) }, [token])
  const loadPaper = useCallback(async () => {
    try { setPaper(await ask.preview(token, id, sign)) } catch { setPaper(null) }
  }, [token, id, sign])
  useEffect(() => { if (showPaper) loadPaper() }, [showPaper, loadPaper, d?.updated_at])
  const msg = (e: unknown) => (e instanceof AskError || e instanceof Error ? e.message : 'Something went wrong. Please try again.')
  async function run(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setError(''); setInfo('')
    try { await fn(); if (done) setInfo(done); await load(); onChanged() } catch (e) { setError(msg(e)) } finally { setBusy('') }
  }
  const letter = d?.type === 'letter', report = d?.type === 'report', news = d?.type === 'newsletter' || report, flow = !!d?.actions.needs_approval
  const st = d ? STATUS[d.status] ?? STATUS.draft : null
  const people = useMemo(() => (staff ?? []).filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase())), [staff, q])

  async function save() {
    if (!d) return
    await run('save', async () => {
      const r = await ask.editDocument(token, d.id, letter ? { title, values } : report ? { title, body, internal_only: internal } : { title, body })
      setEditing(false)
      if (r.missing?.length) setInfo(`Saved. Still missing: ${r.missing.join(', ')}.`)
    })
  }
  async function openPicker() { setPicking(true); if (!staff) { try { setStaff((await adminNotifications.staff(token)).staff) } catch (e) { setError(msg(e)) } } }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-3" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-label={d?.title ?? 'Document'} className="flex max-h-[92%] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-xl">
        {!d ? (error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p>) : (<>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-neutral-dark">{d.title}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-mid">{st && <span className={`rounded-full px-2 py-0.5 font-semibold ${st.cls}`}>{st.label}</span>}{report && d.internal_only && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">Internal only</span>}{flow ? (letter ? 'Letter' : report ? 'Governance report' : 'Staff newsletter') : 'Saved answer'}{d.staff_name ? `, for ${d.staff_name}` : ''}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto no-scrollbar pr-1">
            {d.data?.review_note && d.status === 'draft' && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Sent back: {d.data.review_note.note}</p>}

            {editing && letter && d.fields ? (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-title">Title</label><input id="ask-doc-title" className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} /></div>
                <p className="text-xs text-neutral-mid">Change a detail and save: the letter is written again from your changes. Required details are marked *.</p>
                {d.fields.map(f => (
                  <div key={f.key}><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor={`ask-f-${f.key}`}>{f.label}{f.required ? ' *' : ''}</label>
                    {f.choices ? <select id={`ask-f-${f.key}`} className={input} value={String(values[f.key] ?? '')} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}><option value="">Choose</option>{f.choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                      : f.type === 'longtext' || f.type === 'list' ? <textarea id={`ask-f-${f.key}`} rows={3} className={input} value={String(values[f.key] ?? '')} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                      : <input id={`ask-f-${f.key}`} className={input} type={f.type === 'date' ? 'date' : 'text'} value={String(values[f.key] ?? '')} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />}</div>
                ))}
              </div>
            ) : editing && news ? (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-title">Title</label><input id="ask-doc-title" className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-body">{report ? 'Report' : 'Newsletter'} (## for a heading, - for a bullet)</label><textarea id="ask-doc-body" rows={16} className={`no-scrollbar ${input} font-mono`} value={body} onChange={e => setBody(e.target.value)} /></div>
                {report && (
                  <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/60 p-3 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={internal} onChange={e => setInternal(e.target.checked)} />
                    <span><span className="font-semibold">Internal only.</span> It may name people and quote pay. It can be downloaded or emailed to the administrators, and can never be sent to staff. Leave this off for a report you may share: it then uses roles and counts only.</span></label>
                )}
              </div>
            ) : showPaper && (letter || news) ? (paper ? <div className="no-scrollbar overflow-x-auto rounded-xl bg-neutral-light p-3"><style>{paper.css}</style><div dangerouslySetInnerHTML={{ __html: paper.html }} /></div> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Preparing the preview</p>)
            : letter ? <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-neutral-light/50 p-4 font-sans text-sm leading-relaxed text-neutral-dark">{d.body}</pre>
              : <MarkdownLite text={d.body} />}

            {flow && docStatus && !docStatus.letterhead_ready && (
              <p className="rounded-lg border border-gray-200 bg-neutral-light/60 px-3 py-2 text-xs text-neutral-dark">To make this look like a complete company letter, finish your <strong>Letterhead and company details</strong> in Settings{docStatus.missing.length ? ` (${docStatus.missing.slice(0, 3).join(', ')}${docStatus.missing.length > 3 ? ' and more' : ''})` : ''}.</p>
            )}
            {flow && letter && (d.status === 'pending' || d.status === 'approved' || d.status === 'shared') && (
              <label className="flex items-start gap-2 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={sign} onChange={e => setSign(e.target.checked)} disabled={!docStatus?.signature} />
                <span><strong className="font-medium">Sign with my signature.</strong> {docStatus?.signature ? 'Your signature and your printed name and job title go at the end of the letter.' : 'You have not added a signature yet. Add one in Settings under My signature (or in the hub). Your printed name will still be used.'}</span></label>
            )}
            {flow && d.checklist.length > 0 && (d.status === 'draft' || d.status === 'pending') && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={14} aria-hidden="true" /> Before you send</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5">{d.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
                {d.references.length > 0 && <p className="mt-2 text-xs">Sources: {d.references.map((r, i) => <span key={r.url}>{i > 0 ? ', ' : ''}<a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.label}</a></span>)}</p>}
                <p className="mt-2 text-xs">CareStream does not give legal advice. Check it matches the person's contract and your policies.</p>
                {d.status === 'pending' && d.actions.approve !== undefined && (
                  <label className="mt-2 flex items-start gap-2 font-medium"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={ticked} onChange={e => setTicked(e.target.checked)} /> I have read this checklist and checked the document.</label>
                )}
              </div>
            )}
            {d.shared.length > 0 && <p className="text-xs text-neutral-mid">Shared: {d.shared.map(s => `${s.method === 'pdf' ? 'PDF downloaded' : s.method === 'word' ? 'Word downloaded' : s.method === 'email' ? 'emailed' : 'sent as a notification'} ${new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`).join(', ')}</p>}

            {picking && (
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-sm font-semibold text-neutral-dark">Send the {report ? 'report' : 'newsletter'} to</p>
                <div className="mb-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5"><input type="radio" name="aud" checked={audience === 'all'} onChange={() => setAudience('all')} /> All staff</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="aud" checked={audience === 'selected'} onChange={() => setAudience('selected')} /> Choose staff</label>
                </div>
                {audience === 'selected' && (<>
                  <input aria-label="Search staff" placeholder="Search staff" className={`${input} mb-2`} value={q} onChange={e => setQ(e.target.value)} />
                  <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto no-scrollbar rounded border border-gray-200">{people.map(s => <li key={s.id}><label className="flex items-center gap-2 px-3 py-1.5 text-sm"><input type="checkbox" checked={chosen.has(s.id)} onChange={e => setChosen(c => { const n = new Set(c); e.target.checked ? n.add(s.id) : n.delete(s.id); return n })} /> {s.name}{s.job_role ? <span className="text-xs text-neutral-mid">, {s.job_role}</span> : null}</label></li>)}</ul>
                </>)}
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={!!busy || (audience === 'selected' && chosen.size === 0)} className={`${btn} bg-teal text-white hover:bg-teal-dark`} onClick={() => run('share', () => ask.share(token, d.id, { method: 'notification', audience, user_ids: [...chosen], sign: false }).then(() => setPicking(false)), 'Sent to your staff as a notification with the PDF attached.')}>{busy === 'share' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send now</button>
                  <button type="button" className={`${btn} text-neutral-mid`} onClick={() => setPicking(false)}>Cancel</button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {info && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
            {editing ? (<>
              <button type="button" disabled={!!busy} className={`${btn} bg-teal text-white hover:bg-teal-dark`} onClick={save}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save changes</button>
              <button type="button" className={`${btn} text-neutral-mid`} onClick={() => { setEditing(false); setTitle(d.title); setBody(d.body); setValues(d.values ?? {}); setInternal(d.internal_only === true) }}>Cancel</button>
            </>) : (<>
              {flow && (letter || news) && <button type="button" onClick={() => setShowPaper(v => !v)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><FileText size={14} /> {showPaper ? 'Show the text' : 'Preview on letterhead'}</button>}
              <button type="button" onClick={() => navigator.clipboard?.writeText(d.body).catch(() => undefined)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><Copy size={14} /> Copy</button>
              {d.actions.edit && flow && <button type="button" onClick={() => setEditing(true)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><Pencil size={14} /> Edit</button>}
              {d.actions.submit && <button type="button" disabled={!!busy} onClick={() => run('submit', () => ask.submit(token, d.id), 'Submitted. It is now waiting for approval.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Submit for approval</button>}
              {d.status === 'draft' && flow && !d.actions.submit && d.actions.edit && letter && <span className="text-xs text-amber-800">Finish the missing details before submitting.</span>}
              {d.status === 'pending' && d.actions.approve && <button type="button" disabled={!ticked || !!busy} onClick={() => run('approve', () => ask.approve(token, d.id, ticked), 'Approved. You can now share it.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>}
              {d.status === 'pending' && !d.actions.approve && !d.mine && <span className="text-xs text-neutral-mid">Someone else needs to approve this.</span>}
              {d.status === 'pending' && d.actions.return && <button type="button" disabled={!!busy} onClick={() => { const n = window.prompt('Why is it going back? (optional)', note); if (n !== null) { setNote(n); run('return', () => ask.returnToDraft(token, d.id, n.trim() || undefined), 'Sent back to draft.') } }} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Send back</button>}
              {d.actions.reopen && <button type="button" disabled={!!busy} onClick={() => run('reopen', () => ask.reopen(token, d.id), 'Back to draft. It needs approving again.')} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Re-open</button>}
              {d.actions.share.includes('pdf') && <button type="button" disabled={!!busy} onClick={() => run('pdf', () => ask.downloadPdf(token, d.id, d.title, sign && letter), 'The PDF has been downloaded.')} className={`${btn} border border-teal text-teal hover:bg-teal/5`}>{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF</button>}
              {d.actions.share.includes('pdf') && <button type="button" disabled={!!busy} onClick={() => run('docx', () => ask.downloadDocx(token, d.id, d.title, sign && letter), 'The Word document has been downloaded.')} className={`${btn} border border-teal text-teal hover:bg-teal/5`}>{busy === 'docx' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Download as Word</button>}
              {d.actions.share.includes('email') && <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(report ? 'Email this report to all the administrators now?' : `Email this letter to ${d.staff_name ?? 'the person'} now?`)) run('email', () => ask.share(token, d.id, { method: 'email', sign: sign && letter }), report ? 'Emailed to the administrators with the PDF attached.' : 'Emailed with the PDF attached.') }} className={`${btn} border border-teal text-teal hover:bg-teal/5`}>{busy === 'email' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} {report ? 'Email to administrators' : 'Email it'}</button>}
              {d.actions.share.includes('notification') && (letter
                ? <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(`Send this letter to ${d.staff_name ?? 'the person'} as a notification in their hub?`)) run('note', () => ask.share(token, d.id, { method: 'notification', sign: sign && letter }), 'Sent to their hub as a notification with the PDF attached.') }} className={`${btn} border border-teal text-teal hover:bg-teal/5`}><Bell size={14} /> Send as notification</button>
                : <button type="button" disabled={!!busy} onClick={openPicker} className={`${btn} bg-teal text-white hover:bg-teal-dark`}><Bell size={14} /> Share with staff</button>)}
            </>)}
          </div>
        </>)}
      </div>
    </div>
  )
}
