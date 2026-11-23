import test from 'node:test'
import assert from 'node:assert/strict'
import { credentialHasContent } from './credential-content'

test('an empty credential row is not recorded; any content makes it recorded', () => {
  assert.equal(credentialHasContent(null), false)
  assert.equal(credentialHasContent({ reference: null, issued_at: null, expires_at: null, notes: null, evidence_key: null }), false)
  assert.equal(credentialHasContent({ reference: '', notes: '' }), false)
  assert.equal(credentialHasContent({ reference: '001830281087' }), true)
  assert.equal(credentialHasContent({ expires_at: new Date() }), true)
  assert.equal(credentialHasContent({ evidence_key: 'tenants/x/y.pdf' }), true)
  assert.equal(credentialHasContent({ registration_body: 'NMC' }), true)
})
