'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, Copy, KeyRound, Loader2, Mail, MessageSquare, MoreVertical, Pencil, Phone, UserMinus, UserPlus, UserX } from 'lucide-react'

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
  token,
  onDone,
}: {
  title:    string
  subtitle: string
  userId:   string
  email:    string
  password: string
  token:    string
  onDone:   () => void
}) {
  const [copiedField,  setCopiedField]  = useState<'email' | 'password' | null>(null)
  const [emailStatus,  setEmailStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [emailError,   setEmailError]   = useState('')

  async function copy(value: string, field: 'email' | 'password') {
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
  onResetPassword: (creds: { userId: string; name: string; email: string; password: string }) => void
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
    const menuHeight  = 88 // approx height of the two-item dropdown
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
      onResetPassword({ userId: res.user.id, name: res.user.name, email: res.user.email, password: res.temp_password })
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
  const [users,        setUsers]       = useState<any[]>([])
  const [staffRoles,   setStaffRoles]  = useState<string[]>([])
  const [loading,      setLoading]     = useState(true)
  const [showInvite,   setShowInvite]  = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [editUser,     setEditUser]    = useState<any | null>(null)
  const [resetCreds,   setResetCreds]  = useState<{ userId: string; name: string; email: string; password: string } | null>(null)

  function load() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([api.users.list(), api.settings.get()])
      .then(([userData, settings]) => {
        setUsers(Array.isArray(userData) ? userData : (userData?.users ?? []))
        setStaffRoles((settings as any).staff_roles ?? [])
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
          onClose={() => setEditUser(null)}
          onSaved={(updated: any) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
            setEditUser(null)
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
                          <span className="font-medium text-neutral-dark">{u.name}</span>
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

// ─── Invite modal ─────────────────────────────────────────────────────────────

type ModalStep = 'form' | 'credentials' | 'training'

function InviteModal({
  token,
  staffRoles,
  onClose,
  onInvited,
}: {
  token:      string
  staffRoles: string[]
  onClose:    () => void
  onInvited:  () => void
}) {
  const [step,      setStep]      = useState<ModalStep>('form')
  const [creds,     setCreds]     = useState<{ userId: string; name: string; email: string; password: string } | null>(null)
  const [newUserId, setNewUserId] = useState('')
  const [form,      setForm]      = useState({ name: '', email: '', role: 'staff', job_role: '', phone_number: '', shift_type: 'any', first_language: 'eng', second_language: '' })
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

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
      phone_number:    form.phone_number || undefined,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      first_language:  form.first_language,
      second_language: form.second_language || undefined,
    }).catch((err: Error) => { setError(err.message); return null })

    setLoading(false)
    if (!res) return

    // Refresh the list in the background, but keep modal open to show credentials
    onInvited()
    setCreds({ userId: res.user.id, name: form.name, email: form.email, password: res.temp_password })
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
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Job role</label>
              {staffRoles.length > 0 ? (
                <select
                  value={form.job_role}
                  onChange={update('job_role')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  <option value="">— select a role —</option>
                  {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.job_role}
                  onChange={update('job_role')}
                  placeholder="e.g. Care Assistant (optional)"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              )}
              {staffRoles.length === 0 && (
                <p className="mt-1 text-xs text-neutral-mid">
                  Add role types in Settings to select from a dropdown here.
                </p>
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
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
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
                    {LANGUAGES.filter(l => l.code !== form.first_language).map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
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
          <CredentialsPanel
            title={`Login credentials created for ${creds.name}`}
            subtitle="Share these details with them securely — this is the only time the password will be shown."
            userId={creds.userId}
            email={creds.email}
            password={creds.password}
            token={token}
            onDone={() => setStep('training')}
          />
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
  onClose,
  onSaved,
}: {
  user:       any
  token:      string
  staffRoles: string[]
  onClose:    () => void
  onSaved:    (updated: any) => void
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
      role:            form.role,
      phone_number:    form.phone_number || null,
      shift_type:      form.shift_type as 'any' | 'day' | 'night',
      first_language:  form.first_language,
      second_language: form.second_language || null,
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
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Job role</label>
            {staffRoles.length > 0 ? (
              <select
                value={form.job_role}
                onChange={update('job_role')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              >
                <option value="">— select a role —</option>
                {staffRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={form.job_role}
                onChange={update('job_role')}
                placeholder="e.g. Care Assistant (optional)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
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
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
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
                  {LANGUAGES.filter(l => l.code !== form.first_language).map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
