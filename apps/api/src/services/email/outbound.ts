// §8.5 — Outbound email via SendGrid.
// Sets correct thread headers (In-Reply-To, References) so replies land in the same thread.

import sgMail from '@sendgrid/mail'
import { signFeedbackToken } from '../../lib/feedback-token'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'

// Lazy initialisation — API key may not be set in test environments.
let initialised = false
function ensureInitialised(): void {
  if (!initialised && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    initialised = true
  }
}

// ─── Reply ────────────────────────────────────────────────────────────────────

export interface SendReplyOptions {
  to:            string   // staff email address
  subject:       string   // original subject (will be prefixed with "Re:" if needed)
  htmlBody:      string   // formatted HTML response
  threadId:      string   // original Message-ID (without angle brackets) — anchor for the thread
  citations:     Array<{ policy_name: string; version: number }>
  staffFirstName: string
  queryId?:      string   // used to generate one-click feedback links
}

export async function sendEmailReply(opts: SendReplyOptions): Promise<void> {
  ensureInitialised()

  const from    = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const subject = buildSubject(opts.subject)

  const html = buildHtmlEmail(opts.staffFirstName, opts.htmlBody, opts.citations, opts.queryId)

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

  await sgMail.send({
    to,
    from,
    subject: `Re: ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
        <p>Hi,</p>
        <p>Thank you for your email. Unfortunately we were unable to verify your email
        address against the staff records for this organisation.</p>
        <p>If you believe this is an error, please ask your manager or care home
        administrator to ensure your email address is registered on CareStreamAI.</p>
        <p>The CareStreamAI Team</p>
      </div>
    `,
  })
}

// ─── Staff welcome / credentials email ───────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to:           string   // staff email
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

  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff">

  <div style="margin-bottom:32px">
    <p style="margin:0;font-size:22px;font-weight:700;color:#0d9488">CareStreamAI</p>
    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Powered by TRG Digital</p>
  </div>

  <p style="color:#111827;font-size:15px;margin:0 0 16px">Hi ${firstName},</p>

  <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
    Your account on <strong>CareStreamAI</strong> has been set up by ${opts.orgName}.
    You can now log in to the staff chat portal to get instant answers to policy and
    procedure questions.
  </p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin:0 0 24px">
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Your login details</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px">Portal</td>
        <td style="padding:6px 0;font-size:14px">
          <a href="${opts.portalUrl}" style="color:#0d9488;font-weight:600">${opts.portalUrl}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6b7280">Username</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${opts.to}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6b7280">Password</td>
        <td style="padding:6px 0;font-size:14px;color:#111827;font-family:monospace;font-weight:600;letter-spacing:0.05em">${opts.tempPassword}</td>
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

  <div style="border-top:1px solid #e5e7eb;padding-top:20px">
    <p style="margin:0;font-size:12px;color:#9ca3af">
      This email was sent on behalf of <strong>${opts.orgName}</strong> via CareStreamAI.
      If you were not expecting this, please contact your administrator.
    </p>
  </div>

</div>
  `.trim()

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
      <a href="${posUrl}" style="display:inline-block;margin:0 8px;padding:8px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#15803d;font-size:13px;font-weight:600;text-decoration:none">👍 Yes, helpful</a>
      <a href="${negUrl}" style="display:inline-block;margin:0 8px;padding:8px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;color:#c2410c;font-size:13px;font-weight:600;text-decoration:none">👎 Could be better</a>
    </div>`
  })() : ''

  return `
<div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <p>Hi ${firstName},</p>
  ${bodyHtml}
  ${citationBlock}
  ${feedbackBlock}
  <p style="color:#aaa;font-size:12px;margin-top:32px">
    Just reply to this email to continue the conversation — I'll remember what we discussed.
  </p>
</div>
  `.trim()
}
