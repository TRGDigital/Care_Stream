// §8.5 — Outbound email via SendGrid.
// Sets correct thread headers (In-Reply-To, References) so replies land in the same thread.

import sgMail from '@sendgrid/mail'
import { signFeedbackToken } from '../../lib/feedback-token'
import { siteUrl } from '../../lib/urls'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WEB_URL        = siteUrl()
const LOGO_URL       = `${WEB_URL}/logo-color.png`

// Brand colours
const PURPLE       = '#9B52B5'
const PURPLE_DARK  = '#7A3D9A'
const NEUTRAL_DARK = '#1A1530'
const NEUTRAL_MID  = '#5E4D70'

// Lazy initialisation — API key may not be set in test environments.
let initialised = false
function ensureInitialised(): void {
  if (!initialised && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    initialised = true
  }
}

// ─── Shared header / footer ───────────────────────────────────────────────────

function emailHeader(): string {
  return `
  <div style="background:linear-gradient(135deg,#1A0830 0%,#3D1460 40%,#9B52B5 100%);padding:28px 32px;border-radius:10px 10px 0 0;text-align:center">
    <img src="${LOGO_URL}" alt="CareStreamAI" height="64" style="display:inline-block;height:64px;max-width:260px">
  </div>`
}

function emailFooter(orgName?: string): string {
  const text = orgName
    ? `This email was sent on behalf of <strong>${orgName}</strong> via CareStreamAI. If you were not expecting this, please contact your administrator.`
    : `The CareStreamAI Team &mdash; Powered by TRG Digital`
  return `
  <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:32px">
    <p style="margin:0;font-size:12px;color:#9ca3af">${text}</p>
  </div>`
}

function emailWrapper(content: string): string {
  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
  ${emailHeader()}
  <div style="padding:32px 32px 24px">
    ${content}
  </div>
</div>`.trim()
}

// ─── Reply ────────────────────────────────────────────────────────────────────

export interface SendReplyOptions {
  to:            string
  subject:       string
  htmlBody:      string
  threadId:      string
  citations:     Array<{ policy_name: string; version: number }>
  staffFirstName: string
  queryId?:      string
}

export async function sendEmailReply(opts: SendReplyOptions): Promise<void> {
  ensureInitialised()

  const from    = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const subject = buildSubject(opts.subject)
  const html    = buildHtmlEmail(opts.staffFirstName, opts.htmlBody, opts.citations, opts.queryId)

  await sgMail.send({
    to:   opts.to,
    from,
    subject,
    html,
    headers: {
      'In-Reply-To': `<${opts.threadId}>`,
      'References':  `<${opts.threadId}>`,
    },
  })
}

// ─── Rejection (unknown sender) ───────────────────────────────────────────────

export async function sendRejectionEmail(to: string, subject: string): Promise<void> {
  ensureInitialised()

  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Thank you for your email. Unfortunately we were unable to verify your email address
      against the staff records for this organisation.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 32px">
      If you believe this is an error, please ask your manager or care home administrator
      to ensure your email address is registered on CareStreamAI.
    </p>
    ${emailFooter()}
  `)

  await sgMail.send({
    to,
    from,
    subject: `Re: ${subject}`,
    html,
  })
}

// ─── Email verification ───────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string): Promise<void> {
  ensureInitialised()

  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping verification email')
    return
  }

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = name.split(' ')[0] ?? name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Thanks for signing up to CareStreamAI. Please verify your email address to activate your account.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="${verificationUrl}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Verify my email address
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px">
      This link expires in <strong>24 hours</strong>. If you did not create a CareStreamAI account, you can safely ignore this email.
    </p>

    <p style="color:#9ca3af;font-size:12px;margin:0">
      If the button above does not work, copy and paste this link into your browser:<br>
      <span style="color:${PURPLE}">${verificationUrl}</span>
    </p>

    ${emailFooter()}
  `)

  await sgMail.send({
    to,
    from,
    subject: 'Verify your CareStreamAI email address',
    html,
  })
}

// ─── New-account notification to the platform owner ─────────────────────────────
// Sent whenever a new tenant registers. Recipient defaults to len@carestreamai.com
// (override with PLATFORM_NOTIFY_EMAIL).
export async function sendNewTenantNotification(opts: {
  orgName: string; adminName: string; adminEmail: string; accountNumber: string; slug: string; planName?: string | null
}): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping new-tenant notification'); return }

  const to   = process.env.PLATFORM_NOTIFY_EMAIL ?? 'len@carestreamai.com'
  const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const esc  = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
  const row  = (k: string, v: string) => `<tr><td style="padding:5px 16px 5px 0;color:#6b7280;font-size:13px;white-space:nowrap">${k}</td><td style="padding:5px 0;color:${NEUTRAL_DARK};font-size:13px;font-weight:600">${esc(v)}</td></tr>`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:16px;font-weight:700;margin:0 0 6px">🎉 New CareStream account</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 18px">A new organisation has just registered on CareStreamAI.</p>
    <table style="border-collapse:collapse;margin:0 0 22px">
      ${row('Organisation', opts.orgName)}
      ${row('Account number', opts.accountNumber)}
      ${row('Plan', opts.planName ?? '—')}
      ${row('Admin', opts.adminName)}
      ${row('Admin email', opts.adminEmail)}
      ${row('Slug', opts.slug)}
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:0">Open the platform console → Clients to view the account.</p>
    ${emailFooter()}
  `)

  await sgMail.send({ to, from, subject: `New CareStream account: ${opts.orgName} (${opts.accountNumber})`, html })
}

