'use client'

// §7 / §14.8 — Staff chat interface.
// WhatsApp-style conversational UI — mobile-responsive, WCAG 2.1 AA.
// Two-panel desktop layout: left (session list) + right (active chat).
// Features: suggested queries, typing indicator, collapsible citations,
//           language chip for non-English responses, localStorage session history.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient, type Citation } from '@/lib/api-client'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, BookOpen, Brain, ChevronDown, ChevronUp, CheckCircle2, ClipboardCheck, Globe, GraduationCap, LifeBuoy, MessageSquare, Mic, MicOff, Plus, Send, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, TrendingUp, Users, XCircle } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id:                  string
  role:                'user' | 'assistant'
  content:             string
  timestamp?:          string   // ISO — set on send for user, on response for assistant
  citations?:          Citation[]
  language?:           string
  loading?:            boolean
  suggestedQuestions?: string[]
  queryId?:            string | null
}

interface StoredSession {
  id:         string
  title:      string
  category:   DocumentCategory
  messages:   ChatMessage[]
  updatedAt:  string  // ISO
}

type DocumentCategory = 'internal_policy' | 'staff_handbook' | 'training_module' | 'cqc_report' | 'audit_report' | 'business_continuity'

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  spa: 'Spanish',    pol: 'Polish',     ron: 'Romanian',
  fra: 'French',     deu: 'German',     por: 'Portuguese',
  hin: 'Hindi',      tgl: 'Tagalog',    yor: 'Yoruba',
  ben: 'Bengali',    urd: 'Urdu',       zho: 'Chinese',
  ara: 'Arabic',     ita: 'Italian',    lit: 'Lithuanian',
  lav: 'Latvian',    bul: 'Bulgarian',  ces: 'Czech',
  slk: 'Slovak',     hun: 'Hungarian',
  mal: 'Malayalam',  sna: 'Shona',
  mfe: 'Mauritian Creole', hat: 'Haitian Creole', crs: 'Seychellois Creole',
  kea: 'Cape Verdean Creole', jam: 'Jamaican Patois', gcf: 'Antillean Creole',
  pcm: 'Nigerian Pidgin',
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
  training_module: [
    'Can you explain the key principles of safeguarding adults?',
    'What do I need to know about the Mental Capacity Act?',
    'What are the main infection prevention and control measures?',
  ],
  cqc_report: [
    'What were the key findings from our last CQC inspection?',
    'Do we have any gaps against the CQC Safe key question?',
    'Help me draft a factual accuracy challenge for an incorrect inspector finding.',
  ],
  audit_report: [
    'What actions are outstanding from our most recent audits?',
    'Are there any recurring issues across our monthly audits?',
    'Which areas have the most recommendations and what should we prioritise?',
  ],
  business_continuity: [
    'What should I do if we have a serious staff shortage during a shift?',
    'Who do I contact if we have a power or IT outage?',
    'What is the procedure if we need to evacuate the building?',
  ],
}

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function sessionRef(id: string): string {
  return 'REF-' + id.replace(/-/g, '').slice(0, 6).toUpperCase()
}

