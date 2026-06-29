'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { InfoTip } from '@/components/info-tip'
import { TrainingCertificate } from '@/components/training-certificate'
import { SignInLinkButton } from '@/components/admin/staff/sign-in-link'
import {
  ArrowLeft, Award, Bell, BookOpen, Brain, CalendarDays, CheckCircle2, ClipboardList, Clock, Download, Globe, GraduationCap,
  Lightbulb, ListChecks, Loader2, MessageSquare, Pencil, RefreshCw, RotateCcw, ShieldAlert, TrendingUp, XCircle,
} from 'lucide-react'

// Admin-facing explanations for each section of the record.
const TIP = {
  completion: "Each ring is the share of assigned items completed — training modules and induction flows — plus the average quiz score across completed modules. A low average score can signal a knowledge gap worth following up.",
  benchmark:  "Compares this person to your home's average. The teal bar is their figure; the dark tick is the team average. Bars sitting below the tick are below average and may be worth a conversation.",
  training:   "Every training module assigned to them. 'Score' is the percentage of quiz questions answered correctly. 'Expires' applies to annual modules due for renewal; 'Overdue' means past the due date and not yet complete. Use 'Reset' to let someone retake a module.",
  annual:     "AI-generated annual training built from your policies. 'Score' is the assessment result; 'Renews' is when it's next due. For topics that also need a practical/observed assessment, use 'Record practical' to log that it's been done (with your name + date). View or print each certificate as evidence.",
  induction:  "Their induction (onboarding) flows. The bar shows steps completed — reading policies and answering questions. 'X/Y correct' counts how many question steps they got right.",
  reading:    "How thoroughly this person reads induction policies: total time spent, the furthest they scrolled, and whether they reached the end. 'Thorough' = scrolled (almost) to the end; 'Skimmed' = marked read without scrolling far. Multiple opens of the same policy are combined.",
  cqc:        "This person's CQC inspector-prep practice: each question assigned, their AI score out of 100, and — where they reviewed the model answer and tried again — how much they improved. Useful evidence of inspection readiness.",
  questions:  "Every induction question this person has answered, with their answer and whether it was correct. Incorrect answers highlight where they may need support. Multiple-choice questions are graded automatically; written answers are checked by AI.",
  followup:   "Questions this person has currently answered incorrectly across training and induction — the knowledge to reinforce. Re-send their outstanding questions, reset a module below so they can retake it, or assign targeted training. 'Mark as reviewed' records that you've actioned it (supervision evidence) and clears it until a new wrong answer appears.",
  remediation: "When this person gets a follow-up question wrong, how do they put it right? 'Learn & retry' means they worked through the policy-grounded micro-lesson before answering; 'Just retry' means they re-answered the same question without it. A healthy lean towards 'Learn & retry' suggests they're genuinely engaging with the learning, not just clicking through.",
  engagement: "How actively they use CareStream: questions asked in the Chat Hub, the topics they ask about, CQC prep answered, and login history. Low engagement alongside overdue training is an early warning sign.",
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
function fmtDuration(secs: number | null | undefined) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = secs % 60
  return m ? `${m}m${s ? ` ${s}s` : ''}` : `${s}s`
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
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[11px] font-medium leading-none ${s.cls}`}>{s.label}</span>
}

function Ring({ pct, label }: { pct: number | null; label: string }) {
  const v = pct ?? 0
  const colour = v >= 80 ? '#1A6B45' : v >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-20 w-20">
        {/* Explicit px size + rotation baked into the SVG (no CSS transform/class
            sizing) so html2canvas renders the rings correctly in the PDF. */}
        <svg width="80" height="80" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f1f1" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={colour} strokeWidth="3.5"
            strokeDasharray={`${v} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
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

const CQC_DOMAINS: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', well_led: 'Well-led',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffRecordPage() {
  const { id }      = useParams<{ id: string }>()
  const router      = useRouter()
  const { data: session } = useSession()
  const token       = session?.accessToken ?? ''

  const [rec,      setRec]      = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [note,     setNote]     = useState('')
  const [busy,     setBusy]     = useState<string | null>(null)
  const [certItem, setCertItem] = useState<any>(null)
  const [practicalModal, setPracticalModal] = useState<{ enrollmentId: string; moduleName: string; note: string } | null>(null)

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
  async function markReviewed() {
    setBusy('review'); setNote('')
    try { const r = await createApiClient(token).users.markFollowedUp(id); setNote(`Marked as reviewed${r.by ? ` by ${r.by}` : ''}.`); load() }
    catch { setNote('Could not save review.') } finally { setBusy(null) }
  }
  async function savePractical(enrollmentId: string, signed: boolean, practicalNote?: string) {
    setBusy(enrollmentId)
    try { await createApiClient(token).users.markPractical(id, enrollmentId, { signed, note: practicalNote }); setPracticalModal(null); load() }
    catch { setNote('Could not save practical sign-off.') } finally { setBusy(null) }
  }
  async function openCertificate(certId: string) {
    try { const blob = await createApiClient(token).faceToFace.downloadCertificate(certId); const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000) }
    catch { setNote('Could not open the certificate.') }
  }
  function printCert() { document.body.classList.add('printing-cert'); window.print(); setTimeout(() => document.body.classList.remove('printing-cert'), 600) }
  // Use the browser's native print-to-PDF for full-fidelity rendering (rings,
  // pills and fonts render exactly as on screen). Print CSS (globals.css) shows
  // only the record + the branded header and preserves colours.
  function downloadPdf() {
    const name = (rec?.user?.name ?? 'staff').replace(/\s+/g, '-').toLowerCase()
    const prevTitle = document.title
    document.title = `${name}-training-record`
    document.body.classList.add('print-staff-record')
    const cleanup = () => {
      document.body.classList.remove('print-staff-record')
      document.title = prevTitle
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
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
        <div className="flex items-center gap-2 print:hidden">
          {token && u?.role === 'staff' && <SignInLinkButton token={token} userId={id} userName={u?.name ?? ''} />}
          <button onClick={sendReminder} disabled={busy === 'remind'} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
            {busy === 'remind' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Send reminder
          </button>
          <button onClick={downloadPdf} title="Opens your print dialog — choose “Save as PDF” as the destination" className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal/90">
            <Download size={14} /> CQC evidence (PDF)
          </button>
        </div>
      </div>
      {note && <div className="mb-4 rounded-lg border border-teal/20 bg-teal-light/30 px-4 py-2.5 text-sm text-neutral-dark print:hidden">{note}</div>}

      <div id="staff-record-print" className="space-y-5">
        {/* Branded document header — shown only in the printed/saved PDF, not on screen */}
        <div className="hidden pdf-card print:block">
          <div className="flex items-center justify-between gap-4 border-b-4 border-teal pb-4">
            <div className="flex h-12 w-44 items-center">
              {rec.org?.logo_url
                ? <img src={rec.org.logo_url} alt={rec.org?.name ?? ''} className="max-h-full max-w-full object-contain" />
                : <span className="text-sm font-semibold text-neutral-dark">{rec.org?.name}</span>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-teal">Powered by</p>
              <img src="/logo-color.png" alt="CareStream" className="ml-auto h-8 w-auto" />
            </div>
          </div>
          <div className="mt-3">
            <h1 className="text-lg font-bold text-neutral-dark">Training &amp; Induction Record</h1>
            <p className="text-sm text-neutral-mid">{u.name}{u.job_role ? ` · ${u.job_role}` : ''}{rec.org?.name ? ` · ${rec.org.name}` : ''}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">Downloaded {fmtDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Header */}
        <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
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
                  <span>Added {fmtDate(u.created_at)}</span>
                  <span>Last seen {u.last_login_at ? fmtDate(u.last_login_at) : 'never'}</span>
                </div>
              </div>
            </div>
            {Array.isArray(u.specialisms) && u.specialisms.length > 0 && (
              <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                {u.specialisms.map((s: string) => <span key={s} className="inline-flex items-center rounded-full bg-teal/10 px-2 py-1 text-xs leading-none text-teal">{s}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Flags */}
        {rec.flags.length > 0 && (
          <div className="pdf-card rounded-card border border-amber-200 bg-amber-50/60 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-800"><ShieldAlert size={15} /> Needs attention</p>
            <div className="flex flex-wrap gap-2">
              {rec.flags.map((f: any, i: number) => (
                <span key={i} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none ${f.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{f.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended follow-up */}
        {rec.follow_up && rec.follow_up.gaps.length > 0 && (
          <div className={`pdf-card rounded-card border p-5 shadow-card ${rec.follow_up.needs_follow_up ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">
                <Lightbulb size={15} className={rec.follow_up.needs_follow_up ? 'text-amber-500' : 'text-teal'} /> Recommended follow-up <InfoTip text={TIP.followup} />
              </p>
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={sendReminder} disabled={busy === 'remind'} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">
                  {busy === 'remind' ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Re-send questions
                </button>
                <button onClick={markReviewed} disabled={busy === 'review' || !rec.follow_up.needs_follow_up} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                  {busy === 'review' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {rec.follow_up.needs_follow_up ? 'Mark as reviewed' : 'Reviewed'}
                </button>
              </div>
            </div>
            <p className="mb-3 text-xs text-neutral-mid">
              {rec.follow_up.gaps.length} question{rec.follow_up.gaps.length === 1 ? '' : 's'} answered incorrectly across training &amp; induction.
              {rec.follow_up.last_review && <> Last reviewed {fmtDate(rec.follow_up.last_review.at)}{rec.follow_up.last_review.by ? ` by ${rec.follow_up.last_review.by}` : ''}.</>}
            </p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {rec.follow_up.gaps.map((g: any, i: number) => (
                <li key={i} className="flex items-start gap-2 px-3 py-2.5">
                  <XCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-dark">{g.question || g.topic}</p>
                    <p className="mt-0.5 text-xs text-neutral-mid">
                      <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${g.source === 'training' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'}`}>{g.source === 'training' ? 'Training' : 'Induction'}</span>
                      {g.topic}
                      {g.source === 'induction' && g.correct_answer && <> · their answer: <span className="text-red-600">{g.their_answer}</span> · correct: <span className="text-green-700">{g.correct_answer}</span></>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-neutral-mid print:hidden">Tip: reset a training module below to let them retake it, or assign targeted training from the staff list.</p>
          </div>
        )}

        {/* How gaps get resolved — Learn & retry vs Just retry */}
        {rec.follow_up?.remediation && rec.follow_up.remediation.total > 0 && (() => {
          const r = rec.follow_up.remediation
          const denom = (r.learn + r.retry) || 1
          const learnPct = Math.round((r.learn / denom) * 100)
          return (
            <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">
                <GraduationCap size={15} className="text-teal" /> How gaps get resolved <InfoTip text={TIP.remediation} />
              </p>
              <p className="mb-3 text-xs text-neutral-mid">When a follow-up is answered wrong, did they work through the micro-lesson or just re-answer?</p>
              <div className="mb-2 flex gap-6">
                <div><p className="text-2xl font-bold text-teal">{r.learn}</p><p className="text-xs text-neutral-mid">Learn &amp; retry</p></div>
                <div><p className="text-2xl font-bold text-neutral-dark">{r.retry}</p><p className="text-xs text-neutral-mid">Just retry</p></div>
                <div className="ml-auto self-center text-right"><p className="text-lg font-semibold text-neutral-dark">{learnPct}%</p><p className="text-xs text-neutral-mid">engaged with learning</p></div>
              </div>
              <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-gray-100" title={`${learnPct}% Learn & retry`}>
                <div className="bg-teal" style={{ width: `${learnPct}%` }} />
                <div className="bg-amber-300" style={{ width: `${100 - learnPct}%` }} />
              </div>
              {r.recent.length > 0 && (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {r.recent.map((a: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 px-3 py-2">
                      {a.method === 'learn'
                        ? <GraduationCap size={13} className="mt-0.5 shrink-0 text-teal" />
                        : <RefreshCw size={13} className="mt-0.5 shrink-0 text-neutral-mid" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-neutral-dark">{a.label || (a.source === 'training' ? 'Training question' : 'Induction question')}</p>
                        <p className="mt-0.5 text-[11px] text-neutral-mid">
                          <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${a.source === 'training' ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'}`}>{a.source === 'training' ? 'Training' : 'Induction'}</span>
                          <span className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${a.method === 'learn' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-neutral-mid'}`}>{a.method === 'learn' ? 'Learn & retry' : 'Just retry'}</span>
                          {fmtDate(a.when)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })()}

        {/* Overview rings + benchmarks */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark">Completion <InfoTip text={TIP.completion} /></p>
            <div className="flex items-center justify-around">
              <Ring pct={t.completion_pct} label="Training" />
              <Ring pct={o.completion_pct} label="Induction" />
              <Ring pct={t.avg_score} label="Avg score" />
            </div>
          </div>
          <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card lg:col-span-2">
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
        <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
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
                      {m.overdue && <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-1.5 py-1 text-[10px] font-medium leading-none text-red-600">Overdue</span>}
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

        {/* Annual training (AI modules) */}
        {rec.annual_training && rec.annual_training.items.length > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><GraduationCap size={15} className="text-teal" /> Annual training <InfoTip text={TIP.annual} /></p>
              <p className="text-xs text-neutral-mid">{rec.annual_training.summary.completed}/{rec.annual_training.summary.assigned} complete{rec.annual_training.summary.practical_due > 0 ? ` · ${rec.annual_training.summary.practical_due} practical to record` : ''}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-50 text-left text-xs text-neutral-mid">
                <th className="px-5 py-2 font-medium">Module</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Renews</th>
                <th className="px-3 py-2 font-medium">Practical</th>
                <th className="px-3 py-2 font-medium print:hidden" />
              </tr></thead>
              <tbody>
                {rec.annual_training.items.map((m: any) => (
                  <tr key={m.enrollment_id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-2.5">
                      <span className="text-neutral-dark">{m.module_name}</span>
                      {m.overdue && <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-1.5 py-1 text-[10px] font-medium leading-none text-red-600">Overdue</span>}
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={m.status} /></td>
                    <td className={`px-3 py-2.5 font-medium ${scoreColour(m.score?.pct)}`}>{m.score ? `${m.score.pct}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-neutral-mid">{m.expires_at ? fmtDate(m.expires_at) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {!m.requires_practical ? <span className="text-neutral-mid">N/A</span>
                        : m.practical_signed ? (
                          <div>
                            <span className="text-green-600">✓ {m.practical_signed_by ?? 'Recorded'}{m.practical_signed_at ? ` · ${fmtDate(m.practical_signed_at)}` : ''}</span>
                            {m.practical_note && <p className="mt-0.5 max-w-[18rem] whitespace-pre-wrap italic text-neutral-mid">{m.practical_note}</p>}
                          </div>
                        ) : <span className="text-amber-600">Not recorded</span>}
                    </td>
                    <td className="px-3 py-2.5 print:hidden">
                      <div className="flex items-center gap-1.5">
                        {m.status === 'complete' && (
                          <button onClick={() => setCertItem(m)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-teal hover:bg-teal-light/40"><Award size={12} /> Certificate</button>
                        )}
                        {m.requires_practical && (
                          m.practical_signed ? (
                            <>
                              <button onClick={() => setPracticalModal({ enrollmentId: m.enrollment_id, moduleName: m.module_name, note: m.practical_note ?? '' })} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-mid hover:bg-neutral-light"><Pencil size={12} /> Edit</button>
                              <button onClick={() => savePractical(m.enrollment_id, false)} disabled={busy === m.enrollment_id} className="rounded px-2 py-1 text-xs text-neutral-mid hover:bg-neutral-light disabled:opacity-50">Undo</button>
                            </>
                          ) : (
                            <button onClick={() => setPracticalModal({ enrollmentId: m.enrollment_id, moduleName: m.module_name, note: '' })}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50">
                              <CheckCircle2 size={12} /> Record practical
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Induction record */}
        <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
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
                      {f.overdue && <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-1 text-[10px] font-medium leading-none text-red-600">Overdue</span>}
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

        {/* Face-to-face training */}
        {rec.face_to_face && rec.face_to_face.items.length > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><CalendarDays size={15} className="text-teal" /> Face-to-face training <InfoTip text="In-person group sessions this person was allocated to: whether they attended or missed, and (if they were sent the digital catch-up module) whether they've completed it." /></p>
              <p className="text-xs text-neutral-mid">{rec.face_to_face.summary.attended}/{rec.face_to_face.summary.allocated} attended{rec.face_to_face.summary.missed > 0 ? ` · ${rec.face_to_face.summary.missed} missed` : ''}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {rec.face_to_face.items.map((s: any) => (
                <div key={s.session_id} className="flex items-center justify-between gap-2 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-dark">{s.title}</p>
                    <p className="text-xs text-neutral-mid">{fmtDate(s.date)}{s.module_assigned ? ` · catch-up module sent${s.completion ? ` (${s.completion === 'complete' ? 'completed' : s.completion === 'in_progress' ? 'in progress' : 'not started'})` : ''}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.status === 'attended' ? 'bg-green-50 text-green-600' : s.status === 'absent' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-neutral-mid'}`}>
                    {s.status === 'attended' ? 'Attended' : s.status === 'absent' ? 'Missed' : 'Allocated'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Face-to-face completion certificates */}
        {rec.certificates && rec.certificates.items.length > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Award size={15} className="text-teal" /> Training certificates <InfoTip text="Completion certificates issued to this staff member for face-to-face sessions they attended. Click one to open or download the PDF." /></p>
              <p className="text-xs text-neutral-mid">{rec.certificates.count} issued</p>
            </div>
            <div className="divide-y divide-gray-50">
              {rec.certificates.items.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-2 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-dark">{c.title}</p>
                    <p className="text-xs text-neutral-mid">{fmtDate(c.session_date)} · issued {fmtDate(c.issued_at)}{c.competency === 'competent' ? ' · competent' : ''}</p>
                  </div>
                  <button onClick={() => openCertificate(c.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal no-print"><Download size={13} /> Open</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Induction questions */}
        {rec.induction_questions && rec.induction_questions.items.length > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Brain size={15} className="text-teal" /> Induction questions <InfoTip text={TIP.questions} /></p>
              <p className="text-xs text-neutral-mid">{rec.induction_questions.summary.correct}/{rec.induction_questions.summary.answered} correct{rec.induction_questions.summary.incorrect > 0 ? ` · ${rec.induction_questions.summary.incorrect} to review` : ''}</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {rec.induction_questions.items.map((q: any, i: number) => (
                <li key={i} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    {q.is_correct
                      ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-500" />
                      : <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />}
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-dark">{q.question}</p>
                      <p className="mt-0.5 text-xs text-neutral-mid">
                        Answered: <span className={q.is_correct ? 'text-green-700' : 'text-red-600'}>{q.selected}</span>
                        {!q.is_correct && q.correct_answer && <> · Correct: <span className="text-green-700">{q.correct_answer}</span></>}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CQC Staff Prep */}
        {rec.cqc_prep && rec.cqc_prep.assigned > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ClipboardList size={15} className="text-teal" /> CQC Staff Prep <InfoTip text={TIP.cqc} /></p>
              <p className="text-xs text-neutral-mid">
                {rec.cqc_prep.answered}/{rec.cqc_prep.assigned} answered{rec.cqc_prep.avg_score !== null ? ` · avg ${rec.cqc_prep.avg_score}/100` : ''}{rec.cqc_prep.retried > 0 ? ` · ${rec.cqc_prep.retried} retried` : ''}{rec.cqc_prep.improvement != null ? ` (+${rec.cqc_prep.improvement})` : ''}
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {rec.cqc_prep.questions.map((q: any, i: number) => {
                const sc = q.score as number | null
                const band = sc == null ? 'bg-gray-100 text-gray-400' : sc >= 80 ? 'bg-green-100 text-green-700' : sc >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                return (
                  <li key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className={`mt-0.5 inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${band}`}>
                      {sc == null ? '—' : sc}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-dark">{q.question}</p>
                      <p className="mt-0.5 text-xs text-neutral-mid">
                        {CQC_DOMAINS[q.domain] ?? q.domain ?? ''}
                        {q.status === 'pending' && <> · <span className="text-amber-600">awaiting answer</span></>}
                        {q.attempts > 1 && q.first_score != null && sc != null && <> · improved from <span className="text-neutral-dark">{q.first_score}</span> to <span className="font-semibold text-green-700">{sc}</span> over {q.attempts} attempts</>}
                        {q.attempts > 1 && (q.first_score == null || sc == null) && <> · {q.attempts} attempts</>}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Policy reading */}
        {rec.reading && rec.reading.items.length > 0 && (
          <div className="pdf-card rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><BookOpen size={15} className="text-teal" /> Policy reading <InfoTip text={TIP.reading} /></p>
              <p className="text-xs text-neutral-mid">{rec.reading.summary.thorough} read thoroughly · {rec.reading.summary.skimmed} skimmed</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-50 text-left text-xs text-neutral-mid">
                <th className="px-5 py-2 font-medium">Policy</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Scrolled</th>
                <th className="px-3 py-2 font-medium">How</th>
                <th className="px-3 py-2 font-medium">Last read</th>
              </tr></thead>
              <tbody>
                {rec.reading.items.map((p: any) => {
                  const how = p.best_scroll_pct >= 90 ? { label: 'Thorough', cls: 'bg-green-50 text-green-700' }
                    : p.marked_read && p.best_scroll_pct < 70 ? { label: 'Skimmed', cls: 'bg-amber-50 text-amber-700' }
                    : { label: 'Partial', cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={p.policy_id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-2.5"><span className="text-neutral-dark">{p.title}</span>{p.sessions > 1 && <span className="ml-2 text-[10px] text-neutral-mid">{p.sessions} opens</span>}</td>
                      <td className="px-3 py-2.5 text-neutral-mid">{fmtDuration(p.total_seconds)}</td>
                      <td className="px-3 py-2.5 font-medium text-neutral-dark">{p.best_scroll_pct}%</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium leading-none ${how.cls}`}>{how.label}</span></td>
                      <td className="px-3 py-2.5 text-xs text-neutral-mid">{p.last_read_at ? fmtDate(p.last_read_at) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Engagement + Trends */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
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
                  <span key={tp.category} className="inline-flex items-center rounded-full bg-neutral-light px-2 py-1 text-xs leading-none text-neutral-mid">{TOPIC_LABELS[tp.category] ?? tp.category}: {tp.count}</span>
                ))}
              </div>
            )}
          </div>
          <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
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
        <div className="pdf-card rounded-card border border-gray-100 bg-white p-5 shadow-card">
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

      {/* Record practical assessment */}
      {practicalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-card bg-white p-5 shadow-card">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><CheckCircle2 size={15} className="text-teal" /> Record practical assessment</p>
            <p className="mt-1 text-xs text-neutral-mid">{practicalModal.moduleName} — logs that the observed/practical competency was assessed, with your name and today&apos;s date.</p>
            <label className="mt-3 block text-xs font-medium text-neutral-mid">Assessment notes (optional)</label>
            <textarea
              value={practicalModal.note}
              onChange={e => setPracticalModal(p => p ? { ...p, note: e.target.value } : p)}
              rows={4}
              placeholder="e.g. Observed safe transfer using hoist on 3 occasions; competent. Reviewed MAR chart handling — confident."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setPracticalModal(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={() => savePractical(practicalModal.enrollmentId, true, practicalModal.note.trim() || undefined)} disabled={busy === practicalModal.enrollmentId}
                className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-1.5 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                {busy === practicalModal.enrollmentId ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Record practical
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate overlay */}
      {certItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 print:bg-white print:p-0">
          <div className="my-6 w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between print:hidden">
              <button onClick={() => setCertItem(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light">Close</button>
              <button onClick={printCert} className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal/90"><Download size={14} /> Print / save PDF</button>
            </div>
            <TrainingCertificate
              staffName={u.name}
              moduleName={certItem.module_name}
              orgName={rec.org?.name}
              orgLogoUrl={rec.org?.logo_url}
              score={certItem.score?.pct}
              completedAt={certItem.completed_at}
              expiresAt={certItem.expires_at}
              requiresPractical={certItem.requires_practical}
              practicalNote={certItem.practical_signed
                ? `Knowledge component. Practical assessment recorded${certItem.practical_signed_by ? ` by ${certItem.practical_signed_by}` : ''}${certItem.practical_signed_at ? ` on ${fmtDate(certItem.practical_signed_at)}` : ''}.`
                : 'This is the knowledge component. A practical / observed competency assessment is also required.'}
              cpdAccredited={certItem.cpd_accredited}
              cpdHours={certItem.cpd_hours}
              cpdProviderNumber={rec.cpd_provider_number}
              independentlyReviewed={certItem.independently_reviewed}
            />
          </div>
        </div>
      )}
    </div>
  )
}
