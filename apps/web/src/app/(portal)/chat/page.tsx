'use client'

// §7 / §14.8 — Staff chat interface.
// WhatsApp-style conversational UI — mobile-responsive, WCAG 2.1 AA.
// Two-panel desktop layout: left (session list) + right (active chat).
// Features: suggested queries, typing indicator, collapsible citations,
//           language chip for non-English responses.

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type Citation } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { ChevronDown, ChevronUp, MessageSquare, Plus, Send } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:                  string
  role:                'user' | 'assistant'
  content:             string
  citations?:          Citation[]
  language?:           string    // ISO 639-3, only present when not 'eng'
  loading?:            boolean
  suggestedQuestions?: string[]
}

// ─── Language names (subset covering common care-sector languages) ─────────────

const LANG_NAMES: Record<string, string> = {
  spa: 'Spanish',    pol: 'Polish',     ron: 'Romanian',
  fra: 'French',     deu: 'German',     por: 'Portuguese',
  hin: 'Hindi',      tgl: 'Tagalog',    yor: 'Yoruba',
  ben: 'Bengali',    urd: 'Urdu',       zho: 'Chinese',
  ara: 'Arabic',     ita: 'Italian',    lit: 'Lithuanian',
  lav: 'Latvian',    bul: 'Bulgarian',  ces: 'Czech',
  slk: 'Slovak',     hun: 'Hungarian',
}

