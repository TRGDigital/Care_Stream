import test from 'node:test'
import assert from 'node:assert/strict'
import { renderSuperUserWelcome } from './super-user-email'

const r = renderSuperUserWelcome({ firstName: 'Anusha', orgName: 'Ferndale <Nursing> Home', hubUrl: 'https://www.carestreamai.com/chat', taggedBy: 'Aoife Arbery' })
test('the welcome email names the person, the service and who chose them, and escapes the service name', () => {
  assert.equal(r.subject, "You are Ferndale <Nursing> Home's CareStream Super User")
  assert.match(r.html, /Hi Anusha,/); assert.match(r.html, /Aoife Arbery has chosen you/); assert.match(r.html, /Ferndale &lt;Nursing&gt; Home/)
  assert.doesNotMatch(r.html, /Ferndale <Nursing>/)
})
test('it is honest about the voucher, what is seen, and that they can say no', () => {
  assert.match(r.text, /£25 M&S voucher/); assert.match(r.text, /one per service/); assert.match(r.text, /your own use of the hub/); assert.match(r.text, /only see totals, never who they are/); assert.match(r.text, /You can say no/)
  assert.match(r.html, /https:\/\/www\.carestreamai\.com\/chat/)
})
test('house style: no em or en dashes, and it works when nobody is named', () => {
  assert.ok(!/[–—]/.test(r.html + r.text))
  assert.match(renderSuperUserWelcome({ firstName: 'A', orgName: 'X', hubUrl: 'u' }).text, /Your manager has chosen you/)
})