// ─── Passwordless sign-in link (magic link) ───────────────────────────────────

export async function sendStaffLoginLinkEmail(opts: { to: string; name: string; link: string; expiresMins: number }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping sign-in link email')
    return
  }
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = (opts.name || '').split(' ')[0] || 'there'
  const hrs = opts.expiresMins >= 60 ? `${Math.round(opts.expiresMins / 60)} hours` : `${opts.expiresMins} minutes`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Tap the button below to sign in to CareStream — no password needed.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="${opts.link}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Sign in to CareStream
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px">
      This link works once and expires in <strong>${hrs}</strong>. Once you're in, add CareStream to your home screen so it opens like an app. If you didn't request this, you can ignore it.
    </p>

    <p style="color:#9ca3af;font-size:12px;margin:0">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color:${PURPLE}">${opts.link}</span>
    </p>

    ${emailFooter()}
  `)

  await sgMail.send({ to: opts.to, from, subject: 'Your CareStream sign-in link', html })
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  ensureInitialised()

  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping password reset email')
    return
  }

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = name.split(' ')[0] ?? name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      We received a request to reset the password for your CareStreamAI account.
      Click the button below to choose a new password.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="${resetUrl}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Reset my password
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px">
      This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not change.
    </p>

    <p style="color:#9ca3af;font-size:12px;margin:0">
      If the button above does not work, copy and paste this link into your browser:<br>
      <span style="color:${PURPLE}">${resetUrl}</span>
    </p>

    ${emailFooter()}
  `)

  await sgMail.send({
    to,
    from,
    subject: 'Reset your CareStreamAI password',
    html,
  })
}

// ─── Training update notification ────────────────────────────────────────────

export interface SendTrainingUpdateOptions {
  to:       string
  name:     string
  orgName:  string
  subject:  string
  bodyHtml: string
}

export async function sendTrainingUpdateEmail(opts: SendTrainingUpdateOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.name.split(' ')[0] ?? opts.name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    ${opts.bodyHtml}
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: opts.subject, html })
}

// ─── Audit update notification ────────────────────────────────────────────────

export interface SendAuditUpdateOptions {
  to:       string
  name:     string
  orgName:  string
  subject:  string
  bodyHtml: string
}

export async function sendAuditUpdateEmail(opts: SendAuditUpdateOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.name.split(' ')[0] ?? opts.name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    ${opts.bodyHtml}
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: opts.subject, html })
}

// ─── CQC staff prep notification ─────────────────────────────────────────────

export interface SendCqcPrepOptions {
  to:           string
  name:         string
  orgName:      string
  questionCount: number
  portalUrl:    string
}

export async function sendCqcPrepEmail(opts: SendCqcPrepOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.name.split(' ')[0] ?? opts.name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      You have <strong>${opts.questionCount} new CQC preparation ${opts.questionCount === 1 ? 'question' : 'questions'}</strong> assigned to you.
      Take a few minutes to review and prepare your answers before the next inspection.
    </p>
    <div style="text-align:center;margin:0 0 32px">
      <a href="${opts.portalUrl}/cqc"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        View my CQC questions
      </a>
    </div>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({
    to:   opts.to,
    from,
    subject: `You have ${opts.questionCount} new CQC prep ${opts.questionCount === 1 ? 'question' : 'questions'} — ${opts.orgName}`,
    html,
  })
}

// ─── Onboarding notification ──────────────────────────────────────────────────

export interface SendOnboardingUpdateOptions {
  to:        string
  name:      string
  orgName:   string
  subject:   string
  bodyHtml:  string
  portalUrl: string
}

export async function sendOnboardingUpdateEmail(opts: SendOnboardingUpdateOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.name.split(' ')[0] ?? opts.name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    ${opts.bodyHtml}
    <div style="text-align:center;margin:0 0 32px">
      <a href="${opts.portalUrl}/chat?view=induction"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Start my induction
      </a>
    </div>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: opts.subject, html })
}

