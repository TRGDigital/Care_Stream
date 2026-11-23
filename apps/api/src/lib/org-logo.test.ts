import test from 'node:test'
import assert from 'node:assert/strict'
import sgMail from '@sendgrid/mail'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import * as out from '../services/email/outbound'
import { setActorOverrideForPreview } from '../services/email/email-avatar'
import { personEmailCases, otherStaffEmailCases } from '../services/email/person-email-samples'
import { LOGO_ROW, LOGO_BLOCK } from '../services/email/org-logo-markers'
import { applyOrgLogo, logoHash, logoAddress } from './org-logo'

const sent: string[] = []
;(sgMail as any).send = async (m: any) => { sent.push(m.html) }
setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null }))
const base = { to: 'staff@example.org', name: 'Amira Khan', orgName: 'Ferndale Nursing Home' }
const portal = 'https://www.carestreamai.com'

test('every staff email has a place for the organisation logo', async () => {
  const cases = { ...personEmailCases(out, { ...base, actorUserId: 'a' }, portal), ...otherStaffEmailCases(out, base, portal) }
  const missing: string[] = []
  for (const [name, fn] of Object.entries(cases)) {
    sent.length = 0
    await fn()
    const html = sent.join('')
    if (!html.includes(LOGO_ROW) && !html.includes(LOGO_BLOCK)) missing.push(name)
  }
  assert.deepEqual(missing, [], `no logo marker in: ${missing.join(', ')}`)
})

test('the logo replaces its marker, or the marker is removed when there is no logo', () => {
  const html = `<table><tr><td>a</td></tr>${LOGO_ROW}<tr><td>title</td></tr></table><div>${LOGO_BLOCK}body</div>`
  const withLogo = applyOrgLogo(html, { url: 'https://api.example/x.png', alt: 'Ferndale "Home"' })
  assert.ok(withLogo.includes('<img src="https://api.example/x.png" alt="Ferndale &quot;Home&quot;"'))
  assert.ok(!withLogo.includes('CS_ORG_LOGO'))
  assert.equal(applyOrgLogo(html, null).includes('<img'), false)
  assert.ok(!applyOrgLogo(html, null).includes('CS_ORG_LOGO'))
  assert.equal(applyOrgLogo('<p>no marker</p>', null), '<p>no marker</p>')
})

test('the logo address changes when the logo changes', () => {
  assert.equal(logoHash('data:image/webp;base64,AAAA'), logoHash('data:image/webp;base64,AAAA'))
  assert.notEqual(logoHash('data:image/webp;base64,AAAA'), logoHash('data:image/webp;base64,BBBB'))
  assert.match(logoAddress('tenant-1', 'data:image/webp;base64,AAAA'), /\/public\/org-logo\/tenant-1\/[0-9a-f]{16}\.png$/)
})
