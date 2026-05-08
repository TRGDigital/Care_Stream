'use client'

// §7 / §14.8 — Staff chat interface.
// WhatsApp-style conversational UI — mobile-responsive, WCAG 2.1 AA.
// Two-panel desktop layout: left (session list) + right (active chat).
// Features: suggested queries, typing indicator, collapsible citations,
//           language chip for non-English responses, localStorage session history.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type Citation } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { BookOpen, ChevronDown, ChevronUp, MessageSquare, Plus, Send, Users } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:                  string
  role:                'user' | 'assistant'
  content:             string
  citations?:          Citation[]
  language?:           string
  loading?:            boolean
  suggestedQuestions?: string[]
}

interface StoredSession {
  id:         string
  title:      string
  category:   DocumentCategory
  messages:   ChatMessage[]
  updatedAt:  string  // ISO
}

type DocumentCategory = 'internal_policy' | 'staff_handbook'

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  spa: 'Spanish',    pol: 'Polish',     ron: 'Romanian',
  fra: 'French',     deu: 'German',     por: 'Portuguese',
  hin: 'Hindi',      tgl: 'Tagalog',    yor: 'Yoruba',
  ben: 'Bengali',    urd: 'Urdu',       zho: 'Chinese',
  ara: 'Arabic',     ita: 'Italian',    lit: 'Lithuanian',
  lav: 'Latvian',    bul: 'Bulgarian',  ces: 'Czech',
  slk: 'Slovak',     hun: 'Hungarian',
}

const SUGGESTED: Record<DocumentCategory, string[]> = {
  internal_policy: [
    'What is our falls prevention policy?',
    'How should I report a medication error?',
    'What are our infection control procedures?',
  ],
  staff_handbook: [
    'What are my annual leave entitlements?',
    'What is the process for reporting absence?',
    'What are the disciplinary procedures?',
  ],
}

const CATEGORY_LABELS: Record<DocumentCategory, { title: string; subtitle: string }> = {
  internal_policy: { title: 'Policies & Procedures', subtitle: 'Care, clinical & operational policies' },
  staff_handbook:  { title: 'Staff Handbook',         subtitle: 'HR, employment & staff guidance' },
}

const MAX_SESSIONS = 50
const STORAGE_KEY  = 'cs_chat_sessions'

// ─── Session storage helpers ──────────────────────────────────────────────────

function loadSessions(userId: string): StoredSession[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    return raw ? (JSON.parse(raw) as StoredSession[]) : []
  } catch {
    return []
  }
}

function saveSessions(userId: string, sessions: StoredSession[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(sessions))
  } catch {
    // localStorage quota — silently ignore
  }
}

function upsertSession(
  userId:    string,
  sessions:  StoredSession[],
  session:   StoredSession,
): StoredSession[] {
  const filtered = sessions.filter(s => s.id !== session.id)
  const updated  = [session, ...filtered].slice(0, MAX_SESSIONS)
  saveSessions(userId, updated)
  return updated
}

