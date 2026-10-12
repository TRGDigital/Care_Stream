'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOffers, licenceOffer, policyOffer, endsText, offerEmoji, type Offer } from '@/lib/offers'
import { fiAttribution } from '@/lib/funnel-insights'
import { offerLock, rememberLock } from '@/lib/offer-lock'
import { OfferLine } from './offer-line'
import { setCaptureState, type CaptureOrigin } from './capture-bus'
import './capture-overlay.css'

// The email capture overlay on course and policy pages. Campaigns (triggers, copy and the split
// between variants) are set up in Funnel Insights › Email capture; this reads the live ones, picks
// the campaign for this shop and product, and shows it once the visitor has spent the set time on
// the page and/or scrolled the set depth.
//
// Variants (Oct 2026, from the Hammersley data capture lesson: the live offer is the bribe, the first
// step is a click not an email box, the discount is applied for them):
//   apply      "Apply the offer to my order" (one click, no email), then "hold it for 30 days" + email
//   setting    "Where do your staff work?" (one tap, remembered), then email, then their courses
//   quiz       policies: three questions, the result with no email needed, then the offer for the email
//   control    nothing shown; logs held_out at the moment it would have opened
//   lockin / checklist   the first versions, still understood so an old campaign keeps working
// apply and setting only show where an offer covers the product (every CPD course and policy today).
//
// Besides the timed overlay, the same hold form opens from the line under the buy panel (HoldPrice,
// origin 'hold'), the reopen tab after it is closed ('tab') and, on desktop, when the mouse heads for
// the browser's tabs ('exit'). Every event and sign-up records where it came from. The control group
// gets none of these, so the comparison stays clean.
//
// Never shown automatically with the exit question (each suppresses the other for the visit), to
// anyone who has reached for Buy now, Checkout or Add to basket, to anyone with something in their
// basket, or again within the campaign's repeat days. ?capture=preview shows it at once; ?capture=A
// (B, C, D) a given variant, and ?capture=apply|setting|quiz|control a kind with its built-in copy.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const FI = 'https://trg-funnel-insights.vercel.app'
const CONSENT = 'By signing up, you agree to our terms and conditions, including receiving our offers by email.'
const HOLD_DAYS = 30

type Key = 'A' | 'B' | 'C' | 'D'
type Kind = 'apply' | 'setting' | 'quiz' | 'control' | 'lockin' | 'checklist'
type Copy = { eyebrow: string; headline: string; body: string; button: string; decline: string
              step2_headline: string; step2_body: string; step2_button: string }
type Variant = Copy & { key: Key; kind: Kind; weight: number; image: string; image2?: string }
const KNOWN: Kind[] = ['apply', 'setting', 'quiz', 'control', 'lockin', 'checklist']
const HOLDS: Kind[] = ['apply', 'setting', 'lockin']
export type SecondVariant = { key: string; kind: 'message' | 'offer'; weight: number; eyebrow?: string; headline: string; body: string; button: string; link?: string; offer_key?: string }
export type SecondPage = { status: 'off' | 'live'; control?: number; seconds?: number; variants?: SecondVariant[] }
export type Campaign = {
  id: string; name: string; funnel: 'training' | 'policies'; pages: string[]
  trigger_seconds: number; trigger_scroll: number; trigger_mode: 'both' | 'either'; repeat_days: number
  /** Opening second per product page, when the campaign follows the median time on page. */
  page_seconds?: Record<string, number>
  /** Phones: their own triggers (set = used instead of the ones above, and the median option is ignored).
   *  mobile_past_buy waits until the buy panel has scrolled off the top of the screen. */
  mobile_trigger_seconds?: number | null; mobile_trigger_scroll?: number | null
  mobile_trigger_mode?: 'both' | 'either' | null; mobile_past_buy?: boolean
  /** Optional second overlay on the visitor's next product page (see second-page-offer.tsx). */
  second_page?: SecondPage | null
  variants: Variant[]
}

