'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import './website-chat.css'

// The AI chat on the marketing site.
//
// It answers from the public website only (the API retrieves from the site's own pages and cites
// them), and a person from CareStream can take a conversation over from the platform AI Chat tab,
// which is why the open panel keeps checking for new messages.
//
// Deliberately text only: no voice input.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** Checkout and sign-up steps keep the visitor's attention on the form. */
const HIDDEN = [/^\/basket\b/, /^\/care-policies\/checkout\b/, /^\/register\b/]

const POLL_MS = 5000
const K_VISITOR = 'cs_chat_visitor'
const K_STATE = 'cs_chat_state'

interface Source { url: string; title: string }
interface Msg {
  id: string
  role: 'visitor' | 'ai' | 'agent' | 'system'
  content: string
  sources?: Source[]
  created_at?: string
  feedback?: number | null
  pending?: boolean
}
interface Config {
  enabled: boolean
  assistant_name: string
  avatar_url: string | null
  greeting: string
  questions: string[]
  agent_online: boolean
  agent_name: string
}

function storage(key: string, value?: unknown) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null')
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* private windows and blocked storage */ }
  return null
}

function visitorId(): string {
  let id = storage(K_VISITOR) as string | null
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '')
    storage(K_VISITOR, id)
  }
  return id
}

/** Paragraphs, "- " lists and links: all the formatting the assistant is asked to use. */
function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  // No lookbehind in these patterns: older Safari cannot parse it, and a regex that fails to parse
  // takes the whole page's script down with it.
  const inline = (s: string, k: number) => {
    const parts = s.split(/(https?:\/\/[^\s)]+|\*\*[^*]+\*\*|(?:^|[\s(])\/[a-z0-9][a-z0-9/-]*)/gi)
    return parts.map((p, i) => {
      const key = `${k}-${i}`
      if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={key}>{p.slice(2, -2)}</b>
      const lead = p.match(/^[\s(]/)?.[0] ?? ''
      const link = p.slice(lead.length).replace(/[.,;:!?]+$/, '')
      const trail = p.slice(lead.length + link.length)
      if (/^https?:\/\//.test(link) || /^\/[a-z0-9]/i.test(link)) {
        const internal = link.startsWith('/') || link.includes('carestreamai.com')
        return (
          <span key={key}>{lead}<a href={link} {...(internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
            {link.replace(/^https?:\/\/(www\.)?carestreamai\.com/, '') || link}</a>{trail}</span>
        )
      }
      return <span key={key}>{p}</span>
    })
  }
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter(Boolean)
        if (lines.length && lines.every(l => /^[-•]\s/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-•]\s/, ''), j)}</li>)}</ul>
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l, j)}</span>)}</p>
      })}
    </>
  )
}

const Icon = {
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  expand: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>,
  shrink: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7" /></svg>,
  send: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  up: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.6 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7" /></svg>,
  down: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 13V4h3v9zM17 13l-4 7c-1.5 0-2.5-1-2.2-2.6l.6-3.4H5a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 6.2 4H17" /></svg>,
}

