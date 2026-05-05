'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Mail, Plus, Trash2, Copy, Check } from 'lucide-react'

export default function SettingsPage() {
  const { data: session }           = useSession()
  const [inboundEmail,  setInboundEmail]  = useState('')
  const [allowlist,     setAllowlist]     = useState<string[]>([])
  const [facilityType,  setFacilityType]  = useState('')
  const [newEmail,      setNewEmail]      = useState('')
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState('')
  const [saving,        setSaving]        = useState(false)
  const [savingFacility,setSavingFacility] = useState(false)
  const [error,         setError]         = useState('')
  const [copied,        setCopied]        = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    api.settings.get()
      .then(data => {
        setInboundEmail(data.inbound_email)
        setAllowlist(data.email_allowlist)
        setFacilityType((data as any).facility_type ?? 'care home')
      })
      .catch((e: any) => setLoadError(e.message ?? 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  async function saveFacilityType() {
    if (!session?.accessToken || !facilityType.trim()) return
    setSavingFacility(true)
    try {
      await createApiClient(session.accessToken).settings.update({ facility_type: facilityType.trim() } as any)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSavingFacility(false)
    }
  }

  async function save(updated: string[]) {
    if (!session?.accessToken) return
    setSaving(true)
    setError('')
    try {
      const api  = createApiClient(session.accessToken)
      const data = await api.settings.update({ email_allowlist: updated })
      setAllowlist(data.email_allowlist)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function addEmail() {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (allowlist.includes(email)) {
      setError('That address is already on the list.')
      return
    }
    setError('')
    const updated = [...allowlist, email]
    setAllowlist(updated)
    setNewEmail('')
    save(updated)
  }

  function removeEmail(email: string) {
    const updated = allowlist.filter(e => e !== email)
    setAllowlist(updated)
    save(updated)
  }

  function copyEmail() {
    navigator.clipboard.writeText(inboundEmail).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Settings</h1>

      {loadError && (
        <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load settings: {loadError}. Make sure the API server is running.
        </div>
      )}

      {/* Inbound email address */}
      <div className="mb-6 rounded-card bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Dedicated email address</h2>
        </div>
        <div className="px-6 py-5">
          <p className="mb-4 text-sm text-neutral-mid">
            Staff send their policy questions to this address. CareStream responds automatically
            with the relevant policy information.
          </p>
          {loading ? (
            <div className="h-10 animate-pulse rounded-md bg-gray-100" />
          ) : inboundEmail ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-neutral-light px-4 py-2.5">
                <Mail size={15} className="shrink-0 text-neutral-mid" />
                <span className="text-sm font-medium text-neutral-dark">{inboundEmail}</span>
              </div>
              <button
                onClick={copyEmail}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-neutral-mid shadow-sm hover:bg-gray-50"
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : !loadError ? (
            <p className="text-sm text-neutral-mid">Email address not available.</p>
          ) : null}
        </div>
      </div>

      {/* Facility type */}
      <div className="mb-6 rounded-card bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Facility type</h2>
        </div>
        <div className="px-6 py-5">
          <p className="mb-4 text-sm text-neutral-mid">
            Used to personalise AI responses and knowledge extraction. Examples: care home, nursing home,
            residential home, supported living, domiciliary care.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={facilityType}
              onChange={e => setFacilityType(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveFacilityType()}
              placeholder="e.g. nursing home"
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
            <Button onClick={saveFacilityType} disabled={savingFacility || !facilityType.trim()} size="md">
              {savingFacility ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Email allowlist */}
      <div className="rounded-card bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Approved sender addresses</h2>
        </div>
        <div className="px-6 py-5">
          <p className="mb-5 text-sm text-neutral-mid">
            Only emails received from addresses on this list will receive a response.
            Emails from any other address are silently discarded.
            Leave the list empty to allow any registered staff member to query via email.
          </p>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
          )}

          {/* Add new email */}
          <div className="mb-5 flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              placeholder="e.g. nurses@yourcarecompany.co.uk"
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm text-neutral-dark placeholder:text-neutral-mid focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
            />
            <Button onClick={addEmail} disabled={saving || !newEmail.trim()} size="md">
              <Plus size={14} className="mr-1.5" />
              Add
            </Button>
          </div>

          {/* Allowlist */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-md bg-gray-100" />)}
            </div>
          ) : allowlist.length === 0 ? (
            <p className="rounded-md bg-neutral-light px-4 py-3 text-sm text-neutral-mid">
              No approved addresses added yet — all registered staff can query via email.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {allowlist.map(email => (
                <li key={email} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-neutral-dark">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    disabled={saving}
                    className="rounded p-1 text-neutral-mid hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {saving && (
            <p className="mt-3 text-xs text-neutral-mid">Saving…</p>
          )}
        </div>
      </div>
    </div>
  )
}
