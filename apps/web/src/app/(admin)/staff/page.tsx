'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient, type StaffContact } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KeyRound, LineChart, Mail, MoreVertical, Pencil, UserMinus, UserPlus, UserX } from 'lucide-react'
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
    if (!confirm(`Archive ${user.name}? They’ll move to Archived staff and can no longer log in. Their records are kept for compliance.`)) return
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
        className={`flex items-center rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
          open ? 'bg-teal-light/40 text-teal' : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'
        }`}
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          className="dropdown-pop fixed z-50 w-56 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
          style={{
            top:    menuPos.top    !== undefined ? menuPos.top    : undefined,
            bottom: menuPos.bottom !== undefined ? menuPos.bottom : undefined,
            right:  menuPos.right,
          }}
        >
          <button
            onClick={() => { setOpen(false); onEdit(user) }}
            className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
          >
            <Pencil size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" />
            Edit details
          </button>
          <button
            onClick={handleReset}
            className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
          >
            <Mail size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" />
            Re-send login
          </button>
          <button
            onClick={handleReset}
            className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-dark transition-colors hover:bg-neutral-light"
          >
            <KeyRound size={15} className="shrink-0 text-neutral-mid transition-colors group-hover:text-teal" />
            Reset password
          </button>
          <div className="mx-2 my-1.5 border-t border-gray-100" />
          {user.is_active ? (
            <button
              onClick={handleDeactivate}
              className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <UserMinus size={15} className="shrink-0 text-red-400 transition-colors group-hover:text-red-600" />
              Archive staff member
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
            >
              <UserPlus size={15} className="shrink-0 text-green-500 transition-colors group-hover:text-green-700" />
              Restore to active staff
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
  const [catalog,      setCatalog]     = useState<{ code: string; name: string }[]>([])
  const [loading,      setLoading]     = useState(true)
  const [showInvite,   setShowInvite]  = useState(false)
  const [tab,          setTab]         = useState<'active' | 'archived'>('active')
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
        const cat = (settings as any).language_catalog ?? []
        setUsers(list); setStaffRoles(roles); setSpecialistRoles(specialists); setLanguages(langs); setCatalog(cat)
        persistentCache.set(`admin-staff-${userId}`, { users: list, staffRoles: roles, specialistRoles: specialists, languages: langs, catalog: cat })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const cached = persistentCache.get<{ users: any[]; staffRoles: string[]; specialistRoles: string[]; languages?: { code: string; name: string }[]; catalog?: { code: string; name: string }[] }>(`admin-staff-${userId}`)
    if (cached) {
      setUsers(cached.users)
      setStaffRoles(cached.staffRoles)
      setSpecialistRoles(cached.specialistRoles)
      setLanguages(cached.languages ?? LANGUAGES)
      setCatalog(cached.catalog ?? [])
      setLoading(false)
    }
  }, [userId])

  useEffect(load, [session?.accessToken])

  const activeUsers   = users.filter(u => u.is_active !== false)
  const inactiveUsers = users.filter(u => u.is_active === false)
  const displayUsers  = tab === 'archived' ? inactiveUsers : activeUsers

  function handleDeactivate(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u))
  }

  function handleReactivate(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: true } : u))
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-dark">Staff</h1>
        <Button onClick={() => setShowInvite(true)} size="md">
          <UserPlus size={15} className="mr-2" />
          Add staff member
        </Button>
      </div>

      {/* Active / Archived tabs */}
      <div className="mb-5 flex gap-6 border-b border-gray-200">
        {([
          { key: 'active',   label: 'Active staff',   count: activeUsers.length   },
          { key: 'archived', label: 'Archived staff', count: inactiveUsers.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-teal text-teal' : 'border-transparent text-neutral-mid hover:text-neutral-dark'
            }`}
          >
            {t.key === 'archived' && <UserX size={14} />}
            {t.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? 'bg-teal/10 text-teal' : 'bg-gray-100 text-neutral-mid'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'archived' && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <UserX size={14} className="mt-0.5 shrink-0" />
          Archived staff have left but their records are retained for compliance. Their training, induction and audit history is preserved — open “View” to see it, or restore them to active staff at any time.
        </p>
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          token={session?.accessToken ?? ''}
          staffRoles={staffRoles}
          specialistRoles={specialistRoles}
          languages={languages}
          languageCatalog={catalog}
          onLanguagesChange={setLanguages}
          onStaffRolesChange={setStaffRoles}
          onSpecialistRolesChange={setSpecialistRoles}
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
          languageCatalog={catalog}
          onLanguagesChange={setLanguages}
          onStaffRolesChange={setStaffRoles}
          onSpecialistRolesChange={setSpecialistRoles}
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
            {tab === 'archived'
              ? 'No archived staff — when you remove someone, they’ll appear here with their records kept.'
              : 'No staff yet — add your team so they can access the chat system.'}
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
                    className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <InitialAvatar name={u.name} role={u.role} />
                        <div className="min-w-0">
                          <button
                            onClick={() => setDetailUserId(u.id)}
                            className="block truncate text-left font-medium text-neutral-dark hover:text-teal hover:underline"
                            title="Quick view"
                          >
                            {u.name}
                          </button>
                          {Array.isArray(u.specialisms) && u.specialisms.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.specialisms.map((s: string) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-teal"
                                  title="Specialist role"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
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