// Group sessions into Today / Yesterday / Previous 7 days / Older
function groupSessions(sessions: StoredSession[]): { label: string; items: StoredSession[] }[] {
  const now      = new Date()
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000
  const week      = today - 6 * 86_400_000

  const groups: Record<string, StoredSession[]> = {
    Today:             [],
    Yesterday:         [],
    'Previous 7 days': [],
    Older:             [],
  }

  for (const s of sessions) {
    const t = new Date(s.updatedAt).getTime()
    if (t >= today)       groups['Today'].push(s)
    else if (t >= yesterday) groups['Yesterday'].push(s)
    else if (t >= week)   groups['Previous 7 days'].push(s)
    else                  groups['Older'].push(s)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: session }                              = useSession()
  const userId                                         = session?.user?.email ?? 'guest'

  const [category, setCategory]                        = useState<DocumentCategory | null>(null)
  const [sessionId, setSessionId]                      = useState<string>(() => crypto.randomUUID())
  const [sessions, setSessions]                        = useState<StoredSession[]>([])
  const [messages, setMessages]                        = useState<ChatMessage[]>([])
  const [input, setInput]                              = useState('')
  const [sending, setSending]                          = useState(false)
  const [expandedCitations, setExpandedCitations]      = useState<Set<string>>(new Set())
  const [fullPolicyRequestedIds, setFullPolicyRequestedIds] = useState<Set<string>>(new Set())
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Load sessions from localStorage once userId is known
  useEffect(() => {
    if (userId !== 'guest') {
      setSessions(loadSessions(userId))
    }
  }, [userId])

  // Auto-save current session whenever messages settle (skip loading states)
  useEffect(() => {
    const completed = messages.filter(m => !m.loading)
    if (completed.length === 0 || category === null) return

    const title = completed.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Chat'
    const stored: StoredSession = {
      id:        sessionId,
      title,
      category,
      messages:  completed,
      updatedAt: new Date().toISOString(),
    }
    setSessions(prev => upsertSession(userId, prev, stored))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Session management ───────────────────────────────────────────────────────

  function startNewChat() {
    setMessages([])
    setExpandedCitations(new Set())
    setFullPolicyRequestedIds(new Set())
    setCategory(null)
    setSessionId(crypto.randomUUID())
    setInput('')
  }

  function loadSession(s: StoredSession) {
    setMessages(s.messages)
    setCategory(s.category)
    setSessionId(s.id)
    setExpandedCitations(new Set())
    setFullPolicyRequestedIds(new Set())
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // ─── Send ─────────────────────────────────────────────────────────────────────

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

      const history = messages
        .filter(m => !m.loading && m.content)
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
        document_category:    category ?? undefined,
        conversation_history: history.length > 0 ? history : undefined,
      })

      setMessages(prev => prev.map(m =>
        m.id === placeholderId ? {
          ...m,
          content:            result.responseHtml,
          citations:          result.citations?.length ? result.citations : undefined,
          language:           result.languageDetected !== 'eng' ? result.languageDetected : undefined,
          loading:            false,
          suggestedQuestions: result.suggestedQuestions?.length ? result.suggestedQuestions : undefined,
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
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const userName    = session?.user?.name ?? 'You'
  const userInitial = userName.charAt(0).toUpperCase()
  const isEmpty     = messages.length === 0
  const grouped     = groupSessions(sessions)

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
          >
            <Plus size={15} />
            New chat
          </button>
        </div>

        {/* Session history */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {grouped.length === 0 ? (
            <p className="px-3 text-xs text-neutral-mid">No previous chats</p>
          ) : (
            grouped.map(group => (
              <div key={group.label} className="mb-3">
                <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => loadSession(s)}
                      className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-light ${
                        s.id === sessionId ? 'bg-teal-light' : ''
                      }`}
                    >
                      <span className={`truncate text-sm ${s.id === sessionId ? 'font-medium text-teal' : 'text-neutral-dark'}`}>
                        {s.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-neutral-mid">
                        {s.category === 'internal_policy'
                          ? <BookOpen size={10} />
                          : <Users    size={10} />}
                        {CATEGORY_LABELS[s.category].title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Active category badge */}
        {category !== null && (
          <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-2">
            <div className="mx-auto flex max-w-3xl items-center gap-1.5">
              {category === 'internal_policy'
                ? <BookOpen size={13} className="text-teal" />
                : <Users    size={13} className="text-teal" />}
              <span className="text-xs font-medium text-teal">
                {CATEGORY_LABELS[category].title}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {category === null ? (
            <CategorySelect onSelect={setCategory} />
          ) : isEmpty ? (
            <EmptyState category={category} onSelect={sendMessage} />
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
              placeholder={
                category === null
                  ? 'Choose a topic above to start chatting…'
                  : 'Ask about a policy, regulation, or HR matter…'
              }
              maxLength={1000}
              disabled={sending || category === null}
              aria-label="Query input"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-neutral-light disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || category === null}
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

function CategorySelect({ onSelect }: { onSelect: (c: DocumentCategory) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-neutral-dark">What would you like to ask about?</h2>
        <p className="mt-2 text-sm text-neutral-mid">Choose a knowledge area to get started</p>
      </div>
      <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row">
        <button
          onClick={() => onSelect('internal_policy')}
          className="flex flex-1 flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <BookOpen className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Policies &amp; Procedures</p>
            <p className="mt-1 text-xs text-neutral-mid">Care, clinical &amp; operational policies</p>
          </div>
        </button>
        <button
          onClick={() => onSelect('staff_handbook')}
          className="flex flex-1 flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <Users className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Staff Handbook</p>
            <p className="mt-1 text-xs text-neutral-mid">HR, employment &amp; staff guidance</p>
          </div>
        </button>
      </div>
    </div>
  )
}

function EmptyState({ category, onSelect }: { category: DocumentCategory; onSelect: (q: string) => void }) {
  const label = CATEGORY_LABELS[category]
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-light">
          <MessageSquare className="text-teal" size={30} />
        </div>
        <h2 className="text-2xl font-semibold text-neutral-dark">What would you like to know?</h2>
        <p className="mt-2 text-sm text-neutral-mid">{label.subtitle}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED[category].map(q => (
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

  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-light"
      >
        <MessageSquare className="text-teal" size={15} />
      </div>

      <div className="min-w-0 max-w-[78%]">
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

        {msg.language && !msg.loading && (
          <span className="mt-1.5 inline-block rounded-full bg-teal-light px-2.5 py-0.5 text-xs text-teal">
            🌐 {langNames[msg.language] ?? msg.language}
          </span>
        )}

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
