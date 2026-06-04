'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, Copy, Globe, GraduationCap, KeyRound, ListChecks, Loader2, Mail, MessageSquare, MoreVertical, Pencil, Phone, Plus, UserMinus, UserPlus, UserX, X } from 'lucide-react'

// ─── Language options ─────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'pol', name: 'Polish' },
  { code: 'ron', name: 'Romanian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'tgl', name: 'Tagalog (Filipino)' },
  { code: 'yor', name: 'Yoruba' },
  { code: 'ben', name: 'Bengali' },
  { code: 'urd', name: 'Urdu' },
  { code: 'hin', name: 'Hindi' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'ara', name: 'Arabic' },
  { code: 'som', name: 'Somali' },
  { code: 'swa', name: 'Swahili' },
  { code: 'lit', name: 'Lithuanian' },
  { code: 'guj', name: 'Gujarati' },
  { code: 'pan', name: 'Punjabi' },
  { code: 'tam', name: 'Tamil' },
  { code: 'zho', name: 'Chinese (Mandarin/Cantonese)' },
  { code: 'sin', name: 'Sinhala' },
  { code: 'nep', name: 'Nepali' },
  { code: 'cym', name: 'Welsh' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'kan', name: 'Kannada' },
  { code: 'mal', name: 'Malayalam' },
  { code: 'tel', name: 'Telugu' },
  // Creoles & related (common in UK care)
  { code: 'mfe', name: 'Mauritian Creole' },
  { code: 'hat', name: 'Haitian Creole' },
  { code: 'crs', name: 'Seychellois Creole' },
  { code: 'kea', name: 'Cape Verdean Creole' },
  { code: 'jam', name: 'Jamaican Patois (Creole)' },
  { code: 'gcf', name: 'Antillean Creole (Guadeloupe/Martinique)' },
  { code: 'pcm', name: 'Nigerian Pidgin' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function LastSeen({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <span className="text-xs italic text-neutral-mid/50">—</span>
  const daysSince = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const colour = daysSince <= 7 ? 'text-status-success' : daysSince <= 30 ? 'text-amber-500' : 'text-neutral-mid'
  return <span className={`text-xs ${colour}`}>{fmtDate(iso)}</span>
}

function langNameOf(code: string | null | undefined, langs: { code: string; name: string }[] = LANGUAGES) {
  return langs.find(l => l.code === code)?.name ?? LANGUAGES.find(l => l.code === code)?.name ?? 'their first language'
}

// Per-staff toggle: when on, every outbound CareStream message is translated
// into the staff member's first language; when off, messages are sent in English.
function CommsLanguageToggle({ on, onChange, langName, disabled }: {
  on: boolean
  onChange: (v: boolean) => void
  langName: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-dark">Always communicate in their first language</p>
        <p className="mt-0.5 text-xs text-neutral-mid">
          {on
            ? `All messages CareStream sends are translated into ${langName}.`
            : 'Messages are sent in English.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-teal' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function InitialAvatar({ name, role }: { name: string; role: string }) {
  const initial = (name ?? '?').charAt(0).toUpperCase()
  const bg = role === 'admin' ? 'bg-teal' : 'bg-purple-500'
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bg}`}>
      {initial}
    </div>
  )
}

// ─── Credentials panel (shared by invite + reset password) ────────────────────

function CredentialsPanel({
  title,
  subtitle,
  userId,
  email,
  password,
  contact,
  token,
  onDone,
}: {
  title:    string
  subtitle: string
  userId:   string
  email:    string
  password: string
  contact?: StaffContact
  token:    string
  onDone:   () => void
}) {
  const [copiedField,  setCopiedField]  = useState<string | null>(null)
  const [emailStatus,  setEmailStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError,   setEmailError]   = useState('')

  async function copy(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function sendEmail() {
    setEmailStatus('sending')
    setEmailError('')
    try {
      await createApiClient(token).users.sendCredentials(userId, password)
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
        {[
          { label: 'Username (email)', value: email,    field: 'email'    as const, mono: false },
          { label: 'Password',         value: password, field: 'password' as const, mono: true  },
        ].map(({ label, value, field, mono }) => (
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

      {/* How to reach CareStream */}
      {contact && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-mid">How {email.split('@')[0] || 'they'} reaches CareStream</p>
          <div className="space-y-2">
            {[
              { label: 'Log in',  value: contact.login_url,        field: 'login'   },
              ...(contact.inbound_email   ? [{ label: 'Email questions to', value: contact.inbound_email,   field: 'inbound' }] : []),
              ...(contact.whatsapp_number ? [{ label: 'WhatsApp',           value: contact.whatsapp_number, field: 'wa'      }] : []),
            ].map(({ label, value, field }) => (
              <div key={field}>
                <p className="mb-1 text-xs font-medium text-neutral-mid">{label}</p>
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-3 py-2">
                  <span className="flex-1 select-all break-all text-sm text-neutral-dark">{value}</span>
                  <button onClick={() => copy(value, field)} className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-medium text-neutral-mid transition-colors hover:bg-gray-200 hover:text-neutral-dark">
                    {copiedField === field ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copiedField === field ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
            {!contact.whatsapp_number && (
              <p className="text-xs text-neutral-mid">WhatsApp number not set up for this home yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Send by email */}
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
              emailStatus === 'sent'
                ? 'bg-green-100 text-green-700'
                : 'bg-teal text-white hover:bg-teal-dark'
            }`}
          >
            {emailStatus === 'sending' ? (
              <><Loader2 size={14} className="animate-spin" /> Sending…</>
            ) : emailStatus === 'sent' ? (
              <><Check size={14} /> Sent</>
            ) : (
              <><Mail size={14} /> Send email</>
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

// ─── Row action menu ──────────────────────────────────────────────────────────

function ActionMenu({
  user,
  token,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: {
  user:            any
  token:           string
  onEdit:          (user: any) => void
  onResetPassword: (creds: { userId: string; name: string; email: string; password: string; contact?: StaffContact }) => void
  onDeactivate:    (id: string) => void
  onReactivate:    (id: string) => void
}) {
  const [open,    setOpen]    = useState(false)
  const [working, setWorking] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 0 })
  const ref     = useRef<HTMLDivElement>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function openMenu() {
    if (!btnRef.current) return
    const rect        = btnRef.current.getBoundingClientRect()
    const menuHeight  = 168 // approx height of the four-item dropdown
    const spaceBelow  = window.innerHeight - rect.bottom
    const right       = window.innerWidth - rect.right

    if (spaceBelow < menuHeight + 8) {
      // Not enough room below — open upward
      setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
    } else {
      setMenuPos({ top: rect.bottom + 4, right })
    }
    setOpen(true)
  }

  async function handleReset() {
    setOpen(false)
    setWorking(true)
    try {
      const res = await createApiClient(token).users.resetPassword(user.id)
      onResetPassword({ userId: res.user.id, name: res.user.name, email: res.user.email, password: res.temp_password, contact: res.contact })
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  async function handleDeactivate() {
    setOpen(false)
    if (!confirm(`Remove access for ${user.name}? They will no longer be able to log in.`)) return
    setWorking(true)
    try {
      await createApiClient(token).users.deactivate(user.id)
      onDeactivate(user.id)
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  async function handleReactivate() {
    setOpen(false)
    setWorking(true)
    try {
      await createApiClient(token).users.reactivate(user.id)
      onReactivate(user.id)
    } catch { /* ignore */ } finally { setWorking(false) }
  }

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={openMenu}
        disabled={working}
        className="flex items-center gap-0.5 rounded p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark disabled:opacity-40"
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
            onClick={() => { setOpen(false); onEdit(user) }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
          >
            <Pencil size={14} className="text-neutral-mid" />
            Edit details
          </button>
          <button
            onClick={handleReset}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light"
          >
            <Mail size={14} className="text-neutral-mid" />
            Re-send login
          </button>
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

export default function StaffPage() {
  const { data: session }              = useSession()
  const staffCache = pageCache.get<{ users: any[]; staffRoles: string[]; specialistRoles: string[]; languages?: { code: string; name: string }[] }>('admin-staff')
  const [users,        setUsers]       = useState<any[]>(staffCache?.users ?? [])
  const [staffRoles,   setStaffRoles]  = useState<string[]>(staffCache?.staffRoles ?? [])
  const [specialistRoles, setSpecialistRoles] = useState<string[]>(staffCache?.specialistRoles ?? [])
  const [languages,    setLanguages]   = useState<{ code: string; name: string }[]>(staffCache?.languages ?? LANGUAGES)
  const [loading,      setLoading]     = useState(!staffCache)
  const [showInvite,   setShowInvite]  = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [editUser,     setEditUser]    = useState<any | null>(null)
  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [resetCreds,   setResetCreds]  = useState<{ userId: string; name: string; email: string; password: string; contact?: StaffContact } | null>(null)

  function load() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([api.users.list(), api.settings.get()])
      .then(([userData, settings]) => {
        const list = Array.isArray(userData) ? userData : (userData?.users ?? [])
        const roles = (settings as any).staff_roles ?? []
        const specialists = (settings as any).specialist_roles ?? []
        const langs = (settings as any).languages ?? LANGUAGES
        setUsers(list); setStaffRoles(roles); setSpecialistRoles(specialists); setLanguages(langs)
        pageCache.set('admin-staff', { users: list, staffRoles: roles, specialistRoles: specialists, languages: langs })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [session?.accessToken])

  const activeUsers   = users.filter(u => u.is_active !== false)
  const inactiveUsers = users.filter(u => u.is_active === false)
  const displayUsers  = showInactive ? users : activeUsers

  function handleDeactivate(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u))
  }

  function handleReactivate(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: true } : u))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Staff</h1>
          {!loading && inactiveUsers.length > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className="mt-1 flex items-center gap-1 text-xs text-neutral-mid hover:text-neutral-dark"
            >
              <UserX size={12} />
              {showInactive ? 'Hide' : 'Show'} {inactiveUsers.length} deactivated account{inactiveUsers.length !== 1 ? 's' : ''}
              <ChevronDown size={12} className={`transition-transform ${showInactive ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <Button onClick={() => setShowInvite(true)} size="md">
          <UserPlus size={15} className="mr-2" />
          Add staff member
        </Button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          token={session?.accessToken ?? ''}
          staffRoles={staffRoles}
          specialistRoles={specialistRoles}
          languages={languages}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setLoading(true); load() }}
        />
      )}

      {/* Edit staff member modal */}
      {editUser && (
        <EditModal
          user={editUser}
          token={session?.accessToken ?? ''}
          staffRoles={staffRoles}
          specialistRoles={specialistRoles}
          languages={languages}
          onClose={() => setEditUser(null)}
          onSaved={(updated: any) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
            setEditUser(null)
          }}
        />
      )}

      {/* Staff detail overlay */}
      {detailUserId && (
        <StaffDetailModal
          userId={detailUserId}
          token={session?.accessToken ?? ''}
          languages={languages}
          onClose={() => setDetailUserId(null)}
          onEdit={(u) => { setDetailUserId(null); setEditUser(u) }}
          onChanged={(updated) => {
            if (updated) setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
          }}
        />
      )}

      {/* Reset-password credentials modal */}
      {resetCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold text-neutral-dark">Password reset</h2>
            <CredentialsPanel
              title={`New credentials for ${resetCreds.name}`}
              subtitle="Share these with the staff member securely. This is the only time this password will be shown."
              userId={resetCreds.userId}
              email={resetCreds.email}
              password={resetCreds.password}
              contact={resetCreds.contact}
              token={session?.accessToken ?? ''}
              onDone={() => setResetCreds(null)}
            />
          </div>
        </div>
      )}

      <div className="rounded-card bg-white shadow-card">
        {loading ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">Loading…</p>
        ) : displayUsers.length === 0 ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">
            No staff yet — add your team so they can access the chat system.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Name</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Username (email)</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Role</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Job role</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Shift</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">WhatsApp</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Added</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">First login</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Last seen</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((u: any) => (
                  <tr
                    key={u.id}
                    className={`border-b border-gray-50 last:border-0 ${
                      u.is_active === false ? 'opacity-50' : 'hover:bg-neutral-light/50'
                    }`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <InitialAvatar name={u.name} role={u.role} />
                        <div>
                          <button
                            onClick={() => setDetailUserId(u.id)}
                            className="font-medium text-neutral-dark hover:text-teal hover:underline"
                            title="View staff details"
                          >
                            {u.name}
                          </button>
                          {u.is_active === false && (
                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                              Deactivated
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-neutral-mid">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={u.role === 'admin' ? 'admin' : 'staff'}>
                        {u.role === 'admin' ? 'Admin' : 'Staff'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-xs text-neutral-mid">
                      {u.job_role ?? <span className="italic text-neutral-mid/50">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      {u.shift_type === 'day' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Day</span>
                      ) : u.shift_type === 'night' ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Night</span>
                      ) : u.shift_type === 'any' ? (
                        <span className="inline-flex items-center rounded-full bg-teal-light px-2 py-0.5 text-xs font-medium text-teal">Flexible</span>
                      ) : (
                        <span className="text-xs italic text-neutral-mid/50">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {u.phone_number ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          {u.phone_number}
                        </span>
                      ) : (
                        <span className="text-xs italic text-neutral-mid/50">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-neutral-mid">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      {u.first_login_at ? (
                        <span className="text-xs text-neutral-mid">{fmtDate(u.first_login_at)}</span>
                      ) : (
                        <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                          Never logged in
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <LastSeen iso={u.last_login_at} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionMenu
                        user={u}
                        token={session?.accessToken ?? ''}
                        onEdit={setEditUser}
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

      <p className="mt-3 px-1 text-xs text-neutral-mid">
        <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-600">Never logged in</span>
        {' '}— this staff member has not yet used their credentials to access the chat system.
      </p>
    </div>
  )
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

// ─── Invite modal ─────────────────────────────────────────────────────────────

type ModalStep = 'form' | 'credentials' | 'training'

function InviteModal({
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
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">

        <h2 className="mb-5 text-lg font-semibold text-neutral-dark">
          {step === 'form' ? 'Add staff member' : step === 'credentials' ? 'Account created' : `Assign training to ${form.name}`}
        </h2>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {([
              { k: 'name',  label: 'Full name',    type: 'text',  ph: 'Jane Smith'          },
              { k: 'email', label: 'Email address', type: 'email', ph: 'jane@carehome.co.uk' },
            ] as const).map(({ k, label, type, ph }) => (
              <div key={k}>
                <label className="mb-1.5 block text-sm font-medium text-neutral-dark">{label}</label>
                <input
                  type={type}
                  required
                  placeholder={ph}
                  value={form[k]}
                  onChange={update(k)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
            ))}

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
                Include the country code. Enables this staff member to ask policy questions via WhatsApp.
              </p>
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

            {/* Specialist roles */}
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

function EditModal({
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

function StaffDetailModal({ userId, token, languages, onClose, onEdit, onChanged }: {
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
      <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">

        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {user && <InitialAvatar name={user.name} role={user.role} />}
            <div>
              <h2 className="text-lg font-semibold text-neutral-dark">{user?.name ?? 'Staff member'}</h2>
              {user && <p className="text-xs text-neutral-mid">{user.email}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark">
            <X size={18} />
          </button>
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