const SUGGESTED = [
  'What is our falls prevention policy?',
  'How should I report a medication error?',
  'What are my annual leave entitlements?',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: session }                             = useSession()
  const [messages, setMessages]                       = useState<ChatMessage[]>([])
  const [input, setInput]                             = useState('')
  const [sending, setSending]                         = useState(false)
  const [expandedCitations, setExpandedCitations]     = useState<Set<string>>(new Set())
  const [fullPolicyRequestedIds, setFullPolicyRequestedIds] = useState<Set<string>>(new Set())
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Send ────────────────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending || !session?.accessToken) return

    const userMsg: ChatMessage = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: trimmed,
    }
    const placeholderId = crypto.randomUUID()
    const placeholder: ChatMessage = {
      id:      placeholderId,
      role:    'assistant',
      content: '',
      loading: true,
    }

    setMessages(prev => [...prev, userMsg, placeholder])
    setInput('')
    setSending(true)
    inputRef.current?.focus()

    try {
      const api = createApiClient(session.accessToken)

      // Build conversation history from prior completed messages.
      // Strip HTML tags from assistant messages so they're readable plain text.
      const history = messages
        .filter(m => !m.loading && m.content && m.id !== placeholderId)
        .map(m => ({
          role:    m.role as 'user' | 'assistant',
          content: m.role === 'assistant'
            ? m.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)
            : m.content,
        }))
        .slice(-10)

      const result = await api.query.send({
        query_text:           trimmed,
        staff_name:           session.user?.name ?? undefined,
        conversation_history: history.length > 0 ? history : undefined,
      })

      setMessages(prev => prev.map(m =>
        m.id === placeholderId ? {
          ...m,
          content:             result.responseHtml,
          citations:           result.citations?.length ? result.citations : undefined,
          language:            result.languageDetected !== 'eng' ? result.languageDetected : undefined,
          loading:             false,
          suggestedQuestions:  result.suggestedQuestions?.length ? result.suggestedQuestions : undefined,
        } : m,
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === placeholderId ? {
          ...m,
          content: '<p>Sorry, something went wrong. Please try again.</p>',
          loading: false,
        } : m,
      ))
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function toggleCitations(id: string) {
    setExpandedCitations(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const userName  = session?.user?.name ?? 'You'
  const userInitial = userName.charAt(0).toUpperCase()
  const isEmpty   = messages.length === 0

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel — desktop session list ──────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="p-3">
          <button
            onClick={() => { setMessages([]); setExpandedCitations(new Set()) }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
          >
            <Plus size={15} />
            New chat
          </button>
        </div>
        {!isEmpty && (
          <div className="px-3">
            <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">
              This session
            </p>
            <div className="rounded-md bg-teal-light px-3 py-2 text-left text-sm text-teal">
              {messages.find(m => m.role === 'user')?.content.slice(0, 42) ?? 'Chat'}
              {(messages.find(m => m.role === 'user')?.content.length ?? 0) > 42 ? '…' : ''}
            </div>
          </div>
        )}
      </aside>

      {/* ── Right panel — active chat ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <EmptyState onSelect={sendMessage} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  userInitial={userInitial}
                  citationsExpanded={expandedCitations.has(msg.id)}
                  onToggleCitations={() => toggleCitations(msg.id)}
                  onSelectSuggestion={sendMessage}
                  onRequestFullPolicy={() => {
                    setFullPolicyRequestedIds(prev => new Set([...prev, msg.id]))
                    sendMessage('Please send me the full policy')
                  }}
                  fullPolicyRequested={fullPolicyRequestedIds.has(msg.id)}
                  langNames={LANG_NAMES}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about a policy, regulation, or HR matter…"
              maxLength={1000}
              disabled={sending}
              aria-label="Query input"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-neutral-light"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-teal text-white transition-colors hover:bg-teal-dark disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
          <p className="mt-1.5 text-center text-xs text-neutral-mid">
            {input.length > 800
              ? `${input.length}/1000 characters`
              : 'Responses are generated from your organisation\'s policies'}
          </p>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-light">
          <MessageSquare className="text-teal" size={30} />
        </div>
        <h2 className="text-2xl font-semibold text-neutral-dark">What would you like to know?</h2>
        <p className="mt-2 text-sm text-neutral-mid">
          Ask about any policy, procedure, regulation, or HR matter
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-teal px-4 py-2 text-sm text-teal transition-colors hover:bg-teal-light focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({
  msg,
  userInitial,
  citationsExpanded,
  onToggleCitations,
  onSelectSuggestion,
  onRequestFullPolicy,
  fullPolicyRequested,
  langNames,
}: {
  msg:                 ChatMessage
  userInitial:         string
  citationsExpanded:   boolean
  onToggleCitations:   () => void
  onSelectSuggestion:  (q: string) => void
  onRequestFullPolicy: () => void
  fullPolicyRequested: boolean
  langNames:           Record<string, string>
}) {
  // Staff message — right-aligned, teal background
  if (msg.role === 'user') {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="max-w-[78%]">
          <div className="rounded-2xl rounded-br-sm bg-teal px-4 py-3 text-sm leading-relaxed text-white">
            {msg.content}
          </div>
        </div>
        <div
          aria-hidden
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white"
        >
          {userInitial}
        </div>
      </div>
    )
  }

  // AI response — left-aligned, white card
  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-light"
      >
        <MessageSquare className="text-teal" size={15} />
      </div>

      <div className="min-w-0 max-w-[78%]">
        {/* Bubble */}
        <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3">
          {msg.loading ? (
            <Spinner />
          ) : (
            <div
              className="message-content text-sm leading-relaxed text-neutral-dark"
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          )}
        </div>

        {/* Language chip */}
        {msg.language && !msg.loading && (
          <span className="mt-1.5 inline-block rounded-full bg-teal-light px-2.5 py-0.5 text-xs text-teal">
            🌐 {langNames[msg.language] ?? msg.language}
          </span>
        )}

        {/* Collapsible citations */}
        {msg.citations && msg.citations.length > 0 && !msg.loading && (
          <div className="mt-2">
            <button
              onClick={onToggleCitations}
              className="flex items-center gap-1 text-xs text-neutral-mid transition-colors hover:text-teal focus:outline-none"
              aria-expanded={citationsExpanded}
            >
              {citationsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {msg.citations.length} source{msg.citations.length !== 1 ? 's' : ''} referenced
            </button>
            {citationsExpanded && (
              <div className="mt-1.5 space-y-1">
                {msg.citations.map(c => (
                  <div
                    key={c.policy_id}
                    className="rounded-md bg-teal-light px-3 py-1.5 text-xs text-teal"
                  >
                    {c.policy_name} — v{c.version}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggested follow-up questions + full policy offer */}
        {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && !msg.loading && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-neutral-mid">You may also want to ask:</p>
            <div className="flex flex-col gap-1.5">
              {msg.suggestedQuestions.map((q, i) => {
                const isRegulation = /\b(Act|Regulations?|Directive|GDPR|COSHH|RIDDOR|LOLER|PUWER|Code of Practice)\b/i.test(q)
                return (
                  <button
                    key={i}
                    onClick={() => onSelectSuggestion(q)}
                    className={
                      isRegulation
                        ? 'rounded-full border border-blue-400 px-3 py-1.5 text-left text-xs text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1'
                        : 'rounded-full border border-teal px-3 py-1.5 text-left text-xs text-teal transition-colors hover:bg-teal-light focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-1'
                    }
                  >
                    {q}
                  </button>
                )
              })}

              {!fullPolicyRequested && (
                <button
                  onClick={onRequestFullPolicy}
                  className="rounded-full border border-orange-400 px-3 py-1.5 text-left text-xs text-orange-600 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
                >
                  Would you like the full policy?
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
