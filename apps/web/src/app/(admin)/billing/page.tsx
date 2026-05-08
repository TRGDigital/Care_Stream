'use client'

// §10.6 — Billing: current plan summary + Stripe Customer Portal link.

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

export default function BillingPage() {
  const { data: session }     = useSession()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function openPortal() {
    if (!session?.accessToken) return
    setError('')
    setLoading(true)

    const api = createApiClient(session.accessToken)
    const res = await api.billing.portal().catch((err: Error) => {
      setError(err.message)
      return null
    })

    setLoading(false)
    if (res?.url) {
      window.open(res.url, '_blank', 'noopener')
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Billing</h1>

      <div className="max-w-lg rounded-card bg-white p-6 shadow-card">
        <h2 className="mb-1 text-lg font-semibold text-neutral-dark">Subscription</h2>
        <p className="mb-6 text-sm text-neutral-mid">
          Manage your subscription, update payment details, and download invoices via the Stripe
          billing portal.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-status-error">{error}</p>
        )}

        <Button onClick={openPortal} disabled={loading}>
          <ExternalLink size={14} className="mr-2" />
          {loading ? 'Opening portal…' : 'Manage billing'}
        </Button>

        <p className="mt-4 text-xs text-neutral-mid">
          You will be redirected to our secure payment provider, Stripe.
        </p>
      </div>
    </div>
  )
}
