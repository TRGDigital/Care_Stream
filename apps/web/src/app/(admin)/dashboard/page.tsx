'use client'

// §14.7 — Dashboard home: stat cards + recent query table.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { BookOpen, Users } from 'lucide-react'

interface Stats {
  activePolicies: string
  staffCount:     string
  totalQueries:   string
}

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog', yor: 'Yoruba',  ben: 'Bengali',    urd: 'Urdu',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<Stats>({ activePolicies: '—', staffCount: '—', totalQueries: '—' })
  const [queries,  setQueries]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)

    Promise.allSettled([
      api.policies.list({ status: 'active', limit: '1' }),
      api.users.list(),
      api.query.list({ limit: '10' }),
    ]).then(([policiesRes, usersRes, queriesRes]) => {
      setStats({
        activePolicies: policiesRes.status === 'fulfilled' ? String(policiesRes.value?.total ?? '—') : '—',
        staffCount:     usersRes.status   === 'fulfilled' ? String(usersRes.value?.total ?? (Array.isArray(usersRes.value) ? usersRes.value.length : '—')) : '—',
        totalQueries:   queriesRes.status === 'fulfilled' ? String(queriesRes.value?.total ?? '—') : '—',
      })
      if (queriesRes.status === 'fulfilled') {
        setQueries(queriesRes.value?.queries ?? queriesRes.value?.items ?? [])
      }
    }).finally(() => setLoading(false))
  }, [session?.accessToken])

  const CARDS = [
    { label: 'Active policies', value: stats.activePolicies, accent: true  },
    { label: 'Staff members',   value: stats.staffCount,     accent: false },
    { label: 'Total queries',   value: stats.totalQueries,   accent: false },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Dashboard</h1>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CARDS.map(card => (
          <div key={card.label} className="rounded-card bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-neutral-mid">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.accent ? 'text-teal' : 'text-neutral-dark'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent queries */}
      <div className="rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Recent queries</h2>
          <a href="/queries" className="text-sm font-medium text-teal hover:underline">View all</a>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">Loading…</p>
        ) : queries.length === 0 ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">No queries yet — staff can start asking questions from the chat portal.</p>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {queries.map((q: any) => (
                  <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50">
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
                      <span className="line-clamp-2 text-neutral-dark">{q.query_text}</span>
                    </td>
                    <td className="px-6 py-3">
                      {q.document_category_queried ? (
                        <span className="flex items-center gap-1 text-xs text-neutral-mid">
                          {q.document_category_queried === 'internal_policy'
                            ? <BookOpen size={11} className="text-teal" />
                            : <Users    size={11} className="text-teal" />}
                          {q.document_category_queried === 'internal_policy' ? 'Policies' : 'Handbook'}
                        </span>
                      ) : <span className="text-xs text-neutral-mid">—</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-neutral-mid">
                      {LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                      }`}>
                        {q.no_match ? 'No match' : 'Matched'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-xs text-neutral-mid">
                      {q.created_at ? formatDateTime(q.created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
