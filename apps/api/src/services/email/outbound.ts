// §8.5 — Outbound email via SendGrid.
// Sets correct thread headers (In-Reply-To, References) so replies land in the same thread.

import sgMail from '@sendgrid/mail'

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
}

export async function sendEmailReply(opts: SendReplyOptions): Promise<void> {
  ensureInitialised()

  const from    = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  const subject = buildSubject(opts.subject)

  const html = buildHtmlEmail(opts.staffFirstName, opts.htmlBody, opts.citations)

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSubject(original: string): string {
  const base = original.startsWith('Re:') ? original : `Re: ${original}`
  return `${base} — CareStreamAI`
}

function buildHtmlEmail(
  firstName:  string,
  bodyHtml:   string,
  citations:  Array<{ policy_name: string; version: number }>,
): string {
  const citationText = citations.map(c => `${c.policy_name} (v${c.version})`).join(', ')
  const citationBlock = citations.length > 0
    ? `<p style="color:#666;font-size:12px;border-top:1px solid #eee;padding-top:12px;margin-top:24px;">
         <strong>Sources referenced:</strong> ${citationText}
       </p>`
    : ''

  return `
<div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <p>Hi ${firstName},</p>
  ${bodyHtml}
  ${citationBlock}
  <p style="color:#aaa;font-size:12px;margin-top:32px">
    Just reply to this email to continue the conversation — I'll remember what we discussed.
  </p>
</div>
  `.trim()
}
