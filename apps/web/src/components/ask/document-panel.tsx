'use client'

// One saved item in the library. A saved answer is just text. A LETTER or NEWSLETTER goes draft -> waiting for approval -> approved -> shared: this panel shows the status, lets the
// author edit and submit, lets another administrator tick the "before you send" checklist and approve, and then shares it (PDF, email to the person, or a staff notification with the PDF).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, FileText, Loader2, Mail, Maximize2, Bell, Pencil, Printer, RotateCcw, Send, Trash2, X } from 'lucide-react'
import { ask, AskError, type AskDocFull, type ShareIntent } from '@/lib/ask-client'
import { adminNotifications, type StaffOption } from '@/lib/notifications-client'
import { MarkdownLite } from './markdown-lite'
import { StaffPicker, useStaff } from '@/components/ask/staff-picker'
import { DocumentActions } from '@/components/ask/document-actions'
import { SharePanel } from '@/components/ask/share-panel'
import { ExpandViewer, Expandable, useExpandViewer, type ViewerItem } from './expand-viewer'
import { FitHtml } from './fit-html'

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
  const [ack, setAck] = useState<boolean | null>(null)   // ask the person to confirm they have read it (the template's default unless the administrator changes it)
  const [docStatus, setDocStatus] = useState<{ letterhead_ready: boolean; trading_name: string; missing: string[]; signature: boolean } | null>(null)
  const [paper, setPaper] = useState<{ html: string; css: string } | null>(null)
  const [showPaper, setShowPaper] = useState(false)
  const [live, setLive] = useState<string | null>(null)   // the designed newsletter for the text being edited
  const [photoStaff, setPhotoStaff] = useState<StaffOption[] | null>(null)
  const [photoPick, setPhotoPick] = useState<string | null>(null)
  const [photoAgreed, setPhotoAgreed] = useState(false)
  const [photoState, setPhotoState] = useState<{ chosen: boolean; name?: string | null; consent?: boolean; has_picture?: boolean } | null>(null)
  const photoUser = d?.data?.photo?.user_id ?? null
  const photoStaffList = useStaff(token, d?.type === 'newsletter' && !!d?.actions.edit)
  const viewer = useExpandViewer()
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
  // A newsletter opens on its DESIGNED version; and while editing, the designed preview follows the text as it is typed.
  useEffect(() => { if (d?.type === 'newsletter') setShowPaper(true) }, [d?.id, d?.type])
  useEffect(() => {
    if (!editing || d?.type !== 'newsletter') { setLive(null); return }
    const t = setTimeout(() => { ask.previewDraft(token, id, { title, body }).then(r => setLive(r.html)).catch(() => undefined) }, 500)
    return () => clearTimeout(t)
  }, [editing, d?.type, token, id, title, body])
  useEffect(() => { if (d?.type !== 'newsletter' || !photoUser) { setPhotoState(null); return } ask.newsletterPhotoStatus(token, id).then(setPhotoState).catch(() => setPhotoState(null)) }, [d?.type, d?.updated_at, photoUser, token, id])
  const msg = (e: unknown) => (e instanceof AskError || e instanceof Error ? e.message : 'Something went wrong. Please try again.')
  async function run(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setError(''); setInfo('')
    try { await fn(); if (done) setInfo(done); await load(); onChanged() } catch (e) { setError(msg(e)) } finally { setBusy('') }
  }
  const isFinal = d?.status === 'approved' || d?.status === 'shared'   // anything else is a DRAFT copy: stamped DRAFT on every page, never recorded as shared
  const letter = d?.type === 'letter', report = d?.type === 'report', news = d?.type === 'newsletter' || report, flow = !!d?.actions.needs_approval
  const st = d ? STATUS[d.status] ?? STATUS.draft : null
  const people = useMemo(() => (staff ?? []).filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase())), [staff, q])

  // How the letter is to be shared: in their hub, by email, hub and email, or print only (which stays with me and is never shown to the staff member).
  const intent: ShareIntent = d?.share_intent ?? { hub: false, email: false, print_only: false }
  async function changeIntent(next: Partial<ShareIntent>) {
    if (!d) return
    let n: ShareIntent = { ...intent, ...next }
    if (next.print_only) n = { hub: false, email: false, print_only: true }
    else if (next.hub || next.email) n = { ...n, print_only: false }
    if (!n.hub && !n.email && !n.print_only) { setError('Choose at least one way to share it: in their hub, by email, or print only.'); return }
    await run('intent', () => ask.setShareIntent(token, d.id, n))
  }
  async function printIt() {
    if (!d) return
    setBusy('print'); setError('')
    try {
      const url = await ask.pdfBlobUrl(token, d.id, sign && letter)
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; f.src = url
      f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print() } catch { window.open(url, '_blank') } setTimeout(() => { URL.revokeObjectURL(url); f.remove() }, 60_000) }
      document.body.appendChild(f)
      await load(); onChanged()
    } catch (e) { setError(msg(e)) } finally { setBusy('') }
  }
  const channels = (intent.print_only ? [] : [intent.hub ? 'hub' : '', intent.email ? 'email' : ''].filter(Boolean)) as string[]
  const first = (d?.staff_name ?? 'the person').split(' ')[0]
  async function save() {
    if (!d) return
    await run('save', async () => {
      const r = await ask.editDocument(token, d.id, letter ? { title, values } : report ? { title, body, internal_only: internal } : { title, body })
      setEditing(false)
      if (r.missing?.length) setInfo(`Saved. Still missing: ${r.missing.join(', ')}.`)
    })
  }
  async function openViewer() { if (d && (letter || news) && showPaper && !paper) await loadPaper(); viewer.show() }
  const viewerItems: ViewerItem[] = !d ? [] : (letter || news) && showPaper && paper ? [{ kind: 'html', html: paper.html, css: paper.css }]
    : [{ kind: 'node', node: <div className="w-[680px] max-w-full p-8 text-neutral-dark">{letter ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{d.body}</pre> : <MarkdownLite text={d.body} />}</div> }]
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
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-body">{report ? 'Report' : 'Newsletter'} (## for a heading, - for a bullet)</label><div className={d.type === 'newsletter' ? 'grid gap-3 md:grid-cols-2' : ''}><textarea id="ask-doc-body" rows={16} className={`no-scrollbar ${input} font-mono`} value={body} onChange={e => setBody(e.target.value)} />{d.type === 'newsletter' && <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Designed preview (follows what you type)</p>{live ? <FitHtml html={live} className="rounded-lg border border-gray-200" /> : <p className="flex items-center gap-2 text-xs text-neutral-mid"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Making the preview</p>}</div>}</div></div>
                {report && (
                  <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/60 p-3 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={internal} onChange={e => setInternal(e.target.checked)} />
                    <span><span className="font-semibold">Internal only.</span> It may name people and quote pay. It can be downloaded or emailed to the administrators, and can never be sent to staff. Leave this off for a report you may share: it then uses roles and counts only.</span></label>
                )}
              </div>
            ) : showPaper && (letter || news) ? (paper ? <Expandable label={d.type === 'newsletter' ? 'The designed newsletter' : 'The document on letterhead'} onOpen={openViewer}>{d.type === 'newsletter' ? <FitHtml html={paper.html} className="rounded-xl border border-gray-200" /> : <div className="no-scrollbar overflow-x-auto rounded-xl bg-neutral-light p-3"><style>{paper.css}</style><div dangerouslySetInnerHTML={{ __html: paper.html }} /></div>}</Expandable> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Preparing the preview</p>)
            : <Expandable label="The text" onOpen={openViewer}>{letter ? <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-neutral-light/50 p-4 font-sans text-sm leading-relaxed text-neutral-dark">{d.body}</pre>
              : <MarkdownLite text={d.body} />}</Expandable>}

            {flow && docStatus && !docStatus.letterhead_ready && (
              <p className="rounded-lg border border-gray-200 bg-neutral-light/60 px-3 py-2 text-xs text-neutral-dark">To make this look like a complete company letter, finish your <strong>Letterhead and company details</strong> in Settings{docStatus.missing.length ? ` (${docStatus.missing.slice(0, 3).join(', ')}${docStatus.missing.length > 3 ? ' and more' : ''})` : ''}.</p>
            )}
            {flow && letter && (d.status === 'pending' || d.status === 'approved' || d.status === 'shared') && (
              <label className="flex items-start gap-2 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={sign} onChange={e => setSign(e.target.checked)} disabled={!docStatus?.signature} />
                <span><strong className="font-medium">Sign with my signature.</strong> {docStatus?.signature ? 'Your signature and your printed name and job title go at the end of the letter.' : 'You have not added a signature yet. Add one in Settings under My signature (or in the hub). Your printed name will still be used.'}</span></label>
            )}
            {d.type === 'newsletter' && d.actions.edit && (
              <div className="rounded-lg border border-gray-200 p-3 text-sm text-neutral-dark">
                <p id="ask-nl-photo" className="font-semibold">Picture of the person (employee of the month, a story, new starters, a farewell)</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Pick them from your staff. Only their staff picture is used, and only when they agree. It shows large and round in the preview, the hub and the PDF. The email shows their initials and says the photo is in the hub and the PDF.</p>
                <div className="mt-2">
                  {photoStaffList === null
                    ? <p className="flex items-center gap-2 text-xs text-neutral-mid" role="status"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Loading your staff</p>
                    : <StaffPicker people={photoStaffList} mode="single" noneLabel="No picture" label="Picture of the person" selected={photoPick ? [photoPick] : (d.data?.photo?.user_id ? [d.data.photo.user_id] : [])}
                        onChange={ids => { const v = ids[0] ?? ''; setPhotoPick(v || null); setPhotoAgreed(false); if (!v) run('photo', () => ask.newsletterPhoto(token, d.id, null), 'No picture.') }} />}
                </div>
                {photoPick && photoPick !== d.data?.photo?.user_id && (
                  <div className="mt-2 space-y-2">
                    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={photoAgreed} onChange={e => setPhotoAgreed(e.target.checked)} /><span>They are happy to be named and photographed</span></label>
                    <button type="button" disabled={!photoAgreed} onClick={() => run('photo', async () => { const r = await ask.newsletterPhoto(token, d.id, photoPick, true); setPhotoPick(null); return r }, 'The picture is set.')} className="inline-flex min-h-[36px] items-center rounded-lg bg-teal px-3 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">Use their picture</button>
                  </div>
                )}
                {d.data?.photo?.user_id && photoState?.chosen && (
                  <p className={`mt-2 rounded-md px-2.5 py-1.5 text-xs ${photoState.has_picture ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-950'}`} role="status">
                    {photoState.has_picture ? `${photoState.name ?? 'The person'}'s staff picture is in the newsletter.` : <>{photoState.name ?? 'The person'} has no staff picture yet, so their initials show. Add one in <a href="/staff" className="font-semibold underline">Staff</a> (open their profile, Picture) and it appears here by itself.</>}
                  </p>
                )}
              </div>
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
            {flow && letter && (
              <fieldset className="rounded-lg border border-gray-200 p-3">
                <legend className="px-1 text-sm font-semibold text-neutral-dark">How will this letter be shared?</legend>
                <div className="space-y-1.5 text-sm text-neutral-dark">
                  <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={intent.hub} disabled={!!busy} onChange={e => changeIntent({ hub: e.target.checked })} /> <span><strong className="font-medium">Hub notification.</strong> A notification, and the letter in {first}&apos;s hub under My letters. They read, print and download it there. It stays there as a record.</span></label>
                  <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={intent.email} disabled={!!busy} onChange={e => changeIntent({ email: e.target.checked })} /> <span><strong className="font-medium">Email.</strong> A PDF from you, straight to {first}.</span></label>
                  <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={intent.print_only} disabled={!!busy} onChange={e => changeIntent({ print_only: e.target.checked })} /> <span><strong className="font-medium">Print only.</strong> It stays with you and {first} never sees it in CareStream.</span></label>
                </div>
                {!d.share_intent && <p className="mt-2 text-xs text-amber-900">Choose how it is to be shared before you share it.</p>}
              </fieldset>
            )}
            {flow && letter && d.hub_shares && d.hub_shares.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold text-neutral-dark">Shared in their hub</p>
                <ul className="mt-1.5 divide-y divide-gray-100 text-sm">
                  {d.hub_shares.map(h => (
                    <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 text-neutral-dark">
                        <strong className="font-medium">{h.person}</strong>, shared {h.shared_at ? new Date(h.shared_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}.{' '}
                        {h.withdrawn_at ? <span className="font-semibold text-red-700">Withdrawn.</span> : <>
                          {h.read_at ? `Read ${new Date(h.read_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.` : 'Not read yet.'}{' '}
                          {h.needs_acknowledgement ? (h.acknowledged_at ? `Acknowledged ${new Date(h.acknowledged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.` : 'Waiting for them to acknowledge it.') : ''}
                        </>}
                      </span>
                      {!h.withdrawn_at && <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(`Withdraw this letter from ${h.person}'s hub? It disappears from their hub, and the record stays here.`)) run('withdraw', () => ask.withdrawHubShare(token, d.id, h.id), 'Withdrawn from their hub.') }} className={`${btn} border border-red-300 text-red-700 hover:bg-red-50`}><Trash2 size={14} /> Withdraw</button>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {d.shared.length > 0 && <p className="text-xs text-neutral-mid">Shared: {d.shared.map(s => `${s.method === 'pdf' ? 'PDF downloaded' : s.method === 'word' ? 'Word downloaded' : s.method === 'email' ? 'emailed' : s.method === 'hub' ? 'shared in their hub' : 'sent as a notification'} ${new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`).join(', ')}</p>}

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {info && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
            {editing ? (<>
              <button type="button" disabled={!!busy} className={`${btn} bg-teal text-white hover:bg-teal-dark`} onClick={save}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save changes</button>
              <button type="button" className={`${btn} text-neutral-mid`} onClick={() => { setEditing(false); setTitle(d.title); setBody(d.body); setValues(d.values ?? {}); setInternal(d.internal_only === true) }}>Cancel</button>
            </>) : (<>
              {d.type === 'newsletter' && <div role="group" aria-label="View the newsletter" className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm font-semibold">{[['designed', 'Designed'], ['text', 'Text']].map(([k, l]) => <button key={k} type="button" aria-pressed={(k === 'designed') === showPaper} onClick={() => setShowPaper(k === 'designed')} className={`px-3 py-2 ${(k === 'designed') === showPaper ? 'bg-teal text-white' : 'bg-white text-neutral-dark hover:bg-neutral-light'}`}>{l}</button>)}</div>}
              <button type="button" onClick={openViewer} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><Maximize2 size={14} aria-hidden="true" /> Expand</button>
              {flow && (letter || report) && <button type="button" onClick={() => setShowPaper(v => !v)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><FileText size={14} /> {showPaper ? 'Show the text' : 'Preview on letterhead'}</button>}
              <button type="button" onClick={() => navigator.clipboard?.writeText(d.body).catch(() => undefined)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><Copy size={14} /> Copy</button>
              {d.actions.edit && flow && <button type="button" onClick={() => setEditing(true)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><Pencil size={14} /> Edit</button>}
              {d.actions.submit && <button type="button" disabled={!!busy} onClick={() => run('submit', () => ask.submit(token, d.id), 'Submitted. It is now waiting for approval.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Submit for approval</button>}
              {d.status === 'draft' && flow && !d.actions.submit && d.actions.edit && letter && <span className="text-xs text-amber-800">Finish the missing details before submitting.</span>}
              {d.status === 'pending' && d.actions.approve && <button type="button" disabled={!ticked || !!busy} onClick={() => run('approve', () => ask.approve(token, d.id, ticked), 'Approved. You can now share it.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>}
              {d.status === 'pending' && !d.actions.approve && !d.mine && <span className="text-xs text-neutral-mid">Someone else needs to approve this.</span>}
              {d.status === 'pending' && d.actions.return && <button type="button" disabled={!!busy} onClick={() => { const n = window.prompt('Why is it going back? (optional)', note); if (n !== null) { setNote(n); run('return', () => ask.returnToDraft(token, d.id, n.trim() || undefined), 'Sent back to draft.') } }} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Send back</button>}
              {d.actions.reopen && <button type="button" disabled={!!busy} onClick={() => run('reopen', () => ask.reopen(token, d.id), 'Back to draft. It needs approving again.')} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Re-open</button>}
              {(letter || news) && <DocumentActions title={d.title} draft={!isFinal} disabled={!!busy} getPdf={() => ask.documentBlob(token, d.id, 'pdf', { sign: sign && letter, draft: !isFinal })} getDocx={() => ask.documentBlob(token, d.id, 'docx', { sign: sign && letter, draft: !isFinal })}
                onDone={w => { setInfo(w === 'pdf' ? 'The PDF has been saved.' : w === 'word' ? 'The Word document has been saved.' : 'Sent to your printer dialog.'); if (isFinal) { void load(); onChanged() } }} onError={m => setError(m)} />}
              {(letter || news) && (d.actions.share.length > 0 || flow) && !(letter && intent.print_only) && <SharePanel token={token} doc={{ id: d.id, type: d.type, title: d.title, status: d.status, staff_name: d.staff_name, share_intent: d.share_intent ?? null }} sign={sign && letter} needsAck={ack ?? d.ack_default ?? false} onPreview={openViewer} onSent={() => { void load(); onChanged() }} />}
              {letter && intent.print_only && <span className="text-xs text-neutral-mid">Print only: Save PDF or Print it from here. Nothing is sent to {first}.</span>}
            </>)}
          </div>
        </>)}
      </div>
      {d && <ExpandViewer open={viewer.open} onClose={viewer.close} title={d.title} items={viewerItems}
        switcher={d.type === 'newsletter' ? { value: showPaper ? 'designed' : 'text', options: [{ id: 'designed', label: 'Designed' }, { id: 'text', label: 'Text' }], onChange: k => setShowPaper(k === 'designed') } : undefined}
        pdf={(letter || news) ? { getPdf: () => ask.documentBlob(token, d.id, 'pdf', { sign: sign && letter, draft: !isFinal }), getDocx: () => ask.documentBlob(token, d.id, 'docx', { sign: sign && letter, draft: !isFinal }), draft: !isFinal } : undefined} />}
    </div>
  )
}
