// Email-safe HTML for an onboarding email. Inline styles + tables so it renders
// consistently across Gmail/Outlook/Apple Mail. Mirrors the preview design.

const BRAND      = '#9B52B5'
const BRAND_DARK = '#7A3D9A'
const WEB_URL    = process.env.WEB_PUBLIC_URL ?? 'https://www.carestreamai.com'

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function absUrl(href: string): string {
  if (!href) return WEB_URL
  if (/^https?:\/\//.test(href)) return href
  return WEB_URL + (href.startsWith('/') ? href : `/${href}`)
}

export interface OnboardingBody {
  headline: string
  intro:    string[]
  steps:    Array<{ title: string; body: string }>
  tip?:     string | null
  ctaLabel: string
  ctaHref:  string
  where?:   string | null
  imageSrc?: string | null
  badge?:   string | null
  /** 'plain' is the personal style: no logo, boxes or buttons, a first name greeting and a person style sign off.
   *  Anything else (or nothing) is the branded template the plan emails use. */
  style?:   'plain' | 'branded' | null
  /** A small note under the sign off, used for the upgrade mention on the last free emails. */
  banner?:  { text: string; ctaLabel: string; ctaHref: string } | null
}

export interface RenderOpts {
  unsubscribeUrl: string
  /** The recipient's first name, for the greeting in the plain style. */
  firstName?: string | null
}

// The personal style uses the same signature, footer and button as the Growth Engine emails (trg-lead-engine, lib/growth/signature.ts),
// so every CareStream email Len sends looks alike. Images live on this site under /sig.
const SIG_NAME = 'Lenny Burgess'
const SIG_PHONE = '020 8064 1596'
const SIG_ADDRESS = 'Suite RA01, 195-197 Wood Street, London, E17 3NU'
const SIG_EMAIL = 'len@carestreamai.com'
const SIG_WEB = 'carestreamai.com'
const COMPANY_LINE = 'TRG Digital Ltd, Suite RA01, 195-197 Wood Street, London, England, E17 3NU'
const SIG_BUTTON_BG = '#1f3a5f'

/** The same sender identity the Growth Engine uses for CareStream. */
export const PERSONAL_SENDER = { name: 'Len at CareStream', replyTo: SIG_EMAIL }

function signatureHtml(): string {
  const grey = 'color:#5b6470'
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#1f2933;border-collapse:collapse;margin-top:18px"><tr>`
    + `<td valign="top" style="padding:0 16px 0 0"><img src="${WEB_URL}/sig/len-burgess.jpg" width="84" height="84" alt="${SIG_NAME}" style="display:block;width:84px;height:84px;border-radius:42px;border:0"></td>`
    + `<td valign="top" style="padding:0 0 0 16px;border-left:2px solid #d9dee5">`
    + `<div style="font-size:16px;font-weight:bold;color:#1f2933">${SIG_NAME}</div>`
    + `<div style="margin:6px 0 8px 0"><img src="${WEB_URL}/sig/carestream.png" width="150" height="43" alt="CareStream" style="display:block;border:0"></div>`
    + `<div style="${grey}">T ${SIG_PHONE}</div><div style="${grey}">E ${SIG_EMAIL}</div><div style="${grey}">W ${SIG_WEB}</div>`
    + `<div style="${grey};font-size:12px;margin-top:4px">${SIG_ADDRESS}</div></td></tr></table>`
}
const signatureText = () => [SIG_NAME, 'CareStream', `Tel ${SIG_PHONE}`, SIG_EMAIL, SIG_WEB, SIG_ADDRESS].join('\n')
const legalLines = (unsubscribeUrl: string) => [
  `CareStream is a trading name of ${COMPANY_LINE}.`,
  'You are receiving this because you started a CareStream account. Replies come to me. Privacy: carestreamai.com/privacy-policy',
  `Unsubscribe from these emails: ${unsubscribeUrl}`,
]
const buttonHtml = (href: string, label: string) =>
  `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:4px 0 18px 0"><tr><td style="background-color:${SIG_BUTTON_BG};border-radius:8px"><a href="${esc(absUrl(href))}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">${esc(label)}</a></td></tr></table>`

/** First name from a full name; nothing if it does not look like a person's name (an email address, one letter, digits). */
export function firstNameOf(name?: string | null): string | null {
  const t = String(name ?? '').trim().split(/\s+/)[0] ?? ''
  if (!/^[A-Za-z][A-Za-z'\-]{1,24}$/.test(t)) return null
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** The same email as plain text, sent alongside the HTML so every client has a text version. */
export function renderOnboardingEmailText(
  email: { subject: string; preheader: string; body: OnboardingBody },
  opts: RenderOpts,
): string {
  const b = email.body
  const out: string[] = []
  out.push(b.style === 'plain' ? (opts.firstName ? `Hi ${opts.firstName},` : 'Hi,') : b.headline)
  out.push('')
  for (const p of b.intro) { out.push(p); out.push('') }
  b.steps.forEach((st, i) => out.push(`${i + 1}. ${st.title}. ${st.body}`))
  if (b.steps.length) out.push('')
  if (b.tip) { out.push(`Tip: ${b.tip}`); out.push('') }
  out.push(`${b.ctaLabel}: ${absUrl(b.ctaHref)}`)
  out.push('')
  if (b.banner) { out.push(`${b.banner.text} ${b.banner.ctaLabel}: ${absUrl(b.banner.ctaHref)}`); out.push('') }
  if (b.style === 'plain') {
    out.push('--'); out.push(signatureText()); out.push(''); out.push(...legalLines(opts.unsubscribeUrl))
  } else {
    out.push('Here whenever you need us,'); out.push('The CareStream team')
    out.push(''); out.push('--')
    out.push('CareStreamAI, compliance and training for care providers.')
    out.push(`You are receiving this because you started a CareStream account. Unsubscribe: ${opts.unsubscribeUrl}`)
  }
  return out.join('\n')
}

/** The personal style: a short message from a person, laid out like the Growth Engine emails: full width, no logo header, a button, then the signature and a small legal footer. */
function renderPlainHtml(email: { subject: string; preheader: string; body: OnboardingBody }, opts: RenderOpts): string {
  const b = email.body
  const p = (t: string, extra = '') => `<p style="margin:0 0 14px 0;${extra}">${esc(t)}</p>`
  const steps = b.steps.map((st, i) => `<p style="margin:0 0 10px 0">${i + 1}. <strong>${esc(st.title)}.</strong> ${esc(st.body)}</p>`).join('')
  const banner = b.banner
    ? `<p style="margin:6px 0 0 0;font-size:13px;line-height:1.55;color:#5b6470">${esc(b.banner.text)} <a href="${esc(absUrl(b.banner.ctaHref))}" style="color:${BRAND_DARK}">${esc(b.banner.ctaLabel)}</a></p>`
    : ''
  const legal = legalLines(opts.unsubscribeUrl).map((l, i, all) => i === all.length - 1
    ? `Unsubscribe from these emails: <a href="${esc(opts.unsubscribeUrl)}" style="color:#8a929c;text-decoration:underline">${esc(opts.unsubscribeUrl)}</a>` : esc(l)).join('<br>')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(email.subject)}</title></head>
<body style="margin:0;padding:0">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${esc(email.preheader)}</span>
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2933">
    ${p(opts.firstName ? `Hi ${opts.firstName},` : 'Hi,')}
    ${b.intro.map(t => p(t)).join('')}
    ${steps}
    ${b.tip ? p(`Tip: ${b.tip}`, 'margin-top:6px') : ''}
    ${buttonHtml(b.ctaHref, b.ctaLabel)}
    ${banner}
    ${signatureHtml()}
    <div style="margin-top:22px;padding-top:12px;border-top:1px solid #e5e8ec;font-size:11px;line-height:1.5;color:#8a929c">${legal}</div>
  </div>
</body></html>`
}

export function renderOnboardingEmailHtml(
  email: { subject: string; preheader: string; body: OnboardingBody },
  opts: RenderOpts,
): string {
  if (email.body.style === 'plain') return renderPlainHtml(email, opts)
  const b = email.body
  const intro = b.intro.map(p =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${esc(p)}</p>`).join('')

  const steps = b.steps.map((s, i) =>
    `<tr>
       <td valign="top" width="28" style="padding:0 10px 12px 0">
         <div style="width:24px;height:24px;border-radius:12px;background:${BRAND};color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:24px">${i + 1}</div>
       </td>
       <td valign="top" style="padding:0 0 12px 0;font-size:15px;line-height:1.6;color:#374151">
         <strong style="color:#111827">${esc(s.title)}.</strong> ${esc(s.body)}
       </td>
     </tr>`).join('')

  const image = b.imageSrc
    ? `<tr><td style="padding:6px 0 4px">
         <img src="${esc(b.imageSrc)}" alt="" width="536" style="display:block;width:100%;max-width:536px;border:1px solid #e5e7eb;border-radius:8px">
       </td></tr>`
    : ''

  const where = b.where
    ? `<tr><td style="padding:8px 0 4px;font-size:13px;line-height:1.6;color:#4b5563">
         <strong style="color:#1f2937">Where to click:</strong> ${esc(b.where)}
       </td></tr>`
    : ''

  const tip = b.tip
    ? `<tr><td style="padding:6px 0 18px">
         <div style="background:#F5EEFA;border:1px solid #e1d2ef;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.6;color:${BRAND_DARK}">
           <strong>Tip:</strong> ${esc(b.tip)}
         </div>
       </td></tr>`
    : ''

  const badge = b.badge
    ? `<span style="display:inline-block;background:#fde68a;color:#92400e;font-size:11px;font-weight:700;border-radius:10px;padding:2px 8px;margin-bottom:10px">${esc(b.badge)}</span><br>`
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(email.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${esc(email.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:Inter,Arial,Helvetica,sans-serif">
        <tr><td align="center" style="background:#ffffff;padding:28px 28px 24px;border-bottom:1px solid #f0f0f0;text-align:center">
          <img src="${WEB_URL}/logo-color.png" alt="CareStream" height="64" style="height:64px;display:inline-block;border:0">
        </td></tr>
        <tr><td style="padding:28px 32px 8px">
          ${badge}
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:800;color:#111827">${esc(b.headline)}</h1>
          ${intro}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${image}${where}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px">${steps}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tip}</table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 8px">
            <tr><td style="border-radius:8px;background:${BRAND}">
              <a href="${esc(absUrl(b.ctaHref))}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(b.ctaLabel)}</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 4px;font-size:15px;line-height:1.6;color:#374151">Here whenever you need us,<br><strong style="color:#111827">The CareStream Team</strong></p>
          ${b.banner ? `<p style="margin:18px 0 6px;padding:12px 14px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.55;color:#4b5563">${esc(b.banner.text)} <a href="${esc(absUrl(b.banner.ctaHref))}" style="color:${BRAND_DARK}">${esc(b.banner.ctaLabel)}</a></p>` : ''}
        </td></tr>
        <tr><td style="border-top:1px solid #f0f0f0;background:#fafafa;padding:18px 32px;font-size:12px;line-height:1.6;color:#9ca3af">
          <p style="margin:0 0 4px">CareStreamAI, compliance and training for care providers.</p>
          <p style="margin:0">You are receiving this because you started a CareStream account. <a href="${esc(opts.unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a> from onboarding tips.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
