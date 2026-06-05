'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import { ClipboardCheck, Plus, ChevronRight, Clock, CheckCircle2, AlertCircle, ChevronDown, Info } from 'lucide-react'
import { clsx } from 'clsx'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function monthLabel(d: string | Date) {
  const date = new Date(d)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

function HowToAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40"
      >
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">How to use Monthly Audits</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          <p><strong className="text-neutral-dark">Starting an audit:</strong> Click "New audit", choose the audit type (e.g. Health &amp; Safety – Monthly), select the month, and optionally enter the auditor name and role. Click "Start audit" to open the form.</p>
          <p><strong className="text-neutral-dark">Completing the form:</strong> Work through each section using the tabs. For yes/no questions tap Yes, No, or N/A. For findings-based audits (e.g. Medicines Management) type your findings and any actions directly. Answers save automatically — you can leave and return at any time.</p>
          <p><strong className="text-neutral-dark">Completing via WhatsApp:</strong> Send "audit" to your CareStream WhatsApp number. The system walks you through each question conversationally — reply yes, no, n/a, or type your findings, then add outcome/action text (or "skip"). Answers sync instantly with the web form.</p>
          <p><strong className="text-neutral-dark">Pausing on the web:</strong> Click <em>Save &amp; exit</em> at the top of the audit form at any time. All answers are saved automatically as you go — you can return and resume from the In Progress section on this page.</p>
          <p><strong className="text-neutral-dark">Pausing on WhatsApp:</strong> Send the word <strong>stop</strong> or <strong>pause</strong> at any time during an audit. Your progress is saved and the conversation unlocks so you can ask other questions. To resume, send "audit" again and select the same template — the system picks up where you left off.</p>
          <p><strong className="text-neutral-dark">Finishing &amp; AI recommendations:</strong> Once all required questions are answered, go to the Summary tab, fill in strengths, areas for improvement, and a deadline. Click "Complete &amp; get AI recommendations" to generate a structured report linked to CQC Key Lines of Enquiry.</p>
          <p><strong className="text-neutral-dark">Printing &amp; storing reports:</strong> Completed audits appear in the Audit Repository below. Click any row to view or reprint the report. Use "Print / save" inside the audit to produce a PDF-ready version.</p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return (
    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle2 size={11} /> Completed
    </span>
  )
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock size={11} /> In progress
    </span>
  )
}