// ─── Staff allocation notification (training / annual training) ───────────────
// Sent to a staff member when an admin assigns them work, with a deep link to the
// relevant section of the staff hub.

export type AllocationKind = 'induction' | 'training' | 'annual_training' | 'cqc_prep' | 'follow_up'

const ALLOC_COPY: Record<AllocationKind, { noun: string; path: string; cta: string }> = {
  induction:       { noun: 'induction',       path: '/chat?view=induction', cta: 'Start my induction' },
  training:        { noun: 'training',         path: '/chat?view=training',  cta: 'Go to my training' },
  annual_training: { noun: 'annual training',  path: '/chat?view=annual',    cta: 'Start annual training' },
  follow_up:       { noun: 'follow-up',        path: '/chat?view=followup',  cta: 'Complete my follow-up' },
  cqc_prep:        { noun: 'CQC prep',          path: '/cqc',                 cta: 'View my CQC questions' },
}

export async function sendStaffAllocationEmail(opts: { to: string; name: string; orgName: string; kind: AllocationKind; portalUrl: string }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return
  const c         = ALLOC_COPY[opts.kind]
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = (opts.name || '').split(' ')[0] || 'there'
  const link      = `${opts.portalUrl.replace(/\/$/, '')}${c.path}`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Your manager has assigned you new <strong>${c.noun}</strong> in CareStream. Open the hub to get started, you can do it on your phone or computer.
    </p>
    <div style="text-align:center;margin:0 0 28px">
      <a href="${link}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        ${c.cta}
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0 0 8px">
      Tip: add CareStream to your phone&rsquo;s home screen so it opens like an app.
    </p>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: `New ${c.noun} assigned to you — ${opts.orgName}`, html })
}

// ─── Staff welcome / credentials email ───────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to:             string
  staffName:      string
  orgName:        string
  tempPassword:   string
  portalUrl:      string
  inboundEmail?:  string | null
  whatsappNumber?: string | null
}

