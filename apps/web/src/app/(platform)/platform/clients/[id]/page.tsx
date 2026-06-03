'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type TenantDetail, type TenantAuditStats } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, ArrowLeft, Building2, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, Copy, ExternalLink, KeyRound, Loader2, Mail, MoreVertical, Plus,
  Sparkles, UserMinus, UserPlus, UserX, HardDrive,
} from 'lucide-react'
import type { PlanLimits } from '@/lib/platform-api'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Copy field ───────────────────────────────────────────────────────────────

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-3 py-2">
      <span className="flex-1 select-all truncate font-mono text-sm text-neutral-dark">{value}</span>
      <button
        onClick={copy}
        className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-gray-200 hover:text-neutral-dark"
      >
        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ─── Plan usage section ───────────────────────────────────────────────────────

function UsageMeter({
  label, used, limit, note,
}: {
  label: string
  used:  number
  limit: number | null
  note?: string
}) {
  if (limit === null) {
    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-dark">{label}</p>
          {note && <p className="text-xs text-neutral-mid">{note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-neutral-mid">
          <CheckCircle2 size={14} className="text-green-500" />
          <span className="font-medium text-neutral-dark">{used.toLocaleString()}</span>
          <span className="text-neutral-mid">/ unlimited</span>
        </div>
      </div>
    )
  }

  const pct       = Math.min(100, Math.round((used / limit) * 100))
  const isRed     = pct >= 90
  const isAmber   = pct >= 70 && pct < 90
  const barColour = isRed ? 'bg-red-500' : isAmber ? 'bg-amber-400' : 'bg-teal'
  const textCol   = isRed ? 'text-red-600' : isAmber ? 'text-amber-600' : 'text-teal'
  const Icon      = isRed || isAmber ? AlertTriangle : CheckCircle2
  const iconCol   = isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-green-500'

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-dark">{label}</p>
          {note && <p className="text-xs text-neutral-mid">{note}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Icon size={14} className={iconCol} />
          <span className={`text-sm font-semibold ${textCol}`}>
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
          <span className="text-xs text-neutral-mid">({pct}%)</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Credentials panel ────────────────────────────────────────────────────────

function CredentialsPanel({
  title, subtitle, tenantId, userId, email, password, token, onDone,
}: {
  title:    string
  subtitle: string
  tenantId: string
  userId:   string
  email:    string
  password: string
  token:    string
  onDone:   () => void
}) {
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError,  setEmailError]  = useState('')

  async function copy(value: string, field: 'email' | 'password') {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function sendEmail() {
    setEmailStatus('sending')
    setEmailError('')
    try {
      await createPlatformClient(token).tenants.sendStaffCredentials(tenantId, userId, password)
      setEmailStatus('sent')
    } catch (e: any) {
      setEmailError(e.message ?? 'Failed to send email.')
      setEmailStatus('error')
    }
  }

  return (
    <>
      <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-800">{title}</p>
        <p className="mt-1 text-xs text-green-700">{subtitle}</p>
      </div>

      <div className="space-y-3">
        {([
          { label: 'Username (email)', value: email,    field: 'email'    as const, mono: false },
          { label: 'Password',         value: password, field: 'password' as const, mono: true  },
        ] as const).map(({ label, value, field, mono }) => (
          <div key={field}>
            <p className="mb-1 text-xs font-medium text-neutral-mid">{label}</p>
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-3 py-2">
              <span className={`flex-1 select-all text-sm text-neutral-dark ${mono ? 'font-mono tracking-wide' : ''}`}>
                {value}
              </span>
              <button
                onClick={() => copy(value, field)}
                className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-gray-200 hover:text-neutral-dark"
              >
                {copiedField === field ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copiedField === field ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-neutral-light px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-dark">Send by email</p>
            <p className="mt-0.5 text-xs text-neutral-mid">
              Email these credentials directly to <span className="font-medium">{email}</span>
            </p>
          </div>
          <button
            onClick={sendEmail}
            disabled={emailStatus === 'sending' || emailStatus === 'sent'}
            className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              emailStatus === 'sent' ? 'bg-green-100 text-green-700' : 'bg-teal text-white hover:bg-teal-dark'
            }`}
          >
            {emailStatus === 'sending' ? (
              <><Loader2 size={14} className="animate-spin" />Sending…</>
            ) : emailStatus === 'sent' ? (
              <><Check size={14} />Sent</>
            ) : (
              <><Mail size={14} />Send email</>
            )}
          </button>
        </div>
        {emailStatus === 'error' && (
          <p className="mt-2 text-xs text-red-600">{emailError}</p>
        )}
      </div>

      <p className="mt-3 text-xs text-neutral-mid">
        This is the only time this password will be shown. Copy or send it before closing.
      </p>

      <div className="mt-5 flex justify-end">
        <Button onClick={onDone}>Done</Button>
      </div>
    </>
  )
}

// ─── Staff action menu ────────────────────────────────────────────────────────

function StaffActionMenu({
  user, tenantId, token, onResetPassword, onDeactivate, onReactivate,
}: {
  user:            any
  tenantId:        string
  token:           string
  onResetPassword: (creds: { userId: string; name: string; email: string; password: string }) => void
  onDeactivate:    (id: string) => void
  onReactivate:    (id: string) => void
}) {
  const [open,    setOpen]    = useState(false)
  const [working, setWorking] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 0 })
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openMenu() {
    if (!btnRef.current) return
    const rect       = btnRef.current.getBoundingClientRect()
    const menuHeight = 88
    const spaceBelow = window.innerHeight - rect.bottom
    const right      = window.innerWidth - rect.right
    if (spaceBelow < menuHeight + 8) {
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
    } else {
      setMenuPos({ top: rect.bottom + 4, right })
    }
    setOpen(true)
  }

  async function handleReset() {
    setOpen(false); setWorking(true)
    try {
      const res = await createPlatformClient(token).tenants.resetStaffPassword(tenantId, user.id)
      onResetPassword({ userId: res.user.id, name: res.user.name, email: res.user.email, password: res.temp_password })
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  async function handleDeactivate() {
    setOpen(false)
    if (!confirm(`Remove access for ${user.name}? They will no longer be able to log in.`)) return
    setWorking(true)
    try {
      await createPlatformClient(token).tenants.deactivateStaff(tenantId, user.id)
      onDeactivate(user.id)
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  async function handleReactivate() {
    setOpen(false); setWorking(true)
    try {
      await createPlatformClient(token).tenants.reactivateStaff(tenantId, user.id)
      onReactivate(user.id)
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={working}
        className="flex items-center rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark disabled:opacity-40"
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          className="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{
            top:    menuPos.top    !== undefined ? menuPos.top    : undefined,
            bottom: menuPos.bottom !== undefined ? menuPos.bottom : undefined,
            right:  menuPos.right,
          }}
        >
          <button
            onClick={handleReset}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
          >
            <KeyRound size={14} className="text-neutral-mid" />
            Reset password
          </button>
          {user.is_active ? (
            <button
              onClick={handleDeactivate}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <UserMinus size={14} />
              Remove access
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
            >
              <UserPlus size={14} />
              Restore access
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const token   = usePlatformAuth()
  const { id }  = useParams<{ id: string }>()

  const [detail,      setDetail]      = useState<TenantDetail | null>(null)
  const [auditStats,  setAuditStats]  = useState<TenantAuditStats | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [seeding,     setSeeding]     = useState(false)
  const [seedMsg,     setSeedMsg]     = useState('')

  // Staff state
  const [staff,        setStaff]        = useState<any[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [resetCreds,   setResetCreds]   = useState<{ userId: string; name: string; email: string; password: string } | null>(null)

  // Reset-policies (danger zone) state
  const [showReset,   setShowReset]   = useState(false)
  const [resetText,   setResetText]   = useState('')
  const [resetting,   setResetting]   = useState(false)
  const [resetMsg,    setResetMsg]    = useState('')
  const [resetErr,    setResetErr]    = useState('')

  // Sub-tenants state
  const [subTenants,     setSubTenants]     = useState<any[]>([])
  const [showAddSubSite, setShowAddSubSite] = useState(false)
  const [newSubSiteName, setNewSubSiteName] = useState('')
  const [addingSubSite,  setAddingSubSite]  = useState(false)
  const [subSiteError,   setSubSiteError]   = useState('')

  useEffect(() => {
    if (!token || !id) return
    const api = createPlatformClient(token)
    Promise.all([
      api.tenants.get(id),
      api.tenants.staff(id),
      api.tenants.subTenants(id),
      api.tenants.auditStats(id),
    ])
      .then(([d, s, st, as_]) => { setDetail(d); setStaff(s.users); setSubTenants(st.sub_tenants); setAuditStats(as_) })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setStaffLoading(false) })
  }, [token, id])

  async function handleSeedTenant() {
    if (!token || !id) return
    setSeeding(true); setSeedMsg(''); setError(null)
    try {
      const result = await createPlatformClient(token).seeds.seedTenant(id)
      setSeedMsg(`${result.seeded} new entries added, ${result.skipped} already present.`)
    } catch (e: any) {
      setError(e.message ?? 'Seeding failed')
    } finally {
      setSeeding(false)
    }
  }

  async function handleResetPolicies() {
    if (!token || !id) return
    setResetting(true); setResetMsg(''); setResetErr(''); setError(null)
    try {
      const r = await createPlatformClient(token).tenants.resetPolicies(id)
      setResetMsg(`Deleted ${r.policies_deleted} policies, ${r.knowledge_deleted} knowledge entries, ${r.files_deleted} files.`)
      setShowReset(false); setResetText('')
      // Reload the tenant so counts refresh.
      const fresh = await createPlatformClient(token).tenants.get(id)
      setDetail(fresh)
    } catch (e: any) {
      setResetErr(e?.message ?? 'Reset failed — please try again.')
    } finally {
      setResetting(false)
    }
  }

  function handleDeactivate(userId: string) {
    setStaff(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u))
  }

  function handleReactivate(userId: string) {
    setStaff(prev => prev.map(u => u.id === userId ? { ...u, is_active: true } : u))
  }

  async function handleAddSubSite() {
    if (!token || !newSubSiteName.trim()) return
    setAddingSubSite(true); setSubSiteError('')
    try {
      const result = await createPlatformClient(token).tenants.createSubTenant(id, { name: newSubSiteName.trim() })
      setSubTenants(prev => [...prev, { ...result.tenant, subscription_status: 'active', created_at: new Date().toISOString() }])
      setNewSubSiteName(''); setShowAddSubSite(false)
    } catch (e: any) {
      setSubSiteError(e.message ?? 'Failed to create site.')
    } finally {
      setAddingSubSite(false)
    }
  }

  if (!token) return null

  const activeStaff   = staff.filter(u => u.is_active !== false)
  const inactiveStaff = staff.filter(u => u.is_active === false)
  const displayStaff  = showInactive ? staff : activeStaff

  return (
    <PlatformShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/platform/clients" className="text-neutral-mid hover:text-teal">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-dark">
                {detail?.tenant.name ?? 'Loading…'}
              </h1>
              {detail && (
                <p className="text-xs text-neutral-mid">
                  {detail.tenant.account_number && (
                    <span className="mr-1 font-mono font-medium text-neutral-dark">{detail.tenant.account_number}</span>
                  )}
                  {detail.tenant.slug} · {(detail.tenant.plan as any)?.name ?? 'No plan'}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSeedTenant} disabled={seeding || loading} size="md" variant="secondary">
            <Sparkles size={14} className="mr-1.5" />
            {seeding ? 'Seeding…' : 'Seed knowledge'}
          </Button>
        </div>

        {seedMsg && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{seedMsg}</div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Reset-password credentials modal */}
        {resetCreds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h2 className="mb-5 text-lg font-semibold text-neutral-dark">Password reset</h2>
              <CredentialsPanel
                title={`New credentials for ${resetCreds.name}`}
                subtitle="Share these with the staff member securely. This is the only time this password will be shown."
                tenantId={id}
                userId={resetCreds.userId}
                email={resetCreds.email}
                password={resetCreds.password}
                token={token}
                onDone={() => setResetCreds(null)}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-neutral-mid" />
          </div>
        ) : detail && (
          <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Active staff',      value: detail.userCount },
                { label: 'Active policies',   value: detail.policies.filter((p: any) => p.status === 'active' && p.document_category === 'internal_policy').length },
                { label: 'Knowledge entries', value: detail.knowledgeCount },
                { label: 'Queries this month', value: detail.queriesThisMonth },
              ].map(({ label, value }: any) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-medium text-neutral-mid">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-dark">{value}</p>
                </div>
              ))}
            </div>

            {/* Document storage (S3) — match a client to its bucket location */}
            {detail.storage && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <HardDrive size={15} className="text-teal" />
                  <h2 className="text-sm font-semibold text-neutral-dark">Document storage (S3)</h2>
                </div>
                <p className="mb-4 text-xs text-neutral-mid">
                  This client&rsquo;s policies &amp; documents live under this prefix. The folder is the tenant ID
                  ({detail.tenant.slug} → <span className="font-mono">{id}</span>) — it stays stable even if the client is renamed.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-mid">Bucket ({detail.storage.region})</p>
                    <CopyField value={detail.storage.bucket ?? '— not configured —'} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-neutral-mid">Tenant prefix</p>
                    <CopyField value={detail.storage.prefix} />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-xs font-medium text-neutral-mid">Policies prefix</p>
                    <CopyField value={detail.storage.policies_prefix} />
                  </div>
                </div>
              </div>
            )}

            {/* Plan usage */}
            {detail.tenant.plan && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-neutral-dark">Plan usage</h2>
                  <span className="rounded-full bg-teal-light px-2.5 py-0.5 text-xs font-medium text-teal">
                    {(detail.tenant.plan as PlanLimits).name}
                  </span>
                </div>
                <p className="mb-4 text-xs text-neutral-mid">Usage against plan limits. Query count resets on the 1st of each month.</p>
                <div className="divide-y divide-gray-100">
                  <UsageMeter
                    label="Queries this month"
                    used={detail.queriesThisMonth}
                    limit={(detail.tenant.plan as PlanLimits).monthly_query_limit}
                    note="Resets on the 1st of each month"
                  />
                  <UsageMeter
                    label="Staff accounts"
                    used={detail.userCount}
                    limit={(detail.tenant.plan as PlanLimits).max_staff_users}
                  />
                  <UsageMeter
                    label="Active policies"
                    used={detail.policies.filter((p: any) => p.status === 'active' && p.document_category === 'internal_policy').length}
                    limit={(detail.tenant.plan as PlanLimits).max_policies}
                  />
                  <UsageMeter
                    label="Handbooks"
                    used={detail.handbookCount}
                    limit={(detail.tenant.plan as PlanLimits).max_handbooks}
                  />
                  <UsageMeter
                    label="Manual knowledge entries"
                    used={detail.manualKnowledgeCount}
                    limit={(detail.tenant.plan as PlanLimits).max_manual_knowledge_entries}
                    note="Entries added manually (not generated from policies)"
                  />
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-neutral-mid">Feature gates</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Gap detection', active: (detail.tenant.plan as PlanLimits).has_gap_detection },
                    ].map(({ label, active }) => (
                      <span
                        key={label}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {active
                          ? <CheckCircle2 size={11} />
                          : <span className="h-2.5 w-2.5 rounded-full border border-gray-400 inline-block" />
                        }
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audit activity */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardCheck size={15} className="text-teal" />
                <h2 className="text-sm font-semibold text-neutral-dark">Monthly Audits</h2>
                {auditStats && (
                  <span className="ml-auto text-xs text-neutral-mid">
                    {auditStats.completed} completed · {auditStats.in_progress} in progress
                  </span>
                )}
              </div>

              {!auditStats ? (
                <p className="text-sm text-neutral-mid">Loading…</p>
              ) : auditStats.total === 0 ? (
                <p className="text-sm text-neutral-mid">No audit runs yet for this client.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {(['daily', 'weekly', 'monthly', 'quarterly', 'periodic'] as const).map(freq => {
                    const s = auditStats.by_frequency[freq]
                    const label = freq.charAt(0).toUpperCase() + freq.slice(1)
                    const lastDate = s.last_completed
                      ? new Date(s.last_completed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : null
                    return (
                      <div key={freq} className="rounded-lg border border-gray-100 bg-neutral-light/60 p-3">
                        <p className="text-xs font-medium text-neutral-mid">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-neutral-dark">{s.completed}</p>
                        <p className="text-xs text-neutral-mid">completed</p>
                        {s.in_progress > 0 && (
                          <p className="mt-1 text-xs font-medium text-amber-600">{s.in_progress} in progress</p>
                        )}
                        {lastDate && (
                          <p className="mt-1 text-xs text-neutral-mid/70">Last: {lastDate}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Account details */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-neutral-dark">Account details</h2>

              {/* Client ID — full-width with copy button */}
              <div className="mb-4">
                <p className="mb-1 text-xs text-neutral-mid">Client ID</p>
                <CopyField value={detail.tenant.id} />
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  { label: 'Slug',              value: detail.tenant.slug },
                  { label: 'Email domain',      value: detail.tenant.email_domain },
                  { label: 'Plan',              value: (detail.tenant.plan as any)?.name ?? '—' },
                  { label: 'Status',            value: detail.tenant.subscription_status },
                  { label: 'Branding sign-off', value: detail.tenant.branding_signoff },
                  { label: 'Joined',            value: new Date(detail.tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs text-neutral-mid">{label}</dt>
                    <dd className="mt-0.5 font-medium text-neutral-dark">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Sub-tenants (sites) */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-neutral-mid" />
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-dark">
                      Sites ({subTenants.length === 0 ? 'primary only' : `${subTenants.length + 1} total`})
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-mid">Additional care homes or branches on this account</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddSubSite(true); setSubSiteError('') }}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
                >
                  <Plus size={12} />
                  Add site
                </button>
              </div>

              {showAddSubSite && (
                <div className="border-b border-gray-100 px-5 py-4">
                  <p className="mb-3 text-sm font-medium text-neutral-dark">New site name</p>
                  {subSiteError && <p className="mb-3 text-sm text-red-600">{subSiteError}</p>}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubSiteName}
                      onChange={e => setNewSubSiteName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSubSite()}
                      placeholder="e.g. Crossways Nursing Wing"
                      className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                      autoFocus
                    />
                    <Button onClick={handleAddSubSite} disabled={addingSubSite || !newSubSiteName.trim()} size="md">
                      {addingSubSite ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => { setShowAddSubSite(false); setNewSubSiteName('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {/* Primary tenant row */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-dark">{detail?.tenant.name}</span>
                      <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">Primary</span>
                    </div>
                    <p className="text-xs text-neutral-mid">{detail?.tenant.slug}</p>
                  </div>
                  <Link
                    href={`/platform/clients/${id}`}
                    className="flex items-center gap-1 text-xs text-neutral-mid hover:text-teal"
                  >
                    <ExternalLink size={11} />
                    Viewing
                  </Link>
                </div>

                {subTenants.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-dark">{s.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>{s.subscription_status}</span>
                      </div>
                      <p className="text-xs text-neutral-mid">{s.slug}</p>
                    </div>
                    <Link
                      href={`/platform/clients/${s.id}`}
                      className="flex items-center gap-1 text-xs text-teal hover:underline"
                    >
                      <ExternalLink size={11} />
                      View site
                    </Link>
                  </div>
                ))}

                {subTenants.length === 0 && !showAddSubSite && (
                  <p className="px-5 py-4 text-sm text-neutral-mid">
                    No additional sites — click "Add site" to create one.
                  </p>
                )}
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-dark">
                    Staff accounts ({activeStaff.length})
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-mid">
                    Reset passwords or manage access on behalf of this client
                  </p>
                </div>
                {inactiveStaff.length > 0 && (
                  <button
                    onClick={() => setShowInactive(v => !v)}
                    className="flex items-center gap-1 text-xs text-neutral-mid hover:text-neutral-dark"
                  >
                    <UserX size={12} />
                    {showInactive ? 'Hide' : 'Show'} {inactiveStaff.length} deactivated
                    <ChevronDown size={12} className={`transition-transform ${showInactive ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {staffLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-neutral-mid" />
                </div>
              ) : displayStaff.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-mid">No staff accounts yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                      <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Username (email)</th>
                        <th className="px-5 py-3">Job role</th>
                        <th className="px-5 py-3">Access</th>
                        <th className="px-5 py-3">First login</th>
                        <th className="px-5 py-3">Last seen</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayStaff.map((u: any) => (
                        <tr
                          key={u.id}
                          className={u.is_active === false ? 'opacity-50' : 'hover:bg-neutral-light/50'}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-dark">{u.name}</span>
                              {u.is_active === false && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  Deactivated
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-mid">{u.email}</td>
                          <td className="px-5 py-3 text-xs text-neutral-mid">
                            {u.job_role ?? <span className="italic opacity-50">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {u.first_login_at ? (
                              <span className="text-xs text-neutral-mid">{fmtDate(u.first_login_at)}</span>
                            ) : (
                              <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                Never logged in
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-mid">
                            {u.last_login_at ? fmtDate(u.last_login_at) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StaffActionMenu
                              user={u}
                              tenantId={id}
                              token={token}
                              onResetPassword={setResetCreds}
                              onDeactivate={handleDeactivate}
                              onReactivate={handleReactivate}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Policies */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-neutral-dark">Policies ({detail.policies.length})</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-neutral-light text-left text-xs font-medium uppercase tracking-wide text-neutral-mid">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Version</th>
                    <th className="px-4 py-2">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.policies.map((p: any) => (
                    <tr key={p.id} className="hover:bg-neutral-light/50">
                      <td className="px-4 py-2 font-medium text-neutral-dark">{p.name}</td>
                      <td className="px-4 py-2 text-xs text-neutral-mid capitalize">
                        {p.document_category.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'active'     ? 'bg-green-100 text-green-700' :
                          p.status === 'processing' ? 'bg-blue-100 text-blue-700'  :
                                                      'bg-gray-100 text-gray-600'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-neutral-mid">v{p.version}</td>
                      <td className="px-4 py-2 text-xs text-neutral-mid">
                        {new Date(p.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Danger zone — reset all policies */}
            <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
              <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
              <p className="mt-1 text-xs text-neutral-mid">
                Permanently delete <strong>all {detail.policies.length} policies</strong> for {detail.tenant.name} — their files, search vectors, and the
                knowledge entries generated from them. The account, staff and settings are kept. This cannot be undone.
              </p>
              {resetMsg && <p className="mt-2 text-xs font-medium text-green-700">{resetMsg}</p>}
              <button
                onClick={() => { setShowReset(true); setResetText('') }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete all policies
              </button>
            </div>

          </div>
        )}

        {/* Reset confirmation */}
        {showReset && detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-red-700">Delete all policies?</h2>
              <p className="mt-2 text-sm text-neutral-mid">
                This permanently deletes <strong>all {detail.policies.length} policies</strong>, their files and search vectors, and the
                policy-derived knowledge entries for <strong>{detail.tenant.name}</strong>. It cannot be undone.
              </p>
              <p className="mt-4 text-xs font-medium text-neutral-dark">
                Type <span className="font-mono text-red-600">{detail.tenant.account_number}</span> to confirm:
              </p>
              <input
                value={resetText}
                onChange={e => setResetText(e.target.value)}
                placeholder={detail.tenant.account_number}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              {resetErr && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{resetErr}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => { setShowReset(false); setResetText('') }}
                  disabled={resetting}
                  className="rounded-md border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPolicies}
                  disabled={resetting || resetText.trim() !== detail.tenant.account_number}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {resetting ? 'Deleting…' : 'Delete everything'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlatformShell>
  )
}
