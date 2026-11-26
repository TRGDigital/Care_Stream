// The two certificates: a course made from the home's own policies says only where it came from; every other course (including each CPD Certified course) keeps the completion and assessment only statement.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('CERTIFICATE FOOTER: tailored courses say where they came from; everything else keeps the short statement; a CPD Certified course never shows the policies line', () => {
  const c = web('components/training-certificate.tsx')
  assert.match(c, /\{tailored && !cpdAccredited\s*\? <>Tailored to \{orgName \?\? 'the home'\}&apos;s own policies, delivered and assessed by CareStreamai\.com\.<\/>/)
  const other = c.slice(c.indexOf(': <>Delivered and assessed by CareStreamai.com.'), c.indexOf('</p>', c.indexOf(': <>Delivered and assessed by CareStreamai.com.')))
  assert.match(other, /This certificate is evidence that the named person completed this course and passed CareStream&apos;s assessment\./)   // the accepted wording, kept
  assert.match(other, /It is not a qualification and does not certify competence\./)
  assert.match(other, /The employer remains responsible for ensuring training meets regulatory requirements\./)
  assert.doesNotMatch(other, /polic/i)                                                                                                       // no reference to policies on the CPD certificate
  assert.doesNotMatch(c, /government recognised qualification|particular role, treatment or activity/)                                      // the old long wording is gone
  assert.doesNotMatch(c.slice(c.indexOf('Two certificates.')), /[–—]/)
})

test('CPD PACK: the example certificate in the submission pack matches the live CPD certificate wording', () => {
  const p = web('components/training/cpd-submission-pack.tsx')
  assert.match(p, /Delivered and assessed by CareStreamai\.com\. This certificate is evidence that the named person completed this course and passed CareStream&apos;s assessment\./)
  assert.match(p, /It is not a qualification and does not certify competence\. The employer remains responsible for ensuring training meets regulatory requirements\./)
  assert.doesNotMatch(p, /government recognised qualification and does not certify competence to perform/)
})