// What each kind says when Funnel Insights leaves a field empty. {offer} is the offer's label
// ("Halloween offer"), {offer_headline} its headline, {ends} "Ends midnight, Saturday 31 October",
// {date} the hold's last day, {product} / {a_product} the course or policy, {count} the quiz's total.
const DEFAULTS: Partial<Record<Kind, Copy>> = {
  apply: {
    eyebrow: 'Your offer is ready', headline: '{offer_headline}',
    body: 'Apply it now and it is there when you check out. {ends}.',
    button: 'Apply the {offer} to my order', decline: 'No thanks',
    step2_headline: 'Not buying today? We will hold it for 30 days',
    step2_body: 'Keep this price until {date}, even after the offer ends. We email your personal link.',
    step2_button: 'Hold my offer',
  },
  setting: {
    eyebrow: 'Your {offer} is ready', headline: 'Where do your staff work?',
    body: 'Tell us and we will apply your offer and show what your type of service buys most.',
    button: '', decline: 'No thanks',
    step2_headline: 'Where should we send your offer?',
    step2_body: 'We will hold this price for you until {date} and email your personal link.',
    step2_button: 'Send my offer',
  },
  quiz: {
    eyebrow: '3 quick questions', headline: 'Is your {product} CQC-ready?',
    body: 'Three questions on what the law says {a_product} must cover. It takes 30 seconds and you see your result straight away.',
    button: 'Start the check', decline: 'No thanks',
    step2_headline: 'Where should we send your results?',
    step2_body: 'We will email your results and the full checklist of all {count} required elements.',
    step2_button: 'Email my results',
  },
}

/** The 'setting' variant's choices, and the CPD courses each setting buys most (Len, 12 Oct 2026). */
export const SETTINGS: { label: string; courses: [string, string][] }[] = [
  { label: 'Residential care home', courses: [['moving-and-handling-of-people', 'Moving and handling of people'], ['infection-prevention-and-control', 'Infection prevention and control'], ['medication-administration-and-competency', 'Medication administration'], ['food-hygiene', 'Food hygiene']] },
  { label: 'Nursing home', courses: [['medication-administration-and-competency', 'Medication administration'], ['end-of-life-palliative-care', 'End of life and palliative care'], ['infection-prevention-and-control', 'Infection prevention and control'], ['moving-and-handling-of-people', 'Moving and handling of people']] },
  { label: 'Home care', courses: [['medication-administration-and-competency', 'Medication administration'], ['moving-and-handling-of-people', 'Moving and handling of people'], ['gdpr-data-protection', 'GDPR and data protection'], ['general-health-and-safety-awareness', 'General health and safety']] },
  { label: 'Supported living or other', courses: [['mental-health-awareness', 'Mental health awareness'], ['gdpr-data-protection', 'GDPR and data protection'], ['general-health-and-safety-awareness', 'General health and safety'], ['coshh-control-of-substances-hazardous-to-health', 'COSHH']] },
]

const isMobile = () => { try { return !!window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 768 } catch { return false } }
// The block with the price and the buy button: course and policy pages (.mpe-buy), the CPD bundles page.
const BUY_ANCHOR = '[data-capture-anchor], .mpe-buy, .cc-bundles'
const FORCE = ['preview', 'A', 'B', 'C', 'D', 'apply', 'setting', 'quiz', 'control']

export const store = {
  get<T>(k: string, d: T): T { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d } catch { return d } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* blocked */ } },
}
export const session = (k: string, set = false) => { try { if (set) sessionStorage.setItem(k, '1'); return sessionStorage.getItem(k) === '1' } catch { return false } }

export function hasBasket(): boolean {
  try {
    const t = JSON.parse(localStorage.getItem('cs_training_cart') || 'null')
    const p = JSON.parse(localStorage.getItem('cs_policy_basket') || 'null')
    const n = (x: any) => (Array.isArray(x) ? x.length : Array.isArray(x?.items) ? x.items.length : 0)
    return n(t) > 0 || n(p) > 0
  } catch { return false }
}

/** Live campaigns, kept for five minutes in this tab. A preview always reads them fresh, so an
 *  edit in Funnel Insights (copy, an uploaded image) shows on the next load. */
export async function loadCampaigns(fresh = false): Promise<Campaign[]> {
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

type Stage = 'shown' | 'held_out' | 'step1' | 'quiz_done' | 'signup' | 'closed'
type Extra = { origin: CaptureOrigin; setting?: string; picture?: number | null }
function report(c: Campaign, v: Variant, stage: Stage, inTest: boolean, product: string, x: Extra) {
  try {
    fetch(`${FI}/api/capture-event`, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ site: 'carestream', campaign: c.id, variant: v.key, stage, in_test: inTest, page: location.pathname,
                             product, device: isMobile() ? 'mobile' : 'desktop', session: fiAttribution()?.session,
                             origin: x.origin, setting: x.setting || undefined, picture: x.picture ?? undefined }),
    }).catch(() => {})
  } catch { /* never in the way */ }
}

