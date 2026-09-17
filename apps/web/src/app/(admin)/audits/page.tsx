'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { ClipboardCheck, Plus, ChevronRight, Clock, CheckCircle2, AlertCircle, ChevronDown, Info, Wrench, Trash2, GraduationCap, X, ClipboardList, Mail, Loader2, Pencil, Copy, EyeOff, Eye, History, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { AuditBuilder } from '@/components/admin/audit-builder'
import { AuditVersionsModal } from '@/components/admin/audit-versions-modal'
import { AuditSchedule } from '@/components/admin/audit-schedule'
import { AuditInsightsPanel } from '@/components/admin/audit-insights'
import { LinkTrainingModal } from '@/components/admin/link-training-modal'
import { AuditActionPlan } from '@/components/admin/audit-action-plan'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { LockChip } from '@/components/admin/upgrade-gate'
import { CqcReadinessCard } from '@/components/admin/cqc-readiness-card'

// The "Preview assignment emails" button is a platform-owner tool, not a tenant feature.
const OWNER_EMAILS = ['len@crosswayscarehome.co.uk', 'len@carestreamai.com']

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }
const SCOPE_WORD: Record<string, string> = { resident: 'resident', staff: 'staff member', room: 'room' }

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
          <p><strong className="text-neutral-dark">Starting an audit:</strong> Click &ldquo;New audit&rdquo;, choose the audit and the month, plus the room, resident, staff member or shift if it asks for one, then click &ldquo;Start audit&rdquo;. Audits can also be done on a phone or tablet in the Chat Hub, with photos you can draw on.</p>
          <p><strong className="text-neutral-dark">Scheduling:</strong> Use &ldquo;Schedule an audit&rdquo; to assign an audit to a named person with a due date and a repeat. They are reminded before it is due and when it is overdue, and overdue audits are escalated to admins. Choose the escalation and summary emails in Settings, Audits.</p>
          <p><strong className="text-neutral-dark">Completing the form:</strong> If the audit has been done before, first check the actions from the last audit are still fixed. Work through each section; questions that only apply after a certain answer appear when needed. Answers save automatically, and &ldquo;Save &amp; exit&rdquo; lets you return from In progress.</p>
          <p><strong className="text-neutral-dark">Finishing:</strong> Fill in the Summary tab, sign, and click &ldquo;Complete &amp; get AI recommendations&rdquo;. If manager approval is on, the audit also goes to your care manager in the hub to sign off. A PDF report is saved with the audit and emailed to your admins.</p>
          <p><strong className="text-neutral-dark">Action plans:</strong> Recommendations become an action plan you review, assign and approve. Staff close actions in the hub with a note and photos, or ask for more time, and the next audit re-checks them.</p>
          <p><strong className="text-neutral-dark">Your own audits:</strong> Build an audit from scratch, import one you already use from a PDF, Word document or photo, or copy a built-in audit and edit your copy. Hide any built-in audits you do not use. Every save is a new version, and completed audits keep the questions they were answered against.</p>
          <p><strong className="text-neutral-dark">Trends and reports:</strong> The Trends panel shows scores over time and repeat failures. Completed audits are in the Audit Repository below, where you can view the report or download the PDF. <a href="/guides#monthly-audits" className="font-medium text-teal hover:underline">Read the full guide</a>.</p>
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
  const { features }                = usePlanFeatures()
  const canCustomAudits = features == null || features.has_custom_audits
  const canLinkTraining = features == null || features.has_training_impact
  const userId = session?.user?.email ?? 'guest'
  const isOwner = OWNER_EMAILS.includes((session?.user?.email ?? '').toLowerCase())
  const router                      = useRouter()
  const [templates, setTemplates]   = useState<any[]>([])
  const [runs,      setRuns]        = useState<any[]>([])
  const [loading,   setLoading]     = useState(true)
  const [starting,    setStarting]    = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [versionsOf,  setVersionsOf]  = useState<any>(null)
  const [copying,     setCopying]     = useState<any>(null)
  const [copyName,    setCopyName]    = useState('')
  const [copyHide,    setCopyHide]    = useState(true)
  const [copyBusy,    setCopyBusy]    = useState(false)
  const [copyError,   setCopyError]   = useState('')
  const [importOpen,  setImportOpen]  = useState(false)
  const [importing,   setImporting]   = useState(false)
  const [importError, setImportError] = useState('')
  const [imported,    setImported]    = useState<{ draft: any; notes: string | null } | null>(null)
  const [availOpen,   setAvailOpen]   = useState(false)
  const [linking, setLinking] = useState<any>(null)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [confirming,  setConfirming]  = useState(false)
  const [selTemplate, setSelTemplate] = useState('')
  const [auditMonth,  setAuditMonth]  = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
  })
  const [auditorName, setAuditorName] = useState('')
  const [auditorRole, setAuditorRole] = useState('')
  const [rooms,       setRooms]       = useState<string[]>([])
  const [staff,       setStaff]       = useState<string[]>([])
  const [room,        setRoom]        = useState('')
  const [subjectRoom, setSubjectRoom] = useState('')
  const [startError,  setStartError]  = useState('')
  const [actionPlans, setActionPlans] = useState<Array<{ run_id: string; audit_name: string; subject: string | null; status: 'draft' | 'approved'; total: number; open: number }>>([])
  const [preview, setPreview] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<{ templates: any[]; runs: any[] }>(`admin-audits-${userId}`)
    if (cached) { setTemplates(cached.templates); setRuns(cached.runs); setLoading(false) }
    const cachedPlans = persistentCache.get<typeof actionPlans>(`admin-action-plans-${userId}`)
    if (cachedPlans) setActionPlans(cachedPlans)
  }, [userId])

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([api.audits.templates({ includeHidden: true }), api.audits.runs()])
      .then(([t, r]) => { setTemplates(t.templates); setRooms(t.rooms ?? []); setStaff(t.staff ?? []); setRuns(r.runs); { const first = t.templates.find((x: any) => !x.hidden); if (first) setSelTemplate(first.id) } setAuditorName(v => v || (t.me?.name ?? '')); setAuditorRole(v => v || (t.me?.job_role ?? '')); persistentCache.set(`admin-audits-${userId}`, { templates: t.templates, runs: r.runs }) })
      .catch(() => {})
      .finally(() => setLoading(false))
    api.audits.actionPlans().then(d => { setActionPlans(d.plans); persistentCache.set(`admin-action-plans-${userId}`, d.plans) }).catch(() => {})
  }, [session?.accessToken])

  async function sendPreviewEmails() {
    if (!session?.accessToken || preview === 'sending') return
    setPreview('sending')
    try { await createApiClient(session.accessToken).audits.previewActionPlanEmails(); setPreview('sent') }
    catch { setPreview('error') }
  }

  async function reloadTemplates() {
    if (!session?.accessToken) return
    const t = await createApiClient(session.accessToken).audits.templates({ includeHidden: true }).catch(() => null)
    if (t) { setTemplates(t.templates); setRooms(t.rooms ?? []); setStaff(t.staff ?? []) }
  }
  async function removeTemplate(id: string, name: string) {
    if (!session?.accessToken) return
    if (!confirm(`Delete the audit "${name}"? Staff allocated to it will no longer see it. Completed audit reports are kept.`)) return
    setDeleting(id)
    try { await createApiClient(session.accessToken).audits.deleteTemplate(id); await reloadTemplates() }
    catch { /* ignore */ } finally { setDeleting(null) }
  }

  async function setHidden(t: any, hidden: boolean) {
    if (!session?.accessToken) return
    await createApiClient(session.accessToken).audits.setTemplateHidden(t.id, hidden).catch(() => {})
    await reloadTemplates()
  }
  async function importAudit(file: File | null) {
    if (!file || !session?.accessToken) return
    setImporting(true); setImportError('')
    try {
      const out = await createApiClient(session.accessToken).audits.importTemplate(file)
      setImportOpen(false)
      setImported({ draft: out.draft, notes: out.notes })
    } catch (e: any) { setImportError(e?.message ?? 'The audit could not be imported.') } finally { setImporting(false) }
  }

  async function copyAudit() {
    if (!session?.accessToken || !copying) return
    setCopyBusy(true); setCopyError('')
    try {
      const { template } = await createApiClient(session.accessToken).audits.copyTemplate(copying.id, { name: copyName.trim() || undefined, hide_original: !copying.tenant_id && copyHide })
      setCopying(null)
      await reloadTemplates()
      setEditingId(template.id)
    } catch (e: any) { setCopyError(e?.message ?? 'Could not copy the audit.') } finally { setCopyBusy(false) }
  }

  const selTpl = templates.find(t => t.id === selTemplate)
  const scope: string = selTpl?.subject_scope ?? (selTpl?.room_based ? 'room' : 'none')
  const needsSubject = scope !== 'none'
  const subjectWord = scope === 'resident' ? 'resident' : scope === 'staff' ? 'staff member' : 'room'
  const customTemplates = templates.filter(t => t.tenant_id)

  function requestConfirm() {
    if (!selTemplate || (needsSubject && !room.trim())) return
    setConfirming(true)
  }

  async function startAudit() {
    if (!session?.accessToken || !selTemplate || (needsSubject && !room.trim())) return
    setStarting(true); setStartError('')
    try {
      const api  = createApiClient(session.accessToken)
      const date = new Date(auditMonth + '-01')
      const { run } = await api.audits.createRun({
        template_id:  selTemplate,
        audit_month:  date.toISOString(),
        auditor_name: auditorName || undefined,
        auditor_role: auditorRole || undefined,
        ...(needsSubject ? { subject: room.trim() } : {}),
        ...(scope === 'resident' && subjectRoom.trim() ? { subject_room: subjectRoom.trim() } : {}),
      })
      router.push(`/audits/${run.id}`)
    } catch (e: any) {
      setStartError(e?.message ?? 'Could not start the audit. Please try again.')
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => canCustomAudits ? setShowBuilder(true) : router.push('/billing')}
            className={clsx(
              'flex items-center gap-2 rounded-btn border px-4 py-2 text-sm font-medium',
              canCustomAudits
                ? 'border-teal/40 bg-white text-teal hover:bg-teal-light/40'
                : 'border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-50',
            )}
            title={canCustomAudits ? undefined : 'Building your own audits is an Enterprise feature'}
          >
            <Wrench size={15} /> Build your own audit{!canCustomAudits && <LockChip tier="Enterprise" />}
          </button>
          {canCustomAudits && (
            <button onClick={() => { setImportOpen(true); setImportError('') }}
              className="flex items-center gap-2 rounded-btn border border-teal/40 bg-white px-4 py-2 text-sm font-medium text-teal hover:bg-teal-light/40">
              <Upload size={15} /> Import an existing audit
            </button>
          )}
          <button
            onClick={() => setShowNew(v => !v)}
            className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
          >
            <Plus size={15} /> New audit
          </button>
        </div>
      </div>

      <HowToAccordion />

      {session?.accessToken && <CqcReadinessCard token={session.accessToken} userId={userId} />}

      {session?.accessToken && (
        <AuditSchedule token={session.accessToken} templates={templates.filter(t => !t.hidden)} rooms={rooms} staffNames={staff} />
      )}

      {session?.accessToken && <AuditInsightsPanel token={session.accessToken} />}

      {/* ── Action plans (viewable here as well as in the hub) ───────────────────── */}
      {session?.accessToken && (
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><ClipboardList size={15} className="text-teal" /> Action plans{actionPlans.length > 0 ? ` (${actionPlans.length})` : ''}</h2>
            {isOwner && (
              <div className="flex items-center gap-2">
                {preview === 'sent'  && <span className="text-xs font-medium text-green-600">Preview sent, check your inbox</span>}
                {preview === 'error' && <span className="text-xs font-medium text-red-600">Could not send preview</span>}
                <button onClick={sendPreviewEmails} disabled={preview === 'sending'}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50">
                  {preview === 'sending' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} Preview assignment emails
                </button>
              </div>
            )}
          </div>
          <p className="mb-3 text-xs text-neutral-mid">Every audit with an action plan. Open one to review, assign and track it. When a plan is approved, staff are emailed the actions assigned to them, and any external-contractor actions are emailed to admins.</p>
          {actionPlans.length > 0 ? (
            <div className="space-y-3">
              {actionPlans.map(p => (
                <AuditActionPlan key={p.run_id} token={session.accessToken} runId={p.run_id} heading={p.subject ? `${p.audit_name} · ${p.subject}` : p.audit_name} />
              ))}
            </div>
          ) : (
            <p className="rounded-card border border-gray-100 bg-white px-5 py-4 text-sm text-neutral-mid">No action plans yet. Complete an audit, then generate its action plan to review, assign and track the actions here.</p>
          )}
        </div>
      )}

      {(showBuilder || editingId) && session?.accessToken && (
        <AuditBuilder token={session.accessToken} templateId={editingId} onClose={() => { setShowBuilder(false); setEditingId(null) }} onCreated={reloadTemplates} />
      )}

      {imported && session?.accessToken && (
        <AuditBuilder token={session.accessToken} initial={imported.draft} importNotes={imported.notes} onClose={() => setImported(null)} onCreated={reloadTemplates} />
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !importing && setImportOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-neutral-dark">Import an existing audit</h2>
            <p className="mt-1 text-sm text-neutral-mid">Upload the audit you use today: a PDF, a Word document, or a photo of the paper form. AI turns it into a CareStream audit for you to check and edit before it is created.</p>
            <label className={clsx('mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm', importing ? 'border-gray-200 text-neutral-mid' : 'border-teal/40 text-teal hover:bg-teal-light/30')}>
              {importing ? <><Loader2 size={20} className="animate-spin" /> Reading your audit. This can take up to a minute.</> : <><Upload size={20} /> Choose a file or take a photo</>}
              <input type="file" className="hidden" disabled={importing} accept=".pdf,.docx,.odt,.txt,image/jpeg,image/png,image/webp,image/gif"
                onChange={e => { importAudit(e.target.files?.[0] ?? null); e.currentTarget.value = '' }} />
            </label>
            {importError && <p className="mt-3 text-sm text-red-600">{importError}</p>}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setImportOpen(false)} disabled={importing} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light disabled:opacity-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {versionsOf && session?.accessToken && (
        <AuditVersionsModal token={session.accessToken} template={versionsOf} onClose={() => setVersionsOf(null)} />
      )}

      {copying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCopying(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-neutral-dark">Copy &ldquo;{copying.name}&rdquo;</h2>
            <p className="mt-1 text-sm text-neutral-mid">The copy becomes your own audit, so you can change its questions. Completed audits of the original are not affected.</p>
            <label className="mb-1 mt-4 block text-xs font-medium text-neutral-mid">Name for your copy</label>
            <input value={copyName} onChange={e => setCopyName(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            {!copying.tenant_id && (
              <label className="mt-3 flex items-start gap-2 text-sm text-neutral-dark">
                <input type="checkbox" checked={copyHide} onChange={e => setCopyHide(e.target.checked)} className="mt-0.5 accent-teal" />
                Hide the built-in version, so your team only sees your copy
              </label>
            )}
            {copyError && <p className="mt-3 text-sm text-red-600">{copyError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCopying(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={copyAudit} disabled={copyBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {copyBusy && <Loader2 size={14} className="animate-spin" />} Copy and edit
              </button>
            </div>
          </div>
        </div>
      )}

      {linking && session?.accessToken && (
        <LinkTrainingModal token={session.accessToken} template={linking} onClose={() => setLinking(null)} onSaved={reloadTemplates} />
      )}

      {/* ── Your custom audits ─────────────────────────────────────────────────── */}
      {customTemplates.length > 0 && (
        <div className="mb-6 rounded-card bg-white p-5 shadow-card">
          <p className="mb-3 text-sm font-semibold text-neutral-dark">Your audits</p>
          <p className="mb-3 text-xs text-neutral-mid">Audits you&rsquo;ve built. Allocate them to staff under <strong>Staff → Access level</strong> and they appear in that person&rsquo;s hub.</p>
          <div className="space-y-2">
            {customTemplates.map(t => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-neutral-light/40 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-dark">{t.name}</p>
                  <p className="text-xs text-neutral-mid capitalize">{t.frequency}{typeof t._count?.sections === 'number' ? ` · ${t._count.sections} section${t._count.sections === 1 ? '' : 's'}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setEditingId(t.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => setVersionsOf(t)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                    <History size={13} /> v{t.version ?? 1}
                  </button>
                  <button onClick={() => { setCopying(t); setCopyName(`${t.name} (copy)`); setCopyError('') }} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                    <Copy size={13} /> Copy
                  </button>
                  <button onClick={() => canLinkTraining ? setLinking(t) : router.push('/billing')} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal/40 hover:text-teal" title={canLinkTraining ? undefined : 'Linking audits to training is an Enterprise feature'}>
                    <GraduationCap size={13} /> Linked training{Array.isArray(t.module_ids) && t.module_ids.length ? ` (${t.module_ids.length})` : ''}{!canLinkTraining && <LockChip tier="Enterprise" />}
                  </button>
                  <button onClick={() => removeTemplate(t.id, t.name)} disabled={deleting === t.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-red-200 hover:text-red-500 disabled:opacity-50">
                    <Trash2 size={13} /> {deleting === t.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New audit form (overlay) ───────────────────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowNew(false); setConfirming(false) }}>
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-neutral-dark">{confirming ? 'Confirm audit' : 'Start a new audit'}</h2>
              <button onClick={() => { setShowNew(false); setConfirming(false) }} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
          {!confirming ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit type</label>
                  <select
                    value={selTemplate}
                    onChange={e => setSelTemplate(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                  >
                    {templates.filter(t => !t.hidden).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                {needsSubject && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-mid capitalize">{subjectWord}</label>
                    <input
                      list={scope === 'staff' ? 'admin-audit-staff' : scope === 'room' ? 'admin-audit-rooms' : undefined}
                      value={room}
                      onChange={e => setRoom(e.target.value)}
                      placeholder={scope === 'resident' ? 'Resident name or initials' : scope === 'staff' ? 'Select or type a staff member' : 'Select or type a room'}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                    />
                    <datalist id="admin-audit-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
                    <datalist id="admin-audit-staff">{staff.map(r => <option key={r} value={r} />)}</datalist>
                  </div>
                )}
                {scope === 'resident' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-mid">Room <span className="text-neutral-mid/60">(optional)</span></label>
                    <input
                      list="admin-audit-rooms"
                      value={subjectRoom}
                      onChange={e => setSubjectRoom(e.target.value)}
                      placeholder="Select or type a room"
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark focus:border-teal focus:outline-none"
                    />
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
                  disabled={!selTemplate || (needsSubject && !room.trim())}
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
              <p className="mb-4 text-xs text-neutral-mid">Please confirm the details below before starting.</p>
              <div className="mb-5 rounded-lg border border-teal/20 bg-teal-light/30 px-5 py-4 space-y-1.5">
                <p className="text-sm font-medium text-neutral-dark">
                  {templates.find(t => t.id === selTemplate)?.name ?? 'Audit'}
                </p>
                <p className="text-xs text-neutral-mid">
                  Month: <span className="font-medium text-neutral-dark">{monthLabel(auditMonth + '-01')}</span>
                </p>
                {needsSubject && room.trim() && (
                  <p className="text-xs text-neutral-mid"><span className="capitalize">{subjectWord}</span>: <span className="font-medium text-neutral-dark">{room.trim()}</span>{scope === 'resident' && subjectRoom.trim() ? <> · Room <span className="font-medium text-neutral-dark">{subjectRoom.trim()}</span></> : null}</p>
                )}
                {auditorName && (
                  <p className="text-xs text-neutral-mid">
                    Auditor: <span className="font-medium text-neutral-dark">{auditorName}{auditorRole ? `, ${auditorRole}` : ''}</span>
                  </p>
                )}
              </div>
              {startError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{startError}</p>}
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
          </div>
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
                    <td className="py-3 pr-5 text-neutral-mid">{run.auditor_name ?? '-'}</td>
                    <td className="py-3 pr-5"><StatusBadge status={run.status} /></td>
                    <td className="py-3 pr-5 text-right text-xs text-neutral-mid">
                      {run.completed_at ? new Date(run.completed_at).toLocaleDateString('en-GB') : '-'}
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

        {/* ── Available audits for this tenant (accordion, closed by default) ─── */}
        {templates.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-lg border border-gray-100 bg-white">
            <button
              onClick={() => setAvailOpen(v => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-neutral-light/40"
            >
              <h2 className="text-sm font-semibold text-neutral-dark">Available audits ({templates.filter(t => !t.hidden).length}{templates.some(t => t.hidden) ? `, ${templates.filter(t => t.hidden).length} hidden` : ''})</h2>
              <ChevronDown size={16} className={clsx('ml-auto shrink-0 text-neutral-mid transition-transform', !availOpen && '-rotate-90')} />
            </button>
            {availOpen && (
              <div className="border-t border-gray-100">
                <p className="px-4 pt-3 text-xs text-neutral-mid">Every audit your team can run. Scoped audits are completed one resident, staff member or room at a time. To change a built-in audit, copy it and edit your copy; hide the ones you don&rsquo;t use.</p>
                <table className="mt-2 w-full text-left text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {templates.map(t => {
                      const sc = t.subject_scope ?? (t.room_based ? 'room' : 'none')
                      return (
                        <tr key={t.id}>
                          <td className={clsx('px-4 py-2.5 font-medium', t.hidden ? 'text-neutral-mid' : 'text-neutral-dark')}>
                            {t.name}
                            {t.tenant_id && <span className="ml-2 rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal">Your audit</span>}
                            {t.hidden && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-mid">Hidden</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-neutral-mid">{FREQ_LABEL[t.frequency] ?? t.frequency}</td>
                          <td className="px-4 py-2.5 text-right">
                            {sc !== 'none' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-neutral-mid">Per {SCOPE_WORD[sc] ?? sc}</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
                            {!t.tenant_id && (
                              <span className="inline-flex gap-1.5">
                                <button onClick={() => canCustomAudits ? (setCopying(t), setCopyName(`${t.name} (our version)`), setCopyHide(true), setCopyError('')) : router.push('/billing')}
                                  title={canCustomAudits ? 'Copy this audit so you can edit it' : 'Copying and editing audits is an Enterprise feature'}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                                  <Copy size={12} /> Copy and edit{!canCustomAudits && <LockChip tier="Enterprise" />}
                                </button>
                                <button onClick={() => setHidden(t, !t.hidden)} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-neutral-mid hover:border-teal/40 hover:text-teal">
                                  {t.hidden ? <><Eye size={12} /> Show</> : <><EyeOff size={12} /> Hide</>}
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