export default function AuditsPage() {
  const { data: session }           = useSession()
  const router                      = useRouter()
  const auditsCache = pageCache.get<{ templates: any[]; runs: any[] }>('admin-audits')
  const [templates, setTemplates]   = useState<any[]>(auditsCache?.templates ?? [])
  const [runs,      setRuns]        = useState<any[]>(auditsCache?.runs ?? [])
  const [loading,   setLoading]     = useState(!auditsCache)
  const [starting,    setStarting]    = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [selTemplate, setSelTemplate] = useState('')
  const [auditMonth,  setAuditMonth]  = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })
  const [auditorName, setAuditorName] = useState('')
  const [auditorRole, setAuditorRole] = useState('')
  const [rooms,       setRooms]       = useState<string[]>([])
  const [room,        setRoom]        = useState('')

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([api.audits.templates(), api.audits.runs()])
      .then(([t, r]) => { setTemplates(t.templates); setRooms(t.rooms ?? []); setRuns(r.runs); if (t.templates[0]) setSelTemplate(t.templates[0].id); pageCache.set('admin-audits', { templates: t.templates, runs: r.runs }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const selTpl = templates.find(t => t.id === selTemplate)
  const needsRoom = !!selTpl?.room_based

  function requestConfirm() {
    if (!selTemplate || (needsRoom && !room.trim())) return
    setConfirming(true)
  }

  async function startAudit() {
    if (!session?.accessToken || !selTemplate || (needsRoom && !room.trim())) return
    setStarting(true)
    try {
      const api  = createApiClient(session.accessToken)
      const date = new Date(auditMonth + '-01')
      const { run } = await api.audits.createRun({
        template_id:  selTemplate,
        audit_month:  date.toISOString(),
        auditor_name: auditorName || undefined,
        auditor_role: auditorRole || undefined,
        ...(needsRoom ? { room_number: room.trim() } : {}),
      })
      router.push(`/audits/${run.id}`)
    } catch {
      setStarting(false)
    }
  }

  const inProgress = runs.filter(r => r.status === 'in_progress')
  const completed  = runs.filter(r => r.status === 'completed')

  if (loading) return <p className="text-sm text-neutral-mid">Loading audits…</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Monthly Audits</h1>
          <p className="mt-1 text-sm text-neutral-mid">Complete, store, and review your monthly care audit reports</p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
        >
          <Plus size={15} /> New audit
        </button>
      </div>

      <HowToAccordion />

      {/* ── New audit form ─────────────────────────────────────────────────────── */}
      {showNew && (
        <div className="mb-6 rounded-card bg-white p-6 shadow-card">
          {!confirming ? (
            <>
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Start a new audit</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit type</label>
                  <select
                    value={selTemplate}
                    onChange={e => setSelTemplate(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                  >
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit month</label>
                  <input
                    type="month"
                    value={auditMonth}
                    onChange={e => setAuditMonth(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                  />
                </div>
                {needsRoom && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-mid">Room / bed no.</label>
                    <input
                      list="admin-audit-rooms"
                      value={room}
                      onChange={e => setRoom(e.target.value)}
                      placeholder="Select or type a room"
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                    />
                    <datalist id="admin-audit-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Auditor name</label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={e => setAuditorName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Role / position</label>
                  <input
                    type="text"
                    value={auditorRole}
                    onChange={e => setAuditorRole(e.target.value)}
                    placeholder="e.g. Registered Manager"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={requestConfirm}
                  disabled={!selTemplate || (needsRoom && !room.trim())}
                  className="flex items-center gap-2 rounded-btn bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  <ClipboardCheck size={14} />
                  Start audit
                </button>
                <button onClick={() => setShowNew(false)} className="rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-sm font-semibold text-neutral-dark">Confirm audit</h2>
              <p className="mb-4 text-xs text-neutral-mid">Please confirm the details below before starting.</p>
              <div className="mb-5 rounded-lg border border-teal/20 bg-teal-light/30 px-5 py-4 space-y-1.5">
                <p className="text-sm font-medium text-neutral-dark">
                  {templates.find(t => t.id === selTemplate)?.name ?? 'Audit'}
                </p>
                <p className="text-xs text-neutral-mid">
                  Month: <span className="font-medium text-neutral-dark">{monthLabel(auditMonth + '-01')}</span>
                </p>
                {needsRoom && room.trim() && (
                  <p className="text-xs text-neutral-mid">Room: <span className="font-medium text-neutral-dark">{room.trim()}</span></p>
                )}
                {auditorName && (
                  <p className="text-xs text-neutral-mid">
                    Auditor: <span className="font-medium text-neutral-dark">{auditorName}{auditorRole ? ` — ${auditorRole}` : ''}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startAudit}
                  disabled={starting}
                  className="flex items-center gap-2 rounded-btn bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  <ClipboardCheck size={14} />
                  {starting ? 'Starting…' : 'Yes, start audit'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={starting}
                  className="rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300 disabled:opacity-50"
                >
                  Edit details
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── In-progress ───────────────────────────────────────────────────────── */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-dark">
            <AlertCircle size={14} className="text-amber-500" /> In progress ({inProgress.length})
          </h2>
          <div className="space-y-2">
            {inProgress.map(run => (
              <button
                key={run.id}
                onClick={() => router.push(`/audits/${run.id}`)}
                className="flex w-full items-center justify-between rounded-card bg-white px-5 py-4 shadow-card hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <ClipboardCheck size={18} className="shrink-0 text-teal" />
                  <div className="text-left">
                    <p className="font-medium text-neutral-dark">{run.template.name}</p>
                    <p className="text-xs text-neutral-mid">{monthLabel(run.audit_month)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} />
                  <ChevronRight size={14} className="text-neutral-mid" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Completed repository ─────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-dark">
          Audit repository ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-200 p-8 text-center">
            <ClipboardCheck size={28} className="mx-auto mb-2 text-neutral-mid/40" />
            <p className="text-sm text-neutral-mid">No completed audits yet. Start your first audit above.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-card bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-mid">Audit type</th>
                  <th className="py-3 pr-5 text-xs font-medium text-neutral-mid">Month</th>
                  <th className="py-3 pr-5 text-xs font-medium text-neutral-mid">Auditor</th>
                  <th className="py-3 pr-5 text-xs font-medium text-neutral-mid">Status</th>
                  <th className="py-3 pr-5 text-right text-xs font-medium text-neutral-mid">Completed</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {completed.map(run => (
                  <tr
                    key={run.id}
                    onClick={() => router.push(`/audits/${run.id}`)}
                    className="cursor-pointer border-b border-gray-50 hover:bg-neutral-light/40 last:border-0"
                  >
                    <td className="px-5 py-3 font-medium text-neutral-dark">{run.template.name}</td>
                    <td className="py-3 pr-5 text-neutral-mid">{monthLabel(run.audit_month)}</td>
                    <td className="py-3 pr-5 text-neutral-mid">{run.auditor_name ?? '—'}</td>
                    <td className="py-3 pr-5"><StatusBadge status={run.status} /></td>
                    <td className="py-3 pr-5 text-right text-xs text-neutral-mid">
                      {run.completed_at ? new Date(run.completed_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <ChevronRight size={14} className="ml-auto text-neutral-mid" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
