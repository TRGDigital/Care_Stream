'use client'

import { useState } from 'react'
import { Minus, Plus, Loader2, ShieldCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

export function BuyForm({ slug, moduleName, unitPence }: { slug: string; moduleName: string; unitPence: number }) {
  const [qty, setQty]     = useState(1)
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
