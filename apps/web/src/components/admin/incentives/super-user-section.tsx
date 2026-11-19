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
  return (
    <section aria-label="Super User">
      <SuperUserCard variant="admin" data={{ su: su ? { ...su, checks: [], status: 'in_window' } : null, adminStatus: su?.status }} />
      {!su && <p className="mt-2 text-xs text-neutral-mid">Add one on the <Link href="/staff" className="font-medium text-teal hover:underline">Staff</Link> page.</p>}
    </section>
  )
}
