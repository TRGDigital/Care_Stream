'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Lightbulb, Loader2, Building2 } from 'lucide-react'

type Req = Awaited<ReturnType<ReturnType<typeof createPlatformClient>['featureRequests']['list']>>['requests'][number]

const STATUSES = ['new', 'reviewing', 'planned', 'done', 'declined'] as const
const STATUS_STYLE: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  reviewing: 'bg-amber-100 text-amber-700',
  planned:   'bg-purple-100 text-purple-700',
  done:      'bg-green-100 text-green-700',
  declined:  'bg-gray-100 text-gray-600',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function FeatureRequestsPage() {
  const token = usePlatformAuth()
  const [requests, setRequests] = useState<Req[]>([])
  const [counts, setCounts]     = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>('all')

  function load() {
    if (!token) return
    createPlatformClient(token).featureRequests.list()
      .then(d => { setRequests(d.requests); setCounts(d.counts) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [token])

  async function setStatus(id: string, status: string) {
    if (!token) return
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status } : r))
    await createPlatformClient(token).featureRequests.updateStatus(id, status).catch(() => load())
  }

  if (!token) return null
  const shown = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark"><Lightbulb size={22} className="text-teal" /> Feature Requests</h1>
          <p className="mt-1 text-sm text-neutral-mid">Ideas submitted by clients from the Help &amp; Guides page. Update a status to track what you are working on.</p>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === 'all' ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid hover:bg-gray-200'}`}>
            All <span className="opacity-70">{requests.length}</span>
          </button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${filter === s ? 'bg-teal text-white' : 'bg-neutral-light text-neutral-mid hover:bg-gray-200'}`}>
              {s} <span className="opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : shown.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-neutral-mid">No feature requests{filter !== 'all' ? ` with status “${filter}”` : ' yet'}.</div>
        ) : (
          <div className="space-y-3">
            {shown.map(r => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-dark">{r.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-mid">
                      <span className="inline-flex items-center gap-1"><Building2 size={11} />{r.tenant_name ?? 'Unknown client'}</span>
                      {r.submitter_name && <span>· {r.submitter_name}</span>}
                      {r.submitter_email && <span>· {r.submitter_email}</span>}
                      <span>· {fmt(r.created_at)}</span>
                    </p>
                  </div>
                  <select value={r.status} onChange={e => setStatus(r.id, e.target.value)} className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-dark">{r.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
