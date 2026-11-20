// Preview the person-led staff emails.
//
//   Render every converted email to HTML files (nothing is sent):
//     npx tsx src/scripts/preview-person-emails.ts
//     -> /tmp/person-email-previews/<email>-photo.html and <email>-initials.html
//
//   Send ONE converted email as a real test through SendGrid (needs SENDGRID_API_KEY, and an explicit --to; there is no default):
//     npx tsx --env-file=.env src/scripts/preview-person-emails.ts --send allocation-training --to someone@example.org [--with-photo <public image url>]
//   Names: allocation-training, allocation-annual, allocation-induction, allocation-cqc, training-reminder, face-to-face-reminder,
//          cqc-prep, onboarding-update, audit-assigned, supervision-booked, action-plan
//   The test subject is prefixed "[Preview]" and the recipient is replaced by --to. Without --with-photo the sender shows initials.

import { personEmailCases } from '../services/email/person-email-samples'
import fs from 'fs'
import path from 'path'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'preview-not-a-real-key'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'preview-secret'

async function main() {
  const sgMail = (await import('@sendgrid/mail')).default as any
  const out = await import('../services/email/outbound')
  const { setActorOverrideForPreview } = await import('../services/email/email-avatar')
  const realSend = sgMail.send.bind(sgMail)

  const args = process.argv.slice(2)
  const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
  const sendName = arg('--send'), to = arg('--to'), photoUrl = arg('--with-photo')
  if (sendName !== undefined && !to) { console.error('Refusing to send: pass an explicit --to <address>. There is no default recipient.'); process.exit(1) }
  if (to && sendName === undefined) { console.error('--to only works with --send <name>.'); process.exit(1) }
  if (sendName !== undefined && !/^SG\./.test(process.env.SENDGRID_API_KEY || '')) { console.error('SENDGRID_API_KEY is not set to a real key.'); process.exit(1) }

  let withPhoto = false
  setActorOverrideForPreview(() => ({
    name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home',
    avatarUrl: withPhoto ? (photoUrl || SAMPLE_AVATAR) : null,
  }))

  const portalUrl = 'https://carestreamai.com'
  const base = { to: 'staff@example.org', name: 'Amira Khan', orgName: 'Ferndale Nursing Home', actorUserId: 'preview-admin' }
  const cases = personEmailCases(out, base, portalUrl)

  if (sendName !== undefined) {
    const fn = cases[sendName]
    if (!fn) { console.error(`Unknown email "${sendName}". Choose one of: ${Object.keys(cases).join(', ')}`); process.exit(1) }
    withPhoto = !!photoUrl
    sgMail.send = async (msg: any) => {
      const sent = { ...msg, to, subject: `[Preview] ${msg.subject}` }
      await realSend(sent)
      console.log(`Sent "${sent.subject}" from "${typeof sent.from === 'object' ? sent.from.name : sent.from}" to ${to}`)
    }
    await fn()
    return
  }

  const dir = '/tmp/person-email-previews'
  fs.mkdirSync(dir, { recursive: true })
  let current = ''
  sgMail.send = async (msg: any) => {
    const from = typeof msg.from === 'object' ? msg.from.name : msg.from
    const banner = `<!-- From: ${from} | Subject: ${msg.subject} -->\n`
    fs.writeFileSync(path.join(dir, current), banner + msg.html)
    console.log(`${current}  From: ${from}  Subject: ${msg.subject}`)
  }
  for (const [name, fn] of Object.entries(cases)) {
    for (const photo of [true, false]) {
      withPhoto = photo; current = `${name}-${photo ? 'photo' : 'initials'}.html`
      await fn()
    }
  }
  console.log(`Wrote ${Object.keys(cases).length * 2} files to ${dir}. Nothing was sent.`)
}

// A small grey-purple round-friendly placeholder so a file preview shows a photo layout without a network.
const SAMPLE_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#c9b3d6"/><circle cx="48" cy="38" r="17" fill="#fff"/><ellipse cx="48" cy="86" rx="30" ry="24" fill="#fff"/></svg>')

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
