'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Award, Loader2 } from 'lucide-react'

type Mod = Awaited<ReturnType<ReturnType<typeof createPlatformClient>['cpdReviews']>>['modules'][number]

const STATUS_STYLE: Record<string, string> = {
  not_reviewed:     'bg-gray-100 text-gray-600',
  reviewed:         'bg-green-100 text-green-700',
  needs_discussion: 'bg-amber-100 text-amber-700',
}
const STATUS_LABEL: Record<string, string> = {
  not_reviewed: 'Not reviewed', reviewed: 'Reviewed', needs_discussion: 'Needs discussion',
}

export default function CpdReviewPage() {
  const token = usePlatformAuth()
  const [modules, setModules] = useState<Mod[]>([])
  const [counts, setCounts]   = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).cpdReviews()
      .then(d => { setModules(d.modules); setCounts(d.counts) })
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  return (
    <PlatformShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-dark"><Award size={22} className="text-teal" /> CPD Review</h1>
          <p className="mt-1 text-sm text-neutral-mid">The assessor&rsquo;s notes and status for every standard annual training module. The assessor works through these in their locked-down account.</p>
        </div>

        {!loading && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-neutral-light px-3 py-1.5 font-semibold text-neutral-dark">{modules.length} modules</span>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <span key={v} className={`rounded-lg px-3 py-1.5 font-semibold ${STATUS_STYLE[v]}`}>{l}: {counts[v] ?? 0}</span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-neutral-mid" /></div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gray-200 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                <tr><th className="px-4 py-3">Module</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assessor notes</th><th className="px-4 py-3 whitespace-nowrap">Updated</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {modules.map(m => (
                  <tr key={m.id} className="align-top hover:bg-neutral-light/40">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium text-neutral-dark">{m.name}
                        {!m.approved && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Pending approval</span>}
                      </p>
                      {m.duration_minutes != null && <p className="text-xs text-neutral-mid">{m.duration_minutes} min · {m.duration_minutes ? Math.round((m.duration_minutes / 60) * 10) / 10 : 0} CPD hrs{m.pass_mark != null ? ` · pass ${m.pass_mark}%` : ''}</p>}
                    </td>
                    <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status] ?? STATUS_STYLE.not_reviewed}`}>{STATUS_LABEL[m.status] ?? m.status}</span></td>
                    <td className="px-4 py-3">{m.notes ? <p className="whitespace-pre-wrap text-neutral-dark">{m.notes}</p> : <span className="text-neutral-mid">—</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-mid">{m.updated_at ? new Date(m.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
