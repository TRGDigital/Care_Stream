'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { platformAssetUrl, uploadBlogImage } from '@/lib/platform-api'
import {
  AlertCircle, Bot, CheckCircle2, CircleHelp, Loader2, MessageSquare, RefreshCw, Send, ThumbsDown, ThumbsUp,
  UserCheck, UserRound, Users, Zap,
} from 'lucide-react'

// The website AI chat, from the platform side: live conversations (and taking one over), how the
// assistant is performing, the questions the site could not answer, what is in its index, and how
// it presents itself. Its answering instructions are edited in AI Prompts ("Website AI Chat").

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const ONLINE_KEY = 'cs_ai_chat_online'

type Tab = 'chats' | 'performance' | 'unanswered' | 'index' | 'settings'

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/admin/ai-chat${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) throw new Error(body?.error?.message ?? `API error ${res.status}`)
  return body.data as T
}

const when = (d: string) => {
  const t = new Date(d)
  const mins = Math.round((Date.now() - t.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return t.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const pct = (n: number | null) => (n === null ? 'n/a' : `${Math.round(n * 100)}%`)

interface Conversation {
  id: string; status: string; wants_human: boolean; started_path: string | null; last_path: string | null
  visitor_name: string | null; visitor_email: string | null; message_count: number; unanswered: number
  thumbs_up: number; thumbs_down: number; last_message_at: string; created_at: string; first_question: string | null
  lead_id: string | null
}
interface Message {
  id: string; role: string; content: string; sources: { url: string; title: string }[]; grounded: boolean | null
  feedback: number | null; path: string | null; created_at: string; latency_ms: number | null
}

function Stat({ label, value, sub, Icon }: { label: string; value: string; sub?: string; Icon: any }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-mid"><Icon size={14} className="text-teal" /> {label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-dark">{value}</div>
      {sub && <div className="text-xs text-neutral-mid">{sub}</div>}
    </div>
  )
}

// ── Conversations and live takeover ─────────────────────────────────────────

function Chats({ token, focusId }: { token: string; focusId: string | null }) {
  const [filter, setFilter] = useState<'live' | 'attention' | 'all'>(focusId ? 'all' : 'live')
  const [rows, setRows] = useState<Conversation[]>([])
  const [openId, setOpenId] = useState<string | null>(focusId)
  const [conv, setConv] = useState<(Conversation & { messages: Message[] }) | null>(null)
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const loadList = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[] }>(token, `/conversations?filter=${filter}&limit=60`)
      setRows(d.conversations)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, [token, filter])

  const loadConv = useCallback(async (id: string) => {
    try {
      const d = await api<{ conversation: Conversation & { messages: Message[] } }>(token, `/conversations/${id}`)
      setConv(d.conversation)
    } catch (e: any) { setError(e.message) }
  }, [token])

  useEffect(() => { setLoading(true); loadList() }, [loadList])
  useEffect(() => {
    const t = setInterval(() => { loadList(); if (openId) loadConv(openId) }, 4000)
    return () => clearInterval(t)
  }, [loadList, loadConv, openId])
  useEffect(() => { if (openId) loadConv(openId); else setConv(null) }, [openId, loadConv])
  const count = conv?.messages.length ?? 0
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [count])

  async function act(path: string, body?: unknown) {
    if (!conv) return
    setError('')
    try {
      await api(token, `/conversations/${conv.id}${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) })
      await loadConv(conv.id)
      loadList()
    } catch (e: any) { setError(e.message) }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    const text = reply.trim()
    if (!text) return
    setReply('')
    await act('/messages', { text })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex gap-1 border-b border-gray-100 p-2">
          {([['live', 'Live now'], ['attention', 'Needs attention'], ['all', 'All']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === k ? 'bg-teal text-white' : 'text-neutral-mid hover:bg-neutral-light'}`}>{l}</button>
          ))}
        </div>
        {loading && <p className="flex items-center gap-2 p-4 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="p-4 text-sm text-neutral-mid">{filter === 'live' ? 'Nobody is chatting in the last 15 minutes.' : 'No conversations yet.'}</p>
        )}
        <ul className="max-h-[70vh] overflow-y-auto">
          {rows.map(r => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpenId(r.id)}
                className={`block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-neutral-light ${openId === r.id ? 'bg-neutral-light' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-dark">{r.visitor_name ?? r.first_question ?? 'New conversation'}</span>
                  <span className="shrink-0 text-xs text-neutral-mid">{when(r.last_message_at)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
                  <span className="truncate">{r.last_path ?? r.started_path ?? '/'}</span>
                  {r.status === 'human' && <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">You</span>}
                  {r.wants_human && r.status !== 'human' && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Wants a person</span>}
                  {r.unanswered > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5">{r.unanswered} unanswered</span>}
                  {r.thumbs_down > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">{r.thumbs_down} 👎</span>}
                  {r.lead_id && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-teal">Lead</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-[60vh] flex-col rounded-xl border border-gray-200 bg-white">
        {!conv && <p className="m-auto p-6 text-sm text-neutral-mid">Choose a conversation to read it, or to join it.</p>}
        {conv && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-dark">
                  {conv.visitor_name ? `${conv.visitor_name}${conv.visitor_email ? ` · ${conv.visitor_email}` : ''}` : 'Anonymous visitor'}
                </p>
                <p className="text-xs text-neutral-mid">Started on {conv.started_path ?? '/'} · {when(conv.created_at)} · now on {conv.last_path ?? '/'}</p>
              </div>
              {conv.status === 'human' ? (
                <button type="button" onClick={() => act('/handback')} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-light">
                  <Bot size={14} /> Hand back to the AI
                </button>
              ) : (
                <button type="button" onClick={() => act('/takeover')} className="flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                  <UserCheck size={14} /> Take over this chat
                </button>
              )}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
              {conv.messages.map(m => (
                m.role === 'system'
                  ? <p key={m.id} className="text-center text-xs text-neutral-mid">{m.content}</p>
                  : (
                    <div key={m.id} className={`flex ${m.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'visitor' ? 'bg-neutral-dark text-white' : m.role === 'agent' ? 'bg-green-50 text-neutral-dark ring-1 ring-green-100' : 'bg-neutral-light text-neutral-dark'}`}>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                          {m.role === 'visitor' ? 'Visitor' : m.role === 'agent' ? 'You' : 'AI'} · {when(m.created_at)}{m.path && m.role === 'visitor' ? ` · ${m.path}` : ''}
                        </p>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {m.role === 'ai' && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {m.grounded === false && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Not on the site</span>}
                            {m.feedback === 1 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Helpful</span>}
                            {m.feedback === -1 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">Not helpful</span>}
                            {(m.sources ?? []).map(s => (
                              <Link key={s.url} href={s.url} target="_blank" className="rounded-full bg-white px-2 py-0.5 text-teal ring-1 ring-gray-200">{s.title}</Link>
                            ))}
                            {m.latency_ms !== null && <span className="text-neutral-mid">{(m.latency_ms / 1000).toFixed(1)}s</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
              ))}
              <div ref={endRef} />
            </div>
            <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-gray-100 p-3">
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }}
                placeholder={conv.status === 'human' ? 'Reply to the visitor' : 'Type to take over and reply (the AI stops answering)'}
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              <button type="submit" disabled={!reply.trim()} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                <Send size={14} /> Send
              </button>
            </form>
          </>
        )}
        {error && <p className="m-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  )
}

// ── Performance ─────────────────────────────────────────────────────────────

interface Overview {
  days: number; conversations: number; questions: number; ai_replies: number; answered_rate: number | null
  unanswered: number; thumbs_up: number; thumbs_down: number; wanted_person: number; taken_over: number; leads: number
  median_latency_ms: number | null; by_day: { day: string; conversations: number }[]; top_pages: { path: string; n: number }[]
  index: Record<string, number>
}

function Performance({ token }: { token: string }) {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setD(null)
    api<Overview>(token, `/overview?days=${days}`).then(setD).catch(e => setError(e.message))
  }, [token, days])
  const max = Math.max(1, ...(d?.by_day ?? []).map(x => x.conversations))
  return (
    <div className="space-y-5">
      <div className="flex gap-1">
        {[7, 30, 90].map(n => (
          <button key={n} type="button" onClick={() => setDays(n)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${days === n ? 'bg-teal text-white' : 'border border-gray-200 bg-white text-neutral-mid'}`}>Last {n} days</button>
        ))}
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!d && !error && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Conversations" value={String(d.conversations)} sub={`${d.questions} questions asked`} Icon={MessageSquare} />
            <Stat label="Answered from the site" value={pct(d.answered_rate)} sub={`${d.unanswered} not on the site`} Icon={CheckCircle2} />
            <Stat label="Helpful / not" value={`${d.thumbs_up} / ${d.thumbs_down}`} sub={d.thumbs_up + d.thumbs_down ? `${Math.round(d.thumbs_up / (d.thumbs_up + d.thumbs_down) * 100)}% helpful` : 'No ratings yet'} Icon={ThumbsUp} />
            <Stat label="Leads from chat" value={String(d.leads)} sub={`${d.wanted_person} asked for a person · ${d.taken_over} taken over`} Icon={Users} />
            <Stat label="Median reply time" value={d.median_latency_ms === null ? 'n/a' : `${(d.median_latency_ms / 1000).toFixed(1)}s`} Icon={Zap} />
            <Stat label="Pages indexed" value={String(d.index.indexed ?? 0)} sub={`${d.index.error ?? 0} errors · ${d.index.pending ?? 0} waiting`} Icon={RefreshCw} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Conversations per day</p>
            {d.by_day.length === 0 ? <p className="text-sm text-neutral-mid">No conversations in this period.</p> : (
              <div className="flex h-32 items-end gap-1">
                {d.by_day.map(x => (
                  <div key={x.day} className="flex-1" title={`${x.day}: ${x.conversations}`}>
                    <div className="rounded-t bg-teal" style={{ height: `${Math.max(4, (x.conversations / max) * 120)}px` }} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Where chats start</p>
            {d.top_pages.length === 0 ? <p className="text-sm text-neutral-mid">No conversations yet.</p> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {d.top_pages.map(p => (
                  <li key={p.path} className="flex justify-between py-2"><Link href={p.path} target="_blank" className="text-teal">{p.path}</Link><span>{p.n}</span></li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Unanswered questions ────────────────────────────────────────────────────

function Unanswered({ token, onOpen }: { token: string; onOpen: (id: string) => void }) {
  const [items, setItems] = useState<{ conversation_id: string; question: string; answer: string; path: string | null; reason: string; created_at: string }[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api<{ items: any[] }>(token, '/unanswered?days=90').then(d => setItems(d.items)).catch(e => setError(e.message))
  }, [token])
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-mid">
        Questions the website could not answer, and answers visitors marked as not helpful, from the last 90 days. Each one
        is a gap in the site&apos;s content: once a page covers it and is published, the chat picks it up automatically.
      </p>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!items && !error && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
      {items?.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-neutral-mid">Nothing yet.</p>}
      {items?.map((it, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-neutral-dark">{it.question || '(no question)'}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${it.reason === 'thumbs_down' ? 'bg-red-50 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
              {it.reason === 'thumbs_down' ? <><ThumbsDown size={11} className="mr-1 inline" />Not helpful</> : <><CircleHelp size={11} className="mr-1 inline" />Not on the site</>}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-mid">{when(it.created_at)}{it.path ? ` · asked on ${it.path}` : ''}</p>
          <p className="mt-2 line-clamp-3 text-sm text-neutral-mid">{it.answer}</p>
          <button type="button" onClick={() => onOpen(it.conversation_id)} className="mt-2 text-sm font-semibold text-teal">Read the conversation</button>
        </div>
      ))}
    </div>
  )
}

// ── Knowledge index ─────────────────────────────────────────────────────────

interface IndexPage { path: string; title: string | null; section: string | null; chunk_count: number; status: string; error: string | null; indexed_at: string | null; queued_at: string | null }

function IndexTab({ token }: { token: string }) {
  const [pages, setPages] = useState<IndexPage[] | null>(null)
  const [running, setRunning] = useState<string>('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const load = useCallback(() => api<{ pages: IndexPage[] }>(token, '/index').then(d => setPages(d.pages)).catch(e => setError(e.message)), [token])
  useEffect(() => {
    // Anything queued by a recent publish is processed when the tab opens.
    api(token, '/index/queue', { method: 'POST' }).catch(() => {}).finally(load)
  }, [token, load])

  async function sync(force: boolean) {
    setError('')
    let offset = 0
    let total = 0
    try {
      for (;;) {
        setRunning(total ? `Reading pages ${offset} of ${total}…` : 'Reading the sitemap…')
        const d = await api<{ total: number; next: number | null }>(token, '/index/sync', { method: 'POST', body: JSON.stringify({ offset, limit: 20, force }) })
        total = d.total
        if (d.next === null) break
        offset = d.next
      }
      setRunning('')
      load()
    } catch (e: any) {
      setRunning(''); setError(e.message); load()
    }
  }

  async function reindex(path: string) {
    setRunning(`Re-reading ${path}…`)
    try { await api(token, '/index/page', { method: 'POST', body: JSON.stringify({ path }) }) } catch (e: any) { setError(e.message) }
    setRunning(''); load()
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of pages ?? []) c[p.status] = (c[p.status] ?? 0) + 1
    return c
  }, [pages])
  const shown = (pages ?? []).filter(p => !filter || p.path.includes(filter) || (p.title ?? '').toLowerCase().includes(filter.toLowerCase()))
  const chunks = (pages ?? []).reduce((n, p) => n + (p.status === 'indexed' ? p.chunk_count : 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-neutral-light/40 p-4">
        <p className="max-w-3xl text-sm text-neutral-mid">
          The chat answers only from these pages, read from the live site through its sitemap. Publishing a page, post or
          feature in the console queues it to be re-read about 90 seconds later, once the change is live. <b>Check for
          changes</b> re-reads every page and only updates the ones whose text has changed. The basket, checkout, register
          and buy pages are left out on purpose.
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={!!running} onClick={() => sync(false)} className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw size={14} className={running ? 'animate-spin' : ''} /> Check for changes
          </button>
          <button type="button" disabled={!!running} onClick={() => sync(true)} className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50">
            Re-index everything
          </button>
        </div>
      </div>
      {running && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> {running}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span><b>{counts.indexed ?? 0}</b> pages indexed ({chunks} passages)</span>
        <span className="text-neutral-mid">{counts.pending ?? 0} waiting · {counts.error ?? 0} errors · {counts.removed ?? 0} removed</span>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by path or title"
          className="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal focus:outline-none" />
      </div>
      {!pages && !error && <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading…</p>}
      {pages?.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-neutral-mid">Nothing indexed yet. Press <b>Check for changes</b> to read the whole site for the first time.</p>}
      {!!shown.length && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-neutral-mid">
              <th className="px-4 py-2.5 font-medium">Page</th><th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Passages</th><th className="px-4 py-2.5 font-medium">Indexed</th><th />
            </tr></thead>
            <tbody>
              {shown.map(p => (
                <tr key={p.path} className="border-b border-gray-50">
                  <td className="px-4 py-2"><Link href={p.path} target="_blank" className="font-medium text-neutral-dark hover:text-teal">{p.path}</Link>
                    {p.title && <span className="block truncate text-xs text-neutral-mid">{p.title}</span>}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'indexed' ? 'bg-green-100 text-green-800' : p.status === 'error' ? 'bg-red-50 text-red-700' : p.status === 'removed' ? 'bg-gray-100 text-neutral-mid' : 'bg-amber-100 text-amber-800'}`}>{p.queued_at ? 'queued' : p.status}</span>
                    {p.error && <span className="block text-xs text-neutral-mid">{p.error}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{p.chunk_count}</td>
                  <td className="px-4 py-2 text-xs text-neutral-mid">{p.indexed_at ? when(p.indexed_at) : 'never'}</td>
                  <td className="px-4 py-2 text-right"><button type="button" disabled={!!running} onClick={() => reindex(p.path)} className="text-xs font-semibold text-teal disabled:opacity-40">Re-read</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Settings ────────────────────────────────────────────────────────────────

interface Settings { enabled: boolean; assistant_name: string; avatar_url: string | null; greeting: string; agent_name: string; suggested: { prefix: string; questions: string[] }[] }

function SettingsTab({ token }: { token: string }) {
  const [s, setS] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api<{ settings: Settings }>(token, '/settings').then(d => setS({ ...d.settings, suggested: d.settings.suggested ?? [] })).catch(e => setError(e.message)) }, [token])
  if (!s) return error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading…</p>

  const save = async () => {
    setSaving(true); setNote(''); setError('')
    try {
      const clean = { ...s, suggested: s.suggested.map(g => ({ prefix: g.prefix.trim() || '/', questions: g.questions.map(q => q.trim()).filter(Boolean).slice(0, 4) })) }
      const d = await api<{ settings: Settings }>(token, '/settings', { method: 'PUT', body: JSON.stringify(clean) })
      setS({ ...d.settings, suggested: d.settings.suggested ?? [] }); setNote('Saved. The website picks it up on the next page load.')
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const upload = async (file: File) => {
    try { const url = await uploadBlogImage(token, file); setS({ ...s, avatar_url: platformAssetUrl(url) ?? url }) } catch (e: any) { setError(e.message) }
  }
  const avatar = s.avatar_url ? (platformAssetUrl(s.avatar_url) ?? s.avatar_url) : null
  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:outline-none'

  return (
    <div className="max-w-3xl space-y-5">
      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <input type="checkbox" checked={s.enabled} onChange={e => setS({ ...s, enabled: e.target.checked })} className="h-4 w-4 accent-teal" />
        <span><b className="text-sm text-neutral-dark">Show the chat on the website</b>
          <span className="block text-xs text-neutral-mid">Every marketing page except the basket, checkout and register pages.</span></span>
      </label>

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-[120px_1fr]">
        <div>
          {avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-neutral-light" />
            : <div className="grid h-24 w-24 place-items-center rounded-full bg-neutral-light text-neutral-mid"><UserRound size={32} /></div>}
          <label className="mt-2 block cursor-pointer text-xs font-semibold text-teal">
            Upload photo<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {avatar && <button type="button" onClick={() => setS({ ...s, avatar_url: null })} className="mt-1 block text-xs text-neutral-mid">Remove</button>}
        </div>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Assistant name</label>
            <input className={field} value={s.assistant_name} onChange={e => setS({ ...s, assistant_name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Opening message</label>
            <textarea className={field} rows={3} value={s.greeting} onChange={e => setS({ ...s, greeting: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Your name, shown when you join a chat</label>
            <input className={field} value={s.agent_name} onChange={e => setS({ ...s, agent_name: e.target.value })} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-neutral-dark">Suggested questions</p>
        <p className="mb-3 text-xs text-neutral-mid">Up to four per page group. A group applies to every page whose address starts with it; the longest match wins, and <code>/</code> covers everything else.</p>
        <div className="space-y-3">
          {s.suggested.map((g, i) => (
            <div key={i} className="rounded-lg border border-gray-100 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input className={`${field} max-w-xs`} value={g.prefix} placeholder="/pricing" onChange={e => {
                  const next = [...s.suggested]; next[i] = { ...g, prefix: e.target.value }; setS({ ...s, suggested: next })
                }} />
                <button type="button" onClick={() => setS({ ...s, suggested: s.suggested.filter((_, j) => j !== i) })} className="text-xs text-red-600">Remove group</button>
              </div>
              {[0, 1, 2, 3].map(j => (
                <input key={j} className={`${field} mb-1.5`} placeholder={`Question ${j + 1}`} value={g.questions[j] ?? ''} maxLength={120} onChange={e => {
                  const qs = [...g.questions]; qs[j] = e.target.value
                  const next = [...s.suggested]; next[i] = { ...g, questions: qs }; setS({ ...s, suggested: next })
                }} />
              ))}
            </div>
          ))}
          <button type="button" onClick={() => setS({ ...s, suggested: [...s.suggested, { prefix: s.suggested.length ? '/pricing' : '/', questions: [] }] })}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-light">Add a page group</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-md bg-teal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {note && <span className="text-sm text-green-700">{note}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
      <p className="text-sm text-neutral-mid">
        How the assistant answers (tone, length and what it must never claim) is edited in <Link href="/platform/prompts" className="font-semibold text-teal">AI Prompts</Link> under
        {' '}&ldquo;Website AI Chat&rdquo;.
      </p>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AiChatPage() {
  const token = usePlatformAuth()
  const [tab, setTab] = useState<Tab>('chats')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [online, setOnline] = useState(false)
  const [waiting, setWaiting] = useState(0)
  const [presenceError, setPresenceError] = useState('')

  useEffect(() => { try { setOnline(localStorage.getItem(ONLINE_KEY) === '1') } catch { /* ignore */ } }, [])

  // While "I'm online" is on, a heartbeat keeps the website showing that a person is available.
  // Closing the tab stops the heartbeat, and the website shows the team offline within 90 seconds.
  useEffect(() => {
    if (!token) return
    let live = true
    const beat = () => api<{ online: boolean; waiting: number }>(token, '/presence', { method: 'POST', body: JSON.stringify({ online }) })
      .then(d => { if (live) { setWaiting(d.waiting); setPresenceError('') } })
      .catch(e => live && setPresenceError(e.message))
    beat()
    const t = setInterval(beat, 30_000)
    return () => { live = false; clearInterval(t) }
  }, [token, online])

  useEffect(() => { document.title = waiting > 0 ? `(${waiting}) AI Chat` : 'AI Chat' }, [waiting])

  const toggle = () => {
    const next = !online
    setOnline(next)
    try { localStorage.setItem(ONLINE_KEY, next ? '1' : '0') } catch { /* ignore */ }
  }

  if (!token) return <PlatformShell><p className="flex items-center gap-2 text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading…</p></PlatformShell>

  const tabs: [Tab, string][] = [['chats', 'Conversations'], ['performance', 'Performance'], ['unanswered', 'Unanswered questions'], ['index', 'Knowledge index'], ['settings', 'Settings']]

  return (
    <PlatformShell>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-dark">AI Chat</h1>
          <p className="mt-1 text-sm text-neutral-mid">The assistant on www.carestreamai.com. It answers only from the public website, and you can join any conversation.</p>
        </div>
        <div className="flex items-center gap-3">
          {waiting > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{waiting} waiting for a person</span>}
          <button type="button" onClick={toggle}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${online ? 'bg-green-600 text-white' : 'border border-gray-300 bg-white text-neutral-dark'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-white' : 'bg-gray-300'}`} />
            {online ? "I'm online" : "I'm offline"}
          </button>
        </div>
      </div>
      {presenceError && <p className="mb-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"><AlertCircle size={14} /> {presenceError}</p>}

      <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>
        ))}
      </div>

      {tab === 'chats' && <Chats token={token} focusId={focusId} key={focusId ?? 'list'} />}
      {tab === 'performance' && <Performance token={token} />}
      {tab === 'unanswered' && <Unanswered token={token} onOpen={id => { setFocusId(id); setTab('chats') }} />}
      {tab === 'index' && <IndexTab token={token} />}
      {tab === 'settings' && <SettingsTab token={token} />}
    </PlatformShell>
  )
}
