'use client'

// Paid Policies — the queue of policies clients have paid for, promoted to its own tab.
// A purchase emails the team the moment it reconciles; this is where the work happens:
// write (with the verification gate and bounded rewrite loop), read, approve, deliver.

import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { PolicyOrders } from '@/components/platform/policy-orders'

export default function PaidPoliciesPage() {
  const token = usePlatformAuth()
  return (
    <PlatformShell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-neutral-dark">Paid Policies</h1>
        <p className="mt-0.5 text-sm text-neutral-mid">
          Every policy a client has paid for, and how far it has got. Writing runs the
          verification gate automatically; nothing can be approved with a red checklist
          without a written, audited reason.
        </p>
      </div>
      {token && <PolicyOrders token={token} />}
    </PlatformShell>
  )
}
