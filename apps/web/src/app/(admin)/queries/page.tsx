'use client'

// §14.7 — Query history: filterable table, click to expand full exchange.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { BookOpen, ChevronDown, ChevronUp, Users } from 'lucide-react'

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

export default function QueriesPage() {
  const { data: session }         = useSession()
  const [queries,  setQueries]    = useState<any[]>([])
  const [total,    setTotal]      = useState(0)
  const [page,     setPage]       = useState(1)
  const [loading,  setLoading]    = useState(true)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())
  const [filter,   setFilter]     = useState({
    intent_type:       '',
    language_detected: '',
    no_match:          '',
    document_category: '',
  })

  const LIMIT = 20

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    const params: Record<string, string> = { page: String(page), limit: String(LIMIT) }
    if (filter.intent_type)        params.intent_type        = filter.intent_type
    if (filter.language_detected)  params.language_detected  = filter.language_detected
    if (filter.no_match)           params.no_match           = filter.no_match
    if (filter.document_category)  params.document_category  = filter.document_category

    const api = createApiClient(session.accessToken)
    api.query.list(params)
      .then(data => {
        setQueries(data?.queries ?? data?.items ?? [])
        setTotal(data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken, page, filter])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setFilterField(field: string, value: string) {
    setFilter(f => ({ ...f, [field]: value }))
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-neutral-dark">Recent queries</h1>
      <p className="mb-6 text-sm text-neutral-mid">
        Every question asked by your staff — who asked it, when, and whether it matched a policy.
      </p>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filter.document_category}
          onChange={e => setFilterField('document_category', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
        >
          <option value="">All areas</option>
          <option value="internal_policy">Policies & Procedures</option>
          <option value="staff_handbook">Staff Handbook</option>
        </select>
        <select
          value={filter.intent_type}
          onChange={e => setFilterField('intent_type', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
        >
          <option value="">All intents</option>
          <option value="summary">Summary</option>
          <option value="full_policy">Full policy</option>
          <option value="follow_up">Follow-up</option>
        </select>
        <select
          value={filter.no_match}
          onChange={e => setFilterField('no_match', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
        >
          <option value="">All results</option>
          <option value="false">Matched only</option>
          <option value="true">No match only</option>
        </select>
        <select
          value={filter.language_detected}
          onChange={e => setFilterField('language_detected', e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal"
        >
          <option value="">All languages</option>
          {Object.entries(LANG_NAMES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
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
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Query</th>
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Area</th>
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Language</th>
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Match?</th>
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Date &amp; time</th>
                    <th className="px-6 py-3 text-xs font-medium text-neutral-mid"></th>
                  </tr>
                </thead>
                <tbody>
                  {queries.map((q: any) => (
                    <>
                      <tr
                        key={q.id}
                        className="cursor-pointer border-b border-gray-50 hover:bg-neutral-light/50"
                        onClick={() => toggleExpand(q.id)}
                      >
                        {/* Staff member */}
                        <td className="px-6 py-3">
                          {q.user ? (
                            <div>
                              <p className="font-medium text-neutral-dark">{q.user.name}</p>
                              <p className="text-xs text-neutral-mid">{q.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-neutral-mid">
                              {q.channel === 'email' ? 'Email' : '—'}
                            </span>
                          )}
                        </td>

                        {/* Query text */}
                        <td className="max-w-xs px-6 py-3">
                          <span className="line-clamp-2 text-neutral-dark">{q.query_text}</span>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-3">
                          {q.document_category_queried ? (
                            <span className="flex items-center gap-1 text-xs text-neutral-mid">
                              {q.document_category_queried === 'internal_policy'
                                ? <BookOpen size={11} className="text-teal" />
                                : <Users    size={11} className="text-teal" />}
                              {CATEGORY_LABELS[q.document_category_queried]?.short ?? q.document_category_queried}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-mid">—</span>
                          )}
                        </td>

                        {/* Language */}
                        <td className="px-6 py-3 text-xs text-neutral-mid">
                          {LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—'}
                        </td>

                        {/* Match */}
                        <td className="px-6 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            q.no_match
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-green-50 text-green-700'
                          }`}>
                            {q.no_match ? 'No match' : 'Matched'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-6 py-3 text-xs text-neutral-mid">
                          {q.created_at ? formatDateTime(q.created_at) : '—'}
                        </td>

                        <td className="px-6 py-3 text-neutral-mid">
                          {expanded.has(q.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {expanded.has(q.id) && (
                        <tr key={`${q.id}-expanded`} className="border-b border-gray-100 bg-neutral-light/30">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="mb-3 flex flex-wrap gap-4 text-xs text-neutral-mid">
                              {q.intent_type && (
                                <span>Intent: <span className="font-medium text-neutral-dark">{q.intent_type}</span></span>
                              )}
                              {q.response_time_ms && (
                                <span>Response time: <span className="font-medium text-neutral-dark">{q.response_time_ms}ms</span></span>
                              )}
                              {q.channel && (
                                <span>Channel: <span className="font-medium text-neutral-dark">{q.channel}</span></span>
                              )}
                            </div>
                            <p className="mb-2 text-xs font-semibold uppercase text-neutral-mid">Response</p>
                            <div
                              className="message-content text-sm text-neutral-dark"
                              dangerouslySetInnerHTML={{ __html: q.response_text ?? '—' }}
                            />
                          </td>
                        </tr>
                      )}
                    </>
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
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
