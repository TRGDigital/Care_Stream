'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPlatformClient, type ServiceRequest } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { LifeBuoy, Loader2, ImageIcon, Mail, Clock } from 'lucide-react'
import { clsx } from 'clsx'

const STATUSES = [
  { key: 'new',         label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved',    label: 'Resolved' },
]
const STATUS_STYLE: Record<string, string> = {
  new:         'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved:    'bg-green-50 text-green-700',
}

function fmtWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export default function ServiceRequestsPage() {
  const token = usePlatformAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [counts, setCounts]     = useState<Record<string, number>>({})
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [viewing, setViewing]   = useState<string | null>(null)

  const load = useCallback((f: string) => {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).serviceRequests.list(f)
      .then(d => { setRequests(d.requests); setCounts(d.counts) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load(filter) }, [load, filter])

  if (!token) return null

  async function setStatus(id: string, status: string) {
    setRequests(rs => rs.map(r => (r.id === id ? { ...r, status } : r)))
    try {
      await createPlatformClient(token!).serviceRequests.updateStatus(id, status)
      // Refresh the tab counts (and drop the row if it no longer matches the filter).
      load(filter)
    } catch { load(filter) }
  }

  async function viewImage(id: string) {
    setViewing(id)
    try {
      const blob = await createPlatformClient(token!).serviceRequests.fetchImage(id)
      window.open(URL.createObjectURL(blob), '_blank', 'noopener')
    } catch { /* ignore */ } finally { setViewing(null) }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <PlatformShell>
      <div className="max-w-4xl">
        <div className="mb-1 flex items-center gap-2">
          <LifeBuoy size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">Service Requests</h1>
        </div>
        <p className="mb-5 text-sm text-neutral-mid">Support requests raised by clients from Help &amp; Guides. Replies go by email (the client is CC&apos;d).</p>

        {/* Status filter tabs */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold', filter === 'all' ? 'bg-neutral-dark text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200')}>
            All <span className="opacity-70">{total}</span>
          </button>
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)} className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold', filter === s.key ? 'bg-neutral-dark text-white' : 'bg-gray-100 text-neutral-mid hover:bg-gray-200')}>
              {s.label} <span className="opacity-70">{counts[s.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</div>
        ) : requests.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">No service requests{filter !== 'all' ? ' with this status' : ' yet'}.</p>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-dark">{r.tenant_name ?? 'Unknown client'}</p>
                      {r.tenant_cs_number && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">{r.tenant_cs_number}</span>}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-mid">
                      <span>{r.submitter_name ?? '—'}</span>
                      {r.submitter_email && <a href={`mailto:${r.submitter_email}`} className="inline-flex items-center gap-1 text-teal hover:underline"><Mail size={11} /> {r.submitter_email}</a>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[r.status] ?? 'bg-gray-100 text-neutral-mid')}>{r.status.replace('_', ' ')}</span>
                    <select value={r.status} onChange={e => setStatus(r.id, e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                      {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <p className="whitespace-pre-wrap rounded-lg bg-neutral-light/50 px-3 py-2.5 text-sm text-neutral-dark">{r.message}</p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-mid"><Clock size={11} /> {fmtWhen(r.created_at)}</span>
                  {r.image_s3_key && (
                    <button onClick={() => viewImage(r.id)} disabled={viewing === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/40 disabled:opacity-50">
                      {viewing === r.id ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} View image
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
