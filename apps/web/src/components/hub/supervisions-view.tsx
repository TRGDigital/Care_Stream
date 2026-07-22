'use client'

// Staff hub: "Supervisions / Appraisals" — the signed-in staff member's own
// booked (upcoming) and past supervisions and appraisals. Read-only; managers
// book and record them on the admin Workforce compliance page.

import { useEffect, useState } from 'react'
import { createApiClient, type SupRecord } from '@/lib/api-client'
import { persistentCache, hubKey } from '@/lib/page-cache'
import { CalendarDays, CheckCircle2, ClipboardList, FileEdit } from 'lucide-react'
import { SupervisionForm } from './supervision-form'

type Conducting = { id: string; type: string; held_on: string; status: string; next_due: string | null; completed_at: string | null; supervisee_id: string; supervisee: string; supervisee_role: string | null }

function startOfToday(): number { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }
function fmtLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

export function SupervisionsHubView({ token, userId }: { token: string; userId?: string }) {
  const cacheKey = hubKey('supervisions', userId ?? 'me')
  const cached = persistentCache.get<SupRecord[]>(cacheKey)
  const [records, setRecords] = useState<SupRecord[] | null>(cached ?? null)
  const [conducting, setConducting] = useState<Conducting[]>([])
  const [formId, setFormId] = useState<string | null>(null)

  function loadConducting() {
    createApiClient(token).me.conducting().then(d => setConducting(d.records)).catch(() => {})
  }
  useEffect(() => {
    createApiClient(token).me.supervisions()
      .then(d => { setRecords(d.records); persistentCache.set(cacheKey, d.records) })
      .catch(() => setRecords(r => r ?? []))
    loadConducting()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (records === null) {
    return <div className="flex-1 space-y-4 overflow-y-auto p-6">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />)}</div>
  }

  const today    = startOfToday()
  const upcoming = records.filter(r => new Date(r.held_on).getTime() >= today).sort((a, b) => new Date(a.held_on).getTime() - new Date(b.held_on).getTime())
  const past     = records.filter(r => new Date(r.held_on).getTime() <  today).sort((a, b) => new Date(b.held_on).getTime() - new Date(a.held_on).getTime())

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Sessions I'm conducting — complete the recording form here (conductors only) */}
        {conducting.length > 0 && (
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-dark"><ClipboardList size={20} className="text-teal" /> Supervisions I&rsquo;m conducting</h2>
            <p className="mt-0.5 text-sm text-neutral-mid">Sessions assigned to you. Complete the recording form for each.</p>
            <div className="mt-3 space-y-2">
              {conducting.map(c => {
                const done = c.status === 'completed'
                return (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold capitalize text-neutral-dark">{c.type} — {c.supervisee}{c.supervisee_role ? <span className="font-normal text-neutral-mid"> · {c.supervisee_role}</span> : null}</p>
                      <p className="text-xs text-neutral-mid">{fmtLong(c.held_on)}{done && c.completed_at ? ` · recorded ${new Date(c.completed_at).toLocaleDateString('en-GB')}` : ''}</p>
                    </div>
                    <button onClick={() => setFormId(c.id)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium ${done ? 'border border-gray-200 text-neutral-mid hover:bg-neutral-light' : 'bg-teal text-white hover:bg-teal-dark'}`}>
                      <FileEdit size={13} /> {done ? 'View / edit form' : 'Complete form'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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

      {formId && <SupervisionForm token={token} supervisionId={formId} onClose={() => setFormId(null)} onSaved={loadConducting} />}
    </div>
  )
}
