import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { orgAddressParts, withOrgAddress, addressLines, toLetterhead, missingChecklist, footerContactLines, EMPTY_DETAILS } from './letterhead'

test('ORGANISATION ADDRESS: the one line typed in Settings becomes letterhead address lines (CS-1001: 3 Amberley Close, Burgess Hill, RH15 8JB)', () => {
  const p = orgAddressParts('3 Amberley Close, Burgess Hill, RH15 8JB')!
  assert.deepEqual(addressLines(p), ['3 Amberley Close', 'Burgess Hill', 'RH15 8JB'])
  assert.deepEqual(addressLines(orgAddressParts('Unit 5, High Street, Burgess Hill, West Sussex RH15 9AA') as any), ['Unit 5', 'High Street, Burgess Hill', 'West Sussex RH15 9AA'])
  assert.deepEqual(addressLines(orgAddressParts('The Old Rectory\nBurgess Hill\nRH15 8JB') as any), ['The Old Rectory', 'Burgess Hill', 'RH15 8JB'])
  assert.equal(orgAddressParts(''), null); assert.equal(orgAddressParts(null), null); assert.equal(orgAddressParts('  ,  \n '), null)
  assert.deepEqual(addressLines(orgAddressParts('12 Orchard Lane') as any), ['12 Orchard Lane'])
})

test('ORGANISATION ADDRESS: used only where the letterhead has no address of its own; what was typed for the letterhead always wins', () => {
  const none = withOrgAddress(null, '3 Amberley Close, Burgess Hill, RH15 8JB'); assert.equal(none.fromOrg, true); assert.deepEqual(addressLines(none.details as any), ['3 Amberley Close', 'Burgess Hill', 'RH15 8JB'])
  const empty = withOrgAddress({ ...EMPTY_DETAILS } as any, '3 Amberley Close, Burgess Hill, RH15 8JB'); assert.equal(empty.fromOrg, true)
  const own = withOrgAddress({ ...EMPTY_DETAILS, address_line1: '1 High Street', town: 'Lewes', postcode: 'BN7 2AA' } as any, '3 Amberley Close, Burgess Hill, RH15 8JB')
  assert.equal(own.fromOrg, false); assert.deepEqual(addressLines(own.details as any), ['1 High Street', 'Lewes', 'BN7 2AA'])
  const neither = withOrgAddress(null, ''); assert.equal(neither.fromOrg, false); assert.equal(neither.details, null)
})

test('ORGANISATION ADDRESS: the missing list stops asking for an address once one exists, and still asks when there is none', () => {
  const eff = withOrgAddress(null, '3 Amberley Close, Burgess Hill, RH15 8JB').details!
  assert.ok(!missingChecklist(eff, true).includes('Your address'))
  assert.ok(missingChecklist({}, true).includes('Your address'))
})

test('ORGANISATION ADDRESS: the newsletter footer shows the address first (one line), then phone and email, at most three lines', () => {
  const head = toLetterhead(withOrgAddress(null, '3 Amberley Close, Burgess Hill, RH15 8JB').details, 'Ferndale', null)
  assert.deepEqual(footerContactLines(head), ['3 Amberley Close, Burgess Hill, RH15 8JB'])
  const full = toLetterhead({ ...(withOrgAddress(null, '3 Amberley Close, Burgess Hill, RH15 8JB').details as any), phone: '01444 000000', email: 'office@x.org', website: 'x.org' }, 'Ferndale', null)
  assert.deepEqual(footerContactLines(full), ['3 Amberley Close, Burgess Hill, RH15 8JB', 'Tel: 01444 000000', 'Email: office@x.org'])
  assert.deepEqual(footerContactLines({}), [])
})

test('ORGANISATION ADDRESS: loadLetterhead reads it, the newsletter and previews use it, and the settings screen says so', () => {
  const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  assert.match(src('letterhead.ts'), /organisation_details: true/); assert.match(src('letterhead.ts'), /withOrgAddress\(saved, orgRaw\)/)
  assert.match(src('../ask-docs/newsletter-design-doc.ts'), /contact: footerContactLines\(l\.head\)/)
  assert.match(src('../ask-docs/option-preview.ts'), /footerContactLines\(l\.head\)/)
  assert.match(src('../../routes/letterhead.ts'), /address_from_organisation/)
  const web = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/components/admin/settings/letterhead-settings.tsx'), 'utf8')
  assert.match(web, /using the address from Organisation details/)
})
