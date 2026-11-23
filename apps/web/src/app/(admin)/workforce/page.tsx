'use client'

// Workforce compliance register (Enterprise). A staff x credentials grid showing
// DBS, right to work, professional registration and references, each Red/Amber/
// Green by expiry. Click a staff row to record or update their credentials.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient, type StaffDetails } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { usePlanFeatures, hasFeature } from '@/lib/use-plan-features'
import { SupervisionsView } from '@/components/admin/workforce/supervisions-view'
import { ShieldCheck, Lock, Loader2, X, AlertTriangle, CheckCircle2, Clock, Trash2, Users, Paperclip, Upload, Mail, Info, ChevronDown, ChevronLeft, ChevronRight, Download, Cake, Eye } from 'lucide-react'

type Register = Awaited<ReturnType<ReturnType<typeof createApiClient>['workforce']['register']>>
type StaffRow = Register['staff'][number]

// Credential types. CORE types are columns in the grid and are expected for everyone; EXTRA types only apply to some staff (drivers, sponsored
// workers, a contract on file), so they show as small chips when recorded and are never "missing".
type TypeDef = { key: string; label: string; short: string; refLabel: string; refPlaceholder: string; hasExpiry: boolean; issuedLabel?: string; expiresLabel?: string; help?: string }
const CORE_TYPES: TypeDef[] = [
  { key: 'dbs',                        label: 'DBS check',              short: 'DBS',          refLabel: 'Certificate number',        refPlaceholder: 'e.g. 001234567890', hasExpiry: true },
  { key: 'right_to_work',              label: 'Right to work',          short: 'Right to work', refLabel: 'Document type',            refPlaceholder: 'e.g. British passport, Skilled Worker visa', hasExpiry: true },
  { key: 'passport',                   label: 'Passport',               short: 'Passport',     refLabel: 'Passport number',           refPlaceholder: 'e.g. 123456789', hasExpiry: true },
  { key: 'professional_registration', label: 'Professional registration', short: 'Registration', refLabel: 'Registration number (PIN)', refPlaceholder: 'e.g. 12A3456B', hasExpiry: true, expiresLabel: 'Renewal / revalidation due',
    help: 'For nurses choose NMC and enter the PIN. Upload the NMC registration certificate or a screenshot of the register entry.' },
  { key: 'reference',                  label: 'References',             short: 'References',   refLabel: 'Reference notes',           refPlaceholder: 'e.g. 2 of 2 received', hasExpiry: false },
]
const EXTRA_TYPES: TypeDef[] = [
  { key: 'visa',               label: 'Visa and sponsorship',   short: 'Visa',      refLabel: 'Visa type and reference', refPlaceholder: 'e.g. Skilled Worker, share code or BRP number', hasExpiry: true, issuedLabel: 'Visa starts', expiresLabel: 'Visa expires',
    help: 'For sponsored workers whose right to work has a time limit. Add the sponsorship end date as well, so you are told before it lapses.' },
  { key: 'driving_licence',    label: 'Driving licence',        short: 'Licence',   refLabel: 'Licence number',          refPlaceholder: 'e.g. SMITH 901010 AB9CD', hasExpiry: true, help: 'For home care staff who drive. Record any penalty points or restrictions in the notes.' },
  { key: 'business_insurance', label: 'Business use insurance', short: 'Insurance', refLabel: 'Insurer and policy number', refPlaceholder: 'e.g. Admiral, 12345678', hasExpiry: true, issuedLabel: 'Cover starts', expiresLabel: 'Cover ends' },
  { key: 'mot',                label: 'MOT',                    short: 'MOT',       refLabel: 'Vehicle registration',    refPlaceholder: 'e.g. AB12 CDE', hasExpiry: true, issuedLabel: 'Test date', expiresLabel: 'MOT expires' },
  { key: 'contract',           label: 'Contract',               short: 'Contract',  refLabel: 'Contract reference',      refPlaceholder: 'optional', hasExpiry: true, issuedLabel: 'Start date', expiresLabel: 'End date (fixed term only)' },
]
const TYPES: TypeDef[] = [...CORE_TYPES, ...EXTRA_TYPES]
const REG_BODIES = ['NMC', 'GPhC', 'HCPC', 'GMC', 'Social Work England', 'Other']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const STATUS: Record<string, { cls: string; label: string }> = {
  valid:       { cls: 'bg-green-50 text-green-700', label: 'Valid' },
  received:    { cls: 'bg-green-50 text-green-700', label: 'Received' },
  expiring:    { cls: 'bg-amber-50 text-amber-700', label: 'Expiring' },
  expired:     { cls: 'bg-red-50 text-red-600',     label: 'Expired' },
  missing:     { cls: 'bg-red-50 text-red-600',     label: 'Missing' },
  outstanding: { cls: 'bg-gray-100 text-gray-500',  label: 'Outstanding' },
  none:        { cls: 'bg-gray-50 text-gray-400',   label: 'Not recorded' },
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function toInputDate(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

// Collapsible "how to use this tab" helper — same style as the rest of the site.
function HelpAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40">
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">{title}</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          {children}
        </div>
      )}
    </div>
  )
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
  // Two plan levels in one page: supervisions and appraisals are on Starter, Professional and Enterprise; the credentials register (DBS, right
  // to work, registration, references) is Enterprise only. `enabled` is the register; `supEnabled` is supervisions.
  const enabled = hasFeature(features, 'has_workforce_compliance')
  const supEnabled = enabled || hasFeature(features, 'has_supervisions')

  const userId = session?.user?.email ?? 'guest'
  const regKey = `admin-workforce-register-${userId}`
  const [data, setData] = useState<Register | null>(() => persistentCache.get<Register>(regKey) ?? null)
  const [loading, setLoading] = useState(() => persistentCache.get<Register>(regKey) === undefined)
  const [editing, setEditing] = useState<StaffRow | null>(null)
  // Document overlay: opens over the register (or the editor) so an admin can read a DBS, right to work or other document without leaving the page.
  const [viewing, setViewing] = useState<{ staff: StaffRow; type: string } | null>(null)
  const [birthdays, setBirthdays] = useState<Array<{ user_id: string; name: string; on: string; in_days: number; turning: number }>>([])
  // Deep-linkable: /workforce?tab=supervisions opens straight on that tab
  // (used by CareStream Suggestions and anywhere else that links to a tab).
  const [tabWanted, setTab] = useState<'credentials' | 'supervisions'>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'supervisions'
      ? 'supervisions' : 'credentials'
  )
  // Without the register (Starter and Professional) the only tab is supervisions.
  const tab: 'credentials' | 'supervisions' = enabled ? tabWanted : 'supervisions'
  const [alertState, setAlertState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [alertMsg, setAlertMsg] = useState('')

  async function sendAlerts() {
    if (!session?.accessToken || alertState === 'sending') return
    setAlertState('sending'); setAlertMsg('')
    try {
      const r = await createApiClient(session.accessToken).settings.sendComplianceExpiryAlerts()
      const passportNote = r.passport_staff > 0 ? ` ${r.passport_staff} staff emailed about their passport.` : ''
      if (r.expired === 0 && r.expiring === 0) { setAlertState('sent'); setAlertMsg('Nothing expired or expiring in the next 30 days.') }
      else if (r.sent && r.recipients > 0) { setAlertState('sent'); setAlertMsg(`Emailed ${r.recipients} admin${r.recipients === 1 ? '' : 's'}: ${r.expired} expired, ${r.expiring} expiring soon.${passportNote}`) }
      else if (r.passport_staff > 0) { setAlertState('sent'); setAlertMsg(`No admin recipients, but${passportNote}`) }
      else { setAlertState('sent'); setAlertMsg('No admin recipients to email.') }
    } catch { setAlertState('error'); setAlertMsg('Could not send the alerts.') }
  }

  async function load() {
    if (!session?.accessToken) return
    try { const d = await createApiClient(session.accessToken).workforce.register(); setData(d); persistentCache.set(regKey, d) }
    catch { /* gated or error */ }
    finally { setLoading(false) }
  }
  // Paint instantly from the last-loaded snapshot, then revalidate in the background.
  useEffect(() => {
    const cached = persistentCache.get<Register>(regKey)
    if (cached) { setData(cached); setLoading(false) }
  }, [regKey])
  useEffect(() => { if (enabled) load() }, [session?.accessToken, enabled])
  useEffect(() => {
    if (!enabled || !session?.accessToken) return
    createApiClient(session.accessToken).workforce.birthdays().then(r => setBirthdays(r.birthdays)).catch(() => setBirthdays([]))
  }, [session?.accessToken, enabled])

  // ── Plan gate: neither supervisions nor the register (the Free plan) ────────────────────────────────────────────
  if (!planLoading && !supEnabled) {
    return (
      <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10"><Lock size={22} className="text-teal" /></div>
        <p className="font-semibold text-neutral-dark">Supervisions, appraisals and the workforce register</p>
        <span className="mt-1 inline-block rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">Supervisions from Starter, the register on Enterprise</span>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-mid">
          Record supervisions and appraisals and turn what you agree into actions, on Starter, Professional and Enterprise. Enterprise also keeps every
          staff member&rsquo;s DBS, right to work, professional registration and references in one place, with expiry tracking and a live Red/Amber/Green view for CQC.
        </p>
        <Link href="/billing" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90">
          See plans
        </Link>
      </div>
    )
  }

  if ((loading || planLoading) && !data && enabled) {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-dark">Workforce compliance</h1>
          <p className="mt-0.5 text-sm text-neutral-mid">Safe-recruitment credentials, supervisions and appraisals for every staff member.</p>
        </div>
        {tab === 'credentials' && enabled && (
          <div className="flex flex-col items-end gap-1">
            <button onClick={sendAlerts} disabled={alertState === 'sending'}
              title="Email your admins a digest of credentials that are expired or expiring within 30 days"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
              {alertState === 'sending' ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Mail size={13} /> Email expiry alerts</>}
            </button>
            {alertMsg && <p className={`max-w-[16rem] text-right text-xs ${alertState === 'error' ? 'text-red-600' : 'text-neutral-mid'}`}>{alertMsg}</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
        {(enabled ? [['credentials', 'Credentials'], ['supervisions', 'Supervisions & appraisals']] as const : [['supervisions', 'Supervisions & appraisals']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'}`}>
            {label}
          </button>
        ))}
      </div>

      {!enabled && supEnabled && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-neutral-mid"><Lock size={12} className="text-teal" /> The credentials register (DBS, right to work, registration, references) is on the Enterprise plan. <Link href="/billing" className="font-medium text-teal hover:underline">See plans</Link></p>
      )}

      {tab === 'supervisions' && session?.accessToken && <SupervisionsView token={session.accessToken} userId={userId} />}

      {tab === 'credentials' && enabled && (<>
      <HelpAccordion title="How to use the Credentials register">
        <p>This register is your single view of the safe-recruitment documents CQC expects for every member of staff: <strong>DBS check</strong>, <strong>right to work</strong>, <strong>passport</strong> (important for overseas staff), <strong>professional registration</strong> (e.g. NMC, with the PIN and certificate) and <strong>references</strong>.</p>
        <p>The <strong>Also held</strong> column shows documents that only apply to some staff: <strong>visa and sponsorship</strong>, <strong>driving licence</strong>, <strong>business use insurance</strong>, <strong>MOT</strong> and the <strong>contract</strong>. These are never marked missing; they simply follow the same colours once recorded. The <strong>Personal</strong> column shows how much of date of birth, emergency contact, next of kin, contract and holiday has been filled in.</p>
        <p><strong>To read a document</strong>, click <strong>View</strong> next to any status. It opens over the page so you can check it and move to their other documents without leaving the register. Only administrators of your account can see these documents and personal details.</p>
        <p>Each staff member is a row and each credential a column, colour-coded so you can see status at a glance: <span className="font-medium text-green-700">Valid</span> (in date), <span className="font-medium text-amber-700">Expiring</span> (within 30 days), <span className="font-medium text-red-600">Expired / Missing</span> (action needed).</p>
        <p><strong>To record or update a credential</strong>, click a staff member&rsquo;s row. Enter the reference (e.g. DBS certificate number), the issued and expiry dates, any notes, and optionally <strong>upload the document itself</strong> (PDF or photo) so it&rsquo;s stored securely against their record.</p>
        <p><strong>Expiry alerts:</strong> use <strong>Email expiry alerts</strong> (top right) to send your admins a digest of anything expired or expiring within 30 days. Staff with a passport nearing renewal are emailed automatically. These also run on a schedule, so nothing slips through.</p>
        <p>The four cards above summarise the whole team, giving you an instant, inspection-ready compliance picture.</p>
      </HelpAccordion>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Valid"        value={s.valid}    cls="text-green-600" Icon={CheckCircle2} />
        <SummaryCard label="Expiring soon" value={s.expiring} cls="text-amber-600" Icon={Clock} />
        <SummaryCard label="Expired"      value={s.expired}  cls="text-red-600"   Icon={AlertTriangle} />
        <SummaryCard label="Missing"      value={s.missing}  cls="text-neutral-mid" Icon={Users} />
      </div>

      {birthdays.length > 0 && (
        <div className="rounded-card border border-gray-100 bg-white px-5 py-3 shadow-card">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-dark"><Cake size={14} className="text-teal" /> Birthdays coming up</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-mid">
            {birthdays.slice(0, 8).map(b => (
              <span key={b.user_id}><span className="font-medium text-neutral-dark">{b.name}</span> {b.in_days === 0 ? 'today' : b.in_days === 1 ? 'tomorrow' : `in ${b.in_days} days`} <span className="text-xs">({fmtDate(b.on)}, turning {b.turning})</span></span>
            ))}
          </div>
        </div>
      )}

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
                  {CORE_TYPES.map(t => <th key={t.key} className="px-3 py-3 text-center min-w-[120px]">{t.short}</th>)}
                  <th className="px-3 py-3 text-center min-w-[150px]">Also held</th>
                  <th className="px-3 py-3 text-center min-w-[90px]">Personal</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(row => (
                  <tr key={row.id} onClick={() => setEditing(row)} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3">
                      <p className="font-medium text-neutral-dark">{row.name}</p>
                      <p className="text-xs text-neutral-mid">{row.job_role ?? '—'}</p>
                    </td>
                    {CORE_TYPES.map(t => {
                      const c = row.credentials[t.key]
                      const meta = STATUS[c?.status ?? 'missing'] ?? STATUS.missing
                      return (
                        <td key={t.key} className="px-3 py-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                          {t.hasExpiry && c?.expires_at && <p className="mt-0.5 text-[10px] text-neutral-mid">{fmtDate(c.expires_at)}</p>}
                          {(c?.document || c?.reference || c?.notes) && (
                            <button type="button" title={c.document ? `View ${c.document.name}` : 'View details'}
                              onClick={e => { e.stopPropagation(); setViewing({ staff: row, type: t.key }) }}
                              className="mt-1 inline-flex items-center gap-1 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-teal hover:border-teal/40 hover:bg-teal/5">
                              <Eye size={10} /> View
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {EXTRA_TYPES.filter(t => row.credentials[t.key]?.present).map(t => {
                          const c = row.credentials[t.key]
                          const meta = STATUS[c.status] ?? STATUS.valid
                          return (
                            <button key={t.key} type="button" title={`${t.label}: ${meta.label}${c.expires_at ? ' · ' + fmtDate(c.expires_at) : ''}. Click to view.`}
                              onClick={e => { e.stopPropagation(); setViewing({ staff: row, type: t.key }) }}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium hover:ring-1 hover:ring-teal/40 ${meta.cls}`}>{t.short}</button>
                          )
                        })}
                        {!EXTRA_TYPES.some(t => row.credentials[t.key]?.present) && <span className="text-xs text-gray-300">–</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const d = row.details
                        const done = d ? [d.dob, d.emergency, d.next_of_kin, d.contract, d.holiday].filter(Boolean).length : 0
                        return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${done === 5 ? 'bg-green-50 text-green-700' : done === 0 ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`} title="Date of birth, emergency contact, next of kin, contract, holiday">{done}/5</span>
                      })()}
                    </td>
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
      </>)}

      {editing && session?.accessToken && (
        <EditStaffModal token={session.accessToken} staff={editing} onClose={() => setEditing(null)} onSaved={load} onView={type => setViewing({ staff: editing, type })} />
      )}
      {viewing && session?.accessToken && (
        <DocumentOverlay token={session.accessToken} staff={data?.staff.find(x => x.id === viewing.staff.id) ?? viewing.staff} type={viewing.type} onType={type => setViewing({ staff: viewing.staff, type })} onClose={() => setViewing(null)}
          onEdit={() => { setEditing(data?.staff.find(x => x.id === viewing.staff.id) ?? viewing.staff); setViewing(null) }} />
      )}
    </div>
  )
}

// ── Document overlay ───────────────────────────────────────────────────────────
// Opens over the page: the document on one side (PDF or photo), what is recorded about it on the other, and arrows to move through the
// person's other documents. Only admins reach this page, and the file is fetched with their sign-in, never from a public address.
function DocumentOverlay({ token, staff, type, onType, onClose, onEdit }: { token: string; staff: StaffRow; type: string; onType: (t: string) => void; onClose: () => void; onEdit: () => void }) {
  const api = createApiClient(token)
  const held = TYPES.filter(t => staff.credentials[t.key]?.present || staff.credentials[t.key]?.document)
  const def = TYPES.find(t => t.key === type) ?? TYPES[0]
  const c = staff.credentials[type]
  const idx = held.findIndex(t => t.key === type)
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fail, setFail] = useState('')
  const mime = c?.document?.type ?? ''

  useEffect(() => {
    let url: string | null = null, live = true
    setSrc(null); setFail('')
    if (!c?.document) return
    setLoading(true)
    api.workforce.downloadDocument(staff.id, type)
      .then(b => { if (!live) return; url = URL.createObjectURL(b); setSrc(url) })
      .catch(() => live && setFail('Could not open the document.'))
      .finally(() => live && setLoading(false))
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [staff.id, type, c?.document?.name, c?.document?.uploaded_at])

  const go = (d: number) => { if (held.length > 1) onType(held[(Math.max(idx, 0) + d + held.length) % held.length].key) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })

  const meta = STATUS[c?.status ?? 'missing'] ?? STATUS.missing
  const rows: Array<[string, string | null | undefined]> = [
    [def.refLabel, c?.reference],
    ...(type === 'professional_registration' ? [['Registered with', c?.registration_body] as [string, string | null | undefined]] : []),
    [def.issuedLabel ?? 'Issued', c?.issued_at ? fmtDate(c.issued_at) : null],
    ...(def.hasExpiry ? [[def.expiresLabel ?? 'Expires / renews', c?.expires_at ? fmtDate(c.expires_at) : null] as [string, string | null]] : []),
    ...(type === 'visa' ? [['Sponsorship ends', c?.sponsorship_ends_at ? fmtDate(c.sponsorship_ends_at) : null] as [string, string | null]] : []),
    ['Notes', c?.notes],
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${staff.name}: ${def.label}`}>
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-neutral-dark">{staff.name} <span className="font-normal text-neutral-mid">· {def.label}</span></h2>
            <p className="text-xs text-neutral-mid">{staff.job_role ?? '—'}{held.length > 1 && idx >= 0 ? ` · document ${idx + 1} of ${held.length}` : ''}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {held.length > 1 && (<>
              <button onClick={() => go(-1)} title="Previous (left arrow)" className="rounded p-1.5 text-neutral-mid hover:bg-gray-100 hover:text-neutral-dark"><ChevronLeft size={18} /></button>
              <button onClick={() => go(1)} title="Next (right arrow)" className="rounded p-1.5 text-neutral-mid hover:bg-gray-100 hover:text-neutral-dark"><ChevronRight size={18} /></button>
            </>)}
            <button onClick={onClose} title="Close (Esc)" className="ml-1 rounded p-1.5 text-neutral-mid hover:bg-gray-100 hover:text-neutral-dark"><X size={18} /></button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div className="flex min-h-[40vh] flex-1 items-center justify-center overflow-auto bg-neutral-light/50 p-2">
            {!c?.document ? (
              <p className="px-6 text-center text-sm text-neutral-mid">No document has been uploaded for this yet. The details on the right are what has been recorded.</p>
            ) : loading ? <Loader2 className="animate-spin text-teal" />
            : fail ? <p className="text-sm text-red-600">{fail}</p>
            : src && mime.startsWith('image/') ? <img src={src} alt={`${def.label} for ${staff.name}`} className="max-h-full max-w-full object-contain" />
            : src ? <iframe src={src} title={`${def.label} for ${staff.name}`} className="h-full min-h-[50vh] w-full rounded bg-white" />
            : null}
          </div>
          <div className="w-full shrink-0 space-y-3 overflow-y-auto border-t border-gray-100 p-5 md:w-80 md:border-l md:border-t-0">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
            <dl className="space-y-2.5 text-sm">
              {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-xs font-medium text-neutral-mid">{k}</dt><dd className="break-words text-neutral-dark">{v}</dd></div>))}
              {rows.every(([, v]) => !v) && <p className="text-sm text-neutral-mid">Nothing recorded yet.</p>}
            </dl>
            {c?.document && <p className="text-xs text-neutral-mid"><Paperclip size={11} className="mr-1 inline" />{c.document.name} · added {fmtDate(c.document.uploaded_at)}</p>}
            {held.length > 1 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {held.map(t => <button key={t.key} onClick={() => onType(t.key)} className={`rounded-full border px-2 py-0.5 text-[11px] ${t.key === type ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid hover:border-teal/40'}`}>{t.short}</button>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {src && <a href={src} download={c?.document?.name ?? 'document'} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Download size={12} /> Download</a>}
              <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90">Edit record</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Per-staff editor ────────────────────────────────────────────────────────────
type CredForm = { reference: string; issued_at: string; expires_at: string; notes: string; registration_body: string; sponsorship_ends_at: string }
const inp = 'w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-neutral-mid'

function EditStaffModal({ token, staff, onClose, onSaved, onView }: { token: string; staff: StaffRow; onClose: () => void; onSaved: () => void; onView: (type: string) => void }) {
  const api = createApiClient(token)
  const [tab, setTab] = useState<'credentials' | 'personal' | 'contract'>('credentials')
  const [form, setForm] = useState<Record<string, CredForm>>(() => {
    const init: any = {}
    for (const t of TYPES) {
      const c = staff.credentials[t.key]
      init[t.key] = { reference: c?.reference ?? '', issued_at: toInputDate(c?.issued_at ?? null), expires_at: toInputDate(c?.expires_at ?? null), notes: c?.notes ?? '', registration_body: c?.registration_body ?? '', sponsorship_ends_at: toInputDate(c?.sponsorship_ends_at ?? null) }
    }
    return init
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [docBusy, setDocBusy] = useState<string | null>(null)
  const [docErr, setDocErr] = useState('')
  const [docs, setDocs] = useState<Record<string, { name: string } | null>>(() => {
    const init: any = {}
    for (const t of TYPES) init[t.key] = staff.credentials[t.key]?.document ? { name: staff.credentials[t.key]!.document!.name } : null
    return init
  })
  const anyExtra = EXTRA_TYPES.some(t => t.key !== 'contract' && staff.credentials[t.key]?.present)
  const [showExtras, setShowExtras] = useState(anyExtra)

  // Personal and contract details load when first needed. Nothing here is in the register grid.
  const [details, setDetails] = useState<StaffDetails | null>(null)
  const [detailErr, setDetailErr] = useState('')
  const [yearInfo, setYearInfo] = useState<{ account: { month: number; day: number }; current: { from: string; to: string } } | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailMsg, setDetailMsg] = useState('')
  useEffect(() => {
    if (tab === 'credentials' || details) return
    api.workforce.staffDetails(staff.id)
      .then(r => { setDetails(r.details); setYearInfo({ account: r.account_year_start, current: r.current_year }) })
      .catch(() => setDetailErr('Personal details could not be loaded. If this is the first time, they may not be switched on yet.'))
  }, [tab])

  function set(type: string, patch: Partial<CredForm>) { setForm(prev => ({ ...prev, [type]: { ...prev[type], ...patch } })) }

  async function uploadDoc(type: string, file: File) {
    setDocBusy(type); setDocErr('')
    try {
      const r = await api.workforce.uploadDocument(staff.id, type, file)
      setDocs(prev => ({ ...prev, [type]: r.credential.document ? { name: r.credential.document.name } : null }))
      onSaved()
    } catch (e: any) { setDocErr(e?.message ?? 'Could not upload the document.') }
    finally { setDocBusy(null) }
  }
  async function removeDoc(type: string) {
    setDocBusy(type); setDocErr('')
    try { await api.workforce.deleteDocument(staff.id, type); setDocs(prev => ({ ...prev, [type]: null })); onSaved() }
    finally { setDocBusy(null) }
  }
  async function save(type: string) {
    setBusy(type)
    try {
      const f = form[type]
      await api.workforce.saveCredential(staff.id, type, {
        reference: f.reference, issued_at: f.issued_at || null, expires_at: f.expires_at || null, notes: f.notes,
        ...(type === 'professional_registration' ? { registration_body: f.registration_body || null } : {}),
        ...(type === 'visa' ? { sponsorship_ends_at: f.sponsorship_ends_at || null } : {}),
      })
      onSaved()
    } finally { setBusy(null) }
  }
  async function clear(type: string) {
    setBusy(type)
    try { await api.workforce.deleteCredential(staff.id, type); set(type, { reference: '', issued_at: '', expires_at: '', notes: '', registration_body: '', sponsorship_ends_at: '' }); setDocs(prev => ({ ...prev, [type]: null })); onSaved() }
    finally { setBusy(null) }
  }

  async function saveDetails(part: Partial<StaffDetails>, okMsg: string) {
    setDetailBusy(true); setDetailMsg(''); setDetailErr('')
    try { const r = await api.workforce.saveStaffDetails(staff.id, part); setDetails(r.details); setDetailMsg(okMsg); onSaved() }
    catch (e: any) { setDetailErr(e?.message ?? 'Could not save.') }
    finally { setDetailBusy(false) }
  }

  // Called as a plain function (not <CredCard />) so typing in a box never remounts it and loses focus.
  function CredCard({ t }: { t: TypeDef }) {
    const f = form[t.key]
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck size={14} className="text-teal" />
          <p className="text-sm font-semibold text-neutral-dark">{t.label}</p>
        </div>
        {t.help && <p className="mb-3 text-xs text-neutral-mid">{t.help}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {t.key === 'professional_registration' && (
            <div className="sm:col-span-2">
              <label className={lbl}>Registered with</label>
              <select value={f.registration_body} onChange={e => set(t.key, { registration_body: e.target.value })} className={inp}>
                <option value="">Choose…</option>
                {REG_BODIES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          <div className={t.hasExpiry ? '' : 'sm:col-span-2'}>
            <label className={lbl}>{t.refLabel}</label>
            <input value={f.reference} onChange={e => set(t.key, { reference: e.target.value })} placeholder={t.refPlaceholder} className={inp} />
          </div>
          {t.hasExpiry && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>{t.issuedLabel ?? 'Issued'}</label><input type="date" value={f.issued_at} onChange={e => set(t.key, { issued_at: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>{t.expiresLabel ?? 'Expires / renews'}</label><input type="date" value={f.expires_at} onChange={e => set(t.key, { expires_at: e.target.value })} className={inp} /></div>
            </div>
          )}
          {t.key === 'visa' && (
            <div className="sm:col-span-2"><label className={lbl}>Sponsorship ends</label><input type="date" value={f.sponsorship_ends_at} onChange={e => set(t.key, { sponsorship_ends_at: e.target.value })} className={inp} /></div>
          )}
          <div className="sm:col-span-2"><label className={lbl}>Notes (optional)</label><input value={f.notes} onChange={e => set(t.key, { notes: e.target.value })} className={inp} /></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-neutral-light/40 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-neutral-mid">
            <Paperclip size={13} className="shrink-0" />
            {docs[t.key] ? <span className="truncate text-neutral-dark">{docs[t.key]!.name}</span> : <span>No document uploaded</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {docs[t.key] && (<>
              <button onClick={() => onView(t.key)} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Eye size={12} /> View</button>
              <button onClick={() => removeDoc(t.key)} disabled={docBusy === t.key} className="text-xs text-neutral-mid hover:text-red-500 disabled:opacity-50">Remove</button>
            </>)}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal">
              {docBusy === t.key ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {docs[t.key] ? 'Replace' : 'Upload'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) uploadDoc(t.key, file); e.target.value = '' }} />
            </label>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={() => clear(t.key)} disabled={busy === t.key} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-mid hover:text-red-500 disabled:opacity-50"><Trash2 size={12} /> Clear</button>
          <button onClick={() => save(t.key)} disabled={busy === t.key} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">{busy === t.key ? <Loader2 size={12} className="animate-spin" /> : null} Save</button>
        </div>
      </div>
    )
  }

  const d = details
  const upd = (patch: (x: StaffDetails) => StaffDetails) => setDetails(prev => prev ? patch(prev) : prev)
  const saveBar = (part: () => Partial<StaffDetails>, okMsg: string) => (
    <div className="flex items-center justify-end gap-3">
      {detailMsg && <span className="text-xs text-green-700">{detailMsg}</span>}
      <button onClick={() => saveDetails(part(), okMsg)} disabled={detailBusy} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">{detailBusy ? <Loader2 size={12} className="animate-spin" /> : null} Save</button>
    </div>
  )
  const fmtYear = yearInfo ? `${fmtDate(yearInfo.current.from)} to ${fmtDate(new Date(new Date(yearInfo.current.to).getTime() - 86_400_000).toISOString())}` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">{staff.name}</h2>
            <p className="text-xs text-neutral-mid">{staff.job_role ?? '—'} · compliance record</p>
          </div>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="flex gap-1 border-b border-gray-100 px-6 pt-3">
          {([['credentials', 'Credentials'], ['personal', 'Personal details'], ['contract', 'Contract & holiday']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-t-md px-3 py-2 text-sm font-medium ${tab === k ? 'border-b-2 border-teal text-teal' : 'text-neutral-mid hover:text-neutral-dark'}`}>{l}</button>
          ))}
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {docErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{docErr}</p>}
          {tab !== 'credentials' && detailErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{detailErr}</p>}

          {tab === 'credentials' && (<>
            {CORE_TYPES.map(t => <div key={t.key}>{CredCard({ t })}</div>)}
            <div className="rounded-lg border border-dashed border-gray-200 p-3">
              <button onClick={() => setShowExtras(v => !v)} className="flex w-full items-center justify-between text-left text-sm font-semibold text-neutral-dark">
                <span>Other documents <span className="font-normal text-neutral-mid">(visa and sponsorship, driving licence, insurance, MOT)</span></span>
                <ChevronDown size={14} className={`text-neutral-mid transition-transform ${showExtras ? 'rotate-180' : ''}`} />
              </button>
              {showExtras && <div className="mt-3 space-y-4">{EXTRA_TYPES.filter(t => t.key !== 'contract').map(t => <div key={t.key}>{CredCard({ t })}</div>)}</div>}
            </div>
          </>)}

          {tab === 'personal' && (!d ? (detailErr ? null : <div className="h-40 animate-pulse rounded bg-gray-100" />) : (<>
            <p className="rounded-lg bg-neutral-light/60 px-3 py-2 text-xs text-neutral-mid">Personal information. Only administrators of your account can see this; it is never shown to other staff or in the register grid.</p>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-semibold text-neutral-dark">Date of birth</p>
              <input type="date" value={toInputDate(d.date_of_birth)} onChange={e => upd(x => ({ ...x, date_of_birth: e.target.value || null }))} className={inp + ' sm:w-56'} />
              <p className="mt-2 text-xs text-neutral-mid">Administrators are emailed 7 days before a birthday, and {staff.name.split(' ')[0]} gets a happy birthday email from your service on the day. You can switch either off in Settings, Notifications.</p>
              <div className="mt-3">{saveBar(() => ({ date_of_birth: d.date_of_birth }), 'Saved')}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-semibold text-neutral-dark">Emergency contact</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className={lbl}>Name</label><input value={d.emergency.name ?? ''} onChange={e => upd(x => ({ ...x, emergency: { ...x.emergency, name: e.target.value } }))} className={inp} /></div>
                <div><label className={lbl}>Relationship</label><input value={d.emergency.relationship ?? ''} onChange={e => upd(x => ({ ...x, emergency: { ...x.emergency, relationship: e.target.value } }))} placeholder="e.g. Partner, Mother" className={inp} /></div>
                <div><label className={lbl}>Phone</label><input value={d.emergency.phone ?? ''} onChange={e => upd(x => ({ ...x, emergency: { ...x.emergency, phone: e.target.value } }))} className={inp} /></div>
                <div><label className={lbl}>Second phone (optional)</label><input value={d.emergency.phone_alt ?? ''} onChange={e => upd(x => ({ ...x, emergency: { ...x.emergency, phone_alt: e.target.value } }))} className={inp} /></div>
              </div>
              <div className="mt-3">{saveBar(() => ({ emergency: d.emergency }), 'Saved')}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-dark">Next of kin</p>
                <button onClick={() => upd(x => ({ ...x, next_of_kin: { ...x.next_of_kin, name: x.emergency.name, relationship: x.emergency.relationship, phone: x.emergency.phone } }))} className="text-xs font-medium text-teal hover:underline">Same as emergency contact</button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className={lbl}>Name</label><input value={d.next_of_kin.name ?? ''} onChange={e => upd(x => ({ ...x, next_of_kin: { ...x.next_of_kin, name: e.target.value } }))} className={inp} /></div>
                <div><label className={lbl}>Relationship</label><input value={d.next_of_kin.relationship ?? ''} onChange={e => upd(x => ({ ...x, next_of_kin: { ...x.next_of_kin, relationship: e.target.value } }))} className={inp} /></div>
                <div><label className={lbl}>Phone</label><input value={d.next_of_kin.phone ?? ''} onChange={e => upd(x => ({ ...x, next_of_kin: { ...x.next_of_kin, phone: e.target.value } }))} className={inp} /></div>
                <div><label className={lbl}>Address (optional)</label><input value={d.next_of_kin.address ?? ''} onChange={e => upd(x => ({ ...x, next_of_kin: { ...x.next_of_kin, address: e.target.value } }))} className={inp} /></div>
              </div>
              <div className="mt-3">{saveBar(() => ({ next_of_kin: d.next_of_kin }), 'Saved')}</div>
            </div>
          </>))}

          {tab === 'contract' && (!d ? (detailErr ? null : <div className="h-40 animate-pulse rounded bg-gray-100" />) : (<>
            <p className="rounded-lg bg-neutral-light/60 px-3 py-2 text-xs text-neutral-mid">Contracts and holiday are only visible to administrators of your account.</p>
            {CredCard({ t: EXTRA_TYPES.find(t => t.key === 'contract')! })}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-semibold text-neutral-dark">Contract details</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><label className={lbl}>Contract type</label>
                  <select value={d.contract.type ?? ''} onChange={e => upd(x => ({ ...x, contract: { ...x.contract, type: e.target.value || null } }))} className={inp}>
                    <option value="">Choose…</option><option value="permanent">Permanent</option><option value="fixed_term">Fixed term</option><option value="bank">Bank</option><option value="zero_hours">Zero hours</option>
                  </select></div>
                <div><label className={lbl}>Contracted hours a week</label><input type="number" min={0} max={168} step="0.5" value={d.contract.hours_per_week ?? ''} onChange={e => upd(x => ({ ...x, contract: { ...x.contract, hours_per_week: e.target.value === '' ? null : Number(e.target.value) } }))} className={inp} /></div>
                <div><label className={lbl}>Probation ends</label><input type="date" value={toInputDate(d.contract.probation_ends_on)} onChange={e => upd(x => ({ ...x, contract: { ...x.contract, probation_ends_on: e.target.value || null } }))} className={inp} /></div>
              </div>
              <div className="mt-3">{saveBar(() => ({ contract: d.contract }), 'Saved')}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-semibold text-neutral-dark">Holiday entitlement</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><label className={lbl}>Allowance for the year</label><input type="number" min={0} step="0.5" value={d.holiday.entitlement ?? ''} onChange={e => upd(x => ({ ...x, holiday: { ...x.holiday, entitlement: e.target.value === '' ? null : Number(e.target.value) } }))} className={inp} /></div>
                <div><label className={lbl}>Counted in</label>
                  <select value={d.holiday.unit} onChange={e => upd(x => ({ ...x, holiday: { ...x.holiday, unit: e.target.value as 'days' | 'hours' } }))} className={inp}><option value="days">Days</option><option value="hours">Hours</option></select></div>
                <div><label className={lbl}>Their own year start (optional)</label><input type="date" value={toInputDate(d.holiday.year_start)} onChange={e => upd(x => ({ ...x, holiday: { ...x.holiday, year_start: e.target.value || null } }))} className={inp} /></div>
              </div>
              {yearInfo && <p className="mt-2 text-xs text-neutral-mid">Current holiday year: {fmtYear}. {d.holiday.year_start ? 'Using their own year start.' : `Using your account's year start (${yearInfo.account.day} ${MONTHS[yearInfo.account.month - 1]}), which you can change in Account holiday year below.`}</p>}
              <div className="mt-3">{saveBar(() => ({ holiday: d.holiday }), 'Saved')}</div>
            </div>
            {yearInfo && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm font-semibold text-neutral-dark">Account holiday year <span className="font-normal text-neutral-mid">(applies to everyone)</span></p>
                <div className="flex flex-wrap items-end gap-3">
                  <div><label className={lbl}>Day</label><input type="number" min={1} max={31} value={yearInfo.account.day} onChange={e => setYearInfo(y => y ? { ...y, account: { ...y.account, day: Number(e.target.value) } } : y)} className={inp + ' w-20'} /></div>
                  <div><label className={lbl}>Month</label>
                    <select value={yearInfo.account.month} onChange={e => setYearInfo(y => y ? { ...y, account: { ...y.account, month: Number(e.target.value) } } : y)} className={inp + ' w-40'}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
                  <button disabled={detailBusy} onClick={async () => { setDetailBusy(true); setDetailMsg(''); setDetailErr(''); try { await api.workforce.saveWorkforceSettings(yearInfo.account); setDetailMsg('Year start saved') } catch (e: any) { setDetailErr(e?.message ?? 'Could not save the year start.') } finally { setDetailBusy(false) } }}
                    className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal/90 disabled:opacity-50">Save year start</button>
                </div>
              </div>
            )}
          </>))}
        </div>
        <div className="flex justify-end border-t border-gray-100 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Done</button>
        </div>
      </div>
    </div>
  )
}
