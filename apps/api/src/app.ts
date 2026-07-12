import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth'
import { feedbackRouter } from './routes/feedback'
import { policiesRouter } from './routes/policies'
import { queryRouter } from './routes/query'
import { usersRouter } from './routes/users'
import { meRouter } from './routes/me'
import { emailRouter } from './routes/email'
import { whatsappRouter } from './routes/whatsapp'
import { billingRouter, stripeWebhookHandler } from './routes/billing'
import { regulationsRouter } from './routes/regulations'
import { analyticsRouter } from './routes/analytics'
import { adminRouter } from './routes/admin'
import { onboardingTemplatesRouter } from './routes/onboarding-templates'
import { policySeedsRouter } from './routes/policy-seeds'
import { platformGlossaryRouter } from './routes/platform-glossary'
import { platformTranslationChangesRouter } from './routes/platform-translation-changes'
import { platformPolicyGapsRouter } from './routes/platform-policy-gaps'
import { translationSuggestionsRouter } from './routes/translation-suggestions'
import { settingsRouter } from './routes/settings'
import { knowledgeRouter } from './routes/knowledge'
import { sitesRouter } from './routes/sites'
import { onboardingRouter } from './routes/onboarding'
import { trainingRouter } from './routes/training'
import { faceToFaceRouter } from './routes/face-to-face'
import { workforceRouter } from './routes/workforce'
import { cqcQuestionsRouter } from './routes/cqc-staff-questions'
import { auditsRouter } from './routes/audits'
import { featureRequestsRouter } from './routes/feature-requests'
import { publicBlogRouter } from './routes/blog-public'
import { publicTrainingRouter } from './routes/training-public'
import { publicTrainingReviewRouter } from './routes/training-review-public'
import { publicPolicyReviewRouter } from './routes/policy-review-public'
import { publicPagesRouter } from './routes/pages-public'
import { publicImageAltsRouter } from './routes/image-alts'
import { marketingPublicRouter } from './routes/marketing-public'
import { onboardingPublicRouter } from './routes/onboarding-public'
import { lpPublicRouter } from './routes/lp-public'
import { agentActionsRouter } from './routes/agent-actions'
import { cronRouter } from './routes/cron'
import { standardTrainingRouter } from './routes/standard-training'
import { seedTrainingModulesIfEmpty } from './lib/seed-training'
import { sendRenewalReminders } from './services/training/renewalReminders'
import { requireAuth } from './middleware/auth'
import { tenantGuard } from './middleware/tenantGuard'
import { apiLimiter } from './middleware/rateLimiter'

const app = express()
const PORT = process.env.PORT || 4000

// Required for express-rate-limit and correct IP detection behind Vercel's proxy
app.set('trust proxy', 1)

app.use(helmet())
const allowedOrigins = (process.env.WEB_URL ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// Any carestreamai.com origin (apex + subdomains: www, demos, etc.)
const CARESTREAM_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?carestreamai\.com$/

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl)
    if (!origin) return cb(null, true)
    // In development, allow any localhost port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    // Allow first-party subdomains (e.g. demos.carestreamai.com landing pages)
    if (CARESTREAM_ORIGIN.test(origin)) return cb(null, true)
    cb(new Error(`CORS: origin not allowed — ${origin}`))
  },
  credentials: true,
}))

// Serve locally-uploaded files (blog images in dev when S3 is not configured)
const LOCAL_UPLOAD_DIR = process.env.LOCAL_STORAGE_DIR ?? '/tmp/carestreamai'
app.use('/uploads', express.static(LOCAL_UPLOAD_DIR))

// §10.6 — Stripe webhook must receive the raw body for signature verification.
// Mount before express.json() so the Buffer is preserved.
app.post('/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler)

// Larger limit so the CMS can save page content (HTML body) and rich text.
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: false, limit: '5mb' })) // Twilio webhooks send form-encoded payloads

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// §12.1 — Public routes (auth has its own tighter limiter applied inside the router)
app.use('/auth', authRouter)

// §6.5 — Platform admin routes. Uses PLATFORM_ADMIN_TOKEN, not tenant JWTs.
// Must be mounted BEFORE requireAuth so it isn't rejected as an unauthenticated request.
app.use('/admin/onboarding-templates', onboardingTemplatesRouter)
app.use('/admin/standard-training', standardTrainingRouter)
app.use('/admin/policy-seeds', policySeedsRouter)
app.use('/admin/platform-glossary', platformGlossaryRouter)
app.use('/admin/translation-changes', platformTranslationChangesRouter)
app.use('/admin/policy-gaps', platformPolicyGapsRouter)
app.use('/admin', adminRouter)

// §8.1 — SendGrid Inbound Parse webhook. Unauthenticated — auth is handled
// inside the service (sender looked up against tenant staff list).
// Must be mounted BEFORE requireAuth.
app.use('/email', emailRouter)

// WhatsApp inbound webhook (Twilio). Unauthenticated at the Express layer —
// Twilio signature validation is applied inside the router in production.
// Must be mounted BEFORE requireAuth.
app.use('/whatsapp', whatsappRouter)

// One-click feedback links from email/WhatsApp — no auth required, HMAC-verified.
// Must be mounted BEFORE requireAuth.
app.use('/feedback', feedbackRouter)

// Onboarding email drip: unsubscribe + SendGrid event webhook, no auth. BEFORE requireAuth.
app.use('/onboarding', onboardingPublicRouter)

