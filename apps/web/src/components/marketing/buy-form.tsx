'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Loader2, ShieldCheck } from 'lucide-react'
import { fi, fiAttribution } from '@/lib/funnel-insights'
import { offerLock } from '@/lib/offer-lock'
import { useRemembered } from '@/lib/remembered'
import { PaymentLogos } from './payment-logos'
import { AddonOption, InvoiceRequest, ADDONS, useSaveBasket } from './shop-upsells'
import { useOffers, licenceDeal, money2, paidForTotal, offerEmoji } from '@/lib/offers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

// Two skins, one checkout. The rebuilt theme styles this panel with its own `by*` classes; the
// logic, the validation and the call to /public/training/checkout are shared, so the two cannot
// drift apart the way a second copy of the form would.
export function BuyForm({ slug, moduleName, unitPence, variant = 'default', initialQty, onProgress, termsBelow = false }: {
  slug: string; moduleName: string; unitPence: number; variant?: 'default' | 'theme'
  /** Licences to start at when opened in the course page's buy drawer (rather than ?qty=). */
  initialQty?: number
  /** For the drawer's progress bar: details complete, terms agreed. */
  onProgress?: (p: { details: boolean; agreed: boolean }) => void
  /** The drawer states the terms beneath the form instead of a tick box. */
  termsBelow?: boolean
}) {
  // The theme's form opens at eight licences, a typical team, not one.
  // Always start at one licence; the buyer steps it up if they need more.
  const [qty, setQty]     = useState(initialQty && initialQty >= 1 ? Math.min(500, Math.floor(initialQty)) : 1)
  // "Buy now" on a course page arrives with ?qty=1 so the licence count starts at what was asked
  // for. Read after mount: useSearchParams would need a Suspense boundary on this static page.
  // Reaching this page is the second stage of a course's funnel (after its course page).
  useEffect(() => { fi('buy_page', { funnel: 'training', option: slug, label: moduleName }) }, [slug, moduleName])

  useEffect(() => {
    if (initialQty) return
    const q = Number(new URLSearchParams(window.location.search).get('qty'))
    if (Number.isFinite(q) && q >= 1) setQty(Math.min(500, Math.floor(q)))
  }, [])
  const [email, setEmail] = useRemembered('email')
  const [org, setOrg]     = useRemembered('org')
  useSaveBasket({ funnel: 'training', email, org, items: [{ slug, qty }] })
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')
  // The same required agreement as the basket checkouts (checkout-page.tsx): this form takes a
  // payment too, and was the one route to Stripe that never showed the terms.
  const [agreed, setAgreed] = useState(termsBelow)
  useEffect(() => {
    onProgress?.({ details: !!org.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()), agreed })
  }, [org, email, agreed, onProgress])

  // A live offer from the calendar: free licences on top, or a percentage off each licence.
  // The API works out the same at checkout.
  const offers = useOffers()
  const deal = licenceDeal(offers, slug, qty)
  const free = deal.free
  const each = deal.pct ? Math.round(unitPence * (1 - deal.pct / 100)) : unitPence
  const effective = free ? Math.floor((each * qty) / (qty + free)) : each
  const [teamSetup, setTeamSetup] = useState(false)
  const total = qty * each + (teamSetup ? ADDONS['team-setup'].pence : 0)
  const applied = !!deal.offer && (free > 0 || deal.pct > 0)
  const setQ = (n: number) => setQty(Math.max(1, Math.min(500, n)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !agreed) return
    setError('')
    if (!org.trim()) { setError('Please enter your organisation name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    fi('checkout_start', { funnel: 'training', option: slug, label: moduleName, qty })
    try {
      const res = await fetch(`${API_URL}/public/training/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ module_slug: slug, quantity: qty, email: email.trim(), org_name: org.trim(), attribution: fiAttribution(), lock: offerLock(), return_path: location.pathname, addons: teamSetup ? ['team-setup'] : [] }),
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
        {/* With an offer the price per staff member is the offer price (2 for 1: half), the full
            price struck through, and the count is the licences received, so "2 for 1" reads at a
            glance: 2 licences, £12.99 each, Offer applied. `qty` stays the PAID count. */}
        <div className="byprice">
          {effective < unitPence && <s className="bywas">{gbp(unitPence)}</s>}
          <b>{gbp(effective)}</b><span>per staff member, one-off payment</span>
          {applied && <em className="byapplied">Offer applied</em>}
        </div>

        <label className="bylabel" htmlFor="byq">{applied && free > 0 ? 'Licences you receive' : 'Number of licences'}</label>
        <div className="byqty">
          <div className="bystep">
            <button type="button" onClick={() => setQ(qty - 1)} aria-label="Fewer licences">−</button>
            <input id="byq" type="number" min={1} max={1000} value={qty + free}
                   onChange={e => setQ(paidForTotal(offers, slug, parseInt(e.target.value || '1', 10)))} />
            <button type="button" onClick={() => setQ(qty + 1)} aria-label="More licences">+</button>
          </div>
          {/* Inline, as the theme has it, rather than a class of my own invention. */}
          <span style={{ fontSize: '.86rem', color: 'var(--muted)' }}>
            {free > 0 ? <><b style={{ color: 'var(--ink)' }}>{qty} paid + {free} free</b></> : <>{gbp(each)} each</>}
          </span>
        </div>
        {applied && (
          <div className="byfree">
            <span className="byfree-emoji" aria-hidden="true">{offerEmoji(deal.offer)}</span>
            <div className="byfree-tx">
              <span className="byfree-lb">{deal.offer!.label ?? 'Offer'} applied</span>
              <b>{free > 0 ? `You receive ${qty + free} licences for ${gbp(qty * each)}` : `${deal.pct}% off every licence`}</b>
              <span>Just {money2(effective)} per staff member</span>
            </div>
          </div>
        )}

        <div className="byfield">
          <label className="bylabel" htmlFor="byorg">Your service</label>
          <input id="byorg" type="text" value={org} onChange={e => setOrg(e.target.value)}
                 placeholder="Ferndale Nursing Home" />
        </div>
        <div className="byfield">
          <label className="bylabel" htmlFor="byem">Where to send the licences</label>
          <input id="byem" type="email" value={email} onChange={e => setEmail(e.target.value)}
                 placeholder="manager@yourhome.co.uk" />
          <small className="bynote-save">If you get interrupted, we will email you a link back to your order.</small>
        </div>

        <div className="byaddon"><AddonOption k="team-setup" checked={teamSetup} onChange={setTeamSetup} /></div>
        <div className="bytotal"><span>Total</span><b>{gbp(total)}</b></div>
        {/* The theme's panel has no error state, because its form does nothing. This one takes
            a payment, so it needs one: the existing `note` styling, in the warning colour. */}
        {error && (
          <p className="note" role="alert" style={{ color: 'var(--accent-2)', fontWeight: 600 }}>
            {error}
          </p>
        )}
        {!termsBelow && <label className="byterms">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />
          <span>
            By continuing, I agree to CareStream&apos;s <Link href="/terms" target="_blank">Terms and Conditions</Link>
            {' '}and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>}
        <button className="bybtn offerbtn" type="submit" disabled={busy || !agreed}>
          {busy ? 'Starting secure checkout…' : 'Checkout securely'}
        </button>
        <PaymentLogos className="bypaylogos" />
        <ul className="byreassure">
          <li>Instant access: your team can start today</li>
          <li>A certificate for every staff member</li>
          <li>14-day refund on any licence not yet started</li>
        </ul>
        <InvoiceRequest funnel="training" items={[`${qty + free} × ${moduleName} licences${free ? ` (${qty} paid + ${free} free)` : ''}${teamSetup ? ' + team set-up' : ''}`]} />
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

      <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-neutral-mid">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required
          className="mt-0.5 h-4 w-4 shrink-0 accent-teal" />
        <span>
          By continuing, I agree to CareStream&apos;s <Link href="/terms" target="_blank" className="font-semibold text-neutral-dark underline">Terms and Conditions</Link>
          {' '}and acknowledge the <Link href="/privacy" target="_blank" className="font-semibold text-neutral-dark underline">Privacy Policy</Link>.
        </span>
      </label>

      <button type="submit" disabled={busy || !agreed}
        className="flex w-full items-center justify-center gap-2 rounded-btn bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700 disabled:opacity-60">
        {busy ? <><Loader2 size={16} className="animate-spin" /> Starting secure checkout…</> : <>Continue to payment</>}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-mid">
        <ShieldCheck size={13} className="text-teal" /> Secure one-off payment via Stripe. No subscription.
      </p>
    </form>
  )
}
