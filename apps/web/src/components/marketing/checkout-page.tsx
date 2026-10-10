'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useCart, trackBasketEvent } from '@/lib/cart-store'
import { useSavedCourses } from '@/lib/saved-courses'
import { UNIT_PENCE, DISCOUNT_TIERS, discountPctForQty } from '@/lib/training-commerce'
import { useOffers, offersNow, licenceDeal, policyDeal } from '@/lib/offers'
import { bundleOf, bundleQuote, type BundleKey } from '@/lib/bundle-rules'
import { LicenceOfferCard, PolicyOfferCard } from './licence-offer'
import { usePolicyBasket, type BasketItem } from './policy-basket'
import { PaymentLogos } from './payment-logos'
import { ExitQuestion } from './shop-questions'
import { AddonOption, ShareBasket, InvoiceRequest, ADDONS, useSaveBasket } from './shop-upsells'
import './checkout-page.css'
import { fi, fiAttribution } from '@/lib/funnel-insights'
import { offerLock } from '@/lib/offer-lock'
import { licenceLinePence, shareTotal } from '@/lib/basket-value'
import { reportMicro } from '@/lib/google-ads'
import { useRemembered } from '@/lib/remembered'
import { SHIP_NOW, sn, withVat } from '@/lib/ship-now'

// The checkout design approved in the content theme, for both shops: /basket (training
// licences) and /care-policies/checkout (written policies). They are separate pages because they
// are separate orders: the two go to different fulfilment queues and are never paid for together.
//
// This page is the step BEFORE payment. Payment is Stripe's hosted page, so no card details are
// ever collected here, and every price is re-read from the catalogue server-side: what this page
// shows is a preview of the order, not what is charged.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const money = (p: number) =>
  `£${p % 100 === 0 ? (p / 100).toLocaleString('en-GB')
    : (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const Back = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)
const Lock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
)
const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.7L16 9.5" />
  </svg>
)

function Steps() {
  const names = ['Basket', 'Your details', 'Secure payment', 'Confirmation']
  return (
    <ol className="cksteps" aria-label="Checkout steps">
      {names.map((n, i) => (
        <li className={i <= 1 ? 'on' : ''} key={n}><span className="n">{i + 1}</span>{n}</li>
      ))}
    </ol>
  )
}

/** Organisation, name and email. Shared, because both orders need the same three. */
function Details({ orgLabel, orgPlaceholder, emailNote, org, setOrg, name, setName, email, setEmail, emailOnly = false }: {
  orgLabel: string; orgPlaceholder: string; emailNote: string
  org: string; setOrg: (v: string) => void
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
  /** The cart drawer asks for the email only: Stripe takes the name and billing details, and the
   *  policy questions after payment take the company details. */
  emailOnly?: boolean
}) {
  return (
    <div className="ckpanel">
      <div className="ckpanel-hd"><h2>{emailOnly ? 'Your email' : 'Your details'}</h2><span>For the receipt and your account</span></div>
      <form className="ckform" onSubmit={e => e.preventDefault()}>
        {!emailOnly && <>
        <div className="ckfield">
          <label htmlFor="ckorg">{orgLabel}</label>
          <input id="ckorg" required autoComplete="organization" placeholder={orgPlaceholder}
                 value={org} onChange={e => setOrg(e.target.value)} />
        </div>
        <div className="ckfield">
          <label htmlFor="ckname">Your full name</label>
          <input id="ckname" required autoComplete="name" placeholder="Sam Taylor"
                 value={name} onChange={e => setName(e.target.value)} />
        </div>
        </>}
        <div className="ckfield full">
          <label htmlFor="ckemail">Work email</label>
          <input id="ckemail" type="email" required autoComplete="email" placeholder="name@yourcarehome.co.uk"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <small>{emailNote} If you get interrupted, we will email you a link back to your basket.</small>
        </div>
      </form>
    </div>
  )
}

function Summary({ lines, total, sub, assurances, ready, busy, error, onPay, extras, invoice, termsBelow = false, was, fix, vat = false }: {
  lines: ReactNode; total: number; sub: string
  /** The total before the offer, shown struck through beside the total when the offer saved them money. */
  was?: number
  /** "Save yourself time": the add-on and the send-to-manager link, above the total. */
  extras?: ReactNode
  invoice: { funnel: 'training' | 'policies'; items: string[] }
  assurances: [string, string][]
  ready: boolean; busy: boolean; error: string
  /** A field shown under the error, so a missing detail can be filled in without leaving the summary. */
  fix?: ReactNode
  onPay: (agreed: boolean) => void
  /** In the cart drawer the terms are stated at its foot, with no tick box. */
  termsBelow?: boolean
  /** Ship now (lib/ship-now.ts): the total ex VAT, the VAT and the total inc VAT (training basket). */
  vat?: boolean
}) {
  const [agreed, setAgreed] = useState(termsBelow)
  const showVat = SHIP_NOW && vat
  return (
    <aside className="cksum">
      <div className="ckpanel"><div className="in">
        <h2>Order summary</h2>
        <div className="cklines">{lines}</div>
        {extras && <div className="su-sumextras"><b>Save yourself time</b>{extras}</div>}
        {showVat ? (
          // Stripe adds VAT at payment from the billing address; this is the UK 20%.
          <div {...sn('vat-total', 'Total ex VAT, VAT, inc VAT')}>
            <div className="cktotal"><span>Total ex VAT</span><b>{was && was > total ? <s className="ckwastotal">{money(was)}</s> : null}{money(total)}</b></div>
            <div className="sn-lines">
              <div><span>VAT (20%)</span><span>{money(withVat(total).vat)}</span></div>
              <div className="inc"><span>Total inc VAT</span><span>{money(withVat(total).inc)}</span></div>
            </div>
          </div>
        ) : (
          <div className="cktotal"><span>Total</span><b>{was && was > total ? <s className="ckwastotal">{money(was)}</s> : null}{money(total)}</b></div>
        )}
        <p className="cksub">{sub}</p>
        {!termsBelow && <label className="ckterms">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            By continuing, I agree to CareStream&apos;s <Link href="/terms" target="_blank">Terms and Conditions</Link>
            {' '}and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>}
        <button className="ckpay" type="button" id="ckpay" data-fi-copy="pay_button" disabled={!ready || !agreed || busy}
                onClick={() => onPay(agreed)}>
          <Lock />{busy ? 'Starting secure checkout…' : 'Checkout securely'}
        </button>
        {SHIP_NOW && <p className="sn-stripe" {...sn('stripe-line', 'Stripe line')}><Lock />Secure payment by Stripe. We never see or store your card details.</p>}
        {error && <p className="ckerr" role="alert">{error}</p>}
        {error && fix}
        <PaymentLogos className="ckpaylogos" />
        {!SHIP_NOW && <p className="cksecure"><Lock />Payment is taken on Stripe&apos;s secure page. We never see your card details.</p>}
        {/* Care groups often cannot pay by card: the invoice and purchase order route, in plain view. */}
        <InvoiceRequest funnel={invoice.funnel} items={invoice.items} />
        <ul className="ckassure">
          {assurances.map(([t, d]) => <li key={t}><Tick /><span><b>{t}</b>{d}</span></li>)}
        </ul>
      </div></div>
    </aside>
  )
}

/** "Back to <the product they were on>", or the catalogue when there is none this visit. */
function BackLink({ fallback }: { fallback: [string, string] }) {
  const [to, setTo] = useState<[string, string]>(fallback)
  useEffect(() => {
    try {
      const key = fallback[0].startsWith('/staff-training') ? 'cs_last_course' : 'cs_last_policy'
      const last = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (last?.path && last?.title) setTo([last.path, `Back to ${last.title}`])
    } catch { /* none */ }
  }, [fallback[0]]) // eslint-disable-line react-hooks/exhaustive-deps
  return <Link className="ckback" href={to[0]}><Back />{to[1]}</Link>
}

function Shell({ back, title, lede, children, summary, total, empty, compact = false }: {
  back: [string, string]; title: string; lede: string
  children: ReactNode; summary: ReactNode; total: number
  empty: ReactNode | null
  /** Inside a cart drawer: one column, no page heading, steps or mobile pay bar. */
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="ckpage ckcompact">
        {empty ?? (
          <div className="ckgrid">
            <div className="ckcol">{children}</div>
            {summary}
          </div>
        )}
      </div>
    )
  }
  return (
    <main className="ckpage">
      <div className="ckwrap">
        <BackLink fallback={back} />
        <div className="ckhead">
          <div><h1>{title}</h1><p>{lede}</p></div>
          <Steps />
        </div>
        {empty ?? (
          <div className="ckgrid">
            <div className="ckcol">{children}</div>
            {summary}
          </div>
        )}
      </div>
      {!empty && (
        <div className="ckmbar">
          {SHIP_NOW && back[0].startsWith('/staff-training')
            ? <div {...sn('vat', 'VAT')}><span>Total + VAT</span><b>{money(total)}</b><span className="sn-mvat">{money(withVat(total).inc)} inc VAT</span></div>
            : <div><span>Total</span><b>{money(total)}</b></div>}
          <button type="button" onClick={() => document.getElementById('ckpay')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Checkout securely
          </button>
        </div>
      )}
    </main>
  )
}

function Empty({ title, text, href, cta, extra }: { title: string; text: string; href: string; cta: string; extra?: ReactNode }) {
  return (
    <div className="ckcol">
      <div className="ckpanel"><div className="ckempty">
        <b>{title}</b><p>{text}</p><Link href={href}>{cta}</Link>
      </div></div>
      {extra}
    </div>
  )
}

/** A failed request reads "Failed to fetch" in the browser, which tells a buyer nothing. */
function payError(e: unknown) {
  if (e instanceof TypeError) return 'We could not reach the secure payment page. Please check your connection and try again.'
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.'
}

/** The field for a missing organisation or name, shown under the error in the order summary. */
function FixField({ error, org, setOrg, name, setName, email, setEmail, orgLabel = 'Organisation name' }: {
  error: string; org: string; setOrg: (v: string) => void; name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void; orgLabel?: string
}) {
  const f = error === ORG_MISSING ? { label: orgLabel, value: org, set: setOrg, auto: 'organization', type: 'text' }
    : error === NAME_MISSING ? { label: 'Your full name', value: name, set: setName, auto: 'name', type: 'text' }
    : error === EMAIL_MISSING ? { label: 'Work email', value: email, set: setEmail, auto: 'email', type: 'email' }
    : null
  if (!f) return null
  return (
    <label className="ckfix">
      <span>{f.label}</span>
      <input autoFocus type={f.type} value={f.value} autoComplete={f.auto} onChange={e => f.set(e.target.value)} />
    </label>
  )
}
const ORG_MISSING = 'Please enter your organisation name.'
const NAME_MISSING = 'Please enter your full name.'
const EMAIL_MISSING = 'Please enter a valid work email address.'

/** Validates the details form; returns the message to show, or '' when it can go ahead. */
function detailsError(org: string, name: string, email: string, emailOnly = false, orgOptional = false) {
  if (!emailOnly && !orgOptional && !org.trim()) return 'Please enter your organisation name.'
  if (!emailOnly && !name.trim()) return 'Please enter your full name.'
  if (!EMAIL.test(email.trim())) return 'Please enter a valid work email address.'
  return ''
}

// ── Training ──────────────────────────────────────────────────────────────────

export interface ModuleInfo { image: string | null; minutes: number | null; title?: string }

export function TrainingCheckout({ modules }: { modules: Record<string, ModuleInfo> }) {
  const { items, bundles, totalQty, gross, discount, pct, net, cart } = useCart()
  const { items: saved, savedCourses } = useSavedCourses()
  const [org, setOrg] = useRemembered('org')
  const [name, setName] = useRemembered('name')
  const [email, setEmail] = useRemembered('email')
  useSaveBasket({ funnel: 'training', email, name, org, items: items.map(i => ({ slug: i.slug, qty: i.qty })) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [teamSetup, setTeamSetup] = useState(false)
  // Reaching checkout counts against each course in the basket, not the checkout page.
  useEffect(() => {
    setMounted(true)
    // A basket sent for approval arrives as ?items=slug:qty,…: rebuild it, then tidy the URL.
    const shared = new URLSearchParams(window.location.search).get('items')
    if (shared) {
      for (const part of shared.split(',').slice(0, 25)) {
        const [slug, q] = part.split(':')
        if (!/^[a-z0-9-]{2,80}$/.test(slug || '') || cart.snapshot().some(i => i.slug === slug)) continue
        cart.add({ slug, title: modules[slug]?.title ?? slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), unitPence: UNIT_PENCE, qty: Math.max(1, Math.min(500, parseInt(q || '1', 10) || 1)) })
      }
      window.history.replaceState(null, '', window.location.pathname)
    }
    const lines = cart.snapshot()
    const singles = lines.filter(i => !i.slug.startsWith('bundle:')).reduce((n, i) => n + i.qty, 0)
    const values = lines.map(i => licenceLinePence(offersNow(), i.slug, i.qty, singles, i.unitPence))
    lines.forEach((i, k) => fi('basket_view', { funnel: 'training', option: i.slug, label: i.title, qty: i.qty, value_pence: values[k] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tiers = [...DISCOUNT_TIERS].sort((a, b) => a.min - b.min)
  const next = tiers.find(t => totalQty < t.min)
  const prev = [...tiers].reverse().find(t => totalQty >= t.min)
  const from = prev?.min ?? 0
  const barPct = next ? Math.min(100, ((totalQty - from) / (next.min - from)) * 100) : 100
  const current = discountPctForQty(totalQty)
  // A live offer per course: free licences, or a percentage off that replaces the volume tier
  // when it is bigger. The API prices the order the same way at payment.
  const offers = useOffers()
  const deals = Object.fromEntries(items.map(i => [i.slug, licenceDeal(offers, i.slug, i.qty)]))
  const freeQty = items.reduce((n, i) => n + deals[i.slug].free, 0)
  const offerSaving = items.reduce((n, i) => {
    const d = deals[i.slug]
    if (d.pct <= pct) return n
    return n + i.qty * (Math.round(i.unitPence * (1 - pct / 100)) - Math.round(i.unitPence * (1 - d.pct / 100)))
  }, 0)
  const offerLabel = items.map(i => deals[i.slug].offer?.label).find(Boolean) ?? 'Offer'
  // CPD course bundles (lib/bundle-rules.ts): each priced best price wins, nothing stacks on them.
  const bundleRows = bundles.map(i => {
    const b = bundleOf(i.slug)
    return b ? { slug: i.slug, b, n: i.qty, q: bundleQuote(offers, b.key as BundleKey, i.qty, UNIT_PENCE) } : null
  }).filter((r): r is NonNullable<typeof r> => !!r)
  const bundleTotal = bundleRows.reduce((t, r) => t + r.q.total, 0)
  const any = items.length + bundleRows.length > 0
  const payNow = net - offerSaving + bundleTotal + (teamSetup && any ? ADDONS['team-setup'].pence : 0)

  async function pay() {
    // Training: no organisation needed, someone can buy a course for themselves.
    const problem = detailsError(org, name, email, false, true)
    if (problem) { setError(problem); return }
    setError(''); setBusy(true)
    items.forEach(i => trackBasketEvent('checkout', i.slug, i.qty))
    // value_pence: the total shown (payNow) split across the lines by what each costs, so the
    // lines add up to it to the penny (lib/basket-value.ts).
    const values = shareTotal(payNow, [...items.map(i => licenceLinePence(offers, i.slug, i.qty, totalQty, i.unitPence)), ...bundleRows.map(r => r.q.total)])
    items.forEach((i, k) => fi('checkout_start', { funnel: 'training', option: i.slug, label: i.title, qty: i.qty, value_pence: values[k] }))
    bundleRows.forEach((r, k) => fi('checkout_start', { funnel: 'training', option: r.slug, label: r.b.name, qty: r.n, value_pence: values[items.length + k] }))
    reportMicro('begin_checkout', 'training-basket')
    try {
      const res = await fetch(`${API_URL}/public/training/checkout-basket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribution: fiAttribution(), lock: offerLock(), return_path: location.pathname,
          items: [...items.map(i => ({ module_slug: i.slug, quantity: i.qty })), ...bundleRows.map(r => ({ module_slug: r.slug, quantity: r.n }))],
          addons: teamSetup ? ['team-setup'] : [],
          email: email.trim(), org_name: org.trim(), name: name.trim(),
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.data?.url) throw new Error(body?.error?.message ?? body?.error ?? 'Could not start checkout. Please try again.')
      window.location.href = body.data.url
    } catch (e: unknown) {
      setError(payError(e))
      setBusy(false)
    }
  }

  // Courses saved while browsing sit below the basket: moving one more across is often what
  // tips an order into the next discount tier.
  const savedPanel = saved.length > 0 && (
    <div className="ckpanel cksaved">
      <div className="ckpanel-hd"><h2>Saved for later</h2><span>{saved.length} {saved.length === 1 ? 'course' : 'courses'}</span></div>
      <ul className="ckitems">
        {saved.map(s => {
          const inBasket = items.some(i => i.slug === s.slug)
          const img = modules[s.slug]?.image
          return (
            <li className="ckitem" key={s.slug}>
              <span className="ckthumb">{img && <img src={img} alt="" />}</span>
              <div className="ckinfo">
                <Link href={`/staff-training/${s.slug}`}>{s.title}</Link>
                <div className="meta">{money(UNIT_PENCE)} per licence</div>
                <div className="acts"><button type="button" onClick={() => savedCourses.remove(s.slug)}>Remove</button></div>
              </div>
              <div className="ckright">
                {inBasket ? <span className="ckprice">In basket</span> : (
                  <button type="button" onClick={() => { cart.add({ slug: s.slug, title: s.title, unitPence: UNIT_PENCE }); savedCourses.remove(s.slug) }}>
                    Move to basket
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )

  if (!mounted) return <main className="ckpage" aria-busy="true" />

  const empty = !any
    ? <Empty title="Your basket is empty" text="Browse the training library and add the courses your team needs."
             href="/staff-training" cta="Browse training" extra={savedPanel} />
    : null

  return (
    <>
    <ExitQuestion funnel="training" />
    <Shell
      back={['/staff-training', 'Continue browsing training']}
      title="Your basket"
      lede="Training licences for your team. Allocate each one to a staff member once payment completes."
      total={payNow}
      empty={empty}
      summary={
        <Summary
          lines={<>
            {bundleRows.map(r => (
              <div className="ckline-item" key={r.slug}>
                <span>{r.b.name} · {r.n} {r.n === 1 ? 'learner' : 'learners'}</span>
                <b>{r.q.listTotal > r.q.total && <s className="ckwas">{money(r.q.listTotal)}</s>} {money(r.q.total)}</b>
              </div>
            ))}
            {/* Each course and its licences; the free ones are counted in and shown in the offer line. */}
            {items.map(i => (
              <div className="ckline-item" key={i.slug}>
                <span>{modules[i.slug]?.title ?? i.title} · {i.qty + deals[i.slug].free} {i.qty + deals[i.slug].free === 1 ? 'licence' : 'licences'}</span>
                <b>{deals[i.slug].free > 0 && <s className="ckwas">{money((i.qty + deals[i.slug].free) * UNIT_PENCE)}</s>} {money(i.qty * UNIT_PENCE)}</b>
              </div>
            ))}
            {discount > 0 && <div className="save"><span>Volume discount ({pct}%)</span><b>−{money(discount)}</b></div>}
            {offerSaving > 0 && <div className="save"><span>{offerLabel}</span><b>−{money(offerSaving)}</b></div>}
            {freeQty > 0 && <div className="save"><span>{offerLabel}: {freeQty} free {freeQty === 1 ? 'licence' : 'licences'}</span><b>Free</b></div>}
            {teamSetup && <div><span>Team set-up, done for you</span><b>{money(ADDONS['team-setup'].pence)}</b></div>}
          </>}
          total={payNow}
          was={(() => { const full = items.reduce((n, i) => n + (i.qty + deals[i.slug].free) * UNIT_PENCE, 0) + bundleRows.reduce((n, r) => n + r.q.listTotal, 0) + (teamSetup ? ADDONS['team-setup'].pence : 0); return full > payNow ? full : undefined })()}
          extras={any ? <>
            <AddonOption k="team-setup" checked={teamSetup} onChange={setTeamSetup} />
            <ShareBasket funnel="training" items={items.map(i => ({ slug: i.slug, qty: i.qty }))} />
          </> : null}
          invoice={{ funnel: 'training', items: [...bundleRows.map(r => `${r.n} × ${r.b.name} (${r.b.slugs.length} CPD courses per learner)`), ...items.map(i => `${i.qty} × ${i.title}`), ...(teamSetup ? [ADDONS['team-setup'].title] : [])] }}
          sub="One-off payment. No subscription."
          vat
          assurances={[
            ['Fourteen day refund', 'If a licence has not been started, tell us within fourteen days and we refund it in full.'],
            ['Instant access', 'Courses are ready to allocate as soon as payment completes, with a sign-in link by email.'],
            ['Licences stay with your team', 'Assign each licence to a staff member from your dashboard. A receipt comes with every order.'],
          ]}
          ready={any}
          busy={busy}
          error={error}
          fix={<FixField error={error} org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} />}
          onPay={pay}
        />
      }
    >
      <div className="ckpanel">
        <div className="ckpanel-hd"><h2>In your basket</h2><span>{items.length + bundleRows.length} {items.length + bundleRows.length === 1 ? 'item' : 'items'}</span></div>
        <ul className="ckitems">
          {bundleRows.map(r => (
            <li className="ckitem" key={r.slug}>
              <span className="ckthumb">{modules[r.b.slugs[1]]?.image && <img src={modules[r.b.slugs[1]]!.image!} alt="" />}</span>
              <div className="ckinfo">
                <Link href="/staff-training/cpd-courses?intent=bundles">{r.b.name}</Link>
                <div className="meta">{money(r.b.pence)} per learner · {r.b.slugs.length} CPD Certified courses each</div>
                {SHIP_NOW && (
                  <div className="sn-each" {...sn('per-learner-total', 'Per learner and total')}>
                    {r.n} {r.n === 1 ? 'learner' : 'learners'}: <b>{money(r.q.perLearner)}</b> per learner, <b>{money(r.q.total)}</b> total + VAT
                  </div>
                )}
                <ul className="ckreassure">
                  <li><Tick />A licence for every course, for every learner</li><li><Tick />You always get the best price</li>
                </ul>
                {r.q.winner === 'singles' && <div className="ckfree">The live offer beats the bundle price for {r.n} learners, so you pay {money(r.q.total)}</div>}
                <div className="acts"><button type="button" onClick={() => cart.remove(r.slug)}>Remove</button></div>
              </div>
              <div className="ckright">
                <div className="ckqty">
                  <button type="button" aria-label="Fewer learners" onClick={() => (r.n <= 1 ? cart.remove(r.slug) : cart.setQty(r.slug, r.n - 1))}>−</button>
                  <input type="number" min={1} value={r.n} aria-label={`Learners for ${r.b.name}`}
                         onChange={e => cart.setQty(r.slug, parseInt(e.target.value || '1', 10))} />
                  <button type="button" aria-label="More learners" onClick={() => cart.setQty(r.slug, r.n + 1)}>+</button>
                </div>
                <span className="ckprice">{money(r.q.total)}</span>
              </div>
            </li>
          ))}
          {items.map(i => {
            const info = modules[i.slug]
            return (
              <li className="ckitem" key={i.slug}>
                <span className="ckthumb">{info?.image && <img src={info.image} alt="" />}</span>
                <div className="ckinfo">
                  <Link href={`/staff-training/${i.slug}`}>{i.title}</Link>
                  <div className="meta">
                    {money(i.unitPence)} per licence{info?.minutes ? ` · ${info.minutes} minutes` : ''}
                  </div>
                  <ul className="ckreassure">
                    <li><Tick />Instant access</li><li><Tick />A certificate for every learner</li><li><Tick />14-day refund if unstarted</li>
                  </ul>
                  {deals[i.slug].free > 0 && (
                    <div className="ckfree">
                      + {deals[i.slug].free} free with the {deals[i.slug].offer?.label ?? 'offer'}: {i.qty + deals[i.slug].free} licences in total
                    </div>
                  )}
                  {deals[i.slug].pct > pct && (
                    <div className="ckfree">{deals[i.slug].offer?.label}: {deals[i.slug].pct}% off every licence</div>
                  )}
                  {SHIP_NOW && (() => {
                    // What each learner and the line cost after the team discount or the offer,
                    // the same sums the order summary and checkout use.
                    const d = deals[i.slug]
                    const unit = Math.round(i.unitPence * (1 - Math.max(pct, d.pct) / 100))
                    const n = i.qty + d.free
                    return (
                      <div className="sn-each" {...sn('per-learner-total', 'Per learner and total')}>
                        {n} {n === 1 ? 'licence' : 'licences'}: <b>{money(Math.floor((unit * i.qty) / n))}</b> per learner, <b>{money(unit * i.qty)}</b> total + VAT
                      </div>
                    )
                  })()}
                  <div className="acts">
                    <button type="button" onClick={() => { savedCourses.add({ slug: i.slug, title: i.title }); cart.remove(i.slug) }}>Save for later</button>
                    <button type="button" onClick={() => cart.remove(i.slug)}>Remove</button>
                  </div>
                </div>
                <div className="ckright">
                  <div className="ckqty">
                    <button type="button" aria-label="Fewer licences" onClick={() => cart.setQty(i.slug, i.qty - 1)}>−</button>
                    <input type="number" min={1} value={i.qty} aria-label={`Licences for ${i.title}`}
                           onChange={e => cart.setQty(i.slug, parseInt(e.target.value || '1', 10))} />
                    <button type="button" aria-label="More licences" onClick={() => cart.setQty(i.slug, i.qty + 1)}>+</button>
                  </div>
                  <span className="ckprice">{money(i.qty * i.unitPence)}</span>
                </div>
                {deals[i.slug].offer && <div className="ckoffer"><LicenceOfferCard slug={i.slug} compact /></div>}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="ckpanel">
        <div className="ckpanel-hd"><h2>Team volume discount</h2><span>Applied to your total licences</span></div>
        <div className="ckladder">
          <p>
            {next
              ? <>Add {next.min - totalQty} more {next.min - totalQty === 1 ? 'licence' : 'licences'} to unlock <b>{next.pct}% off</b>.</>
              : <>You have the highest team discount: <b>{current}% off</b>.</>}
          </p>
          <div className="cktiers">
            {tiers.map(t => (
              <div className={`cktier${current === t.pct ? ' on' : ''}`} key={t.min}>
                <b>{t.pct}% off</b><span>{t.min}+ licences</span>
              </div>
            ))}
          </div>
          <div className="ckbar"><i style={{ width: `${barPct}%` }} /></div>
        </div>
      </div>

      <div className="ckupsell">
        <div>
          <b>Training every member of staff?</b>
          <p>Annual training is included on CareStream plans, alongside policies, audits and CQC preparation.</p>
        </div>
        <Link href="/pricing">Compare plans</Link>
      </div>

      <Details orgLabel="Organisation name (optional)" orgPlaceholder="Leave blank if it is just for you"
               emailNote="We send the receipt and your sign-in link here."
               org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} />

      {savedPanel}
    </Shell>
    </>
  )
}

// ── Policies ──────────────────────────────────────────────────────────────────

interface Pack { key: string; title: string; price_pence: number; contains: string[] }

const BUNDLE = 'bundle:'
const policyImage = (slug: string) => `/images/care-policies/${slug}/1.webp`

export function PolicyCheckout({ compact = false, onProgress }: {
  /** In the policy page's cart drawer (policy-drawer.tsx). */
  compact?: boolean
  onProgress?: (p: { details: boolean; agreed: boolean }) => void
} = {}) {
  const { items, add, remove, saveForLater, switchToPack } = usePolicyBasket()
  const [org, setOrg] = useRemembered('org')
  const [name, setName] = useRemembered('name')
  const [email, setEmail] = useRemembered('email')
  useSaveBasket({ funnel: 'policies', email, name, org, items: items.map(i => i.slug) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [priority, setPriority] = useState(false)
  useEffect(() => {
    onProgress?.({ details: !detailsError(org, name, email, compact), agreed: true })
  }, [org, name, email, onProgress])
  // A basket sent for approval arrives as ?items=slug,bundle:key,…: rebuild it from the shop's prices.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('items')
    if (!shared) return
    const want = shared.split(',').filter(k => /^(bundle:)?[a-z0-9-]{2,80}$/.test(k)).slice(0, 30)
    fetch(`${API_URL}/public/policy-shop/catalogue`).then(r => r.json()).then(b => {
      const products = (b?.data?.products ?? []) as { slug: string; title: string; price_pence: number }[]
      const bundles = (b?.data?.bundles ?? []) as { key: string; title: string; price_pence: number }[]
      for (const k of want) {
        const row = k.startsWith(BUNDLE)
          ? bundles.find(x => `${BUNDLE}${x.key}` === k) && { slug: k, title: bundles.find(x => `${BUNDLE}${x.key}` === k)!.title, price_pence: bundles.find(x => `${BUNDLE}${x.key}` === k)!.price_pence }
          : products.find(x => x.slug === k)
        if (row) add({ slug: row.slug, title: row.title, price_pence: row.price_pence })
      }
      window.history.replaceState(null, '', window.location.pathname)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [packs, setPacks] = useState<Record<string, Pack[]>>({})
  // The policies that go with each one in the basket (shared laws), for the picker.
  const [complements, setComplements] = useState<Record<string, { slug: string; title: string }[]>>({})
  useEffect(() => setMounted(true), [])
  // Reaching checkout counts against each policy or pack in it, once the basket has loaded.
  const viewed = useRef(false)
  useEffect(() => {
    if (!mounted || viewed.current || items.length === 0) return
    viewed.current = true
    // total and deal are worked out below; this runs after the render that set them.
    const values = shareTotal(total, deal.pence)
    items.forEach((i, k) => fi('basket_view', { funnel: 'policies', option: i.slug, label: i.title, qty: 1, value_pence: values[k] }))
  }, [mounted, items])

  const policies = items.filter(i => !i.slug.startsWith(BUNDLE))
  const gross = items.reduce((n, i) => n + (i.price_pence || 0), 0)
  // A live policy offer from the calendar (2 for 1, a gift policy, % off, a pack bonus). The API
  // prices the basket with the same rules at payment.
  const offers = useOffers()
  const packMembers: Record<string, string[]> = {}
  for (const p of policies) for (const b of packs[p.slug] ?? []) (packMembers[b.key] ??= []).push(p.slug)
  const rows = items.map(i => (i.slug.startsWith(BUNDLE)
    ? { kind: 'bundle' as const, key: i.slug.slice(BUNDLE.length), pence: i.price_pence || 0 }
    : { kind: 'policy' as const, key: i.slug, pence: i.price_pence || 0 }))
  const deal = policyDeal(offers, rows, packMembers)
  const free = new Set([...deal.free].map(n => items[n].slug))
  const priceOf = (slug: string) => deal.pence[items.findIndex(i => i.slug === slug)] ?? 0
  const offerValue = items.reduce((n, i, k) => n + (i.price_pence || 0) - deal.pence[k], 0)
  const total = gross - offerValue + (priority && items.length ? ADDONS['priority-policy'].pence : 0)
  const policyOfferLive = offers.some(o => o.range === 'policies' || o.range === 'both')
  // A gift policy the offer adds: shown as its own free line, priced from the shop.
  const [gift, setGift] = useState<{ slug: string; title: string; price_pence: number } | null>(null)
  useEffect(() => {
    if (!deal.gift) { setGift(null); return }
    if (gift?.slug === deal.gift) return
    let live = true
    fetch(`${API_URL}/public/policy-shop/products/${deal.gift}`).then(r => r.json()).then(b => {
      const p = b?.data?.product ?? b?.data
      if (live && p?.title) setGift({ slug: deal.gift!, title: p.title, price_pence: p.price_pence || 0 })
    }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.gift])
  // Once the offer has given something, the offer box says what (in place of its rules): which
  // policies are free and the saving, and for a 2 for 1, that the next pair earns another free one.
  const freeTitles = [...items.filter(i => free.has(i.slug)).map(i => i.title), ...(gift ? [gift.title] : [])]
  const appliedSaving = offerValue + (gift?.price_pence ?? 0)
  const andList = (a: string[]) => (a.length < 2 ? a[0] ?? '' : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
  const appliedOffer = {
    headline: appliedSaving > 0 ? `You save ${money(appliedSaving)}` : undefined,
    note: freeTitles.length
      ? `Your ${andList(freeTitles)} ${freeTitles.length > 1 ? 'are' : 'is'} free with the ${deal.offer?.label ?? 'offer'}.`
        + (deal.offer?.kind === 'group_free'
          ? (policies.length % 2 ? ' Add one more policy and another one is free.' : ' Add two more policies and one of them is free too.')
          : '')
      : undefined,
  }
  // An unpaired policy under a 2 for 1: one more would be free.
  const groupOffer = deal.offer?.kind === 'group_free' || offers.some(o => o.kind === 'group_free' && (o.range === 'policies' || o.range === 'both'))
  const group = Math.max(2, Number(offers.find(o => o.kind === 'group_free')?.params?.group) || 2)
  const unpaired = groupOffer && policies.length % group !== 0

  // Which packs each policy in the basket belongs to, read from the shop per policy, so the
  // offer to switch is only ever made for a pack that really contains everything in the basket.
  const slugKey = policies.map(p => p.slug).sort().join(',')
  useEffect(() => {
    const missing = policies.map(p => p.slug).filter(s => !(s in packs))
    if (!missing.length) return
    let live = true
    Promise.all(missing.map(async slug => {
      try {
        const res = await fetch(`${API_URL}/public/policy-shop/products/${slug}`)
        const body = await res.json()
        const bundles = (body?.data?.bundles ?? []) as { key: string; title: string; price_pence: number }[]
        const goesWith = (body?.data?.complements ?? []) as { slug: string; title: string }[]
        if (live) setComplements(c => ({ ...c, [slug]: goesWith }))
        return [slug, bundles.map(b => ({ ...b, contains: [] }))] as const
      } catch {
        return [slug, []] as const
      }
    })).then(rows => { if (live) setPacks(p => ({ ...p, ...Object.fromEntries(rows) })) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugKey])

  const offer = useMemo(() => {
    if (policies.length < 2 || !policies.every(p => p.slug in packs)) return null
    const [first, ...rest] = policies.map(p => packs[p.slug])
    const common = first.filter(b => b.key !== 'complete-library' && rest.every(r => r.some(x => x.key === b.key)))
    if (!common.length) return null
    return [...common].sort((a, b) => a.price_pence - b.price_pence)[0]
  }, [policies, packs])

  async function pay() {
    const problem = detailsError(org, name, email, compact)
    if (problem) { setError(problem); return }
    setError(''); setBusy(true)
    const values = shareTotal(total, deal.pence)
    items.forEach((i, k) => fi('checkout_start', { funnel: 'policies', option: i.slug, label: i.title, qty: 1, value_pence: values[k] }))
    reportMicro('begin_checkout', 'policy-basket')
    try {
      const res = await fetch(`${API_URL}/public/policy-shop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribution: fiAttribution(), lock: offerLock(), return_path: location.pathname,
          addons: priority ? ['priority-policy'] : [],
          email: email.trim(), org_name: org.trim(), name: name.trim(),
          items: items.map(i => i.slug.startsWith(BUNDLE)
            ? { kind: 'bundle', key: i.slug.slice(BUNDLE.length) }
            : { kind: 'policy', key: i.slug }),
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.data?.url) throw new Error(body?.error?.message ?? body?.error ?? 'Could not start checkout. Please try again.')
      window.location.href = body.data.url
    } catch (e: unknown) {
      setError(payError(e))
      setBusy(false)
    }
  }

  if (!mounted) return <main className="ckpage" aria-busy="true" />

  const count = items.length
  const noun = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`
  const label = policies.length === count ? `${count} ${count === 1 ? 'policy' : 'policies'}` : noun(count)

  return (
    <>
    {!compact && <ExitQuestion funnel="policies" />}
    <Shell
      compact={compact}
      back={['/care-policies', 'Continue browsing policies']}
      title="Your policy basket"
      lede="Each policy is written for your service, read by a person and delivered as a branded, print-ready document."
      total={total}
      empty={count === 0
        ? <Empty title="Your policy basket is empty" text="Browse the catalogue and add the policies your service needs."
                 href="/care-policies" cta="Browse policies" />
        : null}
      summary={
        <Summary
          lines={<>
            {/* What they are buying, one line each, the free one marked free. */}
            {items.map(i => (
              <div className="ckline-item" key={i.slug}>
                <span>{i.title}</span>
                <b>{free.has(i.slug)
                  ? <><s className="ckwas">{money(i.price_pence)}</s> <span className="ckfreetag">Free</span></>
                  : priceOf(i.slug) < (i.price_pence || 0)
                    ? <><s className="ckwas">{money(i.price_pence)}</s> {money(priceOf(i.slug))}</>
                    : money(i.price_pence)}</b>
              </div>
            ))}
            {offerValue > 0 && <div className="save"><span>{deal.offer?.label ?? 'Offer'}{free.size ? `: ${free.size} free ${free.size === 1 ? 'policy' : 'policies'}` : ''}</span><b>−{money(offerValue)}</b></div>}
            {gift && <div className="save"><span>{deal.offer?.label ?? 'Offer'}: {gift.title} added free</span><b>Free</b></div>}
            {priority && <div><span>Priority delivery within 24 hours</span><b>{money(ADDONS['priority-policy'].pence)}</b></div>}
            <div><span>First year of updates</span><b>Included</b></div>
          </>}
          total={total}
          was={offerValue > 0 ? total + offerValue : undefined}
          extras={items.length ? <>
            <AddonOption k="priority-policy" checked={priority} onChange={setPriority} />
            <ShareBasket funnel="policies" items={items.map(i => i.slug)} />
          </> : null}
          invoice={{ funnel: 'policies', items: [...items.map(i => i.title), ...(priority ? [ADDONS['priority-policy'].title] : [])] }}
          sub="One-off. £12 a year per policy after the first year, cancel anytime."
          assurances={[
            ['Fourteen day refund', 'If a policy is not right for your service, tell us within fourteen days and we refund it in full.'],
            ['A person reads it', 'Every policy is read and approved by a human before it carries your name.'],
            ['Delivered within 2 working days', 'Of you completing the short questions for each policy.'],
          ]}
          ready={count > 0}
          busy={busy}
          error={error}
          fix={<FixField error={error} org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} />}
          onPay={pay}
          termsBelow={compact}
        />
      }
    >
      <div className="ckpanel">
        <div className="ckpanel-hd"><h2>In your basket</h2><span>{label}</span></div>
        <ul className="ckitems">
          {items.map((i: BasketItem) => {
            const pack = i.slug.startsWith(BUNDLE)
            return (
              <li className="ckitem" key={i.slug}>
                <span className="ckthumb">
                  <img src={pack ? '/images/care-policies/1.webp' : policyImage(i.slug)} alt="" />
                </span>
                <div className="ckinfo">
                  {pack ? <b>{i.title}</b> : <Link href={`/care-policies/${i.slug}`}>{i.title}</Link>}
                  <div className="meta">
                    {pack ? 'Every policy in the pack, personalised to your service'
                          : 'Personalised to your service · delivered within 2 working days'}
                  </div>
                  <ul className="ckreassure">
                    <li><Tick />Read and approved by a person</li><li><Tick />Delivered in 2 working days</li><li><Tick />14-day refund</li>
                  </ul>
                  {free.has(i.slug) && <div className="ckfree">Free with the {deal.offer?.label ?? 'offer'}</div>}
                  <div className="acts">
                    {!pack && <button type="button" onClick={() => saveForLater(i)}>Save for later</button>}
                    <button type="button" onClick={() => remove(i.slug)}>Remove</button>
                  </div>
                </div>
                <div className="ckright">
                  {free.has(i.slug)
                    ? <span className="ckprice"><s className="ckwas">{money(i.price_pence)}</s> <span className="ckfreetag">Free</span></span>
                    : priceOf(i.slug) < (i.price_pence || 0)
                      ? <span className="ckprice"><s className="ckwas">{money(i.price_pence)}</s> {money(priceOf(i.slug))}</span>
                      : <span className="ckprice">{money(i.price_pence)}</span>}
                </div>
              </li>
            )
          })}
          {gift && (
            <li className="ckitem" key={`gift:${gift.slug}`}>
              <span className="ckthumb"><img src={policyImage(gift.slug)} alt="" /></span>
              <div className="ckinfo">
                <Link href={`/care-policies/${gift.slug}`}>{gift.title}</Link>
                <div className="meta">Personalised to your service · delivered within 2 working days</div>
                <div className="ckfree">Added free with the {deal.offer?.label ?? 'offer'}</div>
              </div>
              <div className="ckright"><span className="ckprice"><s className="ckwas">{money(gift.price_pence)}</s> <span className="ckfreetag">Free</span></span></div>
            </li>
          )}
        </ul>
        {policies.length > 0 && (
          <div className="ckoffer ckoffer-pad">
            <AddAnotherPolicy basket={items} offers={offers} rows={rows} packMembers={packMembers} onAdd={add} unpaired={unpaired}
                              goesWith={policies.flatMap(p => (complements[p.slug] ?? []).map(c => c.slug))}
                              goesWithTitle={policies[0]?.title} />
          </div>
        )}
        {policyOfferLive && policies.length > 0 && (
          <div className="ckoffer ckoffer-pad">
            <PolicyOfferCard compact applied={offerValue > 0 || !!gift} appliedHeadline={appliedOffer.headline} appliedNote={appliedOffer.note} />
          </div>
        )}
      </div>

      {offer && (
        <div className="ckupsell">
          <div>
            <b>{policies.length === 2 ? 'Both are' : `All ${policies.length} are`} in the {offer.title}</b>
            <p>One price of {money(offer.price_pence)} for the whole pack, personalised and kept up to date.</p>
          </div>
          <button type="button" onClick={() => switchToPack(
            { slug: `${BUNDLE}${offer.key}`, title: offer.title, price_pence: offer.price_pence },
            policies.map(p => p.slug),
          )}>
            Switch to the pack
          </button>
        </div>
      )}

      <Details orgLabel="Registered company name" orgPlaceholder="Oakhaven Care Ltd"
               emailNote="We send the receipt and the link to your questions here."
               org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} emailOnly={compact} />

      {!compact && <div className="ckpanel ckafter">
        <div className="ckpanel-hd"><h2>What happens after you pay</h2><span>Once payment is confirmed</span></div>
        <div className="cknext">
          <div><span>01</span><b>Finish the short questions</b><p>About three minutes per policy. Company details you enter once are reused for every policy.</p></div>
          <div><span>02</span><b>We write and check it</b><p>Written for your service and read by a person before it carries your name.</p></div>
          <div><span>03</span><b>Delivered to your account</b><p>Within 2 working days, as a branded, print-ready document on your letterhead.</p></div>
        </div>
      </div>}
    </Shell>
    </>
  )
}

// ── "Add another policy" on the policy basket ────────────────────────────────
// A picker of every policy not yet in the basket. While an offer is running, the ones that would
// come out free (worked out with the same rules checkout uses) are listed first, so choosing the
// free second policy of a 2 for 1 is one step, without leaving the basket.
type CatalogueRow = { slug: string; title: string; price_pence: number }
let catalogueCache: Promise<CatalogueRow[]> | null = null
function loadCatalogue(): Promise<CatalogueRow[]> {
  catalogueCache ??= fetch(`${API_URL}/public/policy-shop/catalogue`).then(r => r.json())
    .then(b => ((b?.data?.products ?? []) as CatalogueRow[]).map(p => ({ slug: p.slug, title: p.title, price_pence: p.price_pence })))
    .catch(() => { catalogueCache = null; return [] })
  return catalogueCache
}

function AddAnotherPolicy({ basket, offers, rows, packMembers, onAdd, unpaired, goesWith = [], goesWithTitle }: {
  basket: BasketItem[]
  /** Policies that go with the ones in the basket (shared laws), listed first. */
  goesWith?: string[]
  goesWithTitle?: string
  offers: Parameters<typeof policyDeal>[0]
  rows: Parameters<typeof policyDeal>[1]
  packMembers: Record<string, string[]>
  onAdd: (item: BasketItem) => void
  unpaired: boolean
}) {
  const [all, setAll] = useState<CatalogueRow[]>([])
  const [pick, setPick] = useState('')
  useEffect(() => { loadCatalogue().then(setAll) }, [])
  const inBasket = new Set(basket.map(b => b.slug))
  const options = all.filter(p => !inBasket.has(p.slug)).sort((a, b) => a.title.localeCompare(b.title))
  const wouldBeFree = (p: CatalogueRow) => {
    const trial = [...rows, { kind: 'policy' as const, key: p.slug, pence: p.price_pence }]
    return policyDeal(offers, trial, packMembers).free.has(trial.length - 1)
  }
  // First the policies that go with what is in the basket, in order, then the free ones, then the rest.
  const firstSlugs = [...new Set(goesWith)].filter(s => !inBasket.has(s))
  const first = firstSlugs.map(s => options.find(p => p.slug === s)).filter((p): p is CatalogueRow => !!p).slice(0, 6)
  const free = options.filter(p => wouldBeFree(p) && !first.includes(p))
  const rest = options.filter(p => !free.includes(p) && !first.includes(p))
  const freeCount = free.length + first.filter(wouldBeFree).length
  if (!options.length) return null
  const chosen = options.find(p => p.slug === pick)
  const money0 = (p: number) => `£${(p / 100).toFixed(p % 100 ? 2 : 0)}`
  return (
    <div className="ckaddpol">
      <label htmlFor="ckaddpol">{freeCount && unpaired ? 'Add your free policy' : 'Add another policy'}</label>
      <div className="ckaddpol-row">
        <select id="ckaddpol" value={pick} onChange={e => setPick(e.target.value)}>
          <option value="">{freeCount && unpaired ? `Choose from ${freeCount} policies you can add free` : 'Choose a policy'}</option>
          {first.length > 0 && (
            <optgroup label={goesWithTitle && basket.length === 1 ? `Goes well with your ${goesWithTitle}` : 'Goes well with your basket'}>
              {first.map(p => <option key={p.slug} value={p.slug}>{p.title}: {wouldBeFree(p) ? `free (normally ${money0(p.price_pence)})` : money0(p.price_pence)}</option>)}
            </optgroup>
          )}
          {free.length > 0 && (
            <optgroup label="Free with your offer">
              {free.map(p => <option key={p.slug} value={p.slug}>{p.title}: free (normally {money0(p.price_pence)})</option>)}
            </optgroup>
          )}
          <optgroup label={free.length || first.length ? 'Other policies' : 'All policies'}>
            {rest.map(p => <option key={p.slug} value={p.slug}>{p.title}: {money0(p.price_pence)}</option>)}
          </optgroup>
        </select>
        <button type="button" disabled={!chosen}
                onClick={() => { if (chosen) { onAdd({ slug: chosen.slug, title: chosen.title, price_pence: chosen.price_pence }); setPick('') } }}>
          Add to order
        </button>
      </div>
    </div>
  )
}
