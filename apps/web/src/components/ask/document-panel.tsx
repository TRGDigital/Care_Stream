'use client'

// One saved item in the library. A saved answer is just text. A LETTER or NEWSLETTER goes draft -> waiting for approval -> approved -> shared: this panel shows the status, lets the
// author edit and submit, lets another administrator tick the "before you send" checklist and approve, and then shares it (PDF, email to the person, or a staff notification with the PDF).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, Download, FileText, Loader2, Mail, Maximize2, Bell, Pencil, Palette, Plus, Printer, RotateCcw, Save, Send, Trash2, X } from 'lucide-react'
import { ask, AskError, type AskDocFull, type ShareIntent } from '@/lib/ask-client'
import { MarkdownLite, Marked } from './markdown-lite'
import { DocumentActions } from '@/components/ask/document-actions'
import { SharePanel } from '@/components/ask/share-panel'
import { DatePicker } from '@/components/ask/date-picker'
import { GiftBox } from '@/components/ask/gift-box'
import { NewsletterEditor } from '@/components/ask/newsletter-editor'
import { FeaturedPeople } from '@/components/ask/featured-people'
import { MarkedTextarea } from '@/components/ask/marked-textarea'
import { setAskEditing, setAskEditMode, useAskUi } from '@/lib/ask-ui-store'
import { splitFor, type EditMode } from '@/lib/ask-panel-state'
import { EMPTY_NOTICE, noticeKey, openNotice, parseNotice, setNoticeOpen, type NoticePrefs } from '@/lib/ask-notice'
import { takesPeople } from '@/lib/featured-people'
import { ExpandViewer, Expandable, useExpandViewer, type ViewerItem } from './expand-viewer'
import { FitHtml } from './fit-html'
import { SheetFrame, type SheetFit } from './sheet-frame'

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-neutral-dark' }, pending: { label: 'Waiting for approval', cls: 'bg-amber-100 text-amber-900' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800' }, shared: { label: 'Shared', cls: 'bg-sky-100 text-sky-800' },
}
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50'


/** HOUSE RULE 10: the note under the toolbar about the page. A newsletter is ONE page; when it does not fit at a readable size the gentle check asks what to do (never silently shrunk or cut). Portrait or landscape is in the toolbar. */
function PageNotice({ doc, fit, busy, canEdit, onSet, onShorten }: { doc: AskDocFull; fit: SheetFit | null; busy: boolean; canEdit: boolean; onSet: (o: { orientation?: 'portrait' | 'landscape'; pages?: 'one' | 'two' }) => void; onShorten: () => void }) {
  const orientation = doc.data?.orientation === 'landscape' ? 'landscape' : 'portrait'
  const two = doc.data?.pages === 'two'
  const canTwo = String(doc.data?.template_id ?? '').endsWith('-detailed')
  const over = !!fit && !fit.fits
  const other = orientation === 'portrait' ? 'landscape' : 'portrait'
  const cb = 'rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50'
  return (
    <div className="text-sm text-neutral-dark">
      {!over && fit && <p role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-green-800"><Check size={12} aria-hidden="true" /> {fit.pages > 1 ? `Runs to ${fit.pages} pages (two pages allowed)` : 'Fits one page'}</p>}
      {over && canEdit && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-neutral-dark">This newsletter will not fit one page at a readable size. What would you like to do?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => onSet({ orientation: other })} className={`${cb} border-teal bg-teal text-white hover:bg-teal-dark`}>Switch to {other}</button>
            <button type="button" disabled={busy} onClick={onShorten} className={`${cb} border-gray-300 bg-white text-neutral-dark hover:bg-neutral-light`}>Shorten it</button>
            {canTwo && !two && <button type="button" disabled={busy} onClick={() => onSet({ pages: 'two' })} className={`${cb} border-gray-300 bg-white text-neutral-dark hover:bg-neutral-light`}>Allow two pages</button>}
          </div>
        </div>
      )}
      {canTwo && two && canEdit && <p className="mt-2 text-xs text-neutral-mid">Two pages are allowed. <button type="button" disabled={busy} onClick={() => onSet({ pages: 'one' })} className="font-semibold text-teal underline">Back to one page</button></p>}
    </div>
  )
}


