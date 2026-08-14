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

// ─── Feature-request notification to the platform owner ─────────────────────────
// Sent whenever a client submits a feature request from Help & Guides.
export async function sendFeatureRequestNotification(opts: {
  tenantName: string; submitterName?: string | null; submitterEmail?: string | null; title: string; details: string
}): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping feature-request notification'); return }

  const to   = process.env.PLATFORM_NOTIFY_EMAIL ?? 'len@carestreamai.com'
  const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const esc  = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
  const row  = (k: string, v: string) => `<tr><td style="padding:5px 16px 5px 0;color:#6b7280;font-size:13px;white-space:nowrap">${k}</td><td style="padding:5px 0;color:${NEUTRAL_DARK};font-size:13px;font-weight:600">${esc(v)}</td></tr>`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:16px;font-weight:700;margin:0 0 6px">💡 New feature request</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 18px">A client has submitted a feature request from Help &amp; Guides.</p>
    <table style="border-collapse:collapse;margin:0 0 16px">
      ${row('Client', opts.tenantName)}
      ${row('From', opts.submitterName ?? '—')}
      ${row('Email', opts.submitterEmail ?? '—')}
      ${row('Title', opts.title)}
    </table>
    <p style="color:#6b7280;font-size:13px;margin:0 0 4px">Details</p>
    <div style="white-space:pre-wrap;color:${NEUTRAL_DARK};font-size:14px;line-height:1.6;background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:12px 14px;margin:0 0 18px">${esc(opts.details)}</div>
    <p style="color:#9ca3af;font-size:12px;margin:0">Open the platform console → Feature Requests to triage it.</p>
    ${emailFooter()}
  `)

  await sgMail.send({ to, from, subject: `Feature request from ${opts.tenantName}: ${opts.title}`, html })
}

// ─── Support / service request (raised from the Guides page) ──────────────────
// Goes to the platform owner, CC's the submitting admin, and carries the tenant's
// CS number so the account is easy to find. The attached image (if any) is inlined.
export async function sendSupportRequestNotification(opts: {
  tenantName: string; csNumber?: string | null
  submitterName?: string | null; submitterEmail?: string | null
  message: string
  image?: { buffer: Buffer; filename: string; type: string } | null
}): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping support-request notification'); return }

  const to        = process.env.PLATFORM_NOTIFY_EMAIL ?? 'len@carestreamai.com'
  const fromEmail = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const from      = { email: fromEmail, name: 'New CareStream Support' }
  const esc  = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
  const line = (k: string, v: string) => `<p style="margin:0 0 4px;font-size:14px;color:${NEUTRAL_DARK}"><strong>${k}:</strong> ${esc(v)}</p>`

  // Deliberately plain, self-contained HTML — no branded full-width card. A fixed-
  // width, overflow:hidden wrapper overlaps the sender's own signature when this
  // email is replied to; a simple top-aligned block keeps replies clean. A matching
  // plain-text part is included for clients that quote text on reply.
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${NEUTRAL_DARK}">
  <p style="margin:0 0 12px">A client has raised a support request from Help &amp; Guides.</p>
  ${line('Client', opts.tenantName)}
  ${line('CS number', opts.csNumber ?? '—')}
  ${line('From', opts.submitterName ?? '—')}
  ${line('Email', opts.submitterEmail ?? '—')}
  ${opts.image ? line('Attachment', opts.image.filename) : ''}
  <p style="margin:14px 0 4px;font-size:14px;color:${NEUTRAL_MID}"><strong>Message</strong></p>
  <div style="white-space:pre-wrap;font-size:14px;color:${NEUTRAL_DARK}">${esc(opts.message)}</div>
  <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Reply to reach ${esc(opts.submitterName ?? 'the client')} directly (they are CC'd). Track it in the platform console under Service Requests.</p>
</div>`.trim()

  const text = [
    'A client has raised a support request from Help & Guides.',
    '',
    `Client: ${opts.tenantName}`,
    `CS number: ${opts.csNumber ?? '-'}`,
    `From: ${opts.submitterName ?? '-'}`,
    `Email: ${opts.submitterEmail ?? '-'}`,
    ...(opts.image ? [`Attachment: ${opts.image.filename}`] : []),
    '',
    'Message:',
    opts.message,
  ].join('\n')

  const msg: Parameters<typeof sgMail.send>[0] = {
    to, from,
    subject: `Support request from ${opts.tenantName}${opts.csNumber ? ` (${opts.csNumber})` : ''}`,
    text,
    html,
  }
  // CC the submitting admin and set reply-to so a reply reaches them.
  if (opts.submitterEmail) { (msg as any).cc = opts.submitterEmail; (msg as any).replyTo = opts.submitterEmail }
  if (opts.image) {
    (msg as any).attachments = [{
      content: opts.image.buffer.toString('base64'),
      filename: opts.image.filename,
      type: opts.image.type,
      disposition: 'attachment',
    }]
  }
  await sgMail.send(msg)
}

