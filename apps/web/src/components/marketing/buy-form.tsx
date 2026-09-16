'use client'

import { useState } from 'react'
import { Minus, Plus, Loader2, ShieldCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

// Two skins, one checkout. The rebuilt theme styles this panel with its own `by*` classes; the
// logic, the validation and the call to /public/training/checkout are shared, so the two cannot
// drift apart the way a second copy of the form would.
export function BuyForm({ slug, moduleName, unitPence, variant = 'default' }: {
  slug: string; moduleName: string; unitPence: number; variant?: 'default' | 'theme'
}) {
  // The theme's form opens at eight licences, a typical team, not one.
  const [qty, setQty]     = useState(variant === 'theme' ? 8 : 1)
  const [email, setEmail] = useState('')
  const [org, setOrg]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  const total = qty * unitPence
  const setQ = (n: number) => setQty(Math.max(1, Math.min(500, n)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!org.trim()) { setError('Please enter your organisation name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/public/training/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ module_slug: slug, quantity: qty, email: email.trim(), org_name: org.trim() }),
      })
      const body = await res.json()
      if (!res.ok || !body?.data?.url) throw new Error(body?.error ?? 'Could not start checkout. Please try again.')
      window.location.href = body.data.url
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (variant === 'theme') {
    return (
      <form className="bypanel" onSubmit={submit}>
        <div className="byprice"><b>{gbp(unitPence)}</b><span>per staff member</span></div>
        <p className="note">One-off payment. No renewal unless you buy again.</p>

        <label className="bylabel" htmlFor="byq">Number of licences</label>
        <div className="byqty">
          <div className="bystep">
            <button type="button" onClick={() => setQ(qty - 1)} aria-label="Fewer licences">−</button>
            <input id="byq" type="number" min={1} max={500} value={qty}
                   onChange={e => setQ(parseInt(e.target.value || '1', 10))} />
            <button type="button" onClick={() => setQ(qty + 1)} aria-label="More licences">+</button>
          </div>
          {/* Inline, as the theme has it, rather than a class of my own invention. */}
          <span style={{ fontSize: '.86rem', color: 'var(--muted)' }}>{gbp(unitPence)} each</span>
        </div>

        <div className="byfield">
          <label className="bylabel" htmlFor="byorg">Your service</label>
          <input id="byorg" type="text" value={org} onChange={e => setOrg(e.target.value)}
                 placeholder="Ferndale Nursing Home" />
        </div>
        <div className="byfield">
          <label className="bylabel" htmlFor="byem">Where to send the licences</label>
          <input id="byem" type="email" value={email} onChange={e => setEmail(e.target.value)}
                 placeholder="manager@yourhome.co.uk" />
        </div>

        <div className="bytotal"><span>Total</span><b>{gbp(total)}</b></div>
        {/* The theme's panel has no error state, because its form does nothing. This one takes
            a payment, so it needs one: the existing `note` styling, in the warning colour. */}
        {error && (
          <p className="note" role="alert" style={{ color: 'var(--accent-2)', fontWeight: 600 }}>
            {error}
          </p>
        )}
        <button className="bybtn" type="submit" disabled={busy}>
          {busy ? 'Starting secure checkout…' : 'Continue to payment'}
        </button>
        <p className="bysecure">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
          Card payment handled by Stripe. We never see your card details.
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card sm:p-8">
      {/* Licences */}
      <label className="mb-2 block text-sm font-bold text-neutral-dark">Number of licences</label>
      <p className="mb-3 text-xs text-neutral-mid">One licence = one staff member, for the <strong>{moduleName}</strong> module.</p>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center rounded-xl border border-gray-200">
          <button type="button" onClick={() => setQ(qty - 1)} className="flex h-11 w-11 items-center justify-center rounded-l-xl text-neutral-mid hover:bg-gray-50" aria-label="Fewer licences"><Minus size={16} /></button>
          <input
            type="number" min={1} max={500} value={qty}
            onChange={(e) => setQ(parseInt(e.target.value || '1', 10))}
            className="h-11 w-16 border-x border-gray-200 text-center text-lg font-bold text-neutral-dark focus:outline-none"
          />
          <button type="button" onClick={() => setQ(qty + 1)} className="flex h-11 w-11 items-center justify-center rounded-r-xl text-neutral-mid hover:bg-gray-50" aria-label="More licences"><Plus size={16} /></button>
        </div>
        <span className="text-sm text-neutral-mid">{gbp(unitPence)} each</span>
      </div>

      {/* Buyer details */}
      <div className="mb-5 grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-neutral-dark">Organisation name</label>
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Bright Smiles Dental"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-neutral-dark">Your email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@yourservice.co.uk"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal focus:outline-none" />
          <p className="mt-1 text-xs text-neutral-mid">We&apos;ll set up your account and email you a sign-in link after payment.</p>
        </div>
      </div>

      {/* Total + submit */}
      <div className="mb-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm font-semibold text-neutral-mid">Total</span>
        <span className="text-2xl font-extrabold text-neutral-dark">{gbp(total)}</span>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-btn bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:opacity-60">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Starting secure checkout…</> : <>Continue to payment</>}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-mid">
        <ShieldCheck size={13} className="text-teal" /> Secure one-off payment via Stripe. No subscription.
      </p>
    </form>
  )
}
