import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { sendLpSubmissionEmail } from '../services/email/outbound'

// Public, unauthenticated landing-page system endpoints (demos.carestreamai.com).
// Mounted BEFORE requireAuth in app.ts. Only active pages are exposed.
export const lpPublicRouter = Router()

const PRODUCT = 'carestream'

// GET /public/lp/:campaign — active landing page content + tracking config
lpPublicRouter.get('/:campaign', async (req: Request, res: Response) => {
  const campaign = String(req.params.campaign ?? '')
  try {
    const page = await (prisma as any).landingPage.findFirst({
      where: { product_slug: PRODUCT, campaign_slug: campaign, is_active: true },
    })
    if (!page) { err(res, 'NOT_FOUND', 'Landing page not found.', 404); return }
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=600')
    ok(res, {
      id:               page.id,
      product_slug:     page.product_slug,
      campaign_slug:    page.campaign_slug,
      noindex:          page.noindex,
      conversion_type:  page.conversion_type,
      meta_title:       page.meta_title,
      meta_description: page.meta_description,
      og_image_url:     page.og_image_url,
      variant_group:    page.variant_group,
      variant_label:    page.variant_label,
      tracking: {
        ga4_measurement_id:          page.ga4_measurement_id,
        google_ads_conversion_id:    page.google_ads_conversion_id,
        google_ads_conversion_label: page.google_ads_conversion_label,
        meta_pixel_id:               page.meta_pixel_id,
        meta_event_name:             page.meta_event_name,
        linkedin_partner_id:         page.linkedin_partner_id,
        linkedin_conversion_id:      page.linkedin_conversion_id,
      },
      content: page.content,
    })
  } catch (e: any) {
    err(res, 'INTERNAL_ERROR', e?.message ?? 'failed', 500)
  }
})

const leadSchema = z.object({
  landing_page_id:      z.string().min(1),
  company_website:      z.string().optional(),                 // honeypot — must stay empty
  data:                 z.record(z.string(), z.any()),
  utm_source:           z.string().max(200).optional().nullable(),
  utm_medium:           z.string().max(200).optional().nullable(),
  utm_campaign:         z.string().max(200).optional().nullable(),
  utm_term:             z.string().max(200).optional().nullable(),
  utm_content:          z.string().max(200).optional().nullable(),
  gclid:                z.string().max(400).optional().nullable(),
  fbclid:               z.string().max(400).optional().nullable(),
  referrer:             z.string().max(1000).optional().nullable(),
  page_url:             z.string().max(1000).optional().nullable(),
  viewport:             z.string().max(40).optional().nullable(),
  device_type:          z.string().max(20).optional().nullable(),
  time_on_page_seconds: z.number().int().nonnegative().optional().nullable(),
  scroll_depth_pct:     z.number().int().min(0).max(100).optional().nullable(),
  variant_group:        z.string().max(120).optional().nullable(),
  variant_label:        z.string().max(120).optional().nullable(),
})

// POST /public/lp/leads — conversion form submission
lpPublicRouter.post('/leads', async (req: Request, res: Response) => {
  const parsed = leadSchema.safeParse(req.body ?? {})
  if (!parsed.success) { err(res, 'INVALID_INPUT', 'Please check the form and try again.', 400); return }
  const d = parsed.data

  // Honeypot: bots fill the hidden field. Accept silently, persist nothing.
  if (d.company_website && d.company_website.trim() !== '') { ok(res, { received: true }); return }

  try {
    const page = await (prisma as any).landingPage.findUnique({ where: { id: d.landing_page_id } })
    if (!page || !page.is_active) { err(res, 'NOT_FOUND', 'Landing page not found.', 404); return }

    const submission = await (prisma as any).lpSubmission.create({
      data: {
        landing_page_id:      page.id,
        data:                 d.data,
        utm_source:           d.utm_source ?? null,
        utm_medium:           d.utm_medium ?? null,
        utm_campaign:         d.utm_campaign ?? null,
        utm_term:             d.utm_term ?? null,
        utm_content:          d.utm_content ?? null,
        gclid:                d.gclid ?? null,
        fbclid:               d.fbclid ?? null,
        referrer:             d.referrer ?? null,
        page_url:             d.page_url ?? null,
        viewport:             d.viewport ?? null,
        device_type:          d.device_type ?? null,
        time_on_page_seconds: d.time_on_page_seconds ?? null,
        scroll_depth_pct:     d.scroll_depth_pct ?? null,
        variant_group:        d.variant_group ?? page.variant_group ?? null,
        variant_label:        d.variant_label ?? page.variant_label ?? null,
        user_agent:           String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
        ip_address:           String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || null,
      },
    })

    // Notify owner — best effort, never block the response on email delivery.
    sendLpSubmissionEmail({
      campaignSlug:     page.campaign_slug,
      additionalEmails: Array.isArray(page.additional_notification_emails) ? page.additional_notification_emails : [],
      data:             d.data,
      attribution:      { utm_source: d.utm_source, utm_medium: d.utm_medium, utm_campaign: d.utm_campaign, gclid: d.gclid, page_url: d.page_url },
      submissionId:     submission.id,
    }).catch(e => console.error('[lp] notification email failed:', (e as Error)?.message))

    ok(res, { received: true })
  } catch (e: any) {
    console.error('[lp] failed to persist submission:', e?.message)
    err(res, 'INTERNAL_ERROR', 'Could not submit right now, please try again.', 500)
  }
})

const eventsSchema = z.object({
  landing_page_id: z.string().min(1),
  session_id:      z.string().min(1).max(100),
  events: z.array(z.object({
    event_type: z.string().min(1).max(40),
    field_name: z.string().max(100).optional().nullable(),
    metadata:   z.any().optional(),
  })).min(1).max(50),
})

// POST /public/lp/events — batched engagement events (never errors back to the page)
lpPublicRouter.post('/events', async (req: Request, res: Response) => {
  const parsed = eventsSchema.safeParse(req.body ?? {})
  if (!parsed.success) { res.status(204).end(); return }
  const d = parsed.data
  try {
    await (prisma as any).lpEvent.createMany({
      data: d.events.map(ev => ({
        landing_page_id: d.landing_page_id,
        session_id:      d.session_id,
        event_type:      ev.event_type,
        field_name:      ev.field_name ?? null,
        metadata:        ev.metadata ?? null,
      })),
    })
  } catch (e) {
    console.error('[lp-events] failed:', (e as Error)?.message)
  }
  res.status(204).end()
})
