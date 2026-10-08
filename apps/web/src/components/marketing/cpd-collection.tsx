'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCart, cart } from '@/lib/cart-store'
import { useOffers, licenceOffer, money2 } from '@/lib/offers'
import { UNIT_PENCE, gbp } from '@/lib/training-commerce'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { fi } from '@/lib/funnel-insights'
import { reportMicro } from '@/lib/google-ads'
import { ExitQuestion } from './shop-questions'
import { CaptureOverlay } from './capture-overlay'
import { QuoteRequest } from './shop-upsells'
import {
  BUNDLES, bundleQuote, intentFor, REFRESHER_SLUGS,
  type BundleKey, type Chip, type CpdCourse,
} from '@/lib/cpd-collection'
import './cpd-collection.css'

// The CPD courses collection page (lib/cpd-collection.ts), layout A (Len, 2026-10-08): hero,
// bundles, then the course grid, with "Your training" (summary, benefits and the team finder)
// in a sticky column. Courses and bundles go in the real training basket ("bundle:<key>" with
// the learners as quantity) and check out together on /basket, priced best price wins.
//
// Each card links to the course's own page (where it can be bought too) with ?from=cpd-courses,
// and logs `collection_click` to Funnel Insights. A sale there is still credited to the ad: Funnel
// Insights attributes by visit, and the Google Ads purchase tag fires on the success page.

type Review = { quote: string; name: string; setting: string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
)
const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /><path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6" />
  </svg>
)

// The offer's emoji, shown wherever the offer is named on this page.
const offerEmoji = (label?: string | null) => (/halloween/i.test(label ?? '') ? '🎃 ' : '')

