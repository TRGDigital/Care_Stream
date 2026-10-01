'use client'

import { useEffect, useState } from 'react'
import { useOffers, licenceDeal } from '@/lib/offers'
import { UNIT_PENCE } from '@/lib/training-commerce'
import { fi, fiAttribution } from '@/lib/funnel-insights'
import './shop-upsells.css'
import './shop-questions.css'

// The shop's extras, beside the checkouts (prices are set by the API; these are for display):
//   AddonOption           a £15 time-saver ticked into the order (team set-up, priority delivery)
//   ShareBasket           email the basket to whoever approves the spend, with a link to buy it
//   PostPurchaseTraining  on the thank-you page: more licences at 30% off for 15 minutes
//   PostPurchasePolicies  on the thank-you page: more policies at 30% off for 15 minutes

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const gbp = (p: number) => `£${(p / 100).toFixed(2)}`
export const POST_PURCHASE_PCT = 30

export const ADDONS = {
  'team-setup': {
    pence: 1500, title: 'We set your team up for you',
    detail: 'Send us your staff list and we invite every member of staff and allocate their licences. Done for you within one working day.',
  },
  'priority-policy': {
    pence: 1500, title: 'Priority delivery: within 24 hours',
    detail: 'Your policies written, checked by a person and delivered within 24 hours of your answers, instead of 2 working days.',
  },
} as const
export type AddonKey = keyof typeof ADDONS

