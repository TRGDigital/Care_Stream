'use client'

// The conversation window of the live support chat: used inside the floating widget and, full size, on the /support/chat page.
// All the logic is in lib/use-support-chat.ts. When the team is online (working hours and someone has the inbox open) a chat starts at once;
// otherwise the customer is told when the team is back and can leave their details, and the team answers by email.

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Loader2, Send, Mail } from 'lucide-react'
import type { SupportChat } from '@/lib/use-support-chat'

const FIELD = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

export function ChatPanel({ c, widget = false, headerExtra }: { c: SupportChat; widget?: boolean; headerExtra?: React.ReactNode }) {
  const { status, view, setView, chat, messages, draft, setDraft, busy, error, name, setName, email, setEmail, message, setMessage, begin, send, leave, end, load } = c
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [messages.length, view])
  const online = !!status?.online
  const onKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn() } }

  return (
    <div className={widget ? 'flex h-full min-h-0 flex-col overflow-hidden bg-white' : 'mx-auto flex h-[calc(100vh-7rem)] min-h-[480px] max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm'}>
      <header className={`flex items-center gap-3 border-b border-gray-100 ${widget ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <span className={`h-3 w-3 shrink-0 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-neutral-dark">Chat with CareStream</h2>
          <p className="text-sm text-neutral-mid" role="status">{view === 'loading' ? 'Connecting' : online ? 'We are online' : 'We are away'}{status ? `. ${status.hours_text}.` : ''}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {view === 'chat' && chat && <button type="button" onClick={end} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light">End chat</button>}
          {headerExtra}
        </div>
      </header>

      {view === 'loading' && <div className="flex flex-1 items-center justify-center text-neutral-mid" role="status"><Loader2 size={20} className="animate-spin" /></div>}

      {view === 'start' && (
        <div className="flex flex-1 flex-col justify-center gap-5 overflow-y-auto px-6 py-8">
          {online ? (
            <>
              <div><h2 className="text-xl font-bold text-neutral-dark">How can we help?</h2><p className="mt-1 text-base text-neutral-mid">Ask your question and one of the team will answer here, usually within a few minutes.</p></div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey(begin)} rows={4} maxLength={4000} className={FIELD} placeholder="Type your question" aria-label="Your question" />
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button type="button" onClick={begin} disabled={busy || !draft.trim()} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal px-6 text-base font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Start chat</button>
              <p className="text-sm text-neutral-mid">Looking for a quick answer? The <Link href="/guides" className="font-medium text-teal underline">Help Centre</Link> has guides for every feature.</p>
            </>
          ) : (
            <>
              <div className="flex gap-3 rounded-xl bg-neutral-light p-4"><Clock size={20} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />
                <div><h2 className="text-lg font-bold text-neutral-dark">{status?.closed?.text ?? 'The team is away right now.'}</h2><p className="mt-1 text-sm text-neutral-mid">Leave your details and your question and we will reply by email as soon as we are back. Live chat is open {status?.hours_text ?? 'Monday to Friday, 9am to 5pm UK time'}.</p></div></div>
              <button type="button" onClick={() => setView('details')} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal px-6 text-base font-semibold text-white hover:bg-teal-dark"><Mail size={16} /> Leave a message</button>
              <p className="text-sm text-neutral-mid">Looking for a quick answer? The <Link href="/guides" className="font-medium text-teal underline">Help Centre</Link> has guides for every feature.</p>
            </>
          )}
        </div>
      )}

      {view === 'chat' && chat && (
        <>
          {chat.mode === 'offline' && <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-sm text-amber-900">Your message has been sent. We will reply by email to {email || 'you'}. You can keep adding to it here.</p>}
          {chat.still_waiting && chat.mode === 'live' && (
            <div className="flex flex-wrap items-center gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900" role="status">
              <span className="min-w-0 flex-1">We are still here. Please keep this window open, or leave your details and we will email you.</span>
              <button type="button" onClick={() => { setMessage(''); setView('details') }} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">Leave my details</button>
            </div>
          )}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-neutral-light/50 px-5 py-5" role="log" aria-live="polite" aria-label="Conversation">
            {messages.map(m => m.sender === 'system'
              ? <p key={m.id} className="text-center text-sm text-neutral-mid">{m.body}</p>
              : (
                <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed ${m.sender === 'customer' ? 'bg-teal text-white' : 'border border-gray-200 bg-white text-neutral-dark'}`}>
                    {m.sender === 'agent' && <p className="mb-0.5 text-xs font-semibold text-teal">{m.sender_name || 'CareStream'}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              ))}
            <div ref={bottom} />
          </div>
          <div className="border-t border-gray-100 p-4">
            {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
            <div className="flex items-end gap-3">
              <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey(send)} rows={2} maxLength={4000} className={`${FIELD} resize-none`} placeholder="Type a message. Enter sends." aria-label="Your message" />
              <button type="button" onClick={send} disabled={busy || !draft.trim()} className="inline-flex h-[52px] items-center gap-2 rounded-xl bg-teal px-5 text-base font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send</button>
            </div>
          </div>
        </>
      )}

      {view === 'details' && (
        <form className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6" onSubmit={e => { e.preventDefault(); void leave() }}>
          <div><h2 className="text-xl font-bold text-neutral-dark">Leave your details</h2><p className="mt-1 text-base text-neutral-mid">{status?.closed?.text ?? 'We will reply by email as soon as we can.'}</p></div>
          <div><label htmlFor="sc-name" className="mb-1 block text-base font-medium text-neutral-dark">Your name</label><input id="sc-name" value={name} onChange={e => setName(e.target.value)} className={FIELD} autoComplete="name" /></div>
          <div><label htmlFor="sc-email" className="mb-1 block text-base font-medium text-neutral-dark">Your email</label><input id="sc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={FIELD} autoComplete="email" /></div>
          <div><label htmlFor="sc-msg" className="mb-1 block text-base font-medium text-neutral-dark">How can we help?</label><textarea id="sc-msg" value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={4000} className={FIELD} /></div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !message.trim()} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-teal px-6 text-base font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />} Send my message</button>
            <button type="button" onClick={() => setView(chat ? 'chat' : 'start')} className="min-h-[48px] rounded-xl border border-gray-200 px-5 text-base font-medium text-neutral-dark hover:bg-neutral-light">Back</button>
          </div>
        </form>
      )}

      {view === 'sent' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <CheckCircle2 size={40} className="text-green-500" aria-hidden="true" />
          <h2 className="text-xl font-bold text-neutral-dark">Thank you, we have your message</h2>
          <p className="max-w-md text-base text-neutral-mid">We will reply by email{email ? ` to ${email}` : ''}, usually within one working day{status?.next_open ? `. The team is back ${status.next_open}` : ''}.</p>
          <button type="button" onClick={() => { setView('start'); void load() }} className="mt-2 rounded-xl border border-gray-200 px-5 py-2.5 text-base font-medium text-neutral-dark hover:bg-neutral-light">Back to chat</button>
        </div>
      )}
    </div>
  )
}
