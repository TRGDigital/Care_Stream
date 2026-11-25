'use client'

// Ask CareStream: the overlay. Pick an agent, ask it a question, save the answers you want, find them again in the library.
// Pilot (CS-1001 administrators): the button only shows when the API says it is on. Light design, closes with Esc, focus kept inside.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowLeft, Award, BarChart3, Bell, BookOpen, CalendarDays, Check, ClipboardCheck, Copy, FileText, GraduationCap, Library, Loader2, Lock, Newspaper, PoundSterling, Send, Shield, Sparkles, Trash2, UserPlus, Users, Wallet, X, Pencil, ShieldCheck, BadgeCheck, FileBarChart, Maximize2, Minimize2, Heart } from 'lucide-react'
import { ask, AskError, parseNotificationDraft, withoutDraftBlock, notificationsLink, parseNewsletterLayouts, withoutLayoutsBlock, type AskAgent, type AskConversation, type AskDocument, type AskMessage, type AskSource, type AskActionCard, type AskUpload } from '@/lib/ask-client'
import { MarkdownLite } from '@/components/ask/markdown-lite'
import { type AskPageContext, agentForPage, clampWidth, contextStarters, layoutFor, toWireContext, MAX_W, MIN_W, type PanelLayout } from '@/lib/ask-panel-state'
import { useAskContext } from '@/lib/ask-context'
import { closeAsk, initAskUi, openAsk, registerAskTrigger, setAskEnabled, setAskExpanded, setAskWidth, toggleAsk, useAskUi } from '@/lib/ask-ui-store'
import { DocumentPanel } from '@/components/ask/document-panel'
import { ActionCard } from '@/components/ask/action-card'
import { LayoutThumbs } from '@/components/ask/layout-thumbs'
import { ExpandViewer, type ViewerItem } from '@/components/ask/expand-viewer'
import { AttachButton, UploadsBlock } from '@/components/ask/upload-panel'
import { NewsletterPicker } from '@/components/ask/newsletter-picker'

export const OPEN_ASK_EVENT = 'cs:open-ask'
const ICONS: Record<string, LucideIcon> = {
  users: Users, calendar: CalendarDays, pound: PoundSterling, file: FileText, newspaper: Newspaper, bell: Bell, award: Award, chart: BarChart3, shield: Shield, graduation: GraduationCap,
  badge: BadgeCheck, clipboard: ClipboardCheck, check: ShieldCheck, userplus: UserPlus, lock: Lock, report: FileBarChart, alert: AlertTriangle, wallet: Wallet, book: BookOpen, heart: Heart,
}
const Icon = ({ name, size = 22, className = '' }: { name: string; size?: number; className?: string }) => { const C = ICONS[name] ?? Sparkles; return <C size={size} className={className} /> }

type View = 'picker' | 'chat' | 'library'

