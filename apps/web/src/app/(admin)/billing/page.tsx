'use client'

// §10.6 — Billing: plan summary, invoice history, Stripe portal link.
// Summary + invoices endpoints return stubs until Stripe integration is wired.

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { ExternalLink, FileText, Download, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: session } = useSession()
  const userId = session?.user?.email ?? 'guest'

  const [summary,  setSummary]  = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error,    setError]    = useState('')
  const [portalError, setPortalError] = useState('')

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<{ summary: any; invoices: any[] }>(`admin-billing-${userId}`)
    if (cached) { setSummary(cached.summary); setInvoices(cached.invoices); setLoading(false) }
  }, [userId])

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)
    Promise.all([api.billing.summary(), api.billing.invoices()])
      .then(([s, inv]) => { setSummary(s); setInvoices(inv.invoices); persistentCache.set(`admin-billing-${userId}`, { summary: s, invoices: inv.invoices }) })
      .catch((e: any) => setError(e.message ?? 'Failed to load billing information.'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  async function openPortal() {
    if (!session?.accessToken) return
    setPortalError('')
    setPortalLoading(true)
    const api = createApiClient(session.accessToken)
    const res = await api.billing.portal().catch((e: Error) => { setPortalError(e.message); return null })
    setPortalLoading(false)
    if (res?.url) window.open(res.url, '_blank', 'noopener')
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Billing</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