export function DocumentPanel({ token, id, onClose, onChanged, focus }: { token: string; id: string; onClose: () => void; onChanged: () => void; focus?: 'colours' | 'blocks' | null }) {
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
  const [sign, setSign] = useState(false)
  const [ack, setAck] = useState<boolean | null>(null)   // ask the person to confirm they have read it (the template's default unless the administrator changes it)
  const [docStatus, setDocStatus] = useState<{ letterhead_ready: boolean; trading_name: string; missing: string[]; signature: boolean } | null>(null)
  const [paper, setPaper] = useState<{ html: string; css: string; sheet?: string; orientation?: 'portrait' | 'landscape'; pages?: 'one' | 'two' } | null>(null)
  const [fit, setFit] = useState<SheetFit | null>(null)   // HOUSE RULE 10: does the newsletter fit one page? (told by the page itself)
  const [tooLong, setTooLong] = useState(false)          // the PDF said it would not fit one page at a readable size
  const [showPaper, setShowPaper] = useState(false)
  const [live, setLive] = useState<{ html: string; sheet?: string; orientation?: 'portrait' | 'landscape' } | null>(null)   // the designed newsletter for the text being edited
  const viewer = useExpandViewer()
  const ui = useAskUi()
  const rootRef = useRef<HTMLDivElement>(null)
  const [pw, setPw] = useState(0)                                  // the width the panel really has: side by side from 900px, stacked below
  const [tool, setTool] = useState<'colours' | 'blocks' | null>(focus ?? null)   // the Colours or Add a block panel, under the toolbar and above the newsletter
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [confirmClose, setConfirmClose] = useState<'panel' | 'editor' | null>(null)          // "Save your changes?" when closing with unsaved changes (never a browser dialog)
  useEffect(() => { if (focus) { setTool(focus); setTimeout(() => document.getElementById('ask-nl-tools')?.scrollIntoView?.({ block: 'nearest' }), 50) } }, [focus])
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    const m = () => setPw(el.clientWidth)
    m(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null
    ro?.observe(el); return () => ro?.disconnect()
  }, [d?.id])

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
    const t = setTimeout(() => { ask.previewDraft(token, id, { title, body }).then(r => setLive({ html: r.html, sheet: r.sheet, orientation: r.orientation })).catch(() => undefined) }, 500)
    return () => clearTimeout(t)
  }, [editing, d?.type, token, id, title, body])
  // A draft open for editing widens the panel (about half the screen, or the full width, as chosen) and it goes back to the usual width when this closes.
  const canEditDoc = !!d?.actions.edit
  useEffect(() => { if (!canEditDoc) return; setAskEditing(true); return () => setAskEditing(false) }, [canEditDoc])
  const msg = (e: unknown) => (e instanceof AskError || e instanceof Error ? e.message : 'Something went wrong. Please try again.')
  async function run(name: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(name); setError(''); setInfo('')
    try { await fn(); if (done) setInfo(done); await load(); onChanged() } catch (e) { setError(msg(e)) } finally { setBusy('') }
  }
  const isFinal = d?.status === 'approved' || d?.status === 'shared'   // anything else is a DRAFT copy: stamped DRAFT on every page, never recorded as shared
  const letter = d?.type === 'letter', report = d?.type === 'report', news = d?.type === 'newsletter' || report, flow = !!d?.actions.needs_approval
  // The "Before you send" band: open the first three times a person sees it, then collapsed; remembered per person after they choose.
  const [noticeOpen, setNoticeOpenState] = useState(true)
  const noticePrefs = useRef<NoticePrefs>({ ...EMPTY_NOTICE })
  const showChecklist = !!d && flow && d.checklist.length > 0 && (d.status === 'draft' || d.status === 'pending')
  useEffect(() => {
    if (!d || !showChecklist) return
    let raw: string | null = null
    try { raw = window.localStorage.getItem(noticeKey(ui.who)) } catch { raw = null }
    const r = openNotice(parseNotice(raw), d.id)
    noticePrefs.current = r.prefs; setNoticeOpenState(d.status === 'pending' ? true : r.open)   // waiting for approval: always open, the approver must read it
    try { window.localStorage.setItem(noticeKey(ui.who), JSON.stringify(r.prefs)) } catch { /* not remembered */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id, showChecklist, ui.who])
  const toggleNotice = () => { const v = !noticeOpen; setNoticeOpenState(v); noticePrefs.current = setNoticeOpen(noticePrefs.current, v); try { window.localStorage.setItem(noticeKey(ui.who), JSON.stringify(noticePrefs.current)) } catch { /* not remembered */ } }
  const st = d ? STATUS[d.status] ?? STATUS.draft : null
  const split = splitFor(pw) && (d?.type === 'newsletter' || letter || report)   // tools and text on the left, the designed page on the right
  useEffect(() => { if (split && (letter || report)) setShowPaper(true) }, [split, letter, report])   // wide: the page is always beside the words
  // Unsaved changes: the words or details being edited differ from what is saved. Everything else (colours, blocks, people, gift) is saved the moment it is changed.
  const dirty = !!d && editing && (title !== d.title || (news && body !== d.body) || (letter && JSON.stringify(values) !== JSON.stringify(d.values ?? {})) || (report && internal !== (d.internal_only === true)))

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
  const channels = (intent.print_only ? [] : [intent.hub ? 'hub' : '', intent.email ? 'email' : ''].filter(Boolean)) as string[]
  const first = (d?.staff_name ?? 'the person').split(' ')[0]
  async function save(closeEditor = false) {
    if (!d) return
    await run('save', async () => {
      const r = await ask.editDocument(token, d.id, letter ? { title, values } : report ? { title, body, internal_only: internal } : { title, body })
      if (closeEditor) setEditing(false)
      setSavedAt(new Date())
      if (r.missing?.length) setInfo(`Saved. Still missing: ${r.missing.join(', ')}.`)
    })
  }
  const requestClose = () => { if (dirty) setConfirmClose('panel'); else onClose() }
  useEffect(() => { const on = () => requestClose(); window.addEventListener('cs:ask-doc-close', on); return () => window.removeEventListener('cs:ask-doc-close', on) })   // Esc in the panel
  const setLayout = (o: { orientation?: 'portrait' | 'landscape'; pages?: 'one' | 'two' }) => { setTooLong(false); void run('layout', () => ask.newsletterOp(token, d!.id, { op: 'layout', ...o })) }
  const orientation: 'portrait' | 'landscape' = d?.data?.orientation === 'landscape' ? 'landscape' : 'portrait'
  const canTwo = String(d?.data?.template_id ?? '').endsWith('-detailed')
  /** The PDF (and Print, which prints the same PDF). A newsletter that will not fit one page at a readable size is not silently shrunk or cut: the page controls ask what to do. */
  const getPdfBlob = async () => { try { return await ask.documentBlob(token, d!.id, 'pdf', { sign: sign && letter, draft: !isFinal }) } catch (e) { if (e instanceof AskError && e.code === 'TOO_LONG') setTooLong(true); throw e } }
  async function openViewer() { if (d && (letter || news) && showPaper && !paper) await loadPaper(); viewer.show() }
  const viewerItems: ViewerItem[] = !d ? [] : d.type === 'newsletter' && showPaper && paper?.sheet ? [{ kind: 'sheet', html: paper.sheet, orientation: paper.orientation ?? 'portrait' }]
    : (letter || news) && showPaper && paper ? [{ kind: 'html', html: paper.html, css: paper.css }]
    : [{ kind: 'node', node: <div className="w-[680px] max-w-full p-8 text-neutral-dark">{letter ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed"><Marked text={d.body} /></pre> : <MarkdownLite text={d.body} />}</div> }]


  const formNode = !d ? null : editing && letter && d.fields ? (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-title">Title</label><input id="ask-doc-title" className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} /></div>
                <p className="text-xs text-neutral-mid">Change a detail and save: the letter is written again from your changes. Required details are marked *.</p>
                {d.fields.map(f => (
                  <div key={f.key}><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor={`ask-f-${f.key}`}>{f.label}{f.required ? ' *' : ''}</label>
                    {f.choices ? <select id={`ask-f-${f.key}`} className={input} value={String(values[f.key] ?? '')} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}><option value="">Choose</option>{f.choices.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                      : f.type === 'longtext' || f.type === 'list' ? <MarkedTextarea id={`ask-f-${f.key}`} rows={3} value={String(values[f.key] ?? '')} onChange={v => setValues(vals => ({ ...vals, [f.key]: v }))} label={f.label} />
                      : f.type === 'date' ? <DatePicker id={`ask-f-${f.key}`} label={f.label} value={String(values[f.key] ?? '')} onChange={iso => setValues(v => ({ ...v, [f.key]: iso }))} />
                      : <input id={`ask-f-${f.key}`} className={input} type="text" value={String(values[f.key] ?? '')} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />}</div>
                ))}
              </div>
            ) : editing && news ? (
              <div className="space-y-3">
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-title">Title</label><input id="ask-doc-title" className={input} value={title} onChange={e => setTitle(e.target.value)} maxLength={160} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-neutral-mid" htmlFor="ask-doc-body">{report ? 'Report' : 'Newsletter'} (## for a heading, - for a bullet; the buttons add bold, italic and underline)</label><MarkedTextarea id="ask-doc-body" rows={16} value={body} onChange={setBody} label="the text" className={`${input} font-mono`} /></div>
                {report && (
                  <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/60 p-3 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={internal} onChange={e => setInternal(e.target.checked)} />
                    <span><span className="font-semibold">Internal only.</span> It may name people and quote pay. It can be downloaded or emailed to the administrators, and can never be sent to staff. Leave this off for a report you may share: it then uses roles and counts only.</span></label>
                )}
              </div>
            )
    : null
  const paperNode = !d ? null : showPaper && (letter || news) ? (paper ? <Expandable label={d.type === 'newsletter' ? 'The designed newsletter' : 'The document on letterhead'} onOpen={openViewer}>{d.type === 'newsletter' ? (paper.sheet ? <SheetFrame html={paper.sheet} orientation={paper.orientation ?? 'portrait'} onFit={setFit} className="rounded-xl border border-gray-200" /> : <FitHtml html={paper.html} className="rounded-xl border border-gray-200" />) : <div className="no-scrollbar overflow-x-auto rounded-xl bg-neutral-light p-3"><style>{paper.css}</style><div dangerouslySetInnerHTML={{ __html: paper.html }} /></div>}</Expandable> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Preparing the preview</p>)
            : <Expandable label="The text" onOpen={openViewer}>{letter ? <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-neutral-light/50 p-4 font-sans text-sm leading-relaxed text-neutral-dark"><Marked text={d.body} /></pre>
              : <MarkdownLite text={d.body} />}</Expandable>
  const liveNode = live ? (live.sheet ? <SheetFrame html={live.sheet} orientation={live.orientation ?? 'portrait'} className="rounded-xl border border-gray-200" /> : <FitHtml html={live.html} className="rounded-xl border border-gray-200" />) : <p className="flex items-center gap-2 text-xs text-neutral-mid"><Loader2 size={12} className="animate-spin" aria-hidden="true" />Making the preview</p>
  const tb = 'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50'
  const tbOff = `${tb} border-gray-200 bg-white text-neutral-dark hover:bg-neutral-light`
  const tbOn = `${tb} border-teal bg-teal text-white hover:bg-teal-dark`
  const showWidth = canEditDoc && pw >= 560
  const sheetOn = d?.type === 'newsletter' && showPaper && !!paper?.sheet
  // what sits in the left column (tools and words) and what sits with the page
  // Every notice, checklist and warning sits in ONE band under the toolbar, across the whole panel, above the editing and page columns (never squeezed into the left column).
  const noticeBand = d ? (<>
    {flow && d.type !== 'newsletter' && docStatus && !docStatus.letterhead_ready && (
      <p className="rounded-lg border border-gray-200 bg-neutral-light/60 px-3 py-2 text-xs text-neutral-dark">To make this look like a complete company letter, finish your <strong>Letterhead and company details</strong> in Settings{docStatus.missing.length ? ': ' + docStatus.missing.join(', ') : ''}.</p>
    )}
    {showChecklist && d.type !== 'newsletter' && (
      <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <button type="button" aria-expanded={noticeOpen} aria-controls="ask-before-send" onClick={toggleNotice} className="flex w-full items-center justify-between gap-2 text-left font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
          <span className="flex items-center gap-1.5"><AlertTriangle size={14} aria-hidden="true" /> Before you send <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs">{d.checklist.length + 1} checks</span></span>
          <span className="text-xs font-semibold underline">{noticeOpen ? 'Hide' : 'Show'}</span>
        </button>
        {noticeOpen && (
          <div id="ask-before-send">
            <ul className="mt-1.5 list-disc space-y-1 pl-5">{d.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>
            {d.references.length > 0 && <p className="mt-2 text-xs">Sources: {d.references.map((r, i) => <span key={r.url}>{i > 0 ? ', ' : ''}<a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.label}</a></span>)}</p>}
            <p className="mt-2 text-xs">CareStream does not give legal advice. Check it matches the person's contract and your policies.</p>
          </div>
        )}
        {d.status === 'pending' && d.actions.approve !== undefined && (
          <label className="mt-2 flex items-start gap-2 font-medium"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={ticked} onChange={e => setTicked(e.target.checked)} /> I have read this checklist and checked the document.</label>
        )}
      </div>
    )}
  </>) : null
  // The approval step, built into the Share panel so there is always a way forward: submit it, approve it (another administrator, or you when you are the only one), or send it back.
  const approvalNode = d && flow && d.status !== 'approved' && d.status !== 'shared' ? (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-neutral-dark" id="ask-approval-step">
      <p className="font-semibold">First, it needs approving</p>
      {d.status === 'draft' && (<>
        <p className="mt-0.5 text-xs text-neutral-mid">{d.actions.submit ? 'Submit it for approval, then approve it here. Once it is approved you can send it.' : 'Only the person who wrote it can submit it.'}</p>
        {d.actions.submit && <button type="button" disabled={!!busy || dirty} title={dirty ? 'Save your changes first' : undefined} onClick={() => run('submit', () => ask.submit(token, d.id), 'Submitted. It is now waiting for approval.')} className={`${btn} mt-2 bg-teal text-white hover:bg-teal-dark`}>{busy === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Submit for approval</button>}
        {dirty && d.actions.submit && <p className="mt-1 text-xs text-amber-900">Save your changes first.</p>}
      </>)}
      {d.status === 'pending' && (<>
        {d.actions.approve !== undefined && d.actions.approve ? (<>
          {d.type === 'newsletter'
            ? <label className="mt-2 flex items-start gap-2 font-medium"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={ticked} onChange={e => setTicked(e.target.checked)} /> I have checked this is ready to share.</label>
            : <p className="mt-0.5 text-xs text-neutral-mid">Tick the checklist above, then approve.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={!ticked || !!busy} onClick={() => run('approve', () => ask.approve(token, d.id, ticked), 'Approved. You can now send it.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>
            {d.actions.return && <button type="button" disabled={!!busy} onClick={() => run('return', () => ask.returnToDraft(token, d.id, undefined), 'Sent back to draft.')} className={`${btn} border border-gray-200 bg-white text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Send back to edit</button>}
          </div>
        </>) : (<>
          <p className="mt-0.5 text-xs text-neutral-mid">It is waiting for another administrator to approve it.</p>
          {d.actions.return && <button type="button" disabled={!!busy} onClick={() => run('return', () => ask.returnToDraft(token, d.id, undefined), 'Sent back to draft.')} className={`${btn} mt-2 border border-gray-200 bg-white text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Take it back to edit</button>}
        </>)}
      </>)}
    </div>
  ) : null
  const notices = d ? (<>



  </>) : null
  const rest = d ? (<>
            {flow && letter && (d.status === 'pending' || d.status === 'approved' || d.status === 'shared') && (
              <label className="flex items-start gap-2 text-sm text-neutral-dark"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={sign} onChange={e => setSign(e.target.checked)} disabled={!docStatus?.signature} />
                <span><strong className="font-medium">Sign with my signature.</strong> {docStatus?.signature ? 'Your signature and your printed name and job title go at the end of the letter.' : 'You have not added a signature yet. Add one in Settings under My signature (or in the hub). Your printed name will still be used.'}</span></label>
            )}
            {d.type === 'newsletter' && d.actions.edit && takesPeople(d.data?.template_id) && <FeaturedPeople token={token} docId={d.id} version={d.updated_at ?? ''} onChanged={() => { void load(); onChanged() }} />}

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

  </>) : null
  const pageBlock = d ? (<>
    {d.type === 'newsletter' && sheetOn && !editing && <PageNotice doc={d} fit={fit} busy={!!busy} canEdit={!!d.actions.edit} onSet={setLayout} onShorten={() => setEditing(true)} />}
    {editing && d.type === 'newsletter' ? <div><p className="mb-1 text-xs font-semibold text-neutral-mid">Designed preview (follows what you type)</p>{liveNode}</div> : paperNode}
  </>) : null

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={d?.title ?? 'Document'} className="absolute inset-0 z-10 flex flex-col bg-white">
      {!d ? (<div className="p-5">{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p>}</div>) : (<>
        <header className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-neutral-dark">{d.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-mid">{st && <span className={`rounded-full px-2 py-0.5 font-semibold ${st.cls}`}>{st.label}</span>}{report && d.internal_only && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">Internal only</span>}{flow ? (letter ? 'Letter' : report ? 'Governance report' : 'Staff newsletter') : 'Saved answer'}{d.staff_name ? `, for ${d.staff_name}` : ''}</p>
              </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {showWidth && (
              <div role="group" aria-label="Panel width" className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs font-semibold">
                {(['narrow', 'wide', 'full'] as EditMode[]).map(m => <button key={m} type="button" aria-pressed={ui.editMode === m} onClick={() => setAskEditMode(m)} className={`px-2.5 py-1.5 ${ui.editMode === m ? 'bg-teal text-white' : 'bg-white text-neutral-dark hover:bg-neutral-light'}`}>{m === 'narrow' ? 'Narrower' : m === 'wide' ? 'Wider' : 'Full width'}</button>)}
              </div>
            )}
            <button type="button" onClick={requestClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
          </div>
        </header>

        <div role="toolbar" aria-label="Document tools" className="flex-shrink-0 space-y-2 border-b border-gray-200 bg-neutral-light/50 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {d.actions.edit && (
              <span className="inline-flex items-center gap-2">
                <button type="button" disabled={!!busy || !dirty} onClick={() => void save(false)} className={tbOn}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : dirty ? <Save size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {dirty ? 'Save' : 'Saved'}</button>
                <span role="status" className={`text-xs ${dirty ? 'font-semibold text-amber-800' : 'text-neutral-mid'}`}>{dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'All changes saved'}</span>
              </span>
            )}
            {d.actions.edit && flow && <button type="button" aria-pressed={editing} onClick={() => (editing ? (dirty ? setConfirmClose('editor') : setEditing(false)) : setEditing(true))} className={editing ? tbOn : tbOff}><Pencil size={14} aria-hidden="true" /> {editing ? 'Done editing' : 'Edit text'}</button>}
              {d.type === 'newsletter' && <div role="group" aria-label="View the newsletter" className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm font-semibold">{[['designed', 'Designed'], ['text', 'Text']].map(([k, l]) => <button key={k} type="button" aria-pressed={(k === 'designed') === showPaper} onClick={() => setShowPaper(k === 'designed')} className={`px-3 py-2 ${(k === 'designed') === showPaper ? 'bg-teal text-white' : 'bg-white text-neutral-dark hover:bg-neutral-light'}`}>{l}</button>)}</div>}
            {d.type === 'newsletter' && d.actions.edit && (
              <div role="group" aria-label="Page shape" className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs font-semibold">
                {(['portrait', 'landscape'] as const).map(o => <button key={o} type="button" disabled={!!busy} aria-pressed={orientation === o} onClick={() => orientation !== o && setLayout({ orientation: o })} className={`min-h-[36px] px-3 ${orientation === o ? 'bg-teal text-white' : 'bg-white text-neutral-dark hover:bg-neutral-light'} disabled:opacity-60`}>{o === 'portrait' ? 'Portrait' : 'Landscape'}</button>)}
              </div>
            )}
            {d.type === 'newsletter' && d.actions.edit && <>
              <button type="button" aria-expanded={tool === 'colours'} onClick={() => setTool(tool === 'colours' ? null : 'colours')} className={tool === 'colours' ? tbOn : tbOff}><Palette size={14} aria-hidden="true" /> Colours</button>
              <button type="button" aria-expanded={tool === 'blocks'} onClick={() => setTool(tool === 'blocks' ? null : 'blocks')} className={tool === 'blocks' ? tbOn : tbOff}><Plus size={14} aria-hidden="true" /> Add a block</button>
            </>}
              {flow && (letter || report) && <button type="button" onClick={() => setShowPaper(v => !v)} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><FileText size={14} /> {showPaper ? 'Show the text' : 'Preview on letterhead'}</button>}
              <button type="button" aria-label="Copy the text" title="Copy the text" onClick={() => navigator.clipboard?.writeText(d.body).catch(() => undefined)} className={`${tb} border-gray-200 bg-white px-2.5 text-neutral-dark hover:bg-neutral-light`}><Copy size={14} aria-hidden="true" /></button>
              <button type="button" aria-label="Expand" title="Expand" onClick={openViewer} className={`${tb} border-gray-200 bg-white px-2.5 text-neutral-dark hover:bg-neutral-light`}><Maximize2 size={14} aria-hidden="true" /></button>
          </div>
          <div className="flex flex-wrap items-start gap-2">
              {(letter || news) && <DocumentActions title={d.title} draft={!isFinal} disabled={!!busy} getPdf={getPdfBlob} tooLong={d.type === 'newsletter' ? { orientation, canTwoPages: canTwo, onSwitch: o => setLayout({ orientation: o }), onShorten: () => setEditing(true), onTwoPages: canTwo ? () => setLayout({ pages: 'two' }) : undefined } : undefined} getDocx={() => ask.documentBlob(token, d.id, 'docx', { sign: sign && letter, draft: !isFinal })}
                onDone={w => { setInfo(w === 'pdf' ? 'The PDF has been saved.' : w === 'word' ? 'The Word document has been saved.' : 'Sent to your printer dialog.'); if (isFinal) { void load(); onChanged() } }} onError={m => setError(m)} />}
              {(letter || news) && (d.actions.share.length > 0 || flow) && !(letter && intent.print_only) && <SharePanel token={token} doc={{ id: d.id, type: d.type, title: d.title, status: d.status, staff_name: d.staff_name, share_intent: d.share_intent ?? null }} sign={sign && letter} needsAck={ack ?? d.ack_default ?? false} approval={approvalNode} onPreview={openViewer} onSent={() => { void load(); onChanged() }} />}
              {d.actions.submit && <button type="button" disabled={!!busy || dirty} title={dirty ? 'Save your changes first' : undefined} onClick={() => run('submit', () => ask.submit(token, d.id), 'Submitted. It is now waiting for approval.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'submit' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Submit for approval</button>}
              {d.status === 'draft' && flow && !d.actions.submit && d.actions.edit && letter && <span className="text-xs text-amber-800">Finish the missing details before submitting.</span>}
              {d.status === 'pending' && d.actions.approve && <button type="button" disabled={!ticked || !!busy} onClick={() => run('approve', () => ask.approve(token, d.id, ticked), 'Approved. You can now share it.')} className={`${btn} bg-teal text-white hover:bg-teal-dark`}>{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve</button>}
              {d.status === 'pending' && !d.actions.approve && !d.mine && <span className="text-xs text-neutral-mid">Someone else needs to approve this.</span>}
              {d.status === 'pending' && d.actions.return && <button type="button" disabled={!!busy} onClick={() => { const n = window.prompt('Why is it going back? (optional)', note); if (n !== null) { setNote(n); run('return', () => ask.returnToDraft(token, d.id, n.trim() || undefined), 'Sent back to draft.') } }} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Send back</button>}
              {d.actions.reopen && <button type="button" disabled={!!busy} onClick={() => run('reopen', () => ask.reopen(token, d.id), 'Back to draft. It needs approving again.')} className={`${btn} border border-gray-200 text-neutral-dark hover:bg-neutral-light`}><RotateCcw size={14} /> Re-open</button>}
              {letter && intent.print_only && <span className="text-xs text-neutral-mid">Print only: Save PDF or Print it from here. Nothing is sent to {first}.</span>}
            {dirty && d.actions.submit && <span className="self-center text-xs text-amber-800">Save your changes before you submit.</span>}
          </div>
        </div>

        <div className="flex-shrink-0 space-y-2 px-4 pt-3 empty:hidden" id="ask-nl-tools">
          {confirmClose && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-neutral-dark">
              <p>Save your changes?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={!!busy} onClick={async () => { const to = confirmClose; await save(true); setConfirmClose(null); if (to === 'panel') onClose() }} className={tbOn}>Save</button>
                <button type="button" disabled={!!busy} onClick={() => { const to = confirmClose; setTitle(d.title); setBody(d.body); setValues(d.values ?? {}); setInternal(d.internal_only === true); setEditing(false); setConfirmClose(null); if (to === 'panel') onClose() }} className={tbOff}>Discard</button>
                <button type="button" onClick={() => setConfirmClose(null)} className={tbOff}>Keep editing</button>
              </div>
            </div>
          )}
          {d.type === 'newsletter' && d.actions.edit && <NewsletterEditor bare open={tool} onOpen={setTool} token={token} docId={d.id} version={d.updated_at ?? ''} focus={focus} onChanged={() => { void load(); onChanged() }} />}
        </div>

        <div className="flex-shrink-0 space-y-2 px-4 pt-3 empty:hidden" id="ask-notices">{noticeBand}</div>

        <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-3 ${split ? 'grid grid-cols-2 items-start gap-4' : 'space-y-3'}`}>
          {split ? (<>
            <div className="min-w-0 space-y-3">{notices}{editing && formNode}{rest}</div>
            <div className="min-w-0 space-y-3">{pageBlock}</div>
          </>) : (<>
            {notices}
            {editing && formNode}
            {pageBlock}
            {rest}
          </>)}
        </div>
      </>)}
      {d && <ExpandViewer open={viewer.open} onClose={viewer.close} title={d.title} items={viewerItems}
        switcher={d.type === 'newsletter' ? { value: showPaper ? 'designed' : 'text', options: [{ id: 'designed', label: 'Designed' }, { id: 'text', label: 'Text' }], onChange: k => setShowPaper(k === 'designed') } : undefined}
        pdf={(letter || news) ? { getPdf: getPdfBlob, getDocx: () => ask.documentBlob(token, d.id, 'docx', { sign: sign && letter, draft: !isFinal }), draft: !isFinal, tooLong: d.type === 'newsletter' && d.actions.edit ? { orientation, canTwoPages: canTwo, onSwitch: o => { viewer.close(); setLayout({ orientation: o }) }, onShorten: () => { viewer.close(); setEditing(true) }, onTwoPages: canTwo ? () => { viewer.close(); setLayout({ pages: 'two' }) } : undefined } : undefined } : undefined} />}
    </div>
  )
}