export function AskButton() {
  const { data: session } = useSession()
  const token = session?.accessToken
  const isAdmin = (session?.user as any)?.role === 'admin'
  const who = String(session?.user?.email ?? '')
  const ui = useAskUi()
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (who) initAskUi(who) }, [who])
  useEffect(() => {
    if (!token) return
    // Administrators always ask. A member of staff (a manager, when the account allows managers) asks once; a "no" is remembered for 30 minutes so the hub does not ask every time.
    const offKey = `cs-ask-off:${who}`
    if (!isAdmin) { try { const t = Number(window.sessionStorage.getItem(offKey) || 0); if (t && Date.now() - t < 30 * 60_000) return } catch { /* storage blocked */ } }
    let live = true
    ask.meta(token).then(m => { if (live) setAskEnabled(!!m.enabled) }).catch(() => { if (live) { setAskEnabled(false); if (!isAdmin) { try { window.sessionStorage.setItem(offKey, String(Date.now())) } catch { /* ignore */ } } } })   // a 404 means not in the pilot (or not allowed): nothing shows
    return () => { live = false }
  }, [token, isAdmin, who])
  useEffect(() => { registerAskTrigger(btn.current); return () => registerAskTrigger(null) }, [ui.enabled])
  useEffect(() => {
    const on = () => openAsk()
    window.addEventListener(OPEN_ASK_EVENT, on)
    return () => window.removeEventListener(OPEN_ASK_EVENT, on)
  }, [])
  if (!ui.enabled || !token) return null
  return (
    <button ref={btn} type="button" onClick={toggleAsk} aria-expanded={ui.open} aria-controls="ask-panel" aria-label="Ask CareStream" title="Ask CareStream"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 ${ui.open ? 'border-teal bg-teal text-white hover:bg-teal-dark' : 'border-teal/40 bg-teal/5 text-teal hover:bg-teal/10'}`}>
      <Sparkles size={16} aria-hidden="true" /> <span className="hidden sm:inline">Ask CareStream</span>
    </button>
  )
}

/** Mounted ONCE in the admin shell, beside the page, so a conversation (and what is half typed) survives moving between pages. */
export function AskPanelHost() {
  const { data: session } = useSession()
  const token = session?.accessToken
  const ui = useAskUi()
  const [vw, setVw] = useState(1440)
  useEffect(() => {
    const on = () => setVw(window.innerWidth); on()
    window.addEventListener('resize', on); return () => window.removeEventListener('resize', on)
  }, [])
  const layout = layoutFor(vw)
  // The panel is ALWAYS an overlay on top of the page (it never moves or resizes the page). The support chat bubble moves left of it so both stay reachable (the bubble reads this).
  const dock = ui.enabled && ui.open && !ui.expanded && layout !== 'phone' ? clampWidth(ui.width, vw) : 0
  useEffect(() => { document.documentElement.style.setProperty('--ask-dock', `${dock}px`); return () => { document.documentElement.style.removeProperty('--ask-dock') } }, [dock])
  if (!ui.enabled || !ui.open || !token) return null
  return <AskPanel token={token} layout={layout} expanded={ui.expanded} width={clampWidth(ui.width, vw)} onClose={closeAsk} />
}

const timeAgo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function SourcesFooter({ sources }: { sources: AskSource[] }) {
  const [open, setOpen] = useState(false)
  if (!sources.length) return null
  const warned = sources.some(s => s.warning)
  return (
    <div className="mt-2 text-xs text-neutral-mid">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="inline-flex items-center gap-1 font-medium hover:text-neutral-dark">
        {warned && <AlertTriangle size={12} className="text-amber-600" aria-hidden="true" />} Sources ({sources.length}) {open ? '(hide)' : '(show)'}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {sources.map((s, i) => (
            <li key={i}>{s.label}{s.as_of ? `, as of ${s.as_of}` : ''}{s.warning && <span className="ml-1 font-medium text-amber-700">Warning: {s.warning}</span>}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnswerActions({ m, token, agentId }: { m: AskMessage; token: string; agentId: string }) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const draft = agentId === 'notifications' ? parseNotificationDraft(m.content) : null
  const text = withoutDraftBlock(m.content)
  async function copy() { try { await navigator.clipboard.writeText(draft ? `${draft.title}\n\n${draft.body}` : text); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ } }
  async function save() {
    setSaved('busy')
    try { await ask.save(token, { type: draft ? 'notification' : 'answer', title: (draft?.title ?? text.split('\n')[0]).slice(0, 80) || 'Saved answer', body: draft ? `${draft.title}\n\n${draft.body}` : text, sources: m.sources }); setSaved('done') } catch { setSaved('error') }
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light">{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}</button>
      <button type="button" onClick={save} disabled={saved === 'busy' || saved === 'done'} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-60">
        {saved === 'busy' ? <Loader2 size={12} className="animate-spin" /> : saved === 'done' ? <Check size={12} /> : <Library size={12} />} {saved === 'done' ? 'Saved to library' : saved === 'error' ? 'Could not save, try again' : 'Save to library'}
      </button>
      {draft && <Link href={notificationsLink(draft)} className="inline-flex items-center gap-1 rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-dark">Open in Notifications to review and send</Link>}
    </div>
  )
}

function ContextChip({ ctx, onDismiss }: { ctx: AskPageContext; onDismiss: () => void }) {
  return (
    <p className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1 pl-3 pr-1 text-xs text-sky-900">
      <span className="truncate">You are looking at: <strong className="font-semibold">{ctx.label}</strong></span>
      <button type="button" onClick={onDismiss} aria-label="Stop using what I am looking at" className="rounded-full p-1 text-sky-700 hover:bg-sky-100"><X size={12} /></button>
    </p>
  )
}

/** On the picker: what the admin is looking at, the agent that suits it, and a few questions that fit. Click one and it asks straight away. */
function ContextCard({ ctx, agents, onDismiss, onAsk }: { ctx: AskPageContext; agents: AskAgent[] | null; onDismiss: () => void; onAsk: (a: AskAgent, q: string) => void }) {
  const id = agentForPage(ctx.page)
  const a = id ? agents?.find(x => x.id === id && x.status === 'ready') : undefined
  const qs = contextStarters(ctx)
  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/70 p-3">
      <ContextChip ctx={ctx} onDismiss={onDismiss} />
      {a && qs.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-neutral-dark">Suggested: the {a.name} agent</p>
          <ul className="mt-2 space-y-1.5">{qs.map(q => <li key={q}><button type="button" onClick={() => onAsk(a, q)} className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-left text-sm font-medium text-neutral-dark hover:border-teal hover:bg-teal/5">{q}</button></li>)}</ul>
        </>
      ) : <p className="text-sm text-neutral-mid">Pick an agent below and it will know where you are.</p>}
    </div>
  )
}

export function AskPanel({ token, layout, expanded, width, onClose }: { token: string; layout: PanelLayout; expanded: boolean; width: number; onClose: () => void }) {
  const [view, setView] = useState<View>('picker')
  const [agents, setAgents] = useState<AskAgent[] | null>(null)
  const [ready, setReady] = useState(true)
  const [agent, setAgent] = useState<AskAgent | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [cards, setCards] = useState<Record<string, AskActionCard[]>>({})   // action cards the agent proposed, by the answer they belong to
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uploads, setUploads] = useState<AskUpload[]>([])   // files attached to this chat (agents that take files)
  const [lib, setLib] = useState<{ tab: 'chats' | 'docs'; chats: AskConversation[] | null; docs: AskDocument[] | null }>({ tab: 'chats', chats: null, docs: null })
  const [docId, setDocId] = useState<string | null>(null)
  const [libView, setLibView] = useState<{ title: string; items: ViewerItem[]; doc: AskDocument } | null>(null)   // a library item shown large
  const [docFilter, setDocFilter] = useState<'all' | 'waiting'>('all')
  const [waiting, setWaiting] = useState(0)   // letters, newsletters and reports waiting for THIS person's approval
  useEffect(() => {
    let live = true
    ask.approvals(token).then(r => { if (live) setWaiting(r.waiting_for_me ?? (r.approvals ?? []).filter(a => a.can_approve ?? !a.mine).length) }).catch(() => { if (live) setWaiting(0) })
    return () => { live = false }
  }, [token, view, docId])
  const dlg = useRef<HTMLDivElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const pageCtx = useAskContext()
  const [chipOff, setChipOff] = useState<string | null>(null)       // the context the admin dismissed (so a different page brings the chip back)
  const ctxKey = pageCtx ? JSON.stringify(pageCtx) : ''
  const chipOn = !!pageCtx && chipOff !== ctxKey
  const [expandHint, setExpandHint] = useState<string | null>(null)   // a document id whose 'try the larger view' note was dismissed
  const compact = !expanded
  const modal = expanded || layout === 'phone'

  useEffect(() => { ask.meta(token).then(m => { setAgents(m.agents); setReady(m.ready) }).catch(e => setError(e.message)) }, [token])
  useEffect(() => { (document.getElementById('ask-input') ?? dlg.current)?.focus() }, [])
  useEffect(() => { if (view === 'chat') document.getElementById('ask-input')?.focus() }, [view, agent?.id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])
  useEffect(() => {
    const prev = document.body.style.overflow
    if (modal) document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Collapse the large view first, then close a document, then (docked) close the panel only when focus is inside it.
        if (expanded) { e.preventDefault(); setAskExpanded(false); return }
        if (docId) { e.preventDefault(); setDocId(null); return }
        if (layout === 'phone' || dlg.current?.contains(document.activeElement)) { e.preventDefault(); onClose() }
        return
      }
      if (e.key !== 'Tab' || !dlg.current || !modal) return
      const f = Array.from(dlg.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea, input, [tabindex]:not([tabindex="-1"])')).filter(x => x.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [onClose, docId, expanded, modal, layout])

  const pick = (a: AskAgent) => { if (a.status === 'soon') return; setAgent(a); setConvId(null); setUploads([]); setMessages([]); setCards({}); setError(''); setText(''); setView('chat') }
  useEffect(() => {
    if (!convId || !agent?.uploads) return
    let live = true
    ask.uploads.list(token, convId).then(r => { if (live) setUploads(r.uploads) }).catch(() => undefined)
    return () => { live = false }
  }, [convId, agent?.id, agent?.uploads, token])
  const pickAndAsk = (a: AskAgent, q: string) => { pick(a); void send(q, a) }
  async function send(q?: string, forAgent?: AskAgent) {
    const ag = forAgent ?? agent
    const msg = (q ?? text).trim()
    if (!msg || !ag || busy || ag.status !== 'ready') return
    setBusy(true); setError(''); setText('')
    setMessages(m => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: msg }])
    try {
      const r = await ask.chat(token, { agent_id: ag.id, conversation_id: forAgent ? null : convId, message: msg, context: chipOn ? toWireContext(pageCtx) : undefined })
      setConvId(r.conversation_id); setMessages(m => [...m, r.message]); if (r.actions?.length) setCards(c => ({ ...c, [r.message.id]: r.actions! }))
    } catch (e) { setError(e instanceof AskError ? e.message : 'Something went wrong. Please try again.') } finally { setBusy(false) }
  }
  const loadLib = useCallback(async () => {
    try { const [c, d] = await Promise.all([ask.conversations(token), ask.documents(token)]); setLib(l => ({ ...l, chats: c.conversations, docs: d.documents })) } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the library.') }
  }, [token])
  useEffect(() => { if (view === 'library') loadLib() }, [view, loadLib])
  async function openChat(c: AskConversation) {
    const a = agents?.find(x => x.id === c.agent_id); if (!a) return
    try { const r = await ask.conversation(token, c.id); setAgent(a); setConvId(c.id); setMessages(r.messages); setCards((r.actions ?? []).reduce((acc: Record<string, AskActionCard[]>, x) => { if (x.message_id) (acc[x.message_id] ??= []).push(x.card); return acc }, {})); setError(''); setView('chat') } catch (e) { setError(e instanceof Error ? e.message : 'Could not open that chat.') }
  }
  async function renameChat(c: AskConversation) { const t = window.prompt('Name this chat', c.title); if (t && t.trim()) { await ask.rename(token, c.id, t.trim()).catch(() => undefined); loadLib() } }
  async function removeChat(c: AskConversation) { if (window.confirm('Delete this chat and its answers? This cannot be undone.')) { await ask.remove(token, c.id).catch(() => undefined); loadLib() } }
  function openDoc(d: AskDocument) { setDocId(d.id) }
  async function expandDoc(d: AskDocument) {
    if (!token) return
    try {
      if (d.type === 'answer') { const r = await ask.document(token, d.id); setLibView({ title: d.title, doc: d, items: [{ kind: 'node', node: <div className="w-[680px] max-w-full p-8 text-neutral-dark"><MarkdownLite text={r.document.body} /></div> }] }) }
      else { const p = await ask.preview(token, d.id); setLibView({ title: d.title, doc: d, items: [{ kind: 'html', html: p.html, css: p.css }] }) }
    } catch { /* it can still be opened normally */ }
  }
  async function removeDoc(d: AskDocument) { if (window.confirm('Delete this saved item? This cannot be undone.')) { await ask.removeDocument(token, d.id).catch(() => undefined); setDocId(null); loadLib() } }

  const grouped = useMemo(() => agents ?? [], [agents])
  // One root element whose classes change with the mode, so the conversation and anything half typed survive docking, expanding and moving between pages.
  const rootCls = expanded ? 'fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-2 sm:p-6' : 'contents'
  const boxCls = expanded
    ? 'flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none sm:w-[90vw]'
    : layout === 'phone' ? 'fixed inset-0 z-[75] flex flex-col overflow-hidden bg-white outline-none'
    : 'fixed bottom-0 right-0 top-0 z-[75] flex max-w-full flex-col overflow-hidden border-l border-gray-200 bg-white shadow-[-12px_0_32px_rgba(23,18,31,0.12)] outline-none ask-slide-in'
  const boxStyle = !expanded && layout !== 'phone' ? { width } : undefined
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX, w0 = width
    const move = (ev: PointerEvent) => setAskWidth(w0 + (x0 - ev.clientX))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const resizeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 60 : 20
    if (e.key === 'ArrowLeft') { e.preventDefault(); setAskWidth(width + step) } else if (e.key === 'ArrowRight') { e.preventDefault(); setAskWidth(width - step) }
  }
  return (
    <div className={rootCls} onMouseDown={e => { if (expanded && e.target === e.currentTarget) setAskExpanded(false) }}>
      <div ref={dlg} id="ask-panel" tabIndex={-1} role={modal ? 'dialog' : 'complementary'} aria-modal={modal ? true : undefined} aria-labelledby="ask-title" className={boxCls} style={boxStyle}>
        {!expanded && layout !== 'phone' && (
          <div role="separator" aria-orientation="vertical" aria-label="Resize Ask CareStream. Use the left and right arrow keys." aria-valuemin={MIN_W} aria-valuemax={MAX_W} aria-valuenow={width} tabIndex={0}
            onPointerDown={startResize} onKeyDown={resizeKey} className="absolute left-0 top-0 z-20 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-teal/30 focus:bg-teal/40 focus:outline-none" />
        )}
        <header className={`flex flex-shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 ${expanded ? 'sm:px-6' : ''}`}>
          <div className="flex min-w-0 items-center gap-3">
            {view !== 'picker' && <button type="button" onClick={() => setView('picker')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-mid hover:bg-neutral-light" aria-label="Back to the agents"><ArrowLeft size={16} /> Agents</button>}
            <Sparkles size={20} className="shrink-0 text-teal" aria-hidden="true" />
            <h2 id="ask-title" className="truncate text-lg font-bold text-neutral-dark">{view === 'chat' && agent ? `Ask CareStream: ${agent.name}` : view === 'library' ? 'Your library' : 'Ask CareStream'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setView(view === 'library' ? 'picker' : 'library')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><Library size={15} aria-hidden="true" /> Library{waiting > 0 && <span className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-teal px-1.5 text-xs font-bold text-white" aria-label={`${waiting} waiting for your approval`}>{waiting}</span>}</button>
            {layout !== 'phone' && <button type="button" onClick={() => setAskExpanded(!expanded)} aria-pressed={expanded} aria-label={expanded ? 'Back to the side panel' : 'Expand to a larger view'} title={expanded ? 'Back to the side panel' : 'Expand'} className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light">{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={20} /></button>
          </div>
        </header>

        {!ready && <p className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900">Saving chats is not switched on yet, so questions cannot be answered until it is.</p>}

        {view === 'picker' && (
          <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5 ${expanded ? 'sm:px-6' : ''}`}>
            {waiting > 0 && (
              <button type="button" onClick={() => { setLib(l => ({ ...l, tab: 'docs' })); setDocFilter('waiting'); setView('library') }} className="mb-4 flex w-full max-w-3xl items-center gap-3 rounded-xl border border-teal/40 bg-teal/5 px-4 py-3 text-left hover:bg-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
                <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-teal px-2 text-sm font-bold text-white">{waiting}</span>
                <span className="text-sm font-semibold text-neutral-dark">Awaiting approval<span className="block text-xs font-normal text-neutral-mid">{waiting === 1 ? 'One document is' : `${waiting} documents are`} waiting for you to check and approve. Open the library to see {waiting === 1 ? 'it' : 'them'}.</span></span>
              </button>
            )}
            {chipOn && pageCtx && <ContextCard ctx={pageCtx} agents={agents} onDismiss={() => setChipOff(ctxKey)} onAsk={pickAndAsk} />}
            <p className="mb-4 max-w-3xl text-sm text-neutral-mid">Choose an agent, then ask it anything about that part of your service. It reads your CareStream records and official figures, shows its working and where each figure comes from, and never sends or changes anything without you.</p>
            {!agents ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p> : (
              <ul className={`grid gap-3 ${expanded ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {grouped.map(a => {
                  const off = a.status === 'soon'
                  return (
                    <li key={a.id}>
                      <button type="button" disabled={off} onClick={() => pick(a)} className={`flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left transition ${off ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white hover:border-teal hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40'}`}>
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${off ? 'bg-gray-100 text-neutral-mid' : 'bg-teal/10 text-teal'}`}><Icon name={a.icon} size={20} /></span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-base font-semibold text-neutral-dark">{a.name}{off && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Coming soon</span>}{a.status === 'shell' && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">Coming next</span>}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-neutral-mid">{a.blurb}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {view === 'chat' && agent && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5 ${expanded ? 'sm:px-6' : ''}`}>
              <div className="mx-auto min-w-0 max-w-3xl space-y-5">
                {agent.status === 'shell' ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm leading-relaxed text-sky-900"><p className="font-semibold">{agent.name} is coming next</p><p className="mt-1">{agent.shell_message}</p></div>
                ) : messages.length === 0 && (
                  <div>
                    {chipOn && pageCtx && <ContextChip ctx={pageCtx} onDismiss={() => setChipOff(ctxKey)} />}
                    <p className="text-sm text-neutral-mid">{agent.blurb} Try one of these, or ask your own question.</p>
                    <div className={`mt-3 grid gap-2 ${expanded ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {[...(chipOn && pageCtx && agentForPage(pageCtx.page) === agent.id ? contextStarters(pageCtx) : []), ...agent.starters].filter((q, i, a) => a.indexOf(q) === i).slice(0, expanded ? 8 : 6).map(s => <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-neutral-dark hover:border-teal hover:bg-teal/5 disabled:opacity-60">{s}</button>)}
                    </div>
                    {agent.id === 'newsletter' && token && <NewsletterPicker token={token} disabled={busy} onChoose={m => send(m)} />}
                  </div>
                )}
                {messages.map(m => m.role === 'user' ? (
                  <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-teal px-4 py-2.5 text-[15px] text-white">{m.content}</div>
                ) : (
                  <div key={m.id} className="max-w-full rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <MarkdownLite text={agent.id === 'notifications' ? withoutDraftBlock(m.content) : agent.id === 'newsletter' ? withoutLayoutsBlock(m.content) : m.content} />
                    {agent.id === 'newsletter' && token && parseNewsletterLayouts(m.content) && <LayoutThumbs token={token} type={parseNewsletterLayouts(m.content)!} disabled={busy} onPick={d => send(`I would like the ${d.layout} layout (${d.id}).`)} />}
                    {agent.id === 'notifications' && parseNotificationDraft(m.content) && (() => { const d = parseNotificationDraft(m.content)!; return <div className="mt-3 rounded-lg border border-teal/30 bg-teal/5 p-3 text-sm"><p className="font-semibold text-neutral-dark">{d.title}</p><p className="mt-1 whitespace-pre-line text-neutral-dark">{d.body}</p></div> })()}
                    {(cards[m.id] ?? []).map(c => <ActionCard key={c.id} token={token} card={c} />)}
                    <SourcesFooter sources={m.sources ?? []} />
                    <AnswerActions m={m} token={token} agentId={agent.id} />
                  </div>
                ))}
                {agent.uploads && <UploadsBlock token={token} uploads={uploads} onChange={u => setUploads(l => l.map(x => x.id === u.id ? u : x))} onRemoved={id => setUploads(l => l.filter(x => x.id !== id))} onError={setError} />}
                {busy && <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Working it out from your records</p>}
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div ref={end} />
              </div>
            </div>
            {agent.status === 'ready' && (
              <form className={`flex-shrink-0 border-t border-gray-200 bg-neutral-light/50 px-4 py-3 ${expanded ? 'sm:px-6' : ''}`} onSubmit={e => { e.preventDefault(); send() }}>
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <AttachButton token={token} agent={agent} convId={convId} disabled={busy} onError={setError} onAdded={u => { setUploads(l => [...l, u]); setConvId(u.conversation_id) }} />
                  <label htmlFor="ask-input" className="sr-only">Your question</label>
                  <textarea id="ask-input" rows={2} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={`Ask the ${agent.name} agent...`} maxLength={2000} className="min-h-[52px] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
                  <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-[52px] items-center gap-1.5 rounded-xl bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><Send size={16} aria-hidden="true" /> Ask</button>
                </div>
                {agent.uploads && <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-neutral-mid">{agent.uploads.hint} Bank details, National Insurance numbers, addresses, dates of birth, contact details and health columns are removed when a file is read.</p>}
                <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-neutral-mid">Answers come from your CareStream records and official figures. Check anything important. Pay and funding figures are for administrators only.</p>
              </form>
            )}
          </div>
        )}

        {view === 'library' && (
          <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5 ${expanded ? 'sm:px-6' : ''}`}>
            <div className="mx-auto max-w-3xl">
              <div role="tablist" className="mb-4 flex gap-1 rounded-lg bg-neutral-light p-1 text-sm">
                {([['chats', 'Past chats'], ['docs', 'Saved items']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={lib.tab === k} type="button" onClick={() => setLib(s => ({ ...s, tab: k }))} className={`flex-1 rounded-md px-3 py-1.5 font-medium ${lib.tab === k ? 'bg-white text-teal shadow-sm' : 'text-neutral-mid'}`}>{l}</button>)}
              </div>
              {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
              {lib.tab === 'chats' ? (
                lib.chats === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p>
                : lib.chats.length === 0 ? <p className="rounded-xl bg-neutral-light px-4 py-8 text-center text-sm text-neutral-mid">No chats yet. Pick an agent and ask something.</p>
                : <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">{lib.chats.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <button type="button" onClick={() => openChat(c)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-neutral-dark">{c.title || 'Untitled chat'}</span><span className="text-xs text-neutral-mid">{agents?.find(a => a.id === c.agent_id)?.name ?? c.agent_id} · {timeAgo(c.updated_at)}</span></button>
                    <button type="button" onClick={() => renameChat(c)} aria-label={`Rename ${c.title}`} className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light"><Pencil size={14} /></button>
                    <button type="button" onClick={() => removeChat(c)} aria-label={`Delete ${c.title}`} className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /></button>
                  </li>))}</ul>
              ) : (
                lib.docs === null ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p>
                : lib.docs.length === 0 ? <p className="rounded-xl bg-neutral-light px-4 py-8 text-center text-sm text-neutral-mid">Nothing saved yet. Use Save to library under any answer.</p>
                : <>
                  <div className="mb-2 flex gap-1.5 text-xs">{([['all', 'All'], ['waiting', 'Waiting for approval']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setDocFilter(k)} className={`rounded-full px-3 py-1 font-semibold ${docFilter === k ? 'bg-teal text-white' : 'border border-gray-200 text-neutral-dark hover:bg-neutral-light'}`}>{l}{k === 'waiting' && (lib.docs ?? []).filter(d => d.status === 'pending').length > 0 ? ` (${(lib.docs ?? []).filter(d => d.status === 'pending').length})` : ''}</button>)}</div>
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">{lib.docs.filter(d => docFilter === 'all' || d.status === 'pending').map(d => (
                  <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <button type="button" onClick={() => openDoc(d)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-neutral-dark">{d.title}</span><span className="text-xs text-neutral-mid">{d.type === 'letter' ? 'Letter' : d.type === 'newsletter' ? 'Staff newsletter' : d.type === 'report' ? 'Governance report' : 'Saved answer'}{d.staff_name ? `, for ${d.staff_name}` : ''} · <span className={d.status === 'pending' ? 'font-semibold text-amber-800' : d.status === 'approved' ? 'font-semibold text-green-700' : ''}>{d.status === 'pending' ? 'Waiting for approval' : d.status === 'approved' ? 'Approved' : d.status === 'shared' ? 'Shared' : 'Draft'}</span> · {timeAgo(d.updated_at)}{d.mine === false ? ' · written by a colleague' : ''}</span></button>
                    <button type="button" onClick={() => expandDoc(d)} aria-label={`Expand ${d.title}`} title="Click to enlarge" className="rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"><Maximize2 size={14} aria-hidden="true" /></button>
                    {(d.mine !== false) && (d.type === 'answer' || d.status === 'draft') && <button type="button" onClick={() => removeDoc(d)} aria-label={`Delete ${d.title}`} className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /></button>}
                  </li>))}</ul></>
              )}
            </div>
          </div>
        )}

        {docId && !expanded && layout !== 'phone' && expandHint !== docId && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 border-b border-teal/30 bg-teal/10 px-4 py-2 text-xs text-neutral-dark" role="status">
            <span>This is easier to read and edit in the larger view.</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => setAskExpanded(true)} className="rounded-md bg-teal px-2.5 py-1 font-semibold text-white hover:bg-teal-dark">Expand</button>
              <button type="button" onClick={() => setExpandHint(docId)} className="font-medium text-neutral-mid hover:text-neutral-dark">Not now</button>
            </span>
          </div>
        )}
        {docId && <DocumentPanel token={token} id={docId} onClose={() => setDocId(null)} onChanged={loadLib} />}
        {libView && token && <ExpandViewer open onClose={() => setLibView(null)} title={libView.title} items={libView.items}
          downloads={(libView.doc.status === 'approved' || libView.doc.status === 'shared') && libView.doc.type !== 'answer' ? [{ label: 'PDF', onClick: () => ask.downloadPdf(token, libView.doc.id, libView.doc.title) }, { label: 'Word', onClick: () => ask.downloadDocx(token, libView.doc.id, libView.doc.title) }] : undefined} />}
      </div>
    </div>
  )
}
