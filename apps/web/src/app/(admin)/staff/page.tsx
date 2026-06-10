'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, KeyRound, LineChart, Mail, MoreVertical, Pencil, UserMinus, UserPlus, UserX } from 'lucide-react'
import { LANGUAGES, CredentialsPanel, InitialAvatar, fmtDate } from '@/components/admin/staff/staff-shared'

// Staff modals are lazy-loaded — only fetched when a dialog is opened.
const InviteModal      = dynamic(() => import('@/components/admin/staff/staff-modals').then(m => m.InviteModal),      { ssr: false })
const EditModal        = dynamic(() => import('@/components/admin/staff/staff-modals').then(m => m.EditModal),        { ssr: false })
const StaffDetailModal = dynamic(() => import('@/components/admin/staff/staff-modals').then(m => m.StaffDetailModal), { ssr: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LastSeen({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <span className="text-xs italic text-neutral-mid/50">—</span>
  const daysSince = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const colour = daysSince <= 7 ? 'text-status-success' : daysSince <= 30 ? 'text-amber-500' : 'text-neutral-mid'
  return <span className={`text-xs ${colour}`}>{fmtDate(iso)}</span>
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
  const userId = session?.user?.email ?? 'guest'
  const [users,        setUsers]       = useState<any[]>([])
  const [staffRoles,   setStaffRoles]  = useState<string[]>([])
  const [specialistRoles, setSpecialistRoles] = useState<string[]>([])
  const [languages,    setLanguages]   = useState<{ code: string; name: string }[]>(LANGUAGES)
  const [loading,      setLoading]     = useState(true)
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
        persistentCache.set(`admin-staff-${userId}`, { users: list, staffRoles: roles, specialistRoles: specialists, languages: langs })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const cached = persistentCache.get<{ users: any[]; staffRoles: string[]; specialistRoles: string[]; languages?: { code: string; name: string }[] }>(`admin-staff-${userId}`)
    if (cached) {
      setUsers(cached.users)
      setStaffRoles(cached.staffRoles)
      setSpecialistRoles(cached.specialistRoles)
      setLanguages(cached.languages ?? LANGUAGES)
      setLoading(false)
    }
  }, [userId])

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
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Record</th>
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
                            title="Quick view"
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
                    <td className="px-6 py-3">
                      <Link
                        href={`/staff/${u.id}`}
                        title="Open this staff member's full training & induction record"
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal-light/40"
                      >
                        <LineChart size={13} /> View
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-neutral-mid">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={u.role === 'admin' ? 'admin' : 'staff'}>
                        {u.role === 'admin'
                          ? 'Admin'
                          : (Array.isArray(u.audit_template_ids) && u.audit_template_ids.length > 0 ? 'Staff + Audits' : 'Staff')}
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
