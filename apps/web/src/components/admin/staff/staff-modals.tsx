'use client'

// Staff modals — extracted from the staff page and lazy-loaded (next/dynamic)
// so this code is only fetched when a user opens one of these dialogs.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, GraduationCap, ListChecks, Loader2, Mail, Pencil, Phone, Plus, X } from 'lucide-react'
import {
  CommsLanguageToggle,
  CredentialsPanel,
  InitialAvatar,
  fmtDate,
  langNameOf,
} from './staff-shared'

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
  const [form,      setForm]      = useState({ name: '', email: '', role: 'staff', job_role: '', phone_number: '', shift_type: 'any', first_language: 'eng', second_language: '', staff_type: 'existing' })
  const [hasSpecialism, setHasSpecialism] = useState(false)
  const [specialisms, setSpecialisms]     = useState<string[]>([])
  const [commsFirstLang, setCommsFirstLang] = useState(true)
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

    // Basic E.164 check before hitting the API
    if (form.phone_number && !/^\+[1-9]\d{7,14}$/.test(form.phone_number)) {
      setError('WhatsApp number must be in international format, e.g. +447911123456')
      return
    }

    setLoading(true)

    const res = await createApiClient(token).users.invite({
      name:            form.name,
      email:           form.email,
      role:            form.role,
      job_role:        form.job_role || undefined,
      specialisms:     hasSpecialism ? specialisms : [],
      phone_number:    form.phone_number || undefined,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      first_language:  form.first_language,
      second_language: form.second_language || undefined,
      comms_always_first_language: commsFirstLang,
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
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
                  WhatsApp number
                  <span className="ml-1.5 text-xs font-normal text-neutral-mid">(optional)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <input
                    type="tel"
                    placeholder="+447911123456"
                    value={form.phone_number}
                    onChange={update('phone_number')}
                    className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-mid">
                  Include the country code. Enables policy questions via WhatsApp.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Access level</label>
                  <select
                    value={form.role}
                    onChange={update('role')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="staff">Staff — chat only</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
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
    phone_number:    user.phone_number    ?? '',
    shift_type:      user.shift_type      ?? 'any',
    first_language:  user.first_language  ?? 'eng',
    second_language: user.second_language ?? '',
  })
  const [specialisms, setSpecialisms]     = useState<string[]>(Array.isArray(user.specialisms) ? user.specialisms : [])
  const [hasSpecialism, setHasSpecialism] = useState<boolean>(Array.isArray(user.specialisms) && user.specialisms.length > 0)
  const [commsFirstLang, setCommsFirstLang] = useState<boolean>(user.comms_always_first_language !== false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.phone_number && !/^\+[1-9]\d{7,14}$/.test(form.phone_number)) {
      setError('WhatsApp number must be in international format, e.g. +447911123456')
      return
    }

    setLoading(true)
    const res = await createApiClient(token).users.update(user.id, {
      name:            form.name || undefined,
      job_role:        form.job_role || null,
      specialisms:     hasSpecialism ? specialisms : [],
      role:            form.role,
      phone_number:    form.phone_number || null,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      first_language:  form.first_language,
      second_language: form.second_language || null,
      comms_always_first_language: commsFirstLang,
    }).catch((err: Error) => { setError(err.message); return null })
    setLoading(false)
    if (res) onSaved(res.user)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-neutral-dark">Edit staff member</h2>
        <p className="mb-5 text-sm text-neutral-mid">Editing <strong className="text-neutral-dark">{user.name}</strong> · {user.email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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

          <div className="grid grid-cols-2 gap-4">
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
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">System access level</label>
              <select
                value={form.role}
                onChange={update('role')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="staff">Staff — chat access only</option>
                <option value="admin">Admin — full dashboard access</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">
              WhatsApp number
              <span className="ml-1.5 text-xs font-normal text-neutral-mid">(optional)</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <input
                type="tel"
                placeholder="+447911123456"
                value={form.phone_number}
                onChange={update('phone_number')}
                className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-mid">
              Include the country code. Leave blank to remove WhatsApp access.
            </p>
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
              <Field label="WhatsApp">
                {user.phone_number
                  ? <span className="inline-flex items-center gap-1.5"><Phone size={12} className="text-green-600" />{user.phone_number}</span>
                  : <span className="italic text-neutral-mid/60">Not set</span>}
              </Field>
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
