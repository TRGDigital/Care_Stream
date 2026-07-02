'use client'

// Workforce compliance register (Enterprise). A staff x credentials grid showing
// DBS, right to work, professional registration and references, each Red/Amber/
// Green by expiry. Click a staff row to record or update their credentials.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { usePlanFeatures, hasFeature } from '@/lib/use-plan-features'
import { ShieldCheck, Lock, Loader2, X, AlertTriangle, CheckCircle2, Clock, Trash2, Users } from 'lucide-react'

type Register = Awaited<ReturnType<ReturnType<typeof createApiClient>['workforce']['register']>>
type StaffRow = Register['staff'][number]

// Credential types shown as columns, with per-type labels for the editor.
const TYPES: { key: string; label: string; short: string; refLabel: string; refPlaceholder: string; hasExpiry: boolean }[] = [
  { key: 'dbs',                        label: 'DBS check',              short: 'DBS',          refLabel: 'Certificate number',        refPlaceholder: 'e.g. 001234567890', hasExpiry: true },
  { key: 'right_to_work',              label: 'Right to work',          short: 'Right to work', refLabel: 'Document type',            refPlaceholder: 'e.g. British passport, Skilled Worker visa', hasExpiry: true },
  { key: 'professional_registration', label: 'Professional registration', short: 'Registration', refLabel: 'Body & registration number', refPlaceholder: 'e.g. NMC 12A3456B', hasExpiry: true },
  { key: 'reference',                  label: 'References',             short: 'References',   refLabel: 'Reference notes',           refPlaceholder: 'e.g. 2 of 2 received', hasExpiry: false },
]

