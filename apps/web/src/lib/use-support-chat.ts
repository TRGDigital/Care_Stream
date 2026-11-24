'use client'

// The conversation logic for the live support chat, shared by the floating widget and the full page fallback.
// `visible` says whether the person can see the conversation right now (panel open, or the full page): it sets the polling speed and decides whether
// a new message from the team counts as unread.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supportChat, ChatApiError, type ChatInfo, type ChatMsg, type ChatStatus } from '@/lib/support-chat-client'
import { pollIntervalMs, freshMessages, countAgentMessages } from '@/lib/support-chat-widget'

export type ChatView = 'loading' | 'start' | 'chat' | 'details' | 'sent'

export function useSupportChat(opts: { token?: string; visible: boolean; defaultName?: string; defaultEmail?: string; autoLoad: boolean; onAgentMessage?: (n: number) => void; onChatId?: (id: string | null) => void }) {
  const { token, visible, autoLoad } = opts
  const [status, setStatus] = useState<ChatStatus | null>(null)
  const [view, setView] = useState<ChatView>('loading')
  const [chat, setChat] = useState<ChatInfo | null>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState(opts.defaultName ?? '')
  const [email, setEmail] = useState(opts.defaultEmail ?? '')
  const [message, setMessage] = useState('')
  const [unread, setUnread] = useState(0)
  const [tabHidden, setTabHidden] = useState(false)
  const lastSeen = useRef<string | null>(null)
  const visibleRef = useRef(visible)
  const onAgent = useRef(opts.onAgentMessage); onAgent.current = opts.onAgentMessage
  const onChatId = useRef(opts.onChatId); onChatId.current = opts.onChatId
  visibleRef.current = visible

  useEffect(() => { if (opts.defaultName) setName(n => n || opts.defaultName!); if (opts.defaultEmail) setEmail(e => e || opts.defaultEmail!) }, [opts.defaultName, opts.defaultEmail])
  useEffect(() => { onChatId.current?.(chat && chat.status !== 'closed' ? chat.id : null) }, [chat?.id, chat?.status])
  useEffect(() => { if (visible) setUnread(0) }, [visible])
  useEffect(() => {
    const f = () => setTabHidden(document.visibilityState === 'hidden')
    f(); document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])

  const load = useCallback(async () => {
    if (!token) return
    try {
      const s = await supportChat.status(token)
      setStatus(s)
      if (s.chat && s.chat.status !== 'closed') {
        setChat(s.chat)
        const m = await supportChat.messages(token, s.chat.id)
        setMessages(m.messages); lastSeen.current = m.messages.length ? m.messages[m.messages.length - 1].created_at : null
        setView('chat')
      } else { setChat(null); setView('start') }
    } catch (e: any) { setError(e?.message ?? 'We could not open the chat.'); setView('start') }
  }, [token])
  useEffect(() => { if (autoLoad) void load() }, [autoLoad, load])

  // New messages while a chat exists: fast when the panel is open, slower when it is minimised, none when the browser tab is hidden.
  const every = pollIntervalMs({ hasChat: !!chat && view === 'chat', open: visible, tabHidden })
  useEffect(() => {
    if (!token || !chat || every === null) return
    let live = true
    const tick = async () => {
      try {
        const r = await supportChat.messages(token, chat.id, lastSeen.current ?? undefined)
        if (!live) return
        setChat(r.chat)
        if (r.messages.length) {
          lastSeen.current = r.messages[r.messages.length - 1].created_at
          setMessages(m => {
            const add = freshMessages(m, r.messages)
            const agents = countAgentMessages(add)
            if (agents > 0 && !visibleRef.current) { setUnread(u => u + agents); onAgent.current?.(agents) }
            return add.length ? [...m, ...add] : m
          })
        }
        if (r.chat.status === 'closed') { setView('start'); setChat(null) }
      } catch { /* try again next time */ }
    }
    void tick()
    const id = window.setInterval(tick, every)
    return () => { live = false; window.clearInterval(id) }
  }, [token, chat?.id, every])

  async function begin() {
    if (!token || !draft.trim() || busy) return
    setBusy(true); setError('')
    try {
      const r = await supportChat.start(token, draft.trim())
      setChat(r.chat); setMessages([r.message]); lastSeen.current = r.message.created_at; setDraft(''); setView('chat')
    } catch (e: any) {
      if (e instanceof ChatApiError && e.code === 'AWAY') { setMessage(draft.trim()); setDraft(''); await load(); setView('details') }
      else setError(e?.message ?? 'We could not send that.')
    } finally { setBusy(false) }
  }
  async function send() {
    if (!token || !chat || !draft.trim() || busy) return
    setBusy(true); setError('')
    try {
      const r = await supportChat.send(token, chat.id, draft.trim())
      setMessages(m => [...m, r.message]); lastSeen.current = r.message.created_at; setChat(r.chat); setDraft('')
    } catch (e: any) { setError(e?.message ?? 'We could not send that.') } finally { setBusy(false) }
  }
  async function leave() {
    if (!token || !message.trim() || busy) return
    setBusy(true); setError('')
    try {
      await supportChat.leaveMessage(token, { message: message.trim(), name: name.trim(), email: email.trim(), chat_id: chat?.id })
      setView('sent'); setChat(null); setMessages([]); setMessage('')
    } catch (e: any) { setError(e?.message ?? 'We could not send that.') } finally { setBusy(false) }
  }
  async function end() {
    if (!token || !chat) return
    try { await supportChat.close(token, chat.id) } catch { /* ignore */ }
    setChat(null); setMessages([]); setView('start'); void load()
  }

  return { status, view, setView, chat, messages, draft, setDraft, busy, error, name, setName, email, setEmail, message, setMessage, unread, load, begin, send, leave, end }
}
export type SupportChat = ReturnType<typeof useSupportChat>
