'use client'

import { useEffect, useState } from 'react'
import { createPlatformClient, type TranslationChange } from '@/lib/platform-api'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { MessageSquareText, Loader2, Trash2, Building2 } from 'lucide-react'

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '',         label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TranslationChangesPage() {
  const token = usePlatformAuth()
  const [changes, setChanges] = useState<TranslationChange[]>([])
  const [counts,  setCounts]  = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [tab,     setTab]     = useState('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  function load() {
    if (!token) return
    setLoading(true)
    createPlatformClient(token).translationChanges.list(tab || undefined)
      .then(r => { setChanges(r.changes); setCounts(r.counts) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [token, tab])

  async function remove(id: string) {
    if (!token) return
    const prev = changes
    setChanges(c => c.filter(x => x.id !== id))
    try { await createPlatformClient(token).translationChanges.remove(id) }
    catch { setChanges(prev) }
  }

  return (
    <PlatformShell>
      <div className="max-w-5xl">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareText size={22} className="text-teal" />
          <h1 className="text-2xl font-bold text-neutral-dark">Translation changes</h1>
        </div>
        <p className="mb-5 max-w-3xl text-sm text-neutral-mid">
          Every human-verified translation staff have suggested or edited, across all care settings. Approved changes
          replace the machine translation for that exact phrase in that language, for that care setting only. Use this to
          see what&rsquo;s being created and edited, and against which care setting.
        </p>

        {/* Roll-up + tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? 'bg-teal text-white' : 'bg-white text-neutral-mid hover:text-neutral-dark border border-gray-200'}`}>
              {t.label}
              {t.key === 'pending' && counts.pending > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs text-amber-700">{counts.pending}</span>}
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral-mid">{counts.total} total · {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected</span>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</div>
        ) : changes.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-neutral-mid">No translation changes{tab ? ` with status “${tab}”` : ''} yet.</p>
        ) : (
          <div className="space-y-3">
            {changes.map(c => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-medium text-neutral-dark"><Building2 size={12} className="text-teal" /> {c.tenant_name}</span>
                  {c.account_number && <span className="text-neutral-mid">{c.account_number}</span>}
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-600">{c.lang_name}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                  {c.content_kind && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">{c.content_kind}</span>}
                  <span className="ml-auto text-neutral-mid">{fmt(c.updated_at)}</span>
                  <button onClick={() => remove(c.id)} className="text-neutral-mid hover:text-red-500" title="Delete this override"><Trash2 size={13} /></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded bg-neutral-light/60 p-2">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">English source</p>
                    <p className="text-xs text-neutral-dark">{c.source_text}</p>
                  </div>
                  <div className="rounded bg-neutral-light/60 p-2">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Machine translation</p>
                    <p className="text-xs text-neutral-mid">{c.machine_text || '—'}</p>
                  </div>
                  <div className="rounded bg-teal-light/30 p-2">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">Human suggestion</p>
                    <p className="text-xs text-neutral-dark">{c.suggested_text}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-neutral-mid">
                  Suggested by {c.suggested_by_name || 'staff'}{c.reviewed_by ? ` · reviewed by ${c.reviewed_by}` : ''}{c.context_label ? ` · ${c.context_label}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