// ?hl=<keyword>|<keyword>|… (the keyword tool's "Open with keyword highlights" link) marks the ad
// group's keywords in yellow wherever the page copy uses them: the whole keyword, or a run of two
// or more of its words, or one of its distinctive words.
const HL_SKIP = new Set(['for', 'the', 'and', 'with', 'from', 'to', 'of', 'in', 'a', 'an', 'uk', 'care', 'training', 'course', 'courses', 'online', 'staff'])
function hlPattern(raw: string): RegExp | null {
  const kws = raw.split('|').map(k => k.trim().toLowerCase()).filter(Boolean).slice(0, 20)
  const parts = new Set<string>()
  for (const k of kws) {
    const w = k.split(/\s+/)
    for (let n = w.length; n >= 1; n--) for (let i = 0; i + n <= w.length; i++) {
      const run = w.slice(i, i + n)
      if (n === 1 && (HL_SKIP.has(run[0]) || run[0].length < 4)) continue
      if (n > 1 && run.every(x => HL_SKIP.has(x))) continue
      parts.add(run.join(' '))
    }
  }
  if (!parts.size) return null
  const esc = [...parts].sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(${esc.join('|')})\\b`, 'gi')
}
const HlContext = createContext<RegExp | null>(null)
function H({ children }: { children: string }): ReactNode {
  const re = useContext(HlContext)
  if (!re) return children
  const out: ReactNode[] = []
  let last = 0
  for (const m of children.matchAll(re)) {
    if (m.index! > last) out.push(children.slice(last, m.index))
    out.push(<mark key={m.index} className="cc-hl">{m[0]}</mark>)
    last = m.index! + m[0].length
  }
  if (!out.length) return children
  out.push(children.slice(last))
  return <>{out}</>
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

const BENEFITS = [
  'CPD mark on every certificate',
  'Staff learn in 60+ languages',
  'About an hour a course, any phone',
  'Dated certificates ready for CQC',
  'See who has finished, at a glance',
  'Always the best price, offer or bundle',
  'No subscription. Card or invoice',
]

export function CpdCollection({ courses, intentKey, review, hl = '' }: {
  courses: CpdCourse[]; intentKey: string; review: Review | null; hl?: string
}) {
  const hlRe = useMemo(() => (hl && hl !== '1' ? hlPattern(hl) : null), [hl])
  const intent = intentFor(intentKey)
  const offers = useOffers()
  const offer = licenceOffer(offers, 'food-hygiene')
  const { items, bundles, totalQty, net } = useCart()
  const learners: Record<BundleKey, number> = {
    complete: bundles.find(b => b.slug === 'bundle:complete')?.qty ?? 0,
    refresher: bundles.find(b => b.slug === 'bundle:refresher')?.qty ?? 0,
  }
  const [chip, setChip] = useState<Chip>(intent.chip ?? 'all')
  const [sheet, setSheet] = useState(false)
  // The whole right column (Your training and the finder) is sticky. When it is taller than the
  // window it scrolls with the page until its bottom is in view, then sticks (a negative top), so
  // it never needs a scrollbar of its own and nothing slides under anything.
  const asideRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = asideRef.current
    if (!el) return
    const fit = () => { el.style.top = window.innerWidth >= 1024 ? `${Math.min(88, window.innerHeight - el.offsetHeight - 12)}px` : '' }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [])

  const ordered = useMemo(() => {
    const f = intent.feature
    return f ? [...courses].sort((a, b) => Number(b.slug === f) - Number(a.slug === f)) : courses
  }, [courses, intent.feature])
  const shown = ordered.filter(c =>
    chip === 'all' ? true : chip === 'refreshers' ? REFRESHER_SLUGS.includes(c.slug) : chip === 'starters' ? true : c.practical)

  const bundleLines = (Object.keys(learners) as BundleKey[]).filter(k => learners[k] > 0)
    .map(k => ({ k, n: learners[k], q: bundleQuote(offers, k, learners[k]) }))
  const bundleTotal = bundleLines.reduce((t, l) => t + l.q.pence, 0)
  const lineCount = items.length + bundleLines.length
  const grand = bundleTotal + (items.length ? net : 0)

  const setBundle = (k: BundleKey, n: number) => {
    const v = Math.max(0, Math.min(500, n))
    const slug = `bundle:${k}`
    if (v === 0) cart.remove(slug)
    else if (!learners[k]) { cart.add({ slug, title: BUNDLES[k].name, unitPence: BUNDLES[k].pence, qty: v }); reportMicro('add_to_basket', `bundle-${k}`) }
    else cart.setQty(slug, v)
  }
  const captureCourse = courses.find(c => c.slug === (intent.feature ?? 'care-certificate')) ?? courses[0] ?? { slug: 'care-certificate', title: 'Care Certificate', image: null }
  const titleOf = (slug: string, fallback: string) => courses.find(c => c.slug === slug)?.title ?? fallback

  const finder = <Finder offers={offers} onPick={(k, n) => setBundle(k, n)} />

  return (
    <HlContext.Provider value={hlRe}>
    <div className="cpdc">
      {offer && (
        <div className="cc-offerbar">
          {offerEmoji(offer.label) && <span className="cc-emoji" aria-hidden="true">🎃</span>}
          <b>{offer.label}:</b> {offer.headline} <span>Ends {fmtDate(offer.ends_on)}</span>
        </div>
      )}
      <div className="cc-wrap">
        <div className="cc-main">
          <section className="cc-hero">
            <p className="cc-eb"><H>{intent.tag}</H></p>
            <h1><H>{intent.headline}</H></h1>
            <p className="cc-lede"><H>{intent.sub}</H></p>
            <ul className="cc-trust">
              <li><Tick /><H>{'CPD Certified, all 10 courses'}</H></li>
              <li><Tick /><H>{'Every lesson in 60+ languages'}</H></li>
              <li><Tick /><H>{'A certificate for every learner'}</H></li>
              <li><Tick /><H>{'Manager dashboard included'}</H></li>
            </ul>
            <div className="cc-cpdbanner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={64} height={58} />
              <p><b>Every course is CPD Certified</b> by The CPD Certification Service. CareStream is CPD Provider No. 50224, and every certificate shows the CPD mark and CPD hours. <Link href="/cpd-certified">Check our listing</Link></p>
            </div>
          </section>

          <section className="cc-sec">
            <h2 className="cc-h2s">Save with a bundle</h2>
            <div className="cc-bundles" id="bundles">
              {(['complete', 'refresher'] as BundleKey[]).map(k => {
                const b = BUNDLES[k]
                const n = learners[k]
                const q = bundleQuote(offers, k, Math.max(1, n))
                // Most popular: the Annual refresher bundle, unless this version points at the other one.
                const pick = (intent.bundle ?? 'refresher') === k
                return (
                  <div className={`cc-bundle${pick ? ' pick' : ''}`} key={k}>
                    {pick && <span className="cc-flag">Most popular</span>}
                    <p className="cc-who">{b.who}</p>
                    <h3><H>{b.name}</H></h3>
                    <p className="cc-incl"><H>{k === 'complete' ? 'The Care Certificate and all 9 annual refreshers' : 'All 9 annual refreshers, every year'}</H></p>
                    <div className="cc-price"><b>{money2(b.pence)}</b><span>per learner</span><s>{money2(UNIT_PENCE * b.slugs.length)}</s></div>
                    <p className="cc-save">Save {Math.round((1 - b.pence / (UNIT_PENCE * b.slugs.length)) * 100)}% on single courses</p>
                    {n > 0 ? (
                      <>
                        <Stepper label="Learners" value={n} onChange={v => setBundle(k, v)} name={b.name} />
                        <p className="cc-best">
                          {q.winner === 'singles'
                            ? <>Best price: <b>{money2(q.pence)}</b>. The {offer?.label ?? 'offer'} beats the bundle for {n} learners, so you pay that.</>
                            : <>You pay <b>{money2(q.pence)}</b> ({money2(Math.round(q.pence / n))} a learner), the best price for {n} {n === 1 ? 'learner' : 'learners'}.</>}
                        </p>
                        <button type="button" className="cc-remove" onClick={() => setBundle(k, 0)}>Remove bundle</button>
                      </>
                    ) : (
                      <button type="button" className="cc-add" onClick={() => setBundle(k, 1)}><CartIcon /> Add bundle</button>
                    )}
                  </div>
                )
              })}
              <p className="cc-bnote">You always get the best price. If an offer on single courses works out cheaper for your team, that is what you pay.</p>
            </div>
          </section>

          {/* On phones the finder sits here; on desktop it is in the Your training column. */}
          <section className="cc-sec cc-finder-mobile">{finder}</section>

          <section className="cc-sec" id="courses">
            <div className="cc-sechead">
              <h2>Or choose single courses</h2>
              <div className="cc-chips">
                {([['all', 'All 10 courses'], ['refreshers', 'Annual refreshers'], ['starters', 'New starters'], ['practical', 'With a practical checklist']] as [Chip, string][]).map(([k, l]) => (
                  <button type="button" key={k} className={chip === k ? 'on' : ''} onClick={() => setChip(k)}>{l}</button>
                ))}
              </div>
            </div>
            {chip === 'starters' && <p className="cc-chipnote">New carers need the Care Certificate and the nine annual courses: the <a href="#bundles">Complete CPD bundle</a> covers all ten.</p>}
            <div className="cc-grid">
              {shown.map(c => {
                const o = licenceOffer(offers, c.slug)
                const href = `/staff-training/${c.slug}?from=cpd-courses${intentKey ? `&intent_from=${encodeURIComponent(intentKey)}` : ''}`
                const track = () => fi('collection_click', { product: c.slug, page: 'cpd-courses', intent: intentKey || 'default' })
                const inCart = items.find(i => i.slug === c.slug)
                return (
                  <article className={`cc-card${c.slug === intent.feature ? ' feat' : ''}`} key={c.slug}>
                    <Link href={href} className="cc-shot" onClick={track} tabIndex={-1} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.image && <img src={c.image} alt="" loading="lazy" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="cc-cpd" src={CPD_CERTIFIED_LOGO} alt="" width={44} height={40} />
                    </Link>
                    <div className="cc-in">
                      <h3><H>{c.title}</H></h3>
                      <p><H>{c.short}</H></p>
                      <div className="cc-meta">
                        <span>{c.minutes} min</span>
                        <span>{Math.round(c.minutes / 6) / 10} CPD {c.minutes === 60 ? 'hour' : 'hours'}</span>
                        {c.practical && <span>Practical checklist</span>}
                      </div>
                      <div className="cc-foot">
                        <b>{gbp(UNIT_PENCE)}</b>
                        {o && <span className="cc-offer">{offerEmoji(o.label)}{o.label}</span>}
                      </div>
                      {inCart ? (
                        <div className="cc-incart">
                          <Stepper label="Licences" value={inCart.qty} name={c.title}
                                   onChange={v => (v < 1 ? cart.remove(c.slug) : cart.setQty(c.slug, v))} />
                          <button type="button" className="cc-remove" onClick={() => cart.remove(c.slug)}>Remove</button>
                        </div>
                      ) : (
                        <button type="button" className="cc-add" onClick={() => { cart.add({ slug: c.slug, title: c.title, unitPence: UNIT_PENCE }); reportMicro('add_to_basket', c.slug) }}>
                          <CartIcon /> Add to basket
                        </button>
                      )}
                      <Link href={href} className="cc-more" onClick={track}>Course details, lessons and a sample certificate</Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="cc-sec cc-guide" id="guide">
            <h2>Which training do my staff need?</h2>
            <p className="cc-sub">Care workers are expected to refresh their mandatory training every year. Here is how the ten courses fit each role.</p>
            <div className="cc-table">
              <table>
                <thead><tr><th>Role</th><th>Courses</th><th>Best way to buy</th></tr></thead>
                <tbody>
                  <tr><td>New carers</td><td>Care Certificate, then all nine annual courses</td><td><a href="#bundles">Complete CPD bundle</a></td></tr>
                  <tr><td>Carers and support workers</td><td>All nine annual courses, every year</td><td><a href="#bundles">Annual refresher bundle</a></td></tr>
                  <tr><td>Staff who give medicines</td><td>Medication Administration, with the practical checklist</td><td>In both bundles, or on its own</td></tr>
                  <tr><td>Kitchen and food handling</td><td>Food Hygiene</td><td>In both bundles, or on its own</td></tr>
                  <tr><td>Office and admin staff</td><td>GDPR, Health and Safety, Mental Health Awareness</td><td>Single courses</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="cc-sec cc-proof">
            <div className="cc-proofgrid">
              <div className="cc-cpdbox">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={110} height={100} />
                <div>
                  <h3>Certified by The CPD Certification Service</h3>
                  <p>CareStream is CPD Provider No. 50224. Every course here is on our listing, and every certificate shows the CPD mark and CPD hours. <Link href="/cpd-certified">Check the listing</Link></p>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <figure><img src="/cpd-training-hub.jpg" alt="The training hub your staff learn in" loading="lazy" /><figcaption>Staff learn on any phone, in their own language</figcaption></figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <figure><img src="/reporting-training-matrix.jpg" alt="The training matrix managers see" loading="lazy" /><figcaption>You see who has finished, by person and course</figcaption></figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <figure><img src="/cpd-module-complete.jpg" alt="A completed course with its certificate" loading="lazy" /><figcaption>A dated certificate for every learner</figcaption></figure>
            </div>
            {review && (
              <blockquote className="cc-review">
                <p>“{review.quote}”</p>
                <cite>{review.name}, {review.setting}</cite>
              </blockquote>
            )}
          </section>

          <section className="cc-sec cc-faq">
            <h2>Questions</h2>
            {[
              ['Are these qualifications?', 'No. They are short CPD Certified courses, about an hour each, for people working in care. They are not diplomas, NVQs or levels.'],
              ['How do bundles work?', 'A bundle is one price per learner for a set of courses. If a live offer on single courses works out cheaper for your team, you pay the lower price. Offers and team discounts do not stack on a bundle.'],
              ['Is there a subscription?', 'No. You buy one licence per learner per course, or a bundle per learner. Team discounts of up to 40% apply to single courses automatically.'],
              ['How do staff take the courses?', 'On any phone, tablet or computer, in over 60 languages. You allocate licences from your dashboard and see who has finished.'],
              ['Can I pay by invoice?', 'Yes. Ask for an invoice at checkout, or get a quote for a large team or several services.'],
            ].map(([q, a], i) => (
              <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </section>
        </div>

        <aside ref={asideRef} className={`cc-aside${sheet ? ' open' : ''}`} id="summary" aria-label="Your training">
          <div className="cc-sum">
            <div className="cc-sumhead"><h2>Your training</h2><button type="button" className="cc-x" onClick={() => setSheet(false)} aria-label="Close">×</button></div>
            {lineCount === 0 && <p className="cc-empty">Add a bundle or a course to see your price.</p>}
            {bundleLines.map(l => (
              <div className="cc-line" key={l.k}>
                <div><b>{BUNDLES[l.k].name}</b><span>{l.n} {l.n === 1 ? 'learner' : 'learners'}{l.q.winner === 'singles' ? ', offer price applied' : ''}</span></div>
                <div className="cc-amt">{money2(l.q.pence)}{l.q.listPence > l.q.pence && <s>{money2(l.q.listPence)}</s>}</div>
                <button type="button" className="cc-del" aria-label={`Remove ${BUNDLES[l.k].name}`} onClick={() => setBundle(l.k, 0)}>×</button>
              </div>
            ))}
            {items.map(i => (
              <div className="cc-line" key={i.slug}>
                <div><b>{titleOf(i.slug, i.title)}</b><span>{i.qty} {i.qty === 1 ? 'licence' : 'licences'}</span></div>
                <div className="cc-amt">{gbp(i.qty * i.unitPence)}</div>
                <button type="button" className="cc-del" aria-label={`Remove ${titleOf(i.slug, i.title)}`} onClick={() => cart.remove(i.slug)}>×</button>
              </div>
            ))}
            {items.length > 0 && totalQty >= 10 && <div className="cc-line sub"><div><span>Single courses after team discount</span></div><div className="cc-amt">{gbp(net)}</div></div>}
            {lineCount > 0 && <div className="cc-total"><span>Total</span><b>{money2(grand)}</b></div>}
            {lineCount > 0 && <Link className="cc-checkout" href="/basket">Go to checkout</Link>}
            <p className="cc-quote">Training a large team or several homes? <QuoteRequest className="cc-quotebtn" label="Get a quote or pay by invoice"
              items={[...bundleLines.map(l => `${l.n} × ${BUNDLES[l.k].name}`), ...items.map(i => `${i.qty} × ${titleOf(i.slug, i.title)}`)]} /></p>
            <ul className="cc-sumticks">
              {BENEFITS.map(b => <li key={b}><Tick />{b}</li>)}
            </ul>
          </div>
          <div className="cc-finder-desk">{finder}</div>
        </aside>
      </div>

      {/* The same exit question and email capture as the course pages. The capture needs a real
          course for its checklist and offer: the ad group's course, otherwise the Care Certificate. */}
      <ExitQuestion funnel="training" product={intent.feature ?? 'cpd-courses'} />
      <CaptureOverlay funnel="training" product={captureCourse.slug} title={captureCourse.title} image={captureCourse.image} />

      {lineCount > 0 && (
        <button type="button" className="cc-mbar" onClick={() => setSheet(true)}>
          <span>{lineCount} in your training</span><b>{money2(grand)}</b><em>Review</em>
        </button>
      )}
    </div>
    </HlContext.Provider>
  )
}

function Stepper({ label, value, onChange, name }: { label: string; value: number; onChange: (v: number) => void; name: string }) {
  return (
    <div className="cc-step">
      <span>{label}</span>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onChange(value - 1)}>&minus;</button>
      <input inputMode="numeric" aria-label={`${name} ${label.toLowerCase()}`} value={value}
             onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '')) || 0)} />
      <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

const SETTING_PHRASE: Record<string, string> = { 'Care home': ' in a care home', 'Nursing home': ' in a nursing home', 'Home care': ' in home care', 'Supported living': ' in supported living', Other: '' }

function Finder({ offers, onPick }: { offers: ReturnType<typeof useOffers>; onPick: (k: BundleKey, n: number) => void }) {
  const [setting, setSetting] = useState('')
  const [who, setWho] = useState('')
  const [staff, setStaff] = useState(10)
  const [added, setAdded] = useState(false)
  const done = setting && who
  const newOnes = Math.max(1, Math.round(staff * 0.2))
  const recs: { k: BundleKey; n: number }[] = who === 'new' ? [{ k: 'complete', n: staff }]
    : who === 'existing' ? [{ k: 'refresher', n: staff }]
    : who === 'both' ? (staff < 2 ? [{ k: 'complete', n: 1 }] : [{ k: 'complete', n: newOnes }, { k: 'refresher', n: staff - newOnes }]) : []
  const reset = () => setAdded(false)
  return (
    <div className="cc-finder">
      <p className="cc-eb">Build your team’s training</p>
      <h2>Three questions, then your price</h2>
      <fieldset>
        <legend>1. Where do your staff work?</legend>
        <div className="cc-opts">
          {['Care home', 'Nursing home', 'Home care', 'Supported living', 'Other'].map(s => (
            <button type="button" key={s} className={setting === s ? 'on' : ''} onClick={() => { setSetting(s); reset() }}>{s}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Who is the training for?</legend>
        <div className="cc-opts">
          {[['new', 'New starters'], ['existing', 'Existing staff'], ['both', 'Both']].map(([k, l]) => (
            <button type="button" key={k} className={who === k ? 'on' : ''} onClick={() => { setWho(k); reset() }}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>3. How many staff?</legend>
        <Stepper label="Staff" value={staff} name="Team" onChange={v => { setStaff(Math.max(1, Math.min(500, v))); reset() }} />
      </fieldset>
      {done ? (
        <div className="cc-rec">
          <p>For {staff} {staff === 1 ? 'person' : 'people'}{SETTING_PHRASE[setting] ?? ''}{who === 'both' && staff > 1 ? ', assuming about 1 in 5 are new starters' : ''}:</p>
          {recs.map(r => {
            const q = bundleQuote(offers, r.k, r.n)
            return <div key={r.k} className="cc-recline"><span>{BUNDLES[r.k].name} × {r.n}</span><b>{money2(q.pence)}</b></div>
          })}
          <button type="button" className="cc-add" onClick={() => {
            recs.forEach(r => onPick(r.k, r.n)); setAdded(true)
            fi('finder_complete', { page: 'cpd-courses', setting, who, staff })
          }}>
            <CartIcon /> {added ? 'Added to your training' : 'Add to my training'}
          </button>
        </div>
      ) : <p className="cc-finderhint">Answer all three to see what your team needs and what it costs.</p>}
    </div>
  )
}
