'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { InfoTip } from '@/components/info-tip'
import {
  ArrowLeft, Award, Bell, Brain, Clock, Download, Globe,
  ListChecks, Loader2, MessageSquare, Phone, RotateCcw, ShieldAlert, TrendingUp,
} from 'lucide-react'

// Admin-facing explanations for each section of the record.
const TIP = {
  completion: "Each ring is the share of assigned items completed — training modules and induction flows — plus the average quiz score across completed modules. A low average score can signal a knowledge gap worth following up.",
  benchmark:  "Compares this person to your home's average. The teal bar is their figure; the dark tick is the team average. Bars sitting below the tick are below average and may be worth a conversation.",
  training:   "Every training module assigned to them. 'Score' is the percentage of quiz questions answered correctly. 'Expires' applies to annual modules due for renewal; 'Overdue' means past the due date and not yet complete. Use 'Reset' to let someone retake a module.",
  induction:  "Their induction (onboarding) flows. The bar shows steps completed — reading policies and answering questions. 'X/Y correct' counts how many question steps they got right.",
  engagement: "How actively they use CareStream: questions asked in the chat portal, the topics they ask about, CQC prep answered, and login history. Low engagement alongside overdue training is an early warning sign.",
  trends:     "Modules and induction flows they completed in each of the last 6 months — a quick read on momentum.",
  timeline:   "A chronological record of their training and induction activity. Handy as CQC evidence of ongoing development and supervision.",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function scoreColour(pct: number | null | undefined) {
  if (pct == null) return 'text-neutral-mid'
  if (pct >= 80) return 'text-green-600'
  if (pct >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    complete:    { label: 'Complete',    cls: 'bg-green-50 text-green-700' },
    in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-700' },
    not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-500' },
    expired:     { label: 'Expired',     cls: 'bg-red-50 text-red-600'   },
  }
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>
}

function Ring({ pct, label }: { pct: number | null; label: string }) {
  const v = pct ?? 0
  const colour = v >= 80 ? '#1A6B45' : v >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f1f1" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={colour} strokeWidth="3.5"
            strokeDasharray={`${v} 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neutral-dark">
          {pct == null ? '—' : `${v}%`}
        </span>
      </div>
      <span className="mt-1.5 text-xs text-neutral-mid">{label}</span>
    </div>
  )
}

function BenchBar({ label, self, team }: { label: string; self: number | null; team: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-neutral-mid">{label}</span>
        <span className="font-medium text-neutral-dark">{self ?? '—'}%{team != null && <span className="ml-1 font-normal text-neutral-mid">· team {team}%</span>}</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-gray-100">
        <div className="absolute h-2 rounded-full bg-teal" style={{ width: `${self ?? 0}%` }} />
        {team != null && <div className="absolute top-[-2px] h-3 w-0.5 bg-neutral-dark/60" style={{ left: `${team}%` }} title={`Team average ${team}%`} />}
      </div>
    </div>
  )
}

function Trends({ trends }: { trends: { months: string[]; training: number[]; onboarding: number[] } }) {
  const max = Math.max(1, ...trends.training, ...trends.onboarding)
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 110 }}>
      {trends.months.map((m, i) => (
        <div key={m + i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 80 }}>
            <div className="w-2.5 rounded-t bg-teal" style={{ height: `${(trends.training[i] / max) * 100}%` }} title={`${trends.training[i]} training`} />
            <div className="w-2.5 rounded-t bg-indigo-400" style={{ height: `${(trends.onboarding[i] / max) * 100}%` }} title={`${trends.onboarding[i]} induction`} />
          </div>
          <span className="text-[10px] text-neutral-mid">{m}</span>
        </div>
      ))}
    </div>
  )
}

const TOPIC_LABELS: Record<string, string> = {
  internal_policy: 'Policies', staff_handbook: 'Handbook', training_module: 'Training',
  cqc_report: 'CQC', audit_report: 'Audits', business_continuity: 'Continuity',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRecordPage() {
  const { id }      = useParams<{ id: string }>()
  const router      = useRouter()
  const { data: session } = useSession()
  const token       = session?.accessToken ?? ''

  const [rec,     setRec]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note,    setNote]    = useState('')
  const [busy,    setBusy]    = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return
    createApiClient(token).users.record(id).then(setRec).catch(() => {}).finally(() => setLoading(false))
  }, [token, id])
  useEffect(load, [load])

  async function sendReminder() {
    setBusy('remind'); setNote('')
    try {
      const r = await createApiClient(token).users.remind(id)
      setNote(r.reminded ? `Reminder sent — ${r.modules} outstanding module${r.modules === 1 ? '' : 's'}.` : 'Nothing outstanding to remind about.')
    } catch { setNote('Could not send reminder.') } finally { setBusy(null) }
  }
  async function resetModule(enrollmentId: string) {
    if (!confirm('Reset this module? Their answers and completion will be cleared so they can retake it.')) return
    setBusy(enrollmentId)
    try { await createApiClient(token).training.reset(enrollmentId); load() }
    catch { setNote('Could not reset module.') } finally { setBusy(null) }
  }
  async function downloadPdf() {
    setBusy('pdf')
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const el = document.getElementById('staff-record-print')
      if (!el) { setBusy(null); return }
      await html2pdf().set({
        margin: 8,
        filename: `${(rec?.user?.name ?? 'staff').replace(/\s+/g, '-').toLowerCase()}-training-record.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save()
    } catch { setNote('Could not generate PDF.') } finally { setBusy(null) }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-neutral-mid" /></div>
  if (!rec)    return <div className="py-20 text-center text-sm text-neutral-mid">Staff member not found.</div>

  const u = rec.user
  const t = rec.training.summary
  const o = rec.onboarding.summary

  return (
    <div className="mx-auto max-w-5xl">
      {/* Controls — hidden from PDF */}
      <div className="mb-5 flex items-center justify-between print:hidden">
        <button onClick={() => router.push('/staff')} className="flex items-center gap-1.5 text-sm text-neutral-mid hover:text-neutral-dark">
          <ArrowLeft size={15} /> Back to staff
        </button>
        <div className="flex items-center gap-2">
          <button onClick={sendReminder} disabled={busy === 'remind'} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
            {busy === 'remind' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Send reminder
          </button>
          <button onClick={downloadPdf} disabled={busy === 'pdf'} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
            {busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} CQC evidence (PDF)
          </button>
        </div>
      </div>
      {note && <div className="mb-4 rounded-lg border border-teal/20 bg-teal-light/30 px-4 py-2.5 text-sm text-neutral-dark print:hidden">{note}</div>}

      <div id="staff-record-print" className="space-y-5">
        {/* Header */}
        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${u.role === 'admin' ? 'bg-teal' : 'bg-purple-500'}`}>
                {(u.name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-dark">{u.name}</h1>
                <p className="text-sm text-neutral-mid">{u.job_role || 'No position set'} · {u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                  <span>{u.shift_type === 'day' ? 'Day shift' : u.shift_type === 'night' ? 'Night shift' : 'Flexible'}</span>
                  <span className="flex items-center gap-1"><Globe size={11} /> {u.first_language?.toUpperCase()}</span>
                  {u.phone_number && <span className="flex items-center gap-1"><Phone size={11} /> WhatsApp</span>}
                  <span>Added {fmtDate(u.created_at)}</span>
                  <span>Last seen {u.last_login_at ? fmtDate(u.last_login_at) : 'never'}</span>
                </div>
              </div>
            </div>
            {Array.isArray(u.specialisms) && u.specialisms.length > 0 && (
              <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                {u.specialisms.map((s: string) => <span key={s} className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">{s}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Flags */}
        {rec.flags.length > 0 && (
          <div className="rounded-card border border-amber-200 bg-amber-50/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800"><ShieldAlert size={15} /> Needs attention</p>
            <div className="flex flex-wrap gap-2">
              {rec.flags.map((f: any, i: number) => (
                <span key={i} className={`rounded-full px-2.5 py-1 text-xs font-medium ${f.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Overview rings + benchmarks */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">Completion <InfoTip text={TIP.completion} /></p>
            <div className="flex items-center justify-around">
              <Ring pct={t.completion_pct} label="Training" />
              <Ring pct={o.completion_pct} label="Induction" />
              <Ring pct={t.avg_score} label="Avg score" />
            </div>
          </div>
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card lg:col-span-2">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Award size={15} className="text-teal" /> How they compare to the team <InfoTip text={TIP.benchmark} /></p>
            {rec.benchmarks ? (
              <div className="space-y-3">
                <BenchBar label="Training completion" self={rec.benchmarks.training_completion.self} team={rec.benchmarks.training_completion.team} />
                <BenchBar label="Average quiz score"  self={rec.benchmarks.avg_score.self}           team={rec.benchmarks.avg_score.team} />
                <BenchBar label="Induction completion" self={rec.benchmarks.onboarding_completion.self} team={rec.benchmarks.onboarding_completion.team} />
              </div>
            ) : <p className="text-sm text-neutral-mid">No benchmark data.</p>}
          </div>
        </div>

        {/* Training record */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Brain size={15} className="text-teal" /> Training record <InfoTip text={TIP.training} /></p>
            <p className="text-xs text-neutral-mid">{t.completed}/{t.assigned} complete · {t.overdue} overdue · {t.due_soon} due soon</p>
          </div>
          {rec.training.items.length === 0 ? (
            <p className="px-5 py-5 text-sm text-neutral-mid">No training assigned.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-50 text-left text-xs text-neutral-mid">
                <th className="px-5 py-2 font-medium">Module</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Due / Expires</th>
                <th className="px-3 py-2 font-medium print:hidden" />
              </tr></thead>
              <tbody>
                {rec.training.items.map((m: any) => (
                  <tr key={m.enrollment_id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <span className="text-neutral-dark">{m.module_name}</span>
                      <span className="ml-2 text-[10px] uppercase text-neutral-mid">{m.category === 'statutory' ? 'Statutory' : 'Specialist'}</span>
                      {m.overdue && <span className="ml-2 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Overdue</span>}
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={m.status} /></td>
                    <td className={`px-3 py-2.5 font-medium ${scoreColour(m.score?.pct)}`}>{m.score ? `${m.score.pct}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-neutral-mid">
                      {m.expires_at ? `Expires ${fmtDate(m.expires_at)}` : m.due_date ? `Due ${fmtDate(m.due_date)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 print:hidden">
                      {m.status !== 'not_started' && (
                        <button onClick={() => resetModule(m.enrollment_id)} disabled={busy === m.enrollment_id} title="Reset module"
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark disabled:opacity-50">
                          {busy === m.enrollment_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Induction record */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ListChecks size={15} className="text-teal" /> Induction record <InfoTip text={TIP.induction} /></p>
            <p className="text-xs text-neutral-mid">{o.completed}/{o.assigned} complete</p>
          </div>
          {rec.onboarding.items.length === 0 ? (
            <p className="px-5 py-5 text-sm text-neutral-mid">Not enrolled on any induction flow.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {rec.onboarding.items.map((f: any) => (
                <div key={f.enrollment_id} className="px-5 py-3.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-dark">{f.flow_name}</span>
                      <span className="text-[10px] uppercase text-neutral-mid">{f.flow_kind === 'secondary' ? 'Specialism' : 'Role'}</span>
                      {f.overdue && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">Overdue</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-mid">{f.completed_steps}/{f.total_steps} steps{f.question_steps > 0 ? ` · ${f.correct_answers}/${f.question_steps} correct` : ''}</span>
                      <StatusPill status={f.status} />
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-teal" style={{ width: `${f.pct}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engagement + Trends */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><MessageSquare size={15} className="text-teal" /> Engagement <InfoTip text={TIP.engagement} /></p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-neutral-mid">Questions asked</p><p className="font-semibold text-neutral-dark">{rec.engagement.queries_total} <span className="text-xs font-normal text-neutral-mid">({rec.engagement.queries_30d} in 30d)</span></p></div>
              <div><p className="text-xs text-neutral-mid">Last question</p><p className="font-semibold text-neutral-dark">{fmtDate(rec.engagement.last_query_at)}</p></div>
              <div><p className="text-xs text-neutral-mid">First login</p><p className="font-semibold text-neutral-dark">{rec.engagement.first_login_at ? fmtDate(rec.engagement.first_login_at) : 'Never'}</p></div>
              <div><p className="text-xs text-neutral-mid">CQC prep</p><p className="font-semibold text-neutral-dark">{rec.engagement.cqc_answered}/{rec.engagement.cqc_assigned} answered</p></div>
            </div>
            {rec.engagement.top_topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rec.engagement.top_topics.map((tp: any) => (
                  <span key={tp.category} className="rounded-full bg-neutral-light px-2 py-0.5 text-xs text-neutral-mid">{TOPIC_LABELS[tp.category] ?? tp.category}: {tp.count}</span>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><TrendingUp size={15} className="text-teal" /> Completions (6 months) <InfoTip text={TIP.trends} /></p>
              <div className="flex items-center gap-3 text-[10px] text-neutral-mid">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal" /> Training</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" /> Induction</span>
              </div>
            </div>
            <Trends trends={rec.trends} />
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-card">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Clock size={15} className="text-teal" /> Activity timeline <InfoTip text={TIP.timeline} /></p>
          {rec.timeline.length === 0 ? <p className="text-sm text-neutral-mid">No activity yet.</p> : (
            <ol className="relative space-y-3 border-l border-gray-100 pl-4">
              {rec.timeline.map((e: any, i: number) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                    e.type.includes('completed') ? 'bg-green-500' : e.type === 'login' ? 'bg-purple-400' : e.type === 'query' ? 'bg-indigo-400' : 'bg-teal'
                  }`} />
                  <p className="text-sm text-neutral-dark">{e.label}</p>
                  <p className="text-xs text-neutral-mid">{fmtDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="px-1 pb-4 text-center text-[11px] text-neutral-mid print:block">
          Generated by CareStream · {fmtDateTime(new Date().toISOString())} · Training & induction record for {u.name}
        </p>
      </div>
    </div>
  )
}
