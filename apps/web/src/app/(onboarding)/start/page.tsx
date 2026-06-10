'use client'

// Dedicated "choose your plan" onboarding step. New tenants land here straight
// after verifying their email (the billing gate routes them here) — a clean,
// focused screen with just the plans, no console chrome. Select → Stripe Checkout
// (14-day trial, card up front) → reconcile from Stripe on return → into the hub.

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { Check, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

function pounds(p: number): string {
  return `£${(p / 100).toLocaleString('en-GB', { minimumFractionDigits: p % 100 ? 2 : 0 })}`
}

function StartInner() {
  const { data: session, update } = useSession()
  const params = useSearchParams()
  const checkout = params.get('checkout') // 'success' | 'cancelled' | null

  const [plans, setPlans]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [error, setError]               = useState('')

  const trialEndLabel = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Already subscribed (gate not needed) and not mid-checkout — don't show the
  // picker (avoids a second subscription); send them into the hub.
  useEffect(() => {
    if (checkout) return
    if (session?.user && (session.user as any).needsBilling === false) {
      window.location.href = (session.user as any)?.role === 'admin' ? '/dashboard' : '/chat'
    }
  }, [session, checkout])

  // Load the available plans.
  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).billing.plans()
      .then(r => setPlans(r.plans))
      .catch((e: any) => setError(e.message ?? 'Could not load plans.'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  // On return from a successful checkout: reconcile the subscription straight from
  // Stripe (no webhook dependency), refresh the session to release the gate, then
  // go to the hub. Retry briefly in case Stripe is a beat behind.
  const syncRan = useRef(false)
  useEffect(() => {
    if (syncRan.current || checkout !== 'success' || !session?.accessToken) return
    syncRan.current = true
    const api = createApiClient(session.accessToken)
    // Admins (the usual sign-up) land on the dashboard; staff land in the hub.
    const dest = (session.user as any)?.role === 'admin' ? '/dashboard' : '/chat'
    let tries = 0
    const tick = async () => {
      tries++
      const r = await api.billing.sync().catch(() => null)
      await update().catch(() => null)
      if (r && !r.needs_billing) { window.location.href = dest; return }
      if (tries < 6) setTimeout(tick, 2000)
    }
    tick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, session?.accessToken])

  async function choose(planId: string) {
    if (!session?.accessToken) return
    setError(''); setCheckoutPlan(planId)
    try {
      const { url } = await createApiClient(session.accessToken).billing.checkout(planId)
      window.location.href = url // hand off to Stripe-hosted Checkout
    } catch (e: any) {
      setError(e.message ?? 'Could not start checkout.'); setCheckoutPlan(null)
    }
  }

  if (checkout === 'success') {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-teal" />
        <h1 className="text-xl font-bold text-neutral-dark">Your free trial is starting…</h1>
        <p className="mt-2 text-sm text-neutral-mid">Setting up your account and taking you in.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-dark sm:text-3xl">Start your 14-day free trial</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-mid">
          Choose your plan. A card is required to start, but you won&apos;t be charged until{' '}
          <strong>{trialEndLabel}</strong> — cancel anytime before then. Payment is handled securely by Stripe.
        </p>
        {checkout === 'cancelled' && (
          <p className="mt-4 inline-block rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Checkout cancelled — you haven&apos;t been charged. Pick a plan whenever you&apos;re ready.
          </p>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-72 animate-pulse rounded-xl bg-white shadow-card" />)}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {plans.map((p: any) => {
            const feats: string[] = [
              `${p.monthly_query_limit?.toLocaleString() ?? 'Unlimited'} questions / month`,
              `${p.max_staff_users ?? 'Unlimited'} staff users`,
              `${p.max_policies ?? 'Unlimited'} policies`,
              ...(p.has_cqc_report ? ['CQC Readiness Reports'] : []),
              ...(p.has_gap_detection ? ['Policy gap detection'] : []),
              ...(p.has_advanced_analytics ? ['Advanced analytics'] : []),
            ]
            const highlight = !!p.has_cqc_report // Professional
            return (
              <div key={p.id} className={clsx('flex flex-col rounded-xl border bg-white p-6 shadow-card', highlight ? 'border-teal ring-1 ring-teal/30' : 'border-gray-200')}>
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-neutral-dark">{p.name}</h2>
                  {highlight && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">Most popular</span>}
                </div>
                <p className="mb-4">
                  <span className="text-3xl font-extrabold text-neutral-dark">{pounds(p.price_monthly_pence)}</span>
                  <span className="text-sm text-neutral-mid"> / month</span>
                </p>
                <ul className="mb-6 space-y-2">
                  {feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-dark">
                      <Check size={16} className="mt-0.5 shrink-0 text-teal" />{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choose(p.id)}
                  disabled={!!checkoutPlan}
                  className={clsx('mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50', highlight ? 'bg-teal hover:bg-teal-dark' : 'bg-neutral-dark hover:bg-neutral-dark/90')}
                >
                  {checkoutPlan === p.id ? <Loader2 size={15} className="animate-spin" /> : null}
                  {checkoutPlan === p.id ? 'Redirecting to Stripe…' : 'Start free trial'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-neutral-mid">
        14-day free trial · No charge until {trialEndLabel} · Cancel anytime
      </p>
    </div>
  )
}

export default function StartPage() {
  return (
    <Suspense>
      <StartInner />
    </Suspense>
  )
}