export function AddonOption({ k, checked, onChange }: { k: AddonKey; checked: boolean; onChange: (v: boolean) => void }) {
  const a = ADDONS[k]
  return (
    <label className={`su-addon${checked ? ' on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={e => {
        onChange(e.target.checked)
        if (e.target.checked) fi('add_to_basket', { funnel: k === 'team-setup' ? 'training' : 'policies', option: `addon:${k}`, label: a.title, qty: 1 })
      }} />
      <span>
        <b>{a.title} <em>+{gbp(a.pence)}</em></b>
        <small>{a.detail}</small>
      </span>
    </label>
  )
}

export function ShareBasket({ funnel, items }: { funnel: 'training' | 'policies'; items: unknown[] }) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  if (!items.length) return null
  const send = async () => {
    setState('busy'); setError('')
    try {
      const res = await fetch(`${API_URL}/public/shop/share-basket`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel, items, to_email: to.trim(), from_name: name.trim(), note: note.trim() }),
      })
      const b = await res.json().catch(() => null)
      if (!res.ok) throw new Error(b?.error ?? 'Could not send it. Please try again.')
      setState('sent')
      fi('cta', { funnel, option: 'share_basket', label: 'Sent basket for approval' })
    } catch (e: any) { setError(e?.message ?? 'Could not send it.'); setState('error') }
  }
  return (
    <div className="su-share">
      {!open ? (
        <button type="button" className="su-share-open" onClick={() => setOpen(true)}>
          <b>Need approval first?</b> Send this basket to your manager →
        </button>
      ) : state === 'sent' ? (
        <p className="su-ok">Sent to {to}. They will get the basket, the prices and a button to buy it.</p>
      ) : (
        <div className="su-share-form">
          <b>Send this basket to your manager</b>
          <p>They get the items, the prices, any offer and a button to buy it.</p>
          <input type="email" placeholder="Their email" value={to} onChange={e => setTo(e.target.value)} />
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          <textarea rows={2} placeholder="A note (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
          {error && <p className="su-err">{error}</p>}
          <button type="button" disabled={state === 'busy' || !to.trim() || !name.trim()} onClick={send}>
            {state === 'busy' ? 'Sending…' : 'Send basket'}
          </button>
        </div>
      )}
    </div>
  )
}

function useCountdown(mins: number) {
  const [left, setLeft] = useState(mins * 60)
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  return { left, text: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` }
}

async function startOffer(body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/public/shop/post-purchase`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, attribution: fiAttribution() }),
  })
  const b = await res.json().catch(() => null)
  if (!res.ok || !b?.data?.url) throw new Error(b?.error ?? 'This offer is no longer available.')
  window.location.href = b.data.url
}

export function PostPurchaseTraining({ sessionId, slug, title }: { sessionId: string; slug: string; title: string }) {
  const offers = useOffers()
  const { left, text } = useCountdown(15)
  const [paid, setPaid] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (left <= 0) return null
  const deal = licenceDeal(offers, slug, paid)
  const unit = Math.round(UNIT_PENCE * (1 - POST_PURCHASE_PCT / 100))
  const total = paid + deal.free
  return (
    <div className="su-pp">
      <span className="su-pp-tag">🎃 Your order qualifies · {text} left</span>
      <h3>Add more {title} licences at {POST_PURCHASE_PCT}% off</h3>
      <p>A one-time offer for the next 15 minutes{deal.free ? `, on top of the ${deal.offer?.label ?? 'offer'}` : ''}. Same account, nothing to fill in again.</p>
      <div className="su-pp-row">
        <div className="su-step">
          <button type="button" onClick={() => setPaid(p => Math.max(1, p - 1))} aria-label="Fewer">−</button>
          <span>{total}</span>
          <button type="button" onClick={() => setPaid(p => Math.min(500, p + 1))} aria-label="More">+</button>
        </div>
        <span className="su-pp-price">
          {total} {total === 1 ? 'licence' : 'licences'} for <b>{gbp(unit * paid)}</b>
          <s>{gbp(UNIT_PENCE * paid)}</s>
        </span>
      </div>
      {error && <p className="su-err">{error}</p>}
      <button type="button" className="su-pp-go" disabled={busy}
              onClick={async () => { setBusy(true); setError(''); try { await startOffer({ funnel: 'training', session_id: sessionId, quantity: paid }) } catch (e: any) { setError(e.message); setBusy(false) } }}>
        {busy ? 'Opening secure checkout…' : 'Add to my order'}
      </button>
    </div>
  )
}

type Cat = { slug: string; title: string; price_pence: number }
export function PostPurchasePolicies({ sessionId, bought }: { sessionId: string; bought: string[] }) {
  const { left, text } = useCountdown(15)
  const [all, setAll] = useState<Cat[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch(`${API_URL}/public/policy-shop/catalogue`).then(r => r.json())
      .then(b => setAll(((b?.data?.products ?? []) as Cat[]).filter(p => !bought.includes(p.slug)).sort((a, b2) => a.title.localeCompare(b2.title))))
      .catch(() => {})
  }, [bought])
  if (left <= 0 || !all.length) return null
  const chosen = all.filter(p => picked.includes(p.slug))
  const full = chosen.reduce((t, p) => t + p.price_pence, 0)
  const now = chosen.reduce((t, p) => t + Math.round(p.price_pence * (1 - POST_PURCHASE_PCT / 100)), 0)
  return (
    <div className="su-pp">
      <span className="su-pp-tag">🎃 Your order qualifies · {text} left</span>
      <h3>Add more policies at {POST_PURCHASE_PCT}% off</h3>
      <p>A one-time offer for the next 15 minutes. Written for your service from the answers you have already given us.</p>
      <div className="su-pp-row">
        <select value={choice} onChange={e => setChoice(e.target.value)}>
          <option value="">Choose a policy</option>
          {all.filter(p => !picked.includes(p.slug)).map(p => (
            <option key={p.slug} value={p.slug}>{p.title}: {gbp(Math.round(p.price_pence * (1 - POST_PURCHASE_PCT / 100)))}</option>
          ))}
        </select>
        <button type="button" className="su-add" disabled={!choice || picked.length >= 10}
                onClick={() => { setPicked(p => [...p, choice]); setChoice('') }}>Add</button>
      </div>
      {chosen.length > 0 && (
        <ul className="su-pp-list">
          {chosen.map(p => (
            <li key={p.slug}>{p.title}<button type="button" onClick={() => setPicked(x => x.filter(s => s !== p.slug))} aria-label={`Remove ${p.title}`}>×</button></li>
          ))}
          <li className="su-pp-sum">Total <b>{gbp(now)}</b> <s>{gbp(full)}</s></li>
        </ul>
      )}
      {error && <p className="su-err">{error}</p>}
      <button type="button" className="su-pp-go" disabled={busy || !chosen.length}
              onClick={async () => { setBusy(true); setError(''); try { await startOffer({ funnel: 'policies', session_id: sessionId, items: picked }) } catch (e: any) { setError(e.message); setBusy(false) } }}>
        {busy ? 'Opening secure checkout…' : 'Add to my order'}
      </button>
    </div>
  )
}

// "Need an invoice or purchase order?": an overlay that takes what we need to raise an invoice
// (organisation, contact, billing address, PO number) with the basket attached, and sends it to us.
export function InvoiceRequest({ funnel, items, className = '' }: { funnel: 'training' | 'policies'; items: string[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ org: '', name: '', email: '', phone: '', address: '', po: '', note: '' })
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  const send = async () => {
    setState('busy'); setError('')
    try {
      const res = await fetch(`${API_URL}/public/shop/invoice-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funnel, items, ...f }),
      })
      const b = await res.json().catch(() => null)
      if (!res.ok) throw new Error(b?.error ?? 'Could not send. Please try again.')
      setState('sent'); fi('lead', { funnel, option: 'invoice_request', label: 'Invoice requested' })
    } catch (e: any) { setError(e?.message ?? 'Could not send.'); setState('idle') }
  }
  return (
    <>
      <button type="button" className={`su-invoice ${className}`.trim()} onClick={() => setOpen(true)}>
        <span><b>Need an invoice or purchase order?</b>Pay by bank transfer against an invoice. Request one here.</span>
        <span aria-hidden="true">→</span>
      </button>
      {open && (
        <div className="sq-overlay" role="dialog" aria-modal="true" aria-labelledby="su-inv-t" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="sq-box su-inv">
            <button type="button" className="sq-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sq-logo" src="/logo-color.svg" alt="CareStream" />
            {state === 'sent' ? (
              <>
                <h2 id="su-inv-t">Thank you, your request is with us</h2>
                <p>We will email your invoice to {f.email} within one working day. Your order starts as soon as it is paid.</p>
                <button type="button" className="sq-send" onClick={() => setOpen(false)}>Close</button>
              </>
            ) : (
              <>
                <h2 id="su-inv-t">Request an invoice</h2>
                <p>We will email an invoice for {items.length ? 'the items in your basket' : 'your order'} within one working day. Pay by bank transfer and your order starts as soon as it arrives.</p>
                {items.length > 0 && <ul className="su-inv-items">{items.map(i => <li key={i}>{i}</li>)}</ul>}
                <div className="su-inv-grid">
                  <label>Organisation name *<input value={f.org} onChange={set('org')} /></label>
                  <label>Your name *<input value={f.name} onChange={set('name')} /></label>
                  <label>Email for the invoice *<input type="email" value={f.email} onChange={set('email')} /></label>
                  <label>Phone<input type="tel" value={f.phone} onChange={set('phone')} /></label>
                  <label className="wide">Billing address *<textarea rows={3} value={f.address} onChange={set('address')} /></label>
                  <label>Purchase order number<input value={f.po} onChange={set('po')} placeholder="If you have one" /></label>
                  <label>Anything else<input value={f.note} onChange={set('note')} /></label>
                </div>
                {error && <p className="su-err">{error}</p>}
                <button type="button" className="sq-send" disabled={state === 'busy' || !f.org.trim() || !f.name.trim() || !f.email.trim() || !f.address.trim()} onClick={send}>
                  {state === 'busy' ? 'Sending…' : 'Request my invoice'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** Saves the basket for basket recovery once a valid email is in and typing has paused, and again
 *  whenever the basket changes. Fire and forget: it must never get in the way of buying. */
export function useSaveBasket(b: {
  funnel: 'training' | 'policies'; email: string; name?: string; org?: string
  items: Array<{ slug: string; qty: number }> | string[]
}) {
  const key = JSON.stringify(b.items)
  useEffect(() => {
    const email = b.email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !b.items.length) return
    const t = setTimeout(() => {
      fetch(`${API_URL}/public/shop/basket`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ funnel: b.funnel, email, name: b.name ?? '', org: b.org ?? '', items: b.items,
                               page: location.pathname, attribution: fiAttribution() }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.funnel, b.email, b.name, b.org, key])
}