// Public marketing blog — published posts only, no auth. Must be mounted BEFORE requireAuth.
app.use('/public/blog', publicBlogRouter)

// Public training-module illustrations (no tenant data), no auth. Must be mounted BEFORE requireAuth.
app.use('/public/training', publicTrainingRouter)

// Public external review/sign-off of standard modules (password-gated), no auth. BEFORE requireAuth.
app.use('/public/training-review', publicTrainingReviewRouter)

// Public external review of an updated policy via one-off token link, no auth. BEFORE requireAuth.
app.use('/public/policy-review', publicPolicyReviewRouter)

// TEMPORARY: one-off preview send of the external-decision admin emails to a fixed inbox,
// secret-gated. Remove after use. Sends to a hardcoded address only (cannot be used to spam).
app.get('/public/__pol-email-preview', async (req, res) => {
  if (req.query.k !== 'cs-emailpreview-a91f4c7d2e8b46f0b1553c9d') { res.status(404).end(); return }
  try {
    const { buildExternalDecisionEmail } = await import('./services/analytics/policy-adoption')
    const { sendTrainingUpdateEmail } = await import('./services/email/outbound')
    const to = 'len@crosswayscarehome.co.uk'
    const orgName = 'Ferndale Nursing Home'
    const a = buildExternalDecisionEmail('approved', { policyName: 'Consent To Care And Treatment Policy', who: 'Dr Sarah Whitfield', version: '2.0', comment: '' })
    const r = buildExternalDecisionEmail('rejected', { policyName: 'Consent To Care And Treatment Policy', who: 'Dr Sarah Whitfield', version: '', comment: 'Please add a clear reference to the Mental Capacity Act 2005 in section 3, and name the responsible person for obtaining consent.' })
    await sendTrainingUpdateEmail({ to, name: 'Len', orgName, subject: a.subject, bodyHtml: a.bodyHtml })
    await sendTrainingUpdateEmail({ to, name: 'Len', orgName, subject: r.subject, bodyHtml: r.bodyHtml })
    res.json({ ok: true, sent: 2 })
  } catch (e: any) { res.status(500).json({ ok: false, error: e?.message }) }
})

// Public marketing page SEO metadata — published pages only, no auth. Must be mounted BEFORE requireAuth.
app.use('/public/site-pages', publicPagesRouter)

// Public alt-text map for static site images, no auth. Must be mounted BEFORE requireAuth.
app.use('/public/image-alts', publicImageAltsRouter)

// Public marketing leads (contact/demo forms) + WebMCP agent-event tracking, no auth.
// Must be mounted BEFORE requireAuth.
app.use('/public/marketing', marketingPublicRouter)

// Public landing page system (demos.carestreamai.com), no auth. BEFORE requireAuth.
app.use('/public/lp', lpPublicRouter)

// Vercel Cron jobs — self-authorise via x-vercel-cron header / CRON_SECRET.
// Must be mounted BEFORE requireAuth.
app.use('/cron', cronRouter)

// §11.1 — All routes below require a valid JWT + tenant context.
// apiLimiter: 100 req/min per user.
// tenantGuard: rejects requests where any supplied tenant_id ≠ JWT claim.
app.use(apiLimiter)
app.use(requireAuth)
app.use(tenantGuard)

app.use('/policies', policiesRouter)
app.use('/query', queryRouter)
app.use('/users', usersRouter)
app.use('/me', meRouter)
app.use('/billing', billingRouter)
app.use('/analytics', analyticsRouter)
app.use('/regulations', regulationsRouter)
app.use('/settings', settingsRouter)
app.use('/translation-suggestions', translationSuggestionsRouter)
app.use('/knowledge', knowledgeRouter)
app.use('/sites', sitesRouter)
app.use('/onboarding', onboardingRouter)
app.use('/training', trainingRouter)
app.use('/face-to-face', faceToFaceRouter)
app.use('/workforce', workforceRouter)
app.use('/cqc-questions', cqcQuestionsRouter)
app.use('/audits', auditsRouter)
app.use('/feature-requests', featureRequestsRouter)
app.use('/agent-actions', agentActionsRouter)

seedTrainingModulesIfEmpty()

// Daily renewal reminder scheduler — fires at midnight, reschedules itself
function scheduleMidnightReminders(): void {
  const now  = new Date()
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 1, 0, 0)  // 00:01 to avoid exact-midnight edge cases
  const msUntilMidnight = next.getTime() - now.getTime()

  setTimeout(() => {
    sendRenewalReminders().catch(e =>
      console.error('[scheduler] Renewal reminder run failed:', e)
    )
    scheduleMidnightReminders()
  }, msUntilMidnight)

  console.log(`[scheduler] Next renewal reminder run in ${Math.round(msUntilMidnight / 60000)} minutes`)
}

// Express 4 error handler — catches any error passed to next(err) or thrown in sync handlers.
// Async handlers must use try/catch and call next(err), but this catches anything that slips through.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[express-error]', err?.message ?? err)
  if (!res.headersSent) res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } })
})

// Prevent unhandled async errors from crashing the process in Express 4.
// Route handlers should use try/catch, but this is the last-resort guard.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Caught unhandled promise rejection:', reason)
})

app.listen(PORT, () => {
  console.log(`CareStreamAI API running on port ${PORT}`)
  scheduleMidnightReminders()
})

export default app
