'use client'

// §14.7 — Staff management: user table, invite modal.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus, X } from 'lucide-react'

export default function StaffPage() {
  const { data: session }           = useSession()
  const [users,     setUsers]       = useState<any[]>([])
  const [loading,   setLoading]     = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  function load() {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.users.list()
      .then(data => setUsers(Array.isArray(data) ? data : (data?.users ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [session?.accessToken])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-dark">Staff</h1>
        <Button onClick={() => setShowInvite(true)} size="md">
          <UserPlus size={15} className="mr-2" />
          Invite staff
        </Button>
      </div>

      {showInvite && (
        <InviteModal
          token={session?.accessToken ?? ''}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); setLoading(true); load() }}
        />
      )}

      <div className="rounded-card bg-white shadow-card">
        {loading ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">Loading…</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">
            No staff yet. Invite your team to start using CareStreamAI.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Name</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Email</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Role</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50">
                    <td className="px-6 py-3 font-medium text-neutral-dark">{u.name}</td>
                    <td className="px-6 py-3 text-neutral-mid">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={u.role === 'admin' ? 'admin' : 'staff'}>
                        {u.role === 'admin' ? 'Admin' : 'Staff'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-neutral-mid">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InviteModal({
  token,
  onClose,
  onInvited,
}: {
  token:     string
  onClose:   () => void
  onInvited: () => void
}) {
  const [form, setForm]     = useState({ name: '', email: '', role: 'staff' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const api = createApiClient(token)
    const res = await api.users.invite(form).catch((err: Error) => {
      setError(err.message)
      return null
    })

    setLoading(false)
    if (!res) return
    onInvited()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-dark">Invite staff member</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { k: 'name',  label: 'Full name',      type: 'text',  ph: 'Jane Smith'                  },
            { k: 'email', label: 'Email address',   type: 'email', ph: 'jane@carehome.co.uk'         },
          ].map(({ k, label, type, ph }) => (
            <div key={k}>
              <label className="mb-1.5 block text-sm font-medium text-neutral-dark">{label}</label>
              <input
                type={type}
                required
                placeholder={ph}
                value={form[k as keyof typeof form]}
                onChange={update(k as keyof typeof form)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-dark">Role</label>
            <select
              value={form.role}
              onChange={update('role')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-status-error">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Inviting…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
