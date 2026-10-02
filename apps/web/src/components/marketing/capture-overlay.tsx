'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOffers, licenceOffer, policyOffer, type Offer } from '@/lib/offers'
import { fiAttribution } from '@/lib/funnel-insights'
import { rememberLock } from '@/lib/offer-lock'
import { OfferLine } from './offer-line'
import './capture-overlay.css'

// The email capture overlay on course and policy pages. Campaigns (triggers, copy and a 50/50
// split between two variants) are set up in Funnel Insights › Email capture; this reads the live
// ones, picks the campaign for this shop and product, and shows it once the visitor has spent
// the set time on the page and/or scrolled the set depth.
//
// Two steps: a single click to commit, then name and email (email required). The API checks the
// address, then emails the free checklist or holds the offer for 30 days.
//
// Never shown with the exit question (each suppresses the other for the visit), to anyone who has
// reached for Buy now, Checkout or Add to basket, to anyone with something in their basket, or
// again within the campaign's repeat days. ?capture=preview shows it at once (?capture=A or B for a
// given variant, C too), for checking copy.
//
// A quiz variant (policies): three yes / not sure / no questions on what the law says the policy
// must cover, a result, then the email form; the results come with the full checklist.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const FI = 'https://trg-funnel-insights.vercel.app'
const CONSENT = 'By signing up, you agree to our terms and conditions, including receiving our offers by email.'

type Key = 'A' | 'B' | 'C'
type Variant = {
  key: Key; kind: 'lockin' | 'checklist' | 'quiz'; weight: number
  eyebrow: string; headline: string; body: string; button: string; decline: string
  step2_headline: string; step2_body: string; step2_button: string; image: string
}
type Campaign = {
  id: string; name: string; funnel: 'training' | 'policies'; pages: string[]
  trigger_seconds: number; trigger_scroll: number; trigger_mode: 'both' | 'either'; repeat_days: number
  variants: Variant[]
}

const store = {
  get<T>(k: string, d: T): T { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* blocked */ } },
}
const session = (k: string, set = false) => { try { if (set) sessionStorage.setItem(k, '1'); return sessionStorage.getItem(k) === '1' } catch { return false } }

function hasBasket(): boolean {
  try {
    const t = JSON.parse(localStorage.getItem('cs_training_cart') || 'null')
    const p = JSON.parse(localStorage.getItem('cs_policy_basket') || 'null')
    const n = (x: any) => (Array.isArray(x) ? x.length : Array.isArray(x?.items) ? x.items.length : 0)
    return n(t) > 0 || n(p) > 0
  } catch { return false }
}

/** Live campaigns, kept for five minutes in this tab. A preview always reads them fresh, so an
 *  edit in Funnel Insights (copy, an uploaded image) shows on the next load. */
async function loadCampaigns(fresh = false): Promise<Campaign[]> {
  try {
    const cached = JSON.parse(sessionStorage.getItem('cs_capture_cfg') || 'null')
    if (!fresh && cached && Date.now() - cached.at < 5 * 60_000) return cached.campaigns
  } catch { /* none */ }
  const r = await fetch(`${FI}/api/capture-config?site=carestream${fresh ? `&t=${Date.now()}` : ''}`, { cache: fresh ? 'no-store' : 'default' })
    .then(x => x.json()).catch(() => null)
  const campaigns = (r?.campaigns ?? []) as Campaign[]
  try { sessionStorage.setItem('cs_capture_cfg', JSON.stringify({ at: Date.now(), campaigns })) } catch { /* blocked */ }
  return campaigns
}

function report(c: Campaign, v: Variant, stage: 'shown' | 'step1' | 'quiz_done' | 'signup' | 'closed', inTest: boolean, product: string) {
  try {
    const mobile = window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 768
    fetch(`${FI}/api/capture-event`, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ site: 'carestream', campaign: c.id, variant: v.key, stage, in_test: inTest, page: location.pathname,
                             product, device: mobile ? 'mobile' : 'desktop', session: fiAttribution()?.session }),
    }).catch(() => {})
  } catch { /* never in the way */ }
}

