'use client'

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { CalendarDays, AlertTriangle, CheckCircle2, GraduationCap } from 'lucide-react'

// Admin-only hub view: who missed face-to-face sessions, and whether they've
// completed the digital module they were allocated as a catch-up.
export function F2FAdminView({ token }: { token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    createApiClient(token).faceToFace.analytics()
      .then(setData).catch(() => setError(true)).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="flex-1 space-y-3 overflow-y-auto p-6">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>

  if (error) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <AlertTriangle size={32} className="text-amber-400" />
      <p className="font-medium text-neutral-dark">Couldn&apos;t load face-to-face training</p>
      <p className="text-sm text-neutral-mid">Please try again.</p>
    </div>
  )

  const summary = data?.summary ?? { sessions: 0, missed: 0, modules_assigned: 0, assigned_incomplete: 0 }
  const staff: any[] = data?.by_staff ?? []

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-neutral-dark"><CalendarDays size={20} className="text-teal" /> F2F Training</h2>
        <p className="mb-5 text-sm text-neutral-mid">Who missed face-to-face sessions, and whether they&apos;ve completed the digital module they were allocated as a catch-up.</p>

        {summary.sessions === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <CalendarDays size={36} className="text-gray-200" />
            <p className="font-medium text-neutral-dark">No face-to-face sessions logged yet</p>
            <p className="text-sm text-neutral-mid">Add sessions in the admin console under Training, then attendance shows here.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-2xl font-bold text-neutral-dark">{summary.sessions}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Sessions</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className={`text-2xl font-bold ${summary.missed > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{summary.missed}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Marked missed</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{summary.modules_assigned}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Modules sent</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
                <p className={`text-2xl font-bold ${summary.assigned_incomplete > 0 ? 'text-orange-600' : 'text-green-600'}`}>{summary.assigned_incomplete}</p>
                <p className="mt-0.5 text-xs text-neutral-mid">Not completed</p>
              </div>
            </div>

            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-10 text-center">
                <CheckCircle2 size={28} className="text-green-400" />
                <p className="text-sm font-medium text-neutral-dark">No missed sessions</p>
                <p className="text-xs text-neutral-mid">Everyone allocated has attended their face-to-face training.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staff.map((s: any) => (
                  <div key={s.user_id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-neutral-dark">{s.name}</p>
                        <p className="text-xs text-neutral-mid">{s.job_role || 'Staff member'} · attended {s.attended}/{s.allocated}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {s.missed > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">{s.missed} missed</span>}
                        {s.assigned_incomplete > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 font-semibold text-orange-600">{s.assigned_incomplete} to complete</span>}
                      </div>
                    </div>
                    {s.missed_sessions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {s.missed_sessions.map((ms: any, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-neutral-light/40 px-2 py-1 text-xs text-neutral-dark">
                            <GraduationCap size={11} className="text-teal" />
                            {ms.title}
                            {ms.module_assigned
                              ? (ms.completion === 'complete'
                                  ? <span className="rounded-full bg-green-50 px-1.5 text-[10px] font-medium text-green-600">completed</span>
                                  : <span className="rounded-full bg-orange-50 px-1.5 text-[10px] font-medium text-orange-600">{ms.completion === 'in_progress' ? 'in progress' : 'not started'}</span>)
                              : <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-neutral-mid">not sent</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
