'use client'

// Staff hub: holiday requests for managers and administrators who decide them (pilot, CS-1001 only). Same pattern as policy approvals.
import { useSession } from 'next-auth/react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { useHolidayMeta } from '@/lib/holiday-client'
import { RequestsPanel } from '@/components/admin/holiday/requests-panel'

export function HolidayRequestsView() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { meta } = useHolidayMeta()
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><ClipboardCheck size={22} className="text-teal" aria-hidden="true" /> Holiday requests</h1>
        {!meta || !token ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading</p>
          : !meta.enabled || !meta.can_decide ? <p className="text-sm text-neutral-mid">You do not decide holiday requests.</p>
          : <RequestsPanel token={token} />}
      </div>
    </div>
  )
}
