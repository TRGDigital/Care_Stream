// One-off: send the two external-decision admin notification emails to a preview inbox,
// using the exact production builder so they look identical to what admins receive.
// Run: cd apps/api && npx tsx --env-file=.env scripts/preview-external-emails.ts

import { buildExternalDecisionEmail } from '../src/services/analytics/policy-adoption'
import { sendTrainingUpdateEmail } from '../src/services/email/outbound'

const TO = 'lenny@trgdigital.co.uk'
const ORG = 'Ferndale Nursing Home'

async function main() {
  const approved = buildExternalDecisionEmail('approved', {
    policyName: 'Consent To Care And Treatment Policy',
    who: 'Dr Sarah Whitfield',
    version: '2.0',
    comment: '',
  })
  const rejected = buildExternalDecisionEmail('rejected', {
    policyName: 'Consent To Care And Treatment Policy',
    who: 'Dr Sarah Whitfield',
    version: '',
    comment: 'Please add a clear reference to the Mental Capacity Act 2005 in section 3, and name the responsible person for obtaining consent.',
  })

  await sendTrainingUpdateEmail({ to: TO, name: 'Lenny', orgName: ORG, subject: `[PREVIEW] ${approved.subject}`, bodyHtml: approved.bodyHtml })
  console.log('Sent approved preview to', TO)
  await sendTrainingUpdateEmail({ to: TO, name: 'Lenny', orgName: ORG, subject: `[PREVIEW] ${rejected.subject}`, bodyHtml: rejected.bodyHtml })
  console.log('Sent sent-back preview to', TO)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