export function WebsiteChat() {
  const pathname = usePathname() || '/'
  const hidden = HIDDEN.some(r => r.test(pathname))

  const [config, setConfig] = useState<Config | null>(null)
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [status, setStatus] = useState<'ai' | 'human' | 'closed'>('ai')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [leadForm, setLeadForm] = useState(false)
  const [lead, setLead] = useState({ name: '', email: '', organisation: '', message: '' })
  const [agentOnline, setAgentOnline] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streaming = useRef(false)

  // Restore a conversation across page views.
  useEffect(() => {
    const saved = storage(K_STATE) as { conversationId?: string; open?: boolean } | null
    if (saved?.conversationId) setConversationId(saved.conversationId)
    if (saved?.open) setOpen(true)
  }, [])
  useEffect(() => { storage(K_STATE, { conversationId, open }) }, [conversationId, open])

  useEffect(() => {
    if (hidden) return
    let live = true
    fetch(`${API_URL}/public/chat/config?path=${encodeURIComponent(pathname)}`)
      .then(r => r.json()).then(b => { if (live && b?.data) { setConfig(b.data); setAgentOnline(!!b.data.agent_online) } })
      .catch(() => {})
    return () => { live = false }
  }, [pathname, hidden])

  const lastSeen = useRef<string>('')
  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return
    setMessages(prev => {
      const have = new Set(prev.map(m => m.id))
      const next = [...prev, ...incoming.filter(m => !have.has(m.id))]
      return next
    })
    const newest = incoming[incoming.length - 1]?.created_at
    if (newest && newest > lastSeen.current) lastSeen.current = newest
  }, [])

  const poll = useCallback(async (all = false) => {
    if (!conversationId || streaming.current) return
    try {
      const after = all ? '' : lastSeen.current
      const r = await fetch(`${API_URL}/public/chat/conversations/${conversationId}/messages?visitor_id=${visitorId()}${after ? `&after=${encodeURIComponent(after)}` : ''}`)
      if (r.status === 404) { setConversationId(null); setMessages([]); return }
      const b = await r.json()
      if (!b?.data) return
      setStatus(b.data.status)
      setAgentOnline(!!b.data.agent_online)
      merge(b.data.messages)
    } catch { /* offline for a moment */ }
  }, [conversationId, merge])

  // Load the history once, then keep checking while the panel is open.
  useEffect(() => { if (conversationId && messages.length === 0) poll(true) }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !conversationId) return
    const t = setInterval(() => poll(), POLL_MS)
    return () => clearInterval(t)
  }, [open, conversationId, poll])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, leadForm, open])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  async function ensureConversation(): Promise<string | null> {
    if (conversationId) return conversationId
    const r = await fetch(`${API_URL}/public/chat/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId(), path: pathname }),
    })
    const b = await r.json()
    const id = b?.data?.conversation_id ?? null
    if (id) setConversationId(id)
    return id
  }

  async function send(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setText(''); setError(''); setBusy(true)
    const tempVisitor: Msg = { id: `tmp-v-${Date.now()}`, role: 'visitor', content: q, pending: true }
    setMessages(prev => [...prev, tempVisitor])
    streaming.current = true
    try {
      const r = await fetch(`${API_URL}/public/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ visitor_id: visitorId(), conversation_id: conversationId, path: pathname, text: q }),
      })
      const type = r.headers.get('content-type') ?? ''
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error?.message ?? 'Sorry, something went wrong. Please try again.')
      }
      if (type.includes('application/json')) {
        // A person has the conversation: the message is stored, and their reply arrives by polling.
        const b = await r.json()
        setConversationId(b.data.conversation_id)
        setStatus('human')
        setMessages(prev => prev.map(m => (m.id === tempVisitor.id ? { ...b.data.message } : m)))
        if (b.data.message?.created_at > lastSeen.current) lastSeen.current = b.data.message.created_at
        return
      }
      const tempAi: Msg = { id: `tmp-a-${Date.now()}`, role: 'ai', content: '', pending: true }
      setMessages(prev => [...prev, tempAi])
      const reader = r.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const ev of events) {
          const line = ev.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'start') {
            setConversationId(data.conversation_id)
            setMessages(prev => prev.map(m => (m.id === tempVisitor.id ? { ...m, id: data.visitor_message_id, pending: false } : m)))
          } else if (data.type === 'delta') {
            setMessages(prev => prev.map(m => (m.id === tempAi.id ? { ...m, content: m.content + data.text } : m)))
          } else if (data.type === 'done') {
            setMessages(prev => prev.map(m => (m.id === tempAi.id ? { ...data.message } : m)))
            if (data.message?.created_at > lastSeen.current) lastSeen.current = data.message.created_at
          } else if (data.type === 'error') {
            setMessages(prev => prev.filter(m => m.id !== tempAi.id))
            setError(data.error)
          }
        }
      }
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempVisitor.id || !m.pending))
      setError(e instanceof Error ? e.message : 'Sorry, something went wrong. Please try again.')
      setText(q)
    } finally {
      streaming.current = false
      setBusy(false)
    }
  }

  async function feedback(m: Msg, value: 1 | -1) {
    setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, feedback: value } : x)))
    fetch(`${API_URL}/public/chat/messages/${m.id}/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId(), value }),
    }).catch(() => {})
  }

  async function talkToPerson() {
    setError('')
    try {
      const id = await ensureConversation()
      if (!id) throw new Error()
      const r = await fetch(`${API_URL}/public/chat/conversations/${id}/human`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId() }),
      })
      const b = await r.json()
      if (b?.data?.agent_online) { setAgentOnline(true); poll() }
      else setLeadForm(true)
    } catch {
      setLeadForm(true)
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const id = await ensureConversation().catch(() => null)
    if (!id) { setError('Sorry, that did not send. Please try again.'); return }
    const r = await fetch(`${API_URL}/public/chat/conversations/${id}/lead`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor_id: visitorId(), ...lead }),
    })
    const b = await r.json().catch(() => null)
    if (!r.ok) { setError(b?.error?.message ?? 'Please check your details and try again.'); return }
    setLeadForm(false)
    poll()
  }

  if (hidden || !config?.enabled) return null

  const name = config.assistant_name
  // An uploaded photo is stored as an API path; a pasted one is a full URL.
  const avatarSrc = config.avatar_url?.startsWith('/public/') ? `${API_URL}${config.avatar_url}` : config.avatar_url
  const person = status === 'human'
  const hasConversation = messages.some(m => m.role === 'visitor')
  const Avatar = ({ size }: { size: 'sm' | 'lg' }) => config.avatar_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className={`cschat-av ${size}`} src={avatarSrc!} alt="" />
    : <span className={`cschat-av ${size} blank`} aria-hidden="true">{name.slice(0, 1)}</span>

  return (
    <div className={`cschat${open ? ' open' : ''}${wide ? ' wide' : ''}`}>
      {!open && (
        <button type="button" className="cschat-launch" onClick={() => setOpen(true)} aria-label={`Ask ${name} a question`}>
          <Avatar size="sm" />
          <span>Ask {name}</span>
          {agentOnline && <i className="cschat-dot" aria-label="Team online" />}
        </button>
      )}

      {open && (
        <section className="cschat-panel" role="dialog" aria-label={`Chat with ${name}`}>
          <header className="cschat-head">
            <div className="cschat-tools">
              <button type="button" onClick={() => setWide(w => !w)} aria-label={wide ? 'Make the chat smaller' : 'Make the chat bigger'}>
                {wide ? Icon.shrink : Icon.expand}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close the chat">{Icon.close}</button>
            </div>
            <div className="cschat-who">
              <Avatar size="lg" />
              <div>
                <b>{person ? config.agent_name : name}</b>
                <span>{person ? 'CareStream team' : agentOnline ? `AI assistant · ${config.agent_name} is online` : 'AI assistant'}</span>
              </div>
            </div>
          </header>

          <div className="cschat-list" ref={listRef} aria-live="polite">
            <div className="cschat-msg ai"><Rich text={config.greeting} /></div>

            {!hasConversation && (
              <>
                <div className="cschat-actions">
                  <a className="cschat-pill" href="/demo">Book a demo</a>
                  <button type="button" className="cschat-pill" onClick={talkToPerson}>Talk to a person</button>
                </div>
                {config.questions.length > 0 && (
                  <div className="cschat-suggest">
                    {config.questions.map(q => (
                      <button type="button" key={q} onClick={() => send(q)} disabled={busy}>{q}</button>
                    ))}
                  </div>
                )}
              </>
            )}

            {messages.map(m => (
              m.role === 'system' ? (
                <p className="cschat-sys" key={m.id}>{m.content}</p>
              ) : (
                <div className={`cschat-msg ${m.role}`} key={m.id}>
                  {m.role === 'agent' && <span className="cschat-by">{config.agent_name} · CareStream</span>}
                  {m.content ? <Rich text={m.content} /> : <span className="cschat-typing" aria-label="Writing"><i /><i /><i /></span>}
                  {m.role === 'ai' && !m.pending && (
                    <>
                      {!!m.sources?.length && (
                        <div className="cschat-sources">
                          <span>From our site:</span>
                          {m.sources.map(s => <a key={s.url} href={s.url}>{s.title}</a>)}
                        </div>
                      )}
                      <div className="cschat-rate">
                        <button type="button" aria-label="Helpful" aria-pressed={m.feedback === 1} onClick={() => feedback(m, 1)}>{Icon.up}</button>
                        <button type="button" aria-label="Not helpful" aria-pressed={m.feedback === -1} onClick={() => feedback(m, -1)}>{Icon.down}</button>
                      </div>
                    </>
                  )}
                </div>
              )
            ))}

            {leadForm && (
              <form className="cschat-lead" onSubmit={submitLead}>
                <b>Nobody is online right now</b>
                <p>Leave your details and the team will reply by email.</p>
                <input required placeholder="Your name" autoComplete="name" value={lead.name} onChange={e => setLead({ ...lead, name: e.target.value })} />
                <input required type="email" placeholder="Work email" autoComplete="email" value={lead.email} onChange={e => setLead({ ...lead, email: e.target.value })} />
                <input placeholder="Organisation (optional)" autoComplete="organization" value={lead.organisation} onChange={e => setLead({ ...lead, organisation: e.target.value })} />
                <textarea placeholder="How can we help?" rows={3} value={lead.message} onChange={e => setLead({ ...lead, message: e.target.value })} />
                <div className="cschat-leadrow">
                  <button type="button" className="ghost" onClick={() => setLeadForm(false)}>Cancel</button>
                  <button type="submit">Send</button>
                </div>
              </form>
            )}

            {hasConversation && !person && !leadForm && (
              <div className="cschat-actions after">
                <button type="button" className="cschat-pill" onClick={talkToPerson}>Talk to a person</button>
                <a className="cschat-pill" href="/demo">Book a demo</a>
              </div>
            )}
          </div>

          {error && <p className="cschat-err" role="alert">{error}</p>}

          <form className="cschat-input" onSubmit={e => { e.preventDefault(); send(text) }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              maxLength={1000}
              placeholder={person ? `Message ${config.agent_name}` : `Ask ${name} a question`}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }}
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send">{Icon.send}</button>
          </form>
          <p className="cschat-consent">
            By continuing, you agree this conversation may be recorded and used in line with our{' '}
            <a href="/privacy" target="_blank">Privacy Policy</a>.
          </p>
        </section>
      )}
    </div>
  )
}
