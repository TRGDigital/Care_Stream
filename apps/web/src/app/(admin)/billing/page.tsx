'use client'

// §10.6 — Billing: plan summary, invoice history, Stripe portal link.
// Summary + invoices endpoints return stubs until Stripe integration is wired.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { ExternalLink, FileText, Download, CheckCircle2, Clock, AlertCircle, XCircle, Check, Loader2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pence(p: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p / 100)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    active:          { label: 'Active',       icon: <CheckCircle2 size={12} />, cls: 'bg-green-50 text-green-700'   },
    trialling:       { label: 'Trial',        icon: <Clock        size={12} />, cls: 'bg-blue-50  text-blue-700'    },
    past_due:        { label: 'Past due',     icon: <AlertCircle  size={12} />, cls: 'bg-amber-50 text-amber-700'   },
    cancelled:       { label: 'Cancelled',    icon: <XCircle      size={12} />, cls: 'bg-gray-100  text-neutral-mid' },
    paid:            { label: 'Paid',         icon: <CheckCircle2 size={12} />, cls: 'bg-green-50 text-green-700'   },
    open:            { label: 'Open',         icon: <Clock        size={12} />, cls: 'bg-amber-50 text-amber-700'   },
    void:            { label: 'Void',         icon: <XCircle      size={12} />, cls: 'bg-gray-100  text-neutral-mid' },
    uncollectible:   { label: 'Uncollectible',icon: <AlertCircle  size={12} />, cls: 'bg-red-50   text-red-700'     },
  }
  const { label, icon, cls } = map[status] ?? { label: status, icon: null, cls: 'bg-gray-100 text-neutral-mid' }
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
      {icon}{label}
    </span>
  )
}

// Headline features for a plan card / chooser tile.
function planFeats(p: any): string[] {
  return [
    `${p.monthly_annual_license_limit ?? 'Unlimited'} annual training allocations / month`,
    `${p.monthly_query_limit?.toLocaleString() ?? 'Unlimited'} queries / month`,
    `${p.max_staff_users ?? 'Unlimited'} staff`,
    `${p.max_policies ?? 'Unlimited'} policies`,
    ...(p.has_gap_detection      ? ['Policy gap analysis'] : []),
    ...(p.has_cqc_report         ? ['CQC Readiness Report'] : []),
    ...(p.has_advanced_analytics ? ['Advanced analytics'] : []),
    ...(p.has_face_to_face       ? ['Face-to-face training & matrix'] : []),
    ...(p.has_custom_audits      ? ['Build your own audits'] : []),
    ...(p.has_effectiveness      ? ['Effectiveness of training'] : []),
    ...(p.has_training_impact    ? ['Audits linked to training + Training Impact'] : []),
  ]
}

