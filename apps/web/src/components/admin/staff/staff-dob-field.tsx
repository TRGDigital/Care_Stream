'use client'

// Date of birth on a staff member's add and edit forms. It is kept in the staff personal details (the Workforce register), where birthday greetings and the National
// Living Wage age bands read it. Only administrators see it. The parent form gives a ref; after the person is created or saved it calls ref.current(userId).
// If the account does not have personal details switched on, the box hides itself on an edit form and says so (not an error) on an add form.

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { LockedBadge } from '@/components/admin/locked-badge'

const inp = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const today = () => new Date().toISOString().slice(0, 10)

export function StaffDobField({ token, userId, saveRef }: { token: string; userId?: string; saveRef: React.MutableRefObject<((userId: string) => Promise<void>) | null> }) {
  const [dob, setDob] = useState('')
  const [available, setAvailable] = useState(true)
  const touched = useRef(false)

  useEffect(() => {
    if (!userId) return
    let live = true
    createApiClient(token).workforce.staffDetails(userId)
      .then(r => { if (live) setDob(r.details?.date_of_birth ? String(r.details.date_of_birth).slice(0, 10) : '') })
      .catch(() => { if (live) setAvailable(false) })   // personal details are not on for this account
    return () => { live = false }
  }, [token, userId])

  useEffect(() => {
    saveRef.current = async (id: string) => {
      if (!touched.current) return       // nothing typed: leave their record as it is
      await createApiClient(token).workforce.saveStaffDetails(id, { date_of_birth: dob || null })
    }
    return () => { saveRef.current = null }
  }, [token, dob, saveRef])

  if (!available) return null
  return (
    <div>
      <label htmlFor="staff-dob" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-dark">Date of birth <LockedBadge variant="icon" /></label>
      <input id="staff-dob" type="date" className={inp} value={dob} max={today()} min="1920-01-01" onChange={e => { touched.current = true; setDob(e.target.value) }} />
      <p className="mt-1 text-xs text-neutral-mid">Used for birthday greetings and the National Living Wage age bands. Only administrators can see it.</p>
    </div>
  )
}
