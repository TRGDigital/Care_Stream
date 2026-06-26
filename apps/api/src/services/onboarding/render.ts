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
}

export function renderOnboardingEmailHtml(
  email: { subject: string; preheader: string; body: OnboardingBody },
  opts: { unsubscribeUrl: string },
): string {
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