// Annual vs monthly toggle for the plan chooser / upgrade buttons.
function IntervalToggle({ value, onChange }: { value: 'month' | 'year'; onChange: (v: 'month' | 'year') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-sm">
      {(['month', 'year'] as const).map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={clsx('rounded-md px-3 py-1.5 font-medium transition-colors', value === v ? 'bg-teal text-white' : 'text-neutral-mid hover:text-neutral-dark')}
        >
          {v === 'month' ? 'Monthly' : 'Annual'}
          {v === 'year' && <span className={clsx('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', value === v ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700')}>2 months free</span>}
        </button>
      ))}
    </div>
  )
}

// Price line for a plan tile, reflecting the selected billing interval.
function PlanPrice({ p, interval }: { p: any; interval: 'month' | 'year' }) {
  if (interval === 'year' && p.price_annual_pence) {
    const saving = p.price_monthly_pence ? p.price_monthly_pence * 12 - p.price_annual_pence : 0
    return (
      <p className="mb-4">
        <span className="text-2xl font-bold text-neutral-dark">{pence(p.price_annual_pence)}</span>
        <span className="text-sm text-neutral-mid"> / year</span>
        {saving > 0 && <span className="ml-2 text-xs font-medium text-teal">save {pence(saving)}</span>}
      </p>
    )
  }
  return (
    <p className="mb-4">
      <span className="text-2xl font-bold text-neutral-dark">{pence(p.price_monthly_pence)}</span>
      <span className="text-sm text-neutral-mid"> / month</span>
    </p>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: session, update } = useSession()
  const userId = session?.user?.email ?? 'guest'
  // Training-only clients bought one-off licences (no subscription); their Billing page
  // shows what they purchased + receipts instead of a plan summary / plan chooser.
  const trainingOnly = (session?.user as any)?.tier === 'training_only'
  // 14 days from now — shown so the user knows exactly when the first charge falls.
  const trialEndLabel = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const [summary,  setSummary]  = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [plans,    setPlans]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error,    setError]    = useState('')
  const [portalError, setPortalError] = useState('')
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)
  // Monthly vs annual billing for the plan chooser / upgrade buttons.
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  // Post-checkout banner (read from the URL, client-only to avoid Suspense needs).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('checkout')
    if (p === 'success' || p === 'cancelled') {
      setBanner(p)
      window.history.replaceState({}, '', '/billing')
    }
  }, [])

  // On a successful return, reconcile the subscription straight from Stripe (so we
  // don't depend on the webhook), refresh the session to release the billing gate,
  // then drop the user into the hub. Retry briefly in case Stripe is a beat behind.
  const syncRanRef = useRef(false)
  useEffect(() => {
    if (syncRanRef.current || banner !== 'success' || !session?.accessToken) return
    syncRanRef.current = true
    const api = createApiClient(session.accessToken)
    let tries = 0
    const tick = async () => {
      tries++
      const r = await api.billing.sync().catch(() => null)
      await update().catch(() => null)
      if (r && !r.needs_billing) { window.location.href = '/dashboard'; return }
      if (tries < 6) setTimeout(tick, 2000)
    }
    tick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner, session?.accessToken])

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<{ summary: any; invoices: any[] }>(`admin-billing-${userId}`)
    if (cached) { setSummary(cached.summary); setInvoices(cached.invoices); setLoading(false) }
    // Training-only clients load purchases instead — same instant-paint treatment.
    const cachedPurchases = persistentCache.get<any[]>(`admin-billing-purchases-${userId}`)
    if (cachedPurchases) { setPurchases(cachedPurchases); setLoading(false) }
  }, [userId])

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    if (trainingOnly) {
      api.training.purchases()
        .then(d => { setPurchases(d.purchases); persistentCache.set(`admin-billing-purchases-${userId}`, d.purchases) })
        .catch((e: any) => setError(e.message ?? 'Failed to load your purchases.'))
        .finally(() => setLoading(false))
      return
    }
    Promise.all([api.billing.summary(), api.billing.invoices(), api.billing.plans()])
      .then(([s, inv, pl]) => { setSummary(s); setInvoices(inv.invoices); setPlans(pl.plans); persistentCache.set(`admin-billing-${userId}`, { summary: s, invoices: inv.invoices }) })
      .catch((e: any) => setError(e.message ?? 'Failed to load billing information.'))
      .finally(() => setLoading(false))
  }, [session?.accessToken, trainingOnly])

  async function subscribe(planId: string) {
    if (!session?.accessToken) return
    setCheckoutError(''); setCheckoutPlan(planId)
    try {
      const { url } = await createApiClient(session.accessToken).billing.checkout(planId, billingInterval)
      window.location.href = url   // hand off to Stripe-hosted Checkout
    } catch (e: any) {
      setCheckoutError(e.message ?? 'Could not start checkout.'); setCheckoutPlan(null)
    }
  }

  async function openPortal() {
    if (!session?.accessToken) return
    setPortalError('')
    setPortalLoading(true)
    const api = createApiClient(session.accessToken)
    const res = await api.billing.portal().catch((e: Error) => { setPortalError(e.message); return null })
    setPortalLoading(false)
    if (res?.url) window.open(res.url, '_blank', 'noopener')
  }

  if (trainingOnly) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Billing</h1>
        {error && <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-neutral-dark">What you&rsquo;ve purchased</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">Your training licences and receipts. Each licence covers one staff member for one year.</p>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-sm text-neutral-mid">Loading&hellip;</div>
          ) : purchases.length === 0 ? (
            <div className="px-6 py-8 text-sm text-neutral-mid">No purchases yet. <Link href="/training" className="font-semibold text-blue-600 hover:underline">Browse training modules</Link>.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {purchases.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-dark">{p.module_name}</p>
                    <p className="mt-0.5 text-xs text-neutral-mid">{p.quantity} licence{p.quantity === 1 ? '' : 's'} &middot; purchased {fmtDate(p.purchased_at)} &middot; renews {fmtDate(p.renewal_due_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-neutral-dark">{pence(p.total_pence)}</span>
                    {p.receipt_url
                      ? <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"><FileText size={12} /> View receipt</a>
                      : <span className="text-xs text-neutral-mid">&mdash;</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-neutral-mid">Need another module? <Link href="/training" className="font-semibold text-blue-600 hover:underline">Browse the training library</Link>.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Billing</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {banner === 'success' && (
        <div className="mb-6 flex items-start gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Thank you — your 14-day free trial is starting. Taking you into CareStream…</span>
        </div>
      )}
      {banner === 'cancelled' && (
        <div className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Checkout was cancelled — you have not been charged. You can choose a plan again below whenever you’re ready.
        </div>
      )}

      {/* ── Plan summary ────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-card bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Current plan</h2>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-5 w-48 animate-pulse rounded bg-gray-100" />)}
            </div>
          ) : summary ? (
            <>
              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-mid">Plan</p>
                  <p className="font-semibold text-neutral-dark">{summary.plan_name ?? '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-mid">Status</p>
                  <StatusBadge status={summary.subscription_status} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    Monthly price
                  </p>
                  <p className="font-semibold text-neutral-dark">
                    {summary.price_monthly_pence ? pence(summary.price_monthly_pence) : '—'}
                    {summary.billing_interval && (
                      <span className="ml-1 text-xs font-normal text-neutral-mid">
                        / {summary.billing_interval}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    Next billing date
                  </p>
                  <p className="font-semibold text-neutral-dark">
                    {summary.next_billing_date ? fmtDate(summary.next_billing_date) : '—'}
                  </p>
                </div>
              </div>

              {summary.current_period_start && summary.current_period_end && (
                <p className="mb-5 text-xs text-neutral-mid">
                  Current period: {fmtDate(summary.current_period_start)} – {fmtDate(summary.current_period_end)}
                </p>
              )}

              {portalError && (
                <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{portalError}</p>
              )}

              <button
                onClick={openPortal}
                disabled={portalLoading || !summary.has_stripe}
                className="flex items-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
              >
                <ExternalLink size={14} />
                {portalLoading ? 'Opening portal…' : 'Manage billing'}
              </button>

              {!summary.has_stripe && (
                <p className="mt-2 text-xs text-neutral-mid">
                  Stripe billing not yet connected to this account.
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-mid">
                Manage your subscription, update payment details, and download invoices via our
                secure Stripe billing portal.
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Upgrade your plan (active subscribers — show higher tiers) ───────── */}
      {!loading && summary && summary.subscription_status === 'active' && (() => {
        const currentPrice = summary.price_monthly_pence ?? 0
        const upgrades = plans.filter((p: any) => (p.price_monthly_pence ?? 0) > currentPrice)
        if (upgrades.length === 0) {
          return (
            <div className="mb-6 rounded-card border border-teal/20 bg-teal-light/20 px-6 py-4 text-sm text-neutral-dark">
              <span className="font-semibold">You&rsquo;re on our top plan.</span> Every feature is included.
            </div>
          )
        }
        return (
          <div className="mb-6 rounded-card bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-dark">Upgrade your plan</h2>
                <p className="mt-0.5 text-xs text-neutral-mid">Unlock more features and a bigger monthly allocation. Upgrades take effect immediately; your data is kept exactly as it is.</p>
              </div>
              <IntervalToggle value={billingInterval} onChange={setBillingInterval} />
            </div>
            <div className="px-6 py-5">
              {checkoutError && (
                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{checkoutError}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {upgrades.map((p: any) => (
                  <div key={p.id} className="rounded-lg border border-gray-200 p-5">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-dark">{p.name}</h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Upgrade</span>
                    </div>
                    <PlanPrice p={p} interval={billingInterval} />
                    <ul className="mb-5 space-y-1.5">
                      {planFeats(p).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-neutral-dark">
                          <Check size={14} className="shrink-0 text-teal" />{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => subscribe(p.id)}
                      disabled={!!checkoutPlan}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                    >
                      {checkoutPlan === p.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {checkoutPlan === p.id ? 'Redirecting to Stripe…' : `Upgrade to ${p.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Plan chooser (shown until a subscription is active) ──────────────── */}
      {!loading && summary && summary.subscription_status !== 'active' && plans.length > 0 && (
        <div className="mb-6 rounded-card bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-dark">
                {summary.has_stripe ? 'Reactivate your subscription' : 'Start your 14-day free trial'}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-mid">
                {summary.has_stripe
                  ? 'Secure payment is handled by Stripe — we never see or store your card details.'
                  : `Pick a plan to start your free trial. A card is required, but you won't be charged until ${trialEndLabel} — cancel anytime before then. Payment is handled by Stripe; we never see or store your card details.`}
              </p>
            </div>
            <IntervalToggle value={billingInterval} onChange={setBillingInterval} />
          </div>
          <div className="px-6 py-5">
            {checkoutError && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{checkoutError}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((p: any) => {
                const isCurrent = summary.plan_name === p.name
                const feats: string[] = planFeats(p)
                return (
                  <div key={p.id} className={clsx('rounded-lg border p-5', isCurrent ? 'border-teal ring-1 ring-teal/30' : 'border-gray-200')}>
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-dark">{p.name}</h3>
                      {isCurrent && <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal">Your plan</span>}
                    </div>
                    <PlanPrice p={p} interval={billingInterval} />
                    <ul className="mb-5 space-y-1.5">
                      {feats.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-neutral-dark">
                          <Check size={14} className="shrink-0 text-teal" />{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => subscribe(p.id)}
                      disabled={!!checkoutPlan}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                    >
                      {checkoutPlan === p.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      {checkoutPlan === p.id ? 'Redirecting to Stripe…' : summary.has_stripe ? 'Subscribe' : 'Start free trial'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice history ──────────────────────────────────────────────────── */}
      <div className="rounded-card bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-dark">Invoice history</h2>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText size={32} className="text-neutral-mid/40" />
              <p className="text-sm font-medium text-neutral-dark">No invoices yet</p>
              <p className="max-w-xs text-xs text-neutral-mid">
                Invoices will appear here once your subscription is active and your first billing
                cycle has completed.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: card grid */}
              <div className="grid gap-3 sm:hidden">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="rounded-md border border-gray-100 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-dark">{inv.description}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-neutral-mid">{fmtDate(inv.date)}</p>
                        <p className="mt-0.5 text-sm font-semibold text-neutral-dark">{pence(inv.amount_pence)}</p>
                      </div>
                      <div className="flex gap-2">
                        {inv.pdf_url && (
                          <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
                            <Download size={11} />PDF
                          </a>
                        )}
                        {inv.hosted_url && (
                          <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
                            <ExternalLink size={11} />View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="hidden w-full text-sm sm:table">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 pr-4 text-xs font-medium text-neutral-mid">Date</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-neutral-mid">Description</th>
                    <th className="pb-3 pr-4 text-right text-xs font-medium text-neutral-mid">Amount</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-neutral-mid">Status</th>
                    <th className="pb-3 text-xs font-medium text-neutral-mid">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 text-neutral-mid">{fmtDate(inv.date)}</td>
                      <td className="py-3 pr-4 font-medium text-neutral-dark">{inv.description}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-neutral-dark">{pence(inv.amount_pence)}</td>
                      <td className="py-3 pr-4"><StatusBadge status={inv.status} /></td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {inv.pdf_url && (
                            <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
                              <Download size={11} />PDF
                            </a>
                          )}
                          {inv.hosted_url && (
                            <a href={inv.hosted_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">
                              <ExternalLink size={11} />View
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
