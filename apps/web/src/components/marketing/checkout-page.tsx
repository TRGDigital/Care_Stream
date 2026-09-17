'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useCart, trackBasketEvent } from '@/lib/cart-store'
import { useSavedCourses } from '@/lib/saved-courses'
import { UNIT_PENCE, DISCOUNT_TIERS, discountPctForQty } from '@/lib/training-commerce'
import { usePolicyBasket, type BasketItem } from './policy-basket'
import './checkout-page.css'

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
function Details({ orgLabel, orgPlaceholder, emailNote, org, setOrg, name, setName, email, setEmail }: {
  orgLabel: string; orgPlaceholder: string; emailNote: string
  org: string; setOrg: (v: string) => void
  name: string; setName: (v: string) => void
  email: string; setEmail: (v: string) => void
}) {
  return (
    <div className="ckpanel">
      <div className="ckpanel-hd"><h2>Your details</h2><span>For the receipt and your account</span></div>
      <form className="ckform" onSubmit={e => e.preventDefault()}>
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
        <div className="ckfield full">
          <label htmlFor="ckemail">Work email</label>
          <input id="ckemail" type="email" required autoComplete="email" placeholder="name@yourcarehome.co.uk"
                 value={email} onChange={e => setEmail(e.target.value)} />
          <small>{emailNote}</small>
        </div>
      </form>
    </div>
  )
}

function Summary({ lines, total, sub, assurances, ready, busy, error, onPay }: {
  lines: ReactNode; total: number; sub: string
  assurances: [string, string][]
  ready: boolean; busy: boolean; error: string
  onPay: (agreed: boolean) => void
}) {
  const [agreed, setAgreed] = useState(false)
  return (
    <aside className="cksum">
      <div className="ckpanel"><div className="in">
        <h2>Order summary</h2>
        <div className="cklines">{lines}</div>
        <div className="cktotal"><span>Total</span><b>{money(total)}</b></div>
        <p className="cksub">{sub}</p>
        <label className="ckterms">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            By continuing, I agree to CareStream&apos;s <Link href="/terms" target="_blank">Terms and Conditions</Link>
            {' '}and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>
        <button className="ckpay" type="button" id="ckpay" disabled={!ready || !agreed || busy}
                onClick={() => onPay(agreed)}>
          <Lock />{busy ? 'Starting secure checkout…' : 'Continue to secure payment'}
        </button>
        {error && <p className="ckerr" role="alert">{error}</p>}
        <p className="cksecure"><Lock />Payment is taken on Stripe&apos;s secure page. We never see your card details.</p>
        <ul className="ckassure">
          {assurances.map(([t, d]) => <li key={t}><Tick /><span><b>{t}</b>{d}</span></li>)}
        </ul>
        <p className="ckhelp">Need an invoice or a larger order? <Link href="/contact">Talk to us</Link></p>
      </div></div>
    </aside>
  )
}