/** A variant built from a kind's own copy, for ?capture=apply|setting|quiz|control. */
function builtIn(kind: Kind, key: Key): Variant {
  return { key, kind, weight: 1, image: '', ...(DEFAULTS[kind] ?? DEFAULTS.apply!) }
}

type Answer = 'yes' | 'unsure' | 'no'
const ANSWERS: [Answer, string][] = [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']]
type Step = 1 | 'quiz' | 'result' | 2 | 3

export function CaptureOverlay({ funnel, product, title, image, quiz, offerName }: {
  funnel: 'training' | 'policies'; product: string; title: string; image?: string | null
  /** What the offer versions call the product, in place of "<title> training": the CPD
   *  courses page passes its ad group's keyword phrase, e.g. "care home staff training". */
  offerName?: string | null
  /** For a quiz variant: three things this policy must do, and how many required elements it has. */
  quiz?: { questions: string[]; count: number } | null
}) {
  const offers = useOffers()
  const offer: Offer | null = useMemo(
    () => (funnel === 'training' ? licenceOffer(offers, product) : policyOffer(offers, product)), [offers, funnel, product])
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [variant, setVariant] = useState<Variant | null>(null)
  const [picture, setPicture] = useState<1 | 2>(1)
  /** Opening it by itself is allowed (not suppressed by the basket, the exit question or repeat days). */
  const [autoOk, setAutoOk] = useState(false)
  const [inTest, setInTest] = useState(true)
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState<CaptureOrigin>('overlay')
  const [step, setStep] = useState<Step>(1)
  const [setting, setSetting] = useState('')
  const [applied, setApplied] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [artRatio, setArtRatio] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [result, setResult] = useState<{ kind: string; lock?: { expires_on: string; label: string } } | null>(null)
  const [signed, setSigned] = useState(false)
  const [tab, setTab] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  // Once shown (and so once closed), never again by itself on this page view.
  const fired = useRef(false)

  // Choose the campaign and this visitor's variant (and picture).
  useEffect(() => {
    const forced = new URLSearchParams(location.search).get('capture') ?? ''
    const preview = FORCE.includes(forced)
    const already = store.get('cs_capture_signed', false) || !!offerLock()
    if (already && !preview) { setSigned(true); return }
    let alive = true
    loadCampaigns(preview).then(list => {
      if (!alive) return
      const found = list.find(x => x.funnel === funnel && (!x.pages?.length || x.pages.includes(product)) && x.variants?.length >= 2)
      // A variant kind this page does not know is left out of the split (never shown empty).
      let c = found ? { ...found, variants: found.variants.filter(v => KNOWN.includes(v.kind)) } : null
      if (!c && preview) c = { id: '00000000-0000-0000-0000-000000000000', name: 'Preview', funnel, pages: [], trigger_seconds: 0, trigger_scroll: 0, trigger_mode: 'either', repeat_days: 0, variants: [] }
      if (!c || (c.variants.length < 2 && !preview)) return
      const picks = store.get<Record<string, Key>>('cs_capture_variant', {})
      let v: Variant | undefined
      if (['apply', 'setting', 'quiz', 'control'].includes(forced)) {
        // A kind: the campaign's own variant of that kind if it has one, else the built-in copy.
        v = c.variants.find(x => x.kind === forced) ?? builtIn(forced as Kind, 'A')
      } else if (['A', 'B', 'C', 'D'].includes(forced)) {
        v = c.variants.find(x => x.key === forced)
      } else {
        v = c.variants.find(x => x.key === picks[c!.id])
        if (!v && c.variants.length) {
          const total = c.variants.reduce((t, x) => t + Math.max(0, x.weight), 0) || 1
          let r = Math.random() * total
          v = c.variants.find(x => (r -= Math.max(0, x.weight)) < 0) ?? c.variants[0]
          store.set('cs_capture_variant', { ...picks, [c.id]: v.key })
        }
      }
      if (!v) return
      // Two pictures to test: each visitor keeps the one they first got.
      const pics = store.get<Record<string, 1 | 2>>('cs_capture_pic', {})
      let p = pics[c.id]
      if (!p) { p = Math.random() < 0.5 ? 1 : 2; store.set('cs_capture_pic', { ...pics, [c.id]: p }) }
      const seen = store.get<Record<string, number>>('cs_capture_seen', {})
      setAutoOk(preview || !(session('cs-exitq') || hasBasket() || (seen[c.id] && Date.now() - seen[c.id] < c.repeat_days * 86400000)))
      setPicture(p)
      setCampaign(c)
      setVariant(v)
      setTab(session('cs-cap-tab'))
    })
    return () => { alive = false }
  }, [funnel, product])

  const usable = (v: Variant) => (HOLDS.includes(v.kind) ? !!offer : v.kind === 'quiz' ? (quiz?.questions.length ?? 0) >= 3 : true)
  // Without an offer on this product the offer versions fall back to a checklist variant if the
  // campaign has one, else nothing (and the view is left out of the comparison).
  const shown = useMemo(() => {
    if (!campaign || !variant) return null
    if (usable(variant)) return variant
    return campaign.variants.find(v => v.kind === 'checklist') ?? null
  }, [campaign, variant, offer, quiz]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!campaign) return
    setInTest(campaign.variants.every(usable))
  }, [campaign, offer, quiz]) // eslint-disable-line react-hooks/exhaustive-deps

  const control = shown?.kind === 'control'
  const canHold = !!campaign && !!shown && !!offer && !control && !signed
  const x = (o: CaptureOrigin = origin): Extra => ({ origin: o, setting: setting || undefined, picture: (shown?.image2 ? picture : shown?.image ? 1 : null) })

  // Opens the overlay. From the tab it starts at its first step; from the buy panel or on exit it
  // goes straight to the hold form.
  const openAt = (o: CaptureOrigin) => {
    if (!campaign || !shown || control) return
    fired.current = true
    setOrigin(o); setError(''); setSetting(''); setAnswers([]); setApplied(false)
    setStep(o === 'hold' || o === 'exit' ? 2 : 1)
    setOpen(true); setTab(false)
    session('cs-exitq', true)
    report(campaign, shown, 'shown', inTest, product, x(o))
  }

  // Tell the buy panel's "Hold my price" line and anything else whether it may show, and listen for it.
  useEffect(() => {
    setCaptureState({ ready: !!campaign && !!shown, canHold })
    const onOpen = (e: Event) => { const o = (e as CustomEvent).detail?.origin as CaptureOrigin | undefined; if (canHold && !open) openAt(o ?? 'hold') }
    window.addEventListener('cs-capture-open', onOpen)
    return () => window.removeEventListener('cs-capture-open', onOpen)
  }) // every render: keeps the handler's view of state current

  // Triggers: active seconds on the page and scroll depth.
  useEffect(() => {
    if (!campaign || !shown || !autoOk || open || fired.current || signed) return
    const preview = FORCE.includes(new URLSearchParams(location.search).get('capture') ?? '')
    const phone = isMobile() && campaign.mobile_trigger_seconds != null
    const needSeconds = phone ? campaign.mobile_trigger_seconds! : (campaign.page_seconds?.[product] ?? campaign.trigger_seconds)
    const needScroll = phone ? (campaign.mobile_trigger_scroll ?? campaign.trigger_scroll) : campaign.trigger_scroll
    const mode = phone ? (campaign.mobile_trigger_mode ?? 'both') : campaign.trigger_mode
    const anchor = phone && campaign.mobile_past_buy ? document.querySelector<HTMLElement>(BUY_ANCHOR) : null
    let seconds = 0, depth = 0, scrolled = false, done = false
    const fire = () => {
      if (done) return
      const timeOk = seconds >= needSeconds
      // Past the buy panel: its bottom edge has scrolled above the top of the screen. Otherwise the
      // scroll depth; a depth of 0 means any scroll at all (phones: open on the first scroll).
      const scrollOk = anchor ? anchor.getBoundingClientRect().bottom < 0 : needScroll > 0 ? depth >= needScroll : scrolled
      if (preview || (mode === 'either' ? timeOk || scrollOk : timeOk && scrollOk)) {
        if (!preview && (session('cs-exitq') || hasBasket())) { done = true; return }
        done = true
        fired.current = true
        session('cs-exitq', true)   // the exit question stays away for this visit (the control too, so both groups match)
        try { sessionStorage.setItem('cs-cap-first', location.pathname) } catch { /* blocked */ }   // for the second-page offer
        store.set('cs_capture_seen', { ...store.get<Record<string, number>>('cs_capture_seen', {}), [campaign.id]: Date.now() })
        if (shown.kind === 'control') { report(campaign, shown, 'held_out', inTest, product, x('overlay')); return }
        setOrigin('overlay'); setStep(1); setOpen(true); setTab(false)
        report(campaign, shown, 'shown', inTest, product, x('overlay'))
      }
    }
    const tick = setInterval(() => { if (document.visibilityState === 'visible') { seconds++; fire() } }, 1000)
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (window.scrollY > 40) scrolled = true
      depth = Math.max(depth, h > 0 ? Math.round((window.scrollY / h) * 100) : 100)
      fire()
    }
    // Anyone reaching for Buy now, Checkout or Add to basket is not shown it.
    const buying = (e: Event) => { if ((e.target as HTMLElement | null)?.closest('.offerbtn, .ckpay, .bybtn, .pcbuynow, .add, .cc-add, .cc-checkout')) done = true }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', buying, true)
    if (preview) fire()
    return () => { clearInterval(tick); window.removeEventListener('scroll', onScroll); document.removeEventListener('click', buying, true) }
  }, [campaign, shown, autoOk, open, inTest, product, signed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop exit: the mouse leaves through the top of the window, once a visit, if they have not
  // signed up or reached for the basket. Straight to the hold form.
  useEffect(() => {
    if (!canHold || open || isMobile()) return
    const leave = (e: MouseEvent) => {
      if (e.clientY > 0 || e.relatedTarget || session('cs-cap-exit') || hasBasket()) return
      session('cs-cap-exit', true)
      openAt('exit')
    }
    document.addEventListener('mouseout', leave)
    return () => document.removeEventListener('mouseout', leave)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (step === 2) setTimeout(() => emailRef.current?.focus(), 50) }, [step])

  const until = new Date(Date.now() + HOLD_DAYS * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const label = offer?.label || offer?.name || 'offer'

  // The reopen tab: after the overlay is closed without signing up, for the rest of the visit.
  const tabEl = tab && canHold && !open && offer ? (
    <button type="button" className="co-tab" onClick={() => openAt('tab')}>
      <span aria-hidden="true">{offerEmoji(offer)}</span>Your {label}
    </button>
  ) : null

  if (!open || !campaign || !shown || control) return tabEl ? createPortal(tabEl, document.body) : null

  const copy: Copy = { ...(DEFAULTS[shown.kind] ?? {} as Copy), ...Object.fromEntries(Object.entries(shown).filter(([, v]) => typeof v === 'string' && v)) } as Copy
  const hold = DEFAULTS.apply!
  const productName = HOLDS.includes(shown.kind) && offerName ? offerName : funnel === 'training' ? `${title} training` : title
  const aProduct = funnel === 'training' ? productName : `a ${productName}`
  const fill = (s: string) => (s || '')
    .replace(/\{a_product\}/g, aProduct)
    .replace(/\{product\}/g, productName)
    .replace(/\{offer_headline\}/g, (offer?.headline || '').replace(/\.$/, ''))
    .replace(/\{offer\}/g, label)
    .replace(/\{headline\}/g, (offer?.headline || '').replace(/\.$/, ''))
    .replace(/\{ends\}/g, offer ? endsText(offer) : '')
    .replace(/\{date\}/g, until)
    .replace(/\{count\}/g, String(quiz?.count ?? ''))
  const close = () => {
    if (step !== 3) { report(campaign, shown, 'closed', inTest, product, x()); session('cs-cap-tab', true); setTab(true) }
    setOpen(false)
  }
  const signupKind: Kind = origin === 'hold' || origin === 'exit' ? 'apply' : shown.kind
  // The second step's words: the variant's own, except when it was opened from the buy panel or on
  // exit (the hold form whatever the variant) and after the quiz (the offer, with the results).
  const fromPanel = origin === 'hold' || origin === 'exit'
  const step2 = fromPanel ? {
    headline: origin === 'exit' ? `Before you go: hold your ${label} price?` : fill(hold.step2_headline),
    body: fill(hold.step2_body), button: fill(hold.step2_button),
  } : shown.kind === 'quiz' && applied ? {
    headline: 'Where should we send your results?',
    body: `We will hold the ${label} until ${until} and email your results with the full checklist of all ${quiz?.count ?? ''} required elements.`,
    button: fill(copy.step2_button),
  } : { headline: fill(copy.step2_headline), body: fill(copy.step2_body), button: fill(copy.step2_button) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setSuggestion('')
    try {
      const res = await fetch(`${API_URL}/public/shop/capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, variant: shown.key, kind: signupKind, funnel, product, email: email.trim(), name: name.trim(),
                               page: location.pathname, attribution: fiAttribution(), consent_text: CONSENT,
                               origin, setting: setting || undefined, picture: x().picture ?? undefined, hold: shown.kind === 'quiz' && applied,
                               quiz: shown.kind === 'quiz' && quiz ? quiz.questions.slice(0, 3).map((q, i) => ({ q, a: answers[i] ?? 'unsure' })) : undefined }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) { setError(j?.error ?? 'Sorry, that did not go through. Please try again.'); setSuggestion(j?.suggestion ?? ''); return }
      const r = j?.data
      if (r?.lock?.token) { rememberLock(r.lock.token); window.dispatchEvent(new Event('cs-offer-lock')) }
      store.set('cs_capture_signed', true)
      report(campaign, shown, 'signup', inTest, product, x())
      setSigned(true); setTab(false)
      setResult(r); setStep(3)
    } catch { setError('Sorry, that did not go through. Please try again.') }
    finally { setBusy(false) }
  }

  const step1 = () => { report(campaign, shown, 'step1', inTest, product, x()) }
  const appliedLine = offer && (applied || setting) ? (
    <div className="co-applied"><span aria-hidden="true">✓</span>{label} applied to your order{setting ? ` · ${setting}` : ''}. {endsText(offer)}.</div>
  ) : null
  const img = (picture === 2 && shown.image2) || shown.image || image
  const courses = SETTINGS.find(s => s.label === setting)?.courses ?? []
  const bar = (n: number) => <div className="co-progress" aria-hidden="true">{[1, 2, 3].map(i => <i key={i} className={i <= n ? 'on' : ''} />)}</div>

  // On <body>, so no stacking context on the page (sticky columns, transforms) can sit above it.
  return createPortal(
    <div className="co-overlay" role="dialog" aria-modal="true" aria-labelledby="co-title" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`co-box${img ? '' : ' noimg'}${artRatio ? ' fitted' : ''}`} style={artRatio ? { ['--art-ratio' as string]: String(artRatio) } : undefined}>
        <button type="button" className="co-close" aria-label="Close" onClick={close}>×</button>
        <div className="co-copy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="co-logo" src="/logo-color.svg" alt="CareStream" />
          {offer && step !== 3 && !appliedLine && <OfferLine offer={offer} funnel={funnel} className="co-offerline" />}

          {step === 1 && shown.kind === 'setting' && <>
            {bar(1)}
            {copy.eyebrow && <p className="co-eyebrow">{fill(copy.eyebrow)}</p>}
            <h2 id="co-title">{fill(copy.headline)}</h2>
            <p className="co-body">{fill(copy.body)}</p>
            <div className="co-choices">
              {SETTINGS.map(s => (
                <button type="button" key={s.label} onClick={() => { setSetting(s.label); report(campaign, shown, 'step1', inTest, product, { ...x(), setting: s.label }); setStep(2) }}>{s.label}</button>
              ))}
            </div>
            {copy.decline && <button type="button" className="co-decline" onClick={close}>{fill(copy.decline)}</button>}
          </>}

          {step === 1 && shown.kind !== 'setting' && <>
            {copy.eyebrow && <p className="co-eyebrow">{fill(copy.eyebrow)}</p>}
            <h2 id="co-title">{fill(copy.headline)}</h2>
            <p className="co-body">{fill(copy.body)}</p>
            <button type="button" className="co-btn" onClick={() => {
              step1()
              if (shown.kind === 'apply') { setApplied(true); session('cs-offer-applied', true) }
              setStep(shown.kind === 'quiz' ? 'quiz' : 2)
            }}>{fill(copy.button)}</button>
            {copy.decline && <button type="button" className="co-decline" onClick={close}>{fill(copy.decline)}</button>}
          </>}

          {step === 'quiz' && quiz && (() => {
            const i = answers.length
            return <>
              <p className="co-eyebrow">Question {i + 1} of 3</p>
              <div className="co-progress" aria-hidden="true">{[0, 1, 2].map(n => <i key={n} className={n <= i ? 'on' : ''} />)}</div>
              <p className="co-qlabel">Does your current policy cover this?</p>
              <h2 id="co-title" className="co-q">{quiz.questions[i]}</h2>
              <div className="co-answers">
                {ANSWERS.map(([a, l]) => (
                  <button type="button" key={a} onClick={() => {
                    const next = [...answers, a]
                    setAnswers(next)
                    if (next.length >= 3) { report(campaign, shown, 'quiz_done', inTest, product, x()); setStep('result') }
                  }}>{l}</button>
                ))}
              </div>
            </>
          })()}

          {step === 'result' && quiz && (() => {
            const covered = answers.filter(a => a === 'yes').length
            // The result needs no email. Then the offer, for the email (the results come with it).
            return <>
              <p className="co-eyebrow">Your result</p>
              <div className="co-score"><b>{covered}</b><span>of 3 covered</span></div>
              <h2 id="co-title">{covered === 3 ? 'A good start' : `Your policy may be missing ${3 - covered} of 3`}</h2>
              <p className="co-body">
                {covered === 3
                  ? `Inspectors look for all ${quiz.count} required elements in ${aProduct}, not just these three.`
                  : `Those three are among ${quiz.count} required elements an inspector expects ${aProduct} to cover.`}
                {offer ? ` You qualify for the ${label}: ${(offer.headline || '').replace(/\.$/, '').toLowerCase()}.` : ''}
              </p>
              {offer
                ? <button type="button" className="co-btn" onClick={() => { setApplied(true); session('cs-offer-applied', true); setStep(2) }}>Apply it and hold it for 30 days</button>
                : <button type="button" className="co-btn" onClick={() => setStep(2)}>Email me the full checklist</button>}
              <button type="button" className="co-decline" onClick={close}>No thanks</button>
            </>
          })()}

          {step === 2 && <form onSubmit={submit} noValidate>
            {shown.kind === 'setting' && setting && bar(2)}
            {appliedLine}
            <h2 id="co-title">{step2.headline}</h2>
            <p className="co-body">{step2.body}</p>
            <label className="co-field">Your name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Sam Taylor" /></label>
            <label className="co-field">Work email<input ref={emailRef} type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="name@yourservice.co.uk" /></label>
            {error && <p className="co-err">{error}{suggestion && <> <button type="button" onClick={() => { setEmail(suggestion); setError(''); setSuggestion('') }}>Use {suggestion}</button></>}</p>}
            <button className="co-btn" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())}>{busy ? 'Sending…' : step2.button}</button>
            <p className="co-consent">By signing up, you agree to our <a href="/terms#marketing-emails" target="_blank" rel="noopener">terms and conditions</a>, including receiving our offers by email.</p>
          </form>}

          {step === 3 && <>
            {shown.kind === 'setting' && bar(3)}
            {result?.lock ? <>
              <div className="co-applied"><span aria-hidden="true">✓</span>Your {result.lock.label} is held until {new Date(`${result.lock.expires_on}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.</div>
              {shown.kind === 'setting' && funnel === 'training' && courses.length ? <>
                <h2 id="co-title">What {setting.toLowerCase()} teams buy most</h2>
                <ul className="co-list">
                  {courses.map(([slug, name]) => <li key={slug}><a href={`/staff-training/${slug}`}>{name}</a><span>{label}</span></li>)}
                </ul>
              </> : <>
                <h2 id="co-title">{result.kind === 'quiz' ? 'Check your inbox' : 'Your link is on its way'}</h2>
                <p className="co-body">{result.kind === 'quiz'
                  ? `Your results and the ${productName} checklist are on their way to ${email.trim()}, with your personal link.`
                  : 'We have emailed your personal link. It is also saved in this browser, so the offer is applied whenever you come back.'}</p>
              </>}
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