// ─── Face-to-face / training payroll report (PDF attachment) ──────────────────
export async function sendF2FPayrollEmail(opts: { to: string; orgName: string; monthLabel: string; pdfBase64: string }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping payroll report email'); return }
  const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 12px">Hi,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 18px">Attached is the training report for <strong>${opts.orgName}</strong> covering <strong>${opts.monthLabel}</strong>. It lists face-to-face, adhoc and annual training allocated and completed in the period, with the owed-pay hours indicator for face-to-face sessions.</p>
    ${emailFooter(opts.orgName)}
  `)
  await sgMail.send({
    to: opts.to, from,
    subject: `Training report for ${opts.orgName}, ${opts.monthLabel}`,
    html,
    attachments: [{ content: opts.pdfBase64, filename: `training-report-${opts.monthLabel.replace(/\s+/g, '-')}.pdf`, type: 'application/pdf', disposition: 'attachment' }],
  })
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

// ─── External policy review invitation ─────────────────────────────────────────
// One-off link to an external person (e.g. a consultant or trustee) to read the
// updated policy and approve it or send feedback. The token gates access.

export async function sendPolicyExternalReviewEmail(opts: {
  to: string; name: string; policyName: string; orgName: string; link: string; changes: number
}): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping policy external review email')
    return
  }
  const fromEmail = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const from      = { email: fromEmail, name: 'CareStream Policies' }
  const firstName = (opts.name || '').split(' ')[0] || 'there'
  const changeLine = opts.changes === 1 ? '1 change' : `${opts.changes} changes`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">
      <strong>${opts.orgName}</strong> would like your approval on an updated policy before it goes live to their team.
    </p>

    <div style="background:#f8f6fb;border:1px solid #ece6f4;border-radius:8px;padding:16px 20px;margin:0 0 24px">
      <p style="color:${NEUTRAL_MID};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 4px">Policy for review</p>
      <p style="color:${NEUTRAL_DARK};font-size:16px;font-weight:600;margin:0 0 2px">${opts.policyName}</p>
      <p style="color:#6b7280;font-size:13px;margin:0">${changeLine} to review</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Open the link below to read the policy, then approve it or send your feedback. Nothing goes live until you have had your say.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="${opts.link}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Review the policy
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;margin:0">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="color:${PURPLE}">${opts.link}</span>
    </p>

    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: `Please review: ${opts.policyName}`, html })
}

// ─── Training licence renewal reminder (training-only tier) ─────────────────────

export async function sendTrainingRenewalEmail(opts: {
  to: string; name: string; manageUrl: string
  items: Array<{ module: string; count: number; due: Date }>
}): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping licence renewal email')
    return
  }
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = (opts.name || '').split(' ')[0] || 'there'
  const fmt = (d: Date) => { try { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } }
  const rows = opts.items.map(i => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:${NEUTRAL_DARK};font-size:14px">${i.module}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#6b7280;font-size:14px;text-align:center">${i.count}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#6b7280;font-size:14px;text-align:right">${fmt(i.due)}</td>
    </tr>`).join('')

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">
      Some of your CareStream training licences are coming up for renewal. Renew them to keep your team's training and compliance records active and up to date.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
      <tr>
        <td style="padding:8px 12px;border-bottom:2px solid #eee;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af">Module</td>
        <td style="padding:8px 12px;border-bottom:2px solid #eee;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;text-align:center">Licences</td>
        <td style="padding:8px 12px;border-bottom:2px solid #eee;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;text-align:right">Renews</td>
      </tr>
      ${rows}
    </table>
    <div style="text-align:center;margin:0 0 28px">
      <a href="${opts.manageUrl}" style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Manage your licences</a>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">If you've already renewed, you can ignore this reminder.</p>
    ${emailFooter()}
  `)

  await sgMail.send({ to: opts.to, from, subject: 'Your CareStream training licences are due for renewal', html })
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

// ─── Password set-up (new training buyers) ───────────────────────────────────
// Sent alongside the magic sign-in link when a purchase provisions a NEW account,
// so the buyer always has a second way in if the one-time link is lost or consumed.
export async function sendPasswordSetupEmail(to: string, name: string, setupUrl: string): Promise<void> {
  ensureInitialised()

  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping password setup email')
    return
  }

  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = name.split(' ')[0] ?? name

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Welcome to CareStreamAI! Your account is ready. To make sure you can always sign in,
      set a password for your account now — it only takes a moment.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="${setupUrl}"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Set up my password
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px">
      This link expires in <strong>7 days</strong>. Once set, sign in any time at carestreamai.com/login
      with your email address and password.
    </p>

    <p style="color:#9ca3af;font-size:12px;margin:0">
      If the button above does not work, copy and paste this link into your browser:<br>
      <span style="color:${PURPLE}">${setupUrl}</span>
    </p>

    ${emailFooter()}
  `)

  await sgMail.send({
    to,
    from,
    subject: 'Set up your CareStreamAI password',
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

// ─── Training-only onboarding guide (sent to new training clients) ────────────
// A fully branded walkthrough of the three-step setup: add staff, allocate the
// purchased modules, staff complete them in the hub, plus how to track progress.
// Screenshots are hosted on the web app at /email/training-setup/step-N.jpg.

export async function sendTrainingOnboardingGuideEmail(opts: { to: string; name: string }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping training onboarding guide'); return }
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = (opts.name || '').split(' ')[0] || 'there'
  const img = (n: number, alt: string) =>
    `<img src="${WEB_URL}/email/training-setup/step-${n}.jpg" alt="${alt}" width="536" style="display:block;width:100%;max-width:536px;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 14px">`
  const stepHeading = (label: string, title: string) => `
    <p style="margin:32px 0 4px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${PURPLE}">${label}</p>
    <h2 style="margin:0 0 12px;font-size:19px;color:${NEUTRAL_DARK}">${title}</h2>`
  const bullet = (text: string) => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr>
      <td style="vertical-align:top;padding-right:10px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${PURPLE};margin-top:7px"></span></td>
      <td style="font-size:15px;line-height:1.6;color:#374151">${text}</td>
    </tr></table>`
  const para = (text: string) => `<p style="color:#374151;font-size:15px;line-height:1.65;margin:0 0 14px">${text}</p>`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

    ${para(`Welcome to CareStream Training. Your account and training licences are ready to go, so here is a simple walkthrough of how to get your team training. There are just three steps: <strong>add your staff</strong>, <strong>allocate the training</strong>, and your staff <strong>complete it in their own training hub</strong>. Setup usually takes less than five minutes.`)}

    ${stepHeading('Step 1', 'Set up your staff members')}
    ${bullet(`In your admin portal, click <strong>Staff</strong> in the left-hand menu.`)}
    ${bullet(`Click <strong>Add staff member</strong> and complete their details.`)}
    ${img(1, 'The Staff page in the CareStream admin portal')}
    ${img(2, 'The Add staff member form')}
    ${para(`Pay close attention to the <strong>language settings</strong>. You have complete control over the language each staff member receives their training in: English, or any other language as their first language. You can also set a second language and <strong>allow switching</strong>, so they can flip an individual question or lesson into their second language whenever it helps their understanding. It is a simple way to make sure nothing is lost in translation.`)}
    ${para(`As soon as you save, the staff member receives an email with their personal login details for their own <strong>training hub</strong>, which is where all their training modules and follow-up questions will appear.`)}

    ${stepHeading('Step 2', 'Allocate the training')}
    ${bullet(`Click <strong>Training</strong> in the left-hand menu and press <strong>Allocate to staff</strong> on any of your purchased modules, or`)}
    ${bullet(`Click <strong>Licences</strong> to see every licence you own and allocate any available one to a staff member.`)}
    ${img(3, 'Allocating a module from the Training page')}
    ${img(4, 'Allocating from the Training Licences page')}
    ${para(`Each licence covers one staff member on one training module. The moment you allocate, the staff member automatically receives an email letting them know a new training module has been assigned and is ready to complete. Nothing else for you to do.`)}

    ${stepHeading('Step 3', 'Staff complete the training in their hub')}
    ${img(5, 'The staff training hub showing assigned modules')}
    ${para(`Once logged in, your staff can add the CareStream training hub to their phone or computer home screen so it opens just like an app, and they are notified whenever a new module is available to them. Each module teaches a short lesson first, then checks understanding with a set of questions. When they pass, a certificate is stored on their record automatically, and anything they got wrong resurfaces later as follow-up questions until they have mastered it.`)}

    ${stepHeading('Track progress', 'Training analytics')}
    ${bullet(`Click <strong>Staff</strong> in the left-hand menu.`)}
    ${bullet(`Click <strong>View</strong> next to any staff member to open their personal record and analytics.`)}
    ${img(6, 'A staff member&rsquo;s personal training analytics')}
    ${para(`You can track exactly how each staff member is performing across their training modules: what has been completed, assessment scores, and their certificates, with a team-wide view under <strong>Analytics</strong>. Everything is stored in one place, ready whenever you need evidence of training.`)}

    <div style="text-align:center;margin:32px 0 8px">
      <a href="${WEB_URL}/login"
         style="display:inline-block;padding:14px 32px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">
        Sign in and set up your staff
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:16px 0 0;text-align:center">
      Questions? Just reply to this email and we will help you get set up.
    </p>

    ${emailFooter()}
  `)

  await sgMail.send({ to: opts.to, from: { email: from, name: 'Welcome to CareStream' }, subject: 'Getting started with your CareStream training', html })
}

// ─── Face-to-face session reminder (admin-triggered) ─────────────────────────

export async function sendFaceToFaceReminderEmail(opts: { to: string; name: string; orgName: string; title: string; dateLabel: string; trainerLabel?: string | null }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = (opts.name || '').split(' ')[0] || 'there'

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${firstName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">
      This is a reminder that you&rsquo;re booked into a <strong>face-to-face training session</strong>:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:90px">Training</td><td style="padding:6px 0;color:${NEUTRAL_DARK};font-size:15px;font-weight:600">${opts.title}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Date</td><td style="padding:6px 0;color:${NEUTRAL_DARK};font-size:15px;font-weight:600">${opts.dateLabel}</td></tr>
      ${opts.trainerLabel ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Delivered by</td><td style="padding:6px 0;color:${NEUTRAL_DARK};font-size:15px">${opts.trainerLabel}</td></tr>` : ''}
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
      Please make sure you attend. If you can&rsquo;t make it, let your manager know as soon as possible.
    </p>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: `Reminder: ${opts.title} on ${opts.dateLabel} — ${opts.orgName}`, html })
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

// ─── Landing page (PPC) submission notification ───────────────────────────────
export interface SendLpSubmissionOptions {
  campaignSlug:     string
  additionalEmails: string[]
  data:             Record<string, any>
  attribution:      { utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; gclid?: string | null; page_url?: string | null }
  submissionId:     string
}

export async function sendLpSubmissionEmail(opts: SendLpSubmissionOptions): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) return

  const from  = process.env.SENDGRID_FROM_ADDRESS ?? `noreply@${INBOUND_DOMAIN}`
  const owner = process.env.OWNER_NOTIFICATION_EMAIL ?? process.env.DEMO_NOTIFICATION_EMAIL ?? 'len@carestreamai.com'
  const to    = Array.from(new Set([owner, ...(opts.additionalEmails ?? [])].filter(Boolean)))

  const name    = String(opts.data?.fullName ?? opts.data?.name ?? 'Unknown')
  const company = String(opts.data?.organisation ?? opts.data?.company ?? 'Unknown')

  const dataRows = Object.entries(opts.data ?? {})
    .filter(([k, v]) => k !== 'company_website' && v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:${NEUTRAL_MID};font-size:13px;vertical-align:top"><strong>${esc(k)}</strong></td><td style="padding:6px 0;color:${NEUTRAL_DARK};font-size:13px">${esc(String(v))}</td></tr>`)
    .join('')

  const attr = opts.attribution ?? {}
  const attrRows = ([
    ['Campaign (UTM)', attr.utm_campaign],
    ['Source',         attr.utm_source],
    ['Medium',         attr.utm_medium],
    ['gclid',          attr.gclid],
    ['Page',           attr.page_url],
  ] as Array<[string, string | null | undefined]>)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:${NEUTRAL_MID};font-size:12px"><strong>${k}</strong></td><td style="padding:4px 0;color:${NEUTRAL_MID};font-size:12px">${esc(String(v))}</td></tr>`)
    .join('')

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:16px;font-weight:700;margin:0 0 4px">New landing page enquiry</p>
    <p style="color:${NEUTRAL_MID};font-size:13px;margin:0 0 18px">Campaign: ${esc(opts.campaignSlug)}</p>
    <table style="border-collapse:collapse;width:100%">${dataRows}</table>
    ${attrRows ? `<p style="color:${NEUTRAL_MID};font-size:12px;margin:18px 0 4px"><strong>Attribution</strong></p><table style="border-collapse:collapse;width:100%">${attrRows}</table>` : ''}
    ${emailFooter()}
  `)

  await sgMail.send({
    to,
    from,
    replyTo: String(opts.data?.workEmail ?? opts.data?.email ?? from),
    subject: `[LP] CareStream ${opts.campaignSlug} — submission from ${name} at ${company}`,
    html,
  })
}

// ─── Audit action-plan assignment emails ────────────────────────────────────────
// Sent when an action plan is approved: each staff member gets their assigned actions;
// admins get any actions assigned to external contractors (which they track themselves).

type ActionLine = { description: string; priority: string; due_date: string | null; audit_name: string; contractor?: string | null }

const PRIORITY_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  immediate: { label: 'Do now',   bg: '#fee2e2', fg: '#b91c1c' },
  priority:  { label: 'Priority', bg: '#fef3c7', fg: '#b45309' },
  monitor:   { label: 'Monitor',  bg: '#e2e8f0', fg: '#475569' },
}
const escHtml = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))
const dueLabel = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null

function actionRowsHtml(actions: ActionLine[], showContractor = false): string {
  return actions.map(a => {
    const p = PRIORITY_LABEL[a.priority] ?? PRIORITY_LABEL.priority
    const due = dueLabel(a.due_date)
    const meta = [
      escHtml(a.audit_name),
      showContractor && a.contractor ? `Contractor: ${escHtml(a.contractor)}` : '',
      due ? `Due ${due}` : '',
    ].filter(Boolean).join(' &nbsp;·&nbsp; ')
    return `
    <tr>
      <td style="padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px">
        <div style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${p.bg};color:${p.fg};font-size:11px;font-weight:700;margin-bottom:6px">${p.label}</div>
        <p style="margin:0 0 4px;color:${NEUTRAL_DARK};font-size:14px;line-height:1.5">${escHtml(a.description)}</p>
        <p style="margin:0;color:#6b7280;font-size:12px">${meta}</p>
      </td>
    </tr>`
  }).join('<tr><td style="height:8px"></td></tr>')
}

export async function sendActionPlanStaffEmail(opts: { to: string; staffName: string; orgName: string; actions: ActionLine[] }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping action-plan staff email'); return }
  const from      = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const firstName = opts.staffName.split(' ')[0] || opts.staffName
  const n         = opts.actions.length
  const hubUrl    = `${WEB_URL}/login`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi ${escHtml(firstName)},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">
      ${escHtml(opts.orgName)} has assigned you <strong>${n} action${n === 1 ? '' : 's'}</strong> from an audit action plan. Please complete ${n === 1 ? 'it' : 'them'} and mark ${n === 1 ? 'it' : 'each one'} done in your CareStream hub, under <strong>My actions</strong>.
    </p>
    <table style="border-collapse:separate;width:100%;margin:0 0 24px">${actionRowsHtml(opts.actions)}</table>
    <div style="text-align:center;margin:0 0 28px">
      <a href="${hubUrl}" style="display:inline-block;padding:12px 28px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open my actions</a>
    </div>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: `${n} audit action${n === 1 ? '' : 's'} assigned to you — ${opts.orgName}`, html })
}

export async function sendActionPlanExternalEmail(opts: { to: string; orgName: string; actions: ActionLine[] }): Promise<void> {
  ensureInitialised()
  if (!process.env.SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping action-plan external email'); return }
  const from   = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const n      = opts.actions.length
  const hubUrl = `${WEB_URL}/login`

  const html = emailWrapper(`
    <p style="color:${NEUTRAL_DARK};font-size:15px;margin:0 0 16px">Hi,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">
      An audit action plan at <strong>${escHtml(opts.orgName)}</strong> has <strong>${n} action${n === 1 ? '' : 's'}</strong> assigned to an external contractor. As an administrator, please track ${n === 1 ? 'this' : 'these'} and tick ${n === 1 ? 'it' : 'each one'} off once the work is complete, in your hub under <strong>My actions → External contractor actions</strong>.
    </p>
    <table style="border-collapse:separate;width:100%;margin:0 0 24px">${actionRowsHtml(opts.actions, true)}</table>
    <div style="text-align:center;margin:0 0 28px">
      <a href="${hubUrl}" style="display:inline-block;padding:12px 28px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open my actions</a>
    </div>
    ${emailFooter(opts.orgName)}
  `)

  await sgMail.send({ to: opts.to, from, subject: `External contractor actions to track — ${opts.orgName}`, html })
}
