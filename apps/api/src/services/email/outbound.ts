// §8.5 — Outbound email via SendGrid.
// Sets correct thread headers (In-Reply-To, References) so replies land in the same thread.

import sgMail from '@sendgrid/mail'
import { signFeedbackToken } from '../../lib/feedback-token'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WEB_URL        = process.env.WEB_URL ?? 'https://care-stream-web.vercel.app'
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

// ─── Staff welcome / credentials email ───────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to:           string
  staffName:    string
  orgName:      string
  tempPassword: string
  portalUrl:    string
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
      You can now log in to the staff chat portal to get instant answers to policy and procedure questions.
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
