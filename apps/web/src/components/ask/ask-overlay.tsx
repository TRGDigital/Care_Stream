'use client'

// Ask CareStream: the overlay. Pick an agent, ask it a question, save the answers you want, find them again in the library.
// Pilot (CS-1001 administrators): the button only shows when the API says it is on. Light design, closes with Esc, focus kept inside.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, ArrowLeft, Award, BarChart3, Bell, BookOpen, CalendarDays, Check, ClipboardCheck, Copy, FileText, GraduationCap, Library, Loader2, Lock, Newspaper, PoundSterling, Send, Shield, Sparkles, Trash2, UserPlus, Users, Wallet, X, Pencil, ShieldCheck, BadgeCheck, FileBarChart } from 'lucide-react'
import { ask, AskError, parseNotificationDraft, withoutDraftBlock, notificationsLink, type AskAgent, type AskConversation, type AskDocument, type AskMessage, type AskSource } from '@/lib/ask-client'
import { MarkdownLite } from '@/components/ask/markdown-lite'
import { DocumentPanel } from '@/components/ask/document-panel'

export const OPEN_ASK_EVENT = 'cs:open-ask'
const ICONS: Record<string, LucideIcon> = {
  users: Users, calendar: CalendarDays, pound: PoundSterling, file: FileText, newspaper: Newspaper, bell: Bell, award: Award, chart: BarChart3, shield: Shield, graduation: GraduationCap,
  badge: BadgeCheck, clipboard: ClipboardCheck, check: ShieldCheck, userplus: UserPlus, lock: Lock, report: FileBarChart, alert: AlertTriangle, wallet: Wallet,
}
const Icon = ({ name, size = 22, className = '' }: { name: string; size?: number; className?: string }) => { const C = ICONS[name] ?? Sparkles; return <C size={size} className={className} /> }

type View = 'picker' | 'chat' | 'library'

export function AskButton() {
  const { data: session } = useSession()
  const token = session?.accessToken
  const isAdmin = (session?.user as any)?.role === 'admin'
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!token || !isAdmin) return
    let live = true
    ask.meta(token).then(m => { if (live) setEnabled(!!m.enabled) }).catch(() => { if (live) setEnabled(false) })   // a 404 means not in the pilot: nothing shows
    return () => { live = false }
  }, [token, isAdmin])
  useEffect(() => {
    const on = () => setOpen(true)
    window.addEventListener(OPEN_ASK_EVENT, on)
    return () => window.removeEventListener(OPEN_ASK_EVENT, on)
  }, [])
  if (!enabled || !token) return null
  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ask CareStream" title="Ask CareStream"
        className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/5 px-3 py-1.5 text-sm font-semibold text-teal hover:bg-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
        <Sparkles size={16} aria-hidden="true" /> <span className="hidden sm:inline">Ask CareStream</span>
      </button>
      {open && <AskOverlay token={token} onClose={() => { setOpen(false); btn.current?.focus() }} />}
    </>
  )
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

