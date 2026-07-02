'use client'

// Staff hub: "Supervisions / Appraisals" — the signed-in staff member's own
// booked (upcoming) and past supervisions and appraisals. Read-only; managers
// book and record them on the admin Workforce compliance page.

import { useEffect, useState } from 'react'
import { createApiClient, type SupRecord } from '@/lib/api-client'
import { CalendarDays, CheckCircle2 } from 'lucide-react'

function startOfToday(): number { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
function fmtLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

export function SupervisionsHubView({ token }: { token: string }) {
  const [records, setRecords] = useState<SupRecord[] | null>(null)
  useEffect(() => {
    createApiClient(token).me.supervisions().then(d => setRecords(d.records)).catch(() => setRecords([]))
  }, [token])

  if (records === null) {
    return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}</div>
  }

  const today    = startOfToday()
  const upcoming = records.filter(r => new Date(r.held_on).getTime() >= today).sort((a, b) => new Date(a.held_on).getTime() - new Date(b.held_on).getTime())
  const past     = records.filter(r => new Date(r.held_on).getTime() <  today).sort((a, b) => new Date(b.held_on).getTime() - new Date(a.held_on).getTime())

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-dark">My supervisions &amp; appraisals</h2>
          <p className="mt-0.5 text-sm text-neutral-mid">Your booked sessions and past history.</p>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <CalendarDays size={36} className="text-gray-200" />
            <p className="font-medium text-neutral-dark">Nothing booked yet</p>
            <p className="text-sm text-neutral-mid">When your manager books a supervision or appraisal, it will appear here.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Upcoming</p>
                <div className="space-y-3">
                  {upcoming.map(r => (
                    <div key={r.id} className="rounded-xl border border-teal/30 bg-teal-light/20 p-4">
                      <div className="flex items-center gap-3">
                        <CalendarDays size={18} className="shrink-0 text-teal" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold capitalize text-neutral-dark">{r.type}</p>
                          <p className="text-xs text-neutral-mid">{fmtLong(r.held_on)}{r.conducted_by ? ` · with ${r.conducted_by}` : ''}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-teal px-2 py-0.5 text-[10px] font-medium text-white">Booked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">Past</p>
                <div className="divide-y divide-gray-50 rounded-xl border border-gray-200 bg-white">
                  {past.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm capitalize text-neutral-dark">{r.type}</p>
                        <p className="text-xs text-neutral-mid">{fmtLong(r.held_on)}{r.conducted_by ? ` · with ${r.conducted_by}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
