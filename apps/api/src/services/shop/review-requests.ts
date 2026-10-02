import { prisma } from '../../db/client'
import { sendReviewRequestEmail } from '../email/outbound'
import { reportReview } from '../analytics/funnel-insights'
import { siteUrl } from '../../lib/urls'

// Review requests. Seven days after a training order (time to start the course, not long enough
// to forget it), the buyer gets ONE email asking how it went, linking to /review?t=<token>. What
// they write goes to Funnel Insights › Feedback, where Len approves it; nothing reaches the site
// without the buyer's consent and that approval. Never a reminder, never twice for one order.
//
// Sending is off unless REVIEW_REQUESTS_LIVE=1, and the pg_cron job is only scheduled once Len has
// approved the email (the preview job sends him one). Approved and switched on 2 Oct 2026.

type Funnel = 'training'

// Our own test orders, and any order older than this, are never asked.
const SKIP_DOMAINS = ['trgdigital.co.uk', 'crosswayscarehome.co.uk', 'trogoncricket.com', 'carestreamai.com', 'example.com']
const skipped = (email: string) => SKIP_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`))
  || (process.env.REVIEW_REQUEST_SKIP ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase())

// Paid orders (one per Stripe payment) between 7 and 21 days old, not refunded, not yet asked.
// The buyer is the account's first admin: the person whose email the order created or joined.
const DUE = `
  select l.stripe_payment_id, min(l.module_slug) as slug, min(l.module_name) as name, count(*)::int as qty,
         count(distinct l.module_slug)::int as courses, min(t.name) as org,
         (select u.email from public.users u where u.tenant_id::text = min(l.tenant_id::text) and u.role = 'admin'
          order by u.created_at limit 1) as email,
         (select u.name from public.users u where u.tenant_id::text = min(l.tenant_id::text) and u.role = 'admin'
          order by u.created_at limit 1) as buyer
  from public.training_licenses l
  join public.tenants t on t.id::text = l.tenant_id::text
  where l.stripe_payment_id is not null and l.status <> 'refunded'
    and l.purchased_at < now() - interval '7 days' and l.purchased_at > now() - interval '21 days'
    and not exists (select 1 from public.shop_review_requests r where r.stripe_payment_id = l.stripe_payment_id)
  group by l.stripe_payment_id
  limit 40`

const reviewUrl = (token: string) => `${siteUrl()}/review?t=${encodeURIComponent(token)}`

export async function runReviewRequests(): Promise<Record<string, unknown>> {
  if (process.env.REVIEW_REQUESTS_LIVE !== '1') return { disabled: true }
  const due = await (prisma as any).$queryRawUnsafe(DUE) as any[]
  const out = { due: due.length, sent: 0, skipped: 0, errors: 0 }
  for (const d of due) {
    if (!d.email || skipped(d.email)) { out.skipped++; continue }
    try {
      // Claim the order first (unique on the payment), so two runs can never both send.
      const rows = await (prisma as any).$queryRawUnsafe(
        `insert into public.shop_review_requests (stripe_payment_id, funnel, email, name, org, product_slug, product_name)
         values ($1, 'training', $2, $3, $4, $5, $6) on conflict (stripe_payment_id) do nothing returning token`,
        d.stripe_payment_id, d.email, d.buyer ?? null, d.org ?? null, d.slug,
        d.courses > 1 ? 'your CareStream training' : d.name) as any[]
      if (!rows.length) continue
      await sendReviewRequestEmail({ to: d.email, name: d.buyer ?? '', productName: d.courses > 1 ? 'your CareStream training' : d.name, link: reviewUrl(rows[0].token) })
      await (prisma as any).$executeRawUnsafe(`update public.shop_review_requests set sent_at = now() where token = $1`, rows[0].token)
      out.sent++
    } catch (e) {
      out.errors++
      console.error('[review-requests]', d.stripe_payment_id, (e as Error)?.message)
    }
  }
  return out
}

/** The email as a buyer would get it, to the platform owner for approval. Its link opens the form
 *  in preview, where a submission is not saved. */
export async function sendReviewRequestPreview(to: string): Promise<Record<string, unknown>> {
  await sendReviewRequestEmail({
    to, name: 'Sam Taylor', productName: 'Care Certificate', link: reviewUrl('preview'),
    subjectPrefix: '[Preview] ',
  })
  return { sent: to }
}

export type ReviewRequest = { productName: string; productSlug: string; name: string; org: string; done: boolean; preview?: boolean }

export async function reviewRequestByToken(token: string): Promise<ReviewRequest | null> {
  if (token === 'preview') return { productName: 'Care Certificate', productSlug: 'care-certificate', name: 'Sam Taylor', org: 'Oakhaven Care Home', done: false, preview: true }
  if (!/^[a-f0-9]{32}$/.test(token)) return null
  const rows = await (prisma as any).$queryRawUnsafe(
    `select product_name, product_slug, name, org, submitted_at from public.shop_review_requests where token = $1`, token) as any[]
  const r = rows[0]
  return r ? { productName: r.product_name, productSlug: r.product_slug, name: r.name ?? '', org: r.org ?? '', done: !!r.submitted_at } : null
}

/** Saves a buyer's review to Funnel Insights. One per order: a second submission replaces the
 *  first (same ref), so a buyer can correct a typo from the same link. */
export async function submitReview(token: string, r: {
  rating: number; body: string; displayName: string; setting: string; consent: boolean
}): Promise<'ok' | 'preview' | 'unknown'> {
  if (token === 'preview') return 'preview'
  if (!/^[a-f0-9]{32}$/.test(token)) return 'unknown'
  // Kept here too, so a review is never lost if Funnel Insights cannot be reached.
  const rows = await (prisma as any).$queryRawUnsafe(
    `update public.shop_review_requests
       set submitted_at = now(), rating = $2, body = $3, display_name = nullif($4, ''), setting = nullif($5, ''), consent = $6
     where token = $1
     returning id, funnel, product_slug, product_name`,
    token, r.rating, r.body, r.displayName, r.setting, r.consent) as any[]
  const q = rows[0]
  if (!q) return 'unknown'
  const reported = await reportReview({
    ref: String(q.id), funnel: q.funnel as Funnel, product: q.product_slug, productTitle: q.product_name,
    rating: r.rating, body: r.body, displayName: r.displayName, setting: r.setting, consent: r.consent,
  })
  if (reported) await (prisma as any).$executeRawUnsafe(`update public.shop_review_requests set reported_at = now() where id = $1::uuid`, q.id)
  return 'ok'
}
