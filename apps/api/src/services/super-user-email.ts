// The email to a member of staff when they are tagged as their company's Super User.
// renderSuperUserWelcome is pure (data in, subject + html + text out); sendSuperUserWelcome finds the person and sends.
// House style: friendly, short, plain words, no dashes. Honest about what CareStream can see and about the voucher.
import sgMail from '@sendgrid/mail'
import '../lib/email-guard'   // never email reserved fictional domains (example.com and similar)
import { prisma } from '../db/client'
import { emailWrapper, emailFooter } from './email/outbound'
import { siteUrl } from '../lib/urls'

const PURPLE = '#9B52B5', DARK = '#1A1530', BODY = '#374151', MUTED = '#6b7280'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
export type Rendered = { subject: string; html: string; text: string }

export function renderSuperUserWelcome(o: { firstName: string; orgName: string; hubUrl: string; taggedBy?: string | null }): Rendered {
  const subject = `You are ${o.orgName}'s CareStream Super User`
  const who = o.taggedBy ? esc(o.taggedBy) : 'Your manager'
  const li = (s: string) => `<li style="margin:0 0 8px">${s}</li>`
  const html = emailWrapper(`
    <p style="color:${DARK};font-size:15px;margin:0 0 14px">Hi ${esc(o.firstName)},</p>
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 14px">${who} has chosen you as the <strong>Super User</strong> for ${esc(o.orgName)} on CareStream. That means you are the person we hope will lead the way: using CareStream well yourself, and helping your colleagues use it for their training and for getting quick answers at work.</p>
    <p style="color:${DARK};font-size:15px;font-weight:600;margin:0 0 6px">What it involves</p>
    <ul style="color:${BODY};font-size:15px;line-height:1.55;margin:0 0 16px;padding-left:20px">
      ${li('Using the hub week to week: your training, any audits you do, the CQC prep questions, and asking CareStream when you are unsure of something.')}
      ${li('Helping colleagues get started. Show someone how to sign in, point them to a course, or tell them about a question the hub answered for you.')}
      ${li('Telling your manager and us what works and what does not.')}
    </ul>
    <p style="color:${DARK};font-size:15px;font-weight:600;margin:0 0 6px">Our thank you</p>
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 14px">If the first 60 days go well, with you using the hub regularly and more of your colleagues using it too, CareStream will send you a <strong>&pound;25 M&amp;S voucher</strong>. There is one per service, and it is our way of saying thank you.</p>
    <p style="color:${DARK};font-size:15px;font-weight:600;margin:0 0 6px">What we can see, and what we cannot</p>
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 14px">To do that fairly, CareStream can see <strong>your own</strong> use of the hub: the days you use it, the training and audits you complete, your questions, and roughly how long you spend on it. For your colleagues we only see totals, never who they are or what they ask. The first time you open the hub you will be asked to agree. You can say no, and nothing is shared.</p>
    <div style="text-align:center;margin:0 0 18px"><a href="${esc(o.hubUrl)}" style="display:inline-block;padding:14px 28px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">Open the hub</a></div>
    <p style="color:${DARK};font-size:15px;font-weight:600;margin:0 0 6px">Three easy first steps this week</p>
    <ul style="color:${BODY};font-size:15px;line-height:1.55;margin:0 0 14px;padding-left:20px">
      ${li('Finish one course in your training list.')}
      ${li('Ask CareStream a real question from your shift.')}
      ${li('Tell one colleague how you did it.')}
    </ul>
    <p style="color:${MUTED};font-size:13px;line-height:1.5;margin:14px 0 0">Questions? Just reply to this email and a real person will answer.</p>
    <p style="color:${BODY};font-size:15px;margin:14px 0 0">Kind regards,<br>The CareStream team</p>
    ${emailFooter(esc(o.orgName))}
  `)
  const text = [
    `Hi ${o.firstName},`, '',
    `${o.taggedBy ?? 'Your manager'} has chosen you as the Super User for ${o.orgName} on CareStream. That means you are the person we hope will lead the way: using CareStream well yourself, and helping your colleagues use it for their training and for getting quick answers at work.`, '',
    'What it involves',
    '- Using the hub week to week: your training, any audits you do, the CQC prep questions, and asking CareStream when you are unsure of something.',
    '- Helping colleagues get started. Show someone how to sign in, point them to a course, or tell them about a question the hub answered for you.',
    '- Telling your manager and us what works and what does not.', '',
    'Our thank you',
    'If the first 60 days go well, with you using the hub regularly and more of your colleagues using it too, CareStream will send you a £25 M&S voucher. There is one per service, and it is our way of saying thank you.', '',
    'What we can see, and what we cannot',
    'To do that fairly, CareStream can see your own use of the hub: the days you use it, the training and audits you complete, your questions, and roughly how long you spend on it. For your colleagues we only see totals, never who they are or what they ask. The first time you open the hub you will be asked to agree. You can say no, and nothing is shared.', '',
    `Open the hub: ${o.hubUrl}`, '',
    'Three easy first steps this week',
    '- Finish one course in your training list.', '- Ask CareStream a real question from your shift.', '- Tell one colleague how you did it.', '',
    'Questions? Just reply to this email and a real person will answer.', '', 'Kind regards,', 'The CareStream team',
  ].join('\n')
  return { subject, html, text }
}

const first = (name: string | null | undefined) => (String(name ?? '').trim().split(/\s+/)[0] || 'there')

/** Emails the person who was just tagged. Never throws: a failed email must not undo the tag. Test accounts are skipped. */
export async function sendSuperUserWelcome(tenantId: string, userId: string, taggedBy?: string | null): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) return false
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, feature_flags: true } })
    if (!tenant || (tenant.feature_flags as any)?.is_test) return false
    const u = await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true }, select: { name: true, email: true } })
    if (!u?.email) return false
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL
    const r = renderSuperUserWelcome({ firstName: first(u.name), orgName: tenant.name, hubUrl: `${siteUrl()}/chat`, taggedBy })
    await (sgMail as any).send({ to: u.email, from, subject: r.subject, html: r.html, text: r.text })
    return true
  } catch { return false }
}
