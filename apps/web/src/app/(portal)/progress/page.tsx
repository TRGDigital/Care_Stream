'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { InfoTip } from '@/components/info-tip'
import { Award, Brain, CheckCircle2, ListChecks, Loader2, Sparkles, TrendingUp } from 'lucide-react'

// English fallback so the page always renders even if the localised bundle is missing.
const EN: Record<string, string> = {
  title: 'My Progress', subtitle: 'Your training and induction at a glance.',
  ring_training: 'Training', ring_induction: 'Induction', ring_score: 'Avg score',
  outstanding_title: 'You have {n} item(s) to finish', outstanding_caught: "You're all caught up — everything assigned is complete.",
  btn_training: 'Training', btn_induction: 'Induction',
  compare_title: 'How you compare', compare_team: 'team',
  training_title: 'My training', induction_title: 'My induction', open: 'Open',
  none_training: 'Nothing assigned yet.', none_induction: 'No induction assigned.', steps: '{done}/{total} steps',
  activity_title: 'Recent activity',
  status_complete: 'Done', status_in_progress: 'In progress', status_not_started: 'To do', status_expired: 'Renew',
  info_rings: '', info_outstanding: '', info_compare: '', info_training: '', info_induction: '', info_activity: '',
}

function Ring({ pct, label }: { pct: number | null; label: string }) {
  const v = pct ?? 0
  const colour = v >= 80 ? '#1A6B45' : v >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f1f1" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={colour} strokeWidth="3.5" strokeDasharray={`${v} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-neutral-dark">{pct == null ? '—' : `${v}%`}</span>
      </div>
      <span className="mt-1.5 text-center text-xs text-neutral-mid">{label}</span>
    </div>
  )
}

function StatusPill({ status, ui }: { status: string; ui: Record<string, string> }) {
  const cls: Record<string, string> = {
    complete: 'bg-green-50 text-green-700', in_progress: 'bg-amber-50 text-amber-700',
    not_started: 'bg-gray-100 text-gray-500', expired: 'bg-red-50 text-red-600',
  }
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls[status] ?? 'bg-gray-100 text-gray-500'}`}>{ui[`status_${status}`] ?? status}</span>
}

export default function MyProgressPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const [rec, setRec]         = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    createApiClient(token).me.progress().then(setRec).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-neutral-mid" /></div>
  if (!rec)    return <div className="flex flex-1 items-center justify-center text-sm text-neutral-mid">Couldn’t load your progress.</div>

  const ui = { ...EN, ...(rec.ui ?? {}) }
  const t  = rec.training.summary
  const o  = rec.onboarding.summary
  const outstanding   = (t.assigned - t.completed) + (o.assigned - o.completed)
  const outTraining   = t.assigned - t.completed
  const outInduction  = o.assigned - o.completed
  const b = rec.benchmarks

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">{ui.title}</h1>
          <p className="mt-1 text-sm text-neutral-mid">{ui.subtitle}</p>
        </div>

        {/* Rings */}
        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
          <div className="mb-1 flex justify-end">{ui.info_rings && <InfoTip text={ui.info_rings} align="right" />}</div>
          <div className="flex items-center justify-around">
            <Ring pct={t.completion_pct} label={ui.ring_training} />
            <Ring pct={o.completion_pct} label={ui.ring_induction} />
            <Ring pct={t.avg_score} label={ui.ring_score} />
          </div>
        </div>

        {/* Outstanding */}
        {outstanding > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-card border border-teal/20 bg-teal-light/30 px-5 py-4">
            <div className="flex items-start gap-1.5">
              <p className="text-sm font-semibold text-neutral-dark">{ui.outstanding_title.replace('{n}', String(outstanding)).replace('(s)', outstanding === 1 ? '' : 's')}</p>
              {ui.info_outstanding && <InfoTip text={ui.info_outstanding} />}
            </div>
            <div className="flex shrink-0 gap-2">
              {outInduction > 0 && <Link href="/chat?view=induction" className="rounded-lg border border-teal px-3 py-2 text-xs font-medium text-teal hover:bg-teal-light/50">{ui.btn_induction}</Link>}
              {outTraining > 0 && <Link href="/chat?view=training" className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-white hover:bg-teal/90">{ui.btn_training}</Link>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-card border border-green-200 bg-green-50/60 px-5 py-4">
            <CheckCircle2 size={18} className="shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-700">{ui.outstanding_caught} 🎉</p>
          </div>
        )}

        {/* Benchmark */}
        {b && (b.training_completion.team != null || b.avg_score.team != null) && (
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Award size={15} className="text-teal" /> {ui.compare_title} {ui.info_compare && <InfoTip text={ui.info_compare} />}</p>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              {[
                { label: ui.ring_training, self: b.training_completion.self, team: b.training_completion.team },
                { label: ui.ring_score,    self: b.avg_score.self,           team: b.avg_score.team },
                { label: ui.ring_induction, self: b.onboarding_completion.self, team: b.onboarding_completion.team },
              ].map((x, i) => (
                <div key={i}>
                  <p className="text-xs text-neutral-mid">{x.label}</p>
                  <p className="text-lg font-bold text-neutral-dark">{x.self ?? '—'}%</p>
                  <p className="text-[11px] text-neutral-mid">{ui.compare_team} {x.team ?? '—'}%
                    {x.self != null && x.team != null && <span className={x.self >= x.team ? 'text-green-600' : 'text-amber-600'}> {x.self >= x.team ? '▲' : '▼'}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training list */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Brain size={15} className="text-teal" /> {ui.training_title} {ui.info_training && <InfoTip text={ui.info_training} />}</p>
            <Link href="/chat?view=training" className="text-xs font-medium text-teal hover:underline">{ui.open} →</Link>
          </div>
          {rec.training.items.length === 0 ? <p className="px-5 py-4 text-sm text-neutral-mid">{ui.none_training}</p> : (
            <ul className="divide-y divide-gray-50">
              {rec.training.items.map((m: any) => (
                <li key={m.enrollment_id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="truncate text-sm text-neutral-dark">{m.module_name}</span>
                  <div className="flex items-center gap-2">
                    {m.score && <span className="text-xs text-neutral-mid">{m.score.pct}%</span>}
                    <StatusPill status={m.status} ui={ui} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Induction list */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ListChecks size={15} className="text-teal" /> {ui.induction_title} {ui.info_induction && <InfoTip text={ui.info_induction} />}</p>
            <Link href="/chat?view=induction" className="text-xs font-medium text-teal hover:underline">{ui.open} →</Link>
          </div>
          {rec.onboarding.items.length === 0 ? <p className="px-5 py-4 text-sm text-neutral-mid">{ui.none_induction}</p> : (
            <div className="divide-y divide-gray-50">
              {rec.onboarding.items.map((f: any) => (
                <div key={f.enrollment_id} className="px-5 py-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm text-neutral-dark">{f.flow_name}</span>
                    <span className="text-xs text-neutral-mid">{ui.steps.replace('{done}', String(f.completed_steps)).replace('{total}', String(f.total_steps))}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-teal" style={{ width: `${f.pct}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        {rec.timeline.length > 0 && (
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><TrendingUp size={15} className="text-teal" /> {ui.activity_title} {ui.info_activity && <InfoTip text={ui.info_activity} />}</p>
            <ul className="space-y-2">
              {rec.timeline.slice(0, 6).map((e: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Sparkles size={12} className="shrink-0 text-teal" />
                  <span className="text-neutral-dark">{e.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