type Answer = 'yes' | 'unsure' | 'no'
const ANSWERS: [Answer, string][] = [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']]

export function CaptureOverlay({ funnel, product, title, image, quiz }: {
  funnel: 'training' | 'policies'; product: string; title: string; image?: string | null
  /** For a quiz variant: three things this policy must do, and how many required elements it has. */
  quiz?: { questions: string[]; count: number } | null
}) {
  const offers = useOffers()
  const offer: Offer | null = useMemo(
    () => (funnel === 'training' ? licenceOffer(offers, product) : policyOffer(offers, product)), [offers, funnel, product])
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [variant, setVariant] = useState<Variant | null>(null)
  const [inTest, setInTest] = useState(true)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 'quiz' | 'result' | 2 | 3>(1)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [artRatio, setArtRatio] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [result, setResult] = useState<{ kind: string; lock?: { expires_on: string; label: string } } | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  // Once shown (and so once closed), never again on this page view.
  const fired = useRef(false)

  // Choose the campaign and this visitor's variant.
  useEffect(() => {
    const preview = ['preview', 'A', 'B', 'C'].includes(new URLSearchParams(location.search).get('capture') ?? '')
    if (!preview && (session('cs-exitq') || hasBasket() || store.get('cs_capture_signed', false))) return
    let alive = true
    loadCampaigns(preview).then(list => {
      if (!alive) return
      const c = list.find(x => x.funnel === funnel && (!x.pages?.length || x.pages.includes(product)) && x.variants?.length >= 2)
      if (!c) return
      const seen = store.get<Record<string, number>>('cs_capture_seen', {})
      if (!preview && seen[c.id] && Date.now() - seen[c.id] < c.repeat_days * 86400000) return
      const picks = store.get<Record<string, Key>>('cs_capture_variant', {})
      // ?capture=A or ?capture=B shows that variant now, for checking copy and images; the
      // visitor's own assignment is left alone.
      const forced = new URLSearchParams(location.search).get('capture')
      let key: Key | undefined = forced === 'A' || forced === 'B' || forced === 'C' ? forced : picks[c.id]
      if (!key || !c.variants.some(v => v.key === key)) {
        // Weighted pick across the campaign's variants (two or three).
        const total = c.variants.reduce((t, v) => t + Math.max(0, v.weight), 0) || 1
        let r = Math.random() * total
        key = (c.variants.find(v => (r -= Math.max(0, v.weight)) < 0) ?? c.variants[0]).key
        store.set('cs_capture_variant', { ...picks, [c.id]: key })
      }
      setCampaign(c)
      setVariant(c.variants.find(v => v.key === key) ?? c.variants[0])
    })
    return () => { alive = false }
  }, [funnel, product])

  // A lock-in needs an offer on this product; without one, show the other (checklist) variant and
  // leave the view out of the comparison.
  const shown = useMemo(() => {
    if (!campaign || !variant) return null
    const usable = (v: Variant) => (v.kind === 'lockin' ? !!offer : v.kind === 'quiz' ? (quiz?.questions.length ?? 0) >= 3 : true)
    if (usable(variant)) return variant
    return campaign.variants.find(v => v.kind === 'checklist') ?? null
  }, [campaign, variant, offer, quiz])
  useEffect(() => {
    if (!campaign) return
    // Only views where every variant could have shown count in the comparison.
    setInTest(campaign.variants.every(v => (v.kind === 'lockin' ? !!offer : v.kind === 'quiz' ? (quiz?.questions.length ?? 0) >= 3 : true)))
  }, [campaign, offer, quiz])

  // Triggers: active seconds on the page and scroll depth.
  useEffect(() => {
    if (!campaign || !shown || open || fired.current) return
    const preview = ['preview', 'A', 'B', 'C'].includes(new URLSearchParams(location.search).get('capture') ?? '')
    let seconds = 0, depth = 0, done = false
    const fire = () => {
      if (done) return
      const timeOk = seconds >= campaign.trigger_seconds, scrollOk = depth >= campaign.trigger_scroll
      if (preview || (campaign.trigger_mode === 'either' ? timeOk || scrollOk : timeOk && scrollOk)) {
        if (!preview && (session('cs-exitq') || hasBasket())) { done = true; return }
        done = true
        fired.current = true
        session('cs-exitq', true)   // the exit question stays away for this visit
        store.set('cs_capture_seen', { ...store.get<Record<string, number>>('cs_capture_seen', {}), [campaign.id]: Date.now() })
        setOpen(true)
        report(campaign, shown, 'shown', inTest, product)
      }
    }
    const tick = setInterval(() => { if (document.visibilityState === 'visible') { seconds++; fire() } }, 1000)
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      depth = Math.max(depth, h > 0 ? Math.round((window.scrollY / h) * 100) : 100)
      fire()
    }
    // Anyone reaching for Buy now, Checkout or Add to basket is not shown it.
    const buying = (e: Event) => { if ((e.target as HTMLElement | null)?.closest('.offerbtn, .ckpay, .bybtn, .pcbuynow, .add')) done = true }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', buying, true)
    onScroll()
    return () => { clearInterval(tick); window.removeEventListener('scroll', onScroll); document.removeEventListener('click', buying, true) }
  }, [campaign, shown, open, inTest, product])

  useEffect(() => { if (step === 2) setTimeout(() => emailRef.current?.focus(), 50) }, [step])

  if (!open || !campaign || !shown) return null

  const productName = funnel === 'training' ? `${title} training` : title
  const until = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const aProduct = funnel === 'training' ? productName : `a ${productName}`
  const fill = (s: string) => (s || '')
    .replace(/\{a_product\}/g, aProduct)
    .replace(/\{product\}/g, productName)
    .replace(/\{offer\}/g, offer?.label || offer?.name || 'offer')
    .replace(/\{headline\}/g, (offer?.headline || '').replace(/\.$/, ''))
    .replace(/\{date\}/g, until)
    .replace(/\{count\}/g, String(quiz?.count ?? ''))
  const close = () => { if (step !== 3) report(campaign, shown, 'closed', inTest, product); setOpen(false) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setSuggestion('')
    try {
      const res = await fetch(`${API_URL}/public/shop/capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, variant: shown.key, kind: shown.kind, funnel, product, email: email.trim(), name: name.trim(),
                               page: location.pathname, attribution: fiAttribution(), consent_text: CONSENT,
                               quiz: shown.kind === 'quiz' && quiz ? quiz.questions.slice(0, 3).map((q, i) => ({ q, a: answers[i] ?? 'unsure' })) : undefined }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) { setError(j?.error ?? 'Sorry, that did not go through. Please try again.'); setSuggestion(j?.suggestion ?? ''); return }
      const r = j?.data
      if (r?.lock?.token) { rememberLock(r.lock.token); window.dispatchEvent(new Event('cs-offer-lock')) }
      store.set('cs_capture_signed', true)
      report(campaign, shown, 'signup', inTest, product)
      setResult(r); setStep(3)
    } catch { setError('Sorry, that did not go through. Please try again.') }
    finally { setBusy(false) }
  }

  const img = shown.image || image
  // On <body>, so no stacking context on the page (sticky columns, transforms) can sit above it.
  return createPortal(
    <div className="co-overlay" role="dialog" aria-modal="true" aria-labelledby="co-title" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`co-box${img ? '' : ' noimg'}${artRatio ? ' fitted' : ''}`} style={artRatio ? { ['--art-ratio' as string]: String(artRatio) } : undefined}>
        <button type="button" className="co-close" aria-label="Close" onClick={close}>×</button>
        <div className="co-copy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="co-logo" src="/logo-color.svg" alt="CareStream" />
          {/* The same offer box as the page, so the overlay confirms the offer they have just seen. */}
          {offer && step !== 3 && <OfferLine offer={offer} funnel={funnel} className="co-offerline" />}
          {step === 1 && <>
            {shown.eyebrow && <p className="co-eyebrow">{fill(shown.eyebrow)}</p>}
            <h2 id="co-title">{fill(shown.headline)}</h2>
            <p className="co-body">{fill(shown.body)}</p>
            <button type="button" className="co-btn" onClick={() => { report(campaign, shown, 'step1', inTest, product); setStep(shown.kind === 'quiz' ? 'quiz' : 2) }}>{fill(shown.button)}</button>
            {shown.decline && <button type="button" className="co-decline" onClick={close}>{fill(shown.decline)}</button>}
          </>}
          {step === 'quiz' && quiz && (() => {
            const i = answers.length
            return <>
              <p className="co-eyebrow">Question {i + 1} of 3</p>
              <div className="co-progress" aria-hidden="true">{[0, 1, 2].map(n => <i key={n} className={n <= i ? 'on' : ''} />)}</div>
              <p className="co-qlabel">Does your current policy cover this?</p>
              <h2 id="co-title" className="co-q">{quiz.questions[i]}</h2>
              <div className="co-answers">
                {ANSWERS.map(([a, label]) => (
                  <button type="button" key={a} onClick={() => {
                    const next = [...answers, a]
                    setAnswers(next)
                    if (next.length >= 3) { report(campaign, shown, 'quiz_done', inTest, product); setStep('result') }
                  }}>{label}</button>
                ))}
              </div>
            </>
          })()}
          {step === 'result' && quiz && (() => {
            const covered = answers.filter(a => a === 'yes').length
            return <>
              <p className="co-eyebrow">Your result</p>
              <div className="co-score"><b>{covered}</b><span>of 3 covered</span></div>
              <h2 id="co-title">{covered === 3 ? 'A good start' : `Your policy may be missing ${3 - covered} of 3`}</h2>
              <p className="co-body">
                {covered === 3
                  ? `Inspectors look for all ${quiz.count} required elements in ${aProduct}, not just these three. Check the rest with the full checklist.`
                  : `Those three are among ${quiz.count} required elements an inspector expects ${aProduct} to cover. Get your results and the full checklist, so you can check every one.`}
              </p>
              <button type="button" className="co-btn" onClick={() => setStep(2)}>Email me my results</button>
            </>
          })()}
          {step === 2 && <form onSubmit={submit} noValidate>
            <h2 id="co-title">{fill(shown.step2_headline)}</h2>
            <p className="co-body">{fill(shown.step2_body)}</p>
            <label className="co-field">Your name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Sam Taylor" /></label>
            <label className="co-field">Work email<input ref={emailRef} type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="name@yourservice.co.uk" /></label>
            {error && <p className="co-err">{error}{suggestion && <> <button type="button" onClick={() => { setEmail(suggestion); setError(''); setSuggestion('') }}>Use {suggestion}</button></>}</p>}
            <button className="co-btn" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())}>{busy ? 'Sending…' : fill(shown.step2_button)}</button>
            <p className="co-consent">By signing up, you agree to our <a href="/terms#marketing-emails" target="_blank" rel="noopener">terms and conditions</a>, including receiving our offers by email.</p>
          </form>}
          {step === 3 && <>
            {result?.kind === 'lockin' && result.lock ? <>
              <h2 id="co-title">Your {result.lock.label} is held</h2>
              <p className="co-body">
                It is held until {new Date(`${result.lock.expires_on}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.
                We have emailed your personal link, and it is already applied in this browser.
              </p>
            </> : <>
              <h2 id="co-title">Check your inbox</h2>
              <p className="co-body">Your {result?.kind === 'quiz' ? 'results and ' : ''}{productName} checklist {result?.kind === 'quiz' ? 'are' : 'is'} on its way to {email.trim()}. It should arrive in a minute or two.</p>
            </>}
            <button type="button" className="co-btn" onClick={() => setOpen(false)}>Carry on browsing</button>
          </>}
        </div>
        {img && (
          <div className="co-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" onLoad={e => { const t = e.currentTarget; if (t.naturalWidth && t.naturalHeight) setArtRatio(t.naturalWidth / t.naturalHeight) }} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
