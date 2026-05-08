'use client'

// §14.7 — Query history: one row per chat session, expanded details, full-conversation modal.

import { Fragment, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { BookOpen, ChevronDown, ChevronUp, MessageSquare, Users, X } from 'lucide-react'

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog', yor: 'Yoruba',  ben: 'Bengali',    urd: 'Urdu',
  zho: 'Chinese', ara: 'Arabic',  ita: 'Italian',    lit: 'Lithuanian',
}

const CATEGORY_LABELS: Record<string, { label: string; short: string }> = {
  internal_policy: { label: 'Policies & Procedures', short: 'Policies' },
  staff_handbook:  { label: 'Staff Handbook',         short: 'Handbook' },
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function sessionRef(sessionKey: string): string {
  return 'REF-' + sessionKey.replace(/-/g, '').slice(0, 6).toUpperCase()
}

interface ModalSession {
  row:      any
  messages: any[]
  loading:  boolean
}

export default function QueriesPage() {
  const { data: session }       = useSession()
  const [queries,  setQueries]  = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal,    setModal]    = useState<ModalSession | null>(null)
  const [filter,   setFilter]   = useState({
    language_detected: '',
    no_match:          '',
    document_category: '',
  })

  const LIMIT = 20

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: String(LIMIT) }
    if (filter.language_detected) params.language_detected = filter.language_detected
    if (filter.no_match)          params.no_match          = filter.no_match
    if (filter.document_category) params.document_category = filter.document_category

    createApiClient(session.accessToken).query.list(params)
      .then(data => { setQueries(data?.queries ?? []); setTotal(data?.total ?? 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken, page, filter])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function openModal(row: any) {
    if (row.chat_session_id && row.message_count > 1 && session?.accessToken) {
      setModal({ row, messages: [], loading: true })
      try {
        const data = await createApiClient(session.accessToken).query.session(row.chat_session_id)
        setModal({ row, messages: data.messages, loading: false })
      } catch {
        setModal({ row, messages: [{ query_text: row.first_query, response_text: row.response_text, created_at: row.created_at, no_match: row.any_no_match }], loading: false })
      }
    } else {
      setModal({ row, messages: [{ query_text: row.first_query, response_text: row.response_text, created_at: row.created_at, no_match: row.any_no_match }], loading: false })
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <>
      <div>
        <h1 className="mb-1 text-2xl font-bold text-neutral-dark">Recent queries</h1>
        <p className="mb-6 text-sm text-neutral-mid">
          Every chat session started by your staff — who asked, when, and whether policies were found.
        </p>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <select value={filter.document_category} onChange={e => { setFilter(f => ({ ...f, document_category: e.target.value })); setPage(1) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal">
            <option value="">All areas</option>
            <option value="internal_policy">Policies & Procedures</option>
            <option value="staff_handbook">Staff Handbook</option>
          </select>
          <select value={filter.no_match} onChange={e => { setFilter(f => ({ ...f, no_match: e.target.value })); setPage(1) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal">
            <option value="">All results</option>
            <option value="false">Matched only</option>
            <option value="true">No match only</option>
          </select>
          <select value={filter.language_detected} onChange={e => { setFilter(f => ({ ...f, language_detected: e.target.value })); setPage(1) }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal">
            <option value="">All languages</option>
            {Object.entries(LANG_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-neutral-mid">
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">Matched</span>
            The question was answered using one or more of your uploaded policies.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-600">No match</span>
            No relevant policy was found — consider uploading a policy that covers this topic.
          </span>
        </div>

        <div className="rounded-card bg-white shadow-card">
          {loading ? (
            <p className="px-6 py-6 text-sm text-neutral-mid">Loading…</p>
          ) : queries.length === 0 ? (
            <p className="px-6 py-6 text-sm text-neutral-mid">No queries found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Staff member</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">First question</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Area</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Language</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Result</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Last active</th>
                      <th className="px-6 py-3 text-xs font-medium text-neutral-mid"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map((q: any) => (
                      <Fragment key={q.session_key}>
                        {/* Summary row */}
                        <tr
                          className="cursor-pointer border-b border-gray-50 hover:bg-neutral-light/50"
                          onClick={() => toggleExpand(q.session_key)}
                        >
                          <td className="px-6 py-3">
                            {q.user ? (
                              <div>
                                <p className="font-medium text-neutral-dark">{q.user.name}</p>
                                <p className="text-xs text-neutral-mid">{q.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-neutral-mid">{q.channel === 'email' ? 'Email' : '—'}</span>
                            )}
                          </td>
                          <td className="max-w-xs px-6 py-3">
                            <p className="line-clamp-2 text-neutral-dark">{q.first_query}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">
                                {sessionRef(q.session_key)}
                              </span>
                              {q.message_count > 1 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-light px-2 py-0.5 text-xs text-teal">
                                  <MessageSquare size={10} />
                                  {q.message_count} messages
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            {q.document_category_queried ? (
                              <span className="flex items-center gap-1 text-xs text-neutral-mid">
                                {q.document_category_queried === 'internal_policy'
                                  ? <BookOpen size={11} className="text-teal" />
                                  : <Users    size={11} className="text-teal" />}
                                {CATEGORY_LABELS[q.document_category_queried]?.short ?? q.document_category_queried}
                              </span>
                            ) : <span className="text-xs text-neutral-mid">—</span>}
                          </td>
                          <td className="px-6 py-3 text-xs text-neutral-mid">
                            {LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              q.any_no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                            }`}>
                              {q.any_no_match ? 'No match' : 'Matched'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-3 text-xs text-neutral-mid">
                            {q.last_message_at ? formatDateTime(q.last_message_at) : '—'}
                          </td>
                          <td className="px-6 py-3 text-neutral-mid">
                            {expanded.has(q.session_key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {expanded.has(q.session_key) && (
                          <tr className="border-b border-gray-100 bg-neutral-light/40">
                            <td colSpan={7} className="px-6 py-5">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Reference</p>
                                  <p className="mt-0.5 text-sm font-medium text-teal">{sessionRef(q.session_key)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Staff member</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">{q.user?.name ?? '—'}</p>
                                  {q.user?.email && <p className="text-xs text-neutral-mid">{q.user.email}</p>}
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Channel</p>
                                  <p className="mt-0.5 text-sm capitalize text-neutral-dark">{q.channel ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Messages sent</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">{q.message_count}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Responses generated</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">{q.message_count}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Knowledge area</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">
                                    {q.document_category_queried
                                      ? CATEGORY_LABELS[q.document_category_queried]?.label ?? q.document_category_queried
                                      : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Language</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">
                                    {LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Total response time</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">
                                    {q.total_response_time_ms ? formatMs(q.total_response_time_ms) : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Result</p>
                                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    q.any_no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                                  }`}>
                                    {q.any_no_match ? 'No match found' : 'Policy matched'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Session started</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">
                                    {q.started_at ? formatDateTime(q.started_at) : '—'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-mid">Last active</p>
                                  <p className="mt-0.5 text-sm text-neutral-dark">
                                    {q.last_message_at ? formatDateTime(q.last_message_at) : '—'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={e => { e.stopPropagation(); openModal(q) }}
                                  className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
                                >
                                  <MessageSquare size={14} />
                                  View full interaction
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-xs text-neutral-mid">
                  Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="rounded px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-40">
                      Previous
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="rounded px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-40">
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full interaction modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-semibold text-neutral-dark">
                  Full interaction — {modal.row.message_count} {modal.row.message_count === 1 ? 'message' : 'messages'}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-mid">
                  <span className="font-medium text-teal">{sessionRef(modal.row.session_key)}</span>
                  {' '}&middot;{' '}{modal.row.user?.name ?? 'Unknown'} &middot; {formatDateTime(modal.row.created_at)}
                  {modal.row.document_category_queried && (
                    <> &middot; {CATEGORY_LABELS[modal.row.document_category_queried]?.label}</>
                  )}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Conversation thread */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {modal.loading ? (
                <p className="py-8 text-center text-sm text-neutral-mid">Loading conversation…</p>
              ) : (
                modal.messages.map((msg, i) => (
                  <div key={i} className="space-y-3">
                    {/* Question */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal px-4 py-3 text-sm leading-relaxed text-white">
                        {msg.query_text}
                      </div>
                    </div>
                    {/* Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-neutral-light px-4 py-3">
                        {msg.response_text ? (
                          <div
                            className="message-content text-sm leading-relaxed text-neutral-dark"
                            dangerouslySetInnerHTML={{ __html: msg.response_text }}
                          />
                        ) : (
                          <p className="text-sm text-neutral-mid">Response not available.</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 border-t border-gray-200 pt-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            msg.no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                          }`}>
                            {msg.no_match ? 'No match' : 'Matched'}
                          </span>
                          {msg.response_time_ms && (
                            <span className="text-xs text-neutral-mid">
                              {formatMs(msg.response_time_ms)}
                            </span>
                          )}
                          {msg.created_at && (
                            <span className="ml-auto text-xs text-neutral-mid">
                              {formatDateTime(msg.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-100 px-6 py-3">
              <button onClick={() => setModal(null)} className="rounded-md px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
