'use client'

// Staff modals — extracted from the staff page and lazy-loaded (next/dynamic)
// so this code is only fetched when a user opens one of these dialogs.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, GraduationCap, ListChecks, Loader2, Mail, Pencil, Plus, X } from 'lucide-react'
import {
  CommsLanguageToggle,
  LanguageSwitchToggle,
  CredentialsPanel,
  InitialAvatar,
  fmtDate,
  langNameOf,
} from './staff-shared'

// ─── Money helpers (training hourly rate is stored in GBP pence) ───────────────
function poundsToPence(v: string): number | null {
  const s = (v ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}
function penceToPounds(p: number | null | undefined): string {
  return typeof p === 'number' ? (p / 100).toFixed(2) : ''
}

// ─── Training assign step ─────────────────────────────────────────────────────

const PAGE_SIZE = 4

function TrainingAssignStep({ token, userId, userName, onDone }: {
  token:    string
  userId:   string
  userName: string
  onDone:   () => void
}) {
  const [modules,  setModules]  = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [page,     setPage]     = useState(0)

  useEffect(() => {
    createApiClient(token).training.modules()
      .then(d => {
        setModules(d.modules)
        setSelected(new Set(d.modules.filter((m: any) => m.category === 'statutory').map((m: any) => m.id)))
      })
      .finally(() => setLoading(false))
  }, [token])

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function assign() {
    if (selected.size === 0) { onDone(); return }
    setSaving(true)
    try {
      await createApiClient(token).training.enroll({
        user_ids:   [userId],
        module_ids: [...selected],
      })
    } catch { /* silent — don't block staff creation */ } finally {
      onDone()
    }
  }

  const totalPages = Math.ceil(modules.length / PAGE_SIZE)
  const pageModules = modules.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const isLast = page === totalPages - 1

  return (
    <div>
      {/* Header */}
      <div className="mb-4 rounded-lg border border-teal/20 bg-teal-light/20 px-4 py-3">
        <p className="text-sm font-medium text-teal">Assign training to {userName}</p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          Tick the modules that apply. Statutory modules are pre-selected — untick any that do not apply.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-neutral-mid" /></div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-mid">
              Page {page + 1} of {totalPages}
            </p>
            <p className="text-xs text-neutral-mid">
              {selected.size} of {modules.length} selected
            </p>
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-teal transition-all"
              style={{ width: `${((page + 1) / totalPages) * 100}%` }}
            />
          </div>

          {/* Modules for this page */}
          <div className="space-y-2">
            {pageModules.map(m => {
              const isStatutory = m.category === 'statutory'
              const checked = selected.has(m.id)
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                    checked
                      ? isStatutory
                        ? 'border-teal bg-teal-light/20'
                        : 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(m.id)}
                    className={`mt-0.5 h-4 w-4 shrink-0 ${isStatutory ? 'accent-teal' : 'accent-indigo-500'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-dark">{m.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isStatutory ? 'bg-teal/10 text-teal' : 'bg-indigo-50 text-indigo-500'
                      }`}>
                        {isStatutory ? 'Statutory' : 'Specialist'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-mid">{m.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {page > 0 && (
            <button
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light"
            >
              Back
            </button>
          )}
          {page === 0 && (
            <button onClick={onDone} className="text-sm text-neutral-mid hover:text-neutral-dark">
              Skip for now
            </button>
          )}
        </div>

        {isLast ? (
          <Button onClick={assign} disabled={saving || loading}>
            {saving ? 'Assigning…' : `Assign ${selected.size} module${selected.size !== 1 ? 's' : ''}`}
          </Button>
        ) : (
          <button
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg bg-teal px-5 py-2 text-sm font-medium text-white hover:bg-teal/90"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Onboarding assign step ───────────────────────────────────────────────────

function OnboardingAssignStep({ token, userId, userName, alreadyFlowIds, onDone }: {
  token:          string
  userId:         string
  userName:       string
  alreadyFlowIds: string[]
  onDone:         () => void
}) {
  const [flows,    setFlows]    = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const already = new Set(alreadyFlowIds)

  useEffect(() => {
    createApiClient(token).onboarding.listFlows()
      .then(d => setFlows((d.flows ?? []).filter((f: any) => f.is_active !== false)))
      .finally(() => setLoading(false))
  }, [token])

  function toggle(id: string) {
    if (already.has(id)) return
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function assign() {
    if (selected.size === 0) { onDone(); return }
    setSaving(true)
    try {
      await Promise.all([...selected].map(flowId =>
        createApiClient(token).onboarding.enroll(flowId, { user_ids: [userId] })
      ))
    } catch { /* silent */ } finally {
      onDone()
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
        <p className="text-sm font-medium text-indigo-700">Assign onboarding to {userName}</p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          Tick the induction flows to enrol them on. They’ll be notified by email.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-neutral-mid" /></div>
      ) : flows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-4 text-sm text-neutral-mid">
          No active onboarding flows yet. Adopt or create one on the Onboarding page first.
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {flows.map(f => {
            const isEnrolled = already.has(f.id)
            const checked    = selected.has(f.id)
            const stepCount  = Array.isArray(f.steps) ? f.steps.length : 0
            return (
              <label
                key={f.id}
                className={`flex items-start gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                  isEnrolled ? 'cursor-default border-gray-100 bg-gray-50 opacity-60'
                  : checked   ? 'cursor-pointer border-indigo-300 bg-indigo-50'
                              : 'cursor-pointer border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked || isEnrolled}
                  disabled={isEnrolled}
                  onChange={() => toggle(f.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-dark">{f.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      f.flow_kind === 'secondary' ? 'bg-purple-50 text-purple-500' : 'bg-indigo-50 text-indigo-500'
                    }`}>
                      {f.flow_kind === 'secondary' ? 'Specialism' : 'Role'}
                    </span>
                    {isEnrolled && <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Enrolled</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-mid">{stepCount} step{stepCount !== 1 ? 's' : ''}</p>
                </div>
              </label>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={onDone} className="text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
        <Button onClick={assign} disabled={saving || loading || selected.size === 0}>
          {saving ? 'Enrolling…' : `Enrol on ${selected.size} flow${selected.size !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ─── Access level + audit allocation ─────────────────────────────────────────
// Shared by the invite + edit modals. Presents the 3-way access dropdown
// (Staff / Staff + Audits / Admin) and, for "Staff + Audits", a checklist of the
// tenant's audit types to allocate. Reports back { role, auditIds }.
function AccessLevelField({ token, role, auditIds, onChange }: {
  token:     string
  role:      string          // 'admin' | 'staff'
  auditIds:  string[]
  onChange:  (v: { role: string; auditIds: string[] }) => void
}) {
  const [templates, setTemplates] = useState<{ id: string; name: string; frequency: string }[]>([])
  useEffect(() => {
    createApiClient(token).audits.templates()
      .then(r => setTemplates(r.templates ?? []))
      .catch(() => {})
  }, [token])

  // The chosen level is its OWN state — it can't be derived from {role, auditIds},
  // because "Staff + Audits" with nothing ticked yet looks identical to plain Staff
  // (and would snap back the moment you select it).
  const [level, setLevel] = useState<'staff' | 'staff_audits' | 'admin'>(
    role === 'admin' ? 'admin' : (auditIds.length ? 'staff_audits' : 'staff')
  )

  function changeLevel(l: 'staff' | 'staff_audits' | 'admin') {
    setLevel(l)
    if (l === 'admin')           onChange({ role: 'admin', auditIds: [] })
    else if (l === 'staff')      onChange({ role: 'staff', auditIds: [] })
    else                         onChange({ role: 'staff', auditIds }) // staff_audits — keep current picks
  }
  function toggle(id: string) {
    onChange({ role: 'staff', auditIds: auditIds.includes(id) ? auditIds.filter(x => x !== id) : [...auditIds, id] })
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Access level</label>
      <select
        value={level}
        onChange={e => changeLevel(e.target.value as 'staff' | 'staff_audits' | 'admin')}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
      >
        <option value="staff">Staff — chat only</option>
        <option value="staff_audits">Staff + Audits — chat &amp; allocated audits</option>
        <option value="admin">Admin — full access</option>
      </select>
      {level === 'staff_audits' && (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-dark">Audits this member can conduct in the hub</p>
          {templates.length === 0 ? (
            <p className="text-xs text-neutral-mid">No audit types set up yet.</p>
          ) : (
            <div className="grid max-h-56 grid-cols-1 gap-x-6 gap-y-2 overflow-auto sm:grid-cols-2">
              {templates.map(t => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm text-neutral-dark hover:bg-white">
                  <input
                    type="checkbox"
                    checked={auditIds.includes(t.id)}
                    onChange={() => toggle(t.id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-teal focus:ring-teal"
                  />
                  <span className="flex-1">{t.name}</span>
                  <span className="text-xs capitalize text-neutral-mid">{t.frequency}</span>
                </label>
              ))}
            </div>
          )}
          {auditIds.length === 0 && (
            <p className="mt-3 text-xs text-amber-600">Select at least one audit — otherwise they’ll just be a normal staff member.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

type ModalStep = 'form' | 'credentials' | 'training'

export function InviteModal({
  token,
  staffRoles,
  specialistRoles,
  languages,
  onClose,
  onInvited,
}: {
  token:           string
  staffRoles:      string[]
  specialistRoles: string[]
  languages:       { code: string; name: string }[]
  onClose:         () => void
  onInvited:       () => void
}) {
  const [step,      setStep]      = useState<ModalStep>('form')
  const [creds,     setCreds]     = useState<{ userId: string; name: string; email: string; password: string; contact?: StaffContact } | null>(null)
  const [newUserId, setNewUserId] = useState('')
  const [form,      setForm]      = useState({ name: '', email: '', role: 'staff', job_role: '', shift_type: 'any', training_hourly_rate: '', first_language: 'eng', second_language: '', staff_type: 'existing' })
  const [auditIds,  setAuditIds]  = useState<string[]>([])
  const [hasSpecialism, setHasSpecialism] = useState(false)
  const [specialisms, setSpecialisms]     = useState<string[]>([])
  const [commsFirstLang, setCommsFirstLang] = useState(true)
  const [allowSwitch, setAllowSwitch] = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [onboardingNote, setOnboardingNote] = useState('')

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    setLoading(true)

    const res = await createApiClient(token).users.invite({
      name:            form.name,
      email:           form.email,
      role:            form.role,
      job_role:        form.job_role || undefined,
      specialisms:     hasSpecialism ? specialisms : [],
      audit_template_ids: form.role === 'admin' ? [] : auditIds,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      training_hourly_rate: poundsToPence(form.training_hourly_rate),
      first_language:  form.first_language,
      second_language: form.second_language || undefined,
      comms_always_first_language: commsFirstLang,
      allow_language_switching: allowSwitch && !!form.second_language,
      new_starter:     form.staff_type === 'new',
    }).catch((err: Error) => { setError(err.message); return null })

    setLoading(false)
    if (!res) return

    // Feedback on onboarding auto-enrolment for new starters.
    if (form.staff_type === 'new') {
      setOnboardingNote(
        (res.onboarding_enrolled ?? 0) > 0
          ? `Enrolled in ${res.onboarding_enrolled} onboarding flow${res.onboarding_enrolled === 1 ? '' : 's'} for their role.`
          : 'No onboarding flow matches this role yet — create one on the Onboarding page and they’ll auto-enrol next time.'
      )
    }

    // Refresh the list in the background, but keep modal open to show credentials
    onInvited()
    setCreds({ userId: res.user.id, name: form.name, email: form.email, password: res.temp_password, contact: res.contact })
    setNewUserId(res.user.id)
    setStep('credentials')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className={`w-full rounded-card bg-white p-6 shadow-xl ${step === 'form' ? 'max-w-3xl' : 'max-w-md'}`}>

        <h2 className="mb-5 text-lg font-semibold text-neutral-dark">
          {step === 'form' ? 'Add staff member' : step === 'credentials' ? 'Account created' : `Assign training to ${form.name}`}
        </h2>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Core details — two columns */}
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Full name</label>
                <input type="text" required placeholder="Jane Smith" value={form.name} onChange={update('name')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Email address</label>
                <input type="email" required placeholder="jane@carehome.co.uk" value={form.email} onChange={update('email')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Position</label>
                <select
                  value={form.job_role}
                  onChange={update('job_role')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  <option value="">— select a position —</option>
                  {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="mt-1 text-xs text-neutral-mid">Drives their onboarding &amp; training. Add more positions in Settings.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Staff type</label>
                <select
                  value={form.staff_type}
                  onChange={update('staff_type')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  <option value="existing">Existing staff member</option>
                  <option value="new">New starter</option>
                </select>
                <p className="mt-1 text-xs text-neutral-mid">
                  {form.staff_type === 'new'
                    ? 'Automatically enrols them in the onboarding flow(s) matching their job role.'
                    : 'No onboarding is assigned automatically.'}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Shift pattern</label>
                <select
                  value={form.shift_type}
                  onChange={update('shift_type')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  <option value="any">Flexible</option>
                  <option value="day">Day shift</option>
                  <option value="night">Night shift</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Training hourly rate <span className="font-normal text-neutral-mid">(optional)</span></label>
                <div className="flex items-center rounded-md border border-gray-300 px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
                  <span className="text-sm text-neutral-mid">£</span>
                  <input
                    type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00"
                    value={form.training_hourly_rate}
                    onChange={update('training_hourly_rate')}
                    className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                  />
                  <span className="text-xs text-neutral-mid">/hr</span>
                </div>
                <p className="mt-1 text-xs text-neutral-mid">Used to cost their owed training hours on the payroll report.</p>
              </div>
              <div className="sm:col-span-2">
                <AccessLevelField
                  token={token}
                  role={form.role}
                  auditIds={auditIds}
                  onChange={v => { setForm(prev => ({ ...prev, role: v.role })); setAuditIds(v.auditIds) }}
                />
              </div>
            </div>

            {/* Specialist roles — full width */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Does this person have a specialist role?</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHasSpecialism(true)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${hasSpecialism ? 'border-teal bg-teal-light/30 text-teal' : 'border-gray-300 text-neutral-dark'}`}>Yes</button>
                <button type="button" onClick={() => { setHasSpecialism(false); setSpecialisms([]) }}
                  className={`rounded-md border px-3 py-1.5 text-sm ${!hasSpecialism ? 'border-teal bg-teal-light/30 text-teal' : 'border-gray-300 text-neutral-dark'}`}>No</button>
              </div>
              {hasSpecialism && (
                <div className="mt-2">
                  {specialisms.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {specialisms.map(s => (
                        <span key={s} className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">
                          {s}
                          <button type="button" onClick={() => setSpecialisms(prev => prev.filter(x => x !== s))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select
                    value=""
                    onChange={e => { if (e.target.value) setSpecialisms(prev => [...new Set([...prev, e.target.value])]) }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="">— add a specialist role —</option>
                    {specialistRoles.filter(r => !specialisms.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-neutral-mid">Adds the matching specialist onboarding/training. Add more in Settings.</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-teal/20 bg-teal-light/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-teal-dark">Language preferences</p>
              <p className="text-xs text-neutral-mid">Training questions and automated messages will be sent in the staff member's first language.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-dark">First language</label>
                  <select
                    value={form.first_language}
                    onChange={update('first_language')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-dark">
                    Second language
                    <span className="ml-1 font-normal text-neutral-mid">(optional)</span>
                  </label>
                  <select
                    value={form.second_language}
                    onChange={update('second_language')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="">— none —</option>
                    {languages.filter(l => l.code !== form.first_language).map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <CommsLanguageToggle on={commsFirstLang} onChange={setCommsFirstLang} langName={langNameOf(form.first_language, languages)} />
              <LanguageSwitchToggle on={allowSwitch} onChange={setAllowSwitch} secondLangName={form.second_language ? langNameOf(form.second_language, languages) : null} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </Button>
            </div>
          </form>
        ) : step === 'credentials' && creds ? (
          <>
            {onboardingNote && (
              <div className="mb-4 rounded-md border border-teal/20 bg-teal-light/30 px-4 py-3 text-sm text-neutral-dark">
                {onboardingNote}
              </div>
            )}
            <CredentialsPanel
              title={`Login credentials created for ${creds.name}`}
              subtitle="Share these details with them securely — this is the only time the password will be shown."
              userId={creds.userId}
              email={creds.email}
              password={creds.password}
              contact={creds.contact}
              token={token}
              onDone={() => setStep('training')}
            />
          </>
        ) : step === 'training' ? (
          <TrainingAssignStep
            token={token}
            userId={newUserId}
            userName={form.name}
            onDone={onClose}
          />
        ) : null}
      </div>
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

export function EditModal({
  user,
  token,
  staffRoles,
  specialistRoles,
  languages,
  onClose,
  onSaved,
}: {
  user:            any
  token:           string
  staffRoles:      string[]
  specialistRoles: string[]
  languages:       { code: string; name: string }[]
  onClose:         () => void
  onSaved:         (updated: any) => void
}) {
  const [form,    setForm]    = useState({
    name:            user.name            ?? '',
    job_role:        user.job_role        ?? '',
    role:            user.role            ?? 'staff',
    shift_type:      user.shift_type      ?? 'any',
    training_hourly_rate: penceToPounds((user as any).training_hourly_rate),
    first_language:  user.first_language  ?? 'eng',
    second_language: user.second_language ?? '',
  })
  const [specialisms, setSpecialisms]     = useState<string[]>(Array.isArray(user.specialisms) ? user.specialisms : [])
  const [hasSpecialism, setHasSpecialism] = useState<boolean>(Array.isArray(user.specialisms) && user.specialisms.length > 0)
  const [auditIds, setAuditIds]           = useState<string[]>(Array.isArray(user.audit_template_ids) ? user.audit_template_ids : [])
  const [commsFirstLang, setCommsFirstLang] = useState<boolean>(user.comms_always_first_language !== false)
  const [allowSwitch, setAllowSwitch] = useState<boolean>((user as any).allow_language_switching === true)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    setLoading(true)
    const res = await createApiClient(token).users.update(user.id, {
      name:            form.name || undefined,
      job_role:        form.job_role || null,
      specialisms:     hasSpecialism ? specialisms : [],
      role:            form.role,
      audit_template_ids: form.role === 'admin' ? [] : auditIds,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      training_hourly_rate: poundsToPence(form.training_hourly_rate),
      first_language:  form.first_language,
      second_language: form.second_language || null,
      comms_always_first_language: commsFirstLang,
      allow_language_switching: allowSwitch && !!form.second_language,
    }).catch((err: Error) => { setError(err.message); return null })
    setLoading(false)
    if (res) onSaved(res.user)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-4xl rounded-card bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-neutral-dark">Edit staff member</h2>
        <p className="mb-5 text-sm text-neutral-mid">Editing <strong className="text-neutral-dark">{user.name}</strong> · {user.email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Full name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={update('name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Position</label>
            <select
              value={form.job_role}
              onChange={update('job_role')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="">— select a position —</option>
              {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Shift pattern</label>
            <select
              value={form.shift_type}
              onChange={update('shift_type')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="any">Flexible / not specified</option>
              <option value="day">Day shift</option>
              <option value="night">Night shift</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Training hourly rate <span className="font-normal text-neutral-mid">(optional)</span></label>
            <div className="flex items-center rounded-md border border-gray-300 px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
              <span className="text-sm text-neutral-mid">£</span>
              <input
                type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00"
                value={form.training_hourly_rate}
                onChange={update('training_hourly_rate')}
                className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              />
              <span className="text-xs text-neutral-mid">/hr</span>
            </div>
            <p className="mt-1 text-xs text-neutral-mid">Used to cost owed training hours on the payroll report.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Specialist role?</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setHasSpecialism(true)}
                className={`rounded-md border px-3 py-1.5 text-sm ${hasSpecialism ? 'border-teal bg-teal-light/30 text-teal' : 'border-gray-300 text-neutral-dark'}`}>Yes</button>
              <button type="button" onClick={() => { setHasSpecialism(false); setSpecialisms([]) }}
                className={`rounded-md border px-3 py-1.5 text-sm ${!hasSpecialism ? 'border-teal bg-teal-light/30 text-teal' : 'border-gray-300 text-neutral-dark'}`}>No</button>
            </div>
            {hasSpecialism && (
              <div className="mt-2">
                {specialisms.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {specialisms.map(s => (
                      <span key={s} className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">
                        {s}
                        <button type="button" onClick={() => setSpecialisms(prev => prev.filter(x => x !== s))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <select value="" onChange={e => { if (e.target.value) setSpecialisms(prev => [...new Set([...prev, e.target.value])]) }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20">
                  <option value="">— add a specialist role —</option>
                  {specialistRoles.filter(r => !specialisms.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <AccessLevelField
              token={token}
              role={form.role}
              auditIds={auditIds}
              onChange={v => { setForm(prev => ({ ...prev, role: v.role })); setAuditIds(v.auditIds) }}
            />
          </div>
          </div>

          <div className="rounded-lg border border-teal/20 bg-teal-light/30 p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-dark">Language preferences</p>
            <p className="text-xs text-neutral-mid">Training questions and automated messages will be sent in the staff member's first language.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-dark">First language</label>
                <select
                  value={form.first_language}
                  onChange={update('first_language')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-dark">
                  Second language
                  <span className="ml-1 font-normal text-neutral-mid">(optional)</span>
                </label>
                <select
                  value={form.second_language}
                  onChange={update('second_language')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  <option value="">— none —</option>
                  {languages.filter(l => l.code !== form.first_language).map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <CommsLanguageToggle on={commsFirstLang} onChange={setCommsFirstLang} langName={langNameOf(form.first_language, languages)} />
            <LanguageSwitchToggle on={allowSwitch} onChange={setAllowSwitch} secondLangName={form.second_language ? langNameOf(form.second_language, languages) : null} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Staff detail overlay ─────────────────────────────────────────────────────

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-mid/70">{label}</p>
      <div className="mt-0.5 text-sm text-neutral-dark">{children}</div>
    </div>
  )
}

export function StaffDetailModal({ userId, token, languages, onClose, onEdit, onChanged }: {
  userId:    string
  token:     string
  languages: { code: string; name: string }[]
  onClose:   () => void
  onEdit:    (user: any) => void
  onChanged: (updated: any | null) => void
}) {
  const [data,        setData]        = useState<{ user: any; training: any[]; onboarding: any[] } | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [view,        setView]        = useState<'detail' | 'assign' | 'onboard'>('detail')
  const [savingComms, setSavingComms] = useState(false)
  const [savingSwitch, setSavingSwitch] = useState(false)

  function load() {
    setLoading(true)
    createApiClient(token).users.get(userId)
      .then(d => setData(d as any))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [userId])

  async function toggleComms(v: boolean) {
    if (!data) return
    setSavingComms(true)
    setData(prev => prev ? { ...prev, user: { ...prev.user, comms_always_first_language: v } } : prev)
    try {
      const res = await createApiClient(token).users.update(userId, { comms_always_first_language: v })
      onChanged(res.user)
    } catch {
      setData(prev => prev ? { ...prev, user: { ...prev.user, comms_always_first_language: !v } } : prev)
    } finally { setSavingComms(false) }
  }

  async function toggleAllowSwitch(v: boolean) {
    if (!data) return
    setSavingSwitch(true)
    setData(prev => prev ? { ...prev, user: { ...prev.user, allow_language_switching: v } } : prev)
    try {
      const res = await createApiClient(token).users.update(userId, { allow_language_switching: v })
      onChanged(res.user)
    } catch {
      setData(prev => prev ? { ...prev, user: { ...prev.user, allow_language_switching: !v } } : prev)
    } finally { setSavingSwitch(false) }
  }

  const user = data?.user

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className={`w-full rounded-card bg-white p-6 shadow-xl ${view === 'detail' ? 'max-w-4xl' : 'max-w-lg'}`}>

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {user && <InitialAvatar name={user.name} role={user.role} />}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark">{user?.name ?? 'Staff member'}</h2>
              {user && <p className="text-xs text-neutral-mid">{user.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/staff/${userId}`} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-teal hover:bg-teal-light/40">
              View full record →
            </Link>
            <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading || !user ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-neutral-mid" /></div>
        ) : view === 'assign' ? (
          <TrainingAssignStep
            token={token}
            userId={userId}
            userName={user.name}
            onDone={() => { setView('detail'); load() }}
          />
        ) : view === 'onboard' ? (
          <OnboardingAssignStep
            token={token}
            userId={userId}
            userName={user.name}
            alreadyFlowIds={data!.onboarding.map(o => o.flow_id)}
            onDone={() => { setView('detail'); load() }}
          />
        ) : (
          <div className="space-y-5">

            {/* Status + edit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={user.role === 'admin' ? 'admin' : 'staff'}>{user.role === 'admin' ? 'Admin' : 'Staff'}</Badge>
                {user.is_active === false
                  ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Deactivated</span>
                  : <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>}
              </div>
              <button onClick={() => onEdit(user)} className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light">
                <Pencil size={13} /> Edit details
              </button>
            </div>

            {/* Two columns: profile + languages on the left, training + onboarding on the right */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-5">

            {/* Profile grid */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-100 bg-neutral-light/40 p-4">
              <Field label="Position">{user.job_role || <span className="italic text-neutral-mid/60">Not set</span>}</Field>
              <Field label="Shift">{user.shift_type === 'day' ? 'Day shift' : user.shift_type === 'night' ? 'Night shift' : 'Flexible'}</Field>
              <Field label="Training rate">{typeof (user as any).training_hourly_rate === 'number' ? `£${((user as any).training_hourly_rate / 100).toFixed(2)}/hr` : <span className="italic text-neutral-mid/60">Not set</span>}</Field>
              <Field label="Email questions">
                <span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-neutral-mid" />Enabled</span>
              </Field>
              <div className="col-span-2">
                <Field label="Specialist roles">
                  {Array.isArray(user.specialisms) && user.specialisms.length > 0
                    ? <div className="flex flex-wrap gap-1.5">{user.specialisms.map((s: string) => (
                        <span key={s} className="rounded-full bg-teal/10 px-2 py-0.5 text-xs text-teal">{s}</span>
                      ))}</div>
                    : <span className="italic text-neutral-mid/60">None</span>}
                </Field>
              </div>
            </div>

            {/* Languages + comms toggle */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Globe size={15} className="text-teal" /> Language</p>
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-100 p-4">
                <Field label="First language">{langNameOf(user.first_language, languages)}</Field>
                <Field label="Second language">{user.second_language ? langNameOf(user.second_language, languages) : <span className="italic text-neutral-mid/60">None</span>}</Field>
                <div className="col-span-2">
                  <CommsLanguageToggle on={user.comms_always_first_language !== false} onChange={toggleComms} langName={langNameOf(user.first_language, languages)} disabled={savingComms} />
                </div>
                <div className="col-span-2">
                  <LanguageSwitchToggle on={user.allow_language_switching === true} onChange={toggleAllowSwitch} secondLangName={user.second_language ? langNameOf(user.second_language, languages) : null} disabled={savingSwitch} />
                </div>
              </div>
            </div>

            </div>{/* ── end left column ── */}

            <div className="space-y-5">{/* ── right column ── */}
            {/* Training */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><GraduationCap size={15} className="text-teal" /> Training <span className="text-xs font-normal text-neutral-mid">({data!.training.length})</span></p>
                <button onClick={() => setView('assign')} className="flex items-center gap-1 rounded-md bg-teal px-2.5 py-1 text-xs font-medium text-white hover:bg-teal/90">
                  <Plus size={12} /> Assign training
                </button>
              </div>
              {data!.training.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-xs text-neutral-mid">No training assigned yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {data!.training.map(t => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-neutral-dark">{t.module_name}</p>
                        <p className="text-[11px] text-neutral-mid">{t.category === 'statutory' ? 'Statutory' : 'Specialist'}{t.due_date ? ` · due ${fmtDate(t.due_date)?.split(' ')[0]}` : ''}</p>
                      </div>
                      <StatusPill status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Onboarding */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><ListChecks size={15} className="text-teal" /> Onboarding <span className="text-xs font-normal text-neutral-mid">({data!.onboarding.length})</span></p>
                <button onClick={() => setView('onboard')} className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-600">
                  <Plus size={12} /> Assign onboarding
                </button>
              </div>
              {data!.onboarding.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-xs text-neutral-mid">Not enrolled in any onboarding flow.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {data!.onboarding.map(o => (
                    <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-neutral-dark">{o.flow_name}</p>
                        <p className="text-[11px] text-neutral-mid">{o.flow_kind === 'secondary' ? 'Specialism' : 'Role'} · {o.completed_steps}/{o.total_steps} steps</p>
                      </div>
                      {o.completed_at
                        ? <StatusPill status="complete" />
                        : <StatusPill status={o.completed_steps > 0 ? 'in_progress' : 'not_started'} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            </div>{/* ── end right column ── */}
            </div>{/* ── end two-column grid ── */}

            {/* Dates */}
            <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-xs">
              <div><p className="text-neutral-mid/70">Added</p><p className="mt-0.5 text-neutral-dark">{user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p></div>
              <div><p className="text-neutral-mid/70">First login</p><p className="mt-0.5 text-neutral-dark">{user.first_login_at ? fmtDate(user.first_login_at) : 'Never'}</p></div>
              <div><p className="text-neutral-mid/70">Last seen</p><p className="mt-0.5 text-neutral-dark">{user.last_login_at ? fmtDate(user.last_login_at) : '—'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