function Shell({ back, title, lede, children, summary, total, empty }: {
  back: [string, string]; title: string; lede: string
  children: ReactNode; summary: ReactNode; total: number
  empty: ReactNode | null
}) {
  return (
    <main className="ckpage">
      <div className="ckwrap">
        <Link className="ckback" href={back[0]}><Back />{back[1]}</Link>
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
          <div><span>Total</span><b>{money(total)}</b></div>
          <button type="button" onClick={() => document.getElementById('ckpay')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Checkout
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

/** Validates the details form; returns the message to show, or '' when it can go ahead. */
function detailsError(org: string, name: string, email: string) {
  if (!org.trim()) return 'Please enter your organisation name.'
  if (!name.trim()) return 'Please enter your full name.'
  if (!EMAIL.test(email.trim())) return 'Please enter a valid work email address.'
  return ''
}

// ── Training ──────────────────────────────────────────────────────────────────

export interface ModuleInfo { image: string | null; minutes: number | null }

export function TrainingCheckout({ modules }: { modules: Record<string, ModuleInfo> }) {
  const { items, totalQty, gross, discount, pct, net, cart } = useCart()
  const { items: saved, savedCourses } = useSavedCourses()
  const [org, setOrg] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const tiers = [...DISCOUNT_TIERS].sort((a, b) => a.min - b.min)
  const next = tiers.find(t => totalQty < t.min)
  const prev = [...tiers].reverse().find(t => totalQty >= t.min)
  const from = prev?.min ?? 0
  const barPct = next ? Math.min(100, ((totalQty - from) / (next.min - from)) * 100) : 100
  const current = discountPctForQty(totalQty)

  async function pay() {
    const problem = detailsError(org, name, email)
    if (problem) { setError(problem); return }
    setError(''); setBusy(true)
    items.forEach(i => trackBasketEvent('checkout', i.slug, i.qty))
    try {
      const res = await fetch(`${API_URL}/public/training/checkout-basket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ module_slug: i.slug, quantity: i.qty })),
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

  const empty = items.length === 0
    ? <Empty title="Your basket is empty" text="Browse the training library and add the courses your team needs."
             href="/staff-training" cta="Browse training" extra={savedPanel} />
    : null

  return (
    <Shell
      back={['/staff-training', 'Continue browsing training']}
      title="Your basket"
      lede="Training licences for your team. Allocate each one to a staff member once payment completes."
      total={net}
      empty={empty}
      summary={
        <Summary
          lines={<>
            <div><span>{totalQty} {totalQty === 1 ? 'licence' : 'licences'}</span><b>{money(gross)}</b></div>
            {discount > 0 && <div className="save"><span>Volume discount ({pct}%)</span><b>−{money(discount)}</b></div>}
          </>}
          total={net}
          sub="One-off payment. No subscription."
          assurances={[
            ['Sign-in link by email', 'Courses are ready to allocate as soon as payment completes.'],
            ['Licences stay with your team', 'Assign each licence to a staff member from your dashboard.'],
            ['Invoice for your records', 'A receipt is emailed with every order.'],
          ]}
          ready={items.length > 0}
          busy={busy}
          error={error}
          onPay={pay}
        />
      }
    >
      <div className="ckpanel">
        <div className="ckpanel-hd"><h2>In your basket</h2><span>{items.length} {items.length === 1 ? 'course' : 'courses'}</span></div>
        <ul className="ckitems">
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

      <Details orgLabel="Organisation name" orgPlaceholder="Oakhaven Care Home"
               emailNote="We send the receipt and your sign-in link here."
               org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} />

      {savedPanel}
    </Shell>
  )
}

// ── Policies ──────────────────────────────────────────────────────────────────

interface Pack { key: string; title: string; price_pence: number; contains: string[] }

const BUNDLE = 'bundle:'
const policyImage = (slug: string) => `/images/care-policies/${slug}/1.webp`

export function PolicyCheckout() {
  const { items, remove, saveForLater, switchToPack } = usePolicyBasket()
  const [org, setOrg] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [packs, setPacks] = useState<Record<string, Pack[]>>({})
  useEffect(() => setMounted(true), [])

  const policies = items.filter(i => !i.slug.startsWith(BUNDLE))
  const total = items.reduce((n, i) => n + (i.price_pence || 0), 0)

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
    const problem = detailsError(org, name, email)
    if (problem) { setError(problem); return }
    setError(''); setBusy(true)
    try {
      const res = await fetch(`${API_URL}/public/policy-shop/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    <Shell
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
            <div><span>{label}</span><b>{money(total)}</b></div>
            <div><span>First year of updates</span><b>Included</b></div>
          </>}
          total={total}
          sub="One-off. £12 a year per policy after the first year, cancel anytime."
          assurances={[
            ['Fourteen day refund', 'If a policy is not right for your service, tell us within fourteen days and we refund it in full.'],
            ['A person reads it', 'Every policy is read and approved by a human before it carries your name.'],
            ['Delivered within 2 working days', 'Of you completing the short questions for each policy.'],
          ]}
          ready={count > 0}
          busy={busy}
          error={error}
          onPay={pay}
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
                  <div className="acts">
                    {!pack && <button type="button" onClick={() => saveForLater(i)}>Save for later</button>}
                    <button type="button" onClick={() => remove(i.slug)}>Remove</button>
                  </div>
                </div>
                <div className="ckright"><span className="ckprice">{money(i.price_pence)}</span></div>
              </li>
            )
          })}
        </ul>
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
               org={org} setOrg={setOrg} name={name} setName={setName} email={email} setEmail={setEmail} />

      <div className="ckpanel">
        <div className="ckpanel-hd"><h2>What happens after you pay</h2><span>Once payment is confirmed</span></div>
        <div className="cknext">
          <div><span>01</span><b>Finish the short questions</b><p>About three minutes per policy. Company details you enter once are reused for every policy.</p></div>
          <div><span>02</span><b>We write and check it</b><p>Written for your service and read by a person before it carries your name.</p></div>
          <div><span>03</span><b>Delivered to your account</b><p>Within 2 working days, as a branded, print-ready document on your letterhead.</p></div>
        </div>
      </div>
    </Shell>
  )
}