export function AskOverlay({ token, onClose }: { token: string; onClose: () => void }) {
  const [view, setView] = useState<View>('picker')
  const [agents, setAgents] = useState<AskAgent[] | null>(null)
  const [ready, setReady] = useState(true)
  const [agent, setAgent] = useState<AskAgent | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lib, setLib] = useState<{ tab: 'chats' | 'docs'; chats: AskConversation[] | null; docs: AskDocument[] | null }>({ tab: 'chats', chats: null, docs: null })
  const [docId, setDocId] = useState<string | null>(null)
  const [docFilter, setDocFilter] = useState<'all' | 'waiting'>('all')
  const dlg = useRef<HTMLDivElement>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { ask.meta(token).then(m => { setAgents(m.agents); setReady(m.ready) }).catch(e => setError(e.message)) }, [token])
  useEffect(() => { dlg.current?.focus() }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); if (docId) setDocId(null); else onClose(); return }
      if (e.key !== 'Tab' || !dlg.current) return
      const f = Array.from(dlg.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea, input, [tabindex]:not([tabindex="-1"])')).filter(x => x.offsetParent !== null)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [onClose, docId])

  const pick = (a: AskAgent) => { if (a.status === 'soon') return; setAgent(a); setConvId(null); setMessages([]); setError(''); setText(''); setView('chat') }
  async function send(q?: string) {
    const msg = (q ?? text).trim()
    if (!msg || !agent || busy || agent.status !== 'ready') return
    setBusy(true); setError(''); setText('')
    setMessages(m => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: msg }])
    try {
      const r = await ask.chat(token, { agent_id: agent.id, conversation_id: convId, message: msg })
      setConvId(r.conversation_id); setMessages(m => [...m, r.message])
    } catch (e) { setError(e instanceof AskError ? e.message : 'Something went wrong. Please try again.') } finally { setBusy(false) }
  }
  const loadLib = useCallback(async () => {
    try { const [c, d] = await Promise.all([ask.conversations(token), ask.documents(token)]); setLib(l => ({ ...l, chats: c.conversations, docs: d.documents })) } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the library.') }
  }, [token])
  useEffect(() => { if (view === 'library') loadLib() }, [view, loadLib])
  async function openChat(c: AskConversation) {
    const a = agents?.find(x => x.id === c.agent_id); if (!a) return
    try { const r = await ask.conversation(token, c.id); setAgent(a); setConvId(c.id); setMessages(r.messages); setError(''); setView('chat') } catch (e) { setError(e instanceof Error ? e.message : 'Could not open that chat.') }
  }
  async function renameChat(c: AskConversation) { const t = window.prompt('Name this chat', c.title); if (t && t.trim()) { await ask.rename(token, c.id, t.trim()).catch(() => undefined); loadLib() } }
  async function removeChat(c: AskConversation) { if (window.confirm('Delete this chat and its answers? This cannot be undone.')) { await ask.remove(token, c.id).catch(() => undefined); loadLib() } }
  function openDoc(d: AskDocument) { setDocId(d.id) }
  async function removeDoc(d: AskDocument) { if (window.confirm('Delete this saved item? This cannot be undone.')) { await ask.removeDocument(token, d.id).catch(() => undefined); setDocId(null); loadLib() } }

  const grouped = useMemo(() => agents ?? [], [agents])
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-2 sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ask-title" className="flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none sm:w-[90vw]">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {view !== 'picker' && <button type="button" onClick={() => setView('picker')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-mid hover:bg-neutral-light" aria-label="Back to the agents"><ArrowLeft size={16} /> Agents</button>}
            <Sparkles size={20} className="shrink-0 text-teal" aria-hidden="true" />
            <h2 id="ask-title" className="truncate text-lg font-bold text-neutral-dark">{view === 'chat' && agent ? `Ask CareStream: ${agent.name}` : view === 'library' ? 'Your library' : 'Ask CareStream'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setView(view === 'library' ? 'picker' : 'library')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"><Library size={15} aria-hidden="true" /> Library</button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={20} /></button>
          </div>
        </header>

        {!ready && <p className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900">Saving chats is not switched on yet, so questions cannot be answered until it is.</p>}

        {view === 'picker' && (
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <p className="mb-4 max-w-3xl text-sm text-neutral-mid">Choose an agent, then ask it anything about that part of your service. It reads your CareStream records and official figures, shows its working and where each figure comes from, and never sends or changes anything without you.</p>
            {!agents ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p> : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto max-w-3xl space-y-5">
                {agent.status === 'shell' ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm leading-relaxed text-sky-900"><p className="font-semibold">{agent.name} is coming next</p><p className="mt-1">{agent.shell_message}</p></div>
                ) : messages.length === 0 && (
                  <div>
                    <p className="text-sm text-neutral-mid">{agent.blurb} Try one of these, or ask your own question.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {agent.starters.map(s => <button key={s} type="button" onClick={() => send(s)} disabled={busy} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-neutral-dark hover:border-teal hover:bg-teal/5 disabled:opacity-60">{s}</button>)}
                    </div>
                  </div>
                )}
                {messages.map(m => m.role === 'user' ? (
                  <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-teal px-4 py-2.5 text-[15px] text-white">{m.content}</div>
                ) : (
                  <div key={m.id} className="max-w-full rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <MarkdownLite text={agent.id === 'notifications' ? withoutDraftBlock(m.content) : m.content} />
                    {agent.id === 'notifications' && parseNotificationDraft(m.content) && (() => { const d = parseNotificationDraft(m.content)!; return <div className="mt-3 rounded-lg border border-teal/30 bg-teal/5 p-3 text-sm"><p className="font-semibold text-neutral-dark">{d.title}</p><p className="mt-1 whitespace-pre-line text-neutral-dark">{d.body}</p></div> })()}
                    <SourcesFooter sources={m.sources ?? []} />
                    <AnswerActions m={m} token={token} agentId={agent.id} />
                  </div>
                ))}
                {busy && <p className="flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Working it out from your records</p>}
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <div ref={end} />
              </div>
            </div>
            {agent.status === 'ready' && (
              <form className="border-t border-gray-200 bg-neutral-light/50 px-4 py-3 sm:px-6" onSubmit={e => { e.preventDefault(); send() }}>
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <label htmlFor="ask-input" className="sr-only">Your question</label>
                  <textarea id="ask-input" rows={2} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={`Ask the ${agent.name} agent...`} maxLength={2000} className="min-h-[52px] flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
                  <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-[52px] items-center gap-1.5 rounded-xl bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><Send size={16} aria-hidden="true" /> Ask</button>
                </div>
                <p className="mx-auto mt-1.5 max-w-3xl text-[11px] text-neutral-mid">Answers come from your CareStream records and official figures. Check anything important. Pay and funding figures are for administrators only.</p>
              </form>
            )}
          </div>
        )}

        {view === 'library' && (
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
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
                    <button type="button" onClick={() => openDoc(d)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold text-neutral-dark">{d.title}</span><span className="text-xs text-neutral-mid">{d.type === 'letter' ? 'Letter' : d.type === 'newsletter' ? 'Staff newsletter' : 'Saved answer'}{d.staff_name ? `, for ${d.staff_name}` : ''} · <span className={d.status === 'pending' ? 'font-semibold text-amber-800' : d.status === 'approved' ? 'font-semibold text-green-700' : ''}>{d.status === 'pending' ? 'Waiting for approval' : d.status === 'approved' ? 'Approved' : d.status === 'shared' ? 'Shared' : 'Draft'}</span> · {timeAgo(d.updated_at)}{d.mine === false ? ' · written by a colleague' : ''}</span></button>
                    {(d.mine !== false) && (d.type === 'answer' || d.status === 'draft') && <button type="button" onClick={() => removeDoc(d)} aria-label={`Delete ${d.title}`} className="rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-700"><Trash2 size={14} /></button>}
                  </li>))}</ul></>
              )}
            </div>
          </div>
        )}

        {docId && <DocumentPanel token={token} id={docId} onClose={() => setDocId(null)} onChanged={loadLib} />}
      </div>
    </div>
  )
}
