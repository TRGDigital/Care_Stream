'use client'

// The live chat inbox: customers asking for help from CareStream's Help menu appear here and are answered by the team.
// The team is "online" only while someone has this page open, has pressed Go online, and it is inside working hours: the page tells the server
// every 30 seconds (a heartbeat). Messages left when nobody was online are listed too, and a reply to one of those is also emailed to the customer.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type LiveChatList, type LiveChatMessage, type LiveChatSummary } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Check, Copy, Loader2, MessagesSquare, Send, Volume2, VolumeX, XCircle } from 'lucide-react'

type Row = LiveChatList['chats'][number]
const FILTERS: Array<{ key: string; label: string }> = [{ key: '', label: 'Active' }, { key: 'live', label: 'Live' }, { key: 'offline', label: 'Messages' }, { key: 'closed', label: 'Closed' }]

const ls = {
  get: (k: string, d = '') => { try { return window.localStorage.getItem(k) ?? d } catch { return d } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* ignore */ } },
}
function when(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso), mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins} min`
  if (mins < 1440) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    const c = new Ctx(), o = c.createOscillator(), g = c.createGain()
    o.type = 'sine'; o.frequency.value = 660; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5)
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.5)
  } catch { /* no audio */ }
}

function Inbox() {
  const token = usePlatformAuth()
  const params = useSearchParams()
  const [filter, setFilter] = useState('')
  const [list, setList] = useState<LiveChatList | null>(null)
  const [selected, setSelected] = useState<string | null>(params?.get('chat') ?? null)
  const [chat, setChat] = useState<LiveChatSummary | null>(null)
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [online, setOnline] = useState(false)
  const [sound, setSound] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')
  const lastSeen = useRef<string | null>(null)
  const prevUnread = useRef(0)
  const bottom = useRef<HTMLDivElement>(null)
  const agentKey = useRef('')

  useEffect(() => {
    agentKey.current = ls.get('cs-agent-key') || (() => { const k = (crypto as any).randomUUID?.() ?? String(Math.random()).slice(2); ls.set('cs-agent-key', k); return k })()
    setAgentName(ls.get('cs-agent-name', 'CareStream support')); setSound(ls.get('cs-agent-sound') === '1')
  }, [])

  const client = useCallback(() => (token ? createPlatformClient(token) : null), [token])

  // The heartbeat: only while this page is visible and Go online is on. Going online or offline sends the choice itself.
  const beat = useCallback((flag?: boolean) => {
    const c = client(); if (!c) return
    c.liveChat.heartbeat(agentKey.current, ls.get('cs-agent-name', 'CareStream support'), flag).catch(() => undefined)
  }, [client])
  useEffect(() => {
    if (!token) return
    if (online) beat(true)
    const id = window.setInterval(() => { if (online) beat() }, 30_000)
    return () => window.clearInterval(id)
  }, [token, online, beat])
  useEffect(() => {
    const off = () => { if (online) { const c = client(); c?.liveChat.heartbeat(agentKey.current, ls.get('cs-agent-name', ''), false).catch(() => undefined) } }
    window.addEventListener('pagehide', off)
    return () => window.removeEventListener('pagehide', off)
  }, [online, client])

  // The list: every four seconds while visible.
  useEffect(() => {
    const c = client(); if (!c) return
    let live = true
    const tick = () => { if (document.visibilityState === 'hidden') return
      c.liveChat.list(filter || undefined).then(l => {
        if (!live) return
        setList(l)
        const unread = l.chats.reduce((n, r) => n + (r.unread > 0 ? 1 : 0), 0)
        if (unread > prevUnread.current && sound) beep()
        prevUnread.current = unread
        document.title = unread > 0 ? `(${unread}) Live chat` : 'Live chat'
      }).catch(() => undefined)
    }
    tick(); const id = window.setInterval(tick, 4000)
    return () => { live = false; window.clearInterval(id); document.title = 'Live chat' }
  }, [client, filter, sound])

  // The open conversation: every three seconds, only what is new.
  useEffect(() => {
    const c = client(); if (!c || !selected) { setChat(null); setMessages([]); return }
    let live = true; lastSeen.current = null; setMessages([]); setChat(null)
    const tick = (first = false) => c.liveChat.get(selected, first ? undefined : lastSeen.current ?? undefined).then(r => {
      if (!live) return
      setChat(r.chat)
      if (r.messages.length) { lastSeen.current = r.messages[r.messages.length - 1].created_at; setMessages(m => first ? r.messages : [...m, ...r.messages.filter(x => !m.some(y => y.id === x.id))]) }
    }).catch(() => undefined)
    tick(true); const id = window.setInterval(() => { if (document.visibilityState !== 'hidden') tick() }, 3000)
    return () => { live = false; window.clearInterval(id) }
  }, [client, selected])
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length, selected])

  async function toggle() {
    const next = !online; setOnline(next); beat(next)
    setNotice(next ? 'You are online. Customers will see that the team is here, during working hours.' : 'You are offline. Customers will be asked to leave a message.')
  }
  async function send() {
    const c = client(); if (!c || !selected || !draft.trim() || busy) return
    setBusy(true); setError('')
    try {
      ls.set('cs-agent-name', agentName || 'CareStream support')
      const r = await c.liveChat.reply(selected, draft.trim(), agentName || 'CareStream support')
      setMessages(m => [...m.filter(x => x.id !== r.message.id), r.message]); lastSeen.current = r.message.created_at; setDraft('')
      if (r.emailed) setNotice('Your reply was also emailed to the customer.')
    } catch (e: any) { setError(e?.message ?? 'Could not send.') } finally { setBusy(false) }
  }
  async function close() {
    const c = client(); if (!c || !selected) return
    setBusy(true)
    try { await c.liveChat.close(selected); const r = await c.liveChat.get(selected); setChat(r.chat); setMessages(r.messages) } catch (e: any) { setError(e?.message ?? 'Could not close.') } finally { setBusy(false) }
  }
  async function copyRef() { try { await navigator.clipboard.writeText(chat?.customer_reference ?? ''); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[480px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-gray-200 bg-white px-4 py-3">
        <MessagesSquare size={18} className="text-teal" aria-hidden="true" />
        <h1 className="text-lg font-bold text-neutral-dark">Live chat</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${list?.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-neutral-mid'}`}>{list?.online ? 'Customers see: online' : 'Customers see: away'}</span>
        <span className="text-xs text-neutral-mid">{list ? `Hours: ${list.hours_text}${list.in_hours ? '' : ' (closed now)'}` : ''}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-neutral-mid">Your name
            <input value={agentName} onChange={e => { setAgentName(e.target.value); ls.set('cs-agent-name', e.target.value) }} maxLength={40} className="w-32 rounded border border-gray-300 px-2 py-1 text-sm text-neutral-dark" />
          </label>
          <button type="button" onClick={() => { const n = !sound; setSound(n); ls.set('cs-agent-sound', n ? '1' : '0'); if (n) beep() }} className="rounded border border-gray-200 p-1.5 text-neutral-mid hover:bg-neutral-light" aria-label={sound ? 'Turn the sound off' : 'Turn the sound on'} title={sound ? 'Sound on' : 'Sound off'}>
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button type="button" onClick={toggle} className={`rounded-btn px-4 py-2 text-sm font-semibold ${online ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-teal text-white hover:bg-teal-dark'}`}>{online ? 'Online. Go offline' : 'Go online'}</button>
        </div>
      </div>
      {notice && <p role="status" className="rounded border border-teal/30 bg-teal/5 px-3 py-2 text-sm text-neutral-dark">{notice}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[320px_1fr]">
        <section className="flex min-h-0 flex-col rounded-card border border-gray-200 bg-white" aria-label="Conversations">
          <div className="flex gap-1 border-b border-gray-100 p-2">
            {FILTERS.map(f => <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold ${filter === f.key ? 'bg-teal text-white' : 'text-neutral-mid hover:bg-neutral-light'}`}>{f.label}</button>)}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {!list && <li className="flex items-center justify-center p-6 text-neutral-mid"><Loader2 size={16} className="animate-spin" /></li>}
            {list && list.chats.length === 0 && <li className="p-6 text-center text-sm text-neutral-mid">Nothing here yet.</li>}
            {list?.chats.map((r: Row) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelected(r.id)} className={`flex w-full items-start gap-2 border-b border-gray-50 px-3 py-3 text-left hover:bg-neutral-light ${selected === r.id ? 'bg-teal/5' : ''}`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-neutral-dark">{r.home_name || r.customer_name || 'Customer'}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${r.mode === 'live' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.mode === 'live' ? 'LIVE' : 'MESSAGE'}</span></span>
                    <span className="block truncate text-xs text-neutral-mid">{r.customer_name} {r.customer_reference ? `· ${r.customer_reference}` : ''}{r.status === 'answered' ? ' · answered' : r.status === 'closed' ? ' · closed' : ''}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1"><span className="text-[11px] text-neutral-mid">{when(r.last_message_at)}</span>
                    {r.unread > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{r.unread}</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col rounded-card border border-gray-200 bg-white" aria-label="Conversation">
          {!selected || !chat ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-neutral-mid">{selected ? <Loader2 size={18} className="animate-spin" /> : 'Choose a conversation on the left.'}</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-dark">{chat.customer_name || 'Customer'} <span className="font-normal text-neutral-mid">at {chat.home_name || 'unknown home'}</span></p>
                  <p className="text-xs text-neutral-mid">{chat.plan ? `${chat.plan} plan · ` : ''}{chat.customer_email}</p>
                </div>
                <button type="button" onClick={copyRef} className="inline-flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1 text-xs font-semibold text-neutral-dark hover:bg-neutral-light" title="Copy the customer reference">
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} {chat.customer_reference || 'No reference'}
                </button>
                <button type="button" onClick={close} disabled={busy || chat.status === 'closed'} className="ml-auto inline-flex items-center gap-1.5 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-neutral-dark hover:bg-neutral-light disabled:opacity-40"><XCircle size={13} /> {chat.status === 'closed' ? 'Closed' : 'Close chat'}</button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-neutral-light/50 px-4 py-4" role="log" aria-live="polite">
                {messages.map(m => m.sender === 'system'
                  ? <p key={m.id} className="text-center text-xs text-neutral-mid">{m.body}</p>
                  : (
                    <div key={m.id} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.sender === 'agent' ? 'bg-teal text-white' : 'border border-gray-200 bg-white text-neutral-dark'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${m.sender === 'agent' ? 'text-white/70' : 'text-neutral-mid'}`}>{m.sender === 'agent' ? m.sender_name : (m.sender_name || 'Customer')} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                <div ref={bottom} />
              </div>
              <div className="border-t border-gray-100 p-3">
                {chat.mode === 'offline' && chat.status !== 'closed' && <p className="mb-2 text-xs text-neutral-mid">This customer left a message. Your reply is also emailed to {chat.customer_email || 'them'}.</p>}
                {error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={4000} disabled={chat.status === 'closed'} placeholder={chat.status === 'closed' ? 'This chat is closed.' : 'Type your reply. Enter sends, Shift and Enter adds a line.'}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
                    className="min-h-[52px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20" aria-label="Your reply" />
                  <button type="button" onClick={send} disabled={busy || !draft.trim() || chat.status === 'closed'} className="inline-flex h-[52px] items-center gap-2 rounded-lg bg-teal px-5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-40">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function LiveChatPage() {
  return <PlatformShell><Suspense fallback={null}><Inbox /></Suspense></PlatformShell>
}
