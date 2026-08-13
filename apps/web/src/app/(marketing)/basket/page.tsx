'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingCart, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react'
import { useCart, trackBasketEvent } from '@/lib/cart-store'
import { gbp, DISCOUNT_TIERS, discountPctForQty, TRAINING_ACCREDITED } from '@/lib/training-commerce'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function BasketPage() {
  const { items, totalQty, gross, discount, pct, net, cart } = useCart()
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nextTier = DISCOUNT_TIERS.slice().reverse().find((t) => totalQty < t.min)
  const currentPct = discountPctForQty(totalQty)

  async function checkout() {
    setError('')
    if (!org.trim()) { setError('Please enter your organisation name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return }
    setBusy(true)
    items.forEach((i) => trackBasketEvent('checkout', i.slug, i.qty))
    try {
      const res = await fetch(`${API_URL}/public/training/checkout-basket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ module_slug: i.slug, quantity: i.qty })), email: email.trim(), org_name: org.trim() }),
      })
      const body = await res.json()
      if (!res.ok || !body?.data?.url) throw new Error(body?.error ?? 'Checkout is being finalised for launch. You can buy each course from its own page for now.')
      window.location.href = body.data.url
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <ShoppingCart size={40} className="mx-auto text-neutral-mid" />
        <h1 className="mt-4 text-2xl font-extrabold text-neutral-dark">Your basket is empty</h1>
        <p className="mt-2 text-neutral-mid">Browse the training library and add the courses your team needs.</p>
        <Link href="/staff-training" className="mt-6 inline-flex items-center gap-2 rounded-btn bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">Browse training</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/staff-training" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline"><ArrowLeft size={15} /> Continue browsing</Link>
      <h1 className="mb-8 text-3xl font-extrabold text-neutral-dark">Your basket</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.slug} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold text-neutral-dark">{i.title}</h3>
                <p className="text-sm text-neutral-mid">{gbp(i.unitPence)} per licence</p>
              </div>
              <div className="flex items-center rounded-xl border border-gray-200">
                <button onClick={() => cart.setQty(i.slug, i.qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-l-xl text-neutral-mid hover:bg-gray-50" aria-label="Fewer"><Minus size={15} /></button>
                <input value={i.qty} onChange={(e) => cart.setQty(i.slug, parseInt(e.target.value || '1', 10))} className="h-9 w-12 border-x border-gray-200 text-center text-sm font-bold focus:outline-none" />
                <button onClick={() => cart.setQty(i.slug, i.qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-r-xl text-neutral-mid hover:bg-gray-50" aria-label="More"><Plus size={15} /></button>
              </div>
              <div className="w-20 text-right font-bold text-neutral-dark">{gbp(i.qty * i.unitPence)}</div>
              <button onClick={() => cart.remove(i.slug)} className="text-neutral-mid hover:text-red-500" aria-label="Remove"><Trash2 size={17} /></button>
            </div>
          ))}

          {/* Volume discount ladder */}
          <div className="rounded-2xl border border-gray-100 bg-teal-light/40 p-5">
            <p className="mb-3 text-sm font-bold text-neutral-dark">Team volume discounts (applied to total licences)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DISCOUNT_TIERS.slice().reverse().map((t) => (
                <div key={t.min} className={`rounded-xl border p-3 text-center ${currentPct === t.pct ? 'border-teal bg-white' : 'border-gray-200'}`}>
                  <div className="text-lg font-extrabold text-teal">{t.pct}% off</div>
                  <div className="text-xs text-neutral-mid">{t.min}+ licences</div>
                </div>
              ))}
            </div>
            {nextTier && (
              <p className="mt-3 text-sm text-neutral-mid">Add <strong className="text-neutral-dark">{nextTier.min - totalQty}</strong> more licence{nextTier.min - totalQty === 1 ? '' : 's'} to unlock <strong className="text-teal">{nextTier.pct}% off</strong>.</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="h-fit rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-extrabold text-neutral-dark">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-neutral-mid">{totalQty} licence{totalQty === 1 ? '' : 's'}</span><span className="font-semibold">{gbp(gross)}</span></div>
            {discount > 0 && <div className="flex justify-between text-teal"><span>Volume discount ({pct}%)</span><span className="font-semibold">-{gbp(discount)}</span></div>}
            <div className="flex justify-between border-t border-gray-100 pt-3 text-base"><span className="font-bold">Total</span><span className="text-xl font-extrabold text-neutral-dark">{gbp(net)}</span></div>
          </div>

          <div className="mt-5 grid gap-3">
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organisation name" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal focus:outline-none" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal focus:outline-none" />
          </div>
          {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
          <button onClick={checkout} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Starting checkout…</> : <>Proceed to secure checkout</>}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-mid"><ShieldCheck size={13} className="text-teal" /> One-off payment via Stripe. We email a sign-in link to access your courses.</p>
          {!TRAINING_ACCREDITED && <p className="mt-2 text-center text-[11px] text-neutral-mid">CPD accreditation pending — badges appear once approved.</p>}
        </div>
      </div>
    </div>
  )
}