const STATUS: Record<string, { cls: string; label: string }> = {
  valid:       { cls: 'bg-green-50 text-green-700', label: 'Valid' },
  received:    { cls: 'bg-green-50 text-green-700', label: 'Received' },
  expiring:    { cls: 'bg-amber-50 text-amber-700', label: 'Expiring' },
  expired:     { cls: 'bg-red-50 text-red-600',     label: 'Expired' },
  missing:     { cls: 'bg-red-50 text-red-600',     label: 'Missing' },
  outstanding: { cls: 'bg-gray-100 text-gray-500',  label: 'Outstanding' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function toInputDate(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

function SummaryCard({ label, value, cls, Icon }: { label: string; value: number; cls: string; Icon: any }) {
  return (
    <div className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-mid">{label}</p>
        <Icon size={15} className={cls} />
      </div>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

export default function WorkforcePage() {
  const { data: session } = useSession()
  const { features, loading: planLoading } = usePlanFeatures()
  const enabled = hasFeature(features, 'has_workforce_compliance')

  const [data, setData] = useState<Register | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<StaffRow | null>(null)

  async function load() {
    if (!session?.accessToken) return
    try { setData(await createApiClient(session.accessToken).workforce.register()) }
    catch { /* gated or error */ }
    finally { setLoading(false) }
  }
  useEffect(() => { if (enabled) load() }, [session?.accessToken, enabled])

  // ── Enterprise gate ─────────────────────────────────────────────────────────
  if (!planLoading && !enabled) {
    return (
      <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10"><Lock size={22} className="text-teal" /></div>
        <p className="font-semibold text-neutral-dark">Workforce compliance register</p>
        <span className="mt-1 inline-block rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">Enterprise feature</span>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-mid">
          Keep every staff member&rsquo;s DBS, right to work, professional registration and references in one place,
          with expiry tracking and a live Red/Amber/Green view for CQC. Available on the Enterprise plan.
        </p>
        <Link href="/billing" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90">
          Upgrade to Enterprise
        </Link>
      </div>
    )
  }

  if (loading || planLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}</div>
        <div className="h-72 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  const s = data?.summary ?? { valid: 0, expiring: 0, expired: 0, missing: 0 }
  const staff = data?.staff ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-dark">Workforce compliance</h1>
        <p className="mt-0.5 text-sm text-neutral-mid">Safe-recruitment credentials for every staff member. Click a row to record or update their credentials.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Valid"        value={s.valid}    cls="text-green-600" Icon={CheckCircle2} />
        <SummaryCard label="Expiring soon" value={s.expiring} cls="text-amber-600" Icon={Clock} />
        <SummaryCard label="Expired"      value={s.expired}  cls="text-red-600"   Icon={AlertTriangle} />
        <SummaryCard label="Missing"      value={s.missing}  cls="text-neutral-mid" Icon={Users} />
      </div>

      {/* Register */}
      <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Register</h2>
        </div>
        {staff.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-mid">No active staff yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-neutral-mid">
                  <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left min-w-[180px]">Staff member</th>
                  {TYPES.map(t => <th key={t.key} className="px-3 py-3 text-center min-w-[120px]">{t.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {staff.map(row => (
                  <tr key={row.id} onClick={() => setEditing(row)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                      <p className="font-medium text-neutral-dark">{row.name}</p>
                      <p className="text-xs text-neutral-mid">{row.job_role ?? '—'}</p>
                    </td>
                    {TYPES.map(t => {
                      const c = row.credentials[t.key]
                      const meta = STATUS[c?.status ?? 'missing'] ?? STATUS.missing
                      return (
                        <td key={t.key} className="px-3 py-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                          {t.hasExpiry && c?.expires_at && <p className="mt-0.5 text-[10px] text-neutral-mid">{fmtDate(c.expires_at)}</p>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-green-700">Valid</span> in date</span>
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Expiring</span> within 30 days</span>
          <span className="flex items-center gap-1.5"><span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-red-600">Expired / Missing</span> action needed</span>
        </div>
      </div>

      {editing && session?.accessToken && (
        <EditStaffModal token={session.accessToken} staff={editing} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  )
}

// ── Per-staff editor ────────────────────────────────────────────────────────────
function EditStaffModal({ token, staff, onClose, onSaved }: { token: string; staff: StaffRow; onClose: () => void; onSaved: () => void }) {
  const api = createApiClient(token)
  const [form, setForm] = useState<Record<string, { reference: string; issued_at: string; expires_at: string; notes: string }>>(() => {
    const init: any = {}
    for (const t of TYPES) {
      const c = staff.credentials[t.key]
      init[t.key] = { reference: c?.reference ?? '', issued_at: toInputDate(c?.issued_at ?? null), expires_at: toInputDate(c?.expires_at ?? null), notes: c?.notes ?? '' }
    }
    return init
  })
  const [busy, setBusy] = useState<string | null>(null)

  function set(type: string, patch: Partial<{ reference: string; issued_at: string; expires_at: string; notes: string }>) {
    setForm(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }))
  }

  async function save(type: string) {
    setBusy(type)
    try {
      const f = form[type]
      await api.workforce.saveCredential(staff.id, type, {
        reference: f.reference, issued_at: f.issued_at || null, expires_at: f.expires_at || null, notes: f.notes,
      })
      onSaved()
    } finally { setBusy(null) }
  }
  async function clear(type: string) {
    setBusy(type)
    try { await api.workforce.deleteCredential(staff.id, type); set(type, { reference: '', issued_at: '', expires_at: '', notes: '' }); onSaved() }
    finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">{staff.name}</h2>
            <p className="text-xs text-neutral-mid">{staff.job_role ?? '—'} · compliance credentials</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {TYPES.map(t => {
            const f = form[t.key]
            return (
              <div key={t.key} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal" />
                  <p className="text-sm font-semibold text-neutral-dark">{t.label}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={t.hasExpiry ? '' : 'sm:col-span-2'}>
                    <label className="mb-1 block text-xs font-medium text-neutral-mid">{t.refLabel}</label>
                    <input value={f.reference} onChange={e => set(t.key, { reference: e.target.value })} placeholder={t.refPlaceholder}
                      className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                  </div>
                  {t.hasExpiry && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-mid">Issued</label>
                        <input type="date" value={f.issued_at} onChange={e => set(t.key, { issued_at: e.target.value })}
                          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-neutral-mid">Expires / renews</label>
                        <input type="date" value={f.expires_at} onChange={e => set(t.key, { expires_at: e.target.value })}
                          className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-neutral-mid">Notes (optional)</label>
                    <input value={f.notes} onChange={e => set(t.key, { notes: e.target.value })}
                      className="w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button onClick={() => clear(t.key)} disabled={busy === t.key} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-mid hover:text-red-500 disabled:opacity-50">
                    <Trash2 size={12} /> Clear
                  </button>
                  <button onClick={() => save(t.key)} disabled={busy === t.key} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">
                    {busy === t.key ? <Loader2 size={12} className="animate-spin" /> : null} Save
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Done</button>
        </div>
      </div>
    </div>
  )
}
