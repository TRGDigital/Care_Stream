'use client'

// The company's Super User on the Incentives page, for every paid plan (including Starter, where incentive campaigns themselves are locked).
// Shows how they are getting on. No voucher or money detail: that is handled by CareStream.
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { useCachedQuery } from '@/lib/use-cached-query'
import { useIsFree } from '@/components/admin/free-tier'
import { SuperUserCard } from '@/components/super-user/super-user-card'

export function SuperUserSection() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const isFree = useIsFree()
  const q = useCachedQuery(token && !isFree ? `admin-super-user-${session?.user?.email ?? 'guest'}` : null, () => createApiClient(token).users.superUserSummary())
  if (isFree || !token || (q.loading && !q.data) || q.error || !q.data) return null
  const su: any = q.data.super_user
  const who = su?.person?.name ? ` (${su.person.name})` : ''
  // Closed by default, so the page opens on the incentive campaigns. A native details element: keyboard and screen reader friendly.
  return (
    <details className="group rounded-xl border border-gray-200 bg-white" aria-label="Super User">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-neutral-dark [&::-webkit-details-marker]:hidden">
        <span>Super User{who}{!su && <span className="ml-2 font-normal text-neutral-mid">none chosen yet</span>}</span>
        <svg className="h-4 w-4 shrink-0 text-neutral-mid transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div className="px-3 pb-4 sm:px-4">
        <SuperUserCard variant="admin" data={{ su: su ? { ...su, checks: [], status: 'in_window' } : null, adminStatus: su?.status }} />
        {!su && <p className="mt-2 text-xs text-neutral-mid">Add one on the <Link href="/staff" className="font-medium text-teal hover:underline">Staff</Link> page.</p>}
      </div>
    </details>
  )
}