export async function sendStaffWelcomeEmail(opts: SendWelcomeEmailOptions): Promise<void> {
  ensureInitialised()

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('Email is not configured on this server. Please set SENDGRID_API_KEY.')
  }

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.staffName.split(' ')[0] ?? opts.staffName

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
      Your account on <strong>CareStreamAI</strong> has been set up by ${opts.orgName}.
      You can now log in to the staff Chat Hub to get instant answers to policy and procedure questions.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin:0 0 24px">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${NEUTRAL_MID};text-transform:uppercase;letter-spacing:0.05em">Your login details</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px">Portal</td>
          <td style="padding:6px 0;font-size:14px">
            <a href="${opts.portalUrl}" style="color:${PURPLE};font-weight:600">${opts.portalUrl}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280">Username</td>
          <td style="padding:6px 0;font-size:14px;color:${NEUTRAL_DARK};font-weight:500">${opts.to}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280">Password</td>
          <td style="padding:6px 0;font-size:14px;color:${NEUTRAL_DARK};font-family:monospace;font-weight:600;letter-spacing:0.05em">${opts.tempPassword}</td>
        </tr>
      </table>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin:0 0 24px">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${NEUTRAL_MID};text-transform:uppercase;letter-spacing:0.05em">Ways to ask CareStreamAI a question</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px">Web portal</td>
          <td style="padding:6px 0;font-size:14px"><a href="${opts.portalUrl}" style="color:${PURPLE};font-weight:600">${opts.portalUrl}</a></td>
        </tr>
        ${opts.inboundEmail ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280">Email</td>
          <td style="padding:6px 0;font-size:14px;color:${NEUTRAL_DARK};font-weight:500">${opts.inboundEmail}</td>
        </tr>` : ''}
        ${opts.whatsappNumber ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280">WhatsApp</td>
          <td style="padding:6px 0;font-size:14px;color:${NEUTRAL_DARK};font-weight:500">${opts.whatsappNumber}</td>
        </tr>` : ''}
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280;line-height:1.6">Ask in any language by web chat, email, or WhatsApp — you'll get an answer in the same language.</p>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px">
      Once logged in you can ask questions like <em>"What is the medication administration policy?"</em>
      or <em>"What are the fire evacuation procedures?"</em> — CareStreamAI will find the relevant
      information from your organisation's policies instantly.
    </p>

    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 32px">
      If you have any trouble logging in, please speak to your manager or administrator.
    </p>

    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({
    to:      opts.to,
    from,
    subject: `Your CareStreamAI login details — ${opts.orgName}`,
    html,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSubject(original: string): string {
  const base = original.startsWith('Re:') ? original : `Re: ${original}`
  return `${base} — CareStreamAI`
}

function buildHtmlEmail(
  firstName:  string,
  bodyHtml:   string,
  citations:  Array<{ policy_name: string; version: number }>,
  queryId?:   string,
): string {
  const citationText = citations.map(c => `${c.policy_name} (v${c.version})`).join(', ')
  const citationBlock = citations.length > 0
    ? `<p style="color:#666;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
         <strong>Sources referenced:</strong> ${citationText}
       </p>`
    : ''

  const API_BASE = process.env.API_BASE_URL ?? 'https://api.carestreamai.co.uk'
  const feedbackBlock = queryId ? (() => {
    const posSig = signFeedbackToken(queryId, 'positive')
    const negSig = signFeedbackToken(queryId, 'negative')
    const posUrl = `${API_BASE}/feedback/${queryId}/positive?sig=${posSig}`
    const negUrl = `${API_BASE}/feedback/${queryId}/negative?sig=${negSig}`
    return `
    <div style="border-top:1px solid #eee;padding-top:16px;margin-top:24px;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0 0 10px">Was this answer helpful?</p>
      <a href="${posUrl}" style="display:inline-block;margin:0 8px;padding:8px 20px;background:#F5EEFA;border:1px solid #d8b4fe;border-radius:8px;color:${PURPLE_DARK};font-size:13px;font-weight:600;text-decoration:none">👍 Yes, helpful</a>
      <a href="${negUrl}" style="display:inline-block;margin:0 8px;padding:8px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#c2410c;font-size:13px;font-weight:600;text-decoration:none">👎 Could be better</a>
    </div>`
  })() : ''

  return emailWrapper(`
    <p>Hi ${firstName},</p>
    ${bodyHtml}
    ${citationBlock}
    ${feedbackBlock}
    <p style="color:#aaa;font-size:12px;margin-top:32px">
      Just reply to this email to continue the conversation — I'll remember what we discussed.
    </p>
    ${emailFooter()}
  `)
}

// ─── Marketing lead notification ──────────────────────────────────────────────
// Sent to the sales inbox when a contact/demo form is submitted (by a human or an
// AI agent via WebMCP), so leads are never lost. Recipient: SALES_NOTIFICATION_EMAIL,
// falling back to the first PLATFORM_ADMIN_EMAILS entry, then hello@.

export interface SendLeadNotificationOptions {
  type:         'contact' | 'demo'
  source:       'web' | 'agent'
  name:         string
  email:        string
  organisation?: string | null
  role?:        string | null
  phone?:       string | null
  homes?:       string | null
  subject?:     string | null
  message?:     string | null
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

export async function sendLeadNotificationEmail(opts: SendLeadNotificationOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const isDemo = opts.type === 'demo'
  const from = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  // Demo requests go to len@carestreamai.com (overridable); contact enquiries to sales.
  const to = isDemo
    ? (process.env.DEMO_NOTIFICATION_EMAIL ?? 'len@carestreamai.com')
    : (process.env.SALES_NOTIFICATION_EMAIL ??
       (process.env.PLATFORM_ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)[0] ??
       'hello@carestreamai.com')

  const heading = isDemo ? 'New demo request' : 'New contact enquiry'
  const via = opts.source === 'agent' ? ' (submitted by an AI agent via WebMCP)' : ''

  const rows: Array<[string, string | null | undefined]> = [
    ['Name', opts.name],
    ['Email', opts.email],
    ['Organisation', opts.organisation],
    ['Role', opts.role],
    ['Phone', opts.phone],
    ['Homes / locations', opts.homes],
    ['Subject', opts.subject],
    ['Source', opts.source === 'agent' ? 'AI agent (WebMCP)' : 'Website'],
  ]
  const rowsHtml = rows
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:${NEUTRAL_MID};font-size:13px;vertical-align:top"><strong>${k}</strong></td><td style="padding:6px 0;color:${NEUTRAL_DARK};font-size:13px">${esc(String(v))}</td></tr>`)
    .join('')

  const messageHtml = opts.message?.trim()
    ? `<p style="color:${NEUTRAL_MID};font-size:13px;margin:18px 0 6px"><strong>Message</strong></p>
       <p style="color:${NEUTRAL_DARK};font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0">${esc(opts.message)}</p>`
    : ''

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:16px;font-weight:700;margin:0 0 4px">${heading}</p>
    <p style="color:${NEUTRAL_MID};font-size:13px;margin:0 0 18px">A new lead came in via the CareStreamAI website${via}.</p>
    <table style="border-collapse:collapse;width:100%">${rowsHtml}</table>
    ${messageHtml}
    ${emailFooter()}
  `)

  const subjectTag = isDemo ? 'Demo Request' : 'Contact Enquiry'
  const subjectWho = `${opts.name}${opts.organisation ? `, ${opts.organisation}` : ''}`
  await sgMail.send({
    to,
    from,
    replyTo: opts.email,
    subject: `${subjectTag}: ${subjectWho}`,
    html,
  })
}