const CATEGORY_LABELS: Record<DocumentCategory, { title: string; subtitle: string }> = {
  internal_policy: { title: 'Policies & Procedures', subtitle: 'Care, clinical & operational policies' },
  staff_handbook:  { title: 'Staff Handbook',         subtitle: 'HR, employment & staff guidance' },
  training_module: { title: 'Training & Learning',    subtitle: 'Training modules & care sector knowledge' },
  cqc_report:      { title: 'CQC Compliance',         subtitle: 'Inspection readiness & regulatory compliance' },
  audit_report:         { title: 'Auditing',               subtitle: 'Ask about audit findings & AI recommendations' },
  business_continuity:  { title: 'Business Continuity',    subtitle: 'Emergency procedures & contingency plans' },
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

  const [view,     setView]                            = useState<'chat' | 'induction' | 'training'>('chat')
  const [category, setCategory]                        = useState<DocumentCategory | null>(null)
  const [sessionId, setSessionId]                      = useState<string>(() => crypto.randomUUID())
  const [sessions, setSessions]                        = useState<StoredSession[]>([])
  const [messages, setMessages]                        = useState<ChatMessage[]>([])
  const [input, setInput]                              = useState('')
  const [sending, setSending]                          = useState(false)

  const { supported: speechSupported, state: speechState, start: startSpeech, stop: stopSpeech } =
    useSpeech((text) => setInput(prev => (prev.trim() ? prev + ' ' + text : text)))
  const [expandedCitations, setExpandedCitations]      = useState<Set<string>>(new Set())
  const [fullPolicyRequestedIds, setFullPolicyRequestedIds] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId]          = useState<string | null>(null)
  const [msgFeedback,  setMsgFeedback]                  = useState<Record<string, 'positive' | 'negative'>>({})
  const [replyLang,    setReplyLang]                    = useState<string>('')   // '' = auto-detect
  const [langList,     setLangList]                     = useState<{ code: string; name: string }[]>([])
  const bottomRef          = useRef<HTMLDivElement>(null)
  const inputRef           = useRef<HTMLInputElement>(null)
  const suppressAutoSaveRef = useRef(false)

  // Load sessions from localStorage once userId is known
  useEffect(() => {
    if (userId !== 'guest') {
      setSessions(loadSessions(userId))
      try { const v = localStorage.getItem(`cs_reply_lang_${userId}`); if (v) setReplyLang(v) } catch { /* ignore */ }
    }
  }, [userId])

  // Honour ?view=induction|training (e.g. links from My Progress)
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'induction' || v === 'training') setView(v)
  }, [])

  // Fetch the tenant's available languages (defaults + admin-added) for the
  // reply-language picker. Settings reads are open to all authenticated staff.
  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).settings.get()
      .then(s => { if (Array.isArray((s as any).languages)) setLangList((s as any).languages) })
      .catch(() => { /* picker falls back to Auto-detect only */ })
  }, [session?.accessToken])

  function chooseReplyLang(code: string) {
    setReplyLang(code)
    try { localStorage.setItem(`cs_reply_lang_${userId}`, code) } catch { /* ignore */ }
  }

  // Code → name map for the detected-language chip (static + tenant languages).
  const langNameMap: Record<string, string> = { ...LANG_NAMES, ...Object.fromEntries(langList.map(l => [l.code, l.name])) }

  // Auto-save current session whenever messages settle (skip loading states and restores)
  useEffect(() => {
    if (suppressAutoSaveRef.current) {
      suppressAutoSaveRef.current = false
      return
    }
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
    suppressAutoSaveRef.current = true
    // Backfill timestamp for messages saved before this field existed
    const msgs = s.messages.map(m => m.timestamp ? m : { ...m, timestamp: s.updatedAt })
    setMessages(msgs)
    setCategory(s.category)
    setSessionId(s.id)
    setExpandedCitations(new Set())
    setFullPolicyRequestedIds(new Set())
    setInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function requestDeleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setConfirmDeleteId(id)
  }

  function confirmDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    // Remove from local history only — flags records in DB for admin reporting, never deletes them
    const updated = sessions.filter(s => s.id !== id)
    saveSessions(userId, updated)
    setSessions(updated)
    setConfirmDeleteId(null)
    if (id === sessionId) startNewChat()
    if (session?.accessToken) {
      createApiClient(session.accessToken).query.deleteSession(id).catch(() => {})
    }
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDeleteId(null)
  }

  async function submitFeedback(queryId: string, rating: 'positive' | 'negative') {
    if (!session?.accessToken) return
    setMsgFeedback(prev => ({ ...prev, [queryId]: rating }))
    try {
      await createApiClient(session.accessToken).query.feedback(queryId, rating)
    } catch {
      // silently ignore — feedback is best-effort
    }
  }

  // ─── Send ─────────────────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending || !session?.accessToken) return

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   trimmed,
      timestamp: new Date().toISOString(),
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
        chat_session_id:      sessionId,
        language:             replyLang || undefined,
        conversation_history: history.length > 0 ? history : undefined,
      })

      setMessages(prev => prev.map(m =>
        m.id === placeholderId ? {
          ...m,
          content:            result.responseHtml,
          timestamp:          new Date().toISOString(),
          citations:          result.citations?.length ? result.citations : undefined,
          language:           result.languageDetected !== 'eng' ? result.languageDetected : undefined,
          loading:            false,
          suggestedQuestions: result.suggestedQuestions?.length ? result.suggestedQuestions : undefined,
          queryId:            result.queryId ?? null,
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

  const userName       = session?.user?.name ?? 'You'
  const userInitial    = userName.charAt(0).toUpperCase()
  const isEmpty        = messages.length === 0
  const grouped        = groupSessions(sessions)
  const firstUserMsgId = messages.find(m => m.role === 'user')?.id

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="p-3 space-y-0.5">
          <button
            onClick={() => setView('chat')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === 'chat' ? 'bg-teal/10 text-teal' : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'}`}
          >
            <MessageSquare size={15} />
            Chat
          </button>
          <button
            onClick={() => setView('induction')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === 'induction' ? 'bg-teal/10 text-teal' : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'}`}
          >
            <GraduationCap size={15} />
            My Induction
          </button>
          <button
            onClick={() => setView('training')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${view === 'training' ? 'bg-teal/10 text-teal' : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'}`}
          >
            <Brain size={15} />
            My Training
          </button>
          <Link
            href="/cqc"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
          >
            <ShieldCheck size={15} />
            CQC Prep
          </Link>
          <Link
            href="/progress"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
          >
            <TrendingUp size={15} />
            My Progress
          </Link>
          {view === 'chat' && (
            <button
              onClick={startNewChat}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
            >
              <Plus size={15} />
              New chat
            </button>
          )}
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
                    <div
                      key={s.id}
                      className={`group relative flex items-start rounded-md transition-colors hover:bg-neutral-light ${
                        s.id === sessionId ? 'bg-teal-light' : ''
                      }`}
                    >
                      {confirmDeleteId === s.id ? (
                        /* ── Inline confirmation ── */
                        <div className="flex w-full items-center justify-between px-3 py-2" onClick={e => e.stopPropagation()}>
                          <span className="text-xs text-neutral-dark">Remove from history?</span>
                          <div className="flex gap-1">
                            <button
                              onClick={e => cancelDelete(e)}
                              className="rounded px-1.5 py-0.5 text-xs text-neutral-mid hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={e => confirmDelete(e, s.id)}
                              className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => loadSession(s)}
                            className="flex min-w-0 flex-1 flex-col px-3 py-2 text-left"
                          >
                            <span className={`truncate text-sm ${s.id === sessionId ? 'font-medium text-teal' : 'text-neutral-dark'}`}>
                              {s.title}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-neutral-mid">
                              {s.category === 'internal_policy' ? <BookOpen size={10} />
                                : s.category === 'training_module' ? <Brain size={10} />
                                : s.category === 'cqc_report' ? <ShieldCheck size={10} />
                                : s.category === 'audit_report' ? <ClipboardCheck size={10} />
                                : s.category === 'business_continuity' ? <LifeBuoy size={10} />
                                : <Users size={10} />}
                              {CATEGORY_LABELS[s.category].title}
                            </span>
                          </button>
                          <button
                            onClick={e => requestDeleteSession(e, s.id)}
                            aria-label="Delete chat"
                            className="mr-1 mt-1.5 flex-shrink-0 rounded p-1 text-neutral-mid opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Induction view */}
        {view === 'induction' && session?.accessToken && (
          <InductionView token={session.accessToken} />
        )}

        {/* Training view */}
        {view === 'training' && session?.accessToken && (
          <TrainingView token={session.accessToken} />
        )}

        {/* Active category badge */}
        {view === 'chat' && category !== null && (
          <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-2">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                {category === 'internal_policy' ? <BookOpen size={13} className="text-teal" />
                  : category === 'training_module' ? <Brain size={13} className="text-teal" />
                  : category === 'cqc_report' ? <ShieldCheck size={13} className="text-teal" />
                  : category === 'audit_report' ? <ClipboardCheck size={13} className="text-teal" />
                  : category === 'business_continuity' ? <LifeBuoy size={13} className="text-teal" />
                  : <Users size={13} className="text-teal" />}
                <span className="text-xs font-medium text-teal">
                  {CATEGORY_LABELS[category].title}
                </span>
              </div>
              <button
                onClick={startNewChat}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-teal"
                title="Choose a different topic"
              >
                <ArrowLeft size={12} /> Change topic
              </button>
            </div>
          </div>
        )}

        {/* Chat messages + input — only shown in chat view */}
        {view === 'chat' && <div className="flex-1 overflow-y-auto px-4 py-6">
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
                  langNames={langNameMap}
                  sessionRef={msg.id === firstUserMsgId ? sessionRef(sessionId) : undefined}
                  feedbackState={msg.queryId ? msgFeedback[msg.queryId] : undefined}
                  onSubmitFeedback={submitFeedback}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>}

        {/* Input bar */}
        {view === 'chat' && <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl items-center gap-3"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  speechState === 'listening'
                    ? 'Listening…'
                    : category === null
                      ? 'Choose a topic above to start chatting…'
                      : category === 'training_module'
                        ? 'Ask about any training topic — safeguarding, medication, MCA…'
                        : category === 'cqc_report'
                          ? 'Ask about CQC findings, compliance gaps, or inspection preparation…'
                          : category === 'audit_report'
                            ? 'Ask about audit findings, AI recommendations, or outstanding actions…'
                            : category === 'business_continuity'
                              ? 'Ask about emergency procedures, contingency plans, or escalation contacts…'
                              : 'Ask about a policy, regulation, or HR matter…'
                }
                maxLength={1000}
                disabled={sending || category === null}
                aria-label="Query input"
                className="w-full rounded-lg border border-gray-300 py-3 pl-4 pr-11 text-sm outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20 disabled:bg-neutral-light disabled:cursor-not-allowed"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={speechState === 'listening' ? stopSpeech : startSpeech}
                  disabled={sending || category === null}
                  aria-label={speechState === 'listening' ? 'Stop listening' : 'Speak your question'}
                  title={speechState === 'listening' ? 'Stop listening' : 'Speak your question'}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30
                    ${speechState === 'listening'
                      ? 'bg-red-50 text-red-500 animate-pulse'
                      : 'text-neutral-mid hover:bg-gray-100 hover:text-teal'
                    }`}
                >
                  {speechState === 'listening' ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !input.trim() || category === null}
              aria-label="Send message"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-teal text-white transition-colors hover:bg-teal-dark disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Reply-language picker — forces responses into the chosen language */}
          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-end gap-1.5">
            <Globe size={13} className="text-neutral-mid" />
            <label htmlFor="reply-lang" className="text-xs text-neutral-mid">Reply in</label>
            <select
              id="reply-lang"
              value={replyLang}
              onChange={e => chooseReplyLang(e.target.value)}
              className="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-7 text-xs text-neutral-dark outline-none focus:border-teal focus:ring-1 focus:ring-teal/20"
            >
              <option value="">Auto-detect</option>
              {langList.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <p className="mt-1.5 text-center text-xs text-neutral-mid">
            {input.length > 800
              ? `${input.length}/1000 characters`
              : category === 'training_module'
                ? 'Responses draw on your training module knowledge base'
                : category === 'cqc_report'
                  ? 'Responses cross-reference your CQC report, policies, and the CQC framework'
                  : category === 'audit_report'
                    ? 'Responses draw on your completed audit reports and AI-generated recommendations'
                    : category === 'business_continuity'
                      ? 'Responses draw on your Business Continuity knowledge base entries'
                      : 'Responses are generated from your organisation\'s policies'}
          </p>
        </div>}

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
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelect('internal_policy')}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
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
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <Users className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Staff Handbook</p>
            <p className="mt-1 text-xs text-neutral-mid">HR, employment &amp; staff guidance</p>
          </div>
        </button>
        <button
          onClick={() => onSelect('training_module')}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <Brain className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Training &amp; Learning</p>
            <p className="mt-1 text-xs text-neutral-mid">Training modules &amp; care sector knowledge</p>
          </div>
        </button>
        <button
          onClick={() => onSelect('cqc_report')}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <ShieldCheck className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">CQC Compliance</p>
            <p className="mt-1 text-xs text-neutral-mid">Inspection readiness &amp; regulatory compliance</p>
          </div>
        </button>
        <button
          onClick={() => onSelect('audit_report')}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <ClipboardCheck className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Auditing</p>
            <p className="mt-1 text-xs text-neutral-mid">Ask about audit findings &amp; AI recommendations</p>
          </div>
        </button>
        <button
          onClick={() => onSelect('business_continuity')}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 transition-all hover:border-teal hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-light">
            <LifeBuoy className="text-teal" size={28} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-neutral-dark">Business Continuity</p>
            <p className="mt-1 text-xs text-neutral-mid">Emergency procedures &amp; contingency plans</p>
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
  sessionRef: ref,
  feedbackState,
  onSubmitFeedback,
}: {
  msg:                 ChatMessage
  userInitial:         string
  citationsExpanded:   boolean
  onToggleCitations:   () => void
  onSelectSuggestion:  (q: string) => void
  onRequestFullPolicy: () => void
  fullPolicyRequested: boolean
  langNames:           Record<string, string>
  sessionRef?:         string
  feedbackState?:      'positive' | 'negative'
  onSubmitFeedback:    (queryId: string, rating: 'positive' | 'negative') => void
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="max-w-[78%]">
          <div className="rounded-2xl rounded-br-sm bg-teal px-4 py-3 text-sm leading-relaxed text-white">
            {msg.content}
          </div>
          {msg.timestamp && (
            <p className="mt-1 text-right text-xs text-neutral-mid">
              {ref && <span className="mr-2 font-medium text-teal">{ref}</span>}
              {formatMsgTime(msg.timestamp)}
            </p>
          )}
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
        {msg.timestamp && !msg.loading && (
          <p className="mt-1 text-xs text-neutral-mid">
            {formatMsgTime(msg.timestamp)}
          </p>
        )}

        {msg.queryId && !msg.loading && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">Was this helpful?</span>
            <button
              onClick={() => onSubmitFeedback(msg.queryId!, 'positive')}
              className={`rounded-full p-1 transition-colors ${
                feedbackState === 'positive'
                  ? 'bg-green-100 text-green-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              title="Helpful"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              onClick={() => onSubmitFeedback(msg.queryId!, 'negative')}
              className={`rounded-full p-1 transition-colors ${
                feedbackState === 'negative'
                  ? 'bg-red-100 text-red-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              title="Could be better"
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        )}

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

// ─── TrainingView ─────────────────────────────────────────────────────────────

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const

function TrainingView({ token }: { token: string }) {
  const api = createApiClient(token)

  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  // enrollmentId → questionId → selected letter
  const [selected,   setSelected]    = useState<Record<string, Record<string, string>>>({})
  // questionId → immediate result from server (for showing correct option on wrong answers)
  const [feedback,   setFeedback]    = useState<Record<string, { is_correct: boolean; correct_option: number | null }>>({})
  const [submitting, setSubmitting]  = useState<string | null>(null) // questionId
  const [completing, setCompleting]  = useState<string | null>(null) // enrollmentId
  // questionIds where user clicked "Try again" (hides saved answer, shows MCQ)
  const [retrying,   setRetrying]    = useState<Set<string>>(new Set())

  async function load() {
    try {
      const d = await api.training.myEnrollments()
      setEnrollments(d.enrollments)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitAnswer(enrollmentId: string, questionId: string) {
    const letter = selected[enrollmentId]?.[questionId]
    if (!letter || submitting) return
    setSubmitting(questionId)
    try {
      const result = await api.training.saveAnswer(enrollmentId, { question_id: questionId, answer_text: letter })
      setFeedback(prev => ({ ...prev, [questionId]: { is_correct: result.is_correct, correct_option: result.correct_option } }))
      setRetrying(prev => { const n = new Set(prev); n.delete(questionId); return n })
      const d = await api.training.myEnrollments()
      setEnrollments(d.enrollments)
    } catch {
      // keep MCQ visible on error
    } finally {
      setSubmitting(null)
    }
  }

  async function completeModule(enrollmentId: string) {
    setCompleting(enrollmentId)
    try {
      await api.training.complete(enrollmentId)
      const d = await api.training.myEnrollments()
      setEnrollments(d.enrollments)
    } finally {
      setCompleting(null)
    }
  }

  function toggleRetry(questionId: string) {
    setRetrying(prev => {
      const n = new Set(prev)
      if (n.has(questionId)) n.delete(questionId); else n.add(questionId)
      return n
    })
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[1, 2].map(i => <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    )
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <Brain size={36} className="text-gray-200" />
        <p className="font-medium text-neutral-dark">No training assigned</p>
        <p className="text-sm text-neutral-mid">Your manager will enrol you in training modules when they&apos;re ready for you.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-5 text-xl font-bold text-neutral-dark">My Training</h2>
        <div className="space-y-6">
          {enrollments.map(enrollment => {
            const questions   = enrollment.module.questions as Array<{ id: string; text: string; options: string[] }>
            const totalQs     = questions.length
            const answeredQs  = enrollment.answers.length
            const correctQs   = enrollment.answers.filter((a: any) => a.is_correct).length
            const pct         = totalQs > 0 ? Math.round((answeredQs / totalQs) * 100) : 0
            const answeredIds = new Set(enrollment.answers.map((a: any) => a.question_id))
            const allAnswered = totalQs > 0 && questions.every(q => answeredIds.has(q.id))

            const STATUS_STYLES: Record<string, string> = {
              not_started: 'bg-gray-100 text-neutral-mid',
              in_progress:  'bg-amber-100 text-amber-700',
              complete:     'bg-green-100 text-green-700',
              expired:      'bg-red-100 text-red-600',
            }
            const STATUS_LABELS: Record<string, string> = {
              not_started: 'Not started',
              in_progress:  'In progress',
              complete:     'Complete',
              expired:      'Expired',
            }
            const categoryBadge = enrollment.module.category === 'statutory'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'

            return (
              <div key={enrollment.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Module header */}
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-neutral-dark">{enrollment.module.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryBadge}`}>
                          {enrollment.module.category}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[enrollment.status] ?? STATUS_STYLES.not_started}`}>
                          {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-neutral-mid">{answeredQs}/{totalQs} answered</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {answeredQs > 0 && (
                    <p className="mt-1 text-xs text-neutral-mid">
                      {correctQs}/{answeredQs} correct ({answeredQs > 0 ? Math.round((correctQs / answeredQs) * 100) : 0}%)
                    </p>
                  )}
                  {enrollment.due_date && enrollment.status !== 'complete' && (
                    <p className="mt-1 text-xs text-neutral-mid">
                      Due: {new Date(enrollment.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Questions */}
                <div className="divide-y divide-gray-50 px-5">
                  {questions.map((question, qi) => {
                    const existingAnswer = enrollment.answers.find((a: any) => a.question_id === question.id)
                    const isRetrying     = retrying.has(question.id)
                    const pendingFeedback = feedback[question.id]
                    const currentSel     = selected[enrollment.id]?.[question.id]

                    const showAnsweredState = existingAnswer && !isRetrying

                    return (
                      <div key={question.id} className="py-4">
                        <p className="mb-3 text-sm font-medium text-neutral-dark">
                          <span className="mr-1.5 font-bold text-teal">{qi + 1}.</span>
                          {question.text}
                        </p>

                        {showAnsweredState ? (
                          /* ── Answered state ── */
                          <div className="space-y-2">
                            {question.options.map((opt, oi) => {
                              const letter      = OPTION_LETTERS[oi]
                              const wasSelected = existingAnswer.answer_text === letter
                              const isCorrect   = existingAnswer.is_correct
                              const correctIdx  = pendingFeedback?.correct_option
                              const isCorrectOpt = correctIdx !== null && correctIdx !== undefined && oi === correctIdx

                              let rowStyle = 'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2'
                              if (wasSelected && isCorrect)  rowStyle = 'rounded-lg border border-green-300 bg-green-50 px-3 py-2'
                              if (wasSelected && !isCorrect) rowStyle = 'rounded-lg border border-red-300 bg-red-50 px-3 py-2'
                              if (!wasSelected && isCorrectOpt) rowStyle = 'rounded-lg border border-green-200 bg-green-50/60 px-3 py-2'

                              return (
                                <div key={letter} className={rowStyle}>
                                  <span className="text-xs font-semibold text-neutral-mid mr-2">{letter}.</span>
                                  <span className="text-sm text-neutral-dark">{opt}</span>
                                  {wasSelected && isCorrect  && <CheckCircle2 size={13} className="ml-2 inline text-green-500" />}
                                  {wasSelected && !isCorrect && <XCircle      size={13} className="ml-2 inline text-red-500" />}
                                  {!wasSelected && isCorrectOpt && <span className="ml-2 text-xs text-green-600 font-medium">← correct</span>}
                                </div>
                              )
                            })}

                            <div className="flex items-center gap-3 pt-1">
                              {existingAnswer.is_correct ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                  <CheckCircle2 size={13} /> Correct
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                                  <XCircle size={13} /> Incorrect
                                  {pendingFeedback?.correct_option !== null && pendingFeedback?.correct_option !== undefined
                                    ? ` — correct answer: ${OPTION_LETTERS[pendingFeedback.correct_option]}. ${question.options[pendingFeedback.correct_option]}`
                                    : ''}
                                </span>
                              )}
                              {!existingAnswer.is_correct && (
                                <button
                                  onClick={() => toggleRetry(question.id)}
                                  className="text-xs text-teal underline hover:no-underline"
                                >
                                  Try again
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* ── MCQ input state ── */
                          <div className="space-y-2">
                            {question.options.map((opt, oi) => {
                              const letter     = OPTION_LETTERS[oi]
                              const isSelected = currentSel === letter
                              return (
                                <label
                                  key={letter}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors
                                    ${isSelected
                                      ? 'border-teal bg-teal-light'
                                      : 'border-gray-200 bg-gray-50 hover:border-teal/50 hover:bg-teal-light/40'
                                    }`}
                                >
                                  <input
                                    type="radio"
                                    name={`${enrollment.id}-${question.id}`}
                                    value={letter}
                                    checked={isSelected}
                                    onChange={() => setSelected(prev => ({
                                      ...prev,
                                      [enrollment.id]: { ...(prev[enrollment.id] ?? {}), [question.id]: letter },
                                    }))}
                                    className="accent-teal"
                                  />
                                  <span className="text-xs font-semibold text-neutral-mid">{letter}.</span>
                                  <span className="text-sm text-neutral-dark">{opt}</span>
                                </label>
                              )
                            })}

                            {pendingFeedback && (
                              <p className={`flex items-center gap-1 text-xs font-medium pt-1
                                ${pendingFeedback.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                {pendingFeedback.is_correct
                                  ? <><CheckCircle2 size={13} /> Correct — well done!</>
                                  : <><XCircle size={13} /> Incorrect
                                    {pendingFeedback.correct_option !== null && pendingFeedback.correct_option !== undefined
                                      ? ` — correct answer: ${OPTION_LETTERS[pendingFeedback.correct_option]}. ${question.options[pendingFeedback.correct_option]}`
                                      : ''}
                                  </>
                                }
                              </p>
                            )}

                            <button
                              onClick={() => submitAnswer(enrollment.id, question.id)}
                              disabled={!currentSel || submitting === question.id}
                              className="mt-2 rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-40"
                            >
                              {submitting === question.id ? 'Checking…' : 'Submit answer'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Footer: complete button or completion banner */}
                {enrollment.status === 'complete' ? (
                  <div className="flex items-center gap-2 border-t border-green-50 bg-green-50/50 px-5 py-3 rounded-b-xl">
                    <CheckCircle2 size={15} className="text-green-500" />
                    <p className="text-sm font-medium text-green-700">Module complete — well done!</p>
                    {enrollment.completed_at && (
                      <span className="ml-auto text-xs text-neutral-mid">
                        {new Date(enrollment.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                ) : allAnswered ? (
                  <div className="border-t border-gray-100 px-5 py-4 rounded-b-xl">
                    <p className="mb-2 text-xs text-neutral-mid">You&apos;ve answered all questions — ready to mark this module complete?</p>
                    <button
                      onClick={() => completeModule(enrollment.id)}
                      disabled={completing === enrollment.id}
                      className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                    >
                      {completing === enrollment.id ? 'Marking complete…' : 'Mark module complete'}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── InductionView ────────────────────────────────────────────────────────────

function InductionView({ token }: { token: string }) {
  const api = createApiClient(token)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [completing,  setCompleting]  = useState<string | null>(null)
  const [answers,     setAnswers]     = useState<Record<string, string>>({})

  useEffect(() => {
    api.onboarding.myEnrollments()
      .then(d => setEnrollments(d.enrollments))
      .finally(() => setLoading(false))
  }, [])

  async function completeStep(enrollmentId: string, stepId: string, answerText?: string) {
    setCompleting(stepId)
    try {
      await api.onboarding.completeStep(enrollmentId, stepId, answerText ? { answer_text: answerText } : undefined)
      // Refresh
      const d = await api.onboarding.myEnrollments()
      setEnrollments(d.enrollments)
      setAnswers(prev => { const n = { ...prev }; delete n[stepId]; return n })
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {[1,2].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />)}
      </div>
    )
  }

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <GraduationCap size={36} className="text-gray-200" />
        <p className="font-medium text-neutral-dark">No induction assigned</p>
        <p className="text-sm text-neutral-mid">Your manager will assign an induction flow when you need to complete one.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-5 text-xl font-bold text-neutral-dark">My Induction</h2>
        <div className="space-y-6">
          {enrollments.map(e => {
            const done  = e.steps.filter((s: any) => s.progress?.completed_at).length
            const total = e.steps.length
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div key={e.enrollment_id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-neutral-dark">{e.flow_name}</p>
                    {e.completed_at
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Complete</span>
                      : <span className="text-xs text-neutral-mid">{done}/{total} steps</span>
                    }
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {e.due_date && !e.completed_at && (
                    <p className="mt-1.5 text-xs text-neutral-mid">
                      Due: {new Date(e.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="divide-y divide-gray-50 px-5">
                  {e.steps.map((step: any, i: number) => {
                    const isCompleted = !!step.progress?.completed_at
                    const isLocked    = i > 0 && !e.steps[i - 1].progress?.completed_at
                    return (
                      <div key={step.id} className={`py-4 ${isLocked ? 'opacity-40' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                            ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-neutral-mid'}`}>
                            {isCompleted ? <CheckCircle2 size={13} /> : i + 1}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${isCompleted ? 'text-neutral-mid line-through' : 'text-neutral-dark'}`}>
                              {step.title}
                            </p>
                            <p className="text-xs text-neutral-mid mt-0.5">
                              {step.type === 'read_policy' ? 'Read policy' : 'Answer question'}
                            </p>

                            {!isCompleted && !isLocked && step.type === 'read_policy' && (
                              <button
                                onClick={() => completeStep(e.enrollment_id, step.id)}
                                disabled={completing === step.id}
                                className="mt-3 rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                              >
                                {completing === step.id ? 'Marking done…' : 'Mark as read'}
                              </button>
                            )}

                            {!isCompleted && !isLocked && step.type === 'answer_question' && Array.isArray(step.options) && step.options.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-sm italic text-neutral-dark">&ldquo;{step.question}&rdquo;</p>
                                <div className="space-y-1.5">
                                  {step.options.map((opt: string, oi: number) => (
                                    <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm
                                      ${String(answers[step.id]) === String(oi) ? 'border-teal bg-teal-light/30 text-neutral-dark' : 'border-gray-200 text-neutral-dark hover:border-teal/50'}`}>
                                      <input
                                        type="radio"
                                        name={`mcq-${step.id}`}
                                        checked={String(answers[step.id]) === String(oi)}
                                        onChange={() => setAnswers(prev => ({ ...prev, [step.id]: String(oi) }))}
                                        className="text-teal"
                                      />
                                      {opt}
                                    </label>
                                  ))}
                                </div>
                                <button
                                  onClick={() => completeStep(e.enrollment_id, step.id, answers[step.id])}
                                  disabled={completing === step.id || answers[step.id] == null || answers[step.id] === ''}
                                  className="rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                                >
                                  {completing === step.id ? 'Checking…' : 'Submit answer'}
                                </button>
                                {step.progress?.answer_correct === false && (
                                  <p className="text-xs text-amber-600">That&rsquo;s not quite right — review the policy and try again.</p>
                                )}
                              </div>
                            )}

                            {!isCompleted && !isLocked && step.type === 'answer_question' && (!Array.isArray(step.options) || step.options.length === 0) && (
                              <div className="mt-3 space-y-2">
                                <p className="text-sm italic text-neutral-dark">&ldquo;{step.question}&rdquo;</p>
                                <textarea
                                  value={answers[step.id] ?? ''}
                                  onChange={e => setAnswers(prev => ({ ...prev, [step.id]: e.target.value }))}
                                  placeholder="Type your answer here…"
                                  rows={3}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
                                />
                                <button
                                  onClick={() => completeStep(e.enrollment_id, step.id, answers[step.id])}
                                  disabled={completing === step.id || !answers[step.id]?.trim()}
                                  className="rounded-lg bg-teal px-4 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50"
                                >
                                  {completing === step.id ? 'Checking answer…' : 'Submit answer'}
                                </button>
                                {step.progress?.answer_correct === false && (
                                  <p className="text-xs text-amber-600">That answer needs a bit more detail. Try again.</p>
                                )}
                              </div>
                            )}

                            {isCompleted && step.type === 'answer_question' && step.progress?.answer_text && (
                              <p className="mt-1.5 text-xs text-neutral-mid italic">&ldquo;{step.progress.answer_text}&rdquo;</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {e.completed_at && (
                  <div className="flex items-center gap-2 border-t border-green-50 bg-green-50/50 px-5 py-3 rounded-b-xl">
                    <CheckCircle2 size={15} className="text-green-500" />
                    <p className="text-sm font-medium text-green-700">
                      Induction complete — well done!
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
