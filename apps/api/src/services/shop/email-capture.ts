import { prisma } from '../../db/client'
import { siteUrl } from '../../lib/urls'
import { getOffers, licenceOffer, policyOffer, type Offer } from '../offers'
import { lockOffer } from '../offers/locks'
import { humaniseElement } from '../policies/humanise-element'
import { reportSubscriber } from '../analytics/funnel-insights'
import { sendChecklistEmail, sendOfferLockEmail } from '../email/outbound'
import { checklistPdf, type ChecklistData } from './checklist-pdf'

// Email capture from the product page overlays (campaigns run from Funnel Insights › Email capture):
//   checklist  the free "what to check before you buy" PDF for this course or policy, by email
//   lockin     the offer running on this product, held for 30 days on a personal link
// The address is checked first (Ideal Postcodes, the same check Hello Hattie uses; it fails open
// when the key is missing or the service is down), then the sign-up goes to the Funnel Insights
// list with the consent wording the visitor saw.

type Funnel = 'training' | 'policies'
const LOCK_DAYS = 30
const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export type EmailCheck = { status: 'deliverable' | 'undeliverable' | 'unknown' | 'unchecked'; suggestion?: string }

export async function checkEmail(raw: string): Promise<EmailCheck> {
  const email = raw.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { status: 'undeliverable' }
  const key = process.env.IDEAL_POSTCODES_KEY
  if (!key) return { status: 'unchecked' }
  try {
    const r = await fetch(`https://api.ideal-postcodes.co.uk/v1/emails?query=${encodeURIComponent(email)}&api_key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(8000) })
    const body: any = await r.json().catch(() => null)
    if (r.status !== 200 || !body?.result) return { status: 'unchecked' }
    const x = body.result
    if (x.disposable) return { status: 'undeliverable', suggestion: x.suggestions?.[0] }
    const status = x.result === 'deliverable' ? 'deliverable' : x.result === 'not_deliverable' || x.result === 'undeliverable' ? 'undeliverable' : 'unknown'
    return { status, suggestion: x.suggestions?.[0] }
  } catch { return { status: 'unchecked' } }
}

/** A product's title and the record its checklist is built from. Null if there is no such product. */
export async function loadChecklist(funnel: Funnel, slug: string): Promise<ChecklistData | null> {
  if (funnel === 'training') {
    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true } })
    const topic = (topics as any[]).find(t => slugify(t.title) === slug)
    if (!topic) return null
    const m = (await (prisma as any).trainingModule.findMany({
      where: topic.shop_module_id ? { id: topic.shop_module_id } : { tenant_id: null, source: 'ai_generated', tier: 'prebuilt', topic_id: topic.id },
      select: { frequency: true, duration_minutes: true, learning_content: true, cpd_accredited: true, questions: true, pass_mark: true },
      orderBy: [{ approved: 'desc' }, { created_at: 'desc' }],
    }) as any[])[0]
    const sections = Array.isArray(m?.learning_content?.sections) ? m.learning_content.sections : []
    return {
      funnel, slug, title: topic.title,
      lessons: sections.map((s: any) => String(s?.heading ?? '')).filter(Boolean),
      minutes: m?.duration_minutes ?? null,
      questions: Array.isArray(m?.questions) ? m.questions.length : null,
      passMark: m?.pass_mark ?? 80,
      frequency: m?.frequency ?? topic.default_frequency ?? null,
      practical: !!topic.requires_practical,
      cpd: !!m?.cpd_accredited,
    }
  }
  const p = await (prisma as any).policyProduct.findFirst({ where: { slug, active: true } })
  if (!p) return null
  const keys: string[] = p.reference_keys ?? []
  const regs = keys.length
    ? await (prisma as any).externalRegulation.findMany({ where: { reference_key: { in: keys } }, select: { reference_key: true, official_name: true, required_elements: true } })
    : []
  const ordered = (regs as any[]).sort((a, b) => keys.indexOf(a.reference_key) - keys.indexOf(b.reference_key))
  return {
    funnel, slug, title: p.title,
    regulations: ordered.map(r => ({ name: r.official_name, elements: (Array.isArray(r.required_elements) ? r.required_elements : []).map((e: any) => humaniseElement(String(e))) })),
    ownFields: ((p.intake_fields as any[]) ?? []).filter(f => !f?.shared).map(f => String(f.label)),
  }
}

/** The offer that applies to this product today, if any. */
function offerOn(offers: Offer[], funnel: Funnel, slug: string): Offer | null {
  return funnel === 'training' ? licenceOffer(offers, slug) : policyOffer(offers, slug)
}

export type CaptureResult = {
  kind: 'checklist' | 'lockin' | 'quiz'
  lock?: { token: string; expires_on: string; label: string }
}

export async function captureSignup(b: {
  email: string; name: string; funnel: Funnel; product: string; kind: 'checklist' | 'lockin' | 'quiz'
  /** The quiz variant's answers, sent back with the checklist. */
  quiz?: { q: string; a: 'yes' | 'unsure' | 'no' }[]
  campaign_id: string; variant: string; consent_text: string; page: string
  attribution: { session?: string; source?: string; campaign?: string } | null; emailStatus: string
}): Promise<CaptureResult> {
  const data = await loadChecklist(b.funnel, b.product)
  if (!data) throw new Error('Unknown product')
  const base = siteUrl().replace(/\/$/, '')
  const path = `${base}/${b.funnel === 'training' ? 'staff-training' : 'care-policies'}/${b.product}`
  const productName = b.funnel === 'training' ? `${data.title} training` : data.title

  // A lock-in needs an offer on this product today; without one the visitor gets the checklist.
  let kind = b.kind
  let lock: CaptureResult['lock']
  if (kind === 'lockin') {
    const offer = offerOn(await getOffers(), b.funnel, b.product)
    if (!offer) kind = 'checklist'
    else {
      const expires = new Date(Date.now() + LOCK_DAYS * 86400000)
      const rows = await (prisma as any).$queryRawUnsafe(
        `insert into public.shop_offer_locks (email, funnel, product, offer_key, offer, expires_at)
         values ($1, $2, $3, $4, $5::jsonb, $6) returning token`,
        b.email, b.funnel, b.product, offer.key, JSON.stringify(offer), expires) as any[]
      lock = { token: rows[0].token, expires_on: expires.toISOString().slice(0, 10), label: offer.label ?? offer.name }
    }
  }

  const unsubscribe = await reportSubscriber({
    email: b.email, name: b.name, funnel: b.funnel, product: b.product, campaign_id: b.campaign_id,
    variant: b.variant, kind, consent_text: b.consent_text, email_status: b.emailStatus,
    session: b.attribution?.session, source: b.attribution?.source, campaign: b.attribution?.campaign,
  })
  const unsubscribeUrl = unsubscribe
    ? `https://trg-funnel-insights.vercel.app/api/unsubscribe?t=${unsubscribe}`
    : `${base}/contact?about=Unsubscribe`

  if (kind === 'lockin' && lock) {
    const offer = (await lockOffer(lock.token))!
    await sendOfferLockEmail({
      to: b.email, name: b.name, productName, link: `${path}?lock=${lock.token}&utm_source=carestream&utm_medium=email&utm_campaign=capture_lockin`,
      offerLabel: lock.label, offerHeadline: offer.headline ?? '', expiresOn: lock.expires_on, unsubscribeUrl,
    })
  } else {
    const pdf = await checklistPdf(data)
    await sendChecklistEmail({
      to: b.email, name: b.name, productName, funnel: b.funnel, pdf, filename: `${b.product}-checklist.pdf`,
      link: `${path}?utm_source=carestream&utm_medium=email&utm_campaign=capture_${kind === 'quiz' ? 'quiz' : 'checklist'}`, unsubscribeUrl,
      quiz: kind === 'quiz' ? b.quiz : undefined,
      requiredCount: data.funnel === 'policies' ? data.regulations.reduce((n, r) => n + r.elements.length, 0) : undefined,
    })
  }
  return { kind, ...(lock ? { lock } : {}) }
}

/** The two capture emails (a course checklist, a policy checklist, an offer lock) to the platform
 *  owner, as a visitor would get them, without adding anyone to the list. */
export async function sendCapturePreview(to: string): Promise<Record<string, unknown>> {
  const base = siteUrl().replace(/\/$/, '')
  const sent: string[] = []
  for (const [funnel, slug] of [['training', 'care-certificate'], ['policies', 'fire-safety']] as const) {
    const data = await loadChecklist(funnel, slug)
    if (!data) continue
    const productName = funnel === 'training' ? `${data.title} training` : data.title
    await sendChecklistEmail({
      to, name: 'Sam Taylor', productName, funnel, pdf: await checklistPdf(data), filename: `${slug}-checklist.pdf`,
      link: `${base}/${funnel === 'training' ? 'staff-training' : 'care-policies'}/${slug}`, unsubscribeUrl: `${base}/contact?about=Unsubscribe`,
    })
    sent.push(`checklist ${slug}`)
    const offer = offerOn(await getOffers(), funnel, slug)
    if (offer) {
      const until = new Date(Date.now() + LOCK_DAYS * 86400000).toISOString().slice(0, 10)
      await sendOfferLockEmail({
        to, name: 'Sam Taylor', productName, link: `${base}/${funnel === 'training' ? 'staff-training' : 'care-policies'}/${slug}`,
        offerLabel: offer.label ?? offer.name, offerHeadline: offer.headline ?? '', expiresOn: until, unsubscribeUrl: `${base}/contact?about=Unsubscribe`,
      })
      sent.push(`lock-in ${slug}`)
    }
  }
  return { sent }
}
