'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '@/lib/cart-store'
import { useOffers, licenceOffer, money2 } from '@/lib/offers'
import { UNIT_PENCE, gbp } from '@/lib/training-commerce'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { TrainingAddButton } from './training-cart-buttons'
import {
  BUNDLES, bundleQuote, intentFor, REFRESHER_SLUGS,
  type BundleKey, type Chip, type CpdCourse,
} from '@/lib/cpd-collection'
import './cpd-collection.css'

// The CPD courses collection page (lib/cpd-collection.ts), in three layouts while Len chooses:
//   a  collection: hero, bundles, then the course grid
//   b  finder first: three questions recommend a bundle and quantity, then the grid
//   c  bundles first: the two bundles in the hero, a comparison, single courses lower down
// Single courses go in the real training basket. Bundles are DEMO ONLY until bundle checkout is
// built: they sit in this page's summary and checkout explains that.

type Review = { quote: string; name: string; setting: string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
)

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })

export function CpdCollection({ courses, variant, intentKey, review }: {
  courses: CpdCourse[]; variant: 'a' | 'b' | 'c'; intentKey: string; review: Review | null
}) {
  const intent = intentFor(intentKey)
  const offers = useOffers()
  const offer = licenceOffer(offers, 'food-hygiene')
  const { items, totalQty, net } = useCart()
  const [learners, setLearners] = useState<Record<BundleKey, number>>({ complete: 0, refresher: 0 })
  const [chip, setChip] = useState<Chip>(intent.chip ?? 'all')
  const [sheet, setSheet] = useState(false)

  const ordered = useMemo(() => {
    const f = intent.feature
    return f ? [...courses].sort((a, b) => Number(b.slug === f) - Number(a.slug === f)) : courses
  }, [courses, intent.feature])
  const shown = ordered.filter(c =>
    chip === 'all' ? true : chip === 'refreshers' ? REFRESHER_SLUGS.includes(c.slug) : chip === 'starters' ? true : c.practical)

  const cpdItems = items
  const bundleLines = (Object.keys(learners) as BundleKey[]).filter(k => learners[k] > 0)
    .map(k => ({ k, n: learners[k], q: bundleQuote(offers, k, learners[k]) }))
  const bundleTotal = bundleLines.reduce((t, l) => t + l.q.pence, 0)
  const lineCount = cpdItems.length + bundleLines.length
  const grand = bundleTotal + (cpdItems.length ? net : 0)

  const setBundle = (k: BundleKey, n: number) => setLearners(s => ({ ...s, [k]: Math.max(0, Math.min(500, n)) }))

  const hero = (
    <div className="cc-hero-copy">
      <p className="cc-eb">{intent.tag}</p>
      <h1>{intent.headline}</h1>
      <p className="cc-lede">{intent.sub}</p>
      <ul className="cc-trust">
        <li><Tick />CPD Certified, all 10 courses</li>
        <li><Tick />Every lesson in 60+ languages</li>
        <li><Tick />A certificate for every learner</li>
        <li><Tick />Manager dashboard included</li>
      </ul>
    </div>
  )

  const bundles = (big = false) => (
    <div className={`cc-bundles${big ? ' big' : ''}`} id="bundles">
      {(['complete', 'refresher'] as BundleKey[]).map(k => {
        const b = BUNDLES[k]
        const n = learners[k]
        const q = bundleQuote(offers, k, Math.max(1, n))
        const each = Math.round(q.pence / Math.max(1, n))
        const pick = intent.bundle === k
        return (
          <div className={`cc-bundle${pick ? ' pick' : ''}`} key={k}>
            {pick && <span className="cc-flag">Best for you</span>}
            <p className="cc-who">{b.who}</p>
            <h3>{b.name}</h3>
            <p className="cc-incl">{k === 'complete' ? 'The Care Certificate and all 9 annual refreshers' : 'All 9 annual refreshers, every year'}</p>
            <div className="cc-price"><b>{money2(b.pence)}</b><span>per learner</span><s>{money2(UNIT_PENCE * b.slugs.length)}</s></div>
            <p className="cc-save">Save {Math.round((1 - b.pence / (UNIT_PENCE * b.slugs.length)) * 100)}% on single courses</p>
            <div className="cc-step">
              <span>Learners</span>
              <button type="button" aria-label="Fewer learners" onClick={() => setBundle(k, n - 1)}>&minus;</button>
              <input inputMode="numeric" aria-label={`${b.name} learners`} value={n || ''} placeholder="0"
                     onChange={e => setBundle(k, parseInt(e.target.value.replace(/\D/g, '')) || 0)} />
              <button type="button" aria-label="More learners" onClick={() => setBundle(k, n + 1)}>+</button>
            </div>
            {n > 0 ? (
              <p className="cc-best">
                {q.winner === 'singles'
                  ? <>Best price: <b>{money2(q.pence)}</b>. The {offer?.label ?? 'offer'} beats the bundle for {n} learners, so you pay that.</>
                  : <>You pay <b>{money2(q.pence)}</b> ({money2(each)} a learner), the best price for {n} {n === 1 ? 'learner' : 'learners'}.</>}
              </p>
            ) : (
              <button type="button" className="cc-add" onClick={() => setBundle(k, 1)}>Add bundle</button>
            )}
          </div>
        )
      })}
      <p className="cc-bnote">You always get the best price. If an offer on single courses works out cheaper for your team, that is what you pay.</p>
    </div>
  )

  const grid = (title: string) => (
    <section className="cc-sec" id="courses">
      <div className="cc-sechead">
        <h2>{title}</h2>
        <div className="cc-chips" role="tablist">
          {([['all', 'All 10 courses'], ['refreshers', 'Annual refreshers'], ['starters', 'New starters'], ['practical', 'With a practical checklist']] as [Chip, string][]).map(([k, l]) => (
            <button type="button" key={k} className={chip === k ? 'on' : ''} onClick={() => setChip(k)}>{l}</button>
          ))}
        </div>
      </div>
      {chip === 'starters' && <p className="cc-chipnote">New carers need the Care Certificate and the nine annual courses: the <a href="#bundles">Complete CPD bundle</a> covers all ten.</p>}
      <div className="cc-grid">
        {shown.map(c => {
          const o = licenceOffer(offers, c.slug)
          return (
            <article className={`cc-card${c.slug === intent.feature ? ' feat' : ''}`} key={c.slug}>
              <Link href={`/staff-training/${c.slug}`} className="cc-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image && <img src={c.image} alt="" loading="lazy" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="cc-cpd" src={CPD_CERTIFIED_LOGO} alt="CPD Certified" width={44} height={40} />
              </Link>
              <div className="cc-in">
                <Link href={`/staff-training/${c.slug}`}><h3>{c.title}</h3></Link>
                <p>{c.short}</p>
                <div className="cc-meta">
                  <span>{c.minutes} min</span>
                  <span>{Math.round(c.minutes / 6) / 10} CPD {c.minutes === 60 ? 'hour' : 'hours'}</span>
                  {c.practical && <span>Practical checklist</span>}
                </div>
                <div className="cc-foot">
                  <b>{gbp(UNIT_PENCE)}</b>
                  {o && <span className="cc-offer">{o.label}</span>}
                </div>
                <TrainingAddButton className="cc-cardadd" slug={c.slug} title={c.title} unitPence={UNIT_PENCE} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )

  const guide = (
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
  )

  const proof = (
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
        <figure><img src="/cpd-training-hub.jpg" alt="The training hub your staff learn in" loading="lazy" /><figcaption>Staff learn on any phone, in their own language</figcaption></figure>
        <figure><img src="/reporting-training-matrix.jpg" alt="The training matrix managers see" loading="lazy" /><figcaption>You see who has finished, by person and course</figcaption></figure>
        <figure><img src="/cpd-module-complete.jpg" alt="A completed course with its certificate" loading="lazy" /><figcaption>A dated certificate for every learner</figcaption></figure>
      </div>
      {review && (
        <blockquote className="cc-review">
          <p>“{review.quote}”</p>
          <cite>{review.name}, {review.setting}</cite>
        </blockquote>
      )}
    </section>
  )

  const faq = (
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
  )

  return (
    <div className="cpdc">
      {offer && (
        <div className="cc-offerbar">
          <b>{offer.label}:</b> {offer.headline} <span>Ends {fmtDate(offer.ends_on)}</span>
        </div>
      )}
      <div className="cc-wrap">
        <div className="cc-main">
          {variant === 'a' && (
            <>
              <section className="cc-hero">{hero}</section>
              <section className="cc-sec"><h2 className="cc-h2s">Save with a bundle</h2>{bundles()}</section>
              {grid('Or choose single courses')}
              {guide}
            </>
          )}
          {variant === 'b' && (
            <>
              <section className="cc-hero cc-hero-split">{hero}<Finder offers={offers} onPick={(k, n) => { setBundle(k, n); document.getElementById('summary')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }} /></section>
              <section className="cc-sec"><h2 className="cc-h2s">The two bundles</h2>{bundles()}</section>
              {grid('Or build your own from single courses')}
              {guide}
            </>
          )}
          {variant === 'c' && (
            <>
              <section className="cc-hero cc-hero-c">{hero}{bundles(true)}</section>
              <Compare />
              {guide}
              {grid('Need just one or two courses?')}
            </>
          )}
          {proof}
          {faq}
        </div>

        <aside className={`cc-aside${sheet ? ' open' : ''}`} id="summary" aria-label="Your training">
          <div className="cc-sum">
            <div className="cc-sumhead"><h2>Your training</h2><button type="button" className="cc-x" onClick={() => setSheet(false)} aria-label="Close">×</button></div>
            {lineCount === 0 && <p className="cc-empty">Add a bundle or a course to see your price.</p>}
            {bundleLines.map(l => (
              <div className="cc-line" key={l.k}>
                <div><b>{BUNDLES[l.k].name}</b><span>{l.n} {l.n === 1 ? 'learner' : 'learners'}{l.q.winner === 'singles' ? ', offer price applied' : ''}</span></div>
                <div className="cc-amt">{money2(l.q.pence)}{l.q.listPence > l.q.pence && <s>{money2(l.q.listPence)}</s>}</div>
              </div>
            ))}
            {cpdItems.map(i => (
              <div className="cc-line" key={i.slug}>
                <div><b>{courses.find(c => c.slug === i.slug)?.title ?? i.title}</b><span>{i.qty} {i.qty === 1 ? 'licence' : 'licences'}</span></div>
              </div>
            ))}
            {cpdItems.length > 0 && <div className="cc-line sub"><div><span>Single courses{totalQty >= 10 ? ', team discount applied' : ''}</span></div><div className="cc-amt">{gbp(net)}</div></div>}
            {lineCount > 0 && <div className="cc-total"><span>Total</span><b>{money2(grand)}</b></div>}
            {lineCount > 0 && (bundleLines.length
              ? <p className="cc-demo">Demo: bundle checkout is being built. Single courses already check out from the <Link href="/basket">basket</Link>.</p>
              : <Link className="cc-checkout" href="/basket">Go to checkout</Link>)}
            <ul className="cc-sumticks">
              <li><Tick />You always get the best price</li>
              <li><Tick />No subscription</li>
              <li><Tick />Pay by card or invoice</li>
            </ul>
          </div>
        </aside>
      </div>

      {lineCount > 0 && (
        <button type="button" className="cc-mbar" onClick={() => setSheet(true)}>
          <span>{lineCount} in your training</span><b>{money2(grand)}</b><em>Review</em>
        </button>
      )}
    </div>
  )
}

const SETTING_PHRASE: Record<string, string> = { 'Care home': ' in a care home', 'Nursing home': ' in a nursing home', 'Home care': ' in home care', 'Supported living': ' in supported living', Other: '' }

function Finder({ offers, onPick }: { offers: ReturnType<typeof useOffers>; onPick: (k: BundleKey, n: number) => void }) {
  const [setting, setSetting] = useState('')
  const [who, setWho] = useState('')
  const [staff, setStaff] = useState(10)
  const done = setting && who
  const recs: { k: BundleKey; n: number }[] = who === 'new' ? [{ k: 'complete', n: staff }]
    : who === 'existing' ? [{ k: 'refresher', n: staff }]
    : who === 'both' ? [{ k: 'complete', n: Math.max(1, Math.round(staff * 0.2)) }, { k: 'refresher', n: Math.max(1, staff - Math.round(staff * 0.2)) }] : []
  useEffect(() => { if (staff < 1) setStaff(1) }, [staff])
  return (
    <div className="cc-finder">
      <p className="cc-eb">Build your team’s training</p>
      <h2>Three questions, then your price</h2>
      <fieldset>
        <legend>1. Where do your staff work?</legend>
        <div className="cc-opts">
          {['Care home', 'Nursing home', 'Home care', 'Supported living', 'Other'].map(s => (
            <button type="button" key={s} className={setting === s ? 'on' : ''} onClick={() => setSetting(s)}>{s}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>2. Who is the training for?</legend>
        <div className="cc-opts">
          {[['new', 'New starters'], ['existing', 'Existing staff'], ['both', 'Both']].map(([k, l]) => (
            <button type="button" key={k} className={who === k ? 'on' : ''} onClick={() => setWho(k)}>{l}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>3. How many staff?</legend>
        <div className="cc-step">
          <button type="button" aria-label="Fewer" onClick={() => setStaff(s => Math.max(1, s - 1))}>&minus;</button>
          <input inputMode="numeric" aria-label="Number of staff" value={staff} onChange={e => setStaff(parseInt(e.target.value.replace(/\D/g, '')) || 1)} />
          <button type="button" aria-label="More" onClick={() => setStaff(s => s + 1)}>+</button>
        </div>
      </fieldset>
      {done ? (
        <div className="cc-rec">
          <p>For {staff} {staff === 1 ? 'person' : 'people'} {SETTING_PHRASE[setting] ?? ''}{who === 'both' ? ', assuming about 1 in 5 are new starters' : ''}:</p>
          {recs.map(r => {
            const q = bundleQuote(offers, r.k, r.n)
            return <div key={r.k} className="cc-recline"><span>{BUNDLES[r.k].name} × {r.n}</span><b>{money2(q.pence)}</b></div>
          })}
          <button type="button" className="cc-add" onClick={() => recs.forEach(r => onPick(r.k, r.n))}>Add to my training</button>
        </div>
      ) : <p className="cc-finderhint">Answer all three to see what your team needs and what it costs.</p>}
    </div>
  )
}

function Compare() {
  const rows: [string, string, string, string][] = [
    ['Care Certificate', '✓', '', '£25.99'],
    ['9 annual refreshers', '✓', '✓', '£25.99 each'],
    ['CPD Certified certificate per course', '✓', '✓', '✓'],
    ['60+ languages, any phone', '✓', '✓', '✓'],
    ['Manager dashboard', '✓', '✓', '✓'],
    ['Price per learner', '£159', '£139', 'Up to £259.90'],
  ]
  return (
    <section className="cc-sec">
      <h2>Bundle or single courses?</h2>
      <div className="cc-table">
        <table className="cc-compare">
          <thead><tr><th></th><th>Complete</th><th>Refresher</th><th>Single courses</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <td key={i}>{c}</td> : <td key={i} className="c">{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}
