// A regulation with no policy at all offers the policy that is missing for it, with a button to buy it, from the same list, price and checkout as the banner on /gaps.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('BUY BUTTON: the empty "No existing policy to check against" block offers the missing policy for THAT regulation, at the shop price, through the same checkout', () => {
  const modal = web('components/admin/gap-detail-modal.tsx'), banner = web('components/admin/missing-policies-banner.tsx')
  assert.match(modal, /No existing policy to check against[^]*?<BuyMissingPolicy token=\{token\} referenceKey=\{referenceKey\} \/>/)
  const fn = banner.slice(banner.indexOf('export function BuyMissingPolicy'), banner.indexOf('export function MissingPoliciesBanner'))
  assert.match(fn, /m\.regulations\.some\(r => r\.reference_key === referenceKey\)/)              // the policy that is missing for this regulation
  assert.match(fn, /!bundle\.r\.analysed \|\| !bundle\.r\.usable\) return null/)                  // never sold on a verdict we do not trust
  assert.match(fn, /\.some\(i => i\.policy_title === entry\.title\)\) return null/)               // ignored: nothing shown
  assert.match(fn, /const order = bundle\.p\.purchases\.find/)                                    // already ordered: said, not sold again
  assert.match(fn, /priceOf\(\{ byTitle: bundle\.p\.prices \?\? \{\}, fallback: bundle\.p\.price_pence \}, entry\.title\)/)
  assert.match(fn, /policyPurchases\.checkout\(\[entry!\.title\]\)/)
  const copy = [...fn.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map(m => m[1]).join(' ')
  assert.doesNotMatch(copy, /[–—]| - /)
})
